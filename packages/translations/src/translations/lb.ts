import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'All akzeptéieren',
		close: 'Zoumaachen',
		customize: 'Upassen',
		rejectAll: 'All refuséieren',
		save: 'Astellunge späicheren',
		securedBy: 'Ofgeséchert vun',
	},
	consentManagerDialog: {
		description:
			'Passt Är Privatsphär Astellungen hei un. Dir kënnt wielen wéi eng Zorte vu Cookien an Tracking-Technologien Dir erlaabt.',
		title: 'Privatsphär Astellungen',
	},
	consentTypes: {
		experience: {
			description:
				'Dës Cookien hëllefen eis eng besser Benotzererfabrung ze bidden an nei Funktiounen ze testen.',
			title: 'Erfahrung',
		},
		functionality: {
			description:
				'Dës Cookien erméiglechen erweidert Funktionalitéit a Personaliséierung vun der Websäit.',
			title: 'Funktionalitéit',
		},
		marketing: {
			description:
				'Dës Cookien ginn benotzt fir relevant Reklammen ze liwweren an hir Wierksamkeet ze verfolgen.',
			title: 'Marketing',
		},
		measurement: {
			description:
				"Dës Cookien hëllefen eis ze verstoen wéi d'Besicher mat der Websäit interagéieren an hir Leeschtung verbesseren.",
			title: 'Analytik',
		},
		necessary: {
			description:
				"Dës Cookien si wesentlech fir datt d'Websäit richteg funktionéiert a kënnen net desaktivéiert ginn.",
			title: 'Strikt néideg',
		},
	},
	cookieBanner: {
		description:
			'Dës Websäit benotzt Cookien fir Är Surferfahrung ze verbesseren, Websäit-Verkéier ze analyséieren an personaliséierten Inhalt unzebidden.',
		title: 'Mir schätzen Är Privatsphär',
	},
	frame: {
		actionButton: '{category} Zoustëmmung aktivéieren',
		error: 'This content could not be loaded.',
		loading: 'Loading content…',
		policyBlocked:
			"This content is unavailable under your region's consent policy.",
		title: 'Akzeptéiert {category} Zoustëmmung fir dësen Inhalt ze gesinn.',
	},
	iab: {
		banner: {
			andMore: 'An nach {count}...',
			description:
				'Mir an eis {partnerCount} Partner späicheren an/oder gräifen op Informatiounen op Ärem Apparat zou a veraarbechten perséinlech Daten, wéi eenzegaarteg Identifizéierer a Browserdaten, fir dës Websäit, fir:',
			legitimateInterestNotice:
				'E puer Partner behaapten e berechtegten Interessi fir Är Daten ze veraarbechten. Dir hutt d’Recht géint dës Veraarbechtung ze protestéieren, Är Wiel unzepassen an Är Zoustëmmung zu all Moment zréckzezéien.',
			partnersLink: '{count} Partner',
			scopeGroup: 'Är Auswiel gëllt fir all eis Websäiten an dëser Grupp.',
			scopeServiceSpecific:
				'Är Zoustëmmung gëllt nëmme fir dës Websäit a wäert aner Servicer net beaflossen.',
			title: 'Privatsphär Astellungen',
		},
		common: {
			acceptAll: 'All akzeptéieren',
			clearSelection: 'Läschen',
			customPartner: 'Benotzerdefinéierte Partner net am IAB registréiert',
			customize: 'Upassen',
			loading: 'Lueden...',
			rejectAll: 'All refuséieren',
			saveSettings: 'Astellunge späicheren',
			showingSelectedVendor: 'Gewielten Ubider gëtt ugewisen',
		},
		preferenceCenter: {
			description:
				'Passt Är Privatsphär Astellungen hei un. Dir kënnt wielen wéi eng Zorte vu Cookien an Tracking-Technologien Dir erlaabt.',
			footer: {
				consentStorage:
					'Zoustëmmungsvirléiften ginn an engem Cookie mam Numm "euconsent-v2" fir 13 Méint gespäichert. D’Späicherdauer kann erneiert ginn, wann Dir Är Virléiften aktualiséiert.',
			},
			purposeItem: {
				examples: 'Beispiller',
				legitimateInterest: 'Berechtegten Interessi',
				objectButton: 'Protestéieren',
				objected: 'Protestéiert',
				partners: '{count} Partner',
				partnersUsingPurpose: 'Partner déi dësen Zweck benotzen',
				rightToObject:
					'Dir hutt d’Recht géint d’Veraarbechtung op Basis vu berechtegten Interessi ze protestéieren.',
				vendorsUseLegitimateInterest:
					'{count} Ubidder behaapten berechtegten Interessi',
				withYourPermission: 'Mat Ärer Erlaabnis',
			},
			specialPurposes: {
				title: 'Wichteg Funktiounen (erfuerderlech)',
				tooltip:
					'Dës sinn erfuerderlech fir d’Funktionalitéit an d’Sécherheet vum Site. Geméiss IAB TCF kënnt Dir net géint dës speziell Zwecker protestéieren.',
			},
			tabs: {
				purposes: 'Zwecker',
				vendors: 'Ubidder',
			},
			title: 'Privatsphär Astellungen',
			vendorList: {
				customVendorsHeading: 'Benotzerdefinéiert Partner',
				customVendorsNotice:
					'Dëst si benotzerdefinéiert Partner déi net am IAB Transparency & Consent Framework (TCF) registréiert sinn. Si veraarbechten Daten op Basis vun Ärer Zoustëmmung a kënnen aner Dateschutzpraktiken hunn wéi IAB-registréiert Ubidder.',
				dataCategories: 'Datekategorien',
				features: 'Fonctiounen',
				iabVendorsHeading: 'IAB registréiert Ubidder',
				iabVendorsNotice:
					'Dës Partner sinn am IAB Transparency & Consent Framework (TCF) registréiert, en Industriestandard fir d’Gestioun vun der Zoustëmmung',
				legitimateInterest: 'Ber. Interessi',
				maxAge: 'Max Alter: {days}d',
				nonCookieAccess: 'Net-Cookie-Zougang',
				privacyPolicy: 'Dateschutzrichtlinn',
				purposes: 'Zwecker',
				requiredNotice:
					'Erfuerderlech fir d’Funktionalitéit vum Site, kann net desaktivéiert ginn',
				retention: 'Bewaaren: {days}d',
				search: 'Ubidder sichen...',
				showingCount: '{filtered} vun {total} Ubidder',
				specialFeatures: 'Speziell Fonctiounen',
				specialPurposes: 'Speziell Zwecker',
				storageDisclosure: 'Späicher-Offenlegung',
				usesCookies: 'Benotzt Cookien',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'Cookie-Politik',
		privacyPolicy: 'Dateschutzrichtlinn',
		termsOfService: 'Notzungsbedingungen',
	},
};
export default translations;
