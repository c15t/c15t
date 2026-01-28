import type { CompleteTranslations } from '../types';
export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Godta alle',
		rejectAll: 'Avvis alle',
		customize: 'Tilpass',
		save: 'Lagre innstillingar',
	},
	cookieBanner: {
		title: 'Vi verdset personvernet ditt',
		description:
			'Denne nettstaden brukar informasjonskapslar for å forbetre nettopplevinga di, analysere nettstadtrafikk og vise personleg tilpassa innhald.',
	},
	consentManagerDialog: {
		title: 'Personverninnstillingar',
		description:
			'Tilpass personverninnstillingane dine her. Du kan velje kva typar informasjonskapslar og sporingsteknologiar du tillèt.',
	},
	consentTypes: {
		necessary: {
			title: 'Strengt nødvendige',
			description:
				'Desse informasjonskapslane er nødvendige for at nettstaden skal fungere riktig og kan ikkje deaktiverast.',
		},
		functionality: {
			title: 'Funksjonalitet',
			description:
				'Desse informasjonskapslane gjer det mogleg med forbetra funksjonalitet og personleggjering av nettstaden.',
		},
		marketing: {
			title: 'Marknadsføring',
			description:
				'Desse informasjonskapslane blir brukte til å levere relevante annonsar og spore effektiviteten deira.',
		},
		measurement: {
			title: 'Analyse',
			description:
				'Desse informasjonskapslane hjelper oss å forstå korleis besøkande samhandlar med nettstaden og forbetre ytinga.',
		},
		experience: {
			title: 'Oppleving',
			description:
				'Desse informasjonskapslane hjelper oss å gi ei betre brukaroppleving og teste nye funksjonar.',
		},
	},
	frame: {
		title: 'Godta {category}-samtykke for å sjå dette innhaldet.',
		actionButton: 'Aktiver {category}-samtykke',
	},
	legalLinks: {
		privacyPolicy: 'Personvernerklæring',
		cookiePolicy: 'Retningslinjer for informasjonskapslar',
		termsOfService: 'Brukarvilkår',
	},
	iab: {
		banner: {
			title: 'Personverninnstillingar',
			description:
				'Vi og våre {partnerCount} partnarar lagrar og/eller har tilgang til informasjon på eininga di og behandlar personopplysningar, som unike identifikatorar og nettlesardata, for denne nettstaden, for å:',
			partnersLink: '{count} partnarar',
			andMore: 'Og {count} til...',
			legitimateInterestNotice:
				'Nokre partnarar krev legitim interesse for å behandle dataa dine. Du har rett til å protestere mot denne behandlinga, tilpasse vala dine og trekkje tilbake samtykket ditt når som helst.',
		},
		preferenceCenter: {
			title: 'Personverninnstillingar',
			description:
				'Tilpass personverninnstillingane dine her. Du kan velje kva typar informasjonskapslar og sporingsteknologiar du tillèt.',
			tabs: {
				purposes: 'Føremål',
				vendors: 'Leverandørar',
			},
			purposeItem: {
				partners: '{count} partnarar',
				vendorsUseLegitimateInterest:
					'{count} leverandørar krev legitim interesse',
				examples: 'Døme',
				partnersUsingPurpose: 'Partnarar som brukar dette føremålet',
				withYourPermission: 'Med di tillating',
				legitimateInterest: 'Legitim interesse',
				objectButton: 'Protester',
				objected: 'Protestert',
				rightToObject:
					'Du har rett til å protestere mot behandling basert på legitim interesse.',
			},
			specialPurposes: {
				title: 'Viktige funksjonar (påkravd)',
				tooltip:
					'Desse er nødvendige for funksjonaliteten og tryggleiken til nettstaden. I følgje IAB TCF kan du ikkje protestere mot desse spesielle føremåla.',
			},
			vendorList: {
				search: 'Søk etter leverandørar...',
				showingCount: '{filtered} av {total} leverandørar',
				iabVendorsHeading: 'IAB-registrerte leverandørar',
				iabVendorsNotice:
					'Disse partnarane er registrerte i IAB Transparency & Consent Framework (TCF), ein bransjestandard for administrasjon av samtykke',
				customVendorsHeading: 'Eigendefinerte partnarar',
				customVendorsNotice:
					'Dette er eigendefinerte partnarar som ikkje er registrerte i IAB Transparency & Consent Framework (TCF). Dei behandlar data basert på ditt samtykke og kan ha annan personvernpraksis enn IAB-registrerte leverandørar.',
				purposes: 'Føremål',
				specialPurposes: 'Spesielle føremål',
				specialFeatures: 'Spesielle funksjonar',
				dataCategories: 'Datakategoriar',
				usesCookies: 'Brukar informasjonskapslar',
				nonCookieAccess: 'Ikkje-informasjonskapsel-tilgang',
				maxAge: 'Maks alder: {days}d',
				legitimateInterest: 'Leg. interesse',
				privacyPolicy: 'Personvernerklæring',
				storageDisclosure: 'Lagringsinformasjon',
				requiredNotice:
					'Påkravd for funksjonaliteten til nettstaden, kan ikkje deaktiverast',
			},
			footer: {
				consentStorage:
					'Samtykkepreferansar blir lagra i ein informasjonskapsel kalla "euconsent-v2" i 13 månader.',
			},
		},
		common: {
			acceptAll: 'Godta alle',
			rejectAll: 'Avvis alle',
			customize: 'Tilpass',
			saveSettings: 'Lagre innstillingar',
			loading: 'Lastar...',
			showingSelectedVendor: 'Viser vald leverandør',
			clearSelection: 'Tøm',
			customPartner: 'Eigendefinert partnar ikkje registrert i IAB',
		},
	},
};
export default translations;
