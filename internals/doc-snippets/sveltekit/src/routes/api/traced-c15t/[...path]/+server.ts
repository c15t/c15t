// #region docs:traced-route-handlers title="src/routes/api/c15t/[...path]/+server.ts"
import { createConsentRoute } from 'c15t/svelte/kit';

import { traceConsent } from '#lib/server/trace-consent.js';

const handlers = createConsentRoute({ proxy: true });

export const GET = traceConsent(handlers.GET);
export const POST = traceConsent(handlers.POST);
export const PATCH = traceConsent(handlers.PATCH);
export const PUT = traceConsent(handlers.PUT);
export const DELETE = traceConsent(handlers.DELETE);
export const OPTIONS = traceConsent(handlers.OPTIONS);
// #endregion docs:traced-route-handlers
