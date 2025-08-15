const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // OAuth 인증을 위한 새 윈도우
  openOAuthWindow: (url) => {
    return ipcRenderer.invoke('oauth-window', url);
  },
  
  // 입력 다이얼로그
  showInputDialog: (options) => {
    return ipcRenderer.invoke('show-input-dialog', options);
  },
  
  // 외부 URL 열기
  openExternalUrl: (url) => {
    return ipcRenderer.invoke('open-external-url', url);
  },
  
  // Menu actions
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

  // Navigation
  onMenuNavigate: (callback) => {
    ipcRenderer.on('menu-navigate', (event, page) => callback(page));
  },

  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },

  // App info
  getAppVersion: () => {
    return process.env.npm_package_version || '1.0.0';
  },

  // Platform info
  getPlatform: () => {
    return process.platform;
  },

  // Environment
  isDev: () => {
    return process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
  }
});

// Expose a limited API for security
contextBridge.exposeInMainWorld('memobeeDesktop', {
  platform: process.platform,
  isDevelopment: process.env.NODE_ENV === 'development' || process.argv.includes('--dev'),
  version: process.env.npm_package_version || '1.0.0'
});

// Log that preload script has loaded
console.log('MemoBee Desktop preload script loaded');