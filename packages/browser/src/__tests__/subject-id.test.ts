/**
 * A visitor has a subject ID from the first snapshot, before anything
 * binds to the client, and it stays the same through a reload and an
 * opt-out. Code that keys what it keeps by that ID can delete it all when
 * the visitor opts out, even though nothing was saved before.
 */
import type { ConsentManifest } from '@c15t/schema/types';
import {
	createConsentManifestPolicyPack,
	policyRulePresets,
} from '@c15t/schema/types';
import { afterEach, expect, test, vi } from 'vitest';

import { createScriptTagConsentClient as createConsentClient } from '../script-tag-client';
import { manifest } from '../transports/manifest';
import type { ConsentClient, ConsentSnapshot } from '../types';

const clients: ConsentClient[] = [];

const clearCookies = function clearCookies(): void {
	for (const entry of document.cookie.split(';')) {
		const name = entry.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
		}
	}
};

afterEach(() => {
	for (const client of clients.splice(0)) {
		client.dispose();
	}
	localStorage.clear();
	clearCookies();
	vi.restoreAllMocks();
});

/** Opt-out with no prompt everywhere: everything is allowed until refused. */
const optOutManifest: ConsentManifest = {
	branding: 'c15t',
	policyPacks: [
		createConsentManifestPolicyPack({
			...policyRulePresets.californiaOptOut(),
			id: 'everywhere',
			match: { isDefault: true },
		}),
	],
	revision: '1',
	schemaVersion: 2,
};

/** Opt-in in Germany, opt-out with no prompt everywhere else. */
const geoManifest: ConsentManifest = {
	...optOutManifest,
	policyPacks: [
		createConsentManifestPolicyPack(policyRulePresets.europeOptIn()),
		...(optOutManifest.policyPacks ?? []),
	],
};

const saves: unknown[] = [];

const backend = vi.fn<typeof fetch>((_input, init) => {
	if (init?.method === 'POST' && typeof init.body === 'string') {
		const body = JSON.parse(init.body) as { subjectId?: string };
		saves.push(body);
		return Promise.resolve(
			Response.json({ subjectId: body.subjectId }, { status: 200 })
		);
	}
	return Promise.resolve(Response.json({}, { status: 200 }));
});

/**
 * Starts a client and records every snapshot it publishes. `first` is the
 * snapshot right after `start()`, before anything else can read it.
 */
const start = async function start(client: ConsentClient) {
	const seen: ConsentSnapshot[] = [];
	client.subscribe((snapshot) => seen.push(snapshot));
	client.start();
	const first = client.getSnapshot();
	const ready = await client.ready();
	return { first, ready, seen: [first, ...seen] };
};

const load = function load(
	snapshot: ConsentManifest = optOutManifest,
	overrides?: { country?: string; gpc?: boolean }
): ConsentClient {
	const client = createConsentClient({
		consentCategories: ['marketing', 'measurement'],
		mode: manifest({
			backendURL: 'https://backend.test',
			fetch: backend,
			snapshot,
		}),
		overrides,
		reloadOnConsentRevoked: false,
	});
	clients.push(client);
	return client;
};

/**
 * Keeps activity per subject ID while measurement is allowed, and deletes
 * everything it kept for a subject once measurement is refused.
 */
const createActivityLog = function createActivityLog() {
	const kept = new Map<string, string[]>();
	let unbind = (): void => undefined;
	return {
		bind(client: ConsentClient): void {
			unbind = client.subscribe((snapshot) => {
				const id = snapshot.subject?.subjectId;
				if (id && snapshot.effectivePermissions.measurement === false) {
					kept.delete(id);
				}
			});
		},
		capture(client: ConsentClient, name: string): void {
			const snapshot = client.getSnapshot();
			const id = snapshot.subject?.subjectId;
			if (!(id && snapshot.effectivePermissions.measurement)) {
				return;
			}
			kept.set(id, [...(kept.get(id) ?? []), name]);
		},
		kept,
		unbind: () => unbind(),
	};
};

test('activity kept before any save is deleted under the same ID when the visitor opts out after a reload', async () => {
	saves.length = 0;
	const log = createActivityLog();

	// First load: the ID is there from the first snapshot, everything is
	// allowed by default and nothing is saved.
	const first = load();
	const firstLoad = await start(first);
	const subjectId = firstLoad.first.subject?.subjectId as string;
	expect(subjectId).toMatch(/^sub_/u);
	expect(firstLoad.ready.subject?.subjectId).toBe(subjectId);
	expect(firstLoad.ready.effectivePermissions.measurement).toBe(true);
	expect(firstLoad.ready.explicitChoice).toBeNull();

	log.bind(first);
	log.capture(first, 'page_view');
	log.capture(first, 'signup_click');
	expect(log.kept.get(subjectId)).toEqual(['page_view', 'signup_click']);
	log.unbind();
	first.dispose();

	// Reload: the same ID, still no recorded choice.
	const second = load();
	const reload = await start(second);
	expect(reload.first.subject?.subjectId).toBe(subjectId);
	expect(reload.ready.explicitChoice).toBeNull();
	expect(second.hasConsented()).toBe(false);
	log.bind(second);
	log.capture(second, 'page_view');
	expect(log.kept.get(subjectId)).toHaveLength(3);

	// Opt out: the ID does not change, so everything kept under it goes.
	const result = await second.rejectAll();
	expect(result.ok).toBe(true);
	expect(second.getSnapshot().subject?.subjectId).toBe(subjectId);
	expect(log.kept.has(subjectId)).toBe(false);
	expect(saves).toEqual([expect.objectContaining({ subjectId })]);

	log.capture(second, 'page_view');
	expect(log.kept.size).toBe(0);
});

test.each([
	{
		allowed: {},
		blocked: ['marketing', 'measurement'] as const,
		manifest: optOutManifest,
		name: 'a GPC signal',
		restricted: { gpc: true },
	},
	{
		allowed: { country: 'US' },
		blocked: ['measurement'] as const,
		manifest: geoManifest,
		name: 'an opt-in jurisdiction',
		restricted: { country: 'DE' },
	},
])(
	'$name at startup never grants its purposes, and every snapshot has the ID',
	async ({ allowed, blocked, manifest: snapshot, restricted }) => {
		const open = await start(load(snapshot, allowed));
		const limited = await start(load(snapshot, restricted));

		for (const category of blocked) {
			expect(open.ready.effectivePermissions[category]).toBe(true);
			for (const seen of limited.seen) {
				expect(seen.effectivePermissions[category]).toBe(false);
			}
		}
		for (const seen of limited.seen) {
			expect(seen.subject?.subjectId).toMatch(/^sub_/u);
		}
		expect(limited.ready.explicitChoice).toBeNull();
	}
);
