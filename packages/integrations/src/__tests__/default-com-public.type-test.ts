import type {
	DefaultComFormsSdkClient,
	DefaultComSchedulerEventMap,
	DefaultComSubmitFormResult,
} from '@c15t/integrations/default-com';
import { expectTypeOf } from 'vitest';

// The package's check-types command compiles this consumer without executing it.
declare const target: HTMLElement;

expectTypeOf<Window['DefaultPixel']>().toEqualTypeOf<
	Pick<DefaultComFormsSdkClient, 'on' | 'scheduler' | 'submitForm'> | undefined
>();
expectTypeOf<Window['DefaultPixelSDK']>().toEqualTypeOf<
	DefaultComFormsSdkClient | undefined
>();

if (window.DefaultPixel) {
	const pixel = window.DefaultPixel;

	expectTypeOf(
		pixel.on('meeting_booked', (payload) => {
			expectTypeOf(payload).toEqualTypeOf<
				DefaultComSchedulerEventMap['meeting_booked']
			>();
			expectTypeOf(payload.meetingId).toEqualTypeOf<string>();
			expectTypeOf(payload.personEmail).toEqualTypeOf<string>();
			expectTypeOf(payload.startTime).toEqualTypeOf<string>();
			// @ts-expect-error Booking payloads have no submission status.
			expectTypeOf(payload.status);
		})
	).toEqualTypeOf<() => void>();
	pixel.on('closed', (payload) => {
		expectTypeOf(payload).toEqualTypeOf<undefined>();
	});
	// @ts-expect-error Default accepts only its documented scheduler events.
	pixel.on('booking_complete', () => {});

	expectTypeOf(
		pixel.scheduler.display('https://book.default.com', {
			loader: false,
			target,
		})
	).toEqualTypeOf<() => void>();
	expectTypeOf(
		pixel.scheduler.onDisplayed((payload) => {
			expectTypeOf(payload.orgSlug).toEqualTypeOf<string>();
			expectTypeOf(payload.bookingParam).toEqualTypeOf<string>();
		})
	).toEqualTypeOf<() => void>();
	expectTypeOf(pixel.scheduler.onClosed(() => {})).toEqualTypeOf<() => void>();
	expectTypeOf(
		pixel.scheduler.onMeetingBooked((payload) => {
			expectTypeOf(payload.meetingId).toEqualTypeOf<string>();
		})
	).toEqualTypeOf<() => void>();
	expectTypeOf(
		pixel.scheduler.onMeetingCancelled((payload) => {
			expectTypeOf(payload.meetingId).toEqualTypeOf<string>();
		})
	).toEqualTypeOf<() => void>();
	expectTypeOf(
		pixel.scheduler.onMeetingTimeout((payload) => {
			expectTypeOf(payload.meetingId).toEqualTypeOf<string | undefined>();
		})
	).toEqualTypeOf<() => void>();

	const submission = pixel.submitForm({
		autoDisplayScheduler: { target },
		formId: 'request-demo',
		metadata: { source: 'pricing-page' },
		responses: {
			email: 'visitor@example.com',
			interests: ['product'],
			seats: 2,
			subscribed: true,
			unanswered: null,
		},
	});
	expectTypeOf(submission).toEqualTypeOf<Promise<DefaultComSubmitFormResult>>();
	submission.then((result) => {
		expectTypeOf(result.status).toEqualTypeOf<number>();
		if (result.success) {
			expectTypeOf(result.scheduler?.url).toEqualTypeOf<string | undefined>();
			expectTypeOf(result.redirect?.url).toEqualTypeOf<string | undefined>();
			expectTypeOf(result.workflow).toEqualTypeOf<unknown>();
		} else {
			expectTypeOf(result.error).toEqualTypeOf<string>();
		}
	});
	pixel.submitForm({ pixelFormId: 'pixel-form', responses: {} });
	// @ts-expect-error Manual submissions need an HTML or Pixel form ID.
	pixel.submitForm({ responses: {} });

	// @ts-expect-error Pixel startup belongs to the loader, not the public client.
	pixel.init({ publicKey: 'workspace-key' });
	// @ts-expect-error Form interaction warmup belongs to the Forms SDK.
	pixel.recordFormInteraction({ fieldName: 'email', fieldValue: 'a@b.com' });
	// @ts-expect-error Pixel consent is set through window.__defaultPixel__.
	pixel.setConsent({ analytics: false });
}

window.DefaultPixelSDK?.setConsent({ analytics: false });
window.DefaultPixelSDK?.setConsent({ marketing: false });
window.DefaultPixelSDK?.setConsent({});
window.DefaultPixelSDK?.setConsent({ analytics: true, marketing: true });
window.__defaultPixel__?.setConsent?.({ analytics: false });
window.__defaultPixel__?.setConsent?.({ marketing: false });
window.__defaultPixel__?.setConsent?.({});
window.__defaultPixel__?.setConsent?.({ analytics: true, marketing: true });
if (window.DefaultPixelSDK) {
	expectTypeOf(
		window.DefaultPixelSDK.init({
			autoDisplayScheduler: { target },
			endpoint: '/default-proxy',
			publicKey: 'workspace-key',
			schedulerOrigins: ['https://book.default.com'],
		})
	).toBeVoid();
	expectTypeOf(
		window.DefaultPixelSDK.recordFormInteraction({
			fieldName: 'email',
			fieldValue: 'visitor@example.com',
		})
	).toEqualTypeOf<Promise<void>>();
}
// @ts-expect-error Consent values must be booleans.
window.DefaultPixelSDK?.setConsent({ analytics: 'false' });
// @ts-expect-error Consent updates accept only the documented keys.
window.__defaultPixel__?.setConsent?.({ functionality: true });
