/**
 * Tests for tool definitions
 */

import { describe, it, expect } from 'vitest';
import {
  TOOL_DEFINITIONS,
  getToolDefinitions,
  normalizeToolName,
  TOOL_NAME_MAPPING
} from '../../src/tools/definitions.js';

describe('TOOL_DEFINITIONS', () => {
  it('should define 33 tools', () => {
    expect(TOOL_DEFINITIONS.length).toBe(33);
  });

  it('should have all tools with oci_logan_ prefix', () => {
    for (const tool of TOOL_DEFINITIONS) {
      expect(tool.name).toMatch(/^oci_logan_/);
    }
  });

  it('should have descriptions for all tools', () => {
    for (const tool of TOOL_DEFINITIONS) {
      expect(tool.description).toBeDefined();
      expect(tool.description.length).toBeGreaterThan(10);
    }
  });

  it('should have input schemas for all tools', () => {
    for (const tool of TOOL_DEFINITIONS) {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('should have annotations for all tools', () => {
    for (const tool of TOOL_DEFINITIONS) {
      expect(tool.annotations).toBeDefined();
      expect(typeof tool.annotations?.readOnlyHint).toBe('boolean');
      expect(typeof tool.annotations?.destructiveHint).toBe('boolean');
      expect(typeof tool.annotations?.idempotentHint).toBe('boolean');
    }
  });
});

describe('Tool categories', () => {
  it('should have query execution tools', () => {
    const queryTools = TOOL_DEFINITIONS.filter(t =>
      ['oci_logan_execute_query', 'oci_logan_search_security_events',
       'oci_logan_get_mitre_techniques', 'oci_logan_analyze_ip_activity'].includes(t.name)
    );
    expect(queryTools.length).toBe(4);
    for (const tool of queryTools) {
      expect(tool.annotations?.readOnlyHint).toBe(true);
    }
  });

  it('should have dashboard management tools', () => {
    const dashboardTools = TOOL_DEFINITIONS.filter(t =>
      t.name.includes('dashboard')
    );
    expect(dashboardTools.length).toBeGreaterThan(0);
  });

  it('should have write tools marked as not readOnly', () => {
    const writeTools = TOOL_DEFINITIONS.filter(t =>
      t.name.includes('create') || t.name.includes('update') || t.name.includes('import')
    );
    for (const tool of writeTools) {
      expect(tool.annotations?.readOnlyHint).toBe(false);
    }
  });
});

describe('Tool input schemas', () => {
  it('should have format option in read tools', () => {
    const readTools = TOOL_DEFINITIONS.filter(t =>
      t.annotations?.readOnlyHint === true
    );

    for (const tool of readTools) {
      const props = tool.inputSchema.properties as Record<string, unknown>;
      // Most read tools should have format option
      if (props && props.format) {
        const formatProp = props.format as { enum?: string[] };
        expect(formatProp.enum).toContain('markdown');
        expect(formatProp.enum).toContain('json');
      }
    }
  });

  it('should have pagination in list tools', () => {
    const listTools = TOOL_DEFINITIONS.filter(t =>
      t.name.includes('list') && !t.name.includes('active')  // Active log sources uses different pagination
    );

    for (const tool of listTools) {
      const props = tool.inputSchema.properties as Record<string, unknown>;
      expect(props).toHaveProperty('limit');
      // Most list tools have offset, but not all (like list_active_log_sources which uses query-based limit)
      if (tool.name !== 'oci_logan_list_active_log_sources') {
        expect(props).toHaveProperty('offset');
      }
    }
  });

  it('should require dashboardId for dashboard-specific tools', () => {
    const dashboardIdTools = ['oci_logan_get_dashboard', 'oci_logan_get_dashboard_tiles',
                              'oci_logan_update_dashboard', 'oci_logan_export_dashboard'];

    for (const toolName of dashboardIdTools) {
      const tool = TOOL_DEFINITIONS.find(t => t.name === toolName);
      expect(tool?.inputSchema.required).toContain('dashboardId');
    }
  });
});

describe('getToolDefinitions', () => {
  it('should return formatted tool definitions', () => {
    const tools = getToolDefinitions();
    expect(tools.length).toBe(33);

    for (const tool of tools) {
      expect(tool).toHaveProperty('name');
      expect(tool).toHaveProperty('description');
      expect(tool).toHaveProperty('inputSchema');
    }
  });
});

describe('normalizeToolName', () => {
  it('should return same name for new-style names', () => {
    expect(normalizeToolName('oci_logan_execute_query')).toBe('oci_logan_execute_query');
    expect(normalizeToolName('oci_logan_list_dashboards')).toBe('oci_logan_list_dashboards');
  });

  it('should convert old-style names to new-style', () => {
    expect(normalizeToolName('execute_logan_query')).toBe('oci_logan_execute_query');
    expect(normalizeToolName('search_security_events')).toBe('oci_logan_search_security_events');
    expect(normalizeToolName('get_mitre_techniques')).toBe('oci_logan_get_mitre_techniques');
    expect(normalizeToolName('analyze_ip_activity')).toBe('oci_logan_analyze_ip_activity');
  });

  it('should convert all old dashboard tool names', () => {
    expect(normalizeToolName('list_dashboards')).toBe('oci_logan_list_dashboards');
    expect(normalizeToolName('get_dashboard')).toBe('oci_logan_get_dashboard');
    expect(normalizeToolName('create_dashboard')).toBe('oci_logan_create_dashboard');
    expect(normalizeToolName('update_dashboard')).toBe('oci_logan_update_dashboard');
  });

  it('should return unknown names unchanged', () => {
    expect(normalizeToolName('unknown_tool')).toBe('unknown_tool');
  });
});

describe('TOOL_NAME_MAPPING', () => {
  it('should have mappings for all old tool names', () => {
    const expectedMappings = [
      'execute_logan_query',
      'search_security_events',
      'get_mitre_techniques',
      'analyze_ip_activity',
      'get_logan_queries',
      'validate_query',
      'get_documentation',
      'check_oci_connection',
      'list_dashboards',
      'get_dashboard',
      'get_dashboard_tiles',
      'create_dashboard',
      'update_dashboard'
    ];

    for (const oldName of expectedMappings) {
      expect(TOOL_NAME_MAPPING[oldName]).toBeDefined();
      expect(TOOL_NAME_MAPPING[oldName]).toMatch(/^oci_logan_/);
    }
  });
});
