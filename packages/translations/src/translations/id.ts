import type { CompleteTranslations } from '../types';

export const idTranslations: CompleteTranslations = {
	common: {
		acceptAll: 'Terima Semua',
		rejectAll: 'Tolak Semua',
		customize: 'Sesuaikan',
		save: 'Simpan Pengaturan',
	},
	cookieBanner: {
		title: 'Kami menghargai privasi Anda',
		description:
			'Situs ini menggunakan cookie untuk meningkatkan pengalaman penelusuran Anda, menganalisis lalu lintas situs, dan menampilkan konten yang dipersonalisasi.',
	},
	consentManagerDialog: {
		title: 'Pengaturan Privasi',
		description:
			'Atur preferensi privasi Anda di sini. Anda dapat memilih jenis cookie dan teknologi pelacakan yang diizinkan.',
	},
	consentTypes: {
		necessary: {
			title: 'Sangat Diperlukan',
			description:
				'Cookie ini penting agar situs web dapat berfungsi dengan baik dan tidak dapat dinonaktifkan.',
		},
		functionality: {
			title: 'Fungsionalitas',
			description:
				'Cookie ini memungkinkan peningkatan fungsionalitas dan personalisasi situs web.',
		},
		marketing: {
			title: 'Pemasaran',
			description:
				'Cookie ini digunakan untuk menampilkan iklan yang relevan dan melacak efektivitasnya.',
		},
		measurement: {
			title: 'Analitik',
			description:
				'Cookie ini membantu kami memahami bagaimana pengunjung berinteraksi dengan situs web dan meningkatkan kinerjanya.',
		},
		experience: {
			title: 'Pengalaman',
			description:
				'Cookie ini membantu kami memberikan pengalaman pengguna yang lebih baik dan menguji fitur baru.',
		},
	},
	frame: {
		title: 'Setujui {category} untuk melihat konten ini.',
		actionButton: 'Aktifkan persetujuan {category}',
	},
	legalLinks: {
		privacyPolicy: 'Kebijakan Privasi',
		cookiePolicy: 'Kebijakan Cookie',
		termsOfService: 'Syarat Layanan',
	},
};
