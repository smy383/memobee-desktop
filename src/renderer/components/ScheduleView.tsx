import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api, Schedule, CreateScheduleRequest, UpdateScheduleRequest } from '../../shared/services/apiService';
import DesktopCalendar from './DesktopCalendar';
import './ScheduleView.css';

interface ScheduleStats {
  total: number;
  upcoming: number;
  completed: number;
  cancelled: number;
  thisWeek: number;
  thisMonth: number;
}

interface ScheduleViewProps {
  // 추후 props 확장 가능
}

const ScheduleView: React.FC<ScheduleViewProps> = () => {
  const { t } = useTranslation();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [allSchedules, setAllSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ScheduleStats>({
    total: 0,
    upcoming: 0,
    completed: 0,
    cancelled: 0,
    thisWeek: 0,
    thisMonth: 0,
  });

  // 뷰 모드 (대시보드/달력)
  const [viewMode, setViewMode] = useState<'dashboard' | 'calendar'>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>('');

  // 필터 상태
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [hideCompleted, setHideCompleted] = useState<boolean>(true);

  // 모달 상태
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

  // 폼 데이터
  const [formData, setFormData] = useState<CreateScheduleRequest>({
    title: '',
    description: '',
    start_datetime: '',
    end_datetime: '',
    location: '',
    participants: [],
    category: 'personal', // 기본값을 personal로 변경
    is_all_day: false,
  });

  // 날짜/시간 분리 상태
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');

  const categories = ['work', 'personal', 'appointment', 'meeting', 'other'];
  const statuses = ['upcoming', 'completed', 'cancelled'];

  // 카테고리 번역
  const getCategoryLabel = (category: string): string => {
    return t(`schedule.categories.${category}`, { defaultValue: category });
  };

  // 상태 번역
  const getStatusLabel = (status: string): string => {
    return t(`schedule.statuses.${status}`, { defaultValue: status });
  };

  // 날짜/시간 조합 함수
  const combineDateTime = (date: string, time: string): string => {
    if (!date || !time) return '';
    return `${date}T${time}:00.000Z`;
  };

  // 날짜/시간 분리 함수
  const parseDateTime = (datetime: string): { date: string; time: string } => {
    if (!datetime) return { date: '', time: '09:00' };
    
    const date = new Date(datetime);
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = date.toTimeString().substring(0, 5); // HH:MM
    
    return { date: dateStr, time: timeStr };
  };

  // 날짜 포맷팅
  const formatDateTime = (schedule: Schedule): string => {
    const { start_datetime, all_day_date, is_all_day, status } = schedule;
    
    // 종일 일정 처리
    if (is_all_day && all_day_date) {
      const date = new Date(all_day_date + 'T00:00:00');
      const dateStr = date.toLocaleDateString('ko-KR');
      return `${dateStr} (${t('schedule.all_day')})`;
    }
    
    // 일반 일정 처리
    if (!start_datetime) {
      return t('schedule.time.time_undecided');
    }

    const date = new Date(start_datetime);
    const dateStr = date.toLocaleDateString('ko-KR');
    
    if (is_all_day) {
      return `${dateStr} (${t('schedule.all_day')})`;
    }

    const timeStr = date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });

    return `${dateStr} ${timeStr}`;
  };

  // 상태별 색상
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'upcoming': return '#007BFF';
      case 'completed': return '#28A745';
      case 'cancelled': return '#DC3545';
      default: return '#6C757D';
    }
  };

  // 카테고리별 색상
  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'work': return '#FFC107';
      case 'personal': return '#17A2B8';
      case 'appointment': return '#E83E8C';
      case 'meeting': return '#6F42C1';
      default: return '#6C757D';
    }
  };

  // 일정 목록 로드
  const loadSchedules = useCallback(async () => {
    try {
      setLoading(true);
      console.log('📅 일정 목록 로드 시작');

      const schedulesData = await api.schedules.getList(
        0, 100, selectedCategory, selectedStatus
      );
      console.log('✅ 일정 데이터 로드 성공:', schedulesData.length);

      // 전체 일정 저장 (달력용)
      setAllSchedules(schedulesData);

      // 필터 적용
      let filteredSchedules = schedulesData;

      // 날짜 필터 (달력에서 선택된 날짜)
      if (selectedDate) {
        filteredSchedules = filteredSchedules.filter(schedule => {
          // 종일 일정: all_day_date 확인
          if (schedule.is_all_day && schedule.all_day_date) {
            return schedule.all_day_date === selectedDate;
          }
          // 일반 일정: start_datetime 확인
          if (schedule.start_datetime) {
            const scheduleDate = schedule.start_datetime.split('T')[0];
            return scheduleDate === selectedDate;
          }
          return false;
        });
      }

      // 완료된 일정 숨김 필터
      if (hideCompleted) {
        filteredSchedules = filteredSchedules.filter(s => s.status !== 'completed');
      }

      setSchedules(filteredSchedules);

      // 통계 계산 (전체 데이터 기준)
      const newStats: ScheduleStats = {
        total: schedulesData.length,
        upcoming: schedulesData.filter(s => s.status === 'upcoming').length,
        completed: schedulesData.filter(s => s.status === 'completed').length,
        cancelled: schedulesData.filter(s => s.status === 'cancelled').length,
        thisWeek: schedulesData.filter(s => {
          const scheduleDate = new Date(s.start_datetime || '');
          const now = new Date();
          const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          return scheduleDate >= weekStart && scheduleDate <= weekEnd;
        }).length,
        thisMonth: schedulesData.filter(s => {
          const scheduleDate = new Date(s.start_datetime || '');
          const now = new Date();
          return (
            scheduleDate.getMonth() === now.getMonth() &&
            scheduleDate.getFullYear() === now.getFullYear()
          );
        }).length,
      };
      setStats(newStats);
      setError(null);
    } catch (err: any) {
      console.error('❌ 일정 로드 실패:', err);
      setError('일정을 불러오는데 실패했습니다.');
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedStatus, hideCompleted, selectedDate]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  // 새 일정 생성 모달 열기
  const handleCreateSchedule = () => {
    setFormData({
      title: '',
      description: '',
      start_datetime: '',
      end_datetime: '',
      location: '',
      participants: [],
      category: 'personal', // 기본값을 personal로 변경
      is_all_day: false,
    });

    // 오늘 날짜로 초기화
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
    setStartTime('09:00');
    setEndTime('10:00');

    setSelectedSchedule(null);
    setModalMode('create');
    setShowModal(true);
  };

  // 일정 편집 모달 열기
  const handleEditSchedule = (schedule: Schedule) => {
    setFormData({
      title: schedule.title,
      description: schedule.description || '',
      start_datetime: schedule.start_datetime || '',
      end_datetime: schedule.end_datetime || '',
      all_day_date: schedule.all_day_date || '',
      location: schedule.location || '',
      participants: schedule.participants || [],
      category: schedule.category,
      is_all_day: schedule.is_all_day,
    });

    // 날짜/시간 분리 설정
    if (schedule.is_all_day && schedule.all_day_date) {
      setStartDate(schedule.all_day_date);
      setEndDate(schedule.all_day_date);
      setStartTime('09:00');
      setEndTime('10:00');
    } else {
      const startParsed = parseDateTime(schedule.start_datetime || '');
      const endParsed = parseDateTime(schedule.end_datetime || '');
      
      setStartDate(startParsed.date);
      setStartTime(startParsed.time);
      setEndDate(endParsed.date);
      setEndTime(endParsed.time);
    }

    setSelectedSchedule(schedule);
    setModalMode('edit');
    setShowModal(true);
  };

  // 일정 저장
  const handleSaveSchedule = async () => {
    try {
      if (!formData.title.trim()) {
        alert('제목을 입력해주세요.');
        return;
      }

      console.log('📅 일정 저장 시작:', modalMode);

      if (modalMode === 'create') {
        const scheduleData = formData.is_all_day 
          ? {
              title: formData.title,
              description: formData.description || '',
              all_day_date: startDate,
              start_datetime: null,
              end_datetime: null,
              location: formData.location || '',
              participants: formData.participants || [],
              category: formData.category || 'other',
              is_all_day: true,
            }
          : {
              title: formData.title,
              description: formData.description || '',
              start_datetime: combineDateTime(startDate, startTime),
              end_datetime: combineDateTime(endDate, endTime),
              all_day_date: null,
              location: formData.location || '',
              participants: formData.participants || [],
              category: formData.category || 'other',
              is_all_day: false,
            };

        await api.schedules.create(scheduleData);
        console.log('✅ 새 일정 생성 성공');
        alert('일정이 생성되었습니다.');
      } else if (selectedSchedule) {
        const scheduleData = formData.is_all_day 
          ? {
              title: formData.title,
              description: formData.description || '',
              all_day_date: startDate,
              start_datetime: null,
              end_datetime: null,
              location: formData.location || '',
              participants: formData.participants || [],
              category: formData.category || 'other',
              is_all_day: true,
            }
          : {
              title: formData.title,
              description: formData.description || '',
              start_datetime: combineDateTime(startDate, startTime),
              end_datetime: combineDateTime(endDate, endTime),
              all_day_date: null,
              location: formData.location || '',
              participants: formData.participants || [],
              category: formData.category || 'other',
              is_all_day: false,
            };

        await api.schedules.update(selectedSchedule.id, scheduleData);
        console.log('✅ 일정 수정 성공');
        alert('일정이 수정되었습니다.');
      }

      setShowModal(false);
      loadSchedules();
    } catch (error: any) {
      console.error('❌ 일정 저장 실패:', error);
      alert('일정 저장에 실패했습니다.');
    }
  };

  // 일정 삭제
  const handleDeleteSchedule = async (schedule: Schedule) => {
    if (!confirm(`"${schedule.title}" 일정을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      console.log('📅 일정 삭제 시작:', schedule.id);
      await api.schedules.delete(schedule.id);
      console.log('✅ 일정 삭제 성공');
      alert('일정이 삭제되었습니다.');
      loadSchedules();
    } catch (error: any) {
      console.error('❌ 일정 삭제 실패:', error);
      alert('일정 삭제에 실패했습니다.');
    }
  };

  // 필터 초기화
  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedStatus('');
    setSelectedDate('');
    setHideCompleted(true);
  };

  // 날짜 선택 핸들러
  const handleDateSelect = (date: string) => {
    console.log('📅 달력 날짜 선택:', date);
    setSelectedDate(date === selectedDate ? '' : date);
  };

  // 일정을 날짜별로 그룹화
  const getSchedulesByDate = (): { [key: string]: Schedule[] } => {
    const groupedSchedules: { [key: string]: Schedule[] } = {};
    
    schedules.forEach(schedule => {
      let dateKey = '';
      if (schedule.is_all_day && schedule.all_day_date) {
        dateKey = schedule.all_day_date;
      } else if (schedule.start_datetime) {
        dateKey = schedule.start_datetime.split('T')[0];
      }
      
      if (dateKey) {
        if (!groupedSchedules[dateKey]) {
          groupedSchedules[dateKey] = [];
        }
        groupedSchedules[dateKey].push(schedule);
      }
    });
    
    return groupedSchedules;
  };

  // 날짜 포맷팅 (그룹 헤더용)
  const formatDateHeader = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return t('schedule.time.today') + ' (' + date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) + ')';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return t('schedule.time.tomorrow') + ' (' + date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) + ')';
    } else {
      return date.toLocaleDateString('ko-KR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'short'
      });
    }
  };

  return (
    <div className="schedule-container">
      {/* 사이드바 - 일정 목록 */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <button onClick={handleCreateSchedule} className="new-memo-btn">
            + {t('schedule.new_schedule')}
          </button>
        </div>

        {/* 필터 버튼들 */}
        <div className="sidebar-filters">
          <div className="filter-buttons">
            <button 
              className={`filter-btn ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              🔍 {t('schedule.filters.filter')}
            </button>
            {(selectedCategory || selectedStatus || selectedDate) && (
              <button className="clear-filter-btn" onClick={clearFilters}>
                {t('schedule.filters.reset')}
              </button>
            )}
          </div>
        </div>

        {/* 필터 패널 */}
        {showFilters && (
          <div className="sidebar-filter-panel">
            <div className="filter-group">
              <label>{t('schedule.filters.category')}</label>
              <select 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">{t('schedule.filters.all')}</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {getCategoryLabel(category)}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>{t('schedule.filters.status')}</label>
              <select 
                value={selectedStatus} 
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="">{t('schedule.filters.all')}</option>
                {statuses.map(status => (
                  <option key={status} value={status}>
                    {getStatusLabel(status)}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>
                <input 
                  type="checkbox" 
                  checked={hideCompleted}
                  onChange={(e) => setHideCompleted(e.target.checked)}
                />
{t('schedule.filters.hide_completed')}
              </label>
            </div>
          </div>
        )}

        {/* 일정 목록 */}
        <div className="memo-list">
          {loading ? (
            <div className="loading">{t('schedule.loading')}</div>
          ) : schedules.length === 0 ? (
            <div className="empty-message">
              {selectedDate ? t('schedule.messages.no_schedules_selected_date') : t('schedule.messages.no_schedules')}
            </div>
          ) : (
            (() => {
              const groupedSchedules = getSchedulesByDate();
              const sortedDates = Object.keys(groupedSchedules).sort();

              return sortedDates.map(dateKey => (
                <div key={dateKey} className="schedule-date-group">
                  <div className="date-group-header">
                    <h4>{formatDateHeader(dateKey)}</h4>
                    <span className="schedule-count-badge">{groupedSchedules[dateKey].length}</span>
                  </div>
                  {groupedSchedules[dateKey].map(schedule => (
                    <div 
                      key={schedule.id} 
                      className={`memo-item schedule-list-item`}
                      onClick={() => handleEditSchedule(schedule)}
                    >
                      <div className="schedule-item-header">
                        <h3>{schedule.title}</h3>
                        <div 
                          className="schedule-status-badge" 
                          style={{backgroundColor: getStatusColor(schedule.status)}}
                        >
                          {getStatusLabel(schedule.status)}
                        </div>
                      </div>
                      <div className="schedule-item-meta">
                        <div 
                          className="category-badge-small" 
                          style={{backgroundColor: getCategoryColor(schedule.category)}}
                          title={`카테고리: ${schedule.category}`}
                        >
                          {getCategoryLabel(schedule.category)}
                        </div>
                        <span className="schedule-time-small">
                          🕐 {formatDateTime(schedule)}
                        </span>
                      </div>
                      {schedule.location && (
                        <p className="schedule-location-small">📍 {schedule.location}</p>
                      )}
                      {schedule.description && (
                        <p className="schedule-description-small">
                          {schedule.description.substring(0, 60)}...
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ));
            })()
          )}
        </div>
      </aside>

      {/* 메인 영역 - 대시보드 + 달력 */}
      <main className="main-content">
        {loading ? (
          <div className="schedule-loading">
            <div className="loading-spinner"></div>
            <p>{t('schedule.loading')}</p>
          </div>
        ) : (
          <>
            {error && (
          <div className="error-banner">
            <p>⚠️ {error}</p>
          </div>
        )}

        {/* 뷰 모드 전환 */}
        <div className="main-header">
          <div className="view-mode-buttons">
            <button 
              className={`view-btn ${viewMode === 'dashboard' ? 'active' : ''}`}
              onClick={() => setViewMode('dashboard')}
            >
              📊 {t('schedule.dashboard.title')}
            </button>
            <button 
              className={`view-btn ${viewMode === 'calendar' ? 'active' : ''}`}
              onClick={() => setViewMode('calendar')}
            >
              📅 {t('schedule.dashboard.calendar')}
            </button>
          </div>
        </div>

        {/* 선택된 날짜 표시 */}
        {selectedDate && (
          <div className="selected-date-banner">
            <div className="selected-date-content">
              <span className="selected-date-icon">📅</span>
              <span className="selected-date-text">
                선택된 날짜: {formatDateHeader(selectedDate)}
              </span>
              <button 
                className="clear-date-btn"
                onClick={() => setSelectedDate('')}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* 대시보드 뷰 */}
        {viewMode === 'dashboard' && (
          <div className="dashboard-view">
            {/* 통계 대시보드 */}
            <div className="stats-container">
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-number">{stats.total}</div>
                  <div className="stat-label">{t('schedule.dashboard.total')}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number" style={{color: '#007BFF'}}>{stats.upcoming}</div>
                  <div className="stat-label">{t('schedule.dashboard.upcoming')}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number" style={{color: '#28A745'}}>{stats.completed}</div>
                  <div className="stat-label">{t('schedule.dashboard.completed')}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number" style={{color: '#DC3545'}}>{stats.cancelled}</div>
                  <div className="stat-label">{t('schedule.dashboard.cancelled')}</div>
                </div>
              </div>
              <div className="period-stats">
                <span>{t('schedule.dashboard.this_week_count', { count: stats.thisWeek })}</span>
                <span>{t('schedule.dashboard.this_month_count', { count: stats.thisMonth })}</span>
              </div>
            </div>

            {/* 최근 일정 미리보기 */}
            <div className="recent-schedules">
              <h3>{t('schedule.dashboard.recent_schedules')}</h3>
              {schedules.slice(0, 5).map(schedule => (
                <div key={schedule.id} className="recent-schedule-item" onClick={() => handleEditSchedule(schedule)}>
                  <div className="recent-schedule-title">{schedule.title}</div>
                  <div className="recent-schedule-time">{formatDateTime(schedule)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 달력 뷰 */}
        {viewMode === 'calendar' && (
          <div className="calendar-view">
            <DesktopCalendar
              schedules={allSchedules}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
            />
          </div>
        )}
          </>
        )}
      </main>

      {/* 일정 생성/편집 모달 */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modalMode === 'create' ? '새 일정 생성' : '일정 편집'}</h3>
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>제목 *</label>
                <input 
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="일정 제목을 입력하세요"
                />
              </div>
              <div className="form-group">
                <label>설명</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="일정 설명을 입력하세요"
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>
                  <input 
                    type="checkbox"
                    checked={formData.is_all_day}
                    onChange={(e) => setFormData({...formData, is_all_day: e.target.checked})}
                  />
                  종일 일정
                </label>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>시작 날짜</label>
                  <input 
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                {!formData.is_all_day && (
                  <div className="form-group">
                    <label>시작 시간</label>
                    <input 
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                )}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>종료 날짜</label>
                  <input 
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                {!formData.is_all_day && (
                  <div className="form-group">
                    <label>종료 시간</label>
                    <input 
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>장소</label>
                <input 
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="장소를 입력하세요"
                />
              </div>
              <div className="form-group">
                <label>{t('schedule.filters.category')}</label>
                <select 
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {getCategoryLabel(category)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              {modalMode === 'edit' && (
                <button className="delete-btn" onClick={() => selectedSchedule && handleDeleteSchedule(selectedSchedule)}>
                  삭제
                </button>
              )}
              <button onClick={() => setShowModal(false)}>취소</button>
              <button className="save-btn" onClick={handleSaveSchedule}>
                {modalMode === 'create' ? '생성' : '수정'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleView;