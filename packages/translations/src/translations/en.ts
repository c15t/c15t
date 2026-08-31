import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Accept All',
		close: 'Close',
		customize: 'Customize',
		rejectAll: 'Reject All',
		save: 'Save Settings',
		securedBy: 'Secured by',
	},
	consentManagerDialog: {
		description:
			'Customize your privacy settings here. You can choose which types of cookies and tracking technologies you allow.',
		title: 'Privacy Settings',
	},
	consentTypes: {
		experience: {
			description:
				'These cookies help us provide a better user experience and test new features.',
			title: 'Experience',
		},
		functionality: {
			description:
				'These cookies enable enhanced functionality and personalization of the website.',
			title: 'Functionality',
		},
		marketing: {
			description:
				'These cookies are used to deliver relevant advertisements and track their effectiveness.',
			title: 'Marketing',
		},
		measurement: {
			description:
				'These cookies help us understand how visitors interact with the website and improve its performance.',
			title: 'Analytics',
		},
		necessary: {
			description:
				'These cookies are essential for the website to function properly and cannot be disabled.',
			title: 'Strictly Necessary',
		},
	},
	cookieBanner: {
		description:
			'This site uses cookies to improve your browsing experience, analyze site traffic, and show personalized content.',
		title: 'We value your privacy',
	},
	frame: {
		actionButton: 'Enable {category} consent',
		error: 'This content could not be loaded.',
		loading: 'Loading content…',
		policyBlocked:
			"This content is unavailable under your region's consent policy.",
		title: 'Accept {category} consent to view this content.',
	},
	iab: {
		banner: {
			andMore: 'And {count} more...',
			description:
				'We and our {partnerCount} partners store and/or access information on your device and process personal data, such as unique identifiers and browsing data, for this website, to:',
			legitimateInterestNotice:
				'Some partners claim a legitimate interest to process your data. You have the right to object to this processing, customize your choices, and withdraw your consent at any time.',
			partnersLink: '{count} partners',
			scopeGroup: 'Your choice applies across our websites in this group.',
			scopeServiceSpecific:
				'Your consent applies only to this website and will not affect other services.',
			title: 'Privacy Settings',
		},
		common: {
			acceptAll: 'Accept All',
			clearSelection: 'Clear',
			customPartner: 'Custom partner not registered with IAB',
			customize: 'Customize',
			loading: 'Loading...',
			rejectAll: 'Reject All',
			saveSettings: 'Save Settings',
			showingSelectedVendor: 'Showing selected vendor',
		},
		preferenceCenter: {
			description:
				'Customize your privacy settings here. You can choose which types of cookies and tracking technologies you allow.',
			footer: {
				consentStorage:
					'Consent preferences are stored in a cookie named "euconsent-v2" for 13 months. The storage duration may be refreshed when you update your preferences.',
			},
			purposeItem: {
				examples: 'Examples',
				legitimateInterest: 'Legitimate Interest',
				objectButton: 'Object',
				objected: 'Objected',
				partners: '{count} partners',
				partnersUsingPurpose: 'Partners Using This Purpose',
				rightToObject:
					'You have the right to object to processing based on legitimate interest.',
				vendorsUseLegitimateInterest:
					'{count} vendors claim legitimate interest',
				withYourPermission: 'With Your Permission',
			},
			specialPurposes: {
				title: 'Essential Functions (Required)',
				tooltip:
					'These are required for site functionality and security. Per IAB TCF, you cannot object to these special purposes.',
			},
			tabs: {
				purposes: 'Purposes',
				vendors: 'Vendors',
			},
			title: 'Privacy Settings',
			vendorList: {
				customVendorsHeading: 'Custom Partners',
				customVendorsNotice:
					'These are custom partners not registered with IAB Transparency & Consent Framework (TCF). They process data based on your consent and may have different privacy practices than IAB-registered vendors.',
				dataCategories: 'Data Categories',
				features: 'Features',
				iabVendorsHeading: 'IAB Registered Vendors',
				iabVendorsNotice:
					'These partners are registered with the IAB Transparency & Consent Framework (TCF), an industry standard for managing consent',
				legitimateInterest: 'Leg. Interest',
				maxAge: 'Max Age: {days}d',
				maxAgeRefreshes: '(refreshes)',
				noVendorsFound: 'No vendors found matching "{searchTerm}"',
				nonCookieAccess: 'Non-Cookie Access',
				partnerCount: '{count} partners',
				partnerPlural: 'partners',
				partnerSingular: 'partner',
				privacyPolicy: 'Privacy Policy',
				purposes: 'Purposes',
				requiredNotice: 'Required for site functionality, cannot be disabled',
				retainedDays: 'Retained: {days}d',
				retention: 'Retention: {days}d',
				search: 'Search vendors...',
				showingCount: '{filtered} of {total} vendors',
				specialFeatures: 'Special Features',
				specialPurposes: 'Special Purposes',
				storageDisclosure: 'Storage Disclosure',
				usesCookies: 'Uses Cookies',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'Cookie Policy',
		privacyPolicy: 'Privacy Policy',
		termsOfService: 'Terms of Service',
	},
};

export default translations;
