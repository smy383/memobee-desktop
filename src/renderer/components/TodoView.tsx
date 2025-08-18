import React, { useState, useEffect, useCallback } from 'react';
import { uiLogger } from '../../shared/utils/logger';
import { useTranslation } from 'react-i18next';
import { api, Task, CreateTaskRequest, UpdateTaskRequest } from '../../shared/services/apiService';
import './TodoView.css';

interface TaskStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  high_priority: number;
  due_today: number;
}

interface TodoViewProps {
  // 추후 props 확장 가능
}

const TodoView: React.FC<TodoViewProps> = () => {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<TaskStats>({
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    high_priority: 0,
    due_today: 0,
  });

  // 필터 상태
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [showCompleted, setShowCompleted] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState(false);

  // 모달 상태
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // 폼 데이터
  const [formData, setFormData] = useState<CreateTaskRequest>({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium',
    category: 'personal',
    tags: [],
    estimated_duration: undefined,
    status: 'pending',
  });

  const categories = ['work', 'personal', 'study', 'shopping', 'health'];
  const priorities = ['high', 'medium', 'low'];
  const statuses = ['pending', 'in_progress', 'completed'];

  // 카테고리 번역
  const getCategoryLabel = (category: string): string => {
    return t(`todo.categories.${category}`, { defaultValue: category });
  };

  // 우선순위 번역
  const getPriorityLabel = (priority: string): string => {
    return t(`todo.priorities.${priority}`, { defaultValue: priority });
  };

  // 상태 번역
  const getStatusLabel = (status: string): string => {
    return t(`todo.statuses.${status}`, { defaultValue: status });
  };

  // 우선순위별 색상
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high': return '#DC3545';
      case 'medium': return '#FFC107';
      case 'low': return '#28A745';
      default: return '#6C757D';
    }
  };

  // 상태별 색상
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending': return '#6C757D';
      case 'in_progress': return '#007BFF';
      case 'completed': return '#28A745';
      default: return '#6C757D';
    }
  };

  // 할일 목록 로드
  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      uiLogger.debug('📝 할일 목록 로드 시작');

      const tasksData = await api.tasks.getList(
        0, 100, selectedCategory, selectedPriority, selectedStatus, showCompleted
      );
      uiLogger.debug('✅ 할일 데이터 로드 성공:', tasksData.length);

      setTasks(tasksData);

      // 통계 계산
      const newStats: TaskStats = {
        total: tasksData.length,
        pending: tasksData.filter(t => t.status === 'pending').length,
        in_progress: tasksData.filter(t => t.status === 'in_progress').length,
        completed: tasksData.filter(t => t.is_completed).length,
        high_priority: tasksData.filter(t => t.priority === 'high').length,
        due_today: tasksData.filter(t => {
          if (!t.due_date) return false;
          const today = new Date().toISOString().split('T')[0];
          return t.due_date.split('T')[0] === today;
        }).length,
      };
      setStats(newStats);
      setError(null);
    } catch (err: any) {
      uiLogger.error('❌ 할일 로드 실패:', err);
      setError('할일을 불러오는데 실패했습니다.');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedPriority, selectedStatus, showCompleted]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // 새 할일 생성 모달 열기
  const handleCreateTask = () => {
    setFormData({
      title: '',
      description: '',
      due_date: '',
      priority: 'medium',
      category: 'personal',
      tags: [],
      estimated_duration: undefined,
      status: 'pending',
    });

    setSelectedTask(null);
    setModalMode('create');
    setShowModal(true);
  };

  // 할일 편집 모달 열기
  const handleEditTask = (task: Task) => {
    setFormData({
      title: task.title,
      description: task.description || '',
      due_date: task.due_date || '',
      priority: task.priority,
      category: task.category,
      tags: task.tags || [],
      estimated_duration: task.estimated_duration,
      status: task.status,
    });

    setSelectedTask(task);
    setModalMode('edit');
    setShowModal(true);
  };

  // 할일 저장
  const handleSaveTask = async () => {
    try {
      if (!formData.title.trim()) {
        alert('제목을 입력해주세요.');
        return;
      }

      uiLogger.debug('📝 할일 저장 시작:', modalMode);

      if (modalMode === 'create') {
        await api.tasks.create(formData);
        uiLogger.debug('✅ 새 할일 생성 성공');
        alert('할일이 생성되었습니다.');
      } else if (selectedTask) {
        await api.tasks.update(selectedTask.id, formData);
        uiLogger.debug('✅ 할일 수정 성공');
        alert('할일이 수정되었습니다.');
      }

      setShowModal(false);
      loadTasks();
    } catch (error: any) {
      uiLogger.error('❌ 할일 저장 실패:', error);
      alert('할일 저장에 실패했습니다.');
    }
  };

  // 할일 삭제
  const handleDeleteTask = async (task: Task) => {
    if (!confirm(`"${task.title}" 할일을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      uiLogger.debug('📝 할일 삭제 시작:', task.id);
      await api.tasks.delete(task.id);
      uiLogger.debug('✅ 할일 삭제 성공');
      alert('할일이 삭제되었습니다.');
      loadTasks();
    } catch (error: any) {
      uiLogger.error('❌ 할일 삭제 실패:', error);
      alert('할일 삭제에 실패했습니다.');
    }
  };

  // 할일 완료/미완료 토글
  const handleToggleComplete = async (task: Task) => {
    try {
      if (task.is_completed) {
        await api.tasks.uncomplete(task.id);
      } else {
        await api.tasks.complete(task.id);
      }
      loadTasks();
    } catch (error: any) {
      uiLogger.error('❌ 할일 완료 상태 변경 실패:', error);
      alert('할일 상태 변경에 실패했습니다.');
    }
  };

  // 필터 초기화
  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedPriority('');
    setSelectedStatus('');
    setShowCompleted(false);
  };

  // 마감일 포맷팅
  const formatDueDate = (dueDateString: string): string => {
    if (!dueDateString) return '';
    
    const dueDate = new Date(dueDateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (dueDate.toDateString() === today.toDateString()) {
      return t('todo.due_date.today');
    } else if (dueDate.toDateString() === tomorrow.toDateString()) {
      return t('todo.due_date.tomorrow');
    } else {
      return dueDate.toLocaleDateString('ko-KR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  return (
    <div className="todo-container">
      {/* 사이드바 - 할일 목록 */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <button onClick={handleCreateTask} className="new-memo-btn">
            + {t('todo.new_todo')}
          </button>
        </div>

        {/* 필터 버튼들 */}
        <div className="sidebar-filters">
          <div className="filter-buttons">
            <button 
              className={`filter-btn ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              🔍 {t('todo.filters.filter')}
            </button>
            {(selectedCategory || selectedPriority || selectedStatus) && (
              <button className="clear-filter-btn" onClick={clearFilters}>
                {t('todo.filters.reset')}
              </button>
            )}
          </div>
        </div>

        {/* 필터 패널 */}
        {showFilters && (
          <div className="sidebar-filter-panel">
            <div className="filter-group">
              <label>{t('todo.filters.category')}</label>
              <select 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">{t('todo.filters.all')}</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {getCategoryLabel(category)}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>{t('todo.filters.priority')}</label>
              <select 
                value={selectedPriority} 
                onChange={(e) => setSelectedPriority(e.target.value)}
              >
                <option value="">{t('todo.filters.all')}</option>
                {priorities.map(priority => (
                  <option key={priority} value={priority}>
                    {getPriorityLabel(priority)}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>{t('todo.filters.status')}</label>
              <select 
                value={selectedStatus} 
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="">{t('todo.filters.all')}</option>
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
                  checked={showCompleted}
                  onChange={(e) => setShowCompleted(e.target.checked)}
                />
                {t('todo.filters.show_completed')}
              </label>
            </div>
          </div>
        )}

        {/* 할일 목록 */}
        <div className="memo-list">
          {loading ? (
            <div className="loading">{t('todo.loading')}</div>
          ) : tasks.length === 0 ? (
            <div className="empty-message">
              {t('todo.messages.no_tasks')}
            </div>
          ) : (
            tasks.map(task => (
              <div 
                key={task.id} 
                className={`memo-item todo-list-item ${task.is_completed ? 'completed' : ''}`}
                onClick={() => handleEditTask(task)}
              >
                <div className="todo-item-header">
                  <div className="todo-checkbox-title">
                    <input 
                      type="checkbox"
                      checked={task.is_completed}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleToggleComplete(task);
                      }}
                    />
                    <h3 className={task.is_completed ? 'completed-title' : ''}>{task.title}</h3>
                  </div>
                  <div 
                    className="priority-badge" 
                    style={{backgroundColor: getPriorityColor(task.priority)}}
                  >
                    {getPriorityLabel(task.priority)}
                  </div>
                </div>
                <div className="todo-item-meta">
                  <div 
                    className="category-badge-small" 
                    style={{backgroundColor: getStatusColor(task.status)}}
                  >
                    {getCategoryLabel(task.category)}
                  </div>
                  {task.due_date && (
                    <span className="due-date-small">
                      📅 {formatDueDate(task.due_date)}
                    </span>
                  )}
                  {task.estimated_duration && (
                    <span className="duration-small">
                      ⏱️ {task.estimated_duration}분
                    </span>
                  )}
                </div>
                {task.description && (
                  <p className="todo-description-small">
                    {task.description.substring(0, 60)}...
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* 메인 영역 - 대시보드 */}
      <main className="main-content">
        {loading ? (
          <div className="todo-loading">
            <div className="loading-spinner"></div>
            <p>{t('todo.loading')}</p>
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
              <h2>📝 {t('todo.dashboard.title')}</h2>
            </div>

            {/* 통계 대시보드 */}
            <div className="dashboard-view">
              <div className="stats-container">
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-number">{stats.total}</div>
                    <div className="stat-label">{t('todo.dashboard.total')}</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-number" style={{color: '#6C757D'}}>{stats.pending}</div>
                    <div className="stat-label">{t('todo.dashboard.pending')}</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-number" style={{color: '#007BFF'}}>{stats.in_progress}</div>
                    <div className="stat-label">{t('todo.dashboard.in_progress')}</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-number" style={{color: '#28A745'}}>{stats.completed}</div>
                    <div className="stat-label">{t('todo.dashboard.completed')}</div>
                  </div>
                </div>
                <div className="period-stats">
                  <span>{t('todo.dashboard.high_priority_count', { count: stats.high_priority })}</span>
                  <span>{t('todo.dashboard.due_today_count', { count: stats.due_today })}</span>
                </div>
              </div>

              <div className="dashboard-content">
                {/* 왼쪽 컬럼 */}
                <div className="dashboard-left">
                  {/* 최근 할일 미리보기 */}
                  <div className="recent-tasks">
                    <h3>🔥 {t('todo.dashboard.recent_tasks')}</h3>
                    {tasks.filter(t => !t.is_completed).slice(0, 6).map(task => (
                      <div key={task.id} className="recent-task-item" onClick={() => handleEditTask(task)}>
                        <div className="recent-task-content">
                          <div className="recent-task-title">{task.title}</div>
                          {task.description && (
                            <div className="recent-task-desc">
                              {task.description.substring(0, 50)}...
                            </div>
                          )}
                        </div>
                        <div className="recent-task-meta">
                          <span className="recent-task-priority" style={{backgroundColor: getPriorityColor(task.priority)}}>
                            {getPriorityLabel(task.priority)}
                          </span>
                          {task.due_date && (
                            <span className="recent-task-due">
                              {formatDueDate(task.due_date)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {tasks.filter(t => !t.is_completed).length === 0 && (
                      <div className="empty-tasks">
                        <div className="empty-tasks-icon">🎉</div>
                        <div className="empty-tasks-text">모든 할일을 완료했습니다!</div>
                        <button className="create-task-btn" onClick={handleCreateTask}>
                          새 할일 추가하기
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 오른쪽 컬럼 */}
                <div className="dashboard-right">
                  {/* 오늘의 할일 */}
                  <div className="today-tasks">
                    <h3>📅 오늘 마감 할일</h3>
                    {tasks.filter(t => {
                      if (!t.due_date || t.is_completed) return false;
                      const today = new Date().toISOString().split('T')[0];
                      return t.due_date.split('T')[0] === today;
                    }).map(task => (
                      <div key={task.id} className="today-task-item" onClick={() => handleEditTask(task)}>
                        <div className="today-task-priority" style={{backgroundColor: getPriorityColor(task.priority)}}></div>
                        <div className="today-task-content">
                          <div className="today-task-title">{task.title}</div>
                          <div className="today-task-category">{getCategoryLabel(task.category)}</div>
                        </div>
                      </div>
                    ))}
                    {tasks.filter(t => {
                      if (!t.due_date || t.is_completed) return false;
                      const today = new Date().toISOString().split('T')[0];
                      return t.due_date.split('T')[0] === today;
                    }).length === 0 && (
                      <div className="no-due-today">
                        <div>🌟</div>
                        <div>오늘 마감인 할일이 없습니다</div>
                      </div>
                    )}
                  </div>

                  {/* 카테고리별 진행률 */}
                  <div className="category-progress">
                    <h3>📊 카테고리별 현황</h3>
                    {categories.map(category => {
                      const categoryTasks = tasks.filter(t => t.category === category);
                      const completedCount = categoryTasks.filter(t => t.is_completed).length;
                      const totalCount = categoryTasks.length;
                      const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
                      
                      if (totalCount === 0) return null;
                      
                      return (
                        <div key={category} className="category-progress-item">
                          <div className="category-progress-header">
                            <span className="category-name">{getCategoryLabel(category)}</span>
                            <span className="category-count">{completedCount}/{totalCount}</span>
                          </div>
                          <div className="category-progress-bar">
                            <div 
                              className="category-progress-fill"
                              style={{
                                width: `${progress}%`,
                                backgroundColor: getStatusColor('completed')
                              }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 완료된 할일 */}
                  <div className="completed-tasks">
                    <h3>✅ 최근 완료한 할일</h3>
                    {tasks.filter(t => t.is_completed).slice(0, 3).map(task => (
                      <div key={task.id} className="completed-task-item">
                        <div className="completed-task-title">{task.title}</div>
                        <div className="completed-task-category">{getCategoryLabel(task.category)}</div>
                      </div>
                    ))}
                    {tasks.filter(t => t.is_completed).length === 0 && (
                      <div className="no-completed">아직 완료한 할일이 없습니다</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* 할일 생성/편집 모달 */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modalMode === 'create' ? '새 할일 생성' : '할일 편집'}</h3>
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>제목 *</label>
                <input 
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="할일 제목을 입력하세요"
                />
              </div>
              <div className="form-group">
                <label>설명</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="할일 설명을 입력하세요"
                  rows={3}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>마감일</label>
                  <input 
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>예상 소요시간 (분)</label>
                  <input 
                    type="number"
                    value={formData.estimated_duration || ''}
                    onChange={(e) => setFormData({...formData, estimated_duration: Number(e.target.value)})}
                    placeholder="분 단위로 입력"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('todo.filters.category')}</label>
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
                <div className="form-group">
                  <label>{t('todo.filters.priority')}</label>
                  <select 
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  >
                    {priorities.map(priority => (
                      <option key={priority} value={priority}>
                        {getPriorityLabel(priority)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>{t('todo.filters.status')}</label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                >
                  {statuses.map(status => (
                    <option key={status} value={status}>
                      {getStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              {modalMode === 'edit' && (
                <button className="delete-btn" onClick={() => selectedTask && handleDeleteTask(selectedTask)}>
                  삭제
                </button>
              )}
              <button onClick={() => setShowModal(false)}>취소</button>
              <button className="save-btn" onClick={handleSaveTask}>
                {modalMode === 'create' ? '생성' : '수정'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TodoView;