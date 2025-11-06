import type { CompleteTranslations } from '../types';
export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Priimti visus',
		rejectAll: 'Atmesti visus',
		customize: 'Tinkinti',
		save: 'Išsaugoti nustatymus',
	},
	cookieBanner: {
		title: 'Mes vertiname jūsų privatumą',
		description:
			'Ši svetainė naudoja slapukus naršymo patirčiai gerinti, svetainės srautui analizuoti ir rodyti jums pritaikytą turinį.',
	},
	consentManagerDialog: {
		title: 'Privatumo nustatymai',
		description:
			'Čia galite tinkinti savo privatumo nustatymus. Galite pasirinkti, kokių tipų slapukus ir sekimo technologijas leidžiate naudoti.',
	},
	consentTypes: {
		necessary: {
			title: 'Būtinieji',
			description:
				'Šie slapukai yra būtini tinkamam svetainės veikimui ir negali būti išjungti.',
		},
		functionality: {
			title: 'Funkcionalumo',
			description:
				'Šie slapukai įgalina išplėstinį funkcionalumą ir svetainės personalizavimą.',
		},
		marketing: {
			title: 'Rinkodaros',
			description:
				'Šie slapukai naudojami pateikti aktualius skelbimus ir sekti jų efektyvumą.',
		},
		measurement: {
			title: 'Analitikos',
			description:
				'Šie slapukai padeda mums suprasti, kaip lankytojai sąveikauja su svetaine, ir pagerinti jos veikimą.',
		},
		experience: {
			title: 'Patirties',
			description:
				'Šie slapukai padeda mums užtikrinti geresnę vartotojo patirtį ir išbandyti naujas funkcijas.',
		},
	},
	frame: {
		title:
			'Priimkite {category} sutikimą, kad galėtumėte peržiūrėti šį turinį.',
		actionButton: 'Įgalinti {category} sutikimą',
	},
	legalLinks: {
		privacyPolicy: 'Privatumo politika',
		cookiePolicy: 'Slapukų politika',
		termsOfService: 'Naudojimosi sąlygos',
	},
};
export default translations;
