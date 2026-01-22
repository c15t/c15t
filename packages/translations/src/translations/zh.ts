import type { CompleteTranslations } from '../types';
export const translations: CompleteTranslations = {
	common: {
		acceptAll: '全部同意',
		rejectAll: '全部拒绝',
		customize: '自定义设置',
		save: '保存设置',
	},
	cookieBanner: {
		title: '我们重视您的隐私',
		description:
			'本网站使用cookies来提升您的浏览体验、分析网站流量并展示个性化内容。',
	},
	consentManagerDialog: {
		title: '隐私设置',
		description:
			'在此自定义您的隐私设置。您可以选择允许哪些类型的cookies和跟踪技术。',
	},
	consentTypes: {
		necessary: {
			title: '严格必要类',
			description: '这些cookies是网站正常运行所必需的，无法被禁用。',
		},
		functionality: {
			title: '功能类',
			description: '这些cookies可增强网站的功能和个性化体验。',
		},
		marketing: {
			title: '营销类',
			description: '这些cookies用于投放相关广告并跟踪广告效果。',
		},
		measurement: {
			title: '分析类',
			description: '这些cookies帮助我们了解访客如何与网站互动并改进其性能。',
		},
		experience: {
			title: '体验类',
			description: '这些cookies帮助我们提供更好的用户体验并测试新功能。',
		},
	},
	frame: {
		title: '接受 {category} 以查看此内容。',
		actionButton: '启用 {category} 同意',
	},
	legalLinks: {
		privacyPolicy: '隐私政策',
		cookiePolicy: 'Cookie政策',
		termsOfService: '服务条款',
	},
	iab: {
		banner: {
			title: '隐私设置',
			description:
				'我们和我们的 {partnerCount} 个合作伙伴在您的设备上存储和/或访问信息，并为此网站处理个人数据（如唯一标识符和浏览数据），以便：',
			partnersLink: '{count} 个合作伙伴',
			andMore: '还有 {count} 个...',
			legitimateInterestNotice:
				'某些合作伙伴声称对处理您的数据具有正当利益。您有权反对这种处理、自定义您的选择并随时撤回您的同意。',
		},
		preferenceCenter: {
			title: '隐私设置',
			description:
				'在此自定义您的隐私设置。您可以选择允许哪些类型的 cookies 和跟踪技术。',
			tabs: {
				purposes: '目的',
				vendors: '供应商',
			},
			purposeItem: {
				partners: '{count} 个合作伙伴',
				vendorsUseLegitimateInterest: '{count} 个供应商声称具有正当利益',
				examples: '示例',
				partnersUsingPurpose: '使用此目的的合作伙伴',
				withYourPermission: '征得您的许可',
				legitimateInterest: '正当利益',
				objectButton: '反对',
				objected: '已反对',
				rightToObject: '您有权反对基于正当利益的处理。',
			},
			specialPurposes: {
				title: '基本功能（必需）',
				tooltip:
					'这些是网站功能和安全所必需的。根据 IAB TCF，您不能反对这些特殊目的。',
			},
			vendorList: {
				search: '搜索供应商...',
				showingCount: '显示 {total} 个供应商中的 {filtered} 个',
				iabVendorsHeading: 'IAB 注册供应商',
				iabVendorsNotice:
					'这些合作伙伴已在 IAB 透明度与同意框架 (TCF) 注册，这是管理同意的行业标准',
				customVendorsHeading: '自定义合作伙伴',
				customVendorsNotice:
					'这些是未在 IAB 透明度与同意框架 (TCF) 注册的自定义合作伙伴。他们根据您的同意处理数据，并且可能具有与 IAB 注册供应商不同的隐私惯例。',
				purposes: '目的',
				specialPurposes: '特殊目的',
				specialFeatures: '特殊功能',
				dataCategories: '数据类别',
				usesCookies: '使用 Cookies',
				nonCookieAccess: '非 Cookie 访问',
				maxAge: '最长期限：{days}天',
				legitimateInterest: '正当利益',
				privacyPolicy: '隐私政策',
				storageDisclosure: '存储披露',
				requiredNotice: '网站功能必需，无法禁用',
			},
			footer: {
				consentStorage:
					'同意偏好存储在名为 "euconsent-v2" 的 cookie 中，有效期为 13 个月。',
			},
		},
		common: {
			acceptAll: '全部同意',
			rejectAll: '全部拒绝',
			customize: '自定义设置',
			saveSettings: '保存设置',
			loading: '加载中...',
			showingSelectedVendor: '显示选定的供应商',
			clearSelection: '清除',
			customPartner: '未在 IAB 注册的自定义合作伙伴',
		},
	},
};
export default translations;
