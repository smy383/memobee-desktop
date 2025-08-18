import React, { useState, useEffect, useCallback } from 'react';
import { uiLogger } from '../../shared/utils/logger';
import { useTranslation } from 'react-i18next';
import { api } from '../../shared/services/apiService';
import './SupportView.css';

interface CategoryOption {
  value: 'bug' | 'feature' | 'support' | 'general' | 'complaint';
  label: string;
  emoji: string;
}

interface PriorityOption {
  value: 'low' | 'medium' | 'high' | 'urgent';
  label: string;
}

interface Feedback {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  is_anonymous: boolean;
  admin_response?: string;
  created_at: string;
  updated_at?: string;
  responded_at?: string;
}

interface SupportViewProps {
  // 추후 props 확장 가능
}

const SupportView: React.FC<SupportViewProps> = () => {
  const { t } = useTranslation();
  
  // 탭 상태
  const [activeTab, setActiveTab] = useState<'submit' | 'history' | 'faq'>('submit');
  
  // 피드백 제출 상태
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('general');
  const [priority, setPriority] = useState<string>('medium');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 문의 내역 상태
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);

  // 번역된 카테고리 및 우선순위 옵션
  const categoryOptions: CategoryOption[] = [
    { value: 'bug', label: t('support.categories.bug'), emoji: '🐛' },
    { value: 'feature', label: t('support.categories.feature'), emoji: '💡' },
    { value: 'support', label: t('support.categories.support'), emoji: '🛠️' },
    { value: 'general', label: t('support.categories.general'), emoji: '💬' },
    { value: 'complaint', label: t('support.categories.complaint'), emoji: '😞' },
  ];

  const priorityOptions: PriorityOption[] = [
    { value: 'low', label: t('support.priority.low') },
    { value: 'medium', label: t('support.priority.medium') },
    { value: 'high', label: t('support.priority.high') },
    { value: 'urgent', label: t('support.priority.urgent') },
  ];

  // FAQ 데이터
  const faqItems = [
    {
      question: t('support.faq.items.0.question'),
      answer: t('support.faq.items.0.answer'),
    },
    {
      question: t('support.faq.items.1.question'),
      answer: t('support.faq.items.1.answer'),
    },
    {
      question: t('support.faq.items.2.question'),
      answer: t('support.faq.items.2.answer'),
    },
  ];

  // 문의 내역 로드
  const loadFeedbackHistory = useCallback(async () => {
    try {
      setIsLoadingHistory(true);
      uiLogger.debug('Loading feedback history from API');
      
      // 실제 API 호출
      const response = await api.feedback.getMyFeedbacks(0, 50);
      setFeedbacks(response.feedbacks);
      
      uiLogger.debug('Feedback history loaded successfully from API:', response.feedbacks.length, 'items');
    } catch (error) {
      uiLogger.error('Failed to load feedback history from API:', error);
      alert(t('support.alerts.history_load_error'));
    } finally {
      setIsLoadingHistory(false);
    }
  }, [t]);

  // 피드백 제출
  const handleSubmit = async () => {
    // 유효성 검사
    if (!title.trim() || !description.trim()) {
      alert(t('support.alerts.title_content_required'));
      return;
    }

    if (title.length > 200) {
      alert(t('support.alerts.title_too_long'));
      return;
    }

    if (description.length > 2000) {
      alert(t('support.alerts.content_too_long'));
      return;
    }

    try {
      setIsSubmitting(true);
      uiLogger.debug('Starting feedback submission to API');
      
      // 실제 API 호출
      await api.feedback.submit({
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        is_anonymous: isAnonymous,
        page_url: 'desktop_app',
      });
      
      uiLogger.debug('Feedback submitted successfully to API');
      
      alert(t('support.alerts.submit_success_message'));
      
      // 폼 초기화
      setTitle('');
      setDescription('');
      setCategory('general');
      setPriority('medium');
      setIsAnonymous(false);
      
      // 문의 내역이 열려있다면 새로고침
      if (activeTab === 'history') {
        loadFeedbackHistory();
      }
      
    } catch (error) {
      uiLogger.error('Failed to submit feedback to API:', error);
      alert(t('support.alerts.submit_error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 상태 텍스트 변환
  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      pending: t('support.status.pending'),
      in_progress: t('support.status.in_progress'),
      resolved: t('support.status.resolved'),
      closed: t('support.status.closed'),
    };
    return statusMap[status] || status;
  };

  // 상태 색상
  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      pending: '#f39c12',
      in_progress: '#3498db',
      resolved: '#27ae60',
      closed: '#95a5a6',
    };
    return colorMap[status] || '#95a5a6';
  };

  // 카테고리 텍스트 변환
  const getCategoryText = (category: string) => {
    const categoryOption = categoryOptions.find(opt => opt.value === category);
    return categoryOption ? categoryOption.label : category;
  };

  // 우선순위 텍스트 변환
  const getPriorityText = (priority: string) => {
    const priorityOption = priorityOptions.find(opt => opt.value === priority);
    return priorityOption ? priorityOption.label : priority;
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // 탭 변경 시 문의 내역 로드
  useEffect(() => {
    if (activeTab === 'history') {
      loadFeedbackHistory();
    }
  }, [activeTab, loadFeedbackHistory]);

  return (
    <div className="support-container">
      {/* 사이드바 - 탭 및 내비게이션 */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>🆘 {t('support.title')}</h2>
          <p>{t('support.header.subtitle')}</p>
        </div>

        {/* 탭 메뉴 */}
        <div className="tab-menu">
          <button
            className={`tab-button ${activeTab === 'submit' ? 'active' : ''}`}
            onClick={() => setActiveTab('submit')}
          >
            📝 {t('support.tabs.submit')}
          </button>
          <button
            className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📋 {t('support.tabs.history')}
          </button>
          <button
            className={`tab-button ${activeTab === 'faq' ? 'active' : ''}`}
            onClick={() => setActiveTab('faq')}
          >
            ❓ {t('support.faq.title')}
          </button>
        </div>

        {/* 문의 내역 목록 (history 탭에서만 표시) */}
        {activeTab === 'history' && (
          <div className="feedback-list">
            {isLoadingHistory ? (
              <div className="loading">
                <div className="loading-spinner"></div>
                <p>{t('support.history.loading')}</p>
              </div>
            ) : feedbacks.length === 0 ? (
              <div className="empty-feedback">
                <p>{t('support.history.empty_title')}</p>
                <button
                  className="submit-first-btn"
                  onClick={() => setActiveTab('submit')}
                >
                  {t('support.history.submit_first')}
                </button>
              </div>
            ) : (
              feedbacks.map((feedback) => (
                <div
                  key={feedback.id}
                  className={`feedback-item ${selectedFeedback?.id === feedback.id ? 'selected' : ''}`}
                  onClick={() => setSelectedFeedback(selectedFeedback?.id === feedback.id ? null : feedback)}
                >
                  <div className="feedback-header">
                    <h4>{feedback.title}</h4>
                    <div className="feedback-meta">
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(feedback.status) }}
                      >
                        {getStatusText(feedback.status)}
                      </span>
                      <span className="category-badge">
                        {getCategoryText(feedback.category)}
                      </span>
                    </div>
                  </div>
                  <div className="feedback-date">
                    {formatDate(feedback.created_at)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </aside>

      {/* 메인 영역 */}
      <main className="main-content">
        <div className="support-dashboard">
        {activeTab === 'submit' && (
          <div className="submit-form">
            <div className="form-header">
              <h3>{t('support.form.section_title')}</h3>
            </div>

            <div className="form-content">
              <div className="form-row">
                <div className="form-group half">
                  <label>{t('support.form.category_label')}</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="form-select"
                  >
                    {categoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.emoji} {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group half">
                  <label>{t('support.form.priority_label')}</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="form-select"
                  >
                    {priorityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>{t('support.form.title_label')}</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('support.form.title_placeholder')}
                  className="form-input"
                  maxLength={200}
                />
                <div className="char-count">
                  {t('support.form.char_count', { current: title.length, max: 200 })}
                </div>
              </div>

              <div className="form-group">
                <label>{t('support.form.content_label')}</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('support.form.content_placeholder')}
                  className="form-textarea"
                  rows={8}
                  maxLength={2000}
                />
                <div className="char-count">
                  {t('support.form.char_count', { current: description.length, max: 2000 })}
                </div>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="form-checkbox"
                  />
                  {t('support.form.anonymous_checkbox')}
                </label>
              </div>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`submit-btn ${isSubmitting ? 'loading' : ''}`}
              >
                {isSubmitting ? (
                  <>
                    <div className="button-spinner"></div>
                    {t('support.alerts.submitting')}
                  </>
                ) : (
                  t('support.form.submit_button')
                )}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'history' && selectedFeedback && (
          <div className="feedback-detail">
            <div className="detail-header">
              <h3>{selectedFeedback.title}</h3>
              <button
                onClick={() => setSelectedFeedback(null)}
                className="close-btn"
              >
                ✕
              </button>
            </div>

            <div className="detail-content">
              <div className="detail-meta">
                <div className="meta-item">
                  <span className="meta-label">{t('support.form.category_label')}:</span>
                  <span className="meta-value">{getCategoryText(selectedFeedback.category)}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">{t('support.form.priority_label')}:</span>
                  <span className="meta-value">{getPriorityText(selectedFeedback.priority)}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">{t('support.history.status')}:</span>
                  <span 
                    className="meta-value status"
                    style={{ color: getStatusColor(selectedFeedback.status) }}
                  >
                    {getStatusText(selectedFeedback.status)}
                  </span>
                </div>
              </div>

              <div className="detail-section">
                <h4>{t('support.history.detail_title')}</h4>
                <p>{selectedFeedback.description}</p>
              </div>

              {selectedFeedback.admin_response && (
                <div className="admin-response">
                  <h4>{t('support.history.response_title')}</h4>
                  <p>{selectedFeedback.admin_response}</p>
                  {selectedFeedback.responded_at && (
                    <div className="response-date">
                      {t('support.history.response_date', { date: formatDate(selectedFeedback.responded_at) })}
                    </div>
                  )}
                </div>
              )}

              <div className="detail-dates">
                <div className="date-item">
                  <span>{t('support.history.created_label')}:</span>
                  <span>{formatDate(selectedFeedback.created_at)}</span>
                </div>
                {selectedFeedback.updated_at && (
                  <div className="date-item">
                    <span>{t('support.history.updated_label')}:</span>
                    <span>{formatDate(selectedFeedback.updated_at)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && !selectedFeedback && (
          <div className="welcome-screen">
            <h3>📋 {t('support.history.section_title')}</h3>
            <p>{t('support.history.select_feedback')}</p>
          </div>
        )}

        {activeTab === 'faq' && (
          <div className="faq-content">
            <div className="faq-header">
              <h3>❓ {t('support.faq.title')}</h3>
            </div>
            
            <div className="faq-list">
              {faqItems.map((item, index) => (
                <div key={index} className="faq-item">
                  <div className="faq-question">
                    <h4>Q. {item.question}</h4>
                  </div>
                  <div className="faq-answer">
                    <p>A. {item.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
};

export default SupportView;