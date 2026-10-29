/**
 * @vitest-environment jsdom
 *
 * The subject ID where its paths meet: the ID made at startup, a
 * necessary-only acknowledgement, the backend's canonical ID, the server
 * reader, clears, replacement and wildcard cleanup. Each path alone is
 * covered in `subject-id.test.ts` and `necessary-subject.test.ts`.
 *
 * Every case also checks that nothing grants an optional category and that
 * no explicit choice appears that the visitor did not make.
 */
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import {
	matchedResolution,
	NOW,
	optInRule,
	optOutRule,
} from '../../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../../index';
import { getRawCookieValue } from '../../../libs/cookie';
import { generateSubjectId } from '../../../libs/generate-subject-id';
import { resolveStorageKeys } from '../../../libs/storage-keys';
import { readRequestConsent } from '../../../server/request-consent';
import { resolveRequestSubject } from '../../../server/request-subject';
import type { ConsentKernel, ConsentSnapshot, SaveInput } from '../../../types';
import { createClearOnRevocation } from '../../clear-on-revocation';
import { createPersistence, readStoredRecordsFromCookieHeader } from '../index';
import type { StorageConfig } from '../types';

const CANONICAL = 'sub_canonical';
const STORAGE = [
	['the default', undefined],
	['a custom', { storageKey: 'site-consent' }],
] as const satisfies readonly (readonly [string, StorageConfig | undefined])[];

interface SaveResponse {
	ok: boolean;
	subjectId?: string;
}

const disposers: (() => void)[] = [];

const cookieNames = function cookieNames(): string[] {
	return document.cookie
		.split('; ')
		.map((pair) => pair.slice(0, pair.indexOf('=')))
		.filter(Boolean);
};

const expireAllCookies = function expireAllCookies(): void {
	for (const name of cookieNames()) {
		document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
	}
};

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
	localStorage.clear();
	expireAllCookies();
});

afterEach(() => {
	for (const dispose of disposers.splice(0).reverse()) {
		dispose();
	}
	vi.restoreAllMocks();
	localStorage.clear();
	expireAllCookies();
	vi.useRealTimers();
});

/**
 * `necessary-only`: only strictly necessary is in scope, so a save records
 * an acknowledgement and no choice. `opt-out`: a refusal records a denial.
 */
type Scope = 'necessary-only' | 'opt-in' | 'opt-out';

/**
 * The visitor refuses everything optional. Under `opt-out` that is an
 * explicit denial of each category the default allows.
 */
const refuse = function refuse(kernel: ConsentKernel, scope: Scope): SaveInput {
	if (scope !== 'opt-out') {
		return 'none';
	}
	return Object.fromEntries(
		Object.keys(kernel.getSnapshot().effectivePermissions)
			.filter((category) => category !== 'necessary')
			.map((category) => [category, false])
	);
};

interface BootOptions {
	storageConfig?: StorageConfig;
	/** Defaults to `opt-in`. */
	scope?: Scope;
	/** What the backend answers each save with. */
	respond?: () => Promise<SaveResponse>;
	/** Collects the subject ID each save request carries. */
	sent?: (string | undefined)[];
}

/** One page load: a kernel with persistence mounted and hydrated. */
const boot = function boot(options: BootOptions = {}): {
	kernel: ConsentKernel;
	handle: ReturnType<typeof createPersistence>;
} {
	const kernel = createConsentKernel({
		...(options.scope === 'necessary-only'
			? { consentCategories: ['necessary'] }
			: {
					initialPolicyResolution: matchedResolution(
						options.scope === 'opt-out' ? optOutRule() : optInRule()
					),
				}),
		now: NOW,
		transport: {
			save: (payload: { subjectId?: string }) => {
				options.sent?.push(payload.subjectId);
				return options.respond?.() ?? Promise.resolve({ ok: true });
			},
		},
	});
	const handle = createPersistence({
		kernel,
		storageConfig: options.storageConfig,
		sync: false,
	});
	disposers.push(() => handle.dispose());
	return { handle, kernel };
};

const save = async function save(
	kernel: ConsentKernel,
	input: SaveInput
): Promise<void> {
	const saving = kernel.commands.save(input);
	await vi.advanceTimersByTimeAsync(0);
	await saving;
	// Rewrites under a canonical ID run on a later timer.
	await vi.runOnlyPendingTimersAsync();
};

const subjectIdOf = function subjectIdOf(kernel: ConsentKernel) {
	return kernel.getSnapshot().subject?.subjectId;
};

const storedSid = function storedSid(storageConfig?: StorageConfig) {
	const name = resolveStorageKeys(storageConfig).subject;
	const cookie = document.cookie
		.split('; ')
		.find((pair) => pair.startsWith(`${name}=`));
	return {
		cookie: cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null,
		local: localStorage.getItem(name),
	};
};

/** Every cookie and localStorage value, decoded, as one string. */
const everythingStored = function everythingStored(): string {
	const local = Object.keys(localStorage).map(
		(key) => `${key}=${localStorage.getItem(key)}`
	);
	const cookies = document.cookie.split('; ').map((pair) => {
		try {
			return decodeURIComponent(pair);
		} catch {
			return pair;
		}
	});
	return [...cookies, ...local].join('\n');
};

/** What a server render of the next request reads from this browser. */
const serverRead = function serverRead(storage?: StorageConfig) {
	const subject = resolveRequestSubject({
		now: Date.now(),
		request: { cookie: document.cookie, url: 'http://localhost/' },
		storage,
	});
	const { state } = readRequestConsent({
		adapter: '@c15t/test',
		now: Date.now(),
		request: {
			cookie: subject?.cookie ?? document.cookie,
			headers: new Headers(),
		},
		storage,
	});
	return { records: state.initialRecords, subject };
};

const expectNoOptionalGrant = function expectNoOptionalGrant(
	snapshot: ConsentSnapshot
): void {
	for (const [category, granted] of Object.entries(
		snapshot.effectivePermissions
	)) {
		if (category !== 'necessary') {
			expect(granted, category).toBe(false);
		}
	}
	for (const [category, decision] of Object.entries(
		snapshot.explicitChoice?.categories ?? {}
	)) {
		if (category !== 'necessary') {
			expect(decision?.value, category).toBe(false);
		}
	}
};

test.each(
	STORAGE.flatMap(
		([label, config]) =>
			[
				['all', label, config],
				['none', label, config],
			] as const
	)
)(
	'a necessary-only %s on the startup ID sends it, and a reload and the server keep it, with %s storage key',
	async (action, _, storageConfig) => {
		const sent: (string | undefined)[] = [];
		const first = boot({ scope: 'necessary-only', sent, storageConfig });
		const startup = subjectIdOf(first.kernel);
		expect(startup).toMatch(/^sub_/u);
		expect(first.kernel.getSnapshot().explicitChoice).toBeNull();
		expect(first.kernel.getSnapshot().noticeDismissal).toBeNull();
		expect(first.kernel.getSnapshot().activeUI).toBe('banner');

		// The server already sees the browser's ID before any choice.
		const before = serverRead(storageConfig);
		expect(before.subject?.subjectId).toBe(startup);
		expect(before.subject?.setCookie).toBeNull();
		expect(before.records?.choice).toBeNull();

		await save(first.kernel, action);
		const notice = first.kernel.getSnapshot().noticeDismissal;
		expect(notice).not.toBeNull();
		expect(subjectIdOf(first.kernel)).toBe(startup);
		expect(first.kernel.getSnapshot().explicitChoice).toBeNull();
		expectNoOptionalGrant(first.kernel.getSnapshot());
		expect(sent).toEqual([startup]);
		first.handle.dispose();

		const { kernel } = boot({ scope: 'necessary-only', storageConfig });
		expect(subjectIdOf(kernel)).toBe(startup);
		expect(kernel.getSnapshot().explicitChoice).toBeNull();
		expect(kernel.getSnapshot().noticeDismissal).toEqual(notice);
		expect(kernel.getSnapshot().activeUI).not.toBe('banner');
		expectNoOptionalGrant(kernel.getSnapshot());

		const after = serverRead(storageConfig);
		expect(after.subject?.subjectId).toBe(startup);
		expect(after.subject?.setCookie).toBeNull();
		expect(after.records?.choice).toBeNull();
		expect(after.records?.subject?.subjectId).toBe(startup);
	}
);

test.each(
	STORAGE.flatMap(
		([label, config]) =>
			[
				['necessary-only acknowledgement', label, 'necessary-only', config],
				['denial', label, 'opt-out', config],
			] as const
	)
)(
	'the canonical ID replaces the startup ID everywhere after a %s, with %s storage key',
	async (_, __, scope, storageConfig) => {
		const first = boot({
			respond: () => Promise.resolve({ ok: true, subjectId: CANONICAL }),
			scope,
			storageConfig,
		});
		const startup = subjectIdOf(first.kernel) as string;

		await save(first.kernel, refuse(first.kernel, scope));

		expect(subjectIdOf(first.kernel)).toBe(CANONICAL);
		expect(first.kernel.getSnapshot().explicitChoice === null).toBe(
			scope === 'necessary-only'
		);
		expectNoOptionalGrant(first.kernel.getSnapshot());
		expect(storedSid(storageConfig)).toEqual({
			cookie: CANONICAL,
			local: CANONICAL,
		});
		const server = serverRead(storageConfig);
		expect(server.subject?.subjectId).toBe(CANONICAL);
		expect(server.subject?.setCookie).toBeNull();
		expect(server.records?.subject?.subjectId).toBe(CANONICAL);
		expect(everythingStored()).not.toContain(startup);
		first.handle.dispose();

		const { kernel } = boot({ scope, storageConfig });
		expect(subjectIdOf(kernel)).toBe(CANONICAL);
		expect(kernel.getSnapshot().explicitChoice === null).toBe(
			scope === 'necessary-only'
		);
		expectNoOptionalGrant(kernel.getSnapshot());
	}
);

test.each(STORAGE)(
	'a canonical ID whose notice cookie rewrite was dropped stays the ID after a server render, with %s storage key',
	async (_, storageConfig) => {
		const keys = resolveStorageKeys(storageConfig);
		const response = Promise.withResolvers<SaveResponse>();
		const first = boot({
			respond: () => response.promise,
			scope: 'necessary-only',
			storageConfig,
		});
		const startup = subjectIdOf(first.kernel) as string;
		const saving = first.kernel.commands.save('none');
		await vi.advanceTimersByTimeAsync(0);
		// The browser refuses the rewritten notice subject cookie, as it
		// would one over its size limit. Every other write lands.
		const setter = Object.getOwnPropertyDescriptor(
			Document.prototype,
			'cookie'
		)?.set;
		vi.spyOn(document, 'cookie', 'set').mockImplementation((value: string) => {
			if (!value.startsWith(`${keys.noticeSubject}=`)) {
				setter?.call(document, value);
			}
		});
		response.resolve({ ok: true, subjectId: CANONICAL });
		await saving;
		await vi.runOnlyPendingTimersAsync();
		first.handle.dispose();
		vi.restoreAllMocks();
		// Only the notice subject cookie missed the rewrite.
		expect(subjectIdOf(first.kernel)).toBe(CANONICAL);
		expect(getRawCookieValue(keys.noticeSubject)).toContain(startup);
		expect(storedSid(storageConfig)).toEqual({
			cookie: CANONICAL,
			local: CANONICAL,
		});

		const reload = boot({ scope: 'necessary-only', storageConfig });
		expect(subjectIdOf(reload.kernel)).toBe(CANONICAL);
		expect(reload.kernel.getSnapshot().explicitChoice).toBeNull();
		expectNoOptionalGrant(reload.kernel.getSnapshot());
		reload.handle.dispose();

		// The next page is rendered on the server from cookies alone, and the
		// browser starts from what that render read.
		const server = serverRead(storageConfig);
		expect(server.records?.choice).toBeNull();
		// The response must not hand the browser its old ID back.
		expect(server.subject?.setCookie?.value).not.toBe(startup);
		if (server.subject?.setCookie) {
			document.cookie = server.subject.setCookie.header;
		}
		const seeded = createConsentKernel({
			consentCategories: ['necessary'],
			initialRecords: server.records,
			now: NOW,
		});
		const seededHandle = createPersistence({
			kernel: seeded,
			skipHydration: true,
			storageConfig,
			sync: false,
		});
		disposers.push(() => seededHandle.dispose());
		expect(subjectIdOf(seeded)).toBe(CANONICAL);
		expect(seeded.getSnapshot().explicitChoice).toBeNull();
		expectNoOptionalGrant(seeded.getSnapshot());
		expect(storedSid(storageConfig)).toEqual({
			cookie: CANONICAL,
			local: CANONICAL,
		});
		seededHandle.dispose();

		const { kernel } = boot({ scope: 'necessary-only', storageConfig });
		expect(subjectIdOf(kernel)).toBe(CANONICAL);
		expect(kernel.getSnapshot().explicitChoice).toBeNull();
	}
);

test.each(STORAGE)(
	'a notice record and a different stored ID resolve to one ID in the server reader and the browser, with %s storage key',
	async (_, storageConfig) => {
		const keys = resolveStorageKeys(storageConfig);
		const first = boot({ scope: 'necessary-only', storageConfig });
		const recorded = subjectIdOf(first.kernel) as string;
		await save(first.kernel, 'none');
		first.handle.dispose();
		// Another tab, or a server response, stored its own ID meanwhile.
		const other = generateSubjectId();
		document.cookie = `${keys.subject}=${other}; path=/`;
		localStorage.setItem(keys.subject, other);

		const server = serverRead(storageConfig);
		const { kernel } = boot({ scope: 'necessary-only', storageConfig });

		expect(server.subject?.subjectId).toBe(subjectIdOf(kernel));
		// The ID the acknowledgement recorded wins over the bare stored one.
		expect(subjectIdOf(kernel)).toBe(recorded);
		expect(server.records?.subject?.subjectId).toBe(recorded);
		expect(server.records?.choice).toBeNull();
		expect(kernel.getSnapshot().explicitChoice).toBeNull();
		expect(kernel.getSnapshot().noticeDismissal).not.toBeNull();
		expectNoOptionalGrant(kernel.getSnapshot());
	}
);

test.each(
	STORAGE.flatMap(
		([label, config]) =>
			[
				['are applied', label, false, config],
				['of the notice cookies are dropped', label, true, config],
			] as const
	)
)(
	'a clear after a canonical acknowledgement keeps only the ID when deletions %s, with %s storage key',
	async (_, __, dropNoticeDeletes, storageConfig) => {
		const keys = resolveStorageKeys(storageConfig);
		const first = boot({
			respond: () => Promise.resolve({ ok: true, subjectId: CANONICAL }),
			scope: 'necessary-only',
			storageConfig,
		});
		await save(first.kernel, 'none');
		expect(first.kernel.getSnapshot().noticeDismissal).not.toBeNull();
		await vi.advanceTimersByTimeAsync(1000);

		const setter = Object.getOwnPropertyDescriptor(
			Document.prototype,
			'cookie'
		)?.set;
		if (dropNoticeDeletes) {
			vi.spyOn(document, 'cookie', 'set').mockImplementation(
				(value: string) => {
					if (
						!value.startsWith(`${keys.notice}=`) &&
						!value.startsWith(`${keys.noticeSubject}=`)
					) {
						setter?.call(document, value);
					}
				}
			);
		}
		first.handle.clear();
		vi.restoreAllMocks();

		expect(subjectIdOf(first.kernel)).toBe(CANONICAL);
		expect(first.kernel.getSnapshot().noticeDismissal).toBeNull();
		expect(first.kernel.getSnapshot().explicitChoice).toBeNull();
		for (const key of [keys.consent, keys.notice, keys.noticeSubject]) {
			expect(localStorage.getItem(key), key).toBeNull();
		}
		const left = cookieNames().filter((name) => name.startsWith(keys.consent));
		const stale = [keys.notice, keys.noticeSubject];
		expect(stale.every((name) => left.includes(name))).toBe(dropNoticeDeletes);
		expect(left.filter((name) => !stale.includes(name)).sort()).toEqual(
			[keys.epoch, keys.subject].sort()
		);
		const server = serverRead(storageConfig);
		expect(server.subject?.subjectId).toBe(CANONICAL);
		expect(server.subject?.setCookie).toBeNull();
		expect(server.records?.choice).toBeNull();
		expect(server.records?.noticeDismissal).toBeNull();
		first.handle.dispose();

		const { kernel } = boot({ scope: 'necessary-only', storageConfig });
		expect(subjectIdOf(kernel)).toBe(CANONICAL);
		expect(kernel.getSnapshot().noticeDismissal).toBeNull();
		expect(kernel.getSnapshot().explicitChoice).toBeNull();
		expect(kernel.getSnapshot().activeUI).toBe('banner');
	}
);

test.each(
	STORAGE.flatMap(
		([label, config]) =>
			[
				['this tab', label, config],
				['another tab', label, config],
			] as const
	)
)(
	'a withdrawal and a clear in %s keep the ID and drop the linked account, with %s storage key',
	async (where, _, storageConfig) => {
		const first = boot({ storageConfig });
		const subjectId = subjectIdOf(first.kernel);
		await first.kernel.commands.identify({
			externalId: 'account-1',
			identityProvider: 'app-login',
		});
		await save(first.kernel, { measurement: true });
		expect(first.kernel.getSnapshot().subject).toMatchObject({
			externalId: 'account-1',
			identityProvider: 'app-login',
			subjectId,
		});

		await save(first.kernel, { measurement: false });
		expect(subjectIdOf(first.kernel)).toBe(subjectId);
		expectNoOptionalGrant(first.kernel.getSnapshot());
		await vi.advanceTimersByTimeAsync(1000);

		const clearing = where === 'this tab' ? first : boot({ storageConfig });
		expect(subjectIdOf(clearing.kernel)).toBe(subjectId);
		clearing.handle.clear();
		first.handle.reconcile();
		await vi.advanceTimersByTimeAsync(0);

		const snapshot = first.kernel.getSnapshot();
		expect(snapshot.subject).toEqual({ subjectId });
		expect(snapshot.explicitChoice).toBeNull();
		expect(snapshot.noticeDismissal).toBeNull();
		expect(snapshot.vendorChoice).toBeNull();
		expectNoOptionalGrant(snapshot);
		const stored = readStoredRecordsFromCookieHeader(
			document.cookie,
			storageConfig,
			Date.now()
		);
		expect(stored.choice).toBeNull();
		expect(stored.noticeDismissal).toBeNull();
		expect(stored.subject).toEqual({ subjectId });
		expect(storedSid(storageConfig)).toEqual({
			cookie: subjectId,
			local: subjectId,
		});
		expect(everythingStored()).not.toContain('account-1');
		first.handle.dispose();

		const { kernel } = boot({ storageConfig });
		expect(kernel.getSnapshot().subject).toEqual({ subjectId });
		expect(kernel.getSnapshot().explicitChoice).toBeNull();
		expect(kernel.getSnapshot().activeUI).toBe('banner');
	}
);

test.each(
	STORAGE.flatMap(
		([label, config]) =>
			[
				['a new one', label, null, config],
				['one the app names', label, 'sub_app', config],
			] as const
	)
)(
	'replacing a canonical necessary-only ID with %s reaches storage and the server, with %s storage key',
	async (_, __, next, storageConfig) => {
		const first = boot({
			respond: () => Promise.resolve({ ok: true, subjectId: CANONICAL }),
			scope: 'necessary-only',
			storageConfig,
		});
		const startup = subjectIdOf(first.kernel) as string;
		await save(first.kernel, 'none');
		const notice = first.kernel.getSnapshot().noticeDismissal;
		expect(subjectIdOf(first.kernel)).toBe(CANONICAL);

		first.kernel.set.subjectId(next);
		await vi.advanceTimersByTimeAsync(0);
		const replaced = subjectIdOf(first.kernel) as string;
		expect(replaced).toMatch(/^sub_/u);
		expect([startup, CANONICAL]).not.toContain(replaced);
		expect(replaced).toBe(next ?? replaced);
		expect(storedSid(storageConfig)).toEqual({
			cookie: replaced,
			local: replaced,
		});
		const server = serverRead(storageConfig);
		expect(server.subject?.subjectId).toBe(replaced);
		expect(server.subject?.setCookie).toBeNull();
		expect(server.records?.choice).toBeNull();
		expect(everythingStored()).not.toContain(startup);
		expect(everythingStored()).not.toContain(CANONICAL);
		first.handle.dispose();

		const { kernel } = boot({ scope: 'necessary-only', storageConfig });
		expect(subjectIdOf(kernel)).toBe(replaced);
		expect(kernel.getSnapshot().explicitChoice).toBeNull();
		expect(kernel.getSnapshot().noticeDismissal).toEqual(notice);
		expectNoOptionalGrant(kernel.getSnapshot());
	}
);

test.each(
	STORAGE.flatMap(
		([label, config]) =>
			[
				['necessary-only acknowledgement', label, 'necessary-only', config],
				['denial', label, 'opt-out', config],
			] as const
	)
)(
	'wildcard cleanup after a clear and a %s leaves every identity and notice key, with %s storage key',
	async (_, __, scope, storageConfig) => {
		const necessaryOnly = scope === 'necessary-only';
		const keys = resolveStorageKeys(storageConfig);
		const first = boot({ scope, storageConfig });
		const subjectId = subjectIdOf(first.kernel);
		// A clear first, so the clear epoch is live too.
		first.handle.clear();
		await vi.advanceTimersByTimeAsync(1000);
		await save(first.kernel, refuse(first.kernel, scope));
		const before = first.kernel.getSnapshot();

		const live = (): Record<string, string | null> =>
			Object.fromEntries([
				...cookieNames()
					.filter((name) => name.startsWith(keys.consent))
					.map((name) => [
						`cookie:${name}`,
						document.cookie
							.split('; ')
							.find((pair) => pair.startsWith(`${name}=`)) ?? null,
					]),
				...Object.keys(localStorage)
					.filter((key) => key.startsWith(keys.consent))
					.map((key) => [`local:${key}`, localStorage.getItem(key)]),
			]);
		const kept = live();
		const expected = [`cookie:${keys.subject}`, `cookie:${keys.epoch}`];
		if (necessaryOnly) {
			expected.push(`cookie:${keys.notice}`, `cookie:${keys.noticeSubject}`);
		} else {
			expected.push(`cookie:${keys.consent}`);
		}
		for (const key of expected) {
			expect(Object.keys(kept), key).toContain(key);
		}

		document.cookie = `${keys.consent}-analytics=tracking; path=/`;
		document.cookie = '_ga=GA1.1.1; path=/';
		localStorage.setItem(`${keys.consent}-analytics-cache`, 'tracking');
		const cleanup = createClearOnRevocation({
			config: {
				measurement: {
					cookies: [`${keys.consent}*`, `${keys.consent.slice(0, 1)}*`, '_ga*'],
					localStorage: [`${keys.consent}*`, `${keys.consent.slice(0, 1)}*`],
				},
			},
			kernel: first.kernel,
			storageConfig,
		});
		disposers.push(() => cleanup.dispose());

		expect(cookieNames()).not.toContain(`${keys.consent}-analytics`);
		expect(cookieNames()).not.toContain('_ga');
		expect(localStorage.getItem(`${keys.consent}-analytics-cache`)).toBeNull();
		expect(live()).toEqual(kept);
		first.handle.dispose();

		const { kernel } = boot({ scope, storageConfig });
		expect(subjectIdOf(kernel)).toBe(subjectId);
		expect(kernel.getSnapshot().explicitChoice).toEqual(before.explicitChoice);
		expect(kernel.getSnapshot().noticeDismissal).toEqual(
			before.noticeDismissal
		);
		expect(kernel.getSnapshot().explicitChoice === null).toBe(necessaryOnly);
		expectNoOptionalGrant(kernel.getSnapshot());
	}
);
