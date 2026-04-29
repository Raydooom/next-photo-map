export type LogLevel = 'info' | 'success' | 'warning' | 'error';

export interface LoggerOptions {
  timestamp?: boolean;
  color?: boolean;
  prefix?: string;
}

export class Logger {
  private options: LoggerOptions;

  constructor(options: LoggerOptions = {}) {
    this.options = {
      timestamp: true,
      color: true,
      prefix: '[APP]',
      ...options
    };
  }

  private getColor(level: LogLevel): string {
    if (!this.options.color) return '';
    const colorMap: Record<LogLevel, string> = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m'
    };
    return colorMap[level];
  }

  private getLevelLabel(level: LogLevel): string {
    const labelMap: Record<LogLevel, string> = {
      info: '[INFO]',
      success: '[SUCCESS]',
      warning: '[WARNING]',
      error: '[ERROR]'
    };
    return labelMap[level];
  }

  log(message: string, level: LogLevel = 'info') {
    const parts: string[] = [];

    if (this.options.timestamp) {
      parts.push(new Date().toISOString());
    }

    const color = this.getColor(level);
    const reset = this.options.color ? '\x1b[0m' : '';

    if (this.options.prefix) {
      parts.push(`${color}${this.options.prefix}${reset}`);
    }

    parts.push(`${color}${this.getLevelLabel(level)}${reset}`);
    parts.push(message);

    console.log(parts.join(' '));
  }

  info(message: string) {
    this.log(message, 'info');
  }

  success(message: string) {
    this.log(message, 'success');
  }

  warning(message: string) {
    this.log(message, 'warning');
  }

  error(message: string) {
    this.log(message, 'error');
  }
}

export const createLogger = (prefix?: string): Logger => {
  return new Logger({ prefix: prefix ? `[${prefix.toUpperCase()}]` : '[APP]' });
};

export const logger = new Logger();