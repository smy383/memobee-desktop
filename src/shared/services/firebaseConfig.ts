/**
 * Firebase Configuration for MemoBee Desktop
 */

import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDQEvvTFqwl8c3ekFLzMFgGvQGh0NkTtqE",
  authDomain: "memobee-prod.firebaseapp.com",
  projectId: "memobee-prod",
  storageBucket: "memobee-prod.firebasestorage.app",
  messagingSenderId: "163739628640",
  appId: "1:163739628640:web:ddf49a2c6d818647e63f05",
  measurementId: "G-8HNKHT79QW"
};

console.log('🔧 Firebase 설정 초기화 중...');
console.log('🔍 환경변수 확인:', {
  nodeEnv: typeof process !== 'undefined' && process.env && process.env.NODE_ENV ? process.env.NODE_ENV : 'development',
  apiKey: typeof process !== 'undefined' && process.env && process.env.REACT_APP_FIREBASE_API_KEY ? '✅ 존재' : '❌ 없음 (하드코딩 사용)',
  authDomain: typeof process !== 'undefined' && process.env && process.env.REACT_APP_FIREBASE_AUTH_DOMAIN ? '✅ 존재' : '❌ 없음 (하드코딩 사용)'
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);

console.log('✅ Firebase 초기화 완료');
console.log('🔗 Firebase Auth Domain:', firebaseConfig.authDomain);
console.log('🏗️ Firebase Project ID:', firebaseConfig.projectId);

export { auth };
export default app;