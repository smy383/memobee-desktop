/**
 * useAuth Hook - Desktop Firebase Authentication
 * 데스크톱용 인증 상태 관리 훅
 */

import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { authService } from '../services/authService';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

interface AuthActions {
  signInWithGoogle: () => Promise<boolean>;
  signInWithApple: () => Promise<boolean>;
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  clearError: () => void;
}

export const useAuth = (): AuthState & AuthActions => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    console.log('🔄 useAuth 훅 초기화');

    // 타임아웃으로 무한 로딩 방지 (5초 후 강제로 로딩 완료)
    const timeoutId = setTimeout(() => {
      console.log('⏰ Firebase 초기화 타임아웃 - 강제로 로딩 완료');
      setAuthState(prev => ({
        ...prev,
        loading: false,
      }));
    }, 5000);

    // Firebase 인증 상태 리스너 등록
    const unsubscribe = authService.onAuthStateChanged((user) => {
      console.log('👤 Auth state changed in hook:', user ? 'authenticated' : 'null');
      
      // 타임아웃 해제
      clearTimeout(timeoutId);
      
      setAuthState(prev => ({
        ...prev,
        user,
        loading: false,
      }));
    });

    // 컴포넌트 언마운트 시 리스너 해제
    return () => {
      console.log('🔄 useAuth 훅 정리');
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  // Google 로그인
  const signInWithGoogle = async (): Promise<boolean> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      
      const user = await authService.signInWithGoogle();
      
      if (user) {
        console.log('✅ useAuth: Google 로그인 성공');
        return true;
      } else {
        setAuthState(prev => ({ 
          ...prev, 
          loading: false, 
          error: 'Google 로그인이 취소되었습니다.' 
        }));
        return false;
      }
    } catch (error: any) {
      console.error('❌ useAuth: Google 로그인 실패:', error);
      setAuthState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message || 'Google 로그인에 실패했습니다.' 
      }));
      return false;
    }
  };

  // Apple 로그인
  const signInWithApple = async (): Promise<boolean> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      
      const user = await authService.signInWithApple();
      
      if (user) {
        console.log('✅ useAuth: Apple 로그인 성공');
        return true;
      } else {
        setAuthState(prev => ({ 
          ...prev, 
          loading: false, 
          error: 'Apple 로그인이 취소되었습니다.' 
        }));
        return false;
      }
    } catch (error: any) {
      console.error('❌ useAuth: Apple 로그인 실패:', error);
      setAuthState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message || 'Apple 로그인에 실패했습니다.' 
      }));
      return false;
    }
  };

  // 이메일 로그인
  const signInWithEmail = async (email: string, password: string): Promise<boolean> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      
      const user = await authService.signIn(email, password);
      
      if (user) {
        console.log('✅ useAuth: 이메일 로그인 성공');
        return true;
      } else {
        setAuthState(prev => ({ 
          ...prev, 
          loading: false, 
          error: '이메일 또는 비밀번호를 확인해주세요.' 
        }));
        return false;
      }
    } catch (error: any) {
      console.error('❌ useAuth: 이메일 로그인 실패:', error);
      setAuthState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message || '이메일 로그인에 실패했습니다.' 
      }));
      return false;
    }
  };

  // 회원가입
  const signUp = async (email: string, password: string): Promise<boolean> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      
      const user = await authService.signUp(email, password);
      
      if (user) {
        console.log('✅ useAuth: 회원가입 성공');
        return true;
      } else {
        setAuthState(prev => ({ 
          ...prev, 
          loading: false, 
          error: '회원가입에 실패했습니다.' 
        }));
        return false;
      }
    } catch (error: any) {
      console.error('❌ useAuth: 회원가입 실패:', error);
      setAuthState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message || '회원가입에 실패했습니다.' 
      }));
      return false;
    }
  };

  // 로그아웃
  const signOut = async (): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      
      await authService.signOut();
      
      console.log('✅ useAuth: 로그아웃 성공');
    } catch (error: any) {
      console.error('❌ useAuth: 로그아웃 실패:', error);
      setAuthState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message || '로그아웃에 실패했습니다.' 
      }));
    }
  };

  // 비밀번호 재설정
  const resetPassword = async (email: string): Promise<boolean> => {
    try {
      setAuthState(prev => ({ ...prev, error: null }));
      
      await authService.resetPassword(email);
      
      console.log('✅ useAuth: 비밀번호 재설정 이메일 발송 성공');
      return true;
    } catch (error: any) {
      console.error('❌ useAuth: 비밀번호 재설정 실패:', error);
      setAuthState(prev => ({ 
        ...prev, 
        error: error.message || '비밀번호 재설정에 실패했습니다.' 
      }));
      return false;
    }
  };

  // 에러 클리어
  const clearError = (): void => {
    setAuthState(prev => ({ ...prev, error: null }));
  };

  return {
    // State
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    
    // Actions
    signInWithGoogle,
    signInWithApple,
    signInWithEmail,
    signUp,
    signOut,
    resetPassword,
    clearError,
  };
};