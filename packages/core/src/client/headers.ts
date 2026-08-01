import { version } from '../version';

export const C15T_VERSION_HEADER = 'x-c15t-version';

export const C15T_VERSION_HEADERS = {
	[C15T_VERSION_HEADER]: version,
} as const;
