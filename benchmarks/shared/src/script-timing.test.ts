import { describe, expect, it } from 'vitest';

import type {
	BenchIdleTask,
	BenchScriptResource,
	BenchScriptTiming,
} from './script-timing';
import {
	isIdlePreload,
	summarizeBenchScripts,
	summarizeIdlePreloadMetrics,
} from './script-timing';

const script = function script(
	name: string,
	startTime: number,
	responseEnd: number,
	overrides: Partial<BenchScriptResource> = {}
): BenchScriptResource {
	return {
		encodedBodySize: 1000,
		initiatorType: 'script',
		responseEnd,
		startTime,
		transferSize: 1000,
		url: `http://127.0.0.1/_next/static/chunks/${name}.js`,
		...overrides,
	};
};

// The persistence writer preload: an idle callback task after load.
const afterLoadIdleTask: BenchIdleTask = {
	afterLoad: true,
	endMs: 98.9,
	startMs: 98.3,
};

const pageScripts = [script('runtime', 24.5, 32.3), script('app', 24.6, 37.3)];

describe('summarizeBenchScripts', () => {
	it('stops lastAppScriptEndMs at an idle-time preload and reports the preload separately', () => {
		const timing: BenchScriptTiming = {
			idleTasks: [afterLoadIdleTask],
			resources: [...pageScripts, script('writer', 98.8, 140)],
		};

		expect(summarizeBenchScripts(timing, 'script-initiator')).toEqual({
			appScriptCount: 3,
			firstAppScriptStartMs: 24.5,
			idlePreloadBytes: 1000,
			idlePreloadCount: 1,
			idlePreloadEndMs: 140,
			jsBytes: 3000,
			lastAppScriptEndMs: 37.3,
		});
	});

	it('still counts a slow script the page requested before the preload', () => {
		const timing: BenchScriptTiming = {
			idleTasks: [afterLoadIdleTask],
			resources: [
				...pageScripts,
				script('slow-vendor', 30, 400),
				script('writer', 98.8, 100),
			],
		};

		const metrics = summarizeBenchScripts(timing, 'script-initiator');

		expect(metrics?.lastAppScriptEndMs).toBe(400);
		expect(metrics?.idlePreloadCount).toBe(1);
		expect(metrics?.idlePreloadEndMs).toBe(100);
	});

	it('counts a late script that no idle callback requested', () => {
		const timing: BenchScriptTiming = {
			idleTasks: [afterLoadIdleTask],
			resources: [...pageScripts, script('late-chunk', 150, 190)],
		};

		const metrics = summarizeBenchScripts(timing, 'script-initiator');

		expect(metrics?.lastAppScriptEndMs).toBe(190);
		expect(metrics?.idlePreloadCount).toBe(0);
		expect(metrics?.idlePreloadEndMs).toBeNull();
	});

	it('reports scripts that start after the first preload with the preloads', () => {
		// A preloaded chunk can pull in more chunks once it runs, outside the
		// idle task. They are part of the preload, not of the page's start.
		const timing: BenchScriptTiming = {
			idleTasks: [afterLoadIdleTask],
			resources: [
				...pageScripts,
				script('dialog', 98.5, 101),
				script('dialog-dependency', 102, 110),
			],
		};

		const metrics = summarizeBenchScripts(timing, 'script-initiator');

		expect(metrics?.lastAppScriptEndMs).toBe(37.3);
		expect(metrics?.idlePreloadCount).toBe(2);
		expect(metrics?.idlePreloadEndMs).toBe(110);
		expect(metrics?.idlePreloadBytes).toBe(2000);
	});

	it('treats an idle callback that ran before load as part of the page start', () => {
		const timing: BenchScriptTiming = {
			idleTasks: [{ afterLoad: false, endMs: 20.5, startMs: 20 }],
			resources: [...pageScripts, script('early-idle', 20.2, 45)],
		};

		const metrics = summarizeBenchScripts(timing, 'script-initiator');

		expect(metrics?.lastAppScriptEndMs).toBe(37.3);
		expect(metrics?.idlePreloadCount).toBe(0);
	});

	it('counts module preloads only when matching module URLs', () => {
		const timing: BenchScriptTiming = {
			idleTasks: [],
			resources: [
				script('entry', 5, 9),
				script('module-graph', 10, 30, { initiatorType: 'link' }),
			],
		};

		expect(
			summarizeBenchScripts(timing, 'script-initiator')?.lastAppScriptEndMs
		).toBe(9);
		expect(
			summarizeBenchScripts(timing, 'script-or-module-url')?.lastAppScriptEndMs
		).toBe(30);
	});

	it('returns null without scripts or timing', () => {
		expect(summarizeBenchScripts(null, 'script-initiator')).toBeNull();
		expect(
			summarizeBenchScripts(
				{ idleTasks: [], resources: [] },
				'script-or-module-url'
			)
		).toBeNull();
	});
});

describe('isIdlePreload', () => {
	it('covers microtasks queued by the callback until the next task starts', () => {
		expect(
			isIdlePreload(script('writer', 98.9, 100), [afterLoadIdleTask])
		).toBe(true);
		expect(isIdlePreload(script('writer', 99, 100), [afterLoadIdleTask])).toBe(
			false
		);
	});

	it('keeps an idle task whose next task has not run open-ended', () => {
		expect(
			isIdlePreload(script('writer', 500, 520), [
				{ ...afterLoadIdleTask, endMs: null },
			])
		).toBe(true);
	});
});

describe('summarizeIdlePreloadMetrics', () => {
	it('reports a missing preload end as null rather than zero', () => {
		const [count, bytes, endMs] = summarizeIdlePreloadMetrics([
			{ idlePreloadBytes: 0, idlePreloadCount: 0, idlePreloadEndMs: null },
			{ idlePreloadBytes: 0, idlePreloadCount: 0, idlePreloadEndMs: null },
		]);

		expect(count).toMatchObject({ median: 0, name: 'idlePreloadCount' });
		expect(bytes).toMatchObject({ median: 0, name: 'idlePreloadBytes' });
		expect(endMs).toMatchObject({ median: null, name: 'idlePreloadEndMs' });
	});
});
