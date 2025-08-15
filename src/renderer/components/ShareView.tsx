import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api, SharedNote } from '../../shared/services/apiService';
import './ShareView.css';

const ShareView: React.FC = () => {
  const { t } = useTranslation();
  const [sharedNotes, setSharedNotes] = useState<SharedNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<SharedNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'views'>('date');

  useEffect(() => {
    loadSharedNotes();
  }, []);

  const loadSharedNotes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔗 ShareView - 공유된 메모 목록 로드 시작');
      
      const data = await api.shared.getSharedNotes();
      console.log('✅ ShareView - 데이터 로드 성공:', data.length);
      
      setSharedNotes(data);
    } catch (err: any) {
      console.error('❌ ShareView - 데이터 로드 실패:', err);
      setError(t('errors.load_failed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const handleUnshare = async (noteId: number) => {
    if (!window.confirm(t('share.confirm_unshare'))) {
      return;
    }

    try {
      console.log('🔗 ShareView - 공유 해제 시도:', noteId);
      await api.shared.toggleShare(noteId, false);
      
      // 목록에서 해당 메모 제거
      setSharedNotes(sharedNotes.filter(note => note.id !== noteId));
      
      // 선택된 메모가 해제된 메모라면 선택 해제
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
      }
      
      alert(t('share.unshare_success'));
    } catch (err: any) {
      console.error('❌ ShareView - 공유 해제 실패:', err);
      alert(t('share.unshare_error'));
    }
  };

  const handleCopyLink = async (shareToken: string) => {
    try {
      const shareUrl = `https://memobee-ai.pages.dev/shared/${shareToken}`;
      await navigator.clipboard.writeText(shareUrl);
      alert(t('share.copy_success'));
    } catch (err) {
      console.error('❌ ShareView - 링크 복사 실패:', err);
      alert(t('share.copy_error'));
    }
  };

  const handleShareLink = async (shareToken: string, note: SharedNote) => {
    try {
      const shareUrl = `https://memobee-ai.pages.dev/shared/${shareToken}`;
      const title = getTitle(note);
      
      if (navigator.share) {
        await navigator.share({
          title: t('share.share_title'),
          text: title,
          url: shareUrl,
        });
      } else {
        // 폴백: 클립보드에 복사
        await navigator.clipboard.writeText(`${title}\n${shareUrl}`);
        alert(t('share.share_fallback'));
      }
    } catch (err) {
      console.error('❌ ShareView - 공유 실패:', err);
    }
  };

  const stripHtmlTags = (html: string): string => {
    return html.replace(/<[^>]*>/g, '');
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  const getTitle = (note: SharedNote): string => {
    // 모바일 앱과 동일한 우선순위: ai_title -> title -> 내용 첫 부분
    if (note.ai_title && note.ai_title.trim()) {
      return note.ai_title;
    }
    
    if (note.title && note.title.trim()) {
      return note.title;
    }
    
    // 제목이 없으면 내용의 첫 부분을 사용 (폴백)
    const plainText = stripHtmlTags(note.content);
    const title = plainText.split('\n')[0].substring(0, 50);
    return title.length === 50 ? title + '...' : title;
  };

  // 검색 및 정렬된 메모 목록
  const filteredAndSortedNotes = sharedNotes
    .filter(note => {
      if (!searchTerm) return true;
      const content = stripHtmlTags(note.content).toLowerCase();
      return content.includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else {
        return (b.view_count || 0) - (a.view_count || 0);
      }
    });

  if (loading) {
    return (
      <div className="share-view">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>{t('loading.text')}</p>
        </div>
      </div>
    );
  }

  if (error && sharedNotes.length === 0) {
    return (
      <div className="share-view">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <p className="error-message">{error}</p>
          <button className="retry-button" onClick={loadSharedNotes}>
            {t('actions.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="share-view">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2 className="sidebar-title">
            🔗 {t('share.title')}
          </h2>
          <div className="share-stats">
            <span className="stats-text">
              {t('share.total_shared', { count: sharedNotes.length })}
            </span>
          </div>
        </div>

        <div className="search-controls">
          <input
            type="text"
            className="search-input"
            placeholder={t('share.search_placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'views')}
          >
            <option value="date">{t('share.sort_by_date')}</option>
            <option value="views">{t('share.sort_by_views')}</option>
          </select>
        </div>

        <div className="shared-notes-list">
          {filteredAndSortedNotes.length === 0 ? (
            <div className="empty-list">
              <div className="empty-icon">📝</div>
              <p className="empty-message">
                {searchTerm ? t('share.no_search_results') : t('share.no_shared_notes')}
              </p>
            </div>
          ) : (
            filteredAndSortedNotes.map(note => (
              <div
                key={note.id}
                className={`shared-note-item ${selectedNote?.id === note.id ? 'selected' : ''}`}
                onClick={() => setSelectedNote(note)}
              >
                <div className="note-header">
                  <h3 className="note-title">{getTitle(note)}</h3>
                  <span className="note-date">{formatDate(note.created_at)}</span>
                </div>
                {note.view_count !== undefined && (
                  <div className="note-stats">
                    <span className="view-count">
                      👁️ {t('share.view_count', { count: note.view_count })}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </aside>

      <main className="main-content">
        <div className="share-dashboard">
        {selectedNote ? (
          <div className="note-detail">
            <div className="detail-header">
              <h2 className="detail-title">{getTitle(selectedNote)}</h2>
              <div className="detail-meta">
                <span className="created-date">
                  {t('share.created_at', { date: formatDate(selectedNote.created_at) })}
                </span>
                {selectedNote.view_count !== undefined && (
                  <span className="view-count">
                    👁️ {t('share.view_count', { count: selectedNote.view_count })}
                  </span>
                )}
              </div>
            </div>

            <div className="note-content">
              <div 
                className="content-preview"
                dangerouslySetInnerHTML={{ __html: selectedNote.content }}
              />
            </div>

            <div className="share-actions">
              <button
                className="action-button copy-button"
                onClick={() => selectedNote.share_token && handleCopyLink(selectedNote.share_token)}
                disabled={!selectedNote.share_token}
              >
                📋 {t('share.copy_link')}
              </button>
              <button
                className="action-button share-button"
                onClick={() => selectedNote.share_token && handleShareLink(selectedNote.share_token, selectedNote)}
                disabled={!selectedNote.share_token}
              >
                📤 {t('share.share_link')}
              </button>
              <button
                className="action-button unshare-button"
                onClick={() => handleUnshare(selectedNote.id)}
              >
                🚫 {t('share.unshare')}
              </button>
            </div>

            {selectedNote.share_token && (
              <div className="share-url-display">
                <label className="url-label">{t('share.share_url')}:</label>
                <div className="url-container">
                  <input
                    type="text"
                    className="url-input"
                    value={`https://memobee-ai.pages.dev/shared/${selectedNote.share_token}`}
                    readOnly
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="welcome-screen">
            <div className="welcome-icon">🤝</div>
            <h2 className="welcome-title">{t('share.welcome_title')}</h2>
            <p className="welcome-message">{t('share.welcome_message')}</p>
            {sharedNotes.length === 0 && (
              <div className="getting-started">
                <h3>{t('share.getting_started_title')}</h3>
                <p>{t('share.getting_started_message')}</p>
              </div>
            )}
          </div>
        )}
        </div>
      </main>
    </div>
  );
};

export default ShareView;