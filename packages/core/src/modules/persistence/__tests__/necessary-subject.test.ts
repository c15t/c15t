/** @vitest-environment jsdom */
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import {
	explicitChoice,
	matchedResolution,
	noticeRule,
} from '../../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../../index';
import { getRawCookieValue } from '../../../libs/cookie';
import { readRequestConsent } from '../../../server/request-consent';
import { resolveRequestSubject } from '../../../server/request-subject';
import type { HydrationRecords, KernelVendorsState } from '../../../types';
import { createClearOnRevocation } from '../../clear-on-revocation';
import { createPersistence, readStoredRecordsFromCookieHeader } from '../index';
import {
	readStoredNoticeDismissal,
	resolveStorageKeys,
} from '../record-storage';
import {
	clearStoredConsentRecords,
	encodeNoticeDismissalCompact,
	encodeNoticeSubjectCompact,
	writeStoredConsentEnvelope,
	writeStoredNoticeDismissal,
	writeStoredVendorChoice,
} from './record-writes';

/**
 * Expire every cookie. A clear keeps `<key>-sid`, so removing only the
 * records would carry one test's subject ID into the next.
 */
const expireCookies = function expireCookies(): void {
	for (const part of document.cookie.split(';')) {
		const [name] = part.trim().split('=');
		if (name) {
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
		}
	}
};

beforeEach(() => {
	vi.useFakeTimers();
	localStorage.clear();
	expireCookies();
});
afterEach(() => {
	localStorage.clear();
	expireCookies();
	vi.useRealTimers();
});

test.each(['all', 'none'] as const)(
	'necessary-only %s retains its canonical subject after reload without optional grants',
	async (action) => {
		const kernel = createConsentKernel({
			consentCategories: ['necessary'],
			transport: {
				save: () => Promise.resolve({ ok: true, subjectId: 'canonical' }),
			},
		});
		const handle = createPersistence({ kernel });
		const saving = kernel.commands.save(action);
		await vi.advanceTimersByTimeAsync(0);
		await saving;
		await vi.advanceTimersByTimeAsync(0);
		const notice = kernel.getSnapshot().noticeDismissal;
		handle.dispose();
		kernel.dispose();
		const restored = createConsentKernel({ consentCategories: ['necessary'] });
		const reader = createPersistence({ kernel: restored });
		expect(restored.getSnapshot().subject?.subjectId).toBe('canonical');
		expect(restored.getSnapshot().explicitChoice).toBeNull();
		expect(restored.getSnapshot().noticeDismissal).toEqual(notice);
		expect(restored.getSnapshot().effectivePermissions.measurement).toBe(false);
		expect(
			readStoredRecordsFromCookieHeader(document.cookie, undefined, Date.now())
				.subject?.subjectId
		).toBe('canonical');
		reader.clear();
		reader.dispose();
		restored.dispose();
		// A clear removes the acknowledgement and keeps the subject ID.
		const cleared = createConsentKernel({ consentCategories: ['necessary'] });
		const clearedHandle = createPersistence({ kernel: cleared });
		expect(cleared.getSnapshot().subject).toEqual({ subjectId: 'canonical' });
		expect(cleared.getSnapshot().noticeDismissal).toBeNull();
		clearedHandle.dispose();
		cleared.dispose();
	}
);

test.each([false, true])(
	'a delayed response after a necessary-only acknowledgement has success=%s',
	async (ok) => {
		const response = Promise.withResolvers<{
			ok: boolean;
			subjectId: string;
		}>();
		const kernel = createConsentKernel({
			consentCategories: ['necessary'],
			transport: { save: () => response.promise },
		});
		const handle = createPersistence({ kernel });
		const saving = kernel.commands.save('none');
		await vi.advanceTimersByTimeAsync(0);
		const generated = kernel.getSnapshot().subject?.subjectId;
		expect(generated).toBeTruthy();
		const beforeResponse = createConsentKernel({
			consentCategories: ['necessary'],
		});
		const beforeHandle = createPersistence({ kernel: beforeResponse });
		expect(beforeResponse.getSnapshot().subject?.subjectId).toBe(generated);
		beforeHandle.dispose();
		beforeResponse.dispose();
		response.resolve({ ok, subjectId: 'canonical' });
		await saving;
		await vi.advanceTimersByTimeAsync(0);
		const restored = createConsentKernel({ consentCategories: ['necessary'] });
		const reader = createPersistence({ kernel: restored });
		expect(restored.getSnapshot().subject?.subjectId).toBe(
			ok ? 'canonical' : generated
		);
		reader.dispose();
		restored.dispose();
		handle.dispose();
		kernel.dispose();
	}
);

test('a response arriving after another handle clears does not restore the visitor', async () => {
	const response = Promise.withResolvers<{ ok: boolean; subjectId: string }>();
	const kernel = createConsentKernel({
		consentCategories: ['necessary'],
		transport: { save: () => response.promise },
	});
	const handle = createPersistence({ kernel, sync: false });
	const saving = kernel.commands.save('all');
	await vi.advanceTimersByTimeAsync(0);
	const other = createConsentKernel({ consentCategories: ['necessary'] });
	const otherHandle = createPersistence({ kernel: other });
	await vi.advanceTimersByTimeAsync(1);
	otherHandle.clear();
	response.resolve({ ok: true, subjectId: 'canonical' });
	await saving;
	await vi.advanceTimersByTimeAsync(0);
	const restored = createConsentKernel({ consentCategories: ['necessary'] });
	const reader = createPersistence({ kernel: restored });
	// The acknowledgement stays cleared. The ID is the visitor's, and a
	// clear keeps it, so the server's name for it carries over.
	expect(restored.getSnapshot().subject).toEqual({ subjectId: 'canonical' });
	expect(restored.getSnapshot().noticeDismissal).toBeNull();
	reader.dispose();
	restored.dispose();
	otherHandle.dispose();
	other.dispose();
	handle.dispose();
	kernel.dispose();
});

test('a fresh necessary-only acknowledgement after clear persists and another handle reconciles it', async () => {
	const first = createConsentKernel({ consentCategories: ['necessary'] });
	const firstHandle = createPersistence({ kernel: first });
	firstHandle.clear();
	await vi.advanceTimersByTimeAsync(1);
	const second = createConsentKernel({
		consentCategories: ['necessary'],
		transport: {
			save: () => Promise.resolve({ ok: true, subjectId: 'new-subject' }),
		},
	});
	const secondHandle = createPersistence({ kernel: second });
	const saving = second.commands.save('none');
	await vi.advanceTimersByTimeAsync(0);
	await saving;
	await vi.advanceTimersByTimeAsync(0);
	secondHandle.reconcile();
	firstHandle.reconcile();
	expect(first.getSnapshot().subject?.subjectId).toBe('new-subject');
	expect(first.getSnapshot().explicitChoice).toBeNull();
	const restored = createConsentKernel({ consentCategories: ['necessary'] });
	const reader = createPersistence({ kernel: restored });
	expect(restored.getSnapshot().subject?.subjectId).toBe('new-subject');
	secondHandle.clear();
	firstHandle.reconcile();
	expect(first.getSnapshot().subject).toEqual({ subjectId: 'new-subject' });
	expect(first.getSnapshot().noticeDismissal).toBeNull();
	reader.dispose();
	restored.dispose();
	secondHandle.dispose();
	second.dispose();
	firstHandle.dispose();
	first.dispose();
});

test('a canonical subject in localStorage survives a dropped cookie rewrite', async () => {
	const response = Promise.withResolvers<{ ok: boolean; subjectId: string }>();
	const kernel = createConsentKernel({
		consentCategories: ['necessary'],
		transport: { save: () => response.promise },
	});
	const handle = createPersistence({ kernel });
	const saving = kernel.commands.save('none');
	await vi.advanceTimersByTimeAsync(0);
	const dropped = vi
		.spyOn(document, 'cookie', 'set')
		.mockImplementation(() => {});
	response.resolve({ ok: true, subjectId: 'canonical' });
	await saving;
	handle.dispose();
	kernel.dispose();
	dropped.mockRestore();
	const restored = createConsentKernel({ consentCategories: ['necessary'] });
	const reader = createPersistence({ kernel: restored });
	expect(restored.getSnapshot().subject?.subjectId).toBe('canonical');
	expect(restored.getSnapshot().explicitChoice).toBeNull();
	reader.dispose();
	restored.dispose();
});

test('a necessary-only visitor can make a second choice after reload with the same subject', async () => {
	const sent: string[] = [];
	const transport = {
		save: (payload: { subjectId?: string }) => {
			sent.push(payload.subjectId ?? 'missing');
			return Promise.resolve({ ok: true });
		},
	};
	const visit = async (action: 'all' | 'none') => {
		const kernel = createConsentKernel({
			consentCategories: ['necessary'],
			transport,
		});
		const handle = createPersistence({ kernel });
		const saving = kernel.commands.save(action);
		await vi.advanceTimersByTimeAsync(0);
		await saving;
		handle.dispose();
		kernel.dispose();
	};
	await visit('all');
	await visit('none');
	expect(sent).toHaveLength(2);
	expect(sent[0]).toBeTruthy();
	expect(sent[1]).toBe(sent[0]);
});

test.each(['consent', 'vendors'] as const)(
	'removing a notice preserves the subject when the %s record is unreadable',
	async (kind) => {
		const kernel = createConsentKernel({ consentCategories: ['necessary'] });
		const handle = createPersistence({ kernel });
		const saving = kernel.commands.save('none');
		await vi.advanceTimersByTimeAsync(0);
		await saving;
		await vi.advanceTimersByTimeAsync(0);
		const { subject } = kernel.getSnapshot();
		expect(subject?.subjectId).toBeTruthy();
		const keys = resolveStorageKeys();
		localStorage.setItem(keys[kind], 'unreadable');
		document.cookie = `${keys[kind]}=unreadable; path=/`;
		localStorage.removeItem(keys.notice);
		document.cookie = `${keys.notice}=; max-age=0; path=/`;
		handle.reconcile();
		expect(kernel.getSnapshot().noticeDismissal).toBeNull();
		expect(kernel.getSnapshot().subject).toEqual(subject);
		handle.dispose();
		kernel.dispose();
	}
);

test.each([undefined, 'custom-consent'])(
	'cookie-only identity survives reload and clear with storage key %s',
	async (storageKey) => {
		const storageConfig = { storageKey };
		const kernel = createConsentKernel({
			consentCategories: ['necessary'],
			transport: {
				save: () => Promise.resolve({ ok: true, subjectId: 'cookie-visitor' }),
			},
		});
		const handle = createPersistence({ kernel, storageConfig });
		const saving = kernel.commands.save('none');
		await vi.advanceTimersByTimeAsync(0);
		await saving;
		await vi.advanceTimersByTimeAsync(0);
		await vi.runOnlyPendingTimersAsync();
		localStorage.clear();
		const stored = readStoredRecordsFromCookieHeader(
			document.cookie,
			storageConfig,
			Date.now()
		);
		expect(stored.subject?.subjectId).toBe('cookie-visitor');
		expect(stored.choice).toBeNull();
		const restored = createConsentKernel({ consentCategories: ['necessary'] });
		const reader = createPersistence({ kernel: restored, storageConfig });
		expect(restored.getSnapshot().subject?.subjectId).toBe('cookie-visitor');
		reader.clear();
		// Only `<key>-sid` still names the visitor after the clear.
		const cleared = readStoredRecordsFromCookieHeader(
			document.cookie,
			storageConfig,
			Date.now()
		);
		expect(cleared.subject).toEqual({ subjectId: 'cookie-visitor' });
		expect(cleared.noticeDismissal).toBeNull();
		expect(
			getRawCookieValue(`${resolveStorageKeys(storageConfig).notice}-subject`)
		).toBeNull();
		reader.dispose();
		restored.dispose();
		handle.dispose();
		kernel.dispose();
	}
);

test.each([
	'absent',
	'new-time',
	'new-fingerprint',
	'corrupt-subject',
] as const)(
	'the notice subject companion is ignored when its acknowledgement is %s',
	async (change) => {
		const kernel = createConsentKernel({
			consentCategories: ['necessary'],
			transport: {
				save: () => Promise.resolve({ ok: true, subjectId: 'old-visitor' }),
			},
		});
		const handle = createPersistence({ kernel });
		const saving = kernel.commands.save('none');
		await vi.advanceTimersByTimeAsync(0);
		await saving;
		await vi.advanceTimersByTimeAsync(0);
		const { noticeDismissal: notice } = kernel.getSnapshot();
		if (!notice) {
			throw new Error('Necessary-only save must acknowledge the notice');
		}
		const key = resolveStorageKeys().notice;
		handle.dispose();
		kernel.dispose();
		localStorage.clear();
		// Without `<key>-sid` only the companion could name the visitor.
		document.cookie = `${resolveStorageKeys().subject}=; max-age=0; path=/`;
		await vi.advanceTimersByTimeAsync(1);
		if (change === 'absent') {
			document.cookie = `${key}=; max-age=0; path=/`;
		} else if (change === 'corrupt-subject') {
			document.cookie = `${key}-subject=invalid; path=/`;
		} else {
			const replacement = { ...notice };
			if (change === 'new-time') {
				replacement.dismissedAt += 1;
			} else {
				replacement.fingerprint += '-changed';
			}
			document.cookie = `${key}=${encodeNoticeDismissalCompact(replacement)}; path=/`;
		}
		const fromCookie = readStoredRecordsFromCookieHeader(
			document.cookie,
			undefined,
			Date.now()
		);
		expect(fromCookie.subject).toBeNull();
		expect(fromCookie.noticeDismissal === null).toBe(change === 'absent');
		const restored = createConsentKernel({ consentCategories: ['necessary'] });
		const reader = createPersistence({ kernel: restored });
		expect(restored.getSnapshot().subject?.subjectId).toBeTruthy();
		expect(restored.getSnapshot().subject?.subjectId).not.toBe('old-visitor');
		expect(restored.getSnapshot().explicitChoice).toBeNull();
		reader.dispose();
		restored.dispose();
	}
);

// A shared cookie can change independently of this origin's localStorage.
test.each([false, true])(
	'a canonical cookie rewrite wins after a previous dropped rewrite=%s',
	(droppedRewrite) => {
		const now = Date.now();
		const record = {
			dismissedAt: now,
			fingerprint: 'policy',
			subject: { subjectId: 'original' },
			version: 1 as const,
		};
		writeStoredNoticeDismissal(record, undefined, now);
		if (droppedRewrite) {
			const dropped = vi
				.spyOn(document, 'cookie', 'set')
				.mockImplementation(() => {});
			writeStoredNoticeDismissal(
				{ ...record, subject: { subjectId: 'local-canonical' } },
				undefined,
				now
			);
			dropped.mockRestore();
		}
		const key = resolveStorageKeys().notice;
		document.cookie = `${key}-subject=${encodeNoticeSubjectCompact({ ...record, subject: { subjectId: 'server-canonical' } })}; path=/`;
		const restored = createConsentKernel({ consentCategories: ['necessary'] });
		const reader = createPersistence({ kernel: restored });
		expect(restored.getSnapshot().subject?.subjectId).toBe('server-canonical');
		expect(
			readStoredRecordsFromCookieHeader(document.cookie, undefined, now).subject
				?.subjectId
		).toBe('server-canonical');
		expect(restored.getSnapshot().explicitChoice).toBeNull();
		reader.dispose();
		restored.dispose();
	}
);

test.each([undefined, { storageKey: 'review-custom-notice' }])(
	'partial subject-cookie writes, recovery and clear use configured keys %j',
	(storageConfig) => {
		const now = Date.now();
		const key = resolveStorageKeys(storageConfig).notice;
		const record = {
			dismissedAt: now,
			fingerprint: 'policy',
			subject: { subjectId: 'original' },
			version: 1 as const,
		};
		writeStoredNoticeDismissal(record, storageConfig, now);
		const setter = Object.getOwnPropertyDescriptor(
			Document.prototype,
			'cookie'
		)?.set;
		if (!setter) {
			throw new Error('Expected a browser cookie setter');
		}
		const dropped = vi
			.spyOn(document, 'cookie', 'set')
			.mockImplementation((value: string) => {
				if (!value.startsWith(`${key}-subject=`)) {
					setter.call(document, value);
				}
			});
		writeStoredNoticeDismissal(
			{ ...record, subject: { subjectId: 'local-canonical' } },
			storageConfig,
			now
		);
		dropped.mockRestore();
		const local = readStoredNoticeDismissal(storageConfig, now);
		expect(local?.ok && local.record.subject?.subjectId).toBe(
			'local-canonical'
		);
		expect(
			readStoredRecordsFromCookieHeader(document.cookie, storageConfig, now)
				.subject?.subjectId
		).toBe('original');
		// A successful retry removes the dropped-write exception. Even if a
		// sibling later restores the original bytes, that cookie now wins.
		writeStoredNoticeDismissal(
			{ ...record, subject: { subjectId: 'local-canonical' } },
			storageConfig,
			now
		);
		document.cookie = `${key}-subject=${encodeNoticeSubjectCompact(record)}; path=/`;
		const restored = readStoredNoticeDismissal(storageConfig, now);
		expect(restored?.ok && restored.record.subject?.subjectId).toBe('original');
		clearStoredConsentRecords(undefined, storageConfig);
		expect(readStoredNoticeDismissal(storageConfig, now)).toBeNull();
	}
);

test.each([undefined, { storageKey: 'subject-removal' }])(
	'a dropped subject-cookie deletion preserves local removal until cookies change with config %j',
	(storageConfig) => {
		const now = Date.now();
		const keys = resolveStorageKeys(storageConfig);
		const record = {
			dismissedAt: now,
			fingerprint: 'policy',
			version: 1 as const,
		};
		writeStoredNoticeDismissal(
			{ ...record, subject: { subjectId: 'original' } },
			storageConfig,
			now
		);
		const setter = Object.getOwnPropertyDescriptor(
			Document.prototype,
			'cookie'
		)?.set;
		if (!setter) {
			throw new Error('Expected a browser cookie setter');
		}
		const dropped = vi
			.spyOn(document, 'cookie', 'set')
			.mockImplementation((value: string) => {
				if (!value.startsWith(`${keys.noticeSubject}=`)) {
					setter.call(document, value);
				}
			});
		try {
			writeStoredNoticeDismissal(record, storageConfig, now);
		} finally {
			dropped.mockRestore();
		}
		expect(
			readStoredRecordsFromCookieHeader(document.cookie, storageConfig, now)
				.subject?.subjectId
		).toBe('original');
		const local = readStoredNoticeDismissal(storageConfig, now);
		expect(local?.ok).toBe(true);
		expect(local?.ok && local.record.subject).toBeUndefined();
		const kernel = createConsentKernel({ consentCategories: ['necessary'] });
		const reader = createPersistence({ kernel, storageConfig });
		// The removed identity stays removed; startup gives a new ID.
		expect(kernel.getSnapshot().subject?.subjectId).toBeTruthy();
		expect(kernel.getSnapshot().subject?.subjectId).not.toBe('original');
		reader.dispose();
		kernel.dispose();

		// The exception is bound to cookie bytes, even without a local subject.
		document.cookie = `${keys.noticeSubject}=${encodeNoticeSubjectCompact({ ...record, subject: { subjectId: 'server-canonical' } })}; path=/`;
		const changed = readStoredNoticeDismissal(storageConfig, now);
		expect(changed?.ok && changed.record.subject?.subjectId).toBe(
			'server-canonical'
		);
		clearStoredConsentRecords(undefined, storageConfig);
	}
);

test.each([undefined, { storageKey: 'custom-consent' }])(
	'wildcard revocation cleanup preserves necessary-only identity with config %j',
	async (storageConfig) => {
		const kernel = createConsentKernel({
			consentCategories: ['necessary'],
			transport: {
				save: () => Promise.resolve({ ok: true, subjectId: 'visitor' }),
			},
		});
		const handle = createPersistence({ kernel, storageConfig });
		const saving = kernel.commands.save('none');
		await vi.advanceTimersByTimeAsync(0);
		await saving;
		const key = resolveStorageKeys(storageConfig).consent;
		document.cookie = `${key}-analytics=tracking; path=/`;
		const cleanup = createClearOnRevocation({
			config: {
				measurement: { cookies: [`${key}*`], localStorage: [`${key}*`] },
			},
			kernel,
			storageConfig,
		});
		expect(getRawCookieValue(`${key}-analytics`)).toBeNull();
		cleanup.dispose();
		handle.dispose();
		kernel.dispose();
		const restored = createConsentKernel({ consentCategories: ['necessary'] });
		const reader = createPersistence({ kernel: restored, storageConfig });
		expect(restored.getSnapshot().subject?.subjectId).toBe('visitor');
		expect(restored.getSnapshot().explicitChoice).toBeNull();
		reader.clear();
		reader.dispose();
		restored.dispose();
	}
);

test.each([['necessary'], ['necessary', 'measurement']] as const)(
	'removal of the identity-bearing record clears identify data for %j',
	async (...consentCategories) => {
		const kernel = createConsentKernel({ consentCategories });
		const handle = createPersistence({ kernel });
		await kernel.commands.identify({
			externalId: 'account',
			identityProvider: 'application',
		});
		const saving = kernel.commands.save('none');
		await vi.advanceTimersByTimeAsync(0);
		await saving;
		const { subject } = kernel.getSnapshot();
		expect(subject?.externalId).toBe('account');
		clearStoredConsentRecords();
		handle.reconcile();
		// The linked identity goes with the record. The ID stays.
		expect(kernel.getSnapshot().subject).toEqual({
			subjectId: subject?.subjectId,
		});
		handle.dispose();
		kernel.dispose();
	}
);

test.each([
	['a new one', null],
	['one the app names', 'sub_app'],
] as const)(
	'replacing a necessary-only subject ID with %s rewrites the acknowledgement',
	async (_, next) => {
		const kernel = createConsentKernel({ consentCategories: ['necessary'] });
		const handle = createPersistence({ kernel });
		const saving = kernel.commands.save('none');
		await vi.advanceTimersByTimeAsync(0);
		await saving;
		await vi.advanceTimersByTimeAsync(0);
		const saved = kernel.getSnapshot().subject?.subjectId;
		const notice = kernel.getSnapshot().noticeDismissal;
		expect(saved).toBeTruthy();
		expect(notice).not.toBeNull();

		kernel.set.subjectId(next);
		const replaced = kernel.getSnapshot().subject?.subjectId;
		expect(replaced).toBeTruthy();
		expect(replaced).not.toBe(saved);
		await vi.advanceTimersByTimeAsync(0);
		handle.dispose();
		kernel.dispose();

		// Neither copy of the acknowledgement brings the old ID back.
		const keys = resolveStorageKeys();
		const local = readStoredNoticeDismissal(undefined, Date.now());
		expect(local?.ok && local.record.subject?.subjectId).toBe(replaced);
		expect(
			readStoredRecordsFromCookieHeader(document.cookie, undefined, Date.now())
				.subject?.subjectId
		).toBe(replaced);
		expect(getRawCookieValue(keys.noticeSubject)).toContain(
			`sid=${encodeURIComponent(replaced ?? '')}`
		);
		const restored = createConsentKernel({ consentCategories: ['necessary'] });
		const reader = createPersistence({ kernel: restored });
		expect(restored.getSnapshot().subject?.subjectId).toBe(replaced);
		expect(restored.getSnapshot().noticeDismissal).toEqual(notice);
		expect(restored.getSnapshot().explicitChoice).toBeNull();
		reader.dispose();
		restored.dispose();
	}
);

// The browser dropped the rewrite of the notice identity cookie, or of every
// cookie, after the save response named the canonical ID. Only localStorage
// knows the cookies are stale, so a server render still reads the startup
// ID from them. It must not store that ID again anywhere.
test.each(['notice-subject', 'all'] as const)(
	'a server render after a dropped %s cookie rewrite does not bring the startup ID back',
	async (dropped) => {
		const response = Promise.withResolvers<{
			ok: boolean;
			subjectId: string;
		}>();
		const kernel = createConsentKernel({
			consentCategories: ['necessary'],
			transport: { save: () => response.promise },
		});
		const handle = createPersistence({ kernel });
		const startup = kernel.getSnapshot().subject?.subjectId;
		const saving = kernel.commands.save('none');
		await vi.advanceTimersByTimeAsync(0);
		const keys = resolveStorageKeys();
		const setter = Object.getOwnPropertyDescriptor(
			Document.prototype,
			'cookie'
		)?.set;
		const drop = vi
			.spyOn(document, 'cookie', 'set')
			.mockImplementation((value: string) => {
				if (
					dropped === 'notice-subject' &&
					!value.startsWith(`${keys.noticeSubject}=`)
				) {
					setter?.call(document, value);
				}
			});
		try {
			response.resolve({ ok: true, subjectId: 'canonical' });
			await saving;
			await vi.runOnlyPendingTimersAsync();
		} finally {
			drop.mockRestore();
		}
		handle.dispose();
		kernel.dispose();
		expect(getRawCookieValue(keys.noticeSubject)).toContain(`sid=${startup}`);
		expect(getRawCookieValue(keys.subject)).toBe(
			dropped === 'all' ? startup : 'canonical'
		);

		// The server renders from the cookies alone. The records win there,
		// so the render still names the startup ID, but a subject cookie
		// already present is never replaced.
		const subject = resolveRequestSubject({
			now: Date.now(),
			request: { cookie: document.cookie, url: 'https://example.com/' },
		});
		expect(subject?.subjectId).toBe(startup);
		expect(subject?.setCookie).toBeNull();
		const { state } = readRequestConsent({
			adapter: '@c15t/test',
			now: Date.now(),
			request: { cookie: subject?.cookie, headers: new Headers() },
		});
		expect(state.initialRecords?.subject?.subjectId).toBe(startup);

		// The browser seeded with that render resolves from storage.
		const seeded = createConsentKernel({
			consentCategories: ['necessary'],
			initialRecords: state.initialRecords,
		});
		const seededHandle = createPersistence({
			kernel: seeded,
			skipHydration: true,
		});
		expect(seeded.getSnapshot().subject?.subjectId).toBe('canonical');
		expect(seeded.getSnapshot().explicitChoice).toBeNull();
		expect(localStorage.getItem(keys.subject)).toBe('canonical');
		// Startup leaves a subject cookie it cannot tell is stale alone.
		expect(getRawCookieValue(keys.subject)).toBe(
			dropped === 'all' ? startup : 'canonical'
		);
		seededHandle.dispose();
		seeded.dispose();

		const restored = createConsentKernel({ consentCategories: ['necessary'] });
		const reader = createPersistence({ kernel: restored });
		expect(restored.getSnapshot().subject?.subjectId).toBe('canonical');
		expect(restored.getSnapshot().explicitChoice).toBeNull();
		expect(restored.getSnapshot().effectivePermissions.measurement).toBe(false);
		reader.dispose();
		restored.dispose();
	}
);

// `dismissNotice()` records the acknowledgement locally and never makes a
// subject ID, so a dismissal must not mark the ID it found as one a save
// made, which would let an older stored notice's ID replace it.
test('dismissing a notice keeps a server-seeded subject over an older stored notice', async () => {
	const keys = resolveStorageKeys();
	const now = Date.now();
	// An acknowledgement of an older policy version carried another ID, and
	// only its localStorage copy is left.
	writeStoredNoticeDismissal(
		{
			dismissedAt: now - 1000,
			fingerprint: 'older-policy',
			subject: { subjectId: 'sub_other' },
			version: 1,
		},
		undefined,
		now
	);
	document.cookie = `${keys.notice}=; max-age=0; path=/`;
	document.cookie = `${keys.noticeSubject}=; max-age=0; path=/`;
	const initialPolicyResolution = matchedResolution(noticeRule());
	const kernel = createConsentKernel({
		initialPolicyResolution,
		initialRecords: { subject: { subjectId: 'sub_server' } },
	});
	const handle = createPersistence({ kernel, skipHydration: true });
	expect(kernel.getSnapshot().subject?.subjectId).toBe('sub_server');
	expect(kernel.getSnapshot().promptRequirement.kind).toBe('notice');

	await kernel.commands.dismissNotice();
	await vi.advanceTimersByTimeAsync(0);
	const stored = readStoredNoticeDismissal(undefined, Date.now());
	expect(stored?.ok && stored.record.subject?.subjectId).toBe('sub_server');
	expect(kernel.getSnapshot().subject?.subjectId).toBe('sub_server');
	expect(kernel.getSnapshot().explicitChoice).toBeNull();
	handle.dispose();
	kernel.dispose();

	const restored = createConsentKernel({ initialPolicyResolution });
	const reader = createPersistence({ kernel: restored });
	expect(restored.getSnapshot().subject?.subjectId).toBe('sub_server');
	expect(restored.getSnapshot().promptRequirement.kind).toBe('none');
	expect(restored.getSnapshot().explicitChoice).toBeNull();
	reader.dispose();
	restored.dispose();
});

// After `set.subjectId(null)` the acknowledgement is stored under the new
// ID, like a choice or vendor record would be, so another tab's ID does
// not replace it.
test('a reset ID a notice acknowledgement carries does not follow another tab', async () => {
	const keys = resolveStorageKeys();
	const sent: (string | undefined)[] = [];
	const initialPolicyResolution = matchedResolution(noticeRule());
	const kernel = createConsentKernel({
		initialPolicyResolution,
		transport: {
			save: (payload: { subjectId?: string }) => {
				sent.push(payload.subjectId);
				return Promise.resolve({ ok: true });
			},
		},
	});
	const handle = createPersistence({ kernel });
	await kernel.commands.dismissNotice();
	await vi.advanceTimersByTimeAsync(0);
	const before = kernel.getSnapshot().subject?.subjectId;

	kernel.set.subjectId(null);
	await vi.advanceTimersByTimeAsync(0);
	const reset = kernel.getSnapshot().subject?.subjectId;
	expect(reset).toBeTruthy();
	expect(reset).not.toBe(before);
	const notice = readStoredNoticeDismissal(undefined, Date.now());
	expect(notice?.ok && notice.record.subject?.subjectId).toBe(reset);

	// Another tab stores a different ID.
	localStorage.setItem(keys.subject, 'sub_other_tab');
	document.cookie = `${keys.subject}=sub_other_tab; path=/`;
	window.dispatchEvent(new StorageEvent('storage', { key: keys.subject }));
	window.dispatchEvent(new Event('focus'));
	await vi.advanceTimersByTimeAsync(0);
	expect(kernel.getSnapshot().subject?.subjectId).toBe(reset);
	expect(kernel.getSnapshot().explicitChoice).toBeNull();
	expect(kernel.getSnapshot().promptRequirement.kind).toBe('none');

	const saving = kernel.commands.save({ marketing: false });
	await vi.advanceTimersByTimeAsync(0);
	await saving;
	await vi.advanceTimersByTimeAsync(0);
	expect(sent).toEqual([reset]);
	handle.dispose();
	kernel.dispose();

	const restored = createConsentKernel({ initialPolicyResolution });
	const reader = createPersistence({ kernel: restored });
	expect(restored.getSnapshot().subject?.subjectId).toBe(reset);
	expect(
		restored.getSnapshot().explicitChoice?.categories.marketing?.value
	).toBe(false);
	reader.dispose();
	restored.dispose();
});

// A server render seeded from a stale record cookie names another ID and
// that ID's linked account. The browser starts with the subject its own
// storage holds, whole: the account belongs to the stale ID.
test.each([
	['no linked identity', undefined],
	[
		'its own linked identity',
		{ externalId: 'account-b', identityProvider: 'app' },
	],
] as const)(
	'a stale cookie seed yields to the stored subject with %s',
	async (_, identity) => {
		const keys = resolveStorageKeys();
		const now = Date.now();
		const initialPolicyResolution = matchedResolution(noticeRule());
		const fingerprint = createConsentKernel({
			initialPolicyResolution,
		}).getSnapshot().evaluationPolicy?.notice?.fingerprint;
		if (!fingerprint) {
			throw new Error('Expected a notice policy');
		}
		const record = { dismissedAt: now, fingerprint, version: 1 as const };
		writeStoredNoticeDismissal(
			{
				...record,
				subject: {
					externalId: 'account-a',
					identityProvider: 'app',
					subjectId: 'sub_cookie',
				},
			},
			undefined,
			now
		);
		// The rewrite under the local subject reaches localStorage only.
		const setter = Object.getOwnPropertyDescriptor(
			Document.prototype,
			'cookie'
		)?.set;
		const dropped = vi
			.spyOn(document, 'cookie', 'set')
			.mockImplementation((value: string) => {
				if (!value.startsWith(`${keys.noticeSubject}=`)) {
					setter?.call(document, value);
				}
			});
		const local = { ...identity, subjectId: 'sub_local' };
		writeStoredNoticeDismissal({ ...record, subject: local }, undefined, now);
		dropped.mockRestore();
		document.cookie = `${keys.subject}=; max-age=0; path=/`;
		localStorage.removeItem(keys.subject);

		const subject = resolveRequestSubject({
			now,
			request: { cookie: document.cookie, url: 'https://example.com/' },
		});
		const { state } = readRequestConsent({
			adapter: '@c15t/test',
			now,
			request: { cookie: subject?.cookie, headers: new Headers() },
		});
		expect(state.initialRecords?.subject?.externalId).toBe('account-a');
		const sent: unknown[] = [];
		const kernel = createConsentKernel({
			initialPolicyResolution,
			initialRecords: state.initialRecords,
			transport: {
				save: (payload: { subject?: unknown }) => {
					sent.push(payload.subject);
					return Promise.resolve({ ok: true });
				},
			},
		});
		const handle = createPersistence({ kernel, skipHydration: true });
		expect(kernel.getSnapshot().subject).toEqual(local);

		const saving = kernel.commands.save({ marketing: false });
		await vi.advanceTimersByTimeAsync(0);
		await saving;
		await vi.advanceTimersByTimeAsync(0);
		expect(sent).toEqual([local]);
		handle.dispose();
		kernel.dispose();

		const restored = createConsentKernel({ initialPolicyResolution });
		const reader = createPersistence({ kernel: restored });
		expect(restored.getSnapshot().subject).toEqual(local);
		reader.dispose();
		restored.dispose();
	}
);

// A consent or vendor record stored without a subject, as older versions
// wrote them, carries no subject: the record that does carries it. A
// running tab follows that record the way a reload and a server render
// select it, so its next save names the same visitor.
test.each([
	['a notice acknowledgement', 'consent'],
	['a notice acknowledgement', 'vendor'],
	['a vendor decision', 'consent'],
] as const)(
	'a tab follows the subject %s carries past a %s record stored without one',
	async (act, carrier) => {
		const keys = resolveStorageKeys();
		const start = Date.now();
		const vendors: KernelVendorsState = {
			declared: [
				{
					category: 'marketing',
					id: 'meta-pixel',
					name: 'Meta Pixel',
					presentable: true,
					privacyPolicyUrl: 'https://example.com/privacy',
					source: 'config',
				},
			],
			listVersion: null,
		};
		if (carrier === 'consent') {
			writeStoredConsentEnvelope(
				{
					categories: explicitChoice(
						{ marketing: false },
						{ confirmedAt: start - 5000, now: start }
					).categories,
					version: 3,
				},
				{ now: start }
			);
		} else {
			writeStoredVendorChoice(
				{ confirmedAt: start - 5000, denied: ['meta-pixel'], version: 1 },
				undefined,
				start
			);
		}
		const initialPolicyResolution = matchedResolution(noticeRule());
		const sent: (string | undefined)[] = [];
		const tab = (initialRecords?: HydrationRecords) =>
			createConsentKernel({
				initialPolicyResolution,
				initialRecords,
				initialVendors: vendors,
				transport: {
					save: (payload: { subjectId?: string }) => {
						sent.push(payload.subjectId);
						return Promise.resolve({ ok: true });
					},
				},
			});
		const render = () => {
			const subject = resolveRequestSubject({
				now: Date.now(),
				request: { cookie: document.cookie, url: 'https://example.com/' },
			});
			const { state } = readRequestConsent({
				adapter: '@c15t/test',
				now: Date.now(),
				request: {
					cookie: subject?.cookie ?? document.cookie,
					headers: new Headers(),
				},
			});
			return state.initialRecords;
		};
		const reload = () => {
			const kernel = tab();
			const handle = createPersistence({ kernel });
			const id = kernel.getSnapshot().subject?.subjectId;
			handle.dispose();
			kernel.dispose();
			return { hydrated: id, rendered: render()?.subject?.subjectId };
		};
		const sync = async () => {
			for (const key of [keys.notice, keys.subject]) {
				window.dispatchEvent(new StorageEvent('storage', { key }));
			}
			window.dispatchEvent(new Event('focus'));
			await vi.advanceTimersByTimeAsync(0);
		};
		// Two pages render before either response stores `<key>-sid`, so the
		// server names a different ID for each.
		const firstRecords = render();
		const otherRecords = render();
		const first = tab(firstRecords);
		const firstHandle = createPersistence({
			kernel: first,
			skipHydration: true,
		});
		const other = tab(otherRecords);
		const otherHandle = createPersistence({
			kernel: other,
			skipHydration: true,
		});
		const firstId = first.getSnapshot().subject?.subjectId;
		expect(firstId).toBeTruthy();
		expect(other.getSnapshot().subject?.subjectId).not.toBe(firstId);
		const before = other.getSnapshot();

		vi.advanceTimersByTime(1000);
		const acting =
			act === 'a vendor decision'
				? first.commands.save({}, { vendors: { 'meta-pixel': false } })
				: first.commands.dismissNotice();
		await vi.advanceTimersByTimeAsync(0);
		await acting;
		await sync();
		expect(other.getSnapshot().subject?.subjectId).toBe(firstId);
		expect(reload()).toEqual({ hydrated: firstId, rendered: firstId });
		expect(other.getSnapshot().explicitChoice).toEqual(before.explicitChoice);
		expect(other.getSnapshot().vendorChoice).toEqual(
			first.getSnapshot().vendorChoice
		);
		const notice = readStoredNoticeDismissal(undefined, Date.now());
		expect(other.getSnapshot().noticeDismissal?.dismissedAt).toBe(
			notice?.ok ? notice.record.dismissedAt : undefined
		);
		const decided = other.getSnapshot();

		vi.advanceTimersByTime(1000);
		first.set.subjectId('sub_named');
		await vi.advanceTimersByTimeAsync(0);
		await sync();
		expect(other.getSnapshot().subject?.subjectId).toBe('sub_named');
		expect(reload()).toEqual({ hydrated: 'sub_named', rendered: 'sub_named' });

		const earlier = sent.length;
		const saving = other.commands.save({ marketing: false });
		await vi.advanceTimersByTimeAsync(0);
		await saving;
		await vi.advanceTimersByTimeAsync(0);
		expect(sent.slice(earlier)).toEqual(['sub_named']);
		expect(reload()).toEqual({ hydrated: 'sub_named', rendered: 'sub_named' });
		expect(other.getSnapshot().vendorChoice).toEqual(decided.vendorChoice);
		firstHandle.dispose();
		first.dispose();
		otherHandle.dispose();
		other.dispose();
	}
);
