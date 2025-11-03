import type { CompleteTranslations } from '../types';
export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Acceptera alla',
		rejectAll: 'Avvisa alla',
		customize: 'Anpassa',
		save: 'Spara inställningar',
	},
	cookieBanner: {
		title: 'Vi värdesätter din integritet',
		description:
			'Den här webbplatsen använder cookies för att förbättra din surfupplevelse, analysera webbplatstrafik och visa personligt anpassat innehåll.',
	},
	consentManagerDialog: {
		title: 'Integritetsinställningar',
		description:
			'Anpassa dina integritetsinställningar här. Du kan välja vilka typer av cookies och spårningstekniker du tillåter.',
	},
	consentTypes: {
		necessary: {
			title: 'Absolut nödvändiga',
			description:
				'Dessa cookies är nödvändiga för att webbplatsen ska fungera korrekt och kan inte inaktiveras.',
		},
		functionality: {
			title: 'Funktionalitet',
			description:
				'Dessa cookies möjliggör förbättrad funktionalitet och personalisering av webbplatsen.',
		},
		marketing: {
			title: 'Marknadsföring',
			description:
				'Dessa cookies används för att leverera relevanta annonser och spåra deras effektivitet.',
		},
		measurement: {
			title: 'Analys',
			description:
				'Dessa cookies hjälper oss att förstå hur besökare interagerar med webbplatsen och förbättra dess prestanda.',
		},
		experience: {
			title: 'Upplevelse',
			description:
				'Dessa cookies hjälper oss att ge en bättre användarupplevelse och testa nya funktioner.',
		},
	},
	frame: {
		title: 'Acceptera {category}-samtycke för att visa detta innehåll.',
		actionButton: 'Aktivera {category}-samtycke',
	},
};
export default translations;
