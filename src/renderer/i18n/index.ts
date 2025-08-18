import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { uiLogger } from '../../shared/utils/logger';

// 번역 파일들 import
import ko from './locales/ko.json';
import en from './locales/en.json';
import ja from './locales/ja.json';
import zh from './locales/zh.json';

const resources = {
  ko: {
    translation: ko
  },
  en: {
    translation: en
  },
  ja: {
    translation: ja
  },
  zh: {
    translation: zh
  }
};

// 지원하는 언어 목록
const supportedLanguages = ['ko', 'en', 'ja', 'zh'];

// 언어 감지 옵션
const detectionOptions = {
  // 감지 순서: localStorage → navigator → fallback
  order: ['localStorage', 'navigator'],
  
  // localStorage 키
  lookupLocalStorage: 'memobee_language',
  
  // 지원하지 않는 언어 감지 시 fallback
  checkWhitelist: true
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en', // 지원하지 않는 언어일 때 기본값
    debug: process.env.NODE_ENV === 'development',
    
    // 언어 감지 설정
    detection: detectionOptions,
    
    // 지원 언어 화이트리스트
    supportedLngs: supportedLanguages,
    
    interpolation: {
      escapeValue: false // React는 XSS 보호가 내장되어 있음
    },
    
    // 번역 키가 없을 때 키 자체를 표시하지 않고 fallback 언어 사용
    returnNull: false,
    returnEmptyString: false,
    
    // namespace 설정 (단일 namespace 사용)
    defaultNS: 'translation',
    ns: ['translation']
  });

// 언어 변경 함수
export const changeLanguage = (language: string) => {
  if (supportedLanguages.includes(language)) {
    i18n.changeLanguage(language);
    localStorage.setItem('memobee_language', language);
  } else {
    uiLogger.warn(`Unsupported language: ${language}. Falling back to English.`);
    i18n.changeLanguage('en');
    localStorage.setItem('memobee_language', 'en');
  }
};

// 현재 언어 가져오기
export const getCurrentLanguage = () => {
  return i18n.language || 'en';
};

// 지원 언어 목록 가져오기
export const getSupportedLanguages = () => {
  return supportedLanguages;
};

// 언어별 레이블 매핑
export const getLanguageLabel = (langCode: string): string => {
  const labels: { [key: string]: string } = {
    ko: '한국어',
    en: 'English',
    ja: '日本語',
    zh: '中文'
  };
  return labels[langCode] || langCode;
};

// 시스템 언어 감지 및 설정
export const detectAndSetSystemLanguage = () => {
  const systemLang = navigator.language.split('-')[0]; // 'ko-KR' -> 'ko'
  
  if (supportedLanguages.includes(systemLang)) {
    uiLogger.debug(`🌐 System language detected: ${systemLang}`);
    return systemLang;
  } else {
    uiLogger.debug(`🌐 System language '${systemLang}' not supported. Using English.`);
    return 'en';
  }
};

export default i18n;