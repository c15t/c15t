import type { CompleteTranslations } from '../types';

export const zhTranslations: CompleteTranslations = {
	common: {
		acceptAll: '全部接受',
		rejectAll: '全部拒绝',
		customize: '自定义',
		save: '保存设置',
	},
	cookieBanner: {
		title: '我们重视您的隐私',
		description:
			'本网站使用Cookie来改善您的浏览体验、分析网站流量并显示个性化内容。',
	},
	consentManagerDialog: {
		title: '隐私设置',
		description:
			'在此自定义您的隐私设置。您可以选择允许哪些类型的Cookie和跟踪技术。',
	},
	consentTypes: {
		necessary: {
			title: '严格必要',
			description: '这些Cookie对网站的正常运行至关重要，无法禁用。',
		},
		functionality: {
			title: '功能性',
			description: '这些Cookie可以增强网站的功能和个性化。',
		},
		marketing: {
			title: '营销',
			description: '这些Cookie用于投放相关广告并跟踪其效果。',
		},
		measurement: {
			title: '分析',
			description: '这些Cookie帮助我们了解访问者如何与网站互动并改善其性能。',
		},
		experience: {
			title: '体验',
			description: '这些Cookie帮助我们提供更好的用户体验并测试新功能。',
		},
	},
	frame: {
		title: '接受{category}同意以查看此内容。',
		actionButton: '启用{category}同意',
	},
	legalLinks: {
		privacyPolicy: '隐私政策',
		cookiePolicy: 'Cookie政策',
		termsOfService: '服务条款',
	},
};
