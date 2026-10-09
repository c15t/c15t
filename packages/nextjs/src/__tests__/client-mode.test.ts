/**
 * The transport `ConsentRoot` builds for each mode. Behaviour of the lazy
 * transports themselves is pinned in core's client-mode suite.
 */
import { hosted, manifest, offline } from '@c15t/core/modes';
import { describe, expect, test, vi } from 'vitest';

import { createClientMode } from '../client-mode';

describe('createClientMode', () => {
	test('manifest() by default, carrying its data', () => {
		const mode = createClientMode(undefined, {
			backendURL: 'https://consent.example.com',
		});

		expect(mode.kind).toBe('manifest');
		expect({ ...mode }).toMatchObject({ type: 'manifest' });
	});

	test.each([
		[hosted(), 'hosted'],
		[manifest({ resolve: 'browser' }), 'manifest'],
		[offline(), 'offline'],
	] as const)('%o reports kind %s', (data, kind) => {
		const mode = createClientMode(data, {
			backendURL: 'https://consent.example.com',
		});

		expect(mode.kind).toBe(kind);
		expect({ ...mode }).toMatchObject(data);
	});

	test('runs offline without a backend URL', () => {
		expect(createClientMode(manifest(), {}).kind).toBe('offline');
		expect(createClientMode(hosted(), {}).kind).toBe('offline');
		expect(
			createClientMode(hosted({ backendURL: 'https://h.example.com' }), {}).kind
		).toBe('hosted');
	});

	test('a transport factory is used as is', () => {
		const custom = Object.assign(vi.fn(), { kind: 'custom' as const });

		expect(createClientMode(custom, {})).toBe(custom);
	});
});
