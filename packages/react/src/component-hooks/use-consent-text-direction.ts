'use client';

import { getTextDirection } from '@c15t/ui/utils';

import { useTranslationLanguage } from '~/kernel-selector';

/**
 * The text direction of the language c15t shows consent copy in, for a
 * custom banner or preference center.
 *
 * @remarks
 * c15t can pick the copy's language from the visitor's browser, so an
 * Arabic or Hebrew visitor can read right-to-left copy on a left-to-right
 * page. The stock banner and dialog set `dir` on their root from this
 * language. Set it on yours the same way.
 *
 * @returns `'rtl'` for a right-to-left language, otherwise `'ltr'`.
 *
 * @example
 * ```tsx
 * function Banner({ children }: { children: React.ReactNode }) {
 *   const dir = useConsentTextDirection();
 *   return <section dir={dir}>{children}</section>;
 * }
 * ```
 * @public
 */
export const useConsentTextDirection = function useConsentTextDirection() {
	return getTextDirection(useTranslationLanguage());
};
