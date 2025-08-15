import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api, TrashItem, TrashStats } from '../../shared/services/apiService';
import './TrashView.css';

interface TrashViewProps {
  // 추후 props 확장 가능
}

const TrashView: React.FC<TrashViewProps> = () => {
  const { t } = useTranslation();
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<TrashStats>({
    total: 0,
    memos: 0,
    schedules: 0,
    tasks: 0,
    files: 0,
    expiring_soon: 0,
  });

  // 필터 상태
  const [selectedType, setSelectedType] = useState<'memo' | 'schedule' | 'task' | 'file' | ''>('');
  const [showFilters, setShowFilters] = useState(false);

  // 선택된 항목들 (일괄 작업용)
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const itemTypes = ['memo', 'schedule', 'task', 'file'];

  // 아이템 타입별 번역
  const getTypeLabel = (type: string): string => {
    return t(`trash.types.${type}`, { defaultValue: type });
  };

  // 아이템 타입별 아이콘
  const getTypeIcon = (type: string): string => {
    switch (type) {
      case 'memo': return '📝';
      case 'schedule': return '📅';
      case 'task': return '✅';
      case 'file': return '📎';
      default: return '📄';
    }
  };

  // 만료 시간까지 남은 시간 계산
  const getTimeUntilExpiration = (expirationAt: string): { text: string; isUrgent: boolean } => {
    const now = new Date();
    const expiration = new Date(expirationAt);
    const diffMs = expiration.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffMs <= 0) {
      return { text: t('trash.expired'), isUrgent: true };
    } else if (diffHours < 1) {
      return { 
        text: t('trash.expires_in_minutes', { minutes: diffMinutes }), 
        isUrgent: true 
      };
    } else if (diffHours < 6) {
      return { 
        text: t('trash.expires_in_hours', { hours: diffHours }), 
        isUrgent: true 
      };
    } else {
      return { 
        text: t('trash.expires_in_hours', { hours: diffHours }), 
        isUrgent: false 
      };
    }
  };

  // 휴지통 항목 로드
  const loadTrashItems = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🗑️ 휴지통 항목 로드 시작');

      const itemsData = await api.trash.getList(selectedType || undefined, 0, 100);
      console.log('✅ 휴지통 데이터 로드 성공:', itemsData.length);

      setTrashItems(itemsData);

      // 통계 로드
      const statsData = await api.trash.getStats();
      setStats(statsData);

      setError(null);
    } catch (err: any) {
      console.error('❌ 휴지통 로드 실패:', err);
      setError('휴지통 데이터를 불러오는데 실패했습니다.');
      setTrashItems([]);
    } finally {
      setLoading(false);
    }
  }, [selectedType]);

  useEffect(() => {
    loadTrashItems();
  }, [loadTrashItems]);

  // 항목 복원
  const handleRestore = async (trashItem: TrashItem) => {
    if (!confirm(t('trash.restore_confirm', { title: trashItem.title }))) {
      return;
    }

    try {
      console.log('♻️ 항목 복원 시작:', trashItem.id);
      await api.trash.restore(trashItem.id);
      console.log('✅ 항목 복원 성공');
      alert(t('trash.messages.restored'));
      loadTrashItems();
    } catch (error: any) {
      console.error('❌ 항목 복원 실패:', error);
      alert(t('trash.messages.restore_error'));
    }
  };

  // 개별 항목 영구 삭제
  const handlePermanentDelete = async (trashItem: TrashItem) => {
    if (!confirm(t('trash.permanent_delete_confirm', { title: trashItem.title }))) {
      return;
    }

    try {
      console.log('🔥 개별 항목 영구 삭제 시작:', trashItem.id);
      await api.trash.permanentDelete(trashItem.id);
      console.log('✅ 개별 항목 영구 삭제 성공');
      alert(t('trash.messages.permanently_deleted'));
      loadTrashItems();
    } catch (error: any) {
      console.error('❌ 개별 항목 영구 삭제 실패:', error);
      alert(t('trash.messages.delete_error'));
    }
  };

  // 휴지통 전체 비우기
  const handleEmptyTrash = async () => {
    if (!confirm(t('trash.empty_trash_confirm'))) {
      return;
    }

    try {
      console.log('🗑️ 휴지통 전체 비우기 시작');
      const result = await api.trash.emptyTrash();
      console.log('✅ 휴지통 전체 비우기 성공:', result.deleted_count);
      alert(t('trash.messages.emptied', { count: result.deleted_count }));
      loadTrashItems();
    } catch (error: any) {
      console.error('❌ 휴지통 전체 비우기 실패:', error);
      alert(t('trash.messages.empty_error'));
    }
  };

  // 선택된 항목들 복원
  const handleRestoreSelected = async () => {
    if (selectedItems.size === 0) {
      alert(t('trash.messages.no_items_selected'));
      return;
    }

    if (!confirm(t('trash.restore_selected_confirm', { count: selectedItems.size }))) {
      return;
    }

    try {
      const promises = Array.from(selectedItems).map(id => api.trash.restore(id));
      await Promise.all(promises);
      
      alert(t('trash.messages.restored_count', { count: selectedItems.size }));
      setSelectedItems(new Set());
      setSelectAll(false);
      loadTrashItems();
    } catch (error: any) {
      console.error('❌ 선택된 항목들 복원 실패:', error);
      alert(t('trash.messages.restore_error'));
    }
  };

  // 선택된 항목들 영구 삭제
  const handleDeleteSelected = async () => {
    if (selectedItems.size === 0) {
      alert(t('trash.messages.no_items_selected'));
      return;
    }

    if (!confirm(t('trash.permanent_delete_selected_confirm', { count: selectedItems.size }))) {
      return;
    }

    try {
      const promises = Array.from(selectedItems).map(id => api.trash.permanentDelete(id));
      await Promise.all(promises);
      
      alert(t('trash.messages.permanently_deleted_count', { count: selectedItems.size }));
      setSelectedItems(new Set());
      setSelectAll(false);
      loadTrashItems();
    } catch (error: any) {
      console.error('❌ 선택된 항목들 영구 삭제 실패:', error);
      alert(t('trash.messages.delete_error'));
    }
  };

  // 전체 선택/해제
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems(new Set());
      setSelectAll(false);
    } else {
      setSelectedItems(new Set(trashItems.map(item => item.id)));
      setSelectAll(true);
    }
  };

  // 개별 항목 선택/해제
  const handleSelectItem = (itemId: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
    setSelectAll(newSelected.size === trashItems.length && trashItems.length > 0);
  };

  // 필터 초기화
  const clearFilters = () => {
    setSelectedType('');
  };

  return (
    <div className="trash-container">
      {/* 사이드바 - 휴지통 항목 목록 */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>🗑️ {t('trash.title')}</h2>
          
          {/* 일괄 작업 버튼들 */}
          {selectedItems.size > 0 && (
            <div className="bulk-actions">
              <button onClick={handleRestoreSelected} className="restore-btn">
                ♻️ {t('trash.restore_selected')} ({selectedItems.size})
              </button>
              <button onClick={handleDeleteSelected} className="delete-btn">
                🔥 {t('trash.delete_selected')} ({selectedItems.size})
              </button>
            </div>
          )}
          
          {/* 휴지통 비우기 버튼 */}
          {trashItems.length > 0 && (
            <button onClick={handleEmptyTrash} className="empty-trash-btn">
              🗑️ {t('trash.empty_all')}
            </button>
          )}
        </div>

        {/* 필터 버튼들 */}
        <div className="sidebar-filters">
          <div className="filter-buttons">
            <button 
              className={`filter-btn ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              🔍 {t('trash.filters.filter')}
            </button>
            {selectedType && (
              <button className="clear-filter-btn" onClick={clearFilters}>
                {t('trash.filters.reset')}
              </button>
            )}
          </div>
        </div>

        {/* 필터 패널 */}
        {showFilters && (
          <div className="sidebar-filter-panel">
            <div className="filter-group">
              <label>{t('trash.filters.item_type')}</label>
              <select 
                value={selectedType} 
                onChange={(e) => setSelectedType(e.target.value as any)}
              >
                <option value="">{t('trash.filters.all')}</option>
                {itemTypes.map(type => (
                  <option key={type} value={type}>
                    {getTypeIcon(type)} {getTypeLabel(type)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* 전체 선택 체크박스 */}
        {trashItems.length > 0 && (
          <div className="select-all-container">
            <label className="select-all-label">
              <input 
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
              />
              {t('trash.select_all')} ({trashItems.length})
            </label>
          </div>
        )}

        {/* 휴지통 항목 목록 */}
        <div className="memo-list">
          {loading ? (
            <div className="loading">{t('trash.loading')}</div>
          ) : trashItems.length === 0 ? (
            <div className="empty-message">
              <div className="empty-icon">🗑️</div>
              <div className="empty-text">{t('trash.messages.no_items')}</div>
            </div>
          ) : (
            trashItems.map(item => {
              const timeInfo = getTimeUntilExpiration(item.expiration_at);
              return (
                <div 
                  key={item.id} 
                  className={`memo-item trash-item ${timeInfo.isUrgent ? 'urgent' : ''} ${selectedItems.has(item.id) ? 'selected' : ''}`}
                >
                  <div className="trash-item-header">
                    <div className="trash-item-select">
                      <input 
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={() => handleSelectItem(item.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="item-type-icon">{getTypeIcon(item.item_type)}</span>
                    </div>
                    <div className="trash-item-info">
                      <h3>{item.title || t('trash.no_title')}</h3>
                      <div className="trash-item-meta">
                        <span className="item-type">{getTypeLabel(item.item_type)}</span>
                        <span className={`expiration-time ${timeInfo.isUrgent ? 'urgent' : ''}`}>
                          {timeInfo.text}
                        </span>
                      </div>
                    </div>
                    <div className="trash-item-actions">
                      <button 
                        onClick={() => handleRestore(item)}
                        className="restore-action-btn"
                        title={t('trash.restore')}
                      >
                        ♻️
                      </button>
                      <button 
                        onClick={() => handlePermanentDelete(item)}
                        className="delete-action-btn"
                        title={t('trash.permanent_delete')}
                      >
                        🔥
                      </button>
                    </div>
                  </div>
                  {item.content && (
                    <p className="trash-item-content">
                      {item.content.substring(0, 100)}...
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* 메인 영역 - 휴지통 대시보드 */}
      <main className="main-content">
        <div className="trash-dashboard">
        {loading ? (
          <div className="trash-loading">
            <div className="loading-spinner"></div>
            <p>{t('trash.loading')}</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="error-banner">
                <p>⚠️ {error}</p>
              </div>
            )}

            {/* 대시보드 헤더 */}
            <div className="main-header">
              <h2>🗑️ {t('trash.dashboard.title')}</h2>
            </div>

            {/* 통계 대시보드 */}
            <div className="dashboard-view">
              <div className="stats-container">
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-number">{stats.total}</div>
                    <div className="stat-label">{t('trash.dashboard.total')}</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-number" style={{color: '#007BFF'}}>{stats.memos}</div>
                    <div className="stat-label">{t('trash.dashboard.memos')}</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-number" style={{color: '#28A745'}}>{stats.schedules}</div>
                    <div className="stat-label">{t('trash.dashboard.schedules')}</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-number" style={{color: '#FFC107'}}>{stats.tasks}</div>
                    <div className="stat-label">{t('trash.dashboard.tasks')}</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-number" style={{color: '#6F42C1'}}>{stats.files}</div>
                    <div className="stat-label">{t('trash.dashboard.files')}</div>
                  </div>
                  <div className="stat-item urgent">
                    <div className="stat-number" style={{color: '#DC3545'}}>{stats.expiring_soon}</div>
                    <div className="stat-label">{t('trash.dashboard.expiring_soon')}</div>
                  </div>
                </div>
              </div>

              {/* 대시보드 안내 */}
              <div className="dashboard-info">
                <div className="info-card">
                  <h3>📋 {t('trash.info.about_title')}</h3>
                  <p>{t('trash.info.about_description')}</p>
                  <ul>
                    <li>{t('trash.info.rule_1')}</li>
                    <li>{t('trash.info.rule_2')}</li>
                    <li>{t('trash.info.rule_3')}</li>
                  </ul>
                </div>

                {stats.expiring_soon > 0 && (
                  <div className="info-card urgent">
                    <h3>⚠️ {t('trash.info.urgent_title')}</h3>
                    <p>{t('trash.info.urgent_description', { count: stats.expiring_soon })}</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        </div>
      </main>
    </div>
  );
};

export default TrashView;