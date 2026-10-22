/** @vitest-environment jsdom */
import { afterEach, expect, test, vi } from 'vitest';

import {
	choiceRecords,
	matchedResolution,
	NOW,
	optInRule,
} from '../../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../../kernel';
import { createScriptLoader } from '../index';
import type { Script, ScriptCallbackInfo } from '../index';

const granted = { functionality: true, marketing: true, measurement: true };
const disposers: (() => void)[] = [];

afterEach(() => {
	for (const dispose of disposers.splice(0).reverse()) {
		dispose();
	}
	document.head.replaceChildren();
	vi.restoreAllMocks();
});

const mount = () => {
	const kernel = createConsentKernel({
		initialRecords: choiceRecords(granted),
		now: NOW,
	});
	const loader = createScriptLoader({ kernel, scripts: [] });
	disposers.push(kernel.dispose, loader.dispose);
	return { kernel, loader };
};

const script = (overrides: Partial<Script> = {}): Script => ({
	callbackOnly: true,
	category: { and: ['marketing', 'measurement'] },
	id: 'current-consent',
	vendor: 'current-vendor',
	...overrides,
});

test.each(['onBeforeLoad', 'onConsentChange'] as const)(
	'reads a reentrant category withdrawal inside %s before reconciliation',
	(lifecycle) => {
		const { kernel, loader } = mount();
		const observations: (ScriptCallbackInfo | undefined)[] = [];
		let armed = lifecycle === 'onBeforeLoad';
		const config = script({
			alwaysLoad: true,
			[lifecycle]: (info: ScriptCallbackInfo) => {
				if (!armed) {
					return;
				}
				armed = false;
				observations.push(info);
				void kernel.commands.save({
					...granted,
					functionality: lifecycle === 'onBeforeLoad',
					measurement: false,
				});
				observations.push(info.getCurrentConsent?.());
			},
		});
		loader.updateScripts([config]);
		if (lifecycle === 'onConsentChange') {
			armed = true;
			void kernel.commands.save({ ...granted, functionality: false });
		}
		expect(observations).toHaveLength(2);
		expect(observations[0]).toMatchObject({
			consents: { measurement: true },
			hasConsent: true,
		});
		expect(observations[1]).toMatchObject({
			consents: {
				functionality: lifecycle === 'onBeforeLoad',
				measurement: false,
			},
			hasConsent: false,
			vendor: { granted: true, id: 'current-vendor' },
		});
		expect(observations[1]?.registration).toBe(observations[0]?.registration);
	}
);

test.each([
	['dispose', 'category'],
	['dispose', 'vendor'],
	['remove', 'category'],
	['remove', 'vendor'],
	['replace', 'category'],
	['replace', 'vendor'],
] as const)(
	'preserves pending %s/%s withdrawal when the last declaration leaves',
	(action, withdrawal) => {
		const { kernel, loader } = mount();
		const before = vi.fn();
		const pending = vi.fn();
		const dispose = vi.fn();
		loader.updateScripts([
			script({
				onBeforeLoad: (info) => {
					before(info);
					void kernel.commands.save(
						{ ...granted, measurement: withdrawal !== 'category' },
						{ vendors: { 'current-vendor': withdrawal !== 'vendor' } }
					);
					pending(info.getCurrentConsent?.());
					if (action === 'dispose') {
						loader.dispose();
					} else {
						loader.updateScripts(
							action === 'remove'
								? []
								: [script({ category: 'necessary', vendor: undefined })]
						);
					}
				},
				onDispose: (info) => dispose(info, info.getCurrentConsent?.()),
			}),
		]);
		expect(dispose).toHaveBeenCalledOnce();
		const initial: ScriptCallbackInfo = before.mock.calls[0]?.[0];
		const departure: ScriptCallbackInfo = dispose.mock.calls[0]?.[0];
		// The historical event field remains compatible; the reader is authoritative.
		expect(departure.hasConsent).toBe(true);
		expect(departure.vendor?.granted).toBe(
			action === 'dispose' || withdrawal !== 'vendor'
		);
		expect(pending).toHaveBeenCalledWith(
			expect.objectContaining({
				hasConsent: false,
				vendor: { granted: withdrawal !== 'vendor', id: 'current-vendor' },
			})
		);
		expect(departure.getCurrentConsent?.()).toMatchObject({
			consents: { measurement: withdrawal !== 'category' },
			hasConsent: false,
			vendor: { granted: withdrawal !== 'vendor', id: 'current-vendor' },
		});
		expect(dispose.mock.calls[0]?.[1]).toMatchObject({
			hasConsent: false,
			vendor: { granted: withdrawal !== 'vendor', id: 'current-vendor' },
		});
		expect(departure.registration).toBe(initial.registration);
		expect(kernel.getSnapshot().vendors?.declared ?? []).toEqual([]);
		void kernel.commands.save(granted, { vendors: { 'current-vendor': true } });
		expect(initial.getCurrentConsent?.().hasConsent).toBe(false);
		expect(departure.getCurrentConsent?.().hasConsent).toBe(false);
	}
);

test.each(['none', 'category', 'vendor'] as const)(
	'distinguishes replacement notification from %s withdrawal within it',
	(withdrawal) => {
		const { kernel, loader } = mount();
		const changes = vi.fn();
		const dispose = vi.fn();
		const config = script({
			onConsentChange: (info) => {
				if (withdrawal !== 'none') {
					void kernel.commands.save(
						{ ...granted, measurement: withdrawal !== 'category' },
						{ vendors: { 'current-vendor': withdrawal !== 'vendor' } }
					);
				}
				changes(info, info.getCurrentConsent?.());
			},
			onDispose: dispose,
		});
		loader.updateScripts([config]);
		loader.updateScripts([
			script({ category: 'necessary', vendor: undefined }),
		]);
		expect(changes).toHaveBeenCalledOnce();
		expect(changes.mock.calls[0]?.[0].hasConsent).toBe(false);
		expect(changes.mock.calls[0]?.[1]).toMatchObject({
			hasConsent: withdrawal === 'none',
			vendor: { granted: withdrawal !== 'vendor', id: 'current-vendor' },
		});
		const departure: ScriptCallbackInfo = dispose.mock.calls[0]?.[0];
		expect(departure.getCurrentConsent?.().hasConsent).toBe(
			withdrawal === 'none'
		);
		void kernel.commands.save({ ...granted, measurement: false });
		expect(departure.getCurrentConsent?.().hasConsent).toBe(
			withdrawal === 'none'
		);
	}
);

test('keeps an old reader frozen when the same Script object is registered again', () => {
	const { kernel, loader } = mount();
	const before = vi.fn();
	const config = script({ onBeforeLoad: before });
	loader.updateScripts([config]);
	const first: ScriptCallbackInfo = before.mock.calls[0]?.[0];
	loader.updateScripts([]);
	void kernel.commands.save({ ...granted, measurement: false });
	loader.updateScripts([config]);
	void kernel.commands.save(granted);
	expect(before).toHaveBeenCalledTimes(2);
	const second: ScriptCallbackInfo = before.mock.calls[1]?.[0];
	void kernel.commands.save({ ...granted, measurement: false });
	expect(first.getCurrentConsent?.().hasConsent).toBe(true);
	expect(second.getCurrentConsent?.().hasConsent).toBe(false);
	expect(second.registration).toBe(first.registration);
});

test('keeps necessary-only vendors granted despite a stored vendor denial', () => {
	const kernel = createConsentKernel({
		initialRecords: {
			...choiceRecords(granted),
			vendorChoice: {
				confirmedAt: NOW - 1,
				denied: ['current-vendor'],
				version: 1,
			},
		},
		now: NOW,
	});
	const before = vi.fn();
	const dispose = vi.fn();
	const loader = createScriptLoader({
		kernel,
		scripts: [
			script({
				category: 'necessary',
				onBeforeLoad: before,
				onDispose: dispose,
			}),
		],
	});
	disposers.push(kernel.dispose, loader.dispose);
	expect(kernel.getSnapshot().vendors?.declared[0]?.disabled).toBe(true);
	const initial: ScriptCallbackInfo = before.mock.calls[0]?.[0];
	expect(initial.getCurrentConsent?.()).toMatchObject({
		hasConsent: true,
		vendor: { granted: true, id: 'current-vendor' },
	});
	loader.dispose();
	const departure: ScriptCallbackInfo = dispose.mock.calls[0]?.[0];
	expect(departure.getCurrentConsent?.()).toMatchObject({
		hasConsent: true,
		vendor: { granted: true, id: 'current-vendor' },
	});
});

test('supplies a pre-teardown reader to an initially denied, disposal-only registration', () => {
	const { kernel, loader } = mount();
	const dispose = vi.fn();
	loader.updateScripts([script({ onDispose: dispose })]);
	void kernel.commands.save(granted, { vendors: { 'current-vendor': false } });
	// Replace with an unmounted registration that has never received callback info.
	loader.updateScripts([
		script({ id: 'denied-dispose-only', onDispose: dispose }),
	]);
	dispose.mockClear();
	loader.dispose();
	expect(dispose).toHaveBeenCalledOnce();
	const departure: ScriptCallbackInfo = dispose.mock.calls[0]?.[0];
	expect(departure.getCurrentConsent?.()).toMatchObject({
		hasConsent: false,
		vendor: { granted: false, id: 'current-vendor' },
	});
	expect(kernel.getSnapshot().vendors?.declared ?? []).toEqual([]);
});

test('reads policy-effective categories rather than saved choices', () => {
	const resolution = matchedResolution(
		optInRule({ categories: ['marketing'], scopeMode: 'strict' })
	);
	const kernel = createConsentKernel({
		initialPolicyResolution: resolution,
		initialRecords: choiceRecords(granted, {
			fingerprint: resolution.fingerprints.choice,
		}),
		now: NOW,
	});
	const before = vi.fn();
	const loader = createScriptLoader({
		kernel,
		scripts: [script({ alwaysLoad: true, onBeforeLoad: before })],
	});
	disposers.push(kernel.dispose, loader.dispose);
	const initial: ScriptCallbackInfo = before.mock.calls[0]?.[0];
	expect(initial.getCurrentConsent?.()).toMatchObject({
		consents: { marketing: true, measurement: false },
		hasConsent: false,
	});
});

test.each(['load', 'error'] as const)(
	'preserves nonenumerable reader and registration through %s and disposal',
	(event) => {
		const { kernel, loader } = mount();
		const before = vi.fn();
		const completion = vi.fn();
		const dispose = vi.fn();
		loader.updateScripts([
			script({
				alwaysLoad: true,
				callbackOnly: false,
				onBeforeLoad: before,
				onDispose: dispose,
				onError: completion,
				onLoad: completion,
				src: 'https://example.invalid/current-consent.js',
			}),
		]);
		document.head.querySelector('script')?.dispatchEvent(new Event(event));
		expect(completion).toHaveBeenCalledOnce();
		const initial: ScriptCallbackInfo = before.mock.calls[0]?.[0];
		const completed: ScriptCallbackInfo = completion.mock.calls[0]?.[0];
		void kernel.commands.save({ ...granted, measurement: false });
		expect(completed.getCurrentConsent?.().hasConsent).toBe(false);
		loader.dispose();
		const departure: ScriptCallbackInfo = dispose.mock.calls[0]?.[0];
		for (const info of [initial, completed, departure]) {
			expect(typeof info.registration).toBe('symbol');
			expect(info.registration).toBe(initial.registration);
			expect(typeof info.getCurrentConsent).toBe('function');
			expect(Object.keys(info)).not.toContain('registration');
			expect(Object.keys(info)).not.toContain('getCurrentConsent');
			expect({ ...info }).not.toHaveProperty('getCurrentConsent');
		}
		expect(completed.error instanceof Error).toBe(event === 'error');
	}
);

test.each([
	['marketing', false],
	['necessary', true],
] as const)(
	'reads the current %s vendor gate after a reentrant declaration sweep',
	(category, allowed) => {
		const { kernel, loader } = mount();
		let current: ScriptCallbackInfo | undefined;
		let armed = true;
		loader.updateScripts([
			script({
				category,
				onBeforeLoad(info) {
					if (!armed) {
						return;
					}
					armed = false;
					void kernel.commands.save(granted, {
						vendors: { 'current-vendor': false },
					});
					kernel.set.vendors({ declared: [] }, { replaceSource: 'script' });
					current = info.getCurrentConsent?.();
				},
			}),
		]);
		expect(current).toMatchObject({
			hasConsent: allowed,
			vendor: { granted: allowed, id: 'current-vendor' },
		});
	}
);

test.each(['category', 'vendor'] as const)(
	'reads a %s withdrawal saved by an earlier disposal callback',
	(withdrawal) => {
		const { kernel, loader } = mount();
		let departure: ScriptCallbackInfo | undefined;
		loader.updateScripts([
			{
				callbackOnly: true,
				category: 'necessary',
				id: 'earlier-disposal',
				onDispose() {
					void kernel.commands.save(
						{ ...granted, measurement: withdrawal !== 'category' },
						{ vendors: { 'current-vendor': withdrawal !== 'vendor' } }
					);
				},
			},
			script({
				onDispose: (info) => {
					departure = info;
				},
			}),
		]);
		loader.dispose();
		expect(departure?.hasConsent).toBe(true);
		expect(departure?.getCurrentConsent?.()).toMatchObject({
			consents: { measurement: withdrawal !== 'category' },
			hasConsent: false,
			vendor: { granted: withdrawal !== 'vendor', id: 'current-vendor' },
		});
		void kernel.commands.save(granted, { vendors: { 'current-vendor': true } });
		expect(departure?.getCurrentConsent?.().hasConsent).toBe(false);
	}
);

test.each([false, true])(
	'settles replacement effects after incoming reconciliation, aborted=%s',
	(abort) => {
		const { kernel, loader } = mount();
		const events: string[] = [];
		loader.updateScripts([
			script({
				onDispose(info) {
					expect(info.replacing).toBe(true);
					expect(Object.keys(info)).not.toContain('afterReplacement');
					info.afterReplacement?.(() => events.push('settled'));
					if (abort) {
						loader.dispose();
					}
				},
			}),
		]);
		void kernel.commands.save({ ...granted, measurement: false });
		loader.updateScripts([
			script({
				observeConsentBeforeLoad: true,
				onConsentChange: () => events.push('incoming'),
			}),
		]);
		expect(events).toEqual(abort ? ['settled'] : ['incoming', 'settled']);
	}
);

test('continues replacement completion after another callback throws', () => {
	const { loader } = mount();
	const completed = vi.fn();
	loader.updateScripts([
		script({
			id: 'throwing-completion',
			onDispose(info) {
				info.afterReplacement?.(() => {
					throw new Error('replacement callback failure');
				});
			},
		}),
		script({
			id: 'surviving-completion',
			onDispose: (info) => info.afterReplacement?.(completed),
		}),
	]);
	expect(() =>
		loader.updateScripts([
			script({ id: 'throwing-completion' }),
			script({ id: 'surviving-completion' }),
		])
	).not.toThrow();
	expect(completed).toHaveBeenCalledOnce();
});
