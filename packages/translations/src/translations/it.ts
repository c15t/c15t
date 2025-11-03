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
};
export default translations;
