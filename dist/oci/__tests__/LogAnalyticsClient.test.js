import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { homedir } from 'os';
import { LogAnalyticsClient } from '../LogAnalyticsClient.js';
test('initializeAuth prefers instance principal provider when available', async () => {
    const client = Object.create(LogAnalyticsClient.prototype);
    const clientState = client;
    clientState.provider = null;
    clientState.config = {};
    clientState.isRunningOnOCI = async () => true;
    clientState.getInstancePrincipalsBuilder = () => function () { };
    const instanceProvider = { kind: 'instance-principal' };
    const configCalls = [];
    clientState.buildInstancePrincipalsProvider = async () => instanceProvider;
    clientState.createConfigFileProvider = (configurationFilePath, profile) => {
        configCalls.push({ configurationFilePath, profile });
        return { configurationFilePath, profile };
    };
    await (clientState.initializeAuth());
    assert.equal(clientState.provider, instanceProvider);
    assert.equal(configCalls.length, 0);
});
test('initializeAuth falls back to config provider when instance principal fails', async () => {
    const client = Object.create(LogAnalyticsClient.prototype);
    const clientState = client;
    clientState.provider = null;
    clientState.config = { profile: 'CUSTOM' };
    clientState.isRunningOnOCI = async () => true;
    clientState.getInstancePrincipalsBuilder = () => function () { };
    clientState.buildInstancePrincipalsProvider = async () => {
        throw new Error('Simulated instance principal failure');
    };
    const configInstances = [];
    clientState.createConfigFileProvider = (configurationFilePath, profile) => {
        const provider = { configurationFilePath, profile };
        configInstances.push(provider);
        return provider;
    };
    await clientState.initializeAuth();
    assert.equal(configInstances.length, 1);
    assert.equal(configInstances[0].configurationFilePath, path.join(homedir(), '.oci', 'config'));
    assert.equal(configInstances[0].profile, 'CUSTOM');
    assert.equal(clientState.provider, configInstances[0]);
});
