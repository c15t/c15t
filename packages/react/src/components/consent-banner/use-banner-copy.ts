'use client';

import { useTranslations } from '~/component-hooks/use-translations';
import { usePolicyRule } from '~/hooks';

/**
 * Title and description for the banner under the active policy prompt.
 *
 * @remarks
 * A notice prompt reads the `noticeTitle` and `noticeDescription` copy so
 * it informs rather than asks. Languages that have not translated the notice
 * copy fall back to the choice copy rather than to English.
 *
 * @returns The copy the banner should render when no props override it.
 * @public
 */
export const useBannerCopy = function useBannerCopy(): {
	title: string | undefined;
	description: string | undefined;
	prompt: 'choice' | 'notice' | 'none';
} {
	const { cookieBanner } = useTranslations();
	const { prompt } = usePolicyRule();
	const notice = prompt === 'notice';
	return {
		description: notice
			? (cookieBanner.noticeDescription ?? cookieBanner.description)
			: cookieBanner.description,
		prompt,
		title: notice
			? (cookieBanner.noticeTitle ?? cookieBanner.title)
			: cookieBanner.title,
	};
};
