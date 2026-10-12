/** Explicit starting rule for generated offline applications. */
export const DEFAULT_OFFLINE_RULES = `[{
				id: 'site-consent',
				match: { fallback: true },
				model: 'opt-in',
				prompt: 'choice',
				categories: ['functionality', 'measurement', 'experience', 'marketing'],
				scopeMode: 'strict',
			}]`;
