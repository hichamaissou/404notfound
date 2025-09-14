/**
 * Simple structured logger wrapper for consistent logging across the app.
 * Provides different log levels and structured data support.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'
type LogData = Record<string, unknown>

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  data?: LogData | undefined
}

/**
 * Creates a structured log entry and outputs it to console.
 * In production, this could be extended to send to external logging services.
 * 
 * @param level - Log level (debug, info, warn, error)
 * @param message - Human-readable log message
 * @param data - Optional structured data to include
 */
function log(level: LogLevel, message: string, data?: LogData): void {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    data,
  }
  
  // In development, use pretty printing
  if (process.env.NODE_ENV === 'development') {
    const prefix = `[${entry.timestamp}] ${level.toUpperCase()}`
    console[level === 'debug' ? 'log' : level](`${prefix}: ${message}`, data || '')
  } else {
    // In production, use structured JSON logging
    console[level === 'debug' ? 'log' : level](JSON.stringify(entry))
  }
}

export const logger = {
  /**
   * Debug-level logging for detailed troubleshooting information.
   * Only shown in development mode.
   */
  debug: (message: string, data?: LogData) => log('debug', message, data),
  
  /**
   * Info-level logging for general application flow information.
   */
  info: (message: string, data?: LogData) => log('info', message, data),
  
  /**
   * Warning-level logging for recoverable issues that need attention.
   */
  warn: (message: string, data?: LogData) => log('warn', message, data),
  
  /**
   * Error-level logging for serious issues that affect functionality.
   */
  error: (message: string, data?: LogData) => log('error', message, data),
}
