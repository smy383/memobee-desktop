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

  // 앱 정보
  getAppVersion: () => {
    return '1.0.0'; // TODO: package.json에서 가져오기
  },

  getPlatform: () => {
    return process.platform;
  },

  isDev: () => {
    return process.env.NODE_ENV === 'development';
  }
});

// 전역 memobeeDesktop 객체 노출 (App.tsx에서 사용)
const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
contextBridge.exposeInMainWorld('memobeeDesktop', {
  platform: process.platform,
  isDevelopment: isDev,
  version: '1.0.0'
});

console.log('🔧 Preload - isDevelopment:', isDev);
console.log('🔧 Preload - NODE_ENV:', process.env.NODE_ENV);
console.log('🔧 Preload - argv:', process.argv);

console.log('✅ Preload script loaded successfully');