/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createConsentKernel } from '../../../kernel';
import { flushPendingMounts, mountScript, unmountScript } from '../mount';
import type { MountDeps } from '../mount';
import { createElementIdResolver } from '../normalize';
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
		loadedElements: new Map(),
		ownedScriptIds: new Set(),
		retainedElements: new Map(),
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
