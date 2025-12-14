/**
 * OCI Logan MCP Server - HTTP Transport with OAuth
 * Implements Streamable HTTP Transport with proper OAuth 2.0 authentication
 */
import { createServer } from 'node:http';
import { createServer as createHTTPSServer } from 'node:https';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createLogger } from '../utils/logger.js';
import { getOAuthConfig, oauthMiddleware, getProtectedResourceMetadata, } from '../auth/oauth.js';
const logger = createLogger('HTTPTransport');
export function getHTTPTransportConfig() {
    return {
        host: process.env.MCP_HTTP_HOST || '0.0.0.0',
        port: parseInt(process.env.MCP_HTTP_PORT || '8000', 10),
        enableCors: process.env.MCP_HTTP_CORS !== 'false',
        corsOrigins: (process.env.MCP_HTTP_CORS_ORIGINS || '*').split(',').map(s => s.trim()),
        enableHttps: process.env.MCP_HTTP_TLS === 'true',
        httpsKeyPath: process.env.MCP_HTTP_TLS_KEY,
        httpsCertPath: process.env.MCP_HTTP_TLS_CERT,
        sessionTimeout: parseInt(process.env.MCP_SESSION_TIMEOUT || '3600000', 10), // 1 hour default
        maxSessions: parseInt(process.env.MCP_MAX_SESSIONS || '100', 10),
        enableHealthEndpoint: process.env.MCP_HTTP_HEALTH !== 'false',
        enableMetricsEndpoint: process.env.MCP_HTTP_METRICS === 'true',
        oauth: getOAuthConfig(),
    };
}
const sessions = new Map();
const metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    authFailures: 0,
    avgResponseTime: 0,
    lastRequestTime: 0,
};
/**
 * Clean up expired sessions
 */
function cleanSessions(config) {
    const now = Date.now();
    for (const [id, session] of sessions.entries()) {
        if (now - session.lastActivity > config.sessionTimeout) {
            sessions.delete(id);
            logger.debug('Session expired', { sessionId: id.substring(0, 8) });
        }
    }
}
/**
 * Get or create session for request
 */
function getSession(req, config) {
    // Check for existing session ID
    const sessionId = req.headers['mcp-session-id'];
    if (sessionId && sessions.has(sessionId)) {
        const session = sessions.get(sessionId);
        session.lastActivity = Date.now();
        return session;
    }
    // Enforce max sessions
    if (sessions.size >= config.maxSessions) {
        cleanSessions(config);
        if (sessions.size >= config.maxSessions) {
            logger.warn('Max sessions reached, rejecting new session');
            return null;
        }
    }
    // Create new session
    const newSession = {
        id: randomUUID(),
        createdAt: Date.now(),
        lastActivity: Date.now(),
        clientInfo: {
            userAgent: req.headers['user-agent'],
            remoteAddress: req.socket.remoteAddress,
        },
    };
    sessions.set(newSession.id, newSession);
    logger.debug('New session created', { sessionId: newSession.id.substring(0, 8) });
    return newSession;
}
/**
 * Set CORS headers
 */
function setCorsHeaders(req, res, config) {
    if (!config.enableCors)
        return;
    const origin = req.headers.origin;
    const allowedOrigins = config.corsOrigins;
    if (allowedOrigins.includes('*')) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    else if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, MCP-Session-Id, MCP-Protocol-Version, Last-Event-ID');
    res.setHeader('Access-Control-Expose-Headers', 'MCP-Session-Id');
    res.setHeader('Access-Control-Max-Age', '86400');
}
/**
 * Validate Origin header to prevent DNS rebinding attacks
 */
function validateOrigin(req, config) {
    const origin = req.headers.origin;
    const host = req.headers.host;
    // Allow requests without origin (same-origin or non-browser)
    if (!origin)
        return true;
    // For localhost development, allow localhost origins
    if (host?.startsWith('localhost') || host?.startsWith('127.0.0.1')) {
        return origin.includes('localhost') || origin.includes('127.0.0.1');
    }
    // Check against allowed origins
    if (config.corsOrigins.includes('*'))
        return true;
    return config.corsOrigins.includes(origin);
}
/**
 * Handle health check endpoint
 */
function handleHealthCheck(res, serverVersion) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        status: 'healthy',
        server: 'oci_logan_mcp',
        version: serverVersion,
        timestamp: new Date().toISOString(),
        activeSessions: sessions.size,
    }));
}
/**
 * Handle metrics endpoint
 */
function handleMetrics(res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        ...metrics,
        activeSessions: sessions.size,
        uptime: process.uptime(),
    }));
}
/**
 * Handle OAuth protected resource metadata endpoint
 */
function handleOAuthMetadata(res, config) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getProtectedResourceMetadata(config.oauth)));
}
/**
 * Create and configure HTTP server with OAuth authentication
 */
export async function createHTTPTransport(mcpServer, serverVersion) {
    const config = getHTTPTransportConfig();
    // Create MCP transport
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        enableJsonResponse: false,
    });
    transport.onerror = (err) => {
        logger.error('MCP transport error', { error: err?.message });
    };
    // Connect MCP server to transport (start is called internally by connect)
    await mcpServer.connect(transport);
    // Request handler
    const requestHandler = async (req, res) => {
        const startTime = Date.now();
        metrics.totalRequests++;
        metrics.lastRequestTime = startTime;
        try {
            // Set CORS headers for all requests
            setCorsHeaders(req, res, config);
            // Handle preflight
            if (req.method === 'OPTIONS') {
                res.writeHead(204);
                res.end();
                return;
            }
            // Validate origin to prevent DNS rebinding
            if (!validateOrigin(req, config)) {
                logger.warn('Invalid origin header', { origin: req.headers.origin });
                res.writeHead(403, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid origin' }));
                metrics.failedRequests++;
                return;
            }
            const url = new URL(req.url || '/', `http://${req.headers.host}`);
            const pathname = url.pathname;
            // Health check endpoint (no auth required)
            if (config.enableHealthEndpoint && pathname === '/health') {
                handleHealthCheck(res, serverVersion);
                metrics.successfulRequests++;
                return;
            }
            // Metrics endpoint (no auth required in development, should be secured in production)
            if (config.enableMetricsEndpoint && pathname === '/metrics') {
                handleMetrics(res);
                metrics.successfulRequests++;
                return;
            }
            // OAuth protected resource metadata (no auth required)
            if (pathname === '/.well-known/oauth-protected-resource') {
                handleOAuthMetadata(res, config);
                metrics.successfulRequests++;
                return;
            }
            // For MCP endpoints, require authentication
            if (pathname === '/mcp' || pathname === '/' || pathname.startsWith('/mcp/')) {
                // OAuth authentication
                const tokenInfo = await oauthMiddleware(req, res, config.oauth);
                if (!tokenInfo) {
                    metrics.authFailures++;
                    metrics.failedRequests++;
                    return;
                }
                // Get or create session
                const session = getSession(req, config);
                if (!session) {
                    res.writeHead(503, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Server at capacity' }));
                    metrics.failedRequests++;
                    return;
                }
                // Store token info in session
                session.tokenInfo = tokenInfo;
                // Add session ID to response
                res.setHeader('MCP-Session-Id', session.id);
                // Validate MCP protocol version header
                const protocolVersion = req.headers['mcp-protocol-version'];
                if (!protocolVersion) {
                    logger.debug('Missing MCP-Protocol-Version header');
                }
                // Forward to MCP transport
                transport.handleRequest(req, res);
                const responseTime = Date.now() - startTime;
                metrics.avgResponseTime = (metrics.avgResponseTime * (metrics.successfulRequests) + responseTime) / (metrics.successfulRequests + 1);
                metrics.successfulRequests++;
                return;
            }
            // Unknown endpoint
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not found' }));
            metrics.failedRequests++;
        }
        catch (error) {
            logger.error('Request handler error', { error: error instanceof Error ? error.message : String(error) });
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal server error' }));
            }
            metrics.failedRequests++;
        }
    };
    // Create HTTP or HTTPS server
    let server;
    if (config.enableHttps) {
        if (!config.httpsKeyPath || !config.httpsCertPath) {
            throw new Error('HTTPS enabled but key/cert paths not configured');
        }
        const httpsOptions = {
            key: readFileSync(config.httpsKeyPath),
            cert: readFileSync(config.httpsCertPath),
        };
        server = createHTTPSServer(httpsOptions, requestHandler);
        logger.info('HTTPS server created');
    }
    else {
        server = createServer(requestHandler);
        logger.info('HTTP server created');
    }
    // Start session cleanup interval
    const cleanupInterval = setInterval(() => cleanSessions(config), 60000);
    // Cleanup on server close
    server.on('close', () => {
        clearInterval(cleanupInterval);
        sessions.clear();
    });
    return { server, transport, config };
}
/**
 * Start HTTP server and listen on configured host/port
 */
export async function startHTTPServer(mcpServer, serverVersion) {
    const { server, config } = await createHTTPTransport(mcpServer, serverVersion);
    return new Promise((resolve, reject) => {
        server.on('error', (err) => {
            logger.error('HTTP server error', { error: err.message });
            reject(err);
        });
        server.listen(config.port, config.host, () => {
            const protocol = config.enableHttps ? 'https' : 'http';
            const authStatus = config.oauth.enabled ? 'OAuth enabled' : 'No authentication';
            logger.info(`OCI Logan MCP Server running on ${protocol}://${config.host}:${config.port}`);
            logger.info(`Authentication: ${authStatus}`);
            if (config.enableHealthEndpoint) {
                logger.info(`Health endpoint: ${protocol}://${config.host}:${config.port}/health`);
            }
            if (config.enableMetricsEndpoint) {
                logger.info(`Metrics endpoint: ${protocol}://${config.host}:${config.port}/metrics`);
            }
            resolve();
        });
    });
}
/**
 * Get current session statistics
 */
export function getSessionStats() {
    const config = getHTTPTransportConfig();
    cleanSessions(config);
    return {
        total: sessions.size,
        active: sessions.size,
        sessions: Array.from(sessions.values()).map(s => ({
            ...s,
            tokenInfo: undefined, // Don't expose token info
        })),
    };
}
/**
 * Terminate a specific session
 */
export function terminateSession(sessionId) {
    if (sessions.has(sessionId)) {
        sessions.delete(sessionId);
        logger.info('Session terminated', { sessionId: sessionId.substring(0, 8) });
        return true;
    }
    return false;
}
