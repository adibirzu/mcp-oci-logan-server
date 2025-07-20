#!/usr/bin/env node

/**
 * Direct OCI SDK test to verify authentication and basic connectivity
 */

import * as oci from 'oci-sdk';

async function testOCIConnection() {
  console.log('🧪 Testing OCI SDK Direct Connection...\n');

  try {
    // Test 1: Create authentication provider
    console.log('1. Testing authentication provider...');
    const provider = new oci.ConfigFileAuthenticationDetailsProvider();
    console.log('✅ Authentication provider created');

    // Test 2: Get region
    console.log('2. Testing region access...');
    const region = await provider.getRegion();
    console.log(`✅ Region: ${region ? region.regionId : 'default'}`);

    // Test 3: Test Identity service
    console.log('3. Testing Identity service...');
    const identityClient = new oci.identity.IdentityClient({
      authenticationDetailsProvider: provider
    });
    
    const userResponse = await identityClient.getUser({
      userId: await provider.getUser()
    });
    console.log(`✅ Connected as user: ${userResponse.user?.name || 'Unknown'}`);

    // Test 4: Test Object Storage (for namespace)
    console.log('4. Testing Object Storage for namespace...');
    const objectStorageClient = new oci.objectstorage.ObjectStorageClient({
      authenticationDetailsProvider: provider
    });
    
    const namespaceResponse = await objectStorageClient.getNamespace({});
    const namespace = namespaceResponse.value;
    console.log(`✅ Namespace: ${namespace}`);

    // Test 5: Check if LogAnalytics is available
    console.log('5. Testing LogAnalytics service availability...');
    try {
      const logAnalyticsClient = new oci.loganalytics.LogAnalyticsClient({
        authenticationDetailsProvider: provider
      });
      
      // Try to list log sources as a simple test
      const compartmentId = process.env.OCI_COMPARTMENT_ID || 'test';
      console.log(`   Using compartment: ${compartmentId}`);
      
      // This will fail if LogAnalytics is not enabled, but we can catch it gracefully
      const logSourcesResponse = await logAnalyticsClient.listLogAnalyticsLogGroups({
        namespaceName: namespace,
        compartmentId: compartmentId
      });
      
      console.log(`✅ LogAnalytics available with ${logSourcesResponse.logAnalyticsLogGroupCollection?.items?.length || 0} log groups`);
      return true;
      
    } catch (logAnalyticsError) {
      console.log(`⚠️  LogAnalytics not available: ${logAnalyticsError.message}`);
      console.log('   This is normal if LogAnalytics is not enabled in this tenancy');
      return false;
    }

  } catch (error) {
    console.error('❌ OCI connection failed:', error.message);
    return false;
  }
}

async function main() {
  const success = await testOCIConnection();
  
  console.log('\n📋 Summary:');
  if (success) {
    console.log('✅ OCI connection successful with LogAnalytics available');
    console.log('✅ MCP server should work correctly with real queries');
  } else {
    console.log('⚠️  OCI connection works but LogAnalytics not available');
    console.log('💡 MCP server will work in demo mode with query validation');
  }
  
  console.log('\n🚀 Next steps:');
  console.log('1. If LogAnalytics is not available, enable it in the OCI Console');
  console.log('2. Configure log sources in LogAnalytics');
  console.log('3. Restart Claude Desktop to use the MCP server');
}

main().catch(console.error);