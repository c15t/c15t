import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Alles accepteren',
		close: 'Sluiten',
		customize: 'Aanpassen',
		rejectAll: 'Alles weigeren',
		save: 'Instellingen opslaan',
		securedBy: 'Beveiligd door',
	},
	consentManagerDialog: {
		description:
			'Pas hier uw privacyinstellingen aan. U kunt kiezen welke soorten cookies en trackingtechnologieën u toestaat.',
		title: 'Privacy-instellingen',
	},
	consentTypes: {
		experience: {
			description:
				'Deze cookies helpen ons om een betere gebruikerservaring te bieden en nieuwe functies te testen',
			title: 'Ervaring',
		},
		functionality: {
			description:
				'Deze cookies maken verbeterde functionaliteit en personalisatie van de website mogelijk.',
			title: 'Functionaliteit',
		},
		marketing: {
			description:
				'Deze cookies worden gebruikt om relevante advertenties aan te bieden en de effectiviteit ervan bij te houden',
			title: 'Marketing',
		},
		measurement: {
			description:
				'Deze cookies helpen ons te begrijpen hoe bezoekers omgaan met de website en de prestaties ervan te verbeteren',
			title: 'Analytics',
		},
		necessary: {
			description:
				'Deze cookies zijn essentieel voor het goed functioneren van de website en kunnen niet worden uitgeschakeld',
			title: 'Strikt noodzakelijk',
		},
	},
	cookieBanner: {
		description:
			'Deze site gebruikt cookies om uw surfervaring te verbeteren, het verkeer op de site te analyseren en gepersonaliseerde inhoud te tonen',
		title: 'Wij hechten waarde aan uw privacy',
	},
	frame: {
		actionButton: 'Schakel {category} toestemming in',
		error: 'This content could not be loaded.',
		loading: 'Loading content…',
		policyBlocked:
			"This content is unavailable under your region's consent policy.",
		title: 'Accepteer {category} om deze inhoud te bekijken',
	},
	iab: {
		banner: {
			andMore: 'En nog {count}...',
			description:
				'Wij en onze {partnerCount} partners slaan informatie op een apparaat op en/of openen deze en verwerken persoonlijke gegevens, zoals unieke identificatoren en browsegegevens, voor deze website, om:',
			legitimateInterestNotice:
				'Sommige partners maken aanspraak op een gerechtvaardigd belang om uw gegevens te verwerken. U heeft het recht om bezwaar te maken tegen deze verwerking, uw keuzes aan te passen en uw toestemming op elk moment in te trekken.',
			partnersLink: '{count} partners',
			scopeGroup: 'Uw keuze geldt voor al onze websites in deze groep.',
			scopeServiceSpecific:
				'Je toestemming geldt alleen voor deze website en heeft geen invloed op andere diensten.',
			title: 'Privacy-instellingen',
		},
		common: {
			acceptAll: 'Alles accepteren',
			clearSelection: 'Wissen',
			customPartner: 'Aangepaste partner niet geregistreerd bij het IAB',
			customize: 'Aanpassen',
			loading: 'Laden...',
			rejectAll: 'Alles weigeren',
			saveSettings: 'Instellingen opslaan',
			showingSelectedVendor: 'Geselecteerde leverancier wordt getoond',
		},
		preferenceCenter: {
			description:
				'Pas hier uw privacyinstellingen aan. U kunt kiezen welke soorten cookies en trackingtechnologieën u toestaat.',
			footer: {
				consentStorage:
					'Toestemmingsvoorkeuren worden gedurende 13 maanden opgeslagen in een cookie genaamd "euconsent-v2". De bewaartermijn kan opnieuw ingaan wanneer u uw voorkeuren aanpast.',
			},
			purposeItem: {
				examples: 'Voorbeelden',
				legitimateInterest: 'Gerechtvaardigd belang',
				objectButton: 'Bezwaar maken',
				objected: 'Bezwaar gemaakt',
				partners: '{count} partners',
				partnersUsingPurpose: 'Partners die dit doeleinde gebruiken',
				rightToObject:
					'U heeft het recht om bezwaar te maken tegen verwerking op basis van gerechtvaardigd belang.',
				vendorsUseLegitimateInterest:
					'{count} leveranciers maken aanspraak op gerechtvaardigd belang',
				withYourPermission: 'Met uw toestemming',
			},
			specialPurposes: {
				title: 'Essentiële functies (vereist)',
				tooltip:
					'Deze zijn vereist voor de functionaliteit en beveiliging van de site. Volgens IAB TCF kunt u geen bezwaar maken tegen deze speciale doeleinden.',
			},
			tabs: {
				purposes: 'Doeleinden',
				vendors: 'Leveranciers',
			},
			title: 'Privacy-instellingen',
			vendorList: {
				customVendorsHeading: 'Aangepaste partners',
				customVendorsNotice:
					'Dit zijn aangepaste partners die niet zijn geregistreerd bij het IAB Transparency & Consent Framework (TCF). Ze verwerken gegevens op basis van uw toestemming en kunnen andere privacypraktijken hebben dan IAB-geregistreerde leveranciers.',
				dataCategories: 'Datacategorieën',
				features: 'Functies',
				iabVendorsHeading: 'IAB-geregistreerde leveranciers',
				iabVendorsNotice:
					'Deze partners zijn geregistreerd bij het IAB Transparency & Consent Framework (TCF), een industriestandaard voor het beheren van toestemming',
				legitimateInterest: 'Gerechtv. belang',
				maxAge: 'Max. leeftijd: {days}d',
				nonCookieAccess: 'Toegang zonder cookies',
				privacyPolicy: 'Privacybeleid',
				purposes: 'Doeleinden',
				requiredNotice:
					'Vereist voor websitefunctionaliteit, kan niet worden uitgeschakeld',
				retention: 'Bewaartermijn: {days}d',
				search: 'Zoek leveranciers...',
				showingCount: '{filtered} van {total} leveranciers',
				specialFeatures: 'Speciale functies',
				specialPurposes: 'Speciale doeleinden',
				storageDisclosure: 'Openbaarmaking van opslag',
				usesCookies: 'Gebruikt cookies',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'Cookiebeleid',
		privacyPolicy: 'Privacybeleid',
		termsOfService: 'Servicevoorwaarden',
	},
};
export default translations;
