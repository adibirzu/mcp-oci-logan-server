import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import { LogAnalyticsClient } from '../LogAnalyticsClient.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
test('parseTimeRange converts all tool schema ranges to minutes', () => {
    const candidatePaths = [
        path.resolve(__dirname, '../../index.ts'),
        path.resolve(__dirname, '../../index.js'),
        path.resolve(__dirname, '../../../index.ts'),
        path.resolve(__dirname, '../../../index.js')
    ];
    const schemaSourcePath = candidatePaths.find(filePath => fs.existsSync(filePath));
    assert.ok(schemaSourcePath, 'Unable to locate tool schema definition file');
    const indexContent = fs.readFileSync(schemaSourcePath, 'utf-8');
    const enumRegex = /timeRange:\s*{[^}]*?enum:\s*\[([^\]]*)\]/gs;
    const valueRegex = /'([^']+)'/g;
    const schemaRanges = new Set();
    for (const match of indexContent.matchAll(enumRegex)) {
        const values = match[1];
        for (const valueMatch of values.matchAll(valueRegex)) {
            schemaRanges.add(valueMatch[1]);
        }
    }
    const defaultRegex = /timeRange:\s*{[^}]*?default:\s*'([^']+)'/gs;
    for (const match of indexContent.matchAll(defaultRegex)) {
        schemaRanges.add(match[1]);
    }
    const expectedMinutes = new Map([
        ['1h', 60],
        ['6h', 360],
        ['12h', 720],
        ['24h', 1440],
        ['1d', 1440],
        ['7d', 10080],
        ['30d', 43200],
        ['1w', 10080],
        ['1m', 43200],
        ['90d', 129600]
    ]);
    const unexpected = [...schemaRanges].filter(range => !expectedMinutes.has(range));
    assert.deepEqual(unexpected, [], `Missing minute mapping for: ${unexpected.join(', ')}`);
    const client = Object.create(LogAnalyticsClient.prototype);
    for (const range of schemaRanges) {
        const actual = client.parseTimeRange(range);
        assert.equal(actual, expectedMinutes.get(range), `Unexpected minute conversion for ${range}`);
    }
    assert.ok(schemaRanges.has('90d'), 'Tool schema should expose 90d time range');
});
