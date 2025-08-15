/**
 * HybridEditor Component - Desktop Hybrid Editor
 * 데스크탑용 하이브리드 에디터 (텍스트 + 이미지 + 파일)
 */

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { 
  ContentBlock, 
  EditorState, 
  parseContentToBlocks, 
  blocksToHtml, 
  blocksToText,
  createTextBlock,
  createImageBlock,
  createFileBlock
} from '../../shared/types/ContentBlock';
import { Attachment, api } from '../../shared/services/apiService';
import { 
  isImageFile, 
  validateFile, 
  getImageDimensions, 
  getFilesFromDragEvent,
  getImageFromClipboard,
  getFileIcon,
  formatFileSize
} from '../../shared/utils/fileUtils';
import ImageModal from './ImageModal';
import './HybridEditor.css';

interface HybridEditorProps {
  value: string;
  onChange: (content: string) => void;
  attachments?: Attachment[];
  readOnly?: boolean;
  placeholder?: string;
  onFileUpload?: (file: File) => Promise<Attachment>;
}

export interface HybridEditorRef {
  addImageBlock: (imageUrl: string, metadata?: ContentBlock['metadata']) => void;
  addFileBlock: (fileName: string, metadata?: ContentBlock['metadata']) => void;
  getEditorState: () => EditorState;
  setEditorState: (state: EditorState) => void;
  focus: () => void;
  uploadFile: (file: File) => Promise<void>;
  openFileDialog: () => void;
}

const HybridEditor = forwardRef<HybridEditorRef, HybridEditorProps>(({
  value,
  onChange,
  attachments,
  readOnly = false,
  placeholder = '메모를 입력하세요...',
  onFileUpload
}, ref) => {
  const [editorState, setEditorState] = useState<EditorState>(() => 
    parseContentToBlocks(value, attachments)
  );
  
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imageModal, setImageModal] = useState<{
    isOpen: boolean;
    imageUrl: string;
    imageName: string;
  }>({
    isOpen: false,
    imageUrl: '',
    imageName: ''
  });
  const textareaRefs = useRef<{ [key: string]: HTMLTextAreaElement }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // value가 외부에서 변경될 때 에디터 상태 업데이트
  useEffect(() => {
    const newEditorState = parseContentToBlocks(value, attachments);
    setEditorState(newEditorState);
  }, [value, attachments]);

  // 에디터 상태가 변경될 때 부모에게 알림
  const notifyChange = (newEditorState: EditorState) => {
    const htmlContent = blocksToHtml(newEditorState);
    onChange(htmlContent);
  };

  // 블록 내용 업데이트
  const updateBlock = (blockId: string, newContent: string) => {
    const newEditorState = {
      ...editorState,
      blocks: editorState.blocks.map(block =>
        block.id === blockId ? { ...block, content: newContent } : block
      )
    };
    
    setEditorState(newEditorState);
    notifyChange(newEditorState);
  };

  // 블록 삭제
  const deleteBlock = (blockId: string) => {
    const newEditorState = {
      ...editorState,
      blocks: editorState.blocks.filter(block => block.id !== blockId)
    };
    
    // 블록이 모두 삭제되면 빈 텍스트 블록 추가
    if (newEditorState.blocks.length === 0) {
      newEditorState.blocks.push(createTextBlock());
    }
    
    setEditorState(newEditorState);
    notifyChange(newEditorState);
  };

  // 이미지 블록 추가
  const addImageBlock = (imageUrl: string, metadata?: ContentBlock['metadata']) => {
    const imageBlock = createImageBlock(imageUrl, metadata);
    const newTextBlock = createTextBlock(); // 이미지 다음에 텍스트 블록 추가
    
    const newEditorState = {
      ...editorState,
      blocks: [...editorState.blocks, imageBlock, newTextBlock]
    };
    
    setEditorState(newEditorState);
    notifyChange(newEditorState);
  };

  // 파일 블록 추가
  const addFileBlock = (fileName: string, metadata?: ContentBlock['metadata']) => {
    const fileBlock = createFileBlock(fileName, metadata);
    const newTextBlock = createTextBlock(); // 파일 다음에 텍스트 블록 추가
    
    const newEditorState = {
      ...editorState,
      blocks: [...editorState.blocks, fileBlock, newTextBlock]
    };
    
    setEditorState(newEditorState);
    notifyChange(newEditorState);
  };

  // 파일 업로드 처리
  const uploadFile = async (file: File) => {
    // 파일 검증
    const validation = validateFile(file);
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    setIsUploading(true);
    
    try {
      // FormData 생성
      const formData = new FormData();
      formData.append('file', file);

      // API를 통한 파일 업로드
      let uploadedAttachment: Attachment;
      if (onFileUpload) {
        uploadedAttachment = await onFileUpload(file);
      } else {
        uploadedAttachment = await api.memo.uploadAttachment(formData);
      }

      // 이미지 파일인지 확인
      if (isImageFile(file)) {
        try {
          const dimensions = await getImageDimensions(file);
          addImageBlock(uploadedAttachment.public_url || '', {
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            width: dimensions.width,
            height: dimensions.height,
            uploadedUrl: uploadedAttachment.public_url
          });
        } catch (error) {
          // 이미지 크기를 가져올 수 없는 경우 기본값으로 추가
          addImageBlock(uploadedAttachment.public_url || '', {
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            uploadedUrl: uploadedAttachment.public_url
          });
        }
      } else {
        // 일반 파일
        addFileBlock(file.name, {
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          uploadedUrl: uploadedAttachment.public_url
        });
      }

      console.log('✅ 파일 업로드 성공:', file.name);
    } catch (error) {
      console.error('❌ 파일 업로드 실패:', error);
      alert('파일 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  // 파일 선택 다이얼로그 열기
  const openFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // 파일 선택 핸들러
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        await uploadFile(files[i]);
      }
    }
    // 파일 입력 초기화 (같은 파일을 다시 선택할 수 있도록)
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 텍스트 영역 자동 높이 조절
  const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.max(textarea.scrollHeight, 40) + 'px';
  };

  // Enter 키 처리 (새 블록 생성)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, blockId: string) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      
      // 현재 블록 다음에 새 텍스트 블록 추가
      const currentBlockIndex = editorState.blocks.findIndex(block => block.id === blockId);
      const newTextBlock = createTextBlock();
      
      const newBlocks = [...editorState.blocks];
      newBlocks.splice(currentBlockIndex + 1, 0, newTextBlock);
      
      const newEditorState = { blocks: newBlocks };
      setEditorState(newEditorState);
      notifyChange(newEditorState);
      
      // 새 블록에 포커스
      setTimeout(() => {
        const newTextarea = textareaRefs.current[newTextBlock.id];
        if (newTextarea) {
          newTextarea.focus();
        }
      }, 0);
    }
  };

  // 드래그 앤 드롭 이벤트 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (readOnly) return;

    const files = getFilesFromDragEvent(e.nativeEvent);
    for (const file of files) {
      await uploadFile(file);
    }
  };

  // 클립보드 붙여넣기 이벤트 핸들러
  const handlePaste = async (e: React.ClipboardEvent) => {
    if (readOnly) return;

    const imageFile = await getImageFromClipboard(e.nativeEvent);
    if (imageFile) {
      e.preventDefault();
      await uploadFile(imageFile);
    }
  };

  // 이미지 크기 계산
  const getImageStyle = (block: ContentBlock): React.CSSProperties => {
    const maxWidth = 600; // 최대 너비
    const maxHeight = 400; // 최대 높이
    
    if (block.metadata?.width && block.metadata?.height) {
      const { width, height } = block.metadata;
      const aspectRatio = width / height;
      
      let finalWidth = width;
      let finalHeight = height;
      
      // 최대 크기 제한
      if (width > maxWidth) {
        finalWidth = maxWidth;
        finalHeight = maxWidth / aspectRatio;
      }
      
      if (finalHeight > maxHeight) {
        finalHeight = maxHeight;
        finalWidth = maxHeight * aspectRatio;
      }
      
      return {
        width: finalWidth,
        height: 'auto',
        maxWidth: '100%'
      };
    }
    
    return {
      maxWidth: '100%',
      height: 'auto'
    };
  };

  // 이미지 클릭 핸들러 (모달 열기)
  const handleImageClick = (imageUrl: string, imageName?: string) => {
    setImageModal({
      isOpen: true,
      imageUrl,
      imageName: imageName || 'image'
    });
  };

  // 이미지 모달 닫기
  const closeImageModal = () => {
    setImageModal({
      isOpen: false,
      imageUrl: '',
      imageName: ''
    });
  };

  // 외부에서 사용할 수 있는 메서드들 노출
  useImperativeHandle(ref, () => ({
    addImageBlock,
    addFileBlock,
    getEditorState: () => editorState,
    setEditorState: (state: EditorState) => {
      setEditorState(state);
      notifyChange(state);
    },
    focus: () => {
      const firstTextBlock = editorState.blocks.find(block => block.type === 'text');
      if (firstTextBlock) {
        const textarea = textareaRefs.current[firstTextBlock.id];
        if (textarea) {
          textarea.focus();
        }
      }
    },
    uploadFile,
    openFileDialog
  }));

  return (
    <div 
      className={`hybrid-editor ${isDragOver ? 'drag-over' : ''} ${isUploading ? 'uploading' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
    >
      {/* 숨겨진 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.json,.zip"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* 드래그 오버레이 */}
      {isDragOver && (
        <div className="drag-overlay">
          <div className="drag-message">
            <div className="drag-icon">📁</div>
            <div className="drag-text">파일을 여기에 놓으세요</div>
          </div>
        </div>
      )}



      {/* 업로드 로딩 오버레이 */}
      {isUploading && (
        <div className="upload-overlay">
          <div className="upload-message">
            <div className="upload-spinner"></div>
            <div className="upload-text">파일 업로드 중...</div>
          </div>
        </div>
      )}

      {editorState.blocks.map((block, index) => (
        <div key={block.id} className="editor-block">
          {block.type === 'text' && (
            <div className="text-block">
              <textarea
                ref={(el) => {
                  if (el) {
                    textareaRefs.current[block.id] = el;
                    adjustTextareaHeight(el);
                  }
                }}
                value={block.content}
                onChange={(e) => {
                  updateBlock(block.id, e.target.value);
                  adjustTextareaHeight(e.target);
                }}
                onFocus={() => setFocusedBlockId(block.id)}
                onBlur={() => setFocusedBlockId(null)}
                onKeyDown={(e) => handleKeyDown(e, block.id)}
                placeholder={index === 0 ? placeholder : '계속 입력하세요...'}
                className={`text-input ${focusedBlockId === block.id ? 'focused' : ''}`}
                readOnly={readOnly}
                rows={1}
              />
            </div>
          )}
          
          {block.type === 'image' && (() => {
            // 크로스 플랫폼 호환성을 위해 uploadedUrl 우선 사용 (모바일 앱과 동일 로직)
            const imageUrl = block.metadata?.uploadedUrl || block.content;
            
            return (
              <div className="image-block">
                <div className="image-container">
                  <img
                    src={imageUrl}
                    alt={block.metadata?.fileName || 'image'}
                    style={getImageStyle(block)}
                    onClick={() => handleImageClick(imageUrl, block.metadata?.fileName)}
                    onError={(e) => {
                      // 이미지 로드 실패 시 플레이스홀더 표시
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const placeholder = target.nextElementSibling as HTMLElement;
                      if (placeholder) {
                        placeholder.style.display = 'flex';
                      }
                    }}
                  />
                <div className="image-placeholder" style={{ display: 'none' }}>
                  <div className="placeholder-content">
                    <span className="placeholder-icon">🖼️</span>
                    <span className="placeholder-text">이미지를 불러올 수 없습니다</span>
                  </div>
                </div>
              </div>
            </div>
            );
          })()}
          
          {block.type === 'file' && (
            <div className="file-block">
              <div className="file-info">
                <div className="file-icon">
                  {getFileIcon(block.metadata?.mimeType || '')}
                </div>
                <div className="file-details">
                  <div className="file-name">{block.content}</div>
                  <div className="file-meta">
                    {block.metadata?.fileSize && (
                      <span className="file-size">
                        {formatFileSize(block.metadata.fileSize)}
                      </span>
                    )}
                    {block.metadata?.mimeType && (
                      <span className="file-type">
                        {block.metadata.mimeType.split('/')[1]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="file-actions">
                  {block.metadata?.uploadedUrl && (
                    <button
                      className="download-btn"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = block.metadata!.uploadedUrl!;
                        link.download = block.content;
                        link.click();
                      }}
                      title="파일 다운로드"
                    >
                      ⬇️
                    </button>
                  )}
                  {!readOnly && (
                    <button
                      className="delete-block-btn"
                      onClick={() => deleteBlock(block.id)}
                      title="파일 삭제"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
      
      {!readOnly && (
        <div className="editor-help">
          <small>
            💡 Ctrl + Enter로 새 블록 추가 | 📁 파일을 드래그하여 첨부 | 📋 Ctrl + V로 이미지 붙여넣기 | 🖼️ 이미지 클릭으로 확대보기
          </small>
        </div>
      )}

      {/* 이미지 확대 모달 */}
      <ImageModal
        isOpen={imageModal.isOpen}
        imageUrl={imageModal.imageUrl}
        imageName={imageModal.imageName}
        onClose={closeImageModal}
      />
    </div>
  );
});

HybridEditor.displayName = 'HybridEditor';

export default HybridEditor;