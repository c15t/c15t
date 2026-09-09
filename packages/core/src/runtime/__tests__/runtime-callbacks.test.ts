import { resolvePolicyRules } from '@c15t/schema/types';
/** @vitest-environment jsdom */
import { describe, expect, test, vi } from 'vitest';

import { createConsentKernel } from '../../kernel';
import { wireRuntimeCallbacks, stringifyRuntimeError } from '../callbacks';

const resolution = resolvePolicyRules({
	countryCode: null,
	regionCode: null,
	rules: [
		{
			id: 'choice',
			match: { fallback: true },
			model: 'opt-in',
			prompt: 'choice',
		},
	],
});
const createKernel = () =>
	createConsentKernel({ initialPolicyResolution: resolution, now: 1000 });

describe('runtime callbacks', () => {
	test('renders errors, strings and structures', () => {
		expect(stringifyRuntimeError(new Error('failure'))).toBe('failure');
		expect(stringifyRuntimeError('failure')).toBe('failure');
		expect(stringifyRuntimeError({ reason: 'failure' })).toBe(
			'{"reason":"failure"}'
		);
	});
	test('reports explicit actions independently of permission changes', async () => {
		const kernel = createKernel();
		const onChoiceRecorded = vi.fn();
		const onPermissionsChanged = vi.fn();
		const dispose = wireRuntimeCallbacks({
			callbacks: { onChoiceRecorded, onPermissionsChanged },
			kernel,
		});
		await kernel.commands.save({ marketing: false });
		expect(onChoiceRecorded).toHaveBeenCalledOnce();
		expect(onPermissionsChanged).not.toHaveBeenCalled();
		await kernel.commands.save({ marketing: true });
		expect(onChoiceRecorded).toHaveBeenCalledTimes(2);
		expect(onPermissionsChanged).toHaveBeenCalledOnce();
		expect(onPermissionsChanged.mock.calls[0]?.[0].previous.marketing).toBe(
			false
		);
		expect(
			onPermissionsChanged.mock.calls[0]?.[0].snapshot.effectivePermissions
				.marketing
		).toBe(true);
		dispose();
		kernel.dispose();
	});
	test('hydration never reports a visitor action', async () => {
		const source = createKernel();
		await source.commands.save({ marketing: true });
		const kernel = createKernel();
		const onChoiceRecorded = vi.fn();
		const dispose = wireRuntimeCallbacks({
			callbacks: { onChoiceRecorded },
			kernel,
		});
		kernel.hydrate({ choice: source.getSnapshot().explicitChoice });
		expect(onChoiceRecorded).not.toHaveBeenCalled();
		dispose();
		source.dispose();
		kernel.dispose();
	});
	test('reports permission changes caused by privacy signals without an action callback', () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: resolvePolicyRules({
				countryCode: null,
				regionCode: null,
				rules: [
					{
						id: 'out',
						match: { fallback: true },
						model: 'opt-out',
						privacySignals: { gpc: { denyCategories: ['marketing'] } },
						prompt: 'none',
					},
				],
			}),
			now: 1000,
		});
		const onChoiceRecorded = vi.fn();
		const onPermissionsChanged = vi.fn();
		const dispose = wireRuntimeCallbacks({
			callbacks: { onChoiceRecorded, onPermissionsChanged },
			kernel,
		});
		kernel.set.privacySignals({ gpc: true });
		expect(onChoiceRecorded).not.toHaveBeenCalled();
		expect(onPermissionsChanged).toHaveBeenCalledOnce();
		dispose();
		kernel.dispose();
	});
	test('forwards command errors and stops after disposal', async () => {
		const kernel = createKernel();
		const onError = vi.fn();
		const onChoiceRecorded = vi.fn();
		const dispose = wireRuntimeCallbacks({
			callbacks: { onChoiceRecorded, onError },
			kernel,
		});
		kernel.events.emit({
			command: 'save',
			error: new Error('failed'),
			type: 'command:error',
		});
		expect(onError).toHaveBeenCalledWith({ error: 'failed' });
		dispose();
		await kernel.commands.save({ marketing: true });
		expect(onChoiceRecorded).not.toHaveBeenCalled();
		kernel.dispose();
	});
});
