/**
 * Offline mode with one language loaded from its own entry point, the way
 * an app adds a language without pulling in every other one. Its own file,
 * since importing the entry registers Italian for the whole module graph.
 */
import { translations as italian } from '@c15t/translations/it';
import { describe, expect, test } from 'vitest';

import { offline } from '../index';
import { createConsentRuntime } from '../runtime';

describe('offline(): a language imported from its own entry', () => {
	test('switches the copy to that language and no other', async () => {
		const runtime = createConsentRuntime({
			mode: offline(),
			persistence: false,
			windowDebug: false,
		});
		const { kernel } = runtime;
		await kernel.commands.init();

		kernel.set.language('it');
		await kernel.commands.init();
		expect(kernel.getSnapshot().translations?.language).toBe('it');
		expect(
			kernel.getSnapshot().translations?.translations.cookieBanner.title
		).toBe(italian.cookieBanner.title);

		// Spanish was not imported, so the copy stays English.
		kernel.set.language('es');
		await kernel.commands.init();
		expect(kernel.getSnapshot().translations?.language).toBe('en');
		runtime.dispose();
	});
});
