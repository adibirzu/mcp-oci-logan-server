/**
 * MCP Resource Handlers
 *
 * Registers detection:// resources for agent consumption.
 * Static resources provide summaries; templates provide parameterized lookups.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { DetectionCatalog } from '../detections/detection-catalog.js';
import { OCL_REFERENCE } from './ocl-reference.js';
import { Platform, DetectionLevel, PLATFORMS, DETECTION_LEVELS } from '../detections/types.js';

export function setupResourceHandlers(server: Server, catalog: DetectionCatalog): void {
  // ============================================
  // List Static Resources
  // ============================================
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: 'detection://catalog',
        name: 'Detection Catalog Summary',
        description: 'Overview of the detection catalog: platforms, severities, MITRE coverage stats',
        mimeType: 'application/json',
      },
      {
        uri: 'detection://rules/summary',
        name: 'Detection Rules Summary',
        description: 'Compact list of all 200 detection rules (id, title, level, platform). Browse to pick rule IDs.',
        mimeType: 'application/json',
      },
      {
        uri: 'detection://hunting/summary',
        name: 'Hunting Queries Summary',
        description: 'Compact list of all hunting queries (id, title, level, platform)',
        mimeType: 'application/json',
      },
      {
        uri: 'detection://mitre/coverage',
        name: 'MITRE ATT&CK Coverage',
        description: 'MITRE ATT&CK technique coverage matrix grouped by tactic',
        mimeType: 'application/json',
      },
      {
        uri: 'detection://stig/controls',
        name: 'STIG Compliance Controls',
        description: 'STIG/DoD compliance control mapping with associated detection rules',
        mimeType: 'application/json',
      },
      {
        uri: 'detection://ocl/reference',
        name: 'OCL Query Language Reference',
        description: 'Quick reference for OCI Log Analytics query language syntax, commands, and patterns',
        mimeType: 'text/markdown',
      },
    ],
  }));

  // ============================================
  // List Resource Templates (parameterized)
  // ============================================
  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
    resourceTemplates: [
      {
        uriTemplate: 'detection://rules/{ruleId}',
        name: 'Detection Rule',
        description: 'Full detection rule with query, MITRE mapping, false positives. Use rule ID from rules/summary.',
        mimeType: 'application/json',
      },
      {
        uriTemplate: 'detection://hunting/{queryId}',
        name: 'Hunting Query',
        description: 'Full hunting query with methodology, query, and MITRE mapping',
        mimeType: 'application/json',
      },
      {
        uriTemplate: 'detection://rules/platform/{platform}',
        name: 'Rules by Platform',
        description: 'Detection rules filtered by platform (oci, linux, windows)',
        mimeType: 'application/json',
      },
      {
        uriTemplate: 'detection://rules/level/{level}',
        name: 'Rules by Severity',
        description: 'Detection rules filtered by severity level (critical, high, medium, low, informational)',
        mimeType: 'application/json',
      },
      {
        uriTemplate: 'detection://rules/mitre/{techniqueId}',
        name: 'Rules by MITRE Technique',
        description: 'Detection rules covering a specific MITRE ATT&CK technique (e.g., T1078)',
        mimeType: 'application/json',
      },
    ],
  }));

  // ============================================
  // Read Resources
  // ============================================
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    // Static resources
    if (uri === 'detection://catalog') {
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(catalog.getSummary(), null, 2),
        }],
      };
    }

    if (uri === 'detection://rules/summary') {
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(catalog.listRulesCompact(), null, 2),
        }],
      };
    }

    if (uri === 'detection://hunting/summary') {
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(catalog.listHuntingCompact(), null, 2),
        }],
      };
    }

    if (uri === 'detection://mitre/coverage') {
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(catalog.getMitreCoverage(), null, 2),
        }],
      };
    }

    if (uri === 'detection://stig/controls') {
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(catalog.getStigControls(), null, 2),
        }],
      };
    }

    if (uri === 'detection://ocl/reference') {
      return {
        contents: [{
          uri,
          mimeType: 'text/markdown',
          text: OCL_REFERENCE,
        }],
      };
    }

    // Template: detection://rules/{ruleId}
    const ruleMatch = uri.match(/^detection:\/\/rules\/([a-z0-9_-]+)$/i);
    if (ruleMatch) {
      const ruleId = ruleMatch[1];

      // Check if this is a platform or level filter
      if (PLATFORMS.includes(ruleId as Platform)) {
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(catalog.searchRules({ platform: ruleId as Platform }), null, 2),
          }],
        };
      }

      if (DETECTION_LEVELS.includes(ruleId as DetectionLevel)) {
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(catalog.searchRules({ level: ruleId as DetectionLevel }), null, 2),
          }],
        };
      }

      const rule = catalog.getRule(ruleId);
      if (!rule) {
        throw new Error(`Detection rule not found: ${ruleId}`);
      }
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(rule, null, 2),
        }],
      };
    }

    // Template: detection://hunting/{queryId}
    const huntingMatch = uri.match(/^detection:\/\/hunting\/([a-z0-9_-]+)$/i);
    if (huntingMatch) {
      const queryId = huntingMatch[1];
      const query = catalog.getHuntingQuery(queryId);
      if (!query) {
        throw new Error(`Hunting query not found: ${queryId}`);
      }
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(query, null, 2),
        }],
      };
    }

    // Template: detection://rules/platform/{platform}
    const platformMatch = uri.match(/^detection:\/\/rules\/platform\/([a-z]+)$/i);
    if (platformMatch) {
      const platform = platformMatch[1] as Platform;
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(catalog.searchRules({ platform }), null, 2),
        }],
      };
    }

    // Template: detection://rules/level/{level}
    const levelMatch = uri.match(/^detection:\/\/rules\/level\/([a-z]+)$/i);
    if (levelMatch) {
      const level = levelMatch[1] as DetectionLevel;
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(catalog.searchRules({ level }), null, 2),
        }],
      };
    }

    // Template: detection://rules/mitre/{techniqueId}
    const mitreMatch = uri.match(/^detection:\/\/rules\/mitre\/(T\d{4}(?:\.\d{3})?)$/i);
    if (mitreMatch) {
      const techniqueId = mitreMatch[1].toUpperCase();
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(
            catalog.searchRules({ mitreTechnique: techniqueId }),
            null,
            2,
          ),
        }],
      };
    }

    throw new Error(`Unknown resource URI: ${uri}`);
  });
}
