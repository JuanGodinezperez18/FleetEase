/**
 * Sistema de Logging Estructurado para FleetEase Manager
 * 
 * Reemplaza los console.log dispersos con un sistema centralizado
 * que puede ser configurado por nivel de severidad y ambiente.
 * 
 * @example
 * logger.debug('Usuario cargado', { userId: '123' });
 * logger.info('Sesión iniciada', { email: 'user@example.com' });
 * logger.warn('Intento fallido', { attempts: 3 });
 * logger.error('Error crítico', error, { context: 'payment' });
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private level: LogLevel;
  private isProduction: boolean;

  constructor() {
    this.level = (process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) || 'info';
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private formatEntry(entry: LogEntry): string {
    if (this.isProduction) {
      // Formato JSON para producción (mejor para servicios de logging)
      return JSON.stringify(entry);
    }
    
    // Formato legible para desarrollo
    const time = new Date(entry.timestamp).toLocaleTimeString('es-MX');
    const emoji = {
      debug: '🐛',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌'
    }[entry.level];
    
    return `${emoji} [${time}] ${entry.level.toUpperCase()}: ${entry.message}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && { context }),
      ...(error && { error: { name: error.name, message: error.message, stack: error.stack } })
    };

    const formatted = this.formatEntry(entry);

    switch (level) {
      case 'debug':
        console.debug(formatted, context || '');
        break;
      case 'info':
        console.info(formatted, context || '');
        break;
      case 'warn':
        console.warn(formatted, context || '');
        break;
      case 'error':
        console.error(formatted, context || '', error || '');
        break;
    }
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const err = error instanceof Error ? error : new Error(String(error));
    this.log('error', message, context, err);
  }

  /**
   * Logger para acciones de usuario (auditoría)
   */
  audit(action: string, userId: string, details?: LogContext) {
    this.info(`[AUDIT] ${action}`, { userId, ...details });
  }

  /**
   * Logger para métricas de performance
   */
  performance(metric: string, value: number, unit?: string) {
    this.debug(`[PERF] ${metric}: ${value}${unit || ''}`);
  }
}

// Exportar instancia singleton
export const logger = new Logger();

/**
 * Hook para usar el logger en componentes React
 * 
 * @example
 * function MyComponent() {
 *   const { logInfo, logError } = useLogger();
 *   
 *   useEffect(() => {
 *     logInfo('Component mounted');
 *   }, []);
 * }
 */
export function useLogger() {
  return {
    debug: logger.debug.bind(logger),
    info: logger.info.bind(logger),
    warn: logger.warn.bind(logger),
    error: logger.error.bind(logger),
    audit: logger.audit.bind(logger),
    performance: logger.performance.bind(logger),
  };
}
