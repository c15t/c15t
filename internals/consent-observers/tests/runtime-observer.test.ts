import { afterEach, describe, expect, test, vi } from 'vitest';

import { observeConsent } from '../src/observer';
import {
	CHOICE_VALIDITY_MS,
	createObservedRuntime,
	recordChoice,
} from '../src/policy';

afterEach(() => {
	vi.useRealTimers();
});

describe('external observers on createConsentRuntime().kernel', () => {
	test('reads the current state when attached after initialization', async () => {
		const runtime = createObservedRuntime();
		try {
			await runtime.kernel.commands.init();
			await runtime.kernel.commands.save('all');
			const { revision } = runtime.kernel.getSnapshot();
			expect(revision).toBeGreaterThan(0);

			const observer = observeConsent(runtime.kernel);

			expect(observer.current.revision).toBe(revision);
			expect(observer.current.permissions.marketing).toBe(true);
			expect(observer.current.permissions.measurement).toBe(true);
			observer.detach();
		} finally {
			runtime.dispose();
		}
	});

	test('does not rely on the kernel replaying state to a new subscriber', async () => {
		const runtime = createObservedRuntime({
			choice: await recordChoice('all'),
		});
		try {
			const listener = vi.fn();
			const unsubscribe = runtime.kernel.subscribe(listener);
			// A no-op refresh changes nothing, so nothing is delivered either.
			runtime.kernel.refresh();

			expect(listener).not.toHaveBeenCalled();
			// A consumer that waited for a first notification would still be
			// empty here; reading the snapshot is what gives it the grant.
			expect(runtime.kernel.getSnapshot().effectivePermissions.marketing).toBe(
				true
			);
			unsubscribe();
		} finally {
			runtime.dispose();
		}
	});

	test('delivers grants and denials synchronously, before the save settles', async () => {
		const runtime = createObservedRuntime();
		try {
			const observer = observeConsent(runtime.kernel);
			expect(observer.current.permissions.marketing).toBe(false);

			const granted = runtime.kernel.commands.save('all');
			expect(observer.notifications.at(-1)?.permissions.marketing).toBe(true);
			expect(observer.current.permissions.marketing).toBe(true);
			await granted;

			const count = observer.notifications.length;
			const denied = runtime.kernel.commands.save('none');
			expect(observer.notifications.length).toBeGreaterThan(count);
			expect(observer.current.permissions.marketing).toBe(false);
			expect(observer.current.permissions.measurement).toBe(false);
			await denied;

			expect(observer.current).toEqual({
				permissions: runtime.kernel.getSnapshot().effectivePermissions,
				revision: runtime.kernel.getSnapshot().revision,
			});
			observer.detach();
		} finally {
			runtime.dispose();
		}
	});

	test('a gate-time refresh denies an expired grant before the timer fires', async () => {
		// Only the clock is faked: the kernel's real deadline timer stays armed
		// a full validity period away, as it would in a browser.
		vi.useFakeTimers({ toFake: ['Date'] });
		const grantedAt = Date.now();
		const runtime = createObservedRuntime();
		try {
			await runtime.kernel.commands.init();
			await runtime.kernel.commands.save('all');
			const observer = observeConsent(runtime.kernel);

			// Past the deadline, but the timer has not run: a sleeping tab or a
			// throttled background timer looks exactly like this.
			vi.setSystemTime(grantedAt + CHOICE_VALIDITY_MS + 1);
			expect(runtime.kernel.getSnapshot().effectivePermissions.marketing).toBe(
				true
			);

			expect(observer.allows('marketing')).toBe(false);
			expect(observer.current.permissions.marketing).toBe(false);
			expect(observer.notifications.at(-1)?.permissions.marketing).toBe(false);
			expect(runtime.kernel.getSnapshot().promptRequirement).toMatchObject({
				kind: 'choice',
				reason: 'expired',
			});
			observer.detach();
		} finally {
			runtime.dispose();
		}
	});

	test('refresh at an explicit time sees the same expiry', async () => {
		const runtime = createObservedRuntime();
		try {
			await runtime.kernel.commands.save('all');
			const observer = observeConsent(runtime.kernel);
			const deadline = runtime.kernel.getSnapshot().nextDeadline;
			expect(deadline).not.toBeNull();

			expect(observer.allows('marketing', (deadline ?? 0) - 1)).toBe(true);
			expect(observer.allows('marketing', deadline ?? 0)).toBe(false);
			expect(observer.current.permissions.marketing).toBe(false);
			observer.detach();
		} finally {
			runtime.dispose();
		}
	});

	test('getServerSnapshot keeps the prepared state while the live one moves', async () => {
		const runtime = createObservedRuntime({
			choice: await recordChoice('none'),
		});
		try {
			const prepared = runtime.kernel.getServerSnapshot();
			expect(prepared.revision).toBe(0);
			expect(prepared.effectivePermissions.marketing).toBe(false);

			await runtime.kernel.commands.save('all');

			expect(runtime.kernel.getSnapshot().effectivePermissions.marketing).toBe(
				true
			);
			expect(runtime.kernel.getServerSnapshot()).toBe(prepared);
		} finally {
			runtime.dispose();
		}
	});

	test('a detached observer receives nothing further', async () => {
		const runtime = createObservedRuntime();
		try {
			const observer = observeConsent(runtime.kernel);
			observer.detach();
			observer.detach();
			await runtime.kernel.commands.save('all');

			expect(observer.notifications).toEqual([]);
			expect(observer.current.permissions.marketing).toBe(false);
		} finally {
			runtime.dispose();
		}
	});

	test('two runtimes at the same revision stay isolated', async () => {
		const granted = createObservedRuntime({
			choice: await recordChoice('all'),
		});
		const denied = createObservedRuntime({
			choice: await recordChoice('none'),
		});
		try {
			const grantedObserver = observeConsent(granted.kernel);
			const deniedObserver = observeConsent(denied.kernel);
			expect(grantedObserver.current.revision).toBe(
				deniedObserver.current.revision
			);
			expect(grantedObserver.current.permissions.marketing).toBe(true);
			expect(deniedObserver.current.permissions.marketing).toBe(false);

			await granted.kernel.commands.save('none');
			await denied.kernel.commands.save('all');

			expect(grantedObserver.current.revision).toBe(
				deniedObserver.current.revision
			);
			expect(grantedObserver.current.permissions.marketing).toBe(false);
			expect(deniedObserver.current.permissions.marketing).toBe(true);
			grantedObserver.detach();
			deniedObserver.detach();
		} finally {
			granted.dispose();
			denied.dispose();
		}
	});
});
