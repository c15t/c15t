import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Acceptă toate',
		close: 'Închide',
		customize: 'Personalizează',
		rejectAll: 'Respinge toate',
		save: 'Salvează setările',
		securedBy: 'Securizat de',
	},
	consentManagerDialog: {
		description:
			'Personalizează setările de confidențialitate aici. Poți alege ce tipuri de cookie-uri și tehnologii de urmărire permiți.',
		title: 'Setări de confidențialitate',
	},
	consentTypes: {
		experience: {
			description:
				'Aceste cookie-uri ne ajută să oferim o experiență mai bună utilizatorilor și să testăm funcționalități noi.',
			title: 'Experiență',
		},
		functionality: {
			description:
				'Aceste cookie-uri permit funcționalități avansate și personalizarea site-ului.',
			title: 'Funcționalitate',
		},
		marketing: {
			description:
				'Aceste cookie-uri sunt utilizate pentru a livra reclame relevante și pentru a urmări eficiența acestora.',
			title: 'Marketing',
		},
		measurement: {
			description:
				'Aceste cookie-uri ne ajută să înțelegem cum interacționează vizitatorii cu site-ul și să îi îmbunătățim performanța.',
			title: 'Analitice',
		},
		necessary: {
			description:
				'Aceste cookie-uri sunt esențiale pentru funcționarea corectă a site-ului și nu pot fi dezactivate.',
			title: 'Strict necesare',
		},
	},
	cookieBanner: {
		description:
			'Acest site folosește cookie-uri pentru a îmbunătăți experiența de navigare, a analiza traficul site-ului și a afișa conținut personalizat.',
		title: 'Prețuim confidențialitatea ta',
	},
	frame: {
		actionButton: 'Activează consimțământul pentru {category}',
		error: 'This content could not be loaded.',
		loading: 'Loading content…',
		policyBlocked:
			"This content is unavailable under your region's consent policy.",
		title:
			'Acceptă consimțământul pentru {category} pentru a vizualiza acest conținut.',
	},
	iab: {
		banner: {
			andMore: 'Și încă {count}...',
			description:
				'Noi și cei {partnerCount} parteneri ai noștri stocăm și/sau accesăm informații pe dispozitivul tău și procesăm date personale, cum ar fi identificatori unici și date de navigare, pentru acest site web, pentru:',
			legitimateInterestNotice:
				'Unii parteneri invocă un interes legitim pentru a procesa datele tale. Ai dreptul de a te opune acestei procesări, de a-ți personaliza alegerile și de a-ți retrage consimțământul în orice moment.',
			partnersLink: '{count} parteneri',
			scopeGroup:
				'Alegerea dvs. se aplică tuturor site-urilor noastre din acest grup.',
			scopeServiceSpecific:
				'Consimțământul tău se aplică doar acestui site web și nu va afecta alte servicii.',
			title: 'Setări de confidențialitate',
		},
		common: {
			acceptAll: 'Acceptă toate',
			clearSelection: 'Șterge',
			customPartner: 'Partener personalizat neînregistrat în IAB',
			customize: 'Personalizează',
			loading: 'Se încarcă...',
			rejectAll: 'Respinge toate',
			saveSettings: 'Salvează setările',
			showingSelectedVendor: 'Se afișează furnizorul selectat',
		},
		preferenceCenter: {
			description:
				'Personalizează setările de confidențialitate aici. Poți alege ce tipuri de cookie-uri și tehnologii de urmărire permiți.',
			footer: {
				consentStorage:
					'Preferințele de consimțământ sunt stocate într-un cookie numit „euconsent-v2” timp de 13 luni. Durata de stocare poate fi reînnoită atunci când îți actualizezi preferințele.',
			},
			purposeItem: {
				examples: 'Exemple',
				legitimateInterest: 'Interes legitim',
				objectButton: 'Opunere',
				objected: 'Opoziție exprimată',
				partners: '{count} parteneri',
				partnersUsingPurpose: 'Parteneri care utilizează acest scop',
				rightToObject:
					'Ai dreptul de a te opune procesării bazate pe interesul legitim.',
				vendorsUseLegitimateInterest:
					'{count} furnizori invocă interes legitim',
				withYourPermission: 'Cu permisiunea ta',
			},
			specialPurposes: {
				title: 'Funcții esențiale (obligatorii)',
				tooltip:
					'Acestea sunt necesare pentru funcționalitatea și securitatea site-ului. Conform IAB TCF, nu te poți opune acestor scopuri speciale.',
			},
			tabs: {
				purposes: 'Scopuri',
				vendors: 'Furnizori',
			},
			title: 'Setări de confidențialitate',
			vendorList: {
				customVendorsHeading: 'Parteneri personalizați',
				customVendorsNotice:
					'Aceștia sunt parteneri personalizați care nu sunt înregistrați în IAB Transparency & Consent Framework (TCF). Ei procesează datele pe baza consimțământului tău și pot avea practici de confidențialitate diferite de cele ale furnizorilor înregistrați IAB.',
				dataCategories: 'Categorii de date',
				features: 'Funcționalități',
				iabVendorsHeading: 'Furnizori înregistrați IAB',
				iabVendorsNotice:
					'Acești parteneri sunt înregistrați în cadrul IAB Transparency & Consent Framework (TCF), un standard industrial pentru gestionarea consimțământului',
				legitimateInterest: 'Int. legitim',
				maxAge: 'Vârstă max.: {days}z',
				nonCookieAccess: 'Acces non-cookie',
				privacyPolicy: 'Politică de confidențialitate',
				purposes: 'Scopuri',
				requiredNotice:
					'Necesar pentru funcționalitatea site-ului, nu poate fi dezactivat',
				retention: 'Retenție: {days}z',
				search: 'Caută furnizori...',
				showingCount: 'Se afișează {filtered} din {total} furnizori',
				specialFeatures: 'Funcționalități speciale',
				specialPurposes: 'Scopuri speciale',
				storageDisclosure: 'Prezentarea stocării',
				usesCookies: 'Utilizează cookie-uri',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'Politica privind cookie-urile',
		privacyPolicy: 'Politica de confidențialitate',
		termsOfService: 'Termeni și condiții',
	},
};
export default translations;
