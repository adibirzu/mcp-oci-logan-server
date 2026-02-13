/**
 * MCP Resource Handlers
 *
 * Registers detection:// resources for agent consumption.
 * Static resources provide summaries; templates provide parameterized lookups.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { DetectionCatalog } from '../detections/detection-catalog.js';
export declare function setupResourceHandlers(server: Server, catalog: DetectionCatalog): void;
