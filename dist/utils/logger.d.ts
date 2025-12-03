/**
 * OCI Logan MCP Server - Secure Logging Utility
 * Following security best practices for debug logging
 */
export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 4
}
/**
 * Redact sensitive information from data
 */
declare function redactSensitive(data: unknown, depth?: number): unknown;
/**
 * Logger class
 */
declare class Logger {
    private context;
    constructor(context: string);
    private log;
    debug(message: string, data?: Record<string, unknown>): void;
    info(message: string, data?: Record<string, unknown>): void;
    warn(message: string, data?: Record<string, unknown>): void;
    error(message: string, data?: Record<string, unknown>): void;
    /**
     * Log tool invocation (with argument redaction)
     */
    toolCall(toolName: string, args: Record<string, unknown>): void;
    /**
     * Log tool result
     */
    toolResult(toolName: string, success: boolean, executionTimeMs: number): void;
}
/**
 * Create a logger for a specific context
 */
export declare function createLogger(context: string): Logger;
/**
 * Set the global log level
 */
export declare function setLogLevel(level: LogLevel): void;
/**
 * Get the current log level
 */
export declare function getLogLevel(): LogLevel;
export declare const logger: Logger;
export { redactSensitive };
