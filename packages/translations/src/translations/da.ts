import type { CompleteTranslations } from '../types';
export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Accepter alle',
		rejectAll: 'Afvis alle',
		customize: 'Tilpas',
		save: 'Gem indstillinger',
	},
	cookieBanner: {
		title: 'Vi værdsætter dit privatliv',
		description:
			'Denne side bruger cookies til at forbedre din browsingoplevelse, analysere trafikken på siden og vise personligt tilpasset indhold.',
	},
	consentManagerDialog: {
		title: 'Privatlivsindstillinger',
		description:
			'Tilpas dine privatlivsindstillinger her. Du kan vælge, hvilke typer cookies og sporingsteknologier du vil tillade.',
	},
	consentTypes: {
		necessary: {
			title: 'Strengt nødvendige',
			description:
				'Disse cookies er essentielle for, at hjemmesiden fungerer korrekt, og de kan ikke deaktiveres.',
		},
		functionality: {
			title: 'Funktionalitet',
			description:
				'Disse cookies muliggør forbedret funktionalitet og personalisering af hjemmesiden.',
		},
		marketing: {
			title: 'Markedsføring',
			description:
				'Disse cookies bruges til at levere relevante annoncer og spore deres effektivitet.',
		},
		measurement: {
			title: 'Analyse',
			description:
				'Disse cookies hjælper os med at forstå, hvordan besøgende interagerer med hjemmesiden og forbedre dens ydeevne.',
		},
		experience: {
			title: 'Oplevelse',
			description:
				'Disse cookies hjælper os med at levere en bedre brugeroplevelse og teste nye funktioner.',
		},
	},
	frame: {
		title: 'Accepter {category}-samtykke for at se dette indhold.',
		actionButton: 'Aktivér {category}-samtykke',
	},
	legalLinks: {
		privacyPolicy: 'Privatlivspolitik',
		cookiePolicy: 'Cookiepolitik',
		termsOfService: 'Servicevilkår',
	},
	iab: {
		banner: {
			title: 'Privatlivsindstillinger',
			description:
				"Vi og vores {partnerCount} partnere gemmer og/eller får adgang til oplysninger på din enhed og behandler personoplysninger, såsom unikke id'er og browserdata, for dette website, for at:",
			partnersLink: '{count} partnere',
			andMore: 'Og {count} mere...',
			legitimateInterestNotice:
				'Nogle partnere påberåber sig legitim interesse for at behandle dine data. Du har ret til at gøre indsigelse mod denne behandling, tilpasse dine valg og trække dit samtykke tilbage til enhver tid.',
		},
		preferenceCenter: {
			title: 'Privatlivsindstillinger',
			description:
				'Tilpas dine privatlivsindstillinger her. Du kan vælge, hvilke typer cookies og sporingsteknologier du vil tillade.',
			tabs: {
				purposes: 'Formål',
				vendors: 'Leverandører',
			},
			purposeItem: {
				partners: '{count} partnere',
				vendorsUseLegitimateInterest:
					'{count} leverandører påberåber sig legitim interesse',
				examples: 'Eksempler',
				partnersUsingPurpose: 'Partnere, der bruger dette formål',
				withYourPermission: 'Med dit samtykke',
				legitimateInterest: 'Legitim interesse',
				objectButton: 'Gør indsigelse',
				objected: 'Indsigelse gjort',
				rightToObject:
					'Du har ret til at gøre indsigelse mod behandling baseret på legitim interesse.',
			},
			specialPurposes: {
				title: 'Nødvendige funktioner (påkrævet)',
				tooltip:
					'Disse er nødvendige for sidens funktionalitet og sikkerhed. Ifølge IAB TCF kan du ikke gøre indsigelse mod disse særlige formål.',
			},
			vendorList: {
				search: 'Søg leverandører...',
				showingCount: 'Viser {filtered} af {total} leverandører',
				iabVendorsHeading: 'IAB-registrerede leverandører',
				iabVendorsNotice:
					'Disse partnere er registreret hos IAB Transparency & Consent Framework (TCF), en branchestandard for håndtering af samtykke',
				customVendorsHeading: 'Brugerdefinerede partnere',
				customVendorsNotice:
					'Disse er tilpassede partnere, som ikke er registreret hos IAB Transparency & Consent Framework (TCF). De behandler data baseret på dit samtykke og kan have andre privatlivspraksisser end IAB-registrerede leverandører.',
				purposes: 'Formål',
				specialPurposes: 'Særlige formål',
				specialFeatures: 'Særlige funktioner',
				dataCategories: 'Datakategorier',
				usesCookies: 'Bruger cookies',
				nonCookieAccess: 'Adgang uden cookies',
				maxAge: 'Maks. alder: {days}d',
				legitimateInterest: 'Legitim interesse',
				privacyPolicy: 'Privatlivspolitik',
				storageDisclosure: 'Oplysning om lagring',
				requiredNotice:
					'Påkrævet for sidens funktionalitet, kan ikke deaktiveres',
			},
			footer: {
				consentStorage:
					'Samtykkepræferencer gemmes i en cookie med navnet "euconsent-v2" i 13 måneder.',
			},
		},
		common: {
			acceptAll: 'Accepter alle',
			rejectAll: 'Afvis alle',
			customize: 'Tilpas',
			saveSettings: 'Gem indstillinger',
			loading: 'Indlæser...',
			showingSelectedVendor: 'Viser valgt leverandør',
			clearSelection: 'Ryd',
			customPartner: 'Tilpasset partner, ikke registreret hos IAB',
		},
	},
};
export default translations;
