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
};
export default translations;
