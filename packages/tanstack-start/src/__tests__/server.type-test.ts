import { createServerFn } from '@tanstack/react-start';
import { expectTypeOf } from 'vitest';

import { createConsentStateHandler, resolveConsent } from '../server';
import type { ConsentState, ResolveConsentOptions } from '../server';

export const getConsentState = createServerFn({ method: 'GET' }).handler(
	createConsentStateHandler({ backendURL: 'https://consent.example.com' })
);
expectTypeOf(
	createConsentStateHandler()
).returns.resolves.toEqualTypeOf<ConsentState>();
expectTypeOf(resolveConsent).returns.resolves.toEqualTypeOf<ConsentState>();
expectTypeOf(resolveConsent)
	.parameter(0)
	.toEqualTypeOf<ResolveConsentOptions | undefined>();
expectTypeOf<ResolveConsentOptions['backendURL']>().toEqualTypeOf<
	string | undefined
>();
