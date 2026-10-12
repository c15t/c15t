import { policyRulePresets } from '@c15t/core';
import { resolvePolicyRules } from '@c15t/schema/types';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createGlobal, installGlobal } from '../global';
import type { C15tGlobal } from '../global';
import type { ConsentClientOptions } from '../types';

const testWindow = window as Window & { c15t?: unknown };
const policy = {
	...policyRulePresets.europeOptIn(),
	categories: ['measurement'] as const,
	match: { isDefault: true },
	scopeMode: 'strict' as const,
};
const options: ConsentClientOptions = {
	consentCategories: ['measurement'],
	policyRules: [policy],
	prefetch: {
		initialPolicyResolution: resolvePolicyRules({ rules: [policy] }),
	},
	reloadOnConsentRevoked: false,
	ui: false,
};

/** Install over whatever the page queued, then init the way the tag does. */
const loadTag = function loadTag(queue: unknown[]): C15tGlobal {
	testWindow.c15t = queue;
	const api = installGlobal(createGlobal({ pkg: '@c15t/browser/test' }));
	api.init();
	return api;
};

afterEach(() => {
	(testWindow.c15t as C15tGlobal | undefined)?.dispose?.();
	testWindow.c15t = undefined;
	vi.restoreAllMocks();
	localStorage.clear();
	for (const entry of document.cookie.split(';')) {
		document.cookie = `${entry.split('=')[0]?.trim()}=; Max-Age=0; path=/`;
	}
	document.body.replaceChildren();
});

describe('queued calls before the tag loads', () => {
	it('runs a queued openDialog once the policy resolves', async () => {
		const api = loadTag([['config', options], ['openDialog']]);

		await vi.waitFor(() => {
			expect(api.getSnapshot().activeUI).toBe('dialog');
		});
	});

	it('keeps calls queued after a client action', async () => {
		const onReady = vi.fn();
		const api = loadTag([
			['config', options],
			['showBanner'],
			['on', 'ready', onReady],
		]);

		await api.ready();

		expect(onReady).toHaveBeenCalledOnce();
	});

	it.each([
		['acceptAll', 'rejectAll', false],
		['rejectAll', 'acceptAll', true],
	] as const)(
		'runs %s then %s in queue order',
		async (first, second, granted) => {
			const onConsent = vi.fn();
			const api = loadTag([
				['config', options],
				[first],
				[second],
				['on', 'consent', onConsent],
			]);

			await vi.waitFor(() => {
				expect(onConsent).toHaveBeenCalledTimes(2);
			});

			expect(api.has('measurement')).toBe(granted);
		}
	);

	it('warns about and skips an unknown method without dropping the rest', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const api = loadTag([
			['config', options],
			['notAMethod', 1],
			['getSnapshot'],
			'not a call',
			['openDialog'],
		]);

		await vi.waitFor(() => {
			expect(api.getSnapshot().activeUI).toBe('dialog');
		});
		expect(warn).toHaveBeenCalledWith(expect.stringContaining("'notAMethod'"));
		expect(warn).toHaveBeenCalledWith(expect.stringContaining("'getSnapshot'"));
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('not [method, ...args]'),
			'not a call'
		);
	});

	it('reports a failing call and still runs the calls after it', async () => {
		const error = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);
		const api = loadTag([['config', options], ['save', null], ['openDialog']]);

		await vi.waitFor(() => {
			expect(api.getSnapshot().activeUI).toBe('dialog');
		});
		expect(error).toHaveBeenCalledWith(
			expect.stringContaining('c15t.save()'),
			expect.any(TypeError)
		);
	});

	it('runs a queued processIframes once the policy resolves', async () => {
		const iframe = document.createElement('iframe');
		iframe.setAttribute('data-category', 'measurement');
		iframe.setAttribute('src', 'https://example.com/embed');
		document.body.append(iframe);

		loadTag([
			[
				'config',
				{ ...options, iframeBlocker: { disableAutomaticBlocking: true } },
			],
			['processIframes'],
		]);

		await vi.waitFor(() => {
			expect(iframe.getAttribute('src')).toBeNull();
		});
	});

	it('waits for a manual init before running queued actions', async () => {
		testWindow.c15t = [['config', options], ['openDialog']];
		const api = installGlobal(createGlobal({ pkg: '@c15t/browser/test' }));
		await Promise.resolve();
		expect(api.client).toBeNull();

		api.init();

		await vi.waitFor(() => {
			expect(api.getSnapshot().activeUI).toBe('dialog');
		});
	});
});

describe('c15t.push after the tag loads', () => {
	it('runs calls the same way as calls queued before the tag', async () => {
		const api = loadTag([['config', options]]);
		const onConsent = vi.fn();

		expect(api.push(['on', 'consent', onConsent], ['acceptAll'])).toBe(2);

		await vi.waitFor(() => {
			expect(api.has('measurement')).toBe(true);
		});
		expect(onConsent).toHaveBeenCalled();
	});

	it('waits for an earlier push to settle before running the next one', async () => {
		const api = loadTag([['config', options]]);
		const order: string[] = [];
		let finishFirst: () => void = () => undefined;
		api.acceptAll = () => {
			order.push('acceptAll:start');
			return new Promise<boolean>((resolve) => {
				finishFirst = () => {
					order.push('acceptAll:end');
					resolve(true);
				};
			});
		};
		api.rejectAll = () => {
			order.push('rejectAll');
			return Promise.resolve(true);
		};

		api.push(['acceptAll']);
		api.push(['rejectAll']);

		await vi.waitFor(() => {
			expect(order).toEqual(['acceptAll:start']);
		});
		await api.ready();
		await new Promise((resolve) => {
			setTimeout(resolve, 0);
		});
		expect(order).toEqual(['acceptAll:start']);

		finishFirst();

		await vi.waitFor(() => {
			expect(order).toEqual(['acceptAll:start', 'acceptAll:end', 'rejectAll']);
		});
	});

	it('leaves consent rejected after separate acceptAll and rejectAll pushes', async () => {
		const onConsent = vi.fn();
		const api = loadTag([
			['config', options],
			['on', 'consent', onConsent],
		]);

		api.push(['acceptAll']);
		api.push(['rejectAll']);

		await vi.waitFor(() => {
			expect(onConsent).toHaveBeenCalledTimes(2);
		});
		expect(api.has('measurement')).toBe(false);
	});

	it('runs a batch before actions pushed by a ready listener during its init', async () => {
		testWindow.c15t = [];
		const api = installGlobal(createGlobal({ pkg: '@c15t/browser/test' }));
		const onConsent = vi.fn();

		api.push(
			['config', options],
			['on', 'consent', onConsent],
			[
				'on',
				'ready',
				() => {
					api.push(['rejectAll']);
				},
			],
			['init'],
			['acceptAll']
		);

		await vi.waitFor(() => {
			expect(onConsent).toHaveBeenCalledTimes(2);
		});
		expect(api.has('measurement')).toBe(false);
	});

	it('runs actions pushed after a dispose that interrupted a wait for init', async () => {
		testWindow.c15t = [['config', options]];
		const api = installGlobal(createGlobal({ pkg: '@c15t/browser/test' }));
		const acceptAll = vi.spyOn(api, 'acceptAll');

		api.push(['acceptAll']);
		await Promise.resolve();
		api.dispose();
		api.init();
		api.push(['openDialog']);

		await vi.waitFor(() => {
			expect(api.getSnapshot().activeUI).toBe('dialog');
		});
		expect(acceptAll).not.toHaveBeenCalled();
	});

	it('drops pending actions when the API is disposed', async () => {
		const api = loadTag([['config', options]]);
		const order: string[] = [];
		let finishFirst: () => void = () => undefined;
		api.acceptAll = () => {
			order.push('acceptAll:start');
			return new Promise<boolean>((resolve) => {
				finishFirst = () => {
					order.push('acceptAll:end');
					resolve(true);
				};
			});
		};
		api.rejectAll = () => {
			order.push('rejectAll');
			return Promise.resolve(true);
		};

		api.push(['acceptAll']);
		api.push(['rejectAll']);
		await vi.waitFor(() => {
			expect(order).toEqual(['acceptAll:start']);
		});

		api.dispose();
		api.init();
		finishFirst();
		api.push(['openDialog']);

		await vi.waitFor(() => {
			expect(api.getSnapshot().activeUI).toBe('dialog');
		});
		expect(order).toEqual(['acceptAll:start', 'acceptAll:end']);
	});

	it('warns about an unsupported method and keeps going', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const api = loadTag([['config', options]]);

		expect(() =>
			api.push(['getSnapshot'], ['on', 'consent', vi.fn()])
		).not.toThrow();
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining("c15t.push(['getSnapshot', ...])")
		);
	});
});
