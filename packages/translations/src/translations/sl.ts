import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Sprejmi vse',
		close: 'Zapri',
		customize: 'Prilagodi',
		rejectAll: 'Zavrni vse',
		save: 'Shrani nastavitve',
		securedBy: 'Zaščito zagotavlja',
	},
	consentManagerDialog: {
		description:
			'Tukaj prilagodite svoje nastavitve zasebnosti. Izberete lahko, katere vrste piškotkov in tehnologij sledenja dovolite.',
		title: 'Nastavitve zasebnosti',
	},
	consentTypes: {
		experience: {
			description:
				'Ti piškotki nam pomagajo zagotoviti boljšo uporabniško izkušnjo in testirati nove funkcije.',
			title: 'Izkušnja',
		},
		functionality: {
			description:
				'Ti piškotki omogočajo izboljšano funkcionalnost in personalizacijo spletne strani.',
			title: 'Funkcionalnost',
		},
		marketing: {
			description:
				'Ti piškotki se uporabljajo za prikazovanje relevantnih oglasov in spremljanje njihove učinkovitosti.',
			title: 'Trženje',
		},
		measurement: {
			description:
				'Ti piškotki nam pomagajo razumeti, kako obiskovalci uporabljajo spletno stran, in izboljšati njeno delovanje.',
			title: 'Analitika',
		},
		necessary: {
			description:
				'Ti piškotki so bistveni za pravilno delovanje spletne strani in jih ni mogoče onemogočiti.',
			title: 'Nujno potrebni',
		},
	},
	cookieBanner: {
		description:
			'Ta spletna stran uporablja piškotke za izboljšanje vaše uporabniške izkušnje, analizo prometa na strani in prikaz personaliziranih vsebin.',
		title: 'Cenimo vašo zasebnost',
	},
	frame: {
		actionButton: 'Omogoči soglasje za {category}',
		error: 'This content could not be loaded.',
		loading: 'Loading content…',
		policyBlocked:
			"This content is unavailable under your region's consent policy.",
		title: 'Za ogled te vsebine sprejmite soglasje za kategorijo {category}.',
	},
	iab: {
		banner: {
			andMore: 'In še {count}...',
			description:
				'Mi in naših {partnerCount} partnerjev shranjujemo in/ali dostopamo do informacij na vaši napravi ter obdelujemo osebne podatke, kot so edinstveni identifikatorji in podatki o brskanju, za to spletno mesto, da bi:',
			legitimateInterestNotice:
				'Nekateri partnerji uveljavljajo zakoniti interes za obdelavo vaših podatkov. Imate pravico do ugovora tej obdelavi, prilagoditve svojih izbir in preklica soglasja kadar koli.',
			partnersLink: '{count} partnerjev',
			scopeGroup: 'Vaša izbira velja za vse naše spletne strani v tej skupini.',
			scopeServiceSpecific:
				'Vaše soglasje velja samo za to spletno mesto in ne bo vplivalo na druge storitve.',
			title: 'Nastavitve zasebnosti',
		},
		common: {
			acceptAll: 'Sprejmi vse',
			clearSelection: 'Počisti',
			customPartner: 'Partner po meri, ki ni registriran v IAB',
			customize: 'Prilagodi',
			loading: 'Nalaganje...',
			rejectAll: 'Zavrni vse',
			saveSettings: 'Shrani nastavitve',
			showingSelectedVendor: 'Prikaz izbranega ponudnika',
		},
		preferenceCenter: {
			description:
				'Tukaj prilagodite svoje nastavitve zasebnosti. Izberete lahko, katere vrste piškotkov in tehnologij sledenja dovolite.',
			footer: {
				consentStorage:
					'Preference glede soglasja so shranjene v piškotku z imenom "euconsent-v2" 13 mesecev. Obdobje hrambe se lahko obnovi, ko posodobite svoje preference.',
			},
			purposeItem: {
				examples: 'Primeri',
				legitimateInterest: 'Zakoniti interes',
				objectButton: 'Ugovarjaj',
				objected: 'Ugovarjano',
				partners: '{count} partnerjev',
				partnersUsingPurpose: 'Partnerji, ki uporabljajo ta namen',
				rightToObject:
					'Imate pravico do ugovora obdelavi, ki temelji na zakonitem interesu.',
				vendorsUseLegitimateInterest:
					'{count} ponudnikov uveljavlja zakoniti interes',
				withYourPermission: 'Z vašim dovoljenjem',
			},
			specialPurposes: {
				title: 'Bistvene funkcije (obvezno)',
				tooltip:
					'Te so potrebne for funkcionalnost in varnost spletnega mesta. V skladu z IAB TCF ne morete ugovarjati tem posebnim namenom.',
			},
			tabs: {
				purposes: 'Nameni',
				vendors: 'Ponudniki',
			},
			title: 'Nastavitve zasebnosti',
			vendorList: {
				customVendorsHeading: 'Partnerji po meri',
				customVendorsNotice:
					'To so partnerji po meri, ki niso registrirani v okviru IAB Transparency & Consent Framework (TCF). Podatke obdelujejo na podlagi vašega soglasja in imajo lahko drugačne prakse zasebnosti kot ponudniki, registrirani v IAB.',
				dataCategories: 'Kategorije podatkov',
				features: 'Funkcije',
				iabVendorsHeading: 'Ponudniki, registrirani v IAB',
				iabVendorsNotice:
					'Ti partnerji so registrirani v okviru IAB Transparency & Consent Framework (TCF), industrijskega standarda za upravljanje soglasij',
				legitimateInterest: 'Zakoniti int.',
				maxAge: 'Najv. starost: {days}d',
				nonCookieAccess: 'Dostop brez piškotkov',
				privacyPolicy: 'Pravilnik o zasebnosti',
				purposes: 'Nameni',
				requiredNotice:
					'Zahtevano za delovanje spletnega mesta, ni mogoče onemogočiti',
				retention: 'Hramba: {days}d',
				search: 'Išči ponudnike...',
				showingCount: 'Prikazano {filtered} od {total} ponudnikov',
				specialFeatures: 'Posebne funkcije',
				specialPurposes: 'Posebni nameni',
				storageDisclosure: 'Razkritje shranjevanja',
				usesCookies: 'Uporablja piškotke',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'Pravilnik o piškotkih',
		privacyPolicy: 'Pravilnik o zasebnosti',
		termsOfService: 'Pogoji uporabe',
	},
};
export default translations;
