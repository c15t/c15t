/**
 * Start a returning visitor's script loader before the page hydrates.
 *
 * The React provider loads the script loader on demand from its mount
 * effect, which runs once the whole tree has hydrated. A visitor whose
 * stored choice already grants a configured script then waits one more
 * request after hydration before those scripts start: a round trip on a
 * phone. The server knows the stored choice, but not the chunk's URL, so
 * the root starts the same `import()` during its first render instead.
 * The provider's own import then finds the module loaded or on its way.
 */
import type { Script } from '@c15t/core/modules/script-loader';

import type { ConsentState } from './types';

type StoredCategories = NonNullable<
	NonNullable<ConsentState['initialRecords']>['choice']
>['categories'];

/**
 * Whether a script's category condition holds for the stored choice.
 * `necessary` always holds; a category the choice leaves out does not.
 */
const allows = function allows(
	condition: Script['category'],
	categories: StoredCategories
): boolean {
	if (typeof condition === 'string') {
		return (
			condition === 'necessary' ||
			categories[condition as keyof StoredCategories]?.value === true
		);
	}
	if ('and' in condition) {
		return [condition.and].flat().every((part) => allows(part, categories));
	}
	if ('or' in condition) {
		return [condition.or].flat().some((part) => allows(part, categories));
	}
	return !allows(condition.not, categories);
};

/**
 * Load the script loader now when the server-resolved `state` shows a
 * stored choice that lets one of `scripts` run. Call it once, from the
 * root's first render in the browser.
 *
 * Every page with `scripts` loads the script loader after hydration, for
 * every visitor, so this changes when the chunk loads, not whether. A
 * first visit and a stored choice that lets no script run keep it after
 * hydration, behind the banner and the page's own code. Vendor switches
 * are not checked: a visitor who turned off the only granted script's
 * vendor loads it early for nothing it would not have loaded anyway.
 *
 * Imports the specifier the React provider imports, so the bundler gives
 * both one chunk.
 *
 * @param state - The root's `state`, resolved or streaming.
 * @param scripts - The root's `scripts`.
 * @internal
 */
export const preloadScriptLoader = function preloadScriptLoader(
	state: ConsentState | PromiseLike<ConsentState>,
	scripts: readonly Script[] | undefined
): void {
	if (typeof window === 'undefined' || !scripts?.length) {
		return;
	}
	void (async () => {
		try {
			const categories = (await state).initialRecords?.choice?.categories;
			if (
				categories &&
				scripts.some((script) => allows(script.category, categories))
			) {
				await import('@c15t/core/modules/script-loader');
			}
		} catch {
			// The provider loads it again after mount, and reports a failure.
		}
	})();
};
