import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
	IDLE_PRELOAD_MAX_WAIT_MS,
	IDLE_PRELOAD_QUIET_MS,
	isIdlePreloadAllowed,
	scheduleIdlePreload,
} from '../idle-preload';

interface NetworkInformationStub {
	effectiveType?: string;
	saveData?: boolean;
}

// A PerformanceObserver whose entries the test reports by hand. It delivers
// only the entry types the scheduler asked to observe.
interface FakeEntry {
	responseEnd?: number;
	startTime?: number;
}
let reportEntry: (type: string, entry: FakeEntry) => void = () => undefined;
const reportResource = (responseEnd: number) =>
	reportEntry('resource', { responseEnd });
const reportPaint = (startTime: number) =>
	reportEntry('largest-contentful-paint', { startTime });
class FakePerformanceObserver {
	static readonly supportedEntryTypes = [
		'largest-contentful-paint',
		'resource',
	];
	private readonly report: PerformanceObserverCallback;
	private readonly types = new Set<string>();
	constructor(report: PerformanceObserverCallback) {
		this.report = report;
		reportEntry = (type, entry) => {
			if (!this.types.has(type)) {
				return;
			}
			const entries = [entry as PerformanceEntry];
			this.report(
				{
					getEntries: () => entries,
				} as unknown as PerformanceObserverEntryList,
				this as unknown as PerformanceObserver
			);
		};
	}
	observe({ type }: PerformanceObserverInit) {
		if (type) {
			this.types.add(type);
		}
	}
	disconnect() {
		this.types.clear();
	}
}

const setReadyState = (state: DocumentReadyState) => {
	Object.defineProperty(document, 'readyState', {
		configurable: true,
		get: () => state,
	});
};

/**
 * An incomplete `<img>` laid out at `top` (jsdom has no layout). The
 * viewport is jsdom's 1024x768. `rendered: false` stands for `display: none`.
 */
const addImage = ({
	height = 300,
	lazy = false,
	rendered = true,
	top = 0,
} = {}) => {
	const image = document.createElement('img');
	if (lazy) {
		image.loading = 'lazy';
	}
	Object.defineProperty(image, 'complete', {
		configurable: true,
		value: false,
		writable: true,
	});
	const rect = new DOMRect(0, top, height === 0 ? 0 : 400, height);
	image.getBoundingClientRect = () =>
		rendered ? rect : new DOMRect(0, 0, 0, 0);
	image.getClientRects = () =>
		(rendered ? [rect] : []) as unknown as DOMRectList;
	document.body.append(image);
	return image as HTMLImageElement & { complete: boolean };
};

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
	vi.stubGlobal('PerformanceObserver', FakePerformanceObserver);
	setReadyState('complete');
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	Reflect.deleteProperty(document, 'readyState');
	Reflect.deleteProperty(navigator, 'connection');
	Reflect.deleteProperty(navigator, 'onLine');
	document.body.innerHTML = '';
});

describe('scheduleIdlePreload', () => {
	test('waits for the load event, then for the page to go quiet', () => {
		setReadyState('loading');
		const task = vi.fn();
		scheduleIdlePreload(task);

		vi.advanceTimersByTime(IDLE_PRELOAD_MAX_WAIT_MS * 2);
		expect(task).not.toHaveBeenCalled();

		setReadyState('complete');
		window.dispatchEvent(new Event('load'));
		vi.advanceTimersByTime(IDLE_PRELOAD_QUIET_MS - 1);
		expect(task).not.toHaveBeenCalled();

		vi.advanceTimersByTime(100);
		expect(task).toHaveBeenCalledOnce();
	});

	test('restarts the quiet window when a resource finishes', () => {
		const task = vi.fn();
		scheduleIdlePreload(task, { quietMs: 500 });

		vi.advanceTimersByTime(400);
		reportResource(performance.now());
		vi.advanceTimersByTime(400);
		expect(task).not.toHaveBeenCalled();

		vi.advanceTimersByTime(200);
		expect(task).toHaveBeenCalledOnce();
	});

	test('waits while a visible image is loading', () => {
		const image = addImage();
		const task = vi.fn();
		scheduleIdlePreload(task, { quietMs: 500 });

		vi.advanceTimersByTime(3000);
		expect(task).not.toHaveBeenCalled();

		image.complete = true;
		reportResource(performance.now());
		vi.advanceTimersByTime(400);
		expect(task).not.toHaveBeenCalled();
		vi.advanceTimersByTime(500);
		expect(task).toHaveBeenCalledOnce();
	});

	test('ignores lazy images outside the viewport', () => {
		addImage({ lazy: true, top: 2000 });
		const task = vi.fn();
		scheduleIdlePreload(task, { quietMs: 500 });

		vi.advanceTimersByTime(600);
		expect(task).toHaveBeenCalledOnce();
	});

	test('ignores eager images below the viewport', () => {
		addImage({ top: 2000 });
		const task = vi.fn();
		scheduleIdlePreload(task, { quietMs: 500 });

		vi.advanceTimersByTime(600);
		expect(task).toHaveBeenCalledOnce();
	});

	test('ignores images that are not rendered', () => {
		addImage({ rendered: false });
		const task = vi.fn();
		scheduleIdlePreload(task, { quietMs: 500 });

		vi.advanceTimersByTime(600);
		expect(task).toHaveBeenCalledOnce();
	});

	test('waits for an image at the top of the page that has no size yet', () => {
		addImage({ height: 0 });
		const task = vi.fn();
		scheduleIdlePreload(task, { quietMs: 500 });

		vi.advanceTimersByTime(3000);
		expect(task).not.toHaveBeenCalled();
	});

	test('notices an image added after the first check', () => {
		const task = vi.fn();
		scheduleIdlePreload(task, { quietMs: 500 });

		vi.advanceTimersByTime(400);
		reportResource(performance.now());
		// The first check, at 500ms, finds the page busy and checks again.
		vi.advanceTimersByTime(200);
		const image = addImage();
		vi.advanceTimersByTime(3000);
		expect(task).not.toHaveBeenCalled();

		image.complete = true;
		vi.advanceTimersByTime(600);
		expect(task).toHaveBeenCalledOnce();
	});

	test('restarts the quiet window when a largest-contentful-paint candidate paints', () => {
		const task = vi.fn();
		scheduleIdlePreload(task, { quietMs: 500 });

		vi.advanceTimersByTime(400);
		reportPaint(performance.now());
		vi.advanceTimersByTime(400);
		expect(task).not.toHaveBeenCalled();

		vi.advanceTimersByTime(200);
		expect(task).toHaveBeenCalledOnce();
	});

	test('waits again when an image starts loading before the idle callback', () => {
		const requestIdleCallback = vi.fn<(callback: () => void) => number>(
			() => 1
		);
		vi.stubGlobal('requestIdleCallback', requestIdleCallback);
		const task = vi.fn();
		scheduleIdlePreload(task, { quietMs: 500 });

		vi.advanceTimersByTime(600);
		expect(requestIdleCallback).toHaveBeenCalledOnce();
		const image = addImage();
		requestIdleCallback.mock.calls[0]?.[0]();
		expect(task).not.toHaveBeenCalled();

		image.complete = true;
		reportResource(performance.now());
		vi.advanceTimersByTime(600);
		expect(requestIdleCallback).toHaveBeenCalledTimes(2);
		requestIdleCallback.mock.calls[1]?.[0]();
		expect(task).toHaveBeenCalledOnce();
	});

	test('stops waiting for quiet after the maximum wait', () => {
		addImage();
		const task = vi.fn();
		scheduleIdlePreload(task, { maxWaitMs: 2000, quietMs: 500 });

		vi.advanceTimersByTime(1900);
		expect(task).not.toHaveBeenCalled();
		vi.advanceTimersByTime(500);
		expect(task).toHaveBeenCalledOnce();
	});

	test('hands the task to requestIdleCallback with a timeout', () => {
		const requestIdleCallback = vi.fn(() => 1);
		vi.stubGlobal('requestIdleCallback', requestIdleCallback);
		const task = vi.fn();
		scheduleIdlePreload(task, { quietMs: 500 });

		vi.advanceTimersByTime(600);
		expect(requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), {
			timeout: expect.any(Number),
		});
		expect(task).not.toHaveBeenCalled();

		const [[runIdle]] = requestIdleCallback.mock.calls as unknown as [
			[() => void],
		];
		runIdle();
		expect(task).toHaveBeenCalledOnce();
	});

	test('does not run a cancelled task', () => {
		const task = vi.fn();
		const cancel = scheduleIdlePreload(task, { quietMs: 500 });
		cancel();

		vi.advanceTimersByTime(IDLE_PRELOAD_MAX_WAIT_MS * 2);
		expect(task).not.toHaveBeenCalled();
	});

	test('works without resource timing', () => {
		vi.stubGlobal('PerformanceObserver', undefined);
		const task = vi.fn();
		scheduleIdlePreload(task, { quietMs: 500 });

		vi.advanceTimersByTime(600);
		expect(task).toHaveBeenCalledOnce();
	});
});

describe('isIdlePreloadAllowed', () => {
	const stubConnection = (connection: NetworkInformationStub) => {
		Object.defineProperty(navigator, 'connection', {
			configurable: true,
			value: connection,
		});
	};

	test('allows a normal connection', () => {
		stubConnection({ effectiveType: '4g' });
		expect(isIdlePreloadAllowed()).toBe(true);
	});

	test.each([
		['Save-Data is on', { saveData: true }],
		['the connection is 2G', { effectiveType: '2g' }],
		['the connection is slow 2G', { effectiveType: 'slow-2g' }],
	])('refuses when %s', (_, connection) => {
		stubConnection(connection);
		expect(isIdlePreloadAllowed()).toBe(false);
	});

	test('refuses while offline', () => {
		Object.defineProperty(navigator, 'onLine', {
			configurable: true,
			value: false,
		});
		expect(isIdlePreloadAllowed()).toBe(false);
	});
});
