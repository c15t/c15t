import type { CompleteTranslations } from '../types';

export const frTranslations: CompleteTranslations = {
	common: {
		acceptAll: 'Accepter tout',
		rejectAll: 'Tout rejeter',
		customize: 'Personnaliser',
		save: 'Enregistrer les paramètres',
	},
	cookieBanner: {
		title: 'Nous respectons votre vie privée',
		description:
			'Ce site utilise des cookies pour améliorer votre expérience de navigation, analyser le trafic du site et afficher du contenu personnalisé.',
	},
	consentManagerDialog: {
		title: 'Paramètres de confidentialité',
		description:
			'Personnalisez vos paramètres de confidentialité ici. Vous pouvez choisir les types de cookies et de technologies de suivi que vous autorisez.',
	},
	consentTypes: {
		necessary: {
			title: 'Strictement nécessaire',
			description:
				'Ces cookies sont essentiels pour que le site web fonctionne correctement et ne peuvent pas être désactivés.',
		},
		functionality: {
			title: 'Fonctionnalité',
			description:
				"Ces cookies permettent d'améliorer la fonctionnalité et la personnalisation du site web.",
		},
		marketing: {
			title: 'Marketing',
			description:
				'Ces cookies sont utilisés pour offrir des publicités pertinentes et suivre leur efficacité.',
		},
		measurement: {
			title: 'Analyse',
			description:
				'Ces cookies nous permettent de comprendre comment les visiteurs interagissent avec le site web et améliorent ses performances.',
		},
		experience: {
			title: 'Expérience',
			description:
				'Ces cookies nous permettent de fournir une meilleure expérience utilisateur et de tester de nouvelles fonctionnalités.',
		},
	},
	frame: {
		title: 'Acceptez {category} pour afficher ce contenu.',
		actionButton: 'Activer le consentement {category}',
	},
	legalLinks: {
		privacyPolicy: 'Politique de Confidentialité',
		cookiePolicy: 'Politique des Cookies',
		termsOfService: 'Conditions de Service',
	},
};
