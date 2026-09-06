/**
 * The client boot's half of the colour scheme.
 *
 * The inline `<head>` script gets the first paint right; `boot()` has to
 * keep it right afterwards — and, because ClientRouter replaces `<html>`'s
 * attributes on every navigation, re-apply it without leaking the previous
 * media-query listener.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { boot } from '../client';
import type { AstroConsentClient } from '../client';
import { resolveOptions } from '../integration';
import { offlineMode } from '../mode';
import type { C15tAstroOptions, C15tColorScheme } from '../types';

interface MediaQueryStub {
	matches: boolean;
	listeners: Set<(event: MediaQueryListEvent) => void>;
	addEventListener: ReturnType<typeof vi.fn>;
	removeEventListener: ReturnType<typeof vi.fn>;
}

let media: MediaQueryStub;
let client: AstroConsentClient | null = null;

const stubMatchMedia = function stubMatchMedia(matches: boolean): void {
	const listeners = new Set<(event: MediaQueryListEvent) => void>();
	media = {
		addEventListener: vi.fn((_type: string, listener: () => void) => {
			listeners.add(listener);
		}),
		listeners,
		matches,
		removeEventListener: vi.fn((_type: string, listener: () => void) => {
			listeners.delete(listener);
		}),
	};
	vi.stubGlobal(
		'matchMedia',
		vi.fn(() => media)
	);
	window.matchMedia = globalThis.matchMedia;
};

const start = function start(
	colorScheme?: C15tColorScheme
): AstroConsentClient {
	const options: C15tAstroOptions = { mode: offlineMode() };
	if (colorScheme) {
		options.colorScheme = colorScheme;
	}
	client = boot(resolveOptions(options));
	return client;
};

beforeEach(() => {
	stubMatchMedia(false);
	document.documentElement.className = '';
	const globals = window as unknown as Record<string, unknown>;
	globals.__c15tAstro = undefined;
	globals.__c15tAstroColorScheme = undefined;
	globals.__c15tAstroConfig = undefined;
	globals.__c15tAstroActions = undefined;
});

afterEach(() => {
	client?.dispose();
	client = null;
	vi.unstubAllGlobals();
});

const isDark = () => document.documentElement.classList.contains('c15t-dark');

describe('boot applies the colour scheme', () => {
	it('pins dark', () => {
		start('dark');
		expect(isDark()).toBe(true);
	});

	it('pins light even when the system is dark', () => {
		stubMatchMedia(true);
		document.documentElement.classList.add('c15t-dark');
		start('light');
		expect(isDark()).toBe(false);
	});

	it('follows the system by default', () => {
		stubMatchMedia(true);
		start();
		expect(isDark()).toBe(true);
	});

	it('keeps following the system as the visitor changes it', () => {
		stubMatchMedia(false);
		start();
		expect(isDark()).toBe(false);

		media.matches = true;
		for (const listener of media.listeners) {
			listener({ matches: true } as MediaQueryListEvent);
		}
		expect(isDark()).toBe(true);
	});
});

describe('a webview with no matchMedia', () => {
	it('still honours a pinned scheme instead of throwing', () => {
		vi.stubGlobal('matchMedia', undefined);
		Reflect.set(window, 'matchMedia', undefined);

		expect(() => start('dark')).not.toThrow();
		expect(isDark()).toBe(true);
	});

	it('falls system back to light rather than keeping a stale dark', () => {
		document.documentElement.classList.add('c15t-dark');
		vi.stubGlobal('matchMedia', undefined);
		Reflect.set(window, 'matchMedia', undefined);

		expect(() => start('system')).not.toThrow();
		// The documented fallback for `system` is light, and a swapped-in
		// dark shell would otherwise stay dark for the rest of the visit.
		expect(isDark()).toBe(false);
	});
});

describe('ClientRouter navigation', () => {
	it('re-applies against the swapped document without leaking a listener', () => {
		stubMatchMedia(true);
		start();
		expect(isDark()).toBe(true);
		expect(media.listeners.size).toBe(1);

		// The swap replaces `<html>`'s attributes, taking the class with it.
		document.documentElement.className = '';
		document.dispatchEvent(new Event('astro:after-swap'));

		expect(isDark()).toBe(true);
		expect(media.listeners.size).toBe(1);
		expect(media.removeEventListener).toHaveBeenCalled();
	});
});

describe('dispose', () => {
	it('drops the media-query listener', () => {
		stubMatchMedia(true);
		start();
		expect(media.listeners.size).toBe(1);

		client?.dispose();
		client = null;

		expect(media.listeners.size).toBe(0);
		expect(
			(window as unknown as Record<string, unknown>).__c15tAstroColorScheme
		).toBeUndefined();
	});
});
