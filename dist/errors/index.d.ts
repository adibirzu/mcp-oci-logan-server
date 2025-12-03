/**
 * OCI Logan MCP Server - Error Handling
 * Following MCP best practices for categorized error handling
 */
import { ErrorCode, ToolResult } from '../types/index.js';
/**
 * Custom MCP Error class with categorization
 */
export declare class MCPError extends Error {
    readonly code: ErrorCode;
    readonly details?: Record<string, unknown>;
    readonly httpStatus?: number;
    constructor(message: string, code: ErrorCode, details?: Record<string, unknown>, httpStatus?: number);
}
/**
 * Format error into consistent MCP tool result
 */
export declare function formatError(code: ErrorCode, message: string, details?: Record<string, unknown>): ToolResult;
/**
 * Handle unknown errors and convert to MCPError
 */
export declare function handleError(error: unknown): ToolResult;
/**
 * Wrap async tool handler with error handling
 */
export declare function withErrorHandling<T extends unknown[]>(handler: (...args: T) => Promise<ToolResult>): (...args: T) => Promise<ToolResult>;
/**
 * Create a specific error for common cases
 */
export declare const Errors: {
    notFound: (resource: string, id?: string) => MCPError;
    permissionDenied: (operation: string, details?: Record<string, unknown>) => MCPError;
    validationFailed: (field: string, message: string) => MCPError;
    querySyntax: (query: string, error: string) => MCPError;
    timeout: (operation: string, durationMs?: number) => MCPError;
    ociError: (message: string, statusCode?: number) => MCPError;
    internal: (message: string, details?: Record<string, unknown>) => MCPError;
};
