import type { CompleteTranslations } from '../types';
export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Accetta tutto',
		rejectAll: 'Rifiuta tutto',
		customize: 'Personalizza',
		save: 'Salva impostazioni',
	},
	cookieBanner: {
		title: 'Rispettiamo la tua privacy',
		description:
			'Questo sito utilizza cookies per migliorare la tua esperienza di navigazione, analizzare il traffico e mostrare contenuti personalizzati.',
	},
	consentManagerDialog: {
		title: 'Impostazioni di privacy',
		description:
			'Personalizza le tue impostazioni di privacy. Puoi scegliere i tipi di cookies e tecnologie di tracciamento che autorizzi.',
	},
	consentTypes: {
		necessary: {
			title: 'Strettamente necessari',
			description:
				'Questi cookies sono essenziali per il sito web per funzionare correttamente e non possono essere disabilitati.',
		},
		functionality: {
			title: 'Funzionalità',
			description:
				'Questi cookies permettono di migliorare la funzionalità e la personalizzazione del sito web.',
		},
		marketing: {
			title: 'Marketing',
			description:
				'Questi cookies sono utilizzati per fornire pubblicità pertinenti e misurare la loro efficacia.',
		},
		measurement: {
			title: 'Misurazione',
			description:
				'Questi cookies ci aiutano a comprendere come i visitatori interagiscano con il sito web per migliorarne le sue prestazioni.',
		},
		experience: {
			title: 'Esperienza',
			description:
				'Questi cookies ci aiutano a fornire una migliore esperienza utente e per testare nuove funzionalità.',
		},
	},
	frame: {
		title: 'Accetta {category} per visualizzare questo contenuto',
		actionButton: 'Abilita consenso {category}',
	},
	legalLinks: {
		privacyPolicy: 'Informativa sulla Privacy',
		cookiePolicy: 'Politica sui Cookie',
		termsOfService: 'Termini di Servizio',
	},
	iab: {
		banner: {
			title: 'Impostazioni di privacy',
			description:
				'Noi e i nostri {partnerCount} partner archiviamo e/o accediamo a informazioni su un dispositivo e trattiamo dati personali, come identificatori univoci e informazioni di navigazione, per questo sito web, per:',
			partnersLink: '{count} partner',
			andMore: 'E altri {count}...',
			legitimateInterestNotice:
				'Alcuni partner rivendicano un interesse legittimo per trattare i tuoi dati. Hai il diritto di opporti a questo trattamento, personalizzare le tue scelte e revocare il tuo consenso in qualsiasi momento.',
		},
		preferenceCenter: {
			title: 'Impostazioni di privacy',
			description:
				'Personalizza le tue impostazioni di privacy. Puoi scegliere i tipi di cookies e tecnologie di tracciamento che autorizzi.',
			tabs: {
				purposes: 'Finalità',
				vendors: 'Fornitori',
			},
			purposeItem: {
				partners: '{count} partner',
				vendorsUseLegitimateInterest:
					'{count} fornitori rivendicano un interesse legittimo',
				examples: 'Esempi',
				partnersUsingPurpose: 'Partner che utilizzano questa finalità',
				withYourPermission: 'Con la tua autorizzazione',
				legitimateInterest: 'Interesse legittimo',
				objectButton: 'Opponiti',
				objected: 'Opposizione registrata',
				rightToObject:
					'Hai il diritto di opporti al trattamento basato sull’interesse legittimo.',
			},
			specialPurposes: {
				title: 'Funzioni essenziali (obbligatorie)',
				tooltip:
					'Queste sono necessarie per la funzionalità e la sicurezza del sito. Secondo l’IAB TCF, non puoi opporti a queste finalità speciali.',
			},
			vendorList: {
				search: 'Cerca fornitori...',
				showingCount: '{filtered} di {total} fornitori',
				iabVendorsHeading: 'Fornitori registrati IAB',
				iabVendorsNotice:
					'Questi partner sono registrati presso l’IAB Transparency & Consent Framework (TCF), uno standard industriale per la gestione del consenso',
				customVendorsHeading: 'Partner personalizzati',
				customVendorsNotice:
					'Si tratta di partner personalizzati non registrati presso l’IAB Transparency & Consent Framework (TCF). Trattano i dati sulla base del tuo consenso e possono avere pratiche di privacy diverse rispetto ai fornitori registrati IAB.',
				purposes: 'Finalità',
				specialPurposes: 'Finalità speciali',
				specialFeatures: 'Funzionalità speciali',
				dataCategories: 'Categorie di dati',
				usesCookies: 'Utilizza cookie',
				nonCookieAccess: 'Accesso senza cookie',
				maxAge: 'Durata massima: {days}g',
				legitimateInterest: 'Int. legittimo',
				privacyPolicy: 'Informativa sulla privacy',
				storageDisclosure: 'Informativa sull’archiviazione',
				requiredNotice:
					'Richiesto per la funzionalità del sito, non può essere disabilitato',
			},
			footer: {
				consentStorage:
					'Le preferenze di consenso vengono memorizzate in un cookie denominato "euconsent-v2" per 13 mesi.',
			},
		},
		common: {
			acceptAll: 'Accetta tutto',
			rejectAll: 'Rifiuta tutto',
			customize: 'Personalizza',
			saveSettings: 'Salva impostazioni',
			loading: 'Caricamento...',
			showingSelectedVendor: 'Visualizzazione del fornitore selezionato',
			clearSelection: 'Cancella',
			customPartner: 'Partner personalizzato non registrato presso l’IAB',
		},
	},
};
export default translations;
