import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Accetta tutto',
		close: 'Chiudi',
		customize: 'Personalizza',
		rejectAll: 'Rifiuta tutto',
		save: 'Salva impostazioni',
		securedBy: 'Protetto da',
	},
	consentManagerDialog: {
		description:
			'Personalizza le tue impostazioni di privacy. Puoi scegliere i tipi di cookies e tecnologie di tracciamento che autorizzi.',
		title: 'Impostazioni di privacy',
	},
	consentTypes: {
		experience: {
			description:
				'Questi cookies ci aiutano a fornire una migliore esperienza utente e per testare nuove funzionalità.',
			title: 'Esperienza',
		},
		functionality: {
			description:
				'Questi cookies permettono di migliorare la funzionalità e la personalizzazione del sito web.',
			title: 'Funzionalità',
		},
		marketing: {
			description:
				'Questi cookies sono utilizzati per fornire pubblicità pertinenti e misurare la loro efficacia.',
			title: 'Marketing',
		},
		measurement: {
			description:
				'Questi cookies ci aiutano a comprendere come i visitatori interagiscano con il sito web per migliorarne le sue prestazioni.',
			title: 'Misurazione',
		},
		necessary: {
			description:
				'Questi cookies sono essenziali per il sito web per funzionare correttamente e non possono essere disabilitati.',
			title: 'Strettamente necessari',
		},
	},
	cookieBanner: {
		description:
			'Questo sito utilizza cookies per migliorare la tua esperienza di navigazione, analizzare il traffico e mostrare contenuti personalizzati.',
		title: 'Rispettiamo la tua privacy',
	},
	frame: {
		actionButton: 'Abilita consenso {category}',
		error: 'This content could not be loaded.',
		loading: 'Loading content…',
		policyBlocked:
			"This content is unavailable under your region's consent policy.",
		title: 'Accetta {category} per visualizzare questo contenuto',
	},
	iab: {
		banner: {
			andMore: 'E altri {count}...',
			description:
				'Noi e i nostri {partnerCount} partner archiviamo e/o accediamo a informazioni su un dispositivo e trattiamo dati personali, come identificatori univoci e informazioni di navigazione, per questo sito web, per:',
			legitimateInterestNotice:
				'Alcuni partner rivendicano un interesse legittimo per trattare i tuoi dati. Hai il diritto di opporti a questo trattamento, personalizzare le tue scelte e revocare il tuo consenso in qualsiasi momento.',
			partnersLink: '{count} partner',
			scopeGroup:
				'La tua scelta si applica a tutti i nostri siti web di questo gruppo.',
			scopeServiceSpecific:
				'Il tuo consenso si applica solo a questo sito web e non influisce su altri servizi.',
			title: 'Impostazioni di privacy',
		},
		common: {
			acceptAll: 'Accetta tutto',
			clearSelection: 'Cancella',
			customPartner: 'Partner personalizzato non registrato presso l’IAB',
			customize: 'Personalizza',
			loading: 'Caricamento...',
			rejectAll: 'Rifiuta tutto',
			saveSettings: 'Salva impostazioni',
			showingSelectedVendor: 'Visualizzazione del fornitore selezionato',
		},
		preferenceCenter: {
			description:
				'Personalizza le tue impostazioni di privacy. Puoi scegliere i tipi di cookies e tecnologie di tracciamento che autorizzi.',
			footer: {
				consentStorage:
					'Le preferenze di consenso vengono memorizzate in un cookie denominato "euconsent-v2" per 13 mesi. La durata di memorizzazione può essere rinnovata quando aggiorni le tue preferenze.',
			},
			purposeItem: {
				examples: 'Esempi',
				legitimateInterest: 'Interesse legittimo',
				objectButton: 'Opponiti',
				objected: 'Opposizione registrata',
				partners: '{count} partner',
				partnersUsingPurpose: 'Partner che utilizzano questa finalità',
				rightToObject:
					'Hai il diritto di opporti al trattamento basato sull’interesse legittimo.',
				vendorsUseLegitimateInterest:
					'{count} fornitori rivendicano un interesse legittimo',
				withYourPermission: 'Con la tua autorizzazione',
			},
			specialPurposes: {
				title: 'Funzioni essenziali (obbligatorie)',
				tooltip:
					'Queste sono necessarie per la funzionalità e la sicurezza del sito. Secondo l’IAB TCF, non puoi opporti a queste finalità speciali.',
			},
			tabs: {
				purposes: 'Finalità',
				vendors: 'Fornitori',
			},
			title: 'Impostazioni di privacy',
			vendorList: {
				customVendorsHeading: 'Partner personalizzati',
				customVendorsNotice:
					'Si tratta di partner personalizzati non registrati presso l’IAB Transparency & Consent Framework (TCF). Trattano i dati sulla base del tuo consenso e possono avere pratiche di privacy diverse rispetto ai fornitori registrati IAB.',
				dataCategories: 'Categorie di dati',
				features: 'Funzionalità',
				iabVendorsHeading: 'Fornitori registrati IAB',
				iabVendorsNotice:
					'Questi partner sono registrati presso l’IAB Transparency & Consent Framework (TCF), uno standard industriale per la gestione del consenso',
				legitimateInterest: 'Int. legittimo',
				maxAge: 'Durata massima: {days}g',
				nonCookieAccess: 'Accesso senza cookie',
				privacyPolicy: 'Informativa sulla privacy',
				purposes: 'Finalità',
				requiredNotice:
					'Richiesto per la funzionalità del sito, non può essere disabilitato',
				retention: 'Conservazione: {days}g',
				search: 'Cerca fornitori...',
				showingCount: '{filtered} di {total} fornitori',
				specialFeatures: 'Funzionalità speciali',
				specialPurposes: 'Finalità speciali',
				storageDisclosure: 'Informativa sull’archiviazione',
				usesCookies: 'Utilizza cookie',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'Politica sui Cookie',
		privacyPolicy: 'Informativa sulla Privacy',
		termsOfService: 'Termini di Servizio',
	},
};
export default translations;
