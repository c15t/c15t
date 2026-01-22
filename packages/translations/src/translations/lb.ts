import type { CompleteTranslations } from '../types';
export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'All akzeptéieren',
		rejectAll: 'All refuséieren',
		customize: 'Upassen',
		save: 'Astellunge späicheren',
	},
	cookieBanner: {
		title: 'Mir schätzen Är Privatsphär',
		description:
			'Dës Websäit benotzt Cookien fir Är Surferfahrung ze verbesseren, Websäit-Verkéier ze analyséieren an personaliséierten Inhalt unzebidden.',
	},
	consentManagerDialog: {
		title: 'Privatsphär Astellungen',
		description:
			'Passt Är Privatsphär Astellungen hei un. Dir kënnt wielen wéi eng Zorte vu Cookien an Tracking-Technologien Dir erlaabt.',
	},
	consentTypes: {
		necessary: {
			title: 'Strikt néideg',
			description:
				"Dës Cookien si wesentlech fir datt d'Websäit richteg funktionéiert a kënnen net desaktivéiert ginn.",
		},
		functionality: {
			title: 'Funktionalitéit',
			description:
				'Dës Cookien erméiglechen erweidert Funktionalitéit a Personaliséierung vun der Websäit.',
		},
		marketing: {
			title: 'Marketing',
			description:
				'Dës Cookien ginn benotzt fir relevant Reklammen ze liwweren an hir Wierksamkeet ze verfolgen.',
		},
		measurement: {
			title: 'Analytik',
			description:
				"Dës Cookien hëllefen eis ze verstoen wéi d'Besicher mat der Websäit interagéieren an hir Leeschtung verbesseren.",
		},
		experience: {
			title: 'Erfahrung',
			description:
				'Dës Cookien hëllefen eis eng besser Benotzererfabrung ze bidden an nei Funktiounen ze testen.',
		},
	},
	frame: {
		title: 'Akzeptéiert {category} Zoustëmmung fir dësen Inhalt ze gesinn.',
		actionButton: '{category} Zoustëmmung aktivéieren',
	},
	legalLinks: {
		privacyPolicy: 'Dateschutzrichtlinn',
		cookiePolicy: 'Cookie-Politik',
		termsOfService: 'Notzungsbedingungen',
	},
	iab: {
		banner: {
			title: 'Privatsphär Astellungen',
			description:
				'Mir an eis {partnerCount} Partner späicheren an/oder gräifen op Informatiounen op Ärem Apparat zou a veraarbechten perséinlech Daten, wéi eenzegaarteg Identifizéierer a Browserdaten, fir dës Websäit, fir:',
			partnersLink: '{count} Partner',
			andMore: 'An nach {count}...',
			legitimateInterestNotice:
				'E puer Partner behaapten e berechtegten Interessi fir Är Daten ze veraarbechten. Dir hutt d’Recht géint dës Veraarbechtung ze protestéieren, Är Wiel unzepassen an Är Zoustëmmung zu all Moment zréckzezéien.',
		},
		preferenceCenter: {
			title: 'Privatsphär Astellungen',
			description:
				'Passt Är Privatsphär Astellungen hei un. Dir kënnt wielen wéi eng Zorte vu Cookien an Tracking-Technologien Dir erlaabt.',
			tabs: {
				purposes: 'Zwecker',
				vendors: 'Ubidder',
			},
			purposeItem: {
				partners: '{count} Partner',
				vendorsUseLegitimateInterest:
					'{count} Ubidder behaapten berechtegten Interessi',
				examples: 'Beispiller',
				partnersUsingPurpose: 'Partner déi dësen Zweck benotzen',
				withYourPermission: 'Mat Ärer Erlaabnis',
				legitimateInterest: 'Berechtegten Interessi',
				objectButton: 'Protestéieren',
				objected: 'Protestéiert',
				rightToObject:
					'Dir hutt d’Recht géint d’Veraarbechtung op Basis vu berechtegten Interessi ze protestéieren.',
			},
			specialPurposes: {
				title: 'Wichteg Funktiounen (erfuerderlech)',
				tooltip:
					'Dës sinn erfuerderlech fir d’Funktionalitéit an d’Sécherheet vum Site. Geméiss IAB TCF kënnt Dir net géint dës speziell Zwecker protestéieren.',
			},
			vendorList: {
				search: 'Ubidder sichen...',
				showingCount: '{filtered} vun {total} Ubidder',
				iabVendorsHeading: 'IAB registréiert Ubidder',
				iabVendorsNotice:
					'Dës Partner sinn am IAB Transparency & Consent Framework (TCF) registréiert, en Industriestandard fir d’Gestioun vun der Zoustëmmung',
				customVendorsHeading: 'Benotzerdefinéiert Partner',
				customVendorsNotice:
					'Dëst si benotzerdefinéiert Partner déi net am IAB Transparency & Consent Framework (TCF) registréiert sinn. Si veraarbechten Daten op Basis vun Ärer Zoustëmmung a kënnen aner Dateschutzpraktiken hunn wéi IAB-registréiert Ubidder.',
				purposes: 'Zwecker',
				specialPurposes: 'Speziell Zwecker',
				specialFeatures: 'Speziell Fonctiounen',
				dataCategories: 'Datekategorien',
				usesCookies: 'Benotzt Cookien',
				nonCookieAccess: 'Net-Cookie-Zougang',
				maxAge: 'Max Alter: {days}d',
				legitimateInterest: 'Ber. Interessi',
				privacyPolicy: 'Dateschutzrichtlinn',
				storageDisclosure: 'Späicher-Offenlegung',
				requiredNotice:
					'Erfuerderlech fir d’Funktionalitéit vum Site, kann net desaktivéiert ginn',
			},
			footer: {
				consentStorage:
					'Zoustëmmungsvirléiften ginn an engem Cookie mam Numm "euconsent-v2" fir 13 Méint gespäichert.',
			},
		},
		common: {
			acceptAll: 'All akzeptéieren',
			rejectAll: 'All refuséieren',
			customize: 'Upassen',
			saveSettings: 'Astellunge späicheren',
			loading: 'Lueden...',
			showingSelectedVendor: 'Gewielten Ubider gëtt ugewisen',
			clearSelection: 'Läschen',
			customPartner: 'Benotzerdefinéierte Partner net am IAB registréiert',
		},
	},
};
export default translations;
