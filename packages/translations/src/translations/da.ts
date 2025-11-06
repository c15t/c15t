import type { CompleteTranslations } from '../types';
export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Accepter alle',
		rejectAll: 'Afvis alle',
		customize: 'Tilpas',
		save: 'Gem indstillinger',
	},
	cookieBanner: {
		title: 'Vi værdsætter dit privatliv',
		description:
			'Denne side bruger cookies til at forbedre din browsingoplevelse, analysere trafikken på siden og vise personligt tilpasset indhold.',
	},
	consentManagerDialog: {
		title: 'Privatlivsindstillinger',
		description:
			'Tilpas dine privatlivsindstillinger her. Du kan vælge, hvilke typer cookies og sporingsteknologier du vil tillade.',
	},
	consentTypes: {
		necessary: {
			title: 'Strengt nødvendige',
			description:
				'Disse cookies er essentielle for, at hjemmesiden fungerer korrekt, og de kan ikke deaktiveres.',
		},
		functionality: {
			title: 'Funktionalitet',
			description:
				'Disse cookies muliggør forbedret funktionalitet og personalisering af hjemmesiden.',
		},
		marketing: {
			title: 'Markedsføring',
			description:
				'Disse cookies bruges til at levere relevante annoncer og spore deres effektivitet.',
		},
		measurement: {
			title: 'Analyse',
			description:
				'Disse cookies hjælper os med at forstå, hvordan besøgende interagerer med hjemmesiden og forbedre dens ydeevne.',
		},
		experience: {
			title: 'Oplevelse',
			description:
				'Disse cookies hjælper os med at levere en bedre brugeroplevelse og teste nye funktioner.',
		},
	},
	frame: {
		title: 'Accepter {category}-samtykke for at se dette indhold.',
		actionButton: 'Aktivér {category}-samtykke',
	},
	legalLinks: {
		privacyPolicy: 'Privatlivspolitik',
		cookiePolicy: 'Cookiepolitik',
		termsOfService: 'Servicevilkår',
	},
};
export default translations;
