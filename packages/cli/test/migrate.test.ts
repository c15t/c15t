import { type C15TPlugin, c15tInstance } from '@c15t/backend';

import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { migrateAction } from '../src/commands/migrate';
import * as config from '../src/utils/get-config';

describe('migrate base c15t instance', () => {
  const db = new Database(':memory:');

  const auth = c15tInstance({
    baseURL: 'http://localhost:3000',
    database: db,
  });

  beforeEach(() => {
    vi.spyOn(process, 'exit').mockImplementation((code) => {
      return code as never;
    });
    vi.spyOn(config, 'getConfig').mockImplementation(async () => auth.options);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
  });

  it('should migrate the database', async () => {
    await migrateAction({
      cwd: process.cwd(),
      config: 'test/c15t.ts',
      y: true,
    });
  });
});

describe('migrate auth instance with plugins', () => {
  const db = new Database(':memory:');
  const testPlugin = {
    id: 'plugin',
    schema: {
      plugin: {
        fields: {
          test: {
            type: 'string',
            fieldName: 'test',
          },
        },
      },
    },
    type: 'plugin',
    name: 'testPlugin',
  } satisfies C15TPlugin;

  const auth = c15tInstance({
    baseURL: 'http://localhost:3000',
    database: db,
    plugins: [testPlugin],
  });

  beforeEach(() => {
    vi.spyOn(process, 'exit').mockImplementation((code) => {
      return code as never;
    });
    vi.spyOn(config, 'getConfig').mockImplementation(async () => auth.options);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
  });

  it('should migrate the database and sign-up a subject', async () => {
    await migrateAction({
      cwd: process.cwd(),
      config: 'test/c15t.ts',
      y: true,
    });
    const res = db
      .prepare('INSERT INTO plugin (id, test) VALUES (?, ?)')
      .run('1', 'test');
    expect(res.changes).toBe(1);
  });
});
