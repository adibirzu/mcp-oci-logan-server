import test from 'node:test';
import assert from 'node:assert/strict';
import { LogAnalyticsClient } from '../dist/oci/LogAnalyticsClient.js';

test('initializeAuth prefers instance principal provider when available', async () => {
  let buildCalled = 0;
  const expectedProvider = { provider: 'instance-principal' };

  class FakeInstancePrincipalProvider {
    static builder() {
      return {
        build: async () => {
          buildCalled += 1;
          return expectedProvider;
        }
      };
    }
  }

  let configFallbackUsed = false;

  class TestClient extends LogAnalyticsClient {
    async initializeClient() {
      // Prevent automatic initialization logic from running during construction.
    }

    async runInitializeAuth() {
      await this.initializeAuth();
    }

    async isRunningOnOCI() {
      return true;
    }

    getInstancePrincipalsProviderClass() {
      return FakeInstancePrincipalProvider;
    }

    createConfigFileProvider() {
      configFallbackUsed = true;
      return { provider: 'config' };
    }

    getProviderForTest() {
      return this.getAuthProvider();
    }
  }

  const client = new TestClient();

  await client.runInitializeAuth();

  assert.equal(buildCalled, 1, 'Instance principals builder should be invoked exactly once');
  assert.equal(
    configFallbackUsed,
    false,
    'Config file provider should not be used when instance principals succeed'
  );
  assert.deepEqual(
    client.getProviderForTest(),
    expectedProvider,
    'Instance principals provider should be stored on the client'
  );
});
