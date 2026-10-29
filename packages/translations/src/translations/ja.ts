import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'すべて同意する',
		acknowledge: '了解しました',
		close: '閉じる',
		customize: '設定を変更する',
		dismiss: '非表示にする',
		rejectAll: 'すべて拒否する',
		save: '設定を保存する',
		securedBy: 'セキュリティ提供:',
	},
	consentGate: {
		actionButton: '{category}に関する同意を有効にする',
		error: 'このコンテンツを読み込めませんでした。',
		loading: 'コンテンツを読み込んでいます…',
		policyBlocked:
			'お住まいの地域の同意ポリシーにより、このコンテンツはご利用いただけません。',
		title: 'このコンテンツを表示するには、{category}に関する同意が必要です。',
	},
	consentManagerDialog: {
		description:
			'ここでプライバシー設定を変更できます。許可するクッキーやトラッキング技術の種類をお選びください。',
		title: 'プライバシー設定',
		vendors: {
			disabledByCategory:
				'ベンダーを選択するには、このカテゴリを有効にしてください。',
			privacyPolicy: 'プライバシーポリシー',
			switchLabel: '{vendor}を許可する',
			title: 'ベンダー（{count}）',
		},
	},
	consentTypes: {
		experience: {
			description:
				'これらのクッキーは、より良いユーザー体験の提供や新機能のテストに役立ちます。',
			title: 'ユーザー体験',
		},
		functionality: {
			description:
				'これらのクッキーは、ウェブサイトの拡張機能やパーソナライズを可能にします。',
			title: '機能性',
		},
		marketing: {
			description:
				'これらのクッキーは、関連性の高い広告の配信とその効果測定に使用されます。',
			title: 'マーケティング',
		},
		measurement: {
			description:
				'これらのクッキーは、訪問者によるウェブサイトの利用状況を把握し、パフォーマンスを改善するのに役立ちます。',
			title: '分析',
		},
		necessary: {
			description:
				'これらのクッキーはウェブサイトが正常に機能するために不可欠であり、無効にすることはできません。',
			title: '必須',
		},
	},
	cookieBanner: {
		description:
			'当サイトでは、閲覧体験の向上、サイトのトラフィック分析、パーソナライズされたコンテンツの表示のためにクッキーを使用しています。',
		noticeDescription:
			'当サイトでは、サイトの運営、トラフィックの測定、コンテンツや広告のパーソナライズのために、クッキーおよび類似の技術を使用しています。オプトアウトや設定の管理はいつでも行えます。',
		noticeTitle: 'プライバシーに関するお知らせ',
		title: 'お客様のプライバシーを尊重します',
	},
	iab: {
		banner: {
			andMore: 'ほか{count}件...',
			description:
				'当社および{partnerCount}社のパートナーは、このウェブサイトにおいて以下の目的のために、お客様の端末への情報の保存や端末上の情報へのアクセスを行い、固有識別子や閲覧データなどの個人データを処理します：',
			legitimateInterestNotice:
				'一部のパートナーは、お客様のデータを処理することについて正当な利益を主張しています。お客様には、この処理に異議を申し立て、選択内容を変更し、いつでも同意を撤回する権利があります。',
			partnersLink: '{count}社のパートナー',
			scopeGroup:
				'お客様の選択は、このグループに属する当社のすべてのウェブサイトに適用されます。',
			scopeServiceSpecific:
				'お客様の同意はこのウェブサイトにのみ適用され、他のサービスには影響しません。',
			title: 'プライバシー設定',
		},
		common: {
			acceptAll: 'すべて同意する',
			clearSelection: 'クリア',
			customPartner: 'IABに登録されていないカスタムパートナー',
			customize: '設定を変更する',
			loading: '読み込み中...',
			rejectAll: 'すべて拒否する',
			saveSettings: '設定を保存する',
			showingSelectedVendor: '選択したベンダーを表示しています',
		},
		preferenceCenter: {
			description:
				'ここでプライバシー設定を変更できます。許可するクッキーやトラッキング技術の種類をお選びください。',
			features: {
				description:
					'これらの処理方法は、本通知でお客様に選択肢が提示されている1つ以上の目的を達成するためにのみ使用されます。',
				title: '特徴',
			},
			footer: {
				consentStorage:
					'同意の設定は「euconsent-v2」という名前のクッキーに13か月間保存されます。設定を更新すると、保存期間が延長される場合があります。',
			},
			purposeItem: {
				examples: '例',
				legitimateInterest: '正当な利益',
				objectButton: '異議を申し立てる',
				objected: '異議申し立て済み',
				partners: '{count}社のパートナー',
				partnersUsingPurpose: 'この目的を利用するパートナー',
				rightToObject:
					'お客様には、正当な利益に基づく処理に異議を申し立てる権利があります。',
				vendorsUseLegitimateInterest:
					'{count}社のベンダーが正当な利益を主張しています',
				withYourPermission: 'お客様の同意に基づく',
			},
			specialPurposes: {
				title: '基本機能（必須）',
				tooltip:
					'これらはサイトの機能とセキュリティに必要です。IAB TCFにより、これらの特別な目的に異議を申し立てることはできません。',
			},
			tabs: {
				purposes: '目的',
				vendors: 'ベンダー',
			},
			title: 'プライバシー設定',
			vendorList: {
				adTechProvidersHeading: 'Googleの広告技術プロバイダ',
				adTechProvidersNotice:
					'Googleは、IABのフレームワーク外でこれらの広告技術プロバイダと連携しています。お客様の同意がプロバイダに伝わるのは、そのプロバイダを有効にし、かつ端末への保存とパーソナライズ広告の両方を許可した場合のみです。',
				customVendorsHeading: 'カスタムパートナー',
				customVendorsNotice:
					'これらは、IABの透明性と同意に関する枠組み（TCF）に登録されていないカスタムパートナーです。お客様の同意に基づいてデータを処理し、IABに登録されたベンダーとはプライバシーへの取り組みが異なる場合があります。',
				dataCategories: 'データカテゴリ',
				features: '特徴',
				iabVendorsHeading: 'IAB登録ベンダー',
				iabVendorsNotice:
					'これらのパートナーは、同意管理の業界標準であるIABの透明性と同意に関する枠組み（TCF）に登録されています',
				legitimateInterest: '正当な利益',
				maxAge: '最大保存期間：{days}日',
				maxAgeRefreshes: '（更新あり）',
				noVendorsFound:
					'「{searchTerm}」に一致するベンダーは見つかりませんでした',
				nonCookieAccess: 'クッキー以外のアクセス',
				partnerCount: '{count}社のパートナー',
				partnerPlural: '社のパートナー',
				partnerSingular: '社のパートナー',
				privacyPolicy: 'プライバシーポリシー',
				purposes: '目的',
				requiredNotice: 'サイトの機能に必要なため、無効にできません',
				retainedDays: '保存期間：{days}日',
				retention: '保持期間：{days}日',
				search: 'ベンダーを検索...',
				showingCount: '{total}社中{filtered}社のベンダー',
				specialFeatures: '特別な特徴',
				specialPurposes: '特別な目的',
				storageDisclosure: '保存に関する開示',
				usesCookies: 'クッキーを使用',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'クッキーポリシー',
		privacyPolicy: 'プライバシーポリシー',
		termsOfService: '利用規約',
	},
	rights: {
		optOut: '個人データの販売・共有を拒否する',
		preferences: '設定を管理する',
	},
};

export default translations;
