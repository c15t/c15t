import type { CompleteTranslations } from '../types';

export const zhTranslations: CompleteTranslations = {
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
};
