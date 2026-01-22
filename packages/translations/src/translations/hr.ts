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
	iab: {
		banner: {
			title: 'Postavke privatnosti',
			description:
				'Mi i naših {partnerCount} partnera pohranjujemo i/ili pristupamo informacijama na vašem uređaju i obrađujemo osobne podatke, kao što su jedinstveni identifikatori i podaci o pregledavanju, za ovu web stranicu, kako bismo:',
			partnersLink: '{count} partnera',
			andMore: 'I još {count}...',
			legitimateInterestNotice:
				'Neki partneri polažu pravo na legitimni interes za obradu vaših podataka. Imate pravo prigovora na ovu obradu, prilagodbe svojih izbora i povlačenja privole u bilo kojem trenutku.',
		},
		preferenceCenter: {
			title: 'Postavke privatnosti',
			description:
				'Ovdje možete prilagoditi svoje postavke privatnosti. Možete odabrati koje vrste kolačića i tehnologija praćenja dopuštate.',
			tabs: {
				purposes: 'Svrhe',
				vendors: 'Prodavači',
			},
			purposeItem: {
				partners: '{count} partnera',
				vendorsUseLegitimateInterest:
					'{count} prodavača polaže pravo na legitimni interes',
				examples: 'Primjeri',
				partnersUsingPurpose: 'Partneri koji koriste ovu svrhu',
				withYourPermission: 'Uz vaše dopuštenje',
				legitimateInterest: 'Legitimni interes',
				objectButton: 'Prigovori',
				objected: 'Prigovoreno',
				rightToObject:
					'Imate pravo prigovora na obradu temeljenu na legitimnom interesu.',
			},
			specialPurposes: {
				title: 'Osnovne funkcije (obavezno)',
				tooltip:
					'Ove su funkcije potrebne za funkcionalnost i sigurnost stranice. Prema IAB TCF-u, ne možete uložiti prigovor na ove posebne svrhe.',
			},
			vendorList: {
				search: 'Pretraži prodavače...',
				showingCount: '{filtered} od {total} prodavača',
				iabVendorsHeading: 'IAB registrirani prodavači',
				iabVendorsNotice:
					'Ovi partneri su registrirani u IAB Transparency & Consent Framework (TCF), industrijskom standardu za upravljanje privolama',
				customVendorsHeading: 'Prilagođeni partneri',
				customVendorsNotice:
					'Ovo su prilagođeni partneri koji nisu registrirani u IAB Transparency & Consent Framework (TCF). Oni obrađuju podatke na temelju vaše privole i mogu imati drugačije prakse privatnosti od IAB registriranih prodavača.',
				purposes: 'Svrhe',
				specialPurposes: 'Posebne svrhe',
				specialFeatures: 'Posebne značajke',
				dataCategories: 'Kategorije podataka',
				usesCookies: 'Koristi kolačiće',
				nonCookieAccess: 'Pristup bez kolačića',
				maxAge: 'Maks. starost: {days}d',
				legitimateInterest: 'Leg. interes',
				privacyPolicy: 'Pravila o privatnosti',
				storageDisclosure: 'Objavljivanje pohrane',
				requiredNotice:
					'Potrebno za funkcionalnost stranice, ne može se onemogućiti',
			},
			footer: {
				consentStorage:
					'Postavke privole pohranjuju se u kolačiću pod nazivom "euconsent-v2" tijekom 13 mjeseci.',
			},
		},
		common: {
			acceptAll: 'Prihvati sve',
			rejectAll: 'Odbij sve',
			customize: 'Prilagodi',
			saveSettings: 'Spremi postavke',
			loading: 'Učitavanje...',
			showingSelectedVendor: 'Prikaz odabranog prodavača',
			clearSelection: 'Očisti',
			customPartner: 'Prilagođeni partner koji nije registriran u IAB-u',
		},
	},
};
export default translations;
