import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../shared/services/apiService';
import './AnalyticsView.css';

// 타입 정의 (모바일앱과 일치)
interface OverviewStats {
  totalMemos: number;
  avgSentimentScore: number;
  mostUsedCategory: string;
  totalActiveDays: number;
  memosThisWeek: number;
}

interface CategoryData {
  name: string;
  count: number;
  percentage: number;
}

interface TagData {
  name: string;
  count: number;
}

interface SentimentData {
  averageScore: number;
  distribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  trends: Array<{
    date: string;
    score: number;
  }>;
  topKeywords: Array<{
    keyword: string;
    frequency: number;
  }>;
}

interface TrendData {
  date: string;
  count: number;
}

interface HourlyActivity {
  hour: number;
  count: number;
}

const AnalyticsView: React.FC = () => {
  const { t } = useTranslation();

  // 상태 관리
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('week');
  
  // 분석 데이터 상태 (모바일앱과 일치)
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [tagData, setTagData] = useState<TagData[]>([]);
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(null);
  const [trendsData, setTrendsData] = useState<TrendData[]>([]);
  const [hourlyActivity, setHourlyActivity] = useState<HourlyActivity[]>([]);

  // 선택된 분석 보고서
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  // 보고서 목록
  const reports = [
    {
      id: 'weekly_report',
      title: t('analytics.weekly_report.title'),
      description: t('analytics.weekly_report.description'),
      period: t('analytics.weekly_report.period'),
      icon: '📊'
    },
    {
      id: 'monthly_report', 
      title: t('analytics.monthly_report.title'),
      description: t('analytics.monthly_report.description'),
      period: t('analytics.monthly_report.period'),
      icon: '📈'
    },
    {
      id: 'category_analysis',
      title: t('analytics.category_analysis.title'),
      description: t('analytics.category_analysis.description'),
      period: t('analytics.category_analysis.period'),
      icon: '🏷️'
    },
    {
      id: 'usage_pattern',
      title: t('analytics.usage_pattern.title'),
      description: t('analytics.usage_pattern.description'),
      period: t('analytics.usage_pattern.period'),
      icon: '⏰'
    }
  ];

  // 데이터 로드 (모바일앱과 동일한 방식)
  const loadAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('📊 Desktop Analytics - 분석 데이터 로드 시작');

      // 병렬로 데이터 로드 (실제 백엔드 엔드포인트 사용)
      const [
        categoryResponse,
        tagResponse,
        sentimentResponse,
        trendsResponse,
        activityResponse,
      ] = await Promise.all([
        api.analytics.getCategories(),
        api.analytics.getTags(10),
        api.analytics.getSentiment(),
        api.analytics.getTrends(selectedPeriod),
        api.analytics.getActivity(),
      ]);

      console.log('✅ Desktop Analytics - 데이터 로드 성공');
      console.log('🏷️ Category Response:', categoryResponse);
      console.log('🏷️ Tag Response:', tagResponse);
      console.log('😊 Sentiment Response:', sentimentResponse);
      console.log('📈 Trends Response:', trendsResponse);
      console.log('⏰ Activity Response:', activityResponse);

      // 응답 데이터 구조 확인 및 파싱
      const categories = categoryResponse.data?.categories || (categoryResponse as any).categories || categoryResponse || [];
      const tags = tagResponse.data?.topTags || (tagResponse as any).topTags || tagResponse || [];
      const sentiment = sentimentResponse.data || sentimentResponse;
      const trends = trendsResponse.data?.trends || (trendsResponse as any).trends || trendsResponse || [];
      const activity = activityResponse.data?.hourlyActivity || (activityResponse as any).hourlyActivity || activityResponse || [];

      // Overview 통계를 다른 API 응답으로부터 계산
      const totalMemos = categories.reduce((sum: number, cat: any) => sum + (cat.count || 0), 0);
      const avgSentimentScore = sentiment?.averageScore || sentiment?.average_score || 0;
      const mostUsedCategory = categories.length > 0 ? categories[0]?.name || categories[0]?.category || '없음' : '없음';
      const totalActiveDays = trends.length;
      const memosThisWeek = trends.slice(-7).reduce((sum: number, day: any) => sum + (day.count || 0), 0);

      const calculatedOverview = {
        totalMemos,
        avgSentimentScore,
        mostUsedCategory,
        totalActiveDays,
        memosThisWeek
      };

      // 데이터 설정
      setOverviewStats(calculatedOverview);
      setCategoryData(categories);
      setTagData(tags);
      setSentimentData(sentiment);
      setTrendsData(trends);
      setHourlyActivity(activity);

      setError(null);
    } catch (err: any) {
      console.error('❌ Desktop Analytics - 분석 데이터 로드 실패:', err);
      setError(t('analytics.error'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  // 새로고침 처리
  const handleRefresh = () => {
    setRefreshing(true);
    loadAnalyticsData();
  };

  // 기간 변경 처리
  const handlePeriodChange = (period: 'day' | 'week' | 'month') => {
    setSelectedPeriod(period);
  };

  // 감성 점수 포매팅 (모바일앱과 동일)
  const formatSentimentScore = (score: number): string => {
    if (score >= 7) {
      return t('analytics.sentiment.positive');
    }
    if (score >= 4) {
      return t('analytics.sentiment.neutral');
    }
    return t('analytics.sentiment.negative');
  };

  const getSentimentColor = (score: number): string => {
    if (score >= 7) {
      return '#28a745';
    }
    if (score >= 4) {
      return '#ffc107';
    }
    return '#dc3545';
  };

  // 시간 포매팅 (모바일앱과 동일)
  const formatHour = (hour: number): string => {
    if (hour === 0) {
      return '12AM';
    }
    if (hour < 12) {
      return `${hour}AM`;
    }
    if (hour === 12) {
      return '12PM';
    }
    return `${hour - 12}PM`;
  };

  // 로딩 화면
  if (loading) {
    return (
      <div className="analytics-container">
        <div className="analytics-loading">
          <div className="loading-spinner"></div>
          <p>{t('analytics.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-container">
      {/* 사이드바 - 보고서 목록 */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>📊 {t('analytics.title')}</h2>
          <button className="new-memo-btn" onClick={() => loadAnalyticsData()}>
            🔄 {t('analytics.refresh')}
          </button>
        </div>


        {/* 분석 기간 선택 */}
        <div className="period-selector-simple">
          <h3>{t('analytics.summary.title')}</h3>
          <div className="period-buttons">
            <button 
              className={`period-btn ${selectedPeriod === 'day' ? 'active' : ''}`}
              onClick={() => handlePeriodChange('day')}
            >
              {t('analytics.periods.day')}
            </button>
            <button 
              className={`period-btn ${selectedPeriod === 'week' ? 'active' : ''}`}
              onClick={() => handlePeriodChange('week')}
            >
              {t('analytics.periods.week')}
            </button>
            <button 
              className={`period-btn ${selectedPeriod === 'month' ? 'active' : ''}`}
              onClick={() => handlePeriodChange('month')}
            >
              {t('analytics.periods.month')}
            </button>
          </div>
        </div>

        {/* 분석 요약 */}
        <div className="analytics-summary">
          <h3>📊 {t('analytics.summary.title')}</h3>
          <div className="summary-info">
            <p>{t('analytics.summary.selected_period')}: <strong>{t(`analytics.periods.${selectedPeriod}`)}</strong></p>
            <p>{t('analytics.summary.last_updated')}: <strong>{new Date().toLocaleDateString()}</strong></p>
          </div>
        </div>
      </aside>

      {/* 메인 영역 - 분석 대시보드 */}
      <main className="main-content">
        {error && (
          <div className="error-banner">
            <span>⚠️ {t('analytics.error')}</span>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        <div className="analytics-dashboard">
          <div className="dashboard-header">
            <h2>📊 {t('analytics.dashboard_title')}</h2>
            <p>{t('analytics.dashboard_description')}</p>
          </div>

          {/* 개요 통계 */}
          {overviewStats && (
            <div className="stats-section">
              <h3>📋 {t('analytics.overview.title')}</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-number">{overviewStats.totalMemos || 0}</div>
                  <div className="stat-label">{t('analytics.overview.total_memos')}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">{overviewStats.memosThisWeek || 0}</div>
                  <div className="stat-label">{t('analytics.overview.this_week')}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">{overviewStats.totalActiveDays || 0}</div>
                  <div className="stat-label">{t('analytics.overview.active_days')}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number" style={{ color: getSentimentColor(overviewStats.avgSentimentScore || 0) }}>
                    {overviewStats.avgSentimentScore?.toFixed(1) || '0.0'}
                  </div>
                  <div className="stat-label">{t('analytics.overview.avg_sentiment')}</div>
                </div>
              </div>
            </div>
          )}

          {/* 카테고리 분석 */}
          {categoryData.length > 0 && (
            <div className="stats-section">
              <h3>🏷️ {t('analytics.categories.title')}</h3>
              <div className="categories-grid">
                {categoryData.slice(0, 6).map((category, index) => (
                  <div key={index} className="category-item">
                    <div className="category-name">{category.name || t('analytics.categories.other')}</div>
                    <div className="category-stats">
                      <span className="category-count">{category.count}</span>
                      <span className="category-percentage">{category.percentage?.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 작성 추이 */}
          {trendsData.length > 0 && (
            <div className="stats-section">
              <h3>📈 {t('analytics.trends.title')} ({t(`analytics.periods.${selectedPeriod}`)})</h3>
              <div className="trends-list">
                {trendsData.slice(0, 10).map((trend, index) => (
                  <div key={index} className="trend-item">
                    <div className="trend-date">
                      {new Date(trend.date).toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                        ...(selectedPeriod === 'month' ? { year: 'numeric' } : {})
                      })}
                    </div>
                    <div className="trend-bar">
                      <div 
                        className="trend-fill" 
                        style={{ 
                          width: `${Math.min(100, (trend.count / Math.max(...trendsData.map(t => t.count))) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <div className="trend-count">{trend.count}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 시간대별 활동 */}
          {hourlyActivity.length > 0 && (
            <div className="stats-section">
              <h3>⏰ {t('analytics.activity.title')}</h3>
              <div className="activity-grid">
                {hourlyActivity
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 6)
                  .map((time, index) => (
                    <div key={index} className="activity-item">
                      <div className="activity-time">{formatHour(time.hour)}</div>
                      <div className="activity-count">{time.count}{t('analytics.activity.count_suffix')}</div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* 인기 태그 */}
          {tagData.length > 0 && (
            <div className="stats-section">
              <h3>🏷️ {t('analytics.tags.title')}</h3>
              <div className="tags-cloud">
                {tagData.slice(0, 15).map((tag, index) => (
                  <span 
                    key={index} 
                    className="tag-item"
                    style={{
                      fontSize: `${12 + Math.min(8, tag.count * 2)}px`,
                      opacity: 0.7 + (tag.count / Math.max(...tagData.map(t => t.count))) * 0.3
                    }}
                  >
                    {tag.name} ({tag.count})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 감성 분석 */}
          {sentimentData && (
            <div className="stats-section">
              <h3>😊 {t('analytics.sentiment.title')}</h3>
              <div className="sentiment-stats">
                <div className="sentiment-score">
                  <div className="score-value" style={{ color: getSentimentColor(sentimentData.averageScore || 0) }}>
                    {sentimentData.averageScore?.toFixed(1) || '0.0'}
                  </div>
                  <div className="score-text">{formatSentimentScore(sentimentData.averageScore || 0)}</div>
                </div>
                {sentimentData.distribution && (
                  <div className="sentiment-distribution">
                    <div className="sentiment-item positive">
                      <span>{t('analytics.sentiment.distribution.positive')}</span>
                      <span>{sentimentData.distribution.positive?.toFixed(1) || '0.0'}%</span>
                    </div>
                    <div className="sentiment-item neutral">
                      <span>{t('analytics.sentiment.distribution.neutral')}</span>
                      <span>{sentimentData.distribution.neutral?.toFixed(1) || '0.0'}%</span>
                    </div>
                    <div className="sentiment-item negative">
                      <span>{t('analytics.sentiment.distribution.negative')}</span>
                      <span>{sentimentData.distribution.negative?.toFixed(1) || '0.0'}%</span>
                    </div>
                  </div>
                )}
                {sentimentData.topKeywords && sentimentData.topKeywords.length > 0 && (
                  <div className="sentiment-keywords">
                    <h4>{t('analytics.sentiment.keywords')}</h4>
                    <div className="keywords-list">
                      {sentimentData.topKeywords.slice(0, 10).map((keywordData, index) => (
                        <span key={index} className="keyword-tag">
                          {typeof keywordData === 'string' ? keywordData : keywordData.keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AnalyticsView;