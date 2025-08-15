const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const http = require('http');
const fs = require('fs');
const url = require('url');
// 더 정확한 개발 모드 감지 - 패키징되지 않은 경우만 개발 모드
const isDev = !app.isPackaged || 
              process.env.NODE_ENV === 'development' || 
              process.argv.includes('--dev');

// Keep a global reference of the server
let server;

// Keep a global reference of the window object
let mainWindow;

// Auto-updater configuration
let updateAvailable = false;

// Configure auto-updater
function configureAutoUpdater() {
  // 개발 모드에서는 업데이트 확인 하지 않음
  if (isDev) {
    console.log('🔄 개발 모드: 자동 업데이트 비활성화');
    return;
  }

  console.log('🔄 자동 업데이트 초기화 중...');
  
  // GitHub에서 업데이트 확인
  autoUpdater.checkForUpdatesAndNotify();

  // 업데이트 이벤트 리스너들
  autoUpdater.on('checking-for-update', () => {
    console.log('🔍 업데이트 확인 중...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('✨ 새 업데이트 발견:', info.version);
    updateAvailable = true;
    
    // 사용자에게 업데이트 알림
    showUpdateDialog(info);
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('✅ 최신 버전 사용 중:', info.version);
    updateAvailable = false;
  });

  autoUpdater.on('error', (err) => {
    console.error('❌ 업데이트 오류:', err);
    updateAvailable = false;
  });

  autoUpdater.on('download-progress', (progressObj) => {
    let logMessage = `⬇️ 다운로드 진행률: ${progressObj.percent.toFixed(2)}%`;
    logMessage += ` (${progressObj.transferred}/${progressObj.total})`;
    console.log(logMessage);
    
    // 렌더러 프로세스에 진행률 전송
    if (mainWindow) {
      mainWindow.webContents.send('update-download-progress', {
        percent: progressObj.percent,
        transferred: progressObj.transferred,
        total: progressObj.total
      });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('✅ 업데이트 다운로드 완료:', info.version);
    
    // 사용자에게 재시작 확인
    showUpdateReadyDialog(info);
  });

  // 1시간마다 업데이트 확인
  setInterval(() => {
    if (!isDev && !updateAvailable) {
      console.log('🔄 주기적 업데이트 확인...');
      autoUpdater.checkForUpdatesAndNotify();
    }
  }, 60 * 60 * 1000); // 1시간
}

// 업데이트 발견 다이얼로그
function showUpdateDialog(info) {
  if (!mainWindow) return;

  const options = {
    type: 'info',
    title: '업데이트 사용 가능',
    message: `MemoBee ${info.version} 업데이트가 있습니다.`,
    detail: `현재 버전: ${app.getVersion()}\n새 버전: ${info.version}\n\n업데이트를 다운로드하시겠습니까?`,
    buttons: ['나중에', '지금 다운로드'],
    defaultId: 1,
    cancelId: 0
  };

  dialog.showMessageBox(mainWindow, options).then((result) => {
    if (result.response === 1) {
      // 사용자가 다운로드 선택
      console.log('📥 사용자가 업데이트 다운로드 선택');
      autoUpdater.downloadUpdate();
      
      // 다운로드 시작 알림
      if (mainWindow) {
        mainWindow.webContents.send('update-download-started');
      }
    }
  });
}

// 업데이트 준비 완료 다이얼로그
function showUpdateReadyDialog(info) {
  if (!mainWindow) return;

  const options = {
    type: 'info',
    title: '업데이트 준비 완료',
    message: `MemoBee ${info.version} 업데이트가 준비되었습니다.`,
    detail: '지금 재시작하여 업데이트를 적용하시겠습니까?\n\n작업 중인 내용을 저장하는 것을 잊지 마세요.',
    buttons: ['나중에 재시작', '지금 재시작'],
    defaultId: 1,
    cancelId: 0
  };

  dialog.showMessageBox(mainWindow, options).then((result) => {
    if (result.response === 1) {
      // 사용자가 재시작 선택
      console.log('🔄 사용자가 즉시 재시작 선택');
      autoUpdater.quitAndInstall();
    } else {
      // 나중에 재시작 선택 - 앱 종료 시 자동 업데이트
      console.log('⏰ 사용자가 나중에 재시작 선택');
    }
  });
}

// Create simple HTTP server for production mode
function createServer() {
  return new Promise((resolve, reject) => {
    const distPath = path.join(__dirname, '../../dist/renderer');
    const indexPath = path.join(distPath, 'index.html');
    
    // Simple HTTP server
    const server = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url);
      let filePath = path.join(distPath, parsedUrl.pathname);
      
      // Default to index.html
      if (parsedUrl.pathname === '/') {
        filePath = indexPath;
      }
      
      // Check if file exists
      fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
          // File not found, serve index.html (SPA routing)
          filePath = indexPath;
        }
        
        // Read and serve file
        fs.readFile(filePath, (err, data) => {
          if (err) {
            res.writeHead(500);
            res.end('Server Error');
            return;
          }
          
          // Set content type
          const ext = path.extname(filePath);
          let contentType = 'text/html';
          if (ext === '.js') contentType = 'application/javascript';
          if (ext === '.css') contentType = 'text/css';
          if (ext === '.json') contentType = 'application/json';
          
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(data);
        });
      });
    });
    
    // Find available port starting from 3000
    let port = 3000;
    const tryPort = (port) => {
      server.listen(port, 'localhost', () => {
        console.log(`✅ HTTP 서버 시작됨: http://localhost:${port}`);
        resolve(`http://localhost:${port}`);
      }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`포트 ${port} 사용 중, 다음 포트 시도...`);
          tryPort(port + 1);
        } else {
          reject(err);
        }
      });
    };
    
    tryPort(port);
  });
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    titleBarStyle: 'default', // 기본 제목 표시줄
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../../build/icon.png'),
    show: false // 준비될 때까지 숨김
  });

  // Load the app
  if (isDev && !process.argv.includes('--local')) {
    // 개발 모드: webpack-dev-server 사용
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // 프로덕션 모드: 내장 HTTP 서버 사용
    createServer().then((serverUrl) => {
      console.log('🚀 서버 URL로 앱 로딩:', serverUrl);
      mainWindow.loadURL(serverUrl);
      
      if (isDev) {
        mainWindow.webContents.openDevTools();
      }
    }).catch((error) => {
      console.error('❌ 서버 시작 실패:', error);
      
      // 서버 시작 실패 시 fallback으로 file:// 사용
      const indexPath = path.join(__dirname, '../../dist/renderer/index.html');
      console.log('📁 Fallback: 파일 경로로 로딩:', indexPath);
      mainWindow.loadFile(indexPath);
    });
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Focus on window
    if (isDev) {
      mainWindow.focus();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// 외부 브라우저에서 URL 열기 핸들러  
ipcMain.handle('open-external-url', async (event, url) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    console.error('외부 URL 열기 실패:', error);
    return { success: false, error: error.message };
  }
});

// 입력 다이얼로그 핸들러
ipcMain.handle('show-input-dialog', async (event, { title, message }) => {
  try {
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      title: title,
      message: message,
      buttons: ['취소', '확인'],
      defaultId: 1,
      cancelId: 0,
      detail: '인증 코드를 입력하려면 확인을 클릭하세요.'
    });

    if (result.response === 1) {
      // 확인 클릭 시 - 간단한 텍스트 입력을 위해 prompt 사용
      // 실제로는 더 복잡한 dialog가 필요하지만 일단 이 방식으로 처리
      return 'INPUT_REQUESTED'; // 특별한 값을 반환하여 fallback prompt 사용
    } else {
      return null; // 취소
    }
  } catch (error) {
    console.error('입력 다이얼로그 실패:', error);
    return null;
  }
});

// OAuth 윈도우 핸들러 (사용하지 않지만 호환성을 위해 유지)
ipcMain.handle('oauth-window', async (event, url) => {
  return new Promise((resolve, reject) => {
    const oauthWindow = new BrowserWindow({
      width: 500,
      height: 600,
      show: true,
      modal: true,
      parent: mainWindow,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
      },
    });

    oauthWindow.loadURL(url);

    // URL 변경 감지
    oauthWindow.webContents.on('will-redirect', (event, redirectUrl) => {
      // Firebase redirect URL 패턴 확인
      if (redirectUrl.includes('__/auth/handler') || redirectUrl.includes('localhost')) {
        // 인증 완료 - 윈도우 닫고 결과 반환
        oauthWindow.close();
        resolve({ success: true, url: redirectUrl });
      }
    });

    // 윈도우가 닫혔을 때
    oauthWindow.on('closed', () => {
      resolve({ success: false, error: 'User cancelled' });
    });

    // 로드 에러 처리
    oauthWindow.webContents.on('did-fail-load', () => {
      oauthWindow.close();
      reject(new Error('Failed to load OAuth page'));
    });
  });
});

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();
  createMenu();
  
  // 자동 업데이트 초기화
  configureAutoUpdater();

  app.on('activate', () => {
    // On macOS it's common to re-create a window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // Close server if running
  if (server) {
    console.log('🔄 HTTP 서버 종료 중...');
    server.close(() => {
      console.log('✅ HTTP 서버 종료됨');
    });
  }
  
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 수동 업데이트 IPC 핸들러들
ipcMain.handle('manual-check-for-updates', async () => {
  try {
    console.log('🔍 수동 업데이트 확인 요청');
    console.log('🔧 isDev:', isDev);
    console.log('🔧 app.isPackaged:', app.isPackaged);
    console.log('🔧 NODE_ENV:', process.env.NODE_ENV);
    console.log('🔧 argv:', process.argv);
    console.log('🔧 현재 앱 버전:', app.getVersion());
    
    
    // 개발 모드에서는 시뮬레이션
    if (isDev) {
      console.log('ℹ️ 개발 모드: 업데이트 시뮬레이션');
      
      // v1.0.2가 배포되어 있으므로 업데이트 available로 시뮬레이션
      return {
        available: true,
        version: '1.0.2',
        releaseDate: '2025-08-15',
        releaseNotes: '- 헤더에 v1.0.2 버전 표시 추가\n- 설정 화면 버전 정보 업데이트\n- 자동 업데이트 기능 테스트용',
        downloadUrl: 'https://github.com/smy383/memobee-desktop/releases/tag/v1.0.2'
      };
    }
    
    console.log('🚀 프로덕션 모드: 실제 업데이트 확인 시작');
    
    // 프로덕션 모드에서는 실제 업데이트 확인
    return new Promise((resolve) => {
      autoUpdater.checkForUpdates();
      
      // 타임아웃 설정 (10초)
      const timeout = setTimeout(() => {
        resolve({ available: false, message: '업데이트 확인 타임아웃' });
      }, 10000);
      
      // 업데이트 사용 가능 이벤트
      autoUpdater.once('update-available', (info) => {
        clearTimeout(timeout);
        resolve({
          available: true,
          version: info.version,
          releaseDate: info.releaseDate,
          releaseNotes: info.releaseNotes,
          downloadUrl: `https://github.com/smy383/memobee-desktop/releases/tag/v${info.version}`
        });
      });
      
      // 업데이트 없음 이벤트
      autoUpdater.once('update-not-available', () => {
        clearTimeout(timeout);
        resolve({ available: false, message: '최신 버전을 사용 중입니다' });
      });
      
      // 에러 이벤트
      autoUpdater.once('error', (error) => {
        clearTimeout(timeout);
        resolve({ available: false, error: error.message });
      });
    });
  } catch (error) {
    console.error('❌ 수동 업데이트 확인 실패:', error);
    return { available: false, error: error.message };
  }
});

ipcMain.handle('manual-download-update', async () => {
  try {
    console.log('📥 수동 업데이트 다운로드 요청');
    
    if (isDev) {
      console.log('ℹ️ 개발 모드: 다운로드 시뮬레이션');
      return { success: true, message: '개발 모드에서는 실제 다운로드되지 않습니다' };
    }
    
    autoUpdater.downloadUpdate();
    return { success: true, message: '다운로드가 시작되었습니다' };
  } catch (error) {
    console.error('❌ 수동 업데이트 다운로드 실패:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('manual-install-update', async () => {
  try {
    console.log('🔄 수동 업데이트 설치 요청');
    
    if (isDev) {
      console.log('ℹ️ 개발 모드: 설치 시뮬레이션');
      return { success: true, message: '개발 모드에서는 실제 재시작되지 않습니다' };
    }
    
    autoUpdater.quitAndInstall();
    return { success: true, message: '앱이 재시작됩니다' };
  } catch (error) {
    console.error('❌ 수동 업데이트 설치 실패:', error);
    return { success: false, error: error.message };
  }
});

// Handle app quit
app.on('before-quit', () => {
  if (server) {
    server.close();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'MemoBee',
      submenu: [
        { role: 'about', label: 'MemoBee 정보' },
        { type: 'separator' },
        { 
          label: '환경설정...', 
          accelerator: 'Cmd+,',
          click: () => {
            // TODO: 환경설정 창 열기
            console.log('환경설정 열기');
          }
        },
        { type: 'separator' },
        { role: 'services', label: '서비스', submenu: [] },
        { type: 'separator' },
        { role: 'hide', label: 'MemoBee 가리기' },
        { role: 'hideothers', label: '다른 앱 가리기' },
        { role: 'unhide', label: '모두 보기' },
        { type: 'separator' },
        { role: 'quit', label: 'MemoBee 종료' }
      ]
    },
    {
      label: '파일',
      submenu: [
        {
          label: '새 메모',
          accelerator: 'Cmd+N',
          click: () => {
            // TODO: 새 메모 생성
            mainWindow.webContents.send('menu-new-memo');
          }
        },
        { type: 'separator' },
        {
          label: '저장',
          accelerator: 'Cmd+S',
          click: () => {
            mainWindow.webContents.send('menu-save-memo');
          }
        }
      ]
    },
    {
      label: '편집',
      submenu: [
        { role: 'undo', label: '실행 취소' },
        { role: 'redo', label: '다시 실행' },
        { type: 'separator' },
        { role: 'cut', label: '잘라내기' },
        { role: 'copy', label: '복사' },
        { role: 'paste', label: '붙여넣기' },
        { role: 'selectall', label: '전체 선택' },
        { type: 'separator' },
        {
          label: '검색',
          accelerator: 'Cmd+F',
          click: () => {
            mainWindow.webContents.send('menu-search');
          }
        }
      ]
    },
    {
      label: '보기',
      submenu: [
        {
          label: '최근 메모',
          accelerator: 'Cmd+1',
          click: () => {
            mainWindow.webContents.send('menu-navigate', 'memos');
          }
        },
        {
          label: '일정',
          accelerator: 'Cmd+2',
          click: () => {
            mainWindow.webContents.send('menu-navigate', 'schedules');
          }
        },
        {
          label: '할일',
          accelerator: 'Cmd+3',
          click: () => {
            mainWindow.webContents.send('menu-navigate', 'tasks');
          }
        },
        {
          label: 'Pick',
          accelerator: 'Cmd+4',
          click: () => {
            mainWindow.webContents.send('menu-navigate', 'picks');
          }
        },
        {
          label: 'AI 내역',
          accelerator: 'Cmd+5',
          click: () => {
            mainWindow.webContents.send('menu-navigate', 'ai-history');
          }
        },
        { type: 'separator' },
        {
          label: '사이드바 토글',
          accelerator: 'Cmd+Shift+S',
          click: () => {
            mainWindow.webContents.send('menu-toggle-sidebar');
          }
        },
        { type: 'separator' },
        { role: 'reload', label: '새로고침' },
        { role: 'forcereload', label: '강제 새로고침' },
        { role: 'toggledevtools', label: '개발자 도구' },
        { type: 'separator' },
        { role: 'resetzoom', label: '실제 크기' },
        { role: 'zoomin', label: '확대' },
        { role: 'zoomout', label: '축소' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '전체 화면' }
      ]
    },
    {
      label: '윈도우',
      submenu: [
        { role: 'minimize', label: '최소화' },
        { role: 'close', label: '닫기' },
        { type: 'separator' },
        { role: 'front', label: '모든 창을 앞으로' }
      ]
    },
    {
      label: '도움말',
      submenu: [
        {
          label: '업데이트 확인',
          click: () => {
            if (isDev) {
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: '개발 모드',
                message: '개발 모드에서는 업데이트 확인이 비활성화됩니다.',
                buttons: ['확인']
              });
            } else {
              console.log('🔍 수동 업데이트 확인 시작');
              autoUpdater.checkForUpdatesAndNotify();
            }
          }
        },
        { type: 'separator' },
        {
          label: 'MemoBee 웹사이트',
          click: () => {
            shell.openExternal('https://memobee.com');
          }
        },
        {
          label: '지원',
          click: () => {
            shell.openExternal('https://memobee.com/support');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Export for testing
module.exports = { createWindow };