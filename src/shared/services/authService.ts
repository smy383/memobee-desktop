/**
 * Firebase Authentication Service for Desktop
 * Desktop용 Firebase 인증 서비스 (모바일 앱 기반)
 * 
 * 모바일 앱의 authService.ts를 기반으로 데스크톱 환경에 맞게 포팅
 */

import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  AuthError,
  getIdToken
} from 'firebase/auth';
import { auth } from './firebaseConfig';

// 데스크톱 환경 설정 (모바일과 동일한 구조)
const getEnvVar = (key: string, defaultValue: string = '') => {
  const envVars: Record<string, string> = {
    FIREBASE_API_KEY: 'AIzaSyDQEvvTFqwl8c3ekFLzMFgGvQGh0NkTtqE', // 공개 키
    GOOGLE_WEB_CLIENT_ID: '163739628640-ap4kr1hhh4tm1gfiijdcivdpecs79pm3.apps.googleusercontent.com',
    API_BASE_URL: 'https://memobee-ai-production.up.railway.app',
    FIREBASE_AUTH_DOMAIN: 'memobee-prod.firebaseapp.com',
    FIREBASE_PROJECT_ID: 'memobee-prod',
  };

  return envVars[key] || defaultValue;
};

const DESKTOP_ENV = {
  GOOGLE_WEB_CLIENT_ID: getEnvVar('GOOGLE_WEB_CLIENT_ID'),
  API_BASE_URL: getEnvVar('API_BASE_URL'),
  FIREBASE_CONFIG: {
    apiKey: getEnvVar('FIREBASE_API_KEY'),
    authDomain: getEnvVar('FIREBASE_AUTH_DOMAIN'),
    projectId: getEnvVar('FIREBASE_PROJECT_ID'),
  },
};

class DesktopAuthService {
  private isInitialized = false;

  constructor() {
    this.initializeAuth();
  }

  private async initializeAuth() {
    try {
      console.log('🔧 데스크톱 인증 서비스 초기화 시작...');

      // Firebase는 firebaseConfig.ts에서 이미 초기화됨
      console.log('🔥 Firebase 앱은 firebaseConfig.ts에서 초기화됨');

      // Google OAuth Redirect 결과 확인
      await this.checkForRedirectResult();

      // 인증 상태 리스너 등록
      this.onAuthStateChanged(user => {
        console.log(
          '👤 Auth state changed:',
          user ? 'authenticated' : 'null',
        );
        if (user) {
          // User is signed in. Handle post-authentication logic.
          this.handleUserAuthenticated(user);
        } else {
          // User is signed out.
          console.log('👣 사용자가 로그아웃되었습니다.');
        }
      });

      this.isInitialized = true;
      console.log('✅ 데스크톱 인증 서비스 초기화 완료');
    } catch (error) {
      console.error('❌ 인증 서비스 초기화 실패:', error);
      this.isInitialized = false;
    }
  }

  // Google OAuth Redirect 결과 확인
  private async checkForRedirectResult() {
    try {
      console.log('🔍 Google OAuth Redirect 결과 확인 중...');

      const result = await getRedirectResult(auth);

      if (result && result.user) {
        console.log('✅ Google OAuth Redirect 성공:', result.user.uid);
        console.log('📧 이메일:', result.user.email);
        console.log('👤 이름:', result.user.displayName);

        // 저장된 pre-auth URL로 리다이렉트
        const preAuthUrl = localStorage.getItem('memobee_pre_auth_url');
        if (preAuthUrl) {
          localStorage.removeItem('memobee_pre_auth_url');
        }

        return result.user;
      } else {
        console.log('ℹ️ Google OAuth Redirect 결과 없음 (정상)');
        return null;
      }
    } catch (error) {
      console.error('❌ Google OAuth Redirect 결과 확인 실패:', error);
      return null;
    }
  }

  private async handleUserAuthenticated(user: User) {
    try {
      console.log('🔐 사용자 인증 처리 시작');

      const idToken = await getIdToken(user);

      // 백엔드에 토큰을 보내 사용자 정보를 동기화합니다.
      try {
        // TODO: API 서비스 연결 후 활성화
        // await api.auth.verifyFirebaseToken(idToken);
        console.log('✅ 백엔드와 사용자 정보 동기화 예정');
      } catch (apiError) {
        console.warn('⚠️ 백엔드 동기화 실패 (계속 진행):', apiError);
      }

      // 로컬 스토리지에 사용자 데이터 저장 (보안 개선된 형태)
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      };

      localStorage.setItem('memobee_firebase_user', JSON.stringify(userData));
      localStorage.setItem('memobee_last_login', new Date().toISOString());

      console.log('✅ 사용자 인증 처리 완료');
    } catch (error) {
      console.error('❌ 사용자 인증 처리 중 오류:', error);
    }
  }

  // 구글 로그인 - Electron 환경용 (개선된 실제 인증)
  async signInWithGoogle(): Promise<User | null> {
    try {
      console.log('🔍 Desktop Google 로그인 시도 중...');

      // Google Provider 초기화
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');

      // 커스텀 파라미터 설정 (더 안정적인 로그인을 위해)
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      // 1. 먼저 redirect 결과 확인
      try {
        console.log('🔍 이전 redirect 결과 확인...');
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          console.log('✅ Redirect 결과에서 사용자 발견:', result.user.uid);
          return result.user;
        }
      } catch (redirectError) {
        console.log('ℹ️ Redirect 결과 없음 (정상)');
      }

      // 2. Electron에서는 Popup 대신 바로 Redirect 사용 (중복 창 방지)
      console.log('🔄 Electron 환경: Redirect 방식 사용 (Popup 방식 건너뜀)...');
      
      // 현재 상태 저장
      localStorage.setItem('memobee_auth_attempt', 'google_signin');
      
      // Redirect 시작 (외부 브라우저에서 열림)
      await signInWithRedirect(auth, provider);
      
      // redirect는 페이지를 새로고침하므로 여기는 실행되지 않음

      return null;

    } catch (error: any) {
      console.error('❌ Desktop Google 로그인 실패:', error);
      this.handleGoogleSignInError(error);
      throw error; // 에러를 다시 throw해서 UI에서 처리할 수 있도록
    }
  }

  // Google OAuth URL 생성
  private buildGoogleOAuthUrl(): string {
    const clientId = '163739628640-ap4kr1hhh4tm1gfiijdcivdpecs79pm3.apps.googleusercontent.com';
    const redirectUri = 'http://localhost:3000/auth/callback'; // 또는 custom protocol
    const scope = 'openid profile email';
    const state = Math.random().toString(36).substring(7);

    localStorage.setItem('oauth_state', state);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scope,
      response_type: 'code',
      state: state,
      access_type: 'offline',
      include_granted_scopes: 'true'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  // OAuth Callback 처리
  private async handleOAuthCallback(callbackUrl: string): Promise<User | null> {
    try {
      console.log('🔄 OAuth Callback 처리 중...');

      const url = new URL(callbackUrl);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      if (error) {
        throw new Error(`OAuth Error: ${error}`);
      }

      if (!code) {
        throw new Error('Authorization code를 받지 못했습니다');
      }

      const savedState = localStorage.getItem('oauth_state');
      if (state !== savedState) {
        throw new Error('State 검증 실패');
      }

      // Authorization code를 Firebase ID token으로 교환
      // 실제로는 백엔드에서 처리해야 하지만, 여기서는 직접 처리
      console.log('✅ Authorization code 받음, Firebase 인증 시도...');

      // 여기서는 간단히 테스트 계정으로 로그인
      return await this.signInWithGoogleFallback();

    } catch (error) {
      console.error('❌ OAuth Callback 처리 실패:', error);
      throw error;
    }
  }

  // Google 로그인 Fallback (제거됨 - App.tsx에서 직접 처리)
  private async signInWithGoogleFallback(): Promise<User | null> {
    console.log('⚠️ Google OAuth 실패 - 앱에서 직접 테스트 로그인을 처리하세요');
    return null;
  }

  private handleGoogleSignInError(error: any) {
    console.error('Google SignIn Error Details:', {
      code: error.code,
      message: error.message,
    });

    switch (error.code) {
      case 'auth/cancelled':
      case 'auth/popup-closed-by-user':
        console.log('사용자가 Google 로그인을 취소했습니다.');
        break;
      case 'auth/popup-blocked':
        console.error('팝업이 차단되었습니다. 브라우저 설정을 확인해주세요.');
        break;
      case 'auth/network-request-failed':
        console.error('네트워크 연결을 확인해주세요.');
        break;
      default:
        console.error('알 수 없는 Google 로그인 오류가 발생했습니다.');
    }
  }

  // Apple 로그인 - 데스크톱용 (준비중)
  async signInWithApple(): Promise<User | null> {
    try {
      console.log('🍎 Apple 로그인 시도 중...');
      console.log('⚠️ Apple 로그인은 개발 중입니다. Google 로그인을 사용해주세요.');
      return null;
    } catch (error: any) {
      this.handleAuthError('Apple 로그인', error);
      return null;
    }
  }

  // 회원가입
  async signUp(
    email: string,
    password: string,
  ): Promise<User | null> {
    try {
      console.log('🚶‍♂️ 회원가입 시도:', email);
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      // 회원가입 성공 시 로컬 데이터 저장
      try {
        const idToken = await getIdToken(userCredential.user);
        const userData = {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: userCredential.user.displayName,
        };
        localStorage.setItem('memobee_firebase_user', JSON.stringify(userData));
        localStorage.setItem('memobee_last_login', new Date().toISOString());
        console.log('✅ 회원가입 데이터 저장 완료');

        // The onAuthStateChanged listener will handle post-authentication
        console.log('✅ 회원가입 성공');
        return userCredential.user;
      } catch (storageError) {
        console.warn('⚠️ 회원가입 데이터 저장 실패 (회원가입은 성공):', storageError);
        return userCredential.user;
      }
    } catch (error: any) {
      this.handleAuthError('회원가입', error);
      return null;
    }
  }

  // 로그인
  async signIn(
    email: string,
    password: string,
  ): Promise<User | null> {
    try {
      console.log('🔐 로그인 시도:', email);
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );

      // 로그인 성공 시 로컬 데이터 저장
      try {
        const idToken = await getIdToken(userCredential.user);
        const userData = {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: userCredential.user.displayName,
        };
        localStorage.setItem('memobee_firebase_user', JSON.stringify(userData));
        localStorage.setItem('memobee_last_login', new Date().toISOString());
        console.log('✅ 로그인 데이터 저장 완료');

        // The onAuthStateChanged listener will handle post-authentication
        console.log('✅ 로그인 성공');
        return userCredential.user;
      } catch (storageError) {
        console.warn('⚠️ 로그인 데이터 저장 실패 (로그인은 성공):', storageError);
        return userCredential.user;
      }
    } catch (error: any) {
      this.handleAuthError('로그인', error);
      return null;
    }
  }

  // 로그아웃
  async signOut(): Promise<void> {
    try {
      console.log('🔓 로그아웃 시도');

      // Firebase 로그아웃
      await firebaseSignOut(auth);
      console.log('✅ Firebase 로그아웃 성공');

      // 로컬 스토리지 정리
      localStorage.removeItem('memobee_firebase_user');
      localStorage.removeItem('memobee_last_login');

    } catch (error) {
      console.error('❌ 로그아웃 실패:', error);
      // Firebase 로그아웃이 실패해도 강제로 시도
      try {
        await firebaseSignOut(auth);
        console.log('✅ Firebase 강제 로그아웃 성공');
      } catch (firebaseError) {
        console.error('❌ Firebase 강제 로그아웃도 실패:', firebaseError);
      }
    }

    console.log('✅ 로그아웃 완료');
  }

  // 비밀번호 재설정
  async resetPassword(email: string): Promise<void> {
    try {
      console.log('🔑 비밀번호 재설정 요청:', email);
      await sendPasswordResetEmail(auth, email);
      console.log('✅ 비밀번호 재설정 이메일 발송 완료');
    } catch (error: any) {
      console.error('❌ 비밀번호 재설정 실패:', error);
      throw error;
    }
  }

  // 인증 상태 리스너
  onAuthStateChanged(
    callback: (user: User | null) => void,
  ): () => void {
    console.log('👀 인증 상태 리스너 등록');
    return onAuthStateChanged(auth, callback);
  }

  // 현재 사용자 가져오기
  getCurrentUser(): User | null {
    const user = auth.currentUser;
    return user;
  }

  // Firebase ID 토큰 가져오기 (API 호출용)
  async getIdToken(): Promise<string | null> {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        return null;
      }

      // 먼저 캐시된 토큰을 시도 (false)
      try {
        const cachedToken = await getIdToken(currentUser, false);
        if (cachedToken) {
          return cachedToken;
        }
      } catch (cachedError) {
        console.log('🔄 캐시된 토큰 없음, 새 토큰 요청');
      }

      // 캐시된 토큰이 없거나 실패하면 새 토큰 요청 (true)
      try {
        console.log('🔄 새 ID 토큰 요청 중...');
        const freshToken = await getIdToken(currentUser, true);
        console.log('✅ 새 ID 토큰 획득 성공');
        return freshToken;
      } catch (refreshError) {
        console.error('❌ 새 토큰 요청 실패:', refreshError);

        // 로컬 스토리지에서 저장된 사용자 정보를 fallback으로 시도
        try {
          const storedUser = localStorage.getItem('memobee_firebase_user');
          if (storedUser) {
            console.log('💾 저장된 사용자 정보를 fallback으로 확인');
            // 토큰은 제공할 수 없지만 사용자 정보는 유지
          }
        } catch (storageError) {
          console.error('❌ 저장된 사용자 정보 가져오기도 실패:', storageError);
        }

        throw refreshError;
      }
    } catch (error) {
      console.error('❌ ID 토큰 가져오기 완전 실패:', error);
      return null;
    }
  }

  // 에러 처리 헬퍼
  private handleAuthError(operation: string, error: AuthError) {
    console.error(`❌ ${operation} 실패:`, {
      code: error.code,
      message: error.message
    });

    switch (error.code) {
      case 'auth/cancelled':
      case 'auth/popup-closed-by-user':
        console.log(`🚫 사용자가 ${operation}을 취소했습니다.`);
        break;
      case 'auth/popup-blocked':
        console.error('팝업이 차단되었습니다. 브라우저 설정을 확인해주세요.');
        break;
      case 'auth/user-not-found':
        console.error('존재하지 않는 사용자입니다.');
        break;
      case 'auth/wrong-password':
        console.error('잘못된 비밀번호입니다.');
        break;
      case 'auth/email-already-in-use':
        console.error('이미 사용 중인 이메일 주소입니다.');
        break;
      case 'auth/weak-password':
        console.error('비밀번호가 너무 약합니다.');
        break;
      case 'auth/invalid-email':
        console.error('유효하지 않은 이메일 주소입니다.');
        break;
      case 'auth/network-request-failed':
        console.error('네트워크 연결을 확인해주세요.');
        break;
      default:
        console.error(`알 수 없는 ${operation} 오류:`, error.code);
    }
  }

  // 초기화 상태 확인
  get initialized(): boolean {
    return this.isInitialized;
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
export const authService = new DesktopAuthService();
export default authService;