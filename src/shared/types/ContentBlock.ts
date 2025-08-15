/**
 * ContentBlock Types - Desktop Hybrid Editor
 * 데스크탑용 하이브리드 에디터 블록 타입 정의
 */

// Cloudflare R2 공개 개발 URL (웹 프론트엔드와 동일)
const R2_PUBLIC_URL = "https://pub-cbe6ba6d0f19460da4f5aec568053b14.r2.dev";
export const getR2PublicUrl = (r2Key: string) => `${R2_PUBLIC_URL}/${r2Key}`;

export interface ContentBlock {
  id: string;
  type: 'text' | 'image' | 'file';
  content: string;
  metadata?: {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    width?: number;
    height?: number;
    uploadedUrl?: string;
    originalUri?: string;
  };
}

export interface EditorState {
  blocks: ContentBlock[];
}

// 블록 생성 헬퍼 함수들
export const createTextBlock = (content: string = ''): ContentBlock => ({
  id: `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  type: 'text',
  content,
});

export const createImageBlock = (
  imageUrl: string,
  metadata?: ContentBlock['metadata']
): ContentBlock => ({
  id: `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  type: 'image',
  content: imageUrl,
  metadata,
});

export const createFileBlock = (
  fileName: string,
  metadata?: ContentBlock['metadata']
): ContentBlock => ({
  id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  type: 'file',
  content: fileName,
  metadata,
});

// HTML 문자열을 블록으로 파싱하는 함수
export const parseContentToBlocks = (
  htmlContent: string,
  attachments?: any[]
): EditorState => {
  const blocks: ContentBlock[] = [];
  
  
  if (!htmlContent || htmlContent.trim() === '') {
    // 빈 내용인 경우 기본 텍스트 블록 하나 생성
    blocks.push(createTextBlock());
    return { blocks };
  }

  // 모바일 앱 형식과 웹 형식 모두 지원하는 파싱
  // 1. 먼저 [이미지: filename] 패턴을 찾아서 실제 <img> 태그로 변환
  let processedContent = htmlContent;
  
  // [이미지: filename] 패턴을 찾아서 처리
  const imagePattern = /\[이미지:\s*([^\]]+)\]/g;
  const imageMatches = Array.from(htmlContent.matchAll(imagePattern));
  
  
  for (const match of imageMatches) {
    const [fullMatch, fileName] = match;
    
    // 첨부파일에서 해당 파일명과 일치하는 항목 찾기
    const attachment = attachments?.find(att => 
      att.filename === fileName || 
      att.filename?.includes(fileName) ||
      fileName.includes(att.filename || '')
    );
    
    if (attachment) {
      // R2 URL 변환 로직 적용
      const finalImageUrl = attachment.public_url || (attachment.r2_key ? getR2PublicUrl(attachment.r2_key) : null);
      
      
      if (finalImageUrl) {
        // [이미지: filename] → <img src="url"> 변환
        processedContent = processedContent.replace(fullMatch, `<img src="${finalImageUrl}" alt="${fileName}" />`);
      }
    }
  }
  
  // 2. 이제 일반적인 HTML 파싱 진행
  const parts = processedContent.split(/(<img[^>]*>)/gi);
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    
    if (!part) continue;
    
    // 이미지 태그인지 확인
    const imgMatch = part.match(/<img[^>]*src=["']([^"']*)["'][^>]*>/i);
    if (imgMatch) {
      const imageUrl = imgMatch[1];
      const altMatch = part.match(/alt=["']([^"']*)["']/i);
      const fileName = altMatch ? altMatch[1] : 'image.jpg';
      
      // 첨부파일에서 해당 이미지의 메타데이터 찾기
      const attachment = attachments?.find(att => 
        att.public_url === imageUrl || 
        att.r2_key?.includes(imageUrl) ||
        att.filename === fileName
      );
      
      blocks.push(createImageBlock(imageUrl, {
        fileName: attachment?.filename || fileName,
        fileSize: attachment?.filesize || 0,
        mimeType: attachment?.filetype || 'image/jpeg',
        uploadedUrl: imageUrl,
      }));
    } else {
      // 텍스트 블록
      // HTML 태그 제거하고 순수 텍스트만 추출
      const textContent = part
        .replace(/<[^>]*>/g, '') // HTML 태그 제거
        .replace(/&nbsp;/g, ' ') // &nbsp; 변환
        .replace(/&lt;/g, '<')   // HTML 엔티티 변환
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .trim();
      
      if (textContent) {
        blocks.push(createTextBlock(textContent));
      }
    }
  }
  
  // 첨부파일 중 이미지가 아닌 파일들을 파일 블록으로 추가
  if (attachments) {
    const fileAttachments = attachments.filter(att => 
      att.filetype && !att.filetype.startsWith('image/')
    );
    
    for (const fileAtt of fileAttachments) {
      // 파일도 R2 URL 변환 적용
      const finalFileUrl = fileAtt.public_url || (fileAtt.r2_key ? getR2PublicUrl(fileAtt.r2_key) : null);
      
      blocks.push(createFileBlock(fileAtt.filename, {
        fileName: fileAtt.filename,
        fileSize: fileAtt.filesize,
        mimeType: fileAtt.filetype,
        uploadedUrl: finalFileUrl,
      }));
    }
  }
  
  // 블록이 없으면 기본 텍스트 블록 추가
  if (blocks.length === 0) {
    blocks.push(createTextBlock());
  }
  
  return { blocks };
};

// 블록들을 HTML 문자열로 변환하는 함수
export const blocksToHtml = (editorState: EditorState): string => {
  return editorState.blocks
    .map(block => {
      switch (block.type) {
        case 'text':
          // 텍스트는 줄바꿈을 <br>로 변환
          return block.content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => `<p>${line}</p>`)
            .join('');
            
        case 'image':
          return `<img src="${block.content}" alt="${block.metadata?.fileName || 'image'}" style="max-width: 100%; height: auto;" />`;
          
        case 'file':
          // 파일은 링크로 표현 (실제 다운로드는 별도 처리)
          return `<p>📎 <a href="${block.metadata?.uploadedUrl || '#'}" target="_blank">${block.content}</a></p>`;
          
        default:
          return '';
      }
    })
    .join('');
};

// 블록들을 순수 텍스트로 변환하는 함수 (검색용)
export const blocksToText = (editorState: EditorState): string => {
  return editorState.blocks
    .map(block => {
      switch (block.type) {
        case 'text':
          return block.content;
        case 'image':
          return `[이미지: ${block.metadata?.fileName || 'image'}]`;
        case 'file':
          return `[파일: ${block.content}]`;
        default:
          return '';
      }
    })
    .join('\n')
    .trim();
};