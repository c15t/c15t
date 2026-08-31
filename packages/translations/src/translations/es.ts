import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Aceptar todo',
		close: 'Cerrar',
		customize: 'Personalizar',
		rejectAll: 'Rechazar todo',
		save: 'Guardar ajustes',
		securedBy: 'Protegido por',
	},
	consentManagerDialog: {
		description:
			'Personaliza tus ajustes de privacidad aquí. Puedes elegir qué tipos de cookies y tecnologías de seguimiento permites.',
		title: 'Configuración de privacidad',
	},
	consentTypes: {
		experience: {
			description:
				'Estas cookies nos ayudan a proporcionar una mejor experiencia de usuario y a probar nuevas funciones.',
			title: 'Experiencia',
		},
		functionality: {
			description:
				'Estas cookies permiten una mejor funcionalidad y personalización del sitio web.',
			title: 'Funcionalidad',
		},
		marketing: {
			description:
				'Estas cookies se utilizan para ofrecer anuncios relevantes y realizar un seguimiento de su eficacia.',
			title: 'Marketing',
		},
		measurement: {
			description:
				'Estas cookies nos ayudan a comprender cómo los visitantes interactúan con el sitio web y a mejorar su rendimiento.',
			title: 'Analítica',
		},
		necessary: {
			description:
				'Estas cookies son esenciales para que el sitio web funcione correctamente y no pueden ser deshabilitadas.',
			title: 'Necesario',
		},
	},
	cookieBanner: {
		description:
			'Este sitio web utiliza cookies para mejorar tu experiencia de navegación, analizar el tráfico del sitio y mostrar contenido personalizado.',
		title: 'Valoramos tu privacidad',
	},
	frame: {
		actionButton: 'Habilitar consentimiento de {category}',
		error: 'This content could not be loaded.',
		loading: 'Loading content…',
		policyBlocked:
			"This content is unavailable under your region's consent policy.",
		title: 'Acepta {category} para ver este contenido.',
	},
	iab: {
		banner: {
			andMore: 'Y {count} más...',
			description:
				'Nosotros y nuestros {partnerCount} socios almacenamos y/o accedemos a información en tu dispositivo y procesamos datos personales, como identificadores únicos y datos de navegación, para este sitio web, con el fin de:',
			legitimateInterestNotice:
				'Algunos socios reclaman un interés legítimo para procesar tus datos. Tienes derecho a oponerte a este procesamiento, personalizar tus opciones y retirar tu consentimiento en cualquier momento.',
			partnersLink: '{count} socios',
			scopeGroup:
				'Su elección se aplica a todos nuestros sitios web de este grupo.',
			scopeServiceSpecific:
				'Tu consentimiento se aplica solo a este sitio web y no afectará a otros servicios.',
			title: 'Configuración de privacidad',
		},
		common: {
			acceptAll: 'Aceptar todo',
			clearSelection: 'Limpiar',
			customPartner: 'Socio personalizado no registrado en IAB',
			customize: 'Personalizar',
			loading: 'Cargando...',
			rejectAll: 'Rechazar todo',
			saveSettings: 'Guardar ajustes',
			showingSelectedVendor: 'Mostrando proveedor seleccionado',
		},
		preferenceCenter: {
			description:
				'Personaliza tus ajustes de privacidad aquí. Puedes elegir qué tipos de cookies y tecnologías de seguimiento permites.',
			footer: {
				consentStorage:
					'Las preferencias de consentimiento se almacenan en una cookie llamada "euconsent-v2" durante 13 meses. La duración del almacenamiento puede renovarse cuando actualices tus preferencias.',
			},
			purposeItem: {
				examples: 'Ejemplos',
				legitimateInterest: 'Interés legítimo',
				objectButton: 'Oponerse',
				objected: 'Opuesto',
				partners: '{count} socios',
				partnersUsingPurpose: 'Socios que utilizan este propósito',
				rightToObject:
					'Tienes derecho a oponerte al procesamiento basado en interés legítimo.',
				vendorsUseLegitimateInterest:
					'{count} proveedores reclaman interés legítimo',
				withYourPermission: 'Con tu permiso',
			},
			specialPurposes: {
				title: 'Funciones esenciales (requeridas)',
				tooltip:
					'Estas son necesarias para la funcionalidad y seguridad del sitio. Según el TCF de IAB, no puedes oponerte a estos propósitos especiales.',
			},
			tabs: {
				purposes: 'Propósitos',
				vendors: 'Proveedores',
			},
			title: 'Configuración de privacidad',
			vendorList: {
				customVendorsHeading: 'Socios personalizados',
				customVendorsNotice:
					'Estos son socios personalizados no registrados en el Marco de Transparencia y Consentimiento de IAB (TCF). Procesan datos basándose en tu consentimiento y pueden tener prácticas de privacidad diferentes a las de los proveedores registrados en IAB.',
				dataCategories: 'Categorías de datos',
				features: 'Características',
				iabVendorsHeading: 'Proveedores registrados en IAB',
				iabVendorsNotice:
					'Estos socios están registrados en el Marco de Transparencia y Consentimiento (TCF) de IAB, un estándar de la industria para gestionar el consentimiento',
				legitimateInterest: 'Interés legítimo',
				maxAge: 'Duración máxima: {days}d',
				nonCookieAccess: 'Acceso sin cookies',
				privacyPolicy: 'Política de privacidad',
				purposes: 'Finalidades',
				requiredNotice:
					'Requerido para la funcionalidad del sitio, no se puede desactivar',
				retention: 'Retención: {days}d',
				search: 'Buscar proveedores...',
				showingCount: '{filtered} de {total} proveedores',
				specialFeatures: 'Características especiales',
				specialPurposes: 'Finalidades especiales',
				storageDisclosure: 'Divulgación de almacenamiento',
				usesCookies: 'Usa cookies',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'Política de Cookies',
		privacyPolicy: 'Política de Privacidad',
		termsOfService: 'Términos de Servicio',
	},
};
export default translations;
