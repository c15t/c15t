import { useInit, useSetLanguage, useSnapshot } from 'c15t/react';

const languages = [
	{ code: 'en', label: 'English' },
	{ code: 'de', label: 'Deutsch' },
];

export const LanguageSwitcher = () => {
	const setLanguage = useSetLanguage();
	const init = useInit();
	const language = useSnapshot().translations?.language ?? 'en';

	return (
		<select
			aria-label="Consent language"
			value={language}
			onChange={(event) => {
				setLanguage(event.target.value);
				// Setting the language alone keeps the current copy. Init fetches
				// the policy and copy for the new language.
				void init();
			}}
		>
			{languages.map(({ code, label }) => (
				<option
					key={code}
					value={code}
				>
					{label}
				</option>
			))}
		</select>
	);
};
