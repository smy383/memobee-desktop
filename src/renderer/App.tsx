import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { authService } from '../shared/services/authService';
import { api } from '../shared/services/apiService';
import type { Memo } from '../shared/services/apiService';
import HybridEditor, { HybridEditorRef } from './components/HybridEditor';
import SecurityAuthModal from './components/SecurityAuthModal';
import ScheduleView from './components/ScheduleView';
import TodoView from './components/TodoView';
import TrashView from './components/TrashView';
import SecurityView from './components/SecurityView';
import FileManagementView from './components/FileManagementView';
import AnalyticsView from './components/AnalyticsView';
import ShareView from './components/ShareView';
import LinkManagementView from './components/LinkManagementView';
import SupportView from './components/SupportView';
import UpdateNotification from './components/UpdateNotification';
import ProUpgradeModal from './components/ProUpgradeModal';
import { useSubscription } from './hooks/useSubscription';
import { changeLanguage, getCurrentLanguage, getLanguageLabel, getSupportedLanguages } from './i18n';
// React Icons 추가
import { FaStar, FaRegStar, FaSave, FaTrash, FaCheck, FaSpinner, FaRobot, FaSearch, FaComments, FaQuestion, FaTimes, FaLock, FaPaperclip, FaUser, FaCrown, FaPlus } from 'react-icons/fa';
import './i18n'; // i18n 초기화
import './components/Layout.css';

// Layout 컴포넌트를 App.tsx 내부에 정의
interface LayoutProps {
  onLogout: () => void;
}

// Memo 타입은 apiService에서 import

// 화면 타입 정의
type ScreenType = 'memo' | 'schedule' | 'todo' | 'security' | 'analytics' | 'share' | 'files' | 'links' | 'trash' | 'support' | 'settings';

const Layout: React.FC<LayoutProps> = ({ onLogout }) => {
  console.log('🏠 Layout 컴포넌트 시작!');
  
  const { t } = useTranslation();
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('memo');
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [saveButtonState, setSaveButtonState] = useState<'normal' | 'saving' | 'completed'>('normal');
  const [showAiAnalysisModal, setShowAiAnalysisModal] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(getCurrentLanguage());
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  console.log('📞 useSubscription 훅 호출 시작...');
  // 구독 상태 관리
  const { subscriptionData, isLoading: isSubscriptionLoading, isPro } = useSubscription();
  console.log('📞 useSubscription 훅 호출 완료!');
  
  // 디버깅 로그 추가
  console.log('🎯 App.tsx - isPro 상태:', isPro);
  console.log('🎯 App.tsx - subscriptionData:', subscriptionData);

  // Pro 업그레이드 모달 상태
  const [showProUpgradeModal, setShowProUpgradeModal] = useState(false);
  
  // HybridEditor ref
  const hybridEditorRef = useRef<HybridEditorRef>(null);
  
  // 메모 업데이트 핸들러들 (useCallback으로 최적화 - 함수형 업데이트 사용)
  const handleMemoTitleChange = useCallback((title: string) => {
    setSelectedMemo((prevMemo) => {
      if (prevMemo) {
        return { ...prevMemo, title };
      }
      return prevMemo;
    });
  }, []);
  
  const handleMemoContentChange = useCallback((content: string) => {
    setSelectedMemo((prevMemo) => {
      if (prevMemo) {
        return { ...prevMemo, content };
      }
      return prevMemo;
    });
  }, []);
  
  // 보안 인증 관련 상태
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [pendingSecurityMemo, setPendingSecurityMemo] = useState<Memo | null>(null);
  
  // 검색 및 AI 관련 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMemos, setFilteredMemos] = useState<Memo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [showAiResult, setShowAiResult] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 수동 업데이트 관련 상태
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'ready'>('idle');
  const [downloadProgress, setDownloadProgress] = useState<{percent: number; transferred: number; total: number} | null>(null);
  const [appVersion, setAppVersion] = useState<string>(window.memobeeDesktop?.version || 'Loading...');

  // 실제 API를 통한 메모 목록 로드
  useEffect(() => {
    loadMemos();
  }, []);

  // 버전 업데이트 이벤트 리스너
  useEffect(() => {
    console.log('🎯 버전 리스너 등록 시작');
    
    const handleVersionUpdate = (event: CustomEvent) => {
      console.log('🔄 버전 업데이트 이벤트 수신:', event.detail.version);
      setAppVersion(event.detail.version);
    };

    window.addEventListener('version-updated', handleVersionUpdate as EventListener);
    
    // 직접 electronAPI를 통해 버전 가져오기 (확실한 방법)
    if (window.electronAPI?.getAppVersion) {
      console.log('🚀 electronAPI로 버전 직접 요청');
      window.electronAPI.getAppVersion().then(version => {
        console.log('✅ electronAPI에서 버전 수신:', version);
        setAppVersion(version);
      }).catch(err => {
        console.error('❌ electronAPI 버전 요청 실패:', err);
      });
    }
    
    // fallback: window.memobeeDesktop 확인
    console.log('🔍 현재 window.memobeeDesktop:', window.memobeeDesktop);
    if (window.memobeeDesktop?.version && window.memobeeDesktop.version !== 'Loading...') {
      console.log('🔄 초기 버전 설정:', window.memobeeDesktop.version);
      setAppVersion(window.memobeeDesktop.version);
    }
    
    return () => {
      window.removeEventListener('version-updated', handleVersionUpdate as EventListener);
    };
  }, []);

  // 자동 업데이트 이벤트 리스너
  useEffect(() => {
    if (!window.electronAPI) return;

    const handleDownloadProgress = (event: any, progress: {percent: number; transferred: number; total: number}) => {
      console.log('📊 다운로드 진행률 수신:', progress);
      console.log('📊 현재 상태:', updateStatus);
      setDownloadProgress(progress);
      
      // 전역 핸들러도 설정
      window.updateProgressHandler = (progress) => {
        console.log('🌍 전역 진행률 핸들러:', progress);
        setDownloadProgress(progress);
      };
    };

    const handleDownloadComplete = () => {
      console.log('✅ 다운로드 완료');
      setUpdateStatus('ready');
      setDownloadProgress(null);
    };

    const handleDownloadStarted = () => {
      console.log('🚀 다운로드 시작됨');
      setUpdateStatus('downloading');
      setDownloadProgress(null);
    };

    // 이벤트 리스너 등록
    window.electronAPI.on('update-download-progress', handleDownloadProgress);
    window.electronAPI.on('update-downloaded', handleDownloadComplete);
    window.electronAPI.on('update-download-started', handleDownloadStarted);

    // 컴포넌트 언마운트 시 리스너 제거
    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeListener('update-download-progress', handleDownloadProgress);
        window.electronAPI.removeListener('update-downloaded', handleDownloadComplete);
        window.electronAPI.removeListener('update-download-started', handleDownloadStarted);
      }
    };
  }, []);

  // 버전 업데이트 이벤트 리스너
  useEffect(() => {
    const handleVersionUpdate = (event: any) => {
      const newVersion = event.detail.version;
      console.log('🔄 버전 업데이트 감지:', newVersion);
      setAppVersion(newVersion);
    };

    window.addEventListener('version-updated', handleVersionUpdate);
    
    return () => {
      window.removeEventListener('version-updated', handleVersionUpdate);
    };
  }, []);

  // 현재 사용자 정보 로드
  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);
    
    // 사용자 프로필 정보 로드
    if (user) {
      loadUserProfile();
    }
  }, []);

  const loadUserProfile = async () => {
    try {
      const profile = await api.user.getProfile();
      setUserProfile(profile);
      console.log('✅ 사용자 프로필 로드 성공:', profile);
    } catch (error) {
      console.error('❌ 사용자 프로필 로드 실패:', error);
    }
  };

  const loadMemos = async () => {
    try {
      setLoading(true);
      console.log('🔄 메모 목록 로드 시작...');
      
      // 페이지네이션으로 모든 메모 가져오기
      let allMemos: Memo[] = [];
      let currentPage = 1;
      const pageSize = 100; // 백엔드 최대 허용 크기
      let hasMore = true;
      
      while (hasMore) {
        try {
          console.log(`📄 페이지 ${currentPage} 로드 중...`);
          const memoList = await api.memo.getList(undefined, currentPage, pageSize);
          
          if (memoList.length === 0) {
            hasMore = false;
            break;
          }
          
          allMemos = [...allMemos, ...memoList];
          
          // 페이지 크기보다 적게 받았으면 마지막 페이지
          if (memoList.length < pageSize) {
            hasMore = false;
          } else {
            currentPage++;
          }
          
          // 무한 루프 방지 (최대 100페이지)
          if (currentPage > 100) {
            console.warn('⚠️ 최대 페이지 수 도달, 로드 중단');
            hasMore = false;
          }
        } catch (pageError: any) {
          console.error(`❌ 페이지 ${currentPage} 로드 실패:`, pageError);
          console.error('에러 상세:', {
            status: pageError.response?.status,
            statusText: pageError.response?.statusText,
            data: pageError.response?.data,
            message: pageError.message
          });
          hasMore = false;
        }
      }
      
      console.log('✅ 메모 목록 로드 성공:', allMemos.length, '개 (총', currentPage - 1, '페이지)');
      setMemos(sortMemosByFavorite(allMemos));
    } catch (error) {
      console.error('❌ 메모 로드 실패:', error);
      
      // 에러 발생 시 빈 배열로 설정
      setMemos([]);
      
      // 사용자에게 에러 알림
      alert(t('memo.load_error'));
    } finally {
      setLoading(false);
    }
  };

  // 메모 목록을 즐겨찾기 우선으로 정렬
  const sortMemosByFavorite = (memoList: Memo[]): Memo[] => {
    return [...memoList].sort((a, b) => {
      // 즐겨찾기된 메모가 먼저 오도록 정렬
      if (a.is_favorited && !b.is_favorited) return -1;
      if (!a.is_favorited && b.is_favorited) return 1;
      
      // 같은 즐겨찾기 상태인 경우 업데이트 시간 기준 내림차순
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  };

  const handleMemoClick = async (memo: Memo) => {
    // 보안 메모인지 확인
    if (memo.is_security_memo) {
      console.log('🔒 보안 메모 감지:', memo.id, memo.title || memo.ai_title);
      setPendingSecurityMemo(memo);
      setShowSecurityModal(true);
      return;
    }

    // 일반 메모는 바로 열기
    openMemoEditor(memo);
  };

  // 메모 에디터 열기 (보안 인증 후 또는 일반 메모)
  const openMemoEditor = (memo: Memo) => {
    setSelectedMemo(memo);
    setIsEditorOpen(true);
    setSaveButtonState('normal'); // 저장 버튼 상태 초기화
    
    // HybridEditor 포커스 (약간의 지연 후)
    setTimeout(() => {
      if (hybridEditorRef.current) {
        hybridEditorRef.current.focus();
      }
    }, 100);
  };

  // 보안 인증 성공 핸들러
  const handleSecurityAuthenticated = () => {
    if (pendingSecurityMemo) {
      console.log('✅ 보안 인증 성공, 메모 열기:', pendingSecurityMemo.id);
      openMemoEditor(pendingSecurityMemo);
      setPendingSecurityMemo(null);
    }
  };

  // 보안 모달 닫기 핸들러
  const handleSecurityModalClose = () => {
    setShowSecurityModal(false);
    setPendingSecurityMemo(null);
  };

  // 🆕 모바일 앱과 완전히 동일한 문장 감지 함수
  const isSentence = (text: string): boolean => {
    const trimmedText = text.trim();
    console.log(`🔍 [App.tsx 문장감지] 입력: "${trimmedText}" (길이: ${trimmedText.length})`);
    
    if (trimmedText.length < 5) {
      console.log(`❌ [App.tsx 문장감지] 너무 짧음 (최소 5자 필요)`);
      return false; // 모바일 앱과 동일: 최소 5자
    }

    // 한국어 종결어미 패턴 (모바일 앱과 동일)
    const koreanEndingPatterns = [
      /[요다까어야]\s*$/, // 요, 다, 까, 어, 야 종결어미
      /[니지]\s*$/, // 니, 지 종결어미
      /습니다\s*$/, // 습니다
      /했습니다\s*$/, // 했습니다
      /해줘\s*$/, // 해줘
      /보여줘\s*$/, // 보여줘
      /줘\s*$/, // 줘
      /해\s*$/, // 해
      /인가\s*$/, // 인가
      /나\?\s*$/, // 나? (의문문)
      /어줘\s*$/, // 어줘
      /있어\s*$/, // 있어
      /없어\s*$/, // 없어
      /되나\s*$/, // 되나
      /되어\s*$/, // 되어
      /되요\s*$/, // 되요
      /드려\s*$/, // 드려
      /세요\s*$/, // 세요
      /써\s*$/, // 써
      /야지\s*$/, // 야지
      /구나\s*$/, // 구나
      /겠어\s*$/, // 겠어
      /거야\s*$/, // 거야
      /자\s*$/, // 자
    ];

    // 문장부호 패턴
    const punctuationPatterns = [
      /[.!?]\s*$/, // 마침표, 느낌표, 물음표
      /[。！？]\s*$/, // 전각 문장부호
    ];

    // 한국어 의문문 패턴
    const koreanQuestionPatterns = [
      /^언제\s/,
      /^어디\s/,
      /^누구\s/,
      /^무엇\s/,
      /^뭐\s/,
      /^왜\s/,
      /^어떻게\s/,
      /^어떤\s/,
      /^몇\s/,
      /^어느\s/,
      /\s찾아줘$/,
      /\s보여줘$/,
      /\s알려줘$/,
      /\s정리해줘$/,
      /\s요약해줘$/,
      /\s만들어줘$/,
      /\s생성해줘$/,
      /\s분석해줘$/,
      /\s검색해줘$/,
      /\s찾아서$/,
      /\s보여주세요$/,
    ];

    // 영어 의문문 패턴
    const englishQuestionPatterns = [
      /^what\s/i,
      /^when\s/i,
      /^where\s/i,
      /^who\s/i,
      /^why\s/i,
      /^how\s/i,
      /^which\s/i,
      /^can you\s/i,
      /^could you\s/i,
      /^would you\s/i,
      /^do you\s/i,
      /^does\s/i,
      /^is\s/i,
      /^are\s/i,
      /^will\s/i,
      /^create\s/i,
      /^generate\s/i,
      /^make\s/i,
      /^write\s/i,
      /^show\s/i,
      /^find\s/i,
      /^search\s/i,
      /^tell\s/i,
      /^give\s/i,
      /\ssummary/i,
      /\screate/i,
      /\sgenerate/i,
      /\smake/i,
      /\swrite/i,
      /\sshow/i,
      /\sfind/i,
      /\ssearch/i,
      /\stell/i,
    ];

    // 모든 패턴 통합
    const allQuestionPatterns = [
      ...koreanQuestionPatterns,
      ...englishQuestionPatterns,
    ];

    // 패턴 체크 (모바일 앱과 동일한 로직)
    const hasKoreanEnding = koreanEndingPatterns.some(pattern =>
      pattern.test(trimmedText),
    );
    const hasPunctuation = punctuationPatterns.some(pattern =>
      pattern.test(trimmedText),
    );
    const isQuestion = allQuestionPatterns.some(pattern =>
      pattern.test(trimmedText),
    );

    // 상세 로그
    console.log(`📝 [App.tsx 문장감지] 한국어 종결어미: ${hasKoreanEnding}`);
    console.log(`📝 [App.tsx 문장감지] 문장부호: ${hasPunctuation}`);
    console.log(`📝 [App.tsx 문장감지] 의문문 패턴: ${isQuestion}`);

    const result = hasKoreanEnding || hasPunctuation || isQuestion;
    console.log(`✅ [App.tsx 문장감지] 최종 결과: ${result}`);

    return result;
  };

  // 🆕 안전한 날짜 포맷 함수 (Invalid Date 방지)
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) {
      return '날짜 없음';
    }

    try {
      // ISO 문자열 또는 일반 날짜 문자열 처리
      const date = new Date(dateString);
      
      // Invalid Date 체크
      if (isNaN(date.getTime())) {
        console.warn(`[formatDate] 잘못된 날짜 형식: "${dateString}"`);
        return '날짜 형식 오류';
      }

      const now = new Date();
      const diffTime = now.getTime() - date.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) return '오늘';
      if (diffDays === 2) return '어제';
      if (diffDays <= 7 && diffDays > 0) return `${diffDays - 1}일 전`;
      
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error(`[formatDate] 날짜 파싱 오류:`, error, `원본: "${dateString}"`);
      return '날짜 오류';
    }
  };

  // 검색 관련 핸들러들
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // 디바운싱: 500ms 후에 검색 실행
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(query);
    }, 500);
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      // 검색어가 없으면 전체 메모 표시
      setFilteredMemos([]);
      setIsSearching(false);
      return;
    }

    try {
      setIsSearching(true);
      console.log('🔍 검색 시작:', query);
      
      // 서버 사이드 검색 (모바일과 동일)
      const searchResults = await api.memo.getList(query, 1, 100);
      console.log('✅ 검색 완료:', searchResults.length, '개 결과');
      
      setFilteredMemos(searchResults);
    } catch (error) {
      console.error('❌ 검색 실패:', error);
      setFilteredMemos([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setFilteredMemos([]);
    setIsSearching(false);
    setShowAiResult(false);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      // Enter 키로 즉시 검색
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      handleSearch(searchQuery);
    }
  };

  const handleAiQuestion = async () => {
    const questionText = searchQuery.trim();
    
    if (!questionText) {
      alert('AI에게 질문할 내용을 입력해주세요.');
      return;
    }

    try {
      setIsAiLoading(true);
      console.log('🤖 AI 질문 시작:', questionText);
      
      const result = await api.memo.askAIQuestion(questionText);
      console.log('✅ AI 응답:', result);
      
      setAiResult(result);
      setShowAiResult(true);
      
      // AI 검색 결과인 경우 메모 목록 업데이트
      if (result.intent === 'SEARCH' && result.memos && Array.isArray(result.memos)) {
        const memosWithRequiredFields = result.memos.map((memo: any) => ({
          ...memo,
          updated_at: memo.updated_at || memo.created_at,
          user_id: memo.user_id || 0,
        }));
        setFilteredMemos(memosWithRequiredFields);
      } else if (result.intent === 'GENERATE' && result.new_memo) {
        // 새 메모 생성된 경우 목록 새로고침
        loadMemos();
      }
    } catch (error) {
      console.error('❌ AI 질문 실패:', error);
      alert('AI 질문 처리 중 오류가 발생했습니다.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSaveMemo = async (memo: Memo) => {
    try {
      console.log('🔄 메모 저장 시작:', memo.id);
      
      // HybridEditor에서 최종 내용 가져오기
      let finalContent = memo.content;
      if (hybridEditorRef.current) {
        const editorState = hybridEditorRef.current.getEditorState();
        // 블록을 HTML로 변환
        const { blocksToHtml } = await import('../shared/types/ContentBlock');
        finalContent = blocksToHtml(editorState);
      }
      
      // 실제 API를 통한 메모 업데이트
      const updatedMemo = await api.memo.update(memo.id, {
        title: memo.title,
        content: finalContent
      });
      
      console.log('✅ 메모 저장 성공:', updatedMemo.id);
      
      // 메모 목록 업데이트
      setMemos(memos.map(m => m.id === updatedMemo.id ? updatedMemo : m));
      setSelectedMemo(updatedMemo);
    } catch (error) {
      console.error('❌ 메모 저장 실패:', error);
      alert(t('memo.save_error'));
    }
  };

  // 즉시 저장 (상태 피드백 포함)
  const handleImmediateSave = async (memo: Memo) => {
    if (saveButtonState !== 'normal') return;
    
    try {
      setSaveButtonState('saving');
      console.log('💾 즉시 저장 시작:', memo.id);
      
      // HybridEditor에서 최종 내용 가져오기
      let finalContent = memo.content;
      if (hybridEditorRef.current) {
        const editorState = hybridEditorRef.current.getEditorState();
        // 블록을 HTML로 변환
        const { blocksToHtml } = await import('../shared/types/ContentBlock');
        finalContent = blocksToHtml(editorState);
      }
      
      // 실제 API를 통한 메모 업데이트
      const updatedMemo = await api.memo.update(memo.id, {
        title: memo.title,
        content: finalContent
      });
      
      console.log('✅ 즉시 저장 성공:', updatedMemo.id);
      
      // 메모 목록 업데이트
      setMemos(memos.map(m => m.id === updatedMemo.id ? updatedMemo : m));
      setSelectedMemo(updatedMemo);
      
      // 완료 상태 표시
      setSaveButtonState('completed');
      
      // 2초 후 원래 상태로 복귀
      setTimeout(() => {
        setSaveButtonState('normal');
      }, 2000);
      
    } catch (error) {
      console.error('❌ 즉시 저장 실패:', error);
      setSaveButtonState('normal');
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  // 즐겨찾기 토글 핸들러
  const handleToggleFavorite = async (memo: Memo, e: React.MouseEvent) => {
    e.stopPropagation(); // 메모 클릭 이벤트 방지
    try {
      console.log('⭐ 즐겨찾기 토글:', memo.id, !memo.is_favorited);
      
      const updatedMemo = await api.memo.toggleFavorite(memo.id, !memo.is_favorited);
      console.log('✅ 즐겨찾기 토글 성공:', updatedMemo.is_favorited);
      
      // 메모 목록 업데이트 후 다시 정렬
      const updatedMemos = memos.map(m => m.id === updatedMemo.id ? updatedMemo : m);
      setMemos(sortMemosByFavorite(updatedMemos));
      
      // 현재 선택된 메모도 업데이트
      if (selectedMemo && selectedMemo.id === memo.id) {
        setSelectedMemo(updatedMemo);
      }
    } catch (error) {
      console.error('❌ 즐겨찾기 토글 실패:', error);
      alert('즐겨찾기 설정 중 오류가 발생했습니다.');
    }
  };

  // 메모 삭제 핸들러
  const handleDeleteMemo = async (memo: Memo, e: React.MouseEvent) => {
    e.stopPropagation(); // 메모 클릭 이벤트 방지
    
    const confirmMessage = `"${memo.ai_title || memo.title || '제목 없음'}" 메모를 삭제하시겠습니까?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      console.log('🗑️ 메모 삭제:', memo.id);
      
      await api.memo.delete(memo.id);
      console.log('✅ 메모 삭제 성공');
      
      // 메모 목록에서 제거
      setMemos(memos.filter(m => m.id !== memo.id));
      
      // 현재 선택된 메모가 삭제된 경우 선택 해제
      if (selectedMemo && selectedMemo.id === memo.id) {
        setSelectedMemo(null);
        setIsEditorOpen(false);
      }
    } catch (error) {
      console.error('❌ 메모 삭제 실패:', error);
      alert('메모 삭제 중 오류가 발생했습니다.');
    }
  };

  // 에디터 내부에서 즐겨찾기 토글 (선택된 메모 상태도 동시 업데이트)
  const handleToggleFavoriteInEditor = async (memo: Memo, e: React.MouseEvent) => {
    e.preventDefault();
    try {
      console.log('⭐ 에디터 내 즐겨찾기 토글:', memo.id, !memo.is_favorited);
      
      const updatedMemo = await api.memo.toggleFavorite(memo.id, !memo.is_favorited);
      console.log('✅ 에디터 내 즐겨찾기 토글 성공:', updatedMemo.is_favorited);
      
      // 메모 목록 업데이트 후 다시 정렬
      const updatedMemos = memos.map(m => m.id === updatedMemo.id ? updatedMemo : m);
      setMemos(sortMemosByFavorite(updatedMemos));
      
      // 에디터에 표시 중인 현재 선택된 메모도 업데이트 (중요!)
      setSelectedMemo(updatedMemo);
      
    } catch (error) {
      console.error('❌ 에디터 내 즐겨찾기 토글 실패:', error);
      alert('즐겨찾기 설정 중 오류가 발생했습니다.');
    }
  };

  // 에디터 내부에서 메모 삭제 (에디터 자동 닫기)
  const handleDeleteMemoInEditor = async (memo: Memo, e: React.MouseEvent) => {
    e.preventDefault();
    
    const confirmMessage = `"${memo.ai_title || memo.title || '제목 없음'}" 메모를 삭제하시겠습니까?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      console.log('🗑️ 에디터 내 메모 삭제:', memo.id);
      
      await api.memo.delete(memo.id);
      console.log('✅ 에디터 내 메모 삭제 성공');
      
      // 메모 목록에서 제거
      setMemos(memos.filter(m => m.id !== memo.id));
      
      // 에디터 닫기 및 선택 해제
      setSelectedMemo(null);
      setIsEditorOpen(false);
      
    } catch (error) {
      console.error('❌ 에디터 내 메모 삭제 실패:', error);
      alert('메모 삭제 중 오류가 발생했습니다.');
    }
  };

  // AI 분석 모달 열기
  const handleShowAiAnalysis = () => {
    setShowAiAnalysisModal(true);
  };

  // AI 분석 모달 닫기
  const handleCloseAiAnalysis = () => {
    setShowAiAnalysisModal(false);
  };

  // 날짜 포맷 함수 (AI 분석 날짜용)
  const formatAnalysisDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 엔티티 타입 변환 함수
  const getEntityType = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'PERSON': '인물',
      'ORGANIZATION': '조직',
      'LOCATION': '장소',
      'PRODUCT': '제품',
      'EVENT': '이벤트',
      'DATETIME': '날짜시간',
      'OTHER': '기타'
    };
    return typeMap[type] || type;
  };

  // 대표 이미지 URL 가져오기
  const getThumbnailImage = (memo: Memo): string | null => {
    if (!memo.attachments || memo.attachments.length === 0) {
      return null;
    }
    
    // 이미지 첨부파일 중 첫 번째 찾기
    const imageAttachment = memo.attachments.find(att => 
      att.filetype && att.filetype.startsWith('image/')
    );
    
    return imageAttachment?.public_url || null;
  };

  // 메뉴 클릭 핸들러
  const handleMenuClick = (screen: ScreenType) => {
    setCurrentScreen(screen);
    setIsEditorOpen(false); // 메뉴 변경 시 에디터 닫기
    setSelectedMemo(null);
  };

  // 언어 변경 핸들러
  const handleLanguageChange = (language: string) => {
    changeLanguage(language);
    setCurrentLanguage(language);
  };

  // 파일 업로드 핸들러
  const handleFileUpload = async (file: File): Promise<any> => {
    try {
      console.log('📁 파일 업로드 시작:', file.name);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadedAttachment = await api.memo.uploadAttachment(formData);
      console.log('✅ 파일 업로드 성공:', uploadedAttachment);
      
      return uploadedAttachment;
    } catch (error) {
      console.error('❌ 파일 업로드 실패:', error);
      throw error;
    }
  };

  const handleNewMemo = async () => {
    // Free 사용자는 새 메모 생성 불가
    if (!isPro) {
      console.log('🚫 Free 사용자 - 메모 생성 차단');
      setShowProUpgradeModal(true);
      return;
    }

    try {
      console.log('🔄 새 메모 생성 시작...');
      
      // 실제 API를 통한 메모 생성
      const newMemo = await api.memo.create({
        title: t('memo.new_memo'),
        content: ''
      });
      
      console.log('✅ 새 메모 생성 성공:', newMemo.id);
      
      // 메모 목록에 추가 후 정렬
      const updatedMemos = [newMemo, ...memos];
      setMemos(sortMemosByFavorite(updatedMemos));
      openMemoEditor(newMemo);
    } catch (error) {
      console.error('❌ 새 메모 생성 실패:', error);
      alert(t('memo.create_error'));
    }
  };

  // Pro 업그레이드 핸들러
  const handleProUpgrade = () => {
    console.log('🌐 Pro 업그레이드 요청 - 웹사이트 안내');
    
    // 데스크탑에서는 웹사이트 구독 페이지로 안내
    const message = `MemoBee Pro 구독은 웹사이트에서 가능합니다.\n\n웹사이트에서 Pro 구독 후 모든 기기에서 이용하세요.`;
    
    if (window.confirm(message + '\n\n웹사이트로 이동하시겠습니까?')) {
      // 외부 브라우저에서 웹사이트 구독 페이지 열기
      if (window.electronAPI?.openExternalUrl) {
        window.electronAPI.openExternalUrl('https://memobee-ai.pages.dev/subscription');
      }
    }
    
    setShowProUpgradeModal(false);
  };

  // 수동 업데이트 확인 핸들러
  const handleCheckUpdate = async () => {
    if (isCheckingUpdate) return;
    
    try {
      setIsCheckingUpdate(true);
      setUpdateStatus('checking');
      console.log('🔍 수동 업데이트 확인 시작...');
      
      // Electron Main 프로세스에 업데이트 확인 요청
      if (window.electronAPI?.checkForUpdates) {
        const result = await window.electronAPI.checkForUpdates();
        console.log('✅ 업데이트 확인 결과:', result);
        
        if (result.available) {
          setUpdateInfo(result);
          setUpdateStatus('available');
        } else {
          setUpdateStatus('not-available');
          setTimeout(() => {
            setUpdateStatus('idle');
          }, 3000);
        }
      } else {
        console.log('ℹ️ 개발 모드 또는 electronAPI 없음');
        setUpdateStatus('not-available');
        setTimeout(() => {
          setUpdateStatus('idle');
        }, 3000);
      }
    } catch (error) {
      console.error('❌ 업데이트 확인 실패:', error);
      setUpdateStatus('idle');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  // 업데이트 다운로드 핸들러
  const handleDownloadUpdate = async () => {
    try {
      setUpdateStatus('downloading');
      console.log('📥 업데이트 다운로드 시작...');
      
      // 다운로드 타임아웃 설정 (10분)
      const downloadTimeout = setTimeout(() => {
        console.log('⏱️ 다운로드 타임아웃');
        setUpdateStatus('available');
        alert('다운로드가 너무 오래 걸리고 있습니다. 네트워크 상태를 확인하고 다시 시도해주세요.');
      }, 10 * 60 * 1000);
      
      if (window.electronAPI?.downloadUpdate) {
        const result = await window.electronAPI.downloadUpdate();
        clearTimeout(downloadTimeout);
        
        if (result.success) {
          console.log('✅ 다운로드 완료:', result.message);
          // auto-updater 이벤트에서 'ready' 상태로 변경될 것임
        } else {
          console.error('❌ 다운로드 실패:', result.error);
          setUpdateStatus('available');
          const retry = confirm(`다운로드 실패: ${result.error}\n\n다시 시도하시겠습니까?`);
          if (retry) {
            handleDownloadUpdate();
          }
        }
      }
    } catch (error) {
      console.error('❌ 업데이트 다운로드 실패:', error);
      setUpdateStatus('available');
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      alert(`다운로드 중 오류 발생: ${errorMessage}`);
    }
  };

  // 업데이트 설치 핸들러
  const handleInstallUpdate = async () => {
    try {
      console.log('🔄 업데이트 설치 시작...');
      
      if (window.electronAPI?.installUpdate) {
        await window.electronAPI.installUpdate();
      }
    } catch (error) {
      console.error('❌ 업데이트 설치 실패:', error);
    }
  };

  return (
    <div className="layout">
      {/* 업데이트 알림 */}
      <UpdateNotification />
      
      {/* 헤더 */}
      <header className="layout-header">
        <div className="header-left">
          <h1>MemoBee AI v{appVersion}</h1>
          <small style={{color: '#666', fontSize: '12px'}}>자동 업데이트 테스트 버전</small>
        </div>
        <div className="header-right">
          {currentUser && (
            <div className="user-info">
              <FaUser className="user-icon" />
              <span className="user-email">{currentUser.email}</span>
              {!isSubscriptionLoading && (
                <div className={`subscription-badge ${isPro ? 'pro' : 'free'}`}>
                  {isPro ? (
                    <>
                      <FaCrown className="subscription-icon" />
                      <span>Pro</span>
                    </>
                  ) : (
                    <span>Free</span>
                  )}
                </div>
              )}
            </div>
          )}
          <button onClick={onLogout} className="logout-btn">
            {t('auth.logout')}
          </button>
        </div>
      </header>

      <div className="layout-content">
        {/* 왼쪽 메뉴바 */}
        <nav className="menu-bar">
          <div className="menu-items">
            <button 
              className={`menu-item ${currentScreen === 'memo' ? 'active' : ''}`}
              onClick={() => handleMenuClick('memo')}
            >
              <span className="menu-icon icon-memo"></span>
              <span className="menu-text">{t('menu.memo')}</span>
            </button>
            <button 
              className={`menu-item ${currentScreen === 'schedule' ? 'active' : ''}`}
              onClick={() => handleMenuClick('schedule')}
            >
              <span className="menu-icon icon-schedule"></span>
              <span className="menu-text">{t('menu.schedule')}</span>
            </button>
            <button 
              className={`menu-item ${currentScreen === 'todo' ? 'active' : ''}`}
              onClick={() => handleMenuClick('todo')}
            >
              <span className="menu-icon icon-todo"></span>
              <span className="menu-text">{t('menu.todo')}</span>
            </button>
            <button 
              className={`menu-item ${currentScreen === 'security' ? 'active' : ''}`}
              onClick={() => handleMenuClick('security')}
            >
              <span className="menu-icon icon-security"></span>
              <span className="menu-text">{t('menu.security')}</span>
            </button>
            <button 
              className={`menu-item ${currentScreen === 'analytics' ? 'active' : ''}`}
              onClick={() => handleMenuClick('analytics')}
            >
              <span className="menu-icon icon-analytics"></span>
              <span className="menu-text">{t('menu.analytics')}</span>
            </button>
            <button 
              className={`menu-item ${currentScreen === 'share' ? 'active' : ''}`}
              onClick={() => handleMenuClick('share')}
            >
              <span className="menu-icon icon-share"></span>
              <span className="menu-text">{t('menu.share')}</span>
            </button>
            <button 
              className={`menu-item ${currentScreen === 'files' ? 'active' : ''}`}
              onClick={() => handleMenuClick('files')}
            >
              <span className="menu-icon icon-files"></span>
              <span className="menu-text">{t('menu.files')}</span>
            </button>
            <button 
              className={`menu-item ${currentScreen === 'links' ? 'active' : ''}`}
              onClick={() => handleMenuClick('links')}
            >
              <span className="menu-icon icon-links"></span>
              <span className="menu-text">{t('menu.links')}</span>
            </button>
            <button 
              className={`menu-item ${currentScreen === 'trash' ? 'active' : ''}`}
              onClick={() => handleMenuClick('trash')}
            >
              <span className="menu-icon icon-trash"></span>
              <span className="menu-text">{t('menu.trash')}</span>
            </button>
          </div>
          <div className="menu-bottom">
            <button 
              className={`menu-item ${currentScreen === 'support' ? 'active' : ''}`}
              onClick={() => handleMenuClick('support')}
            >
              <span className="menu-icon icon-support"></span>
              <span className="menu-text">{t('menu.support')}</span>
            </button>
            <button 
              className={`menu-item ${currentScreen === 'settings' ? 'active' : ''}`}
              onClick={() => handleMenuClick('settings')}
            >
              <span className="menu-icon icon-settings"></span>
              <span className="menu-text">{t('menu.settings')}</span>
            </button>
          </div>
        </nav>

        {/* 화면별 컨텐츠 렌더링 */}
        {currentScreen === 'memo' && (
          <>
            {/* 사이드바 */}
            <aside className="sidebar">
              <div className="sidebar-header">
                {/* AI 검색창 - 모바일과 동일한 구조 */}
                <div className="search-section">
                  <div className="search-container">
                    <div className="search-input-wrapper">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        onKeyPress={handleSearchKeyPress}
                        placeholder={t('search.placeholder')}
                        className="search-input"
                      />
                      {searchQuery.trim() && (
                        <button
                          className="clear-search-btn"
                          onClick={handleClearSearch}
                          title="검색어 지우기"
                        >
                          ←
                        </button>
                      )}
                    </div>
                    {searchQuery.trim() && isSentence(searchQuery) && (
                      <button
                        className={`ai-question-btn ${isAiLoading ? 'loading' : ''}`}
                        onClick={handleAiQuestion}
                        disabled={isAiLoading}
                        title="AI 질문하기"
                      >
                        {isAiLoading ? t('search.processing') : t('search.ai_question')}
                      </button>
                    )}
                  </div>
                </div>

                <button 
                  onClick={handleNewMemo} 
                  className={`new-memo-btn ${!isPro ? 'disabled' : ''}`}
                  title={!isPro ? 'Pro 구독이 필요합니다' : t('memo.new_memo')}
                >
                  <FaPlus className="new-memo-icon" />
                  {t('memo.new_memo')}
                  {!isPro && <FaCrown className="pro-required-icon" />}
                </button>
              </div>
              
              {/* 검색 상태 표시 */}
              {searchQuery.trim() && (
                <div className="search-status">
                  <span className="search-info">
                    🔍 "{searchQuery}" {t('search.results')}: {filteredMemos.length}개
                  </span>
                  <button className="show-all-btn" onClick={handleClearSearch}>
                    {t('search.show_all')}
                  </button>
                </div>
              )}

              {/* 🆕 개선된 AI 결과 모달 */}
              {showAiResult && aiResult && (
                <div className="modern-ai-modal-overlay" onClick={() => setShowAiResult(false)}>
                  <div className="modern-ai-modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modern-ai-modal-header">
                      <div className="ai-modal-title-section">
                        <div className="ai-modal-icon"><FaRobot /></div>
                        <h3>AI 응답</h3>
                      </div>
                      <button 
                        onClick={() => setShowAiResult(false)} 
                        className="modern-modal-close-btn"
                        title="닫기"
                      >
                        <FaTimes />
                      </button>
                    </div>
                    
                    <div className="modern-ai-modal-body">
                      {/* 검색 결과 표시 */}
                      {(aiResult.intent === 'SEARCH' && aiResult.memos) && (
                        <div className="ai-result-section">
                          <div className="ai-result-header">
                            <div className="result-icon"><FaSearch /></div>
                            <h4>검색 결과</h4>
                            <span className="result-count">{aiResult.memos.length}개</span>
                          </div>
                          <div className="ai-search-results">
                            {aiResult.memos.map((memo: any, index: number) => (
                              <div 
                                key={memo.id || index} 
                                className={`ai-search-result-card ${memo.is_ai_generated ? 'ai-generated-memo' : ''}`}
                                onClick={() => {
                                  handleMemoClick(memo);
                                  setShowAiResult(false);
                                }}
                              >
                                <div className="result-card-header">
                                  <h5>{memo.ai_title || memo.title || t('memo.no_title')}</h5>
                                  <small className="result-date">{formatDate(memo.updated_at)}</small>
                                </div>
                                <p className="result-preview">{memo.content?.substring(0, 150)}...</p>
                                {memo.ai_category && (
                                  <span className="result-category">{memo.ai_category}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* 생성된 메모 표시 */}
                      {aiResult.intent === 'GENERATE' && aiResult.new_memo && (
                        <div className="ai-result-section">
                          <div className="ai-result-header">
                            <div className="result-icon"><FaSave /></div>
                            <h4>새 메모 생성 완료</h4>
                          </div>
                          <div className="generated-memo-card">
                            <h5>{aiResult.new_memo.ai_title || aiResult.new_memo.title || t('memo.no_title')}</h5>
                            <p>{aiResult.new_memo.content?.substring(0, 200)}...</p>
                            <button 
                              className="view-memo-btn"
                              onClick={() => {
                                handleMemoClick(aiResult.new_memo);
                                setShowAiResult(false);
                              }}
                            >
                              메모 보기
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* 일반 질문 응답 */}
                      {aiResult.intent === 'QUESTION' && (
                        <div className="ai-result-section">
                          <div className="ai-result-header">
                            <div className="result-icon"><FaComments /></div>
                            <h4>AI 응답</h4>
                          </div>
                          <div className="ai-question-response">
                            <p className="ai-response-text">{aiResult.response}</p>
                          </div>
                        </div>
                      )}
                      
                      {/* 메모 없음 - AI 생성 제안 */}
                      {aiResult.type === 'no_memos_found_suggest_ai' && (
                        <div className="ai-result-section">
                          <div className="ai-result-header">
                            <div className="result-icon"><FaQuestion /></div>
                            <h4>관련 메모를 찾을 수 없습니다</h4>
                          </div>
                          <div className="ai-suggestion-card">
                            <p>AI가 새로운 메모를 생성하여 도움을 드릴 수 있습니다.</p>
                            <div className="suggestion-actions">
                              <button 
                                className="generate-memo-btn"
                                onClick={() => {
                                  console.log('🤖 AI 메모 생성 요청');
                                  // TODO: AI 메모 생성 API 호출
                                }}
                              >
                                AI 메모 생성하기
                              </button>
                              <button 
                                className="cancel-btn"
                                onClick={() => setShowAiResult(false)}
                              >
                                취소
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="memo-list">
                {loading ? (
                  <div className="loading">{t('memo.loading')}</div>
                ) : isSearching ? (
                  <div className="loading">검색 중...</div>
                ) : (
                  (filteredMemos.length > 0 ? filteredMemos : memos).map(memo => {
                    const thumbnailImage = getThumbnailImage(memo);
                    return (
                      <div
                        key={memo.id}
                        className={`memo-item ${selectedMemo?.id === memo.id ? 'selected' : ''} ${memo.is_security_memo ? 'security-memo' : ''} ${memo.is_ai_generated ? 'ai-generated-memo' : ''}`}
                        onClick={() => handleMemoClick(memo)}
                      >
                        <div className="memo-item-header">
                          <div className="memo-item-left">
                            {thumbnailImage && (
                              <img 
                                src={thumbnailImage} 
                                alt="첨부 이미지" 
                                className="memo-thumbnail"
                                onError={(e) => {
                                  // 이미지 로드 실패 시 숨기기
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            )}
                            <div className="memo-text-content">
                              <h3>
                                {memo.is_ai_generated && <span className="ai-badge"><FaRobot /></span>}
                                {memo.is_favorited && <span className="favorite-indicator"><FaStar /></span>}
                                {memo.is_security_memo && <span className="security-badge"><FaLock /></span>}
                                {memo.ai_title || memo.title || t('memo.no_title')}
                              </h3>
                              <p>{memo.content?.substring(0, 100)}...</p>
                              <div className="memo-meta">
                                <small>{formatDate(memo.updated_at)}</small>
                                {memo.attachments && memo.attachments.length > 0 && (
                                  <span className="attachment-count"><FaPaperclip /> {memo.attachments.length}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="memo-item-actions">
                            <button
                              className={`favorite-btn ${memo.is_favorited ? 'favorited' : ''}`}
                              onClick={(e) => handleToggleFavorite(memo, e)}
                              title={memo.is_favorited ? t('memo.remove_favorite') : t('memo.add_favorite')}
                            >
                              {memo.is_favorited ? <FaStar /> : <FaRegStar />}
                            </button>
                            <button
                              className="delete-btn"
                              onClick={(e) => handleDeleteMemo(memo, e)}
                              title={t('memo.delete_memo')}
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </aside>

            {/* 메인 영역 */}
            <main className="main-content">
              {isEditorOpen && selectedMemo ? (
                <div className="editor-container">
                  {/* 상단 액션바 */}
                  <div className="editor-action-bar">
                    <div className="action-bar-left">
                      <button
                        className={`action-btn favorite-btn ${selectedMemo.is_favorited ? 'favorited' : ''}`}
                        onClick={(e) => handleToggleFavoriteInEditor(selectedMemo, e)}
                        title={selectedMemo.is_favorited ? t('memo.remove_favorite') : t('memo.add_favorite')}
                      >
                        {selectedMemo.is_favorited ? <FaStar /> : <FaRegStar />}
                      </button>
                      
                      <button
                        className={`action-btn save-btn ${saveButtonState === 'completed' ? 'completed' : saveButtonState === 'saving' ? 'saving' : ''}`}
                        onClick={() => selectedMemo && handleImmediateSave(selectedMemo)}
                        disabled={saveButtonState !== 'normal'}
                        title={
                          saveButtonState === 'saving' ? t('memo.saving') :
                          saveButtonState === 'completed' ? t('memo.save_completed') : t('memo.save')
                        }
                      >
                        {saveButtonState === 'saving' ? (
                          <FaSpinner className="save-spinner" />
                        ) : saveButtonState === 'completed' ? (
                          <FaCheck />
                        ) : (
                          <FaSave />
                        )}
                      </button>
                      
                      <button
                        className="action-btn ai-btn"
                        title="AI 분석"
                      >
                        <FaRobot />
                      </button>
                      
                      <button
                        className="action-btn upload-btn"
                        onClick={() => {
                          if (hybridEditorRef.current) {
                            hybridEditorRef.current.openFileDialog();
                          }
                        }}
                        title="파일 첨부"
                      >
                        <FaPaperclip />
                      </button>

                      {/* 보안 메모 표시 */}
                      {selectedMemo?.is_security_memo && (
                        <div className="security-indicator">
                          <span className="security-icon"><FaLock /></span>
                          <span className="security-text">보안 메모</span>
                        </div>
                      )}
                      
                      <button
                        className="action-btn delete-btn"
                        onClick={(e) => handleDeleteMemoInEditor(selectedMemo, e)}
                        title="삭제"
                      >
                        <FaTrash />
                      </button>
                    </div>
                    
                    <div className="action-bar-right">
                      <button
                        className="action-btn close-btn"
                        onClick={() => setIsEditorOpen(false)}
                        title="닫기"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  </div>

                  {/* 제목 입력 영역 */}
                  <div className="editor-title-section">
                    <input
                      type="text"
                      value={selectedMemo.ai_title || selectedMemo.title || ''}
                      onChange={(e) => handleMemoTitleChange(e.target.value)}
                      onBlur={() => selectedMemo && handleSaveMemo(selectedMemo)}
                      placeholder={selectedMemo.ai_title ? '' : t('memo.title_placeholder')}
                      className="memo-title-input"
                    />
                  </div>

                  {/* 하이브리드 에디터 영역 */}
                  <div className={`editor-content-section ${!isPro ? 'readonly' : ''}`}>
                    <HybridEditor
                      ref={hybridEditorRef}
                      value={selectedMemo.content || ''}
                      onChange={handleMemoContentChange}
                      attachments={selectedMemo.attachments}
                      placeholder={isPro ? t('memo.content_placeholder') : 'Pro 구독이 필요합니다. 현재는 읽기만 가능합니다.'}
                      readOnly={!isPro}
                      onFileUpload={handleFileUpload}
                    />
                  </div>
                </div>
              ) : (
                <div className="welcome-screen">
                  <h2>{t('memo.welcome_title')}</h2>
                  <p>{t('memo.welcome_message')}</p>
                </div>
              )}
            </main>
          </>
        )}

        {/* 일정 화면 */}
        {currentScreen === 'schedule' && (
          <ScheduleView />
        )}

        {/* 할일 화면 */}
        {currentScreen === 'todo' && (
          <TodoView />
        )}

        {/* 보안 화면 */}
        {currentScreen === 'security' && (
          <SecurityView />
        )}

        {/* 분석 화면 */}
        {currentScreen === 'analytics' && (
          <AnalyticsView />
        )}

        {/* 공유 화면 */}
        {currentScreen === 'share' && <ShareView />}

        {/* 파일 화면 */}
        {currentScreen === 'files' && (
          <FileManagementView />
        )}

        {/* 링크 화면 */}
        {currentScreen === 'links' && (
          <LinkManagementView />
        )}

        {/* 휴지통 화면 */}
        {currentScreen === 'trash' && (
          <TrashView />
        )}

        {/* 지원 화면 */}
        {currentScreen === 'support' && (
          <SupportView />
        )}

        {/* 설정 화면 */}
        {currentScreen === 'settings' && (
          <>
            <aside className="sidebar">
              <div className="sidebar-header">
                <button className="new-memo-btn">
                  ⚙️ {t('settings.manage')}
                </button>
              </div>
              <div className="memo-list">
                <div className="memo-item">
                  <h3>🌐 {t('settings.language.title')}</h3>
                  <p>{t('settings.language.description')}</p>
                  <small>{t('settings.language.category')}</small>
                </div>
                <div className="memo-item">
                  <h3>ℹ️ {t('settings.version.title')}</h3>
                  <p>{t('settings.version.description')}</p>
                  <small>{t('settings.version.category')}</small>
                </div>
              </div>
            </aside>
            <main className="main-content">
              <div className="settings-dashboard">
                <div className="dashboard-header">
                  <h2>⚙️ {t('settings.dashboard_title')}</h2>
                  <p>{t('settings.dashboard_description')}</p>
                </div>

                {/* 언어 설정 섹션 */}
                <div className="stats-section">
                  <h3>🌐 {t('settings.language.title')}</h3>
                  <div className="language-setting">
                    <p className="current-language">
                      {t('settings.language.current')}: <strong>{getLanguageLabel(currentLanguage)}</strong>
                    </p>
                    
                    <div className="language-buttons">
                      {getSupportedLanguages().map(lang => (
                        <button
                          key={lang}
                          onClick={() => handleLanguageChange(lang)}
                          className={`language-btn ${currentLanguage === lang ? 'active' : ''}`}
                        >
                          {getLanguageLabel(lang)}
                        </button>
                      ))}
                    </div>
                    
                    <p className="language-notice">
                      💡 {t('settings.language.auto_save_notice')}
                    </p>
                  </div>
                </div>

                {/* 버전 정보 섹션 */}
                <div className="stats-section">
                  <h3>ℹ️ {t('settings.version.title')}</h3>
                  <div className="version-info">
                    <div className="version-item">
                      <div className="version-label">{t('settings.version.current')}</div>
                      <div className="version-value">v{appVersion}</div>
                    </div>
                    <div className="version-item">
                      <div className="version-label">{t('settings.version.platform')}</div>
                      <div className="version-value">Desktop (Electron)</div>
                    </div>
                    <div className="version-item">
                      <div className="version-label">{t('settings.version.last_updated')}</div>
                      <div className="version-value">{formatDate(new Date().toISOString())}</div>
                    </div>
                  </div>
                </div>

                {/* 수동 업데이트 섹션 */}
                <div className="stats-section">
                  <h3>🔄 앱 업데이트</h3>
                  <div className="update-section">
                    <p className="update-description">
                      최신 버전의 MemoBee를 사용하여 새로운 기능과 개선사항을 경험하세요.
                    </p>
                    
                    <div className="update-status">
                      {updateStatus === 'checking' && (
                        <div className="update-status-item checking">
                          <FaSpinner className="update-spinner" />
                          <span>업데이트 확인 중...</span>
                        </div>
                      )}
                      
                      {updateStatus === 'available' && updateInfo && (
                        <div className="update-status-item available">
                          <FaCheck className="update-icon" />
                          <div className="update-info">
                            <span className="update-title">새 업데이트 발견!</span>
                            <span className="update-version">v{updateInfo.version} 사용 가능</span>
                          </div>
                        </div>
                      )}
                      
                      {updateStatus === 'not-available' && (
                        <div className="update-status-item up-to-date">
                          <FaCheck className="update-icon" />
                          <span>최신 버전을 사용 중입니다</span>
                        </div>
                      )}
                      
                      {updateStatus === 'downloading' && (
                        <div className="update-status-item downloading">
                          <FaSpinner className="update-spinner" />
                          <div className="download-info">
                            <span>업데이트 다운로드 중...</span>
                            {downloadProgress && (
                              <div className="download-progress">
                                <div className="progress-bar">
                                  <div 
                                    className="progress-fill" 
                                    style={{ width: `${downloadProgress.percent}%` }}
                                  ></div>
                                </div>
                                <span className="progress-text">
                                  {downloadProgress.percent.toFixed(1)}% 
                                  ({Math.round(downloadProgress.transferred / 1024 / 1024)}MB / {Math.round(downloadProgress.total / 1024 / 1024)}MB)
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {updateStatus === 'ready' && (
                        <div className="update-status-item ready">
                          <FaCheck className="update-icon" />
                          <span>업데이트 설치 준비 완료</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="update-actions">
                      {updateStatus === 'idle' && (
                        <button
                          onClick={handleCheckUpdate}
                          disabled={isCheckingUpdate}
                          className="update-btn check-update-btn"
                        >
                          <FaSearch />
                          업데이트 확인
                        </button>
                      )}
                      
                      {updateStatus === 'available' && (
                        <button
                          onClick={handleDownloadUpdate}
                          className="update-btn download-update-btn"
                        >
                          <FaSave />
                          지금 업데이트
                        </button>
                      )}
                      
                      {updateStatus === 'ready' && (
                        <button
                          onClick={handleInstallUpdate}
                          className="update-btn install-update-btn"
                        >
                          <FaCheck />
                          재시작 및 설치
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </main>
          </>
        )}

        {/* 기타 화면들 (개발 중) */}
        {!['memo', 'schedule', 'todo', 'security', 'analytics', 'share', 'files', 'links', 'trash', 'support', 'settings'].includes(currentScreen) && (
          <main className="main-content" style={{ width: '100%' }}>
            <div className="welcome-screen">
              <h2>🚧 {t('common.developing')}</h2>
              <p>{t('common.feature_implementing', {feature: currentScreen})}</p>
            </div>
          </main>
        )}
      </div>

      {/* 보안 인증 모달 */}
      <SecurityAuthModal
        isOpen={showSecurityModal}
        onClose={handleSecurityModalClose}
        onAuthenticated={handleSecurityAuthenticated}
        memoTitle={pendingSecurityMemo?.ai_title || pendingSecurityMemo?.title || '보안 메모'}
      />

      {/* Pro 업그레이드 모달 */}
      <ProUpgradeModal
        isOpen={showProUpgradeModal}
        onClose={() => setShowProUpgradeModal(false)}
        onUpgrade={handleProUpgrade}
      />
    </div>
  );
};

const App: React.FC = () => {
  console.log('🚀 App 컴포넌트 시작!');
  
  const { t } = useTranslation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true); // 초기화 상태 추가
  const [userInfo, setUserInfo] = useState<any>(null);
  
  console.log('🎯 App 상태 - isLoggedIn:', isLoggedIn, '/ initializing:', initializing);

  // Firebase 인증 상태 리스너 설정
  useEffect(() => {
    console.log('🔍 Firebase 인증 상태 확인 중...');
    
    // Firebase 인증 상태 변경 리스너
    const unsubscribe = authService.onAuthStateChanged((user) => {
      console.log('🔄 Firebase 인증 상태 변경:', user ? 'authenticated' : 'not authenticated');
      
      if (user) {
        console.log('✅ Firebase 사용자 인증됨:', user.uid);
        console.log('📧 이메일:', user.email);
        console.log('👤 이름:', user.displayName);
        
        const userInfo = {
          uid: user.uid,
          email: user.email,
          name: user.displayName || '사용자',
          username: user.email?.split('@')[0] || 'user',
          picture: user.photoURL
        };
        
        setUserInfo(userInfo);
        setIsLoggedIn(true);
        setInitializing(false); // 초기화 완료
        
        // Firebase 사용자 정보 로컬 저장
        localStorage.setItem('memobee_firebase_user', JSON.stringify(userInfo));
        
        console.log('🎉 자동 로그인 완료');
      } else {
        console.log('ℹ️ Firebase 사용자 인증되지 않음');
        
        // 로그아웃 상태 처리
        setUserInfo(null);
        setIsLoggedIn(false);
        setInitializing(false); // 초기화 완료
        
        // 로컬 스토리지 정리
        localStorage.removeItem('memobee_firebase_user');
      }
    });

    // 컴포넌트 언마운트 시 리스너 해제
    return () => {
      console.log('🔄 Firebase 인증 리스너 해제');
      unsubscribe();
    };
  }, []);

  const handleGoogleLogin = async () => {
    // 이미 로그인된 상태라면 중복 실행 방지
    if (isLoggedIn) {
      console.log('⚠️ 이미 로그인된 상태입니다.');
      return;
    }

    setLoading(true);
    console.log('🔵 Google Firebase 인증 시작...');

    try {
      console.log('🔄 Firebase Google 로그인 시도...');
      
      // Firebase authService 사용
      const user = await authService.signInWithGoogle();
      
      if (user) {
        console.log('✅ Google 로그인 성공:', user.uid);
        console.log('📧 사용자 이메일:', user.email);
        console.log('👤 사용자 이름:', user.displayName);

        // 상태는 Firebase 인증 리스너에서 자동으로 업데이트됨
        console.log('ℹ️ 사용자 상태는 Firebase 리스너에서 자동 업데이트됩니다.');
        
      } else {
        throw new Error('Google 로그인이 취소되었거나 실패했습니다.');
      }

    } catch (error: any) {
      console.error('❌ Google 로그인 실패:', error);
      
      // 에러 타입별 메시지
      let errorMessage = '알 수 없는 오류가 발생했습니다.';
      
      if (error.code === 'auth/popup-blocked') {
        errorMessage = '팝업이 차단되었습니다. 브라우저 설정을 확인해주세요.';
      } else if (error.code === 'auth/cancelled-popup-request') {
        errorMessage = '로그인이 취소되었습니다.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = '네트워크 연결을 확인해주세요.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(`❌ Google 로그인 실패\n\n${errorMessage}\n\n다시 시도해주세요.`);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    alert('Apple 로그인은 개발 중입니다.');
  };

  const handleLogout = async () => {
    try {
      console.log('🚪 Firebase 로그아웃 시작...');
      await authService.signOut();
      console.log('✅ Firebase 로그아웃 완료');
      
      // 상태는 Firebase 인증 리스너에서 자동으로 처리됨
      alert('로그아웃되었습니다.');
    } catch (error) {
      console.error('❌ 로그아웃 실패:', error);
      alert('로그아웃 중 오류가 발생했습니다.');
    }
  };

  // 초기화 중일 때 로딩 화면 표시
  if (initializing) {
    console.log('⏳ 초기화 중 - 로딩 화면 표시');
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid #e0e0e0',
          borderTop: '3px solid #007AFF',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ marginTop: '16px', color: '#666' }}>{t('auth.checking_auth')}</p>
      </div>
    );
  }

  if (isLoggedIn) {
    console.log('✅ 로그인됨 - Layout 컴포넌트 렌더링');
    return <Layout onLogout={handleLogout} />;
  }

  console.log('❌ 로그인되지 않음 - 로그인 화면 표시');

  return (
    <div style={{ padding: '50px', textAlign: 'center', maxWidth: '400px', margin: '0 auto' }}>
      <h1>🐝 {t('app.name')}</h1>
      <p>{t('app.subtitle')}</p>

      <div style={{ marginTop: '30px' }}>
        <h2>{t('auth.welcome_title')}</h2>
        <p>{t('auth.welcome_message')}</p>

        <div style={{ marginTop: '20px' }}>
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            style={{
              display: 'block',
              width: '100%',
              padding: '12px',
              margin: '10px 0',
              backgroundColor: loading ? '#ccc' : '#4285f4',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            🔵 {loading ? t('auth.logging_in') : t('auth.google_login')}
          </button>

          <button
            onClick={handleAppleLogin}
            disabled={loading}
            style={{
              display: 'block',
              width: '100%',
              padding: '12px',
              margin: '10px 0',
              backgroundColor: '#000',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🍎 {t('auth.apple_login')}
          </button>
        </div>

        <div style={{ marginTop: '30px', fontSize: '12px', color: '#666' }}>
          <p>🔐 {t('auth.features.firebase_auth')}</p>
          <p>🔄 {t('auth.features.auto_login')}</p>
          <p>🛡️ {t('auth.features.secure_oauth')}</p>
        </div>
      </div>
    </div>
  );
};

export default App;