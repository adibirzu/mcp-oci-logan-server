/**
 * Tests for predefined queries
 *
 * These tests validate query syntax patterns without executing against OCI.
 * For actual query execution tests, use the integration test suite.
 */

import { describe, it, expect } from 'vitest';
import {
  ALL_PREDEFINED_QUERIES,
  QUERY_CATEGORIES,
  VCN_FLOW_QUERIES,
  OCI_AUDIT_QUERIES,
  DATABASE_QUERIES,
  API_GATEWAY_QUERIES,
  OBJECT_STORAGE_QUERIES,
  SECURITY_QUERIES,
  COMPUTE_QUERIES,
  LOAD_BALANCER_QUERIES,
  getQueriesByCategory,
  getQueriesByTag,
  searchQueries,
  getQueryById,
  getQueryStats,
  type PredefinedQuery
} from '../../src/queries/predefined-queries.js';

describe('Predefined Queries Structure', () => {
  it('should have a unique ID for each query', () => {
    const ids = ALL_PREDEFINED_QUERIES.map(q => q.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have all required fields for each query', () => {
    for (const query of ALL_PREDEFINED_QUERIES) {
      expect(query.id).toBeDefined();
      expect(query.id.length).toBeGreaterThan(0);
      expect(query.name).toBeDefined();
      expect(query.name.length).toBeGreaterThan(0);
      expect(query.query).toBeDefined();
      expect(query.query.length).toBeGreaterThan(0);
      expect(query.category).toBeDefined();
      expect(query.description).toBeDefined();
      expect(query.tags).toBeDefined();
      expect(Array.isArray(query.tags)).toBe(true);
      expect(typeof query.tested).toBe('boolean');
    }
  });

  it('should have at least one tag per query', () => {
    for (const query of ALL_PREDEFINED_QUERIES) {
      expect(query.tags.length).toBeGreaterThan(0);
    }
  });

  it('should have categories for all queries', () => {
    const validCategories = QUERY_CATEGORIES.map(c => c.id);
    for (const query of ALL_PREDEFINED_QUERIES) {
      expect(validCategories).toContain(query.category);
    }
  });
});

describe('Query Syntax Validation', () => {
  const validateQuerySyntax = (query: PredefinedQuery): string[] => {
    const errors: string[] = [];
    const q = query.query;

    // Check for proper field quoting (fields with spaces must be quoted)
    // But exclude content inside quoted strings (between single quotes)
    // First, remove all quoted content to avoid false positives
    const withoutQuotedContent = q.replace(/'[^']*'/g, '');

    const unquotedFieldPattern = /\b([A-Z][a-z]+ [A-Z][a-z]+)\b/g;
    const matches = withoutQuotedContent.match(unquotedFieldPattern);
    if (matches) {
      // Filter out common false positives
      const falsePositives = ['Time between', 'Time span'];
      const realUnquoted = matches.filter(m => !falsePositives.includes(m));
      if (realUnquoted.length > 0) {
        errors.push(`Potentially unquoted multi-word fields: ${realUnquoted.join(', ')}`);
      }
    }

    // Check for time filter presence (most queries should have one)
    if (!q.includes('dateRelative') && !q.includes('timefilter') && !q.includes('Time >') && !q.includes('Time between')) {
      if (!query.tags.includes('no_time_filter')) {
        errors.push('Missing time filter (dateRelative, timefilter, or Time >)');
      }
    }

    // Check for common syntax issues
    if (q.includes('= null') && !q.includes('is null') && !q.includes('is not null')) {
      errors.push("Use 'is null' or 'is not null' instead of '= null'");
    }

    // Check for proper operator spacing
    if (/[^=!<>]==[^=]/.test(q)) {
      errors.push('Use single = for equality, not ==');
    }

    // Check for balanced quotes
    const singleQuotes = (q.match(/'/g) || []).length;
    const doubleQuotes = (q.match(/"/g) || []).length;
    if (singleQuotes % 2 !== 0) {
      errors.push('Unbalanced single quotes');
    }
    if (doubleQuotes % 2 !== 0) {
      errors.push('Unbalanced double quotes');
    }

    // Check for balanced parentheses
    const openParens = (q.match(/\(/g) || []).length;
    const closeParens = (q.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      errors.push('Unbalanced parentheses');
    }

    return errors;
  };

  it('should have valid syntax for all VCN Flow queries', () => {
    for (const query of VCN_FLOW_QUERIES) {
      const errors = validateQuerySyntax(query);
      expect(errors, `Query ${query.id} has syntax errors: ${errors.join('; ')}`).toHaveLength(0);
    }
  });

  it('should have valid syntax for all OCI Audit queries', () => {
    for (const query of OCI_AUDIT_QUERIES) {
      const errors = validateQuerySyntax(query);
      expect(errors, `Query ${query.id} has syntax errors: ${errors.join('; ')}`).toHaveLength(0);
    }
  });

  it('should have valid syntax for all Database queries', () => {
    for (const query of DATABASE_QUERIES) {
      const errors = validateQuerySyntax(query);
      expect(errors, `Query ${query.id} has syntax errors: ${errors.join('; ')}`).toHaveLength(0);
    }
  });

  it('should have valid syntax for all API Gateway queries', () => {
    for (const query of API_GATEWAY_QUERIES) {
      const errors = validateQuerySyntax(query);
      expect(errors, `Query ${query.id} has syntax errors: ${errors.join('; ')}`).toHaveLength(0);
    }
  });

  it('should have valid syntax for all Object Storage queries', () => {
    for (const query of OBJECT_STORAGE_QUERIES) {
      const errors = validateQuerySyntax(query);
      expect(errors, `Query ${query.id} has syntax errors: ${errors.join('; ')}`).toHaveLength(0);
    }
  });

  it('should have valid syntax for all Security queries', () => {
    for (const query of SECURITY_QUERIES) {
      const errors = validateQuerySyntax(query);
      expect(errors, `Query ${query.id} has syntax errors: ${errors.join('; ')}`).toHaveLength(0);
    }
  });

  it('should have valid syntax for all Compute queries', () => {
    for (const query of COMPUTE_QUERIES) {
      const errors = validateQuerySyntax(query);
      expect(errors, `Query ${query.id} has syntax errors: ${errors.join('; ')}`).toHaveLength(0);
    }
  });

  it('should have valid syntax for all Load Balancer queries', () => {
    for (const query of LOAD_BALANCER_QUERIES) {
      const errors = validateQuerySyntax(query);
      expect(errors, `Query ${query.id} has syntax errors: ${errors.join('; ')}`).toHaveLength(0);
    }
  });
});

describe('Query Pattern Validation', () => {
  it('should use proper Log Source quoting', () => {
    const queriesWithLogSource = ALL_PREDEFINED_QUERIES.filter(q => q.query.includes('Log Source'));
    for (const query of queriesWithLogSource) {
      expect(query.query).toMatch(/'Log Source'/);
    }
  });

  it('should use dateRelative with valid time units', () => {
    const validTimeUnits = /dateRelative\((1h|6h|12h|24h|1d|7d|30d|90d|1m|1w)\)/;
    const queriesWithDateRelative = ALL_PREDEFINED_QUERIES.filter(q => q.query.includes('dateRelative'));
    for (const query of queriesWithDateRelative) {
      expect(query.query).toMatch(validTimeUnits);
    }
  });

  it('should use proper stats syntax', () => {
    const queriesWithStats = ALL_PREDEFINED_QUERIES.filter(q => q.query.includes('| stats'));
    for (const query of queriesWithStats) {
      // Stats should have count, sum, avg, etc. followed by optional 'as' alias and 'by' grouping
      expect(query.query).toMatch(/\| stats\s+(count|sum|avg|min|max|distinct_count|perc\d+)/);
    }
  });

  it('should use proper sort syntax', () => {
    const queriesWithSort = ALL_PREDEFINED_QUERIES.filter(q => q.query.includes('| sort'));
    for (const query of queriesWithSort) {
      // Sort should have - for descending or field name
      expect(query.query).toMatch(/\| sort\s+(-?\w+|Time)/);
    }
  });
});

describe('Query Categories', () => {
  it('should have 8 categories', () => {
    expect(QUERY_CATEGORIES.length).toBe(8);
  });

  it('should have unique category IDs', () => {
    const ids = QUERY_CATEGORIES.map(c => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have at least 3 queries per category', () => {
    for (const category of QUERY_CATEGORIES) {
      expect(category.queries.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('should sum to total query count', () => {
    const categoryQueryCount = QUERY_CATEGORIES.reduce((sum, c) => sum + c.queries.length, 0);
    expect(categoryQueryCount).toBe(ALL_PREDEFINED_QUERIES.length);
  });
});

describe('Query Helper Functions', () => {
  describe('getQueriesByCategory', () => {
    it('should return queries for valid category', () => {
      const queries = getQueriesByCategory('vcn_flow');
      expect(queries.length).toBe(VCN_FLOW_QUERIES.length);
    });

    it('should return empty array for invalid category', () => {
      const queries = getQueriesByCategory('invalid_category');
      expect(queries).toEqual([]);
    });
  });

  describe('getQueriesByTag', () => {
    it('should return queries with security tag', () => {
      const queries = getQueriesByTag('security');
      expect(queries.length).toBeGreaterThan(0);
      for (const query of queries) {
        expect(query.tags).toContain('security');
      }
    });

    it('should be case-insensitive', () => {
      const queries1 = getQueriesByTag('SECURITY');
      const queries2 = getQueriesByTag('security');
      expect(queries1.length).toBe(queries2.length);
    });
  });

  describe('searchQueries', () => {
    it('should find queries by name', () => {
      const queries = searchQueries('traffic');
      expect(queries.length).toBeGreaterThan(0);
    });

    it('should find queries by description', () => {
      const queries = searchQueries('exfiltration');
      expect(queries.length).toBeGreaterThan(0);
    });

    it('should return empty for no matches', () => {
      const queries = searchQueries('xyznonexistent123');
      expect(queries).toEqual([]);
    });
  });

  describe('getQueryById', () => {
    it('should return query for valid ID', () => {
      const query = getQueryById('vcn_traffic_by_subnet');
      expect(query).toBeDefined();
      expect(query?.id).toBe('vcn_traffic_by_subnet');
    });

    it('should return undefined for invalid ID', () => {
      const query = getQueryById('invalid_id');
      expect(query).toBeUndefined();
    });
  });

  describe('getQueryStats', () => {
    it('should return correct statistics', () => {
      const stats = getQueryStats();
      expect(stats.total).toBe(ALL_PREDEFINED_QUERIES.length);
      expect(stats.tested + stats.untested).toBe(stats.total);
      expect(Object.keys(stats.byCategory).length).toBe(QUERY_CATEGORIES.length);
    });
  });
});

describe('Log Source Coverage', () => {
  it('should cover key OCI log sources', () => {
    const allLogSources = ALL_PREDEFINED_QUERIES
      .filter(q => q.logSources)
      .flatMap(q => q.logSources!);
    const uniqueLogSources = new Set(allLogSources);

    // Check for key log sources
    const expectedSources = [
      'OCI VCN Flow Unified Schema Logs',
      'OCI Audit Logs',
      'OCI Object Storage Logs',
      'OCI Cloud Guard',
      'OCI Load Balancer Logs'
    ];

    for (const expected of expectedSources) {
      expect(uniqueLogSources.has(expected)).toBe(true);
    }
  });
});

describe('Security Query Coverage', () => {
  it('should have queries for common security use cases', () => {
    const securityTags = ['security', 'brute_force', 'exfiltration', 'anomaly', 'audit'];
    for (const tag of securityTags) {
      const queries = getQueriesByTag(tag);
      expect(queries.length, `No queries with tag: ${tag}`).toBeGreaterThan(0);
    }
  });

  it('should have queries for MITRE-related detections', () => {
    // Check for queries that map to common MITRE techniques
    const bruteForce = searchQueries('brute force');
    const exfiltration = searchQueries('exfiltration');
    const privilegeEscalation = searchQueries('privilege');

    expect(bruteForce.length).toBeGreaterThan(0);
    expect(exfiltration.length).toBeGreaterThan(0);
    expect(privilegeEscalation.length).toBeGreaterThan(0);
  });
});

describe('Performance Considerations', () => {
  it('should have head/limit for potentially large result sets', () => {
    // Queries with stats by multiple fields or without aggregation should have limits
    const queriesNeedingLimits = ALL_PREDEFINED_QUERIES.filter(q => {
      const hasMultipleGroupBy = (q.query.match(/by /g) || []).length > 1;
      const hasNoAggregation = !q.query.includes('| stats');
      return hasMultipleGroupBy || hasNoAggregation;
    });

    for (const query of queriesNeedingLimits) {
      const hasLimit = query.query.includes('| head') ||
                       query.query.includes('| top ') ||
                       query.query.includes('| tail');
      // This is a soft check - not all queries need limits
      if (!hasLimit && !query.query.includes('| stats count')) {
        // Just log a warning, don't fail the test
        console.warn(`Query ${query.id} might benefit from a result limit`);
      }
    }
  });

  it('should recommend minimum time range for expensive queries', () => {
    // Queries using link, cluster, or timecluster are expensive
    const expensiveCommands = ['| link', '| cluster', '| timecluster', '| sequence'];
    const expensiveQueries = ALL_PREDEFINED_QUERIES.filter(q =>
      expensiveCommands.some(cmd => q.query.includes(cmd))
    );

    for (const query of expensiveQueries) {
      if (query.minTimeRange) {
        expect(['1d', '7d', '24h', '30d']).toContain(query.minTimeRange);
      }
    }
  });
});
