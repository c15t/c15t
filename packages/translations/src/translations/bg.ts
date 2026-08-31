import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Приеми всички',
		close: 'Затвори',
		customize: 'Персонализирай',
		rejectAll: 'Отхвърли всички',
		save: 'Запази настройките',
		securedBy: 'Защитено от',
	},
	consentManagerDialog: {
		description:
			'Персонализирайте вашите настройки за поверителност тук. Можете да изберете кои видове бисквитки и технологии за проследяване разрешавате.',
		title: 'Настройки за поверителност',
	},
	consentTypes: {
		experience: {
			description:
				'Тези бисквитки ни помагат да осигурим по-добро потребителско изживяване и да тестваме нови функции.',
			title: 'Потребителско изживяване',
		},
		functionality: {
			description:
				'Тези бисквитки позволяват подобрена функционалност и персонализиране на уебсайта.',
			title: 'Функционалност',
		},
		marketing: {
			description:
				'Тези бисквитки се използват за показване на подходящи реклами и проследяване на тяхната ефективност.',
			title: 'Маркетинг',
		},
		measurement: {
			description:
				'Тези бисквитки ни помагат да разберем как посетителите взаимодействат с уебсайта и да подобрим неговата производителност.',
			title: 'Аналитика',
		},
		necessary: {
			description:
				'Тези бисквитки са от съществено значение за правилното функциониране на уебсайта и не могат да бъдат деактивирани.',
			title: 'Строго необходими',
		},
	},
	cookieBanner: {
		description:
			'Този сайт използва бисквитки, за да подобри вашето потребителско изживяване, да анализира трафика на сайта и да показва персонализирано съдържание.',
		title: 'Ценим вашата поверителност',
	},
	frame: {
		actionButton: 'Активирайте съгласие за {category}',
		error: 'This content could not be loaded.',
		loading: 'Loading content…',
		policyBlocked:
			"This content is unavailable under your region's consent policy.",
		title: 'Приемете съгласие за {category}, за да видите това съдържание.',
	},
	iab: {
		banner: {
			andMore: 'И още {count, plural, one {# партньор} other {# партньора}}...',
			description:
				'Ние и нашите {partnerCount} партньори съхраняваме и/или осъществяваме достъп до информация на вашето устройство и обработваме лични данни, като уникални идентификатори и данни за сърфиране, за този уебсайт, за да:',
			legitimateInterestNotice:
				'Някои партньори претендират за законен интерес да обработват вашите данни. Имате право да възразите срещу тази обработка, да персонализирате вашите избори и да оттеглите съгласието си по всяко време.',
			partnersLink: '{count, plural, one {# партньор} other {# партньора}}',
			scopeGroup:
				'Вашият избор се прилага към всички наши уебсайтове в тази група.',
			scopeServiceSpecific:
				'Вашето съгласие важи само за този уебсайт и няма да повлияе на други услуги.',
			title: 'Настройки за поверителност',
		},
		common: {
			acceptAll: 'Приеми всички',
			clearSelection: 'Изчисти',
			customPartner: 'Персонализиран партньор, нерегистриран в IAB',
			customize: 'Персонализирай',
			loading: 'Зареждане...',
			rejectAll: 'Отхвърли всички',
			saveSettings: 'Запази настройките',
			showingSelectedVendor: 'Показване на избран доставчик',
		},
		preferenceCenter: {
			description:
				'Персонализирайте вашите настройки за поверителност тук. Можете да изберете кои видове бисквитки и технологии за проследяване разрешавате.',
			footer: {
				consentStorage:
					'Предпочитанията за съгласие се съхраняват в бисквитка с име "euconsent-v2" за 13 месеца. Срокът на съхранение може да бъде подновен, когато актуализирате вашите предпочитания.',
			},
			purposeItem: {
				examples: 'Примери',
				legitimateInterest: 'Законен интерес',
				objectButton: 'Възразявам',
				objected: 'Възразено',
				partners: '{count, plural, one {# партньор} other {# партньора}}',
				partnersUsingPurpose: 'Партньори, използващи тази цел',
				rightToObject:
					'Имате право да възразите срещу обработка, базирана на законен интерес.',
				vendorsUseLegitimateInterest:
					'{count, plural, one {# доставчик претендира} other {# доставчика претендират}} за законен интерес',
				withYourPermission: 'С вашето разрешение',
			},
			specialPurposes: {
				title: 'Основни функции (задължителни)',
				tooltip:
					'Те са необходими за функционалността и сигурността на сайта. Съгласно IAB TCF не можете да възразите срещу тези специални цели.',
			},
			tabs: {
				purposes: 'Цели',
				vendors: 'Доставчици',
			},
			title: 'Настройки за поверителност',
			vendorList: {
				customVendorsHeading: 'Персонализирани партньори',
				customVendorsNotice:
					'Това са персонализирани партньори, които не са регистрирани в IAB Transparency & Consent Framework (TCF). Те обработват данни въз основа на вашето съгласие и може да имат различни практики за поверителност от регистрираните в IAB доставчици.',
				dataCategories: 'Категории данни',
				features: 'Функции',
				iabVendorsHeading: 'Регистрирани доставчици в IAB',
				iabVendorsNotice:
					'Тези партньори са регистрирани в IAB Transparency & Consent Framework (TCF), индустриален стандарт за управление на съгласието',
				legitimateInterest: 'Законен интерес',
				maxAge: 'Максимална давност: {days} д',
				nonCookieAccess: 'Достъп без бисквитки',
				privacyPolicy: 'Политика за поверителност',
				purposes: 'Цели',
				requiredNotice:
					'Необходимо за функционалността на сайта, не може да бъде деактивирано',
				retention: 'Съхранение: {days} д',
				search: 'Търсене на доставчици...',
				showingCount:
					'{filtered} от {total, plural, one {# доставчик} other {# доставчика}}',
				specialFeatures: 'Специални функции',
				specialPurposes: 'Специални цели',
				storageDisclosure: 'Декларация за съхранение',
				usesCookies: 'Използва бисквитки',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'Политика за бисквитки',
		privacyPolicy: 'Политика за поверителност',
		termsOfService: 'Общи условия',
	},
};
export default translations;
