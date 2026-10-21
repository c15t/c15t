import { expectTypeOf } from 'vitest';

import {
	defaultComFormsSdk,
	defaultComPixel,
} from '../vendors/analytics/default-com';

// The package's check-types command compiles this file without executing it.
declare const target: HTMLElement;

defaultComPixel({
	autoDisplayScheduler: { target },
	publicKey: 'workspace-key',
});
defaultComFormsSdk({
	autoDisplayScheduler: { loader: false, target },
	publicKey: 'workspace-key',
});

if (window.DefaultPixelSDK) {
	const sdk = window.DefaultPixelSDK;
	const submission = sdk.submitForm({
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
	expectTypeOf(submission.then((result) => result.success)).toEqualTypeOf<
		Promise<boolean>
	>();
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
	sdk.submitForm({ pixelFormId: 'pixel-form-id', responses: {} });
	sdk.submitForm({
		formId: 'request-demo',
		pixelFormId: 'pixel-form-id',
		responses: {},
	});
	// @ts-expect-error A manual submission needs an HTML or Pixel form ID.
	sdk.submitForm({ responses: {} });
	// @ts-expect-error Response values do not accept nested objects.
	sdk.submitForm({ formId: 'request-demo', responses: { nested: {} } });
	expectTypeOf(
		sdk.recordFormInteraction({
			eventType: 'focusout',
			fieldName: 'email',
			fieldType: 'email',
			fieldValue: 'visitor@example.com',
			formId: 'request-demo',
			formName: 'Request a demo',
			responses: { first_name: 'Visitor' },
		})
	).toEqualTypeOf<Promise<void>>();
	expectTypeOf(
		sdk.on('meeting_booked', (payload) => {
			expectTypeOf(payload.meetingId).toEqualTypeOf<string>();
			expectTypeOf(payload.personEmail).toEqualTypeOf<string>();
			expectTypeOf(payload.startTime).toEqualTypeOf<string>();
		})
	).toEqualTypeOf<() => void>();
	// @ts-expect-error Default supports only its documented scheduler events.
	sdk.on('booking_complete', () => {});
	sdk.on('closed', (payload) => {
		expectTypeOf(payload).toEqualTypeOf<undefined>();
	});
	expectTypeOf(
		sdk.scheduler.display('https://book.default.com', { target })
	).toEqualTypeOf<() => void>();
	sdk.scheduler.onDisplayed((payload) => {
		expectTypeOf(payload.orgSlug).toEqualTypeOf<string>();
		expectTypeOf(payload.bookingParam).toEqualTypeOf<string>();
	});
	sdk.scheduler.onClosed(() => {});
	expectTypeOf(sdk.scheduler.display('https://book.default.com')).toEqualTypeOf<
		() => void
	>();
	sdk.scheduler.onMeetingBooked((payload) => {
		expectTypeOf(payload.meetingId).toEqualTypeOf<string>();
	});
	sdk.scheduler.onMeetingCancelled((payload) => {
		expectTypeOf(payload.meetingId).toEqualTypeOf<string>();
	});
	sdk.scheduler.onMeetingTimeout((payload) => {
		expectTypeOf(payload.meetingId).toEqualTypeOf<string | undefined>();
	});
}
