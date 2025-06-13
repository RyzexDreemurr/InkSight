/**
 * Centralized logging system for InkSight
 * Replaces console.log statements throughout the application
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  error?: Error;
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = __DEV__ ? LogLevel.DEBUG : LogLevel.INFO;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private addLog(level: LogLevel, category: string, message: string, data?: any, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      category,
      message,
      data,
      error,
    };

    this.logs.push(logEntry);

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // In development, also log to console
    if (__DEV__) {
      const timestamp = logEntry.timestamp.toISOString();
      const prefix = `[${timestamp}] [${category}]`;
      
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(prefix, message, data || '');
          break;
        case LogLevel.INFO:
          console.info(prefix, message, data || '');
          break;
        case LogLevel.WARN:
          console.warn(prefix, message, data || '');
          break;
        case LogLevel.ERROR:
          console.error(prefix, message, data || '', error || '');
          break;
      }
    }
  }

  debug(category: string, message: string, data?: any): void {
    this.addLog(LogLevel.DEBUG, category, message, data);
  }

  info(category: string, message: string, data?: any): void {
    this.addLog(LogLevel.INFO, category, message, data);
  }

  warn(category: string, message: string, data?: any): void {
    this.addLog(LogLevel.WARN, category, message, data);
  }

  error(category: string, message: string, error?: Error, data?: any): void {
    this.addLog(LogLevel.ERROR, category, message, data, error);
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logs.filter(log => log.level >= level);
    }
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportLogs(): string {
    return this.logs.map(log => {
      const timestamp = log.timestamp.toISOString();
      const levelName = LogLevel[log.level];
      let line = `[${timestamp}] [${levelName}] [${log.category}] ${log.message}`;
      
      if (log.data) {
        line += ` | Data: ${JSON.stringify(log.data)}`;
      }
      
      if (log.error) {
        line += ` | Error: ${log.error.message}`;
        if (log.error.stack) {
          line += `\nStack: ${log.error.stack}`;
        }
      }
      
      return line;
    }).join('\n');
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Convenience functions for common categories
export const dbLogger = {
  debug: (message: string, data?: any) => logger.debug('Database', message, data),
  info: (message: string, data?: any) => logger.info('Database', message, data),
  warn: (message: string, data?: any) => logger.warn('Database', message, data),
  error: (message: string, error?: Error, data?: any) => logger.error('Database', message, error, data),
};

export const readerLogger = {
  debug: (message: string, data?: any) => logger.debug('Reader', message, data),
  info: (message: string, data?: any) => logger.info('Reader', message, data),
  warn: (message: string, data?: any) => logger.warn('Reader', message, data),
  error: (message: string, error?: Error, data?: any) => logger.error('Reader', message, error, data),
};

export const fileLogger = {
  debug: (message: string, data?: any) => logger.debug('FileManager', message, data),
  info: (message: string, data?: any) => logger.info('FileManager', message, data),
  warn: (message: string, data?: any) => logger.warn('FileManager', message, data),
  error: (message: string, error?: Error, data?: any) => logger.error('FileManager', message, error, data),
};

export const uiLogger = {
  debug: (message: string, data?: any) => logger.debug('UI', message, data),
  info: (message: string, data?: any) => logger.info('UI', message, data),
  warn: (message: string, data?: any) => logger.warn('UI', message, data),
  error: (message: string, error?: Error, data?: any) => logger.error('UI', message, error, data),
};
