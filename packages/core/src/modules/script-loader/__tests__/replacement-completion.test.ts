/** @vitest-environment jsdom */
import { afterEach, expect, test, vi } from 'vitest';

import { choiceRecords } from '../../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../../index';
import { createScriptLoader } from '../index';
import type { Script } from '../index';

const disposers: (() => void)[] = [];

afterEach(() => {
	for (const dispose of disposers.splice(0).reverse()) {
		dispose();
	}
});

const script = (overrides: Partial<Script> = {}): Script => ({
	callbackOnly: true,
	category: 'measurement',
	id: 'replacement-completion',
	...overrides,
});

test.each([false, true])(
	'settles after incoming reconciliation or aborted replacement, aborted=%s',
	(abort) => {
		const kernel = createConsentKernel({
			initialRecords: choiceRecords({ measurement: true }),
		});
		const events: string[] = [];
		const loader = createScriptLoader({ kernel, scripts: [] });
		disposers.push(kernel.dispose, loader.dispose);
		loader.updateScripts([
			script({
				onDispose(info) {
					expect(Object.keys(info)).not.toContain('afterReplacement');
					info.afterReplacement?.(() => events.push('settled'));
					if (abort) {
						loader.dispose();
					}
				},
			}),
		]);
		loader.updateScripts([
			script({ onBeforeLoad: () => events.push('incoming') }),
		]);
		expect(events).toEqual(abort ? ['settled'] : ['incoming', 'settled']);
	}
);

test('isolates a throwing replacement effect and completes the next effect', () => {
	const kernel = createConsentKernel({
		initialRecords: choiceRecords({ measurement: true }),
	});
	const completed = vi.fn();
	const debug = vi.fn();
	const loader = createScriptLoader({
		kernel,
		onDebug: debug,
		scripts: [
			script({
				onDispose(info) {
					info.afterReplacement?.(() => {
						throw new Error('replacement callback failure');
					});
				},
			}),
			script({
				id: 'second-completion',
				onDispose: (info) => info.afterReplacement?.(completed),
			}),
		],
	});
	disposers.push(kernel.dispose, loader.dispose);
	expect(() =>
		loader.updateScripts([script(), script({ id: 'second-completion' })])
	).not.toThrow();
	expect(completed).toHaveBeenCalledOnce();
	expect(debug).toHaveBeenCalledWith(
		expect.objectContaining({
			action: 'callback_error',
			data: { error: 'replacement callback failure' },
		})
	);
});
