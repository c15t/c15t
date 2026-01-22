import type { CompleteTranslations } from '../types';
export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Godta alle',
		rejectAll: 'Avslå alle',
		customize: 'Tilpass',
		save: 'Lagre innstillinger',
	},
	cookieBanner: {
		title: 'Vi verdsetter ditt personvern',
		description:
			'Dette nettstedet bruker informasjonskapsler for å forbedre din nettopplevelse, analysere trafikk og vise personlig tilpasset innhold.',
	},
	consentManagerDialog: {
		title: 'Personverninnstillinger',
		description:
			'Tilpass personverninnstillingene dine her. Du kan velge hvilke typer informasjonskapsler og sporingsteknologier du vil tillate.',
	},
	consentTypes: {
		necessary: {
			title: 'Strengt nødvendige',
			description:
				'Disse informasjonskapslene er essensielle for at nettstedet skal fungere riktig og kan ikke deaktiveres.',
		},
		functionality: {
			title: 'Funksjonalitet',
			description:
				'Disse informasjonskapslene muliggjør forbedret funksjonalitet og personalisering av nettstedet.',
		},
		marketing: {
			title: 'Markedsføring',
			description:
				'Disse informasjonskapslene brukes til å levere relevante annonser og spore deres effektivitet.',
		},
		measurement: {
			title: 'Analyse',
			description:
				'Disse informasjonskapslene hjelper oss med å forstå hvordan besøkende samhandler med nettstedet og forbedre ytelsen.',
		},
		experience: {
			title: 'Opplevelse',
			description:
				'Disse informasjonskapslene hjelper oss med å gi en bedre brukeropplevelse og teste nye funksjoner.',
		},
	},
	frame: {
		title: 'Godta {category}-samtykke for å se dette innholdet.',
		actionButton: 'Aktiver {category}-samtykke',
	},
	legalLinks: {
		privacyPolicy: 'Personvernerklæring',
		cookiePolicy: 'Retningslinjer for informasjonskapsler',
		termsOfService: 'Vilkår for bruk',
	},
	iab: {
		banner: {
			title: 'Personverninnstillinger',
			description:
				'Vi og våre {partnerCount} partnere lagrer og/eller har tilgang til informasjon på enheten din og behandler personopplysninger, som unike identifikatorer og nettleserdata, for dette nettstedet, for å:',
			partnersLink: '{count} partnere',
			andMore: 'Og {count} til...',
			legitimateInterestNotice:
				'Noen partnere krever legitim interesse for å behandle dataene dine. Du har rett til å protestere mot denne behandlingen, tilpasse valgene dine og trekke tilbake samtykket ditt når som helst.',
		},
		preferenceCenter: {
			title: 'Personverninnstillinger',
			description:
				'Tilpass personverninnstillingene dine her. Du kan velge hvilke typer informasjonskapsler og sporingsteknologier du vil tillate.',
			tabs: {
				purposes: 'Formål',
				vendors: 'Leverandører',
			},
			purposeItem: {
				partners: '{count} partnere',
				vendorsUseLegitimateInterest:
					'{count} leverandører krever legitim interesse',
				examples: 'Eksempler',
				partnersUsingPurpose: 'Partnere som bruker dette formålet',
				withYourPermission: 'Med din tillatelse',
				legitimateInterest: 'Legitim interesse',
				objectButton: 'Protester',
				objected: 'Protestert',
				rightToObject:
					'Du har rett til å protestere mot behandling basert på legitim interesse.',
			},
			specialPurposes: {
				title: 'Viktige funksjoner (påkrevd)',
				tooltip:
					'Disse er nødvendige for nettstedets funksjonalitet og sikkerhet. I henhold til IAB TCF kan du ikke protestere mot disse spesielle formålene.',
			},
			vendorList: {
				search: 'Søk etter leverandører...',
				showingCount: '{filtered} av {total} leverandører',
				iabVendorsHeading: 'IAB-registrerte leverandører',
				iabVendorsNotice:
					'Disse partnerne er registrert i IAB Transparency & Consent Framework (TCF), en bransjestandard for administrasjon av samtykke',
				customVendorsHeading: 'Egendefinerte partnere',
				customVendorsNotice:
					'Dette er egendefinerte partnere som ikke er registrert i IAB Transparency & Consent Framework (TCF). De behandler data basert på ditt samtykke og kan ha annen personvernpraksis enn IAB-registrerte leverandører.',
				purposes: 'Formål',
				specialPurposes: 'Spesielle formål',
				specialFeatures: 'Spesielle funksjoner',
				dataCategories: 'Datakategorier',
				usesCookies: 'Bruker informasjonskapsler',
				nonCookieAccess: 'Ikke-informasjonskapsel-tilgang',
				maxAge: 'Maks alder: {days}d',
				legitimateInterest: 'Leg. interesse',
				privacyPolicy: 'Personvernerklæring',
				storageDisclosure: 'Lagringsinformasjon',
				requiredNotice:
					'Påkrevd for nettstedets funksjonalitet, kan ikke deaktiveres',
			},
			footer: {
				consentStorage:
					'Samtykkepreferanser lagres i en informasjonskapsel kalt "euconsent-v2" i 13 måneder.',
			},
		},
		common: {
			acceptAll: 'Godta alle',
			rejectAll: 'Avslå alle',
			customize: 'Tilpass',
			saveSettings: 'Lagre innstillinger',
			loading: 'Laster...',
			showingSelectedVendor: 'Viser valgt leverandør',
			clearSelection: 'Tøm',
			customPartner: 'Egendefinert partner ikke registrert i IAB',
		},
	},
};
export default translations;
