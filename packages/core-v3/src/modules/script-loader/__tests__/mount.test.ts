/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createConsentKernel } from '../../../kernel';
import {
	flushPendingMounts,
	type MountDeps,
	mountScript,
	unmountScript,
} from '../mount';
import { createElementIdResolver } from '../normalize';
import type { PendingMount, Script } from '../types';

function makeDeps(): {
	deps: MountDeps;
	emitted: { action: string; scriptId: string }[];
} {
	const emitted: { action: string; scriptId: string }[] = [];
	const deps: MountDeps = {
		loadedElements: new Map(),
		ownedScriptIds: new Set(),
		elementIds: createElementIdResolver(),
		emit: (event) => {
			emitted.push({ action: event.action, scriptId: event.scriptId });
		},
		hasDebugListener: true,
	};
	return { deps, emitted };
}

beforeEach(() => {
	document.head.innerHTML = '';
	document.body.innerHTML = '';
});

afterEach(() => {
	document.head.innerHTML = '';
	document.body.innerHTML = '';
});

describe('mountScript', () => {
	test('throws when both src and textContent are set', () => {
		const { deps } = makeDeps();
		const snap = createConsentKernel().getSnapshot();
		const script: Script = {
			id: 's',
			src: 'https://x/s.js',
			textContent: 'console.log(1);',
			category: 'marketing',
		};
		expect(() => mountScript(deps, script, snap, true, null)).toThrow(
			/cannot have both/
		);
	});

	test('throws when neither src, textContent, nor callbackOnly is set', () => {
		const { deps } = makeDeps();
		const snap = createConsentKernel().getSnapshot();
		const script: Script = { id: 's', category: 'marketing' };
		expect(() => mountScript(deps, script, snap, true, null)).toThrow(
			/either 'src'/
		);
	});

	test('callback-only script registers null in loadedElements', () => {
		const { deps } = makeDeps();
		const snap = createConsentKernel().getSnapshot();
		const onLoad = vi.fn();
		const script: Script = {
			id: 's',
			category: 'marketing',
			callbackOnly: true,
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
			id: 's',
			src: 'https://x/s.js',
			category: 'marketing',
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
			id: 's',
			src: 'https://x/s.js',
			category: 'marketing',
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
			id: 's',
			src: 'https://x/s.js',
			category: 'marketing',
			anonymizeId: false,
			onBeforeLoad,
			onConsentChange,
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
			id: 's',
			src: 'https://x/s.js',
			category: 'marketing',
			persistAfterConsentRevoked: true,
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
			id: 's',
			src: 'https://x/s.js',
			category: 'marketing',
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
			id: 's',
			src: 'https://x/s.js',
			category: 'marketing',
			anonymizeId: false,
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
			id: 'never',
			src: 'https://x/s.js',
			category: 'marketing',
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
			{ id: 's1', src: 'https://x/s1.js', category: 'marketing' },
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
			{ id: 'h1', src: 'https://x/h1.js', category: 'marketing' },
			snap,
			true,
			batch
		);
		mountScript(
			deps,
			{ id: 'h2', src: 'https://x/h2.js', category: 'marketing' },
			snap,
			true,
			batch
		);
		mountScript(
			deps,
			{
				id: 'b1',
				src: 'https://x/b1.js',
				category: 'marketing',
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
