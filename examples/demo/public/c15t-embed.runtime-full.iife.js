'use strict';
var c15tEmbedBundle = (() => {
	var Yn = Object.defineProperty;
	var Hm = Object.getOwnPropertyDescriptor;
	var zm = Object.getOwnPropertyNames;
	var Gm = Object.prototype.hasOwnProperty;
	var $m = (e, t, o) =>
		t in e
			? Yn(e, t, { enumerable: !0, configurable: !0, writable: !0, value: o })
			: (e[t] = o);
	var N = (e, t) => () => (e && (t = e((e = 0))), t);
	var fo = (e, t) => {
			for (var o in t) Yn(e, o, { get: t[o], enumerable: !0 });
		},
		Wm = (e, t, o, n) => {
			if ((t && typeof t == 'object') || typeof t == 'function')
				for (let r of zm(t))
					!Gm.call(e, r) &&
						r !== o &&
						Yn(e, r, {
							get: () => t[r],
							enumerable: !(n = Hm(t, r)) || n.enumerable,
						});
			return e;
		};
	var qm = (e) => Wm(Yn({}, '__esModule', { value: !0 }), e);
	var k = (e, t, o) => $m(e, typeof t != 'symbol' ? t + '' : t, o);
	function uc(e) {
		return !(!e || typeof e != 'object' || Array.isArray(e));
	}
	function pc(e, t) {
		if (!e && !t) return {};
		let o = {};
		if (e) for (let n of Object.keys(e)) o[n] = e[n];
		if (!t) return o;
		for (let n of Object.keys(t)) {
			let r = t[n];
			if (r === void 0) continue;
			let s = e ? e[n] : void 0;
			uc(s) && uc(r) ? (o[n] = pc(s, r)) : (o[n] = r);
		}
		return o;
	}
	function Ds(e, t) {
		let o = [
				'cookieBanner',
				'consentManagerDialog',
				'common',
				'consentTypes',
				'frame',
				'legalLinks',
				'iab',
			],
			n = {};
		for (let r of o) {
			let s = e[r],
				i = t[r];
			(s || i) && (n[r] = pc(s, i));
		}
		return n;
	}
	function Km(e) {
		return e
			? e
					.split(',')
					.map((t) => t.split(';')[0]?.trim().toLowerCase())
					.filter((t) => !!t)
					.map((t) => t.split('-')[0] ?? t)
			: [];
	}
	function js(e, t) {
		let o = t?.fallback ?? 'en';
		if (!e.length) return o;
		let n = Km(t?.header);
		for (let r of n) if (e.includes(r)) return r;
		return o;
	}
	function mc(e, t) {
		let o = { en: qt },
			n = [e.translations, t?.translations];
		for (let r of n)
			if (r)
				for (let [s, i] of Object.entries(r)) {
					if (!i) continue;
					let a = o[s] || o.en;
					o[s] = Ds(a, i);
				}
		return { ...e, ...t, translations: o };
	}
	function fc(e, t, o = !1) {
		if (o || typeof window > 'u') return t || 'en';
		let n = window.navigator.language?.split('-')[0] || '';
		return n && n in e ? n : t || 'en';
	}
	function Ms(e, t) {
		let o = mc(e, t),
			n = fc(o.translations, o.defaultLanguage, o.disableAutoLanguageSwitch);
		return { ...o, defaultLanguage: n };
	}
	var qt,
		tn = N(() => {
			'use strict';
			qt = {
				common: {
					acceptAll: 'Accept All',
					rejectAll: 'Reject All',
					customize: 'Customize',
					save: 'Save Settings',
				},
				cookieBanner: {
					title: 'We value your privacy',
					description:
						'This site uses cookies to improve your browsing experience, analyze site traffic, and show personalized content.',
				},
				consentManagerDialog: {
					title: 'Privacy Settings',
					description:
						'Customize your privacy settings here. You can choose which types of cookies and tracking technologies you allow.',
				},
				consentTypes: {
					necessary: {
						title: 'Strictly Necessary',
						description:
							'These cookies are essential for the website to function properly and cannot be disabled.',
					},
					functionality: {
						title: 'Functionality',
						description:
							'These cookies enable enhanced functionality and personalization of the website.',
					},
					marketing: {
						title: 'Marketing',
						description:
							'These cookies are used to deliver relevant advertisements and track their effectiveness.',
					},
					measurement: {
						title: 'Analytics',
						description:
							'These cookies help us understand how visitors interact with the website and improve its performance.',
					},
					experience: {
						title: 'Experience',
						description:
							'These cookies help us provide a better user experience and test new features.',
					},
				},
				frame: {
					title: 'Accept {category} consent to view this content.',
					actionButton: 'Enable {category} consent',
				},
				legalLinks: {
					privacyPolicy: 'Privacy Policy',
					cookiePolicy: 'Cookie Policy',
					termsOfService: 'Terms of Service',
				},
				iab: {
					banner: {
						title: 'Privacy Settings',
						description:
							'We and our {partnerCount} partners store and/or access information on your device and process personal data, such as unique identifiers and browsing data, for this website, to:',
						partnersLink: '{count} partners',
						andMore: 'And {count} more...',
						legitimateInterestNotice:
							'Some partners claim a legitimate interest to process your data. You have the right to object to this processing, customize your choices, and withdraw your consent at any time.',
						scopeServiceSpecific:
							'Your consent applies only to this website and will not affect other services.',
						scopeGroup:
							'Your choice applies across our websites in this group.',
					},
					preferenceCenter: {
						title: 'Privacy Settings',
						description:
							'Customize your privacy settings here. You can choose which types of cookies and tracking technologies you allow.',
						tabs: { purposes: 'Purposes', vendors: 'Vendors' },
						purposeItem: {
							partners: '{count} partners',
							vendorsUseLegitimateInterest:
								'{count} vendors claim legitimate interest',
							examples: 'Examples',
							partnersUsingPurpose: 'Partners Using This Purpose',
							withYourPermission: 'With Your Permission',
							legitimateInterest: 'Legitimate Interest',
							objectButton: 'Object',
							objected: 'Objected',
							rightToObject:
								'You have the right to object to processing based on legitimate interest.',
						},
						specialPurposes: {
							title: 'Essential Functions (Required)',
							tooltip:
								'These are required for site functionality and security. Per IAB TCF, you cannot object to these special purposes.',
						},
						vendorList: {
							search: 'Search vendors...',
							showingCount: '{filtered} of {total} vendors',
							iabVendorsHeading: 'IAB Registered Vendors',
							iabVendorsNotice:
								'These partners are registered with the IAB Transparency & Consent Framework (TCF), an industry standard for managing consent',
							customVendorsHeading: 'Custom Partners',
							customVendorsNotice:
								'These are custom partners not registered with IAB Transparency & Consent Framework (TCF). They process data based on your consent and may have different privacy practices than IAB-registered vendors.',
							purposes: 'Purposes',
							specialPurposes: 'Special Purposes',
							specialFeatures: 'Special Features',
							features: 'Features',
							dataCategories: 'Data Categories',
							usesCookies: 'Uses Cookies',
							nonCookieAccess: 'Non-Cookie Access',
							maxAge: 'Max Age: {days}d',
							retention: 'Retention: {days}d',
							legitimateInterest: 'Leg. Interest',
							privacyPolicy: 'Privacy Policy',
							storageDisclosure: 'Storage Disclosure',
							requiredNotice:
								'Required for site functionality, cannot be disabled',
						},
						footer: {
							consentStorage:
								'Consent preferences are stored in a cookie named "euconsent-v2" for 13 months. The storage duration may be refreshed when you update your preferences.',
						},
					},
					common: {
						acceptAll: 'Accept All',
						rejectAll: 'Reject All',
						customize: 'Customize',
						saveSettings: 'Save Settings',
						loading: 'Loading...',
						showingSelectedVendor: 'Showing selected vendor',
						clearSelection: 'Clear',
						customPartner: 'Custom partner not registered with IAB',
					},
				},
			};
		});
	function vc(e) {
		return e
			? {
					log: (...t) => console.log('[c15t]', ...t),
					debug: (...t) => console.debug('[c15t]', ...t),
				}
			: { log: hc, debug: hc };
	}
	function re() {
		return yc;
	}
	function Cc(e) {
		yc = vc(e);
	}
	var hc,
		yc,
		Kt = N(() => {
			'use strict';
			hc = () => {};
			yc = vc(!1);
		});
	function Zn(e) {
		return {
			expiryDays: e?.defaultExpiryDays ?? 365,
			crossSubdomain: e?.crossSubdomain ?? !1,
			domain: e?.defaultDomain ?? '',
			path: '/',
			secure: typeof window < 'u' && window.location.protocol === 'https:',
			sameSite: 'Lax',
		};
	}
	function rn() {
		if (typeof window > 'u') return '';
		let e = window.location.hostname;
		if (e === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(e)) return e;
		let t = e.split('.');
		return t.length >= 2 ? `.${t.slice(-2).join('.')}` : e;
	}
	var Fs = N(() => {
		'use strict';
	});
	function Hs(e) {
		let t = {};
		for (let [o, n] of Object.entries(e)) {
			let s = o.split('.').map((i) => Us[i] || i);
			t[s.join('.')] = n;
		}
		return t;
	}
	function zs(e) {
		let t = {};
		for (let [o, n] of Object.entries(e)) {
			let s = o.split('.').map((i) => kc[i] || i);
			t[s.join('.')] = n;
		}
		return t;
	}
	var Us,
		kc,
		Gs = N(() => {
			'use strict';
			(Us = {
				consents: 'c',
				consentInfo: 'i',
				timestamp: 'ts',
				iabCustomVendorConsents: 'icv',
				iabCustomVendorLegitimateInterests: 'icvli',
				time: 't',
				type: 'y',
				id: 'id',
				subjectId: 'sid',
				externalId: 'eid',
				identityProvider: 'idp',
			}),
				(kc = Object.entries(Us).reduce((e, [t, o]) => ((e[o] = t), e), {}));
		});
	function Xn(e, t = '') {
		let o = {};
		for (let [n, r] of Object.entries(e)) {
			let s = t ? `${t}.${n}` : n;
			r == null
				? (o[s] = '')
				: typeof r == 'boolean'
					? r && (o[s] = '1')
					: typeof r == 'object' && !Array.isArray(r)
						? Object.assign(o, Xn(r, s))
						: (o[s] = String(r));
		}
		return o;
	}
	function $s(e) {
		let t = {};
		for (let [o, n] of Object.entries(e)) {
			let r = o.split('.');
			if (r.length === 0) continue;
			let s = t;
			for (let a = 0; a < r.length - 1; a++) {
				let l = r[a];
				l !== void 0 && (s[l] || (s[l] = {}), (s = s[l]));
			}
			let i = r[r.length - 1];
			i !== void 0 &&
				(n === '1'
					? (s[i] = !0)
					: n === '0'
						? (s[i] = !1)
						: n === ''
							? (s[i] = null)
							: !Number.isNaN(Number(n)) && n !== ''
								? (s[i] = Number(n))
								: (s[i] = n));
		}
		return t;
	}
	function Ws(e) {
		return Object.entries(e)
			.map(([t, o]) => `${t}:${o}`)
			.join(',');
	}
	function qs(e) {
		if (!e) return {};
		let t = {},
			o = e.split(',');
		for (let n of o) {
			let r = n.indexOf(':');
			if (r === -1) continue;
			let s = n.substring(0, r),
				i = n.substring(r + 1);
			t[s] = i;
		}
		return t;
	}
	var Ks = N(() => {
		'use strict';
	});
	function sn(e, t, o, n) {
		if (typeof document > 'u') return;
		let r = { ...Zn(n), ...o };
		r.crossSubdomain && !o?.domain && (r.domain = rn());
		try {
			let s;
			if (typeof t == 'string') s = t;
			else {
				let u = Xn(t),
					m = Hs(u);
				s = Ws(m);
			}
			let i = new Date();
			i.setTime(i.getTime() + r.expiryDays * 24 * 60 * 60 * 1e3);
			let a = `expires=${i.toUTCString()}`,
				l = [`${e}=${s}`, a, `path=${r.path}`];
			r.domain && l.push(`domain=${r.domain}`),
				r.secure && l.push('secure'),
				r.sameSite && l.push(`SameSite=${r.sameSite}`),
				(document.cookie = l.join('; '));
		} catch (s) {
			console.warn(`Failed to set cookie "${e}":`, s);
		}
	}
	function Jn(e) {
		if (typeof document > 'u') return null;
		try {
			let t = `${e}=`,
				o = document.cookie.split(';');
			for (let n of o) {
				let r = n;
				for (; r.charAt(0) === ' '; ) r = r.substring(1);
				if (r.indexOf(t) === 0) {
					let s = r.substring(t.length);
					if (s.includes(':')) {
						let i = qs(s),
							a = zs(i);
						return $s(a);
					}
					return s;
				}
			}
			return null;
		} catch (t) {
			return console.warn(`Failed to get cookie "${e}":`, t), null;
		}
	}
	function an(e, t, o) {
		if (typeof document > 'u') return;
		let n = { ...Zn(o), ...t };
		n.crossSubdomain && !t?.domain && (n.domain = rn());
		try {
			let r = [
				`${e}=`,
				'expires=Thu, 01 Jan 1970 00:00:00 GMT',
				`path=${n.path}`,
			];
			n.domain && r.push(`domain=${n.domain}`),
				(document.cookie = r.join('; '));
		} catch (r) {
			console.warn(`Failed to delete cookie "${e}":`, r);
		}
	}
	var Ys = N(() => {
		'use strict';
		Fs();
		Gs();
		Ks();
	});
	var Je,
		Qn = N(() => {
			'use strict';
			tn();
			Je = {
				translations: { en: qt },
				defaultLanguage: 'en',
				disableAutoLanguageSwitch: !1,
			};
		});
	var Lt,
		Dt,
		bo = N(() => {
			'use strict';
			(Lt = [
				{
					defaultValue: !0,
					description:
						'These trackers are used for activities that are strictly necessary to operate or deliver the service you requested from us and, therefore, do not require you to consent.',
					disabled: !0,
					display: !0,
					gdprType: 1,
					name: 'necessary',
				},
				{
					defaultValue: !1,
					description:
						'These trackers enable basic interactions and functionalities that allow you to access selected features of our service and facilitate your communication with us.',
					display: !1,
					gdprType: 2,
					name: 'functionality',
				},
				{
					defaultValue: !1,
					description:
						'These trackers help us to measure traffic and analyze your behavior to improve our service.',
					display: !1,
					gdprType: 4,
					name: 'measurement',
				},
				{
					defaultValue: !1,
					description:
						'These trackers help us to improve the quality of your user experience and enable interactions with external content, networks, and platforms.',
					display: !1,
					gdprType: 3,
					name: 'experience',
				},
				{
					defaultValue: !1,
					description:
						'These trackers help us to deliver personalized ads or marketing content to you, and to measure their performance.',
					display: !1,
					gdprType: 5,
					name: 'marketing',
				},
			]),
				(Dt = Lt.map((e) => e.name));
		});
	var wc = N(() => {
		'use strict';
	});
	var Ic = N(() => {
		'use strict';
	});
	var _c = N(() => {
		'use strict';
	});
	var Rc = N(() => {
		'use strict';
	});
	var Tc = N(() => {
		'use strict';
		bo();
		wc();
		Ic();
		_c();
		Rc();
	});
	var ft,
		ho = N(() => {
			'use strict';
			ft = '2.0.0-rc.3';
		});
	var cn,
		vo,
		Ac,
		Zs = N(() => {
			'use strict';
			Qn();
			Tc();
			ho();
			(cn = 'c15t'),
				(vo = 'privacy-consent-storage'),
				(Ac = {
					debug: !1,
					config: { pkg: 'c15t', version: ft, mode: 'Unknown' },
					consents: Lt.reduce((e, t) => ((e[t.name] = t.defaultValue), e), {}),
					selectedConsents: Lt.reduce(
						(e, t) => ((e[t.name] = t.defaultValue), e),
						{}
					),
					consentInfo: null,
					branding: 'c15t',
					activeUI: 'none',
					isLoadingConsentInfo: !1,
					hasFetchedBanner: !1,
					lastBannerFetchData: null,
					consentCategories: ['necessary'],
					callbacks: {},
					locationInfo: null,
					overrides: void 0,
					legalLinks: {},
					translationConfig: Je,
					user: void 0,
					networkBlocker: void 0,
					storageConfig: void 0,
					includeNonDisplayedConsents: !1,
					consentTypes: Lt,
					iframeBlockerConfig: { disableAutomaticBlocking: !1 },
					scripts: [],
					loadedScripts: {},
					scriptIdMap: {},
					model: 'opt-in',
					iab: null,
					reloadOnConsentRevoked: !0,
					ssrDataUsed: !1,
					ssrSkippedReason: null,
				});
		});
	function Zm(e) {
		if (typeof e != 'object' || e === null) return !1;
		let o = e.consentInfo;
		if (!o || typeof o != 'object') return !1;
		let n = typeof o.id == 'string',
			r = typeof o.subjectId == 'string';
		return n && !r;
	}
	function Xm(e) {
		let t = e?.storageKey || cn,
			o = vo;
		if (t !== o)
			try {
				if (typeof window < 'u' && window.localStorage) {
					if (window.localStorage.getItem(t)) {
						window.localStorage.removeItem(o);
						return;
					}
					let r = window.localStorage.getItem(o);
					r &&
						(window.localStorage.setItem(t, r),
						window.localStorage.removeItem(o),
						re().log(`Migrated consent data from "${o}" to "${t}"`));
				}
			} catch (n) {
				console.warn('[c15t] Failed to migrate legacy storage:', n);
			}
	}
	function lt(e, t, o) {
		let n = !1,
			r = !1,
			s = o?.storageKey || cn,
			i = gt(o),
			l = {
				...{
					...i,
					...e,
					iabCustomVendorConsents:
						e.iabCustomVendorConsents ?? i?.iabCustomVendorConsents,
					iabCustomVendorLegitimateInterests:
						e.iabCustomVendorLegitimateInterests ??
						i?.iabCustomVendorLegitimateInterests,
				},
			};
		(!l.iabCustomVendorConsents ||
			Object.keys(l.iabCustomVendorConsents).length === 0) &&
			delete l.iabCustomVendorConsents,
			(!l.iabCustomVendorLegitimateInterests ||
				Object.keys(l.iabCustomVendorLegitimateInterests).length === 0) &&
				delete l.iabCustomVendorLegitimateInterests;
		try {
			typeof window < 'u' &&
				window.localStorage &&
				(window.localStorage.setItem(s, JSON.stringify(l)), (n = !0));
		} catch (u) {
			console.warn('Failed to save consent to localStorage:', u);
		}
		try {
			sn(s, l, t, o), (r = !0);
		} catch (u) {
			console.warn('Failed to save consent to cookie:', u);
		}
		if (!n && !r)
			throw new Error('Failed to save consent to any storage method');
	}
	function Xs(e) {
		let t = e.consents || {},
			o = { ...t };
		for (let n of Dt) o[n] = t[n] ?? !1;
		return { ...e, consents: o };
	}
	function gt(e) {
		Xm(e);
		let t = e?.storageKey || cn,
			o = null,
			n = null;
		try {
			if (typeof window < 'u' && window.localStorage) {
				let i = window.localStorage.getItem(t);
				i && (o = JSON.parse(i));
			}
		} catch (i) {
			console.warn('Failed to read consent from localStorage:', i);
		}
		try {
			n = Jn(t);
		} catch (i) {
			console.warn('Failed to read consent from cookie:', i);
		}
		let r = null,
			s = null;
		if (
			(n ? ((r = n), (s = 'cookie')) : o && ((r = o), (s = 'localStorage')),
			r && s)
		) {
			let i = e?.crossSubdomain === !0 || !!e?.defaultDomain;
			if (s === 'localStorage' && !n)
				try {
					sn(t, r, void 0, e),
						re().log('Synced consent from localStorage to cookie');
				} catch (a) {
					console.warn('[c15t] Failed to sync consent to cookie:', a);
				}
			else if (s === 'cookie')
				try {
					if (typeof window < 'u' && window.localStorage) {
						let a = r;
						typeof a == 'object' &&
							a !== null &&
							'consents' in a &&
							(a = Xs(a));
						let l = null;
						try {
							let p = window.localStorage.getItem(t);
							if (p) {
								let d = JSON.parse(p);
								typeof d == 'object' && d !== null && 'consents' in d
									? (l = Xs(d))
									: (l = d);
							}
						} catch {
							l = null;
						}
						let u = JSON.stringify(a),
							m = JSON.stringify(l);
						u !== m &&
							(window.localStorage.setItem(t, u),
							l
								? i
									? re().log(
											'Updated localStorage with consent from cookie (cross-subdomain mode)'
										)
									: re().log('Updated localStorage with consent from cookie')
								: re().log('Synced consent from cookie to localStorage'));
					}
				} catch (a) {
					console.warn('[c15t] Failed to sync consent to localStorage:', a);
				}
		}
		return r && Zm(r)
			? (re().log(
					'Detected legacy consent format (v1.x). Re-consent required for v2.0.'
				),
				ln(void 0, e),
				null)
			: r && typeof r == 'object'
				? Xs(r)
				: r;
	}
	function ln(e, t) {
		let o = t?.storageKey || cn;
		try {
			typeof window < 'u' &&
				window.localStorage &&
				(window.localStorage.removeItem(o),
				o !== vo && window.localStorage.removeItem(vo));
		} catch (n) {
			console.warn('Failed to remove consent from localStorage:', n);
		}
		try {
			an(o, e, t), o !== vo && an(vo, e, t);
		} catch (n) {
			console.warn('Failed to remove consent cookie:', n);
		}
	}
	var Lc = N(() => {
		'use strict';
		Zs();
		bo();
		Kt();
		Ys();
	});
	var jt = N(() => {
		'use strict';
		Fs();
		Gs();
		Ys();
		Ks();
		Lc();
	});
	var Yt,
		tr,
		or = N(() => {
			'use strict';
			(Yt = {
				TC_STRING_COOKIE: 'euconsent-v2',
				TC_STRING_LOCAL: 'euconsent-v2',
			}),
				(tr = 'https://gvl.consent.io');
		});
	var oi = {};
	fo(oi, {
		clearGVLCache: () => ei,
		fetchGVL: () => Js,
		getCachedGVL: () => Qs,
		getMockGVL: () => Qm,
		setMockGVL: () => ti,
	});
	async function Js(e, t = {}) {
		let o = typeof window < 'u' ? window.__c15t_mock_gvl : void 0;
		if (o !== void 0) return (Zt = o), o;
		if (yo !== void 0) return (Zt = yo), yo;
		let { endpoint: n = tr, headers: r } = t,
			s = e ? [...e].sort((p, d) => p - d) : [],
			i = r ? JSON.stringify(r) : '',
			a = `${n}|${s.join(',')}|${i}`,
			l = nr.get(a);
		if (l) return l;
		let u = new URL(n);
		s.length > 0 && u.searchParams.set('vendorIds', s.join(','));
		let m = (async () => {
			try {
				let p = await fetch(u.toString(), { headers: r });
				if (p.status === 204) return (Zt = null), null;
				if (!p.ok)
					throw new Error(`Failed to fetch GVL: ${p.status} ${p.statusText}`);
				let d = await p.json();
				if (!d.vendorListVersion || !d.purposes || !d.vendors)
					throw new Error('Invalid GVL response: missing required fields');
				return (Zt = d), d;
			} finally {
				nr.delete(a);
			}
		})();
		return nr.set(a, m), m;
	}
	function Qs() {
		return Zt;
	}
	function ei() {
		nr.clear(), (Zt = void 0), (yo = void 0);
	}
	function ti(e) {
		(yo = e), e !== void 0 && (Zt = e);
	}
	function Qm() {
		return yo;
	}
	var nr,
		Zt,
		yo,
		rr = N(() => {
			'use strict';
			or();
			nr = new Map();
		});
	function af(e) {
		let t = BigInt(58),
			o = BigInt(0);
		for (let r of e) o = o * BigInt(256) + BigInt(r);
		let n = [];
		for (; o > 0; ) {
			let r = o % t;
			n.unshift(ri.charAt(Number(r))), (o = o / t);
		}
		for (let r of e)
			if (r === 0) n.unshift(ri.charAt(0));
			else break;
		return n.join('') || ri.charAt(0);
	}
	function fn() {
		let e = crypto.getRandomValues(new Uint8Array(20)),
			t = Date.now() - cf,
			o = Math.floor(t / 4294967296),
			n = t >>> 0;
		return (
			(e[0] = (o >>> 24) & 255),
			(e[1] = (o >>> 16) & 255),
			(e[2] = (o >>> 8) & 255),
			(e[3] = o & 255),
			(e[4] = (n >>> 24) & 255),
			(e[5] = (n >>> 16) & 255),
			(e[6] = (n >>> 8) & 255),
			(e[7] = n & 255),
			`sub_${af(e)}`
		);
	}
	var ri,
		cf,
		ar = N(() => {
			'use strict';
			ri = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
			cf = 17e11;
		});
	var Cr,
		xr,
		di = N(() => {
			'use strict';
			ho();
			(Cr = 0), (xr = ft);
		});
	function bf() {
		return {
			gdprApplies: void 0,
			cmpLoaded: !1,
			cmpStatus: 'stub',
			displayStatus: 'hidden',
			apiVersion: '2.3',
			cmpVersion: ft,
			cmpId: 0,
			gvlVersion: 0,
			tcfPolicyVersion: 5,
		};
	}
	function hf() {
		let e = [],
			t = (o, n, r, s) => {
				o === 'ping' ? r(bf(), !0) : e.push([o, n, r, s]);
			};
		return (t.queue = e), t;
	}
	function vf() {
		if (
			typeof document > 'u' ||
			document.querySelector('iframe[name="__tcfapiLocator"]')
		)
			return null;
		let e = document.createElement('iframe');
		return (
			(e.name = '__tcfapiLocator'),
			(e.style.display = 'none'),
			e.setAttribute('aria-hidden', 'true'),
			(e.tabIndex = -1),
			(document.body ?? document.documentElement).appendChild(e),
			e
		);
	}
	function el(e) {
		if (typeof window > 'u' || !window.__tcfapi) return;
		let { data: t } = e;
		if (!t || typeof t != 'object' || !('__tcfapiCall' in t)) return;
		let o = t.__tcfapiCall;
		!o ||
			!o.command ||
			!o.callId ||
			window.__tcfapi(
				o.command,
				o.version,
				(n, r) => {
					let s = {
						__tcfapiReturn: { returnValue: n, success: r, callId: o.callId },
					};
					e.source &&
						typeof e.source.postMessage == 'function' &&
						e.source.postMessage(s, '*');
				},
				o.parameter
			);
	}
	function tl() {
		typeof window > 'u' ||
			Sr ||
			(window.__tcfapi || (window.__tcfapi = hf()),
			(hn = vf()),
			window.addEventListener('message', el),
			(Sr = !0));
	}
	function kr() {
		return typeof window > 'u' || !window.__tcfapi
			? []
			: (window.__tcfapi.queue ?? []);
	}
	function wr() {
		typeof window < 'u' &&
			window.__tcfapi?.queue &&
			(window.__tcfapi.queue = []);
	}
	function ol() {
		return typeof window > 'u' || !window.__tcfapi
			? !1
			: Array.isArray(window.__tcfapi.queue);
	}
	function nl() {
		typeof window > 'u' ||
			(window.removeEventListener('message', el),
			hn?.parentNode && (hn.parentNode.removeChild(hn), (hn = null)),
			(Sr = !1));
	}
	function rl() {
		return Sr;
	}
	var Sr,
		hn,
		ui = N(() => {
			'use strict';
			ho();
			(Sr = !1), (hn = null);
		});
	var _e,
		sl = N(() => {
			_e = class extends Error {
				constructor(t) {
					super(t), (this.name = 'DecodingError');
				}
			};
		});
	var Pe,
		il = N(() => {
			Pe = class extends Error {
				constructor(t) {
					super(t), (this.name = 'EncodingError');
				}
			};
		});
	var ht,
		al = N(() => {
			ht = class extends Error {
				constructor(t) {
					super(t), (this.name = 'GVLError');
				}
			};
		});
	var je,
		cl = N(() => {
			je = class extends Error {
				constructor(t, o, n = '') {
					super(`invalid value ${o} passed for ${t} ${n}`),
						(this.name = 'TCModelError');
				}
			};
		});
	var Me = N(() => {
		sl();
		il();
		al();
		cl();
	});
	var Qe,
		pi = N(() => {
			Me();
			Qe = class {
				static encode(t) {
					if (!/^[0-1]+$/.test(t)) throw new Pe('Invalid bitField');
					let o = t.length % this.LCM;
					t += o ? '0'.repeat(this.LCM - o) : '';
					let n = '';
					for (let r = 0; r < t.length; r += this.BASIS)
						n += this.DICT[parseInt(t.substr(r, this.BASIS), 2)];
					return n;
				}
				static decode(t) {
					if (!/^[A-Za-z0-9\-_]+$/.test(t))
						throw new _e('Invalidly encoded Base64URL string');
					let o = '';
					for (let n = 0; n < t.length; n++) {
						let r = this.REVERSE_DICT.get(t[n]).toString(2);
						o += '0'.repeat(this.BASIS - r.length) + r;
					}
					return o;
				}
			};
			k(
				Qe,
				'DICT',
				'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
			),
				k(
					Qe,
					'REVERSE_DICT',
					new Map([
						['A', 0],
						['B', 1],
						['C', 2],
						['D', 3],
						['E', 4],
						['F', 5],
						['G', 6],
						['H', 7],
						['I', 8],
						['J', 9],
						['K', 10],
						['L', 11],
						['M', 12],
						['N', 13],
						['O', 14],
						['P', 15],
						['Q', 16],
						['R', 17],
						['S', 18],
						['T', 19],
						['U', 20],
						['V', 21],
						['W', 22],
						['X', 23],
						['Y', 24],
						['Z', 25],
						['a', 26],
						['b', 27],
						['c', 28],
						['d', 29],
						['e', 30],
						['f', 31],
						['g', 32],
						['h', 33],
						['i', 34],
						['j', 35],
						['k', 36],
						['l', 37],
						['m', 38],
						['n', 39],
						['o', 40],
						['p', 41],
						['q', 42],
						['r', 43],
						['s', 44],
						['t', 45],
						['u', 46],
						['v', 47],
						['w', 48],
						['x', 49],
						['y', 50],
						['z', 51],
						['0', 52],
						['1', 53],
						['2', 54],
						['3', 55],
						['4', 56],
						['5', 57],
						['6', 58],
						['7', 59],
						['8', 60],
						['9', 61],
						['-', 62],
						['_', 63],
					])
				),
				k(Qe, 'BASIS', 6),
				k(Qe, 'LCM', 24);
		});
	var vt,
		vn,
		ll = N(() => {
			vt = class vt {
				has(t) {
					return vt.langSet.has(t);
				}
				parseLanguage(t) {
					t = t.toUpperCase();
					let o = t.split('-')[0];
					if (t.length >= 2 && o.length == 2) {
						if (vt.langSet.has(t)) return t;
						if (vt.langSet.has(o)) return o;
						let n = o + '-' + o;
						if (vt.langSet.has(n)) return n;
						for (let r of vt.langSet)
							if (r.indexOf(t) !== -1 || r.indexOf(o) !== -1) return r;
					}
					throw new Error(`unsupported language ${t}`);
				}
				forEach(t) {
					vt.langSet.forEach(t);
				}
				get size() {
					return vt.langSet.size;
				}
			};
			k(
				vt,
				'langSet',
				new Set([
					'AR',
					'BG',
					'BS',
					'CA',
					'CS',
					'CY',
					'DA',
					'DE',
					'EL',
					'EN',
					'ES',
					'ET',
					'EU',
					'FI',
					'FR',
					'GL',
					'HE',
					'HI',
					'HR',
					'HU',
					'ID',
					'IS',
					'IT',
					'JA',
					'KA',
					'KO',
					'LT',
					'LV',
					'MK',
					'MS',
					'MT',
					'NL',
					'NO',
					'PL',
					'PT-BR',
					'PT-PT',
					'RO',
					'RU',
					'SK',
					'SL',
					'SQ',
					'SR-LATN',
					'SR-CYRL',
					'SV',
					'SW',
					'TH',
					'TL',
					'TR',
					'UK',
					'VI',
					'ZH',
					'ZH-HANT',
				])
			);
			vn = vt;
		});
	var w,
		mi = N(() => {
			w = class {};
			k(w, 'cmpId', 'cmpId'),
				k(w, 'cmpVersion', 'cmpVersion'),
				k(w, 'consentLanguage', 'consentLanguage'),
				k(w, 'consentScreen', 'consentScreen'),
				k(w, 'created', 'created'),
				k(w, 'supportOOB', 'supportOOB'),
				k(w, 'isServiceSpecific', 'isServiceSpecific'),
				k(w, 'lastUpdated', 'lastUpdated'),
				k(w, 'numCustomPurposes', 'numCustomPurposes'),
				k(w, 'policyVersion', 'policyVersion'),
				k(w, 'publisherCountryCode', 'publisherCountryCode'),
				k(w, 'publisherCustomConsents', 'publisherCustomConsents'),
				k(
					w,
					'publisherCustomLegitimateInterests',
					'publisherCustomLegitimateInterests'
				),
				k(w, 'publisherLegitimateInterests', 'publisherLegitimateInterests'),
				k(w, 'publisherConsents', 'publisherConsents'),
				k(w, 'publisherRestrictions', 'publisherRestrictions'),
				k(w, 'purposeConsents', 'purposeConsents'),
				k(w, 'purposeLegitimateInterests', 'purposeLegitimateInterests'),
				k(w, 'purposeOneTreatment', 'purposeOneTreatment'),
				k(w, 'specialFeatureOptins', 'specialFeatureOptins'),
				k(w, 'useNonStandardTexts', 'useNonStandardTexts'),
				k(w, 'vendorConsents', 'vendorConsents'),
				k(w, 'vendorLegitimateInterests', 'vendorLegitimateInterests'),
				k(w, 'vendorListVersion', 'vendorListVersion'),
				k(w, 'vendorsAllowed', 'vendorsAllowed'),
				k(w, 'vendorsDisclosed', 'vendorsDisclosed'),
				k(w, 'version', 'version');
		});
	var dl = N(() => {});
	var ul = N(() => {});
	var qe,
		Qt = N(() => {
			qe = class {
				clone() {
					let t = new this.constructor();
					return (
						Object.keys(this).forEach((n) => {
							let r = this.deepClone(this[n]);
							r !== void 0 && (t[n] = r);
						}),
						t
					);
				}
				deepClone(t) {
					let o = typeof t;
					if (o === 'number' || o === 'string' || o === 'boolean') return t;
					if (t !== null && o === 'object') {
						if (typeof t.clone == 'function') return t.clone();
						if (t instanceof Date) return new Date(t.getTime());
						if (t[Symbol.iterator] !== void 0) {
							let n = [];
							for (let r of t) n.push(this.deepClone(r));
							return t instanceof Array ? n : new t.constructor(n);
						} else {
							let n = {};
							for (let r in t)
								t.hasOwnProperty(r) && (n[r] = this.deepClone(t[r]));
							return n;
						}
					}
				}
			};
		});
	var ze,
		Ir = N(() => {
			(function (e) {
				(e[(e.NOT_ALLOWED = 0)] = 'NOT_ALLOWED'),
					(e[(e.REQUIRE_CONSENT = 1)] = 'REQUIRE_CONSENT'),
					(e[(e.REQUIRE_LI = 2)] = 'REQUIRE_LI');
			})(ze || (ze = {}));
		});
	var yn,
		yt,
		fi = N(() => {
			Qt();
			Me();
			Ir();
			yn = class yn extends qe {
				constructor(o, n) {
					super();
					k(this, 'purposeId_');
					k(this, 'restrictionType');
					o !== void 0 && (this.purposeId = o),
						n !== void 0 && (this.restrictionType = n);
				}
				static unHash(o) {
					let n = o.split(this.hashSeparator),
						r = new yn();
					if (n.length !== 2) throw new je('hash', o);
					return (
						(r.purposeId = parseInt(n[0], 10)),
						(r.restrictionType = parseInt(n[1], 10)),
						r
					);
				}
				get hash() {
					if (!this.isValid())
						throw new Error('cannot hash invalid PurposeRestriction');
					return `${this.purposeId}${yn.hashSeparator}${this.restrictionType}`;
				}
				get purposeId() {
					return this.purposeId_;
				}
				set purposeId(o) {
					this.purposeId_ = o;
				}
				isValid() {
					return (
						Number.isInteger(this.purposeId) &&
						this.purposeId > 0 &&
						(this.restrictionType === ze.NOT_ALLOWED ||
							this.restrictionType === ze.REQUIRE_CONSENT ||
							this.restrictionType === ze.REQUIRE_LI)
					);
				}
				isSameAs(o) {
					return (
						this.purposeId === o.purposeId &&
						this.restrictionType === o.restrictionType
					);
				}
			};
			k(yn, 'hashSeparator', '-');
			yt = yn;
		});
	var eo,
		pl = N(() => {
			fi();
			Ir();
			Qt();
			eo = class extends qe {
				constructor() {
					super(...arguments);
					k(this, 'bitLength', 0);
					k(this, 'map', new Map());
					k(this, 'gvl_');
				}
				has(o) {
					return this.map.has(o);
				}
				isOkToHave(o, n, r) {
					let s = !0;
					if (this.gvl?.vendors) {
						let i = this.gvl.vendors[r];
						if (i)
							if (o === ze.NOT_ALLOWED)
								s = i.legIntPurposes.includes(n) || i.purposes.includes(n);
							else if (i.flexiblePurposes.length)
								switch (o) {
									case ze.REQUIRE_CONSENT:
										s =
											i.flexiblePurposes.includes(n) &&
											i.legIntPurposes.includes(n);
										break;
									case ze.REQUIRE_LI:
										s =
											i.flexiblePurposes.includes(n) && i.purposes.includes(n);
										break;
								}
							else s = !1;
						else s = !1;
					}
					return s;
				}
				add(o, n) {
					if (this.isOkToHave(n.restrictionType, n.purposeId, o)) {
						let r = n.hash;
						this.has(r) || (this.map.set(r, new Set()), (this.bitLength = 0)),
							this.map.get(r).add(o);
					}
				}
				restrictPurposeToLegalBasis(o) {
					let n = Array.from(this.gvl.vendorIds),
						r = o.hash,
						s = n[n.length - 1],
						i = [...Array(s).keys()].map((a) => a + 1);
					if (!this.has(r)) this.map.set(r, new Set(i)), (this.bitLength = 0);
					else for (let a = 1; a <= s; a++) this.map.get(r).add(a);
				}
				getVendors(o) {
					let n = [];
					if (o) {
						let r = o.hash;
						this.has(r) && (n = Array.from(this.map.get(r)));
					} else {
						let r = new Set();
						this.map.forEach((s) => {
							s.forEach((i) => {
								r.add(i);
							});
						}),
							(n = Array.from(r));
					}
					return n.sort((r, s) => r - s);
				}
				getRestrictionType(o, n) {
					let r;
					return (
						this.getRestrictions(o).forEach((s) => {
							s.purposeId === n &&
								(r === void 0 || r > s.restrictionType) &&
								(r = s.restrictionType);
						}),
						r
					);
				}
				vendorHasRestriction(o, n) {
					let r = !1,
						s = this.getRestrictions(o);
					for (let i = 0; i < s.length && !r; i++) r = n.isSameAs(s[i]);
					return r;
				}
				getMaxVendorId() {
					let o = 0;
					return (
						this.map.forEach((n) => {
							o = Math.max(Array.from(n)[n.size - 1], o);
						}),
						o
					);
				}
				getRestrictions(o) {
					let n = [];
					return (
						this.map.forEach((r, s) => {
							o ? r.has(o) && n.push(yt.unHash(s)) : n.push(yt.unHash(s));
						}),
						n
					);
				}
				getPurposes() {
					let o = new Set();
					return (
						this.map.forEach((n, r) => {
							o.add(yt.unHash(r).purposeId);
						}),
						Array.from(o)
					);
				}
				remove(o, n) {
					let r = n.hash,
						s = this.map.get(r);
					s &&
						(s.delete(o),
						s.size == 0 && (this.map.delete(r), (this.bitLength = 0)));
				}
				set gvl(o) {
					this.gvl_ ||
						((this.gvl_ = o),
						this.map.forEach((n, r) => {
							let s = yt.unHash(r);
							Array.from(n).forEach((a) => {
								this.isOkToHave(s.restrictionType, s.purposeId, a) ||
									n.delete(a);
							});
						}));
				}
				get gvl() {
					return this.gvl_;
				}
				isEmpty() {
					return this.map.size === 0;
				}
				get numRestrictions() {
					return this.map.size;
				}
			};
		});
	var gi,
		ml = N(() => {
			(function (e) {
				(e.COOKIE = 'cookie'), (e.WEB = 'web'), (e.APP = 'app');
			})(gi || (gi = {}));
		});
	var fl = N(() => {});
	var ee,
		bi = N(() => {
			(function (e) {
				(e.CORE = 'core'),
					(e.VENDORS_DISCLOSED = 'vendorsDisclosed'),
					(e.VENDORS_ALLOWED = 'vendorsAllowed'),
					(e.PUBLISHER_TC = 'publisherTC');
			})(ee || (ee = {}));
		});
	var Et,
		gl = N(() => {
			bi();
			Et = class {};
			k(Et, 'ID_TO_KEY', [
				ee.CORE,
				ee.VENDORS_DISCLOSED,
				ee.VENDORS_ALLOWED,
				ee.PUBLISHER_TC,
			]),
				k(Et, 'KEY_TO_ID', {
					[ee.CORE]: 0,
					[ee.VENDORS_DISCLOSED]: 1,
					[ee.VENDORS_ALLOWED]: 2,
					[ee.PUBLISHER_TC]: 3,
				});
		});
	var Re,
		bl = N(() => {
			Qt();
			Me();
			Re = class extends qe {
				constructor() {
					super(...arguments);
					k(this, 'bitLength', 0);
					k(this, 'maxId_', 0);
					k(this, 'set_', new Set());
				}
				*[Symbol.iterator]() {
					for (let o = 1; o <= this.maxId; o++) yield [o, this.has(o)];
				}
				values() {
					return this.set_.values();
				}
				get maxId() {
					return this.maxId_;
				}
				has(o) {
					return this.set_.has(o);
				}
				unset(o) {
					Array.isArray(o)
						? o.forEach((n) => this.unset(n))
						: typeof o == 'object'
							? this.unset(Object.keys(o).map((n) => Number(n)))
							: (this.set_.delete(Number(o)),
								(this.bitLength = 0),
								o === this.maxId &&
									((this.maxId_ = 0),
									this.set_.forEach((n) => {
										this.maxId_ = Math.max(this.maxId, n);
									})));
				}
				isIntMap(o) {
					let n = typeof o == 'object';
					return (
						(n =
							n &&
							Object.keys(o).every((r) => {
								let s = Number.isInteger(parseInt(r, 10));
								return (
									(s = s && this.isValidNumber(o[r].id)),
									(s = s && o[r].name !== void 0),
									s
								);
							})),
						n
					);
				}
				isValidNumber(o) {
					return parseInt(o, 10) > 0;
				}
				isSet(o) {
					let n = !1;
					return (
						o instanceof Set && (n = Array.from(o).every(this.isValidNumber)), n
					);
				}
				set(o) {
					if (Array.isArray(o)) o.forEach((n) => this.set(n));
					else if (this.isSet(o)) this.set(Array.from(o));
					else if (this.isIntMap(o))
						this.set(Object.keys(o).map((n) => Number(n)));
					else if (this.isValidNumber(o))
						this.set_.add(o),
							(this.maxId_ = Math.max(this.maxId, o)),
							(this.bitLength = 0);
					else
						throw new je(
							'set()',
							o,
							'must be positive integer array, positive integer, Set<number>, or IntMap'
						);
				}
				empty() {
					(this.set_ = new Set()), (this.maxId_ = 0);
				}
				forEach(o) {
					for (let n = 1; n <= this.maxId; n++) o(this.has(n), n);
				}
				get size() {
					return this.set_.size;
				}
				setAll(o) {
					this.set(o);
				}
				unsetAll(o) {
					this.unset(o);
				}
			};
		});
	var hl = N(() => {});
	var vl = N(() => {});
	var yl = N(() => {});
	var Cl = N(() => {});
	var xl = N(() => {});
	var Sl = N(() => {});
	var kl = N(() => {});
	var wl = N(() => {});
	var Il = N(() => {});
	var _l = N(() => {});
	var Rl = N(() => {});
	var Tl = N(() => {
		hl();
		vl();
		yl();
		Cl();
		xl();
		Sl();
		kl();
		wl();
		Il();
		_l();
		Rl();
	});
	var Ge = N(() => {
		ll();
		mi();
		dl();
		ul();
		fi();
		pl();
		ml();
		fl();
		Ir();
		bi();
		gl();
		bl();
		Tl();
	});
	var Al,
		Ll,
		El,
		Nl,
		Pl,
		Bl,
		Ol,
		Dl,
		jl,
		Ml,
		Vl,
		Fl,
		Ul,
		Hl,
		zl,
		Gl,
		$l,
		Wl,
		R,
		_r = N(() => {
			Ge();
			(Wl = w.cmpId),
				($l = w.cmpVersion),
				(Gl = w.consentLanguage),
				(zl = w.consentScreen),
				(Hl = w.created),
				(Ul = w.isServiceSpecific),
				(Fl = w.lastUpdated),
				(Vl = w.policyVersion),
				(Ml = w.publisherCountryCode),
				(jl = w.publisherLegitimateInterests),
				(Dl = w.publisherConsents),
				(Ol = w.purposeConsents),
				(Bl = w.purposeLegitimateInterests),
				(Pl = w.purposeOneTreatment),
				(Nl = w.specialFeatureOptins),
				(El = w.useNonStandardTexts),
				(Ll = w.vendorListVersion),
				(Al = w.version);
			R = class {};
			k(R, Wl, 12),
				k(R, $l, 12),
				k(R, Gl, 12),
				k(R, zl, 6),
				k(R, Hl, 36),
				k(R, Ul, 1),
				k(R, Fl, 36),
				k(R, Vl, 6),
				k(R, Ml, 12),
				k(R, jl, 24),
				k(R, Dl, 24),
				k(R, Ol, 24),
				k(R, Bl, 24),
				k(R, Pl, 1),
				k(R, Nl, 12),
				k(R, El, 1),
				k(R, Ll, 12),
				k(R, Al, 6),
				k(R, 'anyBoolean', 1),
				k(R, 'encodingType', 1),
				k(R, 'maxId', 16),
				k(R, 'numCustomPurposes', 6),
				k(R, 'numEntries', 12),
				k(R, 'numRestrictions', 12),
				k(R, 'purposeId', 6),
				k(R, 'restrictionType', 2),
				k(R, 'segmentType', 3),
				k(R, 'singleOrRange', 1),
				k(R, 'vendorId', 16);
		});
	var ql = N(() => {});
	var Be,
		ko = N(() => {
			Be = class {
				static encode(t) {
					return String(Number(t));
				}
				static decode(t) {
					return t === '1';
				}
			};
		});
	var U,
		Vt = N(() => {
			Me();
			U = class {
				static encode(t, o) {
					let n;
					if (
						(typeof t == 'string' && (t = parseInt(t, 10)),
						(n = t.toString(2)),
						n.length > o || t < 0)
					)
						throw new Pe(`${t} too large to encode into ${o}`);
					return n.length < o && (n = '0'.repeat(o - n.length) + n), n;
				}
				static decode(t, o) {
					if (o !== t.length) throw new _e('invalid bit length');
					return parseInt(t, 2);
				}
			};
		});
	var wo,
		hi = N(() => {
			Vt();
			Me();
			wo = class {
				static encode(t, o) {
					return U.encode(Math.round(t.getTime() / 100), o);
				}
				static decode(t, o) {
					if (o !== t.length) throw new _e('invalid bit length');
					let n = new Date();
					return n.setTime(U.decode(t, o) * 100), n;
				}
			};
		});
	var Ke,
		Rr = N(() => {
			ko();
			Me();
			Ge();
			Ke = class {
				static encode(t, o) {
					let n = '';
					for (let r = 1; r <= o; r++) n += Be.encode(t.has(r));
					return n;
				}
				static decode(t, o) {
					if (t.length !== o) throw new _e('bitfield encoding length mismatch');
					let n = new Re();
					for (let r = 1; r <= o; r++) Be.decode(t[r - 1]) && n.set(r);
					return (n.bitLength = t.length), n;
				}
			};
		});
	var Io,
		vi = N(() => {
			Vt();
			Me();
			Io = class {
				static encode(t, o) {
					t = t.toUpperCase();
					let n = 65,
						r = t.charCodeAt(0) - n,
						s = t.charCodeAt(1) - n;
					if (r < 0 || r > 25 || s < 0 || s > 25)
						throw new Pe(`invalid language code: ${t}`);
					if (o % 2 === 1)
						throw new Pe(`numBits must be even, ${o} is not valid`);
					o = o / 2;
					let i = U.encode(r, o),
						a = U.encode(s, o);
					return i + a;
				}
				static decode(t, o) {
					let n;
					if (o === t.length && !(t.length % 2)) {
						let s = t.length / 2,
							i = U.decode(t.slice(0, s), s) + 65,
							a = U.decode(t.slice(s), s) + 65;
						n = String.fromCharCode(i) + String.fromCharCode(a);
					} else throw new _e('invalid bit length for language');
					return n;
				}
			};
		});
	var Cn,
		yi = N(() => {
			_r();
			ko();
			Me();
			Vt();
			Ge();
			Cn = class {
				static encode(t) {
					let o = U.encode(t.numRestrictions, R.numRestrictions);
					if (!t.isEmpty()) {
						let n = (r, s) => {
							for (let i = r + 1; i <= s; i++)
								if (t.gvl.vendorIds.has(i)) return i;
							return r;
						};
						t.getRestrictions().forEach((r) => {
							(o += U.encode(r.purposeId, R.purposeId)),
								(o += U.encode(r.restrictionType, R.restrictionType));
							let s = t.getVendors(r),
								i = s.length,
								a = 0,
								l = 0,
								u = '';
							for (let m = 0; m < i; m++) {
								let p = s[m];
								if (
									(l === 0 && (a++, (l = p)),
									m === i - 1 || s[m + 1] > n(p, s[i - 1]))
								) {
									let d = p !== l;
									(u += Be.encode(d)),
										(u += U.encode(l, R.vendorId)),
										d && (u += U.encode(p, R.vendorId)),
										(l = 0);
								}
							}
							(o += U.encode(a, R.numEntries)), (o += u);
						});
					}
					return o;
				}
				static decode(t) {
					let o = 0,
						n = new eo(),
						r = U.decode(t.substr(o, R.numRestrictions), R.numRestrictions);
					o += R.numRestrictions;
					for (let s = 0; s < r; s++) {
						let i = U.decode(t.substr(o, R.purposeId), R.purposeId);
						o += R.purposeId;
						let a = U.decode(t.substr(o, R.restrictionType), R.restrictionType);
						o += R.restrictionType;
						let l = new yt(i, a),
							u = U.decode(t.substr(o, R.numEntries), R.numEntries);
						o += R.numEntries;
						for (let m = 0; m < u; m++) {
							let p = Be.decode(t.substr(o, R.anyBoolean));
							o += R.anyBoolean;
							let d = U.decode(t.substr(o, R.vendorId), R.vendorId);
							if (((o += R.vendorId), p)) {
								let f = U.decode(t.substr(o, R.vendorId), R.vendorId);
								if (((o += R.vendorId), f < d))
									throw new _e(
										`Invalid RangeEntry: endVendorId ${f} is less than ${d}`
									);
								for (let h = d; h <= f; h++) n.add(h, l);
							} else n.add(d, l);
						}
					}
					return (n.bitLength = o), n;
				}
			};
		});
	var to,
		Ci = N(() => {
			(function (e) {
				(e[(e.FIELD = 0)] = 'FIELD'), (e[(e.RANGE = 1)] = 'RANGE');
			})(to || (to = {}));
		});
	var Ct,
		xi = N(() => {
			Ge();
			Tr();
			Vt();
			ko();
			Rr();
			Ci();
			Me();
			Ct = class {
				static encode(t) {
					let o = [],
						n = [],
						r = U.encode(t.maxId, R.maxId),
						s = '',
						i,
						a = R.maxId + R.encodingType,
						l = a + t.maxId,
						u = R.vendorId * 2 + R.singleOrRange + R.numEntries,
						m = a + R.numEntries;
					return (
						t.forEach((p, d) => {
							(s += Be.encode(p)),
								(i = t.maxId > u && m < l),
								i &&
									p &&
									(t.has(d + 1)
										? n.length === 0 &&
											(n.push(d), (m += R.singleOrRange), (m += R.vendorId))
										: (n.push(d), (m += R.vendorId), o.push(n), (n = [])));
						}),
						i
							? ((r += String(to.RANGE)), (r += this.buildRangeEncoding(o)))
							: ((r += String(to.FIELD)), (r += s)),
						r
					);
				}
				static decode(t, o) {
					let n,
						r = 0,
						s = U.decode(t.substr(r, R.maxId), R.maxId);
					r += R.maxId;
					let i = U.decode(t.charAt(r), R.encodingType);
					if (((r += R.encodingType), i === to.RANGE)) {
						if (((n = new Re()), o === 1)) {
							if (t.substr(r, 1) === '1')
								throw new _e('Unable to decode default consent=1');
							r++;
						}
						let a = U.decode(t.substr(r, R.numEntries), R.numEntries);
						r += R.numEntries;
						for (let l = 0; l < a; l++) {
							let u = Be.decode(t.charAt(r));
							r += R.singleOrRange;
							let m = U.decode(t.substr(r, R.vendorId), R.vendorId);
							if (((r += R.vendorId), u)) {
								let p = U.decode(t.substr(r, R.vendorId), R.vendorId);
								r += R.vendorId;
								for (let d = m; d <= p; d++) n.set(d);
							} else n.set(m);
						}
					} else {
						let a = t.substr(r, s);
						(r += s), (n = Ke.decode(a, s));
					}
					return (n.bitLength = r), n;
				}
				static buildRangeEncoding(t) {
					let o = t.length,
						n = U.encode(o, R.numEntries);
					return (
						t.forEach((r) => {
							let s = r.length === 1;
							(n += Be.encode(!s)),
								(n += U.encode(r[0], R.vendorId)),
								s || (n += U.encode(r[1], R.vendorId));
						}),
						n
					);
				}
			};
		});
	function Ar() {
		return {
			[w.version]: U,
			[w.created]: wo,
			[w.lastUpdated]: wo,
			[w.cmpId]: U,
			[w.cmpVersion]: U,
			[w.consentScreen]: U,
			[w.consentLanguage]: Io,
			[w.vendorListVersion]: U,
			[w.policyVersion]: U,
			[w.isServiceSpecific]: Be,
			[w.useNonStandardTexts]: Be,
			[w.specialFeatureOptins]: Ke,
			[w.purposeConsents]: Ke,
			[w.purposeLegitimateInterests]: Ke,
			[w.purposeOneTreatment]: Be,
			[w.publisherCountryCode]: Io,
			[w.vendorConsents]: Ct,
			[w.vendorLegitimateInterests]: Ct,
			[w.publisherRestrictions]: Cn,
			segmentType: U,
			[w.vendorsDisclosed]: Ct,
			[w.vendorsAllowed]: Ct,
			[w.publisherConsents]: Ke,
			[w.publisherLegitimateInterests]: Ke,
			[w.numCustomPurposes]: U,
			[w.publisherCustomConsents]: Ke,
			[w.publisherCustomLegitimateInterests]: Ke,
		};
	}
	var Kl = N(() => {
		Ge();
		ko();
		hi();
		Rr();
		Vt();
		vi();
		yi();
		xi();
	});
	var Si = N(() => {
		ko();
		hi();
		Kl();
		Rr();
		Vt();
		vi();
		yi();
		Ci();
		xi();
	});
	var xn,
		Yl = N(() => {
			Ge();
			xn = class {
				constructor() {
					k(this, 1, {
						[ee.CORE]: [
							w.version,
							w.created,
							w.lastUpdated,
							w.cmpId,
							w.cmpVersion,
							w.consentScreen,
							w.consentLanguage,
							w.vendorListVersion,
							w.purposeConsents,
							w.vendorConsents,
						],
					});
					k(this, 2, {
						[ee.CORE]: [
							w.version,
							w.created,
							w.lastUpdated,
							w.cmpId,
							w.cmpVersion,
							w.consentScreen,
							w.consentLanguage,
							w.vendorListVersion,
							w.policyVersion,
							w.isServiceSpecific,
							w.useNonStandardTexts,
							w.specialFeatureOptins,
							w.purposeConsents,
							w.purposeLegitimateInterests,
							w.purposeOneTreatment,
							w.publisherCountryCode,
							w.vendorConsents,
							w.vendorLegitimateInterests,
							w.publisherRestrictions,
						],
						[ee.VENDORS_DISCLOSED]: [w.vendorsDisclosed],
						[ee.PUBLISHER_TC]: [
							w.publisherConsents,
							w.publisherLegitimateInterests,
							w.numCustomPurposes,
							w.publisherCustomConsents,
							w.publisherCustomLegitimateInterests,
						],
						[ee.VENDORS_ALLOWED]: [w.vendorsAllowed],
					});
				}
			};
		});
	var Sn,
		Zl = N(() => {
			Ge();
			Sn = class {
				constructor(t, o) {
					k(this, 1, [ee.CORE]);
					k(this, 2, [ee.CORE]);
					if (t.version === 2)
						if (t.isServiceSpecific)
							this[2].push(ee.VENDORS_DISCLOSED), this[2].push(ee.PUBLISHER_TC);
						else {
							let n = !!(o && o.isForVendors);
							(!n || t[w.supportOOB] === !0) &&
								this[2].push(ee.VENDORS_DISCLOSED),
								n &&
									(t[w.supportOOB] &&
										t[w.vendorsAllowed].size > 0 &&
										this[2].push(ee.VENDORS_ALLOWED),
									this[2].push(ee.PUBLISHER_TC));
						}
				}
			};
		});
	var Xl = N(() => {});
	var ki = N(() => {
		Yl();
		Zl();
		Xl();
	});
	var oo,
		Jl = N(() => {
			pi();
			_r();
			Si();
			ki();
			Me();
			mi();
			Ge();
			oo = class {
				static encode(t, o) {
					let n;
					try {
						n = this.fieldSequence[String(t.version)][o];
					} catch {
						throw new Pe(
							`Unable to encode version: ${t.version}, segment: ${o}`
						);
					}
					let r = '';
					o !== ee.CORE && (r = U.encode(Et.KEY_TO_ID[o], R.segmentType));
					let s = Ar();
					return (
						n.forEach((i) => {
							let a = t[i],
								l = s[i],
								u = R[i];
							u === void 0 &&
								this.isPublisherCustom(i) &&
								(u = Number(t[w.numCustomPurposes]));
							try {
								r += l.encode(a, u);
							} catch (m) {
								throw new Pe(`Error encoding ${o}->${i}: ${m.message}`);
							}
						}),
						Qe.encode(r)
					);
				}
				static decode(t, o, n) {
					let r = Qe.decode(t),
						s = 0;
					n === ee.CORE &&
						(o.version = U.decode(r.substr(s, R[w.version]), R[w.version])),
						n !== ee.CORE && (s += R.segmentType);
					let i = this.fieldSequence[String(o.version)][n],
						a = Ar();
					return (
						i.forEach((l) => {
							let u = a[l],
								m = R[l];
							if (
								(m === void 0 &&
									this.isPublisherCustom(l) &&
									(m = Number(o[w.numCustomPurposes])),
								m !== 0)
							) {
								let p = r.substr(s, m);
								if (
									(u === Ct
										? (o[l] = u.decode(p, o.version))
										: (o[l] = u.decode(p, m)),
									Number.isInteger(m))
								)
									s += m;
								else if (Number.isInteger(o[l].bitLength)) s += o[l].bitLength;
								else throw new _e(l);
							}
						}),
						o
					);
				}
				static isPublisherCustom(t) {
					return t.indexOf('publisherCustom') === 0;
				}
			};
			k(oo, 'fieldSequence', new xn());
		});
	var _o,
		Ql = N(() => {
			Me();
			Ge();
			_o = class {
				static process(t, o) {
					let n = t.gvl;
					if (!n) throw new Pe('Unable to encode TCModel without a GVL');
					if (!n.isReady)
						throw new Pe(
							'Unable to encode TCModel tcModel.gvl.readyPromise is not resolved'
						);
					(t = t.clone()),
						(t.consentLanguage = n.language.slice(0, 2).toUpperCase()),
						o?.version > 0 && o?.version <= this.processor.length
							? (t.version = o.version)
							: (t.version = this.processor.length);
					let r = t.version - 1;
					if (!this.processor[r]) throw new Pe(`Invalid version: ${t.version}`);
					return this.processor[r](t, n);
				}
			};
			k(_o, 'processor', [
				(t) => t,
				(t, o) => {
					(t.publisherRestrictions.gvl = o),
						t.purposeLegitimateInterests.unset([1, 3, 4, 5, 6]);
					let n = new Map();
					return (
						n.set('legIntPurposes', t.vendorLegitimateInterests),
						n.set('purposes', t.vendorConsents),
						n.forEach((r, s) => {
							r.forEach((i, a) => {
								if (i) {
									let l = o.vendors[a];
									if (!l || l.deletedDate) r.unset(a);
									else if (l[s].length === 0)
										if (
											s === 'legIntPurposes' &&
											l.purposes.length === 0 &&
											l.legIntPurposes.length === 0 &&
											l.specialPurposes.length > 0
										)
											r.set(a);
										else if (
											s === 'legIntPurposes' &&
											l.purposes.length > 0 &&
											l.legIntPurposes.length === 0 &&
											l.specialPurposes.length > 0
										)
											r.set(a);
										else if (t.isServiceSpecific)
											if (l.flexiblePurposes.length === 0) r.unset(a);
											else {
												let u = t.publisherRestrictions.getRestrictions(a),
													m = !1;
												for (let p = 0, d = u.length; p < d && !m; p++)
													m =
														(u[p].restrictionType === ze.REQUIRE_CONSENT &&
															s === 'purposes') ||
														(u[p].restrictionType === ze.REQUIRE_LI &&
															s === 'legIntPurposes');
												m || r.unset(a);
											}
										else r.unset(a);
								}
							});
						}),
						t
					);
				},
			]);
		});
	var Tr = N(() => {
		pi();
		_r();
		ql();
		Jl();
		Ql();
		Si();
		ki();
	});
	var kn,
		wi = N(() => {
			kn = class {
				static absCall(t, o, n, r) {
					return new Promise((s, i) => {
						let a = new XMLHttpRequest(),
							l = () => {
								if (a.readyState == XMLHttpRequest.DONE)
									if (a.status >= 200 && a.status < 300) {
										let d = a.response;
										if (typeof d == 'string')
											try {
												d = JSON.parse(d);
											} catch {}
										s(d);
									} else
										i(
											new Error(
												`HTTP Status: ${a.status} response type: ${a.responseType}`
											)
										);
							},
							u = () => {
								i(new Error('error'));
							},
							m = () => {
								i(new Error('aborted'));
							},
							p = () => {
								i(new Error('Timeout ' + r + 'ms ' + t));
							};
						(a.withCredentials = n),
							a.addEventListener('load', l),
							a.addEventListener('error', u),
							a.addEventListener('abort', m),
							o === null ? a.open('GET', t, !0) : a.open('POST', t, !0),
							(a.responseType = 'json'),
							(a.timeout = r),
							(a.ontimeout = p),
							a.send(o);
					});
				}
				static post(t, o, n = !1, r = 0) {
					return this.absCall(t, JSON.stringify(o), n, r);
				}
				static fetch(t, o = !1, n = 0) {
					return this.absCall(t, null, o, n);
				}
			};
		});
	var F,
		no,
		Ii = N(() => {
			Qt();
			Me();
			wi();
			Ge();
			F = class F extends qe {
				constructor(o, n) {
					super();
					k(this, 'readyPromise');
					k(this, 'gvlSpecificationVersion');
					k(this, 'vendorListVersion');
					k(this, 'tcfPolicyVersion');
					k(this, 'lastUpdated');
					k(this, 'purposes');
					k(this, 'specialPurposes');
					k(this, 'features');
					k(this, 'specialFeatures');
					k(this, 'isReady_', !1);
					k(this, 'vendors_');
					k(this, 'vendorIds');
					k(this, 'fullVendorList');
					k(this, 'byPurposeVendorMap');
					k(this, 'bySpecialPurposeVendorMap');
					k(this, 'byFeatureVendorMap');
					k(this, 'bySpecialFeatureVendorMap');
					k(this, 'stacks');
					k(this, 'dataCategories');
					k(this, 'lang_');
					k(this, 'cacheLang_');
					k(this, 'isLatest', !1);
					let r = F.baseUrl,
						s = n?.language;
					if (s)
						try {
							s = F.consentLanguages.parseLanguage(s);
						} catch (i) {
							throw new ht('Error during parsing the language: ' + i.message);
						}
					if (
						((this.lang_ = s || F.DEFAULT_LANGUAGE),
						(this.cacheLang_ = s || F.DEFAULT_LANGUAGE),
						this.isVendorList(o))
					)
						this.populate(o), (this.readyPromise = Promise.resolve());
					else {
						if (!r)
							throw new ht('must specify GVL.baseUrl before loading GVL json');
						if (o > 0) {
							let i = o;
							F.CACHE.has(i)
								? (this.populate(F.CACHE.get(i)),
									(this.readyPromise = Promise.resolve()))
								: ((r += F.versionedFilename.replace('[VERSION]', String(i))),
									(this.readyPromise = this.fetchJson(r)));
						} else
							F.CACHE.has(F.LATEST_CACHE_KEY)
								? (this.populate(F.CACHE.get(F.LATEST_CACHE_KEY)),
									(this.readyPromise = Promise.resolve()))
								: ((this.isLatest = !0),
									(this.readyPromise = this.fetchJson(r + F.latestFilename)));
					}
				}
				static set baseUrl(o) {
					if (/^https?:\/\/vendorlist\.consensu\.org\//.test(o))
						throw new ht(
							'Invalid baseUrl!  You may not pull directly from vendorlist.consensu.org and must provide your own cache'
						);
					o.length > 0 && o[o.length - 1] !== '/' && (o += '/'),
						(this.baseUrl_ = o);
				}
				static get baseUrl() {
					return this.baseUrl_;
				}
				static emptyLanguageCache(o) {
					let n = !1;
					return (
						o == null && F.LANGUAGE_CACHE.size > 0
							? ((F.LANGUAGE_CACHE = new Map()), (n = !0))
							: typeof o == 'string' &&
								this.consentLanguages.has(o.toUpperCase()) &&
								(F.LANGUAGE_CACHE.delete(o.toUpperCase()), (n = !0)),
						n
					);
				}
				static emptyCache(o) {
					let n = !1;
					return (
						Number.isInteger(o) && o >= 0
							? (F.CACHE.delete(o), (n = !0))
							: o === void 0 && ((F.CACHE = new Map()), (n = !0)),
						n
					);
				}
				cacheLanguage() {
					F.LANGUAGE_CACHE.has(this.cacheLang_) ||
						F.LANGUAGE_CACHE.set(this.cacheLang_, {
							purposes: this.purposes,
							specialPurposes: this.specialPurposes,
							features: this.features,
							specialFeatures: this.specialFeatures,
							stacks: this.stacks,
							dataCategories: this.dataCategories,
						});
				}
				async fetchJson(o) {
					try {
						this.populate(await kn.fetch(o));
					} catch (n) {
						throw new ht(n.message);
					}
				}
				getJson() {
					return {
						gvlSpecificationVersion: this.gvlSpecificationVersion,
						vendorListVersion: this.vendorListVersion,
						tcfPolicyVersion: this.tcfPolicyVersion,
						lastUpdated: this.lastUpdated,
						purposes: this.clonePurposes(),
						specialPurposes: this.cloneSpecialPurposes(),
						features: this.cloneFeatures(),
						specialFeatures: this.cloneSpecialFeatures(),
						stacks: this.cloneStacks(),
						...(this.dataCategories
							? { dataCategories: this.cloneDataCategories() }
							: {}),
						vendors: this.cloneVendors(),
					};
				}
				cloneSpecialFeatures() {
					let o = {};
					for (let n of Object.keys(this.specialFeatures))
						o[n] = F.cloneFeature(this.specialFeatures[n]);
					return o;
				}
				cloneFeatures() {
					let o = {};
					for (let n of Object.keys(this.features))
						o[n] = F.cloneFeature(this.features[n]);
					return o;
				}
				cloneStacks() {
					let o = {};
					for (let n of Object.keys(this.stacks))
						o[n] = F.cloneStack(this.stacks[n]);
					return o;
				}
				cloneDataCategories() {
					let o = {};
					for (let n of Object.keys(this.dataCategories))
						o[n] = F.cloneDataCategory(this.dataCategories[n]);
					return o;
				}
				cloneSpecialPurposes() {
					let o = {};
					for (let n of Object.keys(this.specialPurposes))
						o[n] = F.clonePurpose(this.specialPurposes[n]);
					return o;
				}
				clonePurposes() {
					let o = {};
					for (let n of Object.keys(this.purposes))
						o[n] = F.clonePurpose(this.purposes[n]);
					return o;
				}
				static clonePurpose(o) {
					return {
						id: o.id,
						name: o.name,
						description: o.description,
						...(o.descriptionLegal
							? { descriptionLegal: o.descriptionLegal }
							: {}),
						...(o.illustrations
							? { illustrations: Array.from(o.illustrations) }
							: {}),
					};
				}
				static cloneFeature(o) {
					return {
						id: o.id,
						name: o.name,
						description: o.description,
						...(o.descriptionLegal
							? { descriptionLegal: o.descriptionLegal }
							: {}),
						...(o.illustrations
							? { illustrations: Array.from(o.illustrations) }
							: {}),
					};
				}
				static cloneDataCategory(o) {
					return { id: o.id, name: o.name, description: o.description };
				}
				static cloneStack(o) {
					return {
						id: o.id,
						name: o.name,
						description: o.description,
						purposes: Array.from(o.purposes),
						specialFeatures: Array.from(o.specialFeatures),
					};
				}
				static cloneDataRetention(o) {
					return {
						...(typeof o.stdRetention == 'number'
							? { stdRetention: o.stdRetention }
							: {}),
						purposes: { ...o.purposes },
						specialPurposes: { ...o.specialPurposes },
					};
				}
				static cloneVendorUrls(o) {
					return o.map((n) => ({
						langId: n.langId,
						privacy: n.privacy,
						...(n.legIntClaim ? { legIntClaim: n.legIntClaim } : {}),
					}));
				}
				static cloneVendor(o) {
					return {
						id: o.id,
						name: o.name,
						purposes: Array.from(o.purposes),
						legIntPurposes: Array.from(o.legIntPurposes),
						flexiblePurposes: Array.from(o.flexiblePurposes),
						specialPurposes: Array.from(o.specialPurposes),
						features: Array.from(o.features),
						specialFeatures: Array.from(o.specialFeatures),
						...(o.overflow
							? { overflow: { httpGetLimit: o.overflow.httpGetLimit } }
							: {}),
						...(typeof o.cookieMaxAgeSeconds == 'number' ||
						o.cookieMaxAgeSeconds === null
							? { cookieMaxAgeSeconds: o.cookieMaxAgeSeconds }
							: {}),
						...(o.usesCookies !== void 0 ? { usesCookies: o.usesCookies } : {}),
						...(o.policyUrl ? { policyUrl: o.policyUrl } : {}),
						...(o.cookieRefresh !== void 0
							? { cookieRefresh: o.cookieRefresh }
							: {}),
						...(o.usesNonCookieAccess !== void 0
							? { usesNonCookieAccess: o.usesNonCookieAccess }
							: {}),
						...(o.dataRetention
							? { dataRetention: this.cloneDataRetention(o.dataRetention) }
							: {}),
						...(o.urls ? { urls: this.cloneVendorUrls(o.urls) } : {}),
						...(o.dataDeclaration
							? { dataDeclaration: Array.from(o.dataDeclaration) }
							: {}),
						...(o.deviceStorageDisclosureUrl
							? { deviceStorageDisclosureUrl: o.deviceStorageDisclosureUrl }
							: {}),
						...(o.deletedDate ? { deletedDate: o.deletedDate } : {}),
					};
				}
				cloneVendors() {
					let o = {};
					for (let n of Object.keys(this.fullVendorList))
						o[n] = F.cloneVendor(this.fullVendorList[n]);
					return o;
				}
				async changeLanguage(o) {
					let n = o;
					try {
						n = F.consentLanguages.parseLanguage(o);
					} catch (s) {
						throw new ht('Error during parsing the language: ' + s.message);
					}
					let r = o.toUpperCase();
					if (
						!(
							n.toLowerCase() === F.DEFAULT_LANGUAGE.toLowerCase() &&
							!F.LANGUAGE_CACHE.has(r)
						) &&
						n !== this.lang_
					)
						if (((this.lang_ = n), F.LANGUAGE_CACHE.has(r))) {
							let s = F.LANGUAGE_CACHE.get(r);
							for (let i in s) s.hasOwnProperty(i) && (this[i] = s[i]);
						} else {
							let s =
								F.baseUrl +
								F.languageFilename.replace('[LANG]', this.lang_.toLowerCase());
							try {
								await this.fetchJson(s),
									(this.cacheLang_ = r),
									this.cacheLanguage();
							} catch (i) {
								throw new ht('unable to load language: ' + i.message);
							}
						}
				}
				get language() {
					return this.lang_;
				}
				isVendorList(o) {
					return o !== void 0 && o.vendors !== void 0;
				}
				populate(o) {
					(this.purposes = o.purposes),
						(this.specialPurposes = o.specialPurposes),
						(this.features = o.features),
						(this.specialFeatures = o.specialFeatures),
						(this.stacks = o.stacks),
						(this.dataCategories = o.dataCategories),
						this.isVendorList(o) &&
							((this.gvlSpecificationVersion = o.gvlSpecificationVersion),
							(this.tcfPolicyVersion = o.tcfPolicyVersion),
							(this.vendorListVersion = o.vendorListVersion),
							(this.lastUpdated = o.lastUpdated),
							typeof this.lastUpdated == 'string' &&
								(this.lastUpdated = new Date(this.lastUpdated)),
							(this.vendors_ = o.vendors),
							(this.fullVendorList = o.vendors),
							this.mapVendors(),
							(this.isReady_ = !0),
							this.isLatest && F.CACHE.set(F.LATEST_CACHE_KEY, this.getJson()),
							F.CACHE.has(this.vendorListVersion) ||
								F.CACHE.set(this.vendorListVersion, this.getJson())),
						this.cacheLanguage();
				}
				mapVendors(o) {
					(this.byPurposeVendorMap = {}),
						(this.bySpecialPurposeVendorMap = {}),
						(this.byFeatureVendorMap = {}),
						(this.bySpecialFeatureVendorMap = {}),
						Object.keys(this.purposes).forEach((n) => {
							this.byPurposeVendorMap[n] = {
								legInt: new Set(),
								consent: new Set(),
								flexible: new Set(),
							};
						}),
						Object.keys(this.specialPurposes).forEach((n) => {
							this.bySpecialPurposeVendorMap[n] = new Set();
						}),
						Object.keys(this.features).forEach((n) => {
							this.byFeatureVendorMap[n] = new Set();
						}),
						Object.keys(this.specialFeatures).forEach((n) => {
							this.bySpecialFeatureVendorMap[n] = new Set();
						}),
						Array.isArray(o) ||
							(o = Object.keys(this.fullVendorList).map((n) => +n)),
						(this.vendorIds = new Set(o)),
						(this.vendors_ = o.reduce((n, r) => {
							let s = this.vendors_[String(r)];
							return (
								s &&
									s.deletedDate === void 0 &&
									(s.purposes.forEach((i) => {
										this.byPurposeVendorMap[String(i)].consent.add(r);
									}),
									s.specialPurposes.forEach((i) => {
										this.bySpecialPurposeVendorMap[String(i)].add(r);
									}),
									s.legIntPurposes.forEach((i) => {
										this.byPurposeVendorMap[String(i)].legInt.add(r);
									}),
									s.flexiblePurposes &&
										s.flexiblePurposes.forEach((i) => {
											this.byPurposeVendorMap[String(i)].flexible.add(r);
										}),
									s.features.forEach((i) => {
										this.byFeatureVendorMap[String(i)].add(r);
									}),
									s.specialFeatures.forEach((i) => {
										this.bySpecialFeatureVendorMap[String(i)].add(r);
									}),
									(n[r] = s)),
								n
							);
						}, {}));
				}
				getFilteredVendors(o, n, r, s) {
					let i = o.charAt(0).toUpperCase() + o.slice(1),
						a,
						l = {};
					return (
						o === 'purpose' && r
							? (a = this['by' + i + 'VendorMap'][String(n)][r])
							: (a =
									this['by' + (s ? 'Special' : '') + i + 'VendorMap'][
										String(n)
									]),
						a.forEach((u) => {
							l[String(u)] = this.vendors[String(u)];
						}),
						l
					);
				}
				getVendorsWithConsentPurpose(o) {
					return this.getFilteredVendors('purpose', o, 'consent');
				}
				getVendorsWithLegIntPurpose(o) {
					return this.getFilteredVendors('purpose', o, 'legInt');
				}
				getVendorsWithFlexiblePurpose(o) {
					return this.getFilteredVendors('purpose', o, 'flexible');
				}
				getVendorsWithSpecialPurpose(o) {
					return this.getFilteredVendors('purpose', o, void 0, !0);
				}
				getVendorsWithFeature(o) {
					return this.getFilteredVendors('feature', o);
				}
				getVendorsWithSpecialFeature(o) {
					return this.getFilteredVendors('feature', o, void 0, !0);
				}
				get vendors() {
					return this.vendors_;
				}
				narrowVendorsTo(o) {
					this.mapVendors(o);
				}
				get isReady() {
					return this.isReady_;
				}
				clone() {
					let o = new F(this.getJson());
					return (
						this.lang_ !== F.DEFAULT_LANGUAGE && o.changeLanguage(this.lang_), o
					);
				}
				static isInstanceOf(o) {
					return typeof o == 'object' && typeof o.narrowVendorsTo == 'function';
				}
			};
			k(F, 'LANGUAGE_CACHE', new Map()),
				k(F, 'CACHE', new Map()),
				k(F, 'LATEST_CACHE_KEY', 0),
				k(F, 'DEFAULT_LANGUAGE', 'EN'),
				k(F, 'consentLanguages', new vn()),
				k(F, 'baseUrl_'),
				k(F, 'latestFilename', 'vendor-list.json'),
				k(F, 'versionedFilename', 'archives/vendor-list-v[VERSION].json'),
				k(F, 'languageFilename', 'purposes-[LANG].json');
			no = F;
		});
	var Ro,
		_i = N(() => {
			Qt();
			Me();
			Ii();
			Ge();
			Ro = class extends qe {
				constructor(o) {
					super();
					k(this, 'isServiceSpecific_', !0);
					k(this, 'supportOOB_', !1);
					k(this, 'useNonStandardTexts_', !1);
					k(this, 'purposeOneTreatment_', !1);
					k(this, 'publisherCountryCode_', 'AA');
					k(this, 'version_', 2);
					k(this, 'consentScreen_', 0);
					k(this, 'policyVersion_', 5);
					k(this, 'consentLanguage_', 'EN');
					k(this, 'cmpId_', 0);
					k(this, 'cmpVersion_', 0);
					k(this, 'vendorListVersion_', 0);
					k(this, 'numCustomPurposes_', 0);
					k(this, 'gvl_');
					k(this, 'created');
					k(this, 'lastUpdated');
					k(this, 'specialFeatureOptins', new Re());
					k(this, 'purposeConsents', new Re());
					k(this, 'purposeLegitimateInterests', new Re());
					k(this, 'publisherConsents', new Re());
					k(this, 'publisherLegitimateInterests', new Re());
					k(this, 'publisherCustomConsents', new Re());
					k(this, 'publisherCustomLegitimateInterests', new Re());
					k(this, 'customPurposes');
					k(this, 'vendorConsents', new Re());
					k(this, 'vendorLegitimateInterests', new Re());
					k(this, 'vendorsDisclosed', new Re());
					k(this, 'vendorsAllowed', new Re());
					k(this, 'publisherRestrictions', new eo());
					o && (this.gvl = o), this.updated();
				}
				set gvl(o) {
					no.isInstanceOf(o) || (o = new no(o)),
						(this.gvl_ = o),
						(this.publisherRestrictions.gvl = o);
				}
				get gvl() {
					return this.gvl_;
				}
				set cmpId(o) {
					if (((o = Number(o)), Number.isInteger(o) && o > 1)) this.cmpId_ = o;
					else throw new je('cmpId', o);
				}
				get cmpId() {
					return this.cmpId_;
				}
				set cmpVersion(o) {
					if (((o = Number(o)), Number.isInteger(o) && o > -1))
						this.cmpVersion_ = o;
					else throw new je('cmpVersion', o);
				}
				get cmpVersion() {
					return this.cmpVersion_;
				}
				set consentScreen(o) {
					if (((o = Number(o)), Number.isInteger(o) && o > -1))
						this.consentScreen_ = o;
					else throw new je('consentScreen', o);
				}
				get consentScreen() {
					return this.consentScreen_;
				}
				set consentLanguage(o) {
					this.consentLanguage_ = o;
				}
				get consentLanguage() {
					return this.consentLanguage_;
				}
				set publisherCountryCode(o) {
					if (/^([A-z]){2}$/.test(o))
						this.publisherCountryCode_ = o.toUpperCase();
					else throw new je('publisherCountryCode', o);
				}
				get publisherCountryCode() {
					return this.publisherCountryCode_;
				}
				set vendorListVersion(o) {
					if (((o = Number(o) >> 0), o < 0))
						throw new je('vendorListVersion', o);
					this.vendorListVersion_ = o;
				}
				get vendorListVersion() {
					return this.gvl
						? this.gvl.vendorListVersion
						: this.vendorListVersion_;
				}
				set policyVersion(o) {
					if (
						((this.policyVersion_ = parseInt(o, 10)), this.policyVersion_ < 0)
					)
						throw new je('policyVersion', o);
				}
				get policyVersion() {
					return this.gvl ? this.gvl.tcfPolicyVersion : this.policyVersion_;
				}
				set version(o) {
					this.version_ = parseInt(o, 10);
				}
				get version() {
					return this.version_;
				}
				set isServiceSpecific(o) {
					this.isServiceSpecific_ = o;
				}
				get isServiceSpecific() {
					return this.isServiceSpecific_;
				}
				set useNonStandardTexts(o) {
					this.useNonStandardTexts_ = o;
				}
				get useNonStandardTexts() {
					return this.useNonStandardTexts_;
				}
				set supportOOB(o) {
					this.supportOOB_ = o;
				}
				get supportOOB() {
					return this.supportOOB_;
				}
				set purposeOneTreatment(o) {
					this.purposeOneTreatment_ = o;
				}
				get purposeOneTreatment() {
					return this.purposeOneTreatment_;
				}
				setAllVendorConsents() {
					this.vendorConsents.set(this.gvl.vendors);
				}
				unsetAllVendorConsents() {
					this.vendorConsents.empty();
				}
				setAllVendorsDisclosed() {
					this.vendorsDisclosed.set(this.gvl.vendors);
				}
				unsetAllVendorsDisclosed() {
					this.vendorsDisclosed.empty();
				}
				setAllVendorsAllowed() {
					this.vendorsAllowed.set(this.gvl.vendors);
				}
				unsetAllVendorsAllowed() {
					this.vendorsAllowed.empty();
				}
				setAllVendorLegitimateInterests() {
					this.vendorLegitimateInterests.set(this.gvl.vendors);
				}
				unsetAllVendorLegitimateInterests() {
					this.vendorLegitimateInterests.empty();
				}
				setAllPurposeConsents() {
					this.purposeConsents.set(this.gvl.purposes);
				}
				unsetAllPurposeConsents() {
					this.purposeConsents.empty();
				}
				setAllPurposeLegitimateInterests() {
					this.purposeLegitimateInterests.set(this.gvl.purposes);
				}
				unsetAllPurposeLegitimateInterests() {
					this.purposeLegitimateInterests.empty();
				}
				setAllSpecialFeatureOptins() {
					this.specialFeatureOptins.set(this.gvl.specialFeatures);
				}
				unsetAllSpecialFeatureOptins() {
					this.specialFeatureOptins.empty();
				}
				setAll() {
					this.setAllVendorConsents(),
						this.setAllPurposeLegitimateInterests(),
						this.setAllSpecialFeatureOptins(),
						this.setAllPurposeConsents(),
						this.setAllVendorLegitimateInterests();
				}
				unsetAll() {
					this.unsetAllVendorConsents(),
						this.unsetAllPurposeLegitimateInterests(),
						this.unsetAllSpecialFeatureOptins(),
						this.unsetAllPurposeConsents(),
						this.unsetAllVendorLegitimateInterests();
				}
				get numCustomPurposes() {
					let o = this.numCustomPurposes_;
					if (typeof this.customPurposes == 'object') {
						let n = Object.keys(this.customPurposes).sort(
							(r, s) => Number(r) - Number(s)
						);
						o = parseInt(n.pop(), 10);
					}
					return o;
				}
				set numCustomPurposes(o) {
					if (
						((this.numCustomPurposes_ = parseInt(o, 10)),
						this.numCustomPurposes_ < 0)
					)
						throw new je('numCustomPurposes', o);
				}
				updated() {
					let o = new Date(),
						n = new Date(
							Date.UTC(o.getUTCFullYear(), o.getUTCMonth(), o.getUTCDate())
						);
					(this.created = n), (this.lastUpdated = n);
				}
			};
			k(Ro, 'consentLanguages', no.consentLanguages);
		});
	var Ri,
		ed = N(() => {
			Tr();
			Ge();
			Vt();
			_i();
			Ri = class {
				static encode(t, o) {
					let n = '',
						r;
					return (
						(t = _o.process(t, o)),
						Array.isArray(o?.segments)
							? (r = o.segments)
							: (r = new Sn(t, o)['' + t.version]),
						r.forEach((s, i) => {
							let a = '';
							i < r.length - 1 && (a = '.'), (n += oo.encode(t, s) + a);
						}),
						n
					);
				}
				static decode(t, o) {
					let n = t.split('.'),
						r = n.length;
					o || (o = new Ro());
					for (let s = 0; s < r; s++) {
						let i = n[s],
							l = Qe.decode(i.charAt(0)).substr(0, R.segmentType),
							u = Et.ID_TO_KEY[U.decode(l, R.segmentType).toString()];
						oo.decode(i, o, u);
					}
					return o;
				}
			};
		});
	var td = {};
	fo(td, {
		Base64Url: () => Qe,
		BitLength: () => R,
		BooleanEncoder: () => Be,
		Cloneable: () => qe,
		ConsentLanguages: () => vn,
		DateEncoder: () => wo,
		DecodingError: () => _e,
		DeviceDisclosureStorageAccessType: () => gi,
		EncodingError: () => Pe,
		FieldEncoderMap: () => Ar,
		FieldSequence: () => xn,
		Fields: () => w,
		FixedVectorEncoder: () => Ke,
		GVL: () => no,
		GVLError: () => ht,
		IntEncoder: () => U,
		Json: () => kn,
		LangEncoder: () => Io,
		PurposeRestriction: () => yt,
		PurposeRestrictionVector: () => eo,
		PurposeRestrictionVectorEncoder: () => Cn,
		RestrictionType: () => ze,
		Segment: () => ee,
		SegmentEncoder: () => oo,
		SegmentIDs: () => Et,
		SegmentSequence: () => Sn,
		SemanticPreEncoder: () => _o,
		TCModel: () => Ro,
		TCModelError: () => je,
		TCString: () => Ri,
		Vector: () => Re,
		VectorEncodingType: () => to,
		VendorVectorEncoder: () => Ct,
	});
	var od = N(() => {
		Tr();
		Me();
		Ge();
		Qt();
		Ii();
		wi();
		_i();
		ed();
	});
	async function wn() {
		return (
			To ||
			ro ||
			((ro = Promise.resolve()
				.then(() => (od(), td))
				.then((e) => ((To = e), (ro = null), e))
				.catch((e) => {
					throw (
						((ro = null),
						new Error(
							`Failed to load @iabtechlabtcf/core: ${e instanceof Error ? e.message : 'Unknown error'}. Make sure it is installed as a dependency.`
						))
					);
				})),
			ro)
		);
	}
	function nd() {
		return To !== null;
	}
	function rd() {
		return To;
	}
	function sd() {
		(To = null), (ro = null);
	}
	var To,
		ro,
		Ti = N(() => {
			'use strict';
			(To = null), (ro = null);
		});
	async function id(e, t, o) {
		let { TCModel: n, TCString: r, GVL: s } = await wn(),
			i = new s(t),
			a = new n(i);
		(a.cmpId = o.cmpId),
			(a.cmpVersion =
				typeof o.cmpVersion == 'number'
					? o.cmpVersion
					: Number.parseInt(String(o.cmpVersion ?? '1'), 10) || 1),
			(a.consentScreen = o.consentScreen ?? 1),
			(a.consentLanguage = o.consentLanguage ?? 'EN'),
			(a.publisherCountryCode = o.publisherCountryCode ?? 'US'),
			(a.isServiceSpecific = o.isServiceSpecific ?? !0);
		for (let [l, u] of Object.entries(e.purposeConsents))
			u && a.purposeConsents.set(Number(l));
		for (let [l, u] of Object.entries(e.purposeLegitimateInterests))
			u && a.purposeLegitimateInterests.set(Number(l));
		for (let [l, u] of Object.entries(e.vendorConsents)) {
			let m = Number(l);
			u && Number.isFinite(m) && a.vendorConsents.set(m);
		}
		for (let [l, u] of Object.entries(e.vendorLegitimateInterests)) {
			let m = Number(l);
			u && Number.isFinite(m) && a.vendorLegitimateInterests.set(m);
		}
		for (let [l, u] of Object.entries(e.specialFeatureOptIns))
			u && a.specialFeatureOptins.set(Number(l));
		for (let [l, u] of Object.entries(e.vendorsDisclosed))
			u && a.vendorsDisclosed.set(Number(l));
		return r.encode(a);
	}
	async function Ao(e) {
		let { TCString: t } = await wn(),
			o = t.decode(e),
			n = (r, s) => {
				let i = {};
				for (let a = 1; a <= s; a++) r.has(a) && (i[a] = !0);
				return i;
			};
		return {
			cmpId: o.cmpId,
			cmpVersion: o.cmpVersion,
			consentLanguage: o.consentLanguage,
			isServiceSpecific: o.isServiceSpecific,
			purposeConsents: n(o.purposeConsents, 11),
			purposeLegitimateInterests: n(o.purposeLegitimateInterests, 11),
			vendorConsents: n(o.vendorConsents, 1e3),
			vendorLegitimateInterests: n(o.vendorLegitimateInterests, 1e3),
			specialFeatureOptIns: n(o.specialFeatureOptins, 2),
			vendorsDisclosed: n(o.vendorsDisclosed, 1e3),
			created: o.created,
			lastUpdated: o.lastUpdated,
			vendorListVersion: o.vendorListVersion,
			policyVersion: o.policyVersion,
		};
	}
	function ad(e) {
		return !(
			!e ||
			typeof e != 'string' ||
			!/^[A-Za-z0-9_-]+$/.test(e) ||
			e.length < 10
		);
	}
	async function cd(e, t) {
		return (await Ao(e)).vendorConsents[t] === !0;
	}
	async function ld(e, t) {
		return (await Ao(e)).purposeConsents[t] === !0;
	}
	var Ai = N(() => {
		'use strict';
		Ti();
	});
	function yf(e, t, o) {
		if (typeof document > 'u') return;
		let n = o * 24 * 60 * 60;
		document.cookie = `${e}=${encodeURIComponent(t)}; max-age=${n}; path=/; SameSite=Lax`;
	}
	function Cf(e) {
		if (typeof document > 'u') return null;
		let t = document.cookie.match(new RegExp(`(^| )${e}=([^;]+)`));
		return t?.[2] ? decodeURIComponent(t[2]) : null;
	}
	function dd(e) {
		let { cmpId: t = Cr, cmpVersion: o = xr, gvl: n, gdprApplies: r = !0 } = e,
			s = '',
			i = 'loading',
			a = 'hidden',
			l = new Map(),
			u = 0,
			m = null;
		async function p(S, A) {
			if (m && m.tcString === s && !S) return m;
			let I = {},
				_ = {},
				O = {},
				B = {},
				E = {};
			if (s)
				try {
					let V = await Ao(s);
					(I = V.purposeConsents),
						(_ = V.purposeLegitimateInterests),
						(O = V.vendorConsents),
						(B = V.vendorLegitimateInterests),
						(E = V.specialFeatureOptIns);
				} catch {}
			let L = typeof o == 'number' ? o : Number.parseInt(String(o), 10) || 1,
				H = {
					tcString: s,
					tcfPolicyVersion: n.tcfPolicyVersion,
					cmpId: t,
					cmpVersion: L,
					gdprApplies: r,
					listenerId: A,
					eventStatus: S,
					cmpStatus: i,
					isServiceSpecific: !0,
					useNonStandardTexts: !1,
					publisherCC: 'US',
					purposeOneTreatment: !1,
					purpose: { consents: I, legitimateInterests: _ },
					vendor: { consents: O, legitimateInterests: B },
					specialFeatureOptins: E,
					publisher: {
						consents: {},
						legitimateInterests: {},
						customPurpose: { consents: {}, legitimateInterests: {} },
						restrictions: {},
					},
				};
			return S || (m = H), H;
		}
		function d(S) {
			let A = {
				gdprApplies: r,
				cmpLoaded: i === 'loaded',
				cmpStatus: i,
				displayStatus: a,
				apiVersion: '2.3',
				cmpVersion: typeof o == 'string' ? o : String(o),
				cmpId: t,
				gvlVersion: n.vendorListVersion,
				tcfPolicyVersion: n.tcfPolicyVersion,
			};
			S(A, !0);
		}
		async function f(S, A) {
			let I = await p();
			S(I, !0);
		}
		async function h(S) {
			return f(S);
		}
		function x(S, A) {
			S(n, !0);
		}
		async function b(S) {
			let A = u++;
			l.set(A, S);
			let I = await p('tcloaded', A);
			S(I, !0);
		}
		function y(S, A) {
			let I = l.has(A);
			l.delete(A), S(I, !0);
		}
		async function C(S) {
			for (let [A, I] of l) {
				let _ = await p(S, A);
				I(_, !0);
			}
		}
		function g() {
			if (typeof window > 'u') return;
			let S = kr();
			(window.__tcfapi = (A, I, _, O) => {
				switch (A) {
					case 'ping':
						d(_);
						break;
					case 'getTCData':
						f(_, O);
						break;
					case 'getInAppTCData':
						h(_);
						break;
					case 'getVendorList':
						x(_, O);
						break;
					case 'addEventListener':
						b(_);
						break;
					case 'removeEventListener':
						y(_, O);
						break;
					default:
						_(null, !1);
				}
			}),
				wr();
			for (let A of S) window.__tcfapi?.(...A);
			i = 'loaded';
		}
		return (
			g(),
			{
				updateConsent: (S) => {
					(s = S), (m = null), (i = 'loaded'), C('useractioncomplete');
				},
				setDisplayStatus: (S) => {
					(a = S), S === 'visible' && C('cmpuishown');
				},
				loadFromStorage: () => {
					let S = Cf(Yt.TC_STRING_COOKIE);
					if (S) return (s = S), (m = null), C('tcloaded'), S;
					if (typeof localStorage < 'u')
						try {
							let A = localStorage.getItem(Yt.TC_STRING_LOCAL);
							if (A) return (s = A), (m = null), C('tcloaded'), A;
						} catch {}
					return null;
				},
				saveToStorage: (S) => {
					if ((yf(Yt.TC_STRING_COOKIE, S, 395), typeof localStorage < 'u'))
						try {
							localStorage.setItem(Yt.TC_STRING_LOCAL, S);
						} catch {}
				},
				getTcString: () => s,
				destroy: () => {
					l.clear(), (m = null), typeof window < 'u' && delete window.__tcfapi;
				},
			}
		);
	}
	var ud = N(() => {
		'use strict';
		di();
		ui();
		Ai();
		or();
	});
	function pd(e) {
		return Li[e] ?? null;
	}
	function md(e) {
		return In[e] ?? [];
	}
	function fd(e) {
		let t = {};
		for (let [o, n] of Object.entries(e)) {
			let r = In[o];
			if (r) for (let s of r) t[s] = n;
		}
		return t;
	}
	function gd(e) {
		let t = {
			necessary: !1,
			marketing: !1,
			experience: !1,
			measurement: !1,
			functionality: !1,
		};
		for (let [o, n] of Object.entries(In)) {
			let r = n.every((s) => e[s] === !0);
			t[o] = r;
		}
		return t;
	}
	function bd(e, t = []) {
		return {
			consentRequired: e,
			legitInterest: t,
			all: [...new Set([...e, ...t])],
		};
	}
	function hd(e, t, o, n) {
		let r = e.every((i) => o[i] === !0),
			s = t.every((i) => n[i] === !0);
		return r && s;
	}
	var Li,
		In,
		vd = N(() => {
			'use strict';
			(Li = {
				1: 'necessary',
				2: 'marketing',
				3: 'marketing',
				4: 'marketing',
				5: 'experience',
				6: 'experience',
				7: 'measurement',
				8: 'measurement',
				9: 'measurement',
				10: 'functionality',
				11: 'functionality',
			}),
				(In = {
					necessary: [1],
					marketing: [2, 3, 4],
					experience: [5, 6],
					measurement: [7, 8, 9],
					functionality: [10, 11],
				});
		});
	function Ei(e, t) {
		let o = Array.isArray(e) ? e : Object.values(e),
			n = new Map();
		for (let m of o) n.set(m.id, m);
		let r = t ?? _n,
			s = new Set(),
			i = [],
			a = n.get(1);
		a && (i.push(a), s.add(1));
		let l = [];
		for (let m of Object.values(r)) {
			let p = [];
			for (let d of m.purposes) {
				if (d === 1) continue;
				let f = n.get(d);
				f && (p.push(f), s.add(d));
			}
			p.length > 0 && l.push({ ...m, resolvedPurposes: p });
		}
		let u = [];
		for (let m of o) s.has(m.id) || u.push(m);
		return { stacks: l, standalonePurposes: i, ungroupedPurposes: u };
	}
	function Cd(e, t) {
		if (e === 1) return null;
		let o = t ?? _n;
		for (let n of Object.values(o)) if (n.purposes.includes(e)) return n;
		return null;
	}
	function xd(e) {
		return e === 1;
	}
	function Sd(e, t, o) {
		let r = (o ?? _n)[e];
		if (!r) return [];
		let s = Array.isArray(t) ? t : Object.values(t),
			i = new Map();
		for (let a of s) i.set(a.id, a);
		return r.purposes
			.filter((a) => a !== 1)
			.map((a) => i.get(a))
			.filter((a) => a !== void 0);
	}
	function kd(e, t) {
		let { standalonePurposes: o, stacks: n, ungroupedPurposes: r } = Ei(e, t),
			s = [];
		s.push(...o);
		for (let i of n) s.push(...i.resolvedPurposes);
		return s.push(...r), s;
	}
	function wd(e) {
		return Object.values(e).sort((t, o) => t.id - o.id);
	}
	var yd,
		_n,
		Id = N(() => {
			'use strict';
			(yd = 1),
				(_n = {
					1: {
						id: 1,
						name: 'Advertising',
						description: 'Advertising selection, delivery, and reporting',
						purposes: [2, 3, 4],
						specialFeatures: [],
					},
					2: {
						id: 2,
						name: 'Content Personalization',
						description: 'Content selection and personalization',
						purposes: [5, 6, 11],
						specialFeatures: [],
					},
					3: {
						id: 3,
						name: 'Measurement',
						description: 'Performance measurement and analytics',
						purposes: [7, 8, 9],
						specialFeatures: [],
					},
					4: {
						id: 4,
						name: 'Product Development',
						description: 'Product and service development',
						purposes: [10],
						specialFeatures: [],
					},
				});
		});
	var Ld = {};
	fo(Ld, {
		createIABActions: () => Ad,
		createIABManager: () => Ni,
		createInitialIABState: () => Td,
	});
	function Td(e) {
		return {
			config: e,
			gvl: null,
			isLoadingGVL: !1,
			nonIABVendors: [],
			tcString: null,
			vendorConsents: {},
			vendorLegitimateInterests: {},
			purposeConsents: {},
			purposeLegitimateInterests: {},
			specialFeatureOptIns: {},
			vendorsDisclosed: {},
			cmpApi: null,
			preferenceCenterTab: 'purposes',
		};
	}
	function Ad(e, t, o) {
		let n = (r) => {
			let { iab: s } = e();
			s && t({ iab: { ...s, ...r } });
		};
		return {
			_updateState: n,
			setPurposeConsent: (r, s) => {
				let { iab: i } = e();
				i && n({ purposeConsents: { ...i.purposeConsents, [r]: s } });
			},
			setPurposeLegitimateInterest: (r, s) => {
				let { iab: i } = e();
				i &&
					n({
						purposeLegitimateInterests: {
							...i.purposeLegitimateInterests,
							[r]: s,
						},
					});
			},
			setVendorConsent: (r, s) => {
				let { iab: i } = e();
				i && n({ vendorConsents: { ...i.vendorConsents, [String(r)]: s } });
			},
			setVendorLegitimateInterest: (r, s) => {
				let { iab: i } = e();
				i &&
					n({
						vendorLegitimateInterests: {
							...i.vendorLegitimateInterests,
							[String(r)]: s,
						},
					});
			},
			setSpecialFeatureOptIn: (r, s) => {
				let { iab: i } = e();
				i && n({ specialFeatureOptIns: { ...i.specialFeatureOptIns, [r]: s } });
			},
			setPreferenceCenterTab: (r) => {
				n({ preferenceCenterTab: r });
			},
			acceptAll: () => {
				let { iab: r } = e();
				if (!r?.gvl) return;
				let { purposeConsents: s, purposeLegitimateInterests: i } = xf(
						r.gvl,
						!0
					),
					{ vendorConsents: a, vendorLegitimateInterests: l } = _d(
						r.gvl,
						r.nonIABVendors,
						!0
					),
					u = Rd(r.gvl, !0);
				n({
					purposeConsents: s,
					purposeLegitimateInterests: i,
					vendorConsents: a,
					vendorLegitimateInterests: l,
					specialFeatureOptIns: u,
				});
			},
			rejectAll: () => {
				let { iab: r } = e();
				if (!r?.gvl) return;
				let s = { 1: !0 },
					i = {};
				for (let m of Object.keys(r.gvl.purposes))
					Number(m) !== 1 && ((s[Number(m)] = !1), (i[Number(m)] = !1));
				let { vendorConsents: a, vendorLegitimateInterests: l } = _d(
						r.gvl,
						r.nonIABVendors,
						!1
					),
					u = Rd(r.gvl, !1);
				n({
					purposeConsents: s,
					purposeLegitimateInterests: i,
					vendorConsents: a,
					vendorLegitimateInterests: l,
					specialFeatureOptIns: u,
				});
			},
			save: async () => {
				let { iab: r, locationInfo: s, user: i, callbacks: a } = e();
				if (!r?.cmpApi || !r.gvl) return;
				let {
						config: l,
						gvl: u,
						cmpApi: m,
						purposeConsents: p,
						purposeLegitimateInterests: d,
						vendorConsents: f,
						vendorLegitimateInterests: h,
						specialFeatureOptIns: x,
					} = r,
					{ generateTCString: b, iabPurposesToC15tConsents: y } =
						await Promise.resolve().then(() => (Er(), Lr)),
					C = {};
				for (let E of Object.keys(u.vendors)) C[Number(E)] = !0;
				let g = await b(
					{
						purposeConsents: p,
						purposeLegitimateInterests: d,
						vendorConsents: f,
						vendorLegitimateInterests: h,
						specialFeatureOptIns: x,
						vendorsDisclosed: C,
					},
					u,
					{
						cmpId: l.cmpId ?? Cr,
						cmpVersion: l.cmpVersion ?? xr,
						publisherCountryCode: l.publisherCountryCode ?? 'GB',
						isServiceSpecific: l.isServiceSpecific ?? !0,
					}
				);
				m.saveToStorage(g), m.updateConsent(g);
				let S = y(p),
					A = Date.now();
				n({ tcString: g, vendorsDisclosed: C });
				let I = e().consentInfo?.subjectId;
				I || (I = fn()),
					t({
						consents: S,
						selectedConsents: S,
						activeUI: 'none',
						consentInfo: {
							time: A,
							subjectId: I,
							externalId: i?.id,
							identityProvider: i?.identityProvider,
						},
					});
				let _ = {},
					O = {};
				for (let E of r.nonIABVendors) {
					let L = String(E.id);
					E.purposes && E.purposes.length > 0 && (_[L] = f[L] ?? !1),
						E.legIntPurposes &&
							E.legIntPurposes.length > 0 &&
							(O[L] = h[L] ?? !0);
				}
				lt(
					{
						consents: S,
						consentInfo: {
							time: A,
							subjectId: I,
							externalId: i?.id,
							identityProvider: i?.identityProvider,
						},
						iabCustomVendorConsents: _,
						iabCustomVendorLegitimateInterests: O,
					},
					void 0,
					e().storageConfig
				),
					e().updateScripts();
				let B = await o.setConsent({
					body: {
						subjectId: I,
						givenAt: A,
						type: 'cookie_banner',
						domain: typeof window < 'u' ? window.location.hostname : '',
						preferences: S,
						externalSubjectId: i?.id,
						identityProvider: i?.identityProvider,
						tcString: g,
						jurisdiction: s?.jurisdiction ?? void 0,
						jurisdictionModel: 'iab',
						metadata: { source: 'iab_tcf', acceptanceMethod: 'iab' },
					},
				});
				if (!B.ok) {
					let E = B.error?.message ?? 'Failed to save IAB consents';
					a.onError?.({ error: E }), a.onError || console.error(E);
				}
			},
		};
	}
	function Ni(e, t, o, n) {
		let r = Td(e),
			s = Ad(t, o, n);
		return { ...r, ...s };
	}
	function xf(e, t) {
		let o = {},
			n = {};
		for (let r of Object.keys(e.purposes))
			(o[Number(r)] = t), (n[Number(r)] = t);
		return { purposeConsents: o, purposeLegitimateInterests: n };
	}
	function _d(e, t, o) {
		let n = {},
			r = {};
		for (let [s, i] of Object.entries(e.vendors)) {
			let a = String(s);
			i.purposes && i.purposes.length > 0 && (n[a] = o),
				i.legIntPurposes && i.legIntPurposes.length > 0 && (r[a] = o);
		}
		return (
			t.forEach((s) => {
				let i = String(s.id);
				s.purposes && s.purposes.length > 0 && (n[i] = o),
					s.legIntPurposes && s.legIntPurposes.length > 0 && (r[i] = o);
			}),
			{ vendorConsents: n, vendorLegitimateInterests: r }
		);
	}
	function Rd(e, t) {
		let o = {};
		for (let n of Object.keys(e.specialFeatures)) o[Number(n)] = t;
		return o;
	}
	var Pi = N(() => {
		'use strict';
		jt();
		ar();
		di();
	});
	var Lr = {};
	fo(Lr, {
		C15T_TO_IAB_PURPOSE_MAP: () => In,
		DEFAULT_STACKS: () => _n,
		GVL_ENDPOINT: () => tr,
		IAB_PURPOSE_TO_C15T_MAP: () => Li,
		IAB_STORAGE_KEYS: () => Yt,
		STANDALONE_PURPOSE_ID: () => yd,
		c15tConsentsToIabPurposes: () => fd,
		c15tToIabPurposes: () => md,
		categorizeVendorPurposes: () => bd,
		clearGVLCache: () => ei,
		clearStubQueue: () => wr,
		createCMPApi: () => dd,
		createIABManager: () => Ni,
		decodeTCString: () => Ao,
		destroyIABStub: () => nl,
		fetchGVL: () => Js,
		flattenPurposesByStack: () => kd,
		generateTCString: () => id,
		getCachedGVL: () => Qs,
		getPurposesInStack: () => Sd,
		getStackForPurpose: () => Cd,
		getStubQueue: () => kr,
		getTCFCore: () => wn,
		getTCFCoreSync: () => rd,
		groupPurposesIntoStacks: () => Ei,
		hasPurposeConsent: () => ld,
		hasVendorConsent: () => cd,
		iabPurposeToC15t: () => pd,
		iabPurposesToC15tConsents: () => gd,
		initializeIABStub: () => tl,
		isStandalonePurpose: () => xd,
		isStubActive: () => ol,
		isStubInitialized: () => rl,
		isTCFCoreLoaded: () => nd,
		isValidTCStringFormat: () => ad,
		purposesToArray: () => wd,
		resetTCFCoreCache: () => sd,
		setMockGVL: () => ti,
		vendorHasRequiredConsents: () => hd,
	});
	var Er = N(() => {
		'use strict';
		ud();
		rr();
		Ti();
		vd();
		Id();
		Pi();
		ui();
		Ai();
		or();
	});
	var Jv = {};
	fo(Jv, {
		EMBED_PAYLOAD_EVENT: () => Bm,
		bootstrapEmbedRuntime: () => Dm,
		createEmbedRuntime: () => jm,
		initializeEmbedRuntime: () => nc,
		mountEmbedRuntime: () => oc,
		readEmbedPayload: () => Qa,
		registerEmbedIABComponents: () => tc,
		resetEmbedIABComponents: () => Zv,
		resolveBackendURL: () => Om,
		unmountEmbedRuntime: () => ec,
	});
	var on = /^\/+/;
	function nn(e, t = null, o = null, n = null) {
		return { data: t, error: o, ok: e, response: n };
	}
	function gc(e, t = 500, o = 'ERROR', n) {
		return nn(!1, null, { message: e, status: t, code: o, cause: n }, null);
	}
	var at = {
			maxRetries: 3,
			initialDelayMs: 100,
			backoffFactor: 2,
			retryableStatusCodes: [500, 502, 503, 504],
			nonRetryableStatusCodes: [400, 401, 403, 404],
			retryOnNetworkError: !0,
			shouldRetry: void 0,
		},
		bc = /^(?:[a-z+]+:)?\/\//i,
		Vs = on;
	Kt();
	var go = (e) => new Promise((t) => setTimeout(t, e));
	function xc() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (e) => {
			let t = (Math.random() * 16) | 0;
			return (e === 'x' ? t : (t & 3) | 8).toString(16);
		});
	}
	function Sc(e) {
		let t = e.length;
		for (; t > 0 && e[t - 1] === '/'; ) t--;
		return e.slice(0, t);
	}
	function Ym(e, t) {
		if (bc.test(e)) {
			let r = new URL(e),
				s = Sc(r.pathname),
				i = t.replace(Vs, ''),
				a = `${s}/${i}`;
			return (r.pathname = a), r.toString();
		}
		let o = Sc(e),
			n = t.replace(Vs, '');
		return `${o}/${n}`;
	}
	var ct = nn;
	async function At(e, t, o) {
		let n = {
				...e.retryConfig,
				...(o?.retryConfig || {}),
				retryableStatusCodes:
					o?.retryConfig?.retryableStatusCodes ??
					e.retryConfig.retryableStatusCodes ??
					at.retryableStatusCodes,
				nonRetryableStatusCodes:
					o?.retryConfig?.nonRetryableStatusCodes ??
					e.retryConfig.nonRetryableStatusCodes ??
					at.nonRetryableStatusCodes,
			},
			{
				maxRetries: r,
				initialDelayMs: s,
				backoffFactor: i,
				retryableStatusCodes: a,
				nonRetryableStatusCodes: l,
				retryOnNetworkError: u,
			} = n,
			m = 0,
			p = s,
			d = null;
		for (; m <= (r ?? 0); ) {
			let h = xc(),
				x = e.customFetch || globalThis.fetch,
				b = Ym(e.backendURL, t),
				y;
			try {
				y = new URL(b);
			} catch {
				y = new URL(b, window.location.origin);
			}
			if (o?.query)
				for (let [g, S] of Object.entries(o.query))
					S !== void 0 && y.searchParams.append(g, String(S));
			let C = {
				method: o?.method || 'GET',
				mode: e.corsMode,
				credentials: 'include',
				headers: { ...e.headers, 'X-Request-ID': h, ...o?.headers },
				...o?.fetchOptions,
			};
			o?.body && C.method !== 'GET' && (C.body = JSON.stringify(o.body));
			try {
				let g = await x(y.toString(), C),
					S = null,
					A = null;
				try {
					g.headers.get('content-type')?.includes('application/json') &&
					g.status !== 204 &&
					g.headers.get('content-length') !== '0'
						? (S = await g.json())
						: g.status === 204 && (S = null);
				} catch (E) {
					A = E;
				}
				if (A) {
					let E = ct(
						!1,
						null,
						{
							message: 'Failed to parse response',
							status: g.status,
							code: 'PARSE_ERROR',
							cause: A,
						},
						g
					);
					if ((o?.onError?.(E, t), o?.throw))
						throw new Error('Failed to parse response');
					return E;
				}
				if (g.status >= 200 && g.status < 300) {
					let E = ct(!0, S, null, g);
					return o?.onSuccess?.(E), E;
				}
				let _ = S,
					O = ct(
						!1,
						null,
						{
							message: _?.message || `Request failed with status ${g.status}`,
							status: g.status,
							code: _?.code || 'API_ERROR',
							details: _?.details || null,
						},
						g
					);
				d = O;
				let B = !1;
				if (l?.includes(g.status))
					re().debug(
						`Not retrying request to ${t} with status ${g.status} (nonRetryableStatusCodes)`
					),
						(B = !1);
				else if (typeof n.shouldRetry == 'function')
					try {
						(B = n.shouldRetry(g, {
							attemptsMade: m,
							url: y.toString(),
							method: C.method || 'GET',
						})),
							re().debug(
								`Custom retry strategy for ${t} with status ${g.status}: ${B}`
							);
					} catch {
						(B = a?.includes(g.status) ?? !1),
							re().debug(
								`Custom retry strategy failed, falling back to status code check: ${B}`
							);
					}
				else
					(B = a?.includes(g.status) ?? !1),
						re().debug(
							`Standard retry check for ${t} with status ${g.status}: ${B}`
						);
				if (!B || m >= (r ?? 0)) {
					if ((o?.onError?.(O, t), o?.throw))
						throw new Error(O.error?.message || 'Request failed');
					return O;
				}
				m++, await go(p ?? 0), (p = (p ?? 0) * (i ?? 2));
			} catch (g) {
				if (g && g.message === 'Failed to parse response') throw g;
				let S = !(g instanceof Response),
					A = ct(
						!1,
						null,
						{
							message: g instanceof Error ? g.message : String(g),
							status: 0,
							code: 'NETWORK_ERROR',
							cause: g,
						},
						null
					);
				if (((d = A), !(S && u) || m >= (r ?? 0))) {
					if ((o?.onError?.(A, t), o?.throw)) throw g;
					return A;
				}
				m++, await go(p ?? 0), (p = (p ?? 0) * (i ?? 2));
			}
		}
		let f =
			d ||
			ct(
				!1,
				null,
				{
					message: `Request failed after ${r} retries`,
					status: 0,
					code: 'MAX_RETRIES_EXCEEDED',
				},
				null
			);
		if ((o?.onError?.(f, t), o?.throw))
			throw new Error(`Request failed after ${r} retries`);
		return f;
	}
	jt();
	Kt();
	var bt = {
		INIT: '/init',
		POST_SUBJECT: '/subjects',
		GET_SUBJECT: '/subjects',
		PATCH_SUBJECT: '/subjects',
		CHECK_CONSENT: '/consents/check',
		LIST_SUBJECTS: '/subjects',
	};
	async function er(e, t, o, n, r) {
		try {
			let s = await At(e, t, { method: o, ...n });
			return s.ok
				? s
				: (console.warn(
						`API request failed, falling back to offline mode for ${t}`
					),
					r(n));
		} catch (s) {
			return (
				console.warn(`Error calling ${t}, falling back to offline mode:`, s),
				r(n)
			);
		}
	}
	async function Jm(e) {
		let t = 'c15t-pending-identify-submissions';
		try {
			if (typeof window < 'u' && e?.body && window.localStorage) {
				let n = [];
				try {
					let i = window.localStorage.getItem(t);
					i && (n = JSON.parse(i));
				} catch (i) {
					console.warn('Error parsing pending identify submissions:', i),
						(n = []);
				}
				let r = e.body;
				n.some((i) => i.id === r.id && i.externalId === r.externalId) ||
					(n.push(r),
					window.localStorage.setItem(t, JSON.stringify(n)),
					re().log(
						'Queued identify user submission for retry on next page load'
					));
			}
		} catch (n) {
			console.warn(
				'Failed to write to localStorage in identify offline fallback:',
				n
			);
		}
		let o = ct(!0, null, null, null);
		return e?.onSuccess && (await e.onSuccess(o)), o;
	}
	async function Ec(e, t, o) {
		let { body: n, ...r } = o;
		if (!n?.id)
			return {
				ok: !1,
				data: null,
				response: null,
				error: {
					message: 'Subject ID is required to identify user',
					status: 400,
					code: 'MISSING_SUBJECT_ID',
				},
			};
		let s = gt(t);
		lt(
			{
				consents: s?.consents || {},
				consentInfo: {
					...s?.consentInfo,
					time: s?.consentInfo?.time || Date.now(),
					subjectId: n.id,
					externalId: n.externalId,
					identityProvider: n.identityProvider,
				},
			},
			void 0,
			t
		);
		let i = `${bt.PATCH_SUBJECT}/${n.id}`,
			{ id: a, ...l } = n;
		return er(e, i, 'PATCH', { ...r, body: l }, async (u) => {
			let m = { id: n.id, ...u?.body };
			return Jm({ ...u, body: m });
		});
	}
	tn();
	async function Nc(e, t) {
		let o = null;
		if (t?.enabled)
			try {
				let { fetchGVL: r } = await Promise.resolve().then(() => (rr(), oi));
				o = await r(t.vendorIds);
			} catch (r) {
				console.warn('Failed to fetch GVL in offline fallback:', r);
			}
		let n = ct(
			!0,
			{
				jurisdiction: 'NONE',
				location: { countryCode: null, regionCode: null },
				translations: { language: 'en', translations: qt },
				branding: 'c15t',
				gvl: o,
			},
			null,
			null
		);
		return e?.onSuccess && (await e.onSuccess(n)), n;
	}
	async function Pc(e, t, o) {
		try {
			let n = await At(e, bt.INIT, { method: 'GET', ...t });
			return n.ok
				? n
				: (console.warn(
						'API request failed, falling back to offline mode for consent banner'
					),
					Nc(t, o));
		} catch (n) {
			return (
				console.warn(
					'Error fetching consent banner info, falling back to offline mode:',
					n
				),
				Nc(t, o)
			);
		}
	}
	Kt();
	var Bc = 'c15t-pending-consent-submissions',
		sr = 'c15t-pending-identify-submissions';
	function Oc(e, t) {
		let o = Bc;
		if (!(typeof window > 'u' || !window.localStorage))
			try {
				window.localStorage.setItem('c15t-storage-test-key', 'test'),
					window.localStorage.removeItem('c15t-storage-test-key');
				let n = window.localStorage.getItem(o);
				if (!n) return;
				let r = JSON.parse(n);
				if (!r.length) {
					window.localStorage.removeItem(o);
					return;
				}
				re().log(`Found ${r.length} pending consent submission(s) to retry`),
					setTimeout(() => {
						t(r);
					}, 2e3);
			} catch (n) {
				console.warn('Failed to check for pending consent submissions:', n);
			}
	}
	async function Dc(e, t) {
		let o = Bc,
			n = 3,
			r = [...t];
		for (let s = 0; s < n && r.length > 0; s++) {
			let i = [];
			for (let a = 0; a < r.length; a++) {
				let l = r[a];
				try {
					re().log('Retrying consent submission:', l),
						(await At(e, bt.POST_SUBJECT, { method: 'POST', body: l })).ok &&
							(re().log('Successfully resubmitted consent'), i.push(a));
				} catch (u) {
					console.warn('Failed to resend consent submission:', u);
				}
			}
			for (let a = i.length - 1; a >= 0; a--) {
				let l = i[a];
				l !== void 0 && r.splice(l, 1);
			}
			if (r.length === 0) break;
			s < n - 1 && (await go(1e3 * (s + 1)));
		}
		try {
			typeof window < 'u' &&
				window.localStorage &&
				(r.length > 0
					? (window.localStorage.setItem(o, JSON.stringify(r)),
						re().log(
							`${r.length} consent submissions still pending for future retry`
						))
					: (window.localStorage.removeItem(o),
						re().log(
							'All pending consent submissions processed successfully'
						)));
		} catch (s) {
			console.warn('Error updating pending submissions storage:', s);
		}
	}
	function jc(e, t) {
		if (!(typeof window > 'u' || !window.localStorage))
			try {
				let o = window.localStorage.getItem(sr);
				if (!o) return;
				let n = JSON.parse(o);
				if (!n.length) {
					window.localStorage.removeItem(sr);
					return;
				}
				re().log(
					`Found ${n.length} pending identify user submission(s) to retry`
				),
					setTimeout(() => {
						t(n);
					}, 2500);
			} catch (o) {
				console.warn('Failed to check for pending identify submissions:', o);
			}
	}
	async function Mc(e, t) {
		let n = [...t];
		for (let r = 0; r < 3 && n.length > 0; r++) {
			let s = [];
			for (let i = 0; i < n.length; i++) {
				let a = n[i];
				if (a)
					try {
						re().log('Retrying identify user submission:', a);
						let l = `${bt.PATCH_SUBJECT}/${a.id}`,
							{ id: u, ...m } = a;
						(await At(e, l, { method: 'PATCH', body: m })).ok &&
							(re().log('Successfully resubmitted identify user'), s.push(i));
					} catch (l) {
						console.warn('Failed to resend identify user submission:', l);
					}
			}
			for (let i = s.length - 1; i >= 0; i--) {
				let a = s[i];
				a !== void 0 && n.splice(a, 1);
			}
			if (n.length === 0) break;
			r < 2 && (await go(1e3 * (r + 1)));
		}
		try {
			typeof window < 'u' &&
				window.localStorage &&
				(n.length > 0
					? (window.localStorage.setItem(sr, JSON.stringify(n)),
						re().log(
							`${n.length} identify submissions still pending for future retry`
						))
					: (window.localStorage.removeItem(sr),
						re().log(
							'All pending identify submissions processed successfully'
						)));
		} catch (r) {
			console.warn('Error updating pending identify submissions storage:', r);
		}
	}
	jt();
	Kt();
	async function ef(e, t) {
		let o = 'c15t-pending-consent-submissions',
			n = t?.body?.subjectId;
		try {
			if (
				typeof window < 'u' &&
				(lt(
					{
						consents: t?.body?.preferences || {},
						consentInfo: {
							time: Date.now(),
							subjectId: n,
							externalId: t?.body?.externalSubjectId,
							identityProvider: t?.body?.identityProvider,
						},
					},
					void 0,
					e
				),
				t?.body && window.localStorage)
			) {
				let s = [];
				try {
					let l = window.localStorage.getItem(o);
					l && (s = JSON.parse(l));
				} catch (l) {
					console.warn('Error parsing pending submissions:', l), (s = []);
				}
				let i = t.body;
				s.some((l) => JSON.stringify(l) === JSON.stringify(i)) ||
					(s.push(i),
					window.localStorage.setItem(o, JSON.stringify(s)),
					re().log('Queued consent submission for retry on next page load'));
			}
		} catch (s) {
			console.warn('Failed to write to localStorage in offline fallback:', s);
		}
		let r = ct(!0, null, null, null);
		return t?.onSuccess && (await t.onSuccess(r)), r;
	}
	async function Vc(e, t, o) {
		return (
			lt(
				{
					consents: o?.body?.preferences || {},
					consentInfo: {
						time: Date.now(),
						subjectId: o?.body?.subjectId,
						externalId: o?.body?.externalSubjectId,
						identityProvider: o?.body?.identityProvider,
					},
				},
				void 0,
				t
			),
			await er(e, bt.POST_SUBJECT, 'POST', o, async (r) => ef(t, r))
		);
	}
	var Co = class {
		constructor(t) {
			(this.backendURL = t.backendURL.endsWith('/')
				? t.backendURL.slice(0, -1)
				: t.backendURL),
				(this.headers = { 'Content-Type': 'application/json', ...t.headers }),
				(this.customFetch = t.customFetch),
				(this.corsMode = t.corsMode || 'cors'),
				(this.storageConfig = t.storageConfig),
				(this.iabConfig = t.iabConfig),
				(this.retryConfig = {
					maxRetries: t.retryConfig?.maxRetries ?? at.maxRetries ?? 3,
					initialDelayMs:
						t.retryConfig?.initialDelayMs ?? at.initialDelayMs ?? 100,
					backoffFactor: t.retryConfig?.backoffFactor ?? at.backoffFactor ?? 2,
					retryableStatusCodes:
						t.retryConfig?.retryableStatusCodes ?? at.retryableStatusCodes,
					nonRetryableStatusCodes:
						t.retryConfig?.nonRetryableStatusCodes ??
						at.nonRetryableStatusCodes,
					shouldRetry: t.retryConfig?.shouldRetry ?? at.shouldRetry,
					retryOnNetworkError:
						t.retryConfig?.retryOnNetworkError ?? at.retryOnNetworkError,
				}),
				(this.fetcherContext = {
					backendURL: this.backendURL,
					headers: this.headers,
					customFetch: this.customFetch,
					corsMode: this.corsMode,
					retryConfig: this.retryConfig,
				}),
				this.checkPendingConsentSubmissions(),
				this.checkPendingIdentifySubmissions();
		}
		async init(t) {
			return Pc(this.fetcherContext, t, this.iabConfig);
		}
		async setConsent(t) {
			return Vc(this.fetcherContext, this.storageConfig, t);
		}
		async identifyUser(t) {
			return Ec(this.fetcherContext, this.storageConfig, t);
		}
		async $fetch(t, o) {
			return At(this.fetcherContext, t, o);
		}
		checkPendingConsentSubmissions() {
			Oc(this.fetcherContext, (t) => this.processPendingConsentSubmissions(t));
		}
		async processPendingConsentSubmissions(t) {
			return Dc(this.fetcherContext, t);
		}
		checkPendingIdentifySubmissions() {
			jc(this.fetcherContext, (t) => this.processPendingIdentifySubmissions(t));
		}
		async processPendingIdentifySubmissions(t) {
			return Mc(this.fetcherContext, t);
		}
	};
	function dn(e, t = 500, o = 'HANDLER_ERROR', n) {
		return gc(e, t, o, n);
	}
	async function xo(e, t, o) {
		let n = e[t];
		if (!n) {
			let r = dn(
				`No endpoint handler found for '${String(t)}'`,
				404,
				'ENDPOINT_NOT_FOUND'
			);
			if (o?.throw)
				throw new Error(`No endpoint handler found for '${String(t)}'`);
			return r;
		}
		try {
			let r = await n(o);
			return {
				data: r.data,
				error: r.error,
				ok: r.ok ?? !r.error,
				response: r.response,
			};
		} catch (r) {
			let s = dn(
				r instanceof Error ? r.message : String(r),
				0,
				'HANDLER_ERROR',
				r
			);
			if (o?.throw) throw r;
			return s;
		}
	}
	async function Fc(e, t, o, n) {
		let r = o.replace(on, '').split('/')[0],
			s = t[o];
		if (s)
			try {
				return await s(n);
			} catch (i) {
				return dn(
					i instanceof Error ? i.message : String(i),
					0,
					'HANDLER_ERROR',
					i
				);
			}
		return !r || !(r in e)
			? dn(`No endpoint handler found for '${o}'`, 404, 'ENDPOINT_NOT_FOUND')
			: await xo(e, r, n);
	}
	async function Uc(e, t) {
		let o = ('init' in e && e.init !== void 0, 'init');
		return await xo(e, o, t);
	}
	async function Hc(e, t) {
		return await xo(e, 'setConsent', t);
	}
	var un = class {
		constructor(t) {
			this.dynamicHandlers = {};
			this.endpointHandlers = t.endpointHandlers;
		}
		async init(t) {
			return Uc(this.endpointHandlers, t);
		}
		async setConsent(t) {
			return Hc(this.endpointHandlers, t);
		}
		async identifyUser(t) {
			if (this.endpointHandlers.identifyUser)
				return this.endpointHandlers.identifyUser(t);
			let o = t.body?.id;
			return o
				? this.$fetch(`/subjects/${o}`, { ...t, method: 'PATCH' })
				: {
						ok: !1,
						data: null,
						response: null,
						error: {
							message: 'Subject ID is required to identify user',
							status: 400,
							code: 'MISSING_SUBJECT_ID',
						},
					};
		}
		registerHandler(t, o) {
			this.dynamicHandlers[t] = o;
		}
		async $fetch(t, o) {
			return Fc(this.endpointHandlers, this.dynamicHandlers, t, o);
		}
	};
	tn();
	function zc(e, t) {
		let o = {
				EU: new Set([
					'AT',
					'BE',
					'BG',
					'HR',
					'CY',
					'CZ',
					'DK',
					'EE',
					'FI',
					'FR',
					'DE',
					'GR',
					'HU',
					'IE',
					'IT',
					'LV',
					'LT',
					'LU',
					'MT',
					'NL',
					'PL',
					'PT',
					'RO',
					'SK',
					'SI',
					'ES',
					'SE',
				]),
				EEA: new Set(['IS', 'NO', 'LI']),
				UK: new Set(['GB']),
				CH: new Set(['CH']),
				BR: new Set(['BR']),
				CA: new Set(['CA']),
				AU: new Set(['AU']),
				JP: new Set(['JP']),
				KR: new Set(['KR']),
				CA_QC_REGIONS: new Set(['QC']),
			},
			n = 'NONE';
		if (e) {
			let r = e.toUpperCase(),
				s =
					t && typeof t == 'string'
						? (t.includes('-') ? t.split('-').pop() : t).toUpperCase()
						: null;
			if (r === 'CA' && s && o.CA_QC_REGIONS.has(s)) return 'QC_LAW25';
			let i = [
				{ sets: [o.EU, o.EEA, o.UK], code: 'GDPR' },
				{ sets: [o.CH], code: 'CH' },
				{ sets: [o.BR], code: 'BR' },
				{ sets: [o.CA], code: 'PIPEDA' },
				{ sets: [o.AU], code: 'AU' },
				{ sets: [o.JP], code: 'APPI' },
				{ sets: [o.KR], code: 'PIPA' },
			];
			for (let { sets: a, code: l } of i)
				if (a.some((u) => u.has(r))) {
					n = l;
					break;
				}
		}
		return n;
	}
	Qn();
	function ni(e = null) {
		return nn(!0, e);
	}
	async function pn(e) {
		let t = ni();
		return e?.onSuccess && (await e.onSuccess(t)), t;
	}
	async function Gc(e, t, o) {
		let n = t?.headers?.['x-c15t-country'] ?? 'GB',
			r = t?.headers?.['x-c15t-region'] ?? null,
			s,
			i,
			a = t?.headers?.['accept-language'] ?? null;
		if (e?.translations && Object.keys(e.translations).length > 0) {
			let p = e.translations,
				d = Array.from(new Set(['en', ...Object.keys(p)])),
				f = e.defaultLanguage ?? 'en';
			s = js(d, { header: a, fallback: f });
			let h = p[s] ?? {};
			i = Ds(qt, h);
		} else {
			let p = Object.keys(Je.translations),
				d = Je.defaultLanguage ?? 'en';
			(s = js(p, { header: a, fallback: d })), (i = Je.translations[s]);
		}
		let l = zc(n, r),
			u = null;
		if (o?.enabled)
			if (o.gvl) u = o.gvl;
			else
				try {
					let { fetchGVL: p } = await Promise.resolve().then(() => (rr(), oi));
					u = await p(o.vendorIds);
				} catch (p) {
					console.warn('Failed to fetch GVL in offline mode:', p);
				}
		let m = ni({
			jurisdiction: l,
			location: { countryCode: n, regionCode: r },
			translations: { language: s, translations: i },
			branding: 'c15t',
			gvl: u,
		});
		return t?.onSuccess && (await t.onSuccess(m)), m;
	}
	jt();
	async function $c(e, t) {
		let o = t?.body?.subjectId;
		try {
			typeof window < 'u' &&
				lt(
					{
						consentInfo: {
							time: Date.now(),
							subjectId: o,
							externalId: t?.body?.externalSubjectId,
							identityProvider: t?.body?.identityProvider,
						},
						consents: t?.body?.preferences || {},
					},
					void 0,
					e
				);
		} catch (n) {
			console.warn('Failed to write to storage:', n);
		}
		return await pn(t);
	}
	var mn = class {
		constructor(t, o, n) {
			(this.storageConfig = t),
				(this.initialTranslationConfig = o),
				(this.iabConfig = n);
		}
		async init(t) {
			return Gc(this.initialTranslationConfig, t, this.iabConfig);
		}
		async setConsent(t) {
			return $c(this.storageConfig, t);
		}
		async identifyUser(t) {
			return (
				console.warn(
					'identifyUser called in offline mode - external ID will not be linked'
				),
				pn(t)
			);
		}
		async $fetch(t, o) {
			return await pn(o);
		}
	};
	var tf = '/api/c15t',
		of = 'c15t',
		ir = new Map();
	function nf(e) {
		return e
			? Object.keys(e)
					.sort()
					.map((o) => {
						let n = e[o];
						return n == null ? `${o}:null` : `${o}:${String(n)}`;
					})
					.join('|')
			: '';
	}
	function rf(e) {
		let t = nf(e.storageConfig),
			o = t ? `:storage:${t}` : '';
		if (e.mode === 'offline') {
			let r = e.store?.initialTranslationConfig?.translations,
				s = r ? `:translations:${Object.keys(r).sort().join(',')}` : '',
				a = e.store?.iab?.enabled ? ':iab:enabled' : '';
			return `offline${o}${s}${a}`;
		}
		if (e.mode === 'custom')
			return `custom:${Object.keys(e.endpointHandlers || {})
				.sort()
				.join(',')}${o}`;
		let n = '';
		return (
			'headers' in e &&
				e.headers &&
				(n = `:headers:${Object.keys(e.headers)
					.sort()
					.map((s) => `${s}=${e.headers?.[s]}`)
					.join(',')}`),
			`c15t:${e.backendURL || ''}${n}${o}`
		);
	}
	function So(e) {
		let t = rf(e);
		if (ir.has(t)) {
			if (
				e.mode !== 'offline' &&
				e.mode !== 'custom' &&
				'headers' in e &&
				e.headers
			) {
				let s = ir.get(t);
				s instanceof Co &&
					(s.headers = { 'Content-Type': 'application/json', ...e.headers });
			}
			let r = ir.get(t);
			if (r)
				return new Proxy(r, {
					get(s, i) {
						return s[i];
					},
				});
		}
		let o = e.mode || of,
			n;
		switch (o) {
			case 'custom': {
				let r = e;
				n = new un({ endpointHandlers: r.endpointHandlers });
				break;
			}
			case 'offline': {
				let r = e.store?.iab;
				n = new mn(
					e.storageConfig,
					e.store?.initialTranslationConfig,
					r ? { enabled: r.enabled, vendorIds: r.vendors, gvl: r.gvl } : void 0
				);
				break;
			}
			default: {
				let r = e,
					s = e.store?.iab;
				n = new Co({
					backendURL: r.backendURL || tf,
					headers: r.headers,
					customFetch: r.customFetch,
					retryConfig: r.retryConfig,
					storageConfig: e.storageConfig,
					iabConfig: s
						? { enabled: s.enabled, vendorIds: s.vendors, gvl: s.gvl }
						: void 0,
				});
				break;
			}
		}
		return ir.set(t, n), n;
	}
	jt();
	ar();
	function Wc(e, t) {
		if (e.length === 0) throw new TypeError(`${t} condition cannot be empty`);
	}
	function lf(e, t) {
		if (!(e in t))
			throw new Error(`Consent category "${e}" not found in consent state`);
		return t[e] || !1;
	}
	function df(e, t) {
		let o = Array.isArray(e) ? e : [e];
		return Wc(o, 'AND'), o.every((n) => cr(n, t));
	}
	function uf(e, t) {
		let o = Array.isArray(e) ? e : [e];
		return Wc(o, 'OR'), o.some((n) => cr(n, t));
	}
	function cr(e, t) {
		if (typeof e == 'string') return lf(e, t);
		if (typeof e == 'object' && e !== null) {
			if ('and' in e) return df(e.and, t);
			if ('or' in e) return uf(e.or, t);
			if ('not' in e) return !cr(e.not, t);
		}
		throw new TypeError(`Invalid condition structure: ${JSON.stringify(e)}`);
	}
	function dt(e, t) {
		return cr(e, t);
	}
	function lr(e) {
		let t = new Set();
		function o(n) {
			if (typeof n == 'string') {
				t.add(n);
				return;
			}
			typeof n == 'object' &&
				n !== null &&
				('and' in n
					? (Array.isArray(n.and) ? n.and : [n.and]).forEach(o)
					: 'or' in n
						? (Array.isArray(n.or) ? n.or : [n.or]).forEach(o)
						: 'not' in n && o(n.not));
		}
		return o(e), Array.from(t);
	}
	bo();
	function pf(e) {
		let t = e.getAttribute('data-category');
		if (t) {
			if (!Dt.includes(t))
				throw new Error(
					`Invalid category attribute "${t}" on iframe. Must be one of: ${Dt.join(', ')}`
				);
			return t;
		}
	}
	function si(e, t) {
		let o = e.getAttribute('data-src'),
			n = pf(e);
		if (!n) return;
		dt(n, t)
			? o && !e.src && ((e.src = o), e.removeAttribute('data-src'))
			: e.src && e.removeAttribute('src');
	}
	function dr() {
		if (typeof document > 'u') return [];
		let e = document.querySelectorAll('iframe[data-category]'),
			t = new Set();
		return e
			? (e.forEach((o) => {
					let n = o.getAttribute('data-category');
					if (!n) return;
					let r = n.trim();
					Dt.includes(r) && t.add(r);
				}),
				Array.from(t))
			: [];
	}
	function ur(e) {
		if (typeof document > 'u') return;
		let t = document.querySelectorAll('iframe');
		t &&
			t.forEach((o) => {
				si(o, e);
			});
	}
	function ii(e, t) {
		let o = new MutationObserver((n) => {
			let r = e(),
				s = !1;
			if (
				(n.forEach((i) => {
					i.addedNodes.forEach((a) => {
						if (a.nodeType === Node.ELEMENT_NODE) {
							let l = a;
							l.tagName &&
								l.tagName.toUpperCase() === 'IFRAME' &&
								(si(l, r), l.hasAttribute('data-category') && (s = !0));
							let u = l.querySelectorAll?.('iframe');
							u &&
								u.length > 0 &&
								u.forEach((m) => {
									si(m, r), m.hasAttribute('data-category') && (s = !0);
								});
						}
					});
				}),
				s && t)
			) {
				let i = dr();
				i.length > 0 && t(i);
			}
		});
		return o.observe(document.body, { childList: !0, subtree: !0 }), o;
	}
	function pr() {
		if (typeof crypto < 'u' && crypto.randomUUID)
			return crypto.randomUUID().replace(/-/g, '').substring(0, 8);
		if (typeof crypto < 'u' && crypto.getRandomValues) {
			let t = new Uint8Array(4);
			return (
				crypto.getRandomValues(t),
				Array.from(t, (o) => o.toString(36))
					.join('')
					.padEnd(8, '0')
					.substring(0, 8)
			);
		}
		return Math.random()
			.toString(36)
			.substring(2)
			.padEnd(8, '0')
			.substring(0, 8);
	}
	function mr(e, t, o) {
		return t ? (o[e] || (o[e] = pr()), o[e]) : `c15t-script-${e}`;
	}
	var gn = new Map();
	function Xt(e) {
		return gn.has(e);
	}
	function bn(e) {
		return gn.get(e);
	}
	function fr(e, t) {
		gn.set(e, t);
	}
	function Mt(e) {
		gn.delete(e);
	}
	function qc() {
		return gn;
	}
	function ff(e, t) {
		if (e.vendorId !== void 0) {
			let o = String(e.vendorId);
			if (!t.vendorConsents[o]) return !1;
		}
		return !(
			(e.iabPurposes &&
				e.iabPurposes.length > 0 &&
				!e.iabPurposes.every((n) => t.purposeConsents[n] === !0)) ||
			(e.iabLegIntPurposes &&
				e.iabLegIntPurposes.length > 0 &&
				!e.iabLegIntPurposes.every(
					(n) => t.purposeLegitimateInterests[n] === !0
				)) ||
			(e.iabSpecialFeatures &&
				e.iabSpecialFeatures.length > 0 &&
				!e.iabSpecialFeatures.every((n) => t.specialFeatureOptIns[n] === !0))
		);
	}
	function Jt(e, t, o) {
		return o?.model === 'iab' &&
			o.iabConsent &&
			(e.vendorId !== void 0 ||
				e.iabPurposes ||
				e.iabLegIntPurposes ||
				e.iabSpecialFeatures)
			? ff(e, o.iabConsent)
			: dt(e.category, t);
	}
	function gr(e, t, o = {}, n) {
		let r = [];
		return (
			e.forEach((s) => {
				if (!s.alwaysLoad && !Jt(s, t, n)) return;
				if (Xt(s.id)) {
					s.onConsentChange?.({
						id: s.id,
						elementId: mr(s.id, s.anonymizeId !== !1, o),
						hasConsent: Jt(s, t, n),
						consents: t,
					});
					return;
				}
				if (s.src && s.textContent)
					throw new Error(
						`Script '${s.id}' cannot have both 'src' and 'textContent'. Choose one.`
					);
				if (!s.src && !s.textContent && !s.callbackOnly)
					throw new Error(
						`Script '${s.id}' must have either 'src', 'textContent', or 'callbackOnly' set to true.`
					);
				if (s.callbackOnly === !0) {
					let d = s.anonymizeId !== !1,
						f = mr(s.id, d, o),
						h = {
							id: s.id,
							elementId: f,
							consents: t,
							hasConsent: Jt(s, t, n),
						};
					s.onBeforeLoad && s.onBeforeLoad(h),
						s.onLoad && s.onLoad(h),
						fr(s.id, null),
						r.push(s.id);
					return;
				}
				let i = s.anonymizeId !== !1,
					a = mr(s.id, i, o);
				if (s.persistAfterConsentRevoked === !0) {
					let d = document.getElementById(a);
					if (d) {
						let f = {
							id: s.id,
							hasConsent: Jt(s, t, n),
							elementId: a,
							consents: t,
							element: d,
						};
						s.onConsentChange?.(f), s.onLoad?.(f), fr(s.id, d), r.push(s.id);
						return;
					}
				}
				let l = document.createElement('script');
				(l.id = a),
					s.src
						? (l.src = s.src)
						: s.textContent && (l.textContent = s.textContent),
					s.fetchPriority && (l.fetchPriority = s.fetchPriority),
					s.async && (l.async = !0),
					s.defer && (l.defer = !0),
					s.nonce && (l.nonce = s.nonce),
					s.attributes &&
						Object.entries(s.attributes).forEach(([d, f]) => {
							l.setAttribute(d, f);
						});
				let u = {
					id: s.id,
					hasConsent: Jt(s, t, n),
					elementId: a,
					consents: t,
					element: l,
				};
				s.onLoad &&
					(s.textContent
						? setTimeout(() => {
								s.onLoad?.({ ...u });
							}, 0)
						: l.addEventListener('load', () => {
								s.onLoad?.({ ...u });
							})),
					s.onError &&
						(s.textContent ||
							l.addEventListener('error', () => {
								s.onError?.({
									...u,
									error: new Error(`Failed to load script: ${s.src}`),
								});
							})),
					s.onBeforeLoad && s.onBeforeLoad(u);
				let m = s.target ?? 'head',
					p = m === 'body' ? document.body : document.head;
				if (!p)
					throw new Error(
						`Document ${m} is not available for script injection`
					);
				p.appendChild(l), fr(s.id, l), r.push(s.id);
			}),
			r
		);
	}
	function ai(e, t, o = {}, n) {
		let r = [];
		return (
			e.forEach((s) => {
				if (Xt(s.id) && !s.alwaysLoad && !Jt(s, t, n)) {
					let i = bn(s.id);
					s.callbackOnly === !0 || i === null
						? (Mt(s.id), r.push(s.id))
						: i &&
							(s.persistAfterConsentRevoked
								? (Mt(s.id), r.push(s.id))
								: (i.remove(), Mt(s.id), r.push(s.id)));
				}
			}),
			r
		);
	}
	function br(e, t, o = {}, n) {
		let r = ai(e, t, o, n);
		return { loaded: gr(e, t, o, n), unloaded: r };
	}
	function hr(e) {
		return Xt(e);
	}
	function vr() {
		return Array.from(qc().keys());
	}
	function ci(e, t, o, n = {}, r) {
		let s = t.find((i) => i.id === e);
		if (!s) return !1;
		if (Xt(e)) {
			let i = bn(e);
			s.callbackOnly === !0 || i === null
				? Mt(e)
				: i && (s.persistAfterConsentRevoked || i.remove(), Mt(e));
		}
		return !s.alwaysLoad && !Jt(s, o, r) ? !1 : (gr([s], o, n, r), !0);
	}
	function li(e, t) {
		let o = () => {
			let { scripts: n, consents: r, scriptIdMap: s, model: i, iab: a } = e(),
				l = a?.config.enabled
					? {
							vendorConsents: a.vendorConsents,
							vendorLegitimateInterests: a.vendorLegitimateInterests,
							purposeConsents: a.purposeConsents,
							purposeLegitimateInterests: a.purposeLegitimateInterests,
							specialFeatureOptIns: a.specialFeatureOptIns,
						}
					: void 0,
				u = br(n, r, s, { model: i, iabConsent: l }),
				m = { ...e().loadedScripts };
			return (
				u.loaded.forEach((p) => {
					m[p] = !0;
				}),
				u.unloaded.forEach((p) => {
					m[p] = !1;
				}),
				t({ loadedScripts: m }),
				u
			);
		};
		return {
			updateScripts: () => o(),
			setScripts: (n) => {
				let r = e(),
					s = { ...r.scriptIdMap };
				n.forEach((u) => {
					u.anonymizeId !== !1 && (s[u.id] = pr());
				});
				let i = n.flatMap((u) => lr(u.category)),
					a = new Set([...r.consentCategories, ...i]),
					l = Array.from(a);
				t({
					scripts: [...r.scripts, ...n],
					scriptIdMap: s,
					consentCategories: l,
				}),
					o();
			},
			removeScript: (n) => {
				let r = e();
				if (Xt(n)) {
					let i = bn(n);
					i && (i.remove(), Mt(n));
				}
				let s = { ...r.scriptIdMap };
				delete s[n],
					t({
						scripts: r.scripts.filter((i) => i.id !== n),
						loadedScripts: { ...r.loadedScripts, [n]: !1 },
						scriptIdMap: s,
					});
			},
			reloadScript: (n) => {
				let r = e();
				return ci(n, r.scripts, r.consents, r.scriptIdMap);
			},
			isScriptLoaded: (n) => hr(n),
			getLoadedScriptIds: () => vr(),
		};
	}
	ho();
	var Kc = (e) => {
			let t,
				o = new Set(),
				n = (u, m) => {
					let p = typeof u == 'function' ? u(t) : u;
					if (!Object.is(p, t)) {
						let d = t;
						(t =
							(m ?? (typeof p != 'object' || p === null))
								? p
								: Object.assign({}, t, p)),
							o.forEach((f) => f(t, d));
					}
				},
				r = () => t,
				a = {
					setState: n,
					getState: r,
					getInitialState: () => l,
					subscribe: (u) => (o.add(u), () => o.delete(u)),
				},
				l = (t = e(n, r, a));
			return a;
		},
		Yc = (e) => (e ? Kc(e) : Kc);
	jt();
	Kt();
	function Zc(e, t) {
		let o = null,
			n = !1;
		return {
			initializeIframeBlocker: () => {
				if (n || typeof document > 'u') return;
				let r = e();
				if (r.iframeBlockerConfig?.disableAutomaticBlocking) return;
				let s = () => {
					let i = dr();
					i.length > 0 && e().updateConsentCategories(i);
				};
				document.readyState === 'loading'
					? document.addEventListener('DOMContentLoaded', s)
					: s(),
					setTimeout(s, 100),
					ur(r.consents),
					(o = ii(
						() => e().consents,
						(i) => e().updateConsentCategories(i)
					)),
					(n = !0);
			},
			updateIframeConsents: () => {
				if (!n || typeof document > 'u') return;
				let r = e(),
					{ consents: s, iframeBlockerConfig: i } = r;
				i?.disableAutomaticBlocking || ur(s);
			},
			destroyIframeBlocker: () => {
				if (!n || typeof document > 'u') return;
				let r = e(),
					{ iframeBlockerConfig: s } = r;
				s?.disableAutomaticBlocking ||
					(o && (o.disconnect(), (o = null)), (n = !1));
			},
		};
	}
	ar();
	var yr = 'c15t:pending-consent-sync';
	function gf(e, t, o, n, r) {
		if (!n || o === null) return !1;
		let s = new Set(r.filter((a) => a.disabled).map((a) => a.name));
		return Object.entries(t).some(
			([a, l]) => !s.has(a) && e[a] === !0 && l === !1
		);
	}
	async function Xc({ manager: e, type: t, get: o, set: n, options: r }) {
		let {
				callbacks: s,
				selectedConsents: i,
				consents: a,
				consentTypes: l,
				updateScripts: u,
				updateIframeConsents: m,
				updateNetworkBlockerConsents: p,
				consentCategories: d,
				locationInfo: f,
				model: h,
				consentInfo: x,
				reloadOnConsentRevoked: b,
			} = o(),
			y = { ...a },
			C = x,
			g = { ...(i ?? a ?? {}) },
			S = Date.now();
		if (t === 'all') for (let E of l) d.includes(E.name) && (g[E.name] = !0);
		else if (t === 'necessary')
			for (let E of l) g[E.name] = E.disabled === !0 ? E.defaultValue : !1;
		let A = x?.subjectId;
		A || (A = fn());
		let I = o().consentInfo?.externalId || o().user?.id,
			_ = o().consentInfo?.identityProvider || o().user?.identityProvider,
			O = gf(y, g, C, b, l);
		if (
			(n({
				consents: g,
				selectedConsents: g,
				activeUI: 'none',
				consentInfo: {
					time: S,
					subjectId: A,
					externalId: I,
					identityProvider: _,
				},
			}),
			O)
		) {
			let E = {
				type: t,
				subjectId: A,
				externalId: I,
				identityProvider: _,
				preferences: g,
				givenAt: S,
				jurisdiction: f?.jurisdiction ?? void 0,
				jurisdictionModel: h,
				domain: window.location.hostname,
				uiSource: r?.uiSource ?? 'api',
			};
			try {
				localStorage.setItem(yr, JSON.stringify(E));
			} catch {}
			s.onConsentSet?.({ preferences: g }),
				s.onBeforeConsentRevocationReload?.({ preferences: g }),
				window.location.reload();
			return;
		}
		await new Promise((E) => setTimeout(E, 0)),
			m(),
			u(),
			p(),
			s.onConsentSet?.({ preferences: g });
		let B = await e.setConsent({
			body: {
				type: 'cookie_banner',
				domain: window.location.hostname,
				preferences: g,
				subjectId: A,
				externalSubjectId: String(I),
				identityProvider: _,
				jurisdiction: f?.jurisdiction ?? void 0,
				jurisdictionModel: h ?? void 0,
				givenAt: S,
				uiSource: r?.uiSource ?? 'api',
				consentAction: t,
			},
		});
		if (!B.ok) {
			let E = B.error?.message ?? 'Failed to save consents';
			s.onError?.({ error: E }), s.onError || console.error(E);
		}
	}
	tn();
	function Jc(e, t) {
		return e == null || e === 'NONE'
			? null
			: t && ['UK_GDPR', 'GDPR'].includes(e)
				? 'iab'
				: ['UK_GDPR', 'GDPR', 'CH', 'BR', 'APPI', 'PIPA', 'QC_LAW25'].includes(
							e
						)
					? 'opt-in'
					: ['CCPA', 'AU', 'PIPEDA'].includes(e)
						? 'opt-out'
						: 'opt-in';
	}
	function Qc() {
		if (typeof window > 'u') return !1;
		try {
			let t = window.navigator.globalPrivacyControl;
			return t === !0 || t === '1';
		} catch {
			return !1;
		}
	}
	ho();
	jt();
	var Sf = 0,
		kf = ft;
	function so({ get: e, set: t }, o) {
		let { iab: n } = e();
		n && t({ iab: { ...n, ...o } });
	}
	async function Ed(e, t, o) {
		let { get: n } = t;
		if (o !== null) {
			so(t, { isLoadingGVL: !0, nonIABVendors: e.customVendors ?? [] });
			try {
				let {
					initializeIABStub: r,
					fetchGVL: s,
					createCMPApi: i,
				} = await Promise.resolve().then(() => (Er(), Lr));
				r();
				let a;
				if (o) a = o;
				else if (((a = await s()), a === null)) {
					so(t, { isLoadingGVL: !1 });
					return;
				}
				so(t, { gvl: a, isLoadingGVL: !1 });
				let l = {},
					u = {};
				for (let [b, y] of Object.entries(a.vendors)) {
					let C = String(b);
					y.purposes && y.purposes.length > 0 && (l[C] = !1),
						y.legIntPurposes && y.legIntPurposes.length > 0 && (u[C] = !0);
				}
				(e.customVendors ?? []).forEach((b) => {
					let y = String(b.id);
					b.purposes && b.purposes.length > 0 && (l[y] = !1),
						b.legIntPurposes && b.legIntPurposes.length > 0 && (u[y] = !0);
				});
				let p = gt(n().storageConfig);
				p?.iabCustomVendorConsents &&
					Object.assign(l, p.iabCustomVendorConsents),
					p?.iabCustomVendorLegitimateInterests &&
						Object.assign(u, p.iabCustomVendorLegitimateInterests),
					so(t, { vendorConsents: l, vendorLegitimateInterests: u });
				let d = e.cmpId ?? Sf,
					f = e.cmpVersion ?? kf;
				if (d === 0)
					throw new Error(
						'[c15t] IAB TCF Error: CMP ID is 0. A valid CMP ID registered with IAB Europe is required for IAB TCF compliance.\nIf using consent.io, the CMP ID should be provided automatically via /init.\nIf self-hosting, configure it on the backend via `advanced.iab.cmpId` or on the client via `iab.cmpId`.\nTo register your own CMP: https://iabeurope.eu/tcf-for-cmps/'
					);
				let h = i({ cmpId: d, cmpVersion: f, gvl: a, gdprApplies: !0 });
				so(t, { cmpApi: h });
				let x = h.loadFromStorage();
				x && (await wf(x, t)), n().updateScripts();
			} catch (r) {
				console.error('Failed to initialize IAB mode:', r),
					so(t, { isLoadingGVL: !1 });
			}
		}
	}
	async function wf(e, t) {
		let { set: o } = t;
		try {
			let { decodeTCString: n, iabPurposesToC15tConsents: r } =
					await Promise.resolve().then(() => (Er(), Lr)),
				s = await n(e),
				i = gt(t.get().storageConfig),
				a = { ...s.vendorConsents, ...(i?.iabCustomVendorConsents ?? {}) },
				l = {
					...s.vendorLegitimateInterests,
					...(i?.iabCustomVendorLegitimateInterests ?? {}),
				},
				u = r(s.purposeConsents);
			so(t, {
				tcString: e,
				purposeConsents: s.purposeConsents,
				purposeLegitimateInterests: s.purposeLegitimateInterests,
				vendorConsents: a,
				vendorLegitimateInterests: l,
				specialFeatureOptIns: s.specialFeatureOptIns,
			}),
				o({ consents: u, selectedConsents: u, activeUI: 'none' });
		} catch {}
	}
	function If(e, t) {
		return e
			? {
					necessary: !0,
					functionality: !0,
					experience: !0,
					marketing: !t,
					measurement: !t,
				}
			: null;
	}
	function Nd(e, t, o, n) {
		let r = Jc(e, t),
			s = n !== void 0 ? n : Qc(),
			a = If((r === null || r === 'opt-out') && o === null, s);
		return { consentModel: r, autoGrantedConsents: a };
	}
	function _f(e, t, o, n) {
		let { get: r, initialTranslationConfig: s } = t,
			{ consentInfo: i } = r(),
			{ translations: a, location: l } = e,
			{ consentModel: u, autoGrantedConsents: m } = Nd(
				e.jurisdiction ?? null,
				n,
				i,
				t.get().overrides?.gpc
			),
			p = {
				model: u,
				isLoadingConsentInfo: !1,
				branding: e.branding ?? 'c15t',
				hasFetchedBanner: !0,
				lastBannerFetchData: e,
				locationInfo: {
					countryCode: l?.countryCode ?? null,
					regionCode: l?.regionCode ?? null,
					jurisdiction: e.jurisdiction ?? null,
				},
			};
		return (
			i === null && (p.activeUI = u ? 'banner' : 'none'),
			m && ((p.consents = m), (p.selectedConsents = m)),
			a?.language &&
				a?.translations &&
				(p.translationConfig = Ms(
					{
						translations: { [a.language]: a.translations },
						disableAutoLanguageSwitch: !0,
						defaultLanguage: a.language,
					},
					s
				)),
			p
		);
	}
	function Rf(e, t, o) {
		let { get: n } = t,
			{ callbacks: r } = n(),
			{ translations: s } = e;
		o && r?.onConsentSet?.({ preferences: o }),
			s?.language &&
				s?.translations &&
				r?.onBannerFetched?.({
					jurisdiction: e.jurisdiction,
					location: e.location,
					translations: { language: s.language, translations: s.translations },
				});
	}
	async function Bi(e, t, o, n) {
		let { set: r, get: s } = t,
			{ consentInfo: i } = s(),
			a = s().iab;
		if (t.iabConfig && !a) {
			let { createIABManager: f } = await Promise.resolve().then(
				() => (Pi(), Ld)
			);
			(a = f(t.iabConfig, s, r, t.manager)), r({ iab: a });
		}
		let l = a?.config.enabled && !n,
			u = a?.config.enabled && !l;
		l &&
			console.warn(
				'IAB mode disabled: Server returned 200 without GVL. Client IAB settings overridden.'
			);
		let { consentModel: m, autoGrantedConsents: p } = Nd(
				e.jurisdiction ?? null,
				u,
				i,
				s().overrides?.gpc
			),
			d = _f(e, t, o, u);
		if (
			(l && a
				? (d.iab = { ...a, config: { ...a.config, enabled: !1 } })
				: a &&
					e.cmpId != null &&
					(d.iab = { ...a, config: { ...a.config, cmpId: e.cmpId } }),
			r(d),
			Rf(e, t, p),
			s().updateScripts(),
			u && m === 'iab' && a)
		) {
			let f = e.customVendors ?? [],
				h = a.config.customVendors ?? [],
				x = new Set(f.map((C) => C.id)),
				b = [...f, ...h.filter((C) => !x.has(C.id))],
				y = {
					...a.config,
					customVendors: b,
					...(e.cmpId != null && { cmpId: e.cmpId }),
				};
			Ed(y, { set: r, get: s }, n).catch((C) => {
				console.error('Failed to initialize IAB mode in updateStore:', C);
			});
		}
	}
	function Pd(e) {
		try {
			if (window.localStorage)
				return (
					window.localStorage.setItem('c15t-storage-test-key', 'test'),
					window.localStorage.removeItem('c15t-storage-test-key'),
					!0
				);
		} catch (t) {
			console.warn('localStorage not available, skipping consent banner:', t),
				e({ isLoadingConsentInfo: !1, activeUI: 'none' });
		}
		return !1;
	}
	async function Oi(e) {
		let { get: t, set: o, manager: n } = e,
			{ callbacks: r } = t();
		if (typeof window > 'u') return;
		let s = Pd(o);
		if (!s) return;
		o({ isLoadingConsentInfo: !0 }), Lf(n, r);
		let i = await Tf(e);
		return i || Af(e, s, n, r);
	}
	async function Tf(e) {
		let { ssrData: t, get: o, set: n } = e;
		if (!t || o().overrides) {
			n({ ssrDataUsed: !1, ssrSkippedReason: 'no_data' });
			return;
		}
		let r = await t;
		if (r?.init)
			return (
				await Bi(r.init, e, !0, r.gvl),
				n({ ssrDataUsed: !0, ssrSkippedReason: null }),
				r.init
			);
		n({ ssrDataUsed: !1, ssrSkippedReason: 'fetch_failed' });
	}
	async function Af(e, t, o, n) {
		let { set: r } = e;
		try {
			let { language: s, country: i, region: a } = e.get().overrides ?? {},
				{ data: l, error: u } = await o.init({
					headers: {
						...(s && { 'accept-language': s }),
						...(i && { 'x-c15t-country': i }),
						...(a && { 'x-c15t-region': a }),
					},
					onError: n.onError
						? (m) => {
								n.onError?.({ error: m.error?.message || 'Unknown error' });
							}
						: void 0,
				});
			if (u || !l)
				throw new Error(`Failed to fetch consent banner info: ${u?.message}`);
			return await Bi(l, e, t, l.gvl ?? void 0), l;
		} catch (s) {
			console.error('Error fetching consent banner information:', s),
				r({ isLoadingConsentInfo: !1, activeUI: 'none' });
			let i =
				s instanceof Error
					? s.message
					: 'Unknown error fetching consent banner information';
			n.onError?.({ error: i });
			return;
		}
	}
	function Lf(e, t) {
		try {
			let o = localStorage.getItem(yr);
			if (!o) return;
			localStorage.removeItem(yr);
			let n = JSON.parse(o);
			e.setConsent({
				body: {
					type: 'cookie_banner',
					domain: n.domain,
					preferences: n.preferences,
					subjectId: n.subjectId,
					externalSubjectId: n.externalId,
					identityProvider: n.identityProvider,
					jurisdiction: n.jurisdiction,
					jurisdictionModel: n.jurisdictionModel ?? void 0,
					givenAt: n.givenAt,
					uiSource: n.uiSource ?? 'api',
				},
			})
				.then((r) => {
					if (!r.ok) {
						let s = r.error?.message ?? 'Failed to sync consent after reload';
						t.onError?.({ error: s }),
							t.onError ||
								console.error('Failed to sync consent after reload:', s);
					}
				})
				.catch((r) => {
					let s =
						r instanceof Error
							? r.message
							: 'Failed to sync consent after reload';
					t.onError?.({ error: s }),
						t.onError ||
							console.error('Failed to sync consent after reload:', r);
				});
		} catch {}
	}
	function Di(e) {
		return e ? e.toUpperCase() : 'GET';
	}
	function Ef(e) {
		if (!e) return null;
		try {
			return typeof window > 'u' ? null : new URL(e, window.location.href);
		} catch {
			return null;
		}
	}
	function Nf(e, t) {
		if (!e) return !1;
		let o = t.domain.trim().toLowerCase(),
			n = e.trim().toLowerCase();
		if (!o || !n) return !1;
		if (n === o) return !0;
		let r = `.${o}`;
		return n.endsWith(r);
	}
	function Pf(e, t) {
		return typeof t.pathIncludes == 'string'
			? e
				? e.includes(t.pathIncludes)
				: !1
			: !0;
	}
	function Bf(e, t) {
		if (!t.methods || t.methods.length === 0) return !0;
		if (!e) return !1;
		let o = Di(e);
		return t.methods.some((n) => Di(n) === o);
	}
	function Of(e, t, o) {
		return !(!Nf(e.hostname, o) || !Pf(e.pathname, o) || !Bf(t, o));
	}
	function ji(e, t, o) {
		if (!o) return { shouldBlock: !1 };
		if (!(o.enabled !== !1)) return { shouldBlock: !1 };
		if (!o.rules || o.rules.length === 0) return { shouldBlock: !1 };
		let r = Ef(e.url);
		if (!r) return { shouldBlock: !1 };
		let s = Di(e.method);
		for (let i of o.rules) {
			if (!Of(r, s, i)) continue;
			if (!dt(i.category, t)) return { shouldBlock: !0, rule: i };
		}
		return { shouldBlock: !1 };
	}
	function Bd(e, t) {
		let o = null,
			n = null,
			r = null,
			s = !1,
			i = null,
			a = (p, d) => {
				if (p) {
					if (p.logBlockedRequests !== !1) {
						let f = d.rule?.id ?? 'unknown';
						console.warn('[c15t] Network request blocked by consent manager', {
							method: d.method,
							url: d.url,
							ruleId: f,
						});
					}
					p.onRequestBlocked && p.onRequestBlocked(d);
				}
			},
			l = () => i || e().consents,
			u = () => {
				typeof window > 'u' ||
					!(typeof window.fetch == 'function') ||
					o ||
					((o = window.fetch),
					(window.fetch = (d, f) => {
						let x = e().networkBlocker;
						if (!o)
							throw new Error('Network blocker fetch wrapper not initialized.');
						if (!(x?.enabled && x?.rules && x?.rules.length > 0))
							return o.call(window, d, f);
						let y = 'GET';
						f?.method ? (y = f.method) : d instanceof Request && (y = d.method);
						let C;
						typeof d == 'string' || d instanceof URL
							? (C = d.toString())
							: (C = d.url);
						let g = l(),
							{ shouldBlock: S, rule: A } = ji({ url: C, method: y }, g, x);
						if (S) {
							a(x, { method: y, url: C, rule: A });
							let I = new Response(null, {
								status: 451,
								statusText: 'Request blocked by consent manager',
							});
							return Promise.resolve(I);
						}
						return o.call(window, d, f);
					}));
			},
			m = () => {
				typeof window > 'u' ||
					!(
						typeof window.XMLHttpRequest < 'u' &&
						typeof window.XMLHttpRequest.prototype.open == 'function' &&
						typeof window.XMLHttpRequest.prototype.send == 'function'
					) ||
					n ||
					r ||
					((n = window.XMLHttpRequest.prototype.open),
					(r = window.XMLHttpRequest.prototype.send),
					(window.XMLHttpRequest.prototype.open = function (d, f, h, x, b) {
						let y = this;
						if (((y.__c15tMethod = d), (y.__c15tUrl = f), !n))
							throw new Error(
								'Network blocker XHR open wrapper not initialized.'
							);
						return n.call(this, d, f, h ?? !0, x, b);
					}),
					(window.XMLHttpRequest.prototype.send = function (d) {
						let h = e().networkBlocker;
						if (h?.enabled !== !1 && h?.rules && h?.rules.length > 0) {
							let y = this,
								C = y.__c15tMethod || 'GET',
								g = y.__c15tUrl || '',
								S = l(),
								{ shouldBlock: A, rule: I } = ji({ url: g, method: C }, S, h);
							if (A) {
								a(h, { method: C, url: g, rule: I });
								try {
									this.abort();
								} catch {}
								let _ = new ProgressEvent('error');
								typeof this.onerror == 'function' && this.onerror(_),
									this.dispatchEvent(_);
								return;
							}
						}
						if (!r)
							throw new Error(
								'Network blocker XHR send wrapper not initialized.'
							);
						return r.call(this, d);
					}));
			};
		return {
			initializeNetworkBlocker: () => {
				if (s || typeof window > 'u') return;
				let p = e(),
					d = p.networkBlocker;
				d?.enabled &&
					d?.rules &&
					d?.rules.length > 0 &&
					((i = p.consents), u(), m(), (s = !0));
			},
			updateNetworkBlockerConsents: () => {
				s && (i = e().consents);
			},
			setNetworkBlocker: (p) => {
				let f = p?.enabled !== !1 && p?.rules && p?.rules.length > 0;
				if ((t({ networkBlocker: p }), !f)) {
					if (!s || typeof window > 'u') return;
					o && ((window.fetch = o), (o = null)),
						n &&
							r &&
							((window.XMLHttpRequest.prototype.open = n),
							(window.XMLHttpRequest.prototype.send = r),
							(n = null),
							(r = null)),
						(i = null),
						(s = !1);
					return;
				}
				s || ((i = e().consents), u(), m(), (s = !0));
			},
			destroyNetworkBlocker: () => {
				s &&
					(typeof window > 'u' ||
						(o && ((window.fetch = o), (o = null)),
						n &&
							r &&
							((window.XMLHttpRequest.prototype.open = n),
							(window.XMLHttpRequest.prototype.send = r),
							(n = null),
							(r = null)),
						(i = null),
						(s = !1)));
			},
		};
	}
	bo();
	Zs();
	var Od = (e) => {
			if (typeof window > 'u') return null;
			try {
				return gt(e);
			} catch (t) {
				return console.error('Failed to retrieve stored consent:', t), null;
			}
		},
		Mi = (e, t = {}) => {
			let {
				namespace: o = 'c15tStore',
				iab: n,
				ssrData: r,
				initialConsentCategories: s,
				initialTranslationConfig: i,
				enabled: a,
				debug: l,
				...u
			} = t;
			Cc(t.debug === !0);
			let m = Od(t.storageConfig),
				p = Yc((d, f) => ({
					...Ac,
					...u,
					namespace: o,
					iab: null,
					...(s && { consentCategories: s }),
					...(m
						? {
								consents: m.consents,
								selectedConsents: m.consents,
								consentInfo: m.consentInfo,
								user: m.consentInfo?.externalId
									? {
											id: m.consentInfo.externalId,
											identityProvider: m.consentInfo.identityProvider,
										}
									: void 0,
								activeUI: 'none',
								isLoadingConsentInfo: !1,
							}
						: { activeUI: 'none', isLoadingConsentInfo: !0 }),
					setActiveUI: (h, x = {}) => {
						if (h === 'none' || h === 'dialog') {
							d({ activeUI: h });
							return;
						}
						if (x.force) {
							d({ activeUI: 'banner' });
							return;
						}
						let b = f();
						!Od() &&
							!b.consentInfo &&
							!b.isLoadingConsentInfo &&
							d({ activeUI: 'banner' });
					},
					setSelectedConsent: (h, x) => {
						d((b) =>
							b.consentTypes.find((C) => C.name === h)?.disabled
								? b
								: { selectedConsents: { ...b.selectedConsents, [h]: x } }
						);
					},
					saveConsents: async (h, x) =>
						await Xc({ manager: e, type: h, get: f, set: d, options: x }),
					setConsent: (h, x) => {
						d((b) =>
							b.consentTypes.find((g) => g.name === h)?.disabled
								? b
								: { selectedConsents: { ...b.consents, [h]: x } }
						),
							f().saveConsents('custom');
					},
					resetConsents: () => {
						d(() => {
							let h = Lt.reduce(
									(b, y) => ((b[y.name] = y.defaultValue), b),
									{}
								),
								x = { consents: h, selectedConsents: h, consentInfo: null };
							return ln(void 0, t.storageConfig), x;
						});
					},
					setConsentCategories: (h) => d({ consentCategories: h }),
					setCallback: (h, x) => {
						let b = f();
						if (
							(d((y) => ({ callbacks: { ...y.callbacks, [h]: x } })),
							h === 'onConsentSet' &&
								x &&
								typeof x == 'function' &&
								x?.({ preferences: b.consents }),
							h === 'onBannerFetched' &&
								b.hasFetchedBanner &&
								b.lastBannerFetchData &&
								x &&
								typeof x == 'function')
						) {
							let { lastBannerFetchData: y } = b,
								C = y.jurisdiction ?? 'NONE';
							x?.({
								jurisdiction: { code: C, message: '' },
								location: {
									countryCode: y.location.countryCode ?? null,
									regionCode: y.location.regionCode ?? null,
								},
								translations: {
									language: y.translations.language,
									translations: y.translations.translations,
								},
							});
						}
					},
					setLocationInfo: (h) => d({ locationInfo: h }),
					initConsentManager: () =>
						Oi({
							manager: e,
							ssrData: t.ssrData,
							initialTranslationConfig: t.initialTranslationConfig,
							iabConfig: n,
							get: f,
							set: d,
						}),
					getDisplayedConsents: () => {
						let { consentCategories: h, consentTypes: x } = f();
						return x.filter((b) => h.includes(b.name));
					},
					hasConsented: () => {
						let { consentInfo: h } = f();
						return h != null;
					},
					has: (h) => {
						let { consents: x } = f();
						return dt(h, x);
					},
					setTranslationConfig: (h) => {
						d({ translationConfig: h });
					},
					updateConsentCategories: (h) => {
						let x = new Set([...f().consentCategories, ...h]),
							b = Array.from(x);
						d({ consentCategories: b });
					},
					identifyUser: async (h) => {
						let x = f().consentInfo,
							b = x?.subjectId;
						d({ user: h }),
							b &&
								((String(x?.externalId) === String(h.id) &&
									x?.identityProvider === h.identityProvider) ||
									(await e.identifyUser({
										body: {
											id: b,
											externalId: h.id,
											identityProvider: h.identityProvider,
										},
									}),
									d({
										consentInfo: {
											...x,
											time: x?.time || Date.now(),
											subjectId: b,
											externalId: h.id,
											identityProvider: h.identityProvider,
										},
									})));
					},
					setOverrides: async (h) => (
						d({ overrides: { ...f().overrides, ...h } }),
						await Oi({
							manager: e,
							initialTranslationConfig: t.initialTranslationConfig,
							get: f,
							set: d,
						})
					),
					setLanguage: async (h) =>
						await f().setOverrides({ ...(f().overrides ?? {}), language: h }),
					...li(f, d),
					...Zc(f, d),
					...Bd(f, d),
				}));
			return (
				p.getState().initializeIframeBlocker(),
				t.networkBlocker &&
					(p.setState({ networkBlocker: t.networkBlocker }),
					p.getState().initializeNetworkBlocker()),
				t.scripts &&
					t.scripts.length > 0 &&
					p
						.getState()
						.updateConsentCategories(t.scripts.flatMap((d) => lr(d.category))),
				typeof window < 'u' &&
					((window[o] = p),
					p
						.getState()
						.callbacks.onConsentSet?.({ preferences: p.getState().consents }),
					t.user && p.getState().identifyUser(t.user),
					p.getState().initConsentManager()),
				p
			);
		};
	var Df = '/api/c15t',
		Dd = new Map(),
		jd = new Map();
	function jf(e) {
		let t = e.enabled === !1 ? 'disabled' : 'enabled';
		return `${e.mode ?? 'c15t'}:${e.backendURL ?? 'default'}:${e.endpointHandlers ? 'custom' : 'none'}:${e.storageConfig?.storageKey ?? 'default'}:${e.defaultLanguage ?? 'default'}:${t}`;
	}
	function Vi(e, t) {
		let {
				mode: o,
				backendURL: n,
				store: r,
				translations: s,
				storageConfig: i,
				enabled: a,
				iab: l,
				consentCategories: u,
				debug: m,
			} = e,
			p = jf({
				mode: o,
				backendURL: n,
				endpointHandlers: 'endpointHandlers' in e ? e.endpointHandlers : void 0,
				storageConfig: i,
				defaultLanguage: s?.defaultLanguage,
				enabled: a,
			}),
			d = Dd.get(p);
		if (!d) {
			let h = { ...r, initialTranslationConfig: s, iab: l };
			o === 'offline'
				? (d = So({ mode: 'offline', store: h, storageConfig: i }))
				: o === 'custom' && 'endpointHandlers' in e
					? (d = So({
							mode: 'custom',
							endpointHandlers: e.endpointHandlers,
							store: h,
							storageConfig: i,
						}))
					: (d = So({
							mode: 'c15t',
							backendURL: n || Df,
							store: h,
							storageConfig: i,
						})),
				Dd.set(p, d);
		}
		let f = jd.get(p);
		return (
			f ||
				((f = Mi(d, {
					config: {
						pkg: t?.pkg || 'c15t',
						version: t?.version || ft,
						mode: o || 'Unknown',
					},
					...e,
					...r,
					initialTranslationConfig: s,
					initialConsentCategories: u,
					debug: m,
				})),
				jd.set(p, f)),
			{ consentManager: d, consentStore: f, cacheKey: p }
		);
	}
	Qn();
	bo();
	var An,
		G,
		Ud,
		Vf,
		io,
		Md,
		Hd,
		zd,
		Gd,
		Gi,
		Fi,
		Ui,
		$d,
		Tn = {},
		Wd = [],
		Ff = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i,
		Ln = Array.isArray;
	function xt(e, t) {
		for (var o in t) e[o] = t[o];
		return e;
	}
	function $i(e) {
		e && e.parentNode && e.parentNode.removeChild(e);
	}
	function et(e, t, o) {
		var n,
			r,
			s,
			i = {};
		for (s in t)
			s == 'key' ? (n = t[s]) : s == 'ref' ? (r = t[s]) : (i[s] = t[s]);
		if (
			(arguments.length > 2 &&
				(i.children = arguments.length > 3 ? An.call(arguments, 2) : o),
			typeof e == 'function' && e.defaultProps != null)
		)
			for (s in e.defaultProps) i[s] === void 0 && (i[s] = e.defaultProps[s]);
		return Rn(e, i, n, r, null);
	}
	function Rn(e, t, o, n, r) {
		var s = {
			type: e,
			props: t,
			key: o,
			ref: n,
			__k: null,
			__: null,
			__b: 0,
			__e: null,
			__c: null,
			constructor: void 0,
			__v: r ?? ++Ud,
			__i: -1,
			__u: 0,
		};
		return r == null && G.vnode != null && G.vnode(s), s;
	}
	function Br() {
		return { current: null };
	}
	function W(e) {
		return e.children;
	}
	function Ve(e, t) {
		(this.props = e), (this.context = t);
	}
	function Lo(e, t) {
		if (t == null) return e.__ ? Lo(e.__, e.__i + 1) : null;
		for (var o; t < e.__k.length; t++)
			if ((o = e.__k[t]) != null && o.__e != null) return o.__e;
		return typeof e.type == 'function' ? Lo(e) : null;
	}
	function qd(e) {
		var t, o;
		if ((e = e.__) != null && e.__c != null) {
			for (e.__e = e.__c.base = null, t = 0; t < e.__k.length; t++)
				if ((o = e.__k[t]) != null && o.__e != null) {
					e.__e = e.__c.base = o.__e;
					break;
				}
			return qd(e);
		}
	}
	function Hi(e) {
		((!e.__d && (e.__d = !0) && io.push(e) && !Pr.__r++) ||
			Md != G.debounceRendering) &&
			((Md = G.debounceRendering) || Hd)(Pr);
	}
	function Pr() {
		for (var e, t, o, n, r, s, i, a = 1; io.length; )
			io.length > a && io.sort(zd),
				(e = io.shift()),
				(a = io.length),
				e.__d &&
					((o = void 0),
					(n = void 0),
					(r = (n = (t = e).__v).__e),
					(s = []),
					(i = []),
					t.__P &&
						(((o = xt({}, n)).__v = n.__v + 1),
						G.vnode && G.vnode(o),
						Wi(
							t.__P,
							o,
							n,
							t.__n,
							t.__P.namespaceURI,
							32 & n.__u ? [r] : null,
							s,
							r ?? Lo(n),
							!!(32 & n.__u),
							i
						),
						(o.__v = n.__v),
						(o.__.__k[o.__i] = o),
						Zd(s, o, i),
						(n.__e = n.__ = null),
						o.__e != r && qd(o)));
		Pr.__r = 0;
	}
	function Kd(e, t, o, n, r, s, i, a, l, u, m) {
		var p,
			d,
			f,
			h,
			x,
			b,
			y,
			C = (n && n.__k) || Wd,
			g = t.length;
		for (l = Uf(o, t, C, l, g), p = 0; p < g; p++)
			(f = o.__k[p]) != null &&
				((d = f.__i == -1 ? Tn : C[f.__i] || Tn),
				(f.__i = p),
				(b = Wi(e, f, d, r, s, i, a, l, u, m)),
				(h = f.__e),
				f.ref &&
					d.ref != f.ref &&
					(d.ref && qi(d.ref, null, f), m.push(f.ref, f.__c || h, f)),
				x == null && h != null && (x = h),
				(y = !!(4 & f.__u)) || d.__k === f.__k
					? (l = Yd(f, l, e, y))
					: typeof f.type == 'function' && b !== void 0
						? (l = b)
						: h && (l = h.nextSibling),
				(f.__u &= -7));
		return (o.__e = x), l;
	}
	function Uf(e, t, o, n, r) {
		var s,
			i,
			a,
			l,
			u,
			m = o.length,
			p = m,
			d = 0;
		for (e.__k = new Array(r), s = 0; s < r; s++)
			(i = t[s]) != null && typeof i != 'boolean' && typeof i != 'function'
				? ((l = s + d),
					((i = e.__k[s] =
						typeof i == 'string' ||
						typeof i == 'number' ||
						typeof i == 'bigint' ||
						i.constructor == String
							? Rn(null, i, null, null, null)
							: Ln(i)
								? Rn(W, { children: i }, null, null, null)
								: i.constructor == null && i.__b > 0
									? Rn(i.type, i.props, i.key, i.ref ? i.ref : null, i.__v)
									: i).__ = e),
					(i.__b = e.__b + 1),
					(a = null),
					(u = i.__i = Hf(i, o, l, p)) != -1 &&
						(p--, (a = o[u]) && (a.__u |= 2)),
					a == null || a.__v == null
						? (u == -1 && (r > m ? d-- : r < m && d++),
							typeof i.type != 'function' && (i.__u |= 4))
						: u != l &&
							(u == l - 1
								? d--
								: u == l + 1
									? d++
									: (u > l ? d-- : d++, (i.__u |= 4))))
				: (e.__k[s] = null);
		if (p)
			for (s = 0; s < m; s++)
				(a = o[s]) != null &&
					(2 & a.__u) == 0 &&
					(a.__e == n && (n = Lo(a)), Jd(a, a));
		return n;
	}
	function Yd(e, t, o, n) {
		var r, s;
		if (typeof e.type == 'function') {
			for (r = e.__k, s = 0; r && s < r.length; s++)
				r[s] && ((r[s].__ = e), (t = Yd(r[s], t, o, n)));
			return t;
		}
		e.__e != t &&
			(n &&
				(t && e.type && !t.parentNode && (t = Lo(e)),
				o.insertBefore(e.__e, t || null)),
			(t = e.__e));
		do t = t && t.nextSibling;
		while (t != null && t.nodeType == 8);
		return t;
	}
	function St(e, t) {
		return (
			(t = t || []),
			e == null ||
				typeof e == 'boolean' ||
				(Ln(e)
					? e.some(function (o) {
							St(o, t);
						})
					: t.push(e)),
			t
		);
	}
	function Hf(e, t, o, n) {
		var r,
			s,
			i,
			a = e.key,
			l = e.type,
			u = t[o],
			m = u != null && (2 & u.__u) == 0;
		if ((u === null && e.key == null) || (m && a == u.key && l == u.type))
			return o;
		if (n > (m ? 1 : 0)) {
			for (r = o - 1, s = o + 1; r >= 0 || s < t.length; )
				if (
					(u = t[(i = r >= 0 ? r-- : s++)]) != null &&
					(2 & u.__u) == 0 &&
					a == u.key &&
					l == u.type
				)
					return i;
		}
		return -1;
	}
	function Vd(e, t, o) {
		t[0] == '-'
			? e.setProperty(t, o ?? '')
			: (e[t] =
					o == null ? '' : typeof o != 'number' || Ff.test(t) ? o : o + 'px');
	}
	function Nr(e, t, o, n, r) {
		var s, i;
		e: if (t == 'style')
			if (typeof o == 'string') e.style.cssText = o;
			else {
				if ((typeof n == 'string' && (e.style.cssText = n = ''), n))
					for (t in n) (o && t in o) || Vd(e.style, t, '');
				if (o) for (t in o) (n && o[t] == n[t]) || Vd(e.style, t, o[t]);
			}
		else if (t[0] == 'o' && t[1] == 'n')
			(s = t != (t = t.replace(Gd, '$1'))),
				(i = t.toLowerCase()),
				(t =
					i in e || t == 'onFocusOut' || t == 'onFocusIn'
						? i.slice(2)
						: t.slice(2)),
				e.l || (e.l = {}),
				(e.l[t + s] = o),
				o
					? n
						? (o.u = n.u)
						: ((o.u = Gi), e.addEventListener(t, s ? Ui : Fi, s))
					: e.removeEventListener(t, s ? Ui : Fi, s);
		else {
			if (r == 'http://www.w3.org/2000/svg')
				t = t.replace(/xlink(H|:h)/, 'h').replace(/sName$/, 's');
			else if (
				t != 'width' &&
				t != 'height' &&
				t != 'href' &&
				t != 'list' &&
				t != 'form' &&
				t != 'tabIndex' &&
				t != 'download' &&
				t != 'rowSpan' &&
				t != 'colSpan' &&
				t != 'role' &&
				t != 'popover' &&
				t in e
			)
				try {
					e[t] = o ?? '';
					break e;
				} catch {}
			typeof o == 'function' ||
				(o == null || (o === !1 && t[4] != '-')
					? e.removeAttribute(t)
					: e.setAttribute(t, t == 'popover' && o == 1 ? '' : o));
		}
	}
	function Fd(e) {
		return function (t) {
			if (this.l) {
				var o = this.l[t.type + e];
				if (t.t == null) t.t = Gi++;
				else if (t.t < o.u) return;
				return o(G.event ? G.event(t) : t);
			}
		};
	}
	function Wi(e, t, o, n, r, s, i, a, l, u) {
		var m,
			p,
			d,
			f,
			h,
			x,
			b,
			y,
			C,
			g,
			S,
			A,
			I,
			_,
			O,
			B,
			E,
			L = t.type;
		if (t.constructor != null) return null;
		128 & o.__u && ((l = !!(32 & o.__u)), (s = [(a = t.__e = o.__e)])),
			(m = G.__b) && m(t);
		e: if (typeof L == 'function')
			try {
				if (
					((y = t.props),
					(C = 'prototype' in L && L.prototype.render),
					(g = (m = L.contextType) && n[m.__c]),
					(S = m ? (g ? g.props.value : m.__) : n),
					o.__c
						? (b = (p = t.__c = o.__c).__ = p.__E)
						: (C
								? (t.__c = p = new L(y, S))
								: ((t.__c = p = new Ve(y, S)),
									(p.constructor = L),
									(p.render = Gf)),
							g && g.sub(p),
							(p.props = y),
							p.state || (p.state = {}),
							(p.context = S),
							(p.__n = n),
							(d = p.__d = !0),
							(p.__h = []),
							(p._sb = [])),
					C && p.__s == null && (p.__s = p.state),
					C &&
						L.getDerivedStateFromProps != null &&
						(p.__s == p.state && (p.__s = xt({}, p.__s)),
						xt(p.__s, L.getDerivedStateFromProps(y, p.__s))),
					(f = p.props),
					(h = p.state),
					(p.__v = t),
					d)
				)
					C &&
						L.getDerivedStateFromProps == null &&
						p.componentWillMount != null &&
						p.componentWillMount(),
						C && p.componentDidMount != null && p.__h.push(p.componentDidMount);
				else {
					if (
						(C &&
							L.getDerivedStateFromProps == null &&
							y !== f &&
							p.componentWillReceiveProps != null &&
							p.componentWillReceiveProps(y, S),
						(!p.__e &&
							p.shouldComponentUpdate != null &&
							p.shouldComponentUpdate(y, p.__s, S) === !1) ||
							t.__v == o.__v)
					) {
						for (
							t.__v != o.__v &&
								((p.props = y), (p.state = p.__s), (p.__d = !1)),
								t.__e = o.__e,
								t.__k = o.__k,
								t.__k.some(function (H) {
									H && (H.__ = t);
								}),
								A = 0;
							A < p._sb.length;
							A++
						)
							p.__h.push(p._sb[A]);
						(p._sb = []), p.__h.length && i.push(p);
						break e;
					}
					p.componentWillUpdate != null && p.componentWillUpdate(y, p.__s, S),
						C &&
							p.componentDidUpdate != null &&
							p.__h.push(function () {
								p.componentDidUpdate(f, h, x);
							});
				}
				if (
					((p.context = S),
					(p.props = y),
					(p.__P = e),
					(p.__e = !1),
					(I = G.__r),
					(_ = 0),
					C)
				) {
					for (
						p.state = p.__s,
							p.__d = !1,
							I && I(t),
							m = p.render(p.props, p.state, p.context),
							O = 0;
						O < p._sb.length;
						O++
					)
						p.__h.push(p._sb[O]);
					p._sb = [];
				} else
					do
						(p.__d = !1),
							I && I(t),
							(m = p.render(p.props, p.state, p.context)),
							(p.state = p.__s);
					while (p.__d && ++_ < 25);
				(p.state = p.__s),
					p.getChildContext != null && (n = xt(xt({}, n), p.getChildContext())),
					C &&
						!d &&
						p.getSnapshotBeforeUpdate != null &&
						(x = p.getSnapshotBeforeUpdate(f, h)),
					(B = m),
					m != null &&
						m.type === W &&
						m.key == null &&
						(B = Xd(m.props.children)),
					(a = Kd(e, Ln(B) ? B : [B], t, o, n, r, s, i, a, l, u)),
					(p.base = t.__e),
					(t.__u &= -161),
					p.__h.length && i.push(p),
					b && (p.__E = p.__ = null);
			} catch (H) {
				if (((t.__v = null), l || s != null))
					if (H.then) {
						for (
							t.__u |= l ? 160 : 128;
							a && a.nodeType == 8 && a.nextSibling;
						)
							a = a.nextSibling;
						(s[s.indexOf(a)] = null), (t.__e = a);
					} else {
						for (E = s.length; E--; ) $i(s[E]);
						zi(t);
					}
				else (t.__e = o.__e), (t.__k = o.__k), H.then || zi(t);
				G.__e(H, t, o);
			}
		else
			s == null && t.__v == o.__v
				? ((t.__k = o.__k), (t.__e = o.__e))
				: (a = t.__e = zf(o.__e, t, o, n, r, s, i, l, u));
		return (m = G.diffed) && m(t), 128 & t.__u ? void 0 : a;
	}
	function zi(e) {
		e && e.__c && (e.__c.__e = !0), e && e.__k && e.__k.forEach(zi);
	}
	function Zd(e, t, o) {
		for (var n = 0; n < o.length; n++) qi(o[n], o[++n], o[++n]);
		G.__c && G.__c(t, e),
			e.some(function (r) {
				try {
					(e = r.__h),
						(r.__h = []),
						e.some(function (s) {
							s.call(r);
						});
				} catch (s) {
					G.__e(s, r.__v);
				}
			});
	}
	function Xd(e) {
		return typeof e != 'object' || e == null || (e.__b && e.__b > 0)
			? e
			: Ln(e)
				? e.map(Xd)
				: xt({}, e);
	}
	function zf(e, t, o, n, r, s, i, a, l) {
		var u,
			m,
			p,
			d,
			f,
			h,
			x,
			b = o.props,
			y = t.props,
			C = t.type;
		if (
			(C == 'svg'
				? (r = 'http://www.w3.org/2000/svg')
				: C == 'math'
					? (r = 'http://www.w3.org/1998/Math/MathML')
					: r || (r = 'http://www.w3.org/1999/xhtml'),
			s != null)
		) {
			for (u = 0; u < s.length; u++)
				if (
					(f = s[u]) &&
					'setAttribute' in f == !!C &&
					(C ? f.localName == C : f.nodeType == 3)
				) {
					(e = f), (s[u] = null);
					break;
				}
		}
		if (e == null) {
			if (C == null) return document.createTextNode(y);
			(e = document.createElementNS(r, C, y.is && y)),
				a && (G.__m && G.__m(t, s), (a = !1)),
				(s = null);
		}
		if (C == null) b === y || (a && e.data == y) || (e.data = y);
		else {
			if (
				((s = s && An.call(e.childNodes)), (b = o.props || Tn), !a && s != null)
			)
				for (b = {}, u = 0; u < e.attributes.length; u++)
					b[(f = e.attributes[u]).name] = f.value;
			for (u in b)
				if (((f = b[u]), u != 'children')) {
					if (u == 'dangerouslySetInnerHTML') p = f;
					else if (!(u in y)) {
						if (
							(u == 'value' && 'defaultValue' in y) ||
							(u == 'checked' && 'defaultChecked' in y)
						)
							continue;
						Nr(e, u, null, f, r);
					}
				}
			for (u in y)
				(f = y[u]),
					u == 'children'
						? (d = f)
						: u == 'dangerouslySetInnerHTML'
							? (m = f)
							: u == 'value'
								? (h = f)
								: u == 'checked'
									? (x = f)
									: (a && typeof f != 'function') ||
										b[u] === f ||
										Nr(e, u, f, b[u], r);
			if (m)
				a ||
					(p && (m.__html == p.__html || m.__html == e.innerHTML)) ||
					(e.innerHTML = m.__html),
					(t.__k = []);
			else if (
				(p && (e.innerHTML = ''),
				Kd(
					t.type == 'template' ? e.content : e,
					Ln(d) ? d : [d],
					t,
					o,
					n,
					C == 'foreignObject' ? 'http://www.w3.org/1999/xhtml' : r,
					s,
					i,
					s ? s[0] : o.__k && Lo(o, 0),
					a,
					l
				),
				s != null)
			)
				for (u = s.length; u--; ) $i(s[u]);
			a ||
				((u = 'value'),
				C == 'progress' && h == null
					? e.removeAttribute('value')
					: h != null &&
						(h !== e[u] ||
							(C == 'progress' && !h) ||
							(C == 'option' && h != b[u])) &&
						Nr(e, u, h, b[u], r),
				(u = 'checked'),
				x != null && x != e[u] && Nr(e, u, x, b[u], r));
		}
		return e;
	}
	function qi(e, t, o) {
		try {
			if (typeof e == 'function') {
				var n = typeof e.__u == 'function';
				n && e.__u(), (n && t == null) || (e.__u = e(t));
			} else e.current = t;
		} catch (r) {
			G.__e(r, o);
		}
	}
	function Jd(e, t, o) {
		var n, r;
		if (
			(G.unmount && G.unmount(e),
			(n = e.ref) && ((n.current && n.current != e.__e) || qi(n, null, t)),
			(n = e.__c) != null)
		) {
			if (n.componentWillUnmount)
				try {
					n.componentWillUnmount();
				} catch (s) {
					G.__e(s, t);
				}
			n.base = n.__P = null;
		}
		if ((n = e.__k))
			for (r = 0; r < n.length; r++)
				n[r] && Jd(n[r], t, o || typeof e.type != 'function');
		o || $i(e.__e), (e.__c = e.__ = e.__e = void 0);
	}
	function Gf(e, t, o) {
		return this.constructor(e, o);
	}
	function Eo(e, t, o) {
		var n, r, s, i;
		t == document && (t = document.documentElement),
			G.__ && G.__(e, t),
			(r = (n = typeof o == 'function') ? null : (o && o.__k) || t.__k),
			(s = []),
			(i = []),
			Wi(
				t,
				(e = ((!n && o) || t).__k = et(W, null, [e])),
				r || Tn,
				Tn,
				t.namespaceURI,
				!n && o ? [o] : r ? null : t.firstChild ? An.call(t.childNodes) : null,
				s,
				!n && o ? o : r ? r.__e : t.firstChild,
				n,
				i
			),
			Zd(s, e, i);
	}
	function Ki(e, t) {
		Eo(e, t, Ki);
	}
	function Qd(e, t, o) {
		var n,
			r,
			s,
			i,
			a = xt({}, e.props);
		for (s in (e.type && e.type.defaultProps && (i = e.type.defaultProps), t))
			s == 'key'
				? (n = t[s])
				: s == 'ref'
					? (r = t[s])
					: (a[s] = t[s] === void 0 && i != null ? i[s] : t[s]);
		return (
			arguments.length > 2 &&
				(a.children = arguments.length > 3 ? An.call(arguments, 2) : o),
			Rn(e.type, a, n || e.key, r || e.ref, null)
		);
	}
	function Ie(e) {
		function t(o) {
			var n, r;
			return (
				this.getChildContext ||
					((n = new Set()),
					((r = {})[t.__c] = this),
					(this.getChildContext = function () {
						return r;
					}),
					(this.componentWillUnmount = function () {
						n = null;
					}),
					(this.shouldComponentUpdate = function (s) {
						this.props.value != s.value &&
							n.forEach(function (i) {
								(i.__e = !0), Hi(i);
							});
					}),
					(this.sub = function (s) {
						n.add(s);
						var i = s.componentWillUnmount;
						s.componentWillUnmount = function () {
							n && n.delete(s), i && i.call(s);
						};
					})),
				o.children
			);
		}
		return (
			(t.__c = '__cC' + $d++),
			(t.__ = e),
			(t.Provider =
				t.__l =
				(t.Consumer = function (o, n) {
					return o.children(n);
				}).contextType =
					t),
			t
		);
	}
	(An = Wd.slice),
		(G = {
			__e: function (e, t, o, n) {
				for (var r, s, i; (t = t.__); )
					if ((r = t.__c) && !r.__)
						try {
							if (
								((s = r.constructor) &&
									s.getDerivedStateFromError != null &&
									(r.setState(s.getDerivedStateFromError(e)), (i = r.__d)),
								r.componentDidCatch != null &&
									(r.componentDidCatch(e, n || {}), (i = r.__d)),
								i)
							)
								return (r.__E = r);
						} catch (a) {
							e = a;
						}
				throw e;
			},
		}),
		(Ud = 0),
		(Vf = function (e) {
			return e != null && e.constructor == null;
		}),
		(Ve.prototype.setState = function (e, t) {
			var o;
			(o =
				this.__s != null && this.__s != this.state
					? this.__s
					: (this.__s = xt({}, this.state))),
				typeof e == 'function' && (e = e(xt({}, o), this.props)),
				e && xt(o, e),
				e != null && this.__v && (t && this._sb.push(t), Hi(this));
		}),
		(Ve.prototype.forceUpdate = function (e) {
			this.__v && ((this.__e = !0), e && this.__h.push(e), Hi(this));
		}),
		(Ve.prototype.render = W),
		(io = []),
		(Hd =
			typeof Promise == 'function'
				? Promise.prototype.then.bind(Promise.resolve())
				: setTimeout),
		(zd = function (e, t) {
			return e.__v.__b - t.__v.__b;
		}),
		(Pr.__r = 0),
		(Gd = /(PointerCapture)$|Capture$/i),
		(Gi = 0),
		(Fi = Fd(!1)),
		(Ui = Fd(!0)),
		($d = 0);
	var $f = 0;
	function c(e, t, o, n, r, s) {
		t || (t = {});
		var i,
			a,
			l = t;
		if ('ref' in l)
			for (a in ((l = {}), t)) a == 'ref' ? (i = t[a]) : (l[a] = t[a]);
		var u = {
			type: e,
			props: l,
			key: o,
			ref: i,
			__k: null,
			__: null,
			__b: 0,
			__e: null,
			__c: null,
			constructor: void 0,
			__v: --$f,
			__i: -1,
			__u: 0,
			__source: r,
			__self: s,
		};
		if (typeof e == 'function' && (i = e.defaultProps))
			for (a in i) l[a] === void 0 && (l[a] = i[a]);
		return G.vnode && G.vnode(u), u;
	}
	var Wf = {
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/components/consent-banner.module.css'(
				e,
				t,
				o
			) {
				o.d(t, { A: () => a });
				var n = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'
					),
					r = o.n(n),
					s = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'
					),
					i = o.n(s)()(r());
				i.push([
					e.id,
					':root{--consent-banner-font-family:var(--c15t-font-family);--consent-banner-line-height:var(--c15t-line-height-normal);--consent-banner-text-size-adjust:100%;--consent-banner-tab-size:4;--consent-banner-border-radius-sm:var(--c15t-radius-sm);--consent-banner-border-radius:var(--c15t-radius-lg);--consent-banner-max-width:440px;--consent-banner-animation-duration:var(--c15t-duration-normal);--consent-banner-animation-timing:var(--c15t-easing);--consent-banner-entry-animation:c15t-ui-enter-EoZFn var(--c15t-duration-fast)var(--c15t-easing);--consent-banner-exit-animation:c15t-ui-exit-Z4gI_ var(--c15t-duration-fast)var(--c15t-easing);--consent-banner-border-width:1px;--consent-banner-border-width-hairline:1px;--consent-banner-shadow:var(--c15t-shadow-lg);--consent-banner-shadow-dark:var(--c15t-shadow-lg);--consent-banner-background-color:var(--c15t-surface);--consent-banner-background-color-dark:var(--c15t-surface);--consent-banner-footer-background-color:var(--c15t-surface-hover);--consent-banner-footer-background-color-dark:var(--c15t-surface-hover);--consent-banner-text-color:var(--c15t-text);--consent-banner-text-color-dark:var(--c15t-text);--consent-banner-border-color:var(--c15t-border);--consent-banner-border-color-dark:var(--c15t-border);--consent-banner-title-color:var(--c15t-text);--consent-banner-title-color-dark:var(--c15t-text);--consent-banner-description-color:var(--c15t-text-muted);--consent-banner-description-color-dark:var(--c15t-text-muted);--consent-banner-overlay-background-color:var(--c15t-overlay);--consent-banner-overlay-background-color-dark:var(--c15t-overlay)}@media only screen and (resolution>=192dpi){:root{--consent-banner-border-width-hairline:.5px}}@layer components{.c15t-ui-root-hE9Kz{z-index:999999998;width:100%;font-family:var(--consent-banner-font-family);line-height:var(--consent-banner-line-height);-webkit-text-size-adjust:var(--consent-banner-text-size-adjust);-webkit-font-smoothing:antialiased;tab-size:var(--consent-banner-tab-size);flex-direction:column;padding:1rem;display:flex;position:fixed}.c15t-ui-bannerVisible-pYYY9{opacity:1;transition:opacity var(--consent-banner-animation-duration)var(--consent-banner-animation-timing),transform var(--consent-banner-animation-duration)cubic-bezier(.34,1.56,.64,1);transform:translateY(0)}.c15t-ui-bannerHidden-J4VZ3{opacity:0;transition:opacity var(--consent-banner-animation-duration)var(--consent-banner-animation-timing),transform var(--consent-banner-animation-duration)var(--consent-banner-animation-timing);transform:translateY(50px)}@media (width>=640px){.c15t-ui-root-hE9Kz{width:auto;padding:1.5rem}}.c15t-ui-bottomLeft-CbyqH{bottom:0;left:0}.c15t-ui-bottomRight-iIIdC{bottom:0;right:0}.c15t-ui-topLeft-GzbNM{top:0;left:0}.c15t-ui-topRight-siV7C{top:0;right:0}.c15t-ui-card-AUyl8{width:min(100%,var(--consent-banner-max-width));border-radius:var(--consent-banner-border-radius);border-width:var(--consent-banner-border-width);border-color:var(--consent-banner-border-color);background-color:var(--consent-banner-background-color);box-shadow:var(--consent-banner-shadow);position:relative;overflow:hidden}.c15t-dark .c15t-ui-card-AUyl8{background-color:var(--consent-banner-background-color-dark);border-color:var(--consent-banner-border-color-dark);box-shadow:var(--consent-banner-shadow-dark)}.c15t-ui-card-AUyl8[data-state=open]{animation:var(--consent-banner-entry-animation)}.c15t-ui-card-AUyl8[data-state=closed]{animation:var(--consent-banner-exit-animation)}.c15t-ui-card-AUyl8>:not([hidden])~:not([hidden]){border-top-width:var(--consent-banner-border-width);border-color:var(--consent-banner-border-color)}.c15t-dark .c15t-ui-card-AUyl8>:not([hidden])~:not([hidden]){border-color:var(--consent-banner-border-color-dark)}.c15t-ui-card-AUyl8:focus{outline-offset:2px;outline:none}@keyframes c15t-ui-enter-EoZFn{0%{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}@keyframes c15t-ui-exit-Z4gI_{0%{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(.95)}}.c15t-ui-rejectButton-RvYLm,.c15t-ui-acceptButton-jdwM4,.c15t-ui-customizeButton-mj4u4{width:100%}@media (width>=640px){.c15t-ui-rejectButton-RvYLm,.c15t-ui-acceptButton-jdwM4,.c15t-ui-customizeButton-mj4u4{width:auto}}.c15t-ui-header-pel5O{color:var(--consent-banner-text-color);flex-direction:column;padding:1rem;display:flex}.c15t-dark .c15t-ui-header-pel5O{color:var(--consent-banner-text-color-dark)}@media (width>=640px){.c15t-ui-header-pel5O{padding:1.5rem}}.c15t-ui-header-pel5O>:not([hidden])~:not([hidden]){--consent-banner-space-y-reverse:0;margin-top:calc(.5rem*calc(1 - var(--consent-banner-space-y-reverse)));margin-bottom:calc(.5rem*var(--consent-banner-space-y-reverse))}.c15t-ui-footer-MwauQ{background-color:var(--consent-banner-footer-background-color);flex-direction:column;justify-content:space-between;gap:.75rem;padding:1rem 1.25rem;display:flex}.c15t-dark .c15t-ui-footer-MwauQ{background-color:var(--consent-banner-footer-background-color-dark)}@media (width>=640px){.c15t-ui-footer-MwauQ{flex-direction:row}}.c15t-ui-footerSubGroup-YlOOW{flex-direction:row;justify-content:space-between;gap:1rem;display:flex}.c15t-ui-footerSubGroup-YlOOW button{flex-grow:1}.c15t-ui-description-ZuHLA{letter-spacing:-.006em;color:var(--consent-banner-description-color);font-size:.875rem;font-weight:400;line-height:1.25rem}.c15t-dark .c15t-ui-description-ZuHLA{color:var(--consent-banner-description-color-dark)}.c15t-ui-title-FWOWe{letter-spacing:-.011em;color:var(--consent-banner-title-color);font-size:1rem;font-weight:500;line-height:1.5rem}.c15t-dark .c15t-ui-title-FWOWe{color:var(--consent-banner-title-color-dark)}.c15t-ui-overlay-r7ckD{background-color:var(--consent-banner-overlay-background-color);z-index:999999997;position:fixed;inset:0}.c15t-ui-overlayVisible-uk8zb{opacity:1;transition:opacity var(--consent-banner-animation-duration)var(--consent-banner-animation-timing)}.c15t-ui-overlayHidden-pbl9E{opacity:0;transition:opacity var(--consent-banner-animation-duration)var(--consent-banner-animation-timing)}.c15t-dark .c15t-ui-overlay-r7ckD{background-color:var(--consent-banner-overlay-background-color-dark)}@media (prefers-reduced-motion:reduce){.c15t-ui-bannerVisible-pYYY9,.c15t-ui-bannerHidden-J4VZ3,.c15t-ui-overlayVisible-uk8zb,.c15t-ui-overlayHidden-pbl9E{transition:none}.c15t-ui-card-AUyl8[data-state=open],.c15t-ui-card-AUyl8[data-state=closed]{animation:none}}}',
					'',
				]),
					(i.locals = {
						enter: 'c15t-ui-enter-EoZFn',
						exit: 'c15t-ui-exit-Z4gI_',
						root: 'c15t-ui-root-hE9Kz',
						bannerVisible: 'c15t-ui-bannerVisible-pYYY9',
						bannerHidden: 'c15t-ui-bannerHidden-J4VZ3',
						bottomLeft: 'c15t-ui-bottomLeft-CbyqH',
						bottomRight: 'c15t-ui-bottomRight-iIIdC',
						topLeft: 'c15t-ui-topLeft-GzbNM',
						topRight: 'c15t-ui-topRight-siV7C',
						card: 'c15t-ui-card-AUyl8',
						rejectButton: 'c15t-ui-rejectButton-RvYLm',
						acceptButton: 'c15t-ui-acceptButton-jdwM4',
						customizeButton: 'c15t-ui-customizeButton-mj4u4',
						header: 'c15t-ui-header-pel5O',
						footer: 'c15t-ui-footer-MwauQ',
						footerSubGroup: 'c15t-ui-footerSubGroup-YlOOW',
						description: 'c15t-ui-description-ZuHLA',
						title: 'c15t-ui-title-FWOWe',
						overlay: 'c15t-ui-overlay-r7ckD',
						overlayVisible: 'c15t-ui-overlayVisible-uk8zb',
						overlayHidden: 'c15t-ui-overlayHidden-pbl9E',
					});
				let a = i;
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'(
				e
			) {
				e.exports = function (t) {
					var o = [];
					return (
						(o.toString = function () {
							return this.map(function (n) {
								var r = '',
									s = n[5] !== void 0;
								return (
									n[4] && (r += '@supports ('.concat(n[4], ') {')),
									n[2] && (r += '@media '.concat(n[2], ' {')),
									s &&
										(r += '@layer'.concat(
											n[5].length > 0 ? ' '.concat(n[5]) : '',
											' {'
										)),
									(r += t(n)),
									s && (r += '}'),
									n[2] && (r += '}'),
									n[4] && (r += '}'),
									r
								);
							}).join('');
						}),
						(o.i = function (n, r, s, i, a) {
							typeof n == 'string' && (n = [[null, n, void 0]]);
							var l = {};
							if (s)
								for (var u = 0; u < this.length; u++) {
									var m = this[u][0];
									m != null && (l[m] = !0);
								}
							for (var p = 0; p < n.length; p++) {
								var d = [].concat(n[p]);
								(s && l[d[0]]) ||
									(a !== void 0 &&
										(d[5] === void 0 ||
											(d[1] = '@layer'
												.concat(d[5].length > 0 ? ' '.concat(d[5]) : '', ' {')
												.concat(d[1], '}')),
										(d[5] = a)),
									r &&
										(d[2] &&
											(d[1] = '@media '.concat(d[2], ' {').concat(d[1], '}')),
										(d[2] = r)),
									i &&
										(d[4]
											? ((d[1] = '@supports ('
													.concat(d[4], ') {')
													.concat(d[1], '}')),
												(d[4] = i))
											: (d[4] = ''.concat(i))),
									o.push(d));
							}
						}),
						o
					);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'(
				e
			) {
				e.exports = function (t) {
					return t[1];
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'(
				e
			) {
				var t = [];
				function o(r) {
					for (var s = -1, i = 0; i < t.length; i++)
						if (t[i].identifier === r) {
							s = i;
							break;
						}
					return s;
				}
				function n(r, s) {
					for (var i = {}, a = [], l = 0; l < r.length; l++) {
						var u = r[l],
							m = s.base ? u[0] + s.base : u[0],
							p = i[m] || 0,
							d = ''.concat(m, ' ').concat(p);
						i[m] = p + 1;
						var f = o(d),
							h = {
								css: u[1],
								media: u[2],
								sourceMap: u[3],
								supports: u[4],
								layer: u[5],
							};
						if (f !== -1) t[f].references++, t[f].updater(h);
						else {
							var x = (function (b, y) {
								var C = y.domAPI(y);
								return (
									C.update(b),
									function (g) {
										g
											? (g.css !== b.css ||
													g.media !== b.media ||
													g.sourceMap !== b.sourceMap ||
													g.supports !== b.supports ||
													g.layer !== b.layer) &&
												C.update((b = g))
											: C.remove();
									}
								);
							})(h, s);
							(s.byIndex = l),
								t.splice(l, 0, { identifier: d, updater: x, references: 1 });
						}
						a.push(d);
					}
					return a;
				}
				e.exports = function (r, s) {
					var i = n((r = r || []), (s = s || {}));
					return function (a) {
						a = a || [];
						for (var l = 0; l < i.length; l++) {
							var u = o(i[l]);
							t[u].references--;
						}
						for (var m = n(a, s), p = 0; p < i.length; p++) {
							var d = o(i[p]);
							t[d].references === 0 && (t[d].updater(), t.splice(d, 1));
						}
						i = m;
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'(
				e
			) {
				var t = {};
				e.exports = function (o, n) {
					var r = (function (s) {
						if (t[s] === void 0) {
							var i = document.querySelector(s);
							if (
								window.HTMLIFrameElement &&
								i instanceof window.HTMLIFrameElement
							)
								try {
									i = i.contentDocument.head;
								} catch {
									i = null;
								}
							t[s] = i;
						}
						return t[s];
					})(o);
					if (!r)
						throw Error(
							"Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid."
						);
					r.appendChild(n);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'(
				e
			) {
				e.exports = function (t) {
					var o = document.createElement('style');
					return t.setAttributes(o, t.attributes), t.insert(o, t.options), o;
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'(
				e,
				t,
				o
			) {
				e.exports = function (n) {
					var r = o.nc;
					r && n.setAttribute('nonce', r);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'(
				e
			) {
				e.exports = function (t) {
					if (typeof document > 'u')
						return { update: function () {}, remove: function () {} };
					var o = t.insertStyleElement(t);
					return {
						update: function (n) {
							var r, s, i;
							(r = ''),
								n.supports && (r += '@supports ('.concat(n.supports, ') {')),
								n.media && (r += '@media '.concat(n.media, ' {')),
								(s = n.layer !== void 0) &&
									(r += '@layer'.concat(
										n.layer.length > 0 ? ' '.concat(n.layer) : '',
										' {'
									)),
								(r += n.css),
								s && (r += '}'),
								n.media && (r += '}'),
								n.supports && (r += '}'),
								(i = n.sourceMap) &&
									typeof btoa < 'u' &&
									(r += `
/*# sourceMappingURL=data:application/json;base64,`.concat(
										btoa(unescape(encodeURIComponent(JSON.stringify(i)))),
										' */'
									)),
								t.styleTagTransform(r, o, t.options);
						},
						remove: function () {
							var n;
							(n = o).parentNode === null || n.parentNode.removeChild(n);
						},
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'(
				e
			) {
				e.exports = function (t, o) {
					if (o.styleSheet) o.styleSheet.cssText = t;
					else {
						for (; o.firstChild; ) o.removeChild(o.firstChild);
						o.appendChild(document.createTextNode(t));
					}
				};
			},
		},
		eu = {};
	function fe(e) {
		var t = eu[e];
		if (t !== void 0) return t.exports;
		var o = (eu[e] = { id: e, exports: {} });
		return Wf[e](o, o.exports, fe), o.exports;
	}
	(fe.n = (e) => {
		var t = e && e.__esModule ? () => e.default : () => e;
		return fe.d(t, { a: t }), t;
	}),
		(fe.d = (e, t) => {
			for (var o in t)
				fe.o(t, o) &&
					!fe.o(e, o) &&
					Object.defineProperty(e, o, { enumerable: !0, get: t[o] });
		}),
		(fe.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t)),
		(fe.nc = void 0);
	var qf = fe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'
		),
		Kf = fe.n(qf),
		Yf = fe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'
		),
		Zf = fe.n(Yf),
		Xf = fe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'
		),
		Jf = fe.n(Xf),
		Qf = fe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'
		),
		eg = fe.n(Qf),
		tg = fe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'
		),
		og = fe.n(tg),
		ng = fe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'
		),
		rg = fe.n(ng),
		Or = fe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/components/consent-banner.module.css'
		),
		No = {};
	(No.styleTagTransform = rg()),
		(No.setAttributes = eg()),
		(No.insert = Jf().bind(null, 'head')),
		(No.domAPI = Zf()),
		(No.insertStyleElement = og()),
		Kf()(Or.A, No);
	var Ee = Or.A && Or.A.locals ? Or.A.locals : void 0;
	var ge = {};
	fo(ge, {
		Children: () => Ne,
		Component: () => Ve,
		Fragment: () => W,
		PureComponent: () => Vr,
		StrictMode: () => Nu,
		Suspense: () => En,
		SuspenseList: () => Oo,
		__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: () => _u,
		cloneElement: () => tt,
		createContext: () => Ie,
		createElement: () => et,
		createFactory: () => Ru,
		createPortal: () => $e,
		createRef: () => Br,
		default: () => ie,
		findDOMNode: () => Lu,
		flushSync: () => ia,
		forwardRef: () => T,
		hydrate: () => ra,
		isElement: () => Pu,
		isFragment: () => Tu,
		isMemo: () => Au,
		isValidElement: () => Ae,
		lazy: () => wu,
		memo: () => Cu,
		render: () => Fr,
		startTransition: () => Nn,
		unmountComponentAtNode: () => Ur,
		unstable_batchedUpdates: () => Eu,
		useCallback: () => Z,
		useContext: () => Te,
		useDebugValue: () => Mr,
		useDeferredValue: () => ta,
		useEffect: () => M,
		useErrorBoundary: () => sg,
		useId: () => Bo,
		useImperativeHandle: () => jr,
		useInsertionEffect: () => na,
		useLayoutEffect: () => Ye,
		useMemo: () => J,
		useReducer: () => Ft,
		useRef: () => z,
		useState: () => P,
		useSyncExternalStore: () => ea,
		useTransition: () => oa,
		version: () => xg,
	});
	var Nt,
		se,
		Yi,
		tu,
		Po = 0,
		lu = [],
		de = G,
		ou = de.__b,
		nu = de.__r,
		ru = de.diffed,
		su = de.__c,
		iu = de.unmount,
		au = de.__;
	function ao(e, t) {
		de.__h && de.__h(se, e, Po || t), (Po = 0);
		var o = se.__H || (se.__H = { __: [], __h: [] });
		return e >= o.__.length && o.__.push({}), o.__[e];
	}
	function P(e) {
		return (Po = 1), Ft(du, e);
	}
	function Ft(e, t, o) {
		var n = ao(Nt++, 2);
		if (
			((n.t = e),
			!n.__c &&
				((n.__ = [
					o ? o(t) : du(void 0, t),
					function (a) {
						var l = n.__N ? n.__N[0] : n.__[0],
							u = n.t(l, a);
						l !== u && ((n.__N = [u, n.__[1]]), n.__c.setState({}));
					},
				]),
				(n.__c = se),
				!se.__f))
		) {
			var r = function (a, l, u) {
				if (!n.__c.__H) return !0;
				var m = n.__c.__H.__.filter(function (d) {
					return !!d.__c;
				});
				if (
					m.every(function (d) {
						return !d.__N;
					})
				)
					return !s || s.call(this, a, l, u);
				var p = n.__c.props !== a;
				return (
					m.forEach(function (d) {
						if (d.__N) {
							var f = d.__[0];
							(d.__ = d.__N), (d.__N = void 0), f !== d.__[0] && (p = !0);
						}
					}),
					(s && s.call(this, a, l, u)) || p
				);
			};
			se.__f = !0;
			var s = se.shouldComponentUpdate,
				i = se.componentWillUpdate;
			(se.componentWillUpdate = function (a, l, u) {
				if (this.__e) {
					var m = s;
					(s = void 0), r(a, l, u), (s = m);
				}
				i && i.call(this, a, l, u);
			}),
				(se.shouldComponentUpdate = r);
		}
		return n.__N || n.__;
	}
	function M(e, t) {
		var o = ao(Nt++, 3);
		!de.__s && Xi(o.__H, t) && ((o.__ = e), (o.u = t), se.__H.__h.push(o));
	}
	function Ye(e, t) {
		var o = ao(Nt++, 4);
		!de.__s && Xi(o.__H, t) && ((o.__ = e), (o.u = t), se.__h.push(o));
	}
	function z(e) {
		return (
			(Po = 5),
			J(function () {
				return { current: e };
			}, [])
		);
	}
	function jr(e, t, o) {
		(Po = 6),
			Ye(
				function () {
					if (typeof e == 'function') {
						var n = e(t());
						return function () {
							e(null), n && typeof n == 'function' && n();
						};
					}
					if (e)
						return (
							(e.current = t()),
							function () {
								return (e.current = null);
							}
						);
				},
				o == null ? o : o.concat(e)
			);
	}
	function J(e, t) {
		var o = ao(Nt++, 7);
		return Xi(o.__H, t) && ((o.__ = e()), (o.__H = t), (o.__h = e)), o.__;
	}
	function Z(e, t) {
		return (
			(Po = 8),
			J(function () {
				return e;
			}, t)
		);
	}
	function Te(e) {
		var t = se.context[e.__c],
			o = ao(Nt++, 9);
		return (
			(o.c = e),
			t ? (o.__ == null && ((o.__ = !0), t.sub(se)), t.props.value) : e.__
		);
	}
	function Mr(e, t) {
		de.useDebugValue && de.useDebugValue(t ? t(e) : e);
	}
	function sg(e) {
		var t = ao(Nt++, 10),
			o = P();
		return (
			(t.__ = e),
			se.componentDidCatch ||
				(se.componentDidCatch = function (n, r) {
					t.__ && t.__(n, r), o[1](n);
				}),
			[
				o[0],
				function () {
					o[1](void 0);
				},
			]
		);
	}
	function Bo() {
		var e = ao(Nt++, 11);
		if (!e.__) {
			for (var t = se.__v; t !== null && !t.__m && t.__ !== null; ) t = t.__;
			var o = t.__m || (t.__m = [0, 0]);
			e.__ = 'P' + o[0] + '-' + o[1]++;
		}
		return e.__;
	}
	function ig() {
		for (var e; (e = lu.shift()); )
			if (e.__P && e.__H)
				try {
					e.__H.__h.forEach(Dr), e.__H.__h.forEach(Zi), (e.__H.__h = []);
				} catch (t) {
					(e.__H.__h = []), de.__e(t, e.__v);
				}
	}
	(de.__b = function (e) {
		(se = null), ou && ou(e);
	}),
		(de.__ = function (e, t) {
			e && t.__k && t.__k.__m && (e.__m = t.__k.__m), au && au(e, t);
		}),
		(de.__r = function (e) {
			nu && nu(e), (Nt = 0);
			var t = (se = e.__c).__H;
			t &&
				(Yi === se
					? ((t.__h = []),
						(se.__h = []),
						t.__.forEach(function (o) {
							o.__N && (o.__ = o.__N), (o.u = o.__N = void 0);
						}))
					: (t.__h.forEach(Dr), t.__h.forEach(Zi), (t.__h = []), (Nt = 0))),
				(Yi = se);
		}),
		(de.diffed = function (e) {
			ru && ru(e);
			var t = e.__c;
			t &&
				t.__H &&
				(t.__H.__h.length &&
					((lu.push(t) !== 1 && tu === de.requestAnimationFrame) ||
						((tu = de.requestAnimationFrame) || ag)(ig)),
				t.__H.__.forEach(function (o) {
					o.u && (o.__H = o.u), (o.u = void 0);
				})),
				(Yi = se = null);
		}),
		(de.__c = function (e, t) {
			t.some(function (o) {
				try {
					o.__h.forEach(Dr),
						(o.__h = o.__h.filter(function (n) {
							return !n.__ || Zi(n);
						}));
				} catch (n) {
					t.some(function (r) {
						r.__h && (r.__h = []);
					}),
						(t = []),
						de.__e(n, o.__v);
				}
			}),
				su && su(e, t);
		}),
		(de.unmount = function (e) {
			iu && iu(e);
			var t,
				o = e.__c;
			o &&
				o.__H &&
				(o.__H.__.forEach(function (n) {
					try {
						Dr(n);
					} catch (r) {
						t = r;
					}
				}),
				(o.__H = void 0),
				t && de.__e(t, o.__v));
		});
	var cu = typeof requestAnimationFrame == 'function';
	function ag(e) {
		var t,
			o = function () {
				clearTimeout(n), cu && cancelAnimationFrame(t), setTimeout(e);
			},
			n = setTimeout(o, 35);
		cu && (t = requestAnimationFrame(o));
	}
	function Dr(e) {
		var t = se,
			o = e.__c;
		typeof o == 'function' && ((e.__c = void 0), o()), (se = t);
	}
	function Zi(e) {
		var t = se;
		(e.__c = e.__()), (se = t);
	}
	function Xi(e, t) {
		return (
			!e ||
			e.length !== t.length ||
			t.some(function (o, n) {
				return o !== e[n];
			})
		);
	}
	function du(e, t) {
		return typeof t == 'function' ? t(e) : t;
	}
	function yu(e, t) {
		for (var o in t) e[o] = t[o];
		return e;
	}
	function Qi(e, t) {
		for (var o in e) if (o !== '__source' && !(o in t)) return !0;
		for (var n in t) if (n !== '__source' && e[n] !== t[n]) return !0;
		return !1;
	}
	function ea(e, t) {
		var o = t(),
			n = P({ t: { __: o, u: t } }),
			r = n[0].t,
			s = n[1];
		return (
			Ye(
				function () {
					(r.__ = o), (r.u = t), Ji(r) && s({ t: r });
				},
				[e, o, t]
			),
			M(
				function () {
					return (
						Ji(r) && s({ t: r }),
						e(function () {
							Ji(r) && s({ t: r });
						})
					);
				},
				[e]
			),
			o
		);
	}
	function Ji(e) {
		var t,
			o,
			n = e.u,
			r = e.__;
		try {
			var s = n();
			return !(
				((t = r) === (o = s) && (t !== 0 || 1 / t == 1 / o)) ||
				(t != t && o != o)
			);
		} catch {
			return !0;
		}
	}
	function Nn(e) {
		e();
	}
	function ta(e) {
		return e;
	}
	function oa() {
		return [!1, Nn];
	}
	var na = Ye;
	function Vr(e, t) {
		(this.props = e), (this.context = t);
	}
	function Cu(e, t) {
		function o(r) {
			var s = this.props.ref,
				i = s == r.ref;
			return (
				!i && s && (s.call ? s(null) : (s.current = null)),
				t ? !t(this.props, r) || !i : Qi(this.props, r)
			);
		}
		function n(r) {
			return (this.shouldComponentUpdate = o), et(e, r);
		}
		return (
			(n.displayName = 'Memo(' + (e.displayName || e.name) + ')'),
			(n.prototype.isReactComponent = !0),
			(n.__f = !0),
			(n.type = e),
			n
		);
	}
	((Vr.prototype = new Ve()).isPureReactComponent = !0),
		(Vr.prototype.shouldComponentUpdate = function (e, t) {
			return Qi(this.props, e) || Qi(this.state, t);
		});
	var uu = G.__b;
	G.__b = function (e) {
		e.type && e.type.__f && e.ref && ((e.props.ref = e.ref), (e.ref = null)),
			uu && uu(e);
	};
	var cg =
		(typeof Symbol < 'u' && Symbol.for && Symbol.for('react.forward_ref')) ||
		3911;
	function T(e) {
		function t(o) {
			var n = yu({}, o);
			return delete n.ref, e(n, o.ref || null);
		}
		return (
			(t.$$typeof = cg),
			(t.render = e),
			(t.prototype.isReactComponent = t.__f = !0),
			(t.displayName = 'ForwardRef(' + (e.displayName || e.name) + ')'),
			t
		);
	}
	var pu = function (e, t) {
			return e == null ? null : St(St(e).map(t));
		},
		Ne = {
			map: pu,
			forEach: pu,
			count: function (e) {
				return e ? St(e).length : 0;
			},
			only: function (e) {
				var t = St(e);
				if (t.length !== 1) throw 'Children.only';
				return t[0];
			},
			toArray: St,
		},
		lg = G.__e;
	G.__e = function (e, t, o, n) {
		if (e.then) {
			for (var r, s = t; (s = s.__); )
				if ((r = s.__c) && r.__c)
					return (
						t.__e == null && ((t.__e = o.__e), (t.__k = o.__k)), r.__c(e, t)
					);
		}
		lg(e, t, o, n);
	};
	var mu = G.unmount;
	function xu(e, t, o) {
		return (
			e &&
				(e.__c &&
					e.__c.__H &&
					(e.__c.__H.__.forEach(function (n) {
						typeof n.__c == 'function' && n.__c();
					}),
					(e.__c.__H = null)),
				(e = yu({}, e)).__c != null &&
					(e.__c.__P === o && (e.__c.__P = t),
					(e.__c.__e = !0),
					(e.__c = null)),
				(e.__k =
					e.__k &&
					e.__k.map(function (n) {
						return xu(n, t, o);
					}))),
			e
		);
	}
	function Su(e, t, o) {
		return (
			e &&
				o &&
				((e.__v = null),
				(e.__k =
					e.__k &&
					e.__k.map(function (n) {
						return Su(n, t, o);
					})),
				e.__c &&
					e.__c.__P === t &&
					(e.__e && o.appendChild(e.__e), (e.__c.__e = !0), (e.__c.__P = o))),
			e
		);
	}
	function En() {
		(this.__u = 0), (this.o = null), (this.__b = null);
	}
	function ku(e) {
		var t = e.__.__c;
		return t && t.__a && t.__a(e);
	}
	function wu(e) {
		var t, o, n;
		function r(s) {
			if (
				(t ||
					(t = e()).then(
						function (i) {
							o = i.default || i;
						},
						function (i) {
							n = i;
						}
					),
				n)
			)
				throw n;
			if (!o) throw t;
			return et(o, s);
		}
		return (r.displayName = 'Lazy'), (r.__f = !0), r;
	}
	function Oo() {
		(this.i = null), (this.l = null);
	}
	(G.unmount = function (e) {
		var t = e.__c;
		t && t.__R && t.__R(), t && 32 & e.__u && (e.type = null), mu && mu(e);
	}),
		((En.prototype = new Ve()).__c = function (e, t) {
			var o = t.__c,
				n = this;
			n.o == null && (n.o = []), n.o.push(o);
			var r = ku(n.__v),
				s = !1,
				i = function () {
					s || ((s = !0), (o.__R = null), r ? r(a) : a());
				};
			o.__R = i;
			var a = function () {
				if (!--n.__u) {
					if (n.state.__a) {
						var l = n.state.__a;
						n.__v.__k[0] = Su(l, l.__c.__P, l.__c.__O);
					}
					var u;
					for (n.setState({ __a: (n.__b = null) }); (u = n.o.pop()); )
						u.forceUpdate();
				}
			};
			n.__u++ || 32 & t.__u || n.setState({ __a: (n.__b = n.__v.__k[0]) }),
				e.then(i, i);
		}),
		(En.prototype.componentWillUnmount = function () {
			this.o = [];
		}),
		(En.prototype.render = function (e, t) {
			if (this.__b) {
				if (this.__v.__k) {
					var o = document.createElement('div'),
						n = this.__v.__k[0].__c;
					this.__v.__k[0] = xu(this.__b, o, (n.__O = n.__P));
				}
				this.__b = null;
			}
			var r = t.__a && et(W, null, e.fallback);
			return r && (r.__u &= -33), [et(W, null, t.__a ? null : e.children), r];
		});
	var fu = function (e, t, o) {
		if (
			(++o[1] === o[0] && e.l.delete(t),
			e.props.revealOrder && (e.props.revealOrder[0] !== 't' || !e.l.size))
		)
			for (o = e.i; o; ) {
				for (; o.length > 3; ) o.pop()();
				if (o[1] < o[0]) break;
				e.i = o = o[2];
			}
	};
	function dg(e) {
		return (
			(this.getChildContext = function () {
				return e.context;
			}),
			e.children
		);
	}
	function ug(e) {
		var t = this,
			o = e.h;
		if (
			((t.componentWillUnmount = function () {
				Eo(null, t.v), (t.v = null), (t.h = null);
			}),
			t.h && t.h !== o && t.componentWillUnmount(),
			!t.v)
		) {
			for (var n = t.__v; n !== null && !n.__m && n.__ !== null; ) n = n.__;
			(t.h = o),
				(t.v = {
					nodeType: 1,
					parentNode: o,
					childNodes: [],
					__k: { __m: n.__m },
					contains: function () {
						return !0;
					},
					insertBefore: function (r, s) {
						this.childNodes.push(r), t.h.insertBefore(r, s);
					},
					removeChild: function (r) {
						this.childNodes.splice(this.childNodes.indexOf(r) >>> 1, 1),
							t.h.removeChild(r);
					},
				});
		}
		Eo(et(dg, { context: t.context }, e.__v), t.v);
	}
	function $e(e, t) {
		var o = et(ug, { __v: e, h: t });
		return (o.containerInfo = t), o;
	}
	((Oo.prototype = new Ve()).__a = function (e) {
		var t = this,
			o = ku(t.__v),
			n = t.l.get(e);
		return (
			n[0]++,
			function (r) {
				var s = function () {
					t.props.revealOrder ? (n.push(r), fu(t, e, n)) : r();
				};
				o ? o(s) : s();
			}
		);
	}),
		(Oo.prototype.render = function (e) {
			(this.i = null), (this.l = new Map());
			var t = St(e.children);
			e.revealOrder && e.revealOrder[0] === 'b' && t.reverse();
			for (var o = t.length; o--; ) this.l.set(t[o], (this.i = [1, 0, this.i]));
			return e.children;
		}),
		(Oo.prototype.componentDidUpdate = Oo.prototype.componentDidMount =
			function () {
				var e = this;
				this.l.forEach(function (t, o) {
					fu(e, o, t);
				});
			});
	var Iu =
			(typeof Symbol < 'u' && Symbol.for && Symbol.for('react.element')) ||
			60103,
		pg =
			/^(?:accent|alignment|arabic|baseline|cap|clip(?!PathU)|color|dominant|fill|flood|font|glyph(?!R)|horiz|image(!S)|letter|lighting|marker(?!H|W|U)|overline|paint|pointer|shape|stop|strikethrough|stroke|text(?!L)|transform|underline|unicode|units|v|vector|vert|word|writing|x(?!C))[A-Z]/,
		mg = /^on(Ani|Tra|Tou|BeforeInp|Compo)/,
		fg = /[A-Z0-9]/g,
		gg = typeof document < 'u',
		bg = function (e) {
			return (
				typeof Symbol < 'u' && typeof Symbol() == 'symbol'
					? /fil|che|rad/
					: /fil|che|ra/
			).test(e);
		};
	function Fr(e, t, o) {
		return (
			t.__k == null && (t.textContent = ''),
			Eo(e, t),
			typeof o == 'function' && o(),
			e ? e.__c : null
		);
	}
	function ra(e, t, o) {
		return Ki(e, t), typeof o == 'function' && o(), e ? e.__c : null;
	}
	(Ve.prototype.isReactComponent = {}),
		[
			'componentWillMount',
			'componentWillReceiveProps',
			'componentWillUpdate',
		].forEach(function (e) {
			Object.defineProperty(Ve.prototype, e, {
				configurable: !0,
				get: function () {
					return this['UNSAFE_' + e];
				},
				set: function (t) {
					Object.defineProperty(this, e, {
						configurable: !0,
						writable: !0,
						value: t,
					});
				},
			});
		});
	var gu = G.event;
	function hg() {}
	function vg() {
		return this.cancelBubble;
	}
	function yg() {
		return this.defaultPrevented;
	}
	G.event = function (e) {
		return (
			gu && (e = gu(e)),
			(e.persist = hg),
			(e.isPropagationStopped = vg),
			(e.isDefaultPrevented = yg),
			(e.nativeEvent = e)
		);
	};
	var sa,
		Cg = {
			enumerable: !1,
			configurable: !0,
			get: function () {
				return this.class;
			},
		},
		bu = G.vnode;
	G.vnode = function (e) {
		typeof e.type == 'string' &&
			(function (t) {
				var o = t.props,
					n = t.type,
					r = {},
					s = n.indexOf('-') === -1;
				for (var i in o) {
					var a = o[i];
					if (
						!(
							(i === 'value' && 'defaultValue' in o && a == null) ||
							(gg && i === 'children' && n === 'noscript') ||
							i === 'class' ||
							i === 'className'
						)
					) {
						var l = i.toLowerCase();
						i === 'defaultValue' && 'value' in o && o.value == null
							? (i = 'value')
							: i === 'download' && a === !0
								? (a = '')
								: l === 'translate' && a === 'no'
									? (a = !1)
									: l[0] === 'o' && l[1] === 'n'
										? l === 'ondoubleclick'
											? (i = 'ondblclick')
											: l !== 'onchange' ||
													(n !== 'input' && n !== 'textarea') ||
													bg(o.type)
												? l === 'onfocus'
													? (i = 'onfocusin')
													: l === 'onblur'
														? (i = 'onfocusout')
														: mg.test(i) && (i = l)
												: (l = i = 'oninput')
										: s && pg.test(i)
											? (i = i.replace(fg, '-$&').toLowerCase())
											: a === null && (a = void 0),
							l === 'oninput' && r[(i = l)] && (i = 'oninputCapture'),
							(r[i] = a);
					}
				}
				n == 'select' &&
					r.multiple &&
					Array.isArray(r.value) &&
					(r.value = St(o.children).forEach(function (u) {
						u.props.selected = r.value.indexOf(u.props.value) != -1;
					})),
					n == 'select' &&
						r.defaultValue != null &&
						(r.value = St(o.children).forEach(function (u) {
							u.props.selected = r.multiple
								? r.defaultValue.indexOf(u.props.value) != -1
								: r.defaultValue == u.props.value;
						})),
					o.class && !o.className
						? ((r.class = o.class), Object.defineProperty(r, 'className', Cg))
						: ((o.className && !o.class) || (o.class && o.className)) &&
							(r.class = r.className = o.className),
					(t.props = r);
			})(e),
			(e.$$typeof = Iu),
			bu && bu(e);
	};
	var hu = G.__r;
	G.__r = function (e) {
		hu && hu(e), (sa = e.__c);
	};
	var vu = G.diffed;
	G.diffed = function (e) {
		vu && vu(e);
		var t = e.props,
			o = e.__e;
		o != null &&
			e.type === 'textarea' &&
			'value' in t &&
			t.value !== o.value &&
			(o.value = t.value == null ? '' : t.value),
			(sa = null);
	};
	var _u = {
			ReactCurrentDispatcher: {
				current: {
					readContext: function (e) {
						return sa.__n[e.__c].props.value;
					},
					useCallback: Z,
					useContext: Te,
					useDebugValue: Mr,
					useDeferredValue: ta,
					useEffect: M,
					useId: Bo,
					useImperativeHandle: jr,
					useInsertionEffect: na,
					useLayoutEffect: Ye,
					useMemo: J,
					useReducer: Ft,
					useRef: z,
					useState: P,
					useSyncExternalStore: ea,
					useTransition: oa,
				},
			},
		},
		xg = '18.3.1';
	function Ru(e) {
		return et.bind(null, e);
	}
	function Ae(e) {
		return !!e && e.$$typeof === Iu;
	}
	function Tu(e) {
		return Ae(e) && e.type === W;
	}
	function Au(e) {
		return (
			!!e &&
			!!e.displayName &&
			(typeof e.displayName == 'string' || e.displayName instanceof String) &&
			e.displayName.startsWith('Memo(')
		);
	}
	function tt(e) {
		return Ae(e) ? Qd.apply(null, arguments) : e;
	}
	function Ur(e) {
		return !!e.__k && (Eo(null, e), !0);
	}
	function Lu(e) {
		return (e && (e.base || (e.nodeType === 1 && e))) || null;
	}
	var Eu = function (e, t) {
			return e(t);
		},
		ia = function (e, t) {
			return e(t);
		},
		Nu = W,
		Pu = Ae,
		ie = {
			useState: P,
			useId: Bo,
			useReducer: Ft,
			useEffect: M,
			useLayoutEffect: Ye,
			useInsertionEffect: na,
			useTransition: oa,
			useDeferredValue: ta,
			useSyncExternalStore: ea,
			startTransition: Nn,
			useRef: z,
			useImperativeHandle: jr,
			useMemo: J,
			useCallback: Z,
			useContext: Te,
			useDebugValue: Mr,
			version: '18.3.1',
			Children: Ne,
			render: Fr,
			hydrate: ra,
			unmountComponentAtNode: Ur,
			createPortal: $e,
			createElement: et,
			createContext: Ie,
			createFactory: Ru,
			cloneElement: tt,
			createRef: Br,
			Fragment: W,
			isValidElement: Ae,
			isElement: Pu,
			isFragment: Tu,
			isMemo: Au,
			findDOMNode: Lu,
			Component: Ve,
			PureComponent: Vr,
			memo: Cu,
			forwardRef: T,
			flushSync: ia,
			unstable_batchedUpdates: Eu,
			StrictMode: Nu,
			Suspense: En,
			SuspenseList: Oo,
			lazy: wu,
			__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: _u,
		};
	var Hr = Ie(void 0);
	function q() {
		let e = Te(Hr);
		if (e === void 0)
			throw Error(
				'useConsentManager must be used within a ConsentManagerProvider'
			);
		let {
				consents: t,
				consentInfo: o,
				consentCategories: n,
				consentTypes: r,
			} = e.state,
			s = Z((l) => dt(l, t), [t]),
			i = Z(() => o != null, [o]),
			a = Z(() => r.filter((l) => n.includes(l.name)), [r, n]);
		return {
			...e.state,
			has: s,
			hasConsented: i,
			getDisplayedConsents: a,
			manager: e.manager,
		};
	}
	function Bu(e) {
		var t,
			o,
			n = '';
		if (typeof e == 'string' || typeof e == 'number') n += e;
		else if (typeof e == 'object')
			if (Array.isArray(e)) {
				var r = e.length;
				for (t = 0; t < r; t++)
					e[t] && (o = Bu(e[t])) && (n && (n += ' '), (n += o));
			} else for (o in e) e[o] && (n && (n += ' '), (n += o));
		return n;
	}
	function Sg() {
		for (var e, t, o = 0, n = '', r = arguments.length; o < r; o++)
			(e = arguments[o]) && (t = Bu(e)) && (n && (n += ' '), (n += t));
		return n;
	}
	var Ou = Sg;
	function zr(...e) {
		return Ou(...e);
	}
	function aa(e, t) {
		if (!t || typeof t != 'object') return e;
		let o = { ...e };
		for (let n in t)
			t[n] && typeof t[n] == 'object' && !Array.isArray(t[n])
				? (o[n] = aa(o[n] || {}, t[n]))
				: (o[n] = t[n]);
		return o;
	}
	function ju(e) {
		let t = window.matchMedia('(prefers-color-scheme: dark)'),
			o = document.documentElement.classList.contains('dark'),
			n = (s) => {
				document.documentElement.classList.toggle('c15t-dark', s.matches);
			},
			r = new MutationObserver((s) => {
				for (let i of s)
					if (i.type === 'attributes' && i.attributeName === 'class') {
						let a = document.documentElement.classList.contains('dark');
						document.documentElement.classList.toggle('c15t-dark', a);
					}
			});
		switch (e) {
			case 'light':
				document.documentElement.classList.remove('c15t-dark');
				break;
			case 'dark':
				document.documentElement.classList.add('c15t-dark');
				break;
			case 'system':
				n(t), t.addEventListener('change', n);
				break;
			default:
				document.documentElement.classList.toggle('c15t-dark', o),
					r.observe(document.documentElement, { attributes: !0 });
		}
		return () => {
			t.removeEventListener('change', n), r.disconnect();
		};
	}
	var kg = ['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'ku', 'dv'];
	function ca(e) {
		let t = e ? e.split('-')[0]?.toLowerCase() : 'en';
		return kg.includes(t || '') ? 'rtl' : 'ltr';
	}
	function Mu(e) {
		return (
			ca(e) === 'rtl'
				? document.body.classList.add('c15t-rtl')
				: document.body.classList.remove('c15t-rtl'),
			() => {
				document.body.classList.remove('c15t-rtl');
			}
		);
	}
	function Du(e) {
		return Array.from(
			e.querySelectorAll(
				'a[href]:not([disabled]),button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[contenteditable],[tabindex]:not([tabindex="-1"])'
			)
		).filter((t) => t.offsetWidth > 0 && t.offsetHeight > 0);
	}
	function Vu() {
		let e = {
				overflow: document.body.style.overflow,
				paddingRight: document.body.style.paddingRight,
			},
			t = window.innerWidth - document.documentElement.clientWidth;
		return (
			(document.body.style.overflow = 'hidden'),
			t > 0 && (document.body.style.paddingRight = `${t}px`),
			() => {
				(document.body.style.overflow = e.overflow),
					(document.body.style.paddingRight = e.paddingRight);
			}
		);
	}
	function Fu(e) {
		let t = document.activeElement,
			o = Du(e);
		if (o.length > 0)
			setTimeout(() => {
				o[0]?.focus();
			}, 0);
		else if (e.tabIndex !== -1)
			try {
				e.focus();
			} catch {}
		let n = (r) => {
			if (r.key !== 'Tab') return;
			let s = Du(e);
			if (s.length === 0) return;
			let i = s[0],
				a = s[s.length - 1];
			r.shiftKey && document.activeElement === i
				? (r.preventDefault(), a?.focus())
				: r.shiftKey ||
					document.activeElement !== a ||
					(r.preventDefault(), i?.focus());
		};
		return (
			document.addEventListener('keydown', n),
			() => {
				document.removeEventListener('keydown', n),
					t && typeof t.focus == 'function' && setTimeout(() => t.focus(), 0);
			}
		);
	}
	function Gr(e, t) {
		let o = (a) => {
				if (a !== void 0) return typeof a == 'string' ? { className: a } : a;
			},
			n = o(e),
			r = o(t);
		if ((n?.noStyle || r?.noStyle) && r?.noStyle)
			return { className: r.className, style: r.style, noStyle: !0 };
		let s = zr(n?.baseClassName, n?.className, r?.baseClassName, r?.className),
			i = { ...n?.style, ...r?.style };
		return {
			className: s || void 0,
			style: Object.keys(i).length > 0 ? i : void 0,
			noStyle: n?.noStyle || r?.noStyle,
		};
	}
	function Uu(e, t, o, n = !1) {
		let r = t?.slots?.[e],
			s = typeof r == 'object' && r !== null && !!r.noStyle,
			i = typeof o == 'object' && o !== null && !!o.noStyle;
		if (n || s || i) {
			let u = Gr(r || {}, o || {});
			return { className: u.className, style: u.style, noStyle: !0 };
		}
		let a = Gr(
				typeof o == 'object' ? { ...o, className: void 0 } : {},
				r || {}
			),
			l = Gr(a, o || {});
		return { className: l.className, style: l.style };
	}
	function zu(e, t) {
		let { translations: o = {}, defaultLanguage: n = 'en' } = e,
			r = o[n];
		if (Hu(r)) return r;
		let s = o.en;
		return Hu(s) ? s : t.translations.en;
	}
	function Hu(e) {
		return (
			!!e &&
			typeof e == 'object' &&
			'cookieBanner' in e &&
			'consentManagerDialog' in e &&
			'consentTypes' in e &&
			'common' in e
		);
	}
	var $u = {
			defaultPosition: 'bottom-right',
			offset: 20,
			persistPosition: !0,
			storageKey: 'c15t-trigger-position',
		},
		wg = 30,
		Gu = 0.15;
	function Wu(e, t, o, n = {}) {
		let { threshold: r = wg, velocityX: s = 0, velocityY: i = 0 } = n,
			a = Math.abs(t),
			l = Math.abs(o),
			u = Math.abs(s),
			m = Math.abs(i),
			p = a >= r || (u >= Gu && a >= 10),
			d = l >= r || (m >= Gu && l >= 10);
		if (!p && !d) return e;
		let f = e.includes('bottom'),
			h = e.includes('right'),
			x = f,
			b = h;
		return (
			p && (b = t > 0),
			d && (x = o > 0),
			x && b
				? 'bottom-right'
				: x && !b
					? 'bottom-left'
					: !x && b
						? 'top-right'
						: 'top-left'
		);
	}
	function qu(e, t = $u.storageKey) {
		try {
			typeof localStorage < 'u' && localStorage.setItem(t, e);
		} catch {}
	}
	function Ku(e = $u.storageKey) {
		try {
			if (typeof localStorage < 'u') {
				let t = localStorage.getItem(e);
				if (
					t === 'bottom-right' ||
					t === 'top-right' ||
					t === 'bottom-left' ||
					t === 'top-left'
				)
					return t;
			}
		} catch {}
		return null;
	}
	function $r() {
		return { isDragging: !1, startX: 0, startY: 0, currentX: 0, currentY: 0 };
	}
	function ot(e) {
		M(() => {
			if (e) return Vu();
		}, [e]);
	}
	var Wr = Ie({
			theme: void 0,
			noStyle: !1,
			disableAnimation: !1,
			scrollLock: !1,
			trapFocus: !0,
			colorScheme: 'system',
		}),
		nt = Ie(null);
	var te = () => {
		let e = Te(Wr),
			t = Te(nt);
		if (!e) throw Error('Theme components must be used within Theme.Root');
		return (function o(n, r) {
			if (!r) return n;
			let s = { ...n };
			for (let i in r)
				r[i] !== void 0 &&
					(r[i] &&
					typeof r[i] == 'object' &&
					!Array.isArray(r[i]) &&
					n[i] &&
					typeof n[i] == 'object'
						? (s[i] = o(n[i], r[i]))
						: (s[i] = r[i]));
			return s;
		})(e, t || null);
	};
	function X(e, t, o) {
		let { noStyle: n, theme: r } = te(),
			s = o ?? r;
		return J(() => Uu(e, s, t, n), [e, s, t, n]);
	}
	function Fe(...e) {
		return zr(...e);
	}
	var Yu = T(({ className: e, style: t, noStyle: o, asChild: n, ...r }, s) => {
			let i,
				{ activeUI: a } = q(),
				{ disableAnimation: l, noStyle: u, scrollLock: m } = te(),
				p = a === 'banner',
				[d, f] = P(!1);
			M(() => {
				if (p) f(!0);
				else if (l) f(!1);
				else {
					let b = setTimeout(
						() => {
							f(!1);
						},
						Number.parseInt(
							getComputedStyle(document.documentElement).getPropertyValue(
								'--consent-banner-animation-duration'
							) || '200',
							10
						)
					);
					return () => clearTimeout(b);
				}
			}, [p, l]);
			let h = X('consentBannerOverlay', {
				baseClassName: !(u || o) && Ee.overlay,
				className: e,
				noStyle: u || o,
			});
			i = u || o || l ? void 0 : d ? Ee.overlayVisible : Ee.overlayHidden;
			let x = Fe(h.className, i);
			return (
				ot(!!(p && m)),
				p && m
					? c('div', {
							ref: s,
							...r,
							className: x,
							style: { ...h.style, ...t },
							'data-testid': 'consent-banner-overlay',
						})
					: null
			);
		}),
		qr = Yu;
	var We = Ie({}),
		Kr = () => Te(We);
	function rt(e) {
		let t = J(() => ca(e), [e]);
		return M(() => Mu(e), [e]), t;
	}
	var Yr = ({
			children: e,
			className: t,
			noStyle: o,
			disableAnimation: n,
			scrollLock: r,
			trapFocus: s = !0,
			models: i,
			uiSource: a,
			...l
		}) =>
			c(We.Provider, {
				value: { uiSource: a ?? 'banner' },
				children: c(nt.Provider, {
					value: {
						disableAnimation: n,
						noStyle: o,
						scrollLock: r,
						trapFocus: s,
					},
					children: c(Zu, {
						disableAnimation: n,
						className: t,
						noStyle: o,
						models: i,
						...l,
						children: e,
					}),
				}),
			}),
		Zu = T(
			(
				{
					asChild: e,
					children: t,
					className: o,
					style: n,
					className: r,
					disableAnimation: s,
					noStyle: i,
					models: a = ['opt-in'],
					...l
				},
				u
			) => {
				let { activeUI: m, translationConfig: p, model: d } = q(),
					f = rt(p.defaultLanguage),
					[h, x] = P(!1),
					[b, y] = P(!1),
					[C, g] = P(200),
					S = m === 'banner' && a.includes(d);
				M(() => {
					g(
						Number.parseInt(
							getComputedStyle(document.documentElement).getPropertyValue(
								'--consent-banner-animation-duration'
							) || '200',
							10
						)
					);
				}, []),
					M(() => {
						if (S)
							if (b) x(!0);
							else {
								let B = setTimeout(() => {
									x(!0), y(!0);
								}, 10);
								return () => clearTimeout(B);
							}
						else if ((y(!1), s)) x(!1);
						else {
							let B = setTimeout(() => {
								x(!1);
							}, C);
							return () => clearTimeout(B);
						}
					}, [S, s, b, C]);
				let A = X('consentBanner', {
						baseClassName: [
							Ee.root,
							f === 'ltr' ? Ee.bottomLeft : Ee.bottomRight,
						],
						style: n,
						className: o || r,
						noStyle: i,
					}),
					[I, _] = P(!1);
				if (
					(M(() => {
						_(!0);
					}, []),
					!I)
				)
					return null;
				let O = i
					? A.className || ''
					: `${A.className || ''} ${h ? Ee.bannerVisible : Ee.bannerHidden}`;
				return S
					? $e(
							c(W, {
								children: [
									c(qr, {}),
									c('div', {
										ref: u,
										...l,
										...A,
										className: O,
										'data-testid': 'consent-banner-root',
										dir: f,
										children: t,
									}),
								],
							}),
							document.body
						)
					: null;
			}
		);
	Zu.displayName = 'ConsentBannerRootChildren';
	var Xu = Yr;
	function st(e, t) {
		M(() => {
			if (e && t && t.current) return Fu(t.current);
		}, [e, t]);
	}
	function pe() {
		let { translationConfig: e } = q();
		return J(() => zu(e, Je), [e]);
	}
	function Ju(e, t) {
		if (typeof e == 'function') return e(t);
		e != null && (e.current = t);
	}
	function Pn(...e) {
		return (t) => {
			let o = !1,
				n = e.map((r) => {
					let s = Ju(r, t);
					return !o && typeof s == 'function' && (o = !0), s;
				});
			if (o)
				return () => {
					for (let r = 0; r < n.length; r++) {
						let s = n[r];
						typeof s == 'function' ? s() : Ju(e[r], null);
					}
				};
		};
	}
	function it(...e) {
		return Z(Pn(...e), e);
	}
	var Ig = Symbol.for('react.lazy'),
		Zr = ge[' use '.trim().toString()];
	function _g(e) {
		return typeof e == 'object' && e !== null && 'then' in e;
	}
	function Qu(e) {
		return (
			e != null &&
			typeof e == 'object' &&
			'$$typeof' in e &&
			e.$$typeof === Ig &&
			'_payload' in e &&
			_g(e._payload)
		);
	}
	function Rg(e) {
		let t = Tg(e),
			o = T((n, r) => {
				let { children: s, ...i } = n;
				Qu(s) && typeof Zr == 'function' && (s = Zr(s._payload));
				let a = Ne.toArray(s),
					l = a.find(Lg);
				if (l) {
					let u = l.props.children,
						m = a.map((p) =>
							p === l
								? Ne.count(u) > 1
									? Ne.only(null)
									: Ae(u)
										? u.props.children
										: null
								: p
						);
					return c(t, {
						...i,
						ref: r,
						children: Ae(u) ? tt(u, void 0, m) : null,
					});
				}
				return c(t, { ...i, ref: r, children: s });
			});
		return (o.displayName = `${e}.Slot`), o;
	}
	var Do = Rg('Slot');
	function Tg(e) {
		let t = T((o, n) => {
			let { children: r, ...s } = o;
			if ((Qu(r) && typeof Zr == 'function' && (r = Zr(r._payload)), Ae(r))) {
				let i = Ng(r),
					a = Eg(s, r.props);
				return r.type !== W && (a.ref = n ? Pn(n, i) : i), tt(r, a);
			}
			return Ne.count(r) > 1 ? Ne.only(null) : null;
		});
		return (t.displayName = `${e}.SlotClone`), t;
	}
	var Ag = Symbol('radix.slottable');
	function Lg(e) {
		return (
			Ae(e) &&
			typeof e.type == 'function' &&
			'__radixId' in e.type &&
			e.type.__radixId === Ag
		);
	}
	function Eg(e, t) {
		let o = { ...t };
		for (let n in t) {
			let r = e[n],
				s = t[n];
			/^on[A-Z]/.test(n)
				? r && s
					? (o[n] = (...a) => {
							let l = s(...a);
							return r(...a), l;
						})
					: r && (o[n] = r)
				: n === 'style'
					? (o[n] = { ...r, ...s })
					: n === 'className' && (o[n] = [r, s].filter(Boolean).join(' '));
		}
		return { ...e, ...o };
	}
	function Ng(e) {
		let t = Object.getOwnPropertyDescriptor(e.props, 'ref')?.get,
			o = t && 'isReactWarning' in t && t.isReactWarning;
		return o
			? e.ref
			: ((t = Object.getOwnPropertyDescriptor(e, 'ref')?.get),
				(o = t && 'isReactWarning' in t && t.isReactWarning),
				o ? e.props.ref : e.props.ref || e.ref);
	}
	var oe = T(
		(
			{
				asChild: e,
				className: t,
				style: o,
				themeKey: n,
				baseClassName: r,
				noStyle: s,
				...i
			},
			a
		) => {
			let l = X(n, { baseClassName: r, className: t, style: o, noStyle: s });
			return c(e ? Do : 'div', { ref: a, ...i, ...l });
		}
	);
	oe.displayName = 'Box';
	var Pg = {
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/primitives/accordion.module.css'(
				e,
				t,
				o
			) {
				o.d(t, { A: () => a });
				var n = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'
					),
					r = o.n(n),
					s = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'
					),
					i = o.n(s)()(r());
				i.push([
					e.id,
					':root{--accordion-padding:var(--c15t-space-md);--accordion-radius:var(--c15t-radius-md);--accordion-duration:var(--c15t-duration-normal);--accordion-ease:var(--c15t-easing);--accordion-icon-size:1.25rem;--accordion-background-color:var(--c15t-surface);--accordion-background-color-dark:var(--c15t-surface);--accordion-background-hover:var(--c15t-surface-hover);--accordion-background-hover-dark:var(--c15t-surface-hover);--accordion-border-color:var(--c15t-border);--accordion-border-color-dark:var(--c15t-border);--accordion-text-color:var(--c15t-text);--accordion-text-color-dark:var(--c15t-text);--accordion-icon-color:var(--c15t-text-muted);--accordion-icon-color-dark:var(--c15t-text-muted);--accordion-arrow-color:var(--c15t-text-muted);--accordion-arrow-color-dark:var(--c15t-text-muted);--accordion-content-color:var(--c15t-text-muted);--accordion-content-color-dark:var(--c15t-text-muted);--accordion-focus-ring:var(--c15t-primary);--accordion-focus-ring-dark:var(--c15t-primary);--accordion-focus-shadow:0 0 0 2px var(--accordion-focus-ring);--accordion-focus-shadow-dark:0 0 0 2px var(--accordion-focus-ring-dark)}@layer components{.c15t-ui-root-RhSvQ{&>:not([hidden])~:not([hidden]){--space-y-reverse:0;margin-top:calc(1rem*calc(1 - var(--space-y-reverse)));margin-bottom:calc(1rem*var(--space-y-reverse))}}.c15t-ui-item-v83OH{padding:var(--accordion-padding);background-color:var(--accordion-background-color);box-shadow:inset 0 0 0 1px var(--accordion-border-color);transition:background-color var(--accordion-duration)var(--accordion-ease),box-shadow var(--accordion-duration)var(--accordion-ease);border-radius:var(--accordion-radius);position:relative;overflow:visible}.c15t-dark .c15t-ui-item-v83OH{background-color:var(--accordion-background-color-dark);box-shadow:inset 0 0 0 1px var(--accordion-border-color-dark)}.c15t-ui-item-v83OH:is(:hover,[data-state=open]){background-color:var(--accordion-background-hover);box-shadow:inset 0 0 0 1px #0000}.c15t-dark .c15t-ui-item-v83OH:is(:hover,[data-state=open]){background-color:var(--accordion-background-hover-dark);box-shadow:inset 0 0 0 1px #0000}.c15t-ui-item-v83OH:focus-within:not(:has(.c15t-ui-triggerInner-lwGP6:focus-visible)){background-color:var(--accordion-background-hover);box-shadow:inset 0 0 0 1px #0000}.c15t-dark .c15t-ui-item-v83OH:focus-within:not(:has(.c15t-ui-triggerInner-lwGP6:focus-visible)){background-color:var(--accordion-background-hover-dark);box-shadow:inset 0 0 0 1px #0000}.c15t-ui-item-v83OH:has(.c15t-ui-triggerInner-lwGP6:focus-visible){box-shadow:var(--accordion-focus-shadow)}.c15t-dark .c15t-ui-item-v83OH:has(.c15t-ui-triggerInner-lwGP6:focus-visible){box-shadow:var(--accordion-focus-shadow-dark)}.c15t-ui-trigger-uhpMT{justify-content:space-between;align-items:center;width:100%;display:flex;position:relative;overflow:visible}.c15t-ui-triggerInner-lwGP6{width:90%;margin:calc(-1*var(--accordion-padding));padding:var(--accordion-padding);letter-spacing:-.006em;text-align:left;color:var(--accordion-text-color);cursor:pointer;border-radius:var(--accordion-radius);z-index:1;touch-action:manipulation;background:0 0;border:0;grid-template-columns:auto 1fr;align-items:center;gap:.625rem;font-size:.875rem;font-weight:500;line-height:1.25rem;display:grid;position:relative}.c15t-dark .c15t-ui-triggerInner-lwGP6{color:var(--accordion-text-color-dark)}.c15t-ui-triggerInner-lwGP6:focus-visible{outline:none}.c15t-ui-icon-X1brh{width:var(--accordion-icon-size);height:var(--accordion-icon-size);color:var(--accordion-icon-color);flex-shrink:0}.c15t-dark .c15t-ui-icon-X1brh{color:var(--accordion-icon-color-dark)}.c15t-ui-arrowOpen-yE84x,.c15t-ui-arrowClose-QjqQt{width:var(--accordion-icon-size);height:var(--accordion-icon-size);transition:color var(--accordion-duration)var(--accordion-ease);flex-shrink:0}.c15t-ui-arrowOpen-yE84x{color:var(--accordion-arrow-color)}.c15t-dark .c15t-ui-arrowOpen-yE84x{color:var(--accordion-arrow-color-dark)}.c15t-ui-item-v83OH:hover .c15t-ui-arrowOpen-yE84x{color:var(--accordion-icon-color)}.c15t-dark .c15t-ui-item-v83OH:hover .c15t-ui-arrowOpen-yE84x{color:var(--accordion-icon-color-dark)}.c15t-ui-arrowClose-QjqQt{color:var(--accordion-icon-color);display:none}.c15t-dark .c15t-ui-arrowClose-QjqQt{color:var(--accordion-icon-color-dark)}.c15t-ui-item-v83OH[data-state=open] .c15t-ui-arrowOpen-yE84x{display:none}.c15t-ui-item-v83OH[data-state=open] .c15t-ui-arrowClose-QjqQt{display:block}.c15t-ui-content-YJGot{overflow:hidden}@keyframes c15t-ui-accordionDown-PlK5g{0%{opacity:0;height:0}to{height:var(--radix-accordion-content-height);opacity:1}}@keyframes c15t-ui-accordionUp-aU8rE{0%{height:var(--radix-accordion-content-height);opacity:1}to{opacity:0;height:0}}.c15t-ui-content-YJGot[data-state=open]{animation:c15t-ui-accordionDown-PlK5g var(--accordion-duration)var(--accordion-ease)}.c15t-ui-content-YJGot[data-state=closed]{animation:c15t-ui-accordionUp-aU8rE var(--accordion-duration)var(--accordion-ease)}.c15t-ui-contentInner-lPIUe{letter-spacing:-.006em;color:var(--accordion-content-color);font-size:.875rem;line-height:1.25rem}.c15t-dark .c15t-ui-contentInner-lPIUe{color:var(--accordion-content-color-dark)}@media (prefers-reduced-motion:reduce){.c15t-ui-item-v83OH,.c15t-ui-arrowOpen-yE84x,.c15t-ui-arrowClose-QjqQt{transition:none}.c15t-ui-content-YJGot[data-state=open],.c15t-ui-content-YJGot[data-state=closed]{animation:none}}@media (hover:none){.c15t-ui-item-v83OH:hover{background-color:var(--accordion-background-color)}.c15t-ui-item-v83OH:hover .c15t-ui-arrowOpen-yE84x{color:var(--accordion-arrow-color)}}}',
					'',
				]),
					(i.locals = {
						root: 'c15t-ui-root-RhSvQ',
						item: 'c15t-ui-item-v83OH',
						triggerInner: 'c15t-ui-triggerInner-lwGP6',
						trigger: 'c15t-ui-trigger-uhpMT',
						icon: 'c15t-ui-icon-X1brh',
						arrowOpen: 'c15t-ui-arrowOpen-yE84x',
						arrowClose: 'c15t-ui-arrowClose-QjqQt',
						content: 'c15t-ui-content-YJGot',
						accordionDown: 'c15t-ui-accordionDown-PlK5g',
						accordionUp: 'c15t-ui-accordionUp-aU8rE',
						contentInner: 'c15t-ui-contentInner-lPIUe',
					});
				let a = i;
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'(
				e
			) {
				e.exports = function (t) {
					var o = [];
					return (
						(o.toString = function () {
							return this.map(function (n) {
								var r = '',
									s = n[5] !== void 0;
								return (
									n[4] && (r += '@supports ('.concat(n[4], ') {')),
									n[2] && (r += '@media '.concat(n[2], ' {')),
									s &&
										(r += '@layer'.concat(
											n[5].length > 0 ? ' '.concat(n[5]) : '',
											' {'
										)),
									(r += t(n)),
									s && (r += '}'),
									n[2] && (r += '}'),
									n[4] && (r += '}'),
									r
								);
							}).join('');
						}),
						(o.i = function (n, r, s, i, a) {
							typeof n == 'string' && (n = [[null, n, void 0]]);
							var l = {};
							if (s)
								for (var u = 0; u < this.length; u++) {
									var m = this[u][0];
									m != null && (l[m] = !0);
								}
							for (var p = 0; p < n.length; p++) {
								var d = [].concat(n[p]);
								(s && l[d[0]]) ||
									(a !== void 0 &&
										(d[5] === void 0 ||
											(d[1] = '@layer'
												.concat(d[5].length > 0 ? ' '.concat(d[5]) : '', ' {')
												.concat(d[1], '}')),
										(d[5] = a)),
									r &&
										(d[2] &&
											(d[1] = '@media '.concat(d[2], ' {').concat(d[1], '}')),
										(d[2] = r)),
									i &&
										(d[4]
											? ((d[1] = '@supports ('
													.concat(d[4], ') {')
													.concat(d[1], '}')),
												(d[4] = i))
											: (d[4] = ''.concat(i))),
									o.push(d));
							}
						}),
						o
					);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'(
				e
			) {
				e.exports = function (t) {
					return t[1];
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'(
				e
			) {
				var t = [];
				function o(r) {
					for (var s = -1, i = 0; i < t.length; i++)
						if (t[i].identifier === r) {
							s = i;
							break;
						}
					return s;
				}
				function n(r, s) {
					for (var i = {}, a = [], l = 0; l < r.length; l++) {
						var u = r[l],
							m = s.base ? u[0] + s.base : u[0],
							p = i[m] || 0,
							d = ''.concat(m, ' ').concat(p);
						i[m] = p + 1;
						var f = o(d),
							h = {
								css: u[1],
								media: u[2],
								sourceMap: u[3],
								supports: u[4],
								layer: u[5],
							};
						if (f !== -1) t[f].references++, t[f].updater(h);
						else {
							var x = (function (b, y) {
								var C = y.domAPI(y);
								return (
									C.update(b),
									function (g) {
										g
											? (g.css !== b.css ||
													g.media !== b.media ||
													g.sourceMap !== b.sourceMap ||
													g.supports !== b.supports ||
													g.layer !== b.layer) &&
												C.update((b = g))
											: C.remove();
									}
								);
							})(h, s);
							(s.byIndex = l),
								t.splice(l, 0, { identifier: d, updater: x, references: 1 });
						}
						a.push(d);
					}
					return a;
				}
				e.exports = function (r, s) {
					var i = n((r = r || []), (s = s || {}));
					return function (a) {
						a = a || [];
						for (var l = 0; l < i.length; l++) {
							var u = o(i[l]);
							t[u].references--;
						}
						for (var m = n(a, s), p = 0; p < i.length; p++) {
							var d = o(i[p]);
							t[d].references === 0 && (t[d].updater(), t.splice(d, 1));
						}
						i = m;
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'(
				e
			) {
				var t = {};
				e.exports = function (o, n) {
					var r = (function (s) {
						if (t[s] === void 0) {
							var i = document.querySelector(s);
							if (
								window.HTMLIFrameElement &&
								i instanceof window.HTMLIFrameElement
							)
								try {
									i = i.contentDocument.head;
								} catch {
									i = null;
								}
							t[s] = i;
						}
						return t[s];
					})(o);
					if (!r)
						throw Error(
							"Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid."
						);
					r.appendChild(n);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'(
				e
			) {
				e.exports = function (t) {
					var o = document.createElement('style');
					return t.setAttributes(o, t.attributes), t.insert(o, t.options), o;
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'(
				e,
				t,
				o
			) {
				e.exports = function (n) {
					var r = o.nc;
					r && n.setAttribute('nonce', r);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'(
				e
			) {
				e.exports = function (t) {
					if (typeof document > 'u')
						return { update: function () {}, remove: function () {} };
					var o = t.insertStyleElement(t);
					return {
						update: function (n) {
							var r, s, i;
							(r = ''),
								n.supports && (r += '@supports ('.concat(n.supports, ') {')),
								n.media && (r += '@media '.concat(n.media, ' {')),
								(s = n.layer !== void 0) &&
									(r += '@layer'.concat(
										n.layer.length > 0 ? ' '.concat(n.layer) : '',
										' {'
									)),
								(r += n.css),
								s && (r += '}'),
								n.media && (r += '}'),
								n.supports && (r += '}'),
								(i = n.sourceMap) &&
									typeof btoa < 'u' &&
									(r += `
/*# sourceMappingURL=data:application/json;base64,`.concat(
										btoa(unescape(encodeURIComponent(JSON.stringify(i)))),
										' */'
									)),
								t.styleTagTransform(r, o, t.options);
						},
						remove: function () {
							var n;
							(n = o).parentNode === null || n.parentNode.removeChild(n);
						},
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'(
				e
			) {
				e.exports = function (t, o) {
					if (o.styleSheet) o.styleSheet.cssText = t;
					else {
						for (; o.firstChild; ) o.removeChild(o.firstChild);
						o.appendChild(document.createTextNode(t));
					}
				};
			},
		},
		ep = {};
	function be(e) {
		var t = ep[e];
		if (t !== void 0) return t.exports;
		var o = (ep[e] = { id: e, exports: {} });
		return Pg[e](o, o.exports, be), o.exports;
	}
	(be.n = (e) => {
		var t = e && e.__esModule ? () => e.default : () => e;
		return be.d(t, { a: t }), t;
	}),
		(be.d = (e, t) => {
			for (var o in t)
				be.o(t, o) &&
					!be.o(e, o) &&
					Object.defineProperty(e, o, { enumerable: !0, get: t[o] });
		}),
		(be.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t)),
		(be.nc = void 0);
	var Bg = be(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'
		),
		Og = be.n(Bg),
		Dg = be(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'
		),
		jg = be.n(Dg),
		Mg = be(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'
		),
		Vg = be.n(Mg),
		Fg = be(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'
		),
		Ug = be.n(Fg),
		Hg = be(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'
		),
		zg = be.n(Hg),
		Gg = be(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'
		),
		$g = be.n(Gg),
		Xr = be(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/primitives/accordion.module.css'
		),
		jo = {};
	(jo.styleTagTransform = $g()),
		(jo.setAttributes = Ug()),
		(jo.insert = Vg().bind(null, 'head')),
		(jo.domAPI = jg()),
		(jo.insertStyleElement = zg()),
		Og()(Xr.A, jo);
	var ut = Xr.A && Xr.A.locals ? Xr.A.locals : void 0;
	var Ut = ({ variant: e = 'default', size: t = 'medium' } = {}) => {
		let o = { default: void 0, bordered: 'root-bordered' },
			n = { medium: void 0, small: 'root-small' };
		return {
			root: (r) => {
				let s = [ut.root],
					i = o[e];
				i && s.push(ut[i]);
				let a = n[t];
				return (
					a && s.push(ut[a]),
					r?.class && s.push(r.class),
					s.filter(Boolean).join(' ')
				);
			},
			item: (r) => {
				let s = [ut.item];
				return r?.class && s.push(r.class), s.filter(Boolean).join(' ');
			},
			trigger: (r) => {
				let s = [ut.triggerInner];
				return r?.class && s.push(r.class), s.filter(Boolean).join(' ');
			},
			icon: (r) => {
				let s = [ut.icon];
				return r?.class && s.push(r.class), s.filter(Boolean).join(' ');
			},
			arrowOpen: (r) => {
				let s = [ut.arrowOpen];
				return r?.class && s.push(r.class), s.filter(Boolean).join(' ');
			},
			arrowClose: (r) => {
				let s = [ut.arrowClose];
				return r?.class && s.push(r.class), s.filter(Boolean).join(' ');
			},
			content: (r) => {
				let s = [ut.content];
				return r?.class && s.push(r.class), s.filter(Boolean).join(' ');
			},
			contentInner: (r) => {
				let s = [ut.contentInner];
				return r?.class && s.push(r.class), s.filter(Boolean).join(' ');
			},
		};
	};
	var Wg = {
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/primitives/button.module.css'(
				e,
				t,
				o
			) {
				o.d(t, { A: () => a });
				var n = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'
					),
					r = o.n(n),
					s = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'
					),
					i = o.n(s)()(r());
				i.push([
					e.id,
					':root{--button-primary:var(--c15t-primary);--button-primary-dark:var(--c15t-primary);--button-primary-hover:var(--c15t-primary-hover);--button-primary-hover-dark:var(--c15t-primary-hover);--button-neutral:var(--c15t-text-muted);--button-neutral-dark:var(--c15t-text-muted);--button-neutral-hover:var(--c15t-text);--button-neutral-hover-dark:var(--c15t-text);--button-neutral-soft:var(--c15t-surface-hover);--button-neutral-soft-dark:var(--c15t-surface-hover);--button-focus-ring:var(--c15t-primary);--button-focus-ring-dark:var(--c15t-primary);--button-text:var(--c15t-text);--button-text-dark:var(--c15t-text);--button-text-hover:var(--c15t-text);--button-text-hover-dark:var(--c15t-text);--button-background-color:var(--c15t-surface);--button-background-color-dark:var(--c15t-surface);--button-border:var(--c15t-border);--button-border-dark:var(--c15t-border);--button-hover-overlay:var(--c15t-surface-hover);--button-hover-overlay-dark:var(--c15t-surface-hover);--button-primary-hover-tint:color-mix(in srgb,var(--c15t-primary)10%,transparent);--button-neutral-hover-tint:color-mix(in srgb,var(--c15t-text)10%,transparent);--button-font:var(--c15t-font-family);--button-border-width:1px;--button-border-style:solid;--button-border-color:var(--c15t-border);--button-border-radius:var(--c15t-radius-md);--button-font-weight:var(--c15t-font-weight-medium);--button-font-size:var(--c15t-font-size-sm);--button-line-height:var(--c15t-line-height-tight);--button-transition:opacity var(--c15t-duration-fast)var(--c15t-easing),transform var(--c15t-duration-fast)var(--c15t-easing);--button-hover-transition-color:background-color var(--c15t-duration-fast)var(--c15t-easing);--button-hover-transition-full:background-color var(--c15t-duration-fast)var(--c15t-easing),box-shadow var(--c15t-duration-fast)var(--c15t-easing),color var(--c15t-duration-fast)var(--c15t-easing);--button-cursor:pointer;--button-shadow:var(--c15t-shadow-sm);--button-shadow-dark:var(--c15t-shadow-sm);--button-shadow-primary-focus:0 0 0 2px var(--button-focus-ring);--button-shadow-neutral-focus:0 0 0 2px var(--button-focus-ring);--button-shadow-primary-focus-dark:0 0 0 2px var(--button-focus-ring-dark);--button-shadow-neutral-focus-dark:0 0 0 2px var(--button-focus-ring-dark);--button-shadow-primary:var(--button-shadow),inset 0 0 0 1px var(--button-primary);--button-shadow-primary-dark:var(--button-shadow-dark),inset 0 0 0 1px var(--button-primary-dark);--button-shadow-primary-hover:none;--button-shadow-primary-hover-dark:none;--button-shadow-neutral:var(--button-shadow),inset 0 0 0 1px var(--button-neutral-soft);--button-shadow-neutral-dark:var(--button-shadow-dark),inset 0 0 0 1px var(--button-neutral-soft-dark);--button-shadow-neutral-hover:none;--button-shadow-neutral-hover-dark:none}@layer components{.c15t-ui-button-Lo5cc{border-radius:var(--button-border-radius);font-weight:var(--button-font-weight);transition:var(--button-transition);cursor:var(--button-cursor);border:var(--button-border-width)var(--button-border-style)var(--button-border-color);font-size:var(--button-font-size);line-height:var(--button-line-height);color:var(--button-text);font-family:var(--button-font);touch-action:manipulation;justify-content:center;align-items:center;gap:.5rem;display:inline-flex}.c15t-ui-button-Lo5cc:focus-visible{box-shadow:var(--button-shadow-primary-focus);outline:none}.c15t-dark .c15t-ui-button-Lo5cc:focus-visible{box-shadow:var(--button-shadow-primary-focus-dark)}.c15t-dark .c15t-ui-button-Lo5cc{color:var(--button-text-dark)}.c15t-ui-button-Lo5cc:disabled{opacity:.5;cursor:not-allowed}.c15t-ui-button-Lo5cc:active:not(:disabled){transform:scale(.97)}.c15t-ui-button-medium-zdZk5{font-size:var(--button-font-size);line-height:var(--button-line-height);padding:.625rem 1rem}.c15t-ui-button-small-nclev{font-size:var(--button-font-size);line-height:var(--button-line-height);padding:.5rem .75rem}.c15t-ui-button-xsmall-xj0Fq{font-size:var(--button-font-size);line-height:var(--button-line-height);padding:.375rem .625rem}.c15t-ui-button-xxsmall-qDcpO{font-size:var(--button-font-size);line-height:var(--button-line-height);padding:.25rem .5rem}.c15t-ui-button-primary-filled-u895k{background-color:var(--button-primary);color:var(--button-background-color)}.c15t-ui-button-primary-filled-u895k:focus-visible{box-shadow:var(--button-shadow-primary-focus)}.c15t-dark .c15t-ui-button-primary-filled-u895k{background-color:var(--button-primary-dark);color:var(--button-background-color-dark)}.c15t-ui-button-primary-filled-u895k:hover:not(:disabled){background-color:var(--button-primary-hover);transition:var(--button-hover-transition-color)}.c15t-dark .c15t-ui-button-primary-filled-u895k:hover:not(:disabled){background-color:var(--button-primary-hover-dark);transition:var(--button-hover-transition-color)}.c15t-ui-button-primary-stroke-rMkBn{background-color:var(--button-background-color);color:var(--button-primary);box-shadow:var(--button-shadow-primary)}.c15t-dark .c15t-ui-button-primary-stroke-rMkBn{background-color:var(--button-background-color-dark);color:var(--button-primary-dark);box-shadow:var(--button-shadow-primary-dark)}.c15t-ui-button-primary-stroke-rMkBn:hover:not(:disabled){background-color:var(--button-primary-hover-tint);box-shadow:var(--button-shadow-primary-hover);transition:var(--button-hover-transition-full)}.c15t-dark .c15t-ui-button-primary-stroke-rMkBn:hover:not(:disabled){background-color:var(--button-primary-hover-tint);box-shadow:var(--button-shadow-primary-hover-dark);transition:var(--button-hover-transition-full)}.c15t-ui-button-primary-lighter-pa1_G{background-color:color-mix(in srgb,var(--button-primary)10%,transparent);color:var(--button-primary)}.c15t-dark .c15t-ui-button-primary-lighter-pa1_G{background-color:color-mix(in srgb,var(--button-primary-dark)10%,transparent);color:var(--button-primary-dark)}.c15t-ui-button-primary-lighter-pa1_G:hover:not(:disabled){background-color:color-mix(in srgb,var(--button-primary)20%,transparent);transition:var(--button-hover-transition-color)}.c15t-dark .c15t-ui-button-primary-lighter-pa1_G:hover:not(:disabled){background-color:color-mix(in srgb,var(--button-primary-dark)20%,transparent);transition:var(--button-hover-transition-color)}.c15t-ui-button-primary-ghost-gUXbr{color:var(--button-primary)}.c15t-dark .c15t-ui-button-primary-ghost-gUXbr{color:var(--button-primary-dark)}.c15t-ui-button-primary-ghost-gUXbr:hover:not(:disabled){background-color:var(--button-primary-hover-tint);transition:var(--button-hover-transition-color)}.c15t-dark .c15t-ui-button-primary-ghost-gUXbr:hover:not(:disabled){background-color:var(--button-primary-hover-tint);transition:var(--button-hover-transition-color)}.c15t-ui-button-neutral-filled-iBUdt{background-color:var(--button-neutral);color:var(--button-background-color)}.c15t-ui-button-neutral-filled-iBUdt:focus-visible{box-shadow:var(--button-shadow-neutral-focus)}.c15t-dark .c15t-ui-button-neutral-filled-iBUdt{background-color:var(--button-neutral-dark);color:var(--button-background-color-dark)}.c15t-ui-button-neutral-filled-iBUdt:hover:not(:disabled){background-color:var(--button-neutral-hover);box-shadow:none;transition:var(--button-hover-transition-color)}.c15t-dark .c15t-ui-button-neutral-filled-iBUdt:hover:not(:disabled){background-color:var(--button-neutral-hover-dark);box-shadow:none;transition:var(--button-hover-transition-color)}.c15t-ui-button-neutral-stroke-FNAAx{background-color:var(--button-background-color);box-shadow:var(--button-shadow-neutral)}.c15t-dark .c15t-ui-button-neutral-stroke-FNAAx{background-color:var(--button-background-color-dark);box-shadow:var(--button-shadow-neutral-dark)}.c15t-ui-button-neutral-stroke-FNAAx:hover:not(:disabled){background-color:var(--button-neutral-hover-tint);box-shadow:none;color:var(--button-text-hover);transition:var(--button-hover-transition-full)}.c15t-dark .c15t-ui-button-neutral-stroke-FNAAx:hover:not(:disabled){background-color:var(--button-neutral-hover-tint);box-shadow:none;color:var(--button-text-hover-dark);transition:var(--button-hover-transition-full)}.c15t-ui-button-neutral-lighter-CHsDA{background-color:color-mix(in srgb,var(--button-neutral)10%,transparent);color:var(--button-neutral)}.c15t-dark .c15t-ui-button-neutral-lighter-CHsDA{background-color:color-mix(in srgb,var(--button-neutral-dark)10%,transparent);color:var(--button-neutral-dark)}.c15t-ui-button-neutral-lighter-CHsDA:hover:not(:disabled){background-color:color-mix(in srgb,var(--button-neutral)20%,transparent);transition:var(--button-hover-transition-color)}.c15t-dark .c15t-ui-button-neutral-lighter-CHsDA:hover:not(:disabled){background-color:color-mix(in srgb,var(--button-neutral-dark)20%,transparent);transition:var(--button-hover-transition-color)}.c15t-ui-button-neutral-ghost-a6Cdw{color:var(--button-neutral)}.c15t-dark .c15t-ui-button-neutral-ghost-a6Cdw{color:var(--button-neutral-dark)}.c15t-ui-button-neutral-ghost-a6Cdw:hover:not(:disabled){background-color:var(--button-neutral-hover-tint);box-shadow:none;transition:var(--button-hover-transition-color)}.c15t-dark .c15t-ui-button-neutral-ghost-a6Cdw:hover:not(:disabled){background-color:var(--button-neutral-hover-tint);box-shadow:none;transition:var(--button-hover-transition-color)}.c15t-ui-button-icon-JD5sB{justify-content:center;align-items:center;display:inline-flex}@media (prefers-reduced-motion:reduce){.c15t-ui-button-Lo5cc,.c15t-ui-button-primary-filled-u895k:hover:not(:disabled),.c15t-ui-button-primary-stroke-rMkBn:hover:not(:disabled),.c15t-ui-button-primary-lighter-pa1_G:hover:not(:disabled),.c15t-ui-button-primary-ghost-gUXbr:hover:not(:disabled),.c15t-ui-button-neutral-filled-iBUdt:hover:not(:disabled),.c15t-ui-button-neutral-stroke-FNAAx:hover:not(:disabled),.c15t-ui-button-neutral-lighter-CHsDA:hover:not(:disabled),.c15t-ui-button-neutral-ghost-a6Cdw:hover:not(:disabled){transition:none}}@media (hover:none){.c15t-ui-button-primary-filled-u895k:hover:not(:disabled){background-color:var(--button-primary)}.c15t-ui-button-primary-stroke-rMkBn:hover:not(:disabled){background-color:var(--button-background-color);box-shadow:var(--button-shadow-primary)}.c15t-ui-button-primary-lighter-pa1_G:hover:not(:disabled){background-color:color-mix(in srgb,var(--button-primary)10%,transparent)}.c15t-ui-button-primary-ghost-gUXbr:hover:not(:disabled){background-color:#0000}.c15t-ui-button-neutral-filled-iBUdt:hover:not(:disabled){background-color:var(--button-neutral)}.c15t-ui-button-neutral-stroke-FNAAx:hover:not(:disabled){background-color:var(--button-background-color);box-shadow:var(--button-shadow-neutral)}.c15t-ui-button-neutral-lighter-CHsDA:hover:not(:disabled){background-color:color-mix(in srgb,var(--button-neutral)10%,transparent)}.c15t-ui-button-neutral-ghost-a6Cdw:hover:not(:disabled){background-color:#0000}}}',
					'',
				]),
					(i.locals = {
						button: 'c15t-ui-button-Lo5cc',
						'button-medium': 'c15t-ui-button-medium-zdZk5',
						buttonMedium: 'c15t-ui-button-medium-zdZk5',
						'button-small': 'c15t-ui-button-small-nclev',
						buttonSmall: 'c15t-ui-button-small-nclev',
						'button-xsmall': 'c15t-ui-button-xsmall-xj0Fq',
						buttonXsmall: 'c15t-ui-button-xsmall-xj0Fq',
						'button-xxsmall': 'c15t-ui-button-xxsmall-qDcpO',
						buttonXxsmall: 'c15t-ui-button-xxsmall-qDcpO',
						'button-primary-filled': 'c15t-ui-button-primary-filled-u895k',
						buttonPrimaryFilled: 'c15t-ui-button-primary-filled-u895k',
						'button-primary-stroke': 'c15t-ui-button-primary-stroke-rMkBn',
						buttonPrimaryStroke: 'c15t-ui-button-primary-stroke-rMkBn',
						'button-primary-lighter': 'c15t-ui-button-primary-lighter-pa1_G',
						buttonPrimaryLighter: 'c15t-ui-button-primary-lighter-pa1_G',
						'button-primary-ghost': 'c15t-ui-button-primary-ghost-gUXbr',
						buttonPrimaryGhost: 'c15t-ui-button-primary-ghost-gUXbr',
						'button-neutral-filled': 'c15t-ui-button-neutral-filled-iBUdt',
						buttonNeutralFilled: 'c15t-ui-button-neutral-filled-iBUdt',
						'button-neutral-stroke': 'c15t-ui-button-neutral-stroke-FNAAx',
						buttonNeutralStroke: 'c15t-ui-button-neutral-stroke-FNAAx',
						'button-neutral-lighter': 'c15t-ui-button-neutral-lighter-CHsDA',
						buttonNeutralLighter: 'c15t-ui-button-neutral-lighter-CHsDA',
						'button-neutral-ghost': 'c15t-ui-button-neutral-ghost-a6Cdw',
						buttonNeutralGhost: 'c15t-ui-button-neutral-ghost-a6Cdw',
						'button-icon': 'c15t-ui-button-icon-JD5sB',
						buttonIcon: 'c15t-ui-button-icon-JD5sB',
					});
				let a = i;
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'(
				e
			) {
				e.exports = function (t) {
					var o = [];
					return (
						(o.toString = function () {
							return this.map(function (n) {
								var r = '',
									s = n[5] !== void 0;
								return (
									n[4] && (r += '@supports ('.concat(n[4], ') {')),
									n[2] && (r += '@media '.concat(n[2], ' {')),
									s &&
										(r += '@layer'.concat(
											n[5].length > 0 ? ' '.concat(n[5]) : '',
											' {'
										)),
									(r += t(n)),
									s && (r += '}'),
									n[2] && (r += '}'),
									n[4] && (r += '}'),
									r
								);
							}).join('');
						}),
						(o.i = function (n, r, s, i, a) {
							typeof n == 'string' && (n = [[null, n, void 0]]);
							var l = {};
							if (s)
								for (var u = 0; u < this.length; u++) {
									var m = this[u][0];
									m != null && (l[m] = !0);
								}
							for (var p = 0; p < n.length; p++) {
								var d = [].concat(n[p]);
								(s && l[d[0]]) ||
									(a !== void 0 &&
										(d[5] === void 0 ||
											(d[1] = '@layer'
												.concat(d[5].length > 0 ? ' '.concat(d[5]) : '', ' {')
												.concat(d[1], '}')),
										(d[5] = a)),
									r &&
										(d[2] &&
											(d[1] = '@media '.concat(d[2], ' {').concat(d[1], '}')),
										(d[2] = r)),
									i &&
										(d[4]
											? ((d[1] = '@supports ('
													.concat(d[4], ') {')
													.concat(d[1], '}')),
												(d[4] = i))
											: (d[4] = ''.concat(i))),
									o.push(d));
							}
						}),
						o
					);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'(
				e
			) {
				e.exports = function (t) {
					return t[1];
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'(
				e
			) {
				var t = [];
				function o(r) {
					for (var s = -1, i = 0; i < t.length; i++)
						if (t[i].identifier === r) {
							s = i;
							break;
						}
					return s;
				}
				function n(r, s) {
					for (var i = {}, a = [], l = 0; l < r.length; l++) {
						var u = r[l],
							m = s.base ? u[0] + s.base : u[0],
							p = i[m] || 0,
							d = ''.concat(m, ' ').concat(p);
						i[m] = p + 1;
						var f = o(d),
							h = {
								css: u[1],
								media: u[2],
								sourceMap: u[3],
								supports: u[4],
								layer: u[5],
							};
						if (f !== -1) t[f].references++, t[f].updater(h);
						else {
							var x = (function (b, y) {
								var C = y.domAPI(y);
								return (
									C.update(b),
									function (g) {
										g
											? (g.css !== b.css ||
													g.media !== b.media ||
													g.sourceMap !== b.sourceMap ||
													g.supports !== b.supports ||
													g.layer !== b.layer) &&
												C.update((b = g))
											: C.remove();
									}
								);
							})(h, s);
							(s.byIndex = l),
								t.splice(l, 0, { identifier: d, updater: x, references: 1 });
						}
						a.push(d);
					}
					return a;
				}
				e.exports = function (r, s) {
					var i = n((r = r || []), (s = s || {}));
					return function (a) {
						a = a || [];
						for (var l = 0; l < i.length; l++) {
							var u = o(i[l]);
							t[u].references--;
						}
						for (var m = n(a, s), p = 0; p < i.length; p++) {
							var d = o(i[p]);
							t[d].references === 0 && (t[d].updater(), t.splice(d, 1));
						}
						i = m;
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'(
				e
			) {
				var t = {};
				e.exports = function (o, n) {
					var r = (function (s) {
						if (t[s] === void 0) {
							var i = document.querySelector(s);
							if (
								window.HTMLIFrameElement &&
								i instanceof window.HTMLIFrameElement
							)
								try {
									i = i.contentDocument.head;
								} catch {
									i = null;
								}
							t[s] = i;
						}
						return t[s];
					})(o);
					if (!r)
						throw Error(
							"Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid."
						);
					r.appendChild(n);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'(
				e
			) {
				e.exports = function (t) {
					var o = document.createElement('style');
					return t.setAttributes(o, t.attributes), t.insert(o, t.options), o;
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'(
				e,
				t,
				o
			) {
				e.exports = function (n) {
					var r = o.nc;
					r && n.setAttribute('nonce', r);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'(
				e
			) {
				e.exports = function (t) {
					if (typeof document > 'u')
						return { update: function () {}, remove: function () {} };
					var o = t.insertStyleElement(t);
					return {
						update: function (n) {
							var r, s, i;
							(r = ''),
								n.supports && (r += '@supports ('.concat(n.supports, ') {')),
								n.media && (r += '@media '.concat(n.media, ' {')),
								(s = n.layer !== void 0) &&
									(r += '@layer'.concat(
										n.layer.length > 0 ? ' '.concat(n.layer) : '',
										' {'
									)),
								(r += n.css),
								s && (r += '}'),
								n.media && (r += '}'),
								n.supports && (r += '}'),
								(i = n.sourceMap) &&
									typeof btoa < 'u' &&
									(r += `
/*# sourceMappingURL=data:application/json;base64,`.concat(
										btoa(unescape(encodeURIComponent(JSON.stringify(i)))),
										' */'
									)),
								t.styleTagTransform(r, o, t.options);
						},
						remove: function () {
							var n;
							(n = o).parentNode === null || n.parentNode.removeChild(n);
						},
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'(
				e
			) {
				e.exports = function (t, o) {
					if (o.styleSheet) o.styleSheet.cssText = t;
					else {
						for (; o.firstChild; ) o.removeChild(o.firstChild);
						o.appendChild(document.createTextNode(t));
					}
				};
			},
		},
		tp = {};
	function he(e) {
		var t = tp[e];
		if (t !== void 0) return t.exports;
		var o = (tp[e] = { id: e, exports: {} });
		return Wg[e](o, o.exports, he), o.exports;
	}
	(he.n = (e) => {
		var t = e && e.__esModule ? () => e.default : () => e;
		return he.d(t, { a: t }), t;
	}),
		(he.d = (e, t) => {
			for (var o in t)
				he.o(t, o) &&
					!he.o(e, o) &&
					Object.defineProperty(e, o, { enumerable: !0, get: t[o] });
		}),
		(he.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t)),
		(he.nc = void 0);
	var qg = he(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'
		),
		Kg = he.n(qg),
		Yg = he(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'
		),
		Zg = he.n(Yg),
		Xg = he(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'
		),
		Jg = he.n(Xg),
		Qg = he(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'
		),
		eb = he.n(Qg),
		tb = he(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'
		),
		ob = he.n(tb),
		nb = he(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'
		),
		rb = he.n(nb),
		Jr = he(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/primitives/button.module.css'
		),
		Mo = {};
	(Mo.styleTagTransform = rb()),
		(Mo.setAttributes = eb()),
		(Mo.insert = Jg().bind(null, 'head')),
		(Mo.domAPI = Zg()),
		(Mo.insertStyleElement = ob()),
		Kg()(Jr.A, Mo);
	var Bn = Jr.A && Jr.A.locals ? Jr.A.locals : void 0;
	var Vo = ({
		variant: e = 'primary',
		mode: t = 'filled',
		size: o = 'medium',
	} = {}) => {
		let n = [Bn.button, Bn[`button-${o}`]];
		n.push(
			Bn[
				{
					'primary-filled': 'button-primary-filled',
					'primary-stroke': 'button-primary-stroke',
					'primary-lighter': 'button-primary-lighter',
					'primary-ghost': 'button-primary-ghost',
					'neutral-filled': 'button-neutral-filled',
					'neutral-stroke': 'button-neutral-stroke',
					'neutral-lighter': 'button-neutral-lighter',
					'neutral-ghost': 'button-neutral-ghost',
				}[`${e}-${t}`]
			]
		);
		let r = [Bn['button-icon']];
		return {
			root: (s) => [...n, s?.class].filter(Boolean).join(' '),
			icon: (s) => [...r, s?.class].filter(Boolean).join(' '),
		};
	};
	var sb = {
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/primitives/switch.module.css'(
				e,
				t,
				o
			) {
				o.d(t, { A: () => a });
				var n = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'
					),
					r = o.n(n),
					s = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'
					),
					i = o.n(s)()(r());
				i.push([
					e.id,
					':root{--switch-height:1.25rem;--switch-width:2rem;--switch-padding:.125rem;--switch-duration:var(--c15t-duration-normal);--switch-ease:var(--c15t-easing);--switch-thumb-size:.75rem;--switch-thumb-size-disabled:.625rem;--switch-thumb-translate:.75rem;--switch-background-color:var(--c15t-switch-track);--switch-background-color-dark:var(--c15t-switch-track);--switch-background-color-hover:var(--c15t-surface-hover);--switch-background-color-hover-dark:var(--c15t-surface-hover);--switch-background-color-checked:var(--c15t-switch-track-active);--switch-background-color-checked-dark:var(--c15t-switch-track-active);--switch-background-color-disabled:var(--c15t-border);--switch-background-color-disabled-dark:var(--c15t-border);--switch-thumb-background-color:var(--c15t-switch-thumb);--switch-thumb-background-color-dark:var(--c15t-switch-thumb);--switch-thumb-background-color-disabled:var(--c15t-surface-hover);--switch-thumb-background-color-disabled-dark:var(--c15t-surface-hover);--switch-shadow-thumb:0 0 0 1px var(--c15t-border);--switch-shadow-thumb-dark:0 0 0 1px var(--c15t-border);--switch-focus-ring:var(--c15t-primary);--switch-focus-ring-dark:var(--c15t-primary);--switch-focus-shadow:0 0 0 2px var(--switch-focus-ring);--switch-focus-shadow-dark:0 0 0 2px var(--switch-focus-ring-dark)}@layer components{.c15t-ui-root-Pd0rf{height:var(--switch-height);width:var(--switch-width);padding:var(--switch-padding);white-space:nowrap;touch-action:manipulation;background:0 0;border:0;border-radius:9999px;outline:none;flex-shrink:0;margin:0;font-family:inherit;font-size:100%;line-height:1.15;display:block}.c15t-ui-track-kWz9_{height:calc(var(--switch-height) - 2*var(--switch-padding));width:calc(var(--switch-width) - 2*var(--switch-padding));padding:var(--switch-padding);background-color:var(--switch-background-color);transition:background-color var(--switch-duration)var(--switch-ease);border-radius:9999px;outline:none;align-items:center;display:flex;position:relative}.c15t-dark .c15t-ui-track-kWz9_{background-color:var(--switch-background-color-dark)}.c15t-ui-track-kWz9_:hover{background-color:var(--switch-background-color-hover)}.c15t-dark .c15t-ui-track-kWz9_:hover{background-color:var(--switch-background-color-hover-dark)}.c15t-ui-track-kWz9_:focus-visible{background-color:var(--switch-background-color-hover)}.c15t-dark .c15t-ui-track-kWz9_:focus-visible{background-color:var(--switch-background-color-hover-dark)}.c15t-ui-track-kWz9_:active{background-color:var(--switch-background-color)}.c15t-dark .c15t-ui-track-kWz9_:active{background-color:var(--switch-background-color-dark)}.c15t-ui-root-Pd0rf[data-state=checked] .c15t-ui-track-kWz9_{background-color:var(--switch-background-color-checked)}.c15t-dark .c15t-ui-root-Pd0rf[data-state=checked] .c15t-ui-track-kWz9_{background-color:var(--switch-background-color-checked-dark)}.c15t-ui-root-Pd0rf[data-state=checked]:hover .c15t-ui-track-kWz9_{background-color:var(--switch-background-color-checked)}.c15t-dark .c15t-ui-root-Pd0rf[data-state=checked]:hover .c15t-ui-track-kWz9_{background-color:var(--switch-background-color-checked-dark)}.c15t-ui-root-Pd0rf[data-disabled]{cursor:not-allowed}.c15t-ui-root-Pd0rf:focus{outline:none}.c15t-dark .c15t-ui-root-Pd0rf:focus{outline:none}.c15t-ui-track-disabled-VxwND{background-color:var(--switch-background-color-disabled);opacity:.4;box-shadow:inset 0 0 0 1px #ebebeb}.c15t-dark .c15t-ui-track-disabled-VxwND{background-color:var(--switch-background-color-disabled-dark)}.c15t-ui-root-Pd0rf[data-state=checked] .c15t-ui-track-disabled-VxwND{background-color:var(--switch-background-color-checked);opacity:.4;box-shadow:none}.c15t-dark .c15t-ui-root-Pd0rf[data-state=checked] .c15t-ui-track-disabled-VxwND{background-color:var(--switch-background-color-checked-dark)}.c15t-ui-thumb-mP7_o{pointer-events:none;width:var(--switch-thumb-size);height:var(--switch-thumb-size);transition:transform var(--switch-duration)var(--switch-ease);display:block;position:relative;transform:translate(0)}.c15t-ui-thumb-mP7_o:before{content:"";inset-block:0;background-color:var(--switch-thumb-background-color);border-radius:9999px;width:100%;position:absolute;left:0;mask:radial-gradient(circle farthest-side,#0000 1.95px,#000 2.05px 100%) 50%/100% 100% no-repeat}.c15t-dark .c15t-ui-thumb-mP7_o:before{background-color:var(--switch-thumb-background-color-dark)}.c15t-ui-thumb-mP7_o:after{content:"";inset-block:0;width:100%;box-shadow:var(--switch-shadow-thumb);border-radius:9999px;position:absolute;left:0}.c15t-dark .c15t-ui-thumb-mP7_o:after{box-shadow:var(--switch-shadow-thumb-dark)}.c15t-ui-root-Pd0rf[data-state=checked] .c15t-ui-thumb-mP7_o{transform:translateX(var(--switch-thumb-translate))}.c15t-ui-root-Pd0rf[dir=rtl][data-state=checked] .c15t-ui-thumb-mP7_o{transform:translateX(calc(-1*var(--switch-thumb-translate)))}.c15t-ui-track-kWz9_:active .c15t-ui-thumb-mP7_o{transform:scale(.833)}.c15t-ui-thumb-disabled-fwQIy{box-shadow:none}.c15t-ui-root-Pd0rf[data-state=checked] .c15t-ui-thumb-disabled-fwQIy{transform:translateX(var(--switch-thumb-translate))}.c15t-ui-root-Pd0rf:focus-visible{box-shadow:var(--switch-focus-shadow);outline:none}.c15t-dark .c15t-ui-root-Pd0rf:focus-visible{box-shadow:var(--switch-focus-shadow-dark)}@media (prefers-reduced-motion:reduce){.c15t-ui-track-kWz9_,.c15t-ui-thumb-mP7_o{transition:none}}@media (hover:none){.c15t-ui-track-kWz9_:hover{background-color:var(--switch-background-color)}.c15t-ui-root-Pd0rf[data-state=checked] .c15t-ui-track-kWz9_:hover{background-color:var(--switch-background-color-checked)}}}',
					'',
				]),
					(i.locals = {
						root: 'c15t-ui-root-Pd0rf',
						track: 'c15t-ui-track-kWz9_',
						'track-disabled': 'c15t-ui-track-disabled-VxwND',
						trackDisabled: 'c15t-ui-track-disabled-VxwND',
						thumb: 'c15t-ui-thumb-mP7_o',
						'thumb-disabled': 'c15t-ui-thumb-disabled-fwQIy',
						thumbDisabled: 'c15t-ui-thumb-disabled-fwQIy',
					});
				let a = i;
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'(
				e
			) {
				e.exports = function (t) {
					var o = [];
					return (
						(o.toString = function () {
							return this.map(function (n) {
								var r = '',
									s = n[5] !== void 0;
								return (
									n[4] && (r += '@supports ('.concat(n[4], ') {')),
									n[2] && (r += '@media '.concat(n[2], ' {')),
									s &&
										(r += '@layer'.concat(
											n[5].length > 0 ? ' '.concat(n[5]) : '',
											' {'
										)),
									(r += t(n)),
									s && (r += '}'),
									n[2] && (r += '}'),
									n[4] && (r += '}'),
									r
								);
							}).join('');
						}),
						(o.i = function (n, r, s, i, a) {
							typeof n == 'string' && (n = [[null, n, void 0]]);
							var l = {};
							if (s)
								for (var u = 0; u < this.length; u++) {
									var m = this[u][0];
									m != null && (l[m] = !0);
								}
							for (var p = 0; p < n.length; p++) {
								var d = [].concat(n[p]);
								(s && l[d[0]]) ||
									(a !== void 0 &&
										(d[5] === void 0 ||
											(d[1] = '@layer'
												.concat(d[5].length > 0 ? ' '.concat(d[5]) : '', ' {')
												.concat(d[1], '}')),
										(d[5] = a)),
									r &&
										(d[2] &&
											(d[1] = '@media '.concat(d[2], ' {').concat(d[1], '}')),
										(d[2] = r)),
									i &&
										(d[4]
											? ((d[1] = '@supports ('
													.concat(d[4], ') {')
													.concat(d[1], '}')),
												(d[4] = i))
											: (d[4] = ''.concat(i))),
									o.push(d));
							}
						}),
						o
					);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'(
				e
			) {
				e.exports = function (t) {
					return t[1];
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'(
				e
			) {
				var t = [];
				function o(r) {
					for (var s = -1, i = 0; i < t.length; i++)
						if (t[i].identifier === r) {
							s = i;
							break;
						}
					return s;
				}
				function n(r, s) {
					for (var i = {}, a = [], l = 0; l < r.length; l++) {
						var u = r[l],
							m = s.base ? u[0] + s.base : u[0],
							p = i[m] || 0,
							d = ''.concat(m, ' ').concat(p);
						i[m] = p + 1;
						var f = o(d),
							h = {
								css: u[1],
								media: u[2],
								sourceMap: u[3],
								supports: u[4],
								layer: u[5],
							};
						if (f !== -1) t[f].references++, t[f].updater(h);
						else {
							var x = (function (b, y) {
								var C = y.domAPI(y);
								return (
									C.update(b),
									function (g) {
										g
											? (g.css !== b.css ||
													g.media !== b.media ||
													g.sourceMap !== b.sourceMap ||
													g.supports !== b.supports ||
													g.layer !== b.layer) &&
												C.update((b = g))
											: C.remove();
									}
								);
							})(h, s);
							(s.byIndex = l),
								t.splice(l, 0, { identifier: d, updater: x, references: 1 });
						}
						a.push(d);
					}
					return a;
				}
				e.exports = function (r, s) {
					var i = n((r = r || []), (s = s || {}));
					return function (a) {
						a = a || [];
						for (var l = 0; l < i.length; l++) {
							var u = o(i[l]);
							t[u].references--;
						}
						for (var m = n(a, s), p = 0; p < i.length; p++) {
							var d = o(i[p]);
							t[d].references === 0 && (t[d].updater(), t.splice(d, 1));
						}
						i = m;
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'(
				e
			) {
				var t = {};
				e.exports = function (o, n) {
					var r = (function (s) {
						if (t[s] === void 0) {
							var i = document.querySelector(s);
							if (
								window.HTMLIFrameElement &&
								i instanceof window.HTMLIFrameElement
							)
								try {
									i = i.contentDocument.head;
								} catch {
									i = null;
								}
							t[s] = i;
						}
						return t[s];
					})(o);
					if (!r)
						throw Error(
							"Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid."
						);
					r.appendChild(n);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'(
				e
			) {
				e.exports = function (t) {
					var o = document.createElement('style');
					return t.setAttributes(o, t.attributes), t.insert(o, t.options), o;
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'(
				e,
				t,
				o
			) {
				e.exports = function (n) {
					var r = o.nc;
					r && n.setAttribute('nonce', r);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'(
				e
			) {
				e.exports = function (t) {
					if (typeof document > 'u')
						return { update: function () {}, remove: function () {} };
					var o = t.insertStyleElement(t);
					return {
						update: function (n) {
							var r, s, i;
							(r = ''),
								n.supports && (r += '@supports ('.concat(n.supports, ') {')),
								n.media && (r += '@media '.concat(n.media, ' {')),
								(s = n.layer !== void 0) &&
									(r += '@layer'.concat(
										n.layer.length > 0 ? ' '.concat(n.layer) : '',
										' {'
									)),
								(r += n.css),
								s && (r += '}'),
								n.media && (r += '}'),
								n.supports && (r += '}'),
								(i = n.sourceMap) &&
									typeof btoa < 'u' &&
									(r += `
/*# sourceMappingURL=data:application/json;base64,`.concat(
										btoa(unescape(encodeURIComponent(JSON.stringify(i)))),
										' */'
									)),
								t.styleTagTransform(r, o, t.options);
						},
						remove: function () {
							var n;
							(n = o).parentNode === null || n.parentNode.removeChild(n);
						},
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'(
				e
			) {
				e.exports = function (t, o) {
					if (o.styleSheet) o.styleSheet.cssText = t;
					else {
						for (; o.firstChild; ) o.removeChild(o.firstChild);
						o.appendChild(document.createTextNode(t));
					}
				};
			},
		},
		op = {};
	function ve(e) {
		var t = op[e];
		if (t !== void 0) return t.exports;
		var o = (op[e] = { id: e, exports: {} });
		return sb[e](o, o.exports, ve), o.exports;
	}
	(ve.n = (e) => {
		var t = e && e.__esModule ? () => e.default : () => e;
		return ve.d(t, { a: t }), t;
	}),
		(ve.d = (e, t) => {
			for (var o in t)
				ve.o(t, o) &&
					!ve.o(e, o) &&
					Object.defineProperty(e, o, { enumerable: !0, get: t[o] });
		}),
		(ve.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t)),
		(ve.nc = void 0);
	var ib = ve(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'
		),
		ab = ve.n(ib),
		cb = ve(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'
		),
		lb = ve.n(cb),
		db = ve(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'
		),
		ub = ve.n(db),
		pb = ve(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'
		),
		mb = ve.n(pb),
		fb = ve(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'
		),
		gb = ve.n(fb),
		bb = ve(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'
		),
		hb = ve.n(bb),
		Qr = ve(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/primitives/switch.module.css'
		),
		Fo = {};
	(Fo.styleTagTransform = hb()),
		(Fo.setAttributes = mb()),
		(Fo.insert = ub().bind(null, 'head')),
		(Fo.domAPI = lb()),
		(Fo.insertStyleElement = gb()),
		ab()(Qr.A, Fo);
	var Pt = Qr.A && Qr.A.locals ? Qr.A.locals : void 0;
	var la = ({ size: e = 'medium' } = {}) => {
		let t = { medium: void 0, small: 'root-small' },
			o = { medium: void 0, small: 'thumb-small' },
			n = { medium: void 0, small: 'track-small' };
		return {
			root: (r) => {
				let s = [Pt.root],
					i = t[e];
				return (
					i && s.push(Pt[i]),
					r?.class && s.push(r.class),
					s.filter(Boolean).join(' ')
				);
			},
			thumb: (r) => {
				let s = [Pt.thumb],
					i = o[e];
				return (
					i && s.push(Pt[i]),
					r?.disabled && s.push(Pt['thumb-disabled']),
					r?.class && s.push(r.class),
					s.filter(Boolean).join(' ')
				);
			},
			track: (r) => {
				let s = [Pt.track],
					i = n[e];
				return (
					i && s.push(Pt[i]),
					r?.disabled && s.push(Pt['track-disabled']),
					r?.class && s.push(r.class),
					s.filter(Boolean).join(' ')
				);
			},
		};
	};
	function da(e, t, o, n, r) {
		let s = Ne.map(e, (i) => {
			if (!Ae(i)) return i;
			let a = i.type?.displayName || '',
				l = o.includes(a) ? t : {},
				u = i.props;
			return tt(
				i,
				{ ...l, key: `${n}-${i.key || a}` },
				da(u?.children, t, o, n, u?.asChild)
			);
		});
		return r ? s?.[0] : s;
	}
	var np = 'ButtonIcon',
		Ze = T(
			(
				{
					children: e,
					variant: t,
					mode: o,
					size: n,
					asChild: r,
					className: s,
					noStyle: i,
					...a
				},
				l
			) => {
				let u = Bo(),
					m = r ? Do : 'button',
					p = [i ? '' : Vo({ variant: t, mode: o, size: n }).root(), s]
						.filter(Boolean)
						.join(' '),
					d = da(
						e,
						{
							...(t && { variant: t }),
							...(o && { mode: o }),
							...(n && { size: n }),
						},
						[np],
						u,
						r
					);
				return c(m, { ref: l, className: p, ...a, children: d });
			}
		);
	function vb({ variant: e, mode: t, size: o, as: n, className: r, ...s }) {
		let { icon: i } = Vo({ variant: e, mode: t, size: o });
		return c(n || 'div', { className: i({ class: r }), ...s });
	}
	(Ze.displayName = 'ButtonRoot'), (vb.displayName = np);
	var yb = ['primary', 'secondary', 'neutral'],
		kt = T(
			(
				{
					asChild: e,
					className: t,
					style: o,
					noStyle: n,
					action: r,
					themeKey: s,
					baseClassName: i,
					variant: a = 'neutral',
					mode: l = 'stroke',
					size: u = 'small',
					onClick: m,
					closeConsentBanner: p = !1,
					closeConsentDialog: d = !1,
					category: f,
					...h
				},
				x
			) => {
				let { saveConsents: b, setActiveUI: y, setConsent: C } = q(),
					{ uiSource: g } = Kr(),
					{ noStyle: S } = te(),
					A = X(s ?? (a === 'primary' ? 'buttonPrimary' : 'buttonSecondary'), {
						baseClassName: [
							!(S || n) && Vo({ variant: a, mode: l, size: u }).root(),
						],
						style: { ...o },
						className: t,
						noStyle: S || n,
					});
				if (!f && r === 'set-consent')
					throw Error('Category is required for set-consent action');
				let I = Z(
						(O) => {
							if (
								((p || d) && y('none'),
								r === 'open-consent-dialog' && y('dialog'),
								m && m(O),
								r !== 'open-consent-dialog')
							) {
								let B = g ? { uiSource: g } : void 0;
								switch (r) {
									case 'accept-consent':
										b('all', B);
										break;
									case 'reject-consent':
										b('necessary', B);
										break;
									case 'custom-consent':
										b('custom', B);
										break;
									case 'set-consent':
										if (!f)
											throw Error(
												'Category is required for set-consent action'
											);
										C(f, !0);
								}
							}
						},
						[p, d, m, b, y, r, f, C, g]
					),
					_ = Object.fromEntries(
						Object.entries(h).filter(([O]) => !yb.includes(O))
					);
				return c(e ? Do : 'button', { ref: x, ...A, onClick: I, ..._ });
			}
		);
	kt.displayName = 'ConsentButton';
	var Cb = {
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/primitives/legal-links.module.css'(
				e,
				t,
				o
			) {
				o.d(t, { A: () => a });
				var n = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'
					),
					r = o.n(n),
					s = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'
					),
					i = o.n(s)()(r());
				i.push([
					e.id,
					':root{--legal-links-gap:.75rem;--legal-links-font-size:.875rem;--legal-links-transition:text-decoration .2s ease;--legal-links-text-decoration:none;--legal-links-text-decoration-hover:underline;--legal-links-outline:2px solid currentColor;--legal-links-outline-offset:2px;--legal-links-color:#476cff;--legal-links-focus-color:#476cff;--legal-links-focus-color-dark:#2547d0}@layer components{.c15t-ui-legalLinks-xVTMr{gap:var(--legal-links-gap);flex-wrap:wrap;align-items:center;display:flex}.c15t-ui-legalLink-YVZqO{color:var(--legal-links-color);text-decoration:var(--legal-links-text-decoration);font-size:var(--legal-links-font-size);transition:var(--legal-links-transition)}.c15t-dark .c15t-ui-legalLink-YVZqO{color:var(--legal-links-focus-color-dark)}.c15t-ui-legalLink-YVZqO:hover{text-decoration:var(--legal-links-text-decoration-hover)}.c15t-ui-legalLink-YVZqO:focus{outline:none;text-decoration:underline}@media (prefers-reduced-motion:reduce){.c15t-ui-legalLink-YVZqO{transition:none}}}',
					'',
				]),
					(i.locals = {
						legalLinks: 'c15t-ui-legalLinks-xVTMr',
						legalLink: 'c15t-ui-legalLink-YVZqO',
					});
				let a = i;
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'(
				e
			) {
				e.exports = function (t) {
					var o = [];
					return (
						(o.toString = function () {
							return this.map(function (n) {
								var r = '',
									s = n[5] !== void 0;
								return (
									n[4] && (r += '@supports ('.concat(n[4], ') {')),
									n[2] && (r += '@media '.concat(n[2], ' {')),
									s &&
										(r += '@layer'.concat(
											n[5].length > 0 ? ' '.concat(n[5]) : '',
											' {'
										)),
									(r += t(n)),
									s && (r += '}'),
									n[2] && (r += '}'),
									n[4] && (r += '}'),
									r
								);
							}).join('');
						}),
						(o.i = function (n, r, s, i, a) {
							typeof n == 'string' && (n = [[null, n, void 0]]);
							var l = {};
							if (s)
								for (var u = 0; u < this.length; u++) {
									var m = this[u][0];
									m != null && (l[m] = !0);
								}
							for (var p = 0; p < n.length; p++) {
								var d = [].concat(n[p]);
								(s && l[d[0]]) ||
									(a !== void 0 &&
										(d[5] === void 0 ||
											(d[1] = '@layer'
												.concat(d[5].length > 0 ? ' '.concat(d[5]) : '', ' {')
												.concat(d[1], '}')),
										(d[5] = a)),
									r &&
										(d[2] &&
											(d[1] = '@media '.concat(d[2], ' {').concat(d[1], '}')),
										(d[2] = r)),
									i &&
										(d[4]
											? ((d[1] = '@supports ('
													.concat(d[4], ') {')
													.concat(d[1], '}')),
												(d[4] = i))
											: (d[4] = ''.concat(i))),
									o.push(d));
							}
						}),
						o
					);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'(
				e
			) {
				e.exports = function (t) {
					return t[1];
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'(
				e
			) {
				var t = [];
				function o(r) {
					for (var s = -1, i = 0; i < t.length; i++)
						if (t[i].identifier === r) {
							s = i;
							break;
						}
					return s;
				}
				function n(r, s) {
					for (var i = {}, a = [], l = 0; l < r.length; l++) {
						var u = r[l],
							m = s.base ? u[0] + s.base : u[0],
							p = i[m] || 0,
							d = ''.concat(m, ' ').concat(p);
						i[m] = p + 1;
						var f = o(d),
							h = {
								css: u[1],
								media: u[2],
								sourceMap: u[3],
								supports: u[4],
								layer: u[5],
							};
						if (f !== -1) t[f].references++, t[f].updater(h);
						else {
							var x = (function (b, y) {
								var C = y.domAPI(y);
								return (
									C.update(b),
									function (g) {
										g
											? (g.css !== b.css ||
													g.media !== b.media ||
													g.sourceMap !== b.sourceMap ||
													g.supports !== b.supports ||
													g.layer !== b.layer) &&
												C.update((b = g))
											: C.remove();
									}
								);
							})(h, s);
							(s.byIndex = l),
								t.splice(l, 0, { identifier: d, updater: x, references: 1 });
						}
						a.push(d);
					}
					return a;
				}
				e.exports = function (r, s) {
					var i = n((r = r || []), (s = s || {}));
					return function (a) {
						a = a || [];
						for (var l = 0; l < i.length; l++) {
							var u = o(i[l]);
							t[u].references--;
						}
						for (var m = n(a, s), p = 0; p < i.length; p++) {
							var d = o(i[p]);
							t[d].references === 0 && (t[d].updater(), t.splice(d, 1));
						}
						i = m;
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'(
				e
			) {
				var t = {};
				e.exports = function (o, n) {
					var r = (function (s) {
						if (t[s] === void 0) {
							var i = document.querySelector(s);
							if (
								window.HTMLIFrameElement &&
								i instanceof window.HTMLIFrameElement
							)
								try {
									i = i.contentDocument.head;
								} catch {
									i = null;
								}
							t[s] = i;
						}
						return t[s];
					})(o);
					if (!r)
						throw Error(
							"Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid."
						);
					r.appendChild(n);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'(
				e
			) {
				e.exports = function (t) {
					var o = document.createElement('style');
					return t.setAttributes(o, t.attributes), t.insert(o, t.options), o;
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'(
				e,
				t,
				o
			) {
				e.exports = function (n) {
					var r = o.nc;
					r && n.setAttribute('nonce', r);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'(
				e
			) {
				e.exports = function (t) {
					if (typeof document > 'u')
						return { update: function () {}, remove: function () {} };
					var o = t.insertStyleElement(t);
					return {
						update: function (n) {
							var r, s, i;
							(r = ''),
								n.supports && (r += '@supports ('.concat(n.supports, ') {')),
								n.media && (r += '@media '.concat(n.media, ' {')),
								(s = n.layer !== void 0) &&
									(r += '@layer'.concat(
										n.layer.length > 0 ? ' '.concat(n.layer) : '',
										' {'
									)),
								(r += n.css),
								s && (r += '}'),
								n.media && (r += '}'),
								n.supports && (r += '}'),
								(i = n.sourceMap) &&
									typeof btoa < 'u' &&
									(r += `
/*# sourceMappingURL=data:application/json;base64,`.concat(
										btoa(unescape(encodeURIComponent(JSON.stringify(i)))),
										' */'
									)),
								t.styleTagTransform(r, o, t.options);
						},
						remove: function () {
							var n;
							(n = o).parentNode === null || n.parentNode.removeChild(n);
						},
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'(
				e
			) {
				e.exports = function (t, o) {
					if (o.styleSheet) o.styleSheet.cssText = t;
					else {
						for (; o.firstChild; ) o.removeChild(o.firstChild);
						o.appendChild(document.createTextNode(t));
					}
				};
			},
		},
		rp = {};
	function ye(e) {
		var t = rp[e];
		if (t !== void 0) return t.exports;
		var o = (rp[e] = { id: e, exports: {} });
		return Cb[e](o, o.exports, ye), o.exports;
	}
	(ye.n = (e) => {
		var t = e && e.__esModule ? () => e.default : () => e;
		return ye.d(t, { a: t }), t;
	}),
		(ye.d = (e, t) => {
			for (var o in t)
				ye.o(t, o) &&
					!ye.o(e, o) &&
					Object.defineProperty(e, o, { enumerable: !0, get: t[o] });
		}),
		(ye.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t)),
		(ye.nc = void 0);
	var xb = ye(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'
		),
		Sb = ye.n(xb),
		kb = ye(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'
		),
		wb = ye.n(kb),
		Ib = ye(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'
		),
		_b = ye.n(Ib),
		Rb = ye(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'
		),
		Tb = ye.n(Rb),
		Ab = ye(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'
		),
		Lb = ye.n(Ab),
		Eb = ye(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'
		),
		Nb = ye.n(Eb),
		es = ye(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/primitives/legal-links.module.css'
		),
		Uo = {};
	(Uo.styleTagTransform = Nb()),
		(Uo.setAttributes = Tb()),
		(Uo.insert = _b().bind(null, 'head')),
		(Uo.domAPI = wb()),
		(Uo.insertStyleElement = Lb()),
		Sb()(es.A, Uo);
	var sp = es.A && es.A.locals ? es.A.locals : void 0;
	function Pb(e) {
		let { legalLinks: t } = q();
		return e == null
			? null
			: Object.fromEntries(
					Object.entries(t ?? {}).filter(([o]) => e.includes(o))
				);
	}
	function ts({ links: e, themeKey: t, testIdPrefix: o }) {
		let n = Pb(e),
			{ legalLinks: r } = pe(),
			s = X(t, { baseClassName: sp.legalLink });
		return n && Object.keys(n).length !== 0
			? c('span', {
					children: [
						' ',
						Object.entries(n).map(([i, a], l, u) =>
							a
								? c(
										'span',
										{
											children: [
												c('a', {
													href: a.href,
													target: a.target || '_blank',
													rel:
														a.rel ||
														(a.target === '_blank'
															? 'noopener noreferrer'
															: void 0),
													...s,
													'data-testid': o ? `${o}-${i}` : void 0,
													children: [
														a.label ?? r?.[i],
														l < u.length - 1 && ',',
													],
												}),
												l < u.length - 1 && ' ',
											],
										},
										String(i)
									)
								: null
						),
					],
				})
			: null;
	}
	var On = T(({ children: e, ...t }, o) => {
		let { cookieBanner: n } = pe();
		return c(oe, {
			ref: o,
			baseClassName: Ee.title,
			'data-testid': 'consent-banner-title',
			themeKey: 'consentBannerTitle',
			...t,
			children: e ?? n.title,
		});
	});
	On.displayName = 'ConsentBannerTitle';
	var Dn = T(({ children: e, legalLinks: t, asChild: o, ...n }, r) => {
		let { cookieBanner: s } = pe();
		return o
			? c(oe, {
					ref: r,
					baseClassName: Ee.description,
					'data-testid': 'consent-banner-description',
					themeKey: 'consentBannerDescription',
					asChild: o,
					...n,
					children: e ?? s.description,
				})
			: c(oe, {
					ref: r,
					baseClassName: Ee.description,
					'data-testid': 'consent-banner-description',
					themeKey: 'consentBannerDescription',
					asChild: o,
					...n,
					children: [
						e ?? s.description,
						c(ts, {
							links: t,
							themeKey: 'consentBannerDescription',
							testIdPrefix: 'consent-banner-legal-link',
						}),
					],
				});
	});
	Dn.displayName = 'ConsentBannerDescription';
	var jn = T(({ children: e, ...t }, o) =>
		c(oe, {
			ref: o,
			baseClassName: Ee.footer,
			'data-testid': 'consent-banner-footer',
			themeKey: 'consentBannerFooter',
			...t,
			children: e,
		})
	);
	jn.displayName = 'ConsentBannerFooter';
	var Mn = T(({ children: e, ...t }, o) => {
		let { trapFocus: n } = te(),
			r = z(null),
			s = o || r,
			i = !!n;
		return (
			st(i, s),
			c(oe, {
				ref: s,
				tabIndex: 0,
				baseClassName: Ee.card,
				'data-testid': 'consent-banner-card',
				themeKey: 'consentBannerCard',
				'aria-label': t['aria-label'] || 'Consent Banner',
				'aria-modal': i ? 'true' : void 0,
				role: i ? 'dialog' : void 0,
				...t,
				children: e,
			})
		);
	});
	Mn.displayName = 'ConsentBannerCard';
	var Vn = T(({ children: e, ...t }, o) =>
		c(oe, {
			ref: o,
			baseClassName: Ee.header,
			'data-testid': 'consent-banner-header',
			themeKey: 'consentBannerHeader',
			...t,
			children: e,
		})
	);
	Vn.displayName = 'ConsentBannerHeader';
	var Fn = T(({ children: e, ...t }, o) =>
		c(oe, {
			ref: o,
			baseClassName: Ee.footerSubGroup,
			'data-testid': 'consent-banner-footer-sub-group',
			themeKey: 'consentBannerFooterSubGroup',
			...t,
			children: e,
		})
	);
	Fn.displayName = 'ConsentBannerFooterSubGroup';
	var Un = T(({ children: e, ...t }, o) => {
		let { common: n } = pe();
		return c(kt, {
			ref: o,
			action: 'reject-consent',
			'data-testid': 'consent-banner-reject-button',
			closeConsentBanner: !0,
			...t,
			children: e ?? n.rejectAll,
		});
	});
	Un.displayName = 'ConsentBannerRejectButton';
	var Hn = T(({ children: e, ...t }, o) => {
		let { common: n } = pe();
		return c(kt, {
			ref: o,
			action: 'open-consent-dialog',
			'data-testid': 'consent-banner-customize-button',
			...t,
			children: e ?? n.customize,
		});
	});
	Hn.displayName = 'ConsentBannerCustomizeButton';
	var zn = T(({ children: e, ...t }, o) => {
		let { common: n } = pe(),
			{ noStyle: r } = te();
		return c(kt, {
			ref: o,
			action: 'accept-consent',
			'data-testid': 'consent-banner-accept-button',
			closeConsentBanner: !0,
			noStyle: r,
			...t,
			children: e ?? n.acceptAll,
		});
	});
	zn.displayName = 'ConsentBannerAcceptButton';
	var ip = On,
		ap = Dn,
		cp = jn,
		ua = Fn,
		pa = Mn,
		lp = Vn,
		dp = Un,
		up = Hn,
		pp = zn;
	function mp() {
		let [e, t] = P(!1);
		return (
			M(() => {
				if (typeof window > 'u') return;
				let o = window.matchMedia('(prefers-reduced-motion: reduce)');
				t(o.matches);
				let n = (r) => {
					t(r.matches);
				};
				return (
					o.addEventListener('change', n),
					() => o.removeEventListener('change', n)
				);
			}, []),
			e
		);
	}
	function Ht(e) {
		let t = te(),
			o = mp();
		return {
			noStyle: e?.noStyle ?? t.noStyle ?? !1,
			disableAnimation: e?.disableAnimation ?? t.disableAnimation ?? o,
			scrollLock: e?.scrollLock ?? t.scrollLock ?? !1,
			trapFocus: e?.trapFocus ?? t.trapFocus ?? !0,
		};
	}
	var os = class extends Ve {
		constructor(t) {
			super(t), (this.state = { hasError: !1, error: null, errorInfo: null });
		}
		static getDerivedStateFromError(t) {
			return { hasError: !0, error: t, errorInfo: null };
		}
		componentDidCatch(t, o) {
			this.setState({ error: t, errorInfo: o });
		}
		render() {
			return this.state.hasError
				? typeof this.props.fallback == 'function'
					? this.props.fallback(this.state.error, this.state.errorInfo)
					: this.props.fallback
				: this.props.children;
		}
	};
	var Bb = [['reject', 'accept'], 'customize'],
		fp = ({
			noStyle: e,
			disableAnimation: t,
			scrollLock: o,
			trapFocus: n = !0,
			title: r,
			description: s,
			rejectButtonText: i,
			customizeButtonText: a,
			acceptButtonText: l,
			legalLinks: u,
			layout: m = Bb,
			primaryButton: p = 'customize',
			models: d,
			uiSource: f,
		}) => {
			let { cookieBanner: h } = pe(),
				x = Ht({
					noStyle: e,
					disableAnimation: t,
					scrollLock: o,
					trapFocus: n,
				}),
				b = (y) => {
					let C = Array.isArray(p) ? p.includes(y) : y === p;
					switch (y) {
						case 'reject':
							return c(Un, {
								variant: C ? 'primary' : 'neutral',
								'data-testid': 'consent-banner-reject-button',
								children: i,
							});
						case 'accept':
							return c(zn, {
								variant: C ? 'primary' : 'neutral',
								'data-testid': 'consent-banner-accept-button',
								children: l,
							});
						case 'customize':
							return c(Hn, {
								variant: C ? 'primary' : 'neutral',
								'data-testid': 'consent-banner-customize-button',
								children: a,
							});
					}
				};
			return c(os, {
				fallback: c('div', {
					children: 'Something went wrong with the Consent Banner.',
				}),
				children: c(Yr, {
					...x,
					models: d,
					uiSource: f,
					children: c(Mn, {
						'aria-label': h.title,
						children: [
							c(Vn, {
								children: [
									c(On, { children: r }),
									c(Dn, { legalLinks: u, children: s }),
								],
							}),
							c(jn, {
								children: m.map((y, C) => {
									if (Array.isArray(y)) {
										let g = y.join('-');
										return c(
											Fn,
											{ children: y.map((S) => c(W, { children: b(S) }, S)) },
											g ? `group-${g}` : `group-${C}`
										);
									}
									return c(W, { children: b(y) }, y);
								}),
							}),
						],
					}),
				}),
			});
		};
	var ma = Object.assign(fp, {
		Root: Xu,
		Card: pa,
		Header: lp,
		Title: ip,
		Description: ap,
		Footer: cp,
		FooterSubGroup: ua,
		RejectButton: dp,
		CustomizeButton: up,
		AcceptButton: pp,
		Overlay: qr,
		Content: pa,
		Actions: ua,
	});
	var Ob = {
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/components/consent-dialog.module.css'(
				e,
				t,
				o
			) {
				o.d(t, { A: () => a });
				var n = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'
					),
					r = o.n(n),
					s = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'
					),
					i = o.n(s)()(r());
				i.push([
					e.id,
					':root{--consent-dialog-font-family:var(--c15t-font-family);--consent-dialog-line-height:var(--c15t-line-height-tight);--consent-dialog-title-font-size:var(--c15t-font-size-sm);--consent-dialog-title-font-weight:var(--c15t-font-weight-semibold);--consent-dialog-title-letter-spacing:-.025em;--consent-dialog-description-font-size:var(--c15t-font-size-base);--consent-dialog-description-font-weight:var(--c15t-font-weight-normal);--consent-dialog-description-line-height:var(--c15t-line-height-normal);--consent-dialog-footer-gap:var(--c15t-space-sm);--consent-dialog-footer-font-size:14px;--consent-dialog-branding-font-size:var(--c15t-font-size-base);--consent-dialog-branding-font-weight:var(--c15t-font-weight-medium);--consent-dialog-branding-line-height:var(--c15t-line-height-relaxed);--consent-dialog-branding-letter-spacing:-.01em;--consent-dialog-stroke-color:var(--c15t-border);--consent-dialog-stroke-color-dark:var(--c15t-border);--consent-dialog-branding-focus-color:var(--c15t-primary);--consent-dialog-branding-focus-color-dark:var(--c15t-primary);--consent-dialog-link-text-color:var(--c15t-text);--consent-dialog-link-text-color-dark:var(--c15t-text);--consent-dialog-border-color:var(--c15t-border);--consent-dialog-border-color-dark:var(--c15t-border);--consent-dialog-background-color:var(--c15t-surface);--consent-dialog-background-color-dark:var(--c15t-surface);--consent-dialog-foreground-color:var(--c15t-text);--consent-dialog-foreground-color-dark:var(--c15t-text);--consent-dialog-muted-color:var(--c15t-text-muted);--consent-dialog-muted-color-dark:var(--c15t-text-muted);--consent-dialog-overlay-background-color:var(--c15t-overlay);--consent-dialog-overlay-background-color-dark:var(--c15t-overlay);--consent-dialog-card-padding:var(--c15t-space-lg);--consent-dialog-card-padding-mobile:var(--c15t-space-md);--consent-dialog-card-gap:var(--c15t-space-xs);--consent-dialog-header-gap:var(--c15t-space-xs);--consent-dialog-content-gap:var(--c15t-space-md);--consent-dialog-footer-padding-y:var(--c15t-space-md);--consent-dialog-card-radius:var(--c15t-radius-lg);--consent-dialog-max-width:28rem;--consent-dialog-height:80%;--consent-dialog-z-index:1000000000;--consent-dialog-overlay-z-index:1000000000;--consent-dialog-card-shadow:0 1px 2px 0 #0000000d;--consent-dialog-border-width:1px;--consent-dialog-border-width-hairline:1px;--consent-dialog-border-style:solid;--consent-dialog-animation-duration:.2s;--consent-dialog-animation-timing:ease-out;--consent-dialog-branding-gap:.5rem;--consent-dialog-branding-icon-height:1.25rem;--consent-dialog-branding-icon-width:auto}@media only screen and (resolution>=192dpi){:root{--consent-dialog-border-width-hairline:.5px}}@layer components{.c15t-ui-root-SIREQ{isolation:isolate;font-family:var(--consent-dialog-font-family);line-height:var(--consent-dialog-line-height);-webkit-text-size-adjust:100%;tab-size:4;padding:var(--consent-dialog-card-padding-mobile);z-index:var(--consent-dialog-z-index);border-radius:var(--consent-dialog-card-radius);width:100%;height:var(--consent-dialog-height);background:0 0;border:0;justify-content:center;align-items:center;margin:0;display:flex;position:fixed;inset:0}.c15t-ui-root-SIREQ[dir=rtl]{direction:rtl}.c15t-ui-dialogVisible-kshSO{opacity:1;transition:opacity var(--consent-dialog-animation-duration)var(--consent-dialog-animation-timing)}.c15t-ui-dialogHidden-Nkf8B{opacity:0;transition:opacity var(--consent-dialog-animation-duration)var(--consent-dialog-animation-timing)}.c15t-ui-contentVisible-JdLax{opacity:1;transition:opacity var(--consent-dialog-animation-duration)var(--consent-dialog-animation-timing),transform var(--consent-dialog-animation-duration)cubic-bezier(.34,1.56,.64,1);transform:scale(1)}.c15t-ui-contentHidden-b7Eem{opacity:0;transition:opacity var(--consent-dialog-animation-duration)var(--consent-dialog-animation-timing),transform var(--consent-dialog-animation-duration)var(--consent-dialog-animation-timing);transform:scale(.95)}@media (width>=640px){.c15t-ui-root-SIREQ{padding:var(--consent-dialog-card-padding);width:auto}}.c15t-ui-container-kzMoS{width:100%}.c15t-ui-branding-cFvDg{justify-content:center;align-items:center;gap:var(--consent-dialog-branding-gap);font-size:var(--consent-dialog-branding-font-size);font-weight:var(--consent-dialog-branding-font-weight);line-height:var(--consent-dialog-branding-line-height);letter-spacing:var(--consent-dialog-branding-letter-spacing);color:var(--consent-dialog-foreground-color);border-radius:.25rem;margin:auto 0;padding:0 .5rem;text-decoration:none;display:flex}.c15t-ui-branding-cFvDg:focus-visible{box-shadow:0 0 0 2px var(--consent-dialog-branding-focus-color);outline:none}.c15t-dark .c15t-ui-branding-cFvDg:focus-visible{box-shadow:0 0 0 2px var(--consent-dialog-branding-focus-color-dark)}.c15t-dark .c15t-ui-branding-cFvDg{color:var(--consent-dialog-foreground-color-dark)}.c15t-ui-brandingC15T-zxnCt{width:var(--consent-dialog-branding-icon-width);height:var(--consent-dialog-branding-icon-height)}.c15t-ui-brandingConsent-qPIfz{width:var(--consent-dialog-branding-icon-width);height:1rem}.c15t-ui-headerWrapper-unPKA{position:relative}.c15t-ui-closeButton-xUsO9{position:absolute;top:22px;right:22px}.c15t-ui-footer-wtxGp{border-top:solid 1px var(--consent-dialog-stroke-color);justify-content:center;padding-top:1rem;padding-bottom:1rem;font-size:14px}.c15t-ui-overlay-zmCXe{color:var(--consent-dialog-link-text-color);background-color:var(--consent-dialog-overlay-background-color);z-index:var(--consent-dialog-overlay-z-index);position:fixed;inset:0}.c15t-ui-overlayVisible-csRAE{opacity:1;transition:opacity var(--consent-dialog-animation-duration)var(--consent-dialog-animation-timing)}.c15t-ui-overlayHidden-zcSPn{opacity:0;transition:opacity var(--consent-dialog-animation-duration)var(--consent-dialog-animation-timing)}.c15t-dark .c15t-ui-overlay-zmCXe{background-color:var(--consent-dialog-overlay-background-color-dark);color:var(--consent-dialog-link-text-color-dark)}.c15t-ui-card-OCFER{width:min(100%,var(--consent-dialog-max-width));border-radius:var(--consent-dialog-card-radius);border:var(--consent-dialog-border-width)var(--consent-dialog-border-style)var(--consent-dialog-border-color);background-color:var(--consent-dialog-background-color);color:var(--consent-dialog-foreground-color);box-shadow:var(--consent-dialog-card-shadow);margin:0 auto;overflow:hidden}.c15t-dark .c15t-ui-card-OCFER{background-color:var(--consent-dialog-background-color-dark);color:var(--consent-dialog-foreground-color-dark);border-color:var(--consent-dialog-border-color-dark)}.c15t-ui-header-BhjKW{padding:var(--consent-dialog-card-padding);gap:var(--consent-dialog-header-gap);flex-direction:column;display:flex}.c15t-ui-header-BhjKW>*+*{margin-top:var(--consent-dialog-card-gap)}.c15t-ui-title-nqdol{font-weight:var(--consent-dialog-title-font-weight);font-size:var(--consent-dialog-title-font-size);letter-spacing:var(--consent-dialog-title-letter-spacing);line-height:1}.c15t-ui-description-qNkW1{color:var(--consent-dialog-muted-color);font-size:var(--consent-dialog-description-font-size);font-weight:var(--consent-dialog-description-font-weight);line-height:var(--consent-dialog-description-line-height)}.c15t-dark .c15t-ui-description-qNkW1{color:var(--consent-dialog-muted-color-dark)}.c15t-ui-content-lXTS6{padding:var(--consent-dialog-card-padding);gap:var(--consent-dialog-content-gap);padding-top:0}.c15t-ui-footer-wtxGp{justify-content:center;align-items:center;gap:var(--consent-dialog-footer-gap);font-size:var(--consent-dialog-footer-font-size);padding-top:var(--consent-dialog-footer-padding-y);padding-bottom:var(--consent-dialog-footer-padding-y);border-top:var(--consent-dialog-border-width)var(--consent-dialog-border-style)var(--consent-dialog-stroke-color);flex-direction:column;display:flex}.c15t-ui-footer-wtxGp:empty{border-top:none;display:none}.c15t-dark .c15t-ui-footer-wtxGp{border-color:var(--consent-dialog-stroke-color-dark)}@media (prefers-reduced-motion:reduce){.c15t-ui-dialogVisible-kshSO,.c15t-ui-dialogHidden-Nkf8B,.c15t-ui-contentVisible-JdLax,.c15t-ui-contentHidden-b7Eem,.c15t-ui-overlayVisible-csRAE,.c15t-ui-overlayHidden-zcSPn{transition:none}}}',
					'',
				]),
					(i.locals = {
						root: 'c15t-ui-root-SIREQ',
						dialogVisible: 'c15t-ui-dialogVisible-kshSO',
						dialogHidden: 'c15t-ui-dialogHidden-Nkf8B',
						contentVisible: 'c15t-ui-contentVisible-JdLax',
						contentHidden: 'c15t-ui-contentHidden-b7Eem',
						container: 'c15t-ui-container-kzMoS',
						branding: 'c15t-ui-branding-cFvDg',
						brandingC15T: 'c15t-ui-brandingC15T-zxnCt',
						brandingConsent: 'c15t-ui-brandingConsent-qPIfz',
						headerWrapper: 'c15t-ui-headerWrapper-unPKA',
						closeButton: 'c15t-ui-closeButton-xUsO9',
						footer: 'c15t-ui-footer-wtxGp',
						overlay: 'c15t-ui-overlay-zmCXe',
						overlayVisible: 'c15t-ui-overlayVisible-csRAE',
						overlayHidden: 'c15t-ui-overlayHidden-zcSPn',
						card: 'c15t-ui-card-OCFER',
						header: 'c15t-ui-header-BhjKW',
						title: 'c15t-ui-title-nqdol',
						description: 'c15t-ui-description-qNkW1',
						content: 'c15t-ui-content-lXTS6',
					});
				let a = i;
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'(
				e
			) {
				e.exports = function (t) {
					var o = [];
					return (
						(o.toString = function () {
							return this.map(function (n) {
								var r = '',
									s = n[5] !== void 0;
								return (
									n[4] && (r += '@supports ('.concat(n[4], ') {')),
									n[2] && (r += '@media '.concat(n[2], ' {')),
									s &&
										(r += '@layer'.concat(
											n[5].length > 0 ? ' '.concat(n[5]) : '',
											' {'
										)),
									(r += t(n)),
									s && (r += '}'),
									n[2] && (r += '}'),
									n[4] && (r += '}'),
									r
								);
							}).join('');
						}),
						(o.i = function (n, r, s, i, a) {
							typeof n == 'string' && (n = [[null, n, void 0]]);
							var l = {};
							if (s)
								for (var u = 0; u < this.length; u++) {
									var m = this[u][0];
									m != null && (l[m] = !0);
								}
							for (var p = 0; p < n.length; p++) {
								var d = [].concat(n[p]);
								(s && l[d[0]]) ||
									(a !== void 0 &&
										(d[5] === void 0 ||
											(d[1] = '@layer'
												.concat(d[5].length > 0 ? ' '.concat(d[5]) : '', ' {')
												.concat(d[1], '}')),
										(d[5] = a)),
									r &&
										(d[2] &&
											(d[1] = '@media '.concat(d[2], ' {').concat(d[1], '}')),
										(d[2] = r)),
									i &&
										(d[4]
											? ((d[1] = '@supports ('
													.concat(d[4], ') {')
													.concat(d[1], '}')),
												(d[4] = i))
											: (d[4] = ''.concat(i))),
									o.push(d));
							}
						}),
						o
					);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'(
				e
			) {
				e.exports = function (t) {
					return t[1];
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'(
				e
			) {
				var t = [];
				function o(r) {
					for (var s = -1, i = 0; i < t.length; i++)
						if (t[i].identifier === r) {
							s = i;
							break;
						}
					return s;
				}
				function n(r, s) {
					for (var i = {}, a = [], l = 0; l < r.length; l++) {
						var u = r[l],
							m = s.base ? u[0] + s.base : u[0],
							p = i[m] || 0,
							d = ''.concat(m, ' ').concat(p);
						i[m] = p + 1;
						var f = o(d),
							h = {
								css: u[1],
								media: u[2],
								sourceMap: u[3],
								supports: u[4],
								layer: u[5],
							};
						if (f !== -1) t[f].references++, t[f].updater(h);
						else {
							var x = (function (b, y) {
								var C = y.domAPI(y);
								return (
									C.update(b),
									function (g) {
										g
											? (g.css !== b.css ||
													g.media !== b.media ||
													g.sourceMap !== b.sourceMap ||
													g.supports !== b.supports ||
													g.layer !== b.layer) &&
												C.update((b = g))
											: C.remove();
									}
								);
							})(h, s);
							(s.byIndex = l),
								t.splice(l, 0, { identifier: d, updater: x, references: 1 });
						}
						a.push(d);
					}
					return a;
				}
				e.exports = function (r, s) {
					var i = n((r = r || []), (s = s || {}));
					return function (a) {
						a = a || [];
						for (var l = 0; l < i.length; l++) {
							var u = o(i[l]);
							t[u].references--;
						}
						for (var m = n(a, s), p = 0; p < i.length; p++) {
							var d = o(i[p]);
							t[d].references === 0 && (t[d].updater(), t.splice(d, 1));
						}
						i = m;
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'(
				e
			) {
				var t = {};
				e.exports = function (o, n) {
					var r = (function (s) {
						if (t[s] === void 0) {
							var i = document.querySelector(s);
							if (
								window.HTMLIFrameElement &&
								i instanceof window.HTMLIFrameElement
							)
								try {
									i = i.contentDocument.head;
								} catch {
									i = null;
								}
							t[s] = i;
						}
						return t[s];
					})(o);
					if (!r)
						throw Error(
							"Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid."
						);
					r.appendChild(n);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'(
				e
			) {
				e.exports = function (t) {
					var o = document.createElement('style');
					return t.setAttributes(o, t.attributes), t.insert(o, t.options), o;
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'(
				e,
				t,
				o
			) {
				e.exports = function (n) {
					var r = o.nc;
					r && n.setAttribute('nonce', r);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'(
				e
			) {
				e.exports = function (t) {
					if (typeof document > 'u')
						return { update: function () {}, remove: function () {} };
					var o = t.insertStyleElement(t);
					return {
						update: function (n) {
							var r, s, i;
							(r = ''),
								n.supports && (r += '@supports ('.concat(n.supports, ') {')),
								n.media && (r += '@media '.concat(n.media, ' {')),
								(s = n.layer !== void 0) &&
									(r += '@layer'.concat(
										n.layer.length > 0 ? ' '.concat(n.layer) : '',
										' {'
									)),
								(r += n.css),
								s && (r += '}'),
								n.media && (r += '}'),
								n.supports && (r += '}'),
								(i = n.sourceMap) &&
									typeof btoa < 'u' &&
									(r += `
/*# sourceMappingURL=data:application/json;base64,`.concat(
										btoa(unescape(encodeURIComponent(JSON.stringify(i)))),
										' */'
									)),
								t.styleTagTransform(r, o, t.options);
						},
						remove: function () {
							var n;
							(n = o).parentNode === null || n.parentNode.removeChild(n);
						},
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'(
				e
			) {
				e.exports = function (t, o) {
					if (o.styleSheet) o.styleSheet.cssText = t;
					else {
						for (; o.firstChild; ) o.removeChild(o.firstChild);
						o.appendChild(document.createTextNode(t));
					}
				};
			},
		},
		gp = {};
	function Ce(e) {
		var t = gp[e];
		if (t !== void 0) return t.exports;
		var o = (gp[e] = { id: e, exports: {} });
		return Ob[e](o, o.exports, Ce), o.exports;
	}
	(Ce.n = (e) => {
		var t = e && e.__esModule ? () => e.default : () => e;
		return Ce.d(t, { a: t }), t;
	}),
		(Ce.d = (e, t) => {
			for (var o in t)
				Ce.o(t, o) &&
					!Ce.o(e, o) &&
					Object.defineProperty(e, o, { enumerable: !0, get: t[o] });
		}),
		(Ce.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t)),
		(Ce.nc = void 0);
	var Db = Ce(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'
		),
		jb = Ce.n(Db),
		Mb = Ce(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'
		),
		Vb = Ce.n(Mb),
		Fb = Ce(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'
		),
		Ub = Ce.n(Fb),
		Hb = Ce(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'
		),
		zb = Ce.n(Hb),
		Gb = Ce(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'
		),
		$b = Ce.n(Gb),
		Wb = Ce(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'
		),
		qb = Ce.n(Wb),
		ns = Ce(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/components/consent-dialog.module.css'
		),
		Ho = {};
	(Ho.styleTagTransform = qb()),
		(Ho.setAttributes = zb()),
		(Ho.insert = Ub().bind(null, 'head')),
		(Ho.domAPI = Vb()),
		(Ho.insertStyleElement = $b()),
		jb()(ns.A, Ho);
	var me = ns.A && ns.A.locals ? ns.A.locals : void 0;
	var Kb = {
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/components/consent-widget.module.css'(
				e,
				t,
				o
			) {
				o.d(t, { A: () => a });
				var n = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'
					),
					r = o.n(n),
					s = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'
					),
					i = o.n(s)()(r());
				i.push([
					e.id,
					':root{--consent-widget-background-color:var(--c15t-surface);--consent-widget-background-color-dark:var(--c15t-surface);--consent-widget-border-color:var(--c15t-border);--consent-widget-border-color-dark:var(--c15t-border);--consent-widget-text-color:var(--c15t-text);--consent-widget-text-color-dark:var(--c15t-text);--consent-widget-text-muted-color:var(--c15t-text-muted);--consent-widget-text-muted-color-dark:var(--c15t-text-muted);--consent-widget-footer-background-color:transparent;--consent-widget-footer-background-color-dark:transparent;--consent-widget-link-text-color:var(--c15t-text);--consent-widget-link-text-color-dark:var(--c15t-text);--consent-widget-branding-link-color:var(--c15t-primary);--consent-widget-padding:0;--consent-widget-radius:0;--consent-widget-gap:var(--c15t-space-xs);--consent-widget-border-width:0;--consent-widget-max-width:32rem;--consent-widget-z-index:50;--consent-widget-footer-padding:var(--c15t-space-lg)0 0 0;--consent-widget-title-size:var(--c15t-font-size-sm);--consent-widget-title-line-height:var(--c15t-line-height-tight);--consent-widget-title-tracking:-.006em;--consent-widget-title-weight:var(--c15t-font-weight-semibold);--consent-widget-entry-animation:c15t-ui-enter-oqaf_ var(--c15t-duration-fast)var(--c15t-easing);--consent-widget-exit-animation:c15t-ui-exit-Yh5ig var(--c15t-duration-fast)var(--c15t-easing);--consent-widget-accordion-padding:var(--c15t-space-md);--consent-widget-accordion-radius:var(--c15t-radius-md);--consent-widget-accordion-duration:var(--c15t-duration-normal);--consent-widget-accordion-ease:var(--c15t-easing);--consent-widget-accordion-icon-size:1.25rem;--consent-widget-accordion-background-color:var(--c15t-surface);--consent-widget-accordion-background-color-dark:var(--c15t-surface);--consent-widget-accordion-background-hover:var(--c15t-surface-hover);--consent-widget-accordion-background-hover-dark:var(--c15t-surface-hover);--consent-widget-accordion-border-color:var(--c15t-border);--consent-widget-accordion-border-color-dark:var(--c15t-border);--consent-widget-accordion-text-color:var(--c15t-text);--consent-widget-accordion-text-color-dark:var(--c15t-text);--consent-widget-accordion-icon-color:var(--c15t-text-muted);--consent-widget-accordion-icon-color-dark:var(--c15t-text-muted);--consent-widget-accordion-arrow-color:#a3a3a3;--consent-widget-accordion-arrow-color-dark:#ccc;--consent-widget-accordion-content-color:#5c5c5c;--consent-widget-accordion-content-color-dark:#999;--consent-widget-accordion-focus-ring:#476cff;--consent-widget-accordion-focus-ring-dark:#2547d0;--consent-widget-accordion-focus-shadow:0 0 0 2px #476cff;--consent-widget-accordion-focus-shadow-dark:0 0 0 2px #2547d0;--consent-widget-font-family:system-ui,"Segoe UI",Roboto,Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji";--consent-widget-line-height:1.15}@layer components{.c15t-ui-widget-tTKyY{font-family:var(--consent-widget-font-family);line-height:var(--consent-widget-line-height);-webkit-font-smoothing:antialiased}.c15t-ui-widget-tTKyY>:not([hidden])~:not([hidden]){--space-y-reverse:0;margin-top:calc(1.5rem*calc(1 - var(--space-y-reverse)));margin-bottom:calc(1.5rem*var(--space-y-reverse))}.c15t-ui-card-UpkfF{width:min(100%,var(--consent-widget-max-width));border-radius:var(--consent-widget-radius);border:var(--consent-widget-border-width)solid var(--consent-widget-border-color);background-color:var(--consent-widget-background-color);position:relative}.c15t-dark .c15t-ui-card-UpkfF{background-color:var(--consent-widget-background-color-dark);border-color:var(--consent-widget-border-color-dark)}.c15t-ui-card-UpkfF[data-state=open]{animation:var(--consent-widget-entry-animation)}.c15t-ui-card-UpkfF[data-state=closed]{animation:var(--consent-widget-exit-animation)}.c15t-ui-header-UNVT2{gap:var(--consent-widget-gap);padding:var(--consent-widget-padding);flex-direction:column;display:flex}.c15t-ui-title-VZSLD{font-size:var(--consent-widget-title-size);line-height:var(--consent-widget-title-line-height);letter-spacing:var(--consent-widget-title-tracking);font-weight:var(--consent-widget-title-weight);color:var(--consent-widget-text-color)}.c15t-dark .c15t-ui-title-VZSLD{color:var(--consent-widget-text-color-dark)}.c15t-ui-description-wIwCB{color:var(--consent-widget-text-muted-color)}.c15t-dark .c15t-ui-description-wIwCB{color:var(--consent-widget-text-muted-color-dark)}.c15t-ui-content-vvxqv{padding:0 var(--consent-widget-padding);padding-bottom:var(--consent-widget-padding)}.c15t-ui-footer-vPM5F{padding:var(--consent-widget-footer-padding);background-color:var(--consent-widget-footer-background-color);justify-content:space-between;gap:1rem;display:flex}.c15t-dark .c15t-ui-footer-vPM5F{background-color:var(--consent-widget-footer-background-color-dark)}@media (width<=640px){.c15t-ui-footer-vPM5F{flex-direction:column}}@media (width>=640px){.c15t-ui-footer-vPM5F{flex-direction:row}}.c15t-ui-footerGroup-KRskU{flex-direction:row;justify-content:space-between;gap:1rem;display:flex}@media (width<=640px){.c15t-ui-footerGroup-KRskU,.c15t-ui-footerGroup-KRskU button{width:100%}}.c15t-ui-branding-OBSbe{border-top:var(--consent-widget-border-width)solid var(--consent-widget-border-color);justify-content:center;width:100%;padding-top:1rem;display:flex}.c15t-dark .c15t-ui-branding-OBSbe{border-color:var(--consent-widget-border-color-dark)}.c15t-ui-brandingLink-RAOti{color:var(--consent-widget-link-text-color);text-align:center;flex-direction:row;flex:1;justify-content:center;align-items:center;gap:.5rem;text-decoration:none;display:flex}.c15t-dark .c15t-ui-brandingLink-RAOti{color:var(--consent-widget-link-text-color-dark)}.c15t-ui-brandingLink-RAOti svg{height:1.2rem}@keyframes c15t-ui-enter-oqaf_{0%{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}@keyframes c15t-ui-exit-Yh5ig{0%{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(.95)}}.c15t-ui-bottomLeft-MFOD6{bottom:0;left:0}.c15t-ui-bottomRight-PBeso{bottom:0;right:0}.c15t-ui-topLeft-uEV5R{top:0;left:0}.c15t-ui-topRight-jj0Fj{top:0;right:0}.c15t-ui-accordionItem-phxAm{border-radius:var(--consent-widget-accordion-radius);border:1px solid var(--consent-widget-accordion-border-color);background-color:var(--consent-widget-accordion-background-color);position:relative;overflow:visible}.c15t-ui-accordionItem-phxAm:has(.c15t-ui-accordionTriggerInner-OxxsR:focus-visible){box-shadow:0 0 0 2px var(--consent-widget-accordion-focus-ring)}.c15t-dark .c15t-ui-accordionItem-phxAm{border-color:var(--consent-widget-accordion-border-color-dark);background-color:var(--consent-widget-accordion-background-color-dark)}.c15t-ui-accordionTrigger-hVnri{width:100%;color:var(--consent-widget-accordion-text-color);transition:background-color var(--consent-widget-accordion-duration)var(--consent-widget-accordion-ease);background-color:#0000;justify-content:space-between;align-items:center;display:flex}.c15t-ui-accordionTrigger-hVnri:hover{background-color:var(--consent-widget-accordion-background-hover)}.c15t-dark .c15t-ui-accordionTrigger-hVnri{color:var(--consent-widget-accordion-text-color-dark)}.c15t-dark .c15t-ui-accordionTrigger-hVnri:hover{background-color:var(--consent-widget-accordion-background-hover-dark)}.c15t-ui-accordionTriggerInner-OxxsR{align-items:center;gap:var(--consent-widget-gap);font-size:var(--consent-widget-title-size);font-weight:var(--consent-widget-title-weight);border-radius:var(--consent-widget-accordion-radius);display:flex;position:relative}.c15t-ui-accordionContent-S6PcX{padding:var(--consent-widget-gap)var(--consent-widget-accordion-padding)var(--consent-widget-gap)0;color:var(--consent-widget-accordion-content-color);font-size:.875rem;line-height:1.5}.c15t-dark .c15t-ui-accordionContent-S6PcX{color:var(--consent-widget-accordion-content-color-dark)}.c15t-ui-accordionArrow-yFH7h{color:var(--consent-widget-accordion-arrow-color);width:var(--consent-widget-accordion-icon-size);height:var(--consent-widget-accordion-icon-size);transition:transform var(--consent-widget-accordion-duration)var(--consent-widget-accordion-ease)}.c15t-dark .c15t-ui-accordionArrow-yFH7h{color:var(--consent-widget-accordion-arrow-color-dark)}.c15t-ui-accordionItem-phxAm[data-state=open] .c15t-ui-accordionArrow-yFH7h{transform:rotate(180deg)}.c15t-ui-switch-YnFJT{cursor:pointer}@media (prefers-reduced-motion:reduce){.c15t-ui-card-UpkfF[data-state=open],.c15t-ui-card-UpkfF[data-state=closed]{animation:none}.c15t-ui-accordionTrigger-hVnri,.c15t-ui-accordionArrow-yFH7h{transition:none}}}',
					'',
				]),
					(i.locals = {
						enter: 'c15t-ui-enter-oqaf_',
						exit: 'c15t-ui-exit-Yh5ig',
						widget: 'c15t-ui-widget-tTKyY',
						card: 'c15t-ui-card-UpkfF',
						header: 'c15t-ui-header-UNVT2',
						title: 'c15t-ui-title-VZSLD',
						description: 'c15t-ui-description-wIwCB',
						content: 'c15t-ui-content-vvxqv',
						footer: 'c15t-ui-footer-vPM5F',
						footerGroup: 'c15t-ui-footerGroup-KRskU',
						branding: 'c15t-ui-branding-OBSbe',
						brandingLink: 'c15t-ui-brandingLink-RAOti',
						bottomLeft: 'c15t-ui-bottomLeft-MFOD6',
						bottomRight: 'c15t-ui-bottomRight-PBeso',
						topLeft: 'c15t-ui-topLeft-uEV5R',
						topRight: 'c15t-ui-topRight-jj0Fj',
						accordionItem: 'c15t-ui-accordionItem-phxAm',
						accordionTriggerInner: 'c15t-ui-accordionTriggerInner-OxxsR',
						accordionTrigger: 'c15t-ui-accordionTrigger-hVnri',
						accordionContent: 'c15t-ui-accordionContent-S6PcX',
						accordionArrow: 'c15t-ui-accordionArrow-yFH7h',
						switch: 'c15t-ui-switch-YnFJT',
					});
				let a = i;
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'(
				e
			) {
				e.exports = function (t) {
					var o = [];
					return (
						(o.toString = function () {
							return this.map(function (n) {
								var r = '',
									s = n[5] !== void 0;
								return (
									n[4] && (r += '@supports ('.concat(n[4], ') {')),
									n[2] && (r += '@media '.concat(n[2], ' {')),
									s &&
										(r += '@layer'.concat(
											n[5].length > 0 ? ' '.concat(n[5]) : '',
											' {'
										)),
									(r += t(n)),
									s && (r += '}'),
									n[2] && (r += '}'),
									n[4] && (r += '}'),
									r
								);
							}).join('');
						}),
						(o.i = function (n, r, s, i, a) {
							typeof n == 'string' && (n = [[null, n, void 0]]);
							var l = {};
							if (s)
								for (var u = 0; u < this.length; u++) {
									var m = this[u][0];
									m != null && (l[m] = !0);
								}
							for (var p = 0; p < n.length; p++) {
								var d = [].concat(n[p]);
								(s && l[d[0]]) ||
									(a !== void 0 &&
										(d[5] === void 0 ||
											(d[1] = '@layer'
												.concat(d[5].length > 0 ? ' '.concat(d[5]) : '', ' {')
												.concat(d[1], '}')),
										(d[5] = a)),
									r &&
										(d[2] &&
											(d[1] = '@media '.concat(d[2], ' {').concat(d[1], '}')),
										(d[2] = r)),
									i &&
										(d[4]
											? ((d[1] = '@supports ('
													.concat(d[4], ') {')
													.concat(d[1], '}')),
												(d[4] = i))
											: (d[4] = ''.concat(i))),
									o.push(d));
							}
						}),
						o
					);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'(
				e
			) {
				e.exports = function (t) {
					return t[1];
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'(
				e
			) {
				var t = [];
				function o(r) {
					for (var s = -1, i = 0; i < t.length; i++)
						if (t[i].identifier === r) {
							s = i;
							break;
						}
					return s;
				}
				function n(r, s) {
					for (var i = {}, a = [], l = 0; l < r.length; l++) {
						var u = r[l],
							m = s.base ? u[0] + s.base : u[0],
							p = i[m] || 0,
							d = ''.concat(m, ' ').concat(p);
						i[m] = p + 1;
						var f = o(d),
							h = {
								css: u[1],
								media: u[2],
								sourceMap: u[3],
								supports: u[4],
								layer: u[5],
							};
						if (f !== -1) t[f].references++, t[f].updater(h);
						else {
							var x = (function (b, y) {
								var C = y.domAPI(y);
								return (
									C.update(b),
									function (g) {
										g
											? (g.css !== b.css ||
													g.media !== b.media ||
													g.sourceMap !== b.sourceMap ||
													g.supports !== b.supports ||
													g.layer !== b.layer) &&
												C.update((b = g))
											: C.remove();
									}
								);
							})(h, s);
							(s.byIndex = l),
								t.splice(l, 0, { identifier: d, updater: x, references: 1 });
						}
						a.push(d);
					}
					return a;
				}
				e.exports = function (r, s) {
					var i = n((r = r || []), (s = s || {}));
					return function (a) {
						a = a || [];
						for (var l = 0; l < i.length; l++) {
							var u = o(i[l]);
							t[u].references--;
						}
						for (var m = n(a, s), p = 0; p < i.length; p++) {
							var d = o(i[p]);
							t[d].references === 0 && (t[d].updater(), t.splice(d, 1));
						}
						i = m;
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'(
				e
			) {
				var t = {};
				e.exports = function (o, n) {
					var r = (function (s) {
						if (t[s] === void 0) {
							var i = document.querySelector(s);
							if (
								window.HTMLIFrameElement &&
								i instanceof window.HTMLIFrameElement
							)
								try {
									i = i.contentDocument.head;
								} catch {
									i = null;
								}
							t[s] = i;
						}
						return t[s];
					})(o);
					if (!r)
						throw Error(
							"Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid."
						);
					r.appendChild(n);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'(
				e
			) {
				e.exports = function (t) {
					var o = document.createElement('style');
					return t.setAttributes(o, t.attributes), t.insert(o, t.options), o;
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'(
				e,
				t,
				o
			) {
				e.exports = function (n) {
					var r = o.nc;
					r && n.setAttribute('nonce', r);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'(
				e
			) {
				e.exports = function (t) {
					if (typeof document > 'u')
						return { update: function () {}, remove: function () {} };
					var o = t.insertStyleElement(t);
					return {
						update: function (n) {
							var r, s, i;
							(r = ''),
								n.supports && (r += '@supports ('.concat(n.supports, ') {')),
								n.media && (r += '@media '.concat(n.media, ' {')),
								(s = n.layer !== void 0) &&
									(r += '@layer'.concat(
										n.layer.length > 0 ? ' '.concat(n.layer) : '',
										' {'
									)),
								(r += n.css),
								s && (r += '}'),
								n.media && (r += '}'),
								n.supports && (r += '}'),
								(i = n.sourceMap) &&
									typeof btoa < 'u' &&
									(r += `
/*# sourceMappingURL=data:application/json;base64,`.concat(
										btoa(unescape(encodeURIComponent(JSON.stringify(i)))),
										' */'
									)),
								t.styleTagTransform(r, o, t.options);
						},
						remove: function () {
							var n;
							(n = o).parentNode === null || n.parentNode.removeChild(n);
						},
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'(
				e
			) {
				e.exports = function (t, o) {
					if (o.styleSheet) o.styleSheet.cssText = t;
					else {
						for (; o.firstChild; ) o.removeChild(o.firstChild);
						o.appendChild(document.createTextNode(t));
					}
				};
			},
		},
		bp = {};
	function xe(e) {
		var t = bp[e];
		if (t !== void 0) return t.exports;
		var o = (bp[e] = { id: e, exports: {} });
		return Kb[e](o, o.exports, xe), o.exports;
	}
	(xe.n = (e) => {
		var t = e && e.__esModule ? () => e.default : () => e;
		return xe.d(t, { a: t }), t;
	}),
		(xe.d = (e, t) => {
			for (var o in t)
				xe.o(t, o) &&
					!xe.o(e, o) &&
					Object.defineProperty(e, o, { enumerable: !0, get: t[o] });
		}),
		(xe.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t)),
		(xe.nc = void 0);
	var Yb = xe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'
		),
		Zb = xe.n(Yb),
		Xb = xe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'
		),
		Jb = xe.n(Xb),
		Qb = xe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'
		),
		eh = xe.n(Qb),
		th = xe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'
		),
		oh = xe.n(th),
		nh = xe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'
		),
		rh = xe.n(nh),
		sh = xe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'
		),
		ih = xe.n(sh),
		rs = xe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/components/consent-widget.module.css'
		),
		zo = {};
	(zo.styleTagTransform = ih()),
		(zo.setAttributes = oh()),
		(zo.insert = eh().bind(null, 'head')),
		(zo.domAPI = Jb()),
		(zo.insertStyleElement = rh()),
		Zb()(rs.A, zo);
	var Xe = rs.A && rs.A.locals ? rs.A.locals : void 0;
	function zt(e, t = []) {
		let o = [];
		function n(s, i) {
			let a = Ie(i),
				l = o.length;
			o = [...o, i];
			let u = (p) => {
				let { scope: d, children: f, ...h } = p,
					x = d?.[e]?.[l] || a,
					b = J(() => h, Object.values(h));
				return c(x.Provider, { value: b, children: f });
			};
			u.displayName = s + 'Provider';
			function m(p, d) {
				let f = d?.[e]?.[l] || a,
					h = Te(f);
				if (h) return h;
				if (i !== void 0) return i;
				throw new Error(`\`${p}\` must be used within \`${s}\``);
			}
			return [u, m];
		}
		let r = () => {
			let s = o.map((i) => Ie(i));
			return function (a) {
				let l = a?.[e] || s;
				return J(() => ({ [`__scope${e}`]: { ...a, [e]: l } }), [a, l]);
			};
		};
		return (r.scopeName = e), [n, ah(r, ...t)];
	}
	function ah(...e) {
		let t = e[0];
		if (e.length === 1) return t;
		let o = () => {
			let n = e.map((r) => ({ useScope: r(), scopeName: r.scopeName }));
			return function (s) {
				let i = n.reduce((a, { useScope: l, scopeName: u }) => {
					let p = l(s)[`__scope${u}`];
					return { ...a, ...p };
				}, {});
				return J(() => ({ [`__scope${t.scopeName}`]: i }), [i]);
			};
		};
		return (o.scopeName = t.scopeName), o;
	}
	function Gn(e) {
		let t = ch(e),
			o = T((n, r) => {
				let { children: s, ...i } = n,
					a = Ne.toArray(s),
					l = a.find(dh);
				if (l) {
					let u = l.props.children,
						m = a.map((p) =>
							p === l
								? Ne.count(u) > 1
									? Ne.only(null)
									: Ae(u)
										? u.props.children
										: null
								: p
						);
					return c(t, {
						...i,
						ref: r,
						children: Ae(u) ? tt(u, void 0, m) : null,
					});
				}
				return c(t, { ...i, ref: r, children: s });
			});
		return (o.displayName = `${e}.Slot`), o;
	}
	function ch(e) {
		let t = T((o, n) => {
			let { children: r, ...s } = o;
			if (Ae(r)) {
				let i = ph(r),
					a = uh(s, r.props);
				return r.type !== W && (a.ref = n ? Pn(n, i) : i), tt(r, a);
			}
			return Ne.count(r) > 1 ? Ne.only(null) : null;
		});
		return (t.displayName = `${e}.SlotClone`), t;
	}
	var lh = Symbol('radix.slottable');
	function dh(e) {
		return (
			Ae(e) &&
			typeof e.type == 'function' &&
			'__radixId' in e.type &&
			e.type.__radixId === lh
		);
	}
	function uh(e, t) {
		let o = { ...t };
		for (let n in t) {
			let r = e[n],
				s = t[n];
			/^on[A-Z]/.test(n)
				? r && s
					? (o[n] = (...a) => {
							let l = s(...a);
							return r(...a), l;
						})
					: r && (o[n] = r)
				: n === 'style'
					? (o[n] = { ...r, ...s })
					: n === 'className' && (o[n] = [r, s].filter(Boolean).join(' '));
		}
		return { ...e, ...o };
	}
	function ph(e) {
		let t = Object.getOwnPropertyDescriptor(e.props, 'ref')?.get,
			o = t && 'isReactWarning' in t && t.isReactWarning;
		return o
			? e.ref
			: ((t = Object.getOwnPropertyDescriptor(e, 'ref')?.get),
				(o = t && 'isReactWarning' in t && t.isReactWarning),
				o ? e.props.ref : e.props.ref || e.ref);
	}
	function hp(e) {
		let t = e + 'CollectionProvider',
			[o, n] = zt(t),
			[r, s] = o(t, { collectionRef: { current: null }, itemMap: new Map() }),
			i = (x) => {
				let { scope: b, children: y } = x,
					C = ie.useRef(null),
					g = ie.useRef(new Map()).current;
				return c(r, { scope: b, itemMap: g, collectionRef: C, children: y });
			};
		i.displayName = t;
		let a = e + 'CollectionSlot',
			l = Gn(a),
			u = ie.forwardRef((x, b) => {
				let { scope: y, children: C } = x,
					g = s(a, y),
					S = it(b, g.collectionRef);
				return c(l, { ref: S, children: C });
			});
		u.displayName = a;
		let m = e + 'CollectionItemSlot',
			p = 'data-radix-collection-item',
			d = Gn(m),
			f = ie.forwardRef((x, b) => {
				let { scope: y, children: C, ...g } = x,
					S = ie.useRef(null),
					A = it(b, S),
					I = s(m, y);
				return (
					ie.useEffect(
						() => (
							I.itemMap.set(S, { ref: S, ...g }),
							() => {
								I.itemMap.delete(S);
							}
						)
					),
					c(d, { [p]: '', ref: A, children: C })
				);
			});
		f.displayName = m;
		function h(x) {
			let b = s(e + 'CollectionConsumer', x);
			return ie.useCallback(() => {
				let C = b.collectionRef.current;
				if (!C) return [];
				let g = Array.from(C.querySelectorAll(`[${p}]`));
				return Array.from(b.itemMap.values()).sort(
					(I, _) => g.indexOf(I.ref.current) - g.indexOf(_.ref.current)
				);
			}, [b.collectionRef, b.itemMap]);
		}
		return [{ Provider: i, Slot: u, ItemSlot: f }, h, n];
	}
	var w_ = !!(
		typeof window < 'u' &&
		window.document &&
		window.document.createElement
	);
	function Go(e, t, { checkForDefaultPrevented: o = !0 } = {}) {
		return function (r) {
			if ((e?.(r), o === !1 || !r.defaultPrevented)) return t?.(r);
		};
	}
	var pt = globalThis?.document ? Ye : () => {};
	var mh = ge[' useInsertionEffect '.trim().toString()] || pt;
	function co({ prop: e, defaultProp: t, onChange: o = () => {}, caller: n }) {
		let [r, s, i] = fh({ defaultProp: t, onChange: o }),
			a = e !== void 0,
			l = a ? e : r;
		{
			let m = z(e !== void 0);
			M(() => {
				let p = m.current;
				p !== a &&
					console.warn(
						`${n} is changing from ${p ? 'controlled' : 'uncontrolled'} to ${a ? 'controlled' : 'uncontrolled'}. Components should not switch from controlled to uncontrolled (or vice versa). Decide between using a controlled or uncontrolled value for the lifetime of the component.`
					),
					(m.current = a);
			}, [a, n]);
		}
		let u = Z(
			(m) => {
				if (a) {
					let p = gh(m) ? m(e) : m;
					p !== e && i.current?.(p);
				} else s(m);
			},
			[a, e, s, i]
		);
		return [l, u];
	}
	function fh({ defaultProp: e, onChange: t }) {
		let [o, n] = P(e),
			r = z(o),
			s = z(t);
		return (
			mh(() => {
				s.current = t;
			}, [t]),
			M(() => {
				r.current !== o && (s.current?.(o), (r.current = o));
			}, [o, r]),
			[o, n, s]
		);
	}
	function gh(e) {
		return typeof e == 'function';
	}
	var bh = [
			'a',
			'button',
			'div',
			'form',
			'h2',
			'h3',
			'img',
			'input',
			'label',
			'li',
			'nav',
			'ol',
			'p',
			'select',
			'span',
			'svg',
			'ul',
		],
		wt = bh.reduce((e, t) => {
			let o = Gn(`Primitive.${t}`),
				n = T((r, s) => {
					let { asChild: i, ...a } = r,
						l = i ? o : t;
					return (
						typeof window < 'u' && (window[Symbol.for('radix-ui')] = !0),
						c(l, { ...a, ref: s })
					);
				});
			return (n.displayName = `Primitive.${t}`), { ...e, [t]: n };
		}, {});
	function hh(e, t) {
		return Ft((o, n) => t[o][n] ?? o, e);
	}
	var fa = (e) => {
		let { present: t, children: o } = e,
			n = vh(t),
			r = typeof o == 'function' ? o({ present: n.isPresent }) : Ne.only(o),
			s = it(n.ref, yh(r));
		return typeof o == 'function' || n.isPresent ? tt(r, { ref: s }) : null;
	};
	fa.displayName = 'Presence';
	function vh(e) {
		let [t, o] = P(),
			n = z(null),
			r = z(e),
			s = z('none'),
			i = e ? 'mounted' : 'unmounted',
			[a, l] = hh(i, {
				mounted: { UNMOUNT: 'unmounted', ANIMATION_OUT: 'unmountSuspended' },
				unmountSuspended: { MOUNT: 'mounted', ANIMATION_END: 'unmounted' },
				unmounted: { MOUNT: 'mounted' },
			});
		return (
			M(() => {
				let u = ss(n.current);
				s.current = a === 'mounted' ? u : 'none';
			}, [a]),
			pt(() => {
				let u = n.current,
					m = r.current;
				if (m !== e) {
					let d = s.current,
						f = ss(u);
					e
						? l('MOUNT')
						: f === 'none' || u?.display === 'none'
							? l('UNMOUNT')
							: l(m && d !== f ? 'ANIMATION_OUT' : 'UNMOUNT'),
						(r.current = e);
				}
			}, [e, l]),
			pt(() => {
				if (t) {
					let u,
						m = t.ownerDocument.defaultView ?? window,
						p = (f) => {
							let x = ss(n.current).includes(CSS.escape(f.animationName));
							if (f.target === t && x && (l('ANIMATION_END'), !r.current)) {
								let b = t.style.animationFillMode;
								(t.style.animationFillMode = 'forwards'),
									(u = m.setTimeout(() => {
										t.style.animationFillMode === 'forwards' &&
											(t.style.animationFillMode = b);
									}));
							}
						},
						d = (f) => {
							f.target === t && (s.current = ss(n.current));
						};
					return (
						t.addEventListener('animationstart', d),
						t.addEventListener('animationcancel', p),
						t.addEventListener('animationend', p),
						() => {
							m.clearTimeout(u),
								t.removeEventListener('animationstart', d),
								t.removeEventListener('animationcancel', p),
								t.removeEventListener('animationend', p);
						}
					);
				} else l('ANIMATION_END');
			}, [t, l]),
			{
				isPresent: ['mounted', 'unmountSuspended'].includes(a),
				ref: Z((u) => {
					(n.current = u ? getComputedStyle(u) : null), o(u);
				}, []),
			}
		);
	}
	function ss(e) {
		return e?.animationName || 'none';
	}
	function yh(e) {
		let t = Object.getOwnPropertyDescriptor(e.props, 'ref')?.get,
			o = t && 'isReactWarning' in t && t.isReactWarning;
		return o
			? e.ref
			: ((t = Object.getOwnPropertyDescriptor(e, 'ref')?.get),
				(o = t && 'isReactWarning' in t && t.isReactWarning),
				o ? e.props.ref : e.props.ref || e.ref);
	}
	var Ch = ge[' useId '.trim().toString()] || (() => {}),
		xh = 0;
	function is(e) {
		let [t, o] = P(Ch());
		return (
			pt(() => {
				e || o((n) => n ?? String(xh++));
			}, [e]),
			e || (t ? `radix-${t}` : '')
		);
	}
	var as = 'Collapsible',
		[Sh, ga] = zt(as),
		[kh, ba] = Sh(as),
		vp = T((e, t) => {
			let {
					__scopeCollapsible: o,
					open: n,
					defaultOpen: r,
					disabled: s,
					onOpenChange: i,
					...a
				} = e,
				[l, u] = co({ prop: n, defaultProp: r ?? !1, onChange: i, caller: as });
			return c(kh, {
				scope: o,
				disabled: s,
				contentId: is(),
				open: l,
				onOpenToggle: Z(() => u((m) => !m), [u]),
				children: c(wt.div, {
					'data-state': va(l),
					'data-disabled': s ? '' : void 0,
					...a,
					ref: t,
				}),
			});
		});
	vp.displayName = as;
	var yp = 'CollapsibleTrigger',
		Cp = T((e, t) => {
			let { __scopeCollapsible: o, ...n } = e,
				r = ba(yp, o);
			return c(wt.button, {
				type: 'button',
				'aria-controls': r.contentId,
				'aria-expanded': r.open || !1,
				'data-state': va(r.open),
				'data-disabled': r.disabled ? '' : void 0,
				disabled: r.disabled,
				...n,
				ref: t,
				onClick: Go(e.onClick, r.onOpenToggle),
			});
		});
	Cp.displayName = yp;
	var ha = 'CollapsibleContent',
		xp = T((e, t) => {
			let { forceMount: o, ...n } = e,
				r = ba(ha, e.__scopeCollapsible);
			return c(fa, {
				present: o || r.open,
				children: ({ present: s }) => c(wh, { ...n, ref: t, present: s }),
			});
		});
	xp.displayName = ha;
	var wh = T((e, t) => {
		let { __scopeCollapsible: o, present: n, children: r, ...s } = e,
			i = ba(ha, o),
			[a, l] = P(n),
			u = z(null),
			m = it(t, u),
			p = z(0),
			d = p.current,
			f = z(0),
			h = f.current,
			x = i.open || a,
			b = z(x),
			y = z(void 0);
		return (
			M(() => {
				let C = requestAnimationFrame(() => (b.current = !1));
				return () => cancelAnimationFrame(C);
			}, []),
			pt(() => {
				let C = u.current;
				if (C) {
					(y.current = y.current || {
						transitionDuration: C.style.transitionDuration,
						animationName: C.style.animationName,
					}),
						(C.style.transitionDuration = '0s'),
						(C.style.animationName = 'none');
					let g = C.getBoundingClientRect();
					(p.current = g.height),
						(f.current = g.width),
						b.current ||
							((C.style.transitionDuration = y.current.transitionDuration),
							(C.style.animationName = y.current.animationName)),
						l(n);
				}
			}, [i.open, n]),
			c(wt.div, {
				'data-state': va(i.open),
				'data-disabled': i.disabled ? '' : void 0,
				id: i.contentId,
				hidden: !x,
				...s,
				ref: m,
				style: {
					'--radix-collapsible-content-height': d ? `${d}px` : void 0,
					'--radix-collapsible-content-width': h ? `${h}px` : void 0,
					...e.style,
				},
				children: x && r,
			})
		);
	});
	function va(e) {
		return e ? 'open' : 'closed';
	}
	var Sp = vp,
		kp = Cp,
		wp = xp;
	var _h = Ie(void 0);
	function Ip(e) {
		let t = Te(_h);
		return e || t || 'ltr';
	}
	var mt = 'Accordion',
		Rh = ['Home', 'End', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'],
		[Ca, Th, Ah] = hp(mt),
		[ls, sR] = zt(mt, [Ah, ga]),
		xa = ga(),
		_p = ie.forwardRef((e, t) => {
			let { type: o, ...n } = e,
				r = n,
				s = n;
			return c(Ca.Provider, {
				scope: e.__scopeAccordion,
				children:
					o === 'multiple' ? c(Ph, { ...s, ref: t }) : c(Nh, { ...r, ref: t }),
			});
		});
	_p.displayName = mt;
	var [Rp, Lh] = ls(mt),
		[Tp, Eh] = ls(mt, { collapsible: !1 }),
		Nh = ie.forwardRef((e, t) => {
			let {
					value: o,
					defaultValue: n,
					onValueChange: r = () => {},
					collapsible: s = !1,
					...i
				} = e,
				[a, l] = co({ prop: o, defaultProp: n ?? '', onChange: r, caller: mt });
			return c(Rp, {
				scope: e.__scopeAccordion,
				value: ie.useMemo(() => (a ? [a] : []), [a]),
				onItemOpen: l,
				onItemClose: ie.useCallback(() => s && l(''), [s, l]),
				children: c(Tp, {
					scope: e.__scopeAccordion,
					collapsible: s,
					children: c(Ap, { ...i, ref: t }),
				}),
			});
		}),
		Ph = ie.forwardRef((e, t) => {
			let { value: o, defaultValue: n, onValueChange: r = () => {}, ...s } = e,
				[i, a] = co({ prop: o, defaultProp: n ?? [], onChange: r, caller: mt }),
				l = ie.useCallback((m) => a((p = []) => [...p, m]), [a]),
				u = ie.useCallback((m) => a((p = []) => p.filter((d) => d !== m)), [a]);
			return c(Rp, {
				scope: e.__scopeAccordion,
				value: i,
				onItemOpen: l,
				onItemClose: u,
				children: c(Tp, {
					scope: e.__scopeAccordion,
					collapsible: !0,
					children: c(Ap, { ...s, ref: t }),
				}),
			});
		}),
		[Bh, ds] = ls(mt),
		Ap = ie.forwardRef((e, t) => {
			let {
					__scopeAccordion: o,
					disabled: n,
					dir: r,
					orientation: s = 'vertical',
					...i
				} = e,
				a = ie.useRef(null),
				l = it(a, t),
				u = Th(o),
				p = Ip(r) === 'ltr',
				d = Go(e.onKeyDown, (f) => {
					if (!Rh.includes(f.key)) return;
					let h = f.target,
						x = u().filter((O) => !O.ref.current?.disabled),
						b = x.findIndex((O) => O.ref.current === h),
						y = x.length;
					if (b === -1) return;
					f.preventDefault();
					let C = b,
						g = 0,
						S = y - 1,
						A = () => {
							(C = b + 1), C > S && (C = g);
						},
						I = () => {
							(C = b - 1), C < g && (C = S);
						};
					switch (f.key) {
						case 'Home':
							C = g;
							break;
						case 'End':
							C = S;
							break;
						case 'ArrowRight':
							s === 'horizontal' && (p ? A() : I());
							break;
						case 'ArrowDown':
							s === 'vertical' && A();
							break;
						case 'ArrowLeft':
							s === 'horizontal' && (p ? I() : A());
							break;
						case 'ArrowUp':
							s === 'vertical' && I();
							break;
					}
					let _ = C % y;
					x[_].ref.current?.focus();
				});
			return c(Bh, {
				scope: o,
				disabled: n,
				direction: r,
				orientation: s,
				children: c(Ca.Slot, {
					scope: o,
					children: c(wt.div, {
						...i,
						'data-orientation': s,
						ref: l,
						onKeyDown: n ? void 0 : d,
					}),
				}),
			});
		}),
		cs = 'AccordionItem',
		[Oh, Sa] = ls(cs),
		Lp = ie.forwardRef((e, t) => {
			let { __scopeAccordion: o, value: n, ...r } = e,
				s = ds(cs, o),
				i = Lh(cs, o),
				a = xa(o),
				l = is(),
				u = (n && i.value.includes(n)) || !1,
				m = s.disabled || e.disabled;
			return c(Oh, {
				scope: o,
				open: u,
				disabled: m,
				triggerId: l,
				children: c(Sp, {
					'data-orientation': s.orientation,
					'data-state': Op(u),
					...a,
					...r,
					ref: t,
					disabled: m,
					open: u,
					onOpenChange: (p) => {
						p ? i.onItemOpen(n) : i.onItemClose(n);
					},
				}),
			});
		});
	Lp.displayName = cs;
	var Ep = 'AccordionHeader',
		Dh = ie.forwardRef((e, t) => {
			let { __scopeAccordion: o, ...n } = e,
				r = ds(mt, o),
				s = Sa(Ep, o);
			return c(wt.h3, {
				'data-orientation': r.orientation,
				'data-state': Op(s.open),
				'data-disabled': s.disabled ? '' : void 0,
				...n,
				ref: t,
			});
		});
	Dh.displayName = Ep;
	var ya = 'AccordionTrigger',
		Np = ie.forwardRef((e, t) => {
			let { __scopeAccordion: o, ...n } = e,
				r = ds(mt, o),
				s = Sa(ya, o),
				i = Eh(ya, o),
				a = xa(o);
			return c(Ca.ItemSlot, {
				scope: o,
				children: c(kp, {
					'aria-disabled': (s.open && !i.collapsible) || void 0,
					'data-orientation': r.orientation,
					id: s.triggerId,
					...a,
					...n,
					ref: t,
				}),
			});
		});
	Np.displayName = ya;
	var Pp = 'AccordionContent',
		Bp = ie.forwardRef((e, t) => {
			let { __scopeAccordion: o, ...n } = e,
				r = ds(mt, o),
				s = Sa(Pp, o),
				i = xa(o);
			return c(wp, {
				role: 'region',
				'aria-labelledby': s.triggerId,
				'data-orientation': r.orientation,
				...i,
				...n,
				ref: t,
				style: {
					'--radix-accordion-content-height':
						'var(--radix-collapsible-content-height)',
					'--radix-accordion-content-width':
						'var(--radix-collapsible-content-width)',
					...e.style,
				},
			});
		});
	Bp.displayName = Pp;
	function Op(e) {
		return e ? 'open' : 'closed';
	}
	var Dp = _p,
		jp = Lp;
	var Mp = Np,
		Vp = Bp;
	var $o = ({ title: e, iconPath: t }) =>
		T((o, n) =>
			c('svg', {
				xmlns: 'http://www.w3.org/2000/svg',
				viewBox: '0 0 24 24',
				fill: 'none',
				stroke: 'currentColor',
				strokeLinecap: 'round',
				strokeLinejoin: 'round',
				strokeWidth: 2,
				ref: n,
				...o,
				children: [c('title', { children: e }), t],
			})
		);
	var ka = T(
		(
			{
				className: e,
				variant: t = 'default',
				size: o = 'medium',
				noStyle: n,
				...r
			},
			s
		) => {
			let { noStyle: i } = te(),
				a = Ut({ variant: t, size: o });
			return c(Dp, {
				ref: s,
				className: i || n ? e : a.root({ class: e }),
				...r,
			});
		}
	);
	ka.displayName = 'AccordionRoot';
	var wa = T(({ className: e, noStyle: t, ...o }, n) => {
		let { noStyle: r } = te(),
			s = Ut();
		return c(jp, {
			ref: n,
			className: r || t ? e : s.item({ class: e }),
			...o,
		});
	});
	wa.displayName = 'AccordionItem';
	var Ia = T(({ children: e, className: t, noStyle: o, ...n }, r) => {
		let { noStyle: s } = te(),
			i = Ut();
		return c(Mp, {
			ref: r,
			className: s || o ? t : i.trigger({ class: t }),
			...n,
			children: e,
		});
	});
	function jh({ className: e, noStyle: t, as: o, ...n }) {
		let r = Ut(),
			s = typeof e == 'string' ? e : void 0;
		return c(o || 'div', { className: t ? s : r.icon({ class: s }), ...n });
	}
	function _a({
		openIcon: e = {
			Element: $o({
				title: 'Open',
				iconPath: c('path', { d: 'M5 12h14M12 5v14' }),
			}),
		},
		closeIcon: t = {
			Element: $o({ title: 'Close', iconPath: c('path', { d: 'M5 12h14' }) }),
		},
		noStyle: o,
		...n
	}) {
		let r = Ut(),
			s = o ? e.className : r.arrowOpen({ class: e.className }),
			i = o ? t.className : r.arrowClose({ class: t.className });
		return c(W, {
			children: [
				c(e.Element, { ...n, className: s }),
				c(t.Element, { ...n, className: i }),
			],
		});
	}
	(Ia.displayName = 'AccordionTrigger'),
		(jh.displayName = 'AccordionIcon'),
		(_a.displayName = 'AccordionArrow');
	var Ra = T(
		({ children: e, className: t, innerClassName: o, noStyle: n, ...r }, s) => {
			let { noStyle: i } = te(),
				a = Ut(),
				l = i || n,
				u = l ? t : a.content({ class: t }),
				m = l ? o : a.contentInner({ class: o });
			return c(Vp, {
				ref: s,
				className: u,
				...r,
				children: c('div', { className: m, children: e }),
			});
		}
	);
	Ra.displayName = 'AccordionContent';
	function Fp(e) {
		let t = z({ value: e, previous: e });
		return J(
			() => (
				t.current.value !== e &&
					((t.current.previous = t.current.value), (t.current.value = e)),
				t.current.previous
			),
			[e]
		);
	}
	function Up(e) {
		let [t, o] = P(void 0);
		return (
			pt(() => {
				if (e) {
					o({ width: e.offsetWidth, height: e.offsetHeight });
					let n = new ResizeObserver((r) => {
						if (!Array.isArray(r) || !r.length) return;
						let s = r[0],
							i,
							a;
						if ('borderBoxSize' in s) {
							let l = s.borderBoxSize,
								u = Array.isArray(l) ? l[0] : l;
							(i = u.inlineSize), (a = u.blockSize);
						} else (i = e.offsetWidth), (a = e.offsetHeight);
						o({ width: i, height: a });
					});
					return n.observe(e, { box: 'border-box' }), () => n.unobserve(e);
				} else o(void 0);
			}, [e]),
			t
		);
	}
	var us = 'Switch',
		[Mh, AR] = zt(us),
		[Vh, Fh] = Mh(us),
		Hp = T((e, t) => {
			let {
					__scopeSwitch: o,
					name: n,
					checked: r,
					defaultChecked: s,
					required: i,
					disabled: a,
					value: l = 'on',
					onCheckedChange: u,
					form: m,
					...p
				} = e,
				[d, f] = P(null),
				h = it(t, (g) => f(g)),
				x = z(!1),
				b = d ? m || !!d.closest('form') : !0,
				[y, C] = co({ prop: r, defaultProp: s ?? !1, onChange: u, caller: us });
			return c(Vh, {
				scope: o,
				checked: y,
				disabled: a,
				children: [
					c(wt.button, {
						type: 'button',
						role: 'switch',
						'aria-checked': y,
						'aria-required': i,
						'data-state': Wp(y),
						'data-disabled': a ? '' : void 0,
						disabled: a,
						value: l,
						...p,
						ref: h,
						onClick: Go(e.onClick, (g) => {
							C((S) => !S),
								b &&
									((x.current = g.isPropagationStopped()),
									x.current || g.stopPropagation());
						}),
					}),
					b &&
						c($p, {
							control: d,
							bubbles: !x.current,
							name: n,
							value: l,
							checked: y,
							required: i,
							disabled: a,
							form: m,
							style: { transform: 'translateX(-100%)' },
						}),
				],
			});
		});
	Hp.displayName = us;
	var zp = 'SwitchThumb',
		Gp = T((e, t) => {
			let { __scopeSwitch: o, ...n } = e,
				r = Fh(zp, o);
			return c(wt.span, {
				'data-state': Wp(r.checked),
				'data-disabled': r.disabled ? '' : void 0,
				...n,
				ref: t,
			});
		});
	Gp.displayName = zp;
	var Uh = 'SwitchBubbleInput',
		$p = T(
			(
				{ __scopeSwitch: e, control: t, checked: o, bubbles: n = !0, ...r },
				s
			) => {
				let i = z(null),
					a = it(i, s),
					l = Fp(o),
					u = Up(t);
				return (
					M(() => {
						let m = i.current;
						if (!m) return;
						let p = window.HTMLInputElement.prototype,
							f = Object.getOwnPropertyDescriptor(p, 'checked').set;
						if (l !== o && f) {
							let h = new Event('click', { bubbles: n });
							f.call(m, o), m.dispatchEvent(h);
						}
					}, [l, o, n]),
					c('input', {
						type: 'checkbox',
						'aria-hidden': !0,
						defaultChecked: o,
						...r,
						tabIndex: -1,
						ref: a,
						style: {
							...r.style,
							...u,
							position: 'absolute',
							pointerEvents: 'none',
							opacity: 0,
							margin: 0,
						},
					})
				);
			}
		);
	$p.displayName = Uh;
	function Wp(e) {
		return e ? 'checked' : 'unchecked';
	}
	var Ta = Hp,
		qp = Gp;
	var It = T(
		(
			{ className: e, disabled: t, size: o = 'medium', noStyle: n, ...r },
			s
		) => {
			let i = la({ size: o }),
				a = n ? e : i.root({ class: e }),
				l = n ? void 0 : i.thumb({ disabled: t }),
				u = n ? void 0 : i.track({ disabled: t });
			return c(Ta, {
				ref: s,
				disabled: t,
				className: a,
				...r,
				children: c('span', {
					className: u,
					children: c(qp, {
						className: l,
						style: {
							'--mask':
								'radial-gradient(circle farthest-side at 50% 50%, #0000 1.95px, #000 2.05px 100%) 50% 50%/100% 100% no-repeat',
						},
					}),
				}),
			});
		}
	);
	It.displayName = Ta.displayName;
	var Hh = T(({ children: e, ...t }, o) =>
			c(oe, { ref: o, baseClassName: Xe.accordionTrigger, ...t, children: e })
		),
		zh = Ia,
		Gh = Ra,
		$h = _a,
		Kp = ka,
		Wh = It,
		Yp = () => {
			let {
					selectedConsents: e,
					setSelectedConsent: t,
					getDisplayedConsents: o,
				} = q(),
				n = Z(
					(s, i) => {
						t(s, i);
					},
					[t]
				),
				{ consentTypes: r } = pe();
			return o().map((s) =>
				c(
					qh,
					{
						value: s.name,
						className: Xe.accordionItem,
						children: [
							c(Hh, {
								'data-testid': `consent-widget-accordion-trigger-${s.name}`,
								children: [
									c(zh, {
										className: Xe.accordionTriggerInner,
										'data-testid': `consent-widget-accordion-trigger-inner-${s.name}`,
										children: [
											c($h, {
												'data-testid': `consent-widget-accordion-arrow-${s.name}`,
												className: Xe.accordionArrow,
												openIcon: {
													Element: $o({
														title: 'Open',
														iconPath: c('path', { d: 'M5 12h14M12 5v14' }),
													}),
													className: Xe.accordionArrowIcon,
												},
												closeIcon: {
													Element: $o({
														title: 'Close',
														iconPath: c('path', { d: 'M5 12h14' }),
													}),
													className: Xe.accordionArrowIcon,
												},
											}),
											r[s.name]?.title ??
												s.name
													.replace(/_/g, ' ')
													.replace(/\b\w/g, (i) => i.toUpperCase()),
										],
									}),
									c(Wh, {
										checked: e[s.name],
										onClick: (i) => i.stopPropagation(),
										onKeyUp: (i) => i.stopPropagation(),
										onKeyDown: (i) => i.stopPropagation(),
										onCheckedChange: (i) => n(s.name, i),
										disabled: s.disabled,
										className: Xe.switch,
										size: 'small',
										'data-testid': `consent-widget-switch-${s.name}`,
									}),
								],
							}),
							c(Gh, {
								className: Xe.accordionContent,
								'data-testid': `consent-widget-accordion-content-${s.name}`,
								children: r[s.name]?.description ?? s.description,
							}),
						],
					},
					s.name
				)
			);
		},
		qh = T(({ className: e, ...t }, o) =>
			c(wa, { ref: o, className: Xe.accordionItem, ...t })
		);
	var Zp = T(({ children: e, ...t }, o) => {
			let { common: n } = pe();
			return c(kt, {
				ref: o,
				mode: 'stroke',
				size: 'small',
				action: 'accept-consent',
				...t,
				themeKey: 'buttonSecondary',
				'data-testid': 'consent-widget-footer-accept-button',
				closeConsentBanner: !0,
				closeConsentDialog: !0,
				children: e ?? n.acceptAll,
			});
		}),
		ZR = T(({ children: e, ...t }, o) => {
			let { common: n } = pe();
			return c(kt, {
				ref: o,
				action: 'open-consent-dialog',
				...t,
				themeKey: 'buttonSecondary',
				'data-testid': 'consent-widget-footer-customize-button',
				children: e ?? n.customize,
			});
		}),
		Xp = T(({ children: e, ...t }, o) => {
			let { common: n } = pe();
			return c(kt, {
				ref: o,
				action: 'custom-consent',
				variant: 'primary',
				closeConsentDialog: !0,
				...t,
				themeKey: 'buttonPrimary',
				'data-testid': 'consent-widget-footer-save-button',
				children: e ?? n.save,
			});
		}),
		Jp = T(({ children: e, ...t }, o) => {
			let { common: n } = pe();
			return c(kt, {
				ref: o,
				mode: 'stroke',
				size: 'small',
				action: 'reject-consent',
				...t,
				themeKey: 'buttonSecondary',
				'data-testid': 'consent-widget-reject-button',
				closeConsentBanner: !0,
				closeConsentDialog: !0,
				children: e ?? n.rejectAll,
			});
		});
	var Qp = T(({ children: e, ...t }, o) =>
			c(oe, {
				ref: o,
				baseClassName: Xe.footer,
				'data-testid': 'consent-widget-footer',
				...t,
				themeKey: 'consentWidgetFooter',
				children: e,
			})
		),
		em = T(({ children: e, ...t }, o) =>
			c(oe, {
				ref: o,
				baseClassName: Xe.footerGroup,
				'data-testid': 'consent-widget-footer-sub-group',
				...t,
				themeKey: 'consentWidgetFooter',
				children: e,
			})
		);
	var tm = ({
		children: e,
		noStyle: t = !1,
		disableAnimation: o = !1,
		useProvider: n = !0,
		uiSource: r,
	}) => {
		let { translationConfig: s } = q(),
			i = rt(s.defaultLanguage),
			a = Kr(),
			l = r ?? a.uiSource ?? 'widget',
			u = c(oe, {
				'data-testid': 'consent-widget-root',
				themeKey: 'consentWidget',
				dir: i,
				children: e,
			});
		return n
			? c(We.Provider, {
					value: { uiSource: l },
					children: c(nt.Provider, {
						value: { disableAnimation: o, noStyle: t },
						children: u,
					}),
				})
			: c(We.Provider, { value: { uiSource: l }, children: u });
	};
	var om = ({
		hideBranding: e,
		noStyle: t,
		disableAnimation: o,
		scrollLock: n,
		trapFocus: r,
		...s
	}) => {
		let [i, a] = P([]),
			l = te();
		return c(tm, {
			noStyle: t ?? l.noStyle,
			disableAnimation: o ?? l.disableAnimation,
			scrollLock: n ?? l.scrollLock,
			trapFocus: r ?? l.trapFocus,
			...s,
			children: [
				c(Kp, {
					type: 'multiple',
					value: i,
					onValueChange: a,
					children: c(Yp, {}),
				}),
				c(Qp, {
					children: [
						c(em, {
							themeKey: 'consentWidgetFooter',
							children: [c(Jp, {}), c(Zp, {})],
						}),
						c(Xp, {}),
					],
				}),
				c(Wo, {
					themeKey: 'consentWidgetBranding',
					hideBranding: e ?? !0,
					'data-testid': 'consent-widget-branding',
				}),
			],
		});
	};
	var nm = ({ title: e = 'c15t', titleId: t = 'c15t-icon', ...o }) =>
			c('svg', {
				xmlns: 'http://www.w3.org/2000/svg',
				viewBox: '0 0 446 445',
				'aria-labelledby': t,
				...o,
				children: [
					c('title', { id: t, children: e }),
					c('path', {
						fill: 'currentColor',
						d: 'M223.178.313c39.064 0 70.732 31.668 70.732 70.732-.001 39.064-31.668 70.731-70.732 70.731-12.181 0-23.642-3.079-33.649-8.502l-55.689 55.689a70.267 70.267 0 0 1 5.574 13.441h167.531c8.695-29.217 35.762-50.523 67.804-50.523 39.064 0 70.731 31.668 70.731 70.732s-31.668 70.732-70.731 70.732c-32.042 0-59.108-21.306-67.803-50.523H139.413a70.417 70.417 0 0 1-7.888 17.396l54.046 54.046c10.893-6.851 23.786-10.815 37.605-10.815 39.064 0 70.732 31.669 70.732 70.733 0 39.064-31.668 70.731-70.732 70.731s-70.732-31.667-70.732-70.731c0-10.518 2.296-20.499 6.414-29.471l-57.78-57.78c-8.972 4.117-18.952 6.414-29.47 6.414-39.063 0-70.731-31.668-70.732-70.732 0-39.064 31.669-70.732 70.733-70.732 12.18 0 23.642 3.079 33.649 8.502l55.688-55.688c-5.423-10.007-8.502-21.469-8.502-33.65 0-39.064 31.668-70.733 70.732-70.733Zm0 343.555c-16.742 0-30.314 13.572-30.314 30.314 0 16.741 13.572 30.313 30.314 30.313s30.314-13.572 30.314-30.313c0-16.742-13.572-30.314-30.314-30.314ZM71.611 192.299c-16.742 0-30.315 13.572-30.315 30.314s13.573 30.314 30.315 30.314c16.741 0 30.313-13.572 30.313-30.314 0-16.741-13.572-30.314-30.313-30.314Zm303.138 0c-16.729 0-30.294 13.551-30.315 30.275l.001.039-.001.038c.021 16.725 13.586 30.276 30.315 30.276 16.741 0 30.313-13.572 30.313-30.314 0-16.741-13.572-30.314-30.313-30.314ZM223.178 40.73c-16.742 0-30.314 13.573-30.314 30.315s13.573 30.313 30.314 30.313c16.742 0 30.313-13.572 30.314-30.313 0-16.742-13.572-30.314-30.314-30.315Z',
					}),
				],
			}),
		rm = ({ title: e = 'c15t', titleId: t = 'c15t', ...o }) =>
			c('svg', {
				xmlns: 'http://www.w3.org/2000/svg',
				viewBox: '0 0 408 149',
				'aria-labelledby': t,
				...o,
				children: [
					c('title', { id: t, children: e }),
					c('path', {
						fill: 'currentColor',
						fillRule: 'evenodd',
						d: 'M74.133 14.042c-5.58 0-10.105 4.524-10.105 10.104 0 5.581 4.524 10.105 10.105 10.105 5.58 0 10.105-4.524 10.105-10.105 0-5.58-4.524-10.104-10.105-10.104ZM50.556 24.146C50.556 11.125 61.112.57 74.133.57 87.154.57 97.71 11.125 97.71 24.146c0 13.022-10.556 23.578-23.577 23.578-4.06 0-7.88-1.027-11.216-2.834L44.354 63.453a23.424 23.424 0 0 1 1.858 4.48h55.843c2.899-9.74 11.921-16.841 22.601-16.841 13.022 0 23.578 10.556 23.578 23.577 0 13.022-10.556 23.578-23.578 23.578-10.68 0-19.702-7.102-22.601-16.841H46.211a23.455 23.455 0 0 1-2.628 5.798l18.015 18.015a23.473 23.473 0 0 1 12.535-3.604c13.021 0 23.577 10.556 23.577 23.577 0 13.022-10.556 23.577-23.577 23.577-13.021 0-23.577-10.555-23.577-23.577 0-3.506.765-6.833 2.138-9.824l-19.26-19.26a23.49 23.49 0 0 1-9.823 2.139C10.588 98.247.032 87.69.032 74.669c0-13.021 10.556-23.577 23.577-23.577 4.061 0 7.882 1.026 11.217 2.834L53.39 35.364a23.473 23.473 0 0 1-2.834-11.218Zm63.996 50.523v.023c.012 5.57 4.531 10.082 10.104 10.082 5.581 0 10.105-4.524 10.105-10.105 0-5.58-4.524-10.104-10.105-10.104-5.573 0-10.092 4.511-10.104 10.082v.022ZM23.61 64.565c-5.58 0-10.104 4.524-10.104 10.104 0 5.58 4.524 10.105 10.104 10.105 5.581 0 10.105-4.524 10.105-10.105 0-5.58-4.524-10.104-10.105-10.104Zm40.418 60.627c0-5.581 4.524-10.104 10.105-10.104 5.58 0 10.105 4.523 10.105 10.104 0 5.581-4.524 10.105-10.105 10.105-5.58 0-10.105-4.524-10.105-10.105Z',
						clipRule: 'evenodd',
					}),
					c('path', {
						fill: 'currentColor',
						d: 'M213.869 86.31c0-18.48 14.64-32.04 32.88-32.04 9 0 17.28 3 24.24 10.44l-8.88 9.24c-4.08-4.2-8.88-6.6-15.36-6.6-10.56 0-18.6 8.04-18.6 18.96 0 10.92 8.04 18.959 18.6 18.959 6.48 0 11.28-2.4 15.36-6.6l8.88 9.24c-6.96 7.44-15.24 10.44-24.24 10.44-18.24 0-32.88-13.56-32.88-32.04Zm70.372-39.72h-11.88V33.03h26.88v83.639h-15v-70.08Zm23.468 54.599 12.24-6.96c2.88 6.12 9.24 10.2 16.44 10.2 10.2 0 17.04-6.36 17.04-15.84s-6.48-15.84-16.2-15.84c-4.68 0-9.48 1.44-12.48 4.32l-10.8-2.88 7.8-41.16h40.56v13.56h-29.28l-3 15.12c2.52-1.08 5.52-1.56 8.76-1.56 17.76 0 29.52 11.28 29.52 28.32 0 17.76-12.72 29.64-31.92 29.64-12.6 0-23.52-6.84-28.68-16.92Zm72.386-31.92h-7.8V56.19h7.8V33.03h14.4v23.16h13.08v13.08h-13.08v47.4h-14.4v-47.4Z',
					}),
				],
			});
	var ps = ({ title: e = 'Consent', titleId: t = 'consent-icon', ...o }) =>
			c('svg', {
				xmlns: 'http://www.w3.org/2000/svg',
				viewBox: '0 0 140 97',
				fill: 'none',
				'aria-labelledby': t,
				...o,
				children: [
					c('title', { id: t, children: e }),
					c('path', {
						fill: 'currentColor',
						fillRule: 'evenodd',
						d: 'M53.179 70.787c6.17 0 11.172-5.002 11.172-11.172 0-4.009-2.111-7.524-5.283-9.495a23.87 23.87 0 0 1 8.817-1.677c13.217 0 23.93 10.714 23.93 23.93s-10.713 23.93-23.93 23.93c-13.216 0-23.93-10.714-23.93-23.93 0-1.924.227-3.795.656-5.588a11.148 11.148 0 0 0 8.568 4.002Z',
						clipRule: 'evenodd',
					}),
					c('path', {
						fill: 'currentColor',
						fillRule: 'evenodd',
						d: 'M.618 74.716a68.453 68.453 0 0 1-.098-3.654c0-37.205 30.16-67.365 67.365-67.365s67.365 30.16 67.365 67.365c0 1.226-.032 2.444-.097 3.654h-21.927c.041-.776.061-1.557.061-2.343 0-24.531-19.887-44.418-44.418-44.418-24.532 0-44.418 19.887-44.418 44.418 0 .786.02 1.567.06 2.343H.618Z',
						clipRule: 'evenodd',
					}),
				],
			}),
		sm = ({ title: e = 'Privacy', titleId: t = 'fingerprint-icon', ...o }) =>
			c('svg', {
				xmlns: 'http://www.w3.org/2000/svg',
				viewBox: '0 0 24 24',
				fill: 'none',
				stroke: 'currentColor',
				strokeWidth: '2',
				strokeLinecap: 'round',
				strokeLinejoin: 'round',
				'aria-labelledby': t,
				...o,
				children: [
					c('title', { id: t, children: e }),
					c('path', { d: 'M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4' }),
					c('path', { d: 'M14 13.12c0 2.38 0 6.38-1 8.88' }),
					c('path', { d: 'M17.29 21.02c.12-.6.43-2.3.5-3.02' }),
					c('path', { d: 'M2 12a10 10 0 0 1 18-6' }),
					c('path', { d: 'M2 16h.01' }),
					c('path', { d: 'M21.8 16c.2-2 .131-5.354 0-6' }),
					c('path', { d: 'M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2' }),
					c('path', { d: 'M8.65 22c.21-.66.45-1.32.57-2' }),
					c('path', { d: 'M9 6.8a6 6 0 0 1 9 5.2v2' }),
				],
			}),
		im = ({ title: e = 'Settings', titleId: t = 'settings-icon', ...o }) =>
			c('svg', {
				xmlns: 'http://www.w3.org/2000/svg',
				viewBox: '0 0 24 24',
				fill: 'none',
				stroke: 'currentColor',
				strokeWidth: '2',
				strokeLinecap: 'round',
				strokeLinejoin: 'round',
				'aria-labelledby': t,
				...o,
				children: [
					c('title', { id: t, children: e }),
					c('path', {
						d: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z',
					}),
					c('circle', { cx: '12', cy: '12', r: '3' }),
				],
			});
	var am = T(({ children: e, ...t }, o) =>
			c(oe, {
				ref: o,
				baseClassName: me.card,
				...t,
				themeKey: 'consentDialogCard',
				'data-testid': 'consent-dialog-card',
				children: e,
			})
		),
		ms = T(({ children: e, ...t }, o) =>
			c(oe, {
				ref: o,
				baseClassName: me.header,
				...t,
				themeKey: 'consentDialogHeader',
				'data-testid': 'consent-dialog-header',
				children: e,
			})
		),
		fs = T(({ children: e, ...t }, o) => {
			let { consentManagerDialog: n } = pe();
			return c(oe, {
				ref: o,
				baseClassName: me.title,
				themeKey: 'consentDialogTitle',
				...t,
				'data-testid': 'consent-dialog-title',
				children: e ?? n.title,
			});
		}),
		gs = T(({ children: e, legalLinks: t, asChild: o, ...n }, r) => {
			let { consentManagerDialog: s } = pe();
			return o
				? c(oe, {
						ref: r,
						baseClassName: me.description,
						themeKey: 'consentDialogDescription',
						asChild: o,
						...n,
						children: e ?? s.description,
					})
				: c(oe, {
						ref: r,
						baseClassName: me.description,
						themeKey: 'consentDialogDescription',
						asChild: o,
						...n,
						'data-testid': 'consent-dialog-description',
						children: [
							e ?? s.description,
							c(ts, {
								links: t,
								themeKey: 'consentDialogContent',
								testIdPrefix: 'consent-dialog-legal-link',
							}),
						],
					});
		}),
		bs = T(({ children: e, ...t }, o) =>
			c(oe, {
				ref: o,
				baseClassName: me.content,
				themeKey: 'consentDialogContent',
				'data-testid': 'consent-dialog-content',
				...t,
				children: e,
			})
		),
		Wo = T(
			(
				{ children: e, themeKey: t, hideBranding: o, 'data-testid': n, ...r },
				s
			) =>
				c(oe, {
					ref: s,
					baseClassName: me.footer,
					'data-testid': n ?? 'consent-dialog-footer',
					...r,
					themeKey: t ?? 'consentDialogFooter',
					children: e ?? c(Aa, { hideBranding: o ?? !1 }),
				})
		);
	function Aa({ hideBranding: e }) {
		let { branding: t } = q();
		if (t === 'none' || e) return null;
		let o = typeof window < 'u' ? `?ref=${window.location.hostname}` : '';
		return c('a', {
			dir: 'ltr',
			className: me.branding,
			href: t === 'consent' ? `https://consent.io${o}` : `https://c15t.com${o}`,
			children: [
				'Secured by',
				' ',
				t === 'consent'
					? c(ps, { className: me.brandingConsent })
					: c(rm, { className: me.brandingC15T }),
			],
		});
	}
	var hs = ({ noStyle: e, legalLinks: t, hideBranding: o }) =>
			c(am, {
				children: [
					c(ms, { children: [c(fs, {}), c(gs, { legalLinks: t })] }),
					c(bs, {
						children: c(om, { hideBranding: !0, noStyle: e, useProvider: !0 }),
					}),
					c(Wo, { hideBranding: o }),
				],
			}),
		cm = am,
		lm = ms,
		dm = fs,
		um = gs,
		pm = bs,
		mm = Wo;
	var fm = ({ noStyle: e, style: t }) => {
			let o,
				{ activeUI: n } = q(),
				{ disableAnimation: r, noStyle: s, scrollLock: i = !0 } = te(),
				a = n === 'dialog',
				[l, u] = P(!1);
			M(() => {
				if (a) u(!0);
				else if (r) u(!1);
				else {
					let f = setTimeout(
						() => {
							u(!1);
						},
						Number.parseInt(
							getComputedStyle(document.documentElement).getPropertyValue(
								'--consent-dialog-animation-duration'
							) || '200',
							10
						)
					);
					return () => clearTimeout(f);
				}
			}, [a, r]);
			let m = typeof t == 'string' ? t : t?.className,
				p = X('consentDialogOverlay', {
					baseClassName: !(s || e) && me.overlay,
					className: m,
					noStyle: s || e,
				});
			o = s || e || r ? void 0 : l ? me.overlayVisible : me.overlayHidden;
			let d = Fe(p.className, o);
			return c('div', {
				style:
					typeof t == 'object' && 'style' in t
						? { ...p.style, ...t.style }
						: p.style,
				className: d,
				'data-testid': 'consent-dialog-overlay',
			});
		},
		vs = fm;
	var gm = ({
			children: e,
			open: t,
			models: o = ['opt-in', 'opt-out'],
			noStyle: n,
			disableAnimation: r,
			scrollLock: s = !0,
			trapFocus: i = !0,
			overlay: a,
			uiSource: l,
			className: u,
			style: m,
			...p
		}) => {
			let d = te(),
				f = r ?? d.disableAnimation ?? !1,
				h = n ?? d.noStyle ?? !1,
				x = s ?? d.scrollLock ?? !0,
				b = i ?? d.trapFocus ?? !0,
				{ activeUI: y, translationConfig: C, model: g } = q(),
				S = rt(C.defaultLanguage),
				A = o.includes(g) && (t ?? y === 'dialog'),
				[I, _] = P(!1),
				O = z(null),
				B = z(null),
				[E, L] = P(!1);
			M(() => {
				L(!0);
			}, []);
			let H = d.theme?.motion?.duration?.normal;
			M(() => {
				if (A) _(!0);
				else if (f) _(!1);
				else {
					let De = setTimeout(
						() => _(!1),
						Number.parseInt((H || '200ms').replace('ms', ''), 10)
					);
					return () => clearTimeout(De);
				}
			}, [A, f, H]),
				st(A && b, O),
				ot(A && x);
			let V = X('consentDialog', {
					baseClassName: void 0,
					className: Fe(
						me.root,
						!f && (I ? me.dialogVisible : me.dialogHidden),
						u
					),
					style: m,
					noStyle: h,
				}),
				ne = {
					disableAnimation: f,
					noStyle: h,
					scrollLock: x,
					trapFocus: b,
					theme: d.theme,
				},
				Le = c(We.Provider, {
					value: { uiSource: l ?? 'dialog' },
					children: c(nt.Provider, {
						value: ne,
						children:
							A &&
							c(W, {
								children: [
									a === !1 ? null : (a ?? c(vs, {})),
									c('dialog', {
										ref: O,
										...p,
										...V,
										className: V.className,
										'aria-labelledby': 'privacy-settings-title',
										tabIndex: -1,
										dir: S,
										'data-testid': 'consent-dialog-root',
										open: !0,
										children: c('div', {
											ref: B,
											className: h
												? void 0
												: Fe(
														me.container,
														f
															? void 0
															: I
																? me.contentVisible
																: me.contentHidden
													),
											children: e,
										}),
									}),
								],
							}),
					}),
				});
			return E ? $e(Le, document.body) : null;
		},
		ys = gm;
	var Kh = {
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/components/consent-dialog-trigger.module.css'(
				e,
				t,
				o
			) {
				o.d(t, { A: () => a });
				var n = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'
					),
					r = o.n(n),
					s = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'
					),
					i = o.n(s)()(r());
				i.push([
					e.id,
					'.c15t-ui-trigger-BryZ5{--cdt-size-sm:32px;--cdt-size-md:40px;--cdt-size-lg:48px;--cdt-bg:var(--c15t-surface,#fff);--cdt-bg-hover:var(--c15t-surface-hover,var(--cdt-bg));--cdt-border:var(--c15t-border,#e5e5e5);--cdt-shadow:var(--c15t-shadow-lg,0 10px 15px -3px #0000001a,0 4px 6px -4px #0000001a);--cdt-shadow-hover:var(--c15t-shadow-xl,0 20px 25px -5px #0000001a,0 8px 10px -6px #0000001a);--cdt-radius:var(--c15t-radius-full,9999px);--cdt-offset:var(--c15t-space-md,20px);--cdt-transition-duration:var(--c15t-motion-duration,.2s);--cdt-transition-easing:var(--c15t-motion-easing,ease-out);--cdt-snap-duration:var(--c15t-motion-duration-slow,.3s);--cdt-snap-easing:var(--c15t-motion-easing-smooth,cubic-bezier(.77,0,.175,1));--cdt-icon-color:var(--c15t-text,#171717);--cdt-focus-ring:var(--c15t-primary,#3b82f6);z-index:9999;width:var(--cdt-size-md);height:var(--cdt-size-md);border:1px solid var(--cdt-border);border-radius:var(--cdt-radius);background:var(--cdt-bg);box-shadow:var(--cdt-shadow);cursor:grab;transition:transform var(--cdt-transition-duration)var(--cdt-transition-easing),box-shadow var(--cdt-transition-duration)var(--cdt-transition-easing),background var(--cdt-transition-duration)var(--cdt-transition-easing);touch-action:none;user-select:none;-webkit-tap-highlight-color:transparent;will-change:transform;justify-content:center;align-items:center;margin:0;padding:0;display:flex;position:fixed}@media (hover:hover) and (pointer:fine){.c15t-ui-trigger-BryZ5:hover{background:var(--cdt-bg-hover);box-shadow:var(--cdt-shadow-hover)}}.c15t-ui-trigger-BryZ5:active,.c15t-ui-trigger-BryZ5.c15t-ui-dragging-HLEr2{cursor:grabbing;transform:scale(1.02)}.c15t-ui-trigger-BryZ5:focus{outline:none}.c15t-ui-trigger-BryZ5:focus-visible{outline:2px solid var(--cdt-focus-ring);outline-offset:2px}.c15t-ui-sm-meEur{width:var(--cdt-size-sm);height:var(--cdt-size-sm)}.c15t-ui-md-lnKl5{width:var(--cdt-size-md);height:var(--cdt-size-md)}.c15t-ui-lg-vVljq{width:var(--cdt-size-lg);height:var(--cdt-size-lg)}.c15t-ui-icon-QeBf0{width:50%;height:50%;color:var(--cdt-icon-color);pointer-events:none;flex-shrink:0;justify-content:center;align-items:center;display:flex}.c15t-ui-icon-QeBf0 svg{width:100%;height:100%}.c15t-ui-text-Q2Rdp{margin-left:var(--c15t-space-xs,6px);font-family:var(--c15t-font-family,system-ui,sans-serif);font-size:var(--c15t-font-size-sm,14px);font-weight:var(--c15t-font-weight-medium,500);color:var(--cdt-icon-color);white-space:nowrap;pointer-events:none;line-height:1}.c15t-ui-trigger-BryZ5:has(.c15t-ui-text-Q2Rdp){width:auto;height:auto;padding:var(--c15t-space-sm,8px)var(--c15t-space-md,16px);border-radius:var(--c15t-radius-lg,12px);gap:var(--c15t-space-xs,6px)}.c15t-ui-trigger-BryZ5:has(.c15t-ui-text-Q2Rdp) .c15t-ui-icon-QeBf0{width:16px;height:16px}.c15t-ui-trigger-BryZ5:has(.c15t-ui-text-Q2Rdp).c15t-ui-sm-meEur{padding:var(--c15t-space-xs,6px)var(--c15t-space-sm,10px)}.c15t-ui-trigger-BryZ5:has(.c15t-ui-text-Q2Rdp).c15t-ui-sm-meEur .c15t-ui-icon-QeBf0{width:14px;height:14px}.c15t-ui-trigger-BryZ5:has(.c15t-ui-text-Q2Rdp).c15t-ui-sm-meEur .c15t-ui-text-Q2Rdp{font-size:var(--c15t-font-size-xs,12px)}.c15t-ui-trigger-BryZ5:has(.c15t-ui-text-Q2Rdp).c15t-ui-lg-vVljq{padding:var(--c15t-space-md,12px)var(--c15t-space-lg,20px)}.c15t-ui-trigger-BryZ5:has(.c15t-ui-text-Q2Rdp).c15t-ui-lg-vVljq .c15t-ui-icon-QeBf0{width:20px;height:20px}.c15t-ui-trigger-BryZ5:has(.c15t-ui-text-Q2Rdp).c15t-ui-lg-vVljq .c15t-ui-text-Q2Rdp{font-size:var(--c15t-font-size-md,16px)}.c15t-ui-bottomRight-uY0Me{right:var(--cdt-offset);bottom:var(--cdt-offset)}.c15t-ui-bottomLeft-w0x9m{bottom:var(--cdt-offset);left:var(--cdt-offset)}.c15t-ui-topRight-yHVfA{top:var(--cdt-offset);right:var(--cdt-offset)}.c15t-ui-topLeft-wGrIZ{top:var(--cdt-offset);left:var(--cdt-offset)}.c15t-ui-snapping-dPWx_{transition:top var(--cdt-snap-duration)var(--cdt-snap-easing),right var(--cdt-snap-duration)var(--cdt-snap-easing),bottom var(--cdt-snap-duration)var(--cdt-snap-easing),left var(--cdt-snap-duration)var(--cdt-snap-easing),transform var(--cdt-snap-duration)var(--cdt-snap-easing)}.c15t-ui-hidden-QnkHi{display:none}.c15t-dark .c15t-ui-trigger-BryZ5{--cdt-bg:var(--c15t-surface,#262626);--cdt-bg-hover:var(--c15t-surface-hover,#404040);--cdt-border:var(--c15t-border,#404040);--cdt-icon-color:var(--c15t-text,#fafafa);--cdt-shadow:0 10px 15px -3px #0000004d,0 4px 6px -4px #0000004d;--cdt-shadow-hover:0 20px 25px -5px #0006,0 8px 10px -6px #0006}@media (prefers-reduced-motion:reduce){.c15t-ui-trigger-BryZ5,.c15t-ui-snapping-dPWx_{transition:none}}',
					'',
				]),
					(i.locals = {
						trigger: 'c15t-ui-trigger-BryZ5',
						dragging: 'c15t-ui-dragging-HLEr2',
						sm: 'c15t-ui-sm-meEur',
						md: 'c15t-ui-md-lnKl5',
						lg: 'c15t-ui-lg-vVljq',
						icon: 'c15t-ui-icon-QeBf0',
						text: 'c15t-ui-text-Q2Rdp',
						bottomRight: 'c15t-ui-bottomRight-uY0Me',
						bottomLeft: 'c15t-ui-bottomLeft-w0x9m',
						topRight: 'c15t-ui-topRight-yHVfA',
						topLeft: 'c15t-ui-topLeft-wGrIZ',
						snapping: 'c15t-ui-snapping-dPWx_',
						hidden: 'c15t-ui-hidden-QnkHi',
					});
				let a = i;
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'(
				e
			) {
				e.exports = function (t) {
					var o = [];
					return (
						(o.toString = function () {
							return this.map(function (n) {
								var r = '',
									s = n[5] !== void 0;
								return (
									n[4] && (r += '@supports ('.concat(n[4], ') {')),
									n[2] && (r += '@media '.concat(n[2], ' {')),
									s &&
										(r += '@layer'.concat(
											n[5].length > 0 ? ' '.concat(n[5]) : '',
											' {'
										)),
									(r += t(n)),
									s && (r += '}'),
									n[2] && (r += '}'),
									n[4] && (r += '}'),
									r
								);
							}).join('');
						}),
						(o.i = function (n, r, s, i, a) {
							typeof n == 'string' && (n = [[null, n, void 0]]);
							var l = {};
							if (s)
								for (var u = 0; u < this.length; u++) {
									var m = this[u][0];
									m != null && (l[m] = !0);
								}
							for (var p = 0; p < n.length; p++) {
								var d = [].concat(n[p]);
								(s && l[d[0]]) ||
									(a !== void 0 &&
										(d[5] === void 0 ||
											(d[1] = '@layer'
												.concat(d[5].length > 0 ? ' '.concat(d[5]) : '', ' {')
												.concat(d[1], '}')),
										(d[5] = a)),
									r &&
										(d[2] &&
											(d[1] = '@media '.concat(d[2], ' {').concat(d[1], '}')),
										(d[2] = r)),
									i &&
										(d[4]
											? ((d[1] = '@supports ('
													.concat(d[4], ') {')
													.concat(d[1], '}')),
												(d[4] = i))
											: (d[4] = ''.concat(i))),
									o.push(d));
							}
						}),
						o
					);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'(
				e
			) {
				e.exports = function (t) {
					return t[1];
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'(
				e
			) {
				var t = [];
				function o(r) {
					for (var s = -1, i = 0; i < t.length; i++)
						if (t[i].identifier === r) {
							s = i;
							break;
						}
					return s;
				}
				function n(r, s) {
					for (var i = {}, a = [], l = 0; l < r.length; l++) {
						var u = r[l],
							m = s.base ? u[0] + s.base : u[0],
							p = i[m] || 0,
							d = ''.concat(m, ' ').concat(p);
						i[m] = p + 1;
						var f = o(d),
							h = {
								css: u[1],
								media: u[2],
								sourceMap: u[3],
								supports: u[4],
								layer: u[5],
							};
						if (f !== -1) t[f].references++, t[f].updater(h);
						else {
							var x = (function (b, y) {
								var C = y.domAPI(y);
								return (
									C.update(b),
									function (g) {
										g
											? (g.css !== b.css ||
													g.media !== b.media ||
													g.sourceMap !== b.sourceMap ||
													g.supports !== b.supports ||
													g.layer !== b.layer) &&
												C.update((b = g))
											: C.remove();
									}
								);
							})(h, s);
							(s.byIndex = l),
								t.splice(l, 0, { identifier: d, updater: x, references: 1 });
						}
						a.push(d);
					}
					return a;
				}
				e.exports = function (r, s) {
					var i = n((r = r || []), (s = s || {}));
					return function (a) {
						a = a || [];
						for (var l = 0; l < i.length; l++) {
							var u = o(i[l]);
							t[u].references--;
						}
						for (var m = n(a, s), p = 0; p < i.length; p++) {
							var d = o(i[p]);
							t[d].references === 0 && (t[d].updater(), t.splice(d, 1));
						}
						i = m;
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'(
				e
			) {
				var t = {};
				e.exports = function (o, n) {
					var r = (function (s) {
						if (t[s] === void 0) {
							var i = document.querySelector(s);
							if (
								window.HTMLIFrameElement &&
								i instanceof window.HTMLIFrameElement
							)
								try {
									i = i.contentDocument.head;
								} catch {
									i = null;
								}
							t[s] = i;
						}
						return t[s];
					})(o);
					if (!r)
						throw Error(
							"Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid."
						);
					r.appendChild(n);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'(
				e
			) {
				e.exports = function (t) {
					var o = document.createElement('style');
					return t.setAttributes(o, t.attributes), t.insert(o, t.options), o;
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'(
				e,
				t,
				o
			) {
				e.exports = function (n) {
					var r = o.nc;
					r && n.setAttribute('nonce', r);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'(
				e
			) {
				e.exports = function (t) {
					if (typeof document > 'u')
						return { update: function () {}, remove: function () {} };
					var o = t.insertStyleElement(t);
					return {
						update: function (n) {
							var r, s, i;
							(r = ''),
								n.supports && (r += '@supports ('.concat(n.supports, ') {')),
								n.media && (r += '@media '.concat(n.media, ' {')),
								(s = n.layer !== void 0) &&
									(r += '@layer'.concat(
										n.layer.length > 0 ? ' '.concat(n.layer) : '',
										' {'
									)),
								(r += n.css),
								s && (r += '}'),
								n.media && (r += '}'),
								n.supports && (r += '}'),
								(i = n.sourceMap) &&
									typeof btoa < 'u' &&
									(r += `
/*# sourceMappingURL=data:application/json;base64,`.concat(
										btoa(unescape(encodeURIComponent(JSON.stringify(i)))),
										' */'
									)),
								t.styleTagTransform(r, o, t.options);
						},
						remove: function () {
							var n;
							(n = o).parentNode === null || n.parentNode.removeChild(n);
						},
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'(
				e
			) {
				e.exports = function (t, o) {
					if (o.styleSheet) o.styleSheet.cssText = t;
					else {
						for (; o.firstChild; ) o.removeChild(o.firstChild);
						o.appendChild(document.createTextNode(t));
					}
				};
			},
		},
		bm = {};
	function Se(e) {
		var t = bm[e];
		if (t !== void 0) return t.exports;
		var o = (bm[e] = { id: e, exports: {} });
		return Kh[e](o, o.exports, Se), o.exports;
	}
	(Se.n = (e) => {
		var t = e && e.__esModule ? () => e.default : () => e;
		return Se.d(t, { a: t }), t;
	}),
		(Se.d = (e, t) => {
			for (var o in t)
				Se.o(t, o) &&
					!Se.o(e, o) &&
					Object.defineProperty(e, o, { enumerable: !0, get: t[o] });
		}),
		(Se.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t)),
		(Se.nc = void 0);
	var Yh = Se(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'
		),
		Zh = Se.n(Yh),
		Xh = Se(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'
		),
		Jh = Se.n(Xh),
		Qh = Se(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'
		),
		ev = Se.n(Qh),
		tv = Se(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'
		),
		ov = Se.n(tv),
		nv = Se(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'
		),
		rv = Se.n(nv),
		sv = Se(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'
		),
		iv = Se.n(sv),
		Cs = Se(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/components/consent-dialog-trigger.module.css'
		),
		qo = {};
	(qo.styleTagTransform = iv()),
		(qo.setAttributes = ov()),
		(qo.insert = ev().bind(null, 'head')),
		(qo.domAPI = Jh()),
		(qo.insertStyleElement = rv()),
		Zh()(Cs.A, qo);
	var Ue = Cs.A && Cs.A.locals ? Cs.A.locals : void 0;
	function La(e = {}) {
		let {
				defaultPosition: t = 'bottom-right',
				persistPosition: o = !0,
				onPositionChange: n,
			} = e,
			[r, s] = P(() => {
				if (o && typeof window < 'u') {
					let S = Ku();
					if (S) return S;
				}
				return t;
			}),
			[i, a] = P($r),
			[l, u] = P(!1),
			m = z(!1),
			p = z(null),
			d = z(0),
			f = Z(
				(S) => {
					s(S), o && qu(S), n?.(S);
				},
				[o, n]
			),
			h = Z((S) => {
				S.button === 0 &&
					(S.target.setPointerCapture(S.pointerId),
					(p.current = S.target),
					(m.current = !1),
					(d.current = Date.now()),
					a({
						isDragging: !0,
						startX: S.clientX,
						startY: S.clientY,
						currentX: S.clientX,
						currentY: S.clientY,
					}),
					u(!1));
			}, []),
			x = Z((S) => {
				a((A) => {
					if (!A.isDragging) return A;
					let I = Math.abs(S.clientX - A.startX),
						_ = Math.abs(S.clientY - A.startY);
					return (
						(I > 5 || _ > 5) && (m.current = !0),
						{ ...A, currentX: S.clientX, currentY: S.clientY }
					);
				});
			}, []),
			b = Z(
				(S) => {
					p.current && p.current.releasePointerCapture(S.pointerId),
						a((A) => {
							if (!A.isDragging) return A;
							if (m.current) {
								let I = S.clientX - A.startX,
									_ = S.clientY - A.startY,
									O = Date.now() - d.current,
									B = Wu(r, I, _, {
										velocityX: O > 0 ? I / O : 0,
										velocityY: O > 0 ? _ / O : 0,
									});
								B !== r && (u(!0), setTimeout(() => u(!1), 300), f(B));
							}
							return $r();
						});
				},
				[r, f]
			),
			y = Z((S) => {
				p.current && p.current.releasePointerCapture(S.pointerId), a($r());
			}, []),
			C = i.isDragging
				? {
						transform: `translate(${i.currentX - i.startX}px, ${i.currentY - i.startY}px)`,
						transition: 'none',
					}
				: {},
			g = Z(() => m.current, []);
		return {
			corner: r,
			isDragging: i.isDragging,
			isSnapping: l,
			wasDragged: g,
			handlers: {
				onPointerDown: h,
				onPointerMove: x,
				onPointerUp: b,
				onPointerCancel: y,
			},
			dragStyle: C,
		};
	}
	var hm = Ie(null);
	function lo() {
		let e = Te(hm);
		if (!e)
			throw Error(
				'ConsentDialogTrigger components must be used within a ConsentDialogTrigger.Root'
			);
		return e;
	}
	function Ko({
		children: e,
		defaultPosition: t = 'bottom-right',
		persistPosition: o = !0,
		showWhen: n = 'after-consent',
		onPositionChange: r,
		onClick: s,
	}) {
		let { branding: i, activeUI: a, setActiveUI: l, hasConsented: u } = q(),
			{
				corner: m,
				isDragging: p,
				isSnapping: d,
				wasDragged: f,
				handlers: h,
				dragStyle: x,
			} = La({ defaultPosition: t, persistPosition: o, onPositionChange: r }),
			[b, y] = P(!1);
		M(() => (y(!0), () => y(!1)), []);
		let C = n !== 'never' && (n !== 'after-consent' || u()) && a === 'none';
		return b && C
			? $e(
					c(hm.Provider, {
						value: {
							corner: m,
							isDragging: p,
							isSnapping: d,
							wasDragged: f,
							handlers: h,
							dragStyle: x,
							branding: i,
							openDialog: () => {
								s?.(), l('dialog');
							},
							isVisible: C,
						},
						children: e,
					}),
					document.body
				)
			: null;
	}
	Ko.displayName = 'ConsentDialogTrigger.Root';
	var av = {
			'bottom-right': Ue.bottomRight,
			'bottom-left': Ue.bottomLeft,
			'top-right': Ue.topRight,
			'top-left': Ue.topLeft,
		},
		cv = { sm: Ue.sm, md: Ue.md, lg: Ue.lg },
		Yo = T(
			(
				{
					children: e,
					size: t = 'md',
					ariaLabel: o = 'Open privacy settings',
					className: n,
					noStyle: r = !1,
				},
				s
			) => {
				let {
						corner: i,
						isDragging: a,
						isSnapping: l,
						wasDragged: u,
						handlers: m,
						dragStyle: p,
						openDialog: d,
					} = lo(),
					f = () => {
						u() || d();
					};
				return c('button', {
					ref: s,
					type: 'button',
					className: r
						? n
						: [Ue.trigger, av[i], cv[t], a && Ue.dragging, l && Ue.snapping, n]
								.filter(Boolean)
								.join(' '),
					'aria-label': o,
					onClick: f,
					onKeyDown: (h) => {
						(h.key === 'Enter' || h.key === ' ') && (h.preventDefault(), f());
					},
					style: p,
					...m,
					children: e,
				});
			}
		);
	Yo.displayName = 'ConsentDialogTrigger.Button';
	function Zo({ icon: e = 'branding', className: t, noStyle: o = !1 }) {
		let n,
			{ branding: r } = lo(),
			s = o ? t : [Ue.icon, t].filter(Boolean).join(' ');
		if (Ae(e)) return c('span', { className: s, children: e });
		switch (e) {
			case 'fingerprint':
				n = c(sm, {});
				break;
			case 'settings':
				n = c(im, {});
				break;
			default:
				n = r === 'consent' ? c(ps, {}) : c(nm, {});
		}
		return c('span', { className: s, children: n });
	}
	Zo.displayName = 'ConsentDialogTrigger.Icon';
	function $n({ children: e, className: t, noStyle: o = !1 }) {
		return c('span', {
			className: o ? t : [Ue.text, t].filter(Boolean).join(' '),
			children: e,
		});
	}
	$n.displayName = 'ConsentDialogTrigger.Text';
	function vm({
		icon: e = 'branding',
		defaultPosition: t = 'bottom-right',
		persistPosition: o = !0,
		ariaLabel: n = 'Open privacy settings',
		showWhen: r = 'always',
		size: s = 'md',
		className: i,
		noStyle: a = !1,
		onClick: l,
		onPositionChange: u,
	}) {
		return c(Ko, {
			defaultPosition: t,
			persistPosition: o,
			showWhen: r,
			onClick: l,
			onPositionChange: u,
			children: c(Yo, {
				size: s,
				ariaLabel: n,
				className: i,
				noStyle: a,
				children: c(Zo, { icon: e, noStyle: a }),
			}),
		});
	}
	vm.displayName = 'ConsentDialogTrigger';
	var Gt = Object.assign(vm, { Root: Ko, Button: Yo, Icon: Zo, Text: $n });
	var ym = ({
		open: e,
		noStyle: t,
		disableAnimation: o,
		scrollLock: n = !0,
		trapFocus: r = !0,
		hideBranding: s,
		legalLinks: i,
		showTrigger: a = !1,
		models: l,
		uiSource: u,
	}) => {
		let m = Ht({
				noStyle: t,
				disableAnimation: o,
				scrollLock: n,
				trapFocus: r,
			}),
			{ activeUI: p } = q(),
			d = { open: e ?? p === 'dialog', ...m, models: l, uiSource: u },
			f = a === !0 ? {} : a === !1 ? null : a;
		return c(W, {
			children: [
				f && c(Gt, { ...f }),
				c(ys, {
					...d,
					children: c(hs, {
						noStyle: d.noStyle,
						legalLinks: i,
						hideBranding: s,
					}),
				}),
			],
		});
	};
	var Ea = Object.assign(ym, {
		Card: cm,
		Header: lm,
		HeaderTitle: dm,
		HeaderDescription: um,
		Content: pm,
		Footer: mm,
		ConsentCustomizationCard: hs,
		ConsentDialogFooter: Wo,
		ConsentDialogHeader: ms,
		ConsentDialogHeaderTitle: fs,
		ConsentDialogHeaderDescription: gs,
		ConsentDialogContent: bs,
		Overlay: vs,
		Root: ys,
	});
	var lv = {
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/components/iab-consent-banner.module.css'(
				e,
				t,
				o
			) {
				o.d(t, { A: () => a });
				var n = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'
					),
					r = o.n(n),
					s = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'
					),
					i = o.n(s)()(r());
				i.push([
					e.id,
					':root{--iab-consent-banner-font-family:var(--c15t-font-family);--iab-consent-banner-line-height:var(--c15t-line-height-normal);--iab-consent-banner-text-size-adjust:100%;--iab-consent-banner-tab-size:4;--iab-consent-banner-border-radius-sm:var(--c15t-radius-sm);--iab-consent-banner-border-radius:var(--c15t-radius-lg);--iab-consent-banner-max-width:560px;--iab-consent-banner-animation-duration:var(--c15t-duration-normal);--iab-consent-banner-animation-timing:var(--c15t-easing);--iab-consent-banner-entry-animation:c15t-ui-iabConsentBannerEnter-Pe3nZ var(--c15t-duration-fast)var(--c15t-easing);--iab-consent-banner-exit-animation:c15t-ui-iabConsentBannerExit-saqVJ var(--c15t-duration-fast)var(--c15t-easing);--iab-consent-banner-border-width:1px;--iab-consent-banner-border-width-hairline:1px;--iab-consent-banner-shadow:var(--c15t-shadow-lg);--iab-consent-banner-shadow-dark:var(--c15t-shadow-lg);--iab-consent-banner-background-color:var(--c15t-surface);--iab-consent-banner-background-color-dark:var(--c15t-surface);--iab-consent-banner-footer-background-color:var(--c15t-surface-hover);--iab-consent-banner-footer-background-color-dark:var(--c15t-surface-hover);--iab-consent-banner-text-color:var(--c15t-text);--iab-consent-banner-text-color-dark:var(--c15t-text);--iab-consent-banner-border-color:var(--c15t-border);--iab-consent-banner-border-color-dark:var(--c15t-border);--iab-consent-banner-title-color:var(--c15t-text);--iab-consent-banner-title-color-dark:var(--c15t-text);--iab-consent-banner-description-color:var(--c15t-text-muted);--iab-consent-banner-description-color-dark:var(--c15t-text-muted);--iab-consent-banner-overlay-background-color:var(--c15t-overlay);--iab-consent-banner-overlay-background-color-dark:var(--c15t-overlay);--iab-consent-banner-link-color:var(--c15t-primary);--iab-consent-banner-link-color-dark:var(--c15t-primary)}@media only screen and (resolution>=192dpi){:root{--iab-consent-banner-border-width-hairline:.5px}}@layer components{.c15t-ui-root-ohkUO{z-index:999999998;font-family:var(--iab-consent-banner-font-family);line-height:var(--iab-consent-banner-line-height);-webkit-text-size-adjust:var(--iab-consent-banner-text-size-adjust);-webkit-font-smoothing:antialiased;tab-size:var(--iab-consent-banner-tab-size);justify-content:center;align-items:center;padding:1rem;display:flex;position:fixed;inset:0}.c15t-ui-bannerVisible-mCqjY{opacity:1;transition:opacity var(--iab-consent-banner-animation-duration)var(--iab-consent-banner-animation-timing),transform var(--iab-consent-banner-animation-duration)cubic-bezier(.34,1.56,.64,1);transform:scale(1)}.c15t-ui-bannerHidden-gf6eK{opacity:0;transition:opacity var(--iab-consent-banner-animation-duration)var(--iab-consent-banner-animation-timing),transform var(--iab-consent-banner-animation-duration)var(--iab-consent-banner-animation-timing);transform:scale(.95)}@media (width>=640px){.c15t-ui-root-ohkUO{padding:1.5rem}}.c15t-ui-card-UZXwa{width:min(100%,var(--iab-consent-banner-max-width));border-radius:var(--iab-consent-banner-border-radius);border-width:var(--iab-consent-banner-border-width);border-style:solid;border-color:var(--iab-consent-banner-border-color);background-color:var(--iab-consent-banner-background-color);box-shadow:var(--iab-consent-banner-shadow);position:relative;overflow:hidden}.c15t-dark .c15t-ui-card-UZXwa{background-color:var(--iab-consent-banner-background-color-dark);border-color:var(--iab-consent-banner-border-color-dark);box-shadow:var(--iab-consent-banner-shadow-dark)}.c15t-ui-card-UZXwa[data-state=open]{animation:var(--iab-consent-banner-entry-animation)}.c15t-ui-card-UZXwa[data-state=closed]{animation:var(--iab-consent-banner-exit-animation)}.c15t-ui-card-UZXwa>:not([hidden])~:not([hidden]){border-top-width:var(--iab-consent-banner-border-width);border-top-style:solid;border-color:var(--iab-consent-banner-border-color)}.c15t-dark .c15t-ui-card-UZXwa>:not([hidden])~:not([hidden]){border-color:var(--iab-consent-banner-border-color-dark)}.c15t-ui-card-UZXwa:focus{outline-offset:2px;outline:none}@keyframes c15t-ui-iabConsentBannerEnter-Pe3nZ{0%{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}@keyframes c15t-ui-iabConsentBannerExit-saqVJ{0%{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(.95)}}.c15t-ui-header-vZPUf{color:var(--iab-consent-banner-text-color);flex-direction:column;gap:.5rem;padding:1.25rem;display:flex}.c15t-dark .c15t-ui-header-vZPUf{color:var(--iab-consent-banner-text-color-dark)}@media (width>=640px){.c15t-ui-header-vZPUf{padding:1.5rem}}.c15t-ui-title-jG39K{letter-spacing:-.011em;color:var(--iab-consent-banner-title-color);margin:0;font-size:1.125rem;font-weight:600;line-height:1.5rem}.c15t-dark .c15t-ui-title-jG39K{color:var(--iab-consent-banner-title-color-dark)}.c15t-ui-description-zvYpT{letter-spacing:-.006em;color:var(--iab-consent-banner-description-color);margin:0;font-size:.875rem;font-weight:400;line-height:1.5}.c15t-dark .c15t-ui-description-zvYpT{color:var(--iab-consent-banner-description-color-dark)}.c15t-ui-partnersLink-Adxgr{color:var(--iab-consent-banner-link-color);cursor:pointer;font-weight:500;font-size:inherit;background:0 0;border:none;padding:0;text-decoration:none}.c15t-ui-partnersLink-Adxgr:hover{text-decoration:underline}.c15t-dark .c15t-ui-partnersLink-Adxgr{color:var(--iab-consent-banner-link-color-dark)}.c15t-ui-purposeList-uJSoO{color:var(--iab-consent-banner-description-color);margin:.5rem 0 0;padding-left:1.25rem;font-size:.875rem;line-height:1.5;list-style-type:disc}.c15t-ui-purposeList-uJSoO li{margin-bottom:.25rem}.c15t-dark .c15t-ui-purposeList-uJSoO{color:var(--iab-consent-banner-description-color-dark)}.c15t-ui-legitimateInterestNotice-yZmKl{color:var(--iab-consent-banner-description-color);margin-top:.25rem;font-size:.8125rem;line-height:1.5}.c15t-dark .c15t-ui-legitimateInterestNotice-yZmKl{color:var(--iab-consent-banner-description-color-dark)}.c15t-ui-privacyLink-sIqYI{color:var(--iab-consent-banner-link-color);cursor:pointer;font-size:inherit;background:0 0;border:none;padding:0;text-decoration:none}.c15t-ui-privacyLink-sIqYI:hover{text-decoration:underline}.c15t-dark .c15t-ui-privacyLink-sIqYI{color:var(--iab-consent-banner-link-color-dark)}.c15t-ui-footer-YMUGl{background-color:var(--iab-consent-banner-footer-background-color);flex-direction:column;justify-content:space-between;gap:.5rem;padding:.75rem 1rem;display:flex}.c15t-dark .c15t-ui-footer-YMUGl{background-color:var(--iab-consent-banner-footer-background-color-dark)}@media (width>=640px){.c15t-ui-footer-YMUGl{flex-direction:row;padding:1rem}}.c15t-ui-footerButtonGroup-WiFbg{flex-direction:row;gap:.5rem;display:flex}.c15t-ui-footerSpacer-lniRb,.c15t-ui-rejectButton-UHGRK,.c15t-ui-acceptButton-_VyN6,.c15t-ui-customizeButton-TV7Im{flex:1}@media (width>=640px){.c15t-ui-rejectButton-UHGRK,.c15t-ui-acceptButton-_VyN6,.c15t-ui-customizeButton-TV7Im{flex:none}}.c15t-ui-overlay-l1gsp{background-color:var(--iab-consent-banner-overlay-background-color);z-index:999999997;position:fixed;inset:0}.c15t-ui-overlayVisible-A4Wuk{opacity:1;transition:opacity var(--iab-consent-banner-animation-duration)var(--iab-consent-banner-animation-timing)}.c15t-ui-overlayHidden-Fawca{opacity:0;transition:opacity var(--iab-consent-banner-animation-duration)var(--iab-consent-banner-animation-timing)}.c15t-dark .c15t-ui-overlay-l1gsp{background-color:var(--iab-consent-banner-overlay-background-color-dark)}@media (prefers-reduced-motion:reduce){.c15t-ui-bannerVisible-mCqjY,.c15t-ui-bannerHidden-gf6eK,.c15t-ui-overlayVisible-A4Wuk,.c15t-ui-overlayHidden-Fawca{transition:none}.c15t-ui-card-UZXwa[data-state=open],.c15t-ui-card-UZXwa[data-state=closed]{animation:none}}}',
					'',
				]),
					(i.locals = {
						iabConsentBannerEnter: 'c15t-ui-iabConsentBannerEnter-Pe3nZ',
						iabConsentBannerExit: 'c15t-ui-iabConsentBannerExit-saqVJ',
						root: 'c15t-ui-root-ohkUO',
						bannerVisible: 'c15t-ui-bannerVisible-mCqjY',
						bannerHidden: 'c15t-ui-bannerHidden-gf6eK',
						card: 'c15t-ui-card-UZXwa',
						header: 'c15t-ui-header-vZPUf',
						title: 'c15t-ui-title-jG39K',
						description: 'c15t-ui-description-zvYpT',
						partnersLink: 'c15t-ui-partnersLink-Adxgr',
						purposeList: 'c15t-ui-purposeList-uJSoO',
						legitimateInterestNotice: 'c15t-ui-legitimateInterestNotice-yZmKl',
						privacyLink: 'c15t-ui-privacyLink-sIqYI',
						footer: 'c15t-ui-footer-YMUGl',
						footerButtonGroup: 'c15t-ui-footerButtonGroup-WiFbg',
						footerSpacer: 'c15t-ui-footerSpacer-lniRb',
						rejectButton: 'c15t-ui-rejectButton-UHGRK',
						acceptButton: 'c15t-ui-acceptButton-_VyN6',
						customizeButton: 'c15t-ui-customizeButton-TV7Im',
						overlay: 'c15t-ui-overlay-l1gsp',
						overlayVisible: 'c15t-ui-overlayVisible-A4Wuk',
						overlayHidden: 'c15t-ui-overlayHidden-Fawca',
					});
				let a = i;
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'(
				e
			) {
				e.exports = function (t) {
					var o = [];
					return (
						(o.toString = function () {
							return this.map(function (n) {
								var r = '',
									s = n[5] !== void 0;
								return (
									n[4] && (r += '@supports ('.concat(n[4], ') {')),
									n[2] && (r += '@media '.concat(n[2], ' {')),
									s &&
										(r += '@layer'.concat(
											n[5].length > 0 ? ' '.concat(n[5]) : '',
											' {'
										)),
									(r += t(n)),
									s && (r += '}'),
									n[2] && (r += '}'),
									n[4] && (r += '}'),
									r
								);
							}).join('');
						}),
						(o.i = function (n, r, s, i, a) {
							typeof n == 'string' && (n = [[null, n, void 0]]);
							var l = {};
							if (s)
								for (var u = 0; u < this.length; u++) {
									var m = this[u][0];
									m != null && (l[m] = !0);
								}
							for (var p = 0; p < n.length; p++) {
								var d = [].concat(n[p]);
								(s && l[d[0]]) ||
									(a !== void 0 &&
										(d[5] === void 0 ||
											(d[1] = '@layer'
												.concat(d[5].length > 0 ? ' '.concat(d[5]) : '', ' {')
												.concat(d[1], '}')),
										(d[5] = a)),
									r &&
										(d[2] &&
											(d[1] = '@media '.concat(d[2], ' {').concat(d[1], '}')),
										(d[2] = r)),
									i &&
										(d[4]
											? ((d[1] = '@supports ('
													.concat(d[4], ') {')
													.concat(d[1], '}')),
												(d[4] = i))
											: (d[4] = ''.concat(i))),
									o.push(d));
							}
						}),
						o
					);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'(
				e
			) {
				e.exports = function (t) {
					return t[1];
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'(
				e
			) {
				var t = [];
				function o(r) {
					for (var s = -1, i = 0; i < t.length; i++)
						if (t[i].identifier === r) {
							s = i;
							break;
						}
					return s;
				}
				function n(r, s) {
					for (var i = {}, a = [], l = 0; l < r.length; l++) {
						var u = r[l],
							m = s.base ? u[0] + s.base : u[0],
							p = i[m] || 0,
							d = ''.concat(m, ' ').concat(p);
						i[m] = p + 1;
						var f = o(d),
							h = {
								css: u[1],
								media: u[2],
								sourceMap: u[3],
								supports: u[4],
								layer: u[5],
							};
						if (f !== -1) t[f].references++, t[f].updater(h);
						else {
							var x = (function (b, y) {
								var C = y.domAPI(y);
								return (
									C.update(b),
									function (g) {
										g
											? (g.css !== b.css ||
													g.media !== b.media ||
													g.sourceMap !== b.sourceMap ||
													g.supports !== b.supports ||
													g.layer !== b.layer) &&
												C.update((b = g))
											: C.remove();
									}
								);
							})(h, s);
							(s.byIndex = l),
								t.splice(l, 0, { identifier: d, updater: x, references: 1 });
						}
						a.push(d);
					}
					return a;
				}
				e.exports = function (r, s) {
					var i = n((r = r || []), (s = s || {}));
					return function (a) {
						a = a || [];
						for (var l = 0; l < i.length; l++) {
							var u = o(i[l]);
							t[u].references--;
						}
						for (var m = n(a, s), p = 0; p < i.length; p++) {
							var d = o(i[p]);
							t[d].references === 0 && (t[d].updater(), t.splice(d, 1));
						}
						i = m;
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'(
				e
			) {
				var t = {};
				e.exports = function (o, n) {
					var r = (function (s) {
						if (t[s] === void 0) {
							var i = document.querySelector(s);
							if (
								window.HTMLIFrameElement &&
								i instanceof window.HTMLIFrameElement
							)
								try {
									i = i.contentDocument.head;
								} catch {
									i = null;
								}
							t[s] = i;
						}
						return t[s];
					})(o);
					if (!r)
						throw Error(
							"Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid."
						);
					r.appendChild(n);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'(
				e
			) {
				e.exports = function (t) {
					var o = document.createElement('style');
					return t.setAttributes(o, t.attributes), t.insert(o, t.options), o;
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'(
				e,
				t,
				o
			) {
				e.exports = function (n) {
					var r = o.nc;
					r && n.setAttribute('nonce', r);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'(
				e
			) {
				e.exports = function (t) {
					if (typeof document > 'u')
						return { update: function () {}, remove: function () {} };
					var o = t.insertStyleElement(t);
					return {
						update: function (n) {
							var r, s, i;
							(r = ''),
								n.supports && (r += '@supports ('.concat(n.supports, ') {')),
								n.media && (r += '@media '.concat(n.media, ' {')),
								(s = n.layer !== void 0) &&
									(r += '@layer'.concat(
										n.layer.length > 0 ? ' '.concat(n.layer) : '',
										' {'
									)),
								(r += n.css),
								s && (r += '}'),
								n.media && (r += '}'),
								n.supports && (r += '}'),
								(i = n.sourceMap) &&
									typeof btoa < 'u' &&
									(r += `
/*# sourceMappingURL=data:application/json;base64,`.concat(
										btoa(unescape(encodeURIComponent(JSON.stringify(i)))),
										' */'
									)),
								t.styleTagTransform(r, o, t.options);
						},
						remove: function () {
							var n;
							(n = o).parentNode === null || n.parentNode.removeChild(n);
						},
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'(
				e
			) {
				e.exports = function (t, o) {
					if (o.styleSheet) o.styleSheet.cssText = t;
					else {
						for (; o.firstChild; ) o.removeChild(o.firstChild);
						o.appendChild(document.createTextNode(t));
					}
				};
			},
		},
		Cm = {};
	function ke(e) {
		var t = Cm[e];
		if (t !== void 0) return t.exports;
		var o = (Cm[e] = { id: e, exports: {} });
		return lv[e](o, o.exports, ke), o.exports;
	}
	(ke.n = (e) => {
		var t = e && e.__esModule ? () => e.default : () => e;
		return ke.d(t, { a: t }), t;
	}),
		(ke.d = (e, t) => {
			for (var o in t)
				ke.o(t, o) &&
					!ke.o(e, o) &&
					Object.defineProperty(e, o, { enumerable: !0, get: t[o] });
		}),
		(ke.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t)),
		(ke.nc = void 0);
	var dv = ke(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'
		),
		uv = ke.n(dv),
		pv = ke(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'
		),
		mv = ke.n(pv),
		fv = ke(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'
		),
		gv = ke.n(fv),
		bv = ke(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'
		),
		hv = ke.n(bv),
		vv = ke(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'
		),
		yv = ke.n(vv),
		Cv = ke(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'
		),
		xv = ke.n(Cv),
		xs = ke(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/components/iab-consent-banner.module.css'
		),
		Xo = {};
	(Xo.styleTagTransform = xv()),
		(Xo.setAttributes = hv()),
		(Xo.insert = gv().bind(null, 'head')),
		(Xo.domAPI = mv()),
		(Xo.insertStyleElement = yv()),
		uv()(xs.A, Xo);
	var Y = xs.A && xs.A.locals ? xs.A.locals : void 0;
	var Na = T(({ children: e, className: t, ...o }, n) =>
		c('div', {
			ref: n,
			className: t ? `${Y.footerButtonGroup} ${t}` : Y.footerButtonGroup,
			...o,
			children: e,
		})
	);
	Na.displayName = 'IABConsentBannerButtonGroup';
	var Pa = T(({ className: e, ...t }, o) =>
		c('div', {
			ref: o,
			className: e ? `${Y.footerSpacer} ${e}` : Y.footerSpacer,
			...t,
		})
	);
	Pa.displayName = 'IABConsentBannerFooterSpacer';
	var Ba = T(({ children: e, className: t, ...o }, n) => {
		let { trapFocus: r } = te();
		return (
			st(!!r, n),
			c('div', {
				ref: n,
				...X('iabConsentBannerCard', { baseClassName: Y.card, className: t }),
				tabIndex: 0,
				role: 'dialog',
				'aria-modal': r ? 'true' : void 0,
				'data-testid': 'iab-consent-banner-card',
				...o,
				children: e,
			})
		);
	});
	Ba.displayName = 'IABConsentBannerCard';
	var Oa = T(({ children: e, className: t, ...o }, n) =>
		c('p', {
			ref: n,
			className: t ? `${Y.description} ${t}` : Y.description,
			...o,
			children: e,
		})
	);
	Oa.displayName = 'IABConsentBannerDescription';
	var Da = T(({ children: e, className: t, ...o }, n) =>
		c('div', {
			ref: n,
			...X('iabConsentBannerFooter', { baseClassName: Y.footer, className: t }),
			'data-testid': 'iab-consent-banner-footer',
			...o,
			children: e,
		})
	);
	Da.displayName = 'IABConsentBannerFooter';
	var ja = T(({ children: e, className: t, ...o }, n) =>
		c('div', {
			ref: n,
			...X('iabConsentBannerHeader', { baseClassName: Y.header, className: t }),
			'data-testid': 'iab-consent-banner-header',
			...o,
			children: e,
		})
	);
	ja.displayName = 'IABConsentBannerHeader';
	var Wn = T(({ className: e, style: t, noStyle: o, ...n }, r) => {
		let s,
			{ activeUI: i } = q(),
			{ disableAnimation: a, noStyle: l, scrollLock: u } = te(),
			[m, p] = P(!1),
			d = i === 'banner';
		M(() => {
			if (d) p(!0);
			else if (a) p(!1);
			else {
				let x = setTimeout(
					() => {
						p(!1);
					},
					Number.parseInt(
						getComputedStyle(document.documentElement).getPropertyValue(
							'--iab-consent-banner-animation-duration'
						) || '200',
						10
					)
				);
				return () => clearTimeout(x);
			}
		}, [d, a]);
		let f = X('iabConsentBannerOverlay', {
			baseClassName: !(l || o) && Y.overlay,
			className: e,
			noStyle: l || o,
		});
		l || o || a || (s = m ? Y.overlayVisible : Y.overlayHidden);
		let h = Fe(f.className, s);
		return (
			ot(!!(d && u)),
			d && u
				? c('div', {
						ref: r,
						...n,
						className: h,
						style: { ...f.style, ...t },
						'data-testid': 'iab-consent-banner-overlay',
					})
				: null
		);
	});
	Wn.displayName = 'IABConsentBannerOverlay';
	var Ss = ({
			children: e,
			className: t,
			noStyle: o,
			disableAnimation: n,
			scrollLock: r,
			trapFocus: s = !0,
			models: i,
			uiSource: a,
			...l
		}) =>
			c(We.Provider, {
				value: { uiSource: a ?? 'iab_banner' },
				children: c(nt.Provider, {
					value: {
						disableAnimation: n,
						noStyle: o,
						scrollLock: r,
						trapFocus: s,
					},
					children: c(xm, {
						disableAnimation: n,
						className: t,
						noStyle: o,
						models: i,
						...l,
						children: e,
					}),
				}),
			}),
		xm = T(
			(
				{
					children: e,
					className: t,
					style: o,
					className: n,
					disableAnimation: r,
					noStyle: s,
					models: i = ['iab'],
					...a
				},
				l
			) => {
				let { activeUI: u, translationConfig: m, model: p } = q(),
					d = rt(m.defaultLanguage),
					[f, h] = P(!1),
					[x, b] = P(!1),
					[y, C] = P(200),
					g = u === 'banner' && i.includes(p);
				M(() => {
					C(
						Number.parseInt(
							getComputedStyle(document.documentElement).getPropertyValue(
								'--iab-consent-banner-animation-duration'
							) || '200',
							10
						)
					);
				}, []),
					M(() => {
						if (g)
							if (x) h(!0);
							else {
								let O = setTimeout(() => {
									h(!0), b(!0);
								}, 10);
								return () => clearTimeout(O);
							}
						else if ((b(!1), r)) h(!1);
						else {
							let O = setTimeout(() => {
								h(!1);
							}, y);
							return () => clearTimeout(O);
						}
					}, [g, r, x, y]);
				let S = X('iabConsentBanner', {
						baseClassName: [Y.root],
						style: o,
						className: t || n,
						noStyle: s,
					}),
					[A, I] = P(!1);
				if (
					(M(() => {
						I(!0);
					}, []),
					!A)
				)
					return null;
				let _ = s
					? S.className || ''
					: `${S.className || ''} ${f ? Y.bannerVisible : Y.bannerHidden}`;
				return g
					? $e(
							c(W, {
								children: [
									c(Wn, {}),
									c('div', {
										ref: l,
										...a,
										...S,
										className: _,
										'data-testid': 'iab-consent-banner-root',
										dir: d,
										children: e,
									}),
								],
							}),
							document.body
						)
					: null;
			}
		);
	xm.displayName = 'IABConsentBannerRootChildren';
	var Ma = T(({ children: e, className: t, ...o }, n) =>
		c('h2', {
			ref: n,
			className: t ? `${Y.title} ${t}` : Y.title,
			...o,
			children: e,
		})
	);
	Ma.displayName = 'IABConsentBannerTitle';
	var ks = Je.translations.en.iab;
	function ws(e, t) {
		if (!t) return e;
		let o = { ...e };
		for (let n of Object.keys(e)) {
			let r = e[n],
				s = t[n];
			s === void 0 ||
			typeof r != 'object' ||
			r === null ||
			typeof s != 'object' ||
			s === null ||
			Array.isArray(r)
				? s !== void 0 && (o[n] = s)
				: (o[n] = ws(r, s));
		}
		return o;
	}
	function Oe() {
		let e = pe();
		return e.iab
			? {
					banner: ws(ks.banner, e.iab.banner),
					common: ws(ks.common, e.iab.common),
					preferenceCenter: ws(ks.preferenceCenter, e.iab.preferenceCenter),
				}
			: ks;
	}
	var Sm = ({
		noStyle: e,
		disableAnimation: t,
		scrollLock: o = !0,
		trapFocus: n = !0,
		primaryButton: r = 'customize',
		models: s,
		uiSource: i,
	}) => {
		let a = Oe(),
			{ iab: l, setActiveUI: u } = q(),
			m = z(null),
			p = Ht({ noStyle: e, disableAnimation: t, scrollLock: o, trapFocus: n }),
			d = J(
				() =>
					l?.gvl
						? Object.keys(l.gvl.vendors).length + (l.nonIABVendors?.length ?? 0)
						: 0,
				[l?.gvl, l?.nonIABVendors]
			),
			f = J(() => {
				if (!l?.gvl) return { displayed: [], remainingCount: 0, isReady: !1 };
				let y = l.gvl,
					C = Object.entries(y.purposes)
						.filter(([V]) =>
							Object.values(y.vendors).some(
								(ne) =>
									ne.purposes?.includes(Number(V)) ||
									ne.legIntPurposes?.includes(Number(V))
							)
						)
						.map(([V, ne]) => ({ id: Number(V), name: ne.name })),
					g = C.find((V) => V.id === 1),
					S = C.filter((V) => V.id !== 1),
					A = new Set(S.map((V) => V.id)),
					I = y.stacks || {},
					_ = [];
				for (let [V, ne] of Object.entries(I)) {
					let Le = ne.purposes.filter((De) => A.has(De));
					Le.length >= 2 &&
						_.push({
							stackId: Number(V),
							name: ne.name,
							coveredPurposeIds: Le,
							score: Le.length,
						});
				}
				_.sort((V, ne) => ne.score - V.score);
				let O = [],
					B = new Set();
				for (let { name: V, coveredPurposeIds: ne } of _) {
					let Le = ne.filter((De) => !B.has(De));
					if (Le.length >= 2) for (let De of (O.push(V), Le)) B.add(De);
				}
				let E = S.filter((V) => !B.has(V.id)),
					L = Object.entries(y.specialFeatures || {})
						.filter(([V]) =>
							Object.values(y.vendors).some((ne) =>
								ne.specialFeatures?.includes(Number(V))
							)
						)
						.map(([, V]) => V.name),
					H = [];
				for (let V of (g && H.push(g.name), O)) H.push(V);
				for (let V of E) H.push(V.name);
				for (let V of L) H.push(V);
				return {
					displayed: H.slice(0, 5),
					remainingCount: Math.max(0, H.length - 5),
					isReady: !0,
				};
			}, [l?.gvl]);
		if ((st(!!p.trapFocus, m), !l?.config.enabled || !f.isReady)) return null;
		let h = a.banner.description.replace('{partnerCount}', String(d)),
			x = a.banner.partnersLink.replace('{count}', String(d)),
			b = a.banner.scopeServiceSpecific;
		return c(Ss, {
			...p,
			models: s,
			uiSource: i,
			children: c(oe, {
				ref: m,
				baseClassName: Y.card,
				themeKey: 'iabConsentBannerCard',
				tabIndex: 0,
				role: 'dialog',
				'aria-modal': p.trapFocus ? 'true' : void 0,
				'aria-label': a.banner.title,
				'data-testid': 'iab-consent-banner-card',
				children: [
					c(oe, {
						baseClassName: Y.header,
						themeKey: 'iabConsentBannerHeader',
						'data-testid': 'iab-consent-banner-header',
						children: [
							c('h2', { className: Y.title, children: a.banner.title }),
							c('p', {
								className: Y.description,
								children: [
									h.split(x)[0],
									c('button', {
										type: 'button',
										className: Y.partnersLink,
										onClick: () => {
											l?.setPreferenceCenterTab('vendors'), u('dialog');
										},
										onMouseEnter: () => {},
										children: x,
									}),
									h.split(x)[1],
								],
							}),
							c('ul', {
								className: Y.purposeList,
								children: [
									f.displayed.map((y, C) => c('li', { children: y }, C)),
									f.remainingCount > 0 &&
										c('li', {
											className: Y.purposeMore,
											children: a.banner.andMore.replace(
												'{count}',
												String(f.remainingCount)
											),
										}),
								],
							}),
							c('p', {
								className: Y.legitimateInterestNotice,
								children: [a.banner.legitimateInterestNotice, ' ', b],
							}),
						],
					}),
					c(oe, {
						baseClassName: Y.footer,
						themeKey: 'iabConsentBannerFooter',
						'data-testid': 'iab-consent-banner-footer',
						children: [
							c('div', {
								className: Y.footerButtonGroup,
								children: [
									c(Ze, {
										variant: r === 'reject' ? 'primary' : 'neutral',
										mode: 'stroke',
										size: 'small',
										onClick: () => {
											l?.rejectAll(), l?.save(), u('none');
										},
										className: Y.rejectButton,
										'data-testid': 'iab-consent-banner-reject-button',
										children: a.common.rejectAll,
									}),
									c(Ze, {
										variant: r === 'accept' ? 'primary' : 'neutral',
										mode: r === 'accept' ? 'filled' : 'stroke',
										size: 'small',
										onClick: () => {
											l?.acceptAll(), l?.save(), u('none');
										},
										className: Y.acceptButton,
										'data-testid': 'iab-consent-banner-accept-button',
										children: a.common.acceptAll,
									}),
								],
							}),
							c('div', { className: Y.footerSpacer }),
							c(Ze, {
								variant: r === 'customize' ? 'primary' : 'neutral',
								mode: r === 'customize' ? 'filled' : 'stroke',
								size: 'small',
								onClick: () => {
									l?.setPreferenceCenterTab('purposes'), u('dialog');
								},
								className: Y.customizeButton,
								'data-testid': 'iab-consent-banner-customize-button',
								children: a.common.customize,
							}),
						],
					}),
				],
			}),
		});
	};
	var Va = Object.assign(Sm, {
		Root: Ss,
		Card: Ba,
		Header: ja,
		Title: Ma,
		Description: Oa,
		Footer: Da,
		ButtonGroup: Na,
		FooterSpacer: Pa,
		Overlay: Wn,
	});
	var Sv = {
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/components/iab-consent-dialog.module.css'(
				e,
				t,
				o
			) {
				o.d(t, { A: () => a });
				var n = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'
					),
					r = o.n(n),
					s = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'
					),
					i = o.n(s)()(r());
				i.push([
					e.id,
					':root{--iab-cd-font-family:var(--c15t-font-family);--iab-cd-line-height:var(--c15t-line-height-tight);--iab-cd-title-font-size:1.125rem;--iab-cd-title-font-weight:var(--c15t-font-weight-semibold);--iab-cd-description-font-size:.75rem;--iab-cd-description-line-height:var(--c15t-line-height-normal);--iab-cd-background-color:var(--c15t-surface);--iab-cd-background-color-dark:var(--c15t-surface);--iab-cd-text-color:var(--c15t-text);--iab-cd-text-color-dark:var(--c15t-text);--iab-cd-text-muted-color:var(--c15t-text-muted);--iab-cd-text-muted-color-dark:var(--c15t-text-muted);--iab-cd-border-color:var(--c15t-border);--iab-cd-border-color-dark:var(--c15t-border);--iab-cd-overlay-background:var(--c15t-overlay);--iab-cd-overlay-background-dark:var(--c15t-overlay);--iab-cd-primary-color:var(--c15t-primary);--iab-cd-primary-color-dark:var(--c15t-primary);--iab-cd-surface-hover:var(--c15t-surface-hover);--iab-cd-surface-hover-dark:var(--c15t-surface-hover);--iab-cd-max-width:48rem;--iab-cd-max-height:85vh;--iab-cd-border-radius:var(--c15t-radius-lg);--iab-cd-z-index:1000000000;--iab-cd-overlay-z-index:1000000000;--iab-cd-padding:var(--c15t-space-md);--iab-cd-padding-sm:var(--c15t-space-sm);--iab-cd-gap:var(--c15t-space-sm);--iab-cd-animation-duration:.15s;--iab-cd-animation-timing:ease-out;--iab-cd-shadow:var(--c15t-shadow-xl)}@layer components{.c15t-ui-root-oQ3Q4{isolation:isolate;font-family:var(--iab-cd-font-family);line-height:var(--iab-cd-line-height);-webkit-text-size-adjust:100%;tab-size:4;padding:var(--iab-cd-padding);z-index:var(--iab-cd-z-index);background:0 0;border:0;justify-content:center;align-items:center;margin:0;display:flex;position:fixed;inset:0}.c15t-ui-dialogVisible-PUG1v{opacity:1;transition:opacity var(--iab-cd-animation-duration)var(--iab-cd-animation-timing)}.c15t-ui-dialogHidden-FoTkw{opacity:0;transition:opacity var(--iab-cd-animation-duration)var(--iab-cd-animation-timing)}.c15t-ui-contentVisible-G8YSA{opacity:1;transition:opacity var(--iab-cd-animation-duration)var(--iab-cd-animation-timing),transform var(--iab-cd-animation-duration)cubic-bezier(.34,1.56,.64,1);transform:scale(1)}.c15t-ui-contentHidden-iYnZI{opacity:0;transition:opacity var(--iab-cd-animation-duration)var(--iab-cd-animation-timing),transform var(--iab-cd-animation-duration)var(--iab-cd-animation-timing);transform:scale(.95)}.c15t-ui-overlay-h1Tzu{background-color:var(--iab-cd-overlay-background);z-index:var(--iab-cd-overlay-z-index);position:fixed;inset:0}.c15t-ui-overlayVisible-HizR9{opacity:1;transition:opacity var(--iab-cd-animation-duration)var(--iab-cd-animation-timing)}.c15t-ui-overlayHidden-IFPwA{opacity:0;transition:opacity var(--iab-cd-animation-duration)var(--iab-cd-animation-timing)}.c15t-dark .c15t-ui-overlay-h1Tzu{background-color:var(--iab-cd-overlay-background-dark)}.c15t-ui-card-iVcxY{width:min(100%,var(--iab-cd-max-width));max-height:var(--iab-cd-max-height);border-radius:var(--iab-cd-border-radius);border:1px solid var(--iab-cd-border-color);background-color:var(--iab-cd-background-color);box-shadow:var(--iab-cd-shadow);flex-direction:column;display:flex;overflow:hidden}.c15t-dark .c15t-ui-card-iVcxY{background-color:var(--iab-cd-background-color-dark);border-color:var(--iab-cd-border-color-dark)}.c15t-ui-header-q_v_l{border-bottom:1px solid var(--iab-cd-border-color);flex-shrink:0;justify-content:space-between;align-items:center;padding:.75rem 1rem;display:flex}.c15t-dark .c15t-ui-header-q_v_l{border-color:var(--iab-cd-border-color-dark)}@media (width>=768px){.c15t-ui-header-q_v_l{padding:1rem}}.c15t-ui-headerContent-BVSE_{flex:1}.c15t-ui-title-Rrshj{font-size:var(--iab-cd-title-font-size);font-weight:var(--iab-cd-title-font-weight);color:var(--iab-cd-text-color);margin:0;line-height:1.25}.c15t-dark .c15t-ui-title-Rrshj{color:var(--iab-cd-text-color-dark)}.c15t-ui-description-wjYno{font-size:var(--iab-cd-description-font-size);color:var(--iab-cd-text-muted-color);line-height:var(--iab-cd-description-line-height);margin:.25rem 0 0}.c15t-dark .c15t-ui-description-wjYno{color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-closeButton-wGCHD{border-radius:var(--c15t-radius-md);cursor:pointer;color:var(--iab-cd-text-muted-color);background:0 0;border:none;justify-content:center;align-items:center;padding:.375rem;transition:background-color .15s;display:flex}.c15t-ui-closeButton-wGCHD:hover{background-color:var(--iab-cd-surface-hover)}.c15t-dark .c15t-ui-closeButton-wGCHD{color:var(--iab-cd-text-muted-color-dark)}.c15t-dark .c15t-ui-closeButton-wGCHD:hover{background-color:var(--iab-cd-surface-hover-dark)}.c15t-ui-tabsContainer-aTkFk{flex-shrink:0;padding:.75rem .75rem 0}@media (width>=768px){.c15t-ui-tabsContainer-aTkFk{padding:1rem 1rem 0}}.c15t-ui-tabsList-BI6D3{isolation:isolate;border-radius:var(--c15t-radius-lg,.625rem);background-color:var(--iab-cd-surface-hover);grid-auto-columns:1fr;grid-auto-flow:column;gap:.25rem;padding:.25rem;display:grid;position:relative}.c15t-dark .c15t-ui-tabsList-BI6D3{background-color:var(--iab-cd-surface-hover-dark)}.c15t-ui-tabButton-xZKks{z-index:10;white-space:nowrap;border-radius:var(--c15t-radius-md,.375rem);height:2rem;color:var(--iab-cd-text-muted-color);cursor:pointer;background:0 0;border:none;outline:none;justify-content:center;align-items:center;gap:.375rem;padding:0 .75rem;font-size:.8125rem;font-weight:500;transition:color .2s cubic-bezier(.33,1,.68,1),background-color .2s cubic-bezier(.33,1,.68,1);display:flex;position:relative}.c15t-ui-tabButton-xZKks:hover{color:var(--iab-cd-text-color)}.c15t-ui-tabButton-xZKks:focus-visible{outline:2px solid var(--iab-cd-primary-color);outline-offset:2px}.c15t-ui-tabButton-xZKks[data-state=active]{color:var(--iab-cd-text-color)}.c15t-dark .c15t-ui-tabButton-xZKks{color:var(--iab-cd-text-muted-color-dark)}.c15t-dark .c15t-ui-tabButton-xZKks:hover{color:var(--iab-cd-text-color-dark)}.c15t-dark .c15t-ui-tabButton-xZKks[data-state=active]{color:var(--iab-cd-text-color-dark)}.c15t-ui-tabIndicator-bGaYj{z-index:0;border-radius:var(--c15t-radius-md,.375rem);background-color:var(--iab-cd-background-color);transition:transform .3s cubic-bezier(.65,0,.35,1),width .3s cubic-bezier(.65,0,.35,1);position:absolute;inset-block:.25rem;box-shadow:0 1px 2px #0000000f,0 1px 3px #0000001a}.c15t-dark .c15t-ui-tabIndicator-bGaYj{background-color:var(--iab-cd-background-color-dark);box-shadow:0 1px 2px #0003,0 1px 3px #0000004d}.c15t-ui-tabIndicator-bGaYj[data-active-tab=purposes]{width:calc(50% - .125rem);left:.25rem;transform:translate(0)}.c15t-ui-tabIndicator-bGaYj[data-active-tab=vendors]{width:calc(50% - .125rem);left:.125rem;transform:translate(100%)}.c15t-ui-content-HHYIK{flex:auto;padding:.75rem;overflow-y:auto}@media (width>=768px){.c15t-ui-content-HHYIK{padding:1rem}}.c15t-ui-purposeItem-bTIsY{border-radius:var(--c15t-radius-md);border:1px solid var(--iab-cd-border-color);background-color:var(--iab-cd-background-color);margin-bottom:.5rem}.c15t-dark .c15t-ui-purposeItem-bTIsY{border-color:var(--iab-cd-border-color-dark);background-color:var(--iab-cd-background-color-dark)}.c15t-ui-purposeHeader-foPCp{justify-content:space-between;align-items:flex-start;gap:.75rem;padding:.75rem;display:flex}.c15t-ui-purposeTrigger-cB3th{text-align:left;cursor:pointer;background:0 0;border:none;flex:1;align-items:center;gap:.5rem;min-width:0;padding:0;display:flex}.c15t-ui-purposeArrow-oJXon{width:1rem;height:1rem;color:var(--iab-cd-text-muted-color);flex-shrink:0}.c15t-dark .c15t-ui-purposeArrow-oJXon{color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-purposeInfo-liE3b{flex:1;min-width:0}.c15t-ui-purposeName-zDAD_{color:var(--iab-cd-text-color);align-items:center;gap:.5rem;margin:0;font-size:.875rem;font-weight:500;display:flex}.c15t-dark .c15t-ui-purposeName-zDAD_{color:var(--iab-cd-text-color-dark)}.c15t-ui-lockIcon-G9Bb9{width:.75rem;height:.75rem;color:var(--iab-cd-text-muted-color)}.c15t-dark .c15t-ui-lockIcon-G9Bb9{color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-purposeMeta-jIesh{color:var(--iab-cd-text-muted-color);margin:.125rem 0 0;font-size:.75rem}.c15t-dark .c15t-ui-purposeMeta-jIesh{color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-legitimateInterestBadge-eFgxM{color:var(--iab-cd-text-muted-color);align-items:center;gap:.25rem;margin-top:.25rem;font-size:.625rem;font-weight:500;display:inline-flex}.c15t-ui-legitimateInterestIcon-MdoA6{width:.75rem;height:.75rem}.c15t-ui-purposeContent-ufSwo{border-top:1px solid var(--iab-cd-border-color);margin-top:.75rem;padding:.75rem}.c15t-dark .c15t-ui-purposeContent-ufSwo{border-color:var(--iab-cd-border-color-dark)}.c15t-ui-purposeDescription-TlhAc{color:var(--iab-cd-text-muted-color);margin:0;font-size:.75rem;line-height:1.5}.c15t-dark .c15t-ui-purposeDescription-TlhAc{color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-examplesToggle-sX0IF{color:var(--iab-cd-text-color);cursor:pointer;background:0 0;border:none;align-items:center;gap:.25rem;margin-top:.75rem;padding:0;font-size:.75rem;font-weight:500;display:flex}.c15t-ui-examplesToggle-sX0IF:hover{color:var(--iab-cd-primary-color)}.c15t-dark .c15t-ui-examplesToggle-sX0IF{color:var(--iab-cd-text-color-dark)}.c15t-dark .c15t-ui-examplesToggle-sX0IF:hover{color:var(--iab-cd-primary-color-dark)}.c15t-ui-examplesList-zB8Gu{margin:.375rem 0 0;padding-left:1rem;list-style-type:disc}.c15t-ui-examplesList-zB8Gu li{color:var(--iab-cd-text-muted-color);font-size:.75rem;line-height:1.5}.c15t-dark .c15t-ui-examplesList-zB8Gu li{color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-vendorsToggle-uCSbo{color:var(--iab-cd-text-color);cursor:pointer;background:0 0;border:none;align-items:center;gap:.25rem;margin-top:.75rem;padding:0;font-size:.75rem;font-weight:500;display:flex}.c15t-ui-vendorsToggle-uCSbo:hover{color:var(--iab-cd-primary-color)}.c15t-dark .c15t-ui-vendorsToggle-uCSbo{color:var(--iab-cd-text-color-dark)}.c15t-ui-vendorSection-jLX4W{z-index:1;margin-top:.375rem;position:relative}.c15t-ui-vendorSectionTitle-ucQyu{color:var(--iab-cd-text-muted-color);text-transform:uppercase;letter-spacing:.05em;margin:.5rem 0 .375rem;font-size:.625rem;font-weight:500}.c15t-dark .c15t-ui-vendorSectionTitle-ucQyu{color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-vendorSectionTitleLI-D_m3R{color:var(--iab-cd-text-muted-color);align-items:center;gap:.25rem;display:flex}.c15t-ui-vendorRow-ynEOC{border-radius:var(--c15t-radius-sm);background-color:var(--iab-cd-surface-hover);justify-content:space-between;align-items:center;gap:.5rem;margin-bottom:.375rem;padding:.5rem;display:flex}.c15t-dark .c15t-ui-vendorRow-ynEOC{background-color:var(--iab-cd-surface-hover-dark)}.c15t-ui-vendorRowLI-j9Z37{background-color:var(--iab-cd-surface-hover);border:1px solid var(--iab-cd-border-color)}.c15t-ui-vendorInfo-SzGWD{flex:1;min-width:0}.c15t-ui-vendorName-PyL1i{color:var(--iab-cd-text-color);cursor:pointer;text-align:left;background:0 0;border:none;align-items:center;gap:.375rem;padding:0;font-size:.75rem;font-weight:500;display:flex}.c15t-ui-vendorName-PyL1i:hover{color:var(--iab-cd-primary-color)}.c15t-dark .c15t-ui-vendorName-PyL1i{color:var(--iab-cd-text-color-dark)}.c15t-ui-customVendorIcon-W8oJg{width:.75rem;height:.75rem;color:var(--iab-cd-primary-color)}.c15t-dark .c15t-ui-customVendorIcon-W8oJg{color:var(--iab-cd-primary-color-dark)}.c15t-ui-vendorDetails-Ou6m6{flex-wrap:wrap;gap:.5rem;margin-top:.125rem;display:flex}.c15t-ui-vendorDetail-lOMDC{color:var(--iab-cd-text-muted-color);font-size:.625rem}.c15t-dark .c15t-ui-vendorDetail-lOMDC{color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-vendorDetailLI-NNcid{color:var(--iab-cd-text-muted-color);font-weight:500}.c15t-ui-stackItem-VcXtI{border-radius:var(--c15t-radius-md);border:1px solid var(--iab-cd-border-color);background-color:var(--iab-cd-background-color);margin-bottom:.5rem}.c15t-dark .c15t-ui-stackItem-VcXtI{border-color:var(--iab-cd-border-color-dark);background-color:var(--iab-cd-background-color-dark)}.c15t-ui-stackHeader-RZahv{justify-content:space-between;align-items:flex-start;gap:.75rem;padding:.75rem;display:flex}.c15t-ui-stackTrigger-JqLyX{text-align:left;cursor:pointer;background:0 0;border:none;flex:1;align-items:center;gap:.5rem;min-width:0;padding:0;display:flex}.c15t-ui-stackInfo-s7JaD{flex:1;min-width:0}.c15t-ui-stackName-cYp1z{color:var(--iab-cd-text-color);margin:0;font-size:.875rem;font-weight:500;line-height:1.25}.c15t-dark .c15t-ui-stackName-cYp1z{color:var(--iab-cd-text-color-dark)}.c15t-ui-stackMeta-OnclK{color:var(--iab-cd-text-muted-color);margin-top:.25rem;font-size:.75rem}.c15t-dark .c15t-ui-stackMeta-OnclK{color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-stackControls-uhDRo{flex-shrink:0;align-items:center;gap:.5rem;display:flex}.c15t-ui-partialIndicator-SvNip{background-color:var(--iab-cd-primary-color);border-radius:50%;width:.375rem;height:.375rem}.c15t-ui-stackDescription-yd0M5{color:var(--iab-cd-text-muted-color);margin:.5rem 0 0 1.5rem;padding-bottom:.75rem;font-size:.75rem}.c15t-dark .c15t-ui-stackDescription-yd0M5{color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-stackContent-TId3a{border-top:1px solid var(--iab-cd-border-color);background-color:var(--iab-cd-surface-hover);padding:.5rem}.c15t-dark .c15t-ui-stackContent-TId3a{border-color:var(--iab-cd-border-color-dark);background-color:var(--iab-cd-surface-hover-dark)}.c15t-ui-specialPurposesSection-pRrtz{border-radius:var(--c15t-radius-md);border:1px solid var(--iab-cd-border-color);background-color:var(--iab-cd-background-color);margin-bottom:.5rem}.c15t-dark .c15t-ui-specialPurposesSection-pRrtz{border-color:var(--iab-cd-border-color-dark);background-color:var(--iab-cd-background-color-dark)}.c15t-ui-specialPurposesHeader-HiKU4{justify-content:space-between;align-items:flex-start;gap:.75rem;padding:.75rem;display:flex}.c15t-ui-specialPurposesTitle-ZZIyy{color:var(--iab-cd-text-color);align-items:center;gap:.5rem;margin:0;font-size:.875rem;font-weight:500;display:flex}.c15t-dark .c15t-ui-specialPurposesTitle-ZZIyy{color:var(--iab-cd-text-color-dark)}.c15t-ui-infoIcon-yoBJo{width:.875rem;height:.875rem;color:var(--iab-cd-text-muted-color);cursor:help}.c15t-dark .c15t-ui-infoIcon-yoBJo{color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-tooltip-klAzU{background-color:var(--iab-cd-background-color);border:1px solid var(--iab-cd-border-color);border-radius:var(--c15t-radius-md);width:16rem;box-shadow:var(--c15t-shadow-lg);color:var(--iab-cd-text-color);z-index:10;opacity:0;visibility:hidden;padding:.5rem;font-size:.75rem;transition:opacity .15s,visibility .15s;position:absolute;top:1.5rem;right:0}.c15t-ui-tooltipVisible-PE80C{opacity:1;visibility:visible}.c15t-dark .c15t-ui-tooltip-klAzU{background-color:var(--iab-cd-background-color-dark);border-color:var(--iab-cd-border-color-dark);color:var(--iab-cd-text-color-dark)}.c15t-ui-vendorListHeader-wt620{background-color:var(--iab-cd-background-color);z-index:10;margin-top:-.75rem;padding-top:.75rem;padding-bottom:.5rem;position:sticky;top:-.75rem}@media (width>=768px){.c15t-ui-vendorListHeader-wt620{margin-top:-1rem;padding-top:1rem;top:-1rem}}.c15t-dark .c15t-ui-vendorListHeader-wt620{background-color:var(--iab-cd-background-color-dark)}.c15t-ui-searchContainer-GGLB3{position:relative}.c15t-ui-searchIcon-Vfyaq{width:.875rem;height:.875rem;color:var(--iab-cd-text-muted-color);position:absolute;top:50%;left:.625rem;transform:translateY(-50%)}.c15t-dark .c15t-ui-searchIcon-Vfyaq{color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-searchInput-Q33NC{border-radius:var(--c15t-radius-md);border:1px solid var(--iab-cd-border-color);background-color:var(--iab-cd-background-color);width:100%;color:var(--iab-cd-text-color);padding:.5rem .75rem .5rem 2rem;font-size:.875rem}.c15t-ui-searchInput-Q33NC:focus{border-color:var(--iab-cd-primary-color);outline:none;box-shadow:0 0 0 2px #3b82f633}.c15t-dark .c15t-ui-searchInput-Q33NC{background-color:var(--iab-cd-background-color-dark);border-color:var(--iab-cd-border-color-dark);color:var(--iab-cd-text-color-dark)}.c15t-ui-vendorCount-LTBE9{color:var(--iab-cd-text-muted-color);margin-top:.375rem;font-size:.75rem}.c15t-dark .c15t-ui-vendorCount-LTBE9{color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-selectedVendorBanner-a9iA2{border-radius:var(--c15t-radius-md);z-index:100;isolation:isolate;background-color:#dbeafe;border:1px solid #3b82f64d;align-items:center;gap:.5rem;margin-bottom:.5rem;padding:.5rem .625rem;display:flex;position:sticky;top:0;box-shadow:0 2px 4px #0000000d}.c15t-dark .c15t-ui-selectedVendorBanner-a9iA2{background-color:#1e3a8a;border-color:#3b82f666}.c15t-ui-selectedVendorText-Pudgx{color:var(--iab-cd-primary-color);flex:1;font-size:.75rem}.c15t-ui-clearSelectionButton-OXp7e{color:var(--iab-cd-primary-color);cursor:pointer;background:0 0;border:none;align-items:center;gap:.25rem;padding:0;font-size:.75rem;display:flex}.c15t-ui-clearSelectionButton-OXp7e:hover{opacity:.8}.c15t-ui-clearIcon-nhj3A{width:.75rem;height:.75rem}.c15t-ui-vendorListItem-yS2cU{z-index:1;border:1px solid var(--iab-cd-border-color);border-radius:var(--c15t-radius-md);margin-bottom:.375rem;scroll-margin-top:6rem;position:relative;overflow:hidden}.c15t-dark .c15t-ui-vendorListItem-yS2cU{border-color:var(--iab-cd-border-color-dark)}.c15t-ui-vendorListItemHeader-v7x4k{align-items:center;gap:.5rem;padding:.625rem;display:flex}.c15t-ui-vendorListTrigger-H5lqi{text-align:left;cursor:pointer;background:0 0;border:none;flex:1;justify-content:space-between;align-items:center;min-width:0;padding:0;display:flex}.c15t-ui-vendorListTrigger-H5lqi:hover{color:var(--iab-cd-primary-color)}.c15t-ui-vendorListInfo-QYJou{flex:1;min-width:0}.c15t-ui-vendorListName-dlnJx{color:var(--iab-cd-text-color);align-items:center;gap:.5rem;margin:0;font-size:.875rem;font-weight:500;display:flex}.c15t-dark .c15t-ui-vendorListName-dlnJx{color:var(--iab-cd-text-color-dark)}.c15t-ui-vendorListMeta-ULPAo{flex-wrap:wrap;align-items:center;gap:.375rem;margin-top:.125rem;display:flex}.c15t-ui-vendorListMetaText-bruFU{color:var(--iab-cd-text-muted-color);font-size:.75rem}.c15t-dark .c15t-ui-vendorListMetaText-bruFU{color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-vendorListLIBadge-cnZi7{color:var(--iab-cd-text-muted-color);align-items:center;gap:.125rem;font-size:.625rem;font-weight:500;display:inline-flex}.c15t-ui-vendorListContent-Jo1kN{border-top:1px solid var(--iab-cd-border-color);background-color:var(--iab-cd-surface-hover);padding:0 .625rem .625rem}.c15t-dark .c15t-ui-vendorListContent-Jo1kN{border-color:var(--iab-cd-border-color-dark);background-color:var(--iab-cd-surface-hover-dark)}.c15t-ui-vendorLinks-MqbfV{padding-top:.5rem}.c15t-ui-vendorLink-sfRW9{color:var(--iab-cd-primary-color);align-items:center;gap:.25rem;margin-right:.75rem;font-size:.75rem;text-decoration:none;display:inline-flex}.c15t-ui-vendorLink-sfRW9:hover{text-decoration:underline}.c15t-ui-vendorLinkIcon-XFOjn{width:.75rem;height:.75rem}.c15t-ui-vendorBadges-mpcxI{flex-wrap:wrap;gap:.5rem;margin-top:.375rem;display:flex}.c15t-ui-vendorBadge-pvgVW{border-radius:var(--c15t-radius-sm);background-color:var(--iab-cd-surface-hover);color:var(--iab-cd-text-muted-color);padding:.125rem .375rem;font-size:.625rem}.c15t-dark .c15t-ui-vendorBadge-pvgVW{background-color:var(--iab-cd-surface-hover-dark);color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-vendorPurposesList-LjkUB{margin-top:.5rem}.c15t-ui-vendorPurposesTitle-goJri{color:var(--iab-cd-text-color);align-items:center;gap:.5rem;margin:0 0 .25rem;font-size:.75rem;font-weight:500;display:flex}.c15t-dark .c15t-ui-vendorPurposesTitle-goJri{color:var(--iab-cd-text-color-dark)}.c15t-ui-vendorPurposesItems-lRTbJ{margin:0;padding:0;list-style:none}.c15t-ui-vendorPurposeItem-dsY4R{color:var(--iab-cd-text-muted-color);border-left:2px solid var(--iab-cd-border-color);justify-content:space-between;align-items:center;gap:.5rem;margin-bottom:.125rem;padding-left:.5rem;font-size:.75rem;display:flex}.c15t-dark .c15t-ui-vendorPurposeItem-dsY4R{color:var(--iab-cd-text-muted-color-dark);border-color:var(--iab-cd-border-color-dark)}.c15t-ui-vendorPurposeItemLI-Iv4NY{border-color:var(--iab-cd-text-muted-color);color:var(--iab-cd-text-muted-color)}.c15t-ui-vendorRetention-YFyBS{opacity:.7;font-size:.625rem}.c15t-ui-footer-luLru{border-top:1px solid var(--iab-cd-border-color);background-color:var(--iab-cd-surface-hover);flex-shrink:0;justify-content:space-between;align-items:center;padding:.75rem 1rem;display:flex}.c15t-dark .c15t-ui-footer-luLru{border-color:var(--iab-cd-border-color-dark);background-color:var(--iab-cd-surface-hover-dark)}.c15t-ui-footerButtons-kcS68{gap:.5rem;display:flex}.c15t-ui-footerSpacer-pcXLL{flex:1}.c15t-ui-consentNotice-v9BBK{text-align:center;padding-top:1.5rem}.c15t-dark .c15t-ui-consentNotice-v9BBK{border-color:var(--iab-cd-border-color-dark)}.c15t-ui-consentNoticeText-x_Wq_{color:var(--iab-cd-text-muted-color);margin-block:0;font-size:.625rem}.c15t-dark .c15t-ui-consentNoticeText-x_Wq_{color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-loadingContainer-_P6Gs{flex-direction:column;justify-content:center;align-items:center;gap:.75rem;height:100%;display:flex}.c15t-ui-loadingSpinner-xnPfZ{border:2px solid var(--iab-cd-border-color);border-top-color:var(--iab-cd-primary-color);border-radius:50%;width:1.75rem;height:1.75rem;animation:1s linear infinite c15t-ui-spin-AtPOH}@keyframes c15t-ui-spin-AtPOH{to{transform:rotate(360deg)}}.c15t-ui-loadingText-MM9pG{color:var(--iab-cd-text-muted-color);font-size:.875rem}.c15t-dark .c15t-ui-loadingText-MM9pG{color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-emptyState-kXcux{text-align:center;padding:2rem}.c15t-ui-emptyStateText-bmfpF{color:var(--iab-cd-text-muted-color);margin:0;font-size:.875rem}.c15t-dark .c15t-ui-emptyStateText-bmfpF{color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-branding-pxwbo{border-top:1px solid var(--iab-cd-border-color);color:var(--iab-cd-text-color);justify-content:center;align-items:center;gap:.5rem;padding:.75rem;font-size:.75rem;text-decoration:none;display:flex}.c15t-dark .c15t-ui-branding-pxwbo{border-color:var(--iab-cd-border-color-dark);color:var(--iab-cd-text-color-dark)}.c15t-ui-brandingIcon-N7ULi{width:auto;height:1.25rem}.c15t-ui-vendorSection-jLX4W{z-index:1;margin-bottom:1.5rem;position:relative}.c15t-ui-vendorSectionHeading-VcNql{text-transform:uppercase;letter-spacing:.05em;color:var(--iab-cd-text-muted-color);background:var(--iab-cd-surface-hover-color);border-bottom:1px solid var(--iab-cd-border-color);align-items:center;gap:.5rem;margin:0;padding:.75rem 0;font-size:.75rem;font-weight:600;display:flex}.c15t-dark .c15t-ui-vendorSectionHeading-VcNql{color:var(--iab-cd-text-muted-color-dark);background:var(--iab-cd-surface-hover-color-dark);border-color:var(--iab-cd-border-color-dark)}.c15t-ui-vendorSectionIcon-WYSlx{flex-shrink:0;width:1rem;height:1rem}.c15t-ui-iabVendorSectionHeader-XoOsW{background-color:var(--iab-cd-background-color);border-bottom:1px solid var(--iab-cd-border-color);z-index:10;padding:.5rem 0;position:relative}.c15t-dark .c15t-ui-iabVendorSectionHeader-XoOsW{border-color:var(--iab-cd-border-color-dark);background-color:var(--iab-cd-background-color-dark)}.c15t-ui-iabVendorSectionHeader-XoOsW .c15t-ui-vendorSectionHeading-VcNql{border-bottom:none;padding-bottom:.25rem}.c15t-ui-iabVendorNotice-kcdl1{color:var(--iab-cd-text-muted-color);margin:0;font-size:.6875rem}.c15t-dark .c15t-ui-iabVendorNotice-kcdl1{color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-customVendorSectionHeader-pvTOf{background-color:var(--iab-cd-background-color);border-bottom:1px solid var(--iab-cd-border-color);z-index:10;padding:.5rem 0;position:relative}.c15t-dark .c15t-ui-customVendorSectionHeader-pvTOf{border-color:var(--iab-cd-border-color-dark);background-color:var(--iab-cd-background-color-dark)}.c15t-ui-customVendorSectionHeader-pvTOf .c15t-ui-vendorSectionHeading-VcNql{background:0 0;border-bottom:none;padding-bottom:.25rem}.c15t-ui-customVendorNotice-qL5iK{color:var(--iab-cd-text-muted-color);margin:0;padding:.25rem 0 1rem;font-size:.6875rem}.c15t-dark .c15t-ui-customVendorNotice-qL5iK{color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-customVendorItem-GSwuY{border-left:3px solid var(--iab-cd-primary-color)}.c15t-dark .c15t-ui-customVendorItem-GSwuY{border-left-color:var(--iab-cd-primary-color-dark)}.c15t-ui-customVendorPurposeSection-CHCdx{border-top:1px solid var(--iab-cd-border-color);margin-top:.75rem;padding-top:.75rem}.c15t-dark .c15t-ui-customVendorPurposeSection-CHCdx{border-color:var(--iab-cd-border-color-dark)}.c15t-ui-vendorSectionTitleCustom-T5bOQ{text-transform:uppercase;letter-spacing:.05em;color:var(--iab-cd-primary-color);align-items:center;gap:.375rem;margin:0 0 .5rem;font-size:.625rem;font-weight:600;display:flex}.c15t-dark .c15t-ui-vendorSectionTitleCustom-T5bOQ{color:var(--iab-cd-primary-color-dark)}.c15t-ui-objectButton-TXelw{border-radius:var(--c15t-radius-sm);border:1px solid var(--iab-cd-border-color);color:var(--iab-cd-text-muted-color);cursor:pointer;white-space:nowrap;background-color:#0000;padding:.25rem .5rem;font-size:.6875rem;font-weight:500;transition:background-color .15s,border-color .15s,color .15s}.c15t-ui-objectButton-TXelw:hover{border-color:var(--iab-cd-text-muted-color);color:var(--iab-cd-text-color)}.c15t-ui-objectButtonActive-HK4NE{background-color:var(--iab-cd-text-muted-color);border-color:var(--iab-cd-text-muted-color);color:var(--iab-cd-background-color)}.c15t-ui-objectButtonActive-HK4NE:hover{opacity:.9}.c15t-dark .c15t-ui-objectButton-TXelw{border-color:var(--iab-cd-border-color-dark);color:var(--iab-cd-text-muted-color-dark)}.c15t-dark .c15t-ui-objectButton-TXelw:hover{border-color:var(--iab-cd-text-muted-color-dark);color:var(--iab-cd-text-color-dark)}.c15t-dark .c15t-ui-objectButtonActive-HK4NE{background-color:var(--iab-cd-text-muted-color-dark);border-color:var(--iab-cd-text-muted-color-dark);color:var(--iab-cd-background-color-dark)}.c15t-ui-liExplanation-qSK2Z{color:var(--iab-cd-text-muted-color);background-color:var(--iab-cd-surface-hover);font-size:.6875rem;font-style:italic}.c15t-dark .c15t-ui-liExplanation-qSK2Z{color:var(--iab-cd-text-muted-color-dark);background-color:var(--iab-cd-surface-hover-dark);border-color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-vendorLISection-mrh74{border-top:1px solid var(--iab-cd-border-color);margin-top:.75rem;padding-top:.75rem}.c15t-dark .c15t-ui-vendorLISection-mrh74{border-color:var(--iab-cd-border-color-dark)}.c15t-ui-vendorLISectionHeader-pWhrl{justify-content:space-between;align-items:center;gap:.5rem;margin-bottom:.375rem;display:flex}.c15t-ui-vendorLISectionHeader-pWhrl .c15t-ui-vendorPurposesTitle-goJri{align-items:center;margin:0;display:flex}.c15t-ui-purposeLISection-nKeYo{background-color:var(--iab-cd-surface-hover);border-radius:var(--c15t-radius-sm);border:1px solid var(--iab-cd-border-color);margin:.75rem 0;padding:.75rem}.c15t-dark .c15t-ui-purposeLISection-nKeYo{background-color:var(--iab-cd-surface-hover-dark);border-color:var(--iab-cd-border-color-dark)}.c15t-ui-purposeLISectionHeader-o_SvL{justify-content:space-between;align-items:center;gap:.75rem;margin-bottom:.5rem;display:flex}.c15t-ui-purposeLIInfo-jokDR{color:var(--iab-cd-text-color);align-items:center;gap:.375rem;font-size:.75rem;font-weight:500;display:flex}.c15t-dark .c15t-ui-purposeLIInfo-jokDR{color:var(--iab-cd-text-color-dark)}.c15t-ui-purposeLIInfo-jokDR .c15t-ui-legitimateInterestIcon-MdoA6{flex-shrink:0}@media (prefers-reduced-motion:reduce){.c15t-ui-dialogVisible-PUG1v,.c15t-ui-dialogHidden-FoTkw,.c15t-ui-contentVisible-G8YSA,.c15t-ui-contentHidden-iYnZI,.c15t-ui-overlayVisible-HizR9,.c15t-ui-overlayHidden-IFPwA,.c15t-ui-closeButton-wGCHD,.c15t-ui-tabButton-xZKks,.c15t-ui-tooltip-klAzU,.c15t-ui-objectButton-TXelw{transition:none}.c15t-ui-loadingSpinner-xnPfZ{animation:none}}@media (hover:none){.c15t-ui-closeButton-wGCHD:hover{background-color:#0000}.c15t-ui-tabButton-xZKks:hover{color:var(--iab-cd-text-muted-color)}.c15t-ui-objectButton-TXelw:hover{border-color:var(--iab-cd-border-color);color:var(--iab-cd-text-muted-color)}}}',
					'',
				]),
					(i.locals = {
						root: 'c15t-ui-root-oQ3Q4',
						dialogVisible: 'c15t-ui-dialogVisible-PUG1v',
						dialogHidden: 'c15t-ui-dialogHidden-FoTkw',
						contentVisible: 'c15t-ui-contentVisible-G8YSA',
						contentHidden: 'c15t-ui-contentHidden-iYnZI',
						overlay: 'c15t-ui-overlay-h1Tzu',
						overlayVisible: 'c15t-ui-overlayVisible-HizR9',
						overlayHidden: 'c15t-ui-overlayHidden-IFPwA',
						card: 'c15t-ui-card-iVcxY',
						header: 'c15t-ui-header-q_v_l',
						headerContent: 'c15t-ui-headerContent-BVSE_',
						title: 'c15t-ui-title-Rrshj',
						description: 'c15t-ui-description-wjYno',
						closeButton: 'c15t-ui-closeButton-wGCHD',
						tabsContainer: 'c15t-ui-tabsContainer-aTkFk',
						tabsList: 'c15t-ui-tabsList-BI6D3',
						tabButton: 'c15t-ui-tabButton-xZKks',
						tabIndicator: 'c15t-ui-tabIndicator-bGaYj',
						content: 'c15t-ui-content-HHYIK',
						purposeItem: 'c15t-ui-purposeItem-bTIsY',
						purposeHeader: 'c15t-ui-purposeHeader-foPCp',
						purposeTrigger: 'c15t-ui-purposeTrigger-cB3th',
						purposeArrow: 'c15t-ui-purposeArrow-oJXon',
						purposeInfo: 'c15t-ui-purposeInfo-liE3b',
						purposeName: 'c15t-ui-purposeName-zDAD_',
						lockIcon: 'c15t-ui-lockIcon-G9Bb9',
						purposeMeta: 'c15t-ui-purposeMeta-jIesh',
						legitimateInterestBadge: 'c15t-ui-legitimateInterestBadge-eFgxM',
						legitimateInterestIcon: 'c15t-ui-legitimateInterestIcon-MdoA6',
						purposeContent: 'c15t-ui-purposeContent-ufSwo',
						purposeDescription: 'c15t-ui-purposeDescription-TlhAc',
						examplesToggle: 'c15t-ui-examplesToggle-sX0IF',
						examplesList: 'c15t-ui-examplesList-zB8Gu',
						vendorsToggle: 'c15t-ui-vendorsToggle-uCSbo',
						vendorSection: 'c15t-ui-vendorSection-jLX4W',
						vendorSectionTitle: 'c15t-ui-vendorSectionTitle-ucQyu',
						vendorSectionTitleLI: 'c15t-ui-vendorSectionTitleLI-D_m3R',
						vendorSectionTitleLi: 'c15t-ui-vendorSectionTitleLI-D_m3R',
						vendorRow: 'c15t-ui-vendorRow-ynEOC',
						vendorRowLI: 'c15t-ui-vendorRowLI-j9Z37',
						vendorRowLi: 'c15t-ui-vendorRowLI-j9Z37',
						vendorInfo: 'c15t-ui-vendorInfo-SzGWD',
						vendorName: 'c15t-ui-vendorName-PyL1i',
						customVendorIcon: 'c15t-ui-customVendorIcon-W8oJg',
						vendorDetails: 'c15t-ui-vendorDetails-Ou6m6',
						vendorDetail: 'c15t-ui-vendorDetail-lOMDC',
						vendorDetailLI: 'c15t-ui-vendorDetailLI-NNcid',
						vendorDetailLi: 'c15t-ui-vendorDetailLI-NNcid',
						stackItem: 'c15t-ui-stackItem-VcXtI',
						stackHeader: 'c15t-ui-stackHeader-RZahv',
						stackTrigger: 'c15t-ui-stackTrigger-JqLyX',
						stackInfo: 'c15t-ui-stackInfo-s7JaD',
						stackName: 'c15t-ui-stackName-cYp1z',
						stackMeta: 'c15t-ui-stackMeta-OnclK',
						stackControls: 'c15t-ui-stackControls-uhDRo',
						partialIndicator: 'c15t-ui-partialIndicator-SvNip',
						stackDescription: 'c15t-ui-stackDescription-yd0M5',
						stackContent: 'c15t-ui-stackContent-TId3a',
						specialPurposesSection: 'c15t-ui-specialPurposesSection-pRrtz',
						specialPurposesHeader: 'c15t-ui-specialPurposesHeader-HiKU4',
						specialPurposesTitle: 'c15t-ui-specialPurposesTitle-ZZIyy',
						infoIcon: 'c15t-ui-infoIcon-yoBJo',
						tooltip: 'c15t-ui-tooltip-klAzU',
						tooltipVisible: 'c15t-ui-tooltipVisible-PE80C',
						vendorListHeader: 'c15t-ui-vendorListHeader-wt620',
						searchContainer: 'c15t-ui-searchContainer-GGLB3',
						searchIcon: 'c15t-ui-searchIcon-Vfyaq',
						searchInput: 'c15t-ui-searchInput-Q33NC',
						vendorCount: 'c15t-ui-vendorCount-LTBE9',
						selectedVendorBanner: 'c15t-ui-selectedVendorBanner-a9iA2',
						selectedVendorText: 'c15t-ui-selectedVendorText-Pudgx',
						clearSelectionButton: 'c15t-ui-clearSelectionButton-OXp7e',
						clearIcon: 'c15t-ui-clearIcon-nhj3A',
						vendorListItem: 'c15t-ui-vendorListItem-yS2cU',
						vendorListItemHeader: 'c15t-ui-vendorListItemHeader-v7x4k',
						vendorListTrigger: 'c15t-ui-vendorListTrigger-H5lqi',
						vendorListInfo: 'c15t-ui-vendorListInfo-QYJou',
						vendorListName: 'c15t-ui-vendorListName-dlnJx',
						vendorListMeta: 'c15t-ui-vendorListMeta-ULPAo',
						vendorListMetaText: 'c15t-ui-vendorListMetaText-bruFU',
						vendorListLIBadge: 'c15t-ui-vendorListLIBadge-cnZi7',
						vendorListLiBadge: 'c15t-ui-vendorListLIBadge-cnZi7',
						vendorListContent: 'c15t-ui-vendorListContent-Jo1kN',
						vendorLinks: 'c15t-ui-vendorLinks-MqbfV',
						vendorLink: 'c15t-ui-vendorLink-sfRW9',
						vendorLinkIcon: 'c15t-ui-vendorLinkIcon-XFOjn',
						vendorBadges: 'c15t-ui-vendorBadges-mpcxI',
						vendorBadge: 'c15t-ui-vendorBadge-pvgVW',
						vendorPurposesList: 'c15t-ui-vendorPurposesList-LjkUB',
						vendorPurposesTitle: 'c15t-ui-vendorPurposesTitle-goJri',
						vendorPurposesItems: 'c15t-ui-vendorPurposesItems-lRTbJ',
						vendorPurposeItem: 'c15t-ui-vendorPurposeItem-dsY4R',
						vendorPurposeItemLI: 'c15t-ui-vendorPurposeItemLI-Iv4NY',
						vendorPurposeItemLi: 'c15t-ui-vendorPurposeItemLI-Iv4NY',
						vendorRetention: 'c15t-ui-vendorRetention-YFyBS',
						footer: 'c15t-ui-footer-luLru',
						footerButtons: 'c15t-ui-footerButtons-kcS68',
						footerSpacer: 'c15t-ui-footerSpacer-pcXLL',
						consentNotice: 'c15t-ui-consentNotice-v9BBK',
						consentNoticeText: 'c15t-ui-consentNoticeText-x_Wq_',
						loadingContainer: 'c15t-ui-loadingContainer-_P6Gs',
						loadingSpinner: 'c15t-ui-loadingSpinner-xnPfZ',
						spin: 'c15t-ui-spin-AtPOH',
						loadingText: 'c15t-ui-loadingText-MM9pG',
						emptyState: 'c15t-ui-emptyState-kXcux',
						emptyStateText: 'c15t-ui-emptyStateText-bmfpF',
						branding: 'c15t-ui-branding-pxwbo',
						brandingIcon: 'c15t-ui-brandingIcon-N7ULi',
						vendorSectionHeading: 'c15t-ui-vendorSectionHeading-VcNql',
						vendorSectionIcon: 'c15t-ui-vendorSectionIcon-WYSlx',
						iabVendorSectionHeader: 'c15t-ui-iabVendorSectionHeader-XoOsW',
						iabVendorNotice: 'c15t-ui-iabVendorNotice-kcdl1',
						customVendorSectionHeader:
							'c15t-ui-customVendorSectionHeader-pvTOf',
						customVendorNotice: 'c15t-ui-customVendorNotice-qL5iK',
						customVendorItem: 'c15t-ui-customVendorItem-GSwuY',
						customVendorPurposeSection:
							'c15t-ui-customVendorPurposeSection-CHCdx',
						vendorSectionTitleCustom: 'c15t-ui-vendorSectionTitleCustom-T5bOQ',
						objectButton: 'c15t-ui-objectButton-TXelw',
						objectButtonActive: 'c15t-ui-objectButtonActive-HK4NE',
						liExplanation: 'c15t-ui-liExplanation-qSK2Z',
						vendorLISection: 'c15t-ui-vendorLISection-mrh74',
						vendorLiSection: 'c15t-ui-vendorLISection-mrh74',
						vendorLISectionHeader: 'c15t-ui-vendorLISectionHeader-pWhrl',
						vendorLiSectionHeader: 'c15t-ui-vendorLISectionHeader-pWhrl',
						purposeLISection: 'c15t-ui-purposeLISection-nKeYo',
						purposeLiSection: 'c15t-ui-purposeLISection-nKeYo',
						purposeLISectionHeader: 'c15t-ui-purposeLISectionHeader-o_SvL',
						purposeLiSectionHeader: 'c15t-ui-purposeLISectionHeader-o_SvL',
						purposeLIInfo: 'c15t-ui-purposeLIInfo-jokDR',
						purposeLiInfo: 'c15t-ui-purposeLIInfo-jokDR',
					});
				let a = i;
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'(
				e
			) {
				e.exports = function (t) {
					var o = [];
					return (
						(o.toString = function () {
							return this.map(function (n) {
								var r = '',
									s = n[5] !== void 0;
								return (
									n[4] && (r += '@supports ('.concat(n[4], ') {')),
									n[2] && (r += '@media '.concat(n[2], ' {')),
									s &&
										(r += '@layer'.concat(
											n[5].length > 0 ? ' '.concat(n[5]) : '',
											' {'
										)),
									(r += t(n)),
									s && (r += '}'),
									n[2] && (r += '}'),
									n[4] && (r += '}'),
									r
								);
							}).join('');
						}),
						(o.i = function (n, r, s, i, a) {
							typeof n == 'string' && (n = [[null, n, void 0]]);
							var l = {};
							if (s)
								for (var u = 0; u < this.length; u++) {
									var m = this[u][0];
									m != null && (l[m] = !0);
								}
							for (var p = 0; p < n.length; p++) {
								var d = [].concat(n[p]);
								(s && l[d[0]]) ||
									(a !== void 0 &&
										(d[5] === void 0 ||
											(d[1] = '@layer'
												.concat(d[5].length > 0 ? ' '.concat(d[5]) : '', ' {')
												.concat(d[1], '}')),
										(d[5] = a)),
									r &&
										(d[2] &&
											(d[1] = '@media '.concat(d[2], ' {').concat(d[1], '}')),
										(d[2] = r)),
									i &&
										(d[4]
											? ((d[1] = '@supports ('
													.concat(d[4], ') {')
													.concat(d[1], '}')),
												(d[4] = i))
											: (d[4] = ''.concat(i))),
									o.push(d));
							}
						}),
						o
					);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'(
				e
			) {
				e.exports = function (t) {
					return t[1];
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'(
				e
			) {
				var t = [];
				function o(r) {
					for (var s = -1, i = 0; i < t.length; i++)
						if (t[i].identifier === r) {
							s = i;
							break;
						}
					return s;
				}
				function n(r, s) {
					for (var i = {}, a = [], l = 0; l < r.length; l++) {
						var u = r[l],
							m = s.base ? u[0] + s.base : u[0],
							p = i[m] || 0,
							d = ''.concat(m, ' ').concat(p);
						i[m] = p + 1;
						var f = o(d),
							h = {
								css: u[1],
								media: u[2],
								sourceMap: u[3],
								supports: u[4],
								layer: u[5],
							};
						if (f !== -1) t[f].references++, t[f].updater(h);
						else {
							var x = (function (b, y) {
								var C = y.domAPI(y);
								return (
									C.update(b),
									function (g) {
										g
											? (g.css !== b.css ||
													g.media !== b.media ||
													g.sourceMap !== b.sourceMap ||
													g.supports !== b.supports ||
													g.layer !== b.layer) &&
												C.update((b = g))
											: C.remove();
									}
								);
							})(h, s);
							(s.byIndex = l),
								t.splice(l, 0, { identifier: d, updater: x, references: 1 });
						}
						a.push(d);
					}
					return a;
				}
				e.exports = function (r, s) {
					var i = n((r = r || []), (s = s || {}));
					return function (a) {
						a = a || [];
						for (var l = 0; l < i.length; l++) {
							var u = o(i[l]);
							t[u].references--;
						}
						for (var m = n(a, s), p = 0; p < i.length; p++) {
							var d = o(i[p]);
							t[d].references === 0 && (t[d].updater(), t.splice(d, 1));
						}
						i = m;
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'(
				e
			) {
				var t = {};
				e.exports = function (o, n) {
					var r = (function (s) {
						if (t[s] === void 0) {
							var i = document.querySelector(s);
							if (
								window.HTMLIFrameElement &&
								i instanceof window.HTMLIFrameElement
							)
								try {
									i = i.contentDocument.head;
								} catch {
									i = null;
								}
							t[s] = i;
						}
						return t[s];
					})(o);
					if (!r)
						throw Error(
							"Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid."
						);
					r.appendChild(n);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'(
				e
			) {
				e.exports = function (t) {
					var o = document.createElement('style');
					return t.setAttributes(o, t.attributes), t.insert(o, t.options), o;
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'(
				e,
				t,
				o
			) {
				e.exports = function (n) {
					var r = o.nc;
					r && n.setAttribute('nonce', r);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'(
				e
			) {
				e.exports = function (t) {
					if (typeof document > 'u')
						return { update: function () {}, remove: function () {} };
					var o = t.insertStyleElement(t);
					return {
						update: function (n) {
							var r, s, i;
							(r = ''),
								n.supports && (r += '@supports ('.concat(n.supports, ') {')),
								n.media && (r += '@media '.concat(n.media, ' {')),
								(s = n.layer !== void 0) &&
									(r += '@layer'.concat(
										n.layer.length > 0 ? ' '.concat(n.layer) : '',
										' {'
									)),
								(r += n.css),
								s && (r += '}'),
								n.media && (r += '}'),
								n.supports && (r += '}'),
								(i = n.sourceMap) &&
									typeof btoa < 'u' &&
									(r += `
/*# sourceMappingURL=data:application/json;base64,`.concat(
										btoa(unescape(encodeURIComponent(JSON.stringify(i)))),
										' */'
									)),
								t.styleTagTransform(r, o, t.options);
						},
						remove: function () {
							var n;
							(n = o).parentNode === null || n.parentNode.removeChild(n);
						},
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'(
				e
			) {
				e.exports = function (t, o) {
					if (o.styleSheet) o.styleSheet.cssText = t;
					else {
						for (; o.firstChild; ) o.removeChild(o.firstChild);
						o.appendChild(document.createTextNode(t));
					}
				};
			},
		},
		km = {};
	function we(e) {
		var t = km[e];
		if (t !== void 0) return t.exports;
		var o = (km[e] = { id: e, exports: {} });
		return Sv[e](o, o.exports, we), o.exports;
	}
	(we.n = (e) => {
		var t = e && e.__esModule ? () => e.default : () => e;
		return we.d(t, { a: t }), t;
	}),
		(we.d = (e, t) => {
			for (var o in t)
				we.o(t, o) &&
					!we.o(e, o) &&
					Object.defineProperty(e, o, { enumerable: !0, get: t[o] });
		}),
		(we.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t)),
		(we.nc = void 0);
	var kv = we(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'
		),
		wv = we.n(kv),
		Iv = we(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'
		),
		_v = we.n(Iv),
		Rv = we(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'
		),
		Tv = we.n(Rv),
		Av = we(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'
		),
		Lv = we.n(Av),
		Ev = we(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'
		),
		Nv = we.n(Ev),
		Pv = we(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'
		),
		Bv = we.n(Pv),
		Is = we(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/components/iab-consent-dialog.module.css'
		),
		Jo = {};
	(Jo.styleTagTransform = Bv()),
		(Jo.setAttributes = Lv()),
		(Jo.insert = Tv().bind(null, 'head')),
		(Jo.domAPI = _v()),
		(Jo.insertStyleElement = Nv()),
		wv()(Is.A, Jo);
	var v = Is.A && Is.A.locals ? Is.A.locals : void 0;
	var Fa = T(({ children: e, className: t, ...o }, n) => {
		let { trapFocus: r } = te(),
			{ activeUI: s } = q(),
			i = Oe(),
			[a, l] = P(!1),
			u = s === 'dialog';
		return (
			st(!!(u && r), n),
			M(() => {
				if (u) l(!0);
				else {
					let m = setTimeout(() => {
						l(!1);
					}, 150);
					return () => clearTimeout(m);
				}
			}, [u]),
			c('div', {
				ref: n,
				...X('iabConsentDialogCard', {
					baseClassName: Fe(v.card, a ? v.contentVisible : v.contentHidden),
					className: t,
				}),
				role: 'dialog',
				'aria-modal': r ? 'true' : void 0,
				'aria-label': i.preferenceCenter.title,
				tabIndex: 0,
				'data-testid': 'iab-consent-dialog-card',
				...o,
				children: e,
			})
		);
	});
	Fa.displayName = 'IABConsentDialogCard';
	var Ua = T(({ children: e, className: t, ...o }, n) =>
		c('div', {
			ref: n,
			className: t ? `${v.content} ${t}` : v.content,
			...o,
			children: e,
		})
	);
	Ua.displayName = 'IABConsentDialogContent';
	function _s() {
		let { iab: e } = q(),
			{
				purposes: t,
				specialPurposes: o,
				specialFeatures: n,
				features: r,
				stacks: s,
				standalonePurposes: i,
			} = J(() => {
				if (!e?.gvl)
					return {
						purposes: [],
						specialPurposes: [],
						specialFeatures: [],
						features: [],
						stacks: [],
						standalonePurposes: [],
					};
				let a = e.gvl,
					l = e.nonIABVendors || [],
					u = (I, _, O) => ({
						id: Number(I),
						name: _.name,
						policyUrl: _.policyUrl ?? '',
						usesNonCookieAccess: _.usesNonCookieAccess,
						deviceStorageDisclosureUrl: _.deviceStorageDisclosureUrl ?? null,
						usesCookies: _.usesCookies,
						cookieMaxAgeSeconds: _.cookieMaxAgeSeconds,
						specialPurposes: _.specialPurposes || [],
						specialFeatures: _.specialFeatures || [],
						features: _.features || [],
						purposes: _.purposes || [],
						legIntPurposes: _.legIntPurposes || [],
						usesLegitimateInterest:
							!!O && (_.legIntPurposes?.includes(O) ?? !1),
						isCustom: !1,
					}),
					m = Object.entries(a.purposes)
						.map(([I, _]) => {
							let O = Object.entries(a.vendors)
									.filter(
										([, E]) =>
											E.purposes?.includes(Number(I)) ||
											E.legIntPurposes?.includes(Number(I))
									)
									.map(([E, L]) => u(E, L, Number(I))),
								B = l
									.filter(
										(E) =>
											E.purposes?.includes(Number(I)) ||
											E.legIntPurposes?.includes(Number(I))
									)
									.map((E) => {
										let L;
										return (
											(L = Number(I)),
											{
												id: E.id,
												name: E.name,
												policyUrl: E.privacyPolicyUrl,
												usesNonCookieAccess: E.usesNonCookieAccess ?? !1,
												deviceStorageDisclosureUrl: null,
												usesCookies: E.usesCookies ?? !1,
												cookieMaxAgeSeconds: E.cookieMaxAgeSeconds ?? null,
												specialPurposes: [],
												specialFeatures: E.specialFeatures || [],
												features: E.features || [],
												purposes: E.purposes || [],
												legIntPurposes: E.legIntPurposes || [],
												usesLegitimateInterest:
													!!L && (E.legIntPurposes?.includes(L) ?? !1),
												isCustom: !0,
											}
										);
									});
							return {
								id: Number(I),
								name: _.name,
								description: _.description,
								descriptionLegal: _.descriptionLegal,
								illustrations: _.illustrations || [],
								vendors: [...O, ...B],
							};
						})
						.filter((I) => I.vendors.length > 0),
					p = Object.entries(a.specialPurposes || {})
						.map(([I, _]) => {
							let O = Object.entries(a.vendors)
								.filter(([, B]) => B.specialPurposes?.includes(Number(I)))
								.map(([B, E]) => u(B, E));
							return {
								id: Number(I),
								name: _.name,
								description: _.description,
								descriptionLegal: _.descriptionLegal,
								illustrations: _.illustrations || [],
								vendors: O,
								isSpecialPurpose: !0,
							};
						})
						.filter((I) => I.vendors.length > 0),
					d = Object.entries(a.specialFeatures || {})
						.map(([I, _]) => {
							let O = Object.entries(a.vendors)
								.filter(([, B]) => B.specialFeatures?.includes(Number(I)))
								.map(([B, E]) => u(B, E));
							return {
								id: Number(I),
								name: _.name,
								description: _.description,
								descriptionLegal: _.descriptionLegal,
								illustrations: _.illustrations || [],
								vendors: O,
							};
						})
						.filter((I) => I.vendors.length > 0),
					f = Object.entries(a.features || {})
						.map(([I, _]) => {
							let O = Object.entries(a.vendors)
								.filter(([, B]) => B.features?.includes(Number(I)))
								.map(([B, E]) => u(B, E));
							return {
								id: Number(I),
								name: _.name,
								description: _.description,
								descriptionLegal: _.descriptionLegal,
								illustrations: _.illustrations || [],
								vendors: O,
							};
						})
						.filter((I) => I.vendors.length > 0),
					h = m.find((I) => I.id === 1),
					x = m.filter((I) => I.id !== 1),
					b = new Set(x.map((I) => I.id)),
					y = a.stacks || {},
					C = [];
				for (let [I, _] of Object.entries(y)) {
					let O = Number(I),
						B = _.purposes.filter((E) => b.has(E));
					B.length >= 2 &&
						C.push({
							stackId: O,
							stack: _,
							coveredPurposeIds: B,
							score: B.length,
						});
				}
				C.sort((I, _) => _.score - I.score);
				let g = [],
					S = new Set();
				for (let { stackId: I, stack: _, coveredPurposeIds: O } of C) {
					let B = O.filter((E) => !S.has(E));
					if (B.length >= 2) {
						let E = x.filter((L) => B.includes(L.id));
						for (let L of (g.push({
							id: I,
							name: _.name,
							description: _.description,
							purposes: E,
						}),
						B))
							S.add(L);
					}
				}
				let A = x.filter((I) => !S.has(I.id));
				return {
					purposes: m,
					specialPurposes: p,
					specialFeatures: d,
					features: f,
					stacks: g,
					standalonePurposes: h ? [h, ...A] : A,
				};
			}, [e?.gvl, e?.nonIABVendors]);
		return {
			purposes: t,
			specialPurposes: o,
			specialFeatures: n,
			features: r,
			stacks: s,
			standalonePurposes: i,
			totalVendors: J(
				() =>
					e?.gvl
						? Object.keys(e.gvl.vendors).length + (e.nonIABVendors?.length ?? 0)
						: 0,
				[e?.gvl, e?.nonIABVendors]
			),
			isLoading: !!(e?.isLoadingGVL || !e?.gvl),
		};
	}
	var Ha = T(({ children: e, className: t, ...o }, n) => {
		let { iab: r, setActiveUI: s } = q(),
			i = Oe(),
			{ isLoading: a } = _s();
		return c('div', {
			ref: n,
			...X('iabConsentDialogFooter', { baseClassName: v.footer, className: t }),
			...o,
			children:
				e ||
				c(W, {
					children: [
						c('div', {
							className: v.footerButtons,
							children: [
								c(Ze, {
									variant: 'neutral',
									mode: 'stroke',
									size: 'small',
									onClick: () => {
										r?.rejectAll(), r?.save(), s('none');
									},
									disabled: a,
									children: i.common.rejectAll,
								}),
								c(Ze, {
									variant: 'neutral',
									mode: 'stroke',
									size: 'small',
									onClick: () => {
										r?.acceptAll(), r?.save(), s('none');
									},
									disabled: a,
									children: i.common.acceptAll,
								}),
							],
						}),
						c('div', { className: v.footerSpacer }),
						c(Ze, {
							variant: 'primary',
							mode: 'filled',
							size: 'small',
							onClick: () => {
								r?.save(), s('none');
							},
							disabled: a,
							children: i.common.saveSettings,
						}),
					],
				}),
		});
	});
	Ha.displayName = 'IABConsentDialogFooter';
	var za = T(
		(
			{
				children: e,
				headerTitle: t,
				description: o,
				showCloseButton: n = !0,
				className: r,
			},
			s
		) => {
			let { setActiveUI: i } = q(),
				a = Oe();
			return c('div', {
				ref: s,
				...X('iabConsentDialogHeader', {
					baseClassName: v.header,
					className: r,
				}),
				children:
					e ||
					c(W, {
						children: [
							c('div', {
								className: v.headerContent,
								children: [
									c('h2', {
										className: v.title,
										children: t ?? a.preferenceCenter.title,
									}),
									c('p', {
										className: v.description,
										children: o ?? a.preferenceCenter.description,
									}),
								],
							}),
							n &&
								c('button', {
									type: 'button',
									onClick: () => {
										i('none');
									},
									className: v.closeButton,
									'aria-label': 'Close',
									children: c('svg', {
										style: { width: '1rem', height: '1rem' },
										viewBox: '0 0 24 24',
										fill: 'none',
										stroke: 'currentColor',
										strokeWidth: '2',
										children: [
											c('line', { x1: '18', y1: '6', x2: '6', y2: '18' }),
											c('line', { x1: '6', y1: '6', x2: '18', y2: '18' }),
										],
									}),
								}),
						],
					}),
			});
		}
	);
	za.displayName = 'IABConsentDialogHeader';
	var uo = T(({ className: e, style: t, noStyle: o, isOpen: n, ...r }, s) => {
		let i,
			{ disableAnimation: a, noStyle: l, scrollLock: u } = te(),
			[m, p] = P(!1);
		M(() => {
			if (n) p(!0);
			else if (a) p(!1);
			else {
				let h = setTimeout(
					() => {
						p(!1);
					},
					Number.parseInt(
						getComputedStyle(document.documentElement).getPropertyValue(
							'--iab-cd-animation-duration'
						) || '150',
						10
					)
				);
				return () => clearTimeout(h);
			}
		}, [n, a]);
		let d = X('iabConsentDialogOverlay', {
			baseClassName: !(l || o) && v.overlay,
			className: e,
			noStyle: l || o,
		});
		l || o || a || (i = m ? v.overlayVisible : v.overlayHidden);
		let f = Fe(d.className, i);
		return (
			ot(!!(n && u)),
			n
				? c('div', {
						ref: s,
						...r,
						className: f,
						style: { ...d.style, ...t },
						'data-testid': 'iab-consent-dialog-overlay',
					})
				: null
		);
	});
	uo.displayName = 'IABConsentDialogOverlay';
	var _t = ({
		isOpen: e,
		children: t,
		duration: o = 250,
		easing: n = 'cubic-bezier(0.33, 1, 0.68, 1)',
		className: r,
	}) => {
		let s = z(null),
			i = z(null),
			a = z(null),
			[l, u] = P(e),
			[m, p] = P(!1),
			[d, f] = P({
				height: e ? 'auto' : 0,
				overflow: e ? 'visible' : 'hidden',
				transition: 'none',
			});
		return (
			Ye(() => {
				let h = s.current,
					x = i.current;
				if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
					u(e),
						p(!1),
						f({
							height: e ? 'auto' : 0,
							overflow: e ? 'visible' : 'hidden',
							transition: 'none',
						});
					return;
				}
				if ((a.current !== null && cancelAnimationFrame(a.current), e))
					u(!0),
						p(!0),
						(a.current = requestAnimationFrame(() => {
							let b = i.current;
							if (!b) return void p(!1);
							let y = b.scrollHeight;
							f({ height: 0, overflow: 'hidden', transition: 'none' }),
								requestAnimationFrame(() => {
									f({
										height: y,
										overflow: 'hidden',
										transition: `height ${o}ms ${n}`,
									});
									let C = (g) => {
										g.propertyName === 'height' &&
											(f({
												height: 'auto',
												overflow: 'visible',
												transition: 'none',
											}),
											p(!1),
											h?.removeEventListener('transitionend', C));
									};
									h?.addEventListener('transitionend', C);
								});
						}));
				else {
					if (!h || !x) {
						u(!1),
							p(!1),
							f({ height: 0, overflow: 'hidden', transition: 'none' });
						return;
					}
					p(!0),
						f({
							height: x.scrollHeight,
							overflow: 'hidden',
							transition: 'none',
						}),
						(a.current = requestAnimationFrame(() => {
							h.offsetHeight,
								f({
									height: 0,
									overflow: 'hidden',
									transition: `height ${o}ms ${n}`,
								});
							let b = (y) => {
								y.propertyName === 'height' &&
									(u(!1), p(!1), h.removeEventListener('transitionend', b));
							};
							h.addEventListener('transitionend', b);
						}));
				}
				return () => {
					a.current !== null && cancelAnimationFrame(a.current);
				};
			}, [e, o, n]),
			e || l || m
				? c('div', {
						ref: s,
						className: r,
						style: {
							height: d.height,
							overflow: d.overflow,
							transition: d.transition,
						},
						children:
							l &&
							c('div', { ref: i, style: { overflow: 'hidden' }, children: t }),
					})
				: null
		);
	};
	_t.displayName = 'AnimatedCollapse';
	var Bt = ({
			purpose: e,
			isEnabled: t,
			onToggle: o,
			vendorConsents: n,
			onVendorToggle: r,
			onVendorClick: s,
			isLocked: i = !1,
			vendorLegitimateInterests: a = {},
			onVendorLegitimateInterestToggle: l,
			purposeLegitimateInterests: u = {},
			onPurposeLegitimateInterestToggle: m,
		}) => {
			let [p, d] = P(!1),
				[f, h] = P(!1),
				[x, b] = P(!1),
				y = Oe(),
				C = e.vendors.filter((L) => L.usesLegitimateInterest),
				g = e.vendors.filter((L) => !L.usesLegitimateInterest),
				S = (L) => n[String(L)] ?? !1,
				A = (L) => a[String(L)] ?? !0,
				I = u[e.id] ?? !0,
				_ = g.filter((L) => !L.isCustom),
				O = g.filter((L) => L.isCustom),
				B = C.filter((L) => !L.isCustom),
				E = C.filter((L) => L.isCustom);
			return c('div', {
				className: v.purposeItem,
				'data-testid': `purpose-item-${e.id}`,
				children: [
					c('div', {
						className: v.purposeHeader,
						children: [
							c('button', {
								type: 'button',
								onClick: () => d(!p),
								className: v.purposeTrigger,
								children: [
									c('svg', {
										className: v.purposeArrow,
										viewBox: '0 0 24 24',
										fill: 'none',
										stroke: 'currentColor',
										strokeWidth: '2',
										children: p
											? c('path', { d: 'M19 9l-7 7-7-7' })
											: c('path', { d: 'M9 5l7 7-7 7' }),
									}),
									c('div', {
										className: v.purposeInfo,
										children: [
											c('h3', {
												className: v.purposeName,
												children: [
													e.name,
													i &&
														c('svg', {
															className: v.lockIcon,
															viewBox: '0 0 24 24',
															fill: 'none',
															stroke: 'currentColor',
															strokeWidth: '2',
															children: [
																c('rect', {
																	x: '3',
																	y: '11',
																	width: '18',
																	height: '11',
																	rx: '2',
																	ry: '2',
																}),
																c('path', { d: 'M7 11V7a5 5 0 0 1 10 0v4' }),
															],
														}),
												],
											}),
											c('p', {
												className: v.purposeMeta,
												children:
													y.preferenceCenter.purposeItem.partners.replace(
														'{count}',
														String(e.vendors.length)
													),
											}),
											C.length > 0 &&
												c('div', {
													className: v.legitimateInterestBadge,
													children: [
														c('svg', {
															className: v.legitimateInterestIcon,
															viewBox: '0 0 24 24',
															fill: 'none',
															stroke: 'currentColor',
															strokeWidth: '2',
															children: c('path', {
																d: 'M12 3v18M3 12h18M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07',
															}),
														}),
														y.preferenceCenter.purposeItem.vendorsUseLegitimateInterest.replace(
															'{count}',
															String(C.length)
														),
													],
												}),
										],
									}),
								],
							}),
							c(It, {
								checked: t,
								onCheckedChange: (L) => {
									for (let H of (o(L), g)) r(H.id, L);
								},
								disabled: i,
							}),
						],
					}),
					c(_t, {
						isOpen: p,
						children: c('div', {
							className: v.purposeContent,
							children: [
								c('p', {
									className: v.purposeDescription,
									children: e.description,
								}),
								C.length > 0 &&
									m &&
									c('div', {
										className: v.purposeLISection,
										children: [
											c('div', {
												className: v.purposeLISectionHeader,
												children: [
													c('div', {
														className: v.purposeLIInfo,
														children: [
															c('svg', {
																className: v.legitimateInterestIcon,
																viewBox: '0 0 24 24',
																fill: 'none',
																stroke: 'currentColor',
																strokeWidth: '2',
																children: c('path', {
																	d: 'M12 3v18M3 12h18M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07',
																}),
															}),
															c('span', {
																children:
																	y.preferenceCenter.purposeItem.vendorsUseLegitimateInterest.replace(
																		'{count}',
																		String(C.length)
																	),
															}),
														],
													}),
													c('button', {
														type: 'button',
														onClick: () => {
															let L = !I;
															if ((m && m(e.id, L), l))
																for (let H of C) l(H.id, L);
														},
														className: `${v.objectButton} ${I ? '' : v.objectButtonActive}`,
														'aria-pressed': !I,
														children: I
															? y.preferenceCenter.purposeItem.objectButton
															: y.preferenceCenter.purposeItem.objected,
													}),
												],
											}),
											c('p', {
												className: v.liExplanation,
												children: y.preferenceCenter.purposeItem.rightToObject,
											}),
										],
									}),
								C.length > 0 &&
									!m &&
									c('div', {
										className: v.legitimateInterestBadge,
										children: [
											c('svg', {
												className: v.legitimateInterestIcon,
												viewBox: '0 0 24 24',
												fill: 'none',
												stroke: 'currentColor',
												strokeWidth: '2',
												children: c('path', {
													d: 'M12 3v18M3 12h18M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07',
												}),
											}),
											y.preferenceCenter.purposeItem.vendorsUseLegitimateInterest.replace(
												'{count}',
												String(C.length)
											),
										],
									}),
								e.illustrations &&
									e.illustrations.length > 0 &&
									c('div', {
										children: [
											c('button', {
												type: 'button',
												onClick: () => h(!f),
												className: v.examplesToggle,
												children: [
													c('svg', {
														style: { width: '0.75rem', height: '0.75rem' },
														viewBox: '0 0 24 24',
														fill: 'none',
														stroke: 'currentColor',
														strokeWidth: '2',
														children: f
															? c('path', { d: 'M19 9l-7 7-7-7' })
															: c('path', { d: 'M9 5l7 7-7 7' }),
													}),
													y.preferenceCenter.purposeItem.examples,
													' (',
													e.illustrations.length,
													')',
												],
											}),
											c(_t, {
												isOpen: f,
												children: c('ul', {
													className: v.examplesList,
													children: e.illustrations.map((L, H) =>
														c('li', { children: L }, H)
													),
												}),
											}),
										],
									}),
								c('div', {
									children: [
										c('button', {
											type: 'button',
											onClick: () => b(!x),
											className: v.vendorsToggle,
											children: [
												c('svg', {
													style: { width: '0.75rem', height: '0.75rem' },
													viewBox: '0 0 24 24',
													fill: 'none',
													stroke: 'currentColor',
													strokeWidth: '2',
													children: x
														? c('path', { d: 'M19 9l-7 7-7-7' })
														: c('path', { d: 'M9 5l7 7-7 7' }),
												}),
												y.preferenceCenter.purposeItem.partnersUsingPurpose,
												' (',
												e.vendors.length,
												')',
											],
										}),
										c(_t, {
											isOpen: x,
											children: c('div', {
												className: v.vendorSection,
												children: [
													_.length > 0 &&
														c(W, {
															children: [
																c('h5', {
																	className: v.vendorSectionTitle,
																	children: [
																		y.preferenceCenter.purposeItem
																			.withYourPermission,
																		' (',
																		_.length,
																		')',
																	],
																}),
																_.map((L) =>
																	c(
																		Rs,
																		{
																			vendor: L,
																			isConsented: S(L.id),
																			onToggle: (H) => r(L.id, H),
																			onClick: () => s(L.id),
																		},
																		L.id
																	)
																),
															],
														}),
													B.length > 0 &&
														c(W, {
															children: [
																c('h5', {
																	className: `${v.vendorSectionTitle} ${v.vendorSectionTitleLI}`,
																	children: [
																		c('svg', {
																			style: {
																				width: '0.75rem',
																				height: '0.75rem',
																			},
																			viewBox: '0 0 24 24',
																			fill: 'none',
																			stroke: 'currentColor',
																			strokeWidth: '2',
																			children: c('path', {
																				d: 'M12 3v18M3 12h18M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07',
																			}),
																		}),
																		y.preferenceCenter.purposeItem
																			.legitimateInterest,
																		' (',
																		B.length,
																		')',
																	],
																}),
																c('p', {
																	className: v.liExplanation,
																	children:
																		y.preferenceCenter.purposeItem
																			.rightToObject,
																}),
																B.map((L) =>
																	c(
																		Rs,
																		{
																			vendor: L,
																			isConsented: S(L.id),
																			onToggle: (H) => r(L.id, H),
																			onClick: () => s(L.id),
																			isLegitimateInterest: !0,
																			isLegitimateInterestAllowed: A(L.id),
																			onLegitimateInterestToggle: l
																				? (H) => l(L.id, H)
																				: void 0,
																		},
																		L.id
																	)
																),
															],
														}),
													(O.length > 0 || E.length > 0) &&
														c('div', {
															className: v.customVendorPurposeSection,
															children: [
																c('h5', {
																	className: v.vendorSectionTitleCustom,
																	children: [
																		c('svg', {
																			style: {
																				width: '0.75rem',
																				height: '0.75rem',
																			},
																			viewBox: '0 0 24 24',
																			fill: 'none',
																			stroke: 'currentColor',
																			strokeWidth: '2',
																			children: [
																				c('circle', {
																					cx: '12',
																					cy: '12',
																					r: '10',
																				}),
																				c('line', {
																					x1: '2',
																					y1: '12',
																					x2: '22',
																					y2: '12',
																				}),
																				c('path', {
																					d: 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
																				}),
																			],
																		}),
																		y.preferenceCenter.vendorList
																			.customVendorsHeading,
																		' (',
																		O.length + E.length,
																		')',
																	],
																}),
																O.map((L) =>
																	c(
																		Rs,
																		{
																			vendor: L,
																			isConsented: S(L.id),
																			onToggle: (H) => r(L.id, H),
																			onClick: () => s(L.id),
																		},
																		L.id
																	)
																),
																E.map((L) =>
																	c(
																		Rs,
																		{
																			vendor: L,
																			isConsented: S(L.id),
																			onToggle: (H) => r(L.id, H),
																			onClick: () => s(L.id),
																			isLegitimateInterest: !0,
																			isLegitimateInterestAllowed: A(L.id),
																			onLegitimateInterestToggle: l
																				? (H) => l(L.id, H)
																				: void 0,
																		},
																		L.id
																	)
																),
															],
														}),
												],
											}),
										}),
									],
								}),
							],
						}),
					}),
				],
			});
		},
		Rs = ({
			vendor: e,
			isConsented: t,
			onToggle: o,
			onClick: n,
			isLegitimateInterest: r = !1,
			isLegitimateInterestAllowed: s = !0,
			onLegitimateInterestToggle: i,
		}) => {
			let a = Oe(),
				l = r && i;
			return c('div', {
				className: `${v.vendorRow} ${r ? v.vendorRowLI : ''}`,
				children: [
					c('div', {
						className: v.vendorInfo,
						children: [
							c('button', {
								type: 'button',
								onClick: n,
								className: v.vendorName,
								children: [
									c('span', { children: e.name }),
									e.isCustom &&
										c('svg', {
											className: v.customVendorIcon,
											viewBox: '0 0 24 24',
											fill: 'none',
											stroke: 'currentColor',
											strokeWidth: '2',
											'aria-label': a.common.customPartner,
											children: [
												c('circle', { cx: '12', cy: '12', r: '10' }),
												c('line', { x1: '2', y1: '12', x2: '22', y2: '12' }),
												c('path', {
													d: 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
												}),
											],
										}),
								],
							}),
							c('div', {
								className: v.vendorDetails,
								children: [
									r &&
										c('span', {
											className: `${v.vendorDetail} ${v.vendorDetailLI}`,
											children:
												a.preferenceCenter.purposeItem.legitimateInterest,
										}),
									e.usesCookies &&
										c('span', {
											className: v.vendorDetail,
											children: a.preferenceCenter.vendorList.usesCookies,
										}),
									e.usesNonCookieAccess &&
										c('span', {
											className: v.vendorDetail,
											children: a.preferenceCenter.vendorList.nonCookieAccess,
										}),
								],
							}),
						],
					}),
					l
						? c('button', {
								type: 'button',
								onClick: () => i(!s),
								className: `${v.objectButton} ${s ? '' : v.objectButtonActive}`,
								'aria-pressed': !s,
								children: s
									? a.preferenceCenter.purposeItem.objectButton
									: a.preferenceCenter.purposeItem.objected,
							})
						: c('div', {
								style: { transform: 'scale(0.75)' },
								children: c(It, { checked: t, onCheckedChange: o }),
							}),
				],
			});
		};
	var Ga = ({
		children: e,
		open: t,
		models: o = ['iab'],
		noStyle: n,
		disableAnimation: r,
		scrollLock: s = !0,
		trapFocus: i = !0,
		uiSource: a,
	}) => {
		let { activeUI: l, translationConfig: u, iab: m, model: p } = q(),
			d = rt(u.defaultLanguage),
			[f, h] = P(!1),
			[x, b] = P(!1),
			y = o.includes(p) && (t ?? l === 'dialog');
		if (
			(ot(!!(y && s)),
			M(() => {
				h(!0);
			}, []),
			M(() => {
				if (y) b(!0);
				else if (r) b(!1);
				else {
					let S = setTimeout(() => {
						b(!1);
					}, 150);
					return () => clearTimeout(S);
				}
			}, [y, r]),
			!f || !m?.config.enabled || (!y && !x))
		)
			return null;
		let C = X('iabConsentDialog', {
				baseClassName: Fe(
					v.root,
					r ? void 0 : x ? v.dialogVisible : v.dialogHidden
				),
			}),
			g = c(We.Provider, {
				value: { uiSource: a ?? 'iab_dialog' },
				children: c(nt.Provider, {
					value: {
						disableAnimation: r,
						noStyle: n,
						scrollLock: s,
						trapFocus: i,
					},
					children: [
						c(uo, { isOpen: y }),
						c('div', {
							...C,
							'data-testid': 'iab-consent-dialog-root',
							dir: d,
							children: e,
						}),
					],
				}),
			});
		return $e(g, document.body);
	};
	Ga.displayName = 'IABConsentDialogRoot';
	var Ts = ({
		stack: e,
		consents: t,
		onToggle: o,
		vendorConsents: n,
		onVendorToggle: r,
		onVendorClick: s,
		vendorLegitimateInterests: i = {},
		onVendorLegitimateInterestToggle: a,
		purposeLegitimateInterests: l = {},
		onPurposeLegitimateInterestToggle: u,
	}) => {
		let [m, p] = P(!1),
			d = e.purposes.every((x) => t[x.id] ?? !1),
			f = e.purposes.some((x) => t[x.id] ?? !1) && !d,
			h = new Set(e.purposes.flatMap((x) => x.vendors.map((b) => b.id))).size;
		return c('div', {
			className: v.stackItem,
			'data-testid': `stack-item-${e.id}`,
			children: [
				c('div', {
					className: v.stackHeader,
					children: [
						c('button', {
							type: 'button',
							onClick: () => p(!m),
							className: v.stackTrigger,
							children: [
								c('svg', {
									className: v.purposeArrow,
									viewBox: '0 0 24 24',
									fill: 'none',
									stroke: 'currentColor',
									strokeWidth: '2',
									children: m
										? c('path', { d: 'M19 9l-7 7-7-7' })
										: c('path', { d: 'M9 5l7 7-7 7' }),
								}),
								c('div', {
									className: v.stackInfo,
									children: [
										c('h3', { className: v.stackName, children: e.name }),
										!m &&
											c('p', {
												className: v.stackMeta,
												children: [h, ' ', h === 1 ? 'partner' : 'partners'],
											}),
									],
								}),
							],
						}),
						c('div', {
							className: v.stackControls,
							children: [
								f &&
									c('div', {
										className: v.partialIndicator,
										title: 'Partially enabled',
									}),
								c(It, {
									checked: d,
									onCheckedChange: (x) => {
										for (let b of e.purposes)
											for (let y of (o(b.id, x), b.vendors))
												y.usesLegitimateInterest || r(y.id, x);
									},
								}),
							],
						}),
					],
				}),
				c(_t, {
					isOpen: m,
					children: [
						c('div', {
							className: v.stackDescription,
							children: [
								c('p', { children: e.description }),
								c('p', {
									className: v.stackMeta,
									children: [h, ' ', h === 1 ? 'partner' : 'partners'],
								}),
							],
						}),
						c('div', {
							className: v.stackContent,
							children: e.purposes.map((x) =>
								c(
									Bt,
									{
										purpose: x,
										isEnabled: t[x.id] ?? !1,
										onToggle: (b) => o(x.id, b),
										vendorConsents: n,
										onVendorToggle: r,
										onVendorClick: s,
										vendorLegitimateInterests: i,
										onVendorLegitimateInterestToggle: a,
										purposeLegitimateInterests: l,
										onPurposeLegitimateInterestToggle: u,
									},
									x.id
								)
							),
						}),
					],
				}),
			],
		});
	};
	var wm = Ie(null);
	function Ov() {
		let e = Te(wm);
		if (!e)
			throw Error('Tab components must be used within IABConsentDialogTabs');
		return e;
	}
	var $a = T(
		({ children: e, defaultTab: t = 'purposes', className: o, ...n }, r) => {
			let [s, i] = P(t),
				a = Oe(),
				{
					purposes: l,
					specialPurposes: u,
					specialFeatures: m,
					features: p,
					totalVendors: d,
					isLoading: f,
				} = _s(),
				h = o ? `${v.tabsContainer} ${o}` : v.tabsContainer;
			return c(wm.Provider, {
				value: { activeTab: s, setActiveTab: i },
				children: e
					? c('div', { ref: r, className: h, ...n, children: e })
					: c('div', {
							ref: r,
							className: h,
							...n,
							children: c('div', {
								className: v.tabsList,
								children: [
									c('button', {
										type: 'button',
										onClick: () => i('purposes'),
										className: v.tabButton,
										'data-state': s === 'purposes' ? 'active' : 'inactive',
										children: [
											a.preferenceCenter.tabs.purposes,
											!f && ` (${l.length + u.length + m.length + p.length})`,
										],
									}),
									c('button', {
										type: 'button',
										onClick: () => i('vendors'),
										className: v.tabButton,
										'data-state': s === 'vendors' ? 'active' : 'inactive',
										children: [
											a.preferenceCenter.tabs.vendors,
											!f && ` (${d})`,
										],
									}),
								],
							}),
						}),
			});
		}
	);
	$a.displayName = 'IABConsentDialogTabs';
	var Wa = T(({ tab: e, children: t, className: o, ...n }, r) => {
		let { activeTab: s, setActiveTab: i } = Ov();
		return c('button', {
			ref: r,
			type: 'button',
			onClick: () => i(e),
			className: o ? `${v.tabButton} ${o}` : v.tabButton,
			'data-state': s === e ? 'active' : 'inactive',
			...n,
			children: t,
		});
	});
	Wa.displayName = 'IABConsentDialogTabButton';
	var As = ({
		vendorData: e,
		purposes: t,
		vendorConsents: o,
		onVendorToggle: n,
		selectedVendorId: r,
		onClearSelection: s,
		customVendors: i = [],
		vendorLegitimateInterests: a = {},
		onVendorLegitimateInterestToggle: l,
	}) => {
		let [u, m] = P(''),
			[p, d] = P(new Set()),
			f = Oe(),
			h = [
				...(e
					? Object.entries(e.vendors).map(([g, S]) => ({
							id: Number(g),
							name: S.name,
							policyUrl: S.policyUrl ?? '',
							usesNonCookieAccess: S.usesNonCookieAccess,
							deviceStorageDisclosureUrl: S.deviceStorageDisclosureUrl ?? null,
							usesCookies: S.usesCookies,
							cookieMaxAgeSeconds: S.cookieMaxAgeSeconds,
							cookieRefresh: S.cookieRefresh,
							specialPurposes: S.specialPurposes || [],
							specialFeatures: S.specialFeatures || [],
							features: S.features || [],
							purposes: S.purposes || [],
							legIntPurposes: S.legIntPurposes || [],
							isCustom: !1,
							legitimateInterestUrl:
								S.urls?.find((A) => A.legIntClaim)?.legIntClaim ?? null,
							dataRetention: S.dataRetention,
							dataDeclaration: S.dataDeclaration || [],
						}))
					: []),
				...i.map((g) => ({
					id: g.id,
					name: g.name,
					policyUrl: g.privacyPolicyUrl,
					usesNonCookieAccess: g.usesNonCookieAccess ?? !1,
					deviceStorageDisclosureUrl: null,
					usesCookies: g.usesCookies ?? !1,
					cookieMaxAgeSeconds: g.cookieMaxAgeSeconds ?? null,
					cookieRefresh: void 0,
					specialPurposes: [],
					specialFeatures: g.specialFeatures || [],
					features: g.features || [],
					purposes: g.purposes || [],
					legIntPurposes: g.legIntPurposes || [],
					isCustom: !0,
					legitimateInterestUrl: null,
					dataRetention: void 0,
					dataDeclaration: g.dataCategories || [],
				})),
			].sort((g, S) => g.name.localeCompare(S.name));
		M(() => {
			r !== null &&
				(d((g) => new Set(g).add(r)),
				setTimeout(() => {
					let g = document.getElementById(`vendor-${String(r)}`);
					g && g.scrollIntoView({ behavior: 'smooth', block: 'start' });
				}, 100));
		}, [r]);
		let x =
				r !== null
					? h.filter((g) => String(g.id) === String(r))
					: h.filter((g) => g.name.toLowerCase().includes(u.toLowerCase())),
			b = x.filter((g) => !g.isCustom),
			y = x.filter((g) => g.isCustom);
		return c('div', {
			children: [
				r !== null
					? c('div', {
							className: v.selectedVendorBanner,
							children: [
								c('p', {
									className: v.selectedVendorText,
									children: f.common.showingSelectedVendor,
								}),
								c('button', {
									type: 'button',
									onClick: s,
									className: v.clearSelectionButton,
									children: [
										c('svg', {
											className: v.clearIcon,
											viewBox: '0 0 24 24',
											fill: 'none',
											stroke: 'currentColor',
											strokeWidth: '2',
											children: [
												c('line', { x1: '18', y1: '6', x2: '6', y2: '18' }),
												c('line', { x1: '6', y1: '6', x2: '18', y2: '18' }),
											],
										}),
										f.common.clearSelection,
									],
								}),
							],
						})
					: c('div', {
							className: v.vendorListHeader,
							children: [
								c('div', {
									className: v.searchContainer,
									children: [
										c('svg', {
											className: v.searchIcon,
											viewBox: '0 0 24 24',
											fill: 'none',
											stroke: 'currentColor',
											strokeWidth: '2',
											children: [
												c('circle', { cx: '11', cy: '11', r: '8' }),
												c('line', {
													x1: '21',
													y1: '21',
													x2: '16.65',
													y2: '16.65',
												}),
											],
										}),
										c('input', {
											type: 'text',
											placeholder: f.preferenceCenter.vendorList.search,
											value: u,
											onChange: (g) => m(g.target.value),
											className: v.searchInput,
										}),
									],
								}),
								c('p', {
									className: v.vendorCount,
									children: f.preferenceCenter.vendorList.showingCount
										.replace('{filtered}', String(x.length))
										.replace('{total}', String(h.length)),
								}),
							],
						}),
				b.length > 0 &&
					c('div', {
						className: v.vendorSection,
						children: [
							c('div', {
								className: v.iabVendorSectionHeader,
								children: [
									c('h3', {
										className: v.vendorSectionHeading,
										children: [
											c('svg', {
												className: v.vendorSectionIcon,
												viewBox: '0 0 24 24',
												fill: 'none',
												stroke: 'currentColor',
												strokeWidth: '2',
												children: [
													c('path', { d: 'M12 2L2 7l10 5 10-5-10-5z' }),
													c('path', { d: 'M2 17l10 5 10-5' }),
													c('path', { d: 'M2 12l10 5 10-5' }),
												],
											}),
											f.preferenceCenter.vendorList.iabVendorsHeading,
											' (',
											b.length,
											')',
										],
									}),
									c('p', {
										className: v.iabVendorNotice,
										children: f.preferenceCenter.vendorList.iabVendorsNotice,
									}),
								],
							}),
							c('div', { children: b.map((g) => C(g)) }),
						],
					}),
				y.length > 0 &&
					c('div', {
						className: v.vendorSection,
						children: [
							c('div', {
								className: v.customVendorSectionHeader,
								children: [
									c('h3', {
										className: v.vendorSectionHeading,
										children: [
											c('svg', {
												className: v.vendorSectionIcon,
												viewBox: '0 0 24 24',
												fill: 'none',
												stroke: 'currentColor',
												strokeWidth: '2',
												children: [
													c('circle', { cx: '12', cy: '12', r: '10' }),
													c('line', { x1: '2', y1: '12', x2: '22', y2: '12' }),
													c('path', {
														d: 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
													}),
												],
											}),
											f.preferenceCenter.vendorList.customVendorsHeading,
											' (',
											y.length,
											')',
										],
									}),
									c('p', {
										className: v.customVendorNotice,
										children: f.preferenceCenter.vendorList.customVendorsNotice,
									}),
								],
							}),
							c('div', { children: y.map((g) => C(g)) }),
						],
					}),
				x.length === 0 &&
					c('div', {
						className: v.emptyState,
						children: c('p', {
							className: v.emptyStateText,
							children: ['No vendors found matching "', u, '"'],
						}),
					}),
			],
		});
		function C(g) {
			var S, A, I, _;
			let O,
				B,
				E,
				L,
				H = String(g.id),
				V =
					((S = g.id),
					(O = h.find((D) => String(D.id) === String(S)))
						? t
								.filter((D) =>
									D.vendors.some((ae) => String(ae.id) === String(S))
								)
								.map((D) => ({
									...D,
									usesLegitimateInterest: O.legIntPurposes.includes(D.id),
								}))
						: []),
				ne =
					((A = g.id),
					(B = h.find((D) => String(D.id) === String(A))) && e
						? B.specialPurposes
								.map((D) => e.specialPurposes[D])
								.filter((D) => D != null)
								.map((D) => ({
									id: D.id,
									name: D.name,
									description: D.description,
								}))
						: []),
				Le =
					((I = g.id),
					(E = h.find((D) => String(D.id) === String(I))) && e
						? E.specialFeatures
								.map((D) => e.specialFeatures[D])
								.filter((D) => D != null)
								.map((D) => ({
									id: D.id,
									name: D.name,
									description: D.description,
								}))
						: []),
				De =
					((_ = g.id),
					(L = h.find((D) => String(D.id) === String(_))) && e
						? (L.features || [])
								.map((D) => e.features[D])
								.filter((D) => D != null)
								.map((D) => ({
									id: D.id,
									name: D.name,
									description: D.description,
								}))
						: []),
				Qo = p.has(g.id),
				$t = V.filter((D) => D.usesLegitimateInterest).length,
				Es = g.legIntPurposes.length > 0,
				po = a[H] ?? !0,
				qn = g.dataRetention?.stdRetention,
				Ot = null;
			return (
				g.cookieMaxAgeSeconds &&
					((Ot = f.preferenceCenter.vendorList.maxAge.replace(
						'{days}',
						String(Math.floor(g.cookieMaxAgeSeconds / 86400))
					)),
					g.cookieRefresh && (Ot = `${Ot} (refreshes)`)),
				c(
					'div',
					{
						id: `vendor-${H}`,
						className: `${v.vendorListItem} ${g.isCustom ? v.customVendorItem : ''}`,
						children: [
							c('div', {
								className: v.vendorListItemHeader,
								children: [
									c('button', {
										type: 'button',
										onClick: () => {
											var D;
											return (
												(D = g.id),
												void d((ae) => {
													let Rt = new Set(ae);
													return Rt.has(D) ? Rt.delete(D) : Rt.add(D), Rt;
												})
											);
										},
										className: v.vendorListTrigger,
										children: [
											c('div', {
												className: v.vendorListInfo,
												children: [
													c('h3', {
														className: v.vendorListName,
														children: [
															g.name,
															g.isCustom &&
																c('svg', {
																	className: v.customVendorIcon,
																	viewBox: '0 0 24 24',
																	fill: 'none',
																	stroke: 'currentColor',
																	strokeWidth: '2',
																	'aria-label': f.common.customPartner,
																	children: [
																		c('circle', {
																			cx: '12',
																			cy: '12',
																			r: '10',
																		}),
																		c('line', {
																			x1: '2',
																			y1: '12',
																			x2: '22',
																			y2: '12',
																		}),
																		c('path', {
																			d: 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
																		}),
																	],
																}),
														],
													}),
													c('div', {
														className: v.vendorListMeta,
														children: [
															c('span', {
																className: v.vendorListMetaText,
																children: [
																	V.length,
																	' purpose',
																	V.length !== 1 ? 's' : '',
																	ne.length > 0 && `, ${ne.length} special`,
																	Le.length > 0 &&
																		`, ${Le.length} feature${Le.length !== 1 ? 's' : ''}`,
																],
															}),
															$t > 0 &&
																c('span', {
																	className: v.vendorListLIBadge,
																	children: [
																		c('svg', {
																			style: {
																				width: '0.625rem',
																				height: '0.625rem',
																			},
																			viewBox: '0 0 24 24',
																			fill: 'none',
																			stroke: 'currentColor',
																			strokeWidth: '2',
																			children: c('path', {
																				d: 'M12 3v18M3 12h18M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07',
																			}),
																		}),
																		$t,
																		' ',
																		f.preferenceCenter.vendorList
																			.legitimateInterest,
																	],
																}),
														],
													}),
												],
											}),
											c('svg', {
												className: v.purposeArrow,
												viewBox: '0 0 24 24',
												fill: 'none',
												stroke: 'currentColor',
												strokeWidth: '2',
												children: Qo
													? c('path', { d: 'M19 15l-7-7-7 7' })
													: c('path', { d: 'M19 9l-7 7-7-7' }),
											}),
										],
									}),
									c(It, {
										checked: o[H] ?? !1,
										onCheckedChange: (D) => n(g.id, D),
									}),
								],
							}),
							c(_t, {
								isOpen: Qo,
								children: c('div', {
									className: v.vendorListContent,
									children: [
										c('div', {
											className: v.vendorLinks,
											children: [
												c('a', {
													href: g.policyUrl,
													target: '_blank',
													rel: 'noopener noreferrer',
													className: v.vendorLink,
													children: [
														c('svg', {
															className: v.vendorLinkIcon,
															viewBox: '0 0 24 24',
															fill: 'none',
															stroke: 'currentColor',
															strokeWidth: '2',
															children: [
																c('path', {
																	d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
																}),
																c('polyline', { points: '15 3 21 3 21 9' }),
																c('line', {
																	x1: '10',
																	y1: '14',
																	x2: '21',
																	y2: '3',
																}),
															],
														}),
														f.preferenceCenter.vendorList.privacyPolicy,
													],
												}),
												g.legitimateInterestUrl &&
													c('a', {
														href: g.legitimateInterestUrl,
														target: '_blank',
														rel: 'noopener noreferrer',
														className: v.vendorLink,
														children: [
															c('svg', {
																className: v.vendorLinkIcon,
																viewBox: '0 0 24 24',
																fill: 'none',
																stroke: 'currentColor',
																strokeWidth: '2',
																children: [
																	c('path', {
																		d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
																	}),
																	c('polyline', { points: '15 3 21 3 21 9' }),
																	c('line', {
																		x1: '10',
																		y1: '14',
																		x2: '21',
																		y2: '3',
																	}),
																],
															}),
															f.preferenceCenter.purposeItem.legitimateInterest,
														],
													}),
												g.deviceStorageDisclosureUrl &&
													c('a', {
														href: g.deviceStorageDisclosureUrl,
														target: '_blank',
														rel: 'noopener noreferrer',
														className: v.vendorLink,
														children: [
															c('svg', {
																className: v.vendorLinkIcon,
																viewBox: '0 0 24 24',
																fill: 'none',
																stroke: 'currentColor',
																strokeWidth: '2',
																children: [
																	c('path', {
																		d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
																	}),
																	c('polyline', { points: '15 3 21 3 21 9' }),
																	c('line', {
																		x1: '10',
																		y1: '14',
																		x2: '21',
																		y2: '3',
																	}),
																],
															}),
															f.preferenceCenter.vendorList.storageDisclosure,
														],
													}),
											],
										}),
										c('div', {
											className: v.vendorBadges,
											children: [
												g.usesCookies &&
													c('span', {
														className: v.vendorBadge,
														children: f.preferenceCenter.vendorList.usesCookies,
													}),
												g.usesNonCookieAccess &&
													c('span', {
														className: v.vendorBadge,
														children:
															f.preferenceCenter.vendorList.nonCookieAccess,
													}),
												Ot &&
													c('span', { className: v.vendorBadge, children: Ot }),
												qn &&
													c('span', {
														className: v.vendorBadge,
														children:
															f.preferenceCenter.vendorList.retention.replace(
																'{days}',
																String(qn)
															),
													}),
											],
										}),
										V.length > 0 &&
											c('div', {
												className: v.vendorPurposesList,
												children: [
													c('h4', {
														className: v.vendorPurposesTitle,
														children: [
															f.preferenceCenter.vendorList.purposes,
															' (',
															V.length,
															')',
														],
													}),
													c('ul', {
														className: v.vendorPurposesItems,
														children: V.map((D) => {
															let ae;
															return (
																g.dataRetention?.purposes?.[D.id]
																	? (ae = g.dataRetention.purposes[D.id])
																	: g.dataRetention?.stdRetention &&
																		(ae = g.dataRetention.stdRetention),
																c(
																	'li',
																	{
																		className: `${v.vendorPurposeItem} ${D.usesLegitimateInterest ? v.vendorPurposeItemLI : ''}`,
																		children: [
																			c('span', {
																				children: [
																					D.name,
																					ae &&
																						c('span', {
																							className: v.vendorRetention,
																							children: [
																								' ',
																								'(Retained: ',
																								ae,
																								'd)',
																							],
																						}),
																				],
																			}),
																			D.usesLegitimateInterest &&
																				c('span', {
																					className: v.vendorListLIBadge,
																					children: [
																						c('svg', {
																							style: {
																								width: '0.625rem',
																								height: '0.625rem',
																							},
																							viewBox: '0 0 24 24',
																							fill: 'none',
																							stroke: 'currentColor',
																							strokeWidth: '2',
																							children: c('path', {
																								d: 'M12 3v18M3 12h18M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07',
																							}),
																						}),
																						f.preferenceCenter.vendorList
																							.legitimateInterest,
																					],
																				}),
																		],
																	},
																	D.id
																)
															);
														}),
													}),
												],
											}),
										Es &&
											l &&
											c('div', {
												className: v.vendorLISection,
												children: [
													c('div', {
														className: v.vendorLISectionHeader,
														children: [
															c('h4', {
																className: v.vendorPurposesTitle,
																children: [
																	c('svg', {
																		style: {
																			width: '0.75rem',
																			height: '0.75rem',
																			marginRight: '0.25rem',
																		},
																		viewBox: '0 0 24 24',
																		fill: 'none',
																		stroke: 'currentColor',
																		strokeWidth: '2',
																		children: c('path', {
																			d: 'M12 3v18M3 12h18M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07',
																		}),
																	}),
																	f.preferenceCenter.purposeItem
																		.legitimateInterest,
																],
															}),
															c('button', {
																type: 'button',
																onClick: () => l(g.id, !po),
																className: `${v.objectButton} ${po ? '' : v.objectButtonActive}`,
																'aria-pressed': !po,
																children: po
																	? f.preferenceCenter.purposeItem.objectButton
																	: f.preferenceCenter.purposeItem.objected,
															}),
														],
													}),
													c('p', {
														className: v.liExplanation,
														children:
															f.preferenceCenter.purposeItem.rightToObject,
													}),
												],
											}),
										g.dataDeclaration &&
											g.dataDeclaration.length > 0 &&
											c('div', {
												className: v.vendorPurposesList,
												children: [
													c('h4', {
														className: v.vendorPurposesTitle,
														children: [
															f.preferenceCenter.vendorList.dataCategories,
															' (',
															g.dataDeclaration.length,
															')',
														],
													}),
													c('ul', {
														className: v.vendorPurposesItems,
														children: g.dataDeclaration.map((D) => {
															let ae = e?.dataCategories?.[D];
															return c(
																'li',
																{
																	className: v.vendorPurposeItem,
																	title: ae?.description,
																	children: ae?.name || `Data Category ${D}`,
																},
																D
															);
														}),
													}),
												],
											}),
										ne.length > 0 &&
											c('div', {
												className: v.vendorPurposesList,
												children: [
													c('h4', {
														className: v.vendorPurposesTitle,
														children: [
															c('svg', {
																'aria-label':
																	f.preferenceCenter.vendorList.specialPurposes,
																role: 'img',
																style: {
																	width: '0.75rem',
																	height: '0.75rem',
																	marginRight: '0.25rem',
																},
																viewBox: '0 0 24 24',
																fill: 'none',
																stroke: 'currentColor',
																strokeWidth: '2',
																children: [
																	c('title', {
																		children:
																			f.preferenceCenter.vendorList
																				.specialPurposes,
																	}),
																	c('rect', {
																		x: '3',
																		y: '11',
																		width: '18',
																		height: '11',
																		rx: '2',
																		ry: '2',
																	}),
																	c('path', { d: 'M7 11V7a5 5 0 0 1 10 0v4' }),
																],
															}),
															f.preferenceCenter.vendorList.specialPurposes,
															' (',
															ne.length,
															')',
														],
													}),
													c('ul', {
														className: v.vendorPurposesItems,
														children: ne.map((D) => {
															let ae;
															return (
																g.dataRetention?.specialPurposes?.[D.id]
																	? (ae = g.dataRetention.specialPurposes[D.id])
																	: g.dataRetention?.stdRetention &&
																		(ae = g.dataRetention.stdRetention),
																c(
																	'li',
																	{
																		className: v.vendorPurposeItem,
																		children: c('span', {
																			children: [
																				D.name,
																				ae &&
																					c('span', {
																						className: v.vendorRetention,
																						children: [
																							' ',
																							'(Retained: ',
																							ae,
																							'd)',
																						],
																					}),
																			],
																		}),
																	},
																	D.id
																)
															);
														}),
													}),
													c('p', {
														className: v.vendorListMetaText,
														style: {
															fontStyle: 'italic',
															marginTop: '0.25rem',
														},
														children:
															f.preferenceCenter.vendorList.requiredNotice,
													}),
												],
											}),
										Le.length > 0 &&
											c('div', {
												className: v.vendorPurposesList,
												children: [
													c('h4', {
														className: v.vendorPurposesTitle,
														children: [
															f.preferenceCenter.vendorList.specialFeatures,
															' (',
															Le.length,
															')',
														],
													}),
													c('ul', {
														className: v.vendorPurposesItems,
														children: Le.map((D) =>
															c(
																'li',
																{
																	className: v.vendorPurposeItem,
																	children: D.name,
																},
																D.id
															)
														),
													}),
												],
											}),
										De.length > 0 &&
											c('div', {
												className: v.vendorPurposesList,
												children: [
													c('h4', {
														className: v.vendorPurposesTitle,
														children: [
															f.preferenceCenter.vendorList.features,
															' (',
															De.length,
															')',
														],
													}),
													c('ul', {
														className: v.vendorPurposesItems,
														children: De.map((D) =>
															c(
																'li',
																{
																	className: v.vendorPurposeItem,
																	children: D.name,
																},
																D.id
															)
														),
													}),
												],
											}),
									],
								}),
							}),
						],
					},
					g.id
				)
			);
		}
	};
	var Im = ({
		open: e,
		noStyle: t,
		disableAnimation: o,
		scrollLock: n = !0,
		trapFocus: r = !0,
		hideBranding: s,
		showTrigger: i = !1,
		models: a = ['iab'],
		uiSource: l,
	}) => {
		let u = Oe(),
			{
				iab: m,
				activeUI: p,
				setActiveUI: d,
				translationConfig: f,
				model: h,
			} = q(),
			x = rt(f.defaultLanguage),
			b = z(null),
			y = z(null),
			C = z(null),
			[g, S] = P(m?.preferenceCenterTab ?? 'purposes'),
			[A, I] = P(null),
			[_, O] = P(!1),
			[B, E] = P(!1),
			[L, H] = P(!1),
			V = e ?? (p === 'dialog' && a.includes(h)),
			ne = Ht({ noStyle: t, disableAnimation: o, scrollLock: n, trapFocus: r }),
			{
				purposes: Le,
				specialPurposes: De,
				specialFeatures: Qo,
				features: $t,
				stacks: Es,
				standalonePurposes: po,
			} = J(() => {
				if (!m?.gvl)
					return {
						purposes: [],
						specialPurposes: [],
						specialFeatures: [],
						features: [],
						stacks: [],
						standalonePurposes: [],
					};
				let j = m.gvl,
					ue = m.nonIABVendors || [],
					ce = (K, $, He) => ({
						id: Number(K),
						name: $.name,
						policyUrl: $.policyUrl ?? '',
						usesNonCookieAccess: $.usesNonCookieAccess,
						deviceStorageDisclosureUrl: $.deviceStorageDisclosureUrl ?? null,
						usesCookies: $.usesCookies,
						cookieMaxAgeSeconds: $.cookieMaxAgeSeconds,
						cookieRefresh: $.cookieRefresh,
						legitimateInterestUrl:
							$.urls?.find((le) => le.legIntClaim)?.legIntClaim ?? null,
						specialPurposes: $.specialPurposes || [],
						specialFeatures: $.specialFeatures || [],
						features: $.features || [],
						purposes: $.purposes || [],
						legIntPurposes: $.legIntPurposes || [],
						usesLegitimateInterest:
							!!He && ($.legIntPurposes?.includes(He) ?? !1),
						dataRetention: $.dataRetention,
						isCustom: !1,
					}),
					Wt = Object.entries(j.purposes)
						.map(([K, $]) => {
							let He = Object.entries(j.vendors)
									.filter(
										([, Q]) =>
											Q.purposes?.includes(Number(K)) ||
											Q.legIntPurposes?.includes(Number(K))
									)
									.map(([Q, Tt]) => ce(Q, Tt, Number(K))),
								le = ue
									.filter(
										(Q) =>
											Q.purposes?.includes(Number(K)) ||
											Q.legIntPurposes?.includes(Number(K))
									)
									.map((Q) => {
										let Tt;
										return (
											(Tt = Number(K)),
											{
												id: Q.id,
												name: Q.name,
												policyUrl: Q.privacyPolicyUrl,
												usesNonCookieAccess: Q.usesNonCookieAccess ?? !1,
												deviceStorageDisclosureUrl: null,
												usesCookies: Q.usesCookies ?? !1,
												cookieMaxAgeSeconds: Q.cookieMaxAgeSeconds ?? null,
												cookieRefresh: void 0,
												legitimateInterestUrl: null,
												specialPurposes: [],
												specialFeatures: Q.specialFeatures || [],
												features: Q.features || [],
												purposes: Q.purposes || [],
												legIntPurposes: Q.legIntPurposes || [],
												usesLegitimateInterest:
													!!Tt && (Q.legIntPurposes?.includes(Tt) ?? !1),
												dataRetention: void 0,
												isCustom: !0,
											}
										);
									});
							return {
								id: Number(K),
								name: $.name,
								description: $.description,
								descriptionLegal: $.descriptionLegal,
								illustrations: $.illustrations || [],
								vendors: [...He, ...le],
							};
						})
						.filter((K) => K.vendors.length > 0),
					Kn = Object.entries(j.specialPurposes || {})
						.map(([K, $]) => {
							let He = Object.entries(j.vendors)
								.filter(([, le]) => le.specialPurposes?.includes(Number(K)))
								.map(([le, Q]) => ce(le, Q));
							return {
								id: Number(K),
								name: $.name,
								description: $.description,
								descriptionLegal: $.descriptionLegal,
								illustrations: $.illustrations || [],
								vendors: He,
								isSpecialPurpose: !0,
							};
						})
						.filter((K) => K.vendors.length > 0),
					Ns = Object.entries(j.specialFeatures || {})
						.map(([K, $]) => {
							let He = Object.entries(j.vendors)
								.filter(([, le]) => le.specialFeatures?.includes(Number(K)))
								.map(([le, Q]) => ce(le, Q));
							return {
								id: Number(K),
								name: $.name,
								description: $.description,
								descriptionLegal: $.descriptionLegal,
								illustrations: $.illustrations || [],
								vendors: He,
							};
						})
						.filter((K) => K.vendors.length > 0),
					Vm = Object.entries(j.features || {})
						.map(([K, $]) => {
							let He = Object.entries(j.vendors)
								.filter(([, le]) => le.features?.includes(Number(K)))
								.map(([le, Q]) => ce(le, Q));
							return {
								id: Number(K),
								name: $.name,
								description: $.description,
								descriptionLegal: $.descriptionLegal,
								illustrations: $.illustrations || [],
								vendors: He,
							};
						})
						.filter((K) => K.vendors.length > 0),
					cc = Wt.find((K) => K.id === 1),
					Ps = Wt.filter((K) => K.id !== 1),
					Fm = new Set(Ps.map((K) => K.id)),
					Um = j.stacks || {},
					Bs = [];
				for (let [K, $] of Object.entries(Um)) {
					let He = Number(K),
						le = $.purposes.filter((Q) => Fm.has(Q));
					le.length >= 2 &&
						Bs.push({
							stackId: He,
							stack: $,
							coveredPurposeIds: le,
							score: le.length,
						});
				}
				Bs.sort((K, $) => $.score - K.score);
				let lc = [],
					Os = new Set();
				for (let { stackId: K, stack: $, coveredPurposeIds: He } of Bs) {
					let le = He.filter((Q) => !Os.has(Q));
					if (le.length >= 2) {
						let Q = Ps.filter((Tt) => le.includes(Tt.id));
						for (let Tt of (lc.push({
							id: K,
							name: $.name,
							description: $.description,
							purposes: Q,
						}),
						le))
							Os.add(Tt);
					}
				}
				let dc = Ps.filter((K) => !Os.has(K.id));
				return {
					purposes: Wt,
					specialPurposes: Kn,
					specialFeatures: Ns,
					features: Vm,
					stacks: lc,
					standalonePurposes: cc ? [cc, ...dc] : dc,
				};
			}, [m?.gvl, m?.nonIABVendors]),
			qn = J(
				() =>
					m?.gvl
						? Object.keys(m.gvl.vendors).length + (m.nonIABVendors?.length ?? 0)
						: 0,
				[m?.gvl, m?.nonIABVendors]
			),
			Ot = Z(
				(j, ue) => {
					m?.setPurposeConsent(j, ue);
				},
				[m]
			),
			D = Z(
				(j, ue) => {
					m?.setSpecialFeatureOptIn(j, ue);
				},
				[m]
			),
			ae = Z(
				(j, ue) => {
					m?.setVendorConsent(j, ue);
				},
				[m]
			),
			Rt = Z(
				(j, ue) => {
					m?.setVendorLegitimateInterest(j, ue);
				},
				[m]
			),
			rc = Z(
				(j, ue) => {
					m?.setPurposeLegitimateInterest(j, ue);
				},
				[m]
			),
			en = (j) => {
				I(j), S('vendors'), m?.setPreferenceCenterTab('vendors');
			};
		st(!!(V && ne.trapFocus), b),
			ot(!!(V && ne.scrollLock)),
			M(() => {
				E(!0);
			}, []),
			M(() => {
				if (V) H(!0);
				else if (ne.disableAnimation) H(!1);
				else {
					let j = setTimeout(() => {
						H(!1);
					}, 150);
					return () => clearTimeout(j);
				}
			}, [V, ne.disableAnimation]),
			M(() => {
				V && m?.preferenceCenterTab && S(m.preferenceCenterTab);
			}, [V, m?.preferenceCenterTab]),
			Ye(() => {
				let j,
					ue,
					ce = y.current;
				if (!ce || C.current === null) return;
				let Wt = C.current;
				if (
					((C.current = null),
					!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
				)
					return (
						(ce.style.height = `${Wt}px`),
						(ce.style.overflow = 'hidden'),
						(ce.style.transition = 'none'),
						(j = requestAnimationFrame(() => {
							ue = requestAnimationFrame(() => {
								if (!ce) return;
								ce.style.height = 'auto';
								let Kn = ce.getBoundingClientRect().height;
								if (((ce.style.height = `${Wt}px`), 1 > Math.abs(Wt - Kn))) {
									(ce.style.height = ''),
										(ce.style.overflow = ''),
										(ce.style.transition = '');
									return;
								}
								ce.offsetHeight,
									(ce.style.transition =
										'height 250ms cubic-bezier(0.33, 1, 0.68, 1)'),
									(ce.style.height = `${Kn}px`),
									ce.addEventListener(
										'transitionend',
										(Ns) => {
											Ns.propertyName === 'height' &&
												((ce.style.height = ''),
												(ce.style.overflow = ''),
												(ce.style.transition = ''));
										},
										{ once: !0 }
									);
							});
						})),
						() => {
							cancelAnimationFrame(j), cancelAnimationFrame(ue);
						}
					);
			}, [g]);
		let sc = Z(
			(j) => {
				y.current && (C.current = y.current.offsetHeight),
					S(j),
					m?.setPreferenceCenterTab(j);
			},
			[m]
		);
		if (!B || !m?.config.enabled) return null;
		let mo = m.isLoadingGVL || !m.gvl,
			Mm = c(We.Provider, {
				value: { uiSource: l ?? 'iab_dialog' },
				children: [
					c(uo, { isOpen: V }),
					c('div', {
						className: `${v.root} ${L ? v.dialogVisible : v.dialogHidden}`,
						'data-testid': 'iab-consent-dialog-root',
						dir: x,
						children: c('div', {
							ref: b,
							className: `${v.card} ${L ? v.contentVisible : v.contentHidden}`,
							role: 'dialog',
							'aria-modal': ne.trapFocus ? 'true' : void 0,
							'aria-label': u.preferenceCenter.title,
							tabIndex: 0,
							'data-testid': 'iab-consent-dialog-card',
							children: [
								c('div', {
									className: v.header,
									children: [
										c('div', {
											className: v.headerContent,
											children: [
												c('h2', {
													className: v.title,
													children: u.preferenceCenter.title,
												}),
												c('p', {
													className: v.description,
													children: u.preferenceCenter.description,
												}),
											],
										}),
										c('button', {
											type: 'button',
											onClick: () => {
												d('none');
											},
											className: v.closeButton,
											'aria-label': 'Close',
											children: c('svg', {
												style: { width: '1rem', height: '1rem' },
												viewBox: '0 0 24 24',
												fill: 'none',
												stroke: 'currentColor',
												strokeWidth: '2',
												children: [
													c('line', { x1: '18', y1: '6', x2: '6', y2: '18' }),
													c('line', { x1: '6', y1: '6', x2: '18', y2: '18' }),
												],
											}),
										}),
									],
								}),
								c('div', {
									className: v.tabsContainer,
									children: c('div', {
										className: v.tabsList,
										role: 'tablist',
										children: [
											c('button', {
												type: 'button',
												role: 'tab',
												'aria-selected': g === 'purposes',
												onClick: () => sc('purposes'),
												className: v.tabButton,
												'data-state': g === 'purposes' ? 'active' : 'inactive',
												children: [
													u.preferenceCenter.tabs.purposes,
													!mo &&
														` (${Le.length + De.length + Qo.length + $t.length})`,
												],
											}),
											c('button', {
												type: 'button',
												role: 'tab',
												'aria-selected': g === 'vendors',
												onClick: () => sc('vendors'),
												className: v.tabButton,
												'data-state': g === 'vendors' ? 'active' : 'inactive',
												children: [
													u.preferenceCenter.tabs.vendors,
													!mo && ` (${qn})`,
												],
											}),
											c('div', {
												className: v.tabIndicator,
												'data-active-tab': g,
												'aria-hidden': 'true',
											}),
										],
									}),
								}),
								c('div', {
									ref: y,
									className: v.content,
									children: mo
										? c('div', {
												className: v.loadingContainer,
												children: [
													c('div', { className: v.loadingSpinner }),
													c('p', {
														className: v.loadingText,
														children: u.common.loading,
													}),
												],
											})
										: g === 'purposes'
											? c(W, {
													children: [
														po.map((j) =>
															c(
																Bt,
																{
																	purpose: j,
																	isEnabled: m.purposeConsents[j.id] ?? !1,
																	onToggle: (ue) => Ot(j.id, ue),
																	vendorConsents: m.vendorConsents,
																	onVendorToggle: ae,
																	onVendorClick: en,
																	vendorLegitimateInterests:
																		m.vendorLegitimateInterests,
																	onVendorLegitimateInterestToggle: Rt,
																	purposeLegitimateInterests:
																		m.purposeLegitimateInterests,
																	onPurposeLegitimateInterestToggle: rc,
																},
																j.id
															)
														),
														Es.map((j) =>
															c(
																Ts,
																{
																	stack: j,
																	consents: m.purposeConsents,
																	onToggle: Ot,
																	vendorConsents: m.vendorConsents,
																	onVendorToggle: ae,
																	onVendorClick: en,
																	vendorLegitimateInterests:
																		m.vendorLegitimateInterests,
																	onVendorLegitimateInterestToggle: Rt,
																	purposeLegitimateInterests:
																		m.purposeLegitimateInterests,
																	onPurposeLegitimateInterestToggle: rc,
																},
																j.id
															)
														),
														Qo.map((j) =>
															c(
																Bt,
																{
																	purpose: {
																		id: j.id,
																		name: j.name,
																		description: j.description,
																		illustrations: j.illustrations,
																		vendors: j.vendors,
																	},
																	isEnabled: m.specialFeatureOptIns[j.id] ?? !1,
																	onToggle: (ue) => D(j.id, ue),
																	vendorConsents: m.vendorConsents,
																	onVendorToggle: ae,
																	onVendorClick: en,
																	vendorLegitimateInterests:
																		m.vendorLegitimateInterests,
																	onVendorLegitimateInterestToggle: Rt,
																},
																`feature-${j.id}`
															)
														),
														(De.length > 0 || $t.length > 0) &&
															c('div', {
																className: v.specialPurposesSection,
																children: [
																	c('div', {
																		className: v.specialPurposesHeader,
																		children: [
																			c('button', {
																				type: 'button',
																				onClick: () => O(!_),
																				className: v.purposeTrigger,
																				children: [
																					c('svg', {
																						className: v.purposeArrow,
																						viewBox: '0 0 24 24',
																						fill: 'none',
																						stroke: 'currentColor',
																						strokeWidth: '2',
																						children: _
																							? c('path', {
																									d: 'M19 9l-7 7-7-7',
																								})
																							: c('path', {
																									d: 'M9 5l7 7-7 7',
																								}),
																					}),
																					c('div', {
																						className: v.purposeInfo,
																						children: [
																							c('h3', {
																								className:
																									v.specialPurposesTitle,
																								children: [
																									u.preferenceCenter
																										.specialPurposes.title,
																									c('svg', {
																										className: v.lockIcon,
																										viewBox: '0 0 24 24',
																										fill: 'none',
																										stroke: 'currentColor',
																										strokeWidth: '2',
																										children: [
																											c('rect', {
																												x: '3',
																												y: '11',
																												width: '18',
																												height: '11',
																												rx: '2',
																												ry: '2',
																											}),
																											c('path', {
																												d: 'M7 11V7a5 5 0 0 1 10 0v4',
																											}),
																										],
																									}),
																								],
																							}),
																							c('p', {
																								className: v.purposeMeta,
																								children: [
																									new Set([
																										...De.flatMap((j) =>
																											j.vendors.map(
																												(ue) => ue.id
																											)
																										),
																										...$t.flatMap((j) =>
																											j.vendors.map(
																												(ue) => ue.id
																											)
																										),
																									]).size,
																									' ',
																									'partners',
																								],
																							}),
																						],
																					}),
																				],
																			}),
																			c('div', {
																				style: { position: 'relative' },
																				children: c('svg', {
																					className: v.infoIcon,
																					viewBox: '0 0 24 24',
																					fill: 'none',
																					stroke: 'currentColor',
																					strokeWidth: '2',
																					'aria-label':
																						u.preferenceCenter.specialPurposes
																							.tooltip,
																					children: [
																						c('circle', {
																							cx: '12',
																							cy: '12',
																							r: '10',
																						}),
																						c('line', {
																							x1: '12',
																							y1: '16',
																							x2: '12',
																							y2: '12',
																						}),
																						c('line', {
																							x1: '12',
																							y1: '8',
																							x2: '12.01',
																							y2: '8',
																						}),
																					],
																				}),
																			}),
																		],
																	}),
																	_ &&
																		c('div', {
																			style: { padding: '0.75rem' },
																			children: [
																				De.map((j) =>
																					c(
																						Bt,
																						{
																							purpose: j,
																							isEnabled: !0,
																							onToggle: () => {},
																							vendorConsents: m.vendorConsents,
																							onVendorToggle: ae,
																							onVendorClick: en,
																							isLocked: !0,
																						},
																						`special-${j.id}`
																					)
																				),
																				$t.map((j) =>
																					c(
																						Bt,
																						{
																							purpose: {
																								id: j.id,
																								name: j.name,
																								description: j.description,
																								illustrations: j.illustrations,
																								vendors: j.vendors,
																							},
																							isEnabled: !0,
																							onToggle: () => {},
																							vendorConsents: m.vendorConsents,
																							onVendorToggle: ae,
																							onVendorClick: en,
																							isLocked: !0,
																						},
																						`feature-${j.id}`
																					)
																				),
																			],
																		}),
																],
															}),
														c('div', {
															className: v.consentNotice,
															children: c('p', {
																className: v.consentNoticeText,
																children:
																	u.preferenceCenter.footer.consentStorage,
															}),
														}),
													],
												})
											: c(As, {
													vendorData: m.gvl,
													purposes: Le,
													vendorConsents: m.vendorConsents,
													onVendorToggle: ae,
													selectedVendorId: A,
													onClearSelection: () => I(null),
													customVendors: m.nonIABVendors,
													vendorLegitimateInterests:
														m.vendorLegitimateInterests,
													onVendorLegitimateInterestToggle: Rt,
												}),
								}),
								c('div', {
									className: v.footer,
									children: [
										c('div', {
											className: v.footerButtons,
											children: [
												c(Ze, {
													variant: 'neutral',
													mode: 'stroke',
													size: 'small',
													onClick: () => {
														m?.rejectAll(), m?.save(), d('none');
													},
													disabled: mo,
													children: u.common.rejectAll,
												}),
												c(Ze, {
													variant: 'neutral',
													mode: 'stroke',
													size: 'small',
													onClick: () => {
														m?.acceptAll(), m?.save(), d('none');
													},
													disabled: mo,
													children: u.common.acceptAll,
												}),
											],
										}),
										c('div', { className: v.footerSpacer }),
										c(Ze, {
											variant: 'primary',
											mode: 'filled',
											size: 'small',
											onClick: () => {
												m?.save(), d('none');
											},
											disabled: mo,
											children: u.common.saveSettings,
										}),
									],
								}),
								!s &&
									c('div', {
										className: v.branding,
										children: c(Aa, { hideBranding: s ?? !1 }),
									}),
							],
						}),
					}),
				],
			}),
			ic = i === !0 ? {} : i === !1 ? null : i,
			ac = ic ? c(Gt, { ...ic }) : null;
		return V || L ? c(W, { children: [ac, $e(Mm, document.body)] }) : ac;
	};
	var qa = Object.assign(Im, {
		Root: Ga,
		Card: Fa,
		Header: za,
		Tabs: $a,
		TabButton: Wa,
		Content: Ua,
		Footer: Ha,
		Overlay: uo,
		PurposeItem: Bt,
		StackItem: Ts,
		VendorList: As,
	});
	function _m(e) {
		M(() => {
			if (e !== null) return ju(e);
		}, [e]);
	}
	var Dv = {
			primary: 'hsl(228, 100%, 70%)',
			primaryHover: 'hsl(228, 100%, 65%)',
			surface: 'hsl(0, 0%, 7%)',
			surfaceHover: 'hsl(0, 0%, 10%)',
			border: 'hsl(0, 0%, 20%)',
			borderHover: 'hsl(0, 0%, 25%)',
			text: 'hsl(0, 0%, 93%)',
			textMuted: 'hsl(0, 0%, 60%)',
			textOnPrimary: 'hsl(0, 0%, 100%)',
			overlay: 'hsla(0, 0%, 0%, 0.7)',
			switchTrack: 'hsl(0, 0%, 25%)',
			switchTrackActive: 'hsl(228, 100%, 70%)',
			switchThumb: 'hsl(0, 0%, 93%)',
		},
		Rm = {
			colors: {
				primary: 'hsl(228, 100%, 60%)',
				primaryHover: 'hsl(228, 100%, 55%)',
				surface: 'hsl(0, 0%, 100%)',
				surfaceHover: 'hsl(0, 0%, 98%)',
				border: 'hsl(0, 0%, 90%)',
				borderHover: 'hsl(0, 0%, 85%)',
				text: 'hsl(0, 0%, 10%)',
				textMuted: 'hsl(0, 0%, 40%)',
				textOnPrimary: 'hsl(0, 0%, 100%)',
				overlay: 'hsla(0, 0%, 0%, 0.5)',
				switchTrack: 'hsl(0, 0%, 85%)',
				switchTrackActive: 'hsl(228, 100%, 60%)',
				switchThumb: 'hsl(0, 0%, 100%)',
			},
			dark: Dv,
			typography: {
				fontFamily: 'system-ui, -apple-system, sans-serif',
				fontSize: { sm: '0.875rem', base: '1rem', lg: '1.125rem' },
				fontWeight: { normal: 400, medium: 500, semibold: 600 },
				lineHeight: { tight: '1.25', normal: '1.5', relaxed: '1.75' },
			},
			spacing: {
				xs: '0.25rem',
				sm: '0.5rem',
				md: '1rem',
				lg: '1.5rem',
				xl: '2rem',
			},
			radius: { sm: '0.25rem', md: '0.5rem', lg: '0.75rem', full: '9999px' },
			shadows: {
				sm: '0 1px 2px hsla(0, 0%, 0%, 0.05)',
				md: '0 4px 12px hsla(0, 0%, 0%, 0.08)',
				lg: '0 8px 24px hsla(0, 0%, 0%, 0.12)',
			},
			motion: {
				duration: { fast: '100ms', normal: '200ms', slow: '300ms' },
				easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
				easingOut: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
				easingInOut: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
				easingSpring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
			},
		},
		jv = {
			'--c15t-primary': (e, t) => t?.primary,
			'--c15t-primary-hover': (e, t) => t?.primaryHover,
			'--c15t-surface': (e, t) => t?.surface,
			'--c15t-surface-hover': (e, t) => t?.surfaceHover,
			'--c15t-border': (e, t) => t?.border,
			'--c15t-border-hover': (e, t) => t?.borderHover,
			'--c15t-text': (e, t) => t?.text,
			'--c15t-text-muted': (e, t) => t?.textMuted,
			'--c15t-text-on-primary': (e, t) => t?.textOnPrimary,
			'--c15t-overlay': (e, t) => t?.overlay,
			'--c15t-switch-track': (e, t) => t?.switchTrack,
			'--c15t-switch-track-active': (e, t) => t?.switchTrackActive,
			'--c15t-switch-thumb': (e, t) => t?.switchThumb,
			'--c15t-font-family': (e) => e.typography?.fontFamily,
			'--c15t-font-size-sm': (e) => e.typography?.fontSize?.sm,
			'--c15t-font-size-base': (e) => e.typography?.fontSize?.base,
			'--c15t-font-size-lg': (e) => e.typography?.fontSize?.lg,
			'--c15t-font-weight-normal': (e) =>
				e.typography?.fontWeight?.normal
					? String(e.typography.fontWeight.normal)
					: void 0,
			'--c15t-font-weight-medium': (e) =>
				e.typography?.fontWeight?.medium
					? String(e.typography.fontWeight.medium)
					: void 0,
			'--c15t-font-weight-semibold': (e) =>
				e.typography?.fontWeight?.semibold
					? String(e.typography.fontWeight.semibold)
					: void 0,
			'--c15t-line-height-tight': (e) => e.typography?.lineHeight?.tight,
			'--c15t-line-height-normal': (e) => e.typography?.lineHeight?.normal,
			'--c15t-line-height-relaxed': (e) => e.typography?.lineHeight?.relaxed,
			'--c15t-space-xs': (e) => e.spacing?.xs,
			'--c15t-space-sm': (e) => e.spacing?.sm,
			'--c15t-space-md': (e) => e.spacing?.md,
			'--c15t-space-lg': (e) => e.spacing?.lg,
			'--c15t-space-xl': (e) => e.spacing?.xl,
			'--c15t-radius-sm': (e) => e.radius?.sm,
			'--c15t-radius-md': (e) => e.radius?.md,
			'--c15t-radius-lg': (e) => e.radius?.lg,
			'--c15t-radius-full': (e) => e.radius?.full,
			'--c15t-shadow-sm': (e) => e.shadows?.sm,
			'--c15t-shadow-md': (e) => e.shadows?.md,
			'--c15t-shadow-lg': (e) => e.shadows?.lg,
			'--c15t-duration-fast': (e) => e.motion?.duration?.fast,
			'--c15t-duration-normal': (e) => e.motion?.duration?.normal,
			'--c15t-duration-slow': (e) => e.motion?.duration?.slow,
			'--c15t-easing': (e) => e.motion?.easing,
			'--c15t-easing-out': (e) => e.motion?.easingOut,
			'--c15t-easing-in-out': (e) => e.motion?.easingInOut,
			'--c15t-easing-spring': (e) => e.motion?.easingSpring,
		};
	function Ka(e, t = !1) {
		let o = {},
			n = t ? { ...e.colors, ...e.dark } : e.colors;
		for (let [r, s] of Object.entries(jv)) {
			let i = s(e, n);
			i && (o[r] = i);
		}
		return o;
	}
	function Ya(e) {
		let t = Ka(e, !1),
			o = Ka(e, !0),
			n = Object.entries(t)
				.filter(([, s]) => s !== void 0)
				.map(([s, i]) => `${s}: ${i};`)
				.join(`
`),
			r = Object.entries(o)
				.filter(([, s]) => s !== void 0)
				.map(([s, i]) => `${s}: ${i};`)
				.join(`
`);
		return `
:root, .c15t-theme-root {
${n}
}

:root.dark, .dark .c15t-theme-root, :root.c15t-dark, .c15t-dark .c15t-theme-root {
${r}
}

/*
 * Utility class to disable transitions during theme switching.
 * Apply this class to the root element before switching themes,
 * then remove it after a short delay to prevent flash of
 * animated content during the color scheme change.
 *
 * Example usage:
 *   document.documentElement.classList.add('c15t-no-transitions');
 *   // Switch theme...
 *   requestAnimationFrame(() => {
 *     document.documentElement.classList.remove('c15t-no-transitions');
 *   });
 */
.c15t-no-transitions,
.c15t-no-transitions *,
.c15t-no-transitions *::before,
.c15t-no-transitions *::after {
	transition: none !important;
	animation: none !important;
}
	`.trim();
	}
	var Tm = Rm;
	var Am = '2.0.0-rc.3';
	function Za({ children: e, options: t }) {
		let { consentManager: o, consentStore: n } = J(
				() => Vi(t, { pkg: '@c15t/react', version: Am }),
				[t]
			),
			[r, s] = P(() => (n ? n.getState() : {})),
			i = z(!1);
		M(() => {
			if (!n) return;
			let m = n.subscribe(s);
			if (!i.current) {
				let p = n.getState();
				Nn(() => {
					s((d) => (d !== p ? ((i.current = !0), p) : ((i.current = !0), d)));
				});
			}
			return m;
		}, [n]);
		let a = J(() => {
				let {
					theme: m = {},
					noStyle: p,
					disableAnimation: d,
					trapFocus: f = !0,
					colorScheme: h,
				} = t;
				return {
					theme: aa(Tm, m),
					noStyle: p,
					disableAnimation: d,
					trapFocus: f,
					colorScheme: h,
				};
			}, [t]),
			l = J(() => Ya(a.theme), [a.theme]);
		_m(t.colorScheme);
		let u = J(() => {
			if (!n)
				throw Error(
					'Consent store must be initialized before creating context value'
				);
			return { state: r, store: n, manager: o };
		}, [r, n, o]);
		return c(Hr.Provider, {
			value: u,
			children: c(Wr.Provider, {
				value: a,
				children: [
					l
						? c('style', {
								id: 'c15t-theme',
								dangerouslySetInnerHTML: { __html: l },
							})
						: null,
					e,
				],
			}),
		});
	}
	function Mv(e) {
		let t = { Banner: Va, Dialog: qa };
		if (e.c15tEmbed?.registerIABComponents) {
			e.c15tEmbed.registerIABComponents(t);
			return;
		}
		e.__c15tEmbedPendingIABComponents = t;
	}
	function Vv(e = window) {
		Mv(e);
	}
	typeof window < 'u' && Vv(window);
	function Lm(e) {
		return {
			render: function (t) {
				Fr(t, e);
			},
			unmount: function () {
				Ur(e);
			},
		};
	}
	var Em = '2.0.0-rc.3';
	var Nm = 'c15t-embed-root',
		Fv = 'c15t-devtools-overrides',
		Bm = 'c15t:embed:payload',
		Ja = null,
		Ls = {};
	function Pm(e, t) {
		let o = e.options?.componentHints?.preload;
		return o ? o.includes(t) : !0;
	}
	function Uv() {
		if (typeof document > 'u') return null;
		let e = document.currentScript;
		if (e instanceof HTMLScriptElement) return e;
		let t = document.querySelectorAll('script[src]');
		for (let o = t.length - 1; o >= 0; o -= 1) {
			let n = t[o];
			if (n?.src)
				try {
					if (
						new URL(n.src, window.location.href).pathname
							.replace(/\/+$/, '')
							.endsWith('/embed.js')
					)
						return n;
				} catch {}
		}
		return null;
	}
	function Hv(e) {
		if (!e?.src) return '';
		let t = new URL(e.src, window.location.href),
			o = t.pathname.replace(/\/+$/, '');
		if (!o.endsWith('/embed.js')) return '';
		let n = o.slice(0, -9);
		return n ? `${t.origin}${n}` : '';
	}
	function Om(e) {
		return e !== void 0 ? e : typeof window > 'u' ? '' : Hv(Uv());
	}
	function zv(e) {
		e.__c15tEmbedPendingIABComponents &&
			(tc(e.__c15tEmbedPendingIABComponents),
			delete e.__c15tEmbedPendingIABComponents);
	}
	function Gv(e) {
		if (e instanceof HTMLElement) return e;
		if (typeof document > 'u')
			throw new Error('Cannot mount c15t/embed outside a browser environment');
		if (typeof e == 'string') {
			let n = document.querySelector(e);
			if (!n) throw new Error(`Mount target not found: ${e}`);
			return n;
		}
		let t = document.getElementById(Nm);
		if (t) return t;
		let o = document.createElement('div');
		return (o.id = Nm), document.body.appendChild(o), o;
	}
	function $v(e) {
		return Promise.resolve({ init: e.init, gvl: e.init.gvl ?? void 0 });
	}
	function Xa(e) {
		if (typeof e != 'string') return;
		let t = e.trim();
		return t.length > 0 ? t : void 0;
	}
	function Wv(e) {
		return typeof e == 'boolean' ? e : void 0;
	}
	function qv(e) {
		if (!(typeof window > 'u'))
			try {
				let t = window.localStorage.getItem(e);
				if (!t) return;
				let o = JSON.parse(t);
				if (!o || typeof o != 'object') return;
				let n = o,
					r = Xa(n.country),
					s = Xa(n.region),
					i = Xa(n.language),
					a = Wv(n.gpc);
				return !r && !s && !i && a === void 0
					? void 0
					: {
							...(r !== void 0 ? { country: r } : {}),
							...(s !== void 0 ? { region: s } : {}),
							...(i !== void 0 ? { language: i } : {}),
							...(a !== void 0 ? { gpc: a } : {}),
						};
			} catch {
				return;
			}
	}
	function Kv(e, t) {
		let o = t.overrides ?? e.options?.overrides,
			n = t.devToolsOverridesStorageKey ?? Fv,
			r = qv(n);
		if (!o && !r) return;
		let i = {
			...{
				...(o?.country !== void 0 ? { country: o.country } : {}),
				...(o?.region !== void 0 ? { region: o.region } : {}),
				...(o?.language !== void 0 ? { language: o.language } : {}),
				...(o?.gpc !== void 0 ? { gpc: o.gpc } : {}),
			},
			...(r ?? {}),
		};
		if (!(!i.country && !i.region && !i.language && i.gpc === void 0)) return i;
	}
	function Yv(e, t) {
		let o = t.storeNamespace ?? e.options?.store?.namespace ?? 'c15tStore',
			n = t.storageKey ?? e.options?.store?.storageKey,
			r = n ? { storageKey: n } : void 0;
		return {
			mode: 'c15t',
			backendURL: Om(t.backendURL),
			store: { namespace: o },
			storageConfig: r,
			ssrData: $v(e),
			overrides: Kv(e, t),
			noStyle: e.options?.ui?.noStyle,
			disableAnimation: e.options?.ui?.disableAnimation,
			scrollLock: e.options?.ui?.scrollLock,
			trapFocus: e.options?.ui?.trapFocus,
			colorScheme: e.options?.ui?.colorScheme,
			theme: e.options?.theme,
		};
	}
	function Qa(e = window) {
		return e.__c15tEmbedPayload;
	}
	function ec() {
		Ja?.unmount(), (Ja = null);
	}
	function tc(e) {
		typeof e.Banner != 'function' ||
			typeof e.Dialog != 'function' ||
			(Ls = { Banner: e.Banner, Dialog: e.Dialog });
	}
	function Zv() {
		Ls = {};
	}
	function oc(e, t = {}) {
		let o = Gv(t.mountTarget);
		o.setAttribute('data-c15t-embed-runtime', 'true'), ec();
		let n = Yv(e, t),
			r = Pm(e, 'iabBanner'),
			s = Pm(e, 'iabDialog'),
			i = Ls.Banner,
			a = Ls.Dialog,
			l = [
				c(ma, { models: ['opt-in', 'opt-out'] }, 'banner'),
				...(r && i ? [c(i, {}, 'iab-banner')] : []),
				...(s && a ? [c(a, {}, 'iab-dialog')] : []),
				c(Gt, {}, 'dialog-trigger'),
				c(Ea, {}, 'dialog'),
			],
			u = Lm(o);
		u.render(c(Za, { options: n, children: l })), (Ja = u);
	}
	function Dm(e = {}, t = window) {
		let o = Qa(t);
		return o ? (oc(o, e), !0) : !1;
	}
	function Xv(e) {
		if (document.readyState === 'loading') {
			document.addEventListener(
				'DOMContentLoaded',
				() => {
					e.bootstrap();
				},
				{ once: !0 }
			);
			return;
		}
		e.bootstrap();
	}
	function jm() {
		return {
			version: Em,
			mount: oc,
			bootstrap: (e) => Dm(e),
			unmount: ec,
			getPayload: () => Qa(),
			registerIABComponents: tc,
		};
	}
	function nc() {
		if (typeof window > 'u' || typeof document > 'u') return null;
		if (window.__c15tEmbedRuntimeInitialized && window.c15tEmbed)
			return window.c15tEmbed;
		let e = jm();
		return (
			(window.c15tEmbed = e),
			(window.__c15tEmbedRuntimeInitialized = !0),
			zv(window),
			window.addEventListener(Bm, () => {
				e.bootstrap();
			}),
			Xv(e),
			e
		);
	}
	nc();
	return qm(Jv);
})();
