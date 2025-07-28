import * as oci from 'oci-sdk';
import { promises as fs } from 'fs';
import { homedir } from 'os';
import path from 'path';
import { spawn } from 'child_process';

export interface QueryRequest {
  query: string;
  timeRange?: string;
  compartmentId?: string;
  environment?: string;
  limit?: number;
}

export interface QueryResult {
  totalCount: number;
  data: any[];
  executionTime: number;
  queryId?: string;
  success: boolean;
  error?: string;
  queryUsed?: string;
  arePartialResults?: boolean;
}

export interface ConnectionStatus {
  connected: boolean;
  authMethod: string;
  region: string;
  compartmentId: string;
  details: string;
}

export class LogAnalyticsClient {
  private client: oci.loganalytics.LogAnalyticsClient | null = null;
  private provider: any = null;
  private config: any = {};
  private namespace: string = '';

  constructor() {
    // Don't wait for initialization in constructor
    this.initializeClient().catch(error => {
      console.error('Failed to initialize OCI client:', error);
    });
  }

  private async initializeClient() {
    try {
      // Try to load OCI config
      await this.loadOCIConfig();
      
      // Initialize authentication provider
      await this.initializeAuth();
      
      // Create LogAnalytics client
      if (this.provider) {
        this.client = new oci.loganalytics.LogAnalyticsClient({
          authenticationDetailsProvider: this.provider
        });
      }

      // Get namespace
      this.namespace = await this.getNamespace();
    } catch (error) {
      console.error('Failed to initialize OCI client:', error);
    }
  }

  private async loadOCIConfig() {
    try {
      const configPath = path.join(homedir(), '.oci', 'config');
      const configContent = await fs.readFile(configPath, 'utf8');
      
      // Parse OCI config file
      const lines = configContent.split('\n');
      let currentProfile = 'DEFAULT';
      const profiles: { [key: string]: any } = {};
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          currentProfile = trimmed.slice(1, -1);
          profiles[currentProfile] = {};
        } else if (trimmed.includes('=')) {
          const [key, value] = trimmed.split('=', 2);
          if (profiles[currentProfile]) {
            profiles[currentProfile][key.trim()] = value.trim();
          }
        }
      }
      
      this.config = profiles['DEFAULT'] || profiles[Object.keys(profiles)[0]] || {};
    } catch (error) {
      console.error('Failed to load OCI config:', error);
      // Try environment variables as fallback
      this.config = {
        user: process.env.OCI_USER_ID,
        fingerprint: process.env.OCI_FINGERPRINT,
        tenancy: process.env.OCI_TENANCY_ID,
        region: process.env.OCI_REGION || 'us-ashburn-1',
        key_file: process.env.OCI_KEY_FILE,
        compartment_id: process.env.OCI_COMPARTMENT_ID
      };
    }
  }

  private async initializeAuth() {
    try {
      // Try instance principal first (for OCI compute instances)
      if (await this.isRunningOnOCI()) {
        this.provider = new oci.ConfigFileAuthenticationDetailsProvider();
        return;
      }

      // Use config file authentication as default
      if (this.config.user && this.config.key_file) {
        this.provider = new oci.ConfigFileAuthenticationDetailsProvider();
      } else {
        // Fallback to default config file auth
        this.provider = new oci.ConfigFileAuthenticationDetailsProvider();
      }
    } catch (error) {
      console.error('Failed to initialize authentication:', error);
    }
  }

  private async isRunningOnOCI(): Promise<boolean> {
    try {
      // Try to access instance metadata service
      const response = await fetch('http://169.254.169.254/opc/v2/instance/', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer Oracle' },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Execute query by calling the standalone Python client
   */
  async executeQuery(request: QueryRequest): Promise<QueryResult> {
    const startTime = Date.now();
    
    try {
      
      // Process query - fix common OCI API compatibility issues
      let processedQuery = request.query;
      processedQuery = this.fixQuerySyntax(processedQuery);

      const timeRangeMinutes = this.parseTimeRange(request.timeRange || '24h');

      // Get the path to our internal Python client using absolute path
      const pythonScriptPath = '/Users/abirzu/dev/mcp-oci-logan-server/python/logan_client.py';

      // Call the internal Python Logan client
      const pythonArgs = [
        pythonScriptPath,
        'query',
        '--query', processedQuery,
        '--time-period', timeRangeMinutes.toString()
      ];

      console.error('MCP DEBUG: Executing query via Python client:', processedQuery);
      console.error('MCP DEBUG: Time range:', timeRangeMinutes, 'minutes');
      
      // Also write to a debug file for troubleshooting
      try {
        const fsSync = require('fs');
        const debugInfo = {
          timestamp: new Date().toISOString(),
          query: processedQuery,
          timeRange: timeRangeMinutes,
          args: pythonArgs
        };
        fsSync.writeFileSync('/tmp/mcp-debug.log', JSON.stringify(debugInfo, null, 2) + '\n', { flag: 'a' });
      } catch (e) {
        console.error('Failed to write debug log:', e);
      }

      if (request.limit) {
        pythonArgs.push('--max-count', request.limit.toString());
      }

      return new Promise((resolve) => {
        console.error('MCP DEBUG: About to spawn process with:', {
          command: '/Users/abirzu/dev/mcp-oci-logan-server/python/venv/bin/python',
          args: pythonArgs,
          cwd: '/Users/abirzu/dev/mcp-oci-logan-server/python'
        });
        
        const pythonProcess = spawn('/Users/abirzu/dev/mcp-oci-logan-server/python/venv/bin/python', pythonArgs, {
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: '/Users/abirzu/dev/mcp-oci-logan-server/python'
        });

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        pythonProcess.on('close', (code) => {
          const executionTime = Date.now() - startTime;

          // Debug logging
          try {
            const fs = require('fs');
            const debugResult = {
              timestamp: new Date().toISOString(),
              code,
              stdout: stdout.substring(0, 500), // First 500 chars
              stderr: stderr.substring(0, 500),
              executionTime
            };
            fs.writeFileSync('/tmp/mcp-debug.log', JSON.stringify(debugResult, null, 2) + '\n', { flag: 'a' });
          } catch (e) {
            console.error('Failed to write debug result:', e);
          }

          if (code === 0) {
            try {
              const result = JSON.parse(stdout);
              
              if (result.success) {
                console.error('MCP DEBUG: Python query successful:', {
                  totalCount: result.results?.length || 0,
                  executionTime: result.execution_time || executionTime
                });

                resolve({
                  success: true,
                  totalCount: result.results?.length || 0,
                  data: result.results || [],
                  executionTime,
                  queryUsed: processedQuery,
                  arePartialResults: result.are_partial_results || false
                });
              } else {
                console.error('MCP DEBUG: Python client returned error:', result.error);
                resolve({
                  success: false,
                  error: result.error || 'Python client returned error',
                  totalCount: 0,
                  data: [],
                  executionTime,
                  queryUsed: processedQuery
                });
              }
            } catch (parseError) {
              console.error('MCP DEBUG: Parse error:', parseError, 'Raw stdout:', stdout.substring(0, 200));
              resolve({
                success: false,
                error: `Failed to parse Python response: ${parseError}`,
                totalCount: 0,
                data: [],
                executionTime,
                queryUsed: processedQuery
              });
            }
          } else {
            console.error('MCP DEBUG: Python process failed:', code, stderr);
            resolve({
              success: false,
              error: `Python client failed with code ${code}: ${stderr}`,
              totalCount: 0,
              data: [],
              executionTime,
              queryUsed: processedQuery
            });
          }
        });

        pythonProcess.on('error', (error) => {
          console.error('MCP DEBUG: Python process error event:', error);
          resolve({
            success: false,
            error: `Failed to start Python client: ${error.message}`,
            totalCount: 0,
            data: [],
            executionTime: Date.now() - startTime,
            queryUsed: processedQuery
          });
        });

        // Add immediate debug check
        pythonProcess.on('spawn', () => {
          console.error('MCP DEBUG: Python process spawned successfully');
        });
      });

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('Query execution failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        totalCount: 0,
        data: [],
        executionTime,
        queryUsed: request.query
      };
    }
  }

  /**
   * Check if query already has time filtering
   */
  private hasTimeFilter(query: string): boolean {
    const queryLower = query.toLowerCase();
    return queryLower.includes('time >') || 
           queryLower.includes('daterelative') || 
           queryLower.includes('timefilter') ||
           queryLower.includes('datetime >');
  }


  /**
   * Fix common OCI Logging Analytics query syntax issues
   * This mirrors the _fix_query_syntax method from logan_client.py
   */
  private fixQuerySyntax(query: string): string {
    let fixedQuery = query;

    // Fix != null syntax to proper OCI syntax
    fixedQuery = fixedQuery.replace(/!= null/g, '!= ""').replace(/is not null/g, '!= ""');
    
    // Fix Action field syntax
    fixedQuery = fixedQuery.replace(/Action in \(drop, reject\)/g, "Action in ('drop', 'reject')");
    
    // Fix count(*) to count() - OCI doesn't support count(*)
    fixedQuery = fixedQuery.replace(/stats count\(\*\)/g, "stats count");
    
    // Fix count(field) syntax issues
    const countFieldPattern = /stats count\(['"]?([^')]+)['"]?\)/g;
    if (countFieldPattern.test(fixedQuery)) {
      // For WAF and other specific log sources, use count() without field
      if (fixedQuery.includes('WAF') || fixedQuery.includes('Suricata')) {
        fixedQuery = fixedQuery.replace(countFieldPattern, "stats count");
      } else {
        fixedQuery = fixedQuery.replace(countFieldPattern, "stats count");
      }
    }
    
    // Fix top command syntax
    fixedQuery = fixedQuery.replace(/\| top 10 Count/g, "| sort -Count | head 10");
    
    // Remove problematic lookup commands (but preserve WAF lookups)
    if (fixedQuery.includes('| lookup') && !fixedQuery.includes('WAF') && !fixedQuery.includes('Suricata')) {
      const lookupPos = fixedQuery.indexOf('| lookup');
      if (lookupPos > 0) {
        fixedQuery = fixedQuery.substring(0, lookupPos).trim();
      }
    }

    return fixedQuery;
  }

  /**
   * Parse time range string to minutes
   */
  private parseTimeRange(timeRange: string): number {
    const timeMap: { [key: string]: number } = {
      '1h': 60,
      '6h': 360,
      '12h': 720,
      '24h': 1440,
      '1d': 1440,
      '7d': 10080,
      '30d': 43200,
      '1w': 10080,
      '1m': 43200
    };
    
    return timeMap[timeRange] || 1440; // Default to 24 hours
  }

  private async getNamespace(): Promise<string> {
    // Get the object storage namespace (required for LogAnalytics)
    try {
      if (!this.provider) {
        throw new Error('No authentication provider available');
      }

      const objectStorageClient = new oci.objectstorage.ObjectStorageClient({
        authenticationDetailsProvider: this.provider
      });
      
      const response = await objectStorageClient.getNamespace({});
      return (response as any).value || 'default-namespace';
    } catch (error) {
      console.error('Failed to get namespace:', error);
      return process.env.OCI_NAMESPACE || 'default-namespace';
    }
  }

  async checkConnection(testQuery: boolean = true): Promise<ConnectionStatus> {
    // Ensure client is initialized
    if (!this.client || !this.provider) {
      await this.initializeClient();
    }
    
    if (!this.client || !this.provider) {
      return {
        connected: false,
        authMethod: 'None',
        region: 'Unknown',
        compartmentId: 'Unknown',
        details: 'Client not initialized. Check OCI configuration.'
      };
    }

    try {
      const region = await this.provider.getRegion();
      const compartmentId = this.config.compartment_id || this.config.tenancy || 'Unknown';
      
      let authMethod = 'Config File';

      if (testQuery) {
        // Run a simple test query
        const testResult = await this.executeQuery({
          query: '* | head 1',
          timeRange: '1h',
          limit: 1
        });

        return {
          connected: testResult.success,
          authMethod,
          region: region?.regionId || 'Unknown',
          compartmentId,
          details: testResult.success 
            ? `Connection successful. Test query returned ${testResult.totalCount} results in ${testResult.executionTime}ms.`
            : `Connection failed: ${testResult.error}`
        };
      } else {
        return {
          connected: true,
          authMethod,
          region: region?.regionId || 'Unknown',
          compartmentId,
          details: 'Connection established. No test query performed.'
        };
      }
    } catch (error) {
      return {
        connected: false,
        authMethod: 'Unknown',
        region: 'Unknown',
        compartmentId: 'Unknown',
        details: `Connection failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async getAvailableLogSources(): Promise<string[]> {
    try {
      const result = await this.executeQuery({
        query: '* | stats count by "Log Source" | sort -count | head 20',
        timeRange: '7d'
      });

      if (result.success) {
        return result.data.map(item => item['Log Source']).filter(Boolean);
      }
      return [];
    } catch (error) {
      console.error('Failed to get log sources:', error);
      return [];
    }
  }

  async getAvailableFields(logSource?: string): Promise<string[]> {
    try {
      let query = '* | head 1';
      if (logSource) {
        query = `'Log Source' = '${logSource}' | head 1`;
      }

      const result = await this.executeQuery({
        query,
        timeRange: '24h',
        limit: 1
      });

      if (result.success && result.data.length > 0) {
        return Object.keys(result.data[0]);
      }

      return [];
    } catch (error) {
      console.error('Failed to get fields:', error);
      return [];
    }
  }
}