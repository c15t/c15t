import type { CompleteTranslations } from '../types';
export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Prihvati sve',
		rejectAll: 'Odbij sve',
		customize: 'Prilagodi',
		save: 'Spremi postavke',
	},
	cookieBanner: {
		title: 'Cijenimo vašu privatnost',
		description:
			'Ova stranica koristi kolačiće za poboljšanje vašeg iskustva pregledavanja, analizu prometa na stranici i prikaz personaliziranog sadržaja.',
	},
	consentManagerDialog: {
		title: 'Postavke privatnosti',
		description:
			'Ovdje možete prilagoditi svoje postavke privatnosti. Možete odabrati koje vrste kolačića i tehnologija praćenja dopuštate.',
	},
	consentTypes: {
		necessary: {
			title: 'Strogo nužno',
			description:
				'Ovi kolačići su ključni za ispravno funkcioniranje web stranice i ne mogu se onemogućiti.',
		},
		functionality: {
			title: 'Funkcionalnost',
			description:
				'Ovi kolačići omogućuju poboljšanu funkcionalnost i personalizaciju web stranice.',
		},
		marketing: {
			title: 'Marketing',
			description:
				'Ovi kolačići se koriste za prikaz relevantnih oglasa i praćenje njihove učinkovitosti.',
		},
		measurement: {
			title: 'Analitika',
			description:
				'Ovi kolačići nam pomažu razumjeti kako posjetitelji koriste web stranicu i poboljšati njezine performanse.',
		},
		experience: {
			title: 'Iskustvo',
			description:
				'Ovi kolačići nam pomažu pružiti bolje korisničko iskustvo i testirati nove značajke.',
		},
	},
	frame: {
		title: 'Prihvatite {category} privolu za prikaz ovog sadržaja.',
		actionButton: 'Omogući {category} privolu',
	},
	legalLinks: {
		privacyPolicy: 'Pravila o privatnosti',
		cookiePolicy: 'Pravila o kolačićima',
		termsOfService: 'Uvjeti pružanja usluge',
	},
};
export default translations;
