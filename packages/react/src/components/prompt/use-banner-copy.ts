'use client';

import { resolvePromptCopy } from '@c15t/core';
import { useMemo } from 'react';

import { useTranslations } from '~/component-hooks/use-translations';
import { usePolicyRule } from '~/hooks';

/**
 * Title and description for the banner under the active policy prompt.
 *
 * @remarks
 * A notice prompt reads the `noticeTitle` and `noticeDescription` copy so
 * it informs rather than asks. Languages that have not translated the notice
 * copy fall back to their own choice copy, then to English.
 *
 * @returns The copy the banner should render when no props override it.
 *
 * @example
 * ```tsx
 * const { title, description } = useBannerCopy();
 * ```
 * @public
 */
export const useBannerCopy = function useBannerCopy(): {
	title: string;
	description: string;
	prompt: 'choice' | 'notice' | 'none';
} {
	const translations = useTranslations();
	const { prompt } = usePolicyRule();
	return useMemo(
		() => ({ ...resolvePromptCopy(translations, prompt), prompt }),
		[translations, prompt]
	);
};
