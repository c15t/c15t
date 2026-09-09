import { createServerFn } from '@tanstack/react-start';
import { expectTypeOf } from 'vitest';

import { createConsentConfigHandler } from '../server';
import type { ConsentConfig } from '../server';

export const getConsentConfig = createServerFn({ method: 'GET' }).handler(
	createConsentConfigHandler({ backendURL: 'https://consent.example.com' })
);
expectTypeOf(
	createConsentConfigHandler()
).returns.resolves.toEqualTypeOf<ConsentConfig>();
