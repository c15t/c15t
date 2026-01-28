import type { CompleteTranslations } from '../types';
export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Acceptă toate',
		rejectAll: 'Respinge toate',
		customize: 'Personalizează',
		save: 'Salvează setările',
	},
	cookieBanner: {
		title: 'Prețuim confidențialitatea ta',
		description:
			'Acest site folosește cookie-uri pentru a îmbunătăți experiența de navigare, a analiza traficul site-ului și a afișa conținut personalizat.',
	},
	consentManagerDialog: {
		title: 'Setări de confidențialitate',
		description:
			'Personalizează setările de confidențialitate aici. Poți alege ce tipuri de cookie-uri și tehnologii de urmărire permiți.',
	},
	consentTypes: {
		necessary: {
			title: 'Strict necesare',
			description:
				'Aceste cookie-uri sunt esențiale pentru funcționarea corectă a site-ului și nu pot fi dezactivate.',
		},
		functionality: {
			title: 'Funcționalitate',
			description:
				'Aceste cookie-uri permit funcționalități avansate și personalizarea site-ului.',
		},
		marketing: {
			title: 'Marketing',
			description:
				'Aceste cookie-uri sunt utilizate pentru a livra reclame relevante și pentru a urmări eficiența acestora.',
		},
		measurement: {
			title: 'Analitice',
			description:
				'Aceste cookie-uri ne ajută să înțelegem cum interacționează vizitatorii cu site-ul și să îi îmbunătățim performanța.',
		},
		experience: {
			title: 'Experiență',
			description:
				'Aceste cookie-uri ne ajută să oferim o experiență mai bună utilizatorilor și să testăm funcționalități noi.',
		},
	},
	frame: {
		title:
			'Acceptă consimțământul pentru {category} pentru a vizualiza acest conținut.',
		actionButton: 'Activează consimțământul pentru {category}',
	},
	legalLinks: {
		privacyPolicy: 'Politica de confidențialitate',
		cookiePolicy: 'Politica privind cookie-urile',
		termsOfService: 'Termeni și condiții',
	},
	iab: {
		banner: {
			title: 'Setări de confidențialitate',
			description:
				'Noi și cei {partnerCount} parteneri ai noștri stocăm și/sau accesăm informații pe dispozitivul tău și procesăm date personale, cum ar fi identificatori unici și date de navigare, pentru acest site web, pentru:',
			partnersLink: '{count} parteneri',
			andMore: 'Și încă {count}...',
			legitimateInterestNotice:
				'Unii parteneri invocă un interes legitim pentru a procesa datele tale. Ai dreptul de a te opune acestei procesări, de a-ți personaliza alegerile și de a-ți retrage consimțământul în orice moment.',
		},
		preferenceCenter: {
			title: 'Setări de confidențialitate',
			description:
				'Personalizează setările de confidențialitate aici. Poți alege ce tipuri de cookie-uri și tehnologii de urmărire permiți.',
			tabs: {
				purposes: 'Scopuri',
				vendors: 'Furnizori',
			},
			purposeItem: {
				partners: '{count} parteneri',
				vendorsUseLegitimateInterest:
					'{count} furnizori invocă interes legitim',
				examples: 'Exemple',
				partnersUsingPurpose: 'Parteneri care utilizează acest scop',
				withYourPermission: 'Cu permisiunea ta',
				legitimateInterest: 'Interes legitim',
				objectButton: 'Opunere',
				objected: 'Opoziție exprimată',
				rightToObject:
					'Ai dreptul de a te opune procesării bazate pe interesul legitim.',
			},
			specialPurposes: {
				title: 'Funcții esențiale (obligatorii)',
				tooltip:
					'Acestea sunt necesare pentru funcționalitatea și securitatea site-ului. Conform IAB TCF, nu te poți opune acestor scopuri speciale.',
			},
			vendorList: {
				search: 'Caută furnizori...',
				showingCount: 'Se afișează {filtered} din {total} furnizori',
				iabVendorsHeading: 'Furnizori înregistrați IAB',
				iabVendorsNotice:
					'Acești parteneri sunt înregistrați în cadrul IAB Transparency & Consent Framework (TCF), un standard industrial pentru gestionarea consimțământului',
				customVendorsHeading: 'Parteneri personalizați',
				customVendorsNotice:
					'Aceștia sunt parteneri personalizați care nu sunt înregistrați în IAB Transparency & Consent Framework (TCF). Ei procesează datele pe baza consimțământului tău și pot avea practici de confidențialitate diferite de cele ale furnizorilor înregistrați IAB.',
				purposes: 'Scopuri',
				specialPurposes: 'Scopuri speciale',
				specialFeatures: 'Funcționalități speciale',
				dataCategories: 'Categorii de date',
				usesCookies: 'Utilizează cookie-uri',
				nonCookieAccess: 'Acces non-cookie',
				maxAge: 'Vârstă max.: {days}z',
				legitimateInterest: 'Int. legitim',
				privacyPolicy: 'Politică de confidențialitate',
				storageDisclosure: 'Prezentarea stocării',
				requiredNotice:
					'Necesar pentru funcționalitatea site-ului, nu poate fi dezactivat',
			},
			footer: {
				consentStorage:
					'Preferințele de consimțământ sunt stocate într-un cookie numit „euconsent-v2” timp de 13 luni.',
			},
		},
		common: {
			acceptAll: 'Acceptă toate',
			rejectAll: 'Respinge toate',
			customize: 'Personalizează',
			saveSettings: 'Salvează setările',
			loading: 'Se încarcă...',
			showingSelectedVendor: 'Se afișează furnizorul selectat',
			clearSelection: 'Șterge',
			customPartner: 'Partener personalizat neînregistrat în IAB',
		},
	},
};
export default translations;
