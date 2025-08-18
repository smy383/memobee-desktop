/**
 * 통합 로그 시스템 (JavaScript 버전)
 * 개발/프로덕션 환경에 따라 로그 레벨 자동 조정
 */

const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

class Logger {
  constructor() {
    // 개발 환경 감지 (안전한 방식)
    try {
      const electron = require('electron');
      const isPackaged = electron.app ? !electron.app.isPackaged : false;
      
      this.isDevelopment = process.env.NODE_ENV === 'development' || 
                          process.env.NODE_ENV === undefined ||
                          process.argv.includes('--dev') ||
                          isPackaged;
    } catch (error) {
      // preload 컨텍스트에서는 electron.app 접근 불가능할 수 있음
      this.isDevelopment = process.env.NODE_ENV === 'development' || 
                          process.env.NODE_ENV === undefined ||
                          process.argv.includes('--dev');
    }
    
    // 환경에 따른 로그 레벨 설정
    this.currentLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.ERROR;
  }

  shouldLog(level) {
    return level >= this.currentLevel;
  }

  formatMessage(level, category, message, ...args) {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[${timestamp}] ${level} [${category}]`;
    
    switch (level) {
      case 'DEBUG':
        if (this.shouldLog(LogLevel.DEBUG)) console.log(`🐛 ${prefix}`, message, ...args);
        break;
      case 'INFO':
        if (this.shouldLog(LogLevel.INFO)) console.info(`ℹ️ ${prefix}`, message, ...args);
        break;
      case 'WARN':
        if (this.shouldLog(LogLevel.WARN)) console.warn(`⚠️ ${prefix}`, message, ...args);
        break;
      case 'ERROR':
        if (this.shouldLog(LogLevel.ERROR)) console.error(`❌ ${prefix}`, message, ...args);
        break;
    }
  }

  debug(category, message, ...args) {
    this.formatMessage('DEBUG', category, message, ...args);
  }

  info(category, message, ...args) {
    this.formatMessage('INFO', category, message, ...args);
  }

  warn(category, message, ...args) {
    this.formatMessage('WARN', category, message, ...args);
  }

  error(category, message, ...args) {
    this.formatMessage('ERROR', category, message, ...args);
  }

  // 특정 카테고리별 로거 팩토리
  createCategoryLogger(category) {
    return {
      debug: (message, ...args) => this.debug(category, message, ...args),
      info: (message, ...args) => this.info(category, message, ...args),
      warn: (message, ...args) => this.warn(category, message, ...args),
      error: (message, ...args) => this.error(category, message, ...args),
    };
  }

  // 개발 환경 여부 확인
  isDev() {
    return this.isDevelopment;
  }

  // 로그 레벨 동적 변경
  setLogLevel(level) {
    this.currentLevel = level;
  }
}

// 싱글톤 인스턴스 생성
const logger = new Logger();

// 카테고리별 로거 팩토리 함수
const createLogger = (category) => logger.createCategoryLogger(category);

// 자주 사용되는 카테고리별 로거들
const authLogger = createLogger('AUTH');
const apiLogger = createLogger('API');
const uiLogger = createLogger('UI');
const updaterLogger = createLogger('UPDATER');
const appLogger = createLogger('APP');
const serverLogger = createLogger('SERVER');

module.exports = {
  logger,
  createLogger,
  authLogger,
  apiLogger,
  uiLogger,
  updaterLogger,
  appLogger,
  serverLogger,
  LogLevel
};