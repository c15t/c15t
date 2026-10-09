// #region docs:quickstart-config title="c15t.config.ts"
import { defineConsentConfig } from 'c15t/next';

// The backend URL comes from NEXT_PUBLIC_C15T_BACKEND_URL.
export const consentConfig = defineConsentConfig({ routePrefix: '/api/c15t' });
// #endregion docs:quickstart-config
