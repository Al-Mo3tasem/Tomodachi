// tests/unit/env.test.mjs — getEnv() hostname mapping + native override.
import { test } from 'node:test';
import assert from 'node:assert/strict';

function at(host, override) {
  globalThis.window = override ? { __TOMODACHI_ENV__: override } : {};
  globalThis.location = { hostname: host, search: '' };
}
const { getEnv, isNativeShell } = await import('../../js/config/firebase.js');

test('hostname → env', () => {
  at('localhost'); assert.equal(getEnv(), 'dev');
  at('127.0.0.1'); assert.equal(getEnv(), 'dev');
  at('tomodachi-staging.pages.dev'); assert.equal(getEnv(), 'staging');
  at('staging.tomodachi.com'); assert.equal(getEnv(), 'staging');
  at('al-mo3tasem.github.io'); assert.equal(getEnv(), 'prod');
  at('tomodachi.com'); assert.equal(getEnv(), 'prod');
});

test('native shell override beats the hostname (localhost would map to DEV)', () => {
  at('localhost', 'prod'); assert.equal(getEnv(), 'prod');
  at('localhost', 'staging'); assert.equal(getEnv(), 'staging');
  at('localhost', 'nope'); assert.equal(getEnv(), 'dev', 'unknown override is ignored');
});

test('isNativeShell reads the marker only', () => {
  globalThis.window = {}; assert.equal(isNativeShell(), false);
  globalThis.window = { __TOMODACHI_NATIVE__: true }; assert.equal(isNativeShell(), true);
  globalThis.window = { __TOMODACHI_NATIVE__: 'true' }; assert.equal(isNativeShell(), false, 'strict boolean');
});
