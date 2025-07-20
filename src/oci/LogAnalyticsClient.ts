import * as oci from 'oci-sdk';
import { promises as fs } from 'fs';
import { homedir } from 'os';
import path from 'path';

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
    } catch (error) {
      console.error('Failed to initialize OCI client:', error);
    }
  }

  private async loadOCIConfig() {
    try {
      const configPath = path.join(homedir(), '.oci', 'config');
      const configContent = await fs.readFile(configPath, 'utf8');
      
      // Parse OCI config file
      const lines = configContent.split('\\n');
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
        // Use the available auth provider from OCI SDK
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

  async executeQuery(request: QueryRequest): Promise<QueryResult> {
    // Ensure client is initialized
    if (!this.client) {
      await this.initializeClient();
    }
    
    if (!this.client) {
      throw new Error('OCI LogAnalytics client not initialized');
    }

    const startTime = Date.now();
    
    try {
      const compartmentId = request.compartmentId || this.config.compartment_id || this.config.tenancy;
      
      if (!compartmentId) {
        throw new Error('No compartment ID available. Please configure OCI_COMPARTMENT_ID environment variable or OCI config file.');
      }

      // Build time filter
      const timeFilter = this.buildTimeFilter(request.timeRange || '24h');
      
      // Enhance query with time filter if not present
      let enhancedQuery = request.query;
      if (!enhancedQuery.toLowerCase().includes('time >') && !enhancedQuery.toLowerCase().includes('daterelative')) {
        enhancedQuery = `${enhancedQuery} and ${timeFilter}`;
      }

      // Add limit if specified
      if (request.limit && !enhancedQuery.toLowerCase().includes('| head')) {
        enhancedQuery += ` | head ${request.limit}`;
      }

      const queryRequest: oci.loganalytics.requests.QueryRequest = {
        namespaceName: await this.getNamespace(),
        queryDetails: {
          compartmentId,
          queryString: enhancedQuery,
          subSystem: oci.loganalytics.models.SubSystemName.Log
        }
      };

      const response = await this.client.query(queryRequest);
      
      const executionTime = Date.now() - startTime;
      
      return {
        totalCount: (response as any).queryResult?.items?.length || 0,
        data: (response as any).queryResult?.items || [],
        executionTime,
        queryId: (response as any).queryResult?.queryExecutionId
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('Query execution failed:', error);
      
      return {
        totalCount: 0,
        data: [],
        executionTime,
        queryId: undefined
      };
    }
  }

  private buildTimeFilter(timeRange: string): string {
    // Convert timeRange to OCI format
    const timeMap: { [key: string]: string } = {
      '1h': '1h',
      '6h': '6h',
      '12h': '12h',
      '24h': '24h',
      '1d': '24h',
      '7d': '7d',
      '30d': '30d',
      '1w': '7d',
      '1m': '30d'
    };
    
    const ociTimeRange = timeMap[timeRange] || timeRange;
    return `Time > dateRelative(${ociTimeRange})`;
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
          connected: true,
          authMethod,
          region: region?.regionId || 'Unknown',
          compartmentId,
          details: `Connection successful. Test query returned ${testResult.totalCount} results in ${testResult.executionTime}ms.`
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

      return result.data.map(item => item['Log Source']).filter(Boolean);
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

      if (result.data.length > 0) {
        return Object.keys(result.data[0]);
      }

      return [];
    } catch (error) {
      console.error('Failed to get fields:', error);
      return [];
    }
  }
}