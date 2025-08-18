import React, { useState, useEffect, useCallback } from 'react';
import { uiLogger } from '../../shared/utils/logger';
import { useTranslation } from 'react-i18next';
import { api } from '../../shared/services/apiService';
import './SecurityView.css';

// 보안 정보 타입 정의 (모바일/웹과 동일)
interface SecurityInfo {
    id: number;
    type: 'phone' | 'email' | 'address' | 'account' | 'password' | 'id_number' | 'website' | 'bank' | 'event' | 'appointment';
    content: string;
    confidence: number;
    riskLevel: 'high' | 'medium' | 'low';
    label: string;
    service_name?: string;
    memo_id?: number;
    memo_title?: string;
    isVisible: boolean;
}

interface SecurityStatus {
    is_enabled: boolean;
    has_password: boolean;
    password_created_at?: string;
    last_auth?: string;
}

interface SecurityStats {
    total: number;
    high: number;
    medium: number;
    low: number;
}

const SecurityView: React.FC = () => {
    const { t } = useTranslation();

    // 상태 관리
    const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null);
    const [securityInfos, setSecurityInfos] = useState<SecurityInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [securityInfosLoading, setSecurityInfosLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [needsAuth, setNeedsAuth] = useState(true);

    // 인증 모달 상태
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authPassword, setAuthPassword] = useState('');
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [authError, setAuthError] = useState('');

    // 필터링 및 검색 상태
    const [selectedFilter, setSelectedFilter] = useState<string>('all');
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState<string>('');

    // 마스킹 상태
    const [visibleInfos, setVisibleInfos] = useState<{ [key: number]: boolean }>({});

    // 선택된 보안 정보 상태 (제거 - 더 이상 필요없음)
    // const [selectedSecurityInfo, setSelectedSecurityInfo] = useState<SecurityInfo | null>(null);

    // 필터 옵션 정의
    const filterOptions = [
        { key: 'all', label: t('security.filter.all'), icon: '🔍' },
        { key: 'phone', label: t('security.filter.phone'), icon: '📞' },
        { key: 'email', label: t('security.filter.email'), icon: '📧' },
        { key: 'password', label: t('security.filter.password'), icon: '🔑' },
        { key: 'account', label: t('security.filter.account'), icon: '💳' },
        { key: 'website', label: t('security.filter.website'), icon: '🌐' },
        { key: 'id_number', label: t('security.filter.id_number'), icon: '🆔' },
        { key: 'bank', label: t('security.filter.bank'), icon: '🏦' },
        { key: 'address', label: t('security.filter.address'), icon: '📍' },
    ];

    // 초기화
    useEffect(() => {
        initializeSecurity();
    }, []);

    const initializeSecurity = async () => {
        try {
            setLoading(true);
            uiLogger.debug('🔒 Desktop Security - 초기화 시작');

            // 보안 상태 조회
            await loadSecurityStatus();
        } catch (error) {
            uiLogger.error('❌ Desktop Security - 초기화 실패:', error);
            setError(t('security.errors.initialization_failed'));
        } finally {
            setLoading(false);
        }
    };

    const loadSecurityStatus = async () => {
        try {
            uiLogger.debug('🔍 Desktop Security - 보안 상태 조회');
            const statusData = await api.user.getSecurityStatus();
            uiLogger.debug('✅ Desktop Security - 보안 상태:', statusData);

            setSecurityStatus(statusData);

            if (statusData.is_enabled && statusData.has_password) {
                setNeedsAuth(true);
                setShowAuthModal(true);
            } else if (!statusData.has_password) {
                setError(t('security.password.not_set'));
            }
        } catch (error) {
            uiLogger.error('❌ Desktop Security - 보안 상태 조회 실패:', error);
            setError(t('security.errors.status_check_failed'));
        }
    };

    const handleSecurityAuth = async () => {
        if (isAuthenticating) return;

        if (!authPassword.trim()) {
            setAuthError(t('security.password.required'));
            return;
        }

        setIsAuthenticating(true);
        setAuthError('');

        try {
            uiLogger.debug('🔐 Desktop Security - 보안 인증 시작');

            const authResult = await api.user.authenticateSecurityPassword(authPassword);

            if (authResult.success && authResult.token) {
                uiLogger.debug('✅ Desktop Security - 보안 인증 성공');

                setShowAuthModal(false);
                setAuthPassword('');
                setNeedsAuth(false);

                // 보안 정보 로드
                await loadSecurityInfos(authResult.token);
            } else {
                setAuthError(authResult.message || t('security.password.incorrect'));
            }
        } catch (error: any) {
            uiLogger.error('❌ Desktop Security - 보안 인증 실패:', error);
            if (error.response?.status === 401) {
                setAuthError(t('security.password.incorrect'));
            } else {
                setAuthError(t('security.errors.auth_failed'));
            }
        } finally {
            setIsAuthenticating(false);
        }
    };

    const loadSecurityInfos = async (securityToken: string) => {
        try {
            setSecurityInfosLoading(true);
            uiLogger.debug('📋 Desktop Security - 보안 정보 로드 시작');

            const securityInfosResponse = await api.user.getSecurityInfos(securityToken);
            uiLogger.debug('📊 Desktop Security - 보안 정보 응답:', securityInfosResponse);

            // 백엔드 응답 처리
            const rawData = Array.isArray(securityInfosResponse)
                ? securityInfosResponse
                : (securityInfosResponse as any)?.data || [];

            let securityInfosData: any[] = [];

            if (Array.isArray(rawData)) {
                securityInfosData = rawData;
            } else if (rawData && Array.isArray(rawData.data)) {
                securityInfosData = rawData.data;
            } else {
                uiLogger.warn('⚠️ Desktop Security - 응답 데이터가 배열이 아님:', rawData);
                setSecurityInfos([]);
                return;
            }

            // 백엔드 데이터를 프론트엔드 인터페이스에 맞게 변환
            const transformedData: SecurityInfo[] = securityInfosData.map((item: any) => ({
                id: item.id,
                type: mapInfoTypeToType(item.info_type),
                content: item.info_value,
                confidence: item.confidence_score / 100,
                riskLevel: getRiskLevelFromType(mapInfoTypeToType(item.info_type)),
                label: normalizeInfoLabel(item.info_label || item.info_type, item.info_type),
                service_name: item.service_name || '',
                memo_id: item.memo_id,
                memo_title: item.memo_title || '',
                isVisible: false,
            }));

            uiLogger.debug('✅ Desktop Security - 보안 정보 로드 성공:', transformedData.length);
            setSecurityInfos(transformedData);

        } catch (error: any) {
            uiLogger.error('❌ Desktop Security - 보안 정보 로드 실패:', error);

            if (error.response?.status === 401) {
                setNeedsAuth(true);
                setShowAuthModal(true);
                setSecurityInfos([]);
            } else {
                setError(t('security.errors.info_load_failed'));
            }
        } finally {
            setSecurityInfosLoading(false);
        }
    };

    // 백엔드 info_type을 프론트엔드 type으로 매핑
    const mapInfoTypeToType = (infoType: string): SecurityInfo['type'] => {
        const normalizedType = infoType.toLowerCase().trim();

        switch (normalizedType) {
            case 'phone number':
            case 'phone_number':
            case 'phone':
            case '전화번호':
                return 'phone';
            case 'password':
            case 'user_password':
            case '비밀번호':
                return 'password';
            case 'email address':
            case 'email_address':
            case 'email':
            case '이메일':
                return 'email';
            case 'address':
            case 'home_address':
            case '주소':
                return 'address';
            case 'credit card info':
            case 'credit_card_info':
            case 'account_number':
            case '계좌번호':
            case '신용카드':
                return 'account';
            case 'bank account number':
            case 'bank_account_number':
            case 'banking_info':
            case '은행계좌':
                return 'bank';
            case 'website login info':
            case 'website_login_info':
            case 'login_info':
            case 'username/account id':
            case 'account id':
            case '웹사이트아이디':
                return 'website';
            case 'resident registration number':
            case 'id_number':
            case 'passport':
            case '주민등록번호':
            case '신분증':
                return 'id_number';
            case 'event':
            case 'appointment':
            case '이벤트':
            case '일정':
                return 'event';
            default:
                return 'account';
        }
    };

    // 정보 유형에 따른 위험도 결정
    const getRiskLevelFromType = (infoType: string): 'high' | 'medium' | 'low' => {
        switch (infoType) {
            case 'password':
            case 'account':
            case 'id_number':
                return 'high';
            case 'phone':
            case 'email':
            case 'website':
                return 'medium';
            case 'address':
            case 'bank':
                return 'low';
            default:
                return 'medium';
        }
    };

    // info_label을 한국어로 정리하는 함수
    const normalizeInfoLabel = (label: string, infoType: string): string => {
        const normalizedLabel = label
            .replace(/Phone Number/gi, t('security.info_types.phone'))
            .replace(/Email/gi, t('security.info_types.email'))
            .replace(/Password/gi, t('security.info_types.password'))
            .replace(/Account Number/gi, t('security.info_types.account'))
            .replace(/Card Number/gi, t('security.info_types.card'))
            .replace(/Website URL/gi, t('security.info_types.website'))
            .replace(/Address/gi, t('security.info_types.address'))
            .replace(/Social Security Number/gi, t('security.info_types.resident_number'))
            .replace(/ID Number/gi, t('security.info_types.id_number'))
            .replace(/Financial Info/gi, t('security.info_types.financial_info'));

        return normalizedLabel;
    };

    // 보안 정보 마스킹
    const maskContent = (content: string, type: string): string => {
        if (!content) return '';

        switch (type) {
            case 'phone':
                if (content.includes('-')) {
                    const parts = content.split('-');
                    return `${parts[0]}-****-${parts[parts.length - 1]}`;
                }
                return content.replace(/(\d{3})(\d{4})(\d{4})/, '$1-****-$3');
            case 'email':
                const [local, domain] = content.split('@');
                if (!domain) return content;
                const maskedLocal = local.length > 2
                    ? local.slice(0, 2) + '*'.repeat(Math.min(local.length - 2, 3))
                    : local;
                return `${maskedLocal}@${domain}`;
            case 'account':
                return '*'.repeat(Math.max(content.length - 4, 0)) + content.slice(-4);
            case 'password':
                return '*'.repeat(Math.min(content.length, 8));
            case 'id_number':
                if (content.includes('-')) {
                    const parts = content.split('-');
                    return `${parts[0]}-*******`;
                }
                return content.slice(0, 6) + '*'.repeat(7);
            default:
                return '*'.repeat(Math.max(content.length - 2, 0)) + content.slice(-2);
        }
    };

    // 위험도에 따른 색상
    const getRiskColor = (riskLevel: string) => {
        switch (riskLevel) {
            case 'high': return '#DC3545';
            case 'medium': return '#FFC107';
            case 'low': return '#28A745';
            default: return '#6C757D';
        }
    };

    // 타입에 따른 아이콘
    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'phone': return '📞';
            case 'email': return '📧';
            case 'address': return '📍';
            case 'account': return '💳';
            case 'password': return '🔑';
            case 'id_number': return '🆔';
            case 'website': return '🌐';
            case 'bank': return '🏦';
            case 'event':
            case 'appointment': return '📅';
            default: return '🔒';
        }
    };

    // 보안 정보 표시/숨김 토글
    const toggleVisibility = (infoId: number) => {
        setVisibleInfos(prev => ({
            ...prev,
            [infoId]: !prev[infoId],
        }));
    };

    // 필터링된 보안정보 계산
    const filteredSecurityInfos = securityInfos
        .filter(info => selectedFilter === 'all' || info.type === selectedFilter)
        .filter(info => {
            if (!searchTerm.trim()) return true;
            const term = searchTerm.toLowerCase();
            return (
                info.content.toLowerCase().includes(term) ||
                info.label.toLowerCase().includes(term) ||
                (info.service_name && info.service_name.toLowerCase().includes(term)) ||
                (info.memo_title && info.memo_title.toLowerCase().includes(term))
            );
        });

    // 통계 계산
    const getSecurityStats = (): SecurityStats => {
        const total = securityInfos.length;
        const high = securityInfos.filter(info => info.riskLevel === 'high').length;
        const medium = securityInfos.filter(info => info.riskLevel === 'medium').length;
        const low = securityInfos.filter(info => info.riskLevel === 'low').length;

        return { total, high, medium, low };
    };

    const stats = getSecurityStats();

    // 메모 연결 처리
    const handleMemoClick = async (info: SecurityInfo) => {
        if (info.memo_id) {
            try {
                const memo = await api.memo.getById(info.memo_id);
                // TODO: 메모 에디터 모달 열기 또는 메모 화면으로 이동
                uiLogger.debug('📝 연결된 메모:', memo);
                alert(`연결된 메모: ${memo.title}`);
            } catch (error) {
                uiLogger.error('메모 로드 실패:', error);
                alert(t('security.errors.memo_load_failed'));
            }
        } else {
            alert(t('security.info.no_related_memo'));
        }
    };

    // 로딩 화면
    if (loading) {
        return (
            <div className="security-container">
                <div className="security-loading">
                    <div className="loading-spinner"></div>
                    <p>{t('security.loading.checking_status')}</p>
                </div>
            </div>
        );
    }

    // 보안 비밀번호가 설정되지 않은 경우
    if (securityStatus && !securityStatus.has_password) {
        return (
            <div className="security-container">
                <div className="security-setup-needed">
                    <div className="setup-card">
                        <div className="setup-icon">⚠️</div>
                        <h2>{t('security.setup.required_title')}</h2>
                        <p>{t('security.setup.required_description')}</p>
                        <button className="setup-button">
                            {t('security.setup.go_to_settings')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="security-container">
            {/* 보안 인증 모달 */}
            {showAuthModal && (
                <div className="modal-overlay">
                    <div className="auth-modal">
                        <h2>🔐 {t('security.auth.title')}</h2>
                        <p>{t('security.auth.access_description')}</p>

                        <input
                            type="password"
                            value={authPassword}
                            onChange={(e) => setAuthPassword(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSecurityAuth()}
                            placeholder={t('security.auth.enter_password')}
                            className="auth-input"
                            autoFocus
                        />

                        {authError && (
                            <div className="error-message">
                                <span>{authError}</span>
                            </div>
                        )}

                        <div className="auth-buttons">
                            <button
                                onClick={handleSecurityAuth}
                                disabled={isAuthenticating}
                                className="auth-button primary"
                            >
                                {isAuthenticating ? t('security.auth.authenticating') : t('security.auth.authenticate')}
                            </button>
                            <button
                                onClick={() => setShowAuthModal(false)}
                                disabled={isAuthenticating}
                                className="auth-button secondary"
                            >
                                {t('common.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 에러 메시지 */}
            {error && (
                <div className="error-banner">
                    <span>⚠️ {error}</span>
                    <button onClick={() => setError(null)}>✕</button>
                </div>
            )}

            {/* 메인 컨텐츠 */}
            {!needsAuth && (
                <>
                    {/* 사이드바 - 보안 정보 목록 */}
                    <aside className="sidebar">
                        <div className="sidebar-header">
                            <button className="new-memo-btn" onClick={() => setShowFilterModal(true)}>
                                🔍 {t('security.filter.title')}
                            </button>
                        </div>

                        {/* 검색창 */}
                        <div className="search-container">
                            <div className="search-input-wrapper">
                                <span className="search-icon">🔍</span>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder={t('security.search.placeholder')}
                                    className="search-input"
                                />
                                {searchTerm && (
                                    <button
                                        className="search-clear"
                                        onClick={() => setSearchTerm('')}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                            {searchTerm && (
                                <div className="search-results-info">
                                    <span>
                                        "{searchTerm}" {t('security.search.results')}: {filteredSecurityInfos.length}{t('security.search.count')}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* 보안 정보 목록 */}
                        <div className="memo-list">
                            {securityInfosLoading ? (
                                <div className="loading">{t('security.list.loading')}</div>
                            ) : filteredSecurityInfos.length > 0 ? (
                                filteredSecurityInfos.map((info) => (
                                    <div
                                        key={info.id}
                                        className="memo-item"
                                    >
                                        <div className="security-item-header">
                                            <div className="security-item-info">
                                                <h3>
                                                    <span className="info-icon">{getTypeIcon(info.type)}</span>
                                                    {info.label}
                                                    {info.service_name && (
                                                        <span className="service-name"> ({info.service_name})</span>
                                                    )}
                                                </h3>
                                                <small>
                                                    <span
                                                        className={`risk-level ${info.riskLevel}`}
                                                        style={{ color: getRiskColor(info.riskLevel) }}
                                                    >
                                                        {info.riskLevel === 'high' && `🔴 ${t('security.info.risk.high')}`}
                                                        {info.riskLevel === 'medium' && `🟡 ${t('security.info.risk.medium')}`}
                                                        {info.riskLevel === 'low' && `🟢 ${t('security.info.risk.low')}`}
                                                    </span>
                                                </small>
                                            </div>
                                            <button
                                                className="visibility-toggle-btn-inline"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleVisibility(info.id);
                                                }}
                                                title={visibleInfos[info.id] ? '숨기기' : '보기'}
                                            >
                                                {visibleInfos[info.id] ? '🙈' : '👁️'}
                                            </button>
                                        </div>
                                        <p className="security-value-inline">
                                            {visibleInfos[info.id]
                                                ? info.content
                                                : maskContent(info.content, info.type)
                                            }
                                        </p>
                                        {info.memo_id && (
                                            <div className="memo-link-inline">
                                                <button
                                                    className="memo-link-btn-small"
                                                    onClick={() => handleMemoClick(info)}
                                                >
                                                    📝 {info.memo_title || t('security.info.memo_button')}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="memo-item">
                                    <h3>🔒 {t('security.list.empty.title')}</h3>
                                    <p>{t('security.list.empty.description')}</p>
                                </div>
                            )}
                        </div>
                    </aside>

                    {/* 메인 영역 - 보안 대시보드 */}
                    <main className="main-content">
                        <div className="security-dashboard">
                            <div className="dashboard-header">
                                <h2>🔒 {t('security.dashboard_title')}</h2>
                                <p>{t('security.dashboard_description')}</p>
                            </div>

                            {/* 보안 현황 통계 */}
                            <div className="stats-section">
                                <h3>🛡️ {t('security.dashboard.status_title')}</h3>
                                <div className="stats-grid">
                                    <div className="stat-item">
                                        <div className="stat-number">{stats.total}</div>
                                        <div className="stat-label">{t('security.dashboard.total')}</div>
                                    </div>
                                    <div className="stat-item high">
                                        <div className="stat-number">{stats.high}</div>
                                        <div className="stat-label">{t('security.dashboard.high_risk')}</div>
                                    </div>
                                    <div className="stat-item medium">
                                        <div className="stat-number">{stats.medium}</div>
                                        <div className="stat-label">{t('security.dashboard.medium_risk')}</div>
                                    </div>
                                    <div className="stat-item low">
                                        <div className="stat-number">{stats.low}</div>
                                        <div className="stat-label">{t('security.dashboard.low_risk')}</div>
                                    </div>
                                </div>
                            </div>

                            {/* 보안 정보 유형별 분포 */}
                            {securityInfos.length > 0 && (
                                <div className="stats-section">
                                    <h3>📊 {t('security.dashboard.type_distribution')}</h3>
                                    <div className="categories-grid">
                                        {(() => {
                                            const typeStats = filterOptions
                                                .filter(option => option.key !== 'all')
                                                .map(option => {
                                                    const count = securityInfos.filter(info => info.type === option.key).length;
                                                    const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                                                    return { ...option, count, percentage };
                                                })
                                                .filter(item => item.count > 0)
                                                .sort((a, b) => b.count - a.count)
                                                .slice(0, 6);

                                            return typeStats.map((item, index) => (
                                                <div key={index} className="category-item">
                                                    <div className="category-name">{item.icon} {item.label}</div>
                                                    <div className="category-stats">
                                                        <span className="category-count">{item.count}</span>
                                                        <span className="category-percentage">{item.percentage.toFixed(1)}%</span>
                                                    </div>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            )}

                            {/* 위험도별 상세 정보 */}
                            {securityInfos.length > 0 && (
                                <div className="stats-section">
                                    <h3>⚠️ {t('security.dashboard.risk_analysis')}</h3>
                                    <div className="risk-analysis-grid">
                                        {['high', 'medium', 'low'].map(riskLevel => {
                                            const riskInfos = securityInfos.filter(info => info.riskLevel === riskLevel);
                                            const riskPercentage = stats.total > 0 ? (riskInfos.length / stats.total) * 100 : 0;
                                            
                                            return (
                                                <div key={riskLevel} className={`risk-analysis-item ${riskLevel}`}>
                                                    <div className="risk-header">
                                                        <span className="risk-icon">
                                                            {riskLevel === 'high' && '🔴'}
                                                            {riskLevel === 'medium' && '🟡'}
                                                            {riskLevel === 'low' && '🟢'}
                                                        </span>
                                                        <div className="risk-info">
                                                            <div className="risk-title">
                                                                {riskLevel === 'high' && t('security.info.risk.high')}
                                                                {riskLevel === 'medium' && t('security.info.risk.medium')}
                                                                {riskLevel === 'low' && t('security.info.risk.low')}
                                                            </div>
                                                            <div className="risk-stats">
                                                                <span className="risk-count">{riskInfos.length}개</span>
                                                                <span className="risk-percentage">({riskPercentage.toFixed(1)}%)</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {riskInfos.length > 0 && (
                                                        <div className="risk-types">
                                                            {riskInfos.slice(0, 3).map((info, idx) => (
                                                                <div key={idx} className="risk-type-item">
                                                                    <span className="type-icon">{getTypeIcon(info.type)}</span>
                                                                    <span className="type-label">{info.label}</span>
                                                                </div>
                                                            ))}
                                                            {riskInfos.length > 3 && (
                                                                <div className="risk-more">
                                                                    +{riskInfos.length - 3}개 더
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* 최근 발견된 보안 정보 */}
                            {securityInfos.length > 0 && (
                                <div className="stats-section">
                                    <h3>🔍 {t('security.dashboard.recent_findings')}</h3>
                                    <div className="recent-findings-list">
                                        {securityInfos
                                            .sort((a, b) => b.id - a.id)
                                            .slice(0, 5)
                                            .map((info, index) => (
                                                <div key={index} className="finding-item">
                                                    <div className="finding-icon">{getTypeIcon(info.type)}</div>
                                                    <div className="finding-info">
                                                        <div className="finding-label">{info.label}</div>
                                                        <div className="finding-meta">
                                                            <span className={`finding-risk ${info.riskLevel}`}>
                                                                {info.riskLevel === 'high' && t('security.info.risk.high')}
                                                                {info.riskLevel === 'medium' && t('security.info.risk.medium')}
                                                                {info.riskLevel === 'low' && t('security.info.risk.low')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {info.memo_title && (
                                                        <div className="finding-memo">
                                                            <span className="memo-icon">📝</span>
                                                            <span className="memo-title">{info.memo_title}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </main>
                </>
            )}

            {/* 필터 모달 */}
            {showFilterModal && (
                <div className="modal-overlay" onClick={() => setShowFilterModal(false)}>
                    <div className="filter-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="filter-header">
                            <h3>{t('security.filter.title')}</h3>
                            <button onClick={() => setShowFilterModal(false)}>✕</button>
                        </div>
                        <div className="filter-options">
                            {filterOptions.map((option) => (
                                <button
                                    key={option.key}
                                    className={`filter-option ${selectedFilter === option.key ? 'selected' : ''}`}
                                    onClick={() => {
                                        setSelectedFilter(option.key);
                                        setShowFilterModal(false);
                                    }}
                                >
                                    <span className="filter-icon">{option.icon}</span>
                                    <span className="filter-text">{option.label}</span>
                                    {option.key !== 'all' && (
                                        <span className="filter-count">
                                            {securityInfos.filter(info => info.type === option.key).length}
                                        </span>
                                    )}
                                    {selectedFilter === option.key && <span className="check">✓</span>}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SecurityView;