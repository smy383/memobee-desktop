import React, { useState, useEffect, useCallback } from 'react';
import { uiLogger } from '../../shared/utils/logger';
import { useTranslation } from 'react-i18next';
import { api, AttachmentFileInfo, FileManagementResponse, FileStats } from '../../shared/services/apiService';
import './FileManagementView.css';

interface FileManagementViewProps {
  // 추후 props 확장 가능
}

const FileManagementView: React.FC<FileManagementViewProps> = () => {
  const { t } = useTranslation();
  
  // 상태 관리
  const [activeTab, setActiveTab] = useState<'images' | 'files'>('images');
  const [data, setData] = useState<FileManagementResponse>({
    images: [],
    files: [],
    total_images: 0,
    total_files: 0,
    total_size: 0,
  });
  const [stats, setStats] = useState<FileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<AttachmentFileInfo | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  
  // 정렬 상태
  const [sortBy, setSortBy] = useState<'created_at' | 'filename' | 'filesize'>('created_at');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // 파일 데이터 로딩
  const loadFileData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      uiLogger.debug('📁 Desktop Files - 파일 데이터 로딩 시작');
      
      // 파일 목록과 통계를 병렬로 로드
      const [fileResponse, statsResponse] = await Promise.all([
        api.files.getAttachments(sortBy, sortOrder),
        api.files.getStats()
      ]);

      uiLogger.debug('✅ Desktop Files - 파일 데이터 로딩 성공:', {
        images: fileResponse.total_images,
        files: fileResponse.total_files,
        totalSize: fileResponse.total_size
      });

      setData(fileResponse);
      setStats(statsResponse);
    } catch (error) {
      uiLogger.error('❌ Desktop Files - 파일 데이터 로딩 실패:', error);
      // 에러 상태 처리
      setData({
        images: [],
        files: [],
        total_images: 0,
        total_files: 0,
        total_size: 0,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sortBy, sortOrder]);

  // 새로고침
  const handleRefresh = () => {
    loadFileData(true);
  };

  // 정렬 변경
  const handleSortChange = (newSortBy: typeof sortBy, newSortOrder: typeof sortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  };

  // 파일 삭제
  const handleDeleteFile = async (file: AttachmentFileInfo) => {
    if (!confirm(t('files.confirm.delete', { filename: file.filename }))) {
      return;
    }

    try {
      uiLogger.debug('🗑️ Desktop Files - 파일 삭제 시작:', file.filename);
      
      await api.files.deleteAttachment(file.id);
      
      uiLogger.debug('✅ Desktop Files - 파일 삭제 성공');
      
      // 데이터 새로고침
      await loadFileData();
      
      // 선택된 파일이 삭제된 경우 모달 닫기
      if (selectedFile?.id === file.id) {
        setSelectedFile(null);
        setShowImageModal(false);
      }
    } catch (error) {
      uiLogger.error('❌ Desktop Files - 파일 삭제 실패:', error);
      alert(t('files.errors.delete_failed'));
    }
  };

  // 메모로 이동
  const handleGoToMemo = async (file: AttachmentFileInfo) => {
    try {
      uiLogger.debug('📝 Desktop Files - 메모로 이동:', file.memo_id);
      
      // 메모 상세 정보를 가져와서 처리
      const memo = await api.memo.getById(file.memo_id);
      
      // TODO: 메모 에디터 모달 열기 또는 메모 화면으로 이동
      uiLogger.debug('📝 연결된 메모:', memo);
      alert(`연결된 메모: ${memo.title}`);
    } catch (error) {
      uiLogger.error('❌ Desktop Files - 메모 이동 실패:', error);
      alert(t('files.errors.memo_load_failed'));
    }
  };

  // 파일 다운로드
  const handleDownloadFile = (file: AttachmentFileInfo) => {
    if (!file.public_url) {
      alert(t('files.errors.no_download_url'));
      return;
    }

    const link = document.createElement('a');
    link.href = file.public_url;
    link.download = file.filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 이미지 모달 열기
  const handleOpenImageModal = (image: AttachmentFileInfo) => {
    setSelectedFile(image);
    setShowImageModal(true);
  };

  // 이미지 모달 닫기
  const handleCloseImageModal = () => {
    setSelectedFile(null);
    setShowImageModal(false);
  };

  // 파일 크기 포맷팅
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 파일 타입 아이콘
  const getFileTypeIcon = (filetype: string): string => {
    if (filetype.startsWith('image/')) return '🖼️';
    if (filetype.startsWith('video/')) return '🎬';
    if (filetype.startsWith('audio/')) return '🎵';
    if (filetype.includes('pdf')) return '📄';
    if (filetype.includes('word')) return '📝';
    if (filetype.includes('excel') || filetype.includes('spreadsheet')) return '📊';
    if (filetype.includes('powerpoint') || filetype.includes('presentation')) return '📽️';
    if (filetype.includes('zip') || filetype.includes('rar')) return '📦';
    return '📄';
  };

  // 초기 데이터 로드
  useEffect(() => {
    loadFileData();
  }, [loadFileData]);

  // 로딩 화면
  if (loading) {
    return (
      <div className="file-management-container">
        <div className="file-loading">
          <div className="loading-spinner"></div>
          <p>{t('files.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="file-management-container">
      {/* 사이드바 - 파일 목록 */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <button className="new-memo-btn" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? '🔄' : '↻'} {t('files.refresh')}
          </button>
        </div>

        {/* 통계 정보 */}
        <div className="file-stats">
          <h4>{t('files.stats.title')}</h4>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-number">{data.total_images}</span>
              <span className="stat-label">{t('files.stats.images')}</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{data.total_files}</span>
              <span className="stat-label">{t('files.stats.files')}</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{formatFileSize(data.total_size)}</span>
              <span className="stat-label">{t('files.stats.total_size')}</span>
            </div>
          </div>
        </div>

        {/* 탭 메뉴 */}
        <div className="tab-container">
          <button
            className={`tab ${activeTab === 'images' ? 'active' : ''}`}
            onClick={() => setActiveTab('images')}
          >
            🖼️ {t('files.tabs.images')} ({data.total_images})
          </button>
          <button
            className={`tab ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveTab('files')}
          >
            📄 {t('files.tabs.files')} ({data.total_files})
          </button>
        </div>

        {/* 파일 갤러리 */}
        <div className="file-gallery">
          {activeTab === 'images' ? (
            data.images.length === 0 ? (
              <div className="empty-gallery">
                <div className="empty-icon">🖼️</div>
                <h3>{t('files.empty.no_images')}</h3>
                <p>{t('files.empty.no_images_desc')}</p>
              </div>
            ) : (
              data.images.map((image) => (
                <div
                  key={`image_${image.id}`}
                  className={`gallery-item ${selectedFile?.id === image.id ? 'selected' : ''}`}
                  onClick={() => setSelectedFile(image)}
                  title={image.filename}
                >
                  <div className="gallery-preview">
                    {image.public_url ? (
                      <img
                        src={image.public_url}
                        alt={image.filename}
                        className="gallery-image"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          (e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="gallery-fallback" style={{ display: image.public_url ? 'none' : 'flex' }}>
                      <span className="fallback-icon">🖼️</span>
                    </div>
                  </div>
                  <div className="gallery-info">
                    <span className="gallery-filename">{image.filename}</span>
                  </div>
                </div>
              ))
            )
          ) : (
            data.files.length === 0 ? (
              <div className="empty-gallery">
                <div className="empty-icon">📄</div>
                <h3>{t('files.empty.no_files')}</h3>
                <p>{t('files.empty.no_files_desc')}</p>
              </div>
            ) : (
              data.files.map((file) => (
                <div
                  key={`file_${file.id}`}
                  className={`gallery-item ${selectedFile?.id === file.id ? 'selected' : ''}`}
                  onClick={() => setSelectedFile(file)}
                  title={file.filename}
                >
                  <div className="gallery-preview">
                    <div className="gallery-fallback">
                      <span className="fallback-icon">{getFileTypeIcon(file.filetype)}</span>
                    </div>
                  </div>
                  <div className="gallery-info">
                    <span className="gallery-filename">{file.filename}</span>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </aside>

      {/* 메인 영역 - 파일 상세 정보 또는 대시보드 */}
      <main className="main-content">
        <div className="file-dashboard">
        {selectedFile ? (
          <div className="editor-container">
            <div className="editor-header">
              <h2>
                <span className="file-icon">
                  {selectedFile.filetype.startsWith('image/') ? '🖼️' : getFileTypeIcon(selectedFile.filetype)}
                </span>
                {selectedFile.filename}
              </h2>
              <button
                onClick={() => setSelectedFile(null)}
                className="close-btn"
              >
                ✕
              </button>
            </div>
            
            <div className="file-detail-content">
              {/* 파일 미리보기 */}
              <div className="file-preview-section">
                <h3>{t('files.detail.preview')}</h3>
                <div className="file-preview-container">
                  {selectedFile.filetype.startsWith('image/') && selectedFile.public_url ? (
                    <img
                      src={selectedFile.public_url}
                      alt={selectedFile.filename}
                      className="file-preview-image"
                      onClick={() => handleOpenImageModal(selectedFile)}
                    />
                  ) : (
                    <div className="file-preview-placeholder">
                      <span className="file-icon-large">{getFileTypeIcon(selectedFile.filetype)}</span>
                      <p>{t('files.detail.no_preview')}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 파일 정보 */}
              <div className="file-info-section">
                <div className="info-item">
                  <h4>{t('files.detail.filename')}</h4>
                  <span>{selectedFile.filename}</span>
                </div>
                <div className="info-item">
                  <h4>{t('files.detail.filetype')}</h4>
                  <span>{selectedFile.filetype}</span>
                </div>
                <div className="info-item">
                  <h4>{t('files.detail.filesize')}</h4>
                  <span>{formatFileSize(selectedFile.filesize)}</span>
                </div>
                <div className="info-item">
                  <h4>{t('files.detail.created_at')}</h4>
                  <span>{new Date(selectedFile.created_at).toLocaleString()}</span>
                </div>
              </div>

              {/* 연결된 메모 */}
              <div className="memo-link-section">
                <h4>{t('files.detail.related_memo')}</h4>
                <button
                  className="memo-link-btn"
                  onClick={() => handleGoToMemo(selectedFile)}
                >
                  📝 {selectedFile.memo_title}
                </button>
              </div>

              {/* 액션 버튼들 */}
              <div className="file-actions-section">
                {selectedFile.public_url && (
                  <button
                    className="action-btn download-btn"
                    onClick={() => handleDownloadFile(selectedFile)}
                  >
                    ⬇️ {t('files.actions.download')}
                  </button>
                )}
                {selectedFile.filetype.startsWith('image/') && selectedFile.public_url && (
                  <button
                    className="action-btn view-btn"
                    onClick={() => handleOpenImageModal(selectedFile)}
                  >
                    👁️ {t('files.actions.view_full')}
                  </button>
                )}
                <button
                  className="action-btn delete-btn"
                  onClick={() => handleDeleteFile(selectedFile)}
                >
                  🗑️ {t('files.actions.delete')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="file-dashboard">
            <div className="dashboard-header">
              <h2>📁 {t('files.dashboard_title')}</h2>
              <p>{t('files.dashboard_description')}</p>
            </div>

            {/* 파일 현황 통계 */}
            <div className="stats-section">
              <h3>📊 {t('files.dashboard.title')}</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-number">{data.total_images + data.total_files}</div>
                  <div className="stat-label">{t('files.dashboard.total_files')}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">{data.total_images}</div>
                  <div className="stat-label">{t('files.dashboard.images')}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">{data.total_files}</div>
                  <div className="stat-label">{t('files.dashboard.documents')}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">{formatFileSize(data.total_size)}</div>
                  <div className="stat-label">{t('files.dashboard.storage_used')}</div>
                </div>
              </div>
            </div>

            {/* 파일 유형별 분포 */}
            {(data.images.length > 0 || data.files.length > 0) && (
              <div className="stats-section">
                <h3>📂 {t('files.dashboard.file_distribution')}</h3>
                <div className="categories-grid">
                  {[
                    ...data.images.slice(0, 3).map(image => ({
                      name: `🖼️ ${image.filename}`,
                      size: formatFileSize(image.filesize),
                      type: 'image'
                    })),
                    ...data.files.slice(0, 3).map(file => ({
                      name: `${getFileTypeIcon(file.filetype)} ${file.filename}`,
                      size: formatFileSize(file.filesize),
                      type: 'file'
                    }))
                  ].slice(0, 6).map((item, index) => (
                    <div key={index} className="category-item">
                      <div className="category-name">{item.name}</div>
                      <div className="category-stats">
                        <span className="category-count">{item.size}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 최근 업로드된 파일 */}
            {(data.images.length > 0 || data.files.length > 0) && (
              <div className="stats-section">
                <h3>📅 {t('files.dashboard.recent_uploads')}</h3>
                <div className="recent-files-list">
                  {[...data.images, ...data.files]
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .slice(0, 5)
                    .map((file, index) => (
                      <div key={index} className="file-item">
                        <div className="file-icon">{file.filetype.startsWith('image/') ? '🖼️' : getFileTypeIcon(file.filetype)}</div>
                        <div className="file-info">
                          <div className="file-name">{file.filename}</div>
                          <div className="file-meta">
                            <span className="file-size">{formatFileSize(file.filesize)}</span>
                            <span className="file-date">{new Date(file.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        {file.memo_title && (
                          <div className="file-memo">
                            <span className="memo-icon">📝</span>
                            <span className="memo-title">{file.memo_title}</span>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </main>

      {/* 이미지 상세 모달 */}
      {showImageModal && selectedFile && selectedFile.public_url && (
        <div className="modal-overlay" onClick={handleCloseImageModal}>
          <div className="image-modal" onClick={(e) => e.stopPropagation()}>
            <div className="image-modal-header">
              <h3>{selectedFile.filename}</h3>
              <button onClick={handleCloseImageModal}>✕</button>
            </div>
            <div className="image-modal-content">
              <img
                src={selectedFile.public_url}
                alt={selectedFile.filename}
                className="full-size-image"
              />
            </div>
            <div className="image-modal-actions">
              <button
                className="modal-action-btn"
                onClick={() => handleDownloadFile(selectedFile)}
              >
                ⬇️ {t('files.actions.download')}
              </button>
              <button
                className="modal-action-btn"
                onClick={() => {
                  handleCloseImageModal();
                  handleGoToMemo(selectedFile);
                }}
              >
                📝 {t('files.actions.view_memo')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileManagementView;