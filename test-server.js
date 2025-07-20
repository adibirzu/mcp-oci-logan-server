#!/usr/bin/env node

/**
 * Test script for the OCI Logan MCP Server
 * Validates basic functionality and OCI connectivity
 */

import { spawn } from 'child_process';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

class MCPServerTester {
  constructor() {
    this.serverProcess = null;
  }

  async testServer() {
    console.log('🧪 Testing OCI Logan MCP Server...\n');

    // Test 1: Check if server starts
    console.log('1. Testing server startup...');
    try {
      await this.startServer();
      console.log('✅ Server starts successfully\n');
    } catch (error) {
      console.log('❌ Server failed to start:', error.message);
      return;
    }

    // Test 2: Test basic MCP protocol
    console.log('2. Testing MCP protocol...');
    try {
      await this.testMCPProtocol();
      console.log('✅ MCP protocol works correctly\n');
    } catch (error) {
      console.log('❌ MCP protocol test failed:', error.message);
    }

    // Test 3: Test OCI connection
    console.log('3. Testing OCI connection...');
    try {
      await this.testOCIConnection();
      console.log('✅ OCI connection successful\n');
    } catch (error) {
      console.log('❌ OCI connection failed:', error.message);
      console.log('💡 Make sure OCI CLI is configured or environment variables are set\n');
    }

    // Test 4: Test query validation
    console.log('4. Testing query validation...');
    try {
      await this.testQueryValidation();
      console.log('✅ Query validation works correctly\n');
    } catch (error) {
      console.log('❌ Query validation failed:', error.message);
    }

    await this.stopServer();
    console.log('🎉 Testing complete!');
  }

  async startServer() {
    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('node', ['dist/index.js'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      this.serverProcess.stderr.on('data', (data) => {
        output += data.toString();
        if (output.includes('OCI Logan MCP server running')) {
          resolve();
        }
      });

      this.serverProcess.on('error', reject);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        reject(new Error('Server startup timeout'));
      }, 10000);
    });
  }

  async testMCPProtocol() {
    return new Promise((resolve, reject) => {
      const testMessage = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list'
      }) + '\n';

      this.serverProcess.stdin.write(testMessage);

      let response = '';
      const timeout = setTimeout(() => {
        reject(new Error('MCP protocol timeout'));
      }, 5000);

      this.serverProcess.stdout.on('data', (data) => {
        response += data.toString();
        try {
          const parsed = JSON.parse(response);
          if (parsed.result && parsed.result.tools) {
            clearTimeout(timeout);
            const toolCount = parsed.result.tools.length;
            console.log(`   Found ${toolCount} available tools`);
            resolve();
          }
        } catch (e) {
          // Continue waiting for complete JSON
        }
      });
    });
  }

  async testOCIConnection() {
    return new Promise((resolve, reject) => {
      const testMessage = JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'check_oci_connection',
          arguments: { testQuery: false }
        }
      }) + '\n';

      this.serverProcess.stdin.write(testMessage);

      let response = '';
      const timeout = setTimeout(() => {
        reject(new Error('OCI connection test timeout'));
      }, 10000);

      this.serverProcess.stdout.on('data', (data) => {
        response += data.toString();
        try {
          const parsed = JSON.parse(response);
          if (parsed.result && parsed.result.content) {
            clearTimeout(timeout);
            const content = parsed.result.content[0].text;
            if (content.includes('Connected')) {
              console.log('   OCI authentication successful');
              resolve();
            } else {
              reject(new Error('OCI connection failed: ' + content));
            }
          }
        } catch (e) {
          // Continue waiting for complete JSON
        }
      });
    });
  }

  async testQueryValidation() {
    return new Promise((resolve, reject) => {
      const testMessage = JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'validate_query',
          arguments: { 
            query: "'Event Name' = 'UserLogin' and Time > dateRelative(24h)",
            fix: false
          }
        }
      }) + '\n';

      this.serverProcess.stdin.write(testMessage);

      let response = '';
      const timeout = setTimeout(() => {
        reject(new Error('Query validation timeout'));
      }, 5000);

      this.serverProcess.stdout.on('data', (data) => {
        response += data.toString();
        try {
          const parsed = JSON.parse(response);
          if (parsed.result && parsed.result.content) {
            clearTimeout(timeout);
            const content = parsed.result.content[0].text;
            if (content.includes('Valid: true')) {
              console.log('   Query validation working correctly');
              resolve();
            } else {
              reject(new Error('Query validation failed: ' + content));
            }
          }
        } catch (e) {
          // Continue waiting for complete JSON
        }
      });
    });
  }

  async stopServer() {
    if (this.serverProcess) {
      this.serverProcess.kill();
      await sleep(1000);
    }
  }

  async checkPrerequisites() {
    console.log('🔍 Checking prerequisites...\n');

    // Check if dist folder exists
    try {
      const fs = await import('fs');
      if (!fs.existsSync('dist/index.js')) {
        console.log('❌ dist/index.js not found. Please run: npm run build');
        return false;
      }
      console.log('✅ Compiled JavaScript found');
    } catch (error) {
      console.log('❌ Could not check dist folder');
      return false;
    }

    // Check for OCI configuration
    try {
      const os = await import('os');
      const path = await import('path');
      const fs = await import('fs');
      
      const ociConfigPath = path.join(os.homedir(), '.oci', 'config');
      const hasOciConfig = fs.existsSync(ociConfigPath);
      const hasEnvVars = process.env.OCI_USER_ID && process.env.OCI_TENANCY_ID;
      
      if (hasOciConfig || hasEnvVars) {
        console.log('✅ OCI configuration found');
      } else {
        console.log('⚠️  No OCI configuration found (this may cause connection tests to fail)');
        console.log('   Configure with: oci setup config');
        console.log('   Or set environment variables: OCI_USER_ID, OCI_TENANCY_ID, etc.\n');
      }
    } catch (error) {
      console.log('⚠️  Could not check OCI configuration');
    }

    return true;
  }
}

// Run the tests
async function main() {
  const tester = new MCPServerTester();
  
  const prerequisitesOk = await tester.checkPrerequisites();
  if (!prerequisitesOk) {
    process.exit(1);
  }

  try {
    await tester.testServer();
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}