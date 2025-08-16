// Global type definitions for Electron app

declare global {
  interface Window {
    memobeeDesktop?: {
      isDevelopment: boolean;
      platform: string;
      version: string;
    };
    updateProgressHandler?: (progress: {percent: number; transferred: number; total: number}) => void;
    electronAPI?: {
      openOAuthWindow: (url: string) => Promise<{ success: boolean; error?: string; url?: string }>;
      openExternalUrl: (url: string) => Promise<{ success: boolean; error?: string }>;
      showInputDialog: (title: string, message: string) => Promise<string | null>;
      onNewMemo: (callback: () => void) => void;
      onSaveMemo: (callback: () => void) => void;
      onSearch: (callback: () => void) => void;
      onToggleSidebar: (callback: () => void) => void;
      onMenuNavigate: (callback: (event: any, screen: string) => void) => void;
      removeAllListeners: (channel: string) => void;
      on: (channel: string, callback: (event: any, ...args: any[]) => void) => void;
      removeListener: (channel: string, callback: (event: any, ...args: any[]) => void) => void;
      getAppVersion: () => Promise<string>;
      getPlatform: () => string;
      isDev: () => boolean;
      // 수동 업데이트 관련 API
      checkForUpdates: () => Promise<{
        available: boolean;
        version?: string;
        releaseDate?: string;
        releaseNotes?: string;
        downloadUrl?: string;
        message?: string;
        error?: string;
      }>;
      downloadUpdate: () => Promise<{ success: boolean; message?: string; error?: string }>;
      installUpdate: () => Promise<{ success: boolean; message?: string; error?: string }>;
    };
  }
}

// Hot module replacement types
declare const module: {
  hot?: {
    accept(): void;
  };
};

export {};