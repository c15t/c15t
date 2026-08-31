import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: '全部同意',
		close: '关闭',
		customize: '自定义设置',
		rejectAll: '全部拒绝',
		save: '保存设置',
		securedBy: '安全保障由',
	},
	consentManagerDialog: {
		description:
			'在此自定义您的隐私设置。您可以选择允许哪些类型的cookies和跟踪技术。',
		title: '隐私设置',
	},
	consentTypes: {
		experience: {
			description: '这些cookies帮助我们提供更好的用户体验并测试新功能。',
			title: '体验类',
		},
		functionality: {
			description: '这些cookies可增强网站的功能和个性化体验。',
			title: '功能类',
		},
		marketing: {
			description: '这些cookies用于投放相关广告并跟踪广告效果。',
			title: '营销类',
		},
		measurement: {
			description: '这些cookies帮助我们了解访客如何与网站互动并改进其性能。',
			title: '分析类',
		},
		necessary: {
			description: '这些cookies是网站正常运行所必需的，无法被禁用。',
			title: '严格必要类',
		},
	},
	cookieBanner: {
		description:
			'本网站使用cookies来提升您的浏览体验、分析网站流量并展示个性化内容。',
		title: '我们重视您的隐私',
	},
	frame: {
		actionButton: '启用 {category} 同意',
		error: 'This content could not be loaded.',
		loading: 'Loading content…',
		policyBlocked:
			"This content is unavailable under your region's consent policy.",
		title: '接受 {category} 以查看此内容。',
	},
	iab: {
		banner: {
			andMore: '还有 {count} 个...',
			description:
				'我们和我们的 {partnerCount} 个合作伙伴在您的设备上存储和/或访问信息，并为此网站处理个人数据（如唯一标识符和浏览数据），以便：',
			legitimateInterestNotice:
				'某些合作伙伴声称对处理您的数据具有正当利益。您有权反对这种处理、自定义您的选择并随时撤回您的同意。',
			partnersLink: '{count} 个合作伙伴',
			scopeGroup: '您的选择适用于本组内的所有网站。',
			scopeServiceSpecific: '您的同意仅适用于本网站，不会影响其他服务。',
			title: '隐私设置',
		},
		common: {
			acceptAll: '全部同意',
			clearSelection: '清除',
			customPartner: '未在 IAB 注册的自定义合作伙伴',
			customize: '自定义设置',
			loading: '加载中...',
			rejectAll: '全部拒绝',
			saveSettings: '保存设置',
			showingSelectedVendor: '显示选定的供应商',
		},
		preferenceCenter: {
			description:
				'在此自定义您的隐私设置。您可以选择允许哪些类型的 cookies 和跟踪技术。',
			footer: {
				consentStorage:
					'同意偏好存储在名为 "euconsent-v2" 的 cookie 中，有效期为 13 个月。当您更新同意偏好时，该有效期可能会重新开始计算。',
			},
			purposeItem: {
				examples: '示例',
				legitimateInterest: '正当利益',
				objectButton: '反对',
				objected: '已反对',
				partners: '{count} 个合作伙伴',
				partnersUsingPurpose: '使用此目的的合作伙伴',
				rightToObject: '您有权反对基于正当利益的处理。',
				vendorsUseLegitimateInterest: '{count} 个供应商声称具有正当利益',
				withYourPermission: '征得您的许可',
			},
			specialPurposes: {
				title: '基本功能（必需）',
				tooltip:
					'这些是网站功能和安全所必需的。根据 IAB TCF，您不能反对这些特殊目的。',
			},
			tabs: {
				purposes: '目的',
				vendors: '供应商',
			},
			title: '隐私设置',
			vendorList: {
				customVendorsHeading: '自定义合作伙伴',
				customVendorsNotice:
					'这些是未在 IAB 透明度与同意框架 (TCF) 注册的自定义合作伙伴。他们根据您的同意处理数据，并且可能具有与 IAB 注册供应商不同的隐私惯例。',
				dataCategories: '数据类别',
				features: '功能',
				iabVendorsHeading: 'IAB 注册供应商',
				iabVendorsNotice:
					'这些合作伙伴已在 IAB 透明度与同意框架 (TCF) 注册，这是管理同意的行业标准',
				legitimateInterest: '正当利益',
				maxAge: '最长期限：{days}天',
				nonCookieAccess: '非 Cookie 访问',
				privacyPolicy: '隐私政策',
				purposes: '目的',
				requiredNotice: '网站功能必需，无法禁用',
				retention: '保留期限：{days}天',
				search: '搜索供应商...',
				showingCount: '显示 {total} 个供应商中的 {filtered} 个',
				specialFeatures: '特殊功能',
				specialPurposes: '特殊目的',
				storageDisclosure: '存储披露',
				usesCookies: '使用 Cookies',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'Cookie政策',
		privacyPolicy: '隐私政策',
		termsOfService: '服务条款',
	},
};
export default translations;
