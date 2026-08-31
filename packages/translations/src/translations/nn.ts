import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Godta alle',
		close: 'Lukk',
		customize: 'Tilpass',
		rejectAll: 'Avvis alle',
		save: 'Lagre innstillingar',
		securedBy: 'Sikra av',
	},
	consentManagerDialog: {
		description:
			'Tilpass personverninnstillingane dine her. Du kan velje kva typar informasjonskapslar og sporingsteknologiar du tillèt.',
		title: 'Personverninnstillingar',
	},
	consentTypes: {
		experience: {
			description:
				'Desse informasjonskapslane hjelper oss å gi ei betre brukaroppleving og teste nye funksjonar.',
			title: 'Oppleving',
		},
		functionality: {
			description:
				'Desse informasjonskapslane gjer det mogleg med forbetra funksjonalitet og personleggjering av nettstaden.',
			title: 'Funksjonalitet',
		},
		marketing: {
			description:
				'Desse informasjonskapslane blir brukte til å levere relevante annonsar og spore effektiviteten deira.',
			title: 'Marknadsføring',
		},
		measurement: {
			description:
				'Desse informasjonskapslane hjelper oss å forstå korleis besøkande samhandlar med nettstaden og forbetre ytinga.',
			title: 'Analyse',
		},
		necessary: {
			description:
				'Desse informasjonskapslane er nødvendige for at nettstaden skal fungere riktig og kan ikkje deaktiverast.',
			title: 'Strengt nødvendige',
		},
	},
	cookieBanner: {
		description:
			'Denne nettstaden brukar informasjonskapslar for å forbetre nettopplevinga di, analysere nettstadtrafikk og vise personleg tilpassa innhald.',
		title: 'Vi verdset personvernet ditt',
	},
	frame: {
		actionButton: 'Aktiver {category}-samtykke',
		error: 'This content could not be loaded.',
		loading: 'Loading content…',
		policyBlocked:
			"This content is unavailable under your region's consent policy.",
		title: 'Godta {category}-samtykke for å sjå dette innhaldet.',
	},
	iab: {
		banner: {
			andMore: 'Og {count} til...',
			description:
				'Vi og våre {partnerCount} partnarar lagrar og/eller har tilgang til informasjon på eininga di og behandlar personopplysningar, som unike identifikatorar og nettlesardata, for denne nettstaden, for å:',
			legitimateInterestNotice:
				'Nokre partnarar krev legitim interesse for å behandle dataa dine. Du har rett til å protestere mot denne behandlinga, tilpasse vala dine og trekkje tilbake samtykket ditt når som helst.',
			partnersLink: '{count} partnarar',
			scopeGroup:
				'Valet ditt gjeld på tvers av nettsidene våre i denne gruppa.',
			scopeServiceSpecific:
				'Samtykket ditt gjeld berre for denne nettstaden og påverkar ikkje andre tenester.',
			title: 'Personverninnstillingar',
		},
		common: {
			acceptAll: 'Godta alle',
			clearSelection: 'Tøm',
			customPartner: 'Eigendefinert partnar ikkje registrert i IAB',
			customize: 'Tilpass',
			loading: 'Lastar...',
			rejectAll: 'Avvis alle',
			saveSettings: 'Lagre innstillingar',
			showingSelectedVendor: 'Viser vald leverandør',
		},
		preferenceCenter: {
			description:
				'Tilpass personverninnstillingane dine her. Du kan velje kva typar informasjonskapslar og sporingsteknologiar du tillèt.',
			footer: {
				consentStorage:
					'Samtykkepreferansar blir lagra i ein informasjonskapsel kalla "euconsent-v2" i 13 månader. Lagringstida kan fornyast når du oppdaterer preferansane dine.',
			},
			purposeItem: {
				examples: 'Døme',
				legitimateInterest: 'Legitim interesse',
				objectButton: 'Protester',
				objected: 'Protestert',
				partners: '{count} partnarar',
				partnersUsingPurpose: 'Partnarar som brukar dette føremålet',
				rightToObject:
					'Du har rett til å protestere mot behandling basert på legitim interesse.',
				vendorsUseLegitimateInterest:
					'{count} leverandørar krev legitim interesse',
				withYourPermission: 'Med di tillating',
			},
			specialPurposes: {
				title: 'Viktige funksjonar (påkravd)',
				tooltip:
					'Desse er nødvendige for funksjonaliteten og tryggleiken til nettstaden. I følgje IAB TCF kan du ikkje protestere mot desse spesielle føremåla.',
			},
			tabs: {
				purposes: 'Føremål',
				vendors: 'Leverandørar',
			},
			title: 'Personverninnstillingar',
			vendorList: {
				customVendorsHeading: 'Eigendefinerte partnarar',
				customVendorsNotice:
					'Dette er eigendefinerte partnarar som ikkje er registrerte i IAB Transparency & Consent Framework (TCF). Dei behandlar data basert på ditt samtykke og kan ha annan personvernpraksis enn IAB-registrerte leverandørar.',
				dataCategories: 'Datakategoriar',
				features: 'Funksjonar',
				iabVendorsHeading: 'IAB-registrerte leverandørar',
				iabVendorsNotice:
					'Disse partnarane er registrerte i IAB Transparency & Consent Framework (TCF), ein bransjestandard for administrasjon av samtykke',
				legitimateInterest: 'Leg. interesse',
				maxAge: 'Maks alder: {days}d',
				nonCookieAccess: 'Ikkje-informasjonskapsel-tilgang',
				privacyPolicy: 'Personvernerklæring',
				purposes: 'Føremål',
				requiredNotice:
					'Påkravd for funksjonaliteten til nettstaden, kan ikkje deaktiverast',
				retention: 'Lagring: {days}d',
				search: 'Søk etter leverandørar...',
				showingCount: '{filtered} av {total} leverandørar',
				specialFeatures: 'Spesielle funksjonar',
				specialPurposes: 'Spesielle føremål',
				storageDisclosure: 'Lagringsinformasjon',
				usesCookies: 'Brukar informasjonskapslar',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'Retningslinjer for informasjonskapslar',
		privacyPolicy: 'Personvernerklæring',
		termsOfService: 'Brukarvilkår',
	},
};
export default translations;
