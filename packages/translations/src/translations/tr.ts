import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Tümünü Kabul Et',
		acknowledge: 'Tamam',
		close: 'Kapat',
		customize: 'Özelleştir',
		dismiss: 'Gizle',
		rejectAll: 'Tümünü Reddet',
		save: 'Ayarları Kaydet',
		securedBy: 'Güvenlik sağlayıcısı:',
	},
	consentGate: {
		actionButton: '{category} çerezlerine rıza verin',
		error: 'Bu içerik yüklenemedi.',
		loading: 'İçerik yükleniyor…',
		policyBlocked:
			'Bu içerik, bölgenizdeki rıza politikası nedeniyle kullanılamıyor.',
		title: 'Bu içeriği görüntülemek için {category} çerezlerine rıza verin.',
	},
	consentManagerDialog: {
		description:
			'Gizlilik ayarlarınızı buradan özelleştirebilirsiniz. Hangi tür çerezlere ve izleme teknolojilerine izin vereceğinizi seçebilirsiniz.',
		title: 'Gizlilik Ayarları',
		vendors: {
			disabledByCategory: 'Satıcıları seçmek için bu kategoriyi açın.',
			privacyPolicy: 'Gizlilik politikası',
			switchLabel: 'İzin ver: {vendor}',
			title: 'Satıcılar ({count})',
		},
	},
	consentTypes: {
		experience: {
			description:
				'Bu çerezler, daha iyi bir kullanıcı deneyimi sunmamıza ve yeni özellikleri test etmemize yardımcı olur.',
			title: 'Deneyim',
		},
		functionality: {
			description:
				'Bu çerezler, web sitesinde gelişmiş işlevleri ve kişiselleştirmeyi mümkün kılar.',
			title: 'İşlevsellik',
		},
		marketing: {
			description:
				'Bu çerezler, ilgili reklamları göstermek ve bu reklamların etkinliğini ölçmek için kullanılır.',
			title: 'Pazarlama',
		},
		measurement: {
			description:
				'Bu çerezler, ziyaretçilerin web sitesini nasıl kullandığını anlamamıza ve sitenin performansını iyileştirmemize yardımcı olur.',
			title: 'Analiz',
		},
		necessary: {
			description:
				'Bu çerezler, web sitesinin düzgün çalışması için zorunludur ve devre dışı bırakılamaz.',
			title: 'Zorunlu',
		},
	},
	cookieBanner: {
		description:
			'Bu site, gezinme deneyiminizi iyileştirmek, site trafiğini analiz etmek ve kişiselleştirilmiş içerik göstermek için çerezler kullanır.',
		noticeDescription:
			'Bu siteyi çalıştırmak, trafiği ölçmek ve içerikleri ve reklamları kişiselleştirmek için çerezler ve benzeri teknolojiler kullanıyoruz. Dilediğiniz zaman bunları reddedebilir veya tercihlerinizi yönetebilirsiniz.',
		noticeTitle: 'Gizlilik bildirimi',
		title: 'Gizliliğinize önem veriyoruz',
	},
	iab: {
		banner: {
			andMore: 've {count} tane daha...',
			description:
				'Biz ve {partnerCount} iş ortağımız, bu web sitesi için aşağıdaki amaçlarla cihazınızda bilgi depolarız ve/veya bu bilgilere erişiriz, benzersiz tanımlayıcılar ve gezinme verileri gibi kişisel verileri işleriz:',
			legitimateInterestNotice:
				'Bazı iş ortakları, verilerinizi işlemek için meşru menfaatleri olduğunu öne sürmektedir. Bu işlemeye itiraz etme, seçimlerinizi özelleştirme ve rızanızı dilediğiniz zaman geri çekme hakkına sahipsiniz.',
			partnersLink: '{count} iş ortağımız',
			scopeGroup: 'Seçiminiz bu gruptaki tüm web sitelerimiz için geçerlidir.',
			scopeServiceSpecific:
				'Rızanız yalnızca bu web sitesi için geçerlidir ve diğer hizmetleri etkilemez.',
			title: 'Gizlilik Ayarları',
		},
		common: {
			acceptAll: 'Tümünü Kabul Et',
			clearSelection: 'Temizle',
			customPartner: "IAB'ye kayıtlı olmayan özel iş ortağı",
			customize: 'Özelleştir',
			loading: 'Yükleniyor...',
			rejectAll: 'Tümünü Reddet',
			saveSettings: 'Ayarları Kaydet',
			showingSelectedVendor: 'Seçilen satıcı gösteriliyor',
		},
		preferenceCenter: {
			description:
				'Gizlilik ayarlarınızı buradan özelleştirebilirsiniz. Hangi tür çerezlere ve izleme teknolojilerine izin vereceğinizi seçebilirsiniz.',
			features: {
				description:
					'Bu işleme yöntemleri, yalnızca bu bildirimde size seçim hakkı tanınan bir veya birden fazla amaç doğrultusunda kullanılabilir.',
				title: 'Özellikler',
			},
			footer: {
				consentStorage:
					'Rıza tercihleri, "euconsent-v2" adlı bir çerezde 13 ay boyunca saklanır. Tercihlerinizi güncellediğinizde saklama süresi yenilenebilir.',
			},
			purposeItem: {
				examples: 'Örnekler',
				legitimateInterest: 'Meşru Menfaat',
				objectButton: 'İtiraz Et',
				objected: 'İtiraz Edildi',
				partners: '{count} iş ortağı',
				partnersUsingPurpose: 'Bu Amacı Kullanan İş Ortakları',
				rightToObject:
					'Meşru menfaate dayalı işlemeye itiraz etme hakkına sahipsiniz.',
				vendorsUseLegitimateInterest:
					'{count} satıcı meşru menfaat öne sürüyor',
				withYourPermission: 'İzninizle',
			},
			specialPurposes: {
				title: 'Temel İşlevler (Zorunlu)',
				tooltip:
					'Bunlar, sitenin işlevselliği ve güvenliği için gereklidir. IAB TCF uyarınca bu özel amaçlara itiraz edemezsiniz.',
			},
			tabs: {
				purposes: 'Amaçlar',
				vendors: 'Satıcılar',
			},
			title: 'Gizlilik Ayarları',
			vendorList: {
				adTechProvidersHeading: 'Google Reklam Teknolojisi Sağlayıcıları',
				adTechProvidersNotice:
					'Google, bu reklam teknolojisi sağlayıcılarıyla IAB çerçevesinin dışında çalışır. Rızanız bir sağlayıcıya yalnızca o sağlayıcıyı açtığınızda ve ayrıca cihazda depolamaya ve kişiselleştirilmiş reklamlara izin verdiğinizde ulaşır.',
				customVendorsHeading: 'Özel İş Ortakları',
				customVendorsNotice:
					"Bunlar, IAB Şeffaflık ve Rıza Çerçevesi'ne (TCF) kayıtlı olmayan özel iş ortaklarıdır. Verileri rızanıza dayanarak işlerler ve gizlilik uygulamaları IAB'ye kayıtlı satıcılardan farklı olabilir.",
				dataCategories: 'Veri Kategorileri',
				features: 'Özellikler',
				iabVendorsHeading: "IAB'ye Kayıtlı Satıcılar",
				iabVendorsNotice:
					"Bu iş ortakları, rıza yönetimi için bir sektör standardı olan IAB Şeffaflık ve Rıza Çerçevesi'ne (TCF) kayıtlıdır",
				legitimateInterest: 'Meşru Menf.',
				maxAge: 'Maks. süre: {days} gün',
				maxAgeRefreshes: '(yenilenir)',
				noVendorsFound: '"{searchTerm}" ile eşleşen satıcı bulunamadı',
				nonCookieAccess: 'Çerez Dışı Erişim',
				partnerCount: '{count} iş ortağı',
				partnerPlural: 'iş ortağı',
				partnerSingular: 'iş ortağı',
				privacyPolicy: 'Gizlilik Politikası',
				purposes: 'Amaçlar',
				requiredNotice:
					'Sitenin çalışması için gereklidir, devre dışı bırakılamaz',
				retainedDays: 'Saklanan: {days} gün',
				retention: 'Saklama süresi: {days} gün',
				search: 'Satıcı ara...',
				showingCount: 'Satıcılar: {filtered}/{total}',
				specialFeatures: 'Özel Özellikler',
				specialPurposes: 'Özel Amaçlar',
				storageDisclosure: 'Depolama Açıklaması',
				usesCookies: 'Çerez Kullanır',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'Çerez Politikası',
		privacyPolicy: 'Gizlilik Politikası',
		termsOfService: 'Hizmet Şartları',
	},
	rights: {
		optOut: 'Verilerimi satma veya paylaşma',
		preferences: 'Tercihleri yönet',
	},
};

export default translations;
