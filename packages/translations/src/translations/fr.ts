import type { CompleteTranslations } from '../types';
export const translations: CompleteTranslations = {
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
	iab: {
		banner: {
			title: 'Paramètres de confidentialité',
			description:
				'Nous et nos {partnerCount} partenaires stockons et/ou accédons à des informations sur votre appareil et traitons des données personnelles, telles que des identifiants uniques et des données de navigation, pour ce site web, afin de :',
			partnersLink: '{count} partenaires',
			andMore: 'Et {count} de plus...',
			legitimateInterestNotice:
				'Certains partenaires revendiquent un intérêt légitime pour traiter vos données. Vous avez le droit de vous opposer à ce traitement, de personnaliser vos choix et de retirer votre consentement à tout moment.',
		},
		preferenceCenter: {
			title: 'Paramètres de confidentialité',
			description:
				'Personnalisez vos paramètres de confidentialité ici. Vous pouvez choisir les types de cookies et de technologies de suivi que vous autorisez.',
			tabs: {
				purposes: 'Finalités',
				vendors: 'Fournisseurs',
			},
			purposeItem: {
				partners: '{count} partenaires',
				vendorsUseLegitimateInterest:
					'{count} fournisseurs revendiquent un intérêt légitime',
				examples: 'Exemples',
				partnersUsingPurpose: 'Partenaires utilisant cette finalité',
				withYourPermission: 'Avec votre autorisation',
				legitimateInterest: 'Intérêt légitime',
				objectButton: "S'opposer",
				objected: 'Opposition enregistrée',
				rightToObject:
					"Vous avez le droit de vous opposer au traitement fondé sur l'intérêt légitime.",
			},
			specialPurposes: {
				title: 'Fonctions essentielles (obligatoires)',
				tooltip:
					"Ces fonctions sont nécessaires au fonctionnement et à la sécurité du site. Conformément au TCF de l'IAB, vous ne pouvez pas vous opposer à ces finalités spéciales.",
			},
			vendorList: {
				search: 'Rechercher des fournisseurs...',
				showingCount: '{filtered} sur {total} fournisseurs',
				iabVendorsHeading: 'Fournisseurs enregistrés IAB',
				iabVendorsNotice:
					"Ces partenaires sont enregistrés auprès du Transparency & Consent Framework (TCF) de l'IAB, une norme industrielle pour la gestion du consentement",
				customVendorsHeading: 'Partenaires personnalisés',
				customVendorsNotice:
					"Il s'agit de partenaires personnalisés non enregistrés auprès de l'IAB Transparency & Consent Framework (TCF). Ils traitent les données sur la base de votre consentement et peuvent avoir des pratiques de confidentialité différentes de celles des fournisseurs enregistrés auprès de l'IAB.",
				purposes: 'Finalités',
				specialPurposes: 'Finalités spéciales',
				specialFeatures: 'Fonctionnalités spéciales',
				dataCategories: 'Catégories de données',
				usesCookies: 'Utilise des cookies',
				nonCookieAccess: 'Accès sans cookie',
				maxAge: 'Durée max. : {days} j',
				legitimateInterest: 'Intérêt légitime',
				privacyPolicy: 'Politique de confidentialité',
				storageDisclosure: 'Divulgation du stockage',
				requiredNotice:
					'Requis pour le fonctionnement du site, ne peut pas être désactivé',
			},
			footer: {
				consentStorage:
					'Les préférences de consentement sont stockées dans un cookie nommé « euconsent-v2 » pendant 13 mois.',
			},
		},
		common: {
			acceptAll: 'Accepter tout',
			rejectAll: 'Tout rejeter',
			customize: 'Personnaliser',
			saveSettings: 'Enregistrer les paramètres',
			loading: 'Chargement...',
			showingSelectedVendor: 'Affichage du fournisseur sélectionné',
			clearSelection: 'Effacer',
			customPartner: "Partenaire personnalisé non enregistré auprès de l'IAB",
		},
	},
};
export default translations;
