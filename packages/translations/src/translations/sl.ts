import type { CompleteTranslations } from '../types';
export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Sprejmi vse',
		rejectAll: 'Zavrni vse',
		customize: 'Prilagodi',
		save: 'Shrani nastavitve',
	},
	cookieBanner: {
		title: 'Cenimo vašo zasebnost',
		description:
			'Ta spletna stran uporablja piškotke za izboljšanje vaše uporabniške izkušnje, analizo prometa na strani in prikaz personaliziranih vsebin.',
	},
	consentManagerDialog: {
		title: 'Nastavitve zasebnosti',
		description:
			'Tukaj prilagodite svoje nastavitve zasebnosti. Izberete lahko, katere vrste piškotkov in tehnologij sledenja dovolite.',
	},
	consentTypes: {
		necessary: {
			title: 'Nujno potrebni',
			description:
				'Ti piškotki so bistveni za pravilno delovanje spletne strani in jih ni mogoče onemogočiti.',
		},
		functionality: {
			title: 'Funkcionalnost',
			description:
				'Ti piškotki omogočajo izboljšano funkcionalnost in personalizacijo spletne strani.',
		},
		marketing: {
			title: 'Trženje',
			description:
				'Ti piškotki se uporabljajo za prikazovanje relevantnih oglasov in spremljanje njihove učinkovitosti.',
		},
		measurement: {
			title: 'Analitika',
			description:
				'Ti piškotki nam pomagajo razumeti, kako obiskovalci uporabljajo spletno stran, in izboljšati njeno delovanje.',
		},
		experience: {
			title: 'Izkušnja',
			description:
				'Ti piškotki nam pomagajo zagotoviti boljšo uporabniško izkušnjo in testirati nove funkcije.',
		},
	},
	frame: {
		title: 'Za ogled te vsebine sprejmite soglasje za kategorijo {category}.',
		actionButton: 'Omogoči soglasje za {category}',
	},
	legalLinks: {
		privacyPolicy: 'Pravilnik o zasebnosti',
		cookiePolicy: 'Pravilnik o piškotkih',
		termsOfService: 'Pogoji uporabe',
	},
	iab: {
		banner: {
			title: 'Nastavitve zasebnosti',
			description:
				'Mi in naših {partnerCount} partnerjev shranjujemo in/ali dostopamo do informacij na vaši napravi ter obdelujemo osebne podatke, kot so edinstveni identifikatorji in podatki o brskanju, za to spletno mesto, da bi:',
			partnersLink: '{count} partnerjev',
			andMore: 'In še {count}...',
			legitimateInterestNotice:
				'Nekateri partnerji uveljavljajo zakoniti interes za obdelavo vaših podatkov. Imate pravico do ugovora tej obdelavi, prilagoditve svojih izbir in preklica soglasja kadar koli.',
		},
		preferenceCenter: {
			title: 'Nastavitve zasebnosti',
			description:
				'Tukaj prilagodite svoje nastavitve zasebnosti. Izberete lahko, katere vrste piškotkov in tehnologij sledenja dovolite.',
			tabs: {
				purposes: 'Nameni',
				vendors: 'Ponudniki',
			},
			purposeItem: {
				partners: '{count} partnerjev',
				vendorsUseLegitimateInterest:
					'{count} ponudnikov uveljavlja zakoniti interes',
				examples: 'Primeri',
				partnersUsingPurpose: 'Partnerji, ki uporabljajo ta namen',
				withYourPermission: 'Z vašim dovoljenjem',
				legitimateInterest: 'Zakoniti interes',
				objectButton: 'Ugovarjaj',
				objected: 'Ugovarjano',
				rightToObject:
					'Imate pravico do ugovora obdelavi, ki temelji na zakonitem interesu.',
			},
			specialPurposes: {
				title: 'Bistvene funkcije (obvezno)',
				tooltip:
					'Te so potrebne for funkcionalnost in varnost spletnega mesta. V skladu z IAB TCF ne morete ugovarjati tem posebnim namenom.',
			},
			vendorList: {
				search: 'Išči ponudnike...',
				showingCount: 'Prikazano {filtered} od {total} ponudnikov',
				iabVendorsHeading: 'Ponudniki, registrirani v IAB',
				iabVendorsNotice:
					'Ti partnerji so registrirani v okviru IAB Transparency & Consent Framework (TCF), industrijskega standarda za upravljanje soglasij',
				customVendorsHeading: 'Partnerji po meri',
				customVendorsNotice:
					'To so partnerji po meri, ki niso registrirani v okviru IAB Transparency & Consent Framework (TCF). Podatke obdelujejo na podlagi vašega soglasja in imajo lahko drugačne prakse zasebnosti kot ponudniki, registrirani v IAB.',
				purposes: 'Nameni',
				specialPurposes: 'Posebni nameni',
				specialFeatures: 'Posebne funkcije',
				dataCategories: 'Kategorije podatkov',
				usesCookies: 'Uporablja piškotke',
				nonCookieAccess: 'Dostop brez piškotkov',
				maxAge: 'Najv. starost: {days}d',
				legitimateInterest: 'Zakoniti int.',
				privacyPolicy: 'Pravilnik o zasebnosti',
				storageDisclosure: 'Razkritje shranjevanja',
				requiredNotice:
					'Zahtevano za delovanje spletnega mesta, ni mogoče onemogočiti',
			},
			footer: {
				consentStorage:
					'Preference glede soglasja so shranjene v piškotku z imenom "euconsent-v2" 13 mesecev.',
			},
		},
		common: {
			acceptAll: 'Sprejmi vse',
			rejectAll: 'Zavrni vse',
			customize: 'Prilagodi',
			saveSettings: 'Shrani nastavitve',
			loading: 'Nalaganje...',
			showingSelectedVendor: 'Prikaz izbranega ponudnika',
			clearSelection: 'Počisti',
			customPartner: 'Partner po meri, ki ni registriran v IAB',
		},
	},
};
export default translations;
