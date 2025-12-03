/**
 * OCI Logan MCP Server - Error Handling
 * Following MCP best practices for categorized error handling
 */

import { ErrorCode, ToolResult } from '../types/index.js';

/**
 * Custom MCP Error class with categorization
 */
export class MCPError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;
  public readonly httpStatus?: number;

  constructor(
    message: string,
    code: ErrorCode,
    details?: Record<string, unknown>,
    httpStatus?: number
  ) {
    super(message);
    this.name = 'MCPError';
    this.code = code;
    this.details = details;
    this.httpStatus = httpStatus;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MCPError);
    }
  }
}

/**
 * Error code to user-friendly message mapping
 */
const ERROR_MESSAGES: Record<ErrorCode, string> = {
  NOT_FOUND: 'The requested resource was not found',
  PERMISSION_DENIED: 'Access denied. Check your OCI credentials and permissions',
  RATE_LIMITED: 'Rate limit exceeded. Please wait before making more requests',
  TIMEOUT: 'Operation timed out. Try a shorter time range or simpler query',
  VALIDATION_ERROR: 'Invalid input parameters',
  OCI_ERROR: 'OCI API error occurred',
  QUERY_SYNTAX_ERROR: 'Query syntax error',
  INTERNAL: 'An unexpected error occurred'
};

/**
 * Format error into consistent MCP tool result
 */
export function formatError(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>
): ToolResult {
  const baseMessage = ERROR_MESSAGES[code];
  const fullMessage = message ? `${baseMessage}: ${message}` : baseMessage;

  let text = `**Error [${code}]**\n\n${fullMessage}`;

  if (details && Object.keys(details).length > 0) {
    // Redact sensitive information
    const safeDetails = redactSensitiveData(details);
    text += `\n\n**Details:**\n\`\`\`json\n${JSON.stringify(safeDetails, null, 2)}\n\`\`\``;
  }

  // Add troubleshooting hints based on error code
  const hint = getTroubleshootingHint(code);
  if (hint) {
    text += `\n\n**Troubleshooting:** ${hint}`;
  }

  return {
    content: [{ type: 'text', text }],
    isError: true
  };
}

/**
 * Get troubleshooting hint for error code
 */
function getTroubleshootingHint(code: ErrorCode): string | null {
  const hints: Partial<Record<ErrorCode, string>> = {
    NOT_FOUND: 'Verify the resource ID is correct and exists in your compartment',
    PERMISSION_DENIED: 'Check your OCI config file (~/.oci/config) and IAM policies',
    RATE_LIMITED: 'Wait 60 seconds before retrying. Consider reducing query frequency',
    TIMEOUT: 'Try using a shorter time range (e.g., 24h instead of 30d) or add filters to reduce data',
    VALIDATION_ERROR: 'Check parameter types and required fields',
    OCI_ERROR: 'Check OCI service status at https://ocistatus.oraclecloud.com/',
    QUERY_SYNTAX_ERROR: 'Use the validate_query tool to check syntax. Fields with spaces need quotes: \'Field Name\'',
    INTERNAL: 'If this persists, check the debug logs and report an issue'
  };
  return hints[code] || null;
}

/**
 * Redact sensitive data from error details
 */
function redactSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = [
    'compartmentId', 'tenancyId', 'userId', 'fingerprint',
    'privateKey', 'password', 'secret', 'token', 'apiKey',
    'authorization', 'cookie', 'sessionId'
  ];

  const redacted = { ...data };

  for (const key of Object.keys(redacted)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sk => lowerKey.includes(sk.toLowerCase()))) {
      if (typeof redacted[key] === 'string') {
        const value = redacted[key] as string;
        // Show first 8 and last 4 chars for OCIDs, otherwise just first 4
        if (value.startsWith('ocid1.')) {
          redacted[key] = `${value.substring(0, 20)}...${value.slice(-4)}`;
        } else if (value.length > 8) {
          redacted[key] = `${value.substring(0, 4)}...[REDACTED]`;
        } else {
          redacted[key] = '[REDACTED]';
        }
      }
    }
  }

  return redacted;
}

/**
 * Handle unknown errors and convert to MCPError
 */
export function handleError(error: unknown): ToolResult {
  // Already an MCPError
  if (error instanceof MCPError) {
    return formatError(error.code, error.message, error.details);
  }

  // HTTP/OCI API errors
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;

    // OCI SDK error pattern
    if ('statusCode' in err) {
      const statusCode = err.statusCode as number;
      const message = (err.message as string) || (err.serviceCode as string) || 'OCI API error';

      switch (statusCode) {
        case 400:
          return formatError('VALIDATION_ERROR', message, { statusCode });
        case 401:
        case 403:
          return formatError('PERMISSION_DENIED', message, { statusCode });
        case 404:
          return formatError('NOT_FOUND', message, { statusCode });
        case 429:
          return formatError('RATE_LIMITED', message, { statusCode });
        case 408:
        case 504:
          return formatError('TIMEOUT', message, { statusCode });
        default:
          if (statusCode >= 500) {
            return formatError('OCI_ERROR', message, { statusCode });
          }
          return formatError('OCI_ERROR', message, { statusCode });
      }
    }

    // Query syntax error pattern
    if ('code' in err && err.code === 'InvalidParameter') {
      const message = (err.message as string) || 'Invalid query syntax';
      return formatError('QUERY_SYNTAX_ERROR', message);
    }

    // Timeout error pattern
    if ('code' in err && (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED')) {
      return formatError('TIMEOUT', 'Connection timed out');
    }

    // Network error pattern
    if ('code' in err && (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED')) {
      return formatError('OCI_ERROR', 'Failed to connect to OCI. Check your network and region settings');
    }
  }

  // Standard Error object
  if (error instanceof Error) {
    // Check for common error patterns in message
    const message = error.message.toLowerCase();

    if (message.includes('not found') || message.includes('does not exist')) {
      return formatError('NOT_FOUND', error.message);
    }
    if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
      return formatError('PERMISSION_DENIED', error.message);
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return formatError('TIMEOUT', error.message);
    }
    if (message.includes('syntax') || message.includes('parse') || message.includes('invalid query')) {
      return formatError('QUERY_SYNTAX_ERROR', error.message);
    }
    if (message.includes('rate') || message.includes('throttl')) {
      return formatError('RATE_LIMITED', error.message);
    }

    return formatError('INTERNAL', error.message);
  }

  // Fallback for unknown error types
  return formatError('INTERNAL', String(error));
}

/**
 * Wrap async tool handler with error handling
 */
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<ToolResult>
): (...args: T) => Promise<ToolResult> {
  return async (...args: T): Promise<ToolResult> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleError(error);
    }
  };
}

/**
 * Create a specific error for common cases
 */
export const Errors = {
  notFound: (resource: string, id?: string) =>
    new MCPError(
      id ? `${resource} with ID '${id}' not found` : `${resource} not found`,
      'NOT_FOUND',
      { resource, id }
    ),

  permissionDenied: (operation: string, details?: Record<string, unknown>) =>
    new MCPError(
      `Permission denied for operation: ${operation}`,
      'PERMISSION_DENIED',
      details
    ),

  validationFailed: (field: string, message: string) =>
    new MCPError(
      `Validation failed for '${field}': ${message}`,
      'VALIDATION_ERROR',
      { field }
    ),

  querySyntax: (query: string, error: string) =>
    new MCPError(
      `Query syntax error: ${error}`,
      'QUERY_SYNTAX_ERROR',
      { query: query.substring(0, 100) + (query.length > 100 ? '...' : '') }
    ),

  timeout: (operation: string, durationMs?: number) =>
    new MCPError(
      `Operation '${operation}' timed out${durationMs ? ` after ${durationMs}ms` : ''}`,
      'TIMEOUT',
      { operation, durationMs }
    ),

  ociError: (message: string, statusCode?: number) =>
    new MCPError(
      message,
      'OCI_ERROR',
      statusCode ? { statusCode } : undefined,
      statusCode
    ),

  internal: (message: string, details?: Record<string, unknown>) =>
    new MCPError(message, 'INTERNAL', details)
};
