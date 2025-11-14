import type { CompleteTranslations } from '../types';
export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Aceptar todo',
		rejectAll: 'Rechazar todo',
		customize: 'Personalizar',
		save: 'Guardar ajustes',
	},
	cookieBanner: {
		title: 'Valoramos tu privacidad',
		description:
			'Este sitio web utiliza cookies para mejorar tu experiencia de navegación, analizar el tráfico del sitio y mostrar contenido personalizado.',
	},
	consentManagerDialog: {
		title: 'Configuración de privacidad',
		description:
			'Personaliza tus ajustes de privacidad aquí. Puedes elegir qué tipos de cookies y tecnologías de seguimiento permites.',
	},
	consentTypes: {
		necessary: {
			title: 'Necesario',
			description:
				'Estas cookies son esenciales para que el sitio web funcione correctamente y no pueden ser deshabilitadas.',
		},
		functionality: {
			title: 'Funcionalidad',
			description:
				'Estas cookies permiten una mejor funcionalidad y personalización del sitio web.',
		},
		marketing: {
			title: 'Marketing',
			description:
				'Estas cookies se utilizan para ofrecer anuncios relevantes y realizar un seguimiento de su eficacia.',
		},
		measurement: {
			title: 'Analítica',
			description:
				'Estas cookies nos ayudan a comprender cómo los visitantes interactúan con el sitio web y a mejorar su rendimiento.',
		},
		experience: {
			title: 'Experiencia',
			description:
				'Estas cookies nos ayudan a proporcionar una mejor experiencia de usuario y a probar nuevas funciones.',
		},
	},
	frame: {
		title: 'Acepta {category} para ver este contenido.',
		actionButton: 'Habilitar consentimiento de {category}',
	},
	legalLinks: {
		privacyPolicy: 'Política de Privacidad',
		cookiePolicy: 'Política de Cookies',
		termsOfService: 'Términos de Servicio',
	},
};
export default translations;
