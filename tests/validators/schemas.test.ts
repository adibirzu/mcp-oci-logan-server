/**
 * Tests for Zod validation schemas
 */

import { describe, it, expect } from 'vitest';
import {
  ExecuteLoganQuerySchema,
  SearchSecurityEventsSchema,
  GetMitreTechniquesSchema,
  AnalyzeIPActivitySchema,
  ListDashboardsSchema,
  ValidateQuerySchema,
  validateToolInput,
  OCIDSchema,
  IPAddressSchema,
  TimeRangeSchema
} from '../../src/validators/schemas.js';

describe('Common Schemas', () => {
  describe('OCIDSchema', () => {
    it('should accept valid compartment OCID', () => {
      const result = OCIDSchema.safeParse('ocid1.compartment.oc1..aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
      expect(result.success).toBe(true);
    });

    it('should accept valid tenancy OCID', () => {
      const result = OCIDSchema.safeParse('ocid1.tenancy.oc1..aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
      expect(result.success).toBe(true);
    });

    it('should reject invalid OCID', () => {
      const result = OCIDSchema.safeParse('invalid-ocid');
      expect(result.success).toBe(false);
    });

    it('should reject empty string', () => {
      const result = OCIDSchema.safeParse('');
      expect(result.success).toBe(false);
    });
  });

  describe('IPAddressSchema', () => {
    it('should accept valid IPv4 address', () => {
      const result = IPAddressSchema.safeParse('192.168.1.1');
      expect(result.success).toBe(true);
    });

    it('should accept valid IPv4 with zeros', () => {
      const result = IPAddressSchema.safeParse('10.0.0.1');
      expect(result.success).toBe(true);
    });

    it('should reject invalid IPv4 (out of range)', () => {
      const result = IPAddressSchema.safeParse('256.1.1.1');
      expect(result.success).toBe(false);
    });

    it('should reject invalid format', () => {
      const result = IPAddressSchema.safeParse('not-an-ip');
      expect(result.success).toBe(false);
    });
  });

  describe('TimeRangeSchema', () => {
    it('should accept valid time ranges', () => {
      const validRanges = ['1h', '6h', '12h', '24h', '1d', '7d', '30d', '1w', '1m', '90d'];
      for (const range of validRanges) {
        const result = TimeRangeSchema.safeParse(range);
        expect(result.success).toBe(true);
      }
    });

    it('should use default value 24h', () => {
      const result = TimeRangeSchema.safeParse(undefined);
      expect(result.success).toBe(true);
      expect(result.data).toBe('24h');
    });

    it('should reject invalid time range', () => {
      const result = TimeRangeSchema.safeParse('2h');
      expect(result.success).toBe(false);
    });
  });
});

describe('Tool Schemas', () => {
  describe('ExecuteLoganQuerySchema', () => {
    it('should accept valid query input', () => {
      const result = ExecuteLoganQuerySchema.safeParse({
        query: "Severity = 'error' | stats count by 'Host Name'",
        timeRange: '24h'
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty query', () => {
      const result = ExecuteLoganQuerySchema.safeParse({
        query: '',
        timeRange: '24h'
      });
      expect(result.success).toBe(false);
    });

    it('should reject query over max length', () => {
      const result = ExecuteLoganQuerySchema.safeParse({
        query: 'a'.repeat(10001),
        timeRange: '24h'
      });
      expect(result.success).toBe(false);
    });

    it('should use default time range', () => {
      const result = ExecuteLoganQuerySchema.safeParse({
        query: 'test query'
      });
      expect(result.success).toBe(true);
      expect(result.data?.timeRange).toBe('24h');
    });

    it('should reject extra properties (strict mode)', () => {
      const result = ExecuteLoganQuerySchema.safeParse({
        query: 'test query',
        unknownField: 'value'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('SearchSecurityEventsSchema', () => {
    it('should accept valid search input', () => {
      const result = SearchSecurityEventsSchema.safeParse({
        searchTerm: 'failed login',
        eventType: 'login',
        timeRange: '24h',
        limit: 50
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty search term', () => {
      const result = SearchSecurityEventsSchema.safeParse({
        searchTerm: ''
      });
      expect(result.success).toBe(false);
    });

    it('should reject limit over 100', () => {
      const result = SearchSecurityEventsSchema.safeParse({
        searchTerm: 'test',
        limit: 150
      });
      expect(result.success).toBe(false);
    });

    it('should reject limit under 1', () => {
      const result = SearchSecurityEventsSchema.safeParse({
        searchTerm: 'test',
        limit: 0
      });
      expect(result.success).toBe(false);
    });
  });

  describe('GetMitreTechniquesSchema', () => {
    it('should accept valid MITRE technique ID', () => {
      const result = GetMitreTechniquesSchema.safeParse({
        techniqueId: 'T1003'
      });
      expect(result.success).toBe(true);
    });

    it('should accept MITRE sub-technique ID', () => {
      const result = GetMitreTechniquesSchema.safeParse({
        techniqueId: 'T1003.001'
      });
      expect(result.success).toBe(true);
    });

    it('should accept "all" as technique ID', () => {
      const result = GetMitreTechniquesSchema.safeParse({
        techniqueId: 'all'
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid technique ID format', () => {
      const result = GetMitreTechniquesSchema.safeParse({
        techniqueId: 'invalid'
      });
      expect(result.success).toBe(false);
    });

    it('should default to 30d time range', () => {
      const result = GetMitreTechniquesSchema.safeParse({});
      expect(result.success).toBe(true);
      expect(result.data?.timeRange).toBe('30d');
    });
  });

  describe('AnalyzeIPActivitySchema', () => {
    it('should accept valid IPv4 address', () => {
      const result = AnalyzeIPActivitySchema.safeParse({
        ipAddress: '192.168.1.100'
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid IP address', () => {
      const result = AnalyzeIPActivitySchema.safeParse({
        ipAddress: 'not-an-ip'
      });
      expect(result.success).toBe(false);
    });

    it('should default analysis type to full', () => {
      const result = AnalyzeIPActivitySchema.safeParse({
        ipAddress: '10.0.0.1'
      });
      expect(result.success).toBe(true);
      expect(result.data?.analysisType).toBe('full');
    });
  });

  describe('ListDashboardsSchema', () => {
    it('should accept pagination parameters', () => {
      const result = ListDashboardsSchema.safeParse({
        limit: 50,
        offset: 10
      });
      expect(result.success).toBe(true);
    });

    it('should use default pagination', () => {
      const result = ListDashboardsSchema.safeParse({});
      expect(result.success).toBe(true);
      expect(result.data?.limit).toBe(20);
      expect(result.data?.offset).toBe(0);
    });

    it('should reject negative offset', () => {
      const result = ListDashboardsSchema.safeParse({
        offset: -1
      });
      expect(result.success).toBe(false);
    });
  });

  describe('ValidateQuerySchema', () => {
    it('should accept query with fix option', () => {
      const result = ValidateQuerySchema.safeParse({
        query: 'test query',
        fix: true
      });
      expect(result.success).toBe(true);
    });

    it('should default fix to false', () => {
      const result = ValidateQuerySchema.safeParse({
        query: 'test query'
      });
      expect(result.success).toBe(true);
      expect(result.data?.fix).toBe(false);
    });
  });
});

describe('validateToolInput', () => {
  it('should return success for valid input', () => {
    const result = validateToolInput('oci_logan_execute_query', {
      query: 'test query'
    });
    expect(result.success).toBe(true);
  });

  it('should return errors for invalid input', () => {
    const result = validateToolInput('oci_logan_execute_query', {
      query: ''
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it('should return error for unknown tool', () => {
    const result = validateToolInput('unknown_tool', {});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toContain('Unknown tool: unknown_tool');
    }
  });
});
