import { expect, test } from 'vitest';

import type { C15TOptions } from '~/types';
import type { Adapter } from '../types';

interface AdapterTestOptions {
  name: string;
  getAdapter: (
    customOptions?: Omit<C15TOptions, 'storage'>
  ) => Promise<Adapter>;
  skipGenerateIdTest?: boolean;
  skipTransactionTest?: boolean;
}

export function runAdapterTests(opts: AdapterTestOptions) {
  let adapter: Adapter;

  // Setup before tests
  test(`${opts.name}: initialize adapter`, async () => {
    adapter = await opts.getAdapter();
    expect(adapter).toBeDefined();
    expect(adapter.id).toBe('kysely');
  });

  // Individual test cases
  test(`${opts.name}: create subject`, async () => {
    const res = await adapter.create({
      model: 'subject',
      data: {
        id: 'subject-id-1',
        isIdentified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    expect(res).toBeDefined();
    //@ts-expect-error - id is not a field on the subject model
    expect(res.id).toBe('subject-id-1');
  });

  test(`${opts.name}: find subject`, async () => {
    const res = await adapter.findOne({
      model: 'subject',
      where: [
        {
          field: 'id',
          value: 'subject-id-1',
        },
      ],
    });

    expect(res).toBeDefined();
    //@ts-expect-error - id is not a field on the subject model
    expect(res.id).toBe('subject-id-1');
  });

  // And so on for other tests...

  // Skip the generateId test conditionally
  // (opts.skipGenerateIdTest ? test.skip : test)(`${opts.name}: generate ID`, async () => {
  // 	// Test implementation...
  // });

  // // Skip the transaction test conditionally
  // (opts.skipTransactionTest ? test.skip : test)(`${opts.name}: transaction`, async () => {
  // 	const recordId = null;

  // 	await adapter.transaction({
  // 		callback: async (txAdapter) => {
  // 			// Transaction test implementation...
  // 		},
  // 	});

  // 	// Verification...
  // });
}
