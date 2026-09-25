import { createConsentKernel } from '@c15t/core';
import { createPersistence } from '@c15t/core/modules/persistence';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { boot } from '../client';
import type { AstroConsentClient } from '../client';
import { resolveOptions } from '../integration';
import { offlineMode } from '../mode';
import { resolveConsentContext } from '../server';
import type { C15tAstroOptions } from '../types';
import { testResolution, testRule } from './policy-fixture';

/**
 * A prerendered page is built once and served to every visitor, so the
 * browser has to bring the visitor's own state to it.
 */

const OPTIONS: C15tAstroOptions = {
	mode: offlineMode({ policyRules: [testRule] }),
};

let client: AstroConsentClient | null = null;

const globals = window as unknown as Record<string, unknown>;

const clearCookies = function clearCookies(): void {
	for (const entry of document.cookie.split(';')) {
		const name = entry.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
		}
	}
	localStorage.clear();
};

/** Write a stored choice the way an earlier page view would have. */
const saveChoice = async function saveChoice(value: 'all' | 'none') {
	const kernel = createConsentKernel({
		initialPolicyResolution: testResolution(),
		now: Date.now(),
	});
	const persistence = createPersistence({ kernel });
	await kernel.commands.save(value);
	persistence.dispose();
	kernel.dispose();
};

/** Boot the way a prerendered page does: with the build's inlined config. */
const bootPrerendered = async function bootPrerendered(
	options: C15tAstroOptions = OPTIONS
): Promise<AstroConsentClient> {
	const built = await resolveConsentContext({
		headers: new Headers(),
		options: resolveOptions(options),
		prerendered: true,
	});
	globals.__c15tAstroConfig = JSON.parse(JSON.stringify(built.config));
	client = boot(resolveOptions(options));
	return client;
};

beforeEach(() => {
	clearCookies();
	document.body.innerHTML = '';
	globals.__c15tAstro = undefined;
	globals.__c15tAstroConfig = undefined;
	globals.__c15tAstroActions = undefined;
});

afterEach(() => {
	client?.dispose();
	client = null;
});

describe('a prerendered page', () => {
	it("restores the visitor's stored choice", async () => {
		await saveChoice('none');

		const booted = await bootPrerendered();

		await vi.waitFor(() => {
			expect(booted.getConsent().policyPending).toBe(false);
		});
		const snapshot = booted.getConsent();
		expect(snapshot.explicitChoice?.categories.marketing?.value).toBe(false);
		expect(snapshot.activeUI).toBe('none');
	});

	it('asks a first-time visitor', async () => {
		const booted = await bootPrerendered();

		await vi.waitFor(() => {
			expect(booted.getConsent().activeUI).toBe('banner');
		});
		expect(booted.getConsent().explicitChoice).toBeNull();
	});
});
