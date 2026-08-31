import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Acceptera alla',
		close: 'Stäng',
		customize: 'Anpassa',
		rejectAll: 'Avvisa alla',
		save: 'Spara inställningar',
		securedBy: 'Skyddad av',
	},
	consentManagerDialog: {
		description:
			'Anpassa dina integritetsinställningar här. Du kan välja vilka typer av cookies och spårningstekniker du tillåter.',
		title: 'Integritetsinställningar',
	},
	consentTypes: {
		experience: {
			description:
				'Dessa cookies hjälper oss att ge en bättre användarupplevelse och testa nya funktioner.',
			title: 'Upplevelse',
		},
		functionality: {
			description:
				'Dessa cookies möjliggör förbättrad funktionalitet och personalisering av webbplatsen.',
			title: 'Funktionalitet',
		},
		marketing: {
			description:
				'Dessa cookies används för att leverera relevanta annonser och spåra deras effektivitet.',
			title: 'Marknadsföring',
		},
		measurement: {
			description:
				'Dessa cookies hjälper oss att förstå hur besökare interagerar med webbplatsen och förbättra dess prestanda.',
			title: 'Analys',
		},
		necessary: {
			description:
				'Dessa cookies är nödvändiga för att webbplatsen ska fungera korrekt och kan inte inaktiveras.',
			title: 'Absolut nödvändiga',
		},
	},
	cookieBanner: {
		description:
			'Den här webbplatsen använder cookies för att förbättra din surfupplevelse, analysera webbplatstrafik och visa personligt anpassat innehåll.',
		title: 'Vi värdesätter din integritet',
	},
	frame: {
		actionButton: 'Aktivera {category}-samtycke',
		error: 'This content could not be loaded.',
		loading: 'Loading content…',
		policyBlocked:
			"This content is unavailable under your region's consent policy.",
		title: 'Acceptera {category}-samtycke för att visa detta innehåll.',
	},
	iab: {
		banner: {
			andMore: 'Och {count} till...',
			description:
				'Vi och våra {partnerCount} partner lagrar och/eller får tillgång till information på din enhet och behandlar personuppgifter, såsom unika identifierare och webbläsardata, för denna webbplats, för att:',
			legitimateInterestNotice:
				'Vissa partner hävdar ett berättigat intresse för att behandla dina uppgifter. Du har rätt att invända mot denna behandling, anpassa dina val och när som helst återkalla ditt samtycke.',
			partnersLink: '{count} partner',
			scopeGroup: 'Ditt val gäller för alla våra webbplatser i denna grupp.',
			scopeServiceSpecific:
				'Ditt samtycke gäller endast för den här webbplatsen och påverkar inte andra tjänster.',
			title: 'Integritetsinställningar',
		},
		common: {
			acceptAll: 'Acceptera alla',
			clearSelection: 'Rensa',
			customPartner: 'Anpassad partner som inte är registrerad i IAB',
			customize: 'Anpassa',
			loading: 'Laddar...',
			rejectAll: 'Avvisa alla',
			saveSettings: 'Spara inställningar',
			showingSelectedVendor: 'Visar vald leverantör',
		},
		preferenceCenter: {
			description:
				'Anpassa dina integritetsinställningar här. Du kan välja vilka typer av cookies och spårningstekniker du tillåter.',
			footer: {
				consentStorage:
					'Samtyckesinställningar lagras i en cookie med namnet "euconsent-v2" i 13 månader. Lagringstiden kan förnyas när du uppdaterar dina inställningar.',
			},
			purposeItem: {
				examples: 'Exempel',
				legitimateInterest: 'Berättigat intresse',
				objectButton: 'Invänd',
				objected: 'Invänt',
				partners: '{count} partner',
				partnersUsingPurpose: 'Partner som använder detta ändamål',
				rightToObject:
					'Du har rätt att invända mot behandling baserad på berättigat intresse.',
				vendorsUseLegitimateInterest:
					'{count} leverantörer hävdar berättigat intresse',
				withYourPermission: 'Med ditt tillstånd',
			},
			specialPurposes: {
				title: 'Viktiga funktioner (krävs)',
				tooltip:
					'Dessa krävs för webbplatsens funktionalitet och säkerhet. Enligt IAB TCF kan du inte invända mot dessa speciella ändamål.',
			},
			tabs: {
				purposes: 'Ändamål',
				vendors: 'Leverantörer',
			},
			title: 'Integritetsinställningar',
			vendorList: {
				customVendorsHeading: 'Anpassade partner',
				customVendorsNotice:
					'Dessa är anpassade partner som inte är registrerade i IAB Transparency & Consent Framework (TCF). De behandlar data baserat på ditt samtycke och kan ha andra integritetspraxis än IAB-registrerade leverantörer.',
				dataCategories: 'Datakategorier',
				features: 'Funktioner',
				iabVendorsHeading: 'IAB-registrerade leverantörer',
				iabVendorsNotice:
					'Dessa partner är registrerade i IAB Transparency & Consent Framework (TCF), en branschstandard för hantering av samtycke',
				legitimateInterest: 'Berätt. intresse',
				maxAge: 'Max ålder: {days}d',
				nonCookieAccess: 'Icke-cookie-åtkomst',
				privacyPolicy: 'Integritetspolicy',
				purposes: 'Ändamål',
				requiredNotice:
					'Krävs för webbplatsens funktionalitet, kan inte inaktiveras',
				retention: 'Lagring: {days}d',
				search: 'Sök leverantörer...',
				showingCount: '{filtered} av {total} leverantörer',
				specialFeatures: 'Speciella funktioner',
				specialPurposes: 'Speciella ändamål',
				storageDisclosure: 'Lagringsinformation',
				usesCookies: 'Använder cookies',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'Cookiepolicy',
		privacyPolicy: 'Integritetspolicy',
		termsOfService: 'Användarvillkor',
	},
};
export default translations;
