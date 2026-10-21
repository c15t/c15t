/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createConsentKernel } from '../../../kernel';
import { flushPendingMounts, mountScript, unmountScript } from '../mount';
import type { MountDeps } from '../mount';
import { createElementIdResolver } from '../normalize';
import { scriptLoaderTools } from '../tools';
import type { PendingMount, Script } from '../types';

const makeDeps = function makeDeps(): {
	deps: MountDeps;
	emitted: { action: string; scriptId: string }[];
} {
	const emitted: { action: string; scriptId: string }[] = [];
	const deps: MountDeps = {
		elementIds: createElementIdResolver(),
		emit: (event) => {
			emitted.push({ action: event.action, scriptId: event.scriptId });
		},
		getSnapshot: createConsentKernel().getSnapshot,
		hasDebugListener: true,
		isDisposed: () => false,
		loadedElements: new Map(),
		ownedScriptIds: new Set(),
		retainedElements: new Map(),
		tools: scriptLoaderTools,
	};
	return { deps, emitted };
};

beforeEach(() => {
	document.head.innerHTML = '';
	document.body.innerHTML = '';
});

afterEach(() => {
	document.head.innerHTML = '';
	document.body.innerHTML = '';
});

describe('mountScript', () => {
	test('applies the loader nonce unless the script declares its own', () => {
		const { deps } = makeDeps();
		deps.nonce = 'loader-nonce';
		const snapshot = createConsentKernel().getSnapshot();

		mountScript(
			deps,
			{
				category: 'necessary',
				id: 'inherits',
				src: 'https://example.com/a.js',
			},
			snapshot,
			true,
			null
		);
		mountScript(
			deps,
			{
				category: 'necessary',
				id: 'own',
				nonce: 'script-nonce',
				src: 'https://example.com/b.js',
			},
			snapshot,
			true,
			null
		);

		expect(deps.loadedElements.get('inherits')?.nonce).toBe('loader-nonce');
		expect(deps.loadedElements.get('own')?.nonce).toBe('script-nonce');
	});

	test.each([false, true])(
		'emits mounted lifecycle events without legacy debug listeners, batched=%s',
		(batched) => {
			const { deps, emitted } = makeDeps();
			deps.hasDebugListener = false;
			const batch: PendingMount[] | null = batched ? [] : null;
			mountScript(
				deps,
				{ category: 'necessary', id: 'inline', textContent: 'void 0;' },
				createConsentKernel().getSnapshot(),
				true,
				batch
			);
			if (batch) {
				flushPendingMounts(deps, batch);
			}
			expect(emitted).toContainEqual({ action: 'loaded', scriptId: 'inline' });
		}
	);
	test('throws when both src and textContent are set', () => {
		const { deps } = makeDeps();
		const snap = createConsentKernel().getSnapshot();
		const script: Script = {
			category: 'marketing',
			id: 's',
			src: 'https://x/s.js',
			textContent: 'console.log(1);',
		};
		expect(() => mountScript(deps, script, snap, true, null)).toThrow(
			/cannot have both/u
		);
	});

	test('throws when neither src, textContent, nor callbackOnly is set', () => {
		const { deps } = makeDeps();
		const snap = createConsentKernel().getSnapshot();
		const script: Script = { category: 'marketing', id: 's' };
		expect(() => mountScript(deps, script, snap, true, null)).toThrow(
			/either 'src'/u
		);
	});

	test('callback-only script registers null in loadedElements', () => {
		const { deps } = makeDeps();
		const snap = createConsentKernel().getSnapshot();
		const onLoad = vi.fn();
		const script: Script = {
			callbackOnly: true,
			category: 'marketing',
			id: 's',
			onLoad,
		};
		mountScript(deps, script, snap, true, null);
		expect(deps.loadedElements.get('s')).toBeNull();
		expect(onLoad).toHaveBeenCalledOnce();
	});

	test.each([
		{ callbackOnly: undefined, skipsElement: false },
		{ callbackOnly: false, skipsElement: false },
		{ callbackOnly: true, skipsElement: true },
		{ callbackOnly: () => false, skipsElement: false },
		{ callbackOnly: () => true, skipsElement: true },
	])(
		'resolves callbackOnly=$callbackOnly to $skipsElement',
		({ callbackOnly, skipsElement }) => {
			const { deps } = makeDeps();
			const onBeforeLoad = vi.fn();
			const script: Script = {
				callbackOnly,
				category: 'necessary',
				id: 'runtime-check',
				onBeforeLoad,
				src: 'https://example.com/sdk.js',
			};
			mountScript(
				deps,
				script,
				createConsentKernel().getSnapshot(),
				true,
				null
			);
			expect(document.head.querySelectorAll('script')).toHaveLength(
				skipsElement ? 0 : 1
			);
			expect(onBeforeLoad).toHaveBeenCalledOnce();
			expect(deps.loadedElements.get(script.id)).toBe(
				skipsElement ? null : document.head.querySelector('script')
			);
		}
	);

	test('a false callback-only predicate still requires a script source', () => {
		const { deps } = makeDeps();
		expect(() =>
			mountScript(
				deps,
				{
					callbackOnly: () => false,
					category: 'necessary',
					id: 'missing-source',
				},
				createConsentKernel().getSnapshot(),
				true,
				null
			)
		).toThrow(/either 'src'/u);
	});

	test('queues the element when a batch is provided', () => {
		const { deps } = makeDeps();
		const snap = createConsentKernel().getSnapshot();
		const batch: PendingMount[] = [];
		const script: Script = {
			category: 'marketing',
			id: 's',
			src: 'https://x/s.js',
		};
		mountScript(deps, script, snap, true, batch);
		expect(batch).toHaveLength(1);
		// DOM not touched yet.
		expect(document.head.querySelector('script')).toBeNull();
		// Not registered until flush.
		expect(deps.loadedElements.has('s')).toBe(false);
	});

	test('appends directly when no batch is provided', () => {
		const { deps } = makeDeps();
		const snap = createConsentKernel().getSnapshot();
		const script: Script = {
			category: 'marketing',
			id: 's',
			src: 'https://x/s.js',
		};
		mountScript(deps, script, snap, true, null);
		expect(document.head.querySelector('script')).not.toBeNull();
		expect(deps.loadedElements.has('s')).toBe(true);
		expect(deps.ownedScriptIds.has('s')).toBe(true);
	});

	test('reuses an existing element with the resolved ID', () => {
		const { deps, emitted } = makeDeps();
		const snap = createConsentKernel().getSnapshot();
		const onBeforeLoad = vi.fn();
		const onConsentChange = vi.fn();
		const script: Script = {
			anonymizeId: false,
			category: 'marketing',
			id: 's',
			onBeforeLoad,
			onConsentChange,
			src: 'https://x/s.js',
		};
		const existing = document.createElement('script');
		existing.id = 'c15t-script-s';
		document.head.appendChild(existing);

		mountScript(deps, script, snap, true, null);

		expect(document.head.querySelectorAll('script')).toHaveLength(1);
		expect(deps.loadedElements.get('s')).toBe(existing);
		expect(deps.ownedScriptIds.has('s')).toBe(false);
		expect(onBeforeLoad).not.toHaveBeenCalled();
		expect(onConsentChange).toHaveBeenCalledOnce();
		expect(emitted).toContainEqual({
			action: 'already_loaded',
			scriptId: 's',
		});
	});
});

describe('mountScript with a server-started element', () => {
	type StartedWindow = Window & {
		__c15tStarted?: Record<string, HTMLScriptElement>;
	};

	const startOnServer = function startOnServer(
		id: string,
		src: string,
		done?: 'load' | 'error',
		scriptId = id
	): HTMLScriptElement {
		const element = document.createElement('script');
		element.setAttribute('src', src);
		Object.assign(element, { __c15tScript: scriptId });
		if (done) {
			Object.assign(element, { __c15tDone: done });
		}
		document.head.appendChild(element);
		const started = window as StartedWindow;
		started.__c15tStarted = { ...started.__c15tStarted, [id]: element };
		return element;
	};

	afterEach(() => {
		delete (window as StartedWindow).__c15tStarted;
	});

	test.each(['load', 'error', undefined] as const)(
		'retains a completed server load before callback replay, completion=%s',
		(done) => {
			const { deps } = makeDeps();
			const script: Script = {
				category: 'marketing',
				id: 's',
				persistAfterConsentRevoked: 'loaded',
				src: 'https://x/s.js',
			};
			const element = startOnServer('s', script.src ?? '', done);
			const snapshot = createConsentKernel().getSnapshot();
			mountScript(deps, script, snapshot, true, null);
			unmountScript(deps, script, snapshot, false);
			expect(element.isConnected).toBe(done === 'load');
		}
	);

	test('adopts the element instead of inserting another', async () => {
		const { deps, emitted } = makeDeps();
		const onBeforeLoad = vi.fn();
		const onLoad = vi.fn();
		const script: Script = {
			category: 'marketing',
			id: 's',
			onBeforeLoad,
			onLoad,
			src: 'https://x/s.js',
		};
		const element = startOnServer('s', script.src ?? '', 'load');

		mountScript(deps, script, createConsentKernel().getSnapshot(), true, null);
		await Promise.resolve();

		expect(document.head.querySelectorAll('script')).toHaveLength(1);
		expect(deps.loadedElements.get('s')).toBe(element);
		expect(element.id).toBe(deps.elementIds.resolve(script));
		expect(onBeforeLoad).toHaveBeenCalledWith(
			expect.objectContaining({ hasConsent: true, startedOnServer: true })
		);
		expect(onLoad).toHaveBeenCalledOnce();
		expect(emitted).toContainEqual({ action: 'already_loaded', scriptId: 's' });
	});

	test('adopts the element started for its resourceKey, not its id', () => {
		const { deps } = makeDeps();
		const other = startOnServer('s', 'https://x/other.js');
		const own = startOnServer('shared', 'https://x/s.js');

		mountScript(
			deps,
			{ category: 'marketing', id: 's', resourceKey: 'shared', src: own.src },
			createConsentKernel().getSnapshot(),
			true,
			null
		);

		expect(deps.loadedElements.get('s')).toBe(own);
		expect(other.id).toBe('');
	});

	test('fires onLoad when the adopted element finishes later', () => {
		const { deps } = makeDeps();
		const onLoad = vi.fn();
		const script: Script = {
			category: 'marketing',
			id: 's',
			onLoad,
			src: 'https://x/s.js',
		};
		const element = startOnServer('s', script.src ?? '');

		mountScript(deps, script, createConsentKernel().getSnapshot(), true, null);
		element.dispatchEvent(new Event('load'));

		expect(onLoad).toHaveBeenCalledOnce();
	});

	test('adopts the element when the src differs, and says so', () => {
		const { deps } = makeDeps();
		const emit = vi.spyOn(deps, 'emit');
		const script: Script = {
			category: 'marketing',
			id: 's',
			src: 'https://x/s.js',
		};
		const started = startOnServer('s', 'https://x/old.js');

		mountScript(deps, script, createConsentKernel().getSnapshot(), true, null);

		expect(document.head.querySelectorAll('script')).toHaveLength(1);
		expect(deps.loadedElements.get('s')).toBe(started);
		expect(emit).toHaveBeenCalledWith(
			expect.objectContaining({
				action: 'already_loaded',
				data: { serverSrc: 'https://x/old.js' },
			})
		);
	});

	describe('still waiting to be inserted', () => {
		type PendingElement = HTMLScriptElement & { __c15tInsert?: () => void };

		/** Mirrors the inline start's pending insert. */
		const startPending = function startPending(
			src: string,
			key = 's'
		): {
			element: PendingElement;
			insert: () => void;
		} {
			const element: PendingElement = document.createElement('script');
			element.setAttribute('src', src);
			const insert = () => {
				if (element.__c15tInsert !== insert) {
					return;
				}
				delete element.__c15tInsert;
				document.head.appendChild(element);
			};
			element.__c15tInsert = insert;
			const started = window as StartedWindow;
			started.__c15tStarted = { ...started.__c15tStarted, [key]: element };
			return { element, insert };
		};

		const pendingScript = (extra: Partial<Script> = {}): Script => ({
			category: 'marketing',
			id: 's',
			src: 'https://x/s.js',
			...extra,
		});

		test('adopts the element and leaves the insert to the start', () => {
			const { deps } = makeDeps();
			const onLoad = vi.fn();
			const script = pendingScript({ onLoad });
			const { element, insert } = startPending(script.src ?? '');

			mountScript(
				deps,
				script,
				createConsentKernel().getSnapshot(),
				true,
				null
			);

			expect(deps.loadedElements.get('s')).toBe(element);
			expect(document.head.querySelector('script')).toBeNull();

			insert();
			element.dispatchEvent(new Event('load'));

			expect(document.head.querySelectorAll('script')).toHaveLength(1);
			expect(onLoad).toHaveBeenCalledOnce();
		});

		test.each([
			['a script', {}],
			[
				'a persistAfterConsentRevoked script',
				{ persistAfterConsentRevoked: true },
			],
			[
				'a completed-load retention script',
				{ persistAfterConsentRevoked: 'loaded' as const },
			],
		])(
			'cancels the insert when consent is withdrawn first, for %s',
			(_, extra) => {
				const { deps } = makeDeps();
				const script = pendingScript(extra);
				const { insert } = startPending(script.src ?? '');
				const snapshot = createConsentKernel().getSnapshot();

				mountScript(deps, script, snapshot, true, null);
				unmountScript(deps, script, snapshot, false);
				insert();

				expect(document.head.querySelector('script')).toBeNull();
				expect(deps.loadedElements.has('s')).toBe(false);
				expect(deps.retainedElements.has('s')).toBe(false);
			}
		);

		test('gives a second script with the same resource the same element', () => {
			const { deps } = makeDeps();
			const first = pendingScript({ resourceKey: 'shared' });
			const second = pendingScript({ id: 't', resourceKey: 'shared' });
			const { element, insert } = startPending(first.src ?? '', 'shared');
			const snapshot = createConsentKernel().getSnapshot();

			mountScript(deps, first, snapshot, true, null);
			mountScript(deps, second, snapshot, true, null);
			insert();

			expect(document.head.querySelectorAll('script')).toHaveLength(1);
			expect(deps.loadedElements.get('t')).toBe(element);
		});
	});

	describe('held after the stored consent changed', () => {
		const startHeld = function startHeld(): HTMLScriptElement {
			const element = document.createElement('script');
			element.setAttribute('src', 'https://x/s.js');
			Object.assign(element, { __c15tHeld: true });
			(window as StartedWindow).__c15tStarted = { s: element };
			return element;
		};

		test('inserts the element when the loader runs the script', () => {
			const { deps } = makeDeps();
			const onBeforeLoad = vi.fn();
			const element = startHeld();

			mountScript(
				deps,
				{ category: 'marketing', id: 's', onBeforeLoad, src: element.src },
				createConsentKernel().getSnapshot(),
				true,
				null
			);

			expect(element.isConnected).toBe(true);
			expect(document.head.querySelectorAll('script')).toHaveLength(1);
			expect(onBeforeLoad).toHaveBeenCalledWith(
				expect.objectContaining({ startedOnServer: true })
			);
		});

		test('never inserts it when the loader revokes the script', () => {
			const { deps } = makeDeps();
			const element = startHeld();
			const script: Script = {
				category: 'marketing',
				id: 's',
				persistAfterConsentRevoked: true,
				src: element.src,
			};

			unmountScript(deps, script, createConsentKernel().getSnapshot(), false);

			expect(element.isConnected).toBe(false);
			expect(deps.retainedElements.has('s')).toBe(false);
		});
	});

	test('adopts an alwaysLoad element the server started without consent', () => {
		const { deps } = makeDeps();
		const onBeforeLoad = vi.fn();
		const onConsentChange = vi.fn();
		const script: Script = {
			alwaysLoad: true,
			category: 'marketing',
			id: 's',
			onBeforeLoad,
			onConsentChange,
			src: 'https://x/s.js',
		};
		const started = startOnServer('s', script.src ?? '');
		Object.assign(started, { __c15tConsent: false });

		mountScript(deps, script, createConsentKernel().getSnapshot(), false, null);

		expect(document.head.querySelectorAll('script')).toHaveLength(1);
		expect(deps.loadedElements.get('s')).toBe(started);
		expect(onBeforeLoad).toHaveBeenCalledWith(
			expect.objectContaining({ hasConsent: false, startedOnServer: true })
		);
		expect(onConsentChange).not.toHaveBeenCalled();
	});

	test('tells the script when consent changed since the server started it', () => {
		const { deps } = makeDeps();
		const calls: [string, boolean][] = [];
		const script: Script = {
			alwaysLoad: true,
			category: 'marketing',
			id: 's',
			onBeforeLoad: (info) => calls.push(['onBeforeLoad', info.hasConsent]),
			onConsentChange: (info) =>
				calls.push(['onConsentChange', info.hasConsent]),
			src: 'https://x/s.js',
		};
		startOnServer('s', script.src ?? '');

		mountScript(deps, script, createConsentKernel().getSnapshot(), false, null);

		expect(calls).toEqual([
			['onBeforeLoad', true],
			['onConsentChange', false],
		]);
	});

	describe('when the client will not run it', () => {
		const grantedScript = (extra: Partial<Script> = {}): Script => ({
			category: 'marketing',
			id: 's',
			src: 'https://x/s.js',
			...extra,
		});

		test('cancels an insert still waiting', () => {
			const { deps } = makeDeps();
			const element: HTMLScriptElement & { __c15tInsert?: () => void } =
				document.createElement('script');
			// Mirrors the inline start's pending insert.
			const insert = () => {
				if (element.__c15tInsert === insert) {
					document.head.appendChild(element);
				}
			};
			element.__c15tInsert = insert;
			Object.assign(element, { __c15tScript: 's' });
			(window as StartedWindow).__c15tStarted = { s: element };

			unmountScript(
				deps,
				grantedScript(),
				createConsentKernel().getSnapshot(),
				false
			);
			insert();

			expect(document.head.querySelector('script')).toBeNull();
			expect((window as StartedWindow).__c15tStarted).toEqual({});
		});

		test('removes an inserted element and tells the script', () => {
			const { deps } = makeDeps();
			const calls: [string, boolean][] = [];
			const script = grantedScript({
				onBeforeLoad: (info) => calls.push(['onBeforeLoad', info.hasConsent]),
				onConsentChange: (info) =>
					calls.push(['onConsentChange', info.hasConsent]),
			});
			startOnServer('s', script.src ?? '');

			unmountScript(deps, script, createConsentKernel().getSnapshot(), false);

			expect(document.head.querySelector('script')).toBeNull();
			expect(deps.loadedElements.has('s')).toBe(false);
			expect(calls).toEqual([
				['onBeforeLoad', true],
				['onConsentChange', false],
			]);
		});

		test('leaves an element started for another script with its resource', () => {
			const { deps } = makeDeps();
			const snapshot = createConsentKernel().getSnapshot();
			const shared = { category: 'marketing', resourceKey: 'shared' } as const;
			const element = startOnServer(
				'shared',
				'https://x/s.js',
				undefined,
				'runs'
			);

			unmountScript(
				deps,
				{ ...shared, id: 'skipped', src: 'https://x/s.js' },
				snapshot,
				false
			);
			mountScript(
				deps,
				{ ...shared, id: 'runs', src: 'https://x/s.js' },
				snapshot,
				true,
				null
			);

			expect(element.isConnected).toBe(true);
			expect(deps.loadedElements.get('runs')).toBe(element);
			expect(document.head.querySelectorAll('script')).toHaveLength(1);
		});
	});
});

describe('unmountScript', () => {
	test('persistAfterConsentRevoked keeps DOM but drops registry reference', () => {
		const { deps } = makeDeps();
		const snap = createConsentKernel().getSnapshot();
		const script: Script = {
			category: 'marketing',
			id: 's',
			persistAfterConsentRevoked: true,
			src: 'https://x/s.js',
		};
		mountScript(deps, script, snap, true, null);
		expect(document.head.querySelector('script')).not.toBeNull();
		unmountScript(deps, script, snap, false);
		// DOM stays.
		expect(document.head.querySelector('script')).not.toBeNull();
		// Registry reference is gone.
		expect(deps.loadedElements.has('s')).toBe(false);
	});

	test('default behavior removes DOM and registry reference', () => {
		const { deps } = makeDeps();
		const snap = createConsentKernel().getSnapshot();
		const script: Script = {
			category: 'marketing',
			id: 's',
			src: 'https://x/s.js',
		};
		mountScript(deps, script, snap, true, null);
		unmountScript(deps, script, snap, false);
		expect(document.head.querySelector('script')).toBeNull();
		expect(deps.loadedElements.has('s')).toBe(false);
		expect(deps.ownedScriptIds.has('s')).toBe(false);
	});

	test('drops a reused element from registry without removing DOM', () => {
		const { deps } = makeDeps();
		const snap = createConsentKernel().getSnapshot();
		const script: Script = {
			anonymizeId: false,
			category: 'marketing',
			id: 's',
			src: 'https://x/s.js',
		};
		const existing = document.createElement('script');
		existing.id = 'c15t-script-s';
		document.head.appendChild(existing);
		mountScript(deps, script, snap, true, null);

		unmountScript(deps, script, snap, false);

		expect(document.head.querySelector('script')).toBe(existing);
		expect(deps.loadedElements.has('s')).toBe(false);
		expect(deps.ownedScriptIds.has('s')).toBe(false);
	});

	test('is a no-op for scripts this loader never mounted', () => {
		const { deps, emitted } = makeDeps();
		const snap = createConsentKernel().getSnapshot();
		const script: Script = {
			category: 'marketing',
			id: 'never',
			src: 'https://x/s.js',
		};
		unmountScript(deps, script, snap, false);
		expect(emitted).toEqual([]);
	});
});

describe('flushPendingMounts', () => {
	test('appends a single pending element directly', () => {
		const { deps } = makeDeps();
		const snap = createConsentKernel().getSnapshot();
		const batch: PendingMount[] = [];
		mountScript(
			deps,
			{ category: 'marketing', id: 's1', src: 'https://x/s1.js' },
			snap,
			true,
			batch
		);
		flushPendingMounts(deps, batch);
		expect(document.head.querySelectorAll('script')).toHaveLength(1);
		expect(deps.loadedElements.has('s1')).toBe(true);
	});

	test('groups multi-target appends into per-target fragments', () => {
		const { deps } = makeDeps();
		const snap = createConsentKernel().getSnapshot();
		const batch: PendingMount[] = [];
		mountScript(
			deps,
			{ category: 'marketing', id: 'h1', src: 'https://x/h1.js' },
			snap,
			true,
			batch
		);
		mountScript(
			deps,
			{ category: 'marketing', id: 'h2', src: 'https://x/h2.js' },
			snap,
			true,
			batch
		);
		mountScript(
			deps,
			{
				category: 'marketing',
				id: 'b1',
				src: 'https://x/b1.js',
				target: 'body',
			},
			snap,
			true,
			batch
		);
		flushPendingMounts(deps, batch);
		expect(document.head.querySelectorAll('script')).toHaveLength(2);
		expect(document.body.querySelectorAll('script')).toHaveLength(1);
	});

	test('empty batch is a no-op', () => {
		const { deps, emitted } = makeDeps();
		flushPendingMounts(deps, []);
		expect(emitted).toEqual([]);
	});
});
