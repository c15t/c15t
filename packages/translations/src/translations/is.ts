import type { CompleteTranslations } from '../types';
export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Samþykkja allt',
		rejectAll: 'Hafna öllu',
		customize: 'Sérsníða',
		save: 'Vista stillingar',
	},
	cookieBanner: {
		title: 'Við metum friðhelgi þína',
		description:
			'Þessi vefur notar vafrakökur til að bæta vafraupplifun þína, greina umferð á vefnum og sýna persónumiðað efni.',
	},
	consentManagerDialog: {
		title: 'Persónuverndastillingar',
		description:
			'Sérsníðaðu persónuverndastillingar þínar hér. Þú getur valið hvaða tegundir af vafrakökum og rakningartækni þú leyfir.',
	},
	consentTypes: {
		necessary: {
			title: 'Nauðsynlegar',
			description:
				'Þessar vafrakökur eru nauðsynlegar til að vefsíðan virki rétt og ekki er hægt að slökkva á þeim.',
		},
		functionality: {
			title: 'Virkni',
			description:
				'Þessar vafrakökur gera mögulegt að auka virkni og persónumiða vefsíðuna.',
		},
		marketing: {
			title: 'Markaðssetning',
			description:
				'Þessar vafrakökur eru notaðar til að birta viðeigandi auglýsingar og fylgjast með árangri þeirra.',
		},
		measurement: {
			title: 'Greining',
			description:
				'Þessar vafrakökur hjálpa okkur að skilja hvernig gestir nota vefsíðuna og bæta frammistöðu hennar.',
		},
		experience: {
			title: 'Upplifun',
			description:
				'Þessar vafrakökur hjálpa okkur að veita betri notendaupplifun og prófa nýja eiginleika.',
		},
	},
	frame: {
		title: 'Samþykktu {category} samþykki til að skoða þetta efni.',
		actionButton: 'Virkja {category} samþykki',
	},
	legalLinks: {
		privacyPolicy: 'Persónuverndarstefna',
		cookiePolicy: 'Stefna um vafrakökur',
		termsOfService: 'Þjónustuskilmálar',
	},
	iab: {
		banner: {
			title: 'Persónuverndastillingar',
			description:
				'Við og {partnerCount} samstarfsaðilar okkar geymum og/eða höfum aðgang að upplýsingum á tækinu þínu og vinnum persónuupplýsingar, svo sem einstök auðkenni og vafraupplýsingar, fyrir þessa vefsíðu, til að:',
			partnersLink: '{count} samstarfsaðilar',
			andMore: 'Og {count} til viðbótar...',
			legitimateInterestNotice:
				'Sumir samstarfsaðilar krefjast lögmætra hagsmuna til að vinna gögnin þín. Þú átt rétt á að andmæla þessari vinnslu, sérsníða val þitt og draga samþykki þitt til baka hvenær sem er.',
		},
		preferenceCenter: {
			title: 'Persónuverndastillingar',
			description:
				'Sérsníðaðu persónuverndastillingar þínar hér. Þú getur valið hvaða tegundir af vafrakökum og rakningartækni þú leyfir.',
			tabs: {
				purposes: 'Tilgangur',
				vendors: 'Söluaðilar',
			},
			purposeItem: {
				partners: '{count} samstarfsaðilar',
				vendorsUseLegitimateInterest:
					'{count} söluaðilar krefjast lögmætra hagsmuna',
				examples: 'Dæmi',
				partnersUsingPurpose: 'Samstarfsaðilar sem nota þennan tilgang',
				withYourPermission: 'Með þínu leyfi',
				legitimateInterest: 'Lögmætir hagsmunir',
				objectButton: 'Andmæla',
				objected: 'Andmælt',
				rightToObject:
					'Þú átt rétt á að andmæla vinnslu sem byggir á lögmætum hagsmunum.',
			},
			specialPurposes: {
				title: 'Nauðsynleg virkni (krafist)',
				tooltip:
					'Þetta er nauðsynlegt fyrir virkni og öryggi vefsins. Samkvæmt IAB TCF geturðu ekki andmælt þessum sérstöku markmiðum.',
			},
			vendorList: {
				search: 'Leita að söluaðilum...',
				showingCount: '{filtered} af {total} söluaðilum',
				iabVendorsHeading: 'IAB skráðir söluaðilar',
				iabVendorsNotice:
					'Þessir samstarfsaðilar eru skráðir hjá IAB Transparency & Consent Framework (TCF), iðnaðarstaðli til að stjórna samþykki',
				customVendorsHeading: 'Sérsniðnir samstarfsaðilar',
				customVendorsNotice:
					'Þetta eru sérsniðnir samstarfsaðilar sem eru ekki skráðir hjá IAB Transparency & Consent Framework (TCF). Þeir vinna gögn byggt á samþykki þínu og gætu haft aðrar persónuverndarreglur en IAB-skráðir söluaðilar.',
				purposes: 'Tilgangur',
				specialPurposes: 'Sérstakur tilgangur',
				specialFeatures: 'Sérstakir eiginleikar',
				dataCategories: 'Gagnaflokkar',
				usesCookies: 'Notar vafrakökur',
				nonCookieAccess: 'Aðgangur án vafrakaka',
				maxAge: 'Hámarksaldur: {days}d',
				legitimateInterest: 'Lögm. hagsmunir',
				privacyPolicy: 'Persónuverndarstefna',
				storageDisclosure: 'Upplýsingar um geymslu',
				requiredNotice:
					'Nauðsynlegt fyrir virkni vefsins, ekki hægt að slökkva á',
			},
			footer: {
				consentStorage:
					'Samþykkisstillingar eru geymdar í vafraköku sem heitir "euconsent-v2" í 13 mánuði.',
			},
		},
		common: {
			acceptAll: 'Samþykkja allt',
			rejectAll: 'Hafna öllu',
			customize: 'Sérsníða',
			saveSettings: 'Vista stillingar',
			loading: 'Hleður...',
			showingSelectedVendor: 'Sýnir valdan söluaðila',
			clearSelection: 'Hreinsa',
			customPartner: 'Sérsniðinn samstarfsaðili ekki skráður hjá IAB',
		},
	},
};
export default translations;
