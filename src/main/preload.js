/**
 * Electron Preload Script
 * 보안 강화를 위한 Preload 스크립트
 */

const { contextBridge, ipcRenderer } = require('electron');

// Renderer 프로세스에 안전하게 API 노출
contextBridge.exposeInMainWorld('electronAPI', {
  // OAuth 윈도우 열기 (외부 브라우저에서)
  openOAuthWindow: async (url) => {
    try {
      const result = await ipcRenderer.invoke('open-external-url', url);
      return result;
    } catch (error) {
      console.error('OAuth Window Error:', error);
      return { success: false, error: error.message };
    }
  },

  // 외부 URL 열기 (외부 브라우저에서)
  openExternalUrl: async (url) => {
    try {
      const result = await ipcRenderer.invoke('open-external-url', url);
      return result;
    } catch (error) {
      console.error('External URL Error:', error);
      return { success: false, error: error.message };
    }
  },

  // 입력 다이얼로그 표시
  showInputDialog: async (title, message) => {
    try {
      const result = await ipcRenderer.invoke('show-input-dialog', { title, message });
      return result;
    } catch (error) {
      console.error('Input Dialog Error:', error);
      return null;
    }
  },

  // 메뉴 이벤트 리스너
  onNewMemo: (callback) => {
    ipcRenderer.on('menu-new-memo', callback);
  },

  onSaveMemo: (callback) => {
    ipcRenderer.on('menu-save-memo', callback);
  },

  onSearch: (callback) => {
    ipcRenderer.on('menu-search', callback);
  },

  onToggleSidebar: (callback) => {
    ipcRenderer.on('menu-toggle-sidebar', callback);
  },

  onMenuNavigate: (callback) => {
    ipcRenderer.on('menu-navigate', callback);
  },

  // 이벤트 리스너 제거
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },

  // 업데이트 관련 이벤트 리스너
  on: (channel, callback) => {
    ipcRenderer.on(channel, callback);
  },

  removeListener: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  },

  // 앱 정보 - main process에서 가져오기
  getAppVersion: async () => {
    return await ipcRenderer.invoke('get-app-version');
  },

  getPlatform: () => {
    return process.platform;
  },

  isDev: () => {
    return process.env.NODE_ENV === 'development';
  },

  // 수동 업데이트 관련 API
  checkForUpdates: async () => {
    try {
      const result = await ipcRenderer.invoke('manual-check-for-updates');
      return result;
    } catch (error) {
      console.error('Manual Update Check Error:', error);
      return { available: false, error: error.message };
    }
  },

  downloadUpdate: async () => {
    try {
      const result = await ipcRenderer.invoke('manual-download-update');
      return result;
    } catch (error) {
      console.error('Manual Download Update Error:', error);
      return { success: false, error: error.message };
    }
  },

  installUpdate: async () => {
    try {
      const result = await ipcRenderer.invoke('manual-install-update');
      return result;
    } catch (error) {
      console.error('Manual Install Update Error:', error);
      return { success: false, error: error.message };
    }
  }
});

// 전역 memobeeDesktop 객체 노출 (App.tsx에서 사용)
// 참고: preload에서는 app.isPackaged 접근 불가, 따라서 main process와 다른 판단 기준 사용
const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

// 버전을 담을 객체 생성 (참조로 공유)
const memobeeDesktopAPI = {
  platform: process.platform,
  isDevelopment: isDev,
  version: 'Loading...'
};

// contextBridge로 객체 노출 (먼저 실행)
contextBridge.exposeInMainWorld('memobeeDesktop', memobeeDesktopAPI);

// main process에서 버전 가져오기 (비동기)
ipcRenderer.invoke('get-app-version').then(appVersion => {
  console.log('✅ Main process에서 버전 수신:', appVersion);
  
  // 동일한 객체 참조를 업데이트
  memobeeDesktopAPI.version = appVersion;
  
  // 직접 window.memobeeDesktop 업데이트도 시도
  if (window.memobeeDesktop) {
    window.memobeeDesktop.version = appVersion;
    console.log('🔧 window.memobeeDesktop 직접 업데이트:', window.memobeeDesktop);
  } else {
    console.log('🔧 window.memobeeDesktop이 undefined입니다');
  }
  
  console.log('🔧 memobeeDesktopAPI 업데이트 후:', memobeeDesktopAPI);
  
  // 즉시 이벤트 발송 (React가 준비되기를 기다리지 않음)
  console.log('🚀 버전 업데이트 이벤트 발송:', appVersion);
  
  // 즉시 발송
  if (window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent('version-updated', { detail: { version: appVersion } }));
  }
  
  // DOM 로드 후에도 발송 (안전장치)
  setTimeout(() => {
    if (window.dispatchEvent) {
      console.log('🔄 지연 버전 이벤트 발송:', appVersion);
      window.dispatchEvent(new CustomEvent('version-updated', { detail: { version: appVersion } }));
    }
  }, 100);
}).catch(err => {
  console.error('❌ Main process 버전 가져오기 실패:', err);
  // 실패 시 fallback 버전 사용
  memobeeDesktopAPI.version = '1.0.5';
});

console.log('🔧 Preload - isDevelopment:', isDev);
console.log('🔧 Preload - NODE_ENV:', process.env.NODE_ENV);
console.log('🔧 Preload - argv:', process.argv);

console.log('✅ Preload script loaded successfully');