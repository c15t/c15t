import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Prihvati sve',
		close: 'Zatvori',
		customize: 'Prilagodi',
		rejectAll: 'Odbij sve',
		save: 'Spremi postavke',
		securedBy: 'Zaštitu pruža',
	},
	consentManagerDialog: {
		description:
			'Ovdje možete prilagoditi svoje postavke privatnosti. Možete odabrati koje vrste kolačića i tehnologija praćenja dopuštate.',
		title: 'Postavke privatnosti',
	},
	consentTypes: {
		experience: {
			description:
				'Ovi kolačići nam pomažu pružiti bolje korisničko iskustvo i testirati nove značajke.',
			title: 'Iskustvo',
		},
		functionality: {
			description:
				'Ovi kolačići omogućuju poboljšanu funkcionalnost i personalizaciju web stranice.',
			title: 'Funkcionalnost',
		},
		marketing: {
			description:
				'Ovi kolačići se koriste za prikaz relevantnih oglasa i praćenje njihove učinkovitosti.',
			title: 'Marketing',
		},
		measurement: {
			description:
				'Ovi kolačići nam pomažu razumjeti kako posjetitelji koriste web stranicu i poboljšati njezine performanse.',
			title: 'Analitika',
		},
		necessary: {
			description:
				'Ovi kolačići su ključni za ispravno funkcioniranje web stranice i ne mogu se onemogućiti.',
			title: 'Strogo nužno',
		},
	},
	cookieBanner: {
		description:
			'Ova stranica koristi kolačiće za poboljšanje vašeg iskustva pregledavanja, analizu prometa na stranici i prikaz personaliziranog sadržaja.',
		title: 'Cijenimo vašu privatnost',
	},
	frame: {
		actionButton: 'Omogući {category} privolu',
		error: 'This content could not be loaded.',
		loading: 'Loading content…',
		policyBlocked:
			"This content is unavailable under your region's consent policy.",
		title: 'Prihvatite {category} privolu za prikaz ovog sadržaja.',
	},
	iab: {
		banner: {
			andMore: 'I još {count}...',
			description:
				'Mi i naših {partnerCount} partnera pohranjujemo i/ili pristupamo informacijama na vašem uređaju i obrađujemo osobne podatke, kao što su jedinstveni identifikatori i podaci o pregledavanju, za ovu web stranicu, kako bismo:',
			legitimateInterestNotice:
				'Neki partneri polažu pravo na legitimni interes za obradu vaših podataka. Imate pravo prigovora na ovu obradu, prilagodbe svojih izbora i povlačenja privole u bilo kojem trenutku.',
			partnersLink: '{count} partnera',
			scopeGroup: 'Vaš izbor vrijedi za sve naše web stranice u ovoj grupi.',
			scopeServiceSpecific:
				'Vaš pristanak odnosi se samo na ovu web stranicu i neće utjecati na druge usluge.',
			title: 'Postavke privatnosti',
		},
		common: {
			acceptAll: 'Prihvati sve',
			clearSelection: 'Očisti',
			customPartner: 'Prilagođeni partner koji nije registriran u IAB-u',
			customize: 'Prilagodi',
			loading: 'Učitavanje...',
			rejectAll: 'Odbij sve',
			saveSettings: 'Spremi postavke',
			showingSelectedVendor: 'Prikaz odabranog prodavača',
		},
		preferenceCenter: {
			description:
				'Ovdje možete prilagoditi svoje postavke privatnosti. Možete odabrati koje vrste kolačića i tehnologija praćenja dopuštate.',
			footer: {
				consentStorage:
					'Postavke privole pohranjuju se u kolačiću pod nazivom "euconsent-v2" tijekom 13 mjeseci. Trajanje pohrane može se obnoviti kada ažurirate svoje postavke.',
			},
			purposeItem: {
				examples: 'Primjeri',
				legitimateInterest: 'Legitimni interes',
				objectButton: 'Prigovori',
				objected: 'Prigovoreno',
				partners: '{count} partnera',
				partnersUsingPurpose: 'Partneri koji koriste ovu svrhu',
				rightToObject:
					'Imate pravo prigovora na obradu temeljenu na legitimnom interesu.',
				vendorsUseLegitimateInterest:
					'{count} prodavača polaže pravo na legitimni interes',
				withYourPermission: 'Uz vaše dopuštenje',
			},
			specialPurposes: {
				title: 'Osnovne funkcije (obavezno)',
				tooltip:
					'Ove su funkcije potrebne za funkcionalnost i sigurnost stranice. Prema IAB TCF-u, ne možete uložiti prigovor na ove posebne svrhe.',
			},
			tabs: {
				purposes: 'Svrhe',
				vendors: 'Prodavači',
			},
			title: 'Postavke privatnosti',
			vendorList: {
				customVendorsHeading: 'Prilagođeni partneri',
				customVendorsNotice:
					'Ovo su prilagođeni partneri koji nisu registrirani u IAB Transparency & Consent Framework (TCF). Oni obrađuju podatke na temelju vaše privole i mogu imati drugačije prakse privatnosti od IAB registriranih prodavača.',
				dataCategories: 'Kategorije podataka',
				features: 'Značajke',
				iabVendorsHeading: 'IAB registrirani prodavači',
				iabVendorsNotice:
					'Ovi partneri su registrirani u IAB Transparency & Consent Framework (TCF), industrijskom standardu za upravljanje privolama',
				legitimateInterest: 'Leg. interes',
				maxAge: 'Maks. starost: {days}d',
				nonCookieAccess: 'Pristup bez kolačića',
				privacyPolicy: 'Pravila o privatnosti',
				purposes: 'Svrhe',
				requiredNotice:
					'Potrebno za funkcionalnost stranice, ne može se onemogućiti',
				retention: 'Zadržavanje: {days}d',
				search: 'Pretraži prodavače...',
				showingCount: '{filtered} od {total} prodavača',
				specialFeatures: 'Posebne značajke',
				specialPurposes: 'Posebne svrhe',
				storageDisclosure: 'Objavljivanje pohrane',
				usesCookies: 'Koristi kolačiće',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'Pravila o kolačićima',
		privacyPolicy: 'Pravila o privatnosti',
		termsOfService: 'Uvjeti pružanja usluge',
	},
};
export default translations;
