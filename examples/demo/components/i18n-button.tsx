'use client';

import { useConsentManager } from '@c15t/react';
import { LanguagesIcon } from 'lucide-react';
import { Button } from './ui/button';

export function I18nButton() {
	const { translationConfig, setLanguage } = useConsentManager();
	const languages = ['en', 'zh', 'fr', 'de'];
	return (
		<Button size="sm" variant="outline" asChild>
			<button
				onClick={() => {
					// Cycle through the languages array and set the next language
					const currentLangIndex = languages.indexOf(
						translationConfig.defaultLanguage
					);
					const nextLangIndex = (currentLangIndex + 1) % languages.length;
					setLanguage(languages[nextLangIndex]);
				}}
			>
				<LanguagesIcon className="w-4 h-4" />
				{/* {translationConfig.defaultLanguage.toUpperCase()} */}
			</button>
		</Button>
	);
}
