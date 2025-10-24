# MCP OCI Logan Server Wiki

Welcome to the MCP OCI Logan Server wiki! This Model Context Protocol (MCP) server connects Claude AI to Oracle Cloud Infrastructure (OCI) Logging Analytics, enabling natural language querying and analysis of security logs.

**Version**: 1.3.0
**Status**: Production Ready
**License**: MIT

---

## 🚀 Quick Links

- **[Installation Guide](Installation)** - Get started in minutes
- **[Capabilities](Capabilities)** - All 33 MCP tools explained
- **[Future Enhancements](Future-Enhancements)** - Planned improvements
- **[Troubleshooting](Troubleshooting)** - Common issues and solutions
- **[API Reference](API-Reference)** - Detailed API documentation

---

## What is MCP OCI Logan Server?

The MCP OCI Logan Server is a bridge between Claude AI and OCI Logging Analytics that enables:

- **Natural Language Queries** - Ask questions in plain English
- **Security Analysis** - Analyze security events using MITRE ATT&CK framework
- **Log Analytics** - Query and analyze logs across multiple sources
- **Resource Discovery** - Discover and manage log sources, fields, entities
- **Advanced Analytics** - Statistical analysis, pattern detection, correlation

### Key Features

✅ **33 MCP Tools** - Comprehensive toolset for log analytics
✅ **Real-time Data** - Direct connection to OCI Logging Analytics (no mock data)
✅ **MITRE ATT&CK** - Built-in MITRE technique analysis
✅ **Natural Language** - Query transformer for human-friendly questions
✅ **Automated Installation** - One-command setup with `./install.sh`
✅ **Security-First** - Uses OCI SDK authentication, no hardcoded credentials

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Claude Desktop                          │
│                   (stdio communication)                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ MCP Protocol
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              TypeScript MCP Server (Node.js)                │
│                  - 33 Tool Definitions                      │
│                  - Query Transformer                        │
│                  - Query Validator                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ Process Spawning
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                  Python Backend (OCI SDK)                   │
│                  - logan_client.py                          │
│                  - dashboard_client.py                      │
│                  - security_analyzer.py                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ OCI SDK API Calls
                           │
┌──────────────────────────▼──────────────────────────────────┐
│          OCI Logging Analytics Service (Real-time)          │
│                  - Query API                                │
│                  - Resource Discovery                       │
│                  - Field Metadata                           │
└─────────────────────────────────────────────────────────────┘
```

### Why Hybrid Architecture?

**TypeScript Layer** (MCP Protocol):
- Fast MCP SDK integration
- Tool definition and validation
- Query transformation and optimization

**Python Layer** (OCI SDK):
- Mature OCI Python SDK
- Stable authentication methods
- Better error handling for OCI APIs

---

## Quick Start

### 1. Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.8+
- **OCI CLI** configured with valid credentials
- **OCI Logging Analytics** access

### 2. Install

```bash
git clone https://github.com/yourusername/mcp-oci-logan-server.git
cd mcp-oci-logan-server
./install.sh
```

### 3. Configure

The installer will guide you through Claude Desktop configuration, or manually edit:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "oci-logan": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-oci-logan-server/dist/index.js"],
      "env": {
        "OCI_COMPARTMENT_ID": "ocid1.compartment.oc1..your-id",
        "OCI_REGION": "us-ashburn-1"
      }
    }
  }
}
```

### 4. Use

Restart Claude Desktop and start asking questions:

```
"Show me all active log sources"
"What are the top 10 security events in the last 24 hours?"
"Analyze failed login attempts"
"Show MITRE ATT&CK techniques detected in the last week"
```

---

## Documentation

### User Guides

- **[Installation Guide](Installation)** - Complete installation instructions
- **[User Guide](https://github.com/yourusername/mcp-oci-logan-server/blob/master/docs/USER_GUIDE.md)** - How to ask effective questions
- **[Capabilities](Capabilities)** - All 33 tools with examples

### Technical Documentation

- **[API Reference](API-Reference)** - Detailed API documentation
- **[Architecture](Architecture)** - System design and implementation
- **[Security](Security)** - Authentication and security measures
- **[Future Enhancements](Future-Enhancements)** - Roadmap and planned features

### Release Information

- **[Release Notes v1.3.0](https://github.com/yourusername/mcp-oci-logan-server/blob/master/docs/RELEASE_NOTES_v1.3.0.md)** - Latest release
- **[Critical Fix](https://github.com/yourusername/mcp-oci-logan-server/blob/master/docs/CRITICAL_FIX_README.md)** - v1.3.0 resource discovery fix
- **[Improvements](https://github.com/yourusername/mcp-oci-logan-server/blob/master/docs/IMPROVEMENTS.md)** - v1.3.0 changes

---

## Use Cases

### Security Operations

- **Threat Hunting** - Search for indicators of compromise
- **Incident Response** - Analyze security events and correlate logs
- **MITRE Mapping** - Map events to MITRE ATT&CK framework
- **Anomaly Detection** - Identify unusual patterns and behaviors

### Log Analytics

- **Resource Discovery** - Find all log sources, fields, entities
- **Query Optimization** - Transform natural language to OCI queries
- **Statistical Analysis** - Aggregate, count, and analyze log data
- **Pattern Detection** - Discover patterns across log sources

### Cloud Operations

- **VCN Flow Analysis** - Analyze network traffic patterns
- **Authentication Monitoring** - Track login attempts and failures
- **Resource Monitoring** - Monitor OCI resource activity
- **Compliance** - Query logs for compliance reporting

---

## Community

- **Issues**: [GitHub Issues](https://github.com/yourusername/mcp-oci-logan-server/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/mcp-oci-logan-server/discussions)
- **Contributing**: See [CONTRIBUTING.md](https://github.com/yourusername/mcp-oci-logan-server/blob/master/CONTRIBUTING.md)

---

## License

MIT License - See [LICENSE](https://github.com/yourusername/mcp-oci-logan-server/blob/master/LICENSE)

---

## Disclaimer

**NOT an official Oracle product**. This is an educational project demonstrating OCI Logging Analytics integration with AI assistants. Use at your own risk.

---

**Last Updated**: October 2025
**Version**: 1.3.0
