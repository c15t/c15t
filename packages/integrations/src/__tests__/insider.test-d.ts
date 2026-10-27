import type { Script } from '@c15t/core';
import { expectTypeOf, test } from 'vitest';

import { insiderTag } from '../vendors/email-and-sms/insider';
import type { InsiderTagOptions } from '../vendors/email-and-sms/insider';

test('public options accept current user attributes and a currency string', () => {
	const options: InsiderTagOptions = {
		currency: 'GBP',
		partnerId: '123456',
		partnerName: 'yourpartner',
		user: {
			age: 33,
			birthday: '2000-01-20T00:00:00Z',
			custom: {
				loyalty_id: 'guest-1',
				membership: 'Silver',
				user_lifetime: 23,
			},
			email: 'guest@example.com',
			email_optin: false,
			language: 'en_US',
			phone_number: '+905551234567',
		},
	};
	expectTypeOf(insiderTag(options)).toEqualTypeOf<Script>();
});

test('currency is a string and user attributes are an object', () => {
	expectTypeOf<InsiderTagOptions['currency']>().toEqualTypeOf<
		string | undefined
	>();
	expectTypeOf<InsiderTagOptions['user']>().toEqualTypeOf<
		Record<string, unknown> | undefined
	>();
	const account = { partnerId: '123456', partnerName: 'yourpartner' };
	// @ts-expect-error The SDK currency value is a string.
	insiderTag({ ...account, currency: 123 });
	// @ts-expect-error User attributes must be an object.
	insiderTag({ ...account, user: 'guest@example.com' });
});
