import type { CompleteTranslations } from '../types';
export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Alles accepteren',
		rejectAll: 'Alles weigeren',
		customize: 'Aanpassen',
		save: 'Instellingen opslaan',
	},
	cookieBanner: {
		title: 'Wij hechten waarde aan uw privacy',
		description:
			'Deze site gebruikt cookies om uw surfervaring te verbeteren, het verkeer op de site te analyseren en gepersonaliseerde inhoud te tonen',
	},
	consentManagerDialog: {
		title: 'Privacy-instellingen',
		description:
			'Pas hier uw privacyinstellingen aan. U kunt kiezen welke soorten cookies en trackingtechnologieën u toestaat.',
	},
	consentTypes: {
		necessary: {
			title: 'Strikt noodzakelijk',
			description:
				'Deze cookies zijn essentieel voor het goed functioneren van de website en kunnen niet worden uitgeschakeld',
		},
		functionality: {
			title: 'Functionaliteit',
			description:
				'Deze cookies maken verbeterde functionaliteit en personalisatie van de website mogelijk.',
		},
		marketing: {
			title: 'Marketing',
			description:
				'Deze cookies worden gebruikt om relevante advertenties aan te bieden en de effectiviteit ervan bij te houden',
		},
		measurement: {
			title: 'Analytics',
			description:
				'Deze cookies helpen ons te begrijpen hoe bezoekers omgaan met de website en de prestaties ervan te verbeteren',
		},
		experience: {
			title: 'Ervaring',
			description:
				'Deze cookies helpen ons om een betere gebruikerservaring te bieden en nieuwe functies te testen',
		},
	},
	frame: {
		title: 'Accepteer {category} om deze inhoud te bekijken',
		actionButton: 'Schakel {category} toestemming in',
	},
	legalLinks: {
		privacyPolicy: 'Privacybeleid',
		cookiePolicy: 'Cookiebeleid',
		termsOfService: 'Servicevoorwaarden',
	},
	iab: {
		banner: {
			title: 'Privacy-instellingen',
			description:
				'Wij en onze {partnerCount} partners slaan informatie op een apparaat op en/of openen deze en verwerken persoonlijke gegevens, zoals unieke identificatoren en browsegegevens, voor deze website, om:',
			partnersLink: '{count} partners',
			andMore: 'En nog {count}...',
			legitimateInterestNotice:
				'Sommige partners maken aanspraak op een gerechtvaardigd belang om uw gegevens te verwerken. U heeft het recht om bezwaar te maken tegen deze verwerking, uw keuzes aan te passen en uw toestemming op elk moment in te trekken.',
		},
		preferenceCenter: {
			title: 'Privacy-instellingen',
			description:
				'Pas hier uw privacyinstellingen aan. U kunt kiezen welke soorten cookies en trackingtechnologieën u toestaat.',
			tabs: {
				purposes: 'Doeleinden',
				vendors: 'Leveranciers',
			},
			purposeItem: {
				partners: '{count} partners',
				vendorsUseLegitimateInterest:
					'{count} leveranciers maken aanspraak op gerechtvaardigd belang',
				examples: 'Voorbeelden',
				partnersUsingPurpose: 'Partners die dit doeleinde gebruiken',
				withYourPermission: 'Met uw toestemming',
				legitimateInterest: 'Gerechtvaardigd belang',
				objectButton: 'Bezwaar maken',
				objected: 'Bezwaar gemaakt',
				rightToObject:
					'U heeft het recht om bezwaar te maken tegen verwerking op basis van gerechtvaardigd belang.',
			},
			specialPurposes: {
				title: 'Essentiële functies (vereist)',
				tooltip:
					'Deze zijn vereist voor de functionaliteit en beveiliging van de site. Volgens IAB TCF kunt u geen bezwaar maken tegen deze speciale doeleinden.',
			},
			vendorList: {
				search: 'Zoek leveranciers...',
				showingCount: '{filtered} van {total} leveranciers',
				iabVendorsHeading: 'IAB-geregistreerde leveranciers',
				iabVendorsNotice:
					'Deze partners zijn geregistreerd bij het IAB Transparency & Consent Framework (TCF), een industriestandaard voor het beheren van toestemming',
				customVendorsHeading: 'Aangepaste partners',
				customVendorsNotice:
					'Dit zijn aangepaste partners die niet zijn geregistreerd bij het IAB Transparency & Consent Framework (TCF). Ze verwerken gegevens op basis van uw toestemming en kunnen andere privacypraktijken hebben dan IAB-geregistreerde leveranciers.',
				purposes: 'Doeleinden',
				specialPurposes: 'Speciale doeleinden',
				specialFeatures: 'Speciale functies',
				dataCategories: 'Datacategorieën',
				usesCookies: 'Gebruikt cookies',
				nonCookieAccess: 'Toegang zonder cookies',
				maxAge: 'Max. leeftijd: {days}d',
				legitimateInterest: 'Gerechtv. belang',
				privacyPolicy: 'Privacybeleid',
				storageDisclosure: 'Openbaarmaking van opslag',
				requiredNotice:
					'Vereist voor websitefunctionaliteit, kan niet worden uitgeschakeld',
			},
			footer: {
				consentStorage:
					'Toestemmingsvoorkeuren worden gedurende 13 maanden opgeslagen in een cookie genaamd "euconsent-v2".',
			},
		},
		common: {
			acceptAll: 'Alles accepteren',
			rejectAll: 'Alles weigeren',
			customize: 'Aanpassen',
			saveSettings: 'Instellingen opslaan',
			loading: 'Laden...',
			showingSelectedVendor: 'Geselecteerde leverancier wordt getoond',
			clearSelection: 'Wissen',
			customPartner: 'Aangepaste partner niet geregistreerd bij het IAB',
		},
	},
};
export default translations;
