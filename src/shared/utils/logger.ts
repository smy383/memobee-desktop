/**
 * 통합 로그 시스템
 * 개발/프로덕션 환경에 따라 로그 레벨 자동 조정
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

class Logger {
  private static instance: Logger;
  private currentLevel: LogLevel;
  private isDevelopment: boolean;

  private constructor() {
    // 개발 환경 감지
    this.isDevelopment = process.env.NODE_ENV === 'development' || 
                        process.env.NODE_ENV === undefined ||
                        window?.location?.hostname === 'localhost';
    
    // 환경에 따른 로그 레벨 설정
    this.currentLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.ERROR;
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.currentLevel;
  }

  private formatMessage(level: string, category: string, message: string, ...args: any[]): void {
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

  public debug(category: string, message: string, ...args: any[]): void {
    this.formatMessage('DEBUG', category, message, ...args);
  }

  public info(category: string, message: string, ...args: any[]): void {
    this.formatMessage('INFO', category, message, ...args);
  }

  public warn(category: string, message: string, ...args: any[]): void {
    this.formatMessage('WARN', category, message, ...args);
  }

  public error(category: string, message: string, ...args: any[]): void {
    this.formatMessage('ERROR', category, message, ...args);
  }

  // 특정 카테고리별 로거 팩토리
  public createCategoryLogger(category: string) {
    return {
      debug: (message: string, ...args: any[]) => this.debug(category, message, ...args),
      info: (message: string, ...args: any[]) => this.info(category, message, ...args),
      warn: (message: string, ...args: any[]) => this.warn(category, message, ...args),
      error: (message: string, ...args: any[]) => this.error(category, message, ...args),
    };
  }

  // 개발 환경 여부 확인
  public isDev(): boolean {
    return this.isDevelopment;
  }

  // 로그 레벨 동적 변경 (필요시)
  public setLogLevel(level: LogLevel): void {
    this.currentLevel = level;
  }
}

// 싱글톤 인스턴스 생성
const logger = Logger.getInstance();

// 편의를 위한 기본 export
export default logger;

// 카테고리별 로거 팩토리 함수들
export const createLogger = (category: string) => logger.createCategoryLogger(category);

// 자주 사용되는 카테고리별 로거들
export const authLogger = createLogger('AUTH');
export const apiLogger = createLogger('API');
export const uiLogger = createLogger('UI');
export const updaterLogger = createLogger('UPDATER');
export const appLogger = createLogger('APP');
export const serverLogger = createLogger('SERVER');
export const editorLogger = createLogger('EDITOR');
export const securityLogger = createLogger('SECURITY');