import test from 'node:test';
import assert from 'node:assert/strict';
import * as oci from 'oci-sdk';
import { LogAnalyticsClient } from '../oci/LogAnalyticsClient.js';

test('initializeAuth uses environment credentials when config file is unavailable', async (t) => {
  const envKeys = [
    'OCI_USER_ID',
    'OCI_FINGERPRINT',
    'OCI_TENANCY_ID',
    'OCI_REGION',
    'OCI_PRIVATE_KEY_CONTENT',
    'OCI_KEY_FILE'
  ] as const;

  const originalEnv: Partial<Record<(typeof envKeys)[number], string | undefined>> = {};
  for (const key of envKeys) {
    originalEnv[key] = process.env[key];
  }

  const originalInitializeClient = (LogAnalyticsClient as any).prototype.initializeClient;
  (LogAnalyticsClient as any).prototype.initializeClient = async function () {
    // no-op for unit test to prevent external side effects
  };

  t.after(() => {
    (LogAnalyticsClient as any).prototype.initializeClient = originalInitializeClient;
    for (const key of envKeys) {
      const value = originalEnv[key];
      if (typeof value === 'undefined') {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  process.env.OCI_USER_ID = 'ocid1.user.oc1..exampleuniqueID';
  process.env.OCI_FINGERPRINT = 'aa:bb:cc:dd';
  process.env.OCI_TENANCY_ID = 'ocid1.tenancy.oc1..exampleuniqueID';
  process.env.OCI_REGION = 'us-chicago-1';
  process.env.OCI_PRIVATE_KEY_CONTENT = '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----';
  delete process.env.OCI_KEY_FILE;

  const client = new LogAnalyticsClient();
  const testClient = client as any;
  testClient.config = {
    user: process.env.OCI_USER_ID,
    fingerprint: process.env.OCI_FINGERPRINT,
    tenancy: process.env.OCI_TENANCY_ID,
    region: process.env.OCI_REGION,
    private_key: process.env.OCI_PRIVATE_KEY_CONTENT
  };
  testClient.configSource = 'env';
  testClient.isRunningOnOCI = async () => false;
  testClient.getInstancePrincipalsBuilder = () => null;

  let configProviderCalled = false;
  testClient.createConfigFileProvider = () => {
    configProviderCalled = true;
    throw new Error('Config file provider should not be used when env credentials are available');
  };

  await testClient.initializeAuth();

  assert.equal(configProviderCalled, false);
  assert.ok(testClient.provider instanceof (oci as any).common.SimpleAuthenticationDetailsProvider);
  assert.equal(testClient.provider.privateKey, process.env.OCI_PRIVATE_KEY_CONTENT);
  const providerRegion =
    (testClient.provider.authType && testClient.provider.authType._regionId) ||
    testClient.provider.authType;
  assert.equal(providerRegion, process.env.OCI_REGION);
  assert.equal(testClient.provider.user, process.env.OCI_USER_ID);
});
