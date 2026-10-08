import { createC15tClient } from '@c15t/node-sdk';

const baseUrl =
	process.env.C15T_API_URL || 'http://localhost:5173/api/self-host';
const apiKey = process.env.C15T_API_KEY;

export const c15t = createC15tClient({ baseUrl });

/** Keyed client for `consents.check`; undefined until `C15T_API_KEY` is set. */
export const c15tAdmin = apiKey
	? createC15tClient({ apiKey, baseUrl })
	: undefined;
