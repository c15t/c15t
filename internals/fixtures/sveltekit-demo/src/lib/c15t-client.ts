import { createC15tClient } from '@c15t/node-sdk';

export const c15t = createC15tClient({
	baseUrl: process.env.C15T_API_URL || 'http://localhost:5173/api/self-host',
});
