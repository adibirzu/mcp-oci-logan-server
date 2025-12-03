/**
 * Tests for error handling
 */

import { describe, it, expect } from 'vitest';
import {
  MCPError,
  formatError,
  handleError,
  Errors
} from '../../src/errors/index.js';

describe('MCPError', () => {
  it('should create error with code', () => {
    const error = new MCPError('Test error', 'NOT_FOUND');
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.name).toBe('MCPError');
  });

  it('should create error with details', () => {
    const error = new MCPError('Test error', 'VALIDATION_ERROR', { field: 'test' });
    expect(error.details).toEqual({ field: 'test' });
  });

  it('should create error with HTTP status', () => {
    const error = new MCPError('Test error', 'OCI_ERROR', undefined, 500);
    expect(error.httpStatus).toBe(500);
  });
});

describe('formatError', () => {
  it('should format NOT_FOUND error', () => {
    const result = formatError('NOT_FOUND', 'Resource missing');
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('NOT_FOUND');
    expect(result.content[0].text).toContain('Resource missing');
  });

  it('should include troubleshooting hints', () => {
    const result = formatError('PERMISSION_DENIED', 'Access denied');
    expect(result.content[0].text).toContain('Troubleshooting');
    expect(result.content[0].text).toContain('OCI config');
  });

  it('should truncate sensitive data in details', () => {
    const result = formatError('OCI_ERROR', 'API error', {
      compartmentId: 'ocid1.compartment.oc1..aaaaaaaaverylongstringhere'
    });
    // The compartmentId is truncated to show first 20 chars + '...' + last 4 chars
    expect(result.content[0].text).toContain('ocid1.compartment.oc');
    expect(result.content[0].text).toContain('here');
    // Should not contain the full string
    expect(result.content[0].text).not.toContain('aaaaaaaaverylongstringhere');
  });
});

describe('handleError', () => {
  it('should handle MCPError', () => {
    const error = new MCPError('Test error', 'NOT_FOUND');
    const result = handleError(error);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('NOT_FOUND');
  });

  it('should handle standard Error', () => {
    const error = new Error('Something went wrong');
    const result = handleError(error);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Something went wrong');
  });

  it('should detect permission errors in message', () => {
    const error = new Error('Permission denied for this operation');
    const result = handleError(error);
    expect(result.content[0].text).toContain('PERMISSION_DENIED');
  });

  it('should detect timeout errors in message', () => {
    const error = new Error('Operation timed out');
    const result = handleError(error);
    expect(result.content[0].text).toContain('TIMEOUT');
  });

  it('should detect not found errors in message', () => {
    const error = new Error('Resource not found');
    const result = handleError(error);
    expect(result.content[0].text).toContain('NOT_FOUND');
  });

  it('should handle OCI-style errors with statusCode', () => {
    const error = { statusCode: 404, message: 'Not found' };
    const result = handleError(error);
    expect(result.content[0].text).toContain('NOT_FOUND');
  });

  it('should handle rate limit status code', () => {
    const error = { statusCode: 429, message: 'Too many requests' };
    const result = handleError(error);
    expect(result.content[0].text).toContain('RATE_LIMITED');
  });

  it('should handle unknown errors', () => {
    const result = handleError('string error');
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('INTERNAL');
  });
});

describe('Errors factory', () => {
  it('should create notFound error', () => {
    const error = Errors.notFound('Dashboard', 'ocid1.dashboard...');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toContain('Dashboard');
    expect(error.details?.resource).toBe('Dashboard');
  });

  it('should create permissionDenied error', () => {
    const error = Errors.permissionDenied('createDashboard');
    expect(error.code).toBe('PERMISSION_DENIED');
    expect(error.message).toContain('createDashboard');
  });

  it('should create validationFailed error', () => {
    const error = Errors.validationFailed('query', 'Cannot be empty');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.message).toContain('query');
    expect(error.message).toContain('Cannot be empty');
  });

  it('should create querySyntax error', () => {
    const error = Errors.querySyntax('invalid query', 'Missing field name');
    expect(error.code).toBe('QUERY_SYNTAX_ERROR');
    expect(error.message).toContain('Missing field name');
  });

  it('should create timeout error', () => {
    const error = Errors.timeout('executeQuery', 30000);
    expect(error.code).toBe('TIMEOUT');
    expect(error.details?.durationMs).toBe(30000);
  });

  it('should create ociError', () => {
    const error = Errors.ociError('Service unavailable', 503);
    expect(error.code).toBe('OCI_ERROR');
    expect(error.httpStatus).toBe(503);
  });

  it('should create internal error', () => {
    const error = Errors.internal('Unexpected error', { trace: 'stack' });
    expect(error.code).toBe('INTERNAL');
    expect(error.details?.trace).toBe('stack');
  });
});
