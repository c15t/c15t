import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Aceitar todos',
		close: 'Fechar',
		customize: 'Personalizar',
		rejectAll: 'Rejeitar todos',
		save: 'Salvar configurações',
		securedBy: 'Protegido por',
	},
	consentManagerDialog: {
		description:
			'Personalize suas configurações de privacidade aqui. Você pode escolher quais tipos de cookies e tecnologias de rastreamento você permite.',
		title: 'Configurações',
	},
	consentTypes: {
		experience: {
			description:
				'Estes cookies nos ajudam a fornecer uma experiência de usuário melhor e testar novas funcionalidades.',
			title: 'Experiência',
		},
		functionality: {
			description:
				'Estes cookies permitem funcionalidades aprimoradas e personalização do site.',
			title: 'Funcionalidade',
		},
		marketing: {
			description:
				'Estes cookies são utilizados para fornecer publicidade relevante e rastrear a sua eficácia.',
			title: 'Marketing',
		},
		measurement: {
			description:
				'Estes cookies nos ajudam a compreender como os visitantes interagem com o site e melhoram o seu desempenho.',
			title: 'Análise',
		},
		necessary: {
			description:
				'Estes cookies são essenciais para o site funcionar corretamente e não podem ser desativados.',
			title: 'Estritamente necessário',
		},
	},
	cookieBanner: {
		description:
			'Este site utiliza cookies para melhorar a sua experiência de navegação, analisar o tráfego do site e mostrar conteúdos personalizados.',
		title: 'Respeitamos a sua privacidade',
	},
	frame: {
		actionButton: 'Ativar consentimento {category}',
		error: 'This content could not be loaded.',
		loading: 'Loading content…',
		policyBlocked:
			"This content is unavailable under your region's consent policy.",
		title: 'Aceite {category} para ver este conteúdo',
	},
	iab: {
		banner: {
			andMore: 'E mais {count}...',
			description:
				'Nós e os nossos {partnerCount} parceiros armazenamos e/ou acedemos a informações num dispositivo e processamos dados pessoais, tais como identificadores únicos e informações de navegação, para este website, para:',
			legitimateInterestNotice:
				'Alguns parceiros alegam um interesse legítimo para processar os seus dados. Tem o direito de se opor a este processamento, personalizar as suas escolhas e retirar o seu consentimento a qualquer momento.',
			partnersLink: '{count} parceiros',
			scopeGroup:
				'A sua escolha aplica-se a todos os nossos sites neste grupo.',
			scopeServiceSpecific:
				'O seu consentimento aplica-se apenas a este site e não afetará outros serviços.',
			title: 'Configurações de privacidade',
		},
		common: {
			acceptAll: 'Aceitar todos',
			clearSelection: 'Limpar',
			customPartner: 'Parceiro personalizado não registado no IAB',
			customize: 'Personalizar',
			loading: 'A carregar...',
			rejectAll: 'Rejeitar todos',
			saveSettings: 'Salvar configurações',
			showingSelectedVendor: 'A mostrar o fornecedor selecionado',
		},
		preferenceCenter: {
			description:
				'Personalize suas configurações de privacidade aqui. Você pode escolher quais tipos de cookies e tecnologias de rastreamento você permite.',
			footer: {
				consentStorage:
					'As preferências de consentimento são armazenadas num cookie chamado "euconsent-v2" durante 13 meses. O período de armazenamento pode ser renovado quando atualizar as suas preferências.',
			},
			purposeItem: {
				examples: 'Exemplos',
				legitimateInterest: 'Interesse legítimo',
				objectButton: 'Opor-se',
				objected: 'Oposição registada',
				partners: '{count} parceiros',
				partnersUsingPurpose: 'Parceiros que utilizam esta finalidade',
				rightToObject:
					'Tem o direito de se opor ao processamento baseado no interesse legítimo.',
				vendorsUseLegitimateInterest:
					'{count} fornecedores alegam interesse legítimo',
				withYourPermission: 'Com a sua permissão',
			},
			specialPurposes: {
				title: 'Funções essenciais (obrigatórias)',
				tooltip:
					'Estas são necessárias para a funcionalidade e segurança do site. De acordo com o IAB TCF, não pode opor-se a estas finalidades especiais.',
			},
			tabs: {
				purposes: 'Finalidades',
				vendors: 'Fornecedores',
			},
			title: 'Configurações de privacidade',
			vendorList: {
				customVendorsHeading: 'Parceiros personalizados',
				customVendorsNotice:
					'Estes são parceiros personalizados não registados no IAB Transparency & Consent Framework (TCF). Processam dados com base no seu consentimento e podem ter práticas de privacidade diferentes das dos fornecedores registados no IAB.',
				dataCategories: 'Categorias de dados',
				features: 'Funcionalidades',
				iabVendorsHeading: 'Fornecedores registados no IAB',
				iabVendorsNotice:
					'Estes parceiros estão registados no IAB Transparency & Consent Framework (TCF), um padrão da indústria para gerir o consentimento',
				legitimateInterest: 'Int. legítimo',
				maxAge: 'Idade máx.: {days}d',
				nonCookieAccess: 'Acesso sem cookies',
				privacyPolicy: 'Política de privacidade',
				purposes: 'Finalidades',
				requiredNotice:
					'Necessário para a funcionalidade do site, não pode ser desativado',
				retention: 'Retenção: {days}d',
				search: 'Procurar fornecedores...',
				showingCount: '{filtered} de {total} fornecedores',
				specialFeatures: 'Funcionalidades especiais',
				specialPurposes: 'Finalidades especiais',
				storageDisclosure: 'Divulgação de armazenamento',
				usesCookies: 'Utiliza cookies',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'Política de Cookies',
		privacyPolicy: 'Política de Privacidade',
		termsOfService: 'Termos de Serviço',
	},
};
export default translations;
