import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Godta alle',
		close: 'Lukk',
		customize: 'Tilpass',
		rejectAll: 'Avslå alle',
		save: 'Lagre innstillinger',
		securedBy: 'Sikret av',
	},
	consentManagerDialog: {
		description:
			'Tilpass personverninnstillingene dine her. Du kan velge hvilke typer informasjonskapsler og sporingsteknologier du vil tillate.',
		title: 'Personverninnstillinger',
	},
	consentTypes: {
		experience: {
			description:
				'Disse informasjonskapslene hjelper oss med å gi en bedre brukeropplevelse og teste nye funksjoner.',
			title: 'Opplevelse',
		},
		functionality: {
			description:
				'Disse informasjonskapslene muliggjør forbedret funksjonalitet og personalisering av nettstedet.',
			title: 'Funksjonalitet',
		},
		marketing: {
			description:
				'Disse informasjonskapslene brukes til å levere relevante annonser og spore deres effektivitet.',
			title: 'Markedsføring',
		},
		measurement: {
			description:
				'Disse informasjonskapslene hjelper oss med å forstå hvordan besøkende samhandler med nettstedet og forbedre ytelsen.',
			title: 'Analyse',
		},
		necessary: {
			description:
				'Disse informasjonskapslene er essensielle for at nettstedet skal fungere riktig og kan ikke deaktiveres.',
			title: 'Strengt nødvendige',
		},
	},
	cookieBanner: {
		description:
			'Dette nettstedet bruker informasjonskapsler for å forbedre din nettopplevelse, analysere trafikk og vise personlig tilpasset innhold.',
		title: 'Vi verdsetter ditt personvern',
	},
	frame: {
		actionButton: 'Aktiver {category}-samtykke',
		error: 'This content could not be loaded.',
		loading: 'Loading content…',
		policyBlocked:
			"This content is unavailable under your region's consent policy.",
		title: 'Godta {category}-samtykke for å se dette innholdet.',
	},
	iab: {
		banner: {
			andMore: 'Og {count} til...',
			description:
				'Vi og våre {partnerCount} partnere lagrer og/eller har tilgang til informasjon på enheten din og behandler personopplysninger, som unike identifikatorer og nettleserdata, for dette nettstedet, for å:',
			legitimateInterestNotice:
				'Noen partnere krever legitim interesse for å behandle dataene dine. Du har rett til å protestere mot denne behandlingen, tilpasse valgene dine og trekke tilbake samtykket ditt når som helst.',
			partnersLink: '{count} partnere',
			scopeGroup:
				'Valget ditt gjelder på tvers av våre nettsider i denne gruppen.',
			scopeServiceSpecific:
				'Samtykket ditt gjelder bare for dette nettstedet og påvirker ikke andre tjenester.',
			title: 'Personverninnstillinger',
		},
		common: {
			acceptAll: 'Godta alle',
			clearSelection: 'Tøm',
			customPartner: 'Egendefinert partner ikke registrert i IAB',
			customize: 'Tilpass',
			loading: 'Laster...',
			rejectAll: 'Avslå alle',
			saveSettings: 'Lagre innstillinger',
			showingSelectedVendor: 'Viser valgt leverandør',
		},
		preferenceCenter: {
			description:
				'Tilpass personverninnstillingene dine her. Du kan velge hvilke typer informasjonskapsler og sporingsteknologier du vil tillate.',
			footer: {
				consentStorage:
					'Samtykkepreferanser lagres i en informasjonskapsel kalt "euconsent-v2" i 13 måneder. Lagringsperioden kan fornyes når du oppdaterer preferansene dine.',
			},
			purposeItem: {
				examples: 'Eksempler',
				legitimateInterest: 'Legitim interesse',
				objectButton: 'Protester',
				objected: 'Protestert',
				partners: '{count} partnere',
				partnersUsingPurpose: 'Partnere som bruker dette formålet',
				rightToObject:
					'Du har rett til å protestere mot behandling basert på legitim interesse.',
				vendorsUseLegitimateInterest:
					'{count} leverandører krever legitim interesse',
				withYourPermission: 'Med din tillatelse',
			},
			specialPurposes: {
				title: 'Viktige funksjoner (påkrevd)',
				tooltip:
					'Disse er nødvendige for nettstedets funksjonalitet og sikkerhet. I henhold til IAB TCF kan du ikke protestere mot disse spesielle formålene.',
			},
			tabs: {
				purposes: 'Formål',
				vendors: 'Leverandører',
			},
			title: 'Personverninnstillinger',
			vendorList: {
				customVendorsHeading: 'Egendefinerte partnere',
				customVendorsNotice:
					'Dette er egendefinerte partnere som ikke er registrert i IAB Transparency & Consent Framework (TCF). De behandler data basert på ditt samtykke og kan ha annen personvernpraksis enn IAB-registrerte leverandører.',
				dataCategories: 'Datakategorier',
				features: 'Funksjoner',
				iabVendorsHeading: 'IAB-registrerte leverandører',
				iabVendorsNotice:
					'Disse partnerne er registrert i IAB Transparency & Consent Framework (TCF), en bransjestandard for administrasjon av samtykke',
				legitimateInterest: 'Leg. interesse',
				maxAge: 'Maks alder: {days}d',
				nonCookieAccess: 'Ikke-informasjonskapsel-tilgang',
				privacyPolicy: 'Personvernerklæring',
				purposes: 'Formål',
				requiredNotice:
					'Påkrevd for nettstedets funksjonalitet, kan ikke deaktiveres',
				retention: 'Oppbevaring: {days}d',
				search: 'Søk etter leverandører...',
				showingCount: '{filtered} av {total} leverandører',
				specialFeatures: 'Spesielle funksjoner',
				specialPurposes: 'Spesielle formål',
				storageDisclosure: 'Lagringsinformasjon',
				usesCookies: 'Bruker informasjonskapsler',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'Retningslinjer for informasjonskapsler',
		privacyPolicy: 'Personvernerklæring',
		termsOfService: 'Vilkår for bruk',
	},
};
export default translations;
