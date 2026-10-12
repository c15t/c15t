import { defineEnvVars } from '@sveltejs/kit/env';

// Every variable is optional. An unset or empty value reads as `undefined`.
const optional = (input: string | undefined) => input || undefined;

export const variables = defineEnvVars({
	/** Backend URL the acceptance suite substitutes for the placeholder. */
	PUBLIC_C15T_BACKEND_URL: { public: true, schema: optional },
	PUBLIC_CLARITY_ID: { public: true, schema: optional },
	/** Set to `true` to open the IAB playground in development. */
	PUBLIC_DEVTOOLS_IAB: { public: true, schema: optional },
	PUBLIC_GOOGLE_TAG_ID: { public: true, schema: optional },
	PUBLIC_META_PIXEL_ID: { public: true, schema: optional },
	PUBLIC_TIKTOK_PIXEL_ID: { public: true, schema: optional },
});
