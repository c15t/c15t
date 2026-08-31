import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Accepter alle',
		close: 'Luk',
		customize: 'Tilpas',
		rejectAll: 'Afvis alle',
		save: 'Gem indstillinger',
		securedBy: 'Sikret af',
	},
	consentManagerDialog: {
		description:
			'Tilpas dine privatlivsindstillinger her. Du kan vælge, hvilke typer cookies og sporingsteknologier du vil tillade.',
		title: 'Privatlivsindstillinger',
	},
	consentTypes: {
		experience: {
			description:
				'Disse cookies hjælper os med at levere en bedre brugeroplevelse og teste nye funktioner.',
			title: 'Oplevelse',
		},
		functionality: {
			description:
				'Disse cookies muliggør forbedret funktionalitet og personalisering af hjemmesiden.',
			title: 'Funktionalitet',
		},
		marketing: {
			description:
				'Disse cookies bruges til at levere relevante annoncer og spore deres effektivitet.',
			title: 'Markedsføring',
		},
		measurement: {
			description:
				'Disse cookies hjælper os med at forstå, hvordan besøgende interagerer med hjemmesiden og forbedre dens ydeevne.',
			title: 'Analyse',
		},
		necessary: {
			description:
				'Disse cookies er essentielle for, at hjemmesiden fungerer korrekt, og de kan ikke deaktiveres.',
			title: 'Strengt nødvendige',
		},
	},
	cookieBanner: {
		description:
			'Denne side bruger cookies til at forbedre din browsingoplevelse, analysere trafikken på siden og vise personligt tilpasset indhold.',
		title: 'Vi værdsætter dit privatliv',
	},
	frame: {
		actionButton: 'Aktivér {category}-samtykke',
		error: 'This content could not be loaded.',
		loading: 'Loading content…',
		policyBlocked:
			"This content is unavailable under your region's consent policy.",
		title: 'Accepter {category}-samtykke for at se dette indhold.',
	},
	iab: {
		banner: {
			andMore: 'Og {count} mere...',
			description:
				"Vi og vores {partnerCount} partnere gemmer og/eller får adgang til oplysninger på din enhed og behandler personoplysninger, såsom unikke id'er og browserdata, for dette website, for at:",
			legitimateInterestNotice:
				'Nogle partnere påberåber sig legitim interesse for at behandle dine data. Du har ret til at gøre indsigelse mod denne behandling, tilpasse dine valg og trække dit samtykke tilbage til enhver tid.',
			partnersLink: '{count} partnere',
			scopeGroup: 'Dit valg gælder på tværs af vores websteder i denne gruppe.',
			scopeServiceSpecific:
				'Dit samtykke gælder kun for dette websted og vil ikke påvirke andre tjenester.',
			title: 'Privatlivsindstillinger',
		},
		common: {
			acceptAll: 'Accepter alle',
			clearSelection: 'Ryd',
			customPartner: 'Tilpasset partner, ikke registreret hos IAB',
			customize: 'Tilpas',
			loading: 'Indlæser...',
			rejectAll: 'Afvis alle',
			saveSettings: 'Gem indstillinger',
			showingSelectedVendor: 'Viser valgt leverandør',
		},
		preferenceCenter: {
			description:
				'Tilpas dine privatlivsindstillinger her. Du kan vælge, hvilke typer cookies og sporingsteknologier du vil tillade.',
			footer: {
				consentStorage:
					'Samtykkepræferencer gemmes i en cookie med navnet "euconsent-v2" i 13 måneder. Opbevaringsperioden kan blive fornyet, når du opdaterer dine præferencer.',
			},
			purposeItem: {
				examples: 'Eksempler',
				legitimateInterest: 'Legitim interesse',
				objectButton: 'Gør indsigelse',
				objected: 'Indsigelse gjort',
				partners: '{count} partnere',
				partnersUsingPurpose: 'Partnere, der bruger dette formål',
				rightToObject:
					'Du har ret til at gøre indsigelse mod behandling baseret på legitim interesse.',
				vendorsUseLegitimateInterest:
					'{count} leverandører påberåber sig legitim interesse',
				withYourPermission: 'Med dit samtykke',
			},
			specialPurposes: {
				title: 'Nødvendige funktioner (påkrævet)',
				tooltip:
					'Disse er nødvendige for sidens funktionalitet og sikkerhed. Ifølge IAB TCF kan du ikke gøre indsigelse mod disse særlige formål.',
			},
			tabs: {
				purposes: 'Formål',
				vendors: 'Leverandører',
			},
			title: 'Privatlivsindstillinger',
			vendorList: {
				customVendorsHeading: 'Brugerdefinerede partnere',
				customVendorsNotice:
					'Disse er tilpassede partnere, som ikke er registreret hos IAB Transparency & Consent Framework (TCF). De behandler data baseret på dit samtykke og kan have andre privatlivspraksisser end IAB-registrerede leverandører.',
				dataCategories: 'Datakategorier',
				features: 'Funktioner',
				iabVendorsHeading: 'IAB-registrerede leverandører',
				iabVendorsNotice:
					'Disse partnere er registreret hos IAB Transparency & Consent Framework (TCF), en branchestandard for håndtering af samtykke',
				legitimateInterest: 'Legitim interesse',
				maxAge: 'Maks. alder: {days}d',
				nonCookieAccess: 'Adgang uden cookies',
				privacyPolicy: 'Privatlivspolitik',
				purposes: 'Formål',
				requiredNotice:
					'Påkrævet for sidens funktionalitet, kan ikke deaktiveres',
				retention: 'Opbevaring: {days}d',
				search: 'Søg leverandører...',
				showingCount: 'Viser {filtered} af {total} leverandører',
				specialFeatures: 'Særlige funktioner',
				specialPurposes: 'Særlige formål',
				storageDisclosure: 'Oplysning om lagring',
				usesCookies: 'Bruger cookies',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'Cookiepolitik',
		privacyPolicy: 'Privatlivspolitik',
		termsOfService: 'Servicevilkår',
	},
};
export default translations;
