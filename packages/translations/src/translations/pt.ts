import type { CompleteTranslations } from '../types';

export const ptTranslations: CompleteTranslations = {
	common: {
		acceptAll: 'Aceitar Tudo',
		rejectAll: 'Rejeitar Tudo',
		customize: 'Personalizar',
		save: 'Salvar Configurações',
	},
	cookieBanner: {
		title: 'Valorizamos sua privacidade',
		description:
			'Este site usa cookies para melhorar sua experiência de navegação, analisar o tráfego do site e mostrar conteúdo personalizado.',
	},
	consentManagerDialog: {
		title: 'Configurações de Privacidade',
		description:
			'Personalize suas configurações de privacidade aqui. Você pode escolher quais tipos de cookies e tecnologias de rastreamento permitir.',
	},
	consentTypes: {
		necessary: {
			title: 'Estritamente Necessários',
			description:
				'Estes cookies são essenciais para o funcionamento adequado do site e não podem ser desabilitados.',
		},
		functionality: {
			title: 'Funcionalidade',
			description:
				'Estes cookies permitem funcionalidade aprimorada e personalização do site.',
		},
		marketing: {
			title: 'Marketing',
			description:
				'Estes cookies são usados para entregar anúncios relevantes e rastrear sua eficácia.',
		},
		measurement: {
			title: 'Análise',
			description:
				'Estes cookies nos ajudam a entender como os visitantes interagem com o site e melhorar seu desempenho.',
		},
		experience: {
			title: 'Experiência',
			description:
				'Estes cookies nos ajudam a fornecer uma melhor experiência do usuário e testar novos recursos.',
		},
	},
	frame: {
		title:
			'Aceite o consentimento de {category} para visualizar este conteúdo.',
		actionButton: 'Habilitar consentimento de {category}',
	},
	legalLinks: {
		privacyPolicy: 'Política de Privacidade',
		cookiePolicy: 'Política de Cookies',
		termsOfService: 'Termos de Serviço',
	},
};
