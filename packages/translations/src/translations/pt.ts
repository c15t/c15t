import type { CompleteTranslations } from '../types';
export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Aceitar todos',
		rejectAll: 'Rejeitar todos',
		customize: 'Personalizar',
		save: 'Salvar configurações',
	},
	cookieBanner: {
		title: 'Respeitamos a sua privacidade',
		description:
			'Este site utiliza cookies para melhorar a sua experiência de navegação, analisar o tráfego do site e mostrar conteúdos personalizados.',
	},
	consentManagerDialog: {
		title: 'Configurações',
		description:
			'Personalize suas configurações de privacidade aqui. Você pode escolher quais tipos de cookies e tecnologias de rastreamento você permite.',
	},
	consentTypes: {
		necessary: {
			title: 'Estritamente necessário',
			description:
				'Estes cookies são essenciais para o site funcionar corretamente e não podem ser desativados.',
		},
		functionality: {
			title: 'Funcionalidade',
			description:
				'Estes cookies permitem funcionalidades aprimoradas e personalização do site.',
		},
		marketing: {
			title: 'Marketing',
			description:
				'Estes cookies são utilizados para fornecer publicidade relevante e rastrear a sua eficácia.',
		},
		measurement: {
			title: 'Análise',
			description:
				'Estes cookies nos ajudam a compreender como os visitantes interagem com o site e melhoram o seu desempenho.',
		},
		experience: {
			title: 'Experiência',
			description:
				'Estes cookies nos ajudam a fornecer uma experiência de usuário melhor e testar novas funcionalidades.',
		},
	},
	frame: {
		title: 'Aceite {category} para ver este conteúdo',
		actionButton: 'Ativar consentimento {category}',
	},
	legalLinks: {
		privacyPolicy: 'Política de Privacidade',
		cookiePolicy: 'Política de Cookies',
		termsOfService: 'Termos de Serviço',
	},
	iab: {
		banner: {
			title: 'Configurações de privacidade',
			description:
				'Nós e os nossos {partnerCount} parceiros armazenamos e/ou acedemos a informações num dispositivo e processamos dados pessoais, tais como identificadores únicos e informações de navegação, para este website, para:',
			partnersLink: '{count} parceiros',
			andMore: 'E mais {count}...',
			legitimateInterestNotice:
				'Alguns parceiros alegam um interesse legítimo para processar os seus dados. Tem o direito de se opor a este processamento, personalizar as suas escolhas e retirar o seu consentimento a qualquer momento.',
		},
		preferenceCenter: {
			title: 'Configurações de privacidade',
			description:
				'Personalize suas configurações de privacidade aqui. Você pode escolher quais tipos de cookies e tecnologias de rastreamento você permite.',
			tabs: {
				purposes: 'Finalidades',
				vendors: 'Fornecedores',
			},
			purposeItem: {
				partners: '{count} parceiros',
				vendorsUseLegitimateInterest:
					'{count} fornecedores alegam interesse legítimo',
				examples: 'Exemplos',
				partnersUsingPurpose: 'Parceiros que utilizam esta finalidade',
				withYourPermission: 'Com a sua permissão',
				legitimateInterest: 'Interesse legítimo',
				objectButton: 'Opor-se',
				objected: 'Oposição registada',
				rightToObject:
					'Tem o direito de se opor ao processamento baseado no interesse legítimo.',
			},
			specialPurposes: {
				title: 'Funções essenciais (obrigatórias)',
				tooltip:
					'Estas são necessárias para a funcionalidade e segurança do site. De acordo com o IAB TCF, não pode opor-se a estas finalidades especiais.',
			},
			vendorList: {
				search: 'Procurar fornecedores...',
				showingCount: '{filtered} de {total} fornecedores',
				iabVendorsHeading: 'Fornecedores registados no IAB',
				iabVendorsNotice:
					'Estes parceiros estão registados no IAB Transparency & Consent Framework (TCF), um padrão da indústria para gerir o consentimento',
				customVendorsHeading: 'Parceiros personalizados',
				customVendorsNotice:
					'Estes são parceiros personalizados não registados no IAB Transparency & Consent Framework (TCF). Processam dados com base no seu consentimento e podem ter práticas de privacidade diferentes das dos fornecedores registados no IAB.',
				purposes: 'Finalidades',
				specialPurposes: 'Finalidades especiais',
				specialFeatures: 'Funcionalidades especiais',
				dataCategories: 'Categorias de dados',
				usesCookies: 'Utiliza cookies',
				nonCookieAccess: 'Acesso sem cookies',
				maxAge: 'Idade máx.: {days}d',
				legitimateInterest: 'Int. legítimo',
				privacyPolicy: 'Política de privacidade',
				storageDisclosure: 'Divulgação de armazenamento',
				requiredNotice:
					'Necessário para a funcionalidade do site, não pode ser desativado',
			},
			footer: {
				consentStorage:
					'As preferências de consentimento são armazenadas num cookie chamado "euconsent-v2" durante 13 meses.',
			},
		},
		common: {
			acceptAll: 'Aceitar todos',
			rejectAll: 'Rejeitar todos',
			customize: 'Personalizar',
			saveSettings: 'Salvar configurações',
			loading: 'A carregar...',
			showingSelectedVendor: 'A mostrar o fornecedor selecionado',
			clearSelection: 'Limpar',
			customPartner: 'Parceiro personalizado não registado no IAB',
		},
	},
};
export default translations;
