/**
 * useMemos Hook - Desktop Memo Management
 * 데스크톱용 메모 관리 훅
 */

import { useState, useEffect, useCallback } from 'react';
import { Memo, api } from '../services/apiService';
import { authService } from '../services/authService';
import { authLogger } from '../utils/logger';

interface MemoState {
  memos: Memo[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  currentPage: number;
  totalCount: number;
  categories: { [key: string]: number };
}

interface MemoActions {
  loadMemos: (searchQuery?: string, category?: string, refresh?: boolean) => Promise<void>;
  createMemo: (title: string, content: string) => Promise<Memo | null>;
  updateMemo: (id: number, title: string, content: string) => Promise<boolean>;
  deleteMemo: (id: number) => Promise<boolean>;
  toggleFavorite: (id: number, isFavorited: boolean) => Promise<boolean>;
  loadMoreMemos: () => Promise<void>;
  refreshMemos: () => Promise<void>;
  clearError: () => void;
  askAIQuestion: (question: string) => Promise<any>;
}

export const useMemos = (): MemoState & MemoActions => {
  const [memoState, setMemoState] = useState<MemoState>({
    memos: [],
    loading: false,
    error: null,
    hasMore: true,
    currentPage: 1,
    totalCount: 0,
    categories: {},
  });

  // 메모 목록 로드
  const loadMemos = useCallback(async (
    searchQuery?: string,
    category?: string,
    refresh: boolean = false
  ) => {
    try {
      if (refresh) {
        setMemoState(prev => ({ ...prev, loading: true, error: null }));
      } else {
        setMemoState(prev => ({ ...prev, error: null }));
      }

      const page = refresh ? 1 : memoState.currentPage;
      const memos = await api.memo.getList(searchQuery, page, 20, category);

      if (refresh) {
        setMemoState(prev => ({
          ...prev,
          memos,
          loading: false,
          currentPage: 1,
          hasMore: memos.length === 20,
        }));
      } else {
        setMemoState(prev => ({
          ...prev,
          memos: page === 1 ? memos : [...prev.memos, ...memos],
          loading: false,
          currentPage: page,
          hasMore: memos.length === 20,
        }));
      }

      authLogger.debug('✅ 메모 로드 성공:', memos.length, '개');
    } catch (error: any) {
      authLogger.error('❌ 메모 로드 실패:', error);
      setMemoState(prev => ({
        ...prev,
        loading: false,
        error: error.message || '메모를 불러오는데 실패했습니다.',
      }));
    }
  }, [memoState.currentPage]);

  // 카테고리 통계 로드
  const loadCategoryStats = useCallback(async () => {
    try {
      const stats = await api.memo.getCategoryStats();
      setMemoState(prev => ({
        ...prev,
        categories: stats.category_stats,
        totalCount: stats.total_count,
      }));
    } catch (error) {
      authLogger.error('❌ 카테고리 통계 로드 실패:', error);
    }
  }, []);

  // 메모 생성
  const createMemo = useCallback(async (title: string, content: string): Promise<Memo | null> => {
    try {
      setMemoState(prev => ({ ...prev, error: null }));

      const newMemo = await api.memo.create({ title, content });

      setMemoState(prev => ({
        ...prev,
        memos: [newMemo, ...prev.memos],
        totalCount: prev.totalCount + 1,
      }));

      authLogger.debug('✅ 메모 생성 성공:', newMemo.id);
      return newMemo;
    } catch (error: any) {
      authLogger.error('❌ 메모 생성 실패:', error);
      setMemoState(prev => ({
        ...prev,
        error: error.message || '메모 생성에 실패했습니다.',
      }));
      return null;
    }
  }, []);

  // 메모 수정
  const updateMemo = useCallback(async (id: number, title: string, content: string): Promise<boolean> => {
    try {
      setMemoState(prev => ({ ...prev, error: null }));

      const updatedMemo = await api.memo.update(id, { title, content });

      setMemoState(prev => ({
        ...prev,
        memos: prev.memos.map(memo => 
          memo.id === id ? updatedMemo : memo
        ),
      }));

      authLogger.debug('✅ 메모 수정 성공:', id);
      return true;
    } catch (error: any) {
      authLogger.error('❌ 메모 수정 실패:', error);
      setMemoState(prev => ({
        ...prev,
        error: error.message || '메모 수정에 실패했습니다.',
      }));
      return false;
    }
  }, []);

  // 메모 삭제
  const deleteMemo = useCallback(async (id: number): Promise<boolean> => {
    try {
      setMemoState(prev => ({ ...prev, error: null }));

      await api.memo.delete(id);

      setMemoState(prev => ({
        ...prev,
        memos: prev.memos.filter(memo => memo.id !== id),
        totalCount: prev.totalCount - 1,
      }));

      authLogger.debug('✅ 메모 삭제 성공:', id);
      return true;
    } catch (error: any) {
      authLogger.error('❌ 메모 삭제 실패:', error);
      setMemoState(prev => ({
        ...prev,
        error: error.message || '메모 삭제에 실패했습니다.',
      }));
      return false;
    }
  }, []);

  // 즐겨찾기 토글
  const toggleFavorite = useCallback(async (id: number, isFavorited: boolean): Promise<boolean> => {
    try {
      setMemoState(prev => ({ ...prev, error: null }));

      const updatedMemo = await api.memo.toggleFavorite(id, isFavorited);

      setMemoState(prev => ({
        ...prev,
        memos: prev.memos.map(memo => 
          memo.id === id ? updatedMemo : memo
        ),
      }));

      authLogger.debug('✅ 즐겨찾기 토글 성공:', id, isFavorited);
      return true;
    } catch (error: any) {
      authLogger.error('❌ 즐겨찾기 토글 실패:', error);
      setMemoState(prev => ({
        ...prev,
        error: error.message || '즐겨찾기 변경에 실패했습니다.',
      }));
      return false;
    }
  }, []);

  // 더 많은 메모 로드 (페이지네이션)
  const loadMoreMemos = useCallback(async () => {
    if (!memoState.hasMore || memoState.loading) return;

    setMemoState(prev => ({ 
      ...prev, 
      currentPage: prev.currentPage + 1,
      loading: true 
    }));

    await loadMemos();
  }, [memoState.hasMore, memoState.loading, loadMemos]);

  // 메모 새로고침
  const refreshMemos = useCallback(async () => {
    await loadMemos(undefined, undefined, true);
    await loadCategoryStats();
  }, [loadMemos, loadCategoryStats]);

  // AI 질문 처리
  const askAIQuestion = useCallback(async (question: string) => {
    try {
      setMemoState(prev => ({ ...prev, error: null }));

      authLogger.debug('🤖 AI 질문 처리 시작:', question);
      
      const result = await api.memo.askAIQuestion(question);
      
      authLogger.debug('✅ AI 질문 처리 성공:', result);
      
      // 새로운 메모가 생성된 경우 메모 리스트 업데이트
      if (result.type === 'generated_memo' && result.new_memo && result.new_memo.id) {
        await refreshMemos();
      }
      
      return result;
    } catch (error: any) {
      authLogger.error('❌ AI 질문 처리 실패:', error);
      setMemoState(prev => ({
        ...prev,
        error: error.message || 'AI 질문 처리에 실패했습니다.',
      }));
      throw error;
    }
  }, [refreshMemos]);

  // 에러 클리어
  const clearError = useCallback(() => {
    setMemoState(prev => ({ ...prev, error: null }));
  }, []);

  // 초기 로드
  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      authLogger.debug('🔄 useMemos 훅 초기화 - 인증된 사용자, 메모 로드 시작');
      loadMemos(undefined, undefined, true);
      loadCategoryStats();
    } else {
      authLogger.debug('⚠️ useMemos 훅 초기화 - 사용자 인증 대기 중');
    }
  }, []); // 의존성 배열을 비워서 한 번만 실행

  return {
    // State
    memos: memoState.memos,
    loading: memoState.loading,
    error: memoState.error,
    hasMore: memoState.hasMore,
    currentPage: memoState.currentPage,
    totalCount: memoState.totalCount,
    categories: memoState.categories,

    // Actions
    loadMemos,
    createMemo,
    updateMemo,
    deleteMemo,
    toggleFavorite,
    loadMoreMemos,
    refreshMemos,
    clearError,
    askAIQuestion,
  };
};