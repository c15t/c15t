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

// A PerformanceObserver whose resource entries the test reports by hand.
let reportResource: (responseEnd: number) => void = () => undefined;
class FakePerformanceObserver {
	private readonly report: PerformanceObserverCallback;
	private observing = false;
	constructor(report: PerformanceObserverCallback) {
		this.report = report;
	}
	observe() {
		this.observing = true;
		reportResource = (responseEnd) => {
			if (!this.observing) {
				return;
			}
			const entries = [{ responseEnd } as PerformanceResourceTiming];
			this.report(
				{
					getEntries: () => entries,
				} as unknown as PerformanceObserverEntryList,
				this as unknown as PerformanceObserver
			);
		};
	}
	disconnect() {
		this.observing = false;
	}
}

const setReadyState = (state: DocumentReadyState) => {
	Object.defineProperty(document, 'readyState', {
		configurable: true,
		get: () => state,
	});
};

const addImage = ({ lazy = false } = {}) => {
	const image = document.createElement('img');
	if (lazy) {
		image.loading = 'lazy';
	}
	Object.defineProperty(image, 'complete', {
		configurable: true,
		value: false,
		writable: true,
	});
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
		addImage({ lazy: true });
		const task = vi.fn();
		scheduleIdlePreload(task, { quietMs: 500 });

		vi.advanceTimersByTime(600);
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
