import React, { useState, useEffect, useCallback } from 'react';
import { uiLogger } from '../../shared/utils/logger';
import { useTranslation } from 'react-i18next';
import { api } from '../../shared/services/apiService';
import './LinkManagementView.css';

interface Link {
  id: number;
  url: string;
  title: string | null;
  description?: string;
  image_url?: string;
  site_name?: string;
  domain: string;
  is_accessible: boolean;
  created_at: string;
  updated_at: string;
  memo_id: number;
  user_id: number;
  memo?: {
    id: number;
    title: string;
    content: string;
  };
}

interface LinkStats {
  total_links: number;
}

interface LinkManagementViewProps {
  // 추후 props 확장 가능
}

const LinkManagementView: React.FC<LinkManagementViewProps> = () => {
  const { t } = useTranslation();
  
  // 상태 관리
  const [links, setLinks] = useState<Link[]>([]);
  const [filteredLinks, setFilteredLinks] = useState<Link[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLink, setSelectedLink] = useState<Link | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [stats, setStats] = useState<LinkStats>({ total_links: 0 });
  const [selectedLinks, setSelectedLinks] = useState<Set<number>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  // 링크 목록 로딩
  const loadLinks = useCallback(async (search?: string) => {
    try {
      setLoading(!refreshing);
      uiLogger.debug('🔗 Desktop Links - 링크 목록 로딩 시작');
      
      // 실제 API 호출
      const response = await api.links.getList(search);
      
      uiLogger.debug('✅ Desktop Links - 링크 목록 로딩 성공:', response.links?.length || 0, '개');
      
      const linkResults = response.links || [];
      setLinks(linkResults);
      setFilteredLinks(linkResults);
      setStats({ total_links: linkResults.length });
    } catch (error) {
      uiLogger.error('❌ Desktop Links - 링크 목록 로딩 실패:', error);
      setLinks([]);
      setFilteredLinks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  // 새로고침
  const handleRefresh = () => {
    setRefreshing(true);
    loadLinks();
  };

  // 검색 처리
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    loadLinks(query);
  };

  // 링크 선택/해제
  const toggleLinkSelection = (linkId: number) => {
    const newSelected = new Set(selectedLinks);
    if (newSelected.has(linkId)) {
      newSelected.delete(linkId);
    } else {
      newSelected.add(linkId);
    }
    setSelectedLinks(newSelected);
  };

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedLinks.size === filteredLinks.length) {
      setSelectedLinks(new Set());
    } else {
      setSelectedLinks(new Set(filteredLinks.map(link => link.id)));
    }
  };

  // 선택된 링크들 일괄 삭제
  const deleteSelectedLinks = async () => {
    if (selectedLinks.size === 0) return;
    
    if (!confirm(t('linkManagement.alerts.delete_confirm', { count: selectedLinks.size }))) {
      return;
    }

    try {
      uiLogger.debug('🗑️ Desktop Links - 선택된 링크들 삭제:', Array.from(selectedLinks));
      
      // 실제 API 호출
      await api.links.deleteMultiple(Array.from(selectedLinks));
      
      // 성공 시 로컬 상태 업데이트
      const updatedLinks = links.filter(link => !selectedLinks.has(link.id));
      setLinks(updatedLinks);
      setFilteredLinks(updatedLinks);
      setSelectedLinks(new Set());
      setSelectionMode(false);
      setStats({ total_links: updatedLinks.length });
      
      uiLogger.debug('✅ Desktop Links - 링크 삭제 성공');
      alert(t('linkManagement.alerts.delete_success', { count: selectedLinks.size }));
    } catch (error) {
      uiLogger.error('❌ Desktop Links - 링크 삭제 실패:', error);
      alert(t('linkManagement.alerts.delete_error'));
    }
  };

  // URL 복사
  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      alert(t('linkManagement.alerts.copy_success'));
    }).catch(() => {
      alert(t('linkManagement.alerts.copy_error'));
    });
  };

  // 링크 열기
  const openLink = (url: string) => {
    window.open(url, '_blank');
  };

  // 관련 메모로 이동
  const handleGoToMemo = async (link: Link) => {
    try {
      uiLogger.debug('📝 Desktop Links - 관련 메모로 이동:', link.memo_id);
      
      // 메모 상세 정보를 가져와서 처리
      const memo = await api.memo.getById(link.memo_id);
      
      // TODO: 메모 에디터 모달 열기 또는 메모 화면으로 이동
      uiLogger.debug('📝 연결된 메모:', memo);
      alert(`연결된 메모: ${memo.title || link.memo?.title || '제목 없음'}`);
    } catch (error) {
      uiLogger.error('❌ Desktop Links - 메모 이동 실패:', error);
      alert(t('linkManagement.alerts.memo_load_error'));
    }
  };

  // 링크 상세 모달 열기
  const openLinkModal = (link: Link) => {
    setSelectedLink(link);
    setShowModal(true);
  };

  // 링크 상세 모달 닫기
  const closeLinkModal = () => {
    setSelectedLink(null);
    setShowModal(false);
  };

  // 도메인에서 파비콘 URL 생성
  const getFaviconUrl = (domain: string): string => {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  };

  // 초기 데이터 로드
  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  // 로딩 화면
  if (loading) {
    return (
      <div className="link-management-container">
        <div className="link-loading">
          <div className="loading-spinner"></div>
          <p>{t('linkManagement.loading.text')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="link-management-container">
      {/* 사이드바 - 링크 목록 */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <button className="new-memo-btn" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? '🔄' : '↻'} {t('linkManagement.refresh', { defaultValue: '새로고침' })}
          </button>
        </div>

        {/* 검색 영역 */}
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder={t('linkManagement.search.placeholder')}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        {/* 통계 정보 */}
        <div className="link-stats">
          <h4>{t('linkManagement.stats.total_links', { count: stats.total_links })}</h4>
        </div>

        {/* 선택 모드 툴바 */}
        {selectionMode && (
          <div className="selection-toolbar">
            <button className="toolbar-button" onClick={toggleSelectAll}>
              {selectedLinks.size === filteredLinks.length
                ? t('linkManagement.selection.deselect_all')
                : t('linkManagement.selection.select_all')}
            </button>
            <span className="selected-count">
              {t('linkManagement.selection.selected_count', { count: selectedLinks.size })}
            </span>
            <button
              className="toolbar-button delete-button"
              onClick={deleteSelectedLinks}
              disabled={selectedLinks.size === 0}
            >
              {t('linkManagement.selection.delete')}
            </button>
            <button
              className="toolbar-button"
              onClick={() => {
                setSelectionMode(false);
                setSelectedLinks(new Set());
              }}
            >
              {t('linkManagement.selection.cancel')}
            </button>
          </div>
        )}

        {/* 링크 목록 */}
        <div className="link-list">
          {filteredLinks.length === 0 ? (
            <div className="empty-links">
              <div className="empty-icon">🔗</div>
              <h3>{searchQuery ? t('linkManagement.empty.no_results') : t('linkManagement.empty.no_links')}</h3>
              {!searchQuery && (
                <p>{t('linkManagement.empty.description', { defaultValue: '메모에 링크를 추가하면 여기에 표시됩니다.' })}</p>
              )}
            </div>
          ) : (
            filteredLinks.map((link) => (
              <div
                key={link.id}
                className={`link-item ${selectedLink?.id === link.id ? 'selected' : ''} ${selectedLinks.has(link.id) ? 'multi-selected' : ''}`}
                onClick={() => {
                  if (selectionMode) {
                    toggleLinkSelection(link.id);
                  } else {
                    setSelectedLink(link);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (!selectionMode) {
                    setSelectionMode(true);
                    toggleLinkSelection(link.id);
                  }
                }}
              >
                {selectionMode && (
                  <div className="checkbox">
                    {selectedLinks.has(link.id) ? '✓' : '○'}
                  </div>
                )}
                
                <div className="link-preview">
                  {link.image_url ? (
                    <img
                      src={link.image_url}
                      alt=""
                      className="link-image"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        (e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className="link-fallback" style={{ display: link.image_url ? 'none' : 'flex' }}>
                    <img
                      src={getFaviconUrl(link.domain)}
                      alt=""
                      className="favicon"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        (e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'block';
                      }}
                    />
                    <span className="fallback-icon" style={{ display: 'none' }}>🔗</span>
                  </div>
                </div>

                <div className="link-info">
                  <h4 className="link-title">
                    {link.title || t('linkManagement.modal.no_title')}
                  </h4>
                  <p className="link-url">{link.url}</p>
                  <small className="link-domain">{link.domain}</small>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* 메인 영역 - 링크 상세 정보 */}
      <main className="main-content">
        <div className="link-dashboard">
        {selectedLink ? (
          <div className="editor-container">
            <div className="editor-header">
              <h2>
                <span className="link-icon">🔗</span>
                {selectedLink.title || t('linkManagement.modal.no_title')}
              </h2>
              <button
                onClick={() => setSelectedLink(null)}
                className="close-btn"
              >
                ✕
              </button>
            </div>
            
            <div className="link-detail-content">
              {/* 링크 미리보기 */}
              <div className="link-preview-section">
                <h3>{t('linkManagement.preview', { defaultValue: '미리보기' })}</h3>
                <div className="link-preview-container">
                  {selectedLink.image_url ? (
                    <img
                      src={selectedLink.image_url}
                      alt={selectedLink.title || ''}
                      className="link-preview-image"
                      onClick={() => openLink(selectedLink.url)}
                    />
                  ) : (
                    <div className="link-preview-placeholder">
                      <img
                        src={getFaviconUrl(selectedLink.domain)}
                        alt=""
                        className="favicon-large"
                      />
                      <p>{t('linkManagement.no_preview', { defaultValue: '미리보기 이미지가 없습니다.' })}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 링크 정보 */}
              <div className="link-info-section">
                <div className="info-item">
                  <h4>{t('linkManagement.modal.title', { defaultValue: '제목' })}</h4>
                  <span>{selectedLink.title || t('linkManagement.modal.no_title')}</span>
                </div>
                {selectedLink.description && (
                  <div className="info-item">
                    <h4>{t('linkManagement.modal.description', { defaultValue: '설명' })}</h4>
                    <span>{selectedLink.description}</span>
                  </div>
                )}
                <div className="info-item">
                  <h4>URL</h4>
                  <span className="url-text">{selectedLink.url}</span>
                </div>
                <div className="info-item">
                  <h4>{t('linkManagement.modal.domain', { defaultValue: '도메인' })}</h4>
                  <span>{selectedLink.domain}</span>
                </div>
                {selectedLink.site_name && (
                  <div className="info-item">
                    <h4>{t('linkManagement.modal.site', { defaultValue: '사이트' })}</h4>
                    <span>{selectedLink.site_name}</span>
                  </div>
                )}
                <div className="info-item">
                  <h4>{t('linkManagement.modal.created_date', { defaultValue: '생성일' })}</h4>
                  <span>{new Date(selectedLink.created_at).toLocaleString()}</span>
                </div>
              </div>

              {/* 연결된 메모 */}
              {selectedLink.memo && (
                <div className="memo-link-section">
                  <h4>{t('linkManagement.modal.related_memo_section')}</h4>
                  <div className="memo-preview">
                    <h5>{selectedLink.memo.title || t('linkManagement.modal.no_title')}</h5>
                    <p>{selectedLink.memo.content.substring(0, 100)}...</p>
                  </div>
                  <button
                    className="memo-link-btn"
                    onClick={() => handleGoToMemo(selectedLink)}
                  >
                    📝 {t('linkManagement.modal.go_to_memo')}
                  </button>
                </div>
              )}

              {/* 액션 버튼들 */}
              <div className="link-actions-section">
                <button
                  className="action-btn copy-btn"
                  onClick={() => copyUrl(selectedLink.url)}
                >
                  📋 {t('linkManagement.actions.copy_link')}
                </button>
                <button
                  className="action-btn open-btn"
                  onClick={() => openLink(selectedLink.url)}
                >
                  🔗 {t('linkManagement.actions.open_link')}
                </button>
                <button
                  className="action-btn memo-btn"
                  onClick={() => handleGoToMemo(selectedLink)}
                >
                  📝 {t('linkManagement.actions.related_memo')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="welcome-screen">
            <h2>🔗 {t('linkManagement.title')}</h2>
            <p>{t('linkManagement.welcome_message', { defaultValue: '메모에서 추출된 링크들을 관리하세요.' })}</p>
            
            {/* 링크 통계 대시보드 */}
            <div className="link-dashboard">
              <h3>{t('linkManagement.dashboard.title', { defaultValue: '링크 통계' })}</h3>
              <div className="dashboard-stats">
                <div className="dashboard-stat">
                  <span className="stat-number">{stats.total_links}</span>
                  <span className="stat-label">{t('linkManagement.dashboard.total_links', { defaultValue: '총 링크 수' })}</span>
                </div>
                <div className="dashboard-stat">
                  <span className="stat-number">{filteredLinks.filter(link => link.is_accessible).length}</span>
                  <span className="stat-label">{t('linkManagement.dashboard.accessible_links', { defaultValue: '접근 가능' })}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </main>

      {/* 링크 상세 모달 (필요 시 사용) */}
      {showModal && selectedLink && (
        <div className="modal-overlay" onClick={closeLinkModal}>
          <div className="link-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('linkManagement.modal.title')}</h3>
              <button onClick={closeLinkModal}>✕</button>
            </div>
            <div className="modal-content">
              {/* 모달 내용 */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LinkManagementView;