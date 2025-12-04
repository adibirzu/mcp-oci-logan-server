#!/usr/bin/env npx ts-node
/**
 * Query Validation Script
 *
 * Tests predefined queries against a real OCI Logging Analytics environment.
 * This script should be run before exposing new queries to the LLM.
 *
 * Usage:
 *   npx ts-node scripts/validate-queries.ts [options]
 *
 * Options:
 *   --category <id>    Only test queries from specific category
 *   --query <id>       Test a specific query by ID
 *   --dry-run          Show queries without executing
 *   --timeout <ms>     Query timeout in milliseconds (default: 30000)
 *   --output <file>    Write results to JSON file
 *
 * Environment Variables:
 *   OCI_COMPARTMENT_ID  - Required: Compartment OCID for queries
 *   OCI_REGION          - Optional: OCI region (default: us-ashburn-1)
 *   LOGAN_DEBUG         - Optional: Enable debug logging
 *
 * Examples:
 *   npx ts-node scripts/validate-queries.ts --dry-run
 *   npx ts-node scripts/validate-queries.ts --category vcn_flow
 *   npx ts-node scripts/validate-queries.ts --query vcn_traffic_by_subnet
 *   npx ts-node scripts/validate-queries.ts --output results.json
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import {
  ALL_PREDEFINED_QUERIES,
  QUERY_CATEGORIES,
  getQueriesByCategory,
  getQueryById,
  type PredefinedQuery
} from '../src/queries/predefined-queries.js';

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name: string): string | undefined => {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
};
const hasFlag = (name: string): boolean => args.includes(`--${name}`);

const CONFIG = {
  category: getArg('category'),
  queryId: getArg('query'),
  dryRun: hasFlag('dry-run'),
  timeout: parseInt(getArg('timeout') || '30000', 10),
  outputFile: getArg('output'),
  compartmentId: process.env.OCI_COMPARTMENT_ID,
  region: process.env.OCI_REGION || 'us-ashburn-1',
  debug: process.env.LOGAN_DEBUG === 'true'
};

interface QueryResult {
  id: string;
  name: string;
  category: string;
  status: 'success' | 'error' | 'skipped' | 'timeout';
  executionTimeMs?: number;
  recordCount?: number;
  error?: string;
  query: string;
}

interface ValidationReport {
  timestamp: string;
  compartmentId: string;
  region: string;
  totalQueries: number;
  successful: number;
  failed: number;
  skipped: number;
  timedOut: number;
  results: QueryResult[];
}

/**
 * Execute a query using the Python logan_client
 */
async function executeQuery(query: string, timeoutMs: number): Promise<{
  success: boolean;
  recordCount?: number;
  error?: string;
  executionTimeMs: number;
}> {
  const startTime = Date.now();
  const pythonScript = path.join(__dirname, '..', 'python', 'logan_client.py');
  const venvPython = path.join(__dirname, '..', 'python', 'venv', 'bin', 'python');

  return new Promise((resolve) => {
    const pythonPath = fs.existsSync(venvPython) ? venvPython : 'python3';

    const proc = spawn(pythonPath, [
      pythonScript,
      'query',
      '--query', query,
      '--time-period', '60', // 1 hour for validation
      '--max-results', '10', // Limit results for validation
      '--compartment-id', CONFIG.compartmentId!
    ], {
      env: {
        ...process.env,
        LOGAN_REGION: CONFIG.region
      }
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      resolve({
        success: false,
        error: 'Query timed out',
        executionTimeMs: Date.now() - startTime
      });
    }, timeoutMs);

    proc.on('close', (code) => {
      clearTimeout(timer);
      const executionTimeMs = Date.now() - startTime;

      if (code !== 0) {
        resolve({
          success: false,
          error: stderr || `Process exited with code ${code}`,
          executionTimeMs
        });
        return;
      }

      try {
        const result = JSON.parse(stdout);
        if (result.error) {
          resolve({
            success: false,
            error: result.error,
            executionTimeMs
          });
        } else {
          resolve({
            success: true,
            recordCount: result.results?.length || result.record_count || 0,
            executionTimeMs
          });
        }
      } catch {
        // If not JSON, check for success indicators
        if (stdout.includes('results') || stdout.includes('Records:')) {
          resolve({
            success: true,
            recordCount: 0,
            executionTimeMs
          });
        } else {
          resolve({
            success: false,
            error: stderr || 'Failed to parse response',
            executionTimeMs
          });
        }
      }
    });
  });
}

/**
 * Validate a single query
 */
async function validateQuery(query: PredefinedQuery): Promise<QueryResult> {
  const result: QueryResult = {
    id: query.id,
    name: query.name,
    category: query.category,
    status: 'skipped',
    query: query.query
  };

  if (CONFIG.dryRun) {
    console.log(`\n[DRY RUN] ${query.id}`);
    console.log(`  Category: ${query.category}`);
    console.log(`  Query: ${query.query.substring(0, 100)}...`);
    result.status = 'skipped';
    return result;
  }

  console.log(`\nValidating: ${query.id}`);
  if (CONFIG.debug) {
    console.log(`  Query: ${query.query}`);
  }

  try {
    const execResult = await executeQuery(query.query, CONFIG.timeout);
    result.executionTimeMs = execResult.executionTimeMs;

    if (execResult.success) {
      result.status = 'success';
      result.recordCount = execResult.recordCount;
      console.log(`  ✓ Success (${execResult.executionTimeMs}ms, ${execResult.recordCount} records)`);
    } else if (execResult.error?.includes('timed out')) {
      result.status = 'timeout';
      result.error = execResult.error;
      console.log(`  ⏱ Timeout after ${CONFIG.timeout}ms`);
    } else {
      result.status = 'error';
      result.error = execResult.error;
      console.log(`  ✗ Error: ${execResult.error?.substring(0, 100)}`);
    }
  } catch (error) {
    result.status = 'error';
    result.error = error instanceof Error ? error.message : String(error);
    console.log(`  ✗ Exception: ${result.error}`);
  }

  return result;
}

/**
 * Main validation function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('OCI Logging Analytics Query Validation');
  console.log('='.repeat(60));

  // Check prerequisites
  if (!CONFIG.compartmentId && !CONFIG.dryRun) {
    console.error('\nError: OCI_COMPARTMENT_ID environment variable is required');
    console.error('Set it with: export OCI_COMPARTMENT_ID="ocid1.compartment.oc1..xxx"');
    process.exit(1);
  }

  // Select queries to validate
  let queriesToValidate: PredefinedQuery[];

  if (CONFIG.queryId) {
    const query = getQueryById(CONFIG.queryId);
    if (!query) {
      console.error(`\nError: Query not found: ${CONFIG.queryId}`);
      console.error('Available query IDs:');
      ALL_PREDEFINED_QUERIES.forEach(q => console.error(`  - ${q.id}`));
      process.exit(1);
    }
    queriesToValidate = [query];
  } else if (CONFIG.category) {
    queriesToValidate = getQueriesByCategory(CONFIG.category);
    if (queriesToValidate.length === 0) {
      console.error(`\nError: Category not found: ${CONFIG.category}`);
      console.error('Available categories:');
      QUERY_CATEGORIES.forEach(c => console.error(`  - ${c.id}: ${c.name}`));
      process.exit(1);
    }
  } else {
    queriesToValidate = ALL_PREDEFINED_QUERIES;
  }

  console.log(`\nConfiguration:`);
  console.log(`  Compartment: ${CONFIG.compartmentId || '(dry run)'}`);
  console.log(`  Region: ${CONFIG.region}`);
  console.log(`  Timeout: ${CONFIG.timeout}ms`);
  console.log(`  Dry Run: ${CONFIG.dryRun}`);
  console.log(`  Queries to validate: ${queriesToValidate.length}`);

  if (CONFIG.category) {
    console.log(`  Category filter: ${CONFIG.category}`);
  }
  if (CONFIG.queryId) {
    console.log(`  Query filter: ${CONFIG.queryId}`);
  }

  console.log('\n' + '-'.repeat(60));

  // Run validation
  const results: QueryResult[] = [];

  for (const query of queriesToValidate) {
    const result = await validateQuery(query);
    results.push(result);
  }

  // Generate report
  const report: ValidationReport = {
    timestamp: new Date().toISOString(),
    compartmentId: CONFIG.compartmentId || 'dry-run',
    region: CONFIG.region,
    totalQueries: results.length,
    successful: results.filter(r => r.status === 'success').length,
    failed: results.filter(r => r.status === 'error').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    timedOut: results.filter(r => r.status === 'timeout').length,
    results
  };

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('Validation Summary');
  console.log('='.repeat(60));
  console.log(`Total:     ${report.totalQueries}`);
  console.log(`Successful: ${report.successful} ✓`);
  console.log(`Failed:    ${report.failed} ✗`);
  console.log(`Timed Out: ${report.timedOut} ⏱`);
  console.log(`Skipped:   ${report.skipped}`);

  // List failures
  const failures = results.filter(r => r.status === 'error' || r.status === 'timeout');
  if (failures.length > 0) {
    console.log('\nFailed Queries:');
    for (const failure of failures) {
      console.log(`  - ${failure.id}: ${failure.error?.substring(0, 80)}`);
    }
  }

  // Write output file
  if (CONFIG.outputFile) {
    fs.writeFileSync(CONFIG.outputFile, JSON.stringify(report, null, 2));
    console.log(`\nResults written to: ${CONFIG.outputFile}`);
  }

  // Exit code based on results
  if (report.failed > 0 || report.timedOut > 0) {
    process.exit(1);
  }
}

// Run
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
