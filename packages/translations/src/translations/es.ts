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
	iab: {
		banner: {
			title: 'Configuración de privacidad',
			description:
				'Nosotros y nuestros {partnerCount} socios almacenamos y/o accedemos a información en tu dispositivo y procesamos datos personales, como identificadores únicos y datos de navegación, para este sitio web, con el fin de:',
			partnersLink: '{count} socios',
			andMore: 'Y {count} más...',
			legitimateInterestNotice:
				'Algunos socios reclaman un interés legítimo para procesar tus datos. Tienes derecho a oponerte a este procesamiento, personalizar tus opciones y retirar tu consentimiento en cualquier momento.',
		},
		preferenceCenter: {
			title: 'Configuración de privacidad',
			description:
				'Personaliza tus ajustes de privacidad aquí. Puedes elegir qué tipos de cookies y tecnologías de seguimiento permites.',
			tabs: {
				purposes: 'Propósitos',
				vendors: 'Proveedores',
			},
			purposeItem: {
				partners: '{count} socios',
				vendorsUseLegitimateInterest:
					'{count} proveedores reclaman interés legítimo',
				examples: 'Ejemplos',
				partnersUsingPurpose: 'Socios que utilizan este propósito',
				withYourPermission: 'Con tu permiso',
				legitimateInterest: 'Interés legítimo',
				objectButton: 'Oponerse',
				objected: 'Opuesto',
				rightToObject:
					'Tienes derecho a oponerte al procesamiento basado en interés legítimo.',
			},
			specialPurposes: {
				title: 'Funciones esenciales (requeridas)',
				tooltip:
					'Estas son necesarias para la funcionalidad y seguridad del sitio. Según el TCF de IAB, no puedes oponerte a estos propósitos especiales.',
			},
			vendorList: {
				search: 'Buscar proveedores...',
				showingCount: '{filtered} de {total} proveedores',
				iabVendorsHeading: 'Proveedores registrados en IAB',
				iabVendorsNotice:
					'Estos socios están registrados en el Marco de Transparencia y Consentimiento (TCF) de IAB, un estándar de la industria para gestionar el consentimiento',
				customVendorsHeading: 'Socios personalizados',
				customVendorsNotice:
					'Estos son socios personalizados no registrados en el Marco de Transparencia y Consentimiento de IAB (TCF). Procesan datos basándose en tu consentimiento y pueden tener prácticas de privacidad diferentes a las de los proveedores registrados en IAB.',
				purposes: 'Finalidades',
				specialPurposes: 'Finalidades especiales',
				specialFeatures: 'Características especiales',
				dataCategories: 'Categorías de datos',
				usesCookies: 'Usa cookies',
				nonCookieAccess: 'Acceso sin cookies',
				maxAge: 'Duración máxima: {days}d',
				legitimateInterest: 'Interés legítimo',
				privacyPolicy: 'Política de privacidad',
				storageDisclosure: 'Divulgación de almacenamiento',
				requiredNotice:
					'Requerido para la funcionalidad del sitio, no se puede desactivar',
			},
			footer: {
				consentStorage:
					'Las preferencias de consentimiento se almacenan en una cookie llamada "euconsent-v2" durante 13 meses.',
			},
		},
		common: {
			acceptAll: 'Aceptar todo',
			rejectAll: 'Rechazar todo',
			customize: 'Personalizar',
			saveSettings: 'Guardar ajustes',
			loading: 'Cargando...',
			showingSelectedVendor: 'Mostrando proveedor seleccionado',
			clearSelection: 'Limpiar',
			customPartner: 'Socio personalizado no registrado en IAB',
		},
	},
};
export default translations;
