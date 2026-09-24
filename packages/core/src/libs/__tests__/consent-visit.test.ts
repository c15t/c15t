/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createConsentVisitTracker } from '../consent-visit';
import { createMockConsentBannerResponse } from '../init-consent-manager/__tests__/test-setup';

describe('consent visits', () => {
	const send = vi.fn().mockResolvedValue({ ok: true });
	const trackers: ReturnType<typeof createConsentVisitTracker>[] = [];
	const choiceRequired = { activeUI: 'banner' as const, consentInfo: null };
	const enabled = () => ({
		...createMockConsentBannerResponse(),
		visitTracking: { enabled: true as const },
	});
	function tracker() {
		const result = createConsentVisitTracker({ $fetch: send });
		trackers.push(result);
		return result;
	}
	function visibility(state: DocumentVisibilityState) {
		Object.defineProperty(document, 'visibilityState', {
			configurable: true,
			value: state,
		});
		document.dispatchEvent(new Event('visibilitychange'));
	}
	function transition(type: 'pagehide' | 'pageshow', persisted: boolean) {
		window.dispatchEvent(new PageTransitionEvent(type, { persisted }));
	}
	function events() {
		return send.mock.calls.map(([, options]) => options.body);
	}
	beforeEach(() => {
		vi.useFakeTimers();
		send.mockResolvedValue({ ok: true });
		visibility('visible');
	});
	afterEach(() => {
		for (const current of trackers.splice(0)) current.dispose();
		vi.useRealTimers();
	});
	it('sends nothing without explicit backend opt-in and disables an active tracker', () => {
		const current = tracker();
		current.initialise(createMockConsentBannerResponse(), choiceRequired);
		expect(current.getVisitId()).toBeUndefined();
		expect(send).not.toHaveBeenCalled();
		current.initialise(enabled(), choiceRequired);
		expect(events().map((event) => event.event)).toEqual(['started', 'state']);
		current.initialise(undefined, choiceRequired);
		vi.advanceTimersByTime(120_000);
		transition('pagehide', false);
		expect(send).toHaveBeenCalledTimes(2);
		expect(current.getVisitId()).toBeUndefined();
	});
	it('uses one ephemeral identity for repeated init and does not reclassify a saved visit as restored', () => {
		const current = tracker();
		current.initialise(enabled(), choiceRequired);
		const id = current.getVisitId();
		current.initialise(enabled(), {
			activeUI: 'none',
			consentInfo: { time: Date.now() },
		});
		expect(current.getVisitId()).toBe(id);
		expect(events()).toHaveLength(2);
		expect(events()[0]).toMatchObject({
			version: 1,
			visitId: id,
			state: 'choice_required',
		});
		expect(new Set(events().map((event) => event.eventId)).size).toBe(2);
		expect(send).toHaveBeenCalledWith(
			'/consent/visits',
			expect.objectContaining({
				fetchOptions: {
					mode: 'cors',
					credentials: 'omit',
					keepalive: true,
					referrerPolicy: 'no-referrer',
				},
				retryConfig: { maxRetries: 0 },
			})
		);
		expect(events()[0]).not.toHaveProperty('subjectId');
		expect(events()[0]).not.toHaveProperty('url');
		const second = tracker();
		second.initialise(enabled(), choiceRequired);
		expect(second.getVisitId()).not.toBe(id);
	});
	it('keeps IAB visits unclassified until restoration resolves', () => {
		const current = tracker();
		current.start(enabled());
		expect(events()).toHaveLength(1);
		expect(events()[0].state).toBeUndefined();
		const id = current.getVisitId();
		expect(id).toBeDefined();
		current.initialise(enabled(), choiceRequired, true);
		expect(events().map(({ event }) => event)).toEqual(['started', 'state']);
		expect(events()[1]).toMatchObject({
			visitId: id,
			state: 'existing_choice',
		});
	});
	it.each([
		[{ activeUI: 'none' as const, consentInfo: null }, 'not_required'],
		[
			{ activeUI: 'none' as const, consentInfo: { time: 123 } },
			'existing_choice',
		],
	])('classifies resolved state %j as %s', (state, expected) => {
		tracker().initialise(enabled(), state);
		expect(events()[0].state).toBe(expected);
	});
	it('sends heartbeats only while visible and resumes the same visit from bfcache', () => {
		const current = tracker();
		current.initialise(enabled(), choiceRequired);
		const id = current.getVisitId();
		vi.advanceTimersByTime(60_000);
		expect(events().at(-1).event).toBe('activity');
		visibility('hidden');
		vi.advanceTimersByTime(120_000);
		expect(events()).toHaveLength(3);
		transition('pagehide', true);
		visibility('visible');
		vi.advanceTimersByTime(60_000);
		expect(events()).toHaveLength(3);
		transition('pageshow', true);
		vi.advanceTimersByTime(60_000);
		expect(events()).toHaveLength(5);
		expect(events().every((event) => event.visitId === id)).toBe(true);
		expect(events().filter((event) => event.event === 'started')).toHaveLength(
			1
		);
	});
	it('ends only on non-persisted pagehide and removes listeners and timers on disposal', () => {
		const current = tracker();
		current.initialise(enabled(), choiceRequired);
		transition('pagehide', false);
		expect(events().at(-1).event).toBe('ended');
		transition('pagehide', false);
		visibility('visible');
		vi.advanceTimersByTime(120_000);
		expect(events()).toHaveLength(3);
		expect(current.getVisitId()).toBeUndefined();
		const second = tracker();
		second.initialise(enabled(), choiceRequired);
		second.dispose();
		const count = events().length;
		transition('pagehide', false);
		vi.advanceTimersByTime(120_000);
		expect(events()).toHaveLength(count);
	});
	it('isolates both rejected and synchronously thrown transport failures', async () => {
		send.mockRejectedValue(new Error('network unavailable'));
		const current = tracker();
		expect(() => current.initialise(enabled(), choiceRequired)).not.toThrow();
		await Promise.resolve();
		send.mockImplementation(() => {
			throw new Error('transport failed');
		});
		expect(() => vi.advanceTimersByTime(60_000)).not.toThrow();
	});
});
