/**
 * MCP Prompt Handlers
 *
 * Registers 6 workflow prompts that guide agents through
 * structured security operations using tools and resources.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  buildSecurityTriage,
  buildThreatHunt,
  buildIncidentInvestigation,
  buildComplianceCheck,
  buildDetectionCoverageGap,
  buildDailySecurityBrief,
} from './templates.js';

export function setupPromptHandlers(server: Server): void {
  // ============================================
  // List Prompts
  // ============================================
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: [
      {
        name: 'security-triage',
        description: 'Triage security alerts: run critical/high detections, correlate findings, produce action report',
        arguments: [
          {
            name: 'timeRange',
            description: 'Time range to triage (e.g., 1h, 24h, 7d)',
            required: false,
          },
          {
            name: 'platform',
            description: 'Platform focus: oci, linux, windows, or all',
            required: false,
          },
        ],
      },
      {
        name: 'threat-hunt',
        description: 'Structured threat hunting session: hypothesis testing with detection rules and hunting queries',
        arguments: [
          {
            name: 'hypothesis',
            description: 'Hunting hypothesis (e.g., "Adversary is using DNS tunneling for C2")',
            required: true,
          },
          {
            name: 'platform',
            description: 'Platform focus: oci, linux, windows, or all',
            required: false,
          },
          {
            name: 'timeRange',
            description: 'Time range for hunting (recommend 7d+)',
            required: false,
          },
        ],
      },
      {
        name: 'incident-investigation',
        description: 'Evidence collection and timeline construction for a specific indicator of compromise',
        arguments: [
          {
            name: 'indicator',
            description: 'The IOC value (IP address, username, hostname, or hash)',
            required: true,
          },
          {
            name: 'indicatorType',
            description: 'Type of indicator: ip, user, host, hash, file',
            required: true,
          },
          {
            name: 'timeRange',
            description: 'Investigation time window (recommend 7d+)',
            required: false,
          },
        ],
      },
      {
        name: 'compliance-check',
        description: 'STIG/DoD compliance posture report using detection rules mapped to controls',
        arguments: [
          {
            name: 'framework',
            description: 'Compliance framework: stig, cis, or all',
            required: false,
          },
          {
            name: 'scope',
            description: 'Scope: oci, linux, windows, or all',
            required: false,
          },
        ],
      },
      {
        name: 'detection-coverage-gap',
        description: 'MITRE ATT&CK gap analysis: identify uncovered techniques and recommend new detections',
        arguments: [
          {
            name: 'tactic',
            description: 'Focus on a specific tactic (e.g., persistence, lateral_movement) or all',
            required: false,
          },
        ],
      },
      {
        name: 'daily-security-brief',
        description: 'Daily SOC operations summary: critical alerts, trends, anomalies, health status',
        arguments: [
          {
            name: 'format',
            description: 'Output format: executive (concise) or detailed',
            required: false,
          },
        ],
      },
    ],
  }));

  // ============================================
  // Get Prompt
  // ============================================
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    const typedArgs = args as Record<string, string>;

    switch (name) {
      case 'security-triage':
        return { messages: buildSecurityTriage(typedArgs) };

      case 'threat-hunt':
        if (!typedArgs.hypothesis) {
          throw new Error('hypothesis argument is required for threat-hunt prompt');
        }
        return { messages: buildThreatHunt(typedArgs) };

      case 'incident-investigation':
        if (!typedArgs.indicator || !typedArgs.indicatorType) {
          throw new Error('indicator and indicatorType arguments are required for incident-investigation prompt');
        }
        return { messages: buildIncidentInvestigation(typedArgs) };

      case 'compliance-check':
        return { messages: buildComplianceCheck(typedArgs) };

      case 'detection-coverage-gap':
        return { messages: buildDetectionCoverageGap(typedArgs) };

      case 'daily-security-brief':
        return { messages: buildDailySecurityBrief(typedArgs) };

      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  });
}
