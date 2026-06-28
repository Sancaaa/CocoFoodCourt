import { OdooClient } from './odoo-client';
import assert from 'node:assert';
import test from 'node:test';
import xmlrpc from 'xmlrpc';

test('OdooClient mock mode detection', () => {
  const origUseMock = process.env.USE_MOCK_ODOO;
  const origNodeEnv = process.env.NODE_ENV;

  try {
    // Test when USE_MOCK_ODOO is explicitly 'true'
    process.env.USE_MOCK_ODOO = 'true';
    const client1 = new OdooClient();
    assert.strictEqual(client1['isMock'], true);

    // Test when USE_MOCK_ODOO is explicitly 'false'
    process.env.USE_MOCK_ODOO = 'false';
    const client2 = new OdooClient();
    assert.strictEqual(client2['isMock'], false);

    // Test default when USE_MOCK_ODOO is not specified
    delete process.env.USE_MOCK_ODOO;
    
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    const client3 = new OdooClient();
    assert.strictEqual(client3['isMock'], false);

    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
    const client4 = new OdooClient();
    assert.strictEqual(client4['isMock'], true);
  } finally {
    if (origUseMock !== undefined) {
      process.env.USE_MOCK_ODOO = origUseMock;
    } else {
      delete process.env.USE_MOCK_ODOO;
    }
    if (origNodeEnv !== undefined) {
      (process.env as Record<string, string | undefined>).NODE_ENV = origNodeEnv;
    } else {
      delete (process.env as Record<string, string | undefined>).NODE_ENV;
    }
  }
});

test('OdooClient validateConfig behavior', () => {
  const origUseMock = process.env.USE_MOCK_ODOO;
  const origUrl = process.env.ODOO_URL;
  const origDb = process.env.ODOO_DB;
  const origUser = process.env.ODOO_USERNAME;
  const origKey = process.env.ODOO_API_KEY;

  try {
    process.env.USE_MOCK_ODOO = 'false';
    
    // Clear env vars to trigger error
    delete process.env.ODOO_URL;
    delete process.env.ODOO_DB;
    delete process.env.ODOO_USERNAME;
    delete process.env.ODOO_API_KEY;

    const client = new OdooClient();
    assert.throws(() => {
      client['validateConfig']();
    }, /Missing required Odoo environment variables: ODOO_URL, ODOO_DB, ODOO_USERNAME, ODOO_API_KEY/);
  } finally {
    if (origUseMock !== undefined) process.env.USE_MOCK_ODOO = origUseMock;
    if (origUrl !== undefined) process.env.ODOO_URL = origUrl;
    if (origDb !== undefined) process.env.ODOO_DB = origDb;
    if (origUser !== undefined) process.env.ODOO_USERNAME = origUser;
    if (origKey !== undefined) process.env.ODOO_API_KEY = origKey;
  }
});

test('OdooClient authenticate in mock mode', async () => {
  const origUseMock = process.env.USE_MOCK_ODOO;
  try {
    process.env.USE_MOCK_ODOO = 'true';
    const client = new OdooClient();
    const uid = await client.authenticate();
    assert.strictEqual(uid, 1);
  } finally {
    if (origUseMock !== undefined) process.env.USE_MOCK_ODOO = origUseMock;
  }
});

test('OdooClient behavior when mocking is false (configuration error)', async () => {
  const origUseMock = process.env.USE_MOCK_ODOO;
  const origUrl = process.env.ODOO_URL;
  const origDb = process.env.ODOO_DB;
  const origUser = process.env.ODOO_USERNAME;
  const origKey = process.env.ODOO_API_KEY;

  try {
    process.env.USE_MOCK_ODOO = 'false';
    // Remove configuration so that configuration validation throws an error
    delete process.env.ODOO_URL;
    delete process.env.ODOO_DB;
    delete process.env.ODOO_USERNAME;
    delete process.env.ODOO_API_KEY;

    const client = new OdooClient();
    
    // Calling executeKw should throw a configuration error and not return dummy data
    await assert.rejects(async () => {
      await client.executeKw('restaurant.table', 'search_read', []);
    }, /Missing required Odoo environment variables/);

  } finally {
    if (origUseMock !== undefined) process.env.USE_MOCK_ODOO = origUseMock;
    if (origUrl !== undefined) process.env.ODOO_URL = origUrl;
    if (origDb !== undefined) process.env.ODOO_DB = origDb;
    if (origUser !== undefined) process.env.ODOO_USERNAME = origUser;
    if (origKey !== undefined) process.env.ODOO_API_KEY = origKey;
  }
});

test('OdooClient behavior when mocking is false (connection error)', async () => {
  const origUseMock = process.env.USE_MOCK_ODOO;
  const origUrl = process.env.ODOO_URL;
  const origDb = process.env.ODOO_DB;
  const origUser = process.env.ODOO_USERNAME;
  const origKey = process.env.ODOO_API_KEY;

  try {
    process.env.USE_MOCK_ODOO = 'false';
    // Provide a valid structure but pointing to a non-existent URL or port
    process.env.ODOO_URL = 'http://localhost:12345';
    process.env.ODOO_DB = 'test_db';
    process.env.ODOO_USERNAME = 'test_user';
    process.env.ODOO_API_KEY = 'test_key';

    const client = new OdooClient();

    // Calling authenticate should trigger a connection error (e.g. ECONNREFUSED) rather than returning dummy data
    await assert.rejects(async () => {
      await client.authenticate();
    }, (err: unknown) => {
      const error = err as Error & { code?: string };
      return !!error && (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED') || error.message.includes('connect'));
    });

    // Calling executeKw should also trigger a connection error
    await assert.rejects(async () => {
      await client.executeKw('restaurant.table', 'search_read', []);
    }, (err: unknown) => {
      const error = err as Error & { code?: string };
      return !!error && (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED') || error.message.includes('connect'));
    });

  } finally {
    if (origUseMock !== undefined) process.env.USE_MOCK_ODOO = origUseMock;
    if (origUrl !== undefined) process.env.ODOO_URL = origUrl;
    if (origDb !== undefined) process.env.ODOO_DB = origDb;
    if (origUser !== undefined) process.env.ODOO_USERNAME = origUser;
    if (origKey !== undefined) process.env.ODOO_API_KEY = origKey;
  }
});

test('OdooClient authenticate with dynamic credentials propagates them and keeps uid null', async () => {
  const origUseMock = process.env.USE_MOCK_ODOO;
  const origUrl = process.env.ODOO_URL;
  const origDb = process.env.ODOO_DB;
  const origUser = process.env.ODOO_USERNAME;
  const origKey = process.env.ODOO_API_KEY;

  const originalCreateClient = xmlrpc.createClient;
  
  try {
    process.env.USE_MOCK_ODOO = 'false';
    process.env.ODOO_URL = 'http://localhost:8090'; // dummy url, won't actually request if we mock xmlrpc
    process.env.ODOO_DB = 'test_db';
    process.env.ODOO_USERNAME = 'test_user';
    process.env.ODOO_API_KEY = 'test_key';

    const client = new OdooClient();
    
    // Spies/mocks
    let createClientUrl = '';
    let methodCallName = '';
    let methodCallArgs: unknown[] = [];
    
    xmlrpc.createClient = (options: Parameters<typeof xmlrpc.createClient>[0]): ReturnType<typeof xmlrpc.createClient> => {
      createClientUrl = typeof options === 'string' ? options : (options.url || '');
      return {
        methodCall: (methodName: string, params: unknown[], callback: (error: Error | null, value: unknown) => void) => {
          methodCallName = methodName;
          methodCallArgs = params;
          // Simulate successful authentication returning a UID
          callback(null, 999);
        }
      } as unknown as ReturnType<typeof xmlrpc.createClient>;
    };

    // Case 1: Call authenticate with dynamic credentials
    const dynamicUid = await client.authenticate('dynamic_user', 'dynamic_password');
    
    assert.strictEqual(dynamicUid, 999);
    assert.strictEqual(createClientUrl, 'http://localhost:8090/xmlrpc/2/common');
    assert.strictEqual(methodCallName, 'authenticate');
    assert.deepStrictEqual(methodCallArgs, ['test_db', 'dynamic_user', 'dynamic_password', {}]);
    assert.strictEqual(client['uid'], null); // uid must remain null

    // Reset spies
    createClientUrl = '';
    methodCallName = '';
    methodCallArgs = [];

    // Case 2: Call authenticate with NO dynamic credentials (standard authenticate)
    const defaultUid = await client.authenticate();
    assert.strictEqual(defaultUid, 999);
    assert.strictEqual(createClientUrl, 'http://localhost:8090/xmlrpc/2/common');
    assert.strictEqual(methodCallName, 'authenticate');
    assert.deepStrictEqual(methodCallArgs, ['test_db', 'test_user', 'test_key', {}]);
    assert.strictEqual(client['uid'], 999); // uid must be stored
    
  } finally {
    // Restore
    xmlrpc.createClient = originalCreateClient;
    if (origUseMock !== undefined) process.env.USE_MOCK_ODOO = origUseMock;
    if (origUrl !== undefined) process.env.ODOO_URL = origUrl;
    if (origDb !== undefined) process.env.ODOO_DB = origDb;
    if (origUser !== undefined) process.env.ODOO_USERNAME = origUser;
    if (origKey !== undefined) process.env.ODOO_API_KEY = origKey;
  }
});
