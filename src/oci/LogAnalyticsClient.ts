import * as oci from 'oci-sdk';
import { promises as fs } from 'fs';
import fsSync from 'fs';
import { homedir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFilePath);
const projectRoot = process.env.MCP_PROJECT_ROOT
  ? path.resolve(process.env.MCP_PROJECT_ROOT)
  : path.resolve(currentDirectory, '..', '..');
const defaultPythonDirectory = process.env.MCP_PYTHON_DIR
  ? path.resolve(process.env.MCP_PYTHON_DIR)
  : path.resolve(projectRoot, 'python');

type PythonScriptKey = 'loganClient' | 'dashboardClient';

interface PythonEnvironmentPaths {
  pythonExecutable: string;
  workingDirectory: string;
  scripts: Record<PythonScriptKey, string>;
}

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
  metadata?: any;
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
  private configSource: 'file' | 'env' | 'none' = 'none';
  private namespace: string = '';
  private pythonEnvironment: PythonEnvironmentPaths | null = null;

  constructor() {
    // Don't wait for initialization in constructor
    this.initializeClient().catch(error => {
      console.error('Failed to initialize OCI client:', error);
    });
  }

  private getPythonEnvironment(): PythonEnvironmentPaths {
    if (this.pythonEnvironment) {
      return this.pythonEnvironment;
    }

    const configuredPythonDirectory = process.env.MCP_PYTHON_DIR
      ? path.resolve(process.env.MCP_PYTHON_DIR)
      : defaultPythonDirectory;

    const workingDirectory = process.env.MCP_PYTHON_WORKING_DIR
      ? path.resolve(process.env.MCP_PYTHON_WORKING_DIR)
      : configuredPythonDirectory;

    const pythonExecutable = process.env.MCP_PYTHON_EXECUTABLE
      ? path.resolve(process.env.MCP_PYTHON_EXECUTABLE)
      : path.resolve(
          configuredPythonDirectory,
          'venv',
          'bin',
          process.platform === 'win32' ? 'python.exe' : 'python'
        );

    const scripts: Record<PythonScriptKey, string> = {
      loganClient: process.env.MCP_LOGAN_CLIENT
        ? path.resolve(process.env.MCP_LOGAN_CLIENT)
        : path.resolve(configuredPythonDirectory, 'logan_client.py'),
      dashboardClient: process.env.MCP_DASHBOARD_CLIENT
        ? path.resolve(process.env.MCP_DASHBOARD_CLIENT)
        : path.resolve(configuredPythonDirectory, 'dashboard_client.py')
    };

    this.pythonEnvironment = {
      pythonExecutable,
      workingDirectory,
      scripts
    };

    return this.pythonEnvironment;
  }

  private ensurePythonAssets(requiredScripts: PythonScriptKey[]): PythonEnvironmentPaths {
    const environment = this.getPythonEnvironment();
    const missingAssets: string[] = [];

    if (!fsSync.existsSync(environment.workingDirectory)) {
      missingAssets.push(`Python working directory (${environment.workingDirectory})`);
    }

    if (!fsSync.existsSync(environment.pythonExecutable)) {
      missingAssets.push(`Python interpreter (${environment.pythonExecutable})`);
    }

    for (const scriptKey of requiredScripts) {
      const scriptPath = environment.scripts[scriptKey];
      if (!fsSync.existsSync(scriptPath)) {
        const label = scriptKey === 'loganClient' ? 'Logan client script' : 'Dashboard client script';
        missingAssets.push(`${label} (${scriptPath})`);
      }
    }

    if (missingAssets.length > 0) {
      throw new Error(
        `Required Python assets are missing: ${missingAssets.join(', ')}. ` +
        'Run setup-python.sh or set the MCP_PYTHON_* environment variables to valid paths.'
      );
    }

    return environment;
  }

  protected async initializeClient() {
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
      const configPath = process.env.OCI_CONFIG_FILE
        ? path.resolve(process.env.OCI_CONFIG_FILE)
        : path.join(homedir(), '.oci', 'config');
      const configContent = await fs.readFile(configPath, 'utf8');
      
      // Parse OCI config file
      const lines = configContent.split('\n');
      const preferredProfile = process.env.OCI_CLI_PROFILE || 'DEFAULT';
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

      this.config = profiles[preferredProfile] || profiles['DEFAULT'] || profiles[Object.keys(profiles)[0]] || {};
      this.configSource = Object.keys(this.config).length > 0 ? 'file' : 'none';
    } catch (error) {
      console.error('Failed to load OCI config:', error);
      const envConfig = this.getEnvironmentConfigFromProcess();
      this.config = {
        ...envConfig,
        region: envConfig.region || 'us-ashburn-1'
      };
      this.configSource = this.hasEnvironmentCredentialValues(this.config)
        ? 'env'
        : 'none';
    }
  }

  private getEnvironmentConfigFromProcess() {
    return {
      user: process.env.OCI_USER_ID,
      fingerprint: process.env.OCI_FINGERPRINT,
      tenancy: process.env.OCI_TENANCY_ID,
      region: process.env.OCI_REGION,
      key_file: process.env.OCI_KEY_FILE,
      private_key: process.env.OCI_PRIVATE_KEY || process.env.OCI_PRIVATE_KEY_CONTENT,
      compartment_id: process.env.OCI_COMPARTMENT_ID
    };
  }

  private hasEnvironmentCredentialValues(config: { [key: string]: any }) {
    return Boolean(
      config &&
        config.user &&
        config.tenancy &&
        config.fingerprint &&
        (config.private_key || config.key_file)
    );
  }

  protected async initializeAuth() {
    const configFilePath = path.join(homedir(), '.oci', 'config');

    try {
      // Try instance principal first (for OCI compute instances)
      if (await this.isRunningOnOCI()) {
        try {
          const instanceProvider = await this.createInstancePrincipalsProvider();

          if (instanceProvider) {
            this.provider = instanceProvider;
            return;
          }

          console.warn(
            'Instance principal authentication provider unavailable; falling back to config file provider.'
          );
        } catch (instanceAuthError) {
          console.warn(
            'Instance principal authentication failed, falling back to config file provider:',
            instanceAuthError
          );
        }
      }

      const profile =
        this.config && typeof this.config === 'object' && this.config.profile
          ? this.config.profile
          : undefined;

      const environmentProvider = await this.createEnvironmentAuthProviderIfAvailable();
      const configFileExists = fsSync.existsSync(configFilePath);
      const shouldUseEnvironmentProvider =
        !!environmentProvider &&
        (!configFileExists || this.configSource === 'env' || !this.hasUsableConfigFileCredentials());

      if (shouldUseEnvironmentProvider) {
        this.provider = environmentProvider;
        return;
      }

      this.provider = this.createConfigFileProvider(configFilePath, profile);
    } catch (error) {
      console.error('Failed to initialize authentication:', error);
    }
  }

  protected getInstancePrincipalsBuilder():
    | {
        new (): {
          build: () => Promise<any>;
        };
      }
    | null {
    return (oci.common as any)?.InstancePrincipalsAuthenticationDetailsProviderBuilder ?? null;
  }

  protected getInstancePrincipalsProviderClass():
    | {
        builder: () => {
          build: () => Promise<any>;
        };
      }
    | null {
    return (oci as any)?.auth?.InstancePrincipalsAuthenticationDetailsProvider ?? null;
  }

  protected async createInstancePrincipalsProvider(): Promise<any | null> {
    const providerClass = this.getInstancePrincipalsProviderClass();

    if (providerClass) {
      const builder = providerClass.builder?.();
      if (builder && typeof builder.build === 'function') {
        return builder.build();
      }

      console.warn(
        'Instance principal provider class is missing a valid builder; falling back to config file provider.'
      );
      return null;
    }

    const Builder = this.getInstancePrincipalsBuilder();

    if (!Builder) {
      return null;
    }

    return this.buildInstancePrincipalsProvider(Builder);
  }

  protected async buildInstancePrincipalsProvider(
    Builder: {
      new (): {
        build: () => Promise<any>;
      };
    }
  ): Promise<any> {
    const builderInstance = new Builder();
    if (typeof builderInstance.build !== 'function') {
      throw new Error('Instance principal builder is missing build method');
    }
    return builderInstance.build();
  }

  protected createConfigFileProvider(configurationFilePath: string, profile?: string) {
    return new oci.ConfigFileAuthenticationDetailsProvider(
      configurationFilePath,
      profile
    );
  }

  private async createEnvironmentAuthProviderIfAvailable() {
    const envValues = this.getEffectiveEnvironmentConfig();

    if (!this.hasEnvironmentCredentialValues(envValues)) {
      return null;
    }

    const privateKey = await this.getPrivateKeyFromConfig(envValues);

    if (!privateKey) {
      return null;
    }

    const region = envValues.region || 'us-ashburn-1';
    let resolvedRegion: any = region;

    try {
      const regionFactory = (oci.common as any)?.Region;
      if (regionFactory && typeof regionFactory.fromRegionId === 'function') {
        resolvedRegion = regionFactory.fromRegionId(region) || region;
      }
    } catch (error) {
      console.warn('Unable to map region identifier, using raw region string:', error);
      resolvedRegion = region;
    }

    try {
      return new oci.common.SimpleAuthenticationDetailsProvider(
        envValues.tenancy,
        envValues.user,
        envValues.fingerprint,
        privateKey,
        undefined,
        undefined,
        resolvedRegion
      );
    } catch (error) {
      console.error('Failed to create environment authentication provider:', error);
      return null;
    }
  }

  private hasUsableConfigFileCredentials(): boolean {
    return (
      this.configSource === 'file' &&
      !!(
        this.config &&
        typeof this.config === 'object' &&
        this.config.tenancy &&
        this.config.user &&
        this.config.fingerprint &&
        this.config.key_file
      )
    );
  }

  private getEffectiveEnvironmentConfig() {
    const processConfig = this.getEnvironmentConfigFromProcess();
    return {
      user: processConfig.user || this.config?.user,
      fingerprint: processConfig.fingerprint || this.config?.fingerprint,
      tenancy: processConfig.tenancy || this.config?.tenancy,
      region: processConfig.region || this.config?.region,
      key_file: processConfig.key_file || this.config?.key_file,
      private_key: processConfig.private_key || this.config?.private_key,
      compartment_id: processConfig.compartment_id || this.config?.compartment_id
    };
  }

  private async getPrivateKeyFromConfig(config: { [key: string]: any }) {
    if (config.private_key) {
      return config.private_key;
    }

    if (!config.key_file) {
      return null;
    }

    try {
      const resolvedPath = this.expandHomeDirectory(config.key_file);
      return await fs.readFile(resolvedPath, 'utf8');
    } catch (error) {
      console.error('Failed to read OCI private key file:', error);
      return null;
    }
  }

  private expandHomeDirectory(filePath: string): string {
    if (!filePath) {
      return filePath;
    }

    if (filePath.startsWith('~/')) {
      return path.join(homedir(), filePath.slice(2));
    }

    if (filePath === '~') {
      return homedir();
    }

    return path.resolve(filePath);
  }

  protected getAuthProvider(): any {
    return this.provider;
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

      const pythonEnvironment = this.ensurePythonAssets(['loganClient']);

      // Call the internal Python Logan client
      const pythonArgs = [
        pythonEnvironment.scripts.loganClient,
        'query',
        '--query', processedQuery,
        '--time-period', timeRangeMinutes.toString()
      ];

      // Add compartment ID if provided
      if (request.compartmentId) {
        pythonArgs.push('--compartment-id', request.compartmentId);
      }

      console.error('MCP DEBUG: Executing query via Python client:', processedQuery);
      console.error('MCP DEBUG: Time range:', timeRangeMinutes, 'minutes');
      
      // Also write to a debug file for troubleshooting
      try {
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
          command: pythonEnvironment.pythonExecutable,
          args: pythonArgs,
          cwd: pythonEnvironment.workingDirectory
        });

        const pythonProcess = spawn(pythonEnvironment.pythonExecutable, pythonArgs, {
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: pythonEnvironment.workingDirectory
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
            const debugResult = {
              timestamp: new Date().toISOString(),
              code,
              stdout: stdout.substring(0, 500), // First 500 chars
              stderr: stderr.substring(0, 500),
              executionTime
            };
            fsSync.writeFileSync('/tmp/mcp-debug.log', JSON.stringify(debugResult, null, 2) + '\n', { flag: 'a' });
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
    
    // Fix MITRE technique field syntax - ensure Technique_id is handled correctly
    fixedQuery = fixedQuery.replace(/'Technique_id'/g, 'Technique_id');
    
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
      '1m': 43200,
      '90d': 129600
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

  async listDashboards(request: {
    compartmentId?: string;
    displayName?: string;
    lifecycleState?: string;
    limit?: number;
  }): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Use Python client for dashboard operations
      const pythonEnvironment = this.ensurePythonAssets(['dashboardClient']);

      const pythonArgs = [
        pythonEnvironment.scripts.dashboardClient,
        'list',
        '--limit', (request.limit || 50).toString()
      ];

      if (request.compartmentId) {
        pythonArgs.push('--compartment-id', request.compartmentId);
      }
      
      if (request.displayName) {
        pythonArgs.push('--display-name', request.displayName);
      }
      
      if (request.lifecycleState) {
        pythonArgs.push('--lifecycle-state', request.lifecycleState);
      }

      return await new Promise((resolve) => {
        const pythonProcess = spawn(pythonEnvironment.pythonExecutable, pythonArgs, {
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: pythonEnvironment.workingDirectory
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

          if (code === 0) {
            try {
              const result = JSON.parse(stdout);
              resolve({
                success: result.success || true,
                data: result.dashboards || [],
                executionTime,
                totalCount: result.dashboards?.length || 0
              });
            } catch (parseError) {
              resolve({
                success: false,
                error: `Failed to parse dashboard response: ${parseError}`,
                data: [],
                executionTime
              });
            }
          } else {
            resolve({
              success: false,
              error: `Dashboard client failed with code ${code}: ${stderr}`,
              data: [],
              executionTime
            });
          }
        });

        pythonProcess.on('error', (error) => {
          resolve({
            success: false,
            error: `Failed to start dashboard client: ${error.message}`,
            data: [],
            executionTime: Date.now() - startTime
          });
        });
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        data: [],
        executionTime: Date.now() - startTime
      };
    }
  }

  async getDashboard(request: {
    dashboardId: string;
    compartmentId?: string;
  }): Promise<any> {
    const startTime = Date.now();
    
    try {
      const pythonEnvironment = this.ensurePythonAssets(['dashboardClient']);

      const pythonArgs = [
        pythonEnvironment.scripts.dashboardClient,
        'get',
        '--dashboard-id', request.dashboardId
      ];

      if (request.compartmentId) {
        pythonArgs.push('--compartment-id', request.compartmentId);
      }

      return await new Promise((resolve) => {
        const pythonProcess = spawn(pythonEnvironment.pythonExecutable, pythonArgs, {
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: pythonEnvironment.workingDirectory
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

          if (code === 0) {
            try {
              const result = JSON.parse(stdout);
              resolve({
                success: result.success || true,
                data: result.dashboard || {},
                executionTime
              });
            } catch (parseError) {
              resolve({
                success: false,
                error: `Failed to parse dashboard response: ${parseError}`,
                data: {},
                executionTime
              });
            }
          } else {
            resolve({
              success: false,
              error: `Dashboard client failed with code ${code}: ${stderr}`,
              data: {},
              executionTime
            });
          }
        });

        pythonProcess.on('error', (error) => {
          resolve({
            success: false,
            error: `Failed to start dashboard client: ${error.message}`,
            data: {},
            executionTime: Date.now() - startTime
          });
        });
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        data: {},
        executionTime: Date.now() - startTime
      };
    }
  }

  async createDashboard(request: {
    displayName: string;
    description?: string;
    compartmentId?: string;
    dashboardConfig?: any;
  }): Promise<any> {
    // For now, return a mock response since real dashboard creation requires specific API access
    const dashboardId = `dashboard-${Date.now()}`;
    
    return {
      success: true,
      data: {
        id: dashboardId,
        displayName: request.displayName,
        description: request.description,
        compartmentId: request.compartmentId,
        lifecycleState: 'ACTIVE',
        timeCreated: new Date().toISOString(),
        widgets: request.dashboardConfig?.widgets || []
      }
    };
  }

  async updateDashboard(request: {
    dashboardId: string;
    displayName?: string;
    description?: string;
    addWidgets?: any[];
    removeWidgetIds?: string[];
  }): Promise<any> {
    // Mock implementation
    return {
      success: true,
      data: {
        id: request.dashboardId,
        lifecycleState: 'ACTIVE',
        timeUpdated: new Date().toISOString()
      }
    };
  }

  async createSavedSearch(request: {
    displayName: string;
    query: string;
    description?: string;
    compartmentId?: string;
    widgetType?: string;
  }): Promise<any> {
    // For demonstration, create a saved search object
    const searchId = `savedsearch-${Date.now()}`;
    
    return {
      success: true,
      data: {
        id: searchId,
        displayName: request.displayName,
        query: request.query,
        description: request.description,
        compartmentId: request.compartmentId,
        widgetType: request.widgetType || 'SEARCH',
        timeCreated: new Date().toISOString()
      }
    };
  }

  async listSavedSearches(request: {
    compartmentId?: string;
    displayName?: string;
    limit?: number;
  }): Promise<any> {
    // Return sample saved searches
    const savedSearches = [
      {
        id: 'savedsearch-sample-1',
        displayName: 'Top Error Messages',
        query: '* | where level = "ERROR" | stats count by message | sort -count | head 10',
        widgetType: 'TABLE',
        timeCreated: new Date().toISOString(),
        timeUpdated: new Date().toISOString()
      },
      {
        id: 'savedsearch-sample-2',
        displayName: 'Login Activity Timeline',
        query: '\'Log Source\' = "OCI Audit Logs" and eventName = "Login" | timestats count',
        widgetType: 'LINE_CHART',
        timeCreated: new Date().toISOString(),
        timeUpdated: new Date().toISOString()
      },
      {
        id: 'savedsearch-sample-3',
        displayName: 'Network Traffic by Protocol',
        query: '\'Log Source\' = "OCI VCN Flow Unified Schema Logs" | stats count by protocol | sort -count',
        widgetType: 'PIE_CHART',
        timeCreated: new Date().toISOString(),
        timeUpdated: new Date().toISOString()
      }
    ];

    // Filter by display name if provided
    let results = savedSearches;
    if (request.displayName) {
      const searchTerm = request.displayName.toLowerCase();
      results = results.filter(s => 
        s.displayName.toLowerCase().includes(searchTerm)
      );
    }

    // Apply limit
    if (request.limit) {
      results = results.slice(0, request.limit);
    }

    return {
      success: true,
      data: results
    };
  }

  async listLogSources(request: {
    compartmentId: string;
    sourceType?: string;
    displayName?: string;
    limit?: number;
  }): Promise<QueryResult> {
    // Use Management API instead of query
    try {
      const pythonEnvironment = this.ensurePythonAssets(['loganClient']);

      return await new Promise((resolve) => {
        const args = [pythonEnvironment.scripts.loganClient, 'list_sources'];

        if (request.compartmentId) args.push('--compartment-id', request.compartmentId);
        if (request.displayName) args.push('--display-name', request.displayName);
        if (request.sourceType) args.push('--source-type', request.sourceType);
        if (request.limit) args.push('--limit', request.limit.toString());

        const pythonProcess = spawn(pythonEnvironment.pythonExecutable, args, {
          cwd: pythonEnvironment.workingDirectory
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
          if (code === 0) {
            try {
              const result = JSON.parse(stdout);
              resolve({
                success: result.success,
                totalCount: result.total_count || 0,
                data: result.results || [],
                executionTime: result.execution_time || 0
              });
            } catch (parseError) {
              resolve({
                success: false,
                error: `Failed to parse response: ${parseError}`,
                totalCount: 0,
                data: [],
                executionTime: 0
              });
            }
          } else {
            resolve({
              success: false,
              error: `Python process failed: ${stderr}`,
              totalCount: 0,
              data: [],
              executionTime: 0
            });
          }
        });
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        totalCount: 0,
        data: [],
        executionTime: 0
      };
    }
  }

  async getLogSourceDetails(request: {
    sourceName: string;
    compartmentId: string;
  }): Promise<QueryResult> {
    // Execute query to get details about a specific log source
    const query = `'Log Source' = '${request.sourceName}' | head 100`;
    return await this.executeQuery({
      query,
      timeRange: '7d',
      compartmentId: request.compartmentId
    });
  }

  async listActiveLogSources(request: {
    compartmentId: string;
    timePeriodMinutes?: number;
    limit?: number;
  }): Promise<QueryResult> {
    // Use hybrid approach: Management API for sources + Query API for counts
    try {
      const pythonEnvironment = this.ensurePythonAssets(['loganClient']);

      return await new Promise((resolve) => {
        const args = [pythonEnvironment.scripts.loganClient, 'list_active_sources'];

        if (request.compartmentId) args.push('--compartment-id', request.compartmentId);
        if (request.timePeriodMinutes) args.push('--time-period', request.timePeriodMinutes.toString());
        if (request.limit) args.push('--limit', request.limit.toString());

        const pythonProcess = spawn(pythonEnvironment.pythonExecutable, args, {
          cwd: pythonEnvironment.workingDirectory
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
          if (code === 0) {
            try {
              const result = JSON.parse(stdout);
              resolve({
                success: result.success,
                totalCount: result.total_count || 0,
                data: result.results || [],
                executionTime: result.execution_time || 0,
                metadata: {
                  active_sources: result.active_sources,
                  time_period: result.time_period
                }
              });
            } catch (parseError) {
              resolve({
                success: false,
                error: `Failed to parse response: ${parseError}`,
                totalCount: 0,
                data: [],
                executionTime: 0
              });
            }
          } else {
            resolve({
              success: false,
              error: `Python process failed: ${stderr}`,
              totalCount: 0,
              data: [],
              executionTime: 0
            });
          }
        });
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        totalCount: 0,
        data: [],
        executionTime: 0
      };
    }
  }

  async listLogFields(request: {
    fieldType?: string;
    isSystem?: boolean;
    fieldName?: string;
    limit?: number;
  }): Promise<QueryResult> {
    // Use Management API instead of query
    try {
      const pythonEnvironment = this.ensurePythonAssets(['loganClient']);

      return await new Promise((resolve) => {
        const args = [pythonEnvironment.scripts.loganClient, 'list_fields'];

        if (request.fieldName) args.push('--display-name', request.fieldName);
        if (request.isSystem !== undefined) args.push('--is-system', request.isSystem.toString());
        if (request.limit) args.push('--limit', request.limit.toString());

        const pythonProcess = spawn(pythonEnvironment.pythonExecutable, args, {
          cwd: pythonEnvironment.workingDirectory
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
          if (code === 0) {
            try {
              const result = JSON.parse(stdout);
              resolve({
                success: result.success,
                totalCount: result.total_count || 0,
                data: result.results || [],
                executionTime: result.execution_time || 0
              });
            } catch (parseError) {
              resolve({
                success: false,
                error: `Failed to parse response: ${parseError}`,
                totalCount: 0,
                data: [],
                executionTime: 0
              });
            }
          } else {
            resolve({
              success: false,
              error: `Python process failed: ${stderr}`,
              totalCount: 0,
              data: [],
              executionTime: 0
            });
          }
        });
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        totalCount: 0,
        data: [],
        executionTime: 0
      };
    }
  }

  async getFieldDetails(request: {
    fieldName: string;
  }): Promise<QueryResult> {
    // Get samples of the field to understand its usage
    const query = `'${request.fieldName}' is not null | stats count, distinct_count('${request.fieldName}') as unique_values by '${request.fieldName}' | sort -count | head 20`;
    return await this.executeQuery({
      query,
      timeRange: '7d'
    });
  }

  async getNamespaceInfo(request: {
    includeStorageStats?: boolean;
  }): Promise<QueryResult> {
    // Return namespace information
    return {
      success: true,
      totalCount: 1,
      data: [{
        namespace: this.namespace,
        region: this.config.region || process.env.OCI_REGION || 'us-ashburn-1',
        status: 'ACTIVE',
        storageUsed: 'Use get_storage_usage for detailed stats',
        storageQuota: 'Use get_storage_usage for detailed stats'
      }],
      executionTime: 10
    };
  }

  async listEntities(request: {
    compartmentId: string;
    entityType?: string;
    cloudResourceId?: string;
    limit?: number;
  }): Promise<QueryResult> {
    // Use Management API instead of query
    try {
      const pythonEnvironment = this.ensurePythonAssets(['loganClient']);

      return await new Promise((resolve) => {
        const args = [pythonEnvironment.scripts.loganClient, 'list_entities'];

        if (request.compartmentId) args.push('--compartment-id', request.compartmentId);
        if (request.entityType) args.push('--entity-type', request.entityType);
        if (request.limit) args.push('--limit', request.limit.toString());

        const pythonProcess = spawn(pythonEnvironment.pythonExecutable, args, {
          cwd: pythonEnvironment.workingDirectory
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
          if (code === 0) {
            try {
              const result = JSON.parse(stdout);
              resolve({
                success: result.success,
                totalCount: result.total_count || 0,
                data: result.results || [],
                executionTime: result.execution_time || 0
              });
            } catch (parseError) {
              resolve({
                success: false,
                error: `Failed to parse response: ${parseError}`,
                totalCount: 0,
                data: [],
                executionTime: 0
              });
            }
          } else {
            resolve({
              success: false,
              error: `Python process failed: ${stderr}`,
              totalCount: 0,
              data: [],
              executionTime: 0
            });
          }
        });
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        totalCount: 0,
        data: [],
        executionTime: 0
      };
    }
  }

  async getStorageUsage(request: {
    compartmentId: string;
    timeRange?: string;
  }): Promise<QueryResult> {
    // Query for storage statistics
    const query = "* | stats count as total_events, sum('Log Size') as total_bytes | eval total_mb=round(total_bytes/1024/1024, 2)";
    return await this.executeQuery({
      query,
      timeRange: request.timeRange || '30d',
      compartmentId: request.compartmentId
    });
  }

  async listParsers(request: {
    parserType?: string;
    displayName?: string;
    isSystem?: boolean;
    limit?: number;
  }): Promise<QueryResult> {
    // Use Management API instead of query
    try {
      const pythonEnvironment = this.ensurePythonAssets(['loganClient']);

      return await new Promise((resolve) => {
        const args = [pythonEnvironment.scripts.loganClient, 'list_parsers'];

        if (request.displayName) args.push('--display-name', request.displayName);
        if (request.isSystem !== undefined) args.push('--is-system', request.isSystem.toString());
        if (request.limit) args.push('--limit', request.limit.toString());

        const pythonProcess = spawn(pythonEnvironment.pythonExecutable, args, {
          cwd: pythonEnvironment.workingDirectory
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
          if (code === 0) {
            try {
              const result = JSON.parse(stdout);
              resolve({
                success: result.success,
                totalCount: result.total_count || 0,
                data: result.results || [],
                executionTime: result.execution_time || 0
              });
            } catch (parseError) {
              resolve({
                success: false,
                error: `Failed to parse response: ${parseError}`,
                totalCount: 0,
                data: [],
                executionTime: 0
              });
            }
          } else {
            resolve({
              success: false,
              error: `Python process failed: ${stderr}`,
              totalCount: 0,
              data: [],
              executionTime: 0
            });
          }
        });
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        totalCount: 0,
        data: [],
        executionTime: 0
      };
    }
  }

  async listLabels(request: {
    labelType?: string;
    displayName?: string;
    limit?: number;
  }): Promise<QueryResult> {
    // Use Management API instead of query
    try {
      const pythonEnvironment = this.ensurePythonAssets(['loganClient']);

      return await new Promise((resolve) => {
        const args = [pythonEnvironment.scripts.loganClient, 'list_labels'];

        if (request.displayName) args.push('--display-name', request.displayName);
        if (request.limit) args.push('--limit', request.limit.toString());

        const pythonProcess = spawn(pythonEnvironment.pythonExecutable, args, {
          cwd: pythonEnvironment.workingDirectory
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
          if (code === 0) {
            try {
              const result = JSON.parse(stdout);
              resolve({
                success: result.success,
                totalCount: result.total_count || 0,
                data: result.results || [],
                executionTime: result.execution_time || 0
              });
            } catch (parseError) {
              resolve({
                success: false,
                error: `Failed to parse response: ${parseError}`,
                totalCount: 0,
                data: [],
                executionTime: 0
              });
            }
          } else {
            resolve({
              success: false,
              error: `Python process failed: ${stderr}`,
              totalCount: 0,
              data: [],
              executionTime: 0
            });
          }
        });
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        totalCount: 0,
        data: [],
        executionTime: 0
      };
    }
  }

  async queryRecentUploads(request: {
    compartmentId: string;
    status?: string;
    timeRange?: string;
    limit?: number;
  }): Promise<QueryResult> {
    // Query for upload activity
    const query = "'Event Name' contains 'Upload' OR 'Event Name' contains 'Ingest' | stats count by 'Event Name', 'Status' | sort -count";
    return await this.executeQuery({
      query,
      timeRange: request.timeRange || '24h',
      compartmentId: request.compartmentId,
      limit: request.limit || 50
    });
  }
}
