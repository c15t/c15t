import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Accepter tout',
		close: 'Fermer',
		customize: 'Personnaliser',
		rejectAll: 'Tout rejeter',
		save: 'Enregistrer les paramètres',
		securedBy: 'Sécurisé par',
	},
	consentManagerDialog: {
		description:
			'Personnalisez vos paramètres de confidentialité ici. Vous pouvez choisir les types de cookies et de technologies de suivi que vous autorisez.',
		title: 'Paramètres de confidentialité',
	},
	consentTypes: {
		experience: {
			description:
				'Ces cookies nous permettent de fournir une meilleure expérience utilisateur et de tester de nouvelles fonctionnalités.',
			title: 'Expérience',
		},
		functionality: {
			description:
				"Ces cookies permettent d'améliorer la fonctionnalité et la personnalisation du site web.",
			title: 'Fonctionnalité',
		},
		marketing: {
			description:
				'Ces cookies sont utilisés pour offrir des publicités pertinentes et suivre leur efficacité.',
			title: 'Marketing',
		},
		measurement: {
			description:
				'Ces cookies nous permettent de comprendre comment les visiteurs interagissent avec le site web et améliorent ses performances.',
			title: 'Analyse',
		},
		necessary: {
			description:
				'Ces cookies sont essentiels pour que le site web fonctionne correctement et ne peuvent pas être désactivés.',
			title: 'Strictement nécessaire',
		},
	},
	cookieBanner: {
		description:
			'Ce site utilise des cookies pour améliorer votre expérience de navigation, analyser le trafic du site et afficher du contenu personnalisé.',
		title: 'Nous respectons votre vie privée',
	},
	frame: {
		actionButton: 'Activer le consentement {category}',
		error: 'This content could not be loaded.',
		loading: 'Loading content…',
		policyBlocked:
			"This content is unavailable under your region's consent policy.",
		title: 'Acceptez {category} pour afficher ce contenu.',
	},
	iab: {
		banner: {
			andMore: 'Et {count} de plus...',
			description:
				'Nous et nos {partnerCount} partenaires stockons et/ou accédons à des informations sur votre appareil et traitons des données personnelles, telles que des identifiants uniques et des données de navigation, pour ce site web, afin de :',
			legitimateInterestNotice:
				'Certains partenaires revendiquent un intérêt légitime pour traiter vos données. Vous avez le droit de vous opposer à ce traitement, de personnaliser vos choix et de retirer votre consentement à tout moment.',
			partnersLink: '{count} partenaires',
			scopeGroup: "Votre choix s'applique à tous nos sites web de ce groupe.",
			scopeServiceSpecific:
				"Votre consentement s'applique uniquement à ce site web et n'affecte pas d'autres services.",
			title: 'Paramètres de confidentialité',
		},
		common: {
			acceptAll: 'Accepter tout',
			clearSelection: 'Effacer',
			customPartner: "Partenaire personnalisé non enregistré auprès de l'IAB",
			customize: 'Personnaliser',
			loading: 'Chargement...',
			rejectAll: 'Tout rejeter',
			saveSettings: 'Enregistrer les paramètres',
			showingSelectedVendor: 'Affichage du fournisseur sélectionné',
		},
		preferenceCenter: {
			description:
				'Personnalisez vos paramètres de confidentialité ici. Vous pouvez choisir les types de cookies et de technologies de suivi que vous autorisez.',
			footer: {
				consentStorage:
					'Les préférences de consentement sont stockées dans un cookie nommé « euconsent-v2 » pendant 13 mois. La durée de stockage peut être renouvelée lorsque vous mettez à jour vos préférences.',
			},
			purposeItem: {
				examples: 'Exemples',
				legitimateInterest: 'Intérêt légitime',
				objectButton: "S'opposer",
				objected: 'Opposition enregistrée',
				partners: '{count} partenaires',
				partnersUsingPurpose: 'Partenaires utilisant cette finalité',
				rightToObject:
					"Vous avez le droit de vous opposer au traitement fondé sur l'intérêt légitime.",
				vendorsUseLegitimateInterest:
					'{count} fournisseurs revendiquent un intérêt légitime',
				withYourPermission: 'Avec votre autorisation',
			},
			specialPurposes: {
				title: 'Fonctions essentielles (obligatoires)',
				tooltip:
					"Ces fonctions sont nécessaires au fonctionnement et à la sécurité du site. Conformément au TCF de l'IAB, vous ne pouvez pas vous opposer à ces finalités spéciales.",
			},
			tabs: {
				purposes: 'Finalités',
				vendors: 'Fournisseurs',
			},
			title: 'Paramètres de confidentialité',
			vendorList: {
				customVendorsHeading: 'Partenaires personnalisés',
				customVendorsNotice:
					"Il s'agit de partenaires personnalisés non enregistrés auprès de l'IAB Transparency & Consent Framework (TCF). Ils traitent les données sur la base de votre consentement et peuvent avoir des pratiques de confidentialité différentes de celles des fournisseurs enregistrés auprès de l'IAB.",
				dataCategories: 'Catégories de données',
				features: 'Fonctionnalités',
				iabVendorsHeading: 'Fournisseurs enregistrés IAB',
				iabVendorsNotice:
					"Ces partenaires sont enregistrés auprès du Transparency & Consent Framework (TCF) de l'IAB, une norme industrielle pour la gestion du consentement",
				legitimateInterest: 'Intérêt légitime',
				maxAge: 'Durée max. : {days} j',
				nonCookieAccess: 'Accès sans cookie',
				privacyPolicy: 'Politique de confidentialité',
				purposes: 'Finalités',
				requiredNotice:
					'Requis pour le fonctionnement du site, ne peut pas être désactivé',
				retention: 'Rétention : {days} j',
				search: 'Rechercher des fournisseurs...',
				showingCount: '{filtered} sur {total} fournisseurs',
				specialFeatures: 'Fonctionnalités spéciales',
				specialPurposes: 'Finalités spéciales',
				storageDisclosure: 'Divulgation du stockage',
				usesCookies: 'Utilise des cookies',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'Politique des Cookies',
		privacyPolicy: 'Politique de Confidentialité',
		termsOfService: 'Conditions de Service',
	},
};
export default translations;
