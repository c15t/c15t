import type { CompleteTranslations } from '../types';
export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Acceptera alla',
		rejectAll: 'Avvisa alla',
		customize: 'Anpassa',
		save: 'Spara inställningar',
	},
	cookieBanner: {
		title: 'Vi värdesätter din integritet',
		description:
			'Den här webbplatsen använder cookies för att förbättra din surfupplevelse, analysera webbplatstrafik och visa personligt anpassat innehåll.',
	},
	consentManagerDialog: {
		title: 'Integritetsinställningar',
		description:
			'Anpassa dina integritetsinställningar här. Du kan välja vilka typer av cookies och spårningstekniker du tillåter.',
	},
	consentTypes: {
		necessary: {
			title: 'Absolut nödvändiga',
			description:
				'Dessa cookies är nödvändiga för att webbplatsen ska fungera korrekt och kan inte inaktiveras.',
		},
		functionality: {
			title: 'Funktionalitet',
			description:
				'Dessa cookies möjliggör förbättrad funktionalitet och personalisering av webbplatsen.',
		},
		marketing: {
			title: 'Marknadsföring',
			description:
				'Dessa cookies används för att leverera relevanta annonser och spåra deras effektivitet.',
		},
		measurement: {
			title: 'Analys',
			description:
				'Dessa cookies hjälper oss att förstå hur besökare interagerar med webbplatsen och förbättra dess prestanda.',
		},
		experience: {
			title: 'Upplevelse',
			description:
				'Dessa cookies hjälper oss att ge en bättre användarupplevelse och testa nya funktioner.',
		},
	},
	frame: {
		title: 'Acceptera {category}-samtycke för att visa detta innehåll.',
		actionButton: 'Aktivera {category}-samtycke',
	},
	legalLinks: {
		privacyPolicy: 'Integritetspolicy',
		cookiePolicy: 'Cookiepolicy',
		termsOfService: 'Användarvillkor',
	},
	iab: {
		banner: {
			title: 'Integritetsinställningar',
			description:
				'Vi och våra {partnerCount} partner lagrar och/eller får tillgång till information på din enhet och behandlar personuppgifter, såsom unika identifierare och webbläsardata, för denna webbplats, för att:',
			partnersLink: '{count} partner',
			andMore: 'Och {count} till...',
			legitimateInterestNotice:
				'Vissa partner hävdar ett berättigat intresse för att behandla dina uppgifter. Du har rätt att invända mot denna behandling, anpassa dina val och när som helst återkalla ditt samtycke.',
		},
		preferenceCenter: {
			title: 'Integritetsinställningar',
			description:
				'Anpassa dina integritetsinställningar här. Du kan välja vilka typer av cookies och spårningstekniker du tillåter.',
			tabs: {
				purposes: 'Ändamål',
				vendors: 'Leverantörer',
			},
			purposeItem: {
				partners: '{count} partner',
				vendorsUseLegitimateInterest:
					'{count} leverantörer hävdar berättigat intresse',
				examples: 'Exempel',
				partnersUsingPurpose: 'Partner som använder detta ändamål',
				withYourPermission: 'Med ditt tillstånd',
				legitimateInterest: 'Berättigat intresse',
				objectButton: 'Invänd',
				objected: 'Invänt',
				rightToObject:
					'Du har rätt att invända mot behandling baserad på berättigat intresse.',
			},
			specialPurposes: {
				title: 'Viktiga funktioner (krävs)',
				tooltip:
					'Dessa krävs för webbplatsens funktionalitet och säkerhet. Enligt IAB TCF kan du inte invända mot dessa speciella ändamål.',
			},
			vendorList: {
				search: 'Sök leverantörer...',
				showingCount: '{filtered} av {total} leverantörer',
				iabVendorsHeading: 'IAB-registrerade leverantörer',
				iabVendorsNotice:
					'Dessa partner är registrerade i IAB Transparency & Consent Framework (TCF), en branschstandard för hantering av samtycke',
				customVendorsHeading: 'Anpassade partner',
				customVendorsNotice:
					'Dessa är anpassade partner som inte är registrerade i IAB Transparency & Consent Framework (TCF). De behandlar data baserat på ditt samtycke och kan ha andra integritetspraxis än IAB-registrerade leverantörer.',
				purposes: 'Ändamål',
				specialPurposes: 'Speciella ändamål',
				specialFeatures: 'Speciella funktioner',
				dataCategories: 'Datakategorier',
				usesCookies: 'Använder cookies',
				nonCookieAccess: 'Icke-cookie-åtkomst',
				maxAge: 'Max ålder: {days}d',
				legitimateInterest: 'Berätt. intresse',
				privacyPolicy: 'Integritetspolicy',
				storageDisclosure: 'Lagringsinformation',
				requiredNotice:
					'Krävs för webbplatsens funktionalitet, kan inte inaktiveras',
			},
			footer: {
				consentStorage:
					'Samtyckesinställningar lagras i en cookie med namnet "euconsent-v2" i 13 månader.',
			},
		},
		common: {
			acceptAll: 'Acceptera alla',
			rejectAll: 'Avvisa alla',
			customize: 'Anpassa',
			saveSettings: 'Spara inställningar',
			loading: 'Laddar...',
			showingSelectedVendor: 'Visar vald leverantör',
			clearSelection: 'Rensa',
			customPartner: 'Anpassad partner som inte är registrerad i IAB',
		},
	},
};
export default translations;
