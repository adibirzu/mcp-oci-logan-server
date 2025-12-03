/**
 * OCI Logan MCP Server - Secure Logging Utility
 * Following security best practices for debug logging
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

// Log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

// Log level names
const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.NONE]: 'NONE'
};

// Environment variable configuration
const LOG_LEVEL_ENV = process.env.MCP_LOG_LEVEL?.toUpperCase() || 'ERROR';
const LOG_DIR = process.env.MCP_LOG_DIR || path.join(os.homedir(), '.mcp-oci-logan', 'logs');
const LOG_TO_FILE = process.env.MCP_LOG_TO_FILE === 'true';
const LOG_MAX_SIZE = parseInt(process.env.MCP_LOG_MAX_SIZE || '10485760', 10); // 10MB default
const LOG_REDACT_SENSITIVE = process.env.MCP_LOG_REDACT !== 'false'; // Default true

// Parse log level from environment
function parseLogLevel(level: string): LogLevel {
  const levels: Record<string, LogLevel> = {
    'DEBUG': LogLevel.DEBUG,
    'INFO': LogLevel.INFO,
    'WARN': LogLevel.WARN,
    'ERROR': LogLevel.ERROR,
    'NONE': LogLevel.NONE
  };
  return levels[level] ?? LogLevel.ERROR;
}

// Current log level
let currentLogLevel = parseLogLevel(LOG_LEVEL_ENV);

// Sensitive keys to redact
const SENSITIVE_KEYS = [
  'compartmentid', 'tenancyid', 'userid', 'fingerprint',
  'privatekey', 'password', 'secret', 'token', 'apikey',
  'authorization', 'cookie', 'sessionid', 'key_file',
  'private_key', 'api_key', 'access_token', 'refresh_token',
  'client_secret', 'client_id'
];

// Patterns to redact in strings
const SENSITIVE_PATTERNS = [
  /ocid1\.[a-z]+\.(oc[0-9]+|oc1)\.[a-z0-9-]*\.[a-z0-9]+/gi, // OCIDs
  /-----BEGIN.*PRIVATE KEY-----[\s\S]*?-----END.*PRIVATE KEY-----/g, // Private keys
  /Bearer\s+[a-zA-Z0-9._-]+/gi, // Bearer tokens
  /[a-f0-9]{64}/gi, // Potential API keys/secrets (64 char hex)
];

/**
 * Redact sensitive information from data
 */
function redactSensitive(data: unknown, depth = 0): unknown {
  if (!LOG_REDACT_SENSITIVE || depth > 10) return data;

  if (typeof data === 'string') {
    let result = data;
    for (const pattern of SENSITIVE_PATTERNS) {
      result = result.replace(pattern, (match) => {
        if (match.length > 20) {
          return `${match.substring(0, 8)}...[REDACTED]...${match.slice(-4)}`;
        }
        return '[REDACTED]';
      });
    }
    return result;
  }

  if (Array.isArray(data)) {
    return data.map(item => redactSensitive(item, depth + 1));
  }

  if (typeof data === 'object' && data !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.some(sk => lowerKey.includes(sk))) {
        if (typeof value === 'string' && value.length > 8) {
          result[key] = `${value.substring(0, 4)}...[REDACTED]`;
        } else {
          result[key] = '[REDACTED]';
        }
      } else {
        result[key] = redactSensitive(value, depth + 1);
      }
    }
    return result;
  }

  return data;
}

/**
 * Ensure log directory exists with proper permissions
 */
function ensureLogDir(): boolean {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true, mode: 0o700 });
    }
    // Verify directory permissions are restrictive (owner only)
    const stats = fs.statSync(LOG_DIR);
    const mode = stats.mode & 0o777;
    if (mode !== 0o700) {
      fs.chmodSync(LOG_DIR, 0o700);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Get log file path for today
 */
function getLogFilePath(): string {
  const date = new Date().toISOString().split('T')[0];
  return path.join(LOG_DIR, `mcp-oci-logan-${date}.log`);
}

/**
 * Rotate log file if needed
 */
function rotateLogIfNeeded(logPath: string): void {
  try {
    if (fs.existsSync(logPath)) {
      const stats = fs.statSync(logPath);
      if (stats.size > LOG_MAX_SIZE) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedPath = logPath.replace('.log', `-${timestamp}.log`);
        fs.renameSync(logPath, rotatedPath);
      }
    }
  } catch {
    // Ignore rotation errors
  }
}

/**
 * Write log entry to file
 */
function writeToFile(entry: string): void {
  if (!LOG_TO_FILE || !ensureLogDir()) return;

  const logPath = getLogFilePath();
  rotateLogIfNeeded(logPath);

  try {
    fs.appendFileSync(logPath, entry + '\n', { mode: 0o600 });
  } catch {
    // Ignore file write errors
  }
}

/**
 * Format log entry
 */
function formatLogEntry(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>
): string {
  const timestamp = new Date().toISOString();
  const levelName = LOG_LEVEL_NAMES[level];

  let entry = `[${timestamp}] [${levelName}] ${message}`;

  if (context && Object.keys(context).length > 0) {
    const safeContext = redactSensitive(context);
    entry += ` ${JSON.stringify(safeContext)}`;
  }

  return entry;
}

/**
 * Logger class
 */
class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (level < currentLogLevel) return;

    const fullMessage = `[${this.context}] ${message}`;
    const entry = formatLogEntry(level, fullMessage, data);

    // Always write to stderr for MCP compatibility (stdout is for protocol)
    if (level >= LogLevel.ERROR) {
      console.error(entry);
    } else if (level >= LogLevel.WARN) {
      console.error(entry);
    } else if (currentLogLevel <= LogLevel.DEBUG) {
      console.error(entry);
    }

    // Write to file if enabled
    writeToFile(entry);
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, data);
  }

  /**
   * Log tool invocation (with argument redaction)
   */
  toolCall(toolName: string, args: Record<string, unknown>): void {
    this.debug(`Tool call: ${toolName}`, { args: redactSensitive(args) as Record<string, unknown> });
  }

  /**
   * Log tool result
   */
  toolResult(toolName: string, success: boolean, executionTimeMs: number): void {
    this.debug(`Tool result: ${toolName}`, { success, executionTimeMs });
  }
}

/**
 * Create a logger for a specific context
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}

/**
 * Set the global log level
 */
export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
}

/**
 * Get the current log level
 */
export function getLogLevel(): LogLevel {
  return currentLogLevel;
}

// Export singleton for general use
export const logger = createLogger('MCP');

// Export utilities
export { redactSensitive };
