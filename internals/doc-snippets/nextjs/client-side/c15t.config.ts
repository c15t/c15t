// #region docs:client-side-config title="c15t.config.ts"
import { defineConsentConfig, hosted } from 'c15t/next';

// The browser asks the backend's /init. The backend URL comes from
// NEXT_PUBLIC_C15T_BACKEND_URL.
export default defineConsentConfig({ mode: hosted() });
// #endregion docs:client-side-config
