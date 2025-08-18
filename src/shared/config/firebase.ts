// Firebase Configuration for Desktop App
import { authLogger } from '../utils/logger';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

// Firebase 설정 (모바일과 동일한 프로젝트 사용)
const firebaseConfig = {
  apiKey: 'AIzaSyDQEvvTFqwl8c3ekFLzMFgGvQGh0NkTtqE',
  authDomain: 'memobee-prod.firebaseapp.com',
  projectId: 'memobee-prod',
  storageBucket: 'memobee-prod.appspot.com',
  messagingSenderId: '163739628640',
  appId: '1:163739628640:web:f8d5c9f8d5c9f8d5'
};

// Firebase 앱 초기화 (중복 방지)
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  authLogger.debug('🔥 Firebase 앱 초기화 완료');
} else {
  app = getApps()[0];
  authLogger.debug('🔥 기존 Firebase 앱 사용');
}

// Auth 인스턴스 생성
export const auth = getAuth(app);

// 개발 모드에서 Auth 에뮬레이터 연결 (선택사항)
// 환경 변수 대신 직접 체크
const isDevelopment = typeof window !== 'undefined' && 
  (window.location?.hostname === 'localhost' || 
   (window.memobeeDesktop && window.memobeeDesktop.isDevelopment));

if (isDevelopment) {
  authLogger.debug('🔧 개발 모드 감지됨');
  // Auth 에뮬레이터는 필요시에만 활성화
  // connectAuthEmulator(auth, 'http://localhost:9099');
} else {
  authLogger.debug('🚀 프로덕션 모드');
}

export { app };
export default app;