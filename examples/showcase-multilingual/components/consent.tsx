'use client';

import {
	ConsentBanner,
	ConsentDialog,
	ConsentRoot,
	offline,
	useSetLanguage,
} from 'c15t/next';
import { useEffect } from 'react';
import type { ReactNode } from 'react';

import { messages } from '@/lib/consent-i18n';
import { brandTheme } from '@/lib/consent-theme';
import type { Locale } from '@/lib/locales';

// Offline mode resolves c15t's recommended policy rules in the browser, for
// whatever location the app gives it, so the demo needs no account. A
// backend reads the visitor's real location from the request instead. In
// production, swap this line for your project's backend:
// const mode = hosted({ backendURL: 'https://your-project.inth.app' });
const mode = offline();

/**
 * Keeps c15t's language on the route's locale. `ConsentRoot` reads `i18n`
 * once, so a client-side move from /en to /de goes through
 * `useSetLanguage`, which switches the copy and resolves the policy again.
 */
const FollowLocale = ({ locale }: { locale: Locale }) => {
	const setLanguage = useSetLanguage();
	useEffect(() => {
		setLanguage(locale);
	}, [locale, setLanguage]);
	return null;
};

export const Consent = ({
	children,
	locale,
}: {
	children: ReactNode;
	locale: Locale;
}) => (
	<ConsentRoot
		state={{}}
		options={{
			consentCategories: ['necessary', 'measurement', 'marketing'],
			i18n: { locale, messages },
			mode,
			overrides: { language: locale },
			theme: brandTheme,
		}}
	>
		<FollowLocale locale={locale} />
		{children}
		<ConsentBanner />
		<ConsentDialog />
	</ConsentRoot>
);
