import { promises as fs } from 'fs';
import path from 'path';

export interface LoganQuery {
  id: string;
  name: string;
  query: string;
  category: string;
  description?: string;
  status?: string;
}

export interface IPAnalysisQuery {
  type: string;
  description: string;
  query: string;
}

export class QueryTransformer {
  private loganQueries: { [category: string]: LoganQuery[] } = {};
  private loaded = false;

  constructor() {
    this.loadQueries();
  }

  private async loadQueries() {
    if (this.loaded) return;

    try {
      // Try to load queries from Logan Security Dashboard project
      const loganProjectPath = '/Users/abirzu/dev/logan-security-dashboard';
      await this.loadFromLoganProject(loganProjectPath);
      this.loaded = true;
    } catch (error) {
      console.error('Failed to load Logan queries, using defaults:', error);
      this.loadDefaultQueries();
      this.loaded = true;
    }
  }

  private async loadFromLoganProject(projectPath: string) {
    // Load MITRE queries
    const mitreQueriesPath = path.join(projectPath, 'config', 'mitre-enhanced-queries.json');
    try {
      const mitreContent = await fs.readFile(mitreQueriesPath, 'utf8');
      const mitreData = JSON.parse(mitreContent);
      
      this.loganQueries['mitre-attack'] = mitreData.queries || [];
    } catch (error) {
      console.error('Failed to load MITRE queries:', error);
    }

    // Load working queries
    const workingQueriesPath = path.join(projectPath, 'config', 'working-queries.json');
    try {
      const workingContent = await fs.readFile(workingQueriesPath, 'utf8');
      const workingData = JSON.parse(workingContent);
      
      // Organize by category
      Object.entries(workingData).forEach(([category, queries]) => {
        if (Array.isArray(queries)) {
          this.loganQueries[category] = queries as LoganQuery[];
        }
      });
    } catch (error) {
      console.error('Failed to load working queries:', error);
    }
  }

  private loadDefaultQueries() {
    this.loganQueries = {
      'security': [
        {
          id: 'failed_logins',
          name: 'Failed Login Attempts',
          query: "'Event Name' = 'UserLoginFailed' and Time > dateRelative(24h) | stats count by 'User Name', 'IP Address' | sort -count",
          category: 'security',
          description: 'Find failed login attempts in the last 24 hours'
        },
        {
          id: 'privilege_escalation',
          name: 'Privilege Escalation Events',
          query: "'Event Name' contains 'RoleAssign' or 'Event Name' contains 'PrivilegeUse' and Time > dateRelative(24h) | stats count by 'User Name', 'Event Name'",
          category: 'security',
          description: 'Detect potential privilege escalation activities'
        }
      ],
      'network': [
        {
          id: 'suspicious_connections',
          name: 'Suspicious Network Connections',
          query: "'Log Source' = 'VCN Flow Logs' and 'Action' = 'ACCEPT' and Time > dateRelative(24h) | stats count by 'Source IP', 'Destination IP' | sort -count",
          category: 'network',
          description: 'Find high-volume network connections'
        }
      ],
      'authentication': [
        {
          id: 'admin_logins',
          name: 'Administrator Logins',
          query: "'Event Name' = 'UserLogin' and 'User Name' contains 'admin' and Time > dateRelative(24h) | stats count by 'User Name', 'IP Address'",
          category: 'authentication',
          description: 'Monitor administrator account logins'
        }
      ]
    };
  }

  async transformSearchToQuery(searchTerm: string, eventType: string): Promise<string> {
    await this.loadQueries();

    const lowerSearchTerm = searchTerm.toLowerCase();
    
    // Security event patterns
    if (eventType === 'login' || lowerSearchTerm.includes('login') || lowerSearchTerm.includes('authentication')) {
      if (lowerSearchTerm.includes('failed') || lowerSearchTerm.includes('unsuccessful')) {
        return "'Event Name' = 'UserLoginFailed' and Time > dateRelative(24h) | stats count by 'User Name', 'IP Address' | sort -count | head 100";
      }
      return "'Event Name' = 'UserLogin' and Time > dateRelative(24h) | stats count by 'User Name', 'IP Address' | sort -count | head 100";
    }

    if (eventType === 'privilege_escalation' || lowerSearchTerm.includes('privilege') || lowerSearchTerm.includes('escalation')) {
      return "'Event Name' contains 'RoleAssign' or 'Event Name' contains 'PrivilegeUse' and Time > dateRelative(24h) | stats count by 'User Name', 'Event Name' | sort -count | head 100";
    }

    if (eventType === 'network_anomaly' || lowerSearchTerm.includes('network') || lowerSearchTerm.includes('connection')) {
      return "'Log Source' = 'VCN Flow Logs' and Time > dateRelative(24h) | stats count by 'Source IP', 'Destination IP', 'Action' | sort -count | head 100";
    }

    if (eventType === 'malware' || lowerSearchTerm.includes('malware') || lowerSearchTerm.includes('virus')) {
      return "'Event Name' contains 'Malware' or 'Event Name' contains 'Virus' and Time > dateRelative(24h) | stats count by 'Event Name', 'File Path' | sort -count | head 100";
    }

    if (eventType === 'data_exfiltration' || lowerSearchTerm.includes('exfiltration') || lowerSearchTerm.includes('data transfer')) {
      return "'Log Source' = 'Object Storage Logs' and ('Event Name' = 'GetObject' or 'Event Name' = 'DownloadObject') and Time > dateRelative(24h) | stats sum('Bytes Transferred') as total_bytes by 'User Name', 'IP Address' | sort -total_bytes | head 100";
    }

    // Generic search
    if (lowerSearchTerm.includes('error') || lowerSearchTerm.includes('exception')) {
      return `'Event Name' contains 'Error' or 'Event Name' contains 'Exception' and Time > dateRelative(24h) | search '${searchTerm}' | head 100`;
    }

    // Default comprehensive search
    return `* and Time > dateRelative(24h) | search '${searchTerm}' | head 100`;
  }

  async getMitreCategoryQuery(category: string): Promise<string> {
    await this.loadQueries();

    const categoryMappings: { [key: string]: string[] } = {
      'initial_access': ['T1078', 'T1190', 'T1133', 'T1200', 'T1566'],
      'execution': ['T1059', 'T1106', 'T1129', 'T1203', 'T1559'],
      'persistence': ['T1053', 'T1098', 'T1136', 'T1176', 'T1543'],
      'privilege_escalation': ['T1055', 'T1068', 'T1134', 'T1484', 'T1548'],
      'defense_evasion': ['T1027', 'T1036', 'T1055', 'T1070', 'T1112'],
      'credential_access': ['T1003', 'T1110', 'T1555', 'T1212', 'T1056'],
      'discovery': ['T1007', 'T1018', 'T1033', 'T1057', 'T1082'],
      'lateral_movement': ['T1021', 'T1047', 'T1210', 'T1534', 'T1563'],
      'collection': ['T1005', 'T1039', 'T1056', 'T1113', 'T1125'],
      'command_and_control': ['T1071', 'T1090', 'T1095', 'T1105', 'T1572'],
      'exfiltration': ['T1041', 'T1048', 'T1052', 'T1567', 'T1029'],
      'impact': ['T1485', 'T1486', 'T1490', 'T1498', 'T1529']
    };

    const techniques = categoryMappings[category];
    if (!techniques) {
      return "'Log Source' = 'Windows Sysmon Events' and 'Technique_id' is not null and Time > dateRelative(7d) | timestats count as events by 'Technique_id' | sort -events | head 50";
    }

    const techniqueFilters = techniques.map(t => `'Technique_id' like '${t}*'`).join(' or ');
    return `'Log Source' = 'Windows Sysmon Events' and (${techniqueFilters}) and Time > dateRelative(7d) | timestats count as events by 'Technique_id', 'Event Name' | sort -events`;
  }

  async getIPAnalysisQueries(ipAddress: string, analysisType: string): Promise<IPAnalysisQuery[]> {
    const queries: IPAnalysisQuery[] = [];

    if (analysisType === 'full' || analysisType === 'authentication') {
      queries.push({
        type: 'authentication',
        description: 'Authentication events for this IP',
        query: `('Event Name' = 'UserLogin' or 'Event Name' = 'UserLoginFailed') and ('IP Address' = '${ipAddress}' or 'Source IP' = '${ipAddress}') and Time > dateRelative(24h) | stats count by 'Event Name', 'User Name' | sort -count`
      });
    }

    if (analysisType === 'full' || analysisType === 'network') {
      queries.push({
        type: 'network',
        description: 'Network connections from/to this IP',
        query: `'Log Source' = 'VCN Flow Logs' and ('Source IP' = '${ipAddress}' or 'Destination IP' = '${ipAddress}') and Time > dateRelative(24h) | stats count by 'Source IP', 'Destination IP', 'Protocol', 'Action' | sort -count`
      });
    }

    if (analysisType === 'full' || analysisType === 'threat_intel') {
      queries.push({
        type: 'threat_intel',
        description: 'Security events involving this IP',
        query: `('Event Name' contains 'Security' or 'Event Name' contains 'Threat' or 'Event Name' contains 'Malicious') and ('IP Address' = '${ipAddress}' or 'Source IP' = '${ipAddress}' or 'Destination IP' = '${ipAddress}') and Time > dateRelative(24h)`
      });
    }

    if (analysisType === 'full' || analysisType === 'communication_patterns') {
      queries.push({
        type: 'communication_patterns',
        description: 'Communication patterns and frequency',
        query: `('Source IP' = '${ipAddress}' or 'Destination IP' = '${ipAddress}') and Time > dateRelative(24h) | timestats count as connections by Time span=1h | sort Time`
      });
    }

    return queries;
  }

  async getLoganQueries(category?: string, queryName?: string): Promise<LoganQuery[]> {
    await this.loadQueries();

    let result: LoganQuery[] = [];

    if (category && category !== 'all') {
      result = this.loganQueries[category] || [];
    } else {
      // Get all queries from all categories
      result = Object.values(this.loganQueries).flat();
    }

    if (queryName) {
      result = result.filter(q => 
        q.name.toLowerCase().includes(queryName.toLowerCase()) ||
        q.id.toLowerCase().includes(queryName.toLowerCase())
      );
    }

    return result;
  }

  async buildQueryFromTemplate(templateId: string, parameters: { [key: string]: any }): Promise<string> {
    await this.loadQueries();

    const templates: { [key: string]: string } = {
      'user_activity': "'Event Name' contains '{eventType}' and 'User Name' = '{userName}' and Time > dateRelative({timeRange})",
      'ip_investigation': "('IP Address' = '{ipAddress}' or 'Source IP' = '{ipAddress}' or 'Destination IP' = '{ipAddress}') and Time > dateRelative({timeRange})",
      'resource_access': "'Resource Name' = '{resourceName}' and Time > dateRelative({timeRange}) | stats count by 'Event Name', 'User Name'",
      'time_range_analysis': "* and Time > dateRelative({timeRange}) and Time < dateRelative({endTime}) | stats count by 'Event Name'",
      'compartment_activity': "'Compartment Name' = '{compartmentName}' and Time > dateRelative({timeRange}) | stats count by 'Event Name', 'User Name'"
    };

    let template = templates[templateId];
    if (!template) {
      throw new Error(`Unknown template: ${templateId}`);
    }

    // Replace parameters in template
    Object.entries(parameters).forEach(([key, value]) => {
      template = template.replace(new RegExp(`{${key}}`, 'g'), String(value));
    });

    return template;
  }

  convertNaturalLanguageToQuery(naturalQuery: string): string {
    const lower = naturalQuery.toLowerCase();

    // Time expressions
    let timeFilter = 'Time > dateRelative(24h)';
    if (lower.includes('last hour') || lower.includes('past hour')) {
      timeFilter = 'Time > dateRelative(1h)';
    } else if (lower.includes('last week') || lower.includes('past week')) {
      timeFilter = 'Time > dateRelative(7d)';
    } else if (lower.includes('last month') || lower.includes('past month')) {
      timeFilter = 'Time > dateRelative(30d)';
    }

    // Event type detection
    if (lower.includes('failed login') || lower.includes('login fail')) {
      return `'Event Name' = 'UserLoginFailed' and ${timeFilter} | stats count by 'User Name', 'IP Address' | sort -count`;
    }

    if (lower.includes('admin') && lower.includes('login')) {
      return `'Event Name' = 'UserLogin' and 'User Name' contains 'admin' and ${timeFilter} | stats count by 'User Name', 'IP Address'`;
    }

    if (lower.includes('delete') || lower.includes('deletion')) {
      return `'Event Name' contains 'Delete' and ${timeFilter} | stats count by 'Event Name', 'User Name', 'Resource Name' | sort -count`;
    }

    if (lower.includes('error') || lower.includes('exception')) {
      return `('Event Name' contains 'Error' or 'Event Name' contains 'Exception') and ${timeFilter} | stats count by 'Event Name' | sort -count`;
    }

    // Default search
    const searchTerms = naturalQuery.split(' ').filter(word => 
      word.length > 3 && !['show', 'find', 'get', 'list', 'from', 'with', 'last', 'past'].includes(word.toLowerCase())
    );

    if (searchTerms.length > 0) {
      return `* and ${timeFilter} | search "${searchTerms.join(' ')}" | head 100`;
    }

    return `* and ${timeFilter} | head 100`;
  }
}