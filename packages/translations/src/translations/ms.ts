import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Terima Semua',
		acknowledge: 'Baiklah',
		close: 'Tutup',
		customize: 'Sesuaikan',
		dismiss: 'Abaikan',
		rejectAll: 'Tolak Semua',
		save: 'Simpan Tetapan',
		securedBy: 'Dilindungi oleh',
	},
	consentGate: {
		actionButton: 'Beri persetujuan untuk {category}',
		error: 'Kandungan ini tidak dapat dimuatkan.',
		loading: 'Memuatkan kandungan…',
		policyBlocked:
			'Kandungan ini tidak tersedia di bawah dasar persetujuan bagi wilayah anda.',
		title: 'Beri persetujuan untuk {category} bagi melihat kandungan ini.',
	},
	consentManagerDialog: {
		description:
			'Sesuaikan tetapan privasi anda di sini. Anda boleh memilih jenis kuki dan teknologi penjejakan yang anda benarkan.',
		title: 'Tetapan Privasi',
		vendors: {
			disabledByCategory: 'Hidupkan kategori ini untuk memilih vendor.',
			privacyPolicy: 'Dasar privasi',
			switchLabel: 'Benarkan {vendor}',
			title: 'Vendor ({count})',
		},
	},
	consentTypes: {
		experience: {
			description:
				'Kuki ini membantu kami menyediakan pengalaman pengguna yang lebih baik dan menguji ciri baharu.',
			title: 'Pengalaman',
		},
		functionality: {
			description:
				'Kuki ini membolehkan fungsi yang dipertingkatkan dan pemperibadian laman web.',
			title: 'Kefungsian',
		},
		marketing: {
			description:
				'Kuki ini digunakan untuk memaparkan iklan yang berkaitan dan menjejaki keberkesanannya.',
			title: 'Pemasaran',
		},
		measurement: {
			description:
				'Kuki ini membantu kami memahami cara pelawat berinteraksi dengan laman web dan meningkatkan prestasinya.',
			title: 'Analitik',
		},
		necessary: {
			description:
				'Kuki ini penting untuk laman web berfungsi dengan betul dan tidak boleh dilumpuhkan.',
			title: 'Sangat Diperlukan',
		},
	},
	cookieBanner: {
		description:
			'Laman ini menggunakan kuki untuk meningkatkan pengalaman pelayaran anda, menganalisis trafik laman dan memaparkan kandungan yang diperibadikan.',
		noticeDescription:
			'Kami menggunakan kuki dan teknologi serupa untuk mengendalikan laman ini, mengukur trafik serta memperibadikan kandungan dan iklan. Anda boleh menarik diri atau mengurus pilihan anda pada bila-bila masa.',
		noticeTitle: 'Notis privasi',
		title: 'Kami menghargai privasi anda',
	},
	iab: {
		banner: {
			andMore: 'Dan {count} lagi...',
			description:
				'Kami dan {partnerCount} rakan kongsi kami menyimpan dan/atau mengakses maklumat pada peranti anda serta memproses data peribadi, seperti pengecam unik dan data pelayaran, untuk laman web ini, bagi tujuan:',
			legitimateInterestNotice:
				'Sesetengah rakan kongsi mendakwa mempunyai kepentingan sah untuk memproses data anda. Anda berhak membantah pemprosesan ini, menyesuaikan pilihan anda dan menarik balik persetujuan anda pada bila-bila masa.',
			partnersLink: '{count} rakan kongsi',
			scopeGroup:
				'Pilihan anda terpakai bagi semua laman web kami dalam kumpulan ini.',
			scopeServiceSpecific:
				'Persetujuan anda hanya terpakai bagi laman web ini dan tidak akan menjejaskan perkhidmatan lain.',
			title: 'Tetapan Privasi',
		},
		common: {
			acceptAll: 'Terima Semua',
			clearSelection: 'Kosongkan',
			customPartner: 'Rakan kongsi tersuai yang tidak berdaftar dengan IAB',
			customize: 'Sesuaikan',
			loading: 'Memuatkan...',
			rejectAll: 'Tolak Semua',
			saveSettings: 'Simpan Tetapan',
			showingSelectedVendor: 'Memaparkan vendor yang dipilih',
		},
		preferenceCenter: {
			description:
				'Sesuaikan tetapan privasi anda di sini. Anda boleh memilih jenis kuki dan teknologi penjejakan yang anda benarkan.',
			features: {
				description:
					'Kaedah pemprosesan ini hanya boleh digunakan bagi mencapai satu atau beberapa tujuan yang anda diberi pilihan dalam notis ini.',
				title: 'Ciri',
			},
			footer: {
				consentStorage:
					'Pilihan persetujuan disimpan dalam kuki bernama "euconsent-v2" selama 13 bulan. Tempoh penyimpanan mungkin dilanjutkan apabila anda mengemas kini pilihan anda.',
			},
			purposeItem: {
				examples: 'Contoh',
				legitimateInterest: 'Kepentingan Sah',
				objectButton: 'Bantah',
				objected: 'Dibantah',
				partners: '{count} rakan kongsi',
				partnersUsingPurpose: 'Rakan Kongsi yang Menggunakan Tujuan Ini',
				rightToObject:
					'Anda berhak membantah pemprosesan berdasarkan kepentingan sah.',
				vendorsUseLegitimateInterest:
					'{count} vendor mendakwa mempunyai kepentingan sah',
				withYourPermission: 'Dengan Kebenaran Anda',
			},
			specialPurposes: {
				title: 'Fungsi Penting (Wajib)',
				tooltip:
					'Ini diperlukan untuk fungsi dan keselamatan laman. Menurut IAB TCF, anda tidak boleh membantah tujuan khas ini.',
			},
			tabs: {
				purposes: 'Tujuan',
				vendors: 'Vendor',
			},
			title: 'Tetapan Privasi',
			vendorList: {
				adTechProvidersHeading: 'Penyedia Teknologi Iklan Google',
				adTechProvidersNotice:
					'Google bekerjasama dengan penyedia teknologi iklan ini di luar rangka kerja IAB. Persetujuan anda hanya sampai kepada penyedia jika anda menghidupkannya dan juga membenarkan storan peranti serta pengiklanan yang diperibadikan.',
				customVendorsHeading: 'Rakan Kongsi Tersuai',
				customVendorsNotice:
					'Ini ialah rakan kongsi tersuai yang tidak berdaftar dengan Rangka Kerja Ketelusan & Persetujuan (TCF) IAB. Mereka memproses data berdasarkan persetujuan anda dan mungkin mempunyai amalan privasi yang berbeza daripada vendor yang berdaftar dengan IAB.',
				dataCategories: 'Kategori Data',
				features: 'Ciri',
				iabVendorsHeading: 'Vendor Berdaftar IAB',
				iabVendorsNotice:
					'Rakan kongsi ini berdaftar dengan Rangka Kerja Ketelusan & Persetujuan (TCF) IAB, iaitu piawaian industri untuk mengurus persetujuan',
				legitimateInterest: 'Kep. Sah',
				maxAge: 'Umur Maksimum: {days} hari',
				maxAgeRefreshes: '(diperbaharui)',
				noVendorsFound: 'Tiada vendor yang sepadan dengan "{searchTerm}"',
				nonCookieAccess: 'Akses Bukan Kuki',
				partnerCount: '{count} rakan kongsi',
				partnerPlural: 'rakan kongsi',
				partnerSingular: 'rakan kongsi',
				privacyPolicy: 'Dasar Privasi',
				purposes: 'Tujuan',
				requiredNotice:
					'Diperlukan untuk fungsi laman, tidak boleh dilumpuhkan',
				retainedDays: 'Disimpan: {days} hari',
				retention: 'Tempoh penyimpanan: {days} hari',
				search: 'Cari vendor...',
				showingCount: '{filtered} daripada {total} vendor',
				specialFeatures: 'Ciri Khas',
				specialPurposes: 'Tujuan Khas',
				storageDisclosure: 'Pendedahan Storan',
				usesCookies: 'Menggunakan Kuki',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'Dasar Kuki',
		privacyPolicy: 'Dasar Privasi',
		termsOfService: 'Terma Perkhidmatan',
	},
	rights: {
		optOut: 'Jangan jual atau kongsi data saya',
		preferences: 'Urus pilihan',
	},
};

export default translations;
