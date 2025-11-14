import type { CompleteTranslations } from '../types';
export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Godta alle',
		rejectAll: 'Avslå alle',
		customize: 'Tilpass',
		save: 'Lagre innstillinger',
	},
	cookieBanner: {
		title: 'Vi verdsetter ditt personvern',
		description:
			'Dette nettstedet bruker informasjonskapsler for å forbedre din nettopplevelse, analysere trafikk og vise personlig tilpasset innhold.',
	},
	consentManagerDialog: {
		title: 'Personverninnstillinger',
		description:
			'Tilpass personverninnstillingene dine her. Du kan velge hvilke typer informasjonskapsler og sporingsteknologier du vil tillate.',
	},
	consentTypes: {
		necessary: {
			title: 'Strengt nødvendige',
			description:
				'Disse informasjonskapslene er essensielle for at nettstedet skal fungere riktig og kan ikke deaktiveres.',
		},
		functionality: {
			title: 'Funksjonalitet',
			description:
				'Disse informasjonskapslene muliggjør forbedret funksjonalitet og personalisering av nettstedet.',
		},
		marketing: {
			title: 'Markedsføring',
			description:
				'Disse informasjonskapslene brukes til å levere relevante annonser og spore deres effektivitet.',
		},
		measurement: {
			title: 'Analyse',
			description:
				'Disse informasjonskapslene hjelper oss med å forstå hvordan besøkende samhandler med nettstedet og forbedre ytelsen.',
		},
		experience: {
			title: 'Opplevelse',
			description:
				'Disse informasjonskapslene hjelper oss med å gi en bedre brukeropplevelse og teste nye funksjoner.',
		},
	},
	frame: {
		title: 'Godta {category}-samtykke for å se dette innholdet.',
		actionButton: 'Aktiver {category}-samtykke',
	},
	legalLinks: {
		privacyPolicy: 'Personvernerklæring',
		cookiePolicy: 'Retningslinjer for informasjonskapsler',
		termsOfService: 'Vilkår for bruk',
	},
};
export default translations;
