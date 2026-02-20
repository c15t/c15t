'use strict';
var c15tEmbedBundle = (() => {
	var ek = Object.create;
	var as = Object.defineProperty;
	var tk = Object.getOwnPropertyDescriptor;
	var nk = Object.getOwnPropertyNames;
	var ok = Object.getPrototypeOf,
		rk = Object.prototype.hasOwnProperty;
	var ak = (e, t, n) =>
		t in e
			? as(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n })
			: (e[t] = n);
	var D = (e, t) => () => (e && (t = e((e = 0))), t);
	var qn = (e, t) => () => (
			t || e((t = { exports: {} }).exports, t), t.exports
		),
		is = (e, t) => {
			for (var n in t) as(e, n, { get: t[n], enumerable: !0 });
		},
		Nh = (e, t, n, o) => {
			if ((t && typeof t == 'object') || typeof t == 'function')
				for (let r of nk(t))
					!rk.call(e, r) &&
						r !== n &&
						as(e, r, {
							get: () => t[r],
							enumerable: !(o = tk(t, r)) || o.enumerable,
						});
			return e;
		};
	var w = (e, t, n) => (
			(n = e != null ? ek(ok(e)) : {}),
			Nh(
				t || !e || !e.__esModule
					? as(n, 'default', { value: e, enumerable: !0 })
					: n,
				e
			)
		),
		ik = (e) => Nh(as({}, '__esModule', { value: !0 }), e);
	var T = (e, t, n) => ak(e, typeof t != 'symbol' ? t + '' : t, n);
	var _h = qn((oc) => {
		'use strict';
		var sk = Symbol.for('react.transitional.element'),
			lk = Symbol.for('react.fragment');
		function Lh(e, t, n) {
			var o = null;
			if (
				(n !== void 0 && (o = '' + n),
				t.key !== void 0 && (o = '' + t.key),
				'key' in t)
			) {
				n = {};
				for (var r in t) r !== 'key' && (n[r] = t[r]);
			} else n = t;
			return (
				(t = n.ref),
				{
					$$typeof: sk,
					type: e,
					key: o,
					ref: t !== void 0 ? t : null,
					props: n,
				}
			);
		}
		oc.Fragment = lk;
		oc.jsx = Lh;
		oc.jsxs = Lh;
	});
	var H = qn((zN, Oh) => {
		'use strict';
		Oh.exports = _h();
	});
	function Bh(e) {
		return !(!e || typeof e != 'object' || Array.isArray(e));
	}
	function Dh(e, t) {
		if (!e && !t) return {};
		let n = {};
		if (e) for (let o of Object.keys(e)) n[o] = e[o];
		if (!t) return n;
		for (let o of Object.keys(t)) {
			let r = t[o];
			if (r === void 0) continue;
			let a = e ? e[o] : void 0;
			Bh(a) && Bh(r) ? (n[o] = Dh(a, r)) : (n[o] = r);
		}
		return n;
	}
	function Ef(e, t) {
		let n = [
				'cookieBanner',
				'consentManagerDialog',
				'common',
				'consentTypes',
				'frame',
				'legalLinks',
				'iab',
			],
			o = {};
		for (let r of n) {
			let a = e[r],
				i = t[r];
			(a || i) && (o[r] = Dh(a, i));
		}
		return o;
	}
	function ck(e) {
		return e
			? e
					.split(',')
					.map((t) => t.split(';')[0]?.trim().toLowerCase())
					.filter((t) => !!t)
					.map((t) => t.split('-')[0] ?? t)
			: [];
	}
	function If(e, t) {
		let n = t?.fallback ?? 'en';
		if (!e.length) return n;
		let o = ck(t?.header);
		for (let r of o) if (e.includes(r)) return r;
		return n;
	}
	function Mh(e, t) {
		let n = { en: Mr },
			o = [e.translations, t?.translations];
		for (let r of o)
			if (r)
				for (let [a, i] of Object.entries(r)) {
					if (!i) continue;
					let s = n[a] || n.en;
					n[a] = Ef(s, i);
				}
		return { ...e, ...t, translations: n };
	}
	function jh(e, t, n = !1) {
		if (n || typeof window > 'u') return t || 'en';
		let o = window.navigator.language?.split('-')[0] || '';
		return o && o in e ? o : t || 'en';
	}
	function Nf(e, t) {
		let n = Mh(e, t),
			o = jh(n.translations, n.defaultLanguage, n.disableAutoLanguageSwitch);
		return { ...n, defaultLanguage: o };
	}
	var Mr,
		ss = D(() => {
			'use strict';
			Mr = {
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
	function Hh(e) {
		return e
			? {
					log: (...t) => console.log('[c15t]', ...t),
					debug: (...t) => console.debug('[c15t]', ...t),
				}
			: { log: Uh, debug: Uh };
	}
	function be() {
		return Ph;
	}
	function Gh(e) {
		Ph = Hh(e);
	}
	var Uh,
		Ph,
		jr = D(() => {
			'use strict';
			Uh = () => {};
			Ph = Hh(!1);
		});
	function rc(e) {
		return {
			expiryDays: e?.defaultExpiryDays ?? 365,
			crossSubdomain: e?.crossSubdomain ?? !1,
			domain: e?.defaultDomain ?? '',
			path: '/',
			secure: typeof window < 'u' && window.location.protocol === 'https:',
			sameSite: 'Lax',
		};
	}
	function us() {
		if (typeof window > 'u') return '';
		let e = window.location.hostname;
		if (e === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(e)) return e;
		let t = e.split('.');
		return t.length >= 2 ? `.${t.slice(-2).join('.')}` : e;
	}
	var _f = D(() => {
		'use strict';
	});
	function Bf(e) {
		let t = {};
		for (let [n, o] of Object.entries(e)) {
			let a = n.split('.').map((i) => Of[i] || i);
			t[a.join('.')] = o;
		}
		return t;
	}
	function Df(e) {
		let t = {};
		for (let [n, o] of Object.entries(e)) {
			let a = n.split('.').map((i) => Yh[i] || i);
			t[a.join('.')] = o;
		}
		return t;
	}
	var Of,
		Yh,
		Mf = D(() => {
			'use strict';
			(Of = {
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
				(Yh = Object.entries(Of).reduce((e, [t, n]) => ((e[n] = t), e), {}));
		});
	function ac(e, t = '') {
		let n = {};
		for (let [o, r] of Object.entries(e)) {
			let a = t ? `${t}.${o}` : o;
			r == null
				? (n[a] = '')
				: typeof r == 'boolean'
					? r && (n[a] = '1')
					: typeof r == 'object' && !Array.isArray(r)
						? Object.assign(n, ac(r, a))
						: (n[a] = String(r));
		}
		return n;
	}
	function jf(e) {
		let t = {};
		for (let [n, o] of Object.entries(e)) {
			let r = n.split('.');
			if (r.length === 0) continue;
			let a = t;
			for (let s = 0; s < r.length - 1; s++) {
				let l = r[s];
				l !== void 0 && (a[l] || (a[l] = {}), (a = a[l]));
			}
			let i = r[r.length - 1];
			i !== void 0 &&
				(o === '1'
					? (a[i] = !0)
					: o === '0'
						? (a[i] = !1)
						: o === ''
							? (a[i] = null)
							: !Number.isNaN(Number(o)) && o !== ''
								? (a[i] = Number(o))
								: (a[i] = o));
		}
		return t;
	}
	function zf(e) {
		return Object.entries(e)
			.map(([t, n]) => `${t}:${n}`)
			.join(',');
	}
	function Vf(e) {
		if (!e) return {};
		let t = {},
			n = e.split(',');
		for (let o of n) {
			let r = o.indexOf(':');
			if (r === -1) continue;
			let a = o.substring(0, r),
				i = o.substring(r + 1);
			t[a] = i;
		}
		return t;
	}
	var Uf = D(() => {
		'use strict';
	});
	function ds(e, t, n, o) {
		if (typeof document > 'u') return;
		let r = { ...rc(o), ...n };
		r.crossSubdomain && !n?.domain && (r.domain = us());
		try {
			let a;
			if (typeof t == 'string') a = t;
			else {
				let u = ac(t),
					d = Bf(u);
				a = zf(d);
			}
			let i = new Date();
			i.setTime(i.getTime() + r.expiryDays * 24 * 60 * 60 * 1e3);
			let s = `expires=${i.toUTCString()}`,
				l = [`${e}=${a}`, s, `path=${r.path}`];
			r.domain && l.push(`domain=${r.domain}`),
				r.secure && l.push('secure'),
				r.sameSite && l.push(`SameSite=${r.sameSite}`),
				(document.cookie = l.join('; '));
		} catch (a) {
			console.warn(`Failed to set cookie "${e}":`, a);
		}
	}
	function ic(e) {
		if (typeof document > 'u') return null;
		try {
			let t = `${e}=`,
				n = document.cookie.split(';');
			for (let o of n) {
				let r = o;
				for (; r.charAt(0) === ' '; ) r = r.substring(1);
				if (r.indexOf(t) === 0) {
					let a = r.substring(t.length);
					if (a.includes(':')) {
						let i = Vf(a),
							s = Df(i);
						return jf(s);
					}
					return a;
				}
			}
			return null;
		} catch (t) {
			return console.warn(`Failed to get cookie "${e}":`, t), null;
		}
	}
	function fs(e, t, n) {
		if (typeof document > 'u') return;
		let o = { ...rc(n), ...t };
		o.crossSubdomain && !t?.domain && (o.domain = us());
		try {
			let r = [
				`${e}=`,
				'expires=Thu, 01 Jan 1970 00:00:00 GMT',
				`path=${o.path}`,
			];
			o.domain && r.push(`domain=${o.domain}`),
				(document.cookie = r.join('; '));
		} catch (r) {
			console.warn(`Failed to delete cookie "${e}":`, r);
		}
	}
	var Hf = D(() => {
		'use strict';
		_f();
		Mf();
		Uf();
	});
	var cn,
		sc = D(() => {
			'use strict';
			ss();
			cn = {
				translations: { en: Mr },
				defaultLanguage: 'en',
				disableAutoLanguageSwitch: !1,
			};
		});
	var vo,
		Ko,
		wa = D(() => {
			'use strict';
			(vo = [
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
				(Ko = vo.map((e) => e.name));
		});
	var Xh = D(() => {
		'use strict';
	});
	var Kh = D(() => {
		'use strict';
	});
	var Qh = D(() => {
		'use strict';
	});
	var Zh = D(() => {
		'use strict';
	});
	var Jh = D(() => {
		'use strict';
		wa();
		Xh();
		Kh();
		Qh();
		Zh();
	});
	var Yn,
		Aa = D(() => {
			'use strict';
			Yn = '2.0.0-rc.3';
		});
	var ms,
		Ra,
		Wh,
		Pf = D(() => {
			'use strict';
			sc();
			Jh();
			Aa();
			(ms = 'c15t'),
				(Ra = 'privacy-consent-storage'),
				(Wh = {
					debug: !1,
					config: { pkg: 'c15t', version: Yn, mode: 'Unknown' },
					consents: vo.reduce((e, t) => ((e[t.name] = t.defaultValue), e), {}),
					selectedConsents: vo.reduce(
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
					translationConfig: cn,
					user: void 0,
					networkBlocker: void 0,
					storageConfig: void 0,
					includeNonDisplayedConsents: !1,
					consentTypes: vo,
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
	function dk(e) {
		if (typeof e != 'object' || e === null) return !1;
		let n = e.consentInfo;
		if (!n || typeof n != 'object') return !1;
		let o = typeof n.id == 'string',
			r = typeof n.subjectId == 'string';
		return o && !r;
	}
	function fk(e) {
		let t = e?.storageKey || ms,
			n = Ra;
		if (t !== n)
			try {
				if (typeof window < 'u' && window.localStorage) {
					if (window.localStorage.getItem(t)) {
						window.localStorage.removeItem(n);
						return;
					}
					let r = window.localStorage.getItem(n);
					r &&
						(window.localStorage.setItem(t, r),
						window.localStorage.removeItem(n),
						be().log(`Migrated consent data from "${n}" to "${t}"`));
				}
			} catch (o) {
				console.warn('[c15t] Failed to migrate legacy storage:', o);
			}
	}
	function _n(e, t, n) {
		let o = !1,
			r = !1,
			a = n?.storageKey || ms,
			i = Xn(n),
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
				(window.localStorage.setItem(a, JSON.stringify(l)), (o = !0));
		} catch (u) {
			console.warn('Failed to save consent to localStorage:', u);
		}
		try {
			ds(a, l, t, n), (r = !0);
		} catch (u) {
			console.warn('Failed to save consent to cookie:', u);
		}
		if (!o && !r)
			throw new Error('Failed to save consent to any storage method');
	}
	function Gf(e) {
		let t = e.consents || {},
			n = { ...t };
		for (let o of Ko) n[o] = t[o] ?? !1;
		return { ...e, consents: n };
	}
	function Xn(e) {
		fk(e);
		let t = e?.storageKey || ms,
			n = null,
			o = null;
		try {
			if (typeof window < 'u' && window.localStorage) {
				let i = window.localStorage.getItem(t);
				i && (n = JSON.parse(i));
			}
		} catch (i) {
			console.warn('Failed to read consent from localStorage:', i);
		}
		try {
			o = ic(t);
		} catch (i) {
			console.warn('Failed to read consent from cookie:', i);
		}
		let r = null,
			a = null;
		if (
			(o ? ((r = o), (a = 'cookie')) : n && ((r = n), (a = 'localStorage')),
			r && a)
		) {
			let i = e?.crossSubdomain === !0 || !!e?.defaultDomain;
			if (a === 'localStorage' && !o)
				try {
					ds(t, r, void 0, e),
						be().log('Synced consent from localStorage to cookie');
				} catch (s) {
					console.warn('[c15t] Failed to sync consent to cookie:', s);
				}
			else if (a === 'cookie')
				try {
					if (typeof window < 'u' && window.localStorage) {
						let s = r;
						typeof s == 'object' &&
							s !== null &&
							'consents' in s &&
							(s = Gf(s));
						let l = null;
						try {
							let f = window.localStorage.getItem(t);
							if (f) {
								let c = JSON.parse(f);
								typeof c == 'object' && c !== null && 'consents' in c
									? (l = Gf(c))
									: (l = c);
							}
						} catch {
							l = null;
						}
						let u = JSON.stringify(s),
							d = JSON.stringify(l);
						u !== d &&
							(window.localStorage.setItem(t, u),
							l
								? i
									? be().log(
											'Updated localStorage with consent from cookie (cross-subdomain mode)'
										)
									: be().log('Updated localStorage with consent from cookie')
								: be().log('Synced consent from cookie to localStorage'));
					}
				} catch (s) {
					console.warn('[c15t] Failed to sync consent to localStorage:', s);
				}
		}
		return r && dk(r)
			? (be().log(
					'Detected legacy consent format (v1.x). Re-consent required for v2.0.'
				),
				ps(void 0, e),
				null)
			: r && typeof r == 'object'
				? Gf(r)
				: r;
	}
	function ps(e, t) {
		let n = t?.storageKey || ms;
		try {
			typeof window < 'u' &&
				window.localStorage &&
				(window.localStorage.removeItem(n),
				n !== Ra && window.localStorage.removeItem(Ra));
		} catch (o) {
			console.warn('Failed to remove consent from localStorage:', o);
		}
		try {
			fs(n, e, t), n !== Ra && fs(Ra, e, t);
		} catch (o) {
			console.warn('Failed to remove consent cookie:', o);
		}
	}
	var $h = D(() => {
		'use strict';
		Pf();
		wa();
		jr();
		Hf();
	});
	var Qo = D(() => {
		'use strict';
		_f();
		Mf();
		Hf();
		Uf();
		$h();
	});
	var zr,
		cc,
		uc = D(() => {
			'use strict';
			(zr = {
				TC_STRING_COOKIE: 'euconsent-v2',
				TC_STRING_LOCAL: 'euconsent-v2',
			}),
				(cc = 'https://gvl.consent.io');
		});
	var Kf = {};
	is(Kf, {
		clearGVLCache: () => Yf,
		fetchGVL: () => Ff,
		getCachedGVL: () => qf,
		getMockGVL: () => pk,
		setMockGVL: () => Xf,
	});
	async function Ff(e, t = {}) {
		let n = typeof window < 'u' ? window.__c15t_mock_gvl : void 0;
		if (n !== void 0) return (Vr = n), n;
		if (Ea !== void 0) return (Vr = Ea), Ea;
		let { endpoint: o = cc, headers: r } = t,
			a = e ? [...e].sort((f, c) => f - c) : [],
			i = r ? JSON.stringify(r) : '',
			s = `${o}|${a.join(',')}|${i}`,
			l = dc.get(s);
		if (l) return l;
		let u = new URL(o);
		a.length > 0 && u.searchParams.set('vendorIds', a.join(','));
		let d = (async () => {
			try {
				let f = await fetch(u.toString(), { headers: r });
				if (f.status === 204) return (Vr = null), null;
				if (!f.ok)
					throw new Error(`Failed to fetch GVL: ${f.status} ${f.statusText}`);
				let c = await f.json();
				if (!c.vendorListVersion || !c.purposes || !c.vendors)
					throw new Error('Invalid GVL response: missing required fields');
				return (Vr = c), c;
			} finally {
				dc.delete(s);
			}
		})();
		return dc.set(s, d), d;
	}
	function qf() {
		return Vr;
	}
	function Yf() {
		dc.clear(), (Vr = void 0), (Ea = void 0);
	}
	function Xf(e) {
		(Ea = e), e !== void 0 && (Vr = e);
	}
	function pk() {
		return Ea;
	}
	var dc,
		Vr,
		Ea,
		fc = D(() => {
			'use strict';
			uc();
			dc = new Map();
		});
	function Sk(e) {
		let t = BigInt(58),
			n = BigInt(0);
		for (let r of e) n = n * BigInt(256) + BigInt(r);
		let o = [];
		for (; n > 0; ) {
			let r = n % t;
			o.unshift(Zf.charAt(Number(r))), (n = n / t);
		}
		for (let r of e)
			if (r === 0) o.unshift(Zf.charAt(0));
			else break;
		return o.join('') || Zf.charAt(0);
	}
	function ys() {
		let e = crypto.getRandomValues(new Uint8Array(20)),
			t = Date.now() - xk,
			n = Math.floor(t / 4294967296),
			o = t >>> 0;
		return (
			(e[0] = (n >>> 24) & 255),
			(e[1] = (n >>> 16) & 255),
			(e[2] = (n >>> 8) & 255),
			(e[3] = n & 255),
			(e[4] = (o >>> 24) & 255),
			(e[5] = (o >>> 16) & 255),
			(e[6] = (o >>> 8) & 255),
			(e[7] = o & 255),
			`sub_${Sk(e)}`
		);
	}
	var Zf,
		xk,
		gc = D(() => {
			'use strict';
			Zf = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
			xk = 17e11;
		});
	var Ec,
		Ic,
		nm = D(() => {
			'use strict';
			Aa();
			(Ec = 0), (Ic = Yn);
		});
	function Nk() {
		return {
			gdprApplies: void 0,
			cmpLoaded: !1,
			cmpStatus: 'stub',
			displayStatus: 'hidden',
			apiVersion: '2.3',
			cmpVersion: Yn,
			cmpId: 0,
			gvlVersion: 0,
			tcfPolicyVersion: 5,
		};
	}
	function Lk() {
		let e = [],
			t = (n, o, r, a) => {
				n === 'ping' ? r(Nk(), !0) : e.push([n, o, r, a]);
			};
		return (t.queue = e), t;
	}
	function _k() {
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
	function T1(e) {
		if (typeof window > 'u' || !window.__tcfapi) return;
		let { data: t } = e;
		if (!t || typeof t != 'object' || !('__tcfapiCall' in t)) return;
		let n = t.__tcfapiCall;
		!n ||
			!n.command ||
			!n.callId ||
			window.__tcfapi(
				n.command,
				n.version,
				(o, r) => {
					let a = {
						__tcfapiReturn: { returnValue: o, success: r, callId: n.callId },
					};
					e.source &&
						typeof e.source.postMessage == 'function' &&
						e.source.postMessage(a, '*');
				},
				n.parameter
			);
	}
	function k1() {
		typeof window > 'u' ||
			Nc ||
			(window.__tcfapi || (window.__tcfapi = Lk()),
			(xs = _k()),
			window.addEventListener('message', T1),
			(Nc = !0));
	}
	function Lc() {
		return typeof window > 'u' || !window.__tcfapi
			? []
			: (window.__tcfapi.queue ?? []);
	}
	function _c() {
		typeof window < 'u' &&
			window.__tcfapi?.queue &&
			(window.__tcfapi.queue = []);
	}
	function w1() {
		return typeof window > 'u' || !window.__tcfapi
			? !1
			: Array.isArray(window.__tcfapi.queue);
	}
	function A1() {
		typeof window > 'u' ||
			(window.removeEventListener('message', T1),
			xs?.parentNode && (xs.parentNode.removeChild(xs), (xs = null)),
			(Nc = !1));
	}
	function R1() {
		return Nc;
	}
	var Nc,
		xs,
		om = D(() => {
			'use strict';
			Aa();
			(Nc = !1), (xs = null);
		});
	var $e,
		E1 = D(() => {
			$e = class extends Error {
				constructor(t) {
					super(t), (this.name = 'DecodingError');
				}
			};
		});
	var dt,
		I1 = D(() => {
			dt = class extends Error {
				constructor(t) {
					super(t), (this.name = 'EncodingError');
				}
			};
		});
	var Qn,
		N1 = D(() => {
			Qn = class extends Error {
				constructor(t) {
					super(t), (this.name = 'GVLError');
				}
			};
		});
	var Tt,
		L1 = D(() => {
			Tt = class extends Error {
				constructor(t, n, o = '') {
					super(`invalid value ${n} passed for ${t} ${o}`),
						(this.name = 'TCModelError');
				}
			};
		});
	var kt = D(() => {
		E1();
		I1();
		N1();
		L1();
	});
	var un,
		rm = D(() => {
			kt();
			un = class {
				static encode(t) {
					if (!/^[0-1]+$/.test(t)) throw new dt('Invalid bitField');
					let n = t.length % this.LCM;
					t += n ? '0'.repeat(this.LCM - n) : '';
					let o = '';
					for (let r = 0; r < t.length; r += this.BASIS)
						o += this.DICT[parseInt(t.substr(r, this.BASIS), 2)];
					return o;
				}
				static decode(t) {
					if (!/^[A-Za-z0-9\-_]+$/.test(t))
						throw new $e('Invalidly encoded Base64URL string');
					let n = '';
					for (let o = 0; o < t.length; o++) {
						let r = this.REVERSE_DICT.get(t[o]).toString(2);
						n += '0'.repeat(this.BASIS - r.length) + r;
					}
					return n;
				}
			};
			T(
				un,
				'DICT',
				'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
			),
				T(
					un,
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
				T(un, 'BASIS', 6),
				T(un, 'LCM', 24);
		});
	var Zn,
		Ts,
		_1 = D(() => {
			Zn = class Zn {
				has(t) {
					return Zn.langSet.has(t);
				}
				parseLanguage(t) {
					t = t.toUpperCase();
					let n = t.split('-')[0];
					if (t.length >= 2 && n.length == 2) {
						if (Zn.langSet.has(t)) return t;
						if (Zn.langSet.has(n)) return n;
						let o = n + '-' + n;
						if (Zn.langSet.has(o)) return o;
						for (let r of Zn.langSet)
							if (r.indexOf(t) !== -1 || r.indexOf(n) !== -1) return r;
					}
					throw new Error(`unsupported language ${t}`);
				}
				forEach(t) {
					Zn.langSet.forEach(t);
				}
				get size() {
					return Zn.langSet.size;
				}
			};
			T(
				Zn,
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
			Ts = Zn;
		});
	var R,
		am = D(() => {
			R = class {};
			T(R, 'cmpId', 'cmpId'),
				T(R, 'cmpVersion', 'cmpVersion'),
				T(R, 'consentLanguage', 'consentLanguage'),
				T(R, 'consentScreen', 'consentScreen'),
				T(R, 'created', 'created'),
				T(R, 'supportOOB', 'supportOOB'),
				T(R, 'isServiceSpecific', 'isServiceSpecific'),
				T(R, 'lastUpdated', 'lastUpdated'),
				T(R, 'numCustomPurposes', 'numCustomPurposes'),
				T(R, 'policyVersion', 'policyVersion'),
				T(R, 'publisherCountryCode', 'publisherCountryCode'),
				T(R, 'publisherCustomConsents', 'publisherCustomConsents'),
				T(
					R,
					'publisherCustomLegitimateInterests',
					'publisherCustomLegitimateInterests'
				),
				T(R, 'publisherLegitimateInterests', 'publisherLegitimateInterests'),
				T(R, 'publisherConsents', 'publisherConsents'),
				T(R, 'publisherRestrictions', 'publisherRestrictions'),
				T(R, 'purposeConsents', 'purposeConsents'),
				T(R, 'purposeLegitimateInterests', 'purposeLegitimateInterests'),
				T(R, 'purposeOneTreatment', 'purposeOneTreatment'),
				T(R, 'specialFeatureOptins', 'specialFeatureOptins'),
				T(R, 'useNonStandardTexts', 'useNonStandardTexts'),
				T(R, 'vendorConsents', 'vendorConsents'),
				T(R, 'vendorLegitimateInterests', 'vendorLegitimateInterests'),
				T(R, 'vendorListVersion', 'vendorListVersion'),
				T(R, 'vendorsAllowed', 'vendorsAllowed'),
				T(R, 'vendorsDisclosed', 'vendorsDisclosed'),
				T(R, 'version', 'version');
		});
	var O1 = D(() => {});
	var B1 = D(() => {});
	var qt,
		Pr = D(() => {
			qt = class {
				clone() {
					let t = new this.constructor();
					return (
						Object.keys(this).forEach((o) => {
							let r = this.deepClone(this[o]);
							r !== void 0 && (t[o] = r);
						}),
						t
					);
				}
				deepClone(t) {
					let n = typeof t;
					if (n === 'number' || n === 'string' || n === 'boolean') return t;
					if (t !== null && n === 'object') {
						if (typeof t.clone == 'function') return t.clone();
						if (t instanceof Date) return new Date(t.getTime());
						if (t[Symbol.iterator] !== void 0) {
							let o = [];
							for (let r of t) o.push(this.deepClone(r));
							return t instanceof Array ? o : new t.constructor(o);
						} else {
							let o = {};
							for (let r in t)
								t.hasOwnProperty(r) && (o[r] = this.deepClone(t[r]));
							return o;
						}
					}
				}
			};
		});
	var Ot,
		Oc = D(() => {
			(function (e) {
				(e[(e.NOT_ALLOWED = 0)] = 'NOT_ALLOWED'),
					(e[(e.REQUIRE_CONSENT = 1)] = 'REQUIRE_CONSENT'),
					(e[(e.REQUIRE_LI = 2)] = 'REQUIRE_LI');
			})(Ot || (Ot = {}));
		});
	var ks,
		Jn,
		im = D(() => {
			Pr();
			kt();
			Oc();
			ks = class ks extends qt {
				constructor(n, o) {
					super();
					T(this, 'purposeId_');
					T(this, 'restrictionType');
					n !== void 0 && (this.purposeId = n),
						o !== void 0 && (this.restrictionType = o);
				}
				static unHash(n) {
					let o = n.split(this.hashSeparator),
						r = new ks();
					if (o.length !== 2) throw new Tt('hash', n);
					return (
						(r.purposeId = parseInt(o[0], 10)),
						(r.restrictionType = parseInt(o[1], 10)),
						r
					);
				}
				get hash() {
					if (!this.isValid())
						throw new Error('cannot hash invalid PurposeRestriction');
					return `${this.purposeId}${ks.hashSeparator}${this.restrictionType}`;
				}
				get purposeId() {
					return this.purposeId_;
				}
				set purposeId(n) {
					this.purposeId_ = n;
				}
				isValid() {
					return (
						Number.isInteger(this.purposeId) &&
						this.purposeId > 0 &&
						(this.restrictionType === Ot.NOT_ALLOWED ||
							this.restrictionType === Ot.REQUIRE_CONSENT ||
							this.restrictionType === Ot.REQUIRE_LI)
					);
				}
				isSameAs(n) {
					return (
						this.purposeId === n.purposeId &&
						this.restrictionType === n.restrictionType
					);
				}
			};
			T(ks, 'hashSeparator', '-');
			Jn = ks;
		});
	var Gr,
		D1 = D(() => {
			im();
			Oc();
			Pr();
			Gr = class extends qt {
				constructor() {
					super(...arguments);
					T(this, 'bitLength', 0);
					T(this, 'map', new Map());
					T(this, 'gvl_');
				}
				has(n) {
					return this.map.has(n);
				}
				isOkToHave(n, o, r) {
					let a = !0;
					if (this.gvl?.vendors) {
						let i = this.gvl.vendors[r];
						if (i)
							if (n === Ot.NOT_ALLOWED)
								a = i.legIntPurposes.includes(o) || i.purposes.includes(o);
							else if (i.flexiblePurposes.length)
								switch (n) {
									case Ot.REQUIRE_CONSENT:
										a =
											i.flexiblePurposes.includes(o) &&
											i.legIntPurposes.includes(o);
										break;
									case Ot.REQUIRE_LI:
										a =
											i.flexiblePurposes.includes(o) && i.purposes.includes(o);
										break;
								}
							else a = !1;
						else a = !1;
					}
					return a;
				}
				add(n, o) {
					if (this.isOkToHave(o.restrictionType, o.purposeId, n)) {
						let r = o.hash;
						this.has(r) || (this.map.set(r, new Set()), (this.bitLength = 0)),
							this.map.get(r).add(n);
					}
				}
				restrictPurposeToLegalBasis(n) {
					let o = Array.from(this.gvl.vendorIds),
						r = n.hash,
						a = o[o.length - 1],
						i = [...Array(a).keys()].map((s) => s + 1);
					if (!this.has(r)) this.map.set(r, new Set(i)), (this.bitLength = 0);
					else for (let s = 1; s <= a; s++) this.map.get(r).add(s);
				}
				getVendors(n) {
					let o = [];
					if (n) {
						let r = n.hash;
						this.has(r) && (o = Array.from(this.map.get(r)));
					} else {
						let r = new Set();
						this.map.forEach((a) => {
							a.forEach((i) => {
								r.add(i);
							});
						}),
							(o = Array.from(r));
					}
					return o.sort((r, a) => r - a);
				}
				getRestrictionType(n, o) {
					let r;
					return (
						this.getRestrictions(n).forEach((a) => {
							a.purposeId === o &&
								(r === void 0 || r > a.restrictionType) &&
								(r = a.restrictionType);
						}),
						r
					);
				}
				vendorHasRestriction(n, o) {
					let r = !1,
						a = this.getRestrictions(n);
					for (let i = 0; i < a.length && !r; i++) r = o.isSameAs(a[i]);
					return r;
				}
				getMaxVendorId() {
					let n = 0;
					return (
						this.map.forEach((o) => {
							n = Math.max(Array.from(o)[o.size - 1], n);
						}),
						n
					);
				}
				getRestrictions(n) {
					let o = [];
					return (
						this.map.forEach((r, a) => {
							n ? r.has(n) && o.push(Jn.unHash(a)) : o.push(Jn.unHash(a));
						}),
						o
					);
				}
				getPurposes() {
					let n = new Set();
					return (
						this.map.forEach((o, r) => {
							n.add(Jn.unHash(r).purposeId);
						}),
						Array.from(n)
					);
				}
				remove(n, o) {
					let r = o.hash,
						a = this.map.get(r);
					a &&
						(a.delete(n),
						a.size == 0 && (this.map.delete(r), (this.bitLength = 0)));
				}
				set gvl(n) {
					this.gvl_ ||
						((this.gvl_ = n),
						this.map.forEach((o, r) => {
							let a = Jn.unHash(r);
							Array.from(o).forEach((s) => {
								this.isOkToHave(a.restrictionType, a.purposeId, s) ||
									o.delete(s);
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
	var sm,
		M1 = D(() => {
			(function (e) {
				(e.COOKIE = 'cookie'), (e.WEB = 'web'), (e.APP = 'app');
			})(sm || (sm = {}));
		});
	var j1 = D(() => {});
	var se,
		lm = D(() => {
			(function (e) {
				(e.CORE = 'core'),
					(e.VENDORS_DISCLOSED = 'vendorsDisclosed'),
					(e.VENDORS_ALLOWED = 'vendorsAllowed'),
					(e.PUBLISHER_TC = 'publisherTC');
			})(se || (se = {}));
		});
	var yo,
		z1 = D(() => {
			lm();
			yo = class {};
			T(yo, 'ID_TO_KEY', [
				se.CORE,
				se.VENDORS_DISCLOSED,
				se.VENDORS_ALLOWED,
				se.PUBLISHER_TC,
			]),
				T(yo, 'KEY_TO_ID', {
					[se.CORE]: 0,
					[se.VENDORS_DISCLOSED]: 1,
					[se.VENDORS_ALLOWED]: 2,
					[se.PUBLISHER_TC]: 3,
				});
		});
	var et,
		V1 = D(() => {
			Pr();
			kt();
			et = class extends qt {
				constructor() {
					super(...arguments);
					T(this, 'bitLength', 0);
					T(this, 'maxId_', 0);
					T(this, 'set_', new Set());
				}
				*[Symbol.iterator]() {
					for (let n = 1; n <= this.maxId; n++) yield [n, this.has(n)];
				}
				values() {
					return this.set_.values();
				}
				get maxId() {
					return this.maxId_;
				}
				has(n) {
					return this.set_.has(n);
				}
				unset(n) {
					Array.isArray(n)
						? n.forEach((o) => this.unset(o))
						: typeof n == 'object'
							? this.unset(Object.keys(n).map((o) => Number(o)))
							: (this.set_.delete(Number(n)),
								(this.bitLength = 0),
								n === this.maxId &&
									((this.maxId_ = 0),
									this.set_.forEach((o) => {
										this.maxId_ = Math.max(this.maxId, o);
									})));
				}
				isIntMap(n) {
					let o = typeof n == 'object';
					return (
						(o =
							o &&
							Object.keys(n).every((r) => {
								let a = Number.isInteger(parseInt(r, 10));
								return (
									(a = a && this.isValidNumber(n[r].id)),
									(a = a && n[r].name !== void 0),
									a
								);
							})),
						o
					);
				}
				isValidNumber(n) {
					return parseInt(n, 10) > 0;
				}
				isSet(n) {
					let o = !1;
					return (
						n instanceof Set && (o = Array.from(n).every(this.isValidNumber)), o
					);
				}
				set(n) {
					if (Array.isArray(n)) n.forEach((o) => this.set(o));
					else if (this.isSet(n)) this.set(Array.from(n));
					else if (this.isIntMap(n))
						this.set(Object.keys(n).map((o) => Number(o)));
					else if (this.isValidNumber(n))
						this.set_.add(n),
							(this.maxId_ = Math.max(this.maxId, n)),
							(this.bitLength = 0);
					else
						throw new Tt(
							'set()',
							n,
							'must be positive integer array, positive integer, Set<number>, or IntMap'
						);
				}
				empty() {
					(this.set_ = new Set()), (this.maxId_ = 0);
				}
				forEach(n) {
					for (let o = 1; o <= this.maxId; o++) n(this.has(o), o);
				}
				get size() {
					return this.set_.size;
				}
				setAll(n) {
					this.set(n);
				}
				unsetAll(n) {
					this.unset(n);
				}
			};
		});
	var U1 = D(() => {});
	var H1 = D(() => {});
	var P1 = D(() => {});
	var G1 = D(() => {});
	var F1 = D(() => {});
	var q1 = D(() => {});
	var Y1 = D(() => {});
	var X1 = D(() => {});
	var K1 = D(() => {});
	var Q1 = D(() => {});
	var Z1 = D(() => {});
	var J1 = D(() => {
		U1();
		H1();
		P1();
		G1();
		F1();
		q1();
		Y1();
		X1();
		K1();
		Q1();
		Z1();
	});
	var Bt = D(() => {
		_1();
		am();
		O1();
		B1();
		im();
		D1();
		M1();
		j1();
		Oc();
		lm();
		z1();
		V1();
		J1();
	});
	var W1,
		$1,
		ev,
		tv,
		nv,
		ov,
		rv,
		av,
		iv,
		sv,
		lv,
		cv,
		uv,
		dv,
		fv,
		mv,
		pv,
		gv,
		O,
		Bc = D(() => {
			Bt();
			(gv = R.cmpId),
				(pv = R.cmpVersion),
				(mv = R.consentLanguage),
				(fv = R.consentScreen),
				(dv = R.created),
				(uv = R.isServiceSpecific),
				(cv = R.lastUpdated),
				(lv = R.policyVersion),
				(sv = R.publisherCountryCode),
				(iv = R.publisherLegitimateInterests),
				(av = R.publisherConsents),
				(rv = R.purposeConsents),
				(ov = R.purposeLegitimateInterests),
				(nv = R.purposeOneTreatment),
				(tv = R.specialFeatureOptins),
				(ev = R.useNonStandardTexts),
				($1 = R.vendorListVersion),
				(W1 = R.version);
			O = class {};
			T(O, gv, 12),
				T(O, pv, 12),
				T(O, mv, 12),
				T(O, fv, 6),
				T(O, dv, 36),
				T(O, uv, 1),
				T(O, cv, 36),
				T(O, lv, 6),
				T(O, sv, 12),
				T(O, iv, 24),
				T(O, av, 24),
				T(O, rv, 24),
				T(O, ov, 24),
				T(O, nv, 1),
				T(O, tv, 12),
				T(O, ev, 1),
				T(O, $1, 12),
				T(O, W1, 6),
				T(O, 'anyBoolean', 1),
				T(O, 'encodingType', 1),
				T(O, 'maxId', 16),
				T(O, 'numCustomPurposes', 6),
				T(O, 'numEntries', 12),
				T(O, 'numRestrictions', 12),
				T(O, 'purposeId', 6),
				T(O, 'restrictionType', 2),
				T(O, 'segmentType', 3),
				T(O, 'singleOrRange', 1),
				T(O, 'vendorId', 16);
		});
	var bv = D(() => {});
	var ft,
		_a = D(() => {
			ft = class {
				static encode(t) {
					return String(Number(t));
				}
				static decode(t) {
					return t === '1';
				}
			};
		});
	var F,
		Jo = D(() => {
			kt();
			F = class {
				static encode(t, n) {
					let o;
					if (
						(typeof t == 'string' && (t = parseInt(t, 10)),
						(o = t.toString(2)),
						o.length > n || t < 0)
					)
						throw new dt(`${t} too large to encode into ${n}`);
					return o.length < n && (o = '0'.repeat(n - o.length) + o), o;
				}
				static decode(t, n) {
					if (n !== t.length) throw new $e('invalid bit length');
					return parseInt(t, 2);
				}
			};
		});
	var Oa,
		cm = D(() => {
			Jo();
			kt();
			Oa = class {
				static encode(t, n) {
					return F.encode(Math.round(t.getTime() / 100), n);
				}
				static decode(t, n) {
					if (n !== t.length) throw new $e('invalid bit length');
					let o = new Date();
					return o.setTime(F.decode(t, n) * 100), o;
				}
			};
		});
	var Yt,
		Dc = D(() => {
			_a();
			kt();
			Bt();
			Yt = class {
				static encode(t, n) {
					let o = '';
					for (let r = 1; r <= n; r++) o += ft.encode(t.has(r));
					return o;
				}
				static decode(t, n) {
					if (t.length !== n) throw new $e('bitfield encoding length mismatch');
					let o = new et();
					for (let r = 1; r <= n; r++) ft.decode(t[r - 1]) && o.set(r);
					return (o.bitLength = t.length), o;
				}
			};
		});
	var Ba,
		um = D(() => {
			Jo();
			kt();
			Ba = class {
				static encode(t, n) {
					t = t.toUpperCase();
					let o = 65,
						r = t.charCodeAt(0) - o,
						a = t.charCodeAt(1) - o;
					if (r < 0 || r > 25 || a < 0 || a > 25)
						throw new dt(`invalid language code: ${t}`);
					if (n % 2 === 1)
						throw new dt(`numBits must be even, ${n} is not valid`);
					n = n / 2;
					let i = F.encode(r, n),
						s = F.encode(a, n);
					return i + s;
				}
				static decode(t, n) {
					let o;
					if (n === t.length && !(t.length % 2)) {
						let a = t.length / 2,
							i = F.decode(t.slice(0, a), a) + 65,
							s = F.decode(t.slice(a), a) + 65;
						o = String.fromCharCode(i) + String.fromCharCode(s);
					} else throw new $e('invalid bit length for language');
					return o;
				}
			};
		});
	var ws,
		dm = D(() => {
			Bc();
			_a();
			kt();
			Jo();
			Bt();
			ws = class {
				static encode(t) {
					let n = F.encode(t.numRestrictions, O.numRestrictions);
					if (!t.isEmpty()) {
						let o = (r, a) => {
							for (let i = r + 1; i <= a; i++)
								if (t.gvl.vendorIds.has(i)) return i;
							return r;
						};
						t.getRestrictions().forEach((r) => {
							(n += F.encode(r.purposeId, O.purposeId)),
								(n += F.encode(r.restrictionType, O.restrictionType));
							let a = t.getVendors(r),
								i = a.length,
								s = 0,
								l = 0,
								u = '';
							for (let d = 0; d < i; d++) {
								let f = a[d];
								if (
									(l === 0 && (s++, (l = f)),
									d === i - 1 || a[d + 1] > o(f, a[i - 1]))
								) {
									let c = f !== l;
									(u += ft.encode(c)),
										(u += F.encode(l, O.vendorId)),
										c && (u += F.encode(f, O.vendorId)),
										(l = 0);
								}
							}
							(n += F.encode(s, O.numEntries)), (n += u);
						});
					}
					return n;
				}
				static decode(t) {
					let n = 0,
						o = new Gr(),
						r = F.decode(t.substr(n, O.numRestrictions), O.numRestrictions);
					n += O.numRestrictions;
					for (let a = 0; a < r; a++) {
						let i = F.decode(t.substr(n, O.purposeId), O.purposeId);
						n += O.purposeId;
						let s = F.decode(t.substr(n, O.restrictionType), O.restrictionType);
						n += O.restrictionType;
						let l = new Jn(i, s),
							u = F.decode(t.substr(n, O.numEntries), O.numEntries);
						n += O.numEntries;
						for (let d = 0; d < u; d++) {
							let f = ft.decode(t.substr(n, O.anyBoolean));
							n += O.anyBoolean;
							let c = F.decode(t.substr(n, O.vendorId), O.vendorId);
							if (((n += O.vendorId), f)) {
								let p = F.decode(t.substr(n, O.vendorId), O.vendorId);
								if (((n += O.vendorId), p < c))
									throw new $e(
										`Invalid RangeEntry: endVendorId ${p} is less than ${c}`
									);
								for (let v = c; v <= p; v++) o.add(v, l);
							} else o.add(c, l);
						}
					}
					return (o.bitLength = n), o;
				}
			};
		});
	var Fr,
		fm = D(() => {
			(function (e) {
				(e[(e.FIELD = 0)] = 'FIELD'), (e[(e.RANGE = 1)] = 'RANGE');
			})(Fr || (Fr = {}));
		});
	var Wn,
		mm = D(() => {
			Bt();
			Mc();
			Jo();
			_a();
			Dc();
			fm();
			kt();
			Wn = class {
				static encode(t) {
					let n = [],
						o = [],
						r = F.encode(t.maxId, O.maxId),
						a = '',
						i,
						s = O.maxId + O.encodingType,
						l = s + t.maxId,
						u = O.vendorId * 2 + O.singleOrRange + O.numEntries,
						d = s + O.numEntries;
					return (
						t.forEach((f, c) => {
							(a += ft.encode(f)),
								(i = t.maxId > u && d < l),
								i &&
									f &&
									(t.has(c + 1)
										? o.length === 0 &&
											(o.push(c), (d += O.singleOrRange), (d += O.vendorId))
										: (o.push(c), (d += O.vendorId), n.push(o), (o = [])));
						}),
						i
							? ((r += String(Fr.RANGE)), (r += this.buildRangeEncoding(n)))
							: ((r += String(Fr.FIELD)), (r += a)),
						r
					);
				}
				static decode(t, n) {
					let o,
						r = 0,
						a = F.decode(t.substr(r, O.maxId), O.maxId);
					r += O.maxId;
					let i = F.decode(t.charAt(r), O.encodingType);
					if (((r += O.encodingType), i === Fr.RANGE)) {
						if (((o = new et()), n === 1)) {
							if (t.substr(r, 1) === '1')
								throw new $e('Unable to decode default consent=1');
							r++;
						}
						let s = F.decode(t.substr(r, O.numEntries), O.numEntries);
						r += O.numEntries;
						for (let l = 0; l < s; l++) {
							let u = ft.decode(t.charAt(r));
							r += O.singleOrRange;
							let d = F.decode(t.substr(r, O.vendorId), O.vendorId);
							if (((r += O.vendorId), u)) {
								let f = F.decode(t.substr(r, O.vendorId), O.vendorId);
								r += O.vendorId;
								for (let c = d; c <= f; c++) o.set(c);
							} else o.set(d);
						}
					} else {
						let s = t.substr(r, a);
						(r += a), (o = Yt.decode(s, a));
					}
					return (o.bitLength = r), o;
				}
				static buildRangeEncoding(t) {
					let n = t.length,
						o = F.encode(n, O.numEntries);
					return (
						t.forEach((r) => {
							let a = r.length === 1;
							(o += ft.encode(!a)),
								(o += F.encode(r[0], O.vendorId)),
								a || (o += F.encode(r[1], O.vendorId));
						}),
						o
					);
				}
			};
		});
	function jc() {
		return {
			[R.version]: F,
			[R.created]: Oa,
			[R.lastUpdated]: Oa,
			[R.cmpId]: F,
			[R.cmpVersion]: F,
			[R.consentScreen]: F,
			[R.consentLanguage]: Ba,
			[R.vendorListVersion]: F,
			[R.policyVersion]: F,
			[R.isServiceSpecific]: ft,
			[R.useNonStandardTexts]: ft,
			[R.specialFeatureOptins]: Yt,
			[R.purposeConsents]: Yt,
			[R.purposeLegitimateInterests]: Yt,
			[R.purposeOneTreatment]: ft,
			[R.publisherCountryCode]: Ba,
			[R.vendorConsents]: Wn,
			[R.vendorLegitimateInterests]: Wn,
			[R.publisherRestrictions]: ws,
			segmentType: F,
			[R.vendorsDisclosed]: Wn,
			[R.vendorsAllowed]: Wn,
			[R.publisherConsents]: Yt,
			[R.publisherLegitimateInterests]: Yt,
			[R.numCustomPurposes]: F,
			[R.publisherCustomConsents]: Yt,
			[R.publisherCustomLegitimateInterests]: Yt,
		};
	}
	var hv = D(() => {
		Bt();
		_a();
		cm();
		Dc();
		Jo();
		um();
		dm();
		mm();
	});
	var pm = D(() => {
		_a();
		cm();
		hv();
		Dc();
		Jo();
		um();
		dm();
		fm();
		mm();
	});
	var As,
		vv = D(() => {
			Bt();
			As = class {
				constructor() {
					T(this, 1, {
						[se.CORE]: [
							R.version,
							R.created,
							R.lastUpdated,
							R.cmpId,
							R.cmpVersion,
							R.consentScreen,
							R.consentLanguage,
							R.vendorListVersion,
							R.purposeConsents,
							R.vendorConsents,
						],
					});
					T(this, 2, {
						[se.CORE]: [
							R.version,
							R.created,
							R.lastUpdated,
							R.cmpId,
							R.cmpVersion,
							R.consentScreen,
							R.consentLanguage,
							R.vendorListVersion,
							R.policyVersion,
							R.isServiceSpecific,
							R.useNonStandardTexts,
							R.specialFeatureOptins,
							R.purposeConsents,
							R.purposeLegitimateInterests,
							R.purposeOneTreatment,
							R.publisherCountryCode,
							R.vendorConsents,
							R.vendorLegitimateInterests,
							R.publisherRestrictions,
						],
						[se.VENDORS_DISCLOSED]: [R.vendorsDisclosed],
						[se.PUBLISHER_TC]: [
							R.publisherConsents,
							R.publisherLegitimateInterests,
							R.numCustomPurposes,
							R.publisherCustomConsents,
							R.publisherCustomLegitimateInterests,
						],
						[se.VENDORS_ALLOWED]: [R.vendorsAllowed],
					});
				}
			};
		});
	var Rs,
		yv = D(() => {
			Bt();
			Rs = class {
				constructor(t, n) {
					T(this, 1, [se.CORE]);
					T(this, 2, [se.CORE]);
					if (t.version === 2)
						if (t.isServiceSpecific)
							this[2].push(se.VENDORS_DISCLOSED), this[2].push(se.PUBLISHER_TC);
						else {
							let o = !!(n && n.isForVendors);
							(!o || t[R.supportOOB] === !0) &&
								this[2].push(se.VENDORS_DISCLOSED),
								o &&
									(t[R.supportOOB] &&
										t[R.vendorsAllowed].size > 0 &&
										this[2].push(se.VENDORS_ALLOWED),
									this[2].push(se.PUBLISHER_TC));
						}
				}
			};
		});
	var Cv = D(() => {});
	var gm = D(() => {
		vv();
		yv();
		Cv();
	});
	var qr,
		Sv = D(() => {
			rm();
			Bc();
			pm();
			gm();
			kt();
			am();
			Bt();
			qr = class {
				static encode(t, n) {
					let o;
					try {
						o = this.fieldSequence[String(t.version)][n];
					} catch {
						throw new dt(
							`Unable to encode version: ${t.version}, segment: ${n}`
						);
					}
					let r = '';
					n !== se.CORE && (r = F.encode(yo.KEY_TO_ID[n], O.segmentType));
					let a = jc();
					return (
						o.forEach((i) => {
							let s = t[i],
								l = a[i],
								u = O[i];
							u === void 0 &&
								this.isPublisherCustom(i) &&
								(u = Number(t[R.numCustomPurposes]));
							try {
								r += l.encode(s, u);
							} catch (d) {
								throw new dt(`Error encoding ${n}->${i}: ${d.message}`);
							}
						}),
						un.encode(r)
					);
				}
				static decode(t, n, o) {
					let r = un.decode(t),
						a = 0;
					o === se.CORE &&
						(n.version = F.decode(r.substr(a, O[R.version]), O[R.version])),
						o !== se.CORE && (a += O.segmentType);
					let i = this.fieldSequence[String(n.version)][o],
						s = jc();
					return (
						i.forEach((l) => {
							let u = s[l],
								d = O[l];
							if (
								(d === void 0 &&
									this.isPublisherCustom(l) &&
									(d = Number(n[R.numCustomPurposes])),
								d !== 0)
							) {
								let f = r.substr(a, d);
								if (
									(u === Wn
										? (n[l] = u.decode(f, n.version))
										: (n[l] = u.decode(f, d)),
									Number.isInteger(d))
								)
									a += d;
								else if (Number.isInteger(n[l].bitLength)) a += n[l].bitLength;
								else throw new $e(l);
							}
						}),
						n
					);
				}
				static isPublisherCustom(t) {
					return t.indexOf('publisherCustom') === 0;
				}
			};
			T(qr, 'fieldSequence', new As());
		});
	var Da,
		xv = D(() => {
			kt();
			Bt();
			Da = class {
				static process(t, n) {
					let o = t.gvl;
					if (!o) throw new dt('Unable to encode TCModel without a GVL');
					if (!o.isReady)
						throw new dt(
							'Unable to encode TCModel tcModel.gvl.readyPromise is not resolved'
						);
					(t = t.clone()),
						(t.consentLanguage = o.language.slice(0, 2).toUpperCase()),
						n?.version > 0 && n?.version <= this.processor.length
							? (t.version = n.version)
							: (t.version = this.processor.length);
					let r = t.version - 1;
					if (!this.processor[r]) throw new dt(`Invalid version: ${t.version}`);
					return this.processor[r](t, o);
				}
			};
			T(Da, 'processor', [
				(t) => t,
				(t, n) => {
					(t.publisherRestrictions.gvl = n),
						t.purposeLegitimateInterests.unset([1, 3, 4, 5, 6]);
					let o = new Map();
					return (
						o.set('legIntPurposes', t.vendorLegitimateInterests),
						o.set('purposes', t.vendorConsents),
						o.forEach((r, a) => {
							r.forEach((i, s) => {
								if (i) {
									let l = n.vendors[s];
									if (!l || l.deletedDate) r.unset(s);
									else if (l[a].length === 0)
										if (
											a === 'legIntPurposes' &&
											l.purposes.length === 0 &&
											l.legIntPurposes.length === 0 &&
											l.specialPurposes.length > 0
										)
											r.set(s);
										else if (
											a === 'legIntPurposes' &&
											l.purposes.length > 0 &&
											l.legIntPurposes.length === 0 &&
											l.specialPurposes.length > 0
										)
											r.set(s);
										else if (t.isServiceSpecific)
											if (l.flexiblePurposes.length === 0) r.unset(s);
											else {
												let u = t.publisherRestrictions.getRestrictions(s),
													d = !1;
												for (let f = 0, c = u.length; f < c && !d; f++)
													d =
														(u[f].restrictionType === Ot.REQUIRE_CONSENT &&
															a === 'purposes') ||
														(u[f].restrictionType === Ot.REQUIRE_LI &&
															a === 'legIntPurposes');
												d || r.unset(s);
											}
										else r.unset(s);
								}
							});
						}),
						t
					);
				},
			]);
		});
	var Mc = D(() => {
		rm();
		Bc();
		bv();
		Sv();
		xv();
		pm();
		gm();
	});
	var Es,
		bm = D(() => {
			Es = class {
				static absCall(t, n, o, r) {
					return new Promise((a, i) => {
						let s = new XMLHttpRequest(),
							l = () => {
								if (s.readyState == XMLHttpRequest.DONE)
									if (s.status >= 200 && s.status < 300) {
										let c = s.response;
										if (typeof c == 'string')
											try {
												c = JSON.parse(c);
											} catch {}
										a(c);
									} else
										i(
											new Error(
												`HTTP Status: ${s.status} response type: ${s.responseType}`
											)
										);
							},
							u = () => {
								i(new Error('error'));
							},
							d = () => {
								i(new Error('aborted'));
							},
							f = () => {
								i(new Error('Timeout ' + r + 'ms ' + t));
							};
						(s.withCredentials = o),
							s.addEventListener('load', l),
							s.addEventListener('error', u),
							s.addEventListener('abort', d),
							n === null ? s.open('GET', t, !0) : s.open('POST', t, !0),
							(s.responseType = 'json'),
							(s.timeout = r),
							(s.ontimeout = f),
							s.send(n);
					});
				}
				static post(t, n, o = !1, r = 0) {
					return this.absCall(t, JSON.stringify(n), o, r);
				}
				static fetch(t, n = !1, o = 0) {
					return this.absCall(t, null, n, o);
				}
			};
		});
	var G,
		Yr,
		hm = D(() => {
			Pr();
			kt();
			bm();
			Bt();
			G = class G extends qt {
				constructor(n, o) {
					super();
					T(this, 'readyPromise');
					T(this, 'gvlSpecificationVersion');
					T(this, 'vendorListVersion');
					T(this, 'tcfPolicyVersion');
					T(this, 'lastUpdated');
					T(this, 'purposes');
					T(this, 'specialPurposes');
					T(this, 'features');
					T(this, 'specialFeatures');
					T(this, 'isReady_', !1);
					T(this, 'vendors_');
					T(this, 'vendorIds');
					T(this, 'fullVendorList');
					T(this, 'byPurposeVendorMap');
					T(this, 'bySpecialPurposeVendorMap');
					T(this, 'byFeatureVendorMap');
					T(this, 'bySpecialFeatureVendorMap');
					T(this, 'stacks');
					T(this, 'dataCategories');
					T(this, 'lang_');
					T(this, 'cacheLang_');
					T(this, 'isLatest', !1);
					let r = G.baseUrl,
						a = o?.language;
					if (a)
						try {
							a = G.consentLanguages.parseLanguage(a);
						} catch (i) {
							throw new Qn('Error during parsing the language: ' + i.message);
						}
					if (
						((this.lang_ = a || G.DEFAULT_LANGUAGE),
						(this.cacheLang_ = a || G.DEFAULT_LANGUAGE),
						this.isVendorList(n))
					)
						this.populate(n), (this.readyPromise = Promise.resolve());
					else {
						if (!r)
							throw new Qn('must specify GVL.baseUrl before loading GVL json');
						if (n > 0) {
							let i = n;
							G.CACHE.has(i)
								? (this.populate(G.CACHE.get(i)),
									(this.readyPromise = Promise.resolve()))
								: ((r += G.versionedFilename.replace('[VERSION]', String(i))),
									(this.readyPromise = this.fetchJson(r)));
						} else
							G.CACHE.has(G.LATEST_CACHE_KEY)
								? (this.populate(G.CACHE.get(G.LATEST_CACHE_KEY)),
									(this.readyPromise = Promise.resolve()))
								: ((this.isLatest = !0),
									(this.readyPromise = this.fetchJson(r + G.latestFilename)));
					}
				}
				static set baseUrl(n) {
					if (/^https?:\/\/vendorlist\.consensu\.org\//.test(n))
						throw new Qn(
							'Invalid baseUrl!  You may not pull directly from vendorlist.consensu.org and must provide your own cache'
						);
					n.length > 0 && n[n.length - 1] !== '/' && (n += '/'),
						(this.baseUrl_ = n);
				}
				static get baseUrl() {
					return this.baseUrl_;
				}
				static emptyLanguageCache(n) {
					let o = !1;
					return (
						n == null && G.LANGUAGE_CACHE.size > 0
							? ((G.LANGUAGE_CACHE = new Map()), (o = !0))
							: typeof n == 'string' &&
								this.consentLanguages.has(n.toUpperCase()) &&
								(G.LANGUAGE_CACHE.delete(n.toUpperCase()), (o = !0)),
						o
					);
				}
				static emptyCache(n) {
					let o = !1;
					return (
						Number.isInteger(n) && n >= 0
							? (G.CACHE.delete(n), (o = !0))
							: n === void 0 && ((G.CACHE = new Map()), (o = !0)),
						o
					);
				}
				cacheLanguage() {
					G.LANGUAGE_CACHE.has(this.cacheLang_) ||
						G.LANGUAGE_CACHE.set(this.cacheLang_, {
							purposes: this.purposes,
							specialPurposes: this.specialPurposes,
							features: this.features,
							specialFeatures: this.specialFeatures,
							stacks: this.stacks,
							dataCategories: this.dataCategories,
						});
				}
				async fetchJson(n) {
					try {
						this.populate(await Es.fetch(n));
					} catch (o) {
						throw new Qn(o.message);
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
					let n = {};
					for (let o of Object.keys(this.specialFeatures))
						n[o] = G.cloneFeature(this.specialFeatures[o]);
					return n;
				}
				cloneFeatures() {
					let n = {};
					for (let o of Object.keys(this.features))
						n[o] = G.cloneFeature(this.features[o]);
					return n;
				}
				cloneStacks() {
					let n = {};
					for (let o of Object.keys(this.stacks))
						n[o] = G.cloneStack(this.stacks[o]);
					return n;
				}
				cloneDataCategories() {
					let n = {};
					for (let o of Object.keys(this.dataCategories))
						n[o] = G.cloneDataCategory(this.dataCategories[o]);
					return n;
				}
				cloneSpecialPurposes() {
					let n = {};
					for (let o of Object.keys(this.specialPurposes))
						n[o] = G.clonePurpose(this.specialPurposes[o]);
					return n;
				}
				clonePurposes() {
					let n = {};
					for (let o of Object.keys(this.purposes))
						n[o] = G.clonePurpose(this.purposes[o]);
					return n;
				}
				static clonePurpose(n) {
					return {
						id: n.id,
						name: n.name,
						description: n.description,
						...(n.descriptionLegal
							? { descriptionLegal: n.descriptionLegal }
							: {}),
						...(n.illustrations
							? { illustrations: Array.from(n.illustrations) }
							: {}),
					};
				}
				static cloneFeature(n) {
					return {
						id: n.id,
						name: n.name,
						description: n.description,
						...(n.descriptionLegal
							? { descriptionLegal: n.descriptionLegal }
							: {}),
						...(n.illustrations
							? { illustrations: Array.from(n.illustrations) }
							: {}),
					};
				}
				static cloneDataCategory(n) {
					return { id: n.id, name: n.name, description: n.description };
				}
				static cloneStack(n) {
					return {
						id: n.id,
						name: n.name,
						description: n.description,
						purposes: Array.from(n.purposes),
						specialFeatures: Array.from(n.specialFeatures),
					};
				}
				static cloneDataRetention(n) {
					return {
						...(typeof n.stdRetention == 'number'
							? { stdRetention: n.stdRetention }
							: {}),
						purposes: { ...n.purposes },
						specialPurposes: { ...n.specialPurposes },
					};
				}
				static cloneVendorUrls(n) {
					return n.map((o) => ({
						langId: o.langId,
						privacy: o.privacy,
						...(o.legIntClaim ? { legIntClaim: o.legIntClaim } : {}),
					}));
				}
				static cloneVendor(n) {
					return {
						id: n.id,
						name: n.name,
						purposes: Array.from(n.purposes),
						legIntPurposes: Array.from(n.legIntPurposes),
						flexiblePurposes: Array.from(n.flexiblePurposes),
						specialPurposes: Array.from(n.specialPurposes),
						features: Array.from(n.features),
						specialFeatures: Array.from(n.specialFeatures),
						...(n.overflow
							? { overflow: { httpGetLimit: n.overflow.httpGetLimit } }
							: {}),
						...(typeof n.cookieMaxAgeSeconds == 'number' ||
						n.cookieMaxAgeSeconds === null
							? { cookieMaxAgeSeconds: n.cookieMaxAgeSeconds }
							: {}),
						...(n.usesCookies !== void 0 ? { usesCookies: n.usesCookies } : {}),
						...(n.policyUrl ? { policyUrl: n.policyUrl } : {}),
						...(n.cookieRefresh !== void 0
							? { cookieRefresh: n.cookieRefresh }
							: {}),
						...(n.usesNonCookieAccess !== void 0
							? { usesNonCookieAccess: n.usesNonCookieAccess }
							: {}),
						...(n.dataRetention
							? { dataRetention: this.cloneDataRetention(n.dataRetention) }
							: {}),
						...(n.urls ? { urls: this.cloneVendorUrls(n.urls) } : {}),
						...(n.dataDeclaration
							? { dataDeclaration: Array.from(n.dataDeclaration) }
							: {}),
						...(n.deviceStorageDisclosureUrl
							? { deviceStorageDisclosureUrl: n.deviceStorageDisclosureUrl }
							: {}),
						...(n.deletedDate ? { deletedDate: n.deletedDate } : {}),
					};
				}
				cloneVendors() {
					let n = {};
					for (let o of Object.keys(this.fullVendorList))
						n[o] = G.cloneVendor(this.fullVendorList[o]);
					return n;
				}
				async changeLanguage(n) {
					let o = n;
					try {
						o = G.consentLanguages.parseLanguage(n);
					} catch (a) {
						throw new Qn('Error during parsing the language: ' + a.message);
					}
					let r = n.toUpperCase();
					if (
						!(
							o.toLowerCase() === G.DEFAULT_LANGUAGE.toLowerCase() &&
							!G.LANGUAGE_CACHE.has(r)
						) &&
						o !== this.lang_
					)
						if (((this.lang_ = o), G.LANGUAGE_CACHE.has(r))) {
							let a = G.LANGUAGE_CACHE.get(r);
							for (let i in a) a.hasOwnProperty(i) && (this[i] = a[i]);
						} else {
							let a =
								G.baseUrl +
								G.languageFilename.replace('[LANG]', this.lang_.toLowerCase());
							try {
								await this.fetchJson(a),
									(this.cacheLang_ = r),
									this.cacheLanguage();
							} catch (i) {
								throw new Qn('unable to load language: ' + i.message);
							}
						}
				}
				get language() {
					return this.lang_;
				}
				isVendorList(n) {
					return n !== void 0 && n.vendors !== void 0;
				}
				populate(n) {
					(this.purposes = n.purposes),
						(this.specialPurposes = n.specialPurposes),
						(this.features = n.features),
						(this.specialFeatures = n.specialFeatures),
						(this.stacks = n.stacks),
						(this.dataCategories = n.dataCategories),
						this.isVendorList(n) &&
							((this.gvlSpecificationVersion = n.gvlSpecificationVersion),
							(this.tcfPolicyVersion = n.tcfPolicyVersion),
							(this.vendorListVersion = n.vendorListVersion),
							(this.lastUpdated = n.lastUpdated),
							typeof this.lastUpdated == 'string' &&
								(this.lastUpdated = new Date(this.lastUpdated)),
							(this.vendors_ = n.vendors),
							(this.fullVendorList = n.vendors),
							this.mapVendors(),
							(this.isReady_ = !0),
							this.isLatest && G.CACHE.set(G.LATEST_CACHE_KEY, this.getJson()),
							G.CACHE.has(this.vendorListVersion) ||
								G.CACHE.set(this.vendorListVersion, this.getJson())),
						this.cacheLanguage();
				}
				mapVendors(n) {
					(this.byPurposeVendorMap = {}),
						(this.bySpecialPurposeVendorMap = {}),
						(this.byFeatureVendorMap = {}),
						(this.bySpecialFeatureVendorMap = {}),
						Object.keys(this.purposes).forEach((o) => {
							this.byPurposeVendorMap[o] = {
								legInt: new Set(),
								consent: new Set(),
								flexible: new Set(),
							};
						}),
						Object.keys(this.specialPurposes).forEach((o) => {
							this.bySpecialPurposeVendorMap[o] = new Set();
						}),
						Object.keys(this.features).forEach((o) => {
							this.byFeatureVendorMap[o] = new Set();
						}),
						Object.keys(this.specialFeatures).forEach((o) => {
							this.bySpecialFeatureVendorMap[o] = new Set();
						}),
						Array.isArray(n) ||
							(n = Object.keys(this.fullVendorList).map((o) => +o)),
						(this.vendorIds = new Set(n)),
						(this.vendors_ = n.reduce((o, r) => {
							let a = this.vendors_[String(r)];
							return (
								a &&
									a.deletedDate === void 0 &&
									(a.purposes.forEach((i) => {
										this.byPurposeVendorMap[String(i)].consent.add(r);
									}),
									a.specialPurposes.forEach((i) => {
										this.bySpecialPurposeVendorMap[String(i)].add(r);
									}),
									a.legIntPurposes.forEach((i) => {
										this.byPurposeVendorMap[String(i)].legInt.add(r);
									}),
									a.flexiblePurposes &&
										a.flexiblePurposes.forEach((i) => {
											this.byPurposeVendorMap[String(i)].flexible.add(r);
										}),
									a.features.forEach((i) => {
										this.byFeatureVendorMap[String(i)].add(r);
									}),
									a.specialFeatures.forEach((i) => {
										this.bySpecialFeatureVendorMap[String(i)].add(r);
									}),
									(o[r] = a)),
								o
							);
						}, {}));
				}
				getFilteredVendors(n, o, r, a) {
					let i = n.charAt(0).toUpperCase() + n.slice(1),
						s,
						l = {};
					return (
						n === 'purpose' && r
							? (s = this['by' + i + 'VendorMap'][String(o)][r])
							: (s =
									this['by' + (a ? 'Special' : '') + i + 'VendorMap'][
										String(o)
									]),
						s.forEach((u) => {
							l[String(u)] = this.vendors[String(u)];
						}),
						l
					);
				}
				getVendorsWithConsentPurpose(n) {
					return this.getFilteredVendors('purpose', n, 'consent');
				}
				getVendorsWithLegIntPurpose(n) {
					return this.getFilteredVendors('purpose', n, 'legInt');
				}
				getVendorsWithFlexiblePurpose(n) {
					return this.getFilteredVendors('purpose', n, 'flexible');
				}
				getVendorsWithSpecialPurpose(n) {
					return this.getFilteredVendors('purpose', n, void 0, !0);
				}
				getVendorsWithFeature(n) {
					return this.getFilteredVendors('feature', n);
				}
				getVendorsWithSpecialFeature(n) {
					return this.getFilteredVendors('feature', n, void 0, !0);
				}
				get vendors() {
					return this.vendors_;
				}
				narrowVendorsTo(n) {
					this.mapVendors(n);
				}
				get isReady() {
					return this.isReady_;
				}
				clone() {
					let n = new G(this.getJson());
					return (
						this.lang_ !== G.DEFAULT_LANGUAGE && n.changeLanguage(this.lang_), n
					);
				}
				static isInstanceOf(n) {
					return typeof n == 'object' && typeof n.narrowVendorsTo == 'function';
				}
			};
			T(G, 'LANGUAGE_CACHE', new Map()),
				T(G, 'CACHE', new Map()),
				T(G, 'LATEST_CACHE_KEY', 0),
				T(G, 'DEFAULT_LANGUAGE', 'EN'),
				T(G, 'consentLanguages', new Ts()),
				T(G, 'baseUrl_'),
				T(G, 'latestFilename', 'vendor-list.json'),
				T(G, 'versionedFilename', 'archives/vendor-list-v[VERSION].json'),
				T(G, 'languageFilename', 'purposes-[LANG].json');
			Yr = G;
		});
	var Ma,
		vm = D(() => {
			Pr();
			kt();
			hm();
			Bt();
			Ma = class extends qt {
				constructor(n) {
					super();
					T(this, 'isServiceSpecific_', !0);
					T(this, 'supportOOB_', !1);
					T(this, 'useNonStandardTexts_', !1);
					T(this, 'purposeOneTreatment_', !1);
					T(this, 'publisherCountryCode_', 'AA');
					T(this, 'version_', 2);
					T(this, 'consentScreen_', 0);
					T(this, 'policyVersion_', 5);
					T(this, 'consentLanguage_', 'EN');
					T(this, 'cmpId_', 0);
					T(this, 'cmpVersion_', 0);
					T(this, 'vendorListVersion_', 0);
					T(this, 'numCustomPurposes_', 0);
					T(this, 'gvl_');
					T(this, 'created');
					T(this, 'lastUpdated');
					T(this, 'specialFeatureOptins', new et());
					T(this, 'purposeConsents', new et());
					T(this, 'purposeLegitimateInterests', new et());
					T(this, 'publisherConsents', new et());
					T(this, 'publisherLegitimateInterests', new et());
					T(this, 'publisherCustomConsents', new et());
					T(this, 'publisherCustomLegitimateInterests', new et());
					T(this, 'customPurposes');
					T(this, 'vendorConsents', new et());
					T(this, 'vendorLegitimateInterests', new et());
					T(this, 'vendorsDisclosed', new et());
					T(this, 'vendorsAllowed', new et());
					T(this, 'publisherRestrictions', new Gr());
					n && (this.gvl = n), this.updated();
				}
				set gvl(n) {
					Yr.isInstanceOf(n) || (n = new Yr(n)),
						(this.gvl_ = n),
						(this.publisherRestrictions.gvl = n);
				}
				get gvl() {
					return this.gvl_;
				}
				set cmpId(n) {
					if (((n = Number(n)), Number.isInteger(n) && n > 1)) this.cmpId_ = n;
					else throw new Tt('cmpId', n);
				}
				get cmpId() {
					return this.cmpId_;
				}
				set cmpVersion(n) {
					if (((n = Number(n)), Number.isInteger(n) && n > -1))
						this.cmpVersion_ = n;
					else throw new Tt('cmpVersion', n);
				}
				get cmpVersion() {
					return this.cmpVersion_;
				}
				set consentScreen(n) {
					if (((n = Number(n)), Number.isInteger(n) && n > -1))
						this.consentScreen_ = n;
					else throw new Tt('consentScreen', n);
				}
				get consentScreen() {
					return this.consentScreen_;
				}
				set consentLanguage(n) {
					this.consentLanguage_ = n;
				}
				get consentLanguage() {
					return this.consentLanguage_;
				}
				set publisherCountryCode(n) {
					if (/^([A-z]){2}$/.test(n))
						this.publisherCountryCode_ = n.toUpperCase();
					else throw new Tt('publisherCountryCode', n);
				}
				get publisherCountryCode() {
					return this.publisherCountryCode_;
				}
				set vendorListVersion(n) {
					if (((n = Number(n) >> 0), n < 0))
						throw new Tt('vendorListVersion', n);
					this.vendorListVersion_ = n;
				}
				get vendorListVersion() {
					return this.gvl
						? this.gvl.vendorListVersion
						: this.vendorListVersion_;
				}
				set policyVersion(n) {
					if (
						((this.policyVersion_ = parseInt(n, 10)), this.policyVersion_ < 0)
					)
						throw new Tt('policyVersion', n);
				}
				get policyVersion() {
					return this.gvl ? this.gvl.tcfPolicyVersion : this.policyVersion_;
				}
				set version(n) {
					this.version_ = parseInt(n, 10);
				}
				get version() {
					return this.version_;
				}
				set isServiceSpecific(n) {
					this.isServiceSpecific_ = n;
				}
				get isServiceSpecific() {
					return this.isServiceSpecific_;
				}
				set useNonStandardTexts(n) {
					this.useNonStandardTexts_ = n;
				}
				get useNonStandardTexts() {
					return this.useNonStandardTexts_;
				}
				set supportOOB(n) {
					this.supportOOB_ = n;
				}
				get supportOOB() {
					return this.supportOOB_;
				}
				set purposeOneTreatment(n) {
					this.purposeOneTreatment_ = n;
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
					let n = this.numCustomPurposes_;
					if (typeof this.customPurposes == 'object') {
						let o = Object.keys(this.customPurposes).sort(
							(r, a) => Number(r) - Number(a)
						);
						n = parseInt(o.pop(), 10);
					}
					return n;
				}
				set numCustomPurposes(n) {
					if (
						((this.numCustomPurposes_ = parseInt(n, 10)),
						this.numCustomPurposes_ < 0)
					)
						throw new Tt('numCustomPurposes', n);
				}
				updated() {
					let n = new Date(),
						o = new Date(
							Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate())
						);
					(this.created = o), (this.lastUpdated = o);
				}
			};
			T(Ma, 'consentLanguages', Yr.consentLanguages);
		});
	var ym,
		Tv = D(() => {
			Mc();
			Bt();
			Jo();
			vm();
			ym = class {
				static encode(t, n) {
					let o = '',
						r;
					return (
						(t = Da.process(t, n)),
						Array.isArray(n?.segments)
							? (r = n.segments)
							: (r = new Rs(t, n)['' + t.version]),
						r.forEach((a, i) => {
							let s = '';
							i < r.length - 1 && (s = '.'), (o += qr.encode(t, a) + s);
						}),
						o
					);
				}
				static decode(t, n) {
					let o = t.split('.'),
						r = o.length;
					n || (n = new Ma());
					for (let a = 0; a < r; a++) {
						let i = o[a],
							l = un.decode(i.charAt(0)).substr(0, O.segmentType),
							u = yo.ID_TO_KEY[F.decode(l, O.segmentType).toString()];
						qr.decode(i, n, u);
					}
					return n;
				}
			};
		});
	var kv = {};
	is(kv, {
		Base64Url: () => un,
		BitLength: () => O,
		BooleanEncoder: () => ft,
		Cloneable: () => qt,
		ConsentLanguages: () => Ts,
		DateEncoder: () => Oa,
		DecodingError: () => $e,
		DeviceDisclosureStorageAccessType: () => sm,
		EncodingError: () => dt,
		FieldEncoderMap: () => jc,
		FieldSequence: () => As,
		Fields: () => R,
		FixedVectorEncoder: () => Yt,
		GVL: () => Yr,
		GVLError: () => Qn,
		IntEncoder: () => F,
		Json: () => Es,
		LangEncoder: () => Ba,
		PurposeRestriction: () => Jn,
		PurposeRestrictionVector: () => Gr,
		PurposeRestrictionVectorEncoder: () => ws,
		RestrictionType: () => Ot,
		Segment: () => se,
		SegmentEncoder: () => qr,
		SegmentIDs: () => yo,
		SegmentSequence: () => Rs,
		SemanticPreEncoder: () => Da,
		TCModel: () => Ma,
		TCModelError: () => Tt,
		TCString: () => ym,
		Vector: () => et,
		VectorEncodingType: () => Fr,
		VendorVectorEncoder: () => Wn,
	});
	var wv = D(() => {
		Mc();
		kt();
		Bt();
		Pr();
		hm();
		bm();
		vm();
		Tv();
	});
	async function Is() {
		return (
			ja ||
			Xr ||
			((Xr = Promise.resolve()
				.then(() => (wv(), kv))
				.then((e) => ((ja = e), (Xr = null), e))
				.catch((e) => {
					throw (
						((Xr = null),
						new Error(
							`Failed to load @iabtechlabtcf/core: ${e instanceof Error ? e.message : 'Unknown error'}. Make sure it is installed as a dependency.`
						))
					);
				})),
			Xr)
		);
	}
	function Av() {
		return ja !== null;
	}
	function Rv() {
		return ja;
	}
	function Ev() {
		(ja = null), (Xr = null);
	}
	var ja,
		Xr,
		Cm = D(() => {
			'use strict';
			(ja = null), (Xr = null);
		});
	async function Iv(e, t, n) {
		let { TCModel: o, TCString: r, GVL: a } = await Is(),
			i = new a(t),
			s = new o(i);
		(s.cmpId = n.cmpId),
			(s.cmpVersion =
				typeof n.cmpVersion == 'number'
					? n.cmpVersion
					: Number.parseInt(String(n.cmpVersion ?? '1'), 10) || 1),
			(s.consentScreen = n.consentScreen ?? 1),
			(s.consentLanguage = n.consentLanguage ?? 'EN'),
			(s.publisherCountryCode = n.publisherCountryCode ?? 'US'),
			(s.isServiceSpecific = n.isServiceSpecific ?? !0);
		for (let [l, u] of Object.entries(e.purposeConsents))
			u && s.purposeConsents.set(Number(l));
		for (let [l, u] of Object.entries(e.purposeLegitimateInterests))
			u && s.purposeLegitimateInterests.set(Number(l));
		for (let [l, u] of Object.entries(e.vendorConsents)) {
			let d = Number(l);
			u && Number.isFinite(d) && s.vendorConsents.set(d);
		}
		for (let [l, u] of Object.entries(e.vendorLegitimateInterests)) {
			let d = Number(l);
			u && Number.isFinite(d) && s.vendorLegitimateInterests.set(d);
		}
		for (let [l, u] of Object.entries(e.specialFeatureOptIns))
			u && s.specialFeatureOptins.set(Number(l));
		for (let [l, u] of Object.entries(e.vendorsDisclosed))
			u && s.vendorsDisclosed.set(Number(l));
		return r.encode(s);
	}
	async function za(e) {
		let { TCString: t } = await Is(),
			n = t.decode(e),
			o = (r, a) => {
				let i = {};
				for (let s = 1; s <= a; s++) r.has(s) && (i[s] = !0);
				return i;
			};
		return {
			cmpId: n.cmpId,
			cmpVersion: n.cmpVersion,
			consentLanguage: n.consentLanguage,
			isServiceSpecific: n.isServiceSpecific,
			purposeConsents: o(n.purposeConsents, 11),
			purposeLegitimateInterests: o(n.purposeLegitimateInterests, 11),
			vendorConsents: o(n.vendorConsents, 1e3),
			vendorLegitimateInterests: o(n.vendorLegitimateInterests, 1e3),
			specialFeatureOptIns: o(n.specialFeatureOptins, 2),
			vendorsDisclosed: o(n.vendorsDisclosed, 1e3),
			created: n.created,
			lastUpdated: n.lastUpdated,
			vendorListVersion: n.vendorListVersion,
			policyVersion: n.policyVersion,
		};
	}
	function Nv(e) {
		return !(
			!e ||
			typeof e != 'string' ||
			!/^[A-Za-z0-9_-]+$/.test(e) ||
			e.length < 10
		);
	}
	async function Lv(e, t) {
		return (await za(e)).vendorConsents[t] === !0;
	}
	async function _v(e, t) {
		return (await za(e)).purposeConsents[t] === !0;
	}
	var Sm = D(() => {
		'use strict';
		Cm();
	});
	function Ok(e, t, n) {
		if (typeof document > 'u') return;
		let o = n * 24 * 60 * 60;
		document.cookie = `${e}=${encodeURIComponent(t)}; max-age=${o}; path=/; SameSite=Lax`;
	}
	function Bk(e) {
		if (typeof document > 'u') return null;
		let t = document.cookie.match(new RegExp(`(^| )${e}=([^;]+)`));
		return t?.[2] ? decodeURIComponent(t[2]) : null;
	}
	function Ov(e) {
		let { cmpId: t = Ec, cmpVersion: n = Ic, gvl: o, gdprApplies: r = !0 } = e,
			a = '',
			i = 'loading',
			s = 'hidden',
			l = new Map(),
			u = 0,
			d = null;
		async function f(h, k) {
			if (d && d.tcString === a && !h) return d;
			let A = {},
				x = {},
				L = {},
				_ = {},
				N = {};
			if (a)
				try {
					let P = await za(a);
					(A = P.purposeConsents),
						(x = P.purposeLegitimateInterests),
						(L = P.vendorConsents),
						(_ = P.vendorLegitimateInterests),
						(N = P.specialFeatureOptIns);
				} catch {}
			let B = typeof n == 'number' ? n : Number.parseInt(String(n), 10) || 1,
				Z = {
					tcString: a,
					tcfPolicyVersion: o.tcfPolicyVersion,
					cmpId: t,
					cmpVersion: B,
					gdprApplies: r,
					listenerId: k,
					eventStatus: h,
					cmpStatus: i,
					isServiceSpecific: !0,
					useNonStandardTexts: !1,
					publisherCC: 'US',
					purposeOneTreatment: !1,
					purpose: { consents: A, legitimateInterests: x },
					vendor: { consents: L, legitimateInterests: _ },
					specialFeatureOptins: N,
					publisher: {
						consents: {},
						legitimateInterests: {},
						customPurpose: { consents: {}, legitimateInterests: {} },
						restrictions: {},
					},
				};
			return h || (d = Z), Z;
		}
		function c(h) {
			let k = {
				gdprApplies: r,
				cmpLoaded: i === 'loaded',
				cmpStatus: i,
				displayStatus: s,
				apiVersion: '2.3',
				cmpVersion: typeof n == 'string' ? n : String(n),
				cmpId: t,
				gvlVersion: o.vendorListVersion,
				tcfPolicyVersion: o.tcfPolicyVersion,
			};
			h(k, !0);
		}
		async function p(h, k) {
			let A = await f();
			h(A, !0);
		}
		async function v(h) {
			return p(h);
		}
		function C(h, k) {
			h(o, !0);
		}
		async function y(h) {
			let k = u++;
			l.set(k, h);
			let A = await f('tcloaded', k);
			h(A, !0);
		}
		function b(h, k) {
			let A = l.has(k);
			l.delete(k), h(A, !0);
		}
		async function g(h) {
			for (let [k, A] of l) {
				let x = await f(h, k);
				A(x, !0);
			}
		}
		function m() {
			if (typeof window > 'u') return;
			let h = Lc();
			(window.__tcfapi = (k, A, x, L) => {
				switch (k) {
					case 'ping':
						c(x);
						break;
					case 'getTCData':
						p(x, L);
						break;
					case 'getInAppTCData':
						v(x);
						break;
					case 'getVendorList':
						C(x, L);
						break;
					case 'addEventListener':
						y(x);
						break;
					case 'removeEventListener':
						b(x, L);
						break;
					default:
						x(null, !1);
				}
			}),
				_c();
			for (let k of h) window.__tcfapi?.(...k);
			i = 'loaded';
		}
		return (
			m(),
			{
				updateConsent: (h) => {
					(a = h), (d = null), (i = 'loaded'), g('useractioncomplete');
				},
				setDisplayStatus: (h) => {
					(s = h), h === 'visible' && g('cmpuishown');
				},
				loadFromStorage: () => {
					let h = Bk(zr.TC_STRING_COOKIE);
					if (h) return (a = h), (d = null), g('tcloaded'), h;
					if (typeof localStorage < 'u')
						try {
							let k = localStorage.getItem(zr.TC_STRING_LOCAL);
							if (k) return (a = k), (d = null), g('tcloaded'), k;
						} catch {}
					return null;
				},
				saveToStorage: (h) => {
					if ((Ok(zr.TC_STRING_COOKIE, h, 395), typeof localStorage < 'u'))
						try {
							localStorage.setItem(zr.TC_STRING_LOCAL, h);
						} catch {}
				},
				getTcString: () => a,
				destroy: () => {
					l.clear(), (d = null), typeof window < 'u' && delete window.__tcfapi;
				},
			}
		);
	}
	var Bv = D(() => {
		'use strict';
		nm();
		om();
		Sm();
		uc();
	});
	function Dv(e) {
		return xm[e] ?? null;
	}
	function Mv(e) {
		return Ns[e] ?? [];
	}
	function jv(e) {
		let t = {};
		for (let [n, o] of Object.entries(e)) {
			let r = Ns[n];
			if (r) for (let a of r) t[a] = o;
		}
		return t;
	}
	function zv(e) {
		let t = {
			necessary: !1,
			marketing: !1,
			experience: !1,
			measurement: !1,
			functionality: !1,
		};
		for (let [n, o] of Object.entries(Ns)) {
			let r = o.every((a) => e[a] === !0);
			t[n] = r;
		}
		return t;
	}
	function Vv(e, t = []) {
		return {
			consentRequired: e,
			legitInterest: t,
			all: [...new Set([...e, ...t])],
		};
	}
	function Uv(e, t, n, o) {
		let r = e.every((i) => n[i] === !0),
			a = t.every((i) => o[i] === !0);
		return r && a;
	}
	var xm,
		Ns,
		Hv = D(() => {
			'use strict';
			(xm = {
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
				(Ns = {
					necessary: [1],
					marketing: [2, 3, 4],
					experience: [5, 6],
					measurement: [7, 8, 9],
					functionality: [10, 11],
				});
		});
	function Tm(e, t) {
		let n = Array.isArray(e) ? e : Object.values(e),
			o = new Map();
		for (let d of n) o.set(d.id, d);
		let r = t ?? Ls,
			a = new Set(),
			i = [],
			s = o.get(1);
		s && (i.push(s), a.add(1));
		let l = [];
		for (let d of Object.values(r)) {
			let f = [];
			for (let c of d.purposes) {
				if (c === 1) continue;
				let p = o.get(c);
				p && (f.push(p), a.add(c));
			}
			f.length > 0 && l.push({ ...d, resolvedPurposes: f });
		}
		let u = [];
		for (let d of n) a.has(d.id) || u.push(d);
		return { stacks: l, standalonePurposes: i, ungroupedPurposes: u };
	}
	function Gv(e, t) {
		if (e === 1) return null;
		let n = t ?? Ls;
		for (let o of Object.values(n)) if (o.purposes.includes(e)) return o;
		return null;
	}
	function Fv(e) {
		return e === 1;
	}
	function qv(e, t, n) {
		let r = (n ?? Ls)[e];
		if (!r) return [];
		let a = Array.isArray(t) ? t : Object.values(t),
			i = new Map();
		for (let s of a) i.set(s.id, s);
		return r.purposes
			.filter((s) => s !== 1)
			.map((s) => i.get(s))
			.filter((s) => s !== void 0);
	}
	function Yv(e, t) {
		let { standalonePurposes: n, stacks: o, ungroupedPurposes: r } = Tm(e, t),
			a = [];
		a.push(...n);
		for (let i of o) a.push(...i.resolvedPurposes);
		return a.push(...r), a;
	}
	function Xv(e) {
		return Object.values(e).sort((t, n) => t.id - n.id);
	}
	var Pv,
		Ls,
		Kv = D(() => {
			'use strict';
			(Pv = 1),
				(Ls = {
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
	var $v = {};
	is($v, {
		createIABActions: () => Wv,
		createIABManager: () => km,
		createInitialIABState: () => Jv,
	});
	function Jv(e) {
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
	function Wv(e, t, n) {
		let o = (r) => {
			let { iab: a } = e();
			a && t({ iab: { ...a, ...r } });
		};
		return {
			_updateState: o,
			setPurposeConsent: (r, a) => {
				let { iab: i } = e();
				i && o({ purposeConsents: { ...i.purposeConsents, [r]: a } });
			},
			setPurposeLegitimateInterest: (r, a) => {
				let { iab: i } = e();
				i &&
					o({
						purposeLegitimateInterests: {
							...i.purposeLegitimateInterests,
							[r]: a,
						},
					});
			},
			setVendorConsent: (r, a) => {
				let { iab: i } = e();
				i && o({ vendorConsents: { ...i.vendorConsents, [String(r)]: a } });
			},
			setVendorLegitimateInterest: (r, a) => {
				let { iab: i } = e();
				i &&
					o({
						vendorLegitimateInterests: {
							...i.vendorLegitimateInterests,
							[String(r)]: a,
						},
					});
			},
			setSpecialFeatureOptIn: (r, a) => {
				let { iab: i } = e();
				i && o({ specialFeatureOptIns: { ...i.specialFeatureOptIns, [r]: a } });
			},
			setPreferenceCenterTab: (r) => {
				o({ preferenceCenterTab: r });
			},
			acceptAll: () => {
				let { iab: r } = e();
				if (!r?.gvl) return;
				let { purposeConsents: a, purposeLegitimateInterests: i } = Dk(
						r.gvl,
						!0
					),
					{ vendorConsents: s, vendorLegitimateInterests: l } = Qv(
						r.gvl,
						r.nonIABVendors,
						!0
					),
					u = Zv(r.gvl, !0);
				o({
					purposeConsents: a,
					purposeLegitimateInterests: i,
					vendorConsents: s,
					vendorLegitimateInterests: l,
					specialFeatureOptIns: u,
				});
			},
			rejectAll: () => {
				let { iab: r } = e();
				if (!r?.gvl) return;
				let a = { 1: !0 },
					i = {};
				for (let d of Object.keys(r.gvl.purposes))
					Number(d) !== 1 && ((a[Number(d)] = !1), (i[Number(d)] = !1));
				let { vendorConsents: s, vendorLegitimateInterests: l } = Qv(
						r.gvl,
						r.nonIABVendors,
						!1
					),
					u = Zv(r.gvl, !1);
				o({
					purposeConsents: a,
					purposeLegitimateInterests: i,
					vendorConsents: s,
					vendorLegitimateInterests: l,
					specialFeatureOptIns: u,
				});
			},
			save: async () => {
				let { iab: r, locationInfo: a, user: i, callbacks: s } = e();
				if (!r?.cmpApi || !r.gvl) return;
				let {
						config: l,
						gvl: u,
						cmpApi: d,
						purposeConsents: f,
						purposeLegitimateInterests: c,
						vendorConsents: p,
						vendorLegitimateInterests: v,
						specialFeatureOptIns: C,
					} = r,
					{ generateTCString: y, iabPurposesToC15tConsents: b } =
						await Promise.resolve().then(() => (Vc(), zc)),
					g = {};
				for (let N of Object.keys(u.vendors)) g[Number(N)] = !0;
				let m = await y(
					{
						purposeConsents: f,
						purposeLegitimateInterests: c,
						vendorConsents: p,
						vendorLegitimateInterests: v,
						specialFeatureOptIns: C,
						vendorsDisclosed: g,
					},
					u,
					{
						cmpId: l.cmpId ?? Ec,
						cmpVersion: l.cmpVersion ?? Ic,
						publisherCountryCode: l.publisherCountryCode ?? 'GB',
						isServiceSpecific: l.isServiceSpecific ?? !0,
					}
				);
				d.saveToStorage(m), d.updateConsent(m);
				let h = b(f),
					k = Date.now();
				o({ tcString: m, vendorsDisclosed: g });
				let A = e().consentInfo?.subjectId;
				A || (A = ys()),
					t({
						consents: h,
						selectedConsents: h,
						activeUI: 'none',
						consentInfo: {
							time: k,
							subjectId: A,
							externalId: i?.id,
							identityProvider: i?.identityProvider,
						},
					});
				let x = {},
					L = {};
				for (let N of r.nonIABVendors) {
					let B = String(N.id);
					N.purposes && N.purposes.length > 0 && (x[B] = p[B] ?? !1),
						N.legIntPurposes &&
							N.legIntPurposes.length > 0 &&
							(L[B] = v[B] ?? !0);
				}
				_n(
					{
						consents: h,
						consentInfo: {
							time: k,
							subjectId: A,
							externalId: i?.id,
							identityProvider: i?.identityProvider,
						},
						iabCustomVendorConsents: x,
						iabCustomVendorLegitimateInterests: L,
					},
					void 0,
					e().storageConfig
				),
					e().updateScripts();
				let _ = await n.setConsent({
					body: {
						subjectId: A,
						givenAt: k,
						type: 'cookie_banner',
						domain: typeof window < 'u' ? window.location.hostname : '',
						preferences: h,
						externalSubjectId: i?.id,
						identityProvider: i?.identityProvider,
						tcString: m,
						jurisdiction: a?.jurisdiction ?? void 0,
						jurisdictionModel: 'iab',
						metadata: { source: 'iab_tcf', acceptanceMethod: 'iab' },
					},
				});
				if (!_.ok) {
					let N = _.error?.message ?? 'Failed to save IAB consents';
					s.onError?.({ error: N }), s.onError || console.error(N);
				}
			},
		};
	}
	function km(e, t, n, o) {
		let r = Jv(e),
			a = Wv(t, n, o);
		return { ...r, ...a };
	}
	function Dk(e, t) {
		let n = {},
			o = {};
		for (let r of Object.keys(e.purposes))
			(n[Number(r)] = t), (o[Number(r)] = t);
		return { purposeConsents: n, purposeLegitimateInterests: o };
	}
	function Qv(e, t, n) {
		let o = {},
			r = {};
		for (let [a, i] of Object.entries(e.vendors)) {
			let s = String(a);
			i.purposes && i.purposes.length > 0 && (o[s] = n),
				i.legIntPurposes && i.legIntPurposes.length > 0 && (r[s] = n);
		}
		return (
			t.forEach((a) => {
				let i = String(a.id);
				a.purposes && a.purposes.length > 0 && (o[i] = n),
					a.legIntPurposes && a.legIntPurposes.length > 0 && (r[i] = n);
			}),
			{ vendorConsents: o, vendorLegitimateInterests: r }
		);
	}
	function Zv(e, t) {
		let n = {};
		for (let o of Object.keys(e.specialFeatures)) n[Number(o)] = t;
		return n;
	}
	var wm = D(() => {
		'use strict';
		Qo();
		gc();
		nm();
	});
	var zc = {};
	is(zc, {
		C15T_TO_IAB_PURPOSE_MAP: () => Ns,
		DEFAULT_STACKS: () => Ls,
		GVL_ENDPOINT: () => cc,
		IAB_PURPOSE_TO_C15T_MAP: () => xm,
		IAB_STORAGE_KEYS: () => zr,
		STANDALONE_PURPOSE_ID: () => Pv,
		c15tConsentsToIabPurposes: () => jv,
		c15tToIabPurposes: () => Mv,
		categorizeVendorPurposes: () => Vv,
		clearGVLCache: () => Yf,
		clearStubQueue: () => _c,
		createCMPApi: () => Ov,
		createIABManager: () => km,
		decodeTCString: () => za,
		destroyIABStub: () => A1,
		fetchGVL: () => Ff,
		flattenPurposesByStack: () => Yv,
		generateTCString: () => Iv,
		getCachedGVL: () => qf,
		getPurposesInStack: () => qv,
		getStackForPurpose: () => Gv,
		getStubQueue: () => Lc,
		getTCFCore: () => Is,
		getTCFCoreSync: () => Rv,
		groupPurposesIntoStacks: () => Tm,
		hasPurposeConsent: () => _v,
		hasVendorConsent: () => Lv,
		iabPurposeToC15t: () => Dv,
		iabPurposesToC15tConsents: () => zv,
		initializeIABStub: () => k1,
		isStandalonePurpose: () => Fv,
		isStubActive: () => w1,
		isStubInitialized: () => R1,
		isTCFCoreLoaded: () => Av,
		isValidTCStringFormat: () => Nv,
		purposesToArray: () => Xv,
		resetTCFCoreCache: () => Ev,
		setMockGVL: () => Xf,
		vendorHasRequiredConsents: () => Uv,
	});
	var Vc = D(() => {
		'use strict';
		Bv();
		fc();
		Cm();
		Hv();
		Kv();
		wm();
		om();
		Sm();
		uc();
	});
	var vy = qn((X) => {
		'use strict';
		var Bm = Symbol.for('react.transitional.element'),
			fw = Symbol.for('react.portal'),
			mw = Symbol.for('react.fragment'),
			pw = Symbol.for('react.strict_mode'),
			gw = Symbol.for('react.profiler'),
			bw = Symbol.for('react.consumer'),
			hw = Symbol.for('react.context'),
			vw = Symbol.for('react.forward_ref'),
			yw = Symbol.for('react.suspense'),
			Cw = Symbol.for('react.memo'),
			fy = Symbol.for('react.lazy'),
			Sw = Symbol.for('react.activity'),
			ly = Symbol.iterator;
		function xw(e) {
			return e === null || typeof e != 'object'
				? null
				: ((e = (ly && e[ly]) || e['@@iterator']),
					typeof e == 'function' ? e : null);
		}
		var my = {
				isMounted: function () {
					return !1;
				},
				enqueueForceUpdate: function () {},
				enqueueReplaceState: function () {},
				enqueueSetState: function () {},
			},
			py = Object.assign,
			gy = {};
		function Ha(e, t, n) {
			(this.props = e),
				(this.context = t),
				(this.refs = gy),
				(this.updater = n || my);
		}
		Ha.prototype.isReactComponent = {};
		Ha.prototype.setState = function (e, t) {
			if (typeof e != 'object' && typeof e != 'function' && e != null)
				throw Error(
					'takes an object of state variables to update or a function which returns an object of state variables.'
				);
			this.updater.enqueueSetState(this, e, t, 'setState');
		};
		Ha.prototype.forceUpdate = function (e) {
			this.updater.enqueueForceUpdate(this, e, 'forceUpdate');
		};
		function by() {}
		by.prototype = Ha.prototype;
		function Dm(e, t, n) {
			(this.props = e),
				(this.context = t),
				(this.refs = gy),
				(this.updater = n || my);
		}
		var Mm = (Dm.prototype = new by());
		Mm.constructor = Dm;
		py(Mm, Ha.prototype);
		Mm.isPureReactComponent = !0;
		var cy = Array.isArray;
		function Om() {}
		var Ce = { H: null, A: null, T: null, S: null },
			hy = Object.prototype.hasOwnProperty;
		function jm(e, t, n) {
			var o = n.ref;
			return {
				$$typeof: Bm,
				type: e,
				key: t,
				ref: o !== void 0 ? o : null,
				props: n,
			};
		}
		function Tw(e, t) {
			return jm(e.type, t, e.props);
		}
		function zm(e) {
			return typeof e == 'object' && e !== null && e.$$typeof === Bm;
		}
		function kw(e) {
			var t = { '=': '=0', ':': '=2' };
			return (
				'$' +
				e.replace(/[=:]/g, function (n) {
					return t[n];
				})
			);
		}
		var uy = /\/+/g;
		function _m(e, t) {
			return typeof e == 'object' && e !== null && e.key != null
				? kw('' + e.key)
				: t.toString(36);
		}
		function ww(e) {
			switch (e.status) {
				case 'fulfilled':
					return e.value;
				case 'rejected':
					throw e.reason;
				default:
					switch (
						(typeof e.status == 'string'
							? e.then(Om, Om)
							: ((e.status = 'pending'),
								e.then(
									function (t) {
										e.status === 'pending' &&
											((e.status = 'fulfilled'), (e.value = t));
									},
									function (t) {
										e.status === 'pending' &&
											((e.status = 'rejected'), (e.reason = t));
									}
								)),
						e.status)
					) {
						case 'fulfilled':
							return e.value;
						case 'rejected':
							throw e.reason;
					}
			}
			throw e;
		}
		function Ua(e, t, n, o, r) {
			var a = typeof e;
			(a === 'undefined' || a === 'boolean') && (e = null);
			var i = !1;
			if (e === null) i = !0;
			else
				switch (a) {
					case 'bigint':
					case 'string':
					case 'number':
						i = !0;
						break;
					case 'object':
						switch (e.$$typeof) {
							case Bm:
							case fw:
								i = !0;
								break;
							case fy:
								return (i = e._init), Ua(i(e._payload), t, n, o, r);
						}
				}
			if (i)
				return (
					(r = r(e)),
					(i = o === '' ? '.' + _m(e, 0) : o),
					cy(r)
						? ((n = ''),
							i != null && (n = i.replace(uy, '$&/') + '/'),
							Ua(r, t, n, '', function (u) {
								return u;
							}))
						: r != null &&
							(zm(r) &&
								(r = Tw(
									r,
									n +
										(r.key == null || (e && e.key === r.key)
											? ''
											: ('' + r.key).replace(uy, '$&/') + '/') +
										i
								)),
							t.push(r)),
					1
				);
			i = 0;
			var s = o === '' ? '.' : o + ':';
			if (cy(e))
				for (var l = 0; l < e.length; l++)
					(o = e[l]), (a = s + _m(o, l)), (i += Ua(o, t, n, a, r));
			else if (((l = xw(e)), typeof l == 'function'))
				for (e = l.call(e), l = 0; !(o = e.next()).done; )
					(o = o.value), (a = s + _m(o, l++)), (i += Ua(o, t, n, a, r));
			else if (a === 'object') {
				if (typeof e.then == 'function') return Ua(ww(e), t, n, o, r);
				throw (
					((t = String(e)),
					Error(
						'Objects are not valid as a React child (found: ' +
							(t === '[object Object]'
								? 'object with keys {' + Object.keys(e).join(', ') + '}'
								: t) +
							'). If you meant to render a collection of children, use an array instead.'
					))
				);
			}
			return i;
		}
		function Hc(e, t, n) {
			if (e == null) return e;
			var o = [],
				r = 0;
			return (
				Ua(e, o, '', '', function (a) {
					return t.call(n, a, r++);
				}),
				o
			);
		}
		function Aw(e) {
			if (e._status === -1) {
				var t = e._result;
				(t = t()),
					t.then(
						function (n) {
							(e._status === 0 || e._status === -1) &&
								((e._status = 1), (e._result = n));
						},
						function (n) {
							(e._status === 0 || e._status === -1) &&
								((e._status = 2), (e._result = n));
						}
					),
					e._status === -1 && ((e._status = 0), (e._result = t));
			}
			if (e._status === 1) return e._result.default;
			throw e._result;
		}
		var dy =
				typeof reportError == 'function'
					? reportError
					: function (e) {
							if (
								typeof window == 'object' &&
								typeof window.ErrorEvent == 'function'
							) {
								var t = new window.ErrorEvent('error', {
									bubbles: !0,
									cancelable: !0,
									message:
										typeof e == 'object' &&
										e !== null &&
										typeof e.message == 'string'
											? String(e.message)
											: String(e),
									error: e,
								});
								if (!window.dispatchEvent(t)) return;
							} else if (
								typeof process == 'object' &&
								typeof process.emit == 'function'
							) {
								process.emit('uncaughtException', e);
								return;
							}
							console.error(e);
						},
			Rw = {
				map: Hc,
				forEach: function (e, t, n) {
					Hc(
						e,
						function () {
							t.apply(this, arguments);
						},
						n
					);
				},
				count: function (e) {
					var t = 0;
					return (
						Hc(e, function () {
							t++;
						}),
						t
					);
				},
				toArray: function (e) {
					return (
						Hc(e, function (t) {
							return t;
						}) || []
					);
				},
				only: function (e) {
					if (!zm(e))
						throw Error(
							'React.Children.only expected to receive a single React element child.'
						);
					return e;
				},
			};
		X.Activity = Sw;
		X.Children = Rw;
		X.Component = Ha;
		X.Fragment = mw;
		X.Profiler = gw;
		X.PureComponent = Dm;
		X.StrictMode = pw;
		X.Suspense = yw;
		X.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = Ce;
		X.__COMPILER_RUNTIME = {
			__proto__: null,
			c: function (e) {
				return Ce.H.useMemoCache(e);
			},
		};
		X.cache = function (e) {
			return function () {
				return e.apply(null, arguments);
			};
		};
		X.cacheSignal = function () {
			return null;
		};
		X.cloneElement = function (e, t, n) {
			if (e == null)
				throw Error(
					'The argument must be a React element, but you passed ' + e + '.'
				);
			var o = py({}, e.props),
				r = e.key;
			if (t != null)
				for (a in (t.key !== void 0 && (r = '' + t.key), t))
					!hy.call(t, a) ||
						a === 'key' ||
						a === '__self' ||
						a === '__source' ||
						(a === 'ref' && t.ref === void 0) ||
						(o[a] = t[a]);
			var a = arguments.length - 2;
			if (a === 1) o.children = n;
			else if (1 < a) {
				for (var i = Array(a), s = 0; s < a; s++) i[s] = arguments[s + 2];
				o.children = i;
			}
			return jm(e.type, r, o);
		};
		X.createContext = function (e) {
			return (
				(e = {
					$$typeof: hw,
					_currentValue: e,
					_currentValue2: e,
					_threadCount: 0,
					Provider: null,
					Consumer: null,
				}),
				(e.Provider = e),
				(e.Consumer = { $$typeof: bw, _context: e }),
				e
			);
		};
		X.createElement = function (e, t, n) {
			var o,
				r = {},
				a = null;
			if (t != null)
				for (o in (t.key !== void 0 && (a = '' + t.key), t))
					hy.call(t, o) &&
						o !== 'key' &&
						o !== '__self' &&
						o !== '__source' &&
						(r[o] = t[o]);
			var i = arguments.length - 2;
			if (i === 1) r.children = n;
			else if (1 < i) {
				for (var s = Array(i), l = 0; l < i; l++) s[l] = arguments[l + 2];
				r.children = s;
			}
			if (e && e.defaultProps)
				for (o in ((i = e.defaultProps), i)) r[o] === void 0 && (r[o] = i[o]);
			return jm(e, a, r);
		};
		X.createRef = function () {
			return { current: null };
		};
		X.forwardRef = function (e) {
			return { $$typeof: vw, render: e };
		};
		X.isValidElement = zm;
		X.lazy = function (e) {
			return { $$typeof: fy, _payload: { _status: -1, _result: e }, _init: Aw };
		};
		X.memo = function (e, t) {
			return { $$typeof: Cw, type: e, compare: t === void 0 ? null : t };
		};
		X.startTransition = function (e) {
			var t = Ce.T,
				n = {};
			Ce.T = n;
			try {
				var o = e(),
					r = Ce.S;
				r !== null && r(n, o),
					typeof o == 'object' &&
						o !== null &&
						typeof o.then == 'function' &&
						o.then(Om, dy);
			} catch (a) {
				dy(a);
			} finally {
				t !== null && n.types !== null && (t.types = n.types), (Ce.T = t);
			}
		};
		X.unstable_useCacheRefresh = function () {
			return Ce.H.useCacheRefresh();
		};
		X.use = function (e) {
			return Ce.H.use(e);
		};
		X.useActionState = function (e, t, n) {
			return Ce.H.useActionState(e, t, n);
		};
		X.useCallback = function (e, t) {
			return Ce.H.useCallback(e, t);
		};
		X.useContext = function (e) {
			return Ce.H.useContext(e);
		};
		X.useDebugValue = function () {};
		X.useDeferredValue = function (e, t) {
			return Ce.H.useDeferredValue(e, t);
		};
		X.useEffect = function (e, t) {
			return Ce.H.useEffect(e, t);
		};
		X.useEffectEvent = function (e) {
			return Ce.H.useEffectEvent(e);
		};
		X.useId = function () {
			return Ce.H.useId();
		};
		X.useImperativeHandle = function (e, t, n) {
			return Ce.H.useImperativeHandle(e, t, n);
		};
		X.useInsertionEffect = function (e, t) {
			return Ce.H.useInsertionEffect(e, t);
		};
		X.useLayoutEffect = function (e, t) {
			return Ce.H.useLayoutEffect(e, t);
		};
		X.useMemo = function (e, t) {
			return Ce.H.useMemo(e, t);
		};
		X.useOptimistic = function (e, t) {
			return Ce.H.useOptimistic(e, t);
		};
		X.useReducer = function (e, t, n) {
			return Ce.H.useReducer(e, t, n);
		};
		X.useRef = function (e) {
			return Ce.H.useRef(e);
		};
		X.useState = function (e) {
			return Ce.H.useState(e);
		};
		X.useSyncExternalStore = function (e, t, n) {
			return Ce.H.useSyncExternalStore(e, t, n);
		};
		X.useTransition = function () {
			return Ce.H.useTransition();
		};
		X.version = '19.2.3';
	});
	var j = qn((QD, yy) => {
		'use strict';
		yy.exports = vy();
	});
	var Hy = qn((Rt) => {
		'use strict';
		var Lw = j();
		function Uy(e) {
			var t = 'https://react.dev/errors/' + e;
			if (1 < arguments.length) {
				t += '?args[]=' + encodeURIComponent(arguments[1]);
				for (var n = 2; n < arguments.length; n++)
					t += '&args[]=' + encodeURIComponent(arguments[n]);
			}
			return (
				'Minified React error #' +
				e +
				'; visit ' +
				t +
				' for the full message or use the non-minified dev environment for full errors and additional helpful warnings.'
			);
		}
		function Wo() {}
		var At = {
				d: {
					f: Wo,
					r: function () {
						throw Error(Uy(522));
					},
					D: Wo,
					C: Wo,
					L: Wo,
					m: Wo,
					X: Wo,
					S: Wo,
					M: Wo,
				},
				p: 0,
				findDOMNode: null,
			},
			_w = Symbol.for('react.portal');
		function Ow(e, t, n) {
			var o =
				3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
			return {
				$$typeof: _w,
				key: o == null ? null : '' + o,
				children: e,
				containerInfo: t,
				implementation: n,
			};
		}
		var _s = Lw.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
		function Kc(e, t) {
			if (e === 'font') return '';
			if (typeof t == 'string') return t === 'use-credentials' ? t : '';
		}
		Rt.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = At;
		Rt.createPortal = function (e, t) {
			var n =
				2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
			if (!t || (t.nodeType !== 1 && t.nodeType !== 9 && t.nodeType !== 11))
				throw Error(Uy(299));
			return Ow(e, t, null, n);
		};
		Rt.flushSync = function (e) {
			var t = _s.T,
				n = At.p;
			try {
				if (((_s.T = null), (At.p = 2), e)) return e();
			} finally {
				(_s.T = t), (At.p = n), At.d.f();
			}
		};
		Rt.preconnect = function (e, t) {
			typeof e == 'string' &&
				(t
					? ((t = t.crossOrigin),
						(t =
							typeof t == 'string'
								? t === 'use-credentials'
									? t
									: ''
								: void 0))
					: (t = null),
				At.d.C(e, t));
		};
		Rt.prefetchDNS = function (e) {
			typeof e == 'string' && At.d.D(e);
		};
		Rt.preinit = function (e, t) {
			if (typeof e == 'string' && t && typeof t.as == 'string') {
				var n = t.as,
					o = Kc(n, t.crossOrigin),
					r = typeof t.integrity == 'string' ? t.integrity : void 0,
					a = typeof t.fetchPriority == 'string' ? t.fetchPriority : void 0;
				n === 'style'
					? At.d.S(e, typeof t.precedence == 'string' ? t.precedence : void 0, {
							crossOrigin: o,
							integrity: r,
							fetchPriority: a,
						})
					: n === 'script' &&
						At.d.X(e, {
							crossOrigin: o,
							integrity: r,
							fetchPriority: a,
							nonce: typeof t.nonce == 'string' ? t.nonce : void 0,
						});
			}
		};
		Rt.preinitModule = function (e, t) {
			if (typeof e == 'string')
				if (typeof t == 'object' && t !== null) {
					if (t.as == null || t.as === 'script') {
						var n = Kc(t.as, t.crossOrigin);
						At.d.M(e, {
							crossOrigin: n,
							integrity: typeof t.integrity == 'string' ? t.integrity : void 0,
							nonce: typeof t.nonce == 'string' ? t.nonce : void 0,
						});
					}
				} else t == null && At.d.M(e);
		};
		Rt.preload = function (e, t) {
			if (
				typeof e == 'string' &&
				typeof t == 'object' &&
				t !== null &&
				typeof t.as == 'string'
			) {
				var n = t.as,
					o = Kc(n, t.crossOrigin);
				At.d.L(e, n, {
					crossOrigin: o,
					integrity: typeof t.integrity == 'string' ? t.integrity : void 0,
					nonce: typeof t.nonce == 'string' ? t.nonce : void 0,
					type: typeof t.type == 'string' ? t.type : void 0,
					fetchPriority:
						typeof t.fetchPriority == 'string' ? t.fetchPriority : void 0,
					referrerPolicy:
						typeof t.referrerPolicy == 'string' ? t.referrerPolicy : void 0,
					imageSrcSet:
						typeof t.imageSrcSet == 'string' ? t.imageSrcSet : void 0,
					imageSizes: typeof t.imageSizes == 'string' ? t.imageSizes : void 0,
					media: typeof t.media == 'string' ? t.media : void 0,
				});
			}
		};
		Rt.preloadModule = function (e, t) {
			if (typeof e == 'string')
				if (t) {
					var n = Kc(t.as, t.crossOrigin);
					At.d.m(e, {
						as: typeof t.as == 'string' && t.as !== 'script' ? t.as : void 0,
						crossOrigin: n,
						integrity: typeof t.integrity == 'string' ? t.integrity : void 0,
					});
				} else At.d.m(e);
		};
		Rt.requestFormReset = function (e) {
			At.d.r(e);
		};
		Rt.unstable_batchedUpdates = function (e, t) {
			return e(t);
		};
		Rt.useFormState = function (e, t, n) {
			return _s.H.useFormState(e, t, n);
		};
		Rt.useFormStatus = function () {
			return _s.H.useHostTransitionStatus();
		};
		Rt.version = '19.2.3';
	});
	var Co = qn((jM, Gy) => {
		'use strict';
		function Py() {
			if (
				!(
					typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > 'u' ||
					typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != 'function'
				)
			)
				try {
					__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(Py);
				} catch (e) {
					console.error(e);
				}
		}
		Py(), (Gy.exports = Hy());
	});
	var A5 = qn((ke) => {
		'use strict';
		function Gp(e, t) {
			var n = e.length;
			e.push(t);
			e: for (; 0 < n; ) {
				var o = (n - 1) >>> 1,
					r = e[o];
				if (0 < Ku(r, t)) (e[o] = t), (e[n] = r), (n = o);
				else break e;
			}
		}
		function so(e) {
			return e.length === 0 ? null : e[0];
		}
		function Zu(e) {
			if (e.length === 0) return null;
			var t = e[0],
				n = e.pop();
			if (n !== t) {
				e[0] = n;
				e: for (var o = 0, r = e.length, a = r >>> 1; o < a; ) {
					var i = 2 * (o + 1) - 1,
						s = e[i],
						l = i + 1,
						u = e[l];
					if (0 > Ku(s, n))
						l < r && 0 > Ku(u, s)
							? ((e[o] = u), (e[l] = n), (o = l))
							: ((e[o] = s), (e[i] = n), (o = i));
					else if (l < r && 0 > Ku(u, n)) (e[o] = u), (e[l] = n), (o = l);
					else break e;
				}
			}
			return t;
		}
		function Ku(e, t) {
			var n = e.sortIndex - t.sortIndex;
			return n !== 0 ? n : e.id - t.id;
		}
		ke.unstable_now = void 0;
		typeof performance == 'object' && typeof performance.now == 'function'
			? ((h5 = performance),
				(ke.unstable_now = function () {
					return h5.now();
				}))
			: ((Up = Date),
				(v5 = Up.now()),
				(ke.unstable_now = function () {
					return Up.now() - v5;
				}));
		var h5,
			Up,
			v5,
			Ro = [],
			ir = [],
			JE = 1,
			yn = null,
			xt = 3,
			Fp = !1,
			tl = !1,
			nl = !1,
			qp = !1,
			S5 = typeof setTimeout == 'function' ? setTimeout : null,
			x5 = typeof clearTimeout == 'function' ? clearTimeout : null,
			y5 = typeof setImmediate < 'u' ? setImmediate : null;
		function Qu(e) {
			for (var t = so(ir); t !== null; ) {
				if (t.callback === null) Zu(ir);
				else if (t.startTime <= e)
					Zu(ir), (t.sortIndex = t.expirationTime), Gp(Ro, t);
				else break;
				t = so(ir);
			}
		}
		function Yp(e) {
			if (((nl = !1), Qu(e), !tl))
				if (so(Ro) !== null) (tl = !0), pi || ((pi = !0), mi());
				else {
					var t = so(ir);
					t !== null && Xp(Yp, t.startTime - e);
				}
		}
		var pi = !1,
			ol = -1,
			T5 = 5,
			k5 = -1;
		function w5() {
			return qp ? !0 : !(ke.unstable_now() - k5 < T5);
		}
		function Hp() {
			if (((qp = !1), pi)) {
				var e = ke.unstable_now();
				k5 = e;
				var t = !0;
				try {
					e: {
						(tl = !1), nl && ((nl = !1), x5(ol), (ol = -1)), (Fp = !0);
						var n = xt;
						try {
							t: {
								for (
									Qu(e), yn = so(Ro);
									yn !== null && !(yn.expirationTime > e && w5());
								) {
									var o = yn.callback;
									if (typeof o == 'function') {
										(yn.callback = null), (xt = yn.priorityLevel);
										var r = o(yn.expirationTime <= e);
										if (((e = ke.unstable_now()), typeof r == 'function')) {
											(yn.callback = r), Qu(e), (t = !0);
											break t;
										}
										yn === so(Ro) && Zu(Ro), Qu(e);
									} else Zu(Ro);
									yn = so(Ro);
								}
								if (yn !== null) t = !0;
								else {
									var a = so(ir);
									a !== null && Xp(Yp, a.startTime - e), (t = !1);
								}
							}
							break e;
						} finally {
							(yn = null), (xt = n), (Fp = !1);
						}
						t = void 0;
					}
				} finally {
					t ? mi() : (pi = !1);
				}
			}
		}
		var mi;
		typeof y5 == 'function'
			? (mi = function () {
					y5(Hp);
				})
			: typeof MessageChannel < 'u'
				? ((Pp = new MessageChannel()),
					(C5 = Pp.port2),
					(Pp.port1.onmessage = Hp),
					(mi = function () {
						C5.postMessage(null);
					}))
				: (mi = function () {
						S5(Hp, 0);
					});
		var Pp, C5;
		function Xp(e, t) {
			ol = S5(function () {
				e(ke.unstable_now());
			}, t);
		}
		ke.unstable_IdlePriority = 5;
		ke.unstable_ImmediatePriority = 1;
		ke.unstable_LowPriority = 4;
		ke.unstable_NormalPriority = 3;
		ke.unstable_Profiling = null;
		ke.unstable_UserBlockingPriority = 2;
		ke.unstable_cancelCallback = function (e) {
			e.callback = null;
		};
		ke.unstable_forceFrameRate = function (e) {
			0 > e || 125 < e
				? console.error(
						'forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported'
					)
				: (T5 = 0 < e ? Math.floor(1e3 / e) : 5);
		};
		ke.unstable_getCurrentPriorityLevel = function () {
			return xt;
		};
		ke.unstable_next = function (e) {
			switch (xt) {
				case 1:
				case 2:
				case 3:
					var t = 3;
					break;
				default:
					t = xt;
			}
			var n = xt;
			xt = t;
			try {
				return e();
			} finally {
				xt = n;
			}
		};
		ke.unstable_requestPaint = function () {
			qp = !0;
		};
		ke.unstable_runWithPriority = function (e, t) {
			switch (e) {
				case 1:
				case 2:
				case 3:
				case 4:
				case 5:
					break;
				default:
					e = 3;
			}
			var n = xt;
			xt = e;
			try {
				return t();
			} finally {
				xt = n;
			}
		};
		ke.unstable_scheduleCallback = function (e, t, n) {
			var o = ke.unstable_now();
			switch (
				(typeof n == 'object' && n !== null
					? ((n = n.delay), (n = typeof n == 'number' && 0 < n ? o + n : o))
					: (n = o),
				e)
			) {
				case 1:
					var r = -1;
					break;
				case 2:
					r = 250;
					break;
				case 5:
					r = 1073741823;
					break;
				case 4:
					r = 1e4;
					break;
				default:
					r = 5e3;
			}
			return (
				(r = n + r),
				(e = {
					id: JE++,
					callback: t,
					priorityLevel: e,
					startTime: n,
					expirationTime: r,
					sortIndex: -1,
				}),
				n > o
					? ((e.sortIndex = n),
						Gp(ir, e),
						so(Ro) === null &&
							e === so(ir) &&
							(nl ? (x5(ol), (ol = -1)) : (nl = !0), Xp(Yp, n - o)))
					: ((e.sortIndex = r),
						Gp(Ro, e),
						tl || Fp || ((tl = !0), pi || ((pi = !0), mi()))),
				e
			);
		};
		ke.unstable_shouldYield = w5;
		ke.unstable_wrapCallback = function (e) {
			var t = xt;
			return function () {
				var n = xt;
				xt = t;
				try {
					return e.apply(this, arguments);
				} finally {
					xt = n;
				}
			};
		};
	});
	var E5 = qn((gH, R5) => {
		'use strict';
		R5.exports = A5();
	});
	var UT = qn((xf) => {
		'use strict';
		var rt = E5(),
			ex = j(),
			WE = Co();
		function I(e) {
			var t = 'https://react.dev/errors/' + e;
			if (1 < arguments.length) {
				t += '?args[]=' + encodeURIComponent(arguments[1]);
				for (var n = 2; n < arguments.length; n++)
					t += '&args[]=' + encodeURIComponent(arguments[n]);
			}
			return (
				'Minified React error #' +
				e +
				'; visit ' +
				t +
				' for the full message or use the non-minified dev environment for full errors and additional helpful warnings.'
			);
		}
		function tx(e) {
			return !(
				!e ||
				(e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11)
			);
		}
		function Gl(e) {
			var t = e,
				n = e;
			if (e.alternate) for (; t.return; ) t = t.return;
			else {
				e = t;
				do (t = e), (t.flags & 4098) !== 0 && (n = t.return), (e = t.return);
				while (e);
			}
			return t.tag === 3 ? n : null;
		}
		function nx(e) {
			if (e.tag === 13) {
				var t = e.memoizedState;
				if (
					(t === null &&
						((e = e.alternate), e !== null && (t = e.memoizedState)),
					t !== null)
				)
					return t.dehydrated;
			}
			return null;
		}
		function ox(e) {
			if (e.tag === 31) {
				var t = e.memoizedState;
				if (
					(t === null &&
						((e = e.alternate), e !== null && (t = e.memoizedState)),
					t !== null)
				)
					return t.dehydrated;
			}
			return null;
		}
		function I5(e) {
			if (Gl(e) !== e) throw Error(I(188));
		}
		function $E(e) {
			var t = e.alternate;
			if (!t) {
				if (((t = Gl(e)), t === null)) throw Error(I(188));
				return t !== e ? null : e;
			}
			for (var n = e, o = t; ; ) {
				var r = n.return;
				if (r === null) break;
				var a = r.alternate;
				if (a === null) {
					if (((o = r.return), o !== null)) {
						n = o;
						continue;
					}
					break;
				}
				if (r.child === a.child) {
					for (a = r.child; a; ) {
						if (a === n) return I5(r), e;
						if (a === o) return I5(r), t;
						a = a.sibling;
					}
					throw Error(I(188));
				}
				if (n.return !== o.return) (n = r), (o = a);
				else {
					for (var i = !1, s = r.child; s; ) {
						if (s === n) {
							(i = !0), (n = r), (o = a);
							break;
						}
						if (s === o) {
							(i = !0), (o = r), (n = a);
							break;
						}
						s = s.sibling;
					}
					if (!i) {
						for (s = a.child; s; ) {
							if (s === n) {
								(i = !0), (n = a), (o = r);
								break;
							}
							if (s === o) {
								(i = !0), (o = a), (n = r);
								break;
							}
							s = s.sibling;
						}
						if (!i) throw Error(I(189));
					}
				}
				if (n.alternate !== o) throw Error(I(190));
			}
			if (n.tag !== 3) throw Error(I(188));
			return n.stateNode.current === n ? e : t;
		}
		function rx(e) {
			var t = e.tag;
			if (t === 5 || t === 26 || t === 27 || t === 6) return e;
			for (e = e.child; e !== null; ) {
				if (((t = rx(e)), t !== null)) return t;
				e = e.sibling;
			}
			return null;
		}
		var Te = Object.assign,
			eI = Symbol.for('react.element'),
			Ju = Symbol.for('react.transitional.element'),
			dl = Symbol.for('react.portal'),
			Ci = Symbol.for('react.fragment'),
			ax = Symbol.for('react.strict_mode'),
			Rg = Symbol.for('react.profiler'),
			ix = Symbol.for('react.consumer'),
			Do = Symbol.for('react.context'),
			xb = Symbol.for('react.forward_ref'),
			Eg = Symbol.for('react.suspense'),
			Ig = Symbol.for('react.suspense_list'),
			Tb = Symbol.for('react.memo'),
			sr = Symbol.for('react.lazy'),
			Ng = Symbol.for('react.activity'),
			tI = Symbol.for('react.memo_cache_sentinel'),
			N5 = Symbol.iterator;
		function rl(e) {
			return e === null || typeof e != 'object'
				? null
				: ((e = (N5 && e[N5]) || e['@@iterator']),
					typeof e == 'function' ? e : null);
		}
		var nI = Symbol.for('react.client.reference');
		function Lg(e) {
			if (e == null) return null;
			if (typeof e == 'function')
				return e.$$typeof === nI ? null : e.displayName || e.name || null;
			if (typeof e == 'string') return e;
			switch (e) {
				case Ci:
					return 'Fragment';
				case Rg:
					return 'Profiler';
				case ax:
					return 'StrictMode';
				case Eg:
					return 'Suspense';
				case Ig:
					return 'SuspenseList';
				case Ng:
					return 'Activity';
			}
			if (typeof e == 'object')
				switch (e.$$typeof) {
					case dl:
						return 'Portal';
					case Do:
						return e.displayName || 'Context';
					case ix:
						return (e._context.displayName || 'Context') + '.Consumer';
					case xb:
						var t = e.render;
						return (
							(e = e.displayName),
							e ||
								((e = t.displayName || t.name || ''),
								(e = e !== '' ? 'ForwardRef(' + e + ')' : 'ForwardRef')),
							e
						);
					case Tb:
						return (
							(t = e.displayName || null), t !== null ? t : Lg(e.type) || 'Memo'
						);
					case sr:
						(t = e._payload), (e = e._init);
						try {
							return Lg(e(t));
						} catch {}
				}
			return null;
		}
		var fl = Array.isArray,
			q = ex.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
			ie = WE.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
			sa = { pending: !1, data: null, method: null, action: null },
			_g = [],
			Si = -1;
		function mo(e) {
			return { current: e };
		}
		function ut(e) {
			0 > Si || ((e.current = _g[Si]), (_g[Si] = null), Si--);
		}
		function ye(e, t) {
			Si++, (_g[Si] = e.current), (e.current = t);
		}
		var fo = mo(null),
			Il = mo(null),
			vr = mo(null),
			Nd = mo(null);
		function Ld(e, t) {
			switch ((ye(vr, t), ye(Il, e), ye(fo, null), t.nodeType)) {
				case 9:
				case 11:
					e = (e = t.documentElement) && (e = e.namespaceURI) ? jS(e) : 0;
					break;
				default:
					if (((e = t.tagName), (t = t.namespaceURI)))
						(t = jS(t)), (e = AT(t, e));
					else
						switch (e) {
							case 'svg':
								e = 1;
								break;
							case 'math':
								e = 2;
								break;
							default:
								e = 0;
						}
			}
			ut(fo), ye(fo, e);
		}
		function Vi() {
			ut(fo), ut(Il), ut(vr);
		}
		function Og(e) {
			e.memoizedState !== null && ye(Nd, e);
			var t = fo.current,
				n = AT(t, e.type);
			t !== n && (ye(Il, e), ye(fo, n));
		}
		function _d(e) {
			Il.current === e && (ut(fo), ut(Il)),
				Nd.current === e && (ut(Nd), (Ul._currentValue = sa));
		}
		var Kp, L5;
		function oa(e) {
			if (Kp === void 0)
				try {
					throw Error();
				} catch (n) {
					var t = n.stack.trim().match(/\n( *(at )?)/);
					(Kp = (t && t[1]) || ''),
						(L5 =
							-1 <
							n.stack.indexOf(`
    at`)
								? ' (<anonymous>)'
								: -1 < n.stack.indexOf('@')
									? '@unknown:0:0'
									: '');
				}
			return (
				`
` +
				Kp +
				e +
				L5
			);
		}
		var Qp = !1;
		function Zp(e, t) {
			if (!e || Qp) return '';
			Qp = !0;
			var n = Error.prepareStackTrace;
			Error.prepareStackTrace = void 0;
			try {
				var o = {
					DetermineComponentFrameRoot: function () {
						try {
							if (t) {
								var f = function () {
									throw Error();
								};
								if (
									(Object.defineProperty(f.prototype, 'props', {
										set: function () {
											throw Error();
										},
									}),
									typeof Reflect == 'object' && Reflect.construct)
								) {
									try {
										Reflect.construct(f, []);
									} catch (p) {
										var c = p;
									}
									Reflect.construct(e, [], f);
								} else {
									try {
										f.call();
									} catch (p) {
										c = p;
									}
									e.call(f.prototype);
								}
							} else {
								try {
									throw Error();
								} catch (p) {
									c = p;
								}
								(f = e()) &&
									typeof f.catch == 'function' &&
									f.catch(function () {});
							}
						} catch (p) {
							if (p && c && typeof p.stack == 'string')
								return [p.stack, c.stack];
						}
						return [null, null];
					},
				};
				o.DetermineComponentFrameRoot.displayName =
					'DetermineComponentFrameRoot';
				var r = Object.getOwnPropertyDescriptor(
					o.DetermineComponentFrameRoot,
					'name'
				);
				r &&
					r.configurable &&
					Object.defineProperty(o.DetermineComponentFrameRoot, 'name', {
						value: 'DetermineComponentFrameRoot',
					});
				var a = o.DetermineComponentFrameRoot(),
					i = a[0],
					s = a[1];
				if (i && s) {
					var l = i.split(`
`),
						u = s.split(`
`);
					for (
						r = o = 0;
						o < l.length && !l[o].includes('DetermineComponentFrameRoot');
					)
						o++;
					for (
						;
						r < u.length && !u[r].includes('DetermineComponentFrameRoot');
					)
						r++;
					if (o === l.length || r === u.length)
						for (
							o = l.length - 1, r = u.length - 1;
							1 <= o && 0 <= r && l[o] !== u[r];
						)
							r--;
					for (; 1 <= o && 0 <= r; o--, r--)
						if (l[o] !== u[r]) {
							if (o !== 1 || r !== 1)
								do
									if ((o--, r--, 0 > r || l[o] !== u[r])) {
										var d =
											`
` + l[o].replace(' at new ', ' at ');
										return (
											e.displayName &&
												d.includes('<anonymous>') &&
												(d = d.replace('<anonymous>', e.displayName)),
											d
										);
									}
								while (1 <= o && 0 <= r);
							break;
						}
				}
			} finally {
				(Qp = !1), (Error.prepareStackTrace = n);
			}
			return (n = e ? e.displayName || e.name : '') ? oa(n) : '';
		}
		function oI(e, t) {
			switch (e.tag) {
				case 26:
				case 27:
				case 5:
					return oa(e.type);
				case 16:
					return oa('Lazy');
				case 13:
					return e.child !== t && t !== null
						? oa('Suspense Fallback')
						: oa('Suspense');
				case 19:
					return oa('SuspenseList');
				case 0:
				case 15:
					return Zp(e.type, !1);
				case 11:
					return Zp(e.type.render, !1);
				case 1:
					return Zp(e.type, !0);
				case 31:
					return oa('Activity');
				default:
					return '';
			}
		}
		function _5(e) {
			try {
				var t = '',
					n = null;
				do (t += oI(e, n)), (n = e), (e = e.return);
				while (e);
				return t;
			} catch (o) {
				return (
					`
Error generating stack: ` +
					o.message +
					`
` +
					o.stack
				);
			}
		}
		var Bg = Object.prototype.hasOwnProperty,
			kb = rt.unstable_scheduleCallback,
			Jp = rt.unstable_cancelCallback,
			rI = rt.unstable_shouldYield,
			aI = rt.unstable_requestPaint,
			nn = rt.unstable_now,
			iI = rt.unstable_getCurrentPriorityLevel,
			sx = rt.unstable_ImmediatePriority,
			lx = rt.unstable_UserBlockingPriority,
			Od = rt.unstable_NormalPriority,
			sI = rt.unstable_LowPriority,
			cx = rt.unstable_IdlePriority,
			lI = rt.log,
			cI = rt.unstable_setDisableYieldValue,
			Fl = null,
			on = null;
		function mr(e) {
			if (
				(typeof lI == 'function' && cI(e),
				on && typeof on.setStrictMode == 'function')
			)
				try {
					on.setStrictMode(Fl, e);
				} catch {}
		}
		var rn = Math.clz32 ? Math.clz32 : fI,
			uI = Math.log,
			dI = Math.LN2;
		function fI(e) {
			return (e >>>= 0), e === 0 ? 32 : (31 - ((uI(e) / dI) | 0)) | 0;
		}
		var Wu = 256,
			$u = 262144,
			ed = 4194304;
		function ra(e) {
			var t = e & 42;
			if (t !== 0) return t;
			switch (e & -e) {
				case 1:
					return 1;
				case 2:
					return 2;
				case 4:
					return 4;
				case 8:
					return 8;
				case 16:
					return 16;
				case 32:
					return 32;
				case 64:
					return 64;
				case 128:
					return 128;
				case 256:
				case 512:
				case 1024:
				case 2048:
				case 4096:
				case 8192:
				case 16384:
				case 32768:
				case 65536:
				case 131072:
					return e & 261888;
				case 262144:
				case 524288:
				case 1048576:
				case 2097152:
					return e & 3932160;
				case 4194304:
				case 8388608:
				case 16777216:
				case 33554432:
					return e & 62914560;
				case 67108864:
					return 67108864;
				case 134217728:
					return 134217728;
				case 268435456:
					return 268435456;
				case 536870912:
					return 536870912;
				case 1073741824:
					return 0;
				default:
					return e;
			}
		}
		function af(e, t, n) {
			var o = e.pendingLanes;
			if (o === 0) return 0;
			var r = 0,
				a = e.suspendedLanes,
				i = e.pingedLanes;
			e = e.warmLanes;
			var s = o & 134217727;
			return (
				s !== 0
					? ((o = s & ~a),
						o !== 0
							? (r = ra(o))
							: ((i &= s),
								i !== 0
									? (r = ra(i))
									: n || ((n = s & ~e), n !== 0 && (r = ra(n)))))
					: ((s = o & ~a),
						s !== 0
							? (r = ra(s))
							: i !== 0
								? (r = ra(i))
								: n || ((n = o & ~e), n !== 0 && (r = ra(n)))),
				r === 0
					? 0
					: t !== 0 &&
							t !== r &&
							(t & a) === 0 &&
							((a = r & -r),
							(n = t & -t),
							a >= n || (a === 32 && (n & 4194048) !== 0))
						? t
						: r
			);
		}
		function ql(e, t) {
			return (e.pendingLanes & ~(e.suspendedLanes & ~e.pingedLanes) & t) === 0;
		}
		function mI(e, t) {
			switch (e) {
				case 1:
				case 2:
				case 4:
				case 8:
				case 64:
					return t + 250;
				case 16:
				case 32:
				case 128:
				case 256:
				case 512:
				case 1024:
				case 2048:
				case 4096:
				case 8192:
				case 16384:
				case 32768:
				case 65536:
				case 131072:
				case 262144:
				case 524288:
				case 1048576:
				case 2097152:
					return t + 5e3;
				case 4194304:
				case 8388608:
				case 16777216:
				case 33554432:
					return -1;
				case 67108864:
				case 134217728:
				case 268435456:
				case 536870912:
				case 1073741824:
					return -1;
				default:
					return -1;
			}
		}
		function ux() {
			var e = ed;
			return (ed <<= 1), (ed & 62914560) === 0 && (ed = 4194304), e;
		}
		function Wp(e) {
			for (var t = [], n = 0; 31 > n; n++) t.push(e);
			return t;
		}
		function Yl(e, t) {
			(e.pendingLanes |= t),
				t !== 268435456 &&
					((e.suspendedLanes = 0), (e.pingedLanes = 0), (e.warmLanes = 0));
		}
		function pI(e, t, n, o, r, a) {
			var i = e.pendingLanes;
			(e.pendingLanes = n),
				(e.suspendedLanes = 0),
				(e.pingedLanes = 0),
				(e.warmLanes = 0),
				(e.expiredLanes &= n),
				(e.entangledLanes &= n),
				(e.errorRecoveryDisabledLanes &= n),
				(e.shellSuspendCounter = 0);
			var s = e.entanglements,
				l = e.expirationTimes,
				u = e.hiddenUpdates;
			for (n = i & ~n; 0 < n; ) {
				var d = 31 - rn(n),
					f = 1 << d;
				(s[d] = 0), (l[d] = -1);
				var c = u[d];
				if (c !== null)
					for (u[d] = null, d = 0; d < c.length; d++) {
						var p = c[d];
						p !== null && (p.lane &= -536870913);
					}
				n &= ~f;
			}
			o !== 0 && dx(e, o, 0),
				a !== 0 &&
					r === 0 &&
					e.tag !== 0 &&
					(e.suspendedLanes |= a & ~(i & ~t));
		}
		function dx(e, t, n) {
			(e.pendingLanes |= t), (e.suspendedLanes &= ~t);
			var o = 31 - rn(t);
			(e.entangledLanes |= t),
				(e.entanglements[o] = e.entanglements[o] | 1073741824 | (n & 261930));
		}
		function fx(e, t) {
			var n = (e.entangledLanes |= t);
			for (e = e.entanglements; n; ) {
				var o = 31 - rn(n),
					r = 1 << o;
				(r & t) | (e[o] & t) && (e[o] |= t), (n &= ~r);
			}
		}
		function mx(e, t) {
			var n = t & -t;
			return (
				(n = (n & 42) !== 0 ? 1 : wb(n)),
				(n & (e.suspendedLanes | t)) !== 0 ? 0 : n
			);
		}
		function wb(e) {
			switch (e) {
				case 2:
					e = 1;
					break;
				case 8:
					e = 4;
					break;
				case 32:
					e = 16;
					break;
				case 256:
				case 512:
				case 1024:
				case 2048:
				case 4096:
				case 8192:
				case 16384:
				case 32768:
				case 65536:
				case 131072:
				case 262144:
				case 524288:
				case 1048576:
				case 2097152:
				case 4194304:
				case 8388608:
				case 16777216:
				case 33554432:
					e = 128;
					break;
				case 268435456:
					e = 134217728;
					break;
				default:
					e = 0;
			}
			return e;
		}
		function Ab(e) {
			return (
				(e &= -e),
				2 < e ? (8 < e ? ((e & 134217727) !== 0 ? 32 : 268435456) : 8) : 2
			);
		}
		function px() {
			var e = ie.p;
			return e !== 0 ? e : ((e = window.event), e === void 0 ? 32 : jT(e.type));
		}
		function O5(e, t) {
			var n = ie.p;
			try {
				return (ie.p = e), t();
			} finally {
				ie.p = n;
			}
		}
		var Lr = Math.random().toString(36).slice(2),
			bt = '__reactFiber$' + Lr,
			Gt = '__reactProps$' + Lr,
			Zi = '__reactContainer$' + Lr,
			Dg = '__reactEvents$' + Lr,
			gI = '__reactListeners$' + Lr,
			bI = '__reactHandles$' + Lr,
			B5 = '__reactResources$' + Lr,
			Xl = '__reactMarker$' + Lr;
		function Rb(e) {
			delete e[bt], delete e[Gt], delete e[Dg], delete e[gI], delete e[bI];
		}
		function xi(e) {
			var t = e[bt];
			if (t) return t;
			for (var n = e.parentNode; n; ) {
				if ((t = n[Zi] || n[bt])) {
					if (
						((n = t.alternate),
						t.child !== null || (n !== null && n.child !== null))
					)
						for (e = PS(e); e !== null; ) {
							if ((n = e[bt])) return n;
							e = PS(e);
						}
					return t;
				}
				(e = n), (n = e.parentNode);
			}
			return null;
		}
		function Ji(e) {
			if ((e = e[bt] || e[Zi])) {
				var t = e.tag;
				if (
					t === 5 ||
					t === 6 ||
					t === 13 ||
					t === 31 ||
					t === 26 ||
					t === 27 ||
					t === 3
				)
					return e;
			}
			return null;
		}
		function ml(e) {
			var t = e.tag;
			if (t === 5 || t === 26 || t === 27 || t === 6) return e.stateNode;
			throw Error(I(33));
		}
		function _i(e) {
			var t = e[B5];
			return (
				t ||
					(t = e[B5] =
						{ hoistableStyles: new Map(), hoistableScripts: new Map() }),
				t
			);
		}
		function ct(e) {
			e[Xl] = !0;
		}
		var gx = new Set(),
			bx = {};
		function ha(e, t) {
			Ui(e, t), Ui(e + 'Capture', t);
		}
		function Ui(e, t) {
			for (bx[e] = t, e = 0; e < t.length; e++) gx.add(t[e]);
		}
		var hI = RegExp(
				'^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$'
			),
			D5 = {},
			M5 = {};
		function vI(e) {
			return Bg.call(M5, e)
				? !0
				: Bg.call(D5, e)
					? !1
					: hI.test(e)
						? (M5[e] = !0)
						: ((D5[e] = !0), !1);
		}
		function gd(e, t, n) {
			if (vI(t))
				if (n === null) e.removeAttribute(t);
				else {
					switch (typeof n) {
						case 'undefined':
						case 'function':
						case 'symbol':
							e.removeAttribute(t);
							return;
						case 'boolean':
							var o = t.toLowerCase().slice(0, 5);
							if (o !== 'data-' && o !== 'aria-') {
								e.removeAttribute(t);
								return;
							}
					}
					e.setAttribute(t, '' + n);
				}
		}
		function td(e, t, n) {
			if (n === null) e.removeAttribute(t);
			else {
				switch (typeof n) {
					case 'undefined':
					case 'function':
					case 'symbol':
					case 'boolean':
						e.removeAttribute(t);
						return;
				}
				e.setAttribute(t, '' + n);
			}
		}
		function Eo(e, t, n, o) {
			if (o === null) e.removeAttribute(n);
			else {
				switch (typeof o) {
					case 'undefined':
					case 'function':
					case 'symbol':
					case 'boolean':
						e.removeAttribute(n);
						return;
				}
				e.setAttributeNS(t, n, '' + o);
			}
		}
		function Sn(e) {
			switch (typeof e) {
				case 'bigint':
				case 'boolean':
				case 'number':
				case 'string':
				case 'undefined':
					return e;
				case 'object':
					return e;
				default:
					return '';
			}
		}
		function hx(e) {
			var t = e.type;
			return (
				(e = e.nodeName) &&
				e.toLowerCase() === 'input' &&
				(t === 'checkbox' || t === 'radio')
			);
		}
		function yI(e, t, n) {
			var o = Object.getOwnPropertyDescriptor(e.constructor.prototype, t);
			if (
				!e.hasOwnProperty(t) &&
				typeof o < 'u' &&
				typeof o.get == 'function' &&
				typeof o.set == 'function'
			) {
				var r = o.get,
					a = o.set;
				return (
					Object.defineProperty(e, t, {
						configurable: !0,
						get: function () {
							return r.call(this);
						},
						set: function (i) {
							(n = '' + i), a.call(this, i);
						},
					}),
					Object.defineProperty(e, t, { enumerable: o.enumerable }),
					{
						getValue: function () {
							return n;
						},
						setValue: function (i) {
							n = '' + i;
						},
						stopTracking: function () {
							(e._valueTracker = null), delete e[t];
						},
					}
				);
			}
		}
		function Mg(e) {
			if (!e._valueTracker) {
				var t = hx(e) ? 'checked' : 'value';
				e._valueTracker = yI(e, t, '' + e[t]);
			}
		}
		function vx(e) {
			if (!e) return !1;
			var t = e._valueTracker;
			if (!t) return !0;
			var n = t.getValue(),
				o = '';
			return (
				e && (o = hx(e) ? (e.checked ? 'true' : 'false') : e.value),
				(e = o),
				e !== n ? (t.setValue(e), !0) : !1
			);
		}
		function Bd(e) {
			if (
				((e = e || (typeof document < 'u' ? document : void 0)), typeof e > 'u')
			)
				return null;
			try {
				return e.activeElement || e.body;
			} catch {
				return e.body;
			}
		}
		var CI = /[\n"\\]/g;
		function kn(e) {
			return e.replace(CI, function (t) {
				return '\\' + t.charCodeAt(0).toString(16) + ' ';
			});
		}
		function jg(e, t, n, o, r, a, i, s) {
			(e.name = ''),
				i != null &&
				typeof i != 'function' &&
				typeof i != 'symbol' &&
				typeof i != 'boolean'
					? (e.type = i)
					: e.removeAttribute('type'),
				t != null
					? i === 'number'
						? ((t === 0 && e.value === '') || e.value != t) &&
							(e.value = '' + Sn(t))
						: e.value !== '' + Sn(t) && (e.value = '' + Sn(t))
					: (i !== 'submit' && i !== 'reset') || e.removeAttribute('value'),
				t != null
					? zg(e, i, Sn(t))
					: n != null
						? zg(e, i, Sn(n))
						: o != null && e.removeAttribute('value'),
				r == null && a != null && (e.defaultChecked = !!a),
				r != null &&
					(e.checked = r && typeof r != 'function' && typeof r != 'symbol'),
				s != null &&
				typeof s != 'function' &&
				typeof s != 'symbol' &&
				typeof s != 'boolean'
					? (e.name = '' + Sn(s))
					: e.removeAttribute('name');
		}
		function yx(e, t, n, o, r, a, i, s) {
			if (
				(a != null &&
					typeof a != 'function' &&
					typeof a != 'symbol' &&
					typeof a != 'boolean' &&
					(e.type = a),
				t != null || n != null)
			) {
				if (!((a !== 'submit' && a !== 'reset') || t != null)) {
					Mg(e);
					return;
				}
				(n = n != null ? '' + Sn(n) : ''),
					(t = t != null ? '' + Sn(t) : n),
					s || t === e.value || (e.value = t),
					(e.defaultValue = t);
			}
			(o = o ?? r),
				(o = typeof o != 'function' && typeof o != 'symbol' && !!o),
				(e.checked = s ? e.checked : !!o),
				(e.defaultChecked = !!o),
				i != null &&
					typeof i != 'function' &&
					typeof i != 'symbol' &&
					typeof i != 'boolean' &&
					(e.name = i),
				Mg(e);
		}
		function zg(e, t, n) {
			(t === 'number' && Bd(e.ownerDocument) === e) ||
				e.defaultValue === '' + n ||
				(e.defaultValue = '' + n);
		}
		function Oi(e, t, n, o) {
			if (((e = e.options), t)) {
				t = {};
				for (var r = 0; r < n.length; r++) t['$' + n[r]] = !0;
				for (n = 0; n < e.length; n++)
					(r = t.hasOwnProperty('$' + e[n].value)),
						e[n].selected !== r && (e[n].selected = r),
						r && o && (e[n].defaultSelected = !0);
			} else {
				for (n = '' + Sn(n), t = null, r = 0; r < e.length; r++) {
					if (e[r].value === n) {
						(e[r].selected = !0), o && (e[r].defaultSelected = !0);
						return;
					}
					t !== null || e[r].disabled || (t = e[r]);
				}
				t !== null && (t.selected = !0);
			}
		}
		function Cx(e, t, n) {
			if (
				t != null &&
				((t = '' + Sn(t)), t !== e.value && (e.value = t), n == null)
			) {
				e.defaultValue !== t && (e.defaultValue = t);
				return;
			}
			e.defaultValue = n != null ? '' + Sn(n) : '';
		}
		function Sx(e, t, n, o) {
			if (t == null) {
				if (o != null) {
					if (n != null) throw Error(I(92));
					if (fl(o)) {
						if (1 < o.length) throw Error(I(93));
						o = o[0];
					}
					n = o;
				}
				n == null && (n = ''), (t = n);
			}
			(n = Sn(t)),
				(e.defaultValue = n),
				(o = e.textContent),
				o === n && o !== '' && o !== null && (e.value = o),
				Mg(e);
		}
		function Hi(e, t) {
			if (t) {
				var n = e.firstChild;
				if (n && n === e.lastChild && n.nodeType === 3) {
					n.nodeValue = t;
					return;
				}
			}
			e.textContent = t;
		}
		var SI = new Set(
			'animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp'.split(
				' '
			)
		);
		function j5(e, t, n) {
			var o = t.indexOf('--') === 0;
			n == null || typeof n == 'boolean' || n === ''
				? o
					? e.setProperty(t, '')
					: t === 'float'
						? (e.cssFloat = '')
						: (e[t] = '')
				: o
					? e.setProperty(t, n)
					: typeof n != 'number' || n === 0 || SI.has(t)
						? t === 'float'
							? (e.cssFloat = n)
							: (e[t] = ('' + n).trim())
						: (e[t] = n + 'px');
		}
		function xx(e, t, n) {
			if (t != null && typeof t != 'object') throw Error(I(62));
			if (((e = e.style), n != null)) {
				for (var o in n)
					!n.hasOwnProperty(o) ||
						(t != null && t.hasOwnProperty(o)) ||
						(o.indexOf('--') === 0
							? e.setProperty(o, '')
							: o === 'float'
								? (e.cssFloat = '')
								: (e[o] = ''));
				for (var r in t)
					(o = t[r]), t.hasOwnProperty(r) && n[r] !== o && j5(e, r, o);
			} else for (var a in t) t.hasOwnProperty(a) && j5(e, a, t[a]);
		}
		function Eb(e) {
			if (e.indexOf('-') === -1) return !1;
			switch (e) {
				case 'annotation-xml':
				case 'color-profile':
				case 'font-face':
				case 'font-face-src':
				case 'font-face-uri':
				case 'font-face-format':
				case 'font-face-name':
				case 'missing-glyph':
					return !1;
				default:
					return !0;
			}
		}
		var xI = new Map([
				['acceptCharset', 'accept-charset'],
				['htmlFor', 'for'],
				['httpEquiv', 'http-equiv'],
				['crossOrigin', 'crossorigin'],
				['accentHeight', 'accent-height'],
				['alignmentBaseline', 'alignment-baseline'],
				['arabicForm', 'arabic-form'],
				['baselineShift', 'baseline-shift'],
				['capHeight', 'cap-height'],
				['clipPath', 'clip-path'],
				['clipRule', 'clip-rule'],
				['colorInterpolation', 'color-interpolation'],
				['colorInterpolationFilters', 'color-interpolation-filters'],
				['colorProfile', 'color-profile'],
				['colorRendering', 'color-rendering'],
				['dominantBaseline', 'dominant-baseline'],
				['enableBackground', 'enable-background'],
				['fillOpacity', 'fill-opacity'],
				['fillRule', 'fill-rule'],
				['floodColor', 'flood-color'],
				['floodOpacity', 'flood-opacity'],
				['fontFamily', 'font-family'],
				['fontSize', 'font-size'],
				['fontSizeAdjust', 'font-size-adjust'],
				['fontStretch', 'font-stretch'],
				['fontStyle', 'font-style'],
				['fontVariant', 'font-variant'],
				['fontWeight', 'font-weight'],
				['glyphName', 'glyph-name'],
				['glyphOrientationHorizontal', 'glyph-orientation-horizontal'],
				['glyphOrientationVertical', 'glyph-orientation-vertical'],
				['horizAdvX', 'horiz-adv-x'],
				['horizOriginX', 'horiz-origin-x'],
				['imageRendering', 'image-rendering'],
				['letterSpacing', 'letter-spacing'],
				['lightingColor', 'lighting-color'],
				['markerEnd', 'marker-end'],
				['markerMid', 'marker-mid'],
				['markerStart', 'marker-start'],
				['overlinePosition', 'overline-position'],
				['overlineThickness', 'overline-thickness'],
				['paintOrder', 'paint-order'],
				['panose-1', 'panose-1'],
				['pointerEvents', 'pointer-events'],
				['renderingIntent', 'rendering-intent'],
				['shapeRendering', 'shape-rendering'],
				['stopColor', 'stop-color'],
				['stopOpacity', 'stop-opacity'],
				['strikethroughPosition', 'strikethrough-position'],
				['strikethroughThickness', 'strikethrough-thickness'],
				['strokeDasharray', 'stroke-dasharray'],
				['strokeDashoffset', 'stroke-dashoffset'],
				['strokeLinecap', 'stroke-linecap'],
				['strokeLinejoin', 'stroke-linejoin'],
				['strokeMiterlimit', 'stroke-miterlimit'],
				['strokeOpacity', 'stroke-opacity'],
				['strokeWidth', 'stroke-width'],
				['textAnchor', 'text-anchor'],
				['textDecoration', 'text-decoration'],
				['textRendering', 'text-rendering'],
				['transformOrigin', 'transform-origin'],
				['underlinePosition', 'underline-position'],
				['underlineThickness', 'underline-thickness'],
				['unicodeBidi', 'unicode-bidi'],
				['unicodeRange', 'unicode-range'],
				['unitsPerEm', 'units-per-em'],
				['vAlphabetic', 'v-alphabetic'],
				['vHanging', 'v-hanging'],
				['vIdeographic', 'v-ideographic'],
				['vMathematical', 'v-mathematical'],
				['vectorEffect', 'vector-effect'],
				['vertAdvY', 'vert-adv-y'],
				['vertOriginX', 'vert-origin-x'],
				['vertOriginY', 'vert-origin-y'],
				['wordSpacing', 'word-spacing'],
				['writingMode', 'writing-mode'],
				['xmlnsXlink', 'xmlns:xlink'],
				['xHeight', 'x-height'],
			]),
			TI =
				/^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
		function bd(e) {
			return TI.test('' + e)
				? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')"
				: e;
		}
		function Mo() {}
		var Vg = null;
		function Ib(e) {
			return (
				(e = e.target || e.srcElement || window),
				e.correspondingUseElement && (e = e.correspondingUseElement),
				e.nodeType === 3 ? e.parentNode : e
			);
		}
		var Ti = null,
			Bi = null;
		function z5(e) {
			var t = Ji(e);
			if (t && (e = t.stateNode)) {
				var n = e[Gt] || null;
				e: switch (((e = t.stateNode), t.type)) {
					case 'input':
						if (
							(jg(
								e,
								n.value,
								n.defaultValue,
								n.defaultValue,
								n.checked,
								n.defaultChecked,
								n.type,
								n.name
							),
							(t = n.name),
							n.type === 'radio' && t != null)
						) {
							for (n = e; n.parentNode; ) n = n.parentNode;
							for (
								n = n.querySelectorAll(
									'input[name="' + kn('' + t) + '"][type="radio"]'
								),
									t = 0;
								t < n.length;
								t++
							) {
								var o = n[t];
								if (o !== e && o.form === e.form) {
									var r = o[Gt] || null;
									if (!r) throw Error(I(90));
									jg(
										o,
										r.value,
										r.defaultValue,
										r.defaultValue,
										r.checked,
										r.defaultChecked,
										r.type,
										r.name
									);
								}
							}
							for (t = 0; t < n.length; t++)
								(o = n[t]), o.form === e.form && vx(o);
						}
						break e;
					case 'textarea':
						Cx(e, n.value, n.defaultValue);
						break e;
					case 'select':
						(t = n.value), t != null && Oi(e, !!n.multiple, t, !1);
				}
			}
		}
		var $p = !1;
		function Tx(e, t, n) {
			if ($p) return e(t, n);
			$p = !0;
			try {
				var o = e(t);
				return o;
			} finally {
				if (
					(($p = !1),
					(Ti !== null || Bi !== null) &&
						(vf(), Ti && ((t = Ti), (e = Bi), (Bi = Ti = null), z5(t), e)))
				)
					for (t = 0; t < e.length; t++) z5(e[t]);
			}
		}
		function Nl(e, t) {
			var n = e.stateNode;
			if (n === null) return null;
			var o = n[Gt] || null;
			if (o === null) return null;
			n = o[t];
			e: switch (t) {
				case 'onClick':
				case 'onClickCapture':
				case 'onDoubleClick':
				case 'onDoubleClickCapture':
				case 'onMouseDown':
				case 'onMouseDownCapture':
				case 'onMouseMove':
				case 'onMouseMoveCapture':
				case 'onMouseUp':
				case 'onMouseUpCapture':
				case 'onMouseEnter':
					(o = !o.disabled) ||
						((e = e.type),
						(o = !(
							e === 'button' ||
							e === 'input' ||
							e === 'select' ||
							e === 'textarea'
						))),
						(e = !o);
					break e;
				default:
					e = !1;
			}
			if (e) return null;
			if (n && typeof n != 'function') throw Error(I(231, t, typeof n));
			return n;
		}
		var Ho = !(
				typeof window > 'u' ||
				typeof window.document > 'u' ||
				typeof window.document.createElement > 'u'
			),
			Ug = !1;
		if (Ho)
			try {
				(gi = {}),
					Object.defineProperty(gi, 'passive', {
						get: function () {
							Ug = !0;
						},
					}),
					window.addEventListener('test', gi, gi),
					window.removeEventListener('test', gi, gi);
			} catch {
				Ug = !1;
			}
		var gi,
			pr = null,
			Nb = null,
			hd = null;
		function kx() {
			if (hd) return hd;
			var e,
				t = Nb,
				n = t.length,
				o,
				r = 'value' in pr ? pr.value : pr.textContent,
				a = r.length;
			for (e = 0; e < n && t[e] === r[e]; e++);
			var i = n - e;
			for (o = 1; o <= i && t[n - o] === r[a - o]; o++);
			return (hd = r.slice(e, 1 < o ? 1 - o : void 0));
		}
		function vd(e) {
			var t = e.keyCode;
			return (
				'charCode' in e
					? ((e = e.charCode), e === 0 && t === 13 && (e = 13))
					: (e = t),
				e === 10 && (e = 13),
				32 <= e || e === 13 ? e : 0
			);
		}
		function nd() {
			return !0;
		}
		function V5() {
			return !1;
		}
		function Ft(e) {
			function t(n, o, r, a, i) {
				(this._reactName = n),
					(this._targetInst = r),
					(this.type = o),
					(this.nativeEvent = a),
					(this.target = i),
					(this.currentTarget = null);
				for (var s in e)
					e.hasOwnProperty(s) && ((n = e[s]), (this[s] = n ? n(a) : a[s]));
				return (
					(this.isDefaultPrevented = (
						a.defaultPrevented != null
							? a.defaultPrevented
							: a.returnValue === !1
					)
						? nd
						: V5),
					(this.isPropagationStopped = V5),
					this
				);
			}
			return (
				Te(t.prototype, {
					preventDefault: function () {
						this.defaultPrevented = !0;
						var n = this.nativeEvent;
						n &&
							(n.preventDefault
								? n.preventDefault()
								: typeof n.returnValue != 'unknown' && (n.returnValue = !1),
							(this.isDefaultPrevented = nd));
					},
					stopPropagation: function () {
						var n = this.nativeEvent;
						n &&
							(n.stopPropagation
								? n.stopPropagation()
								: typeof n.cancelBubble != 'unknown' && (n.cancelBubble = !0),
							(this.isPropagationStopped = nd));
					},
					persist: function () {},
					isPersistent: nd,
				}),
				t
			);
		}
		var va = {
				eventPhase: 0,
				bubbles: 0,
				cancelable: 0,
				timeStamp: function (e) {
					return e.timeStamp || Date.now();
				},
				defaultPrevented: 0,
				isTrusted: 0,
			},
			sf = Ft(va),
			Kl = Te({}, va, { view: 0, detail: 0 }),
			kI = Ft(Kl),
			eg,
			tg,
			al,
			lf = Te({}, Kl, {
				screenX: 0,
				screenY: 0,
				clientX: 0,
				clientY: 0,
				pageX: 0,
				pageY: 0,
				ctrlKey: 0,
				shiftKey: 0,
				altKey: 0,
				metaKey: 0,
				getModifierState: Lb,
				button: 0,
				buttons: 0,
				relatedTarget: function (e) {
					return e.relatedTarget === void 0
						? e.fromElement === e.srcElement
							? e.toElement
							: e.fromElement
						: e.relatedTarget;
				},
				movementX: function (e) {
					return 'movementX' in e
						? e.movementX
						: (e !== al &&
								(al && e.type === 'mousemove'
									? ((eg = e.screenX - al.screenX),
										(tg = e.screenY - al.screenY))
									: (tg = eg = 0),
								(al = e)),
							eg);
				},
				movementY: function (e) {
					return 'movementY' in e ? e.movementY : tg;
				},
			}),
			U5 = Ft(lf),
			wI = Te({}, lf, { dataTransfer: 0 }),
			AI = Ft(wI),
			RI = Te({}, Kl, { relatedTarget: 0 }),
			ng = Ft(RI),
			EI = Te({}, va, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }),
			II = Ft(EI),
			NI = Te({}, va, {
				clipboardData: function (e) {
					return 'clipboardData' in e ? e.clipboardData : window.clipboardData;
				},
			}),
			LI = Ft(NI),
			_I = Te({}, va, { data: 0 }),
			H5 = Ft(_I),
			OI = {
				Esc: 'Escape',
				Spacebar: ' ',
				Left: 'ArrowLeft',
				Up: 'ArrowUp',
				Right: 'ArrowRight',
				Down: 'ArrowDown',
				Del: 'Delete',
				Win: 'OS',
				Menu: 'ContextMenu',
				Apps: 'ContextMenu',
				Scroll: 'ScrollLock',
				MozPrintableKey: 'Unidentified',
			},
			BI = {
				8: 'Backspace',
				9: 'Tab',
				12: 'Clear',
				13: 'Enter',
				16: 'Shift',
				17: 'Control',
				18: 'Alt',
				19: 'Pause',
				20: 'CapsLock',
				27: 'Escape',
				32: ' ',
				33: 'PageUp',
				34: 'PageDown',
				35: 'End',
				36: 'Home',
				37: 'ArrowLeft',
				38: 'ArrowUp',
				39: 'ArrowRight',
				40: 'ArrowDown',
				45: 'Insert',
				46: 'Delete',
				112: 'F1',
				113: 'F2',
				114: 'F3',
				115: 'F4',
				116: 'F5',
				117: 'F6',
				118: 'F7',
				119: 'F8',
				120: 'F9',
				121: 'F10',
				122: 'F11',
				123: 'F12',
				144: 'NumLock',
				145: 'ScrollLock',
				224: 'Meta',
			},
			DI = {
				Alt: 'altKey',
				Control: 'ctrlKey',
				Meta: 'metaKey',
				Shift: 'shiftKey',
			};
		function MI(e) {
			var t = this.nativeEvent;
			return t.getModifierState
				? t.getModifierState(e)
				: (e = DI[e])
					? !!t[e]
					: !1;
		}
		function Lb() {
			return MI;
		}
		var jI = Te({}, Kl, {
				key: function (e) {
					if (e.key) {
						var t = OI[e.key] || e.key;
						if (t !== 'Unidentified') return t;
					}
					return e.type === 'keypress'
						? ((e = vd(e)), e === 13 ? 'Enter' : String.fromCharCode(e))
						: e.type === 'keydown' || e.type === 'keyup'
							? BI[e.keyCode] || 'Unidentified'
							: '';
				},
				code: 0,
				location: 0,
				ctrlKey: 0,
				shiftKey: 0,
				altKey: 0,
				metaKey: 0,
				repeat: 0,
				locale: 0,
				getModifierState: Lb,
				charCode: function (e) {
					return e.type === 'keypress' ? vd(e) : 0;
				},
				keyCode: function (e) {
					return e.type === 'keydown' || e.type === 'keyup' ? e.keyCode : 0;
				},
				which: function (e) {
					return e.type === 'keypress'
						? vd(e)
						: e.type === 'keydown' || e.type === 'keyup'
							? e.keyCode
							: 0;
				},
			}),
			zI = Ft(jI),
			VI = Te({}, lf, {
				pointerId: 0,
				width: 0,
				height: 0,
				pressure: 0,
				tangentialPressure: 0,
				tiltX: 0,
				tiltY: 0,
				twist: 0,
				pointerType: 0,
				isPrimary: 0,
			}),
			P5 = Ft(VI),
			UI = Te({}, Kl, {
				touches: 0,
				targetTouches: 0,
				changedTouches: 0,
				altKey: 0,
				metaKey: 0,
				ctrlKey: 0,
				shiftKey: 0,
				getModifierState: Lb,
			}),
			HI = Ft(UI),
			PI = Te({}, va, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }),
			GI = Ft(PI),
			FI = Te({}, lf, {
				deltaX: function (e) {
					return 'deltaX' in e
						? e.deltaX
						: 'wheelDeltaX' in e
							? -e.wheelDeltaX
							: 0;
				},
				deltaY: function (e) {
					return 'deltaY' in e
						? e.deltaY
						: 'wheelDeltaY' in e
							? -e.wheelDeltaY
							: 'wheelDelta' in e
								? -e.wheelDelta
								: 0;
				},
				deltaZ: 0,
				deltaMode: 0,
			}),
			qI = Ft(FI),
			YI = Te({}, va, { newState: 0, oldState: 0 }),
			XI = Ft(YI),
			KI = [9, 13, 27, 32],
			_b = Ho && 'CompositionEvent' in window,
			bl = null;
		Ho && 'documentMode' in document && (bl = document.documentMode);
		var QI = Ho && 'TextEvent' in window && !bl,
			wx = Ho && (!_b || (bl && 8 < bl && 11 >= bl)),
			G5 = ' ',
			F5 = !1;
		function Ax(e, t) {
			switch (e) {
				case 'keyup':
					return KI.indexOf(t.keyCode) !== -1;
				case 'keydown':
					return t.keyCode !== 229;
				case 'keypress':
				case 'mousedown':
				case 'focusout':
					return !0;
				default:
					return !1;
			}
		}
		function Rx(e) {
			return (
				(e = e.detail), typeof e == 'object' && 'data' in e ? e.data : null
			);
		}
		var ki = !1;
		function ZI(e, t) {
			switch (e) {
				case 'compositionend':
					return Rx(t);
				case 'keypress':
					return t.which !== 32 ? null : ((F5 = !0), G5);
				case 'textInput':
					return (e = t.data), e === G5 && F5 ? null : e;
				default:
					return null;
			}
		}
		function JI(e, t) {
			if (ki)
				return e === 'compositionend' || (!_b && Ax(e, t))
					? ((e = kx()), (hd = Nb = pr = null), (ki = !1), e)
					: null;
			switch (e) {
				case 'paste':
					return null;
				case 'keypress':
					if (
						!(t.ctrlKey || t.altKey || t.metaKey) ||
						(t.ctrlKey && t.altKey)
					) {
						if (t.char && 1 < t.char.length) return t.char;
						if (t.which) return String.fromCharCode(t.which);
					}
					return null;
				case 'compositionend':
					return wx && t.locale !== 'ko' ? null : t.data;
				default:
					return null;
			}
		}
		var WI = {
			color: !0,
			date: !0,
			datetime: !0,
			'datetime-local': !0,
			email: !0,
			month: !0,
			number: !0,
			password: !0,
			range: !0,
			search: !0,
			tel: !0,
			text: !0,
			time: !0,
			url: !0,
			week: !0,
		};
		function q5(e) {
			var t = e && e.nodeName && e.nodeName.toLowerCase();
			return t === 'input' ? !!WI[e.type] : t === 'textarea';
		}
		function Ex(e, t, n, o) {
			Ti ? (Bi ? Bi.push(o) : (Bi = [o])) : (Ti = o),
				(t = Wd(t, 'onChange')),
				0 < t.length &&
					((n = new sf('onChange', 'change', null, n, o)),
					e.push({ event: n, listeners: t }));
		}
		var hl = null,
			Ll = null;
		function $I(e) {
			TT(e, 0);
		}
		function cf(e) {
			var t = ml(e);
			if (vx(t)) return e;
		}
		function Y5(e, t) {
			if (e === 'change') return t;
		}
		var Ix = !1;
		Ho &&
			(Ho
				? ((rd = 'oninput' in document),
					rd ||
						((og = document.createElement('div')),
						og.setAttribute('oninput', 'return;'),
						(rd = typeof og.oninput == 'function')),
					(od = rd))
				: (od = !1),
			(Ix = od && (!document.documentMode || 9 < document.documentMode)));
		var od, rd, og;
		function X5() {
			hl && (hl.detachEvent('onpropertychange', Nx), (Ll = hl = null));
		}
		function Nx(e) {
			if (e.propertyName === 'value' && cf(Ll)) {
				var t = [];
				Ex(t, Ll, e, Ib(e)), Tx($I, t);
			}
		}
		function e3(e, t, n) {
			e === 'focusin'
				? (X5(), (hl = t), (Ll = n), hl.attachEvent('onpropertychange', Nx))
				: e === 'focusout' && X5();
		}
		function t3(e) {
			if (e === 'selectionchange' || e === 'keyup' || e === 'keydown')
				return cf(Ll);
		}
		function n3(e, t) {
			if (e === 'click') return cf(t);
		}
		function o3(e, t) {
			if (e === 'input' || e === 'change') return cf(t);
		}
		function r3(e, t) {
			return (e === t && (e !== 0 || 1 / e === 1 / t)) || (e !== e && t !== t);
		}
		var sn = typeof Object.is == 'function' ? Object.is : r3;
		function _l(e, t) {
			if (sn(e, t)) return !0;
			if (
				typeof e != 'object' ||
				e === null ||
				typeof t != 'object' ||
				t === null
			)
				return !1;
			var n = Object.keys(e),
				o = Object.keys(t);
			if (n.length !== o.length) return !1;
			for (o = 0; o < n.length; o++) {
				var r = n[o];
				if (!Bg.call(t, r) || !sn(e[r], t[r])) return !1;
			}
			return !0;
		}
		function K5(e) {
			for (; e && e.firstChild; ) e = e.firstChild;
			return e;
		}
		function Q5(e, t) {
			var n = K5(e);
			e = 0;
			for (var o; n; ) {
				if (n.nodeType === 3) {
					if (((o = e + n.textContent.length), e <= t && o >= t))
						return { node: n, offset: t - e };
					e = o;
				}
				e: {
					for (; n; ) {
						if (n.nextSibling) {
							n = n.nextSibling;
							break e;
						}
						n = n.parentNode;
					}
					n = void 0;
				}
				n = K5(n);
			}
		}
		function Lx(e, t) {
			return e && t
				? e === t
					? !0
					: e && e.nodeType === 3
						? !1
						: t && t.nodeType === 3
							? Lx(e, t.parentNode)
							: 'contains' in e
								? e.contains(t)
								: e.compareDocumentPosition
									? !!(e.compareDocumentPosition(t) & 16)
									: !1
				: !1;
		}
		function _x(e) {
			e =
				e != null &&
				e.ownerDocument != null &&
				e.ownerDocument.defaultView != null
					? e.ownerDocument.defaultView
					: window;
			for (var t = Bd(e.document); t instanceof e.HTMLIFrameElement; ) {
				try {
					var n = typeof t.contentWindow.location.href == 'string';
				} catch {
					n = !1;
				}
				if (n) e = t.contentWindow;
				else break;
				t = Bd(e.document);
			}
			return t;
		}
		function Ob(e) {
			var t = e && e.nodeName && e.nodeName.toLowerCase();
			return (
				t &&
				((t === 'input' &&
					(e.type === 'text' ||
						e.type === 'search' ||
						e.type === 'tel' ||
						e.type === 'url' ||
						e.type === 'password')) ||
					t === 'textarea' ||
					e.contentEditable === 'true')
			);
		}
		var a3 = Ho && 'documentMode' in document && 11 >= document.documentMode,
			wi = null,
			Hg = null,
			vl = null,
			Pg = !1;
		function Z5(e, t, n) {
			var o =
				n.window === n ? n.document : n.nodeType === 9 ? n : n.ownerDocument;
			Pg ||
				wi == null ||
				wi !== Bd(o) ||
				((o = wi),
				'selectionStart' in o && Ob(o)
					? (o = { start: o.selectionStart, end: o.selectionEnd })
					: ((o = (
							(o.ownerDocument && o.ownerDocument.defaultView) ||
							window
						).getSelection()),
						(o = {
							anchorNode: o.anchorNode,
							anchorOffset: o.anchorOffset,
							focusNode: o.focusNode,
							focusOffset: o.focusOffset,
						})),
				(vl && _l(vl, o)) ||
					((vl = o),
					(o = Wd(Hg, 'onSelect')),
					0 < o.length &&
						((t = new sf('onSelect', 'select', null, t, n)),
						e.push({ event: t, listeners: o }),
						(t.target = wi))));
		}
		function na(e, t) {
			var n = {};
			return (
				(n[e.toLowerCase()] = t.toLowerCase()),
				(n['Webkit' + e] = 'webkit' + t),
				(n['Moz' + e] = 'moz' + t),
				n
			);
		}
		var Ai = {
				animationend: na('Animation', 'AnimationEnd'),
				animationiteration: na('Animation', 'AnimationIteration'),
				animationstart: na('Animation', 'AnimationStart'),
				transitionrun: na('Transition', 'TransitionRun'),
				transitionstart: na('Transition', 'TransitionStart'),
				transitioncancel: na('Transition', 'TransitionCancel'),
				transitionend: na('Transition', 'TransitionEnd'),
			},
			rg = {},
			Ox = {};
		Ho &&
			((Ox = document.createElement('div').style),
			'AnimationEvent' in window ||
				(delete Ai.animationend.animation,
				delete Ai.animationiteration.animation,
				delete Ai.animationstart.animation),
			'TransitionEvent' in window || delete Ai.transitionend.transition);
		function ya(e) {
			if (rg[e]) return rg[e];
			if (!Ai[e]) return e;
			var t = Ai[e],
				n;
			for (n in t) if (t.hasOwnProperty(n) && n in Ox) return (rg[e] = t[n]);
			return e;
		}
		var Bx = ya('animationend'),
			Dx = ya('animationiteration'),
			Mx = ya('animationstart'),
			i3 = ya('transitionrun'),
			s3 = ya('transitionstart'),
			l3 = ya('transitioncancel'),
			jx = ya('transitionend'),
			zx = new Map(),
			Gg =
				'abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel'.split(
					' '
				);
		Gg.push('scrollEnd');
		function Fn(e, t) {
			zx.set(e, t), ha(t, [e]);
		}
		var Dd =
				typeof reportError == 'function'
					? reportError
					: function (e) {
							if (
								typeof window == 'object' &&
								typeof window.ErrorEvent == 'function'
							) {
								var t = new window.ErrorEvent('error', {
									bubbles: !0,
									cancelable: !0,
									message:
										typeof e == 'object' &&
										e !== null &&
										typeof e.message == 'string'
											? String(e.message)
											: String(e),
									error: e,
								});
								if (!window.dispatchEvent(t)) return;
							} else if (
								typeof process == 'object' &&
								typeof process.emit == 'function'
							) {
								process.emit('uncaughtException', e);
								return;
							}
							console.error(e);
						},
			Cn = [],
			Ri = 0,
			Bb = 0;
		function uf() {
			for (var e = Ri, t = (Bb = Ri = 0); t < e; ) {
				var n = Cn[t];
				Cn[t++] = null;
				var o = Cn[t];
				Cn[t++] = null;
				var r = Cn[t];
				Cn[t++] = null;
				var a = Cn[t];
				if (((Cn[t++] = null), o !== null && r !== null)) {
					var i = o.pending;
					i === null ? (r.next = r) : ((r.next = i.next), (i.next = r)),
						(o.pending = r);
				}
				a !== 0 && Vx(n, r, a);
			}
		}
		function df(e, t, n, o) {
			(Cn[Ri++] = e),
				(Cn[Ri++] = t),
				(Cn[Ri++] = n),
				(Cn[Ri++] = o),
				(Bb |= o),
				(e.lanes |= o),
				(e = e.alternate),
				e !== null && (e.lanes |= o);
		}
		function Db(e, t, n, o) {
			return df(e, t, n, o), Md(e);
		}
		function Ca(e, t) {
			return df(e, null, null, t), Md(e);
		}
		function Vx(e, t, n) {
			e.lanes |= n;
			var o = e.alternate;
			o !== null && (o.lanes |= n);
			for (var r = !1, a = e.return; a !== null; )
				(a.childLanes |= n),
					(o = a.alternate),
					o !== null && (o.childLanes |= n),
					a.tag === 22 &&
						((e = a.stateNode), e === null || e._visibility & 1 || (r = !0)),
					(e = a),
					(a = a.return);
			return e.tag === 3
				? ((a = e.stateNode),
					r &&
						t !== null &&
						((r = 31 - rn(n)),
						(e = a.hiddenUpdates),
						(o = e[r]),
						o === null ? (e[r] = [t]) : o.push(t),
						(t.lane = n | 536870912)),
					a)
				: null;
		}
		function Md(e) {
			if (50 < Rl) throw ((Rl = 0), (ub = null), Error(I(185)));
			for (var t = e.return; t !== null; ) (e = t), (t = e.return);
			return e.tag === 3 ? e.stateNode : null;
		}
		var Ei = {};
		function c3(e, t, n, o) {
			(this.tag = e),
				(this.key = n),
				(this.sibling =
					this.child =
					this.return =
					this.stateNode =
					this.type =
					this.elementType =
						null),
				(this.index = 0),
				(this.refCleanup = this.ref = null),
				(this.pendingProps = t),
				(this.dependencies =
					this.memoizedState =
					this.updateQueue =
					this.memoizedProps =
						null),
				(this.mode = o),
				(this.subtreeFlags = this.flags = 0),
				(this.deletions = null),
				(this.childLanes = this.lanes = 0),
				(this.alternate = null);
		}
		function en(e, t, n, o) {
			return new c3(e, t, n, o);
		}
		function Mb(e) {
			return (e = e.prototype), !(!e || !e.isReactComponent);
		}
		function zo(e, t) {
			var n = e.alternate;
			return (
				n === null
					? ((n = en(e.tag, t, e.key, e.mode)),
						(n.elementType = e.elementType),
						(n.type = e.type),
						(n.stateNode = e.stateNode),
						(n.alternate = e),
						(e.alternate = n))
					: ((n.pendingProps = t),
						(n.type = e.type),
						(n.flags = 0),
						(n.subtreeFlags = 0),
						(n.deletions = null)),
				(n.flags = e.flags & 65011712),
				(n.childLanes = e.childLanes),
				(n.lanes = e.lanes),
				(n.child = e.child),
				(n.memoizedProps = e.memoizedProps),
				(n.memoizedState = e.memoizedState),
				(n.updateQueue = e.updateQueue),
				(t = e.dependencies),
				(n.dependencies =
					t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }),
				(n.sibling = e.sibling),
				(n.index = e.index),
				(n.ref = e.ref),
				(n.refCleanup = e.refCleanup),
				n
			);
		}
		function Ux(e, t) {
			e.flags &= 65011714;
			var n = e.alternate;
			return (
				n === null
					? ((e.childLanes = 0),
						(e.lanes = t),
						(e.child = null),
						(e.subtreeFlags = 0),
						(e.memoizedProps = null),
						(e.memoizedState = null),
						(e.updateQueue = null),
						(e.dependencies = null),
						(e.stateNode = null))
					: ((e.childLanes = n.childLanes),
						(e.lanes = n.lanes),
						(e.child = n.child),
						(e.subtreeFlags = 0),
						(e.deletions = null),
						(e.memoizedProps = n.memoizedProps),
						(e.memoizedState = n.memoizedState),
						(e.updateQueue = n.updateQueue),
						(e.type = n.type),
						(t = n.dependencies),
						(e.dependencies =
							t === null
								? null
								: { lanes: t.lanes, firstContext: t.firstContext })),
				e
			);
		}
		function yd(e, t, n, o, r, a) {
			var i = 0;
			if (((o = e), typeof e == 'function')) Mb(e) && (i = 1);
			else if (typeof e == 'string')
				i = fN(e, n, fo.current)
					? 26
					: e === 'html' || e === 'head' || e === 'body'
						? 27
						: 5;
			else
				e: switch (e) {
					case Ng:
						return (
							(e = en(31, n, t, r)), (e.elementType = Ng), (e.lanes = a), e
						);
					case Ci:
						return la(n.children, r, a, t);
					case ax:
						(i = 8), (r |= 24);
						break;
					case Rg:
						return (
							(e = en(12, n, t, r | 2)), (e.elementType = Rg), (e.lanes = a), e
						);
					case Eg:
						return (
							(e = en(13, n, t, r)), (e.elementType = Eg), (e.lanes = a), e
						);
					case Ig:
						return (
							(e = en(19, n, t, r)), (e.elementType = Ig), (e.lanes = a), e
						);
					default:
						if (typeof e == 'object' && e !== null)
							switch (e.$$typeof) {
								case Do:
									i = 10;
									break e;
								case ix:
									i = 9;
									break e;
								case xb:
									i = 11;
									break e;
								case Tb:
									i = 14;
									break e;
								case sr:
									(i = 16), (o = null);
									break e;
							}
						(i = 29),
							(n = Error(I(130, e === null ? 'null' : typeof e, ''))),
							(o = null);
				}
			return (
				(t = en(i, n, t, r)),
				(t.elementType = e),
				(t.type = o),
				(t.lanes = a),
				t
			);
		}
		function la(e, t, n, o) {
			return (e = en(7, e, o, t)), (e.lanes = n), e;
		}
		function ag(e, t, n) {
			return (e = en(6, e, null, t)), (e.lanes = n), e;
		}
		function Hx(e) {
			var t = en(18, null, null, 0);
			return (t.stateNode = e), t;
		}
		function ig(e, t, n) {
			return (
				(t = en(4, e.children !== null ? e.children : [], e.key, t)),
				(t.lanes = n),
				(t.stateNode = {
					containerInfo: e.containerInfo,
					pendingChildren: null,
					implementation: e.implementation,
				}),
				t
			);
		}
		var J5 = new WeakMap();
		function wn(e, t) {
			if (typeof e == 'object' && e !== null) {
				var n = J5.get(e);
				return n !== void 0
					? n
					: ((t = { value: e, source: t, stack: _5(t) }), J5.set(e, t), t);
			}
			return { value: e, source: t, stack: _5(t) };
		}
		var Ii = [],
			Ni = 0,
			jd = null,
			Ol = 0,
			xn = [],
			Tn = 0,
			Rr = null,
			lo = 1,
			co = '';
		function Oo(e, t) {
			(Ii[Ni++] = Ol), (Ii[Ni++] = jd), (jd = e), (Ol = t);
		}
		function Px(e, t, n) {
			(xn[Tn++] = lo), (xn[Tn++] = co), (xn[Tn++] = Rr), (Rr = e);
			var o = lo;
			e = co;
			var r = 32 - rn(o) - 1;
			(o &= ~(1 << r)), (n += 1);
			var a = 32 - rn(t) + r;
			if (30 < a) {
				var i = r - (r % 5);
				(a = (o & ((1 << i) - 1)).toString(32)),
					(o >>= i),
					(r -= i),
					(lo = (1 << (32 - rn(t) + r)) | (n << r) | o),
					(co = a + e);
			} else (lo = (1 << a) | (n << r) | o), (co = e);
		}
		function jb(e) {
			e.return !== null && (Oo(e, 1), Px(e, 1, 0));
		}
		function zb(e) {
			for (; e === jd; )
				(jd = Ii[--Ni]), (Ii[Ni] = null), (Ol = Ii[--Ni]), (Ii[Ni] = null);
			for (; e === Rr; )
				(Rr = xn[--Tn]),
					(xn[Tn] = null),
					(co = xn[--Tn]),
					(xn[Tn] = null),
					(lo = xn[--Tn]),
					(xn[Tn] = null);
		}
		function Gx(e, t) {
			(xn[Tn++] = lo),
				(xn[Tn++] = co),
				(xn[Tn++] = Rr),
				(lo = t.id),
				(co = t.overflow),
				(Rr = e);
		}
		var ht = null,
			xe = null,
			ne = !1,
			yr = null,
			An = !1,
			Fg = Error(I(519));
		function Er(e) {
			var t = Error(
				I(
					418,
					1 < arguments.length && arguments[1] !== void 0 && arguments[1]
						? 'text'
						: 'HTML',
					''
				)
			);
			throw (Bl(wn(t, e)), Fg);
		}
		function W5(e) {
			var t = e.stateNode,
				n = e.type,
				o = e.memoizedProps;
			switch (((t[bt] = e), (t[Gt] = o), n)) {
				case 'dialog':
					$('cancel', t), $('close', t);
					break;
				case 'iframe':
				case 'object':
				case 'embed':
					$('load', t);
					break;
				case 'video':
				case 'audio':
					for (n = 0; n < zl.length; n++) $(zl[n], t);
					break;
				case 'source':
					$('error', t);
					break;
				case 'img':
				case 'image':
				case 'link':
					$('error', t), $('load', t);
					break;
				case 'details':
					$('toggle', t);
					break;
				case 'input':
					$('invalid', t),
						yx(
							t,
							o.value,
							o.defaultValue,
							o.checked,
							o.defaultChecked,
							o.type,
							o.name,
							!0
						);
					break;
				case 'select':
					$('invalid', t);
					break;
				case 'textarea':
					$('invalid', t), Sx(t, o.value, o.defaultValue, o.children);
			}
			(n = o.children),
				(typeof n != 'string' &&
					typeof n != 'number' &&
					typeof n != 'bigint') ||
				t.textContent === '' + n ||
				o.suppressHydrationWarning === !0 ||
				wT(t.textContent, n)
					? (o.popover != null && ($('beforetoggle', t), $('toggle', t)),
						o.onScroll != null && $('scroll', t),
						o.onScrollEnd != null && $('scrollend', t),
						o.onClick != null && (t.onclick = Mo),
						(t = !0))
					: (t = !1),
				t || Er(e, !0);
		}
		function $5(e) {
			for (ht = e.return; ht; )
				switch (ht.tag) {
					case 5:
					case 31:
					case 13:
						An = !1;
						return;
					case 27:
					case 3:
						An = !0;
						return;
					default:
						ht = ht.return;
				}
		}
		function bi(e) {
			if (e !== ht) return !1;
			if (!ne) return $5(e), (ne = !0), !1;
			var t = e.tag,
				n;
			if (
				((n = t !== 3 && t !== 27) &&
					((n = t === 5) &&
						((n = e.type),
						(n =
							!(n !== 'form' && n !== 'button') ||
							gb(e.type, e.memoizedProps))),
					(n = !n)),
				n && xe && Er(e),
				$5(e),
				t === 13)
			) {
				if (((e = e.memoizedState), (e = e !== null ? e.dehydrated : null), !e))
					throw Error(I(317));
				xe = HS(e);
			} else if (t === 31) {
				if (((e = e.memoizedState), (e = e !== null ? e.dehydrated : null), !e))
					throw Error(I(317));
				xe = HS(e);
			} else
				t === 27
					? ((t = xe),
						_r(e.type) ? ((e = yb), (yb = null), (xe = e)) : (xe = t))
					: (xe = ht ? En(e.stateNode.nextSibling) : null);
			return !0;
		}
		function fa() {
			(xe = ht = null), (ne = !1);
		}
		function sg() {
			var e = yr;
			return (
				e !== null &&
					(Ht === null ? (Ht = e) : Ht.push.apply(Ht, e), (yr = null)),
				e
			);
		}
		function Bl(e) {
			yr === null ? (yr = [e]) : yr.push(e);
		}
		var qg = mo(null),
			Sa = null,
			jo = null;
		function cr(e, t, n) {
			ye(qg, t._currentValue), (t._currentValue = n);
		}
		function Vo(e) {
			(e._currentValue = qg.current), ut(qg);
		}
		function Yg(e, t, n) {
			for (; e !== null; ) {
				var o = e.alternate;
				if (
					((e.childLanes & t) !== t
						? ((e.childLanes |= t), o !== null && (o.childLanes |= t))
						: o !== null && (o.childLanes & t) !== t && (o.childLanes |= t),
					e === n)
				)
					break;
				e = e.return;
			}
		}
		function Xg(e, t, n, o) {
			var r = e.child;
			for (r !== null && (r.return = e); r !== null; ) {
				var a = r.dependencies;
				if (a !== null) {
					var i = r.child;
					a = a.firstContext;
					e: for (; a !== null; ) {
						var s = a;
						a = r;
						for (var l = 0; l < t.length; l++)
							if (s.context === t[l]) {
								(a.lanes |= n),
									(s = a.alternate),
									s !== null && (s.lanes |= n),
									Yg(a.return, n, e),
									o || (i = null);
								break e;
							}
						a = s.next;
					}
				} else if (r.tag === 18) {
					if (((i = r.return), i === null)) throw Error(I(341));
					(i.lanes |= n),
						(a = i.alternate),
						a !== null && (a.lanes |= n),
						Yg(i, n, e),
						(i = null);
				} else i = r.child;
				if (i !== null) i.return = r;
				else
					for (i = r; i !== null; ) {
						if (i === e) {
							i = null;
							break;
						}
						if (((r = i.sibling), r !== null)) {
							(r.return = i.return), (i = r);
							break;
						}
						i = i.return;
					}
				r = i;
			}
		}
		function Wi(e, t, n, o) {
			e = null;
			for (var r = t, a = !1; r !== null; ) {
				if (!a) {
					if ((r.flags & 524288) !== 0) a = !0;
					else if ((r.flags & 262144) !== 0) break;
				}
				if (r.tag === 10) {
					var i = r.alternate;
					if (i === null) throw Error(I(387));
					if (((i = i.memoizedProps), i !== null)) {
						var s = r.type;
						sn(r.pendingProps.value, i.value) ||
							(e !== null ? e.push(s) : (e = [s]));
					}
				} else if (r === Nd.current) {
					if (((i = r.alternate), i === null)) throw Error(I(387));
					i.memoizedState.memoizedState !== r.memoizedState.memoizedState &&
						(e !== null ? e.push(Ul) : (e = [Ul]));
				}
				r = r.return;
			}
			e !== null && Xg(t, e, n, o), (t.flags |= 262144);
		}
		function zd(e) {
			for (e = e.firstContext; e !== null; ) {
				if (!sn(e.context._currentValue, e.memoizedValue)) return !0;
				e = e.next;
			}
			return !1;
		}
		function ma(e) {
			(Sa = e),
				(jo = null),
				(e = e.dependencies),
				e !== null && (e.firstContext = null);
		}
		function vt(e) {
			return Fx(Sa, e);
		}
		function ad(e, t) {
			return Sa === null && ma(e), Fx(e, t);
		}
		function Fx(e, t) {
			var n = t._currentValue;
			if (((t = { context: t, memoizedValue: n, next: null }), jo === null)) {
				if (e === null) throw Error(I(308));
				(jo = t),
					(e.dependencies = { lanes: 0, firstContext: t }),
					(e.flags |= 524288);
			} else jo = jo.next = t;
			return n;
		}
		var u3 =
				typeof AbortController < 'u'
					? AbortController
					: function () {
							var e = [],
								t = (this.signal = {
									aborted: !1,
									addEventListener: function (n, o) {
										e.push(o);
									},
								});
							this.abort = function () {
								(t.aborted = !0),
									e.forEach(function (n) {
										return n();
									});
							};
						},
			d3 = rt.unstable_scheduleCallback,
			f3 = rt.unstable_NormalPriority,
			Je = {
				$$typeof: Do,
				Consumer: null,
				Provider: null,
				_currentValue: null,
				_currentValue2: null,
				_threadCount: 0,
			};
		function Vb() {
			return { controller: new u3(), data: new Map(), refCount: 0 };
		}
		function Ql(e) {
			e.refCount--,
				e.refCount === 0 &&
					d3(f3, function () {
						e.controller.abort();
					});
		}
		var yl = null,
			Kg = 0,
			Pi = 0,
			Di = null;
		function m3(e, t) {
			if (yl === null) {
				var n = (yl = []);
				(Kg = 0),
					(Pi = uh()),
					(Di = {
						status: 'pending',
						value: void 0,
						then: function (o) {
							n.push(o);
						},
					});
			}
			return Kg++, t.then(eS, eS), t;
		}
		function eS() {
			if (--Kg === 0 && yl !== null) {
				Di !== null && (Di.status = 'fulfilled');
				var e = yl;
				(yl = null), (Pi = 0), (Di = null);
				for (var t = 0; t < e.length; t++) (0, e[t])();
			}
		}
		function p3(e, t) {
			var n = [],
				o = {
					status: 'pending',
					value: null,
					reason: null,
					then: function (r) {
						n.push(r);
					},
				};
			return (
				e.then(
					function () {
						(o.status = 'fulfilled'), (o.value = t);
						for (var r = 0; r < n.length; r++) (0, n[r])(t);
					},
					function (r) {
						for (o.status = 'rejected', o.reason = r, r = 0; r < n.length; r++)
							(0, n[r])(void 0);
					}
				),
				o
			);
		}
		var tS = q.S;
		q.S = function (e, t) {
			(rT = nn()),
				typeof t == 'object' &&
					t !== null &&
					typeof t.then == 'function' &&
					m3(e, t),
				tS !== null && tS(e, t);
		};
		var ca = mo(null);
		function Ub() {
			var e = ca.current;
			return e !== null ? e : he.pooledCache;
		}
		function Cd(e, t) {
			t === null ? ye(ca, ca.current) : ye(ca, t.pool);
		}
		function qx() {
			var e = Ub();
			return e === null ? null : { parent: Je._currentValue, pool: e };
		}
		var $i = Error(I(460)),
			Hb = Error(I(474)),
			ff = Error(I(542)),
			Vd = { then: function () {} };
		function nS(e) {
			return (e = e.status), e === 'fulfilled' || e === 'rejected';
		}
		function Yx(e, t, n) {
			switch (
				((n = e[n]),
				n === void 0 ? e.push(t) : n !== t && (t.then(Mo, Mo), (t = n)),
				t.status)
			) {
				case 'fulfilled':
					return t.value;
				case 'rejected':
					throw ((e = t.reason), rS(e), e);
				default:
					if (typeof t.status == 'string') t.then(Mo, Mo);
					else {
						if (((e = he), e !== null && 100 < e.shellSuspendCounter))
							throw Error(I(482));
						(e = t),
							(e.status = 'pending'),
							e.then(
								function (o) {
									if (t.status === 'pending') {
										var r = t;
										(r.status = 'fulfilled'), (r.value = o);
									}
								},
								function (o) {
									if (t.status === 'pending') {
										var r = t;
										(r.status = 'rejected'), (r.reason = o);
									}
								}
							);
					}
					switch (t.status) {
						case 'fulfilled':
							return t.value;
						case 'rejected':
							throw ((e = t.reason), rS(e), e);
					}
					throw ((ua = t), $i);
			}
		}
		function aa(e) {
			try {
				var t = e._init;
				return t(e._payload);
			} catch (n) {
				throw n !== null && typeof n == 'object' && typeof n.then == 'function'
					? ((ua = n), $i)
					: n;
			}
		}
		var ua = null;
		function oS() {
			if (ua === null) throw Error(I(459));
			var e = ua;
			return (ua = null), e;
		}
		function rS(e) {
			if (e === $i || e === ff) throw Error(I(483));
		}
		var Mi = null,
			Dl = 0;
		function id(e) {
			var t = Dl;
			return (Dl += 1), Mi === null && (Mi = []), Yx(Mi, e, t);
		}
		function il(e, t) {
			(t = t.props.ref), (e.ref = t !== void 0 ? t : null);
		}
		function sd(e, t) {
			throw t.$$typeof === eI
				? Error(I(525))
				: ((e = Object.prototype.toString.call(t)),
					Error(
						I(
							31,
							e === '[object Object]'
								? 'object with keys {' + Object.keys(t).join(', ') + '}'
								: e
						)
					));
		}
		function Xx(e) {
			function t(b, g) {
				if (e) {
					var m = b.deletions;
					m === null ? ((b.deletions = [g]), (b.flags |= 16)) : m.push(g);
				}
			}
			function n(b, g) {
				if (!e) return null;
				for (; g !== null; ) t(b, g), (g = g.sibling);
				return null;
			}
			function o(b) {
				for (var g = new Map(); b !== null; )
					b.key !== null ? g.set(b.key, b) : g.set(b.index, b), (b = b.sibling);
				return g;
			}
			function r(b, g) {
				return (b = zo(b, g)), (b.index = 0), (b.sibling = null), b;
			}
			function a(b, g, m) {
				return (
					(b.index = m),
					e
						? ((m = b.alternate),
							m !== null
								? ((m = m.index), m < g ? ((b.flags |= 67108866), g) : m)
								: ((b.flags |= 67108866), g))
						: ((b.flags |= 1048576), g)
				);
			}
			function i(b) {
				return e && b.alternate === null && (b.flags |= 67108866), b;
			}
			function s(b, g, m, h) {
				return g === null || g.tag !== 6
					? ((g = ag(m, b.mode, h)), (g.return = b), g)
					: ((g = r(g, m)), (g.return = b), g);
			}
			function l(b, g, m, h) {
				var k = m.type;
				return k === Ci
					? d(b, g, m.props.children, h, m.key)
					: g !== null &&
							(g.elementType === k ||
								(typeof k == 'object' &&
									k !== null &&
									k.$$typeof === sr &&
									aa(k) === g.type))
						? ((g = r(g, m.props)), il(g, m), (g.return = b), g)
						: ((g = yd(m.type, m.key, m.props, null, b.mode, h)),
							il(g, m),
							(g.return = b),
							g);
			}
			function u(b, g, m, h) {
				return g === null ||
					g.tag !== 4 ||
					g.stateNode.containerInfo !== m.containerInfo ||
					g.stateNode.implementation !== m.implementation
					? ((g = ig(m, b.mode, h)), (g.return = b), g)
					: ((g = r(g, m.children || [])), (g.return = b), g);
			}
			function d(b, g, m, h, k) {
				return g === null || g.tag !== 7
					? ((g = la(m, b.mode, h, k)), (g.return = b), g)
					: ((g = r(g, m)), (g.return = b), g);
			}
			function f(b, g, m) {
				if (
					(typeof g == 'string' && g !== '') ||
					typeof g == 'number' ||
					typeof g == 'bigint'
				)
					return (g = ag('' + g, b.mode, m)), (g.return = b), g;
				if (typeof g == 'object' && g !== null) {
					switch (g.$$typeof) {
						case Ju:
							return (
								(m = yd(g.type, g.key, g.props, null, b.mode, m)),
								il(m, g),
								(m.return = b),
								m
							);
						case dl:
							return (g = ig(g, b.mode, m)), (g.return = b), g;
						case sr:
							return (g = aa(g)), f(b, g, m);
					}
					if (fl(g) || rl(g))
						return (g = la(g, b.mode, m, null)), (g.return = b), g;
					if (typeof g.then == 'function') return f(b, id(g), m);
					if (g.$$typeof === Do) return f(b, ad(b, g), m);
					sd(b, g);
				}
				return null;
			}
			function c(b, g, m, h) {
				var k = g !== null ? g.key : null;
				if (
					(typeof m == 'string' && m !== '') ||
					typeof m == 'number' ||
					typeof m == 'bigint'
				)
					return k !== null ? null : s(b, g, '' + m, h);
				if (typeof m == 'object' && m !== null) {
					switch (m.$$typeof) {
						case Ju:
							return m.key === k ? l(b, g, m, h) : null;
						case dl:
							return m.key === k ? u(b, g, m, h) : null;
						case sr:
							return (m = aa(m)), c(b, g, m, h);
					}
					if (fl(m) || rl(m)) return k !== null ? null : d(b, g, m, h, null);
					if (typeof m.then == 'function') return c(b, g, id(m), h);
					if (m.$$typeof === Do) return c(b, g, ad(b, m), h);
					sd(b, m);
				}
				return null;
			}
			function p(b, g, m, h, k) {
				if (
					(typeof h == 'string' && h !== '') ||
					typeof h == 'number' ||
					typeof h == 'bigint'
				)
					return (b = b.get(m) || null), s(g, b, '' + h, k);
				if (typeof h == 'object' && h !== null) {
					switch (h.$$typeof) {
						case Ju:
							return (
								(b = b.get(h.key === null ? m : h.key) || null), l(g, b, h, k)
							);
						case dl:
							return (
								(b = b.get(h.key === null ? m : h.key) || null), u(g, b, h, k)
							);
						case sr:
							return (h = aa(h)), p(b, g, m, h, k);
					}
					if (fl(h) || rl(h))
						return (b = b.get(m) || null), d(g, b, h, k, null);
					if (typeof h.then == 'function') return p(b, g, m, id(h), k);
					if (h.$$typeof === Do) return p(b, g, m, ad(g, h), k);
					sd(g, h);
				}
				return null;
			}
			function v(b, g, m, h) {
				for (
					var k = null, A = null, x = g, L = (g = 0), _ = null;
					x !== null && L < m.length;
					L++
				) {
					x.index > L ? ((_ = x), (x = null)) : (_ = x.sibling);
					var N = c(b, x, m[L], h);
					if (N === null) {
						x === null && (x = _);
						break;
					}
					e && x && N.alternate === null && t(b, x),
						(g = a(N, g, L)),
						A === null ? (k = N) : (A.sibling = N),
						(A = N),
						(x = _);
				}
				if (L === m.length) return n(b, x), ne && Oo(b, L), k;
				if (x === null) {
					for (; L < m.length; L++)
						(x = f(b, m[L], h)),
							x !== null &&
								((g = a(x, g, L)),
								A === null ? (k = x) : (A.sibling = x),
								(A = x));
					return ne && Oo(b, L), k;
				}
				for (x = o(x); L < m.length; L++)
					(_ = p(x, b, L, m[L], h)),
						_ !== null &&
							(e &&
								_.alternate !== null &&
								x.delete(_.key === null ? L : _.key),
							(g = a(_, g, L)),
							A === null ? (k = _) : (A.sibling = _),
							(A = _));
				return (
					e &&
						x.forEach(function (B) {
							return t(b, B);
						}),
					ne && Oo(b, L),
					k
				);
			}
			function C(b, g, m, h) {
				if (m == null) throw Error(I(151));
				for (
					var k = null, A = null, x = g, L = (g = 0), _ = null, N = m.next();
					x !== null && !N.done;
					L++, N = m.next()
				) {
					x.index > L ? ((_ = x), (x = null)) : (_ = x.sibling);
					var B = c(b, x, N.value, h);
					if (B === null) {
						x === null && (x = _);
						break;
					}
					e && x && B.alternate === null && t(b, x),
						(g = a(B, g, L)),
						A === null ? (k = B) : (A.sibling = B),
						(A = B),
						(x = _);
				}
				if (N.done) return n(b, x), ne && Oo(b, L), k;
				if (x === null) {
					for (; !N.done; L++, N = m.next())
						(N = f(b, N.value, h)),
							N !== null &&
								((g = a(N, g, L)),
								A === null ? (k = N) : (A.sibling = N),
								(A = N));
					return ne && Oo(b, L), k;
				}
				for (x = o(x); !N.done; L++, N = m.next())
					(N = p(x, b, L, N.value, h)),
						N !== null &&
							(e &&
								N.alternate !== null &&
								x.delete(N.key === null ? L : N.key),
							(g = a(N, g, L)),
							A === null ? (k = N) : (A.sibling = N),
							(A = N));
				return (
					e &&
						x.forEach(function (Z) {
							return t(b, Z);
						}),
					ne && Oo(b, L),
					k
				);
			}
			function y(b, g, m, h) {
				if (
					(typeof m == 'object' &&
						m !== null &&
						m.type === Ci &&
						m.key === null &&
						(m = m.props.children),
					typeof m == 'object' && m !== null)
				) {
					switch (m.$$typeof) {
						case Ju:
							e: {
								for (var k = m.key; g !== null; ) {
									if (g.key === k) {
										if (((k = m.type), k === Ci)) {
											if (g.tag === 7) {
												n(b, g.sibling),
													(h = r(g, m.props.children)),
													(h.return = b),
													(b = h);
												break e;
											}
										} else if (
											g.elementType === k ||
											(typeof k == 'object' &&
												k !== null &&
												k.$$typeof === sr &&
												aa(k) === g.type)
										) {
											n(b, g.sibling),
												(h = r(g, m.props)),
												il(h, m),
												(h.return = b),
												(b = h);
											break e;
										}
										n(b, g);
										break;
									} else t(b, g);
									g = g.sibling;
								}
								m.type === Ci
									? ((h = la(m.props.children, b.mode, h, m.key)),
										(h.return = b),
										(b = h))
									: ((h = yd(m.type, m.key, m.props, null, b.mode, h)),
										il(h, m),
										(h.return = b),
										(b = h));
							}
							return i(b);
						case dl:
							e: {
								for (k = m.key; g !== null; ) {
									if (g.key === k)
										if (
											g.tag === 4 &&
											g.stateNode.containerInfo === m.containerInfo &&
											g.stateNode.implementation === m.implementation
										) {
											n(b, g.sibling),
												(h = r(g, m.children || [])),
												(h.return = b),
												(b = h);
											break e;
										} else {
											n(b, g);
											break;
										}
									else t(b, g);
									g = g.sibling;
								}
								(h = ig(m, b.mode, h)), (h.return = b), (b = h);
							}
							return i(b);
						case sr:
							return (m = aa(m)), y(b, g, m, h);
					}
					if (fl(m)) return v(b, g, m, h);
					if (rl(m)) {
						if (((k = rl(m)), typeof k != 'function')) throw Error(I(150));
						return (m = k.call(m)), C(b, g, m, h);
					}
					if (typeof m.then == 'function') return y(b, g, id(m), h);
					if (m.$$typeof === Do) return y(b, g, ad(b, m), h);
					sd(b, m);
				}
				return (typeof m == 'string' && m !== '') ||
					typeof m == 'number' ||
					typeof m == 'bigint'
					? ((m = '' + m),
						g !== null && g.tag === 6
							? (n(b, g.sibling), (h = r(g, m)), (h.return = b), (b = h))
							: (n(b, g), (h = ag(m, b.mode, h)), (h.return = b), (b = h)),
						i(b))
					: n(b, g);
			}
			return function (b, g, m, h) {
				try {
					Dl = 0;
					var k = y(b, g, m, h);
					return (Mi = null), k;
				} catch (x) {
					if (x === $i || x === ff) throw x;
					var A = en(29, x, null, b.mode);
					return (A.lanes = h), (A.return = b), A;
				}
			};
		}
		var pa = Xx(!0),
			Kx = Xx(!1),
			lr = !1;
		function Pb(e) {
			e.updateQueue = {
				baseState: e.memoizedState,
				firstBaseUpdate: null,
				lastBaseUpdate: null,
				shared: { pending: null, lanes: 0, hiddenCallbacks: null },
				callbacks: null,
			};
		}
		function Qg(e, t) {
			(e = e.updateQueue),
				t.updateQueue === e &&
					(t.updateQueue = {
						baseState: e.baseState,
						firstBaseUpdate: e.firstBaseUpdate,
						lastBaseUpdate: e.lastBaseUpdate,
						shared: e.shared,
						callbacks: null,
					});
		}
		function Cr(e) {
			return { lane: e, tag: 0, payload: null, callback: null, next: null };
		}
		function Sr(e, t, n) {
			var o = e.updateQueue;
			if (o === null) return null;
			if (((o = o.shared), (ae & 2) !== 0)) {
				var r = o.pending;
				return (
					r === null ? (t.next = t) : ((t.next = r.next), (r.next = t)),
					(o.pending = t),
					(t = Md(e)),
					Vx(e, null, n),
					t
				);
			}
			return df(e, o, t, n), Md(e);
		}
		function Cl(e, t, n) {
			if (
				((t = t.updateQueue),
				t !== null && ((t = t.shared), (n & 4194048) !== 0))
			) {
				var o = t.lanes;
				(o &= e.pendingLanes), (n |= o), (t.lanes = n), fx(e, n);
			}
		}
		function lg(e, t) {
			var n = e.updateQueue,
				o = e.alternate;
			if (o !== null && ((o = o.updateQueue), n === o)) {
				var r = null,
					a = null;
				if (((n = n.firstBaseUpdate), n !== null)) {
					do {
						var i = {
							lane: n.lane,
							tag: n.tag,
							payload: n.payload,
							callback: null,
							next: null,
						};
						a === null ? (r = a = i) : (a = a.next = i), (n = n.next);
					} while (n !== null);
					a === null ? (r = a = t) : (a = a.next = t);
				} else r = a = t;
				(n = {
					baseState: o.baseState,
					firstBaseUpdate: r,
					lastBaseUpdate: a,
					shared: o.shared,
					callbacks: o.callbacks,
				}),
					(e.updateQueue = n);
				return;
			}
			(e = n.lastBaseUpdate),
				e === null ? (n.firstBaseUpdate = t) : (e.next = t),
				(n.lastBaseUpdate = t);
		}
		var Zg = !1;
		function Sl() {
			if (Zg) {
				var e = Di;
				if (e !== null) throw e;
			}
		}
		function xl(e, t, n, o) {
			Zg = !1;
			var r = e.updateQueue;
			lr = !1;
			var a = r.firstBaseUpdate,
				i = r.lastBaseUpdate,
				s = r.shared.pending;
			if (s !== null) {
				r.shared.pending = null;
				var l = s,
					u = l.next;
				(l.next = null), i === null ? (a = u) : (i.next = u), (i = l);
				var d = e.alternate;
				d !== null &&
					((d = d.updateQueue),
					(s = d.lastBaseUpdate),
					s !== i &&
						(s === null ? (d.firstBaseUpdate = u) : (s.next = u),
						(d.lastBaseUpdate = l)));
			}
			if (a !== null) {
				var f = r.baseState;
				(i = 0), (d = u = l = null), (s = a);
				do {
					var c = s.lane & -536870913,
						p = c !== s.lane;
					if (p ? (te & c) === c : (o & c) === c) {
						c !== 0 && c === Pi && (Zg = !0),
							d !== null &&
								(d = d.next =
									{
										lane: 0,
										tag: s.tag,
										payload: s.payload,
										callback: null,
										next: null,
									});
						e: {
							var v = e,
								C = s;
							c = t;
							var y = n;
							switch (C.tag) {
								case 1:
									if (((v = C.payload), typeof v == 'function')) {
										f = v.call(y, f, c);
										break e;
									}
									f = v;
									break e;
								case 3:
									v.flags = (v.flags & -65537) | 128;
								case 0:
									if (
										((v = C.payload),
										(c = typeof v == 'function' ? v.call(y, f, c) : v),
										c == null)
									)
										break e;
									f = Te({}, f, c);
									break e;
								case 2:
									lr = !0;
							}
						}
						(c = s.callback),
							c !== null &&
								((e.flags |= 64),
								p && (e.flags |= 8192),
								(p = r.callbacks),
								p === null ? (r.callbacks = [c]) : p.push(c));
					} else
						(p = {
							lane: c,
							tag: s.tag,
							payload: s.payload,
							callback: s.callback,
							next: null,
						}),
							d === null ? ((u = d = p), (l = f)) : (d = d.next = p),
							(i |= c);
					if (((s = s.next), s === null)) {
						if (((s = r.shared.pending), s === null)) break;
						(p = s),
							(s = p.next),
							(p.next = null),
							(r.lastBaseUpdate = p),
							(r.shared.pending = null);
					}
				} while (!0);
				d === null && (l = f),
					(r.baseState = l),
					(r.firstBaseUpdate = u),
					(r.lastBaseUpdate = d),
					a === null && (r.shared.lanes = 0),
					(Nr |= i),
					(e.lanes = i),
					(e.memoizedState = f);
			}
		}
		function Qx(e, t) {
			if (typeof e != 'function') throw Error(I(191, e));
			e.call(t);
		}
		function Zx(e, t) {
			var n = e.callbacks;
			if (n !== null)
				for (e.callbacks = null, e = 0; e < n.length; e++) Qx(n[e], t);
		}
		var Gi = mo(null),
			Ud = mo(0);
		function aS(e, t) {
			(e = qo), ye(Ud, e), ye(Gi, t), (qo = e | t.baseLanes);
		}
		function Jg() {
			ye(Ud, qo), ye(Gi, Gi.current);
		}
		function Gb() {
			(qo = Ud.current), ut(Gi), ut(Ud);
		}
		var ln = mo(null),
			Rn = null;
		function ur(e) {
			var t = e.alternate;
			ye(qe, qe.current & 1),
				ye(ln, e),
				Rn === null &&
					(t === null || Gi.current !== null || t.memoizedState !== null) &&
					(Rn = e);
		}
		function Wg(e) {
			ye(qe, qe.current), ye(ln, e), Rn === null && (Rn = e);
		}
		function Jx(e) {
			e.tag === 22
				? (ye(qe, qe.current), ye(ln, e), Rn === null && (Rn = e))
				: dr(e);
		}
		function dr() {
			ye(qe, qe.current), ye(ln, ln.current);
		}
		function $t(e) {
			ut(ln), Rn === e && (Rn = null), ut(qe);
		}
		var qe = mo(0);
		function Hd(e) {
			for (var t = e; t !== null; ) {
				if (t.tag === 13) {
					var n = t.memoizedState;
					if (n !== null && ((n = n.dehydrated), n === null || hb(n) || vb(n)))
						return t;
				} else if (
					t.tag === 19 &&
					(t.memoizedProps.revealOrder === 'forwards' ||
						t.memoizedProps.revealOrder === 'backwards' ||
						t.memoizedProps.revealOrder === 'unstable_legacy-backwards' ||
						t.memoizedProps.revealOrder === 'together')
				) {
					if ((t.flags & 128) !== 0) return t;
				} else if (t.child !== null) {
					(t.child.return = t), (t = t.child);
					continue;
				}
				if (t === e) break;
				for (; t.sibling === null; ) {
					if (t.return === null || t.return === e) return null;
					t = t.return;
				}
				(t.sibling.return = t.return), (t = t.sibling);
			}
			return null;
		}
		var Po = 0,
			Q = null,
			pe = null,
			Qe = null,
			Pd = !1,
			ji = !1,
			ga = !1,
			Gd = 0,
			Ml = 0,
			zi = null,
			g3 = 0;
		function _e() {
			throw Error(I(321));
		}
		function Fb(e, t) {
			if (t === null) return !1;
			for (var n = 0; n < t.length && n < e.length; n++)
				if (!sn(e[n], t[n])) return !1;
			return !0;
		}
		function qb(e, t, n, o, r, a) {
			return (
				(Po = a),
				(Q = t),
				(t.memoizedState = null),
				(t.updateQueue = null),
				(t.lanes = 0),
				(q.H = e === null || e.memoizedState === null ? E2 : nh),
				(ga = !1),
				(a = n(o, r)),
				(ga = !1),
				ji && (a = $x(t, n, o, r)),
				Wx(e),
				a
			);
		}
		function Wx(e) {
			q.H = jl;
			var t = pe !== null && pe.next !== null;
			if (((Po = 0), (Qe = pe = Q = null), (Pd = !1), (Ml = 0), (zi = null), t))
				throw Error(I(300));
			e === null ||
				We ||
				((e = e.dependencies), e !== null && zd(e) && (We = !0));
		}
		function $x(e, t, n, o) {
			Q = e;
			var r = 0;
			do {
				if ((ji && (zi = null), (Ml = 0), (ji = !1), 25 <= r))
					throw Error(I(301));
				if (((r += 1), (Qe = pe = null), e.updateQueue != null)) {
					var a = e.updateQueue;
					(a.lastEffect = null),
						(a.events = null),
						(a.stores = null),
						a.memoCache != null && (a.memoCache.index = 0);
				}
				(q.H = I2), (a = t(n, o));
			} while (ji);
			return a;
		}
		function b3() {
			var e = q.H,
				t = e.useState()[0];
			return (
				(t = typeof t.then == 'function' ? Zl(t) : t),
				(e = e.useState()[0]),
				(pe !== null ? pe.memoizedState : null) !== e && (Q.flags |= 1024),
				t
			);
		}
		function Yb() {
			var e = Gd !== 0;
			return (Gd = 0), e;
		}
		function Xb(e, t, n) {
			(t.updateQueue = e.updateQueue), (t.flags &= -2053), (e.lanes &= ~n);
		}
		function Kb(e) {
			if (Pd) {
				for (e = e.memoizedState; e !== null; ) {
					var t = e.queue;
					t !== null && (t.pending = null), (e = e.next);
				}
				Pd = !1;
			}
			(Po = 0), (Qe = pe = Q = null), (ji = !1), (Ml = Gd = 0), (zi = null);
		}
		function Lt() {
			var e = {
				memoizedState: null,
				baseState: null,
				baseQueue: null,
				queue: null,
				next: null,
			};
			return Qe === null ? (Q.memoizedState = Qe = e) : (Qe = Qe.next = e), Qe;
		}
		function Ye() {
			if (pe === null) {
				var e = Q.alternate;
				e = e !== null ? e.memoizedState : null;
			} else e = pe.next;
			var t = Qe === null ? Q.memoizedState : Qe.next;
			if (t !== null) (Qe = t), (pe = e);
			else {
				if (e === null)
					throw Q.alternate === null ? Error(I(467)) : Error(I(310));
				(pe = e),
					(e = {
						memoizedState: pe.memoizedState,
						baseState: pe.baseState,
						baseQueue: pe.baseQueue,
						queue: pe.queue,
						next: null,
					}),
					Qe === null ? (Q.memoizedState = Qe = e) : (Qe = Qe.next = e);
			}
			return Qe;
		}
		function mf() {
			return { lastEffect: null, events: null, stores: null, memoCache: null };
		}
		function Zl(e) {
			var t = Ml;
			return (
				(Ml += 1),
				zi === null && (zi = []),
				(e = Yx(zi, e, t)),
				(t = Q),
				(Qe === null ? t.memoizedState : Qe.next) === null &&
					((t = t.alternate),
					(q.H = t === null || t.memoizedState === null ? E2 : nh)),
				e
			);
		}
		function pf(e) {
			if (e !== null && typeof e == 'object') {
				if (typeof e.then == 'function') return Zl(e);
				if (e.$$typeof === Do) return vt(e);
			}
			throw Error(I(438, String(e)));
		}
		function Qb(e) {
			var t = null,
				n = Q.updateQueue;
			if ((n !== null && (t = n.memoCache), t == null)) {
				var o = Q.alternate;
				o !== null &&
					((o = o.updateQueue),
					o !== null &&
						((o = o.memoCache),
						o != null &&
							(t = {
								data: o.data.map(function (r) {
									return r.slice();
								}),
								index: 0,
							})));
			}
			if (
				(t == null && (t = { data: [], index: 0 }),
				n === null && ((n = mf()), (Q.updateQueue = n)),
				(n.memoCache = t),
				(n = t.data[t.index]),
				n === void 0)
			)
				for (n = t.data[t.index] = Array(e), o = 0; o < e; o++) n[o] = tI;
			return t.index++, n;
		}
		function Go(e, t) {
			return typeof t == 'function' ? t(e) : t;
		}
		function Sd(e) {
			var t = Ye();
			return Zb(t, pe, e);
		}
		function Zb(e, t, n) {
			var o = e.queue;
			if (o === null) throw Error(I(311));
			o.lastRenderedReducer = n;
			var r = e.baseQueue,
				a = o.pending;
			if (a !== null) {
				if (r !== null) {
					var i = r.next;
					(r.next = a.next), (a.next = i);
				}
				(t.baseQueue = r = a), (o.pending = null);
			}
			if (((a = e.baseState), r === null)) e.memoizedState = a;
			else {
				t = r.next;
				var s = (i = null),
					l = null,
					u = t,
					d = !1;
				do {
					var f = u.lane & -536870913;
					if (f !== u.lane ? (te & f) === f : (Po & f) === f) {
						var c = u.revertLane;
						if (c === 0)
							l !== null &&
								(l = l.next =
									{
										lane: 0,
										revertLane: 0,
										gesture: null,
										action: u.action,
										hasEagerState: u.hasEagerState,
										eagerState: u.eagerState,
										next: null,
									}),
								f === Pi && (d = !0);
						else if ((Po & c) === c) {
							(u = u.next), c === Pi && (d = !0);
							continue;
						} else
							(f = {
								lane: 0,
								revertLane: u.revertLane,
								gesture: null,
								action: u.action,
								hasEagerState: u.hasEagerState,
								eagerState: u.eagerState,
								next: null,
							}),
								l === null ? ((s = l = f), (i = a)) : (l = l.next = f),
								(Q.lanes |= c),
								(Nr |= c);
						(f = u.action),
							ga && n(a, f),
							(a = u.hasEagerState ? u.eagerState : n(a, f));
					} else
						(c = {
							lane: f,
							revertLane: u.revertLane,
							gesture: u.gesture,
							action: u.action,
							hasEagerState: u.hasEagerState,
							eagerState: u.eagerState,
							next: null,
						}),
							l === null ? ((s = l = c), (i = a)) : (l = l.next = c),
							(Q.lanes |= f),
							(Nr |= f);
					u = u.next;
				} while (u !== null && u !== t);
				if (
					(l === null ? (i = a) : (l.next = s),
					!sn(a, e.memoizedState) && ((We = !0), d && ((n = Di), n !== null)))
				)
					throw n;
				(e.memoizedState = a),
					(e.baseState = i),
					(e.baseQueue = l),
					(o.lastRenderedState = a);
			}
			return r === null && (o.lanes = 0), [e.memoizedState, o.dispatch];
		}
		function cg(e) {
			var t = Ye(),
				n = t.queue;
			if (n === null) throw Error(I(311));
			n.lastRenderedReducer = e;
			var o = n.dispatch,
				r = n.pending,
				a = t.memoizedState;
			if (r !== null) {
				n.pending = null;
				var i = (r = r.next);
				do (a = e(a, i.action)), (i = i.next);
				while (i !== r);
				sn(a, t.memoizedState) || (We = !0),
					(t.memoizedState = a),
					t.baseQueue === null && (t.baseState = a),
					(n.lastRenderedState = a);
			}
			return [a, o];
		}
		function e2(e, t, n) {
			var o = Q,
				r = Ye(),
				a = ne;
			if (a) {
				if (n === void 0) throw Error(I(407));
				n = n();
			} else n = t();
			var i = !sn((pe || r).memoizedState, n);
			if (
				(i && ((r.memoizedState = n), (We = !0)),
				(r = r.queue),
				Jb(o2.bind(null, o, r, e), [e]),
				r.getSnapshot !== t || i || (Qe !== null && Qe.memoizedState.tag & 1))
			) {
				if (
					((o.flags |= 2048),
					Fi(9, { destroy: void 0 }, n2.bind(null, o, r, n, t), null),
					he === null)
				)
					throw Error(I(349));
				a || (Po & 127) !== 0 || t2(o, t, n);
			}
			return n;
		}
		function t2(e, t, n) {
			(e.flags |= 16384),
				(e = { getSnapshot: t, value: n }),
				(t = Q.updateQueue),
				t === null
					? ((t = mf()), (Q.updateQueue = t), (t.stores = [e]))
					: ((n = t.stores), n === null ? (t.stores = [e]) : n.push(e));
		}
		function n2(e, t, n, o) {
			(t.value = n), (t.getSnapshot = o), r2(t) && a2(e);
		}
		function o2(e, t, n) {
			return n(function () {
				r2(t) && a2(e);
			});
		}
		function r2(e) {
			var t = e.getSnapshot;
			e = e.value;
			try {
				var n = t();
				return !sn(e, n);
			} catch {
				return !0;
			}
		}
		function a2(e) {
			var t = Ca(e, 2);
			t !== null && Pt(t, e, 2);
		}
		function $g(e) {
			var t = Lt();
			if (typeof e == 'function') {
				var n = e;
				if (((e = n()), ga)) {
					mr(!0);
					try {
						n();
					} finally {
						mr(!1);
					}
				}
			}
			return (
				(t.memoizedState = t.baseState = e),
				(t.queue = {
					pending: null,
					lanes: 0,
					dispatch: null,
					lastRenderedReducer: Go,
					lastRenderedState: e,
				}),
				t
			);
		}
		function i2(e, t, n, o) {
			return (e.baseState = n), Zb(e, pe, typeof o == 'function' ? o : Go);
		}
		function h3(e, t, n, o, r) {
			if (bf(e)) throw Error(I(485));
			if (((e = t.action), e !== null)) {
				var a = {
					payload: r,
					action: e,
					next: null,
					isTransition: !0,
					status: 'pending',
					value: null,
					reason: null,
					listeners: [],
					then: function (i) {
						a.listeners.push(i);
					},
				};
				q.T !== null ? n(!0) : (a.isTransition = !1),
					o(a),
					(n = t.pending),
					n === null
						? ((a.next = t.pending = a), s2(t, a))
						: ((a.next = n.next), (t.pending = n.next = a));
			}
		}
		function s2(e, t) {
			var n = t.action,
				o = t.payload,
				r = e.state;
			if (t.isTransition) {
				var a = q.T,
					i = {};
				q.T = i;
				try {
					var s = n(r, o),
						l = q.S;
					l !== null && l(i, s), iS(e, t, s);
				} catch (u) {
					eb(e, t, u);
				} finally {
					a !== null && i.types !== null && (a.types = i.types), (q.T = a);
				}
			} else
				try {
					(a = n(r, o)), iS(e, t, a);
				} catch (u) {
					eb(e, t, u);
				}
		}
		function iS(e, t, n) {
			n !== null && typeof n == 'object' && typeof n.then == 'function'
				? n.then(
						function (o) {
							sS(e, t, o);
						},
						function (o) {
							return eb(e, t, o);
						}
					)
				: sS(e, t, n);
		}
		function sS(e, t, n) {
			(t.status = 'fulfilled'),
				(t.value = n),
				l2(t),
				(e.state = n),
				(t = e.pending),
				t !== null &&
					((n = t.next),
					n === t
						? (e.pending = null)
						: ((n = n.next), (t.next = n), s2(e, n)));
		}
		function eb(e, t, n) {
			var o = e.pending;
			if (((e.pending = null), o !== null)) {
				o = o.next;
				do (t.status = 'rejected'), (t.reason = n), l2(t), (t = t.next);
				while (t !== o);
			}
			e.action = null;
		}
		function l2(e) {
			e = e.listeners;
			for (var t = 0; t < e.length; t++) (0, e[t])();
		}
		function c2(e, t) {
			return t;
		}
		function lS(e, t) {
			if (ne) {
				var n = he.formState;
				if (n !== null) {
					e: {
						var o = Q;
						if (ne) {
							if (xe) {
								t: {
									for (var r = xe, a = An; r.nodeType !== 8; ) {
										if (!a) {
											r = null;
											break t;
										}
										if (((r = En(r.nextSibling)), r === null)) {
											r = null;
											break t;
										}
									}
									(a = r.data), (r = a === 'F!' || a === 'F' ? r : null);
								}
								if (r) {
									(xe = En(r.nextSibling)), (o = r.data === 'F!');
									break e;
								}
							}
							Er(o);
						}
						o = !1;
					}
					o && (t = n[0]);
				}
			}
			return (
				(n = Lt()),
				(n.memoizedState = n.baseState = t),
				(o = {
					pending: null,
					lanes: 0,
					dispatch: null,
					lastRenderedReducer: c2,
					lastRenderedState: t,
				}),
				(n.queue = o),
				(n = w2.bind(null, Q, o)),
				(o.dispatch = n),
				(o = $g(!1)),
				(a = th.bind(null, Q, !1, o.queue)),
				(o = Lt()),
				(r = { state: t, dispatch: null, action: e, pending: null }),
				(o.queue = r),
				(n = h3.bind(null, Q, r, a, n)),
				(r.dispatch = n),
				(o.memoizedState = e),
				[t, n, !1]
			);
		}
		function cS(e) {
			var t = Ye();
			return u2(t, pe, e);
		}
		function u2(e, t, n) {
			if (
				((t = Zb(e, t, c2)[0]),
				(e = Sd(Go)[0]),
				typeof t == 'object' && t !== null && typeof t.then == 'function')
			)
				try {
					var o = Zl(t);
				} catch (i) {
					throw i === $i ? ff : i;
				}
			else o = t;
			t = Ye();
			var r = t.queue,
				a = r.dispatch;
			return (
				n !== t.memoizedState &&
					((Q.flags |= 2048),
					Fi(9, { destroy: void 0 }, v3.bind(null, r, n), null)),
				[o, a, e]
			);
		}
		function v3(e, t) {
			e.action = t;
		}
		function uS(e) {
			var t = Ye(),
				n = pe;
			if (n !== null) return u2(t, n, e);
			Ye(), (t = t.memoizedState), (n = Ye());
			var o = n.queue.dispatch;
			return (n.memoizedState = e), [t, o, !1];
		}
		function Fi(e, t, n, o) {
			return (
				(e = { tag: e, create: n, deps: o, inst: t, next: null }),
				(t = Q.updateQueue),
				t === null && ((t = mf()), (Q.updateQueue = t)),
				(n = t.lastEffect),
				n === null
					? (t.lastEffect = e.next = e)
					: ((o = n.next), (n.next = e), (e.next = o), (t.lastEffect = e)),
				e
			);
		}
		function d2() {
			return Ye().memoizedState;
		}
		function xd(e, t, n, o) {
			var r = Lt();
			(Q.flags |= e),
				(r.memoizedState = Fi(
					1 | t,
					{ destroy: void 0 },
					n,
					o === void 0 ? null : o
				));
		}
		function gf(e, t, n, o) {
			var r = Ye();
			o = o === void 0 ? null : o;
			var a = r.memoizedState.inst;
			pe !== null && o !== null && Fb(o, pe.memoizedState.deps)
				? (r.memoizedState = Fi(t, a, n, o))
				: ((Q.flags |= e), (r.memoizedState = Fi(1 | t, a, n, o)));
		}
		function dS(e, t) {
			xd(8390656, 8, e, t);
		}
		function Jb(e, t) {
			gf(2048, 8, e, t);
		}
		function y3(e) {
			Q.flags |= 4;
			var t = Q.updateQueue;
			if (t === null) (t = mf()), (Q.updateQueue = t), (t.events = [e]);
			else {
				var n = t.events;
				n === null ? (t.events = [e]) : n.push(e);
			}
		}
		function f2(e) {
			var t = Ye().memoizedState;
			return (
				y3({ ref: t, nextImpl: e }),
				function () {
					if ((ae & 2) !== 0) throw Error(I(440));
					return t.impl.apply(void 0, arguments);
				}
			);
		}
		function m2(e, t) {
			return gf(4, 2, e, t);
		}
		function p2(e, t) {
			return gf(4, 4, e, t);
		}
		function g2(e, t) {
			if (typeof t == 'function') {
				e = e();
				var n = t(e);
				return function () {
					typeof n == 'function' ? n() : t(null);
				};
			}
			if (t != null)
				return (
					(e = e()),
					(t.current = e),
					function () {
						t.current = null;
					}
				);
		}
		function b2(e, t, n) {
			(n = n != null ? n.concat([e]) : null), gf(4, 4, g2.bind(null, t, e), n);
		}
		function Wb() {}
		function h2(e, t) {
			var n = Ye();
			t = t === void 0 ? null : t;
			var o = n.memoizedState;
			return t !== null && Fb(t, o[1]) ? o[0] : ((n.memoizedState = [e, t]), e);
		}
		function v2(e, t) {
			var n = Ye();
			t = t === void 0 ? null : t;
			var o = n.memoizedState;
			if (t !== null && Fb(t, o[1])) return o[0];
			if (((o = e()), ga)) {
				mr(!0);
				try {
					e();
				} finally {
					mr(!1);
				}
			}
			return (n.memoizedState = [o, t]), o;
		}
		function $b(e, t, n) {
			return n === void 0 || ((Po & 1073741824) !== 0 && (te & 261930) === 0)
				? (e.memoizedState = t)
				: ((e.memoizedState = n), (e = iT()), (Q.lanes |= e), (Nr |= e), n);
		}
		function y2(e, t, n, o) {
			return sn(n, t)
				? n
				: Gi.current !== null
					? ((e = $b(e, n, o)), sn(e, t) || (We = !0), e)
					: (Po & 42) === 0 || ((Po & 1073741824) !== 0 && (te & 261930) === 0)
						? ((We = !0), (e.memoizedState = n))
						: ((e = iT()), (Q.lanes |= e), (Nr |= e), t);
		}
		function C2(e, t, n, o, r) {
			var a = ie.p;
			ie.p = a !== 0 && 8 > a ? a : 8;
			var i = q.T,
				s = {};
			(q.T = s), th(e, !1, t, n);
			try {
				var l = r(),
					u = q.S;
				if (
					(u !== null && u(s, l),
					l !== null && typeof l == 'object' && typeof l.then == 'function')
				) {
					var d = p3(l, o);
					Tl(e, t, d, an(e));
				} else Tl(e, t, o, an(e));
			} catch (f) {
				Tl(e, t, { then: function () {}, status: 'rejected', reason: f }, an());
			} finally {
				(ie.p = a),
					i !== null && s.types !== null && (i.types = s.types),
					(q.T = i);
			}
		}
		function C3() {}
		function tb(e, t, n, o) {
			if (e.tag !== 5) throw Error(I(476));
			var r = S2(e).queue;
			C2(
				e,
				r,
				t,
				sa,
				n === null
					? C3
					: function () {
							return x2(e), n(o);
						}
			);
		}
		function S2(e) {
			var t = e.memoizedState;
			if (t !== null) return t;
			t = {
				memoizedState: sa,
				baseState: sa,
				baseQueue: null,
				queue: {
					pending: null,
					lanes: 0,
					dispatch: null,
					lastRenderedReducer: Go,
					lastRenderedState: sa,
				},
				next: null,
			};
			var n = {};
			return (
				(t.next = {
					memoizedState: n,
					baseState: n,
					baseQueue: null,
					queue: {
						pending: null,
						lanes: 0,
						dispatch: null,
						lastRenderedReducer: Go,
						lastRenderedState: n,
					},
					next: null,
				}),
				(e.memoizedState = t),
				(e = e.alternate),
				e !== null && (e.memoizedState = t),
				t
			);
		}
		function x2(e) {
			var t = S2(e);
			t.next === null && (t = e.alternate.memoizedState),
				Tl(e, t.next.queue, {}, an());
		}
		function eh() {
			return vt(Ul);
		}
		function T2() {
			return Ye().memoizedState;
		}
		function k2() {
			return Ye().memoizedState;
		}
		function S3(e) {
			for (var t = e.return; t !== null; ) {
				switch (t.tag) {
					case 24:
					case 3:
						var n = an();
						e = Cr(n);
						var o = Sr(t, e, n);
						o !== null && (Pt(o, t, n), Cl(o, t, n)),
							(t = { cache: Vb() }),
							(e.payload = t);
						return;
				}
				t = t.return;
			}
		}
		function x3(e, t, n) {
			var o = an();
			(n = {
				lane: o,
				revertLane: 0,
				gesture: null,
				action: n,
				hasEagerState: !1,
				eagerState: null,
				next: null,
			}),
				bf(e)
					? A2(t, n)
					: ((n = Db(e, t, n, o)), n !== null && (Pt(n, e, o), R2(n, t, o)));
		}
		function w2(e, t, n) {
			var o = an();
			Tl(e, t, n, o);
		}
		function Tl(e, t, n, o) {
			var r = {
				lane: o,
				revertLane: 0,
				gesture: null,
				action: n,
				hasEagerState: !1,
				eagerState: null,
				next: null,
			};
			if (bf(e)) A2(t, r);
			else {
				var a = e.alternate;
				if (
					e.lanes === 0 &&
					(a === null || a.lanes === 0) &&
					((a = t.lastRenderedReducer), a !== null)
				)
					try {
						var i = t.lastRenderedState,
							s = a(i, n);
						if (((r.hasEagerState = !0), (r.eagerState = s), sn(s, i)))
							return df(e, t, r, 0), he === null && uf(), !1;
					} catch {}
				if (((n = Db(e, t, r, o)), n !== null))
					return Pt(n, e, o), R2(n, t, o), !0;
			}
			return !1;
		}
		function th(e, t, n, o) {
			if (
				((o = {
					lane: 2,
					revertLane: uh(),
					gesture: null,
					action: o,
					hasEagerState: !1,
					eagerState: null,
					next: null,
				}),
				bf(e))
			) {
				if (t) throw Error(I(479));
			} else (t = Db(e, n, o, 2)), t !== null && Pt(t, e, 2);
		}
		function bf(e) {
			var t = e.alternate;
			return e === Q || (t !== null && t === Q);
		}
		function A2(e, t) {
			ji = Pd = !0;
			var n = e.pending;
			n === null ? (t.next = t) : ((t.next = n.next), (n.next = t)),
				(e.pending = t);
		}
		function R2(e, t, n) {
			if ((n & 4194048) !== 0) {
				var o = t.lanes;
				(o &= e.pendingLanes), (n |= o), (t.lanes = n), fx(e, n);
			}
		}
		var jl = {
			readContext: vt,
			use: pf,
			useCallback: _e,
			useContext: _e,
			useEffect: _e,
			useImperativeHandle: _e,
			useLayoutEffect: _e,
			useInsertionEffect: _e,
			useMemo: _e,
			useReducer: _e,
			useRef: _e,
			useState: _e,
			useDebugValue: _e,
			useDeferredValue: _e,
			useTransition: _e,
			useSyncExternalStore: _e,
			useId: _e,
			useHostTransitionStatus: _e,
			useFormState: _e,
			useActionState: _e,
			useOptimistic: _e,
			useMemoCache: _e,
			useCacheRefresh: _e,
		};
		jl.useEffectEvent = _e;
		var E2 = {
				readContext: vt,
				use: pf,
				useCallback: function (e, t) {
					return (Lt().memoizedState = [e, t === void 0 ? null : t]), e;
				},
				useContext: vt,
				useEffect: dS,
				useImperativeHandle: function (e, t, n) {
					(n = n != null ? n.concat([e]) : null),
						xd(4194308, 4, g2.bind(null, t, e), n);
				},
				useLayoutEffect: function (e, t) {
					return xd(4194308, 4, e, t);
				},
				useInsertionEffect: function (e, t) {
					xd(4, 2, e, t);
				},
				useMemo: function (e, t) {
					var n = Lt();
					t = t === void 0 ? null : t;
					var o = e();
					if (ga) {
						mr(!0);
						try {
							e();
						} finally {
							mr(!1);
						}
					}
					return (n.memoizedState = [o, t]), o;
				},
				useReducer: function (e, t, n) {
					var o = Lt();
					if (n !== void 0) {
						var r = n(t);
						if (ga) {
							mr(!0);
							try {
								n(t);
							} finally {
								mr(!1);
							}
						}
					} else r = t;
					return (
						(o.memoizedState = o.baseState = r),
						(e = {
							pending: null,
							lanes: 0,
							dispatch: null,
							lastRenderedReducer: e,
							lastRenderedState: r,
						}),
						(o.queue = e),
						(e = e.dispatch = x3.bind(null, Q, e)),
						[o.memoizedState, e]
					);
				},
				useRef: function (e) {
					var t = Lt();
					return (e = { current: e }), (t.memoizedState = e);
				},
				useState: function (e) {
					e = $g(e);
					var t = e.queue,
						n = w2.bind(null, Q, t);
					return (t.dispatch = n), [e.memoizedState, n];
				},
				useDebugValue: Wb,
				useDeferredValue: function (e, t) {
					var n = Lt();
					return $b(n, e, t);
				},
				useTransition: function () {
					var e = $g(!1);
					return (
						(e = C2.bind(null, Q, e.queue, !0, !1)),
						(Lt().memoizedState = e),
						[!1, e]
					);
				},
				useSyncExternalStore: function (e, t, n) {
					var o = Q,
						r = Lt();
					if (ne) {
						if (n === void 0) throw Error(I(407));
						n = n();
					} else {
						if (((n = t()), he === null)) throw Error(I(349));
						(te & 127) !== 0 || t2(o, t, n);
					}
					r.memoizedState = n;
					var a = { value: n, getSnapshot: t };
					return (
						(r.queue = a),
						dS(o2.bind(null, o, a, e), [e]),
						(o.flags |= 2048),
						Fi(9, { destroy: void 0 }, n2.bind(null, o, a, n, t), null),
						n
					);
				},
				useId: function () {
					var e = Lt(),
						t = he.identifierPrefix;
					if (ne) {
						var n = co,
							o = lo;
						(n = (o & ~(1 << (32 - rn(o) - 1))).toString(32) + n),
							(t = '_' + t + 'R_' + n),
							(n = Gd++),
							0 < n && (t += 'H' + n.toString(32)),
							(t += '_');
					} else (n = g3++), (t = '_' + t + 'r_' + n.toString(32) + '_');
					return (e.memoizedState = t);
				},
				useHostTransitionStatus: eh,
				useFormState: lS,
				useActionState: lS,
				useOptimistic: function (e) {
					var t = Lt();
					t.memoizedState = t.baseState = e;
					var n = {
						pending: null,
						lanes: 0,
						dispatch: null,
						lastRenderedReducer: null,
						lastRenderedState: null,
					};
					return (
						(t.queue = n),
						(t = th.bind(null, Q, !0, n)),
						(n.dispatch = t),
						[e, t]
					);
				},
				useMemoCache: Qb,
				useCacheRefresh: function () {
					return (Lt().memoizedState = S3.bind(null, Q));
				},
				useEffectEvent: function (e) {
					var t = Lt(),
						n = { impl: e };
					return (
						(t.memoizedState = n),
						function () {
							if ((ae & 2) !== 0) throw Error(I(440));
							return n.impl.apply(void 0, arguments);
						}
					);
				},
			},
			nh = {
				readContext: vt,
				use: pf,
				useCallback: h2,
				useContext: vt,
				useEffect: Jb,
				useImperativeHandle: b2,
				useInsertionEffect: m2,
				useLayoutEffect: p2,
				useMemo: v2,
				useReducer: Sd,
				useRef: d2,
				useState: function () {
					return Sd(Go);
				},
				useDebugValue: Wb,
				useDeferredValue: function (e, t) {
					var n = Ye();
					return y2(n, pe.memoizedState, e, t);
				},
				useTransition: function () {
					var e = Sd(Go)[0],
						t = Ye().memoizedState;
					return [typeof e == 'boolean' ? e : Zl(e), t];
				},
				useSyncExternalStore: e2,
				useId: T2,
				useHostTransitionStatus: eh,
				useFormState: cS,
				useActionState: cS,
				useOptimistic: function (e, t) {
					var n = Ye();
					return i2(n, pe, e, t);
				},
				useMemoCache: Qb,
				useCacheRefresh: k2,
			};
		nh.useEffectEvent = f2;
		var I2 = {
			readContext: vt,
			use: pf,
			useCallback: h2,
			useContext: vt,
			useEffect: Jb,
			useImperativeHandle: b2,
			useInsertionEffect: m2,
			useLayoutEffect: p2,
			useMemo: v2,
			useReducer: cg,
			useRef: d2,
			useState: function () {
				return cg(Go);
			},
			useDebugValue: Wb,
			useDeferredValue: function (e, t) {
				var n = Ye();
				return pe === null ? $b(n, e, t) : y2(n, pe.memoizedState, e, t);
			},
			useTransition: function () {
				var e = cg(Go)[0],
					t = Ye().memoizedState;
				return [typeof e == 'boolean' ? e : Zl(e), t];
			},
			useSyncExternalStore: e2,
			useId: T2,
			useHostTransitionStatus: eh,
			useFormState: uS,
			useActionState: uS,
			useOptimistic: function (e, t) {
				var n = Ye();
				return pe !== null
					? i2(n, pe, e, t)
					: ((n.baseState = e), [e, n.queue.dispatch]);
			},
			useMemoCache: Qb,
			useCacheRefresh: k2,
		};
		I2.useEffectEvent = f2;
		function ug(e, t, n, o) {
			(t = e.memoizedState),
				(n = n(o, t)),
				(n = n == null ? t : Te({}, t, n)),
				(e.memoizedState = n),
				e.lanes === 0 && (e.updateQueue.baseState = n);
		}
		var nb = {
			enqueueSetState: function (e, t, n) {
				e = e._reactInternals;
				var o = an(),
					r = Cr(o);
				(r.payload = t),
					n != null && (r.callback = n),
					(t = Sr(e, r, o)),
					t !== null && (Pt(t, e, o), Cl(t, e, o));
			},
			enqueueReplaceState: function (e, t, n) {
				e = e._reactInternals;
				var o = an(),
					r = Cr(o);
				(r.tag = 1),
					(r.payload = t),
					n != null && (r.callback = n),
					(t = Sr(e, r, o)),
					t !== null && (Pt(t, e, o), Cl(t, e, o));
			},
			enqueueForceUpdate: function (e, t) {
				e = e._reactInternals;
				var n = an(),
					o = Cr(n);
				(o.tag = 2),
					t != null && (o.callback = t),
					(t = Sr(e, o, n)),
					t !== null && (Pt(t, e, n), Cl(t, e, n));
			},
		};
		function fS(e, t, n, o, r, a, i) {
			return (
				(e = e.stateNode),
				typeof e.shouldComponentUpdate == 'function'
					? e.shouldComponentUpdate(o, a, i)
					: t.prototype && t.prototype.isPureReactComponent
						? !_l(n, o) || !_l(r, a)
						: !0
			);
		}
		function mS(e, t, n, o) {
			(e = t.state),
				typeof t.componentWillReceiveProps == 'function' &&
					t.componentWillReceiveProps(n, o),
				typeof t.UNSAFE_componentWillReceiveProps == 'function' &&
					t.UNSAFE_componentWillReceiveProps(n, o),
				t.state !== e && nb.enqueueReplaceState(t, t.state, null);
		}
		function ba(e, t) {
			var n = t;
			if ('ref' in t) {
				n = {};
				for (var o in t) o !== 'ref' && (n[o] = t[o]);
			}
			if ((e = e.defaultProps)) {
				n === t && (n = Te({}, n));
				for (var r in e) n[r] === void 0 && (n[r] = e[r]);
			}
			return n;
		}
		function N2(e) {
			Dd(e);
		}
		function L2(e) {
			console.error(e);
		}
		function _2(e) {
			Dd(e);
		}
		function Fd(e, t) {
			try {
				var n = e.onUncaughtError;
				n(t.value, { componentStack: t.stack });
			} catch (o) {
				setTimeout(function () {
					throw o;
				});
			}
		}
		function pS(e, t, n) {
			try {
				var o = e.onCaughtError;
				o(n.value, {
					componentStack: n.stack,
					errorBoundary: t.tag === 1 ? t.stateNode : null,
				});
			} catch (r) {
				setTimeout(function () {
					throw r;
				});
			}
		}
		function ob(e, t, n) {
			return (
				(n = Cr(n)),
				(n.tag = 3),
				(n.payload = { element: null }),
				(n.callback = function () {
					Fd(e, t);
				}),
				n
			);
		}
		function O2(e) {
			return (e = Cr(e)), (e.tag = 3), e;
		}
		function B2(e, t, n, o) {
			var r = n.type.getDerivedStateFromError;
			if (typeof r == 'function') {
				var a = o.value;
				(e.payload = function () {
					return r(a);
				}),
					(e.callback = function () {
						pS(t, n, o);
					});
			}
			var i = n.stateNode;
			i !== null &&
				typeof i.componentDidCatch == 'function' &&
				(e.callback = function () {
					pS(t, n, o),
						typeof r != 'function' &&
							(xr === null ? (xr = new Set([this])) : xr.add(this));
					var s = o.stack;
					this.componentDidCatch(o.value, {
						componentStack: s !== null ? s : '',
					});
				});
		}
		function T3(e, t, n, o, r) {
			if (
				((n.flags |= 32768),
				o !== null && typeof o == 'object' && typeof o.then == 'function')
			) {
				if (
					((t = n.alternate),
					t !== null && Wi(t, n, r, !0),
					(n = ln.current),
					n !== null)
				) {
					switch (n.tag) {
						case 31:
						case 13:
							return (
								Rn === null
									? Qd()
									: n.alternate === null && Oe === 0 && (Oe = 3),
								(n.flags &= -257),
								(n.flags |= 65536),
								(n.lanes = r),
								o === Vd
									? (n.flags |= 16384)
									: ((t = n.updateQueue),
										t === null ? (n.updateQueue = new Set([o])) : t.add(o),
										Sg(e, o, r)),
								!1
							);
						case 22:
							return (
								(n.flags |= 65536),
								o === Vd
									? (n.flags |= 16384)
									: ((t = n.updateQueue),
										t === null
											? ((t = {
													transitions: null,
													markerInstances: null,
													retryQueue: new Set([o]),
												}),
												(n.updateQueue = t))
											: ((n = t.retryQueue),
												n === null ? (t.retryQueue = new Set([o])) : n.add(o)),
										Sg(e, o, r)),
								!1
							);
					}
					throw Error(I(435, n.tag));
				}
				return Sg(e, o, r), Qd(), !1;
			}
			if (ne)
				return (
					(t = ln.current),
					t !== null
						? ((t.flags & 65536) === 0 && (t.flags |= 256),
							(t.flags |= 65536),
							(t.lanes = r),
							o !== Fg && ((e = Error(I(422), { cause: o })), Bl(wn(e, n))))
						: (o !== Fg && ((t = Error(I(423), { cause: o })), Bl(wn(t, n))),
							(e = e.current.alternate),
							(e.flags |= 65536),
							(r &= -r),
							(e.lanes |= r),
							(o = wn(o, n)),
							(r = ob(e.stateNode, o, r)),
							lg(e, r),
							Oe !== 4 && (Oe = 2)),
					!1
				);
			var a = Error(I(520), { cause: o });
			if (
				((a = wn(a, n)),
				Al === null ? (Al = [a]) : Al.push(a),
				Oe !== 4 && (Oe = 2),
				t === null)
			)
				return !0;
			(o = wn(o, n)), (n = t);
			do {
				switch (n.tag) {
					case 3:
						return (
							(n.flags |= 65536),
							(e = r & -r),
							(n.lanes |= e),
							(e = ob(n.stateNode, o, e)),
							lg(n, e),
							!1
						);
					case 1:
						if (
							((t = n.type),
							(a = n.stateNode),
							(n.flags & 128) === 0 &&
								(typeof t.getDerivedStateFromError == 'function' ||
									(a !== null &&
										typeof a.componentDidCatch == 'function' &&
										(xr === null || !xr.has(a)))))
						)
							return (
								(n.flags |= 65536),
								(r &= -r),
								(n.lanes |= r),
								(r = O2(r)),
								B2(r, e, n, o),
								lg(n, r),
								!1
							);
				}
				n = n.return;
			} while (n !== null);
			return !1;
		}
		var oh = Error(I(461)),
			We = !1;
		function gt(e, t, n, o) {
			t.child = e === null ? Kx(t, null, n, o) : pa(t, e.child, n, o);
		}
		function gS(e, t, n, o, r) {
			n = n.render;
			var a = t.ref;
			if ('ref' in o) {
				var i = {};
				for (var s in o) s !== 'ref' && (i[s] = o[s]);
			} else i = o;
			return (
				ma(t),
				(o = qb(e, t, n, i, a, r)),
				(s = Yb()),
				e !== null && !We
					? (Xb(e, t, r), Fo(e, t, r))
					: (ne && s && jb(t), (t.flags |= 1), gt(e, t, o, r), t.child)
			);
		}
		function bS(e, t, n, o, r) {
			if (e === null) {
				var a = n.type;
				return typeof a == 'function' &&
					!Mb(a) &&
					a.defaultProps === void 0 &&
					n.compare === null
					? ((t.tag = 15), (t.type = a), D2(e, t, a, o, r))
					: ((e = yd(n.type, null, o, t, t.mode, r)),
						(e.ref = t.ref),
						(e.return = t),
						(t.child = e));
			}
			if (((a = e.child), !rh(e, r))) {
				var i = a.memoizedProps;
				if (
					((n = n.compare),
					(n = n !== null ? n : _l),
					n(i, o) && e.ref === t.ref)
				)
					return Fo(e, t, r);
			}
			return (
				(t.flags |= 1),
				(e = zo(a, o)),
				(e.ref = t.ref),
				(e.return = t),
				(t.child = e)
			);
		}
		function D2(e, t, n, o, r) {
			if (e !== null) {
				var a = e.memoizedProps;
				if (_l(a, o) && e.ref === t.ref)
					if (((We = !1), (t.pendingProps = o = a), rh(e, r)))
						(e.flags & 131072) !== 0 && (We = !0);
					else return (t.lanes = e.lanes), Fo(e, t, r);
			}
			return rb(e, t, n, o, r);
		}
		function M2(e, t, n, o) {
			var r = o.children,
				a = e !== null ? e.memoizedState : null;
			if (
				(e === null &&
					t.stateNode === null &&
					(t.stateNode = {
						_visibility: 1,
						_pendingMarkers: null,
						_retryCache: null,
						_transitions: null,
					}),
				o.mode === 'hidden')
			) {
				if ((t.flags & 128) !== 0) {
					if (((a = a !== null ? a.baseLanes | n : n), e !== null)) {
						for (o = t.child = e.child, r = 0; o !== null; )
							(r = r | o.lanes | o.childLanes), (o = o.sibling);
						o = r & ~a;
					} else (o = 0), (t.child = null);
					return hS(e, t, a, n, o);
				}
				if ((n & 536870912) !== 0)
					(t.memoizedState = { baseLanes: 0, cachePool: null }),
						e !== null && Cd(t, a !== null ? a.cachePool : null),
						a !== null ? aS(t, a) : Jg(),
						Jx(t);
				else
					return (
						(o = t.lanes = 536870912),
						hS(e, t, a !== null ? a.baseLanes | n : n, n, o)
					);
			} else
				a !== null
					? (Cd(t, a.cachePool), aS(t, a), dr(t), (t.memoizedState = null))
					: (e !== null && Cd(t, null), Jg(), dr(t));
			return gt(e, t, r, n), t.child;
		}
		function pl(e, t) {
			return (
				(e !== null && e.tag === 22) ||
					t.stateNode !== null ||
					(t.stateNode = {
						_visibility: 1,
						_pendingMarkers: null,
						_retryCache: null,
						_transitions: null,
					}),
				t.sibling
			);
		}
		function hS(e, t, n, o, r) {
			var a = Ub();
			return (
				(a = a === null ? null : { parent: Je._currentValue, pool: a }),
				(t.memoizedState = { baseLanes: n, cachePool: a }),
				e !== null && Cd(t, null),
				Jg(),
				Jx(t),
				e !== null && Wi(e, t, o, !0),
				(t.childLanes = r),
				null
			);
		}
		function Td(e, t) {
			return (
				(t = qd({ mode: t.mode, children: t.children }, e.mode)),
				(t.ref = e.ref),
				(e.child = t),
				(t.return = e),
				t
			);
		}
		function vS(e, t, n) {
			return (
				pa(t, e.child, null, n),
				(e = Td(t, t.pendingProps)),
				(e.flags |= 2),
				$t(t),
				(t.memoizedState = null),
				e
			);
		}
		function k3(e, t, n) {
			var o = t.pendingProps,
				r = (t.flags & 128) !== 0;
			if (((t.flags &= -129), e === null)) {
				if (ne) {
					if (o.mode === 'hidden')
						return (e = Td(t, o)), (t.lanes = 536870912), pl(null, e);
					if (
						(Wg(t),
						(e = xe)
							? ((e = ET(e, An)),
								(e = e !== null && e.data === '&' ? e : null),
								e !== null &&
									((t.memoizedState = {
										dehydrated: e,
										treeContext: Rr !== null ? { id: lo, overflow: co } : null,
										retryLane: 536870912,
										hydrationErrors: null,
									}),
									(n = Hx(e)),
									(n.return = t),
									(t.child = n),
									(ht = t),
									(xe = null)))
							: (e = null),
						e === null)
					)
						throw Er(t);
					return (t.lanes = 536870912), null;
				}
				return Td(t, o);
			}
			var a = e.memoizedState;
			if (a !== null) {
				var i = a.dehydrated;
				if ((Wg(t), r))
					if (t.flags & 256) (t.flags &= -257), (t = vS(e, t, n));
					else if (t.memoizedState !== null)
						(t.child = e.child), (t.flags |= 128), (t = null);
					else throw Error(I(558));
				else if (
					(We || Wi(e, t, n, !1), (r = (n & e.childLanes) !== 0), We || r)
				) {
					if (
						((o = he),
						o !== null && ((i = mx(o, n)), i !== 0 && i !== a.retryLane))
					)
						throw ((a.retryLane = i), Ca(e, i), Pt(o, e, i), oh);
					Qd(), (t = vS(e, t, n));
				} else
					(e = a.treeContext),
						(xe = En(i.nextSibling)),
						(ht = t),
						(ne = !0),
						(yr = null),
						(An = !1),
						e !== null && Gx(t, e),
						(t = Td(t, o)),
						(t.flags |= 4096);
				return t;
			}
			return (
				(e = zo(e.child, { mode: o.mode, children: o.children })),
				(e.ref = t.ref),
				(t.child = e),
				(e.return = t),
				e
			);
		}
		function kd(e, t) {
			var n = t.ref;
			if (n === null) e !== null && e.ref !== null && (t.flags |= 4194816);
			else {
				if (typeof n != 'function' && typeof n != 'object') throw Error(I(284));
				(e === null || e.ref !== n) && (t.flags |= 4194816);
			}
		}
		function rb(e, t, n, o, r) {
			return (
				ma(t),
				(n = qb(e, t, n, o, void 0, r)),
				(o = Yb()),
				e !== null && !We
					? (Xb(e, t, r), Fo(e, t, r))
					: (ne && o && jb(t), (t.flags |= 1), gt(e, t, n, r), t.child)
			);
		}
		function yS(e, t, n, o, r, a) {
			return (
				ma(t),
				(t.updateQueue = null),
				(n = $x(t, o, n, r)),
				Wx(e),
				(o = Yb()),
				e !== null && !We
					? (Xb(e, t, a), Fo(e, t, a))
					: (ne && o && jb(t), (t.flags |= 1), gt(e, t, n, a), t.child)
			);
		}
		function CS(e, t, n, o, r) {
			if ((ma(t), t.stateNode === null)) {
				var a = Ei,
					i = n.contextType;
				typeof i == 'object' && i !== null && (a = vt(i)),
					(a = new n(o, a)),
					(t.memoizedState =
						a.state !== null && a.state !== void 0 ? a.state : null),
					(a.updater = nb),
					(t.stateNode = a),
					(a._reactInternals = t),
					(a = t.stateNode),
					(a.props = o),
					(a.state = t.memoizedState),
					(a.refs = {}),
					Pb(t),
					(i = n.contextType),
					(a.context = typeof i == 'object' && i !== null ? vt(i) : Ei),
					(a.state = t.memoizedState),
					(i = n.getDerivedStateFromProps),
					typeof i == 'function' &&
						(ug(t, n, i, o), (a.state = t.memoizedState)),
					typeof n.getDerivedStateFromProps == 'function' ||
						typeof a.getSnapshotBeforeUpdate == 'function' ||
						(typeof a.UNSAFE_componentWillMount != 'function' &&
							typeof a.componentWillMount != 'function') ||
						((i = a.state),
						typeof a.componentWillMount == 'function' && a.componentWillMount(),
						typeof a.UNSAFE_componentWillMount == 'function' &&
							a.UNSAFE_componentWillMount(),
						i !== a.state && nb.enqueueReplaceState(a, a.state, null),
						xl(t, o, a, r),
						Sl(),
						(a.state = t.memoizedState)),
					typeof a.componentDidMount == 'function' && (t.flags |= 4194308),
					(o = !0);
			} else if (e === null) {
				a = t.stateNode;
				var s = t.memoizedProps,
					l = ba(n, s);
				a.props = l;
				var u = a.context,
					d = n.contextType;
				(i = Ei), typeof d == 'object' && d !== null && (i = vt(d));
				var f = n.getDerivedStateFromProps;
				(d =
					typeof f == 'function' ||
					typeof a.getSnapshotBeforeUpdate == 'function'),
					(s = t.pendingProps !== s),
					d ||
						(typeof a.UNSAFE_componentWillReceiveProps != 'function' &&
							typeof a.componentWillReceiveProps != 'function') ||
						((s || u !== i) && mS(t, a, o, i)),
					(lr = !1);
				var c = t.memoizedState;
				(a.state = c),
					xl(t, o, a, r),
					Sl(),
					(u = t.memoizedState),
					s || c !== u || lr
						? (typeof f == 'function' &&
								(ug(t, n, f, o), (u = t.memoizedState)),
							(l = lr || fS(t, n, l, o, c, u, i))
								? (d ||
										(typeof a.UNSAFE_componentWillMount != 'function' &&
											typeof a.componentWillMount != 'function') ||
										(typeof a.componentWillMount == 'function' &&
											a.componentWillMount(),
										typeof a.UNSAFE_componentWillMount == 'function' &&
											a.UNSAFE_componentWillMount()),
									typeof a.componentDidMount == 'function' &&
										(t.flags |= 4194308))
								: (typeof a.componentDidMount == 'function' &&
										(t.flags |= 4194308),
									(t.memoizedProps = o),
									(t.memoizedState = u)),
							(a.props = o),
							(a.state = u),
							(a.context = i),
							(o = l))
						: (typeof a.componentDidMount == 'function' && (t.flags |= 4194308),
							(o = !1));
			} else {
				(a = t.stateNode),
					Qg(e, t),
					(i = t.memoizedProps),
					(d = ba(n, i)),
					(a.props = d),
					(f = t.pendingProps),
					(c = a.context),
					(u = n.contextType),
					(l = Ei),
					typeof u == 'object' && u !== null && (l = vt(u)),
					(s = n.getDerivedStateFromProps),
					(u =
						typeof s == 'function' ||
						typeof a.getSnapshotBeforeUpdate == 'function') ||
						(typeof a.UNSAFE_componentWillReceiveProps != 'function' &&
							typeof a.componentWillReceiveProps != 'function') ||
						((i !== f || c !== l) && mS(t, a, o, l)),
					(lr = !1),
					(c = t.memoizedState),
					(a.state = c),
					xl(t, o, a, r),
					Sl();
				var p = t.memoizedState;
				i !== f ||
				c !== p ||
				lr ||
				(e !== null && e.dependencies !== null && zd(e.dependencies))
					? (typeof s == 'function' && (ug(t, n, s, o), (p = t.memoizedState)),
						(d =
							lr ||
							fS(t, n, d, o, c, p, l) ||
							(e !== null && e.dependencies !== null && zd(e.dependencies)))
							? (u ||
									(typeof a.UNSAFE_componentWillUpdate != 'function' &&
										typeof a.componentWillUpdate != 'function') ||
									(typeof a.componentWillUpdate == 'function' &&
										a.componentWillUpdate(o, p, l),
									typeof a.UNSAFE_componentWillUpdate == 'function' &&
										a.UNSAFE_componentWillUpdate(o, p, l)),
								typeof a.componentDidUpdate == 'function' && (t.flags |= 4),
								typeof a.getSnapshotBeforeUpdate == 'function' &&
									(t.flags |= 1024))
							: (typeof a.componentDidUpdate != 'function' ||
									(i === e.memoizedProps && c === e.memoizedState) ||
									(t.flags |= 4),
								typeof a.getSnapshotBeforeUpdate != 'function' ||
									(i === e.memoizedProps && c === e.memoizedState) ||
									(t.flags |= 1024),
								(t.memoizedProps = o),
								(t.memoizedState = p)),
						(a.props = o),
						(a.state = p),
						(a.context = l),
						(o = d))
					: (typeof a.componentDidUpdate != 'function' ||
							(i === e.memoizedProps && c === e.memoizedState) ||
							(t.flags |= 4),
						typeof a.getSnapshotBeforeUpdate != 'function' ||
							(i === e.memoizedProps && c === e.memoizedState) ||
							(t.flags |= 1024),
						(o = !1));
			}
			return (
				(a = o),
				kd(e, t),
				(o = (t.flags & 128) !== 0),
				a || o
					? ((a = t.stateNode),
						(n =
							o && typeof n.getDerivedStateFromError != 'function'
								? null
								: a.render()),
						(t.flags |= 1),
						e !== null && o
							? ((t.child = pa(t, e.child, null, r)),
								(t.child = pa(t, null, n, r)))
							: gt(e, t, n, r),
						(t.memoizedState = a.state),
						(e = t.child))
					: (e = Fo(e, t, r)),
				e
			);
		}
		function SS(e, t, n, o) {
			return fa(), (t.flags |= 256), gt(e, t, n, o), t.child;
		}
		var dg = {
			dehydrated: null,
			treeContext: null,
			retryLane: 0,
			hydrationErrors: null,
		};
		function fg(e) {
			return { baseLanes: e, cachePool: qx() };
		}
		function mg(e, t, n) {
			return (e = e !== null ? e.childLanes & ~n : 0), t && (e |= tn), e;
		}
		function j2(e, t, n) {
			var o = t.pendingProps,
				r = !1,
				a = (t.flags & 128) !== 0,
				i;
			if (
				((i = a) ||
					(i =
						e !== null && e.memoizedState === null
							? !1
							: (qe.current & 2) !== 0),
				i && ((r = !0), (t.flags &= -129)),
				(i = (t.flags & 32) !== 0),
				(t.flags &= -33),
				e === null)
			) {
				if (ne) {
					if (
						(r ? ur(t) : dr(t),
						(e = xe)
							? ((e = ET(e, An)),
								(e = e !== null && e.data !== '&' ? e : null),
								e !== null &&
									((t.memoizedState = {
										dehydrated: e,
										treeContext: Rr !== null ? { id: lo, overflow: co } : null,
										retryLane: 536870912,
										hydrationErrors: null,
									}),
									(n = Hx(e)),
									(n.return = t),
									(t.child = n),
									(ht = t),
									(xe = null)))
							: (e = null),
						e === null)
					)
						throw Er(t);
					return vb(e) ? (t.lanes = 32) : (t.lanes = 536870912), null;
				}
				var s = o.children;
				return (
					(o = o.fallback),
					r
						? (dr(t),
							(r = t.mode),
							(s = qd({ mode: 'hidden', children: s }, r)),
							(o = la(o, r, n, null)),
							(s.return = t),
							(o.return = t),
							(s.sibling = o),
							(t.child = s),
							(o = t.child),
							(o.memoizedState = fg(n)),
							(o.childLanes = mg(e, i, n)),
							(t.memoizedState = dg),
							pl(null, o))
						: (ur(t), ab(t, s))
				);
			}
			var l = e.memoizedState;
			if (l !== null && ((s = l.dehydrated), s !== null)) {
				if (a)
					t.flags & 256
						? (ur(t), (t.flags &= -257), (t = pg(e, t, n)))
						: t.memoizedState !== null
							? (dr(t), (t.child = e.child), (t.flags |= 128), (t = null))
							: (dr(t),
								(s = o.fallback),
								(r = t.mode),
								(o = qd({ mode: 'visible', children: o.children }, r)),
								(s = la(s, r, n, null)),
								(s.flags |= 2),
								(o.return = t),
								(s.return = t),
								(o.sibling = s),
								(t.child = o),
								pa(t, e.child, null, n),
								(o = t.child),
								(o.memoizedState = fg(n)),
								(o.childLanes = mg(e, i, n)),
								(t.memoizedState = dg),
								(t = pl(null, o)));
				else if ((ur(t), vb(s))) {
					if (((i = s.nextSibling && s.nextSibling.dataset), i)) var u = i.dgst;
					(i = u),
						(o = Error(I(419))),
						(o.stack = ''),
						(o.digest = i),
						Bl({ value: o, source: null, stack: null }),
						(t = pg(e, t, n));
				} else if (
					(We || Wi(e, t, n, !1), (i = (n & e.childLanes) !== 0), We || i)
				) {
					if (
						((i = he),
						i !== null && ((o = mx(i, n)), o !== 0 && o !== l.retryLane))
					)
						throw ((l.retryLane = o), Ca(e, o), Pt(i, e, o), oh);
					hb(s) || Qd(), (t = pg(e, t, n));
				} else
					hb(s)
						? ((t.flags |= 192), (t.child = e.child), (t = null))
						: ((e = l.treeContext),
							(xe = En(s.nextSibling)),
							(ht = t),
							(ne = !0),
							(yr = null),
							(An = !1),
							e !== null && Gx(t, e),
							(t = ab(t, o.children)),
							(t.flags |= 4096));
				return t;
			}
			return r
				? (dr(t),
					(s = o.fallback),
					(r = t.mode),
					(l = e.child),
					(u = l.sibling),
					(o = zo(l, { mode: 'hidden', children: o.children })),
					(o.subtreeFlags = l.subtreeFlags & 65011712),
					u !== null
						? (s = zo(u, s))
						: ((s = la(s, r, n, null)), (s.flags |= 2)),
					(s.return = t),
					(o.return = t),
					(o.sibling = s),
					(t.child = o),
					pl(null, o),
					(o = t.child),
					(s = e.child.memoizedState),
					s === null
						? (s = fg(n))
						: ((r = s.cachePool),
							r !== null
								? ((l = Je._currentValue),
									(r = r.parent !== l ? { parent: l, pool: l } : r))
								: (r = qx()),
							(s = { baseLanes: s.baseLanes | n, cachePool: r })),
					(o.memoizedState = s),
					(o.childLanes = mg(e, i, n)),
					(t.memoizedState = dg),
					pl(e.child, o))
				: (ur(t),
					(n = e.child),
					(e = n.sibling),
					(n = zo(n, { mode: 'visible', children: o.children })),
					(n.return = t),
					(n.sibling = null),
					e !== null &&
						((i = t.deletions),
						i === null ? ((t.deletions = [e]), (t.flags |= 16)) : i.push(e)),
					(t.child = n),
					(t.memoizedState = null),
					n);
		}
		function ab(e, t) {
			return (
				(t = qd({ mode: 'visible', children: t }, e.mode)),
				(t.return = e),
				(e.child = t)
			);
		}
		function qd(e, t) {
			return (e = en(22, e, null, t)), (e.lanes = 0), e;
		}
		function pg(e, t, n) {
			return (
				pa(t, e.child, null, n),
				(e = ab(t, t.pendingProps.children)),
				(e.flags |= 2),
				(t.memoizedState = null),
				e
			);
		}
		function xS(e, t, n) {
			e.lanes |= t;
			var o = e.alternate;
			o !== null && (o.lanes |= t), Yg(e.return, t, n);
		}
		function gg(e, t, n, o, r, a) {
			var i = e.memoizedState;
			i === null
				? (e.memoizedState = {
						isBackwards: t,
						rendering: null,
						renderingStartTime: 0,
						last: o,
						tail: n,
						tailMode: r,
						treeForkCount: a,
					})
				: ((i.isBackwards = t),
					(i.rendering = null),
					(i.renderingStartTime = 0),
					(i.last = o),
					(i.tail = n),
					(i.tailMode = r),
					(i.treeForkCount = a));
		}
		function z2(e, t, n) {
			var o = t.pendingProps,
				r = o.revealOrder,
				a = o.tail;
			o = o.children;
			var i = qe.current,
				s = (i & 2) !== 0;
			if (
				(s ? ((i = (i & 1) | 2), (t.flags |= 128)) : (i &= 1),
				ye(qe, i),
				gt(e, t, o, n),
				(o = ne ? Ol : 0),
				!s && e !== null && (e.flags & 128) !== 0)
			)
				e: for (e = t.child; e !== null; ) {
					if (e.tag === 13) e.memoizedState !== null && xS(e, n, t);
					else if (e.tag === 19) xS(e, n, t);
					else if (e.child !== null) {
						(e.child.return = e), (e = e.child);
						continue;
					}
					if (e === t) break e;
					for (; e.sibling === null; ) {
						if (e.return === null || e.return === t) break e;
						e = e.return;
					}
					(e.sibling.return = e.return), (e = e.sibling);
				}
			switch (r) {
				case 'forwards':
					for (n = t.child, r = null; n !== null; )
						(e = n.alternate),
							e !== null && Hd(e) === null && (r = n),
							(n = n.sibling);
					(n = r),
						n === null
							? ((r = t.child), (t.child = null))
							: ((r = n.sibling), (n.sibling = null)),
						gg(t, !1, r, n, a, o);
					break;
				case 'backwards':
				case 'unstable_legacy-backwards':
					for (n = null, r = t.child, t.child = null; r !== null; ) {
						if (((e = r.alternate), e !== null && Hd(e) === null)) {
							t.child = r;
							break;
						}
						(e = r.sibling), (r.sibling = n), (n = r), (r = e);
					}
					gg(t, !0, n, null, a, o);
					break;
				case 'together':
					gg(t, !1, null, null, void 0, o);
					break;
				default:
					t.memoizedState = null;
			}
			return t.child;
		}
		function Fo(e, t, n) {
			if (
				(e !== null && (t.dependencies = e.dependencies),
				(Nr |= t.lanes),
				(n & t.childLanes) === 0)
			)
				if (e !== null) {
					if ((Wi(e, t, n, !1), (n & t.childLanes) === 0)) return null;
				} else return null;
			if (e !== null && t.child !== e.child) throw Error(I(153));
			if (t.child !== null) {
				for (
					e = t.child, n = zo(e, e.pendingProps), t.child = n, n.return = t;
					e.sibling !== null;
				)
					(e = e.sibling),
						(n = n.sibling = zo(e, e.pendingProps)),
						(n.return = t);
				n.sibling = null;
			}
			return t.child;
		}
		function rh(e, t) {
			return (e.lanes & t) !== 0
				? !0
				: ((e = e.dependencies), !!(e !== null && zd(e)));
		}
		function w3(e, t, n) {
			switch (t.tag) {
				case 3:
					Ld(t, t.stateNode.containerInfo),
						cr(t, Je, e.memoizedState.cache),
						fa();
					break;
				case 27:
				case 5:
					Og(t);
					break;
				case 4:
					Ld(t, t.stateNode.containerInfo);
					break;
				case 10:
					cr(t, t.type, t.memoizedProps.value);
					break;
				case 31:
					if (t.memoizedState !== null) return (t.flags |= 128), Wg(t), null;
					break;
				case 13:
					var o = t.memoizedState;
					if (o !== null)
						return o.dehydrated !== null
							? (ur(t), (t.flags |= 128), null)
							: (n & t.child.childLanes) !== 0
								? j2(e, t, n)
								: (ur(t), (e = Fo(e, t, n)), e !== null ? e.sibling : null);
					ur(t);
					break;
				case 19:
					var r = (e.flags & 128) !== 0;
					if (
						((o = (n & t.childLanes) !== 0),
						o || (Wi(e, t, n, !1), (o = (n & t.childLanes) !== 0)),
						r)
					) {
						if (o) return z2(e, t, n);
						t.flags |= 128;
					}
					if (
						((r = t.memoizedState),
						r !== null &&
							((r.rendering = null), (r.tail = null), (r.lastEffect = null)),
						ye(qe, qe.current),
						o)
					)
						break;
					return null;
				case 22:
					return (t.lanes = 0), M2(e, t, n, t.pendingProps);
				case 24:
					cr(t, Je, e.memoizedState.cache);
			}
			return Fo(e, t, n);
		}
		function V2(e, t, n) {
			if (e !== null)
				if (e.memoizedProps !== t.pendingProps) We = !0;
				else {
					if (!rh(e, n) && (t.flags & 128) === 0) return (We = !1), w3(e, t, n);
					We = (e.flags & 131072) !== 0;
				}
			else (We = !1), ne && (t.flags & 1048576) !== 0 && Px(t, Ol, t.index);
			switch (((t.lanes = 0), t.tag)) {
				case 16:
					e: {
						var o = t.pendingProps;
						if (((e = aa(t.elementType)), (t.type = e), typeof e == 'function'))
							Mb(e)
								? ((o = ba(e, o)), (t.tag = 1), (t = CS(null, t, e, o, n)))
								: ((t.tag = 0), (t = rb(null, t, e, o, n)));
						else {
							if (e != null) {
								var r = e.$$typeof;
								if (r === xb) {
									(t.tag = 11), (t = gS(null, t, e, o, n));
									break e;
								} else if (r === Tb) {
									(t.tag = 14), (t = bS(null, t, e, o, n));
									break e;
								}
							}
							throw ((t = Lg(e) || e), Error(I(306, t, '')));
						}
					}
					return t;
				case 0:
					return rb(e, t, t.type, t.pendingProps, n);
				case 1:
					return (o = t.type), (r = ba(o, t.pendingProps)), CS(e, t, o, r, n);
				case 3:
					e: {
						if ((Ld(t, t.stateNode.containerInfo), e === null))
							throw Error(I(387));
						o = t.pendingProps;
						var a = t.memoizedState;
						(r = a.element), Qg(e, t), xl(t, o, null, n);
						var i = t.memoizedState;
						if (
							((o = i.cache),
							cr(t, Je, o),
							o !== a.cache && Xg(t, [Je], n, !0),
							Sl(),
							(o = i.element),
							a.isDehydrated)
						)
							if (
								((a = { element: o, isDehydrated: !1, cache: i.cache }),
								(t.updateQueue.baseState = a),
								(t.memoizedState = a),
								t.flags & 256)
							) {
								t = SS(e, t, o, n);
								break e;
							} else if (o !== r) {
								(r = wn(Error(I(424)), t)), Bl(r), (t = SS(e, t, o, n));
								break e;
							} else
								for (
									e = t.stateNode.containerInfo,
										e.nodeType === 9
											? (e = e.body)
											: (e = e.nodeName === 'HTML' ? e.ownerDocument.body : e),
										xe = En(e.firstChild),
										ht = t,
										ne = !0,
										yr = null,
										An = !0,
										n = Kx(t, null, o, n),
										t.child = n;
									n;
								)
									(n.flags = (n.flags & -3) | 4096), (n = n.sibling);
						else {
							if ((fa(), o === r)) {
								t = Fo(e, t, n);
								break e;
							}
							gt(e, t, o, n);
						}
						t = t.child;
					}
					return t;
				case 26:
					return (
						kd(e, t),
						e === null
							? (n = FS(t.type, null, t.pendingProps, null))
								? (t.memoizedState = n)
								: ne ||
									((n = t.type),
									(e = t.pendingProps),
									(o = $d(vr.current).createElement(n)),
									(o[bt] = t),
									(o[Gt] = e),
									yt(o, n, e),
									ct(o),
									(t.stateNode = o))
							: (t.memoizedState = FS(
									t.type,
									e.memoizedProps,
									t.pendingProps,
									e.memoizedState
								)),
						null
					);
				case 27:
					return (
						Og(t),
						e === null &&
							ne &&
							((o = t.stateNode = IT(t.type, t.pendingProps, vr.current)),
							(ht = t),
							(An = !0),
							(r = xe),
							_r(t.type) ? ((yb = r), (xe = En(o.firstChild))) : (xe = r)),
						gt(e, t, t.pendingProps.children, n),
						kd(e, t),
						e === null && (t.flags |= 4194304),
						t.child
					);
				case 5:
					return (
						e === null &&
							ne &&
							((r = o = xe) &&
								((o = $3(o, t.type, t.pendingProps, An)),
								o !== null
									? ((t.stateNode = o),
										(ht = t),
										(xe = En(o.firstChild)),
										(An = !1),
										(r = !0))
									: (r = !1)),
							r || Er(t)),
						Og(t),
						(r = t.type),
						(a = t.pendingProps),
						(i = e !== null ? e.memoizedProps : null),
						(o = a.children),
						gb(r, a) ? (o = null) : i !== null && gb(r, i) && (t.flags |= 32),
						t.memoizedState !== null &&
							((r = qb(e, t, b3, null, null, n)), (Ul._currentValue = r)),
						kd(e, t),
						gt(e, t, o, n),
						t.child
					);
				case 6:
					return (
						e === null &&
							ne &&
							((e = n = xe) &&
								((n = eN(n, t.pendingProps, An)),
								n !== null
									? ((t.stateNode = n), (ht = t), (xe = null), (e = !0))
									: (e = !1)),
							e || Er(t)),
						null
					);
				case 13:
					return j2(e, t, n);
				case 4:
					return (
						Ld(t, t.stateNode.containerInfo),
						(o = t.pendingProps),
						e === null ? (t.child = pa(t, null, o, n)) : gt(e, t, o, n),
						t.child
					);
				case 11:
					return gS(e, t, t.type, t.pendingProps, n);
				case 7:
					return gt(e, t, t.pendingProps, n), t.child;
				case 8:
					return gt(e, t, t.pendingProps.children, n), t.child;
				case 12:
					return gt(e, t, t.pendingProps.children, n), t.child;
				case 10:
					return (
						(o = t.pendingProps),
						cr(t, t.type, o.value),
						gt(e, t, o.children, n),
						t.child
					);
				case 9:
					return (
						(r = t.type._context),
						(o = t.pendingProps.children),
						ma(t),
						(r = vt(r)),
						(o = o(r)),
						(t.flags |= 1),
						gt(e, t, o, n),
						t.child
					);
				case 14:
					return bS(e, t, t.type, t.pendingProps, n);
				case 15:
					return D2(e, t, t.type, t.pendingProps, n);
				case 19:
					return z2(e, t, n);
				case 31:
					return k3(e, t, n);
				case 22:
					return M2(e, t, n, t.pendingProps);
				case 24:
					return (
						ma(t),
						(o = vt(Je)),
						e === null
							? ((r = Ub()),
								r === null &&
									((r = he),
									(a = Vb()),
									(r.pooledCache = a),
									a.refCount++,
									a !== null && (r.pooledCacheLanes |= n),
									(r = a)),
								(t.memoizedState = { parent: o, cache: r }),
								Pb(t),
								cr(t, Je, r))
							: ((e.lanes & n) !== 0 && (Qg(e, t), xl(t, null, null, n), Sl()),
								(r = e.memoizedState),
								(a = t.memoizedState),
								r.parent !== o
									? ((r = { parent: o, cache: o }),
										(t.memoizedState = r),
										t.lanes === 0 &&
											(t.memoizedState = t.updateQueue.baseState = r),
										cr(t, Je, o))
									: ((o = a.cache),
										cr(t, Je, o),
										o !== r.cache && Xg(t, [Je], n, !0))),
						gt(e, t, t.pendingProps.children, n),
						t.child
					);
				case 29:
					throw t.pendingProps;
			}
			throw Error(I(156, t.tag));
		}
		function Io(e) {
			e.flags |= 4;
		}
		function bg(e, t, n, o, r) {
			if (((t = (e.mode & 32) !== 0) && (t = !1), t)) {
				if (((e.flags |= 16777216), (r & 335544128) === r))
					if (e.stateNode.complete) e.flags |= 8192;
					else if (cT()) e.flags |= 8192;
					else throw ((ua = Vd), Hb);
			} else e.flags &= -16777217;
		}
		function TS(e, t) {
			if (t.type !== 'stylesheet' || (t.state.loading & 4) !== 0)
				e.flags &= -16777217;
			else if (((e.flags |= 16777216), !_T(t)))
				if (cT()) e.flags |= 8192;
				else throw ((ua = Vd), Hb);
		}
		function ld(e, t) {
			t !== null && (e.flags |= 4),
				e.flags & 16384 &&
					((t = e.tag !== 22 ? ux() : 536870912), (e.lanes |= t), (qi |= t));
		}
		function sl(e, t) {
			if (!ne)
				switch (e.tailMode) {
					case 'hidden':
						t = e.tail;
						for (var n = null; t !== null; )
							t.alternate !== null && (n = t), (t = t.sibling);
						n === null ? (e.tail = null) : (n.sibling = null);
						break;
					case 'collapsed':
						n = e.tail;
						for (var o = null; n !== null; )
							n.alternate !== null && (o = n), (n = n.sibling);
						o === null
							? t || e.tail === null
								? (e.tail = null)
								: (e.tail.sibling = null)
							: (o.sibling = null);
				}
		}
		function Se(e) {
			var t = e.alternate !== null && e.alternate.child === e.child,
				n = 0,
				o = 0;
			if (t)
				for (var r = e.child; r !== null; )
					(n |= r.lanes | r.childLanes),
						(o |= r.subtreeFlags & 65011712),
						(o |= r.flags & 65011712),
						(r.return = e),
						(r = r.sibling);
			else
				for (r = e.child; r !== null; )
					(n |= r.lanes | r.childLanes),
						(o |= r.subtreeFlags),
						(o |= r.flags),
						(r.return = e),
						(r = r.sibling);
			return (e.subtreeFlags |= o), (e.childLanes = n), t;
		}
		function A3(e, t, n) {
			var o = t.pendingProps;
			switch ((zb(t), t.tag)) {
				case 16:
				case 15:
				case 0:
				case 11:
				case 7:
				case 8:
				case 12:
				case 9:
				case 14:
					return Se(t), null;
				case 1:
					return Se(t), null;
				case 3:
					return (
						(n = t.stateNode),
						(o = null),
						e !== null && (o = e.memoizedState.cache),
						t.memoizedState.cache !== o && (t.flags |= 2048),
						Vo(Je),
						Vi(),
						n.pendingContext &&
							((n.context = n.pendingContext), (n.pendingContext = null)),
						(e === null || e.child === null) &&
							(bi(t)
								? Io(t)
								: e === null ||
									(e.memoizedState.isDehydrated && (t.flags & 256) === 0) ||
									((t.flags |= 1024), sg())),
						Se(t),
						null
					);
				case 26:
					var r = t.type,
						a = t.memoizedState;
					return (
						e === null
							? (Io(t),
								a !== null ? (Se(t), TS(t, a)) : (Se(t), bg(t, r, null, o, n)))
							: a
								? a !== e.memoizedState
									? (Io(t), Se(t), TS(t, a))
									: (Se(t), (t.flags &= -16777217))
								: ((e = e.memoizedProps),
									e !== o && Io(t),
									Se(t),
									bg(t, r, e, o, n)),
						null
					);
				case 27:
					if (
						(_d(t),
						(n = vr.current),
						(r = t.type),
						e !== null && t.stateNode != null)
					)
						e.memoizedProps !== o && Io(t);
					else {
						if (!o) {
							if (t.stateNode === null) throw Error(I(166));
							return Se(t), null;
						}
						(e = fo.current),
							bi(t) ? W5(t, e) : ((e = IT(r, o, n)), (t.stateNode = e), Io(t));
					}
					return Se(t), null;
				case 5:
					if ((_d(t), (r = t.type), e !== null && t.stateNode != null))
						e.memoizedProps !== o && Io(t);
					else {
						if (!o) {
							if (t.stateNode === null) throw Error(I(166));
							return Se(t), null;
						}
						if (((a = fo.current), bi(t))) W5(t, a);
						else {
							var i = $d(vr.current);
							switch (a) {
								case 1:
									a = i.createElementNS('http://www.w3.org/2000/svg', r);
									break;
								case 2:
									a = i.createElementNS(
										'http://www.w3.org/1998/Math/MathML',
										r
									);
									break;
								default:
									switch (r) {
										case 'svg':
											a = i.createElementNS('http://www.w3.org/2000/svg', r);
											break;
										case 'math':
											a = i.createElementNS(
												'http://www.w3.org/1998/Math/MathML',
												r
											);
											break;
										case 'script':
											(a = i.createElement('div')),
												(a.innerHTML = '<script><\/script>'),
												(a = a.removeChild(a.firstChild));
											break;
										case 'select':
											(a =
												typeof o.is == 'string'
													? i.createElement('select', { is: o.is })
													: i.createElement('select')),
												o.multiple
													? (a.multiple = !0)
													: o.size && (a.size = o.size);
											break;
										default:
											a =
												typeof o.is == 'string'
													? i.createElement(r, { is: o.is })
													: i.createElement(r);
									}
							}
							(a[bt] = t), (a[Gt] = o);
							e: for (i = t.child; i !== null; ) {
								if (i.tag === 5 || i.tag === 6) a.appendChild(i.stateNode);
								else if (i.tag !== 4 && i.tag !== 27 && i.child !== null) {
									(i.child.return = i), (i = i.child);
									continue;
								}
								if (i === t) break e;
								for (; i.sibling === null; ) {
									if (i.return === null || i.return === t) break e;
									i = i.return;
								}
								(i.sibling.return = i.return), (i = i.sibling);
							}
							t.stateNode = a;
							e: switch ((yt(a, r, o), r)) {
								case 'button':
								case 'input':
								case 'select':
								case 'textarea':
									o = !!o.autoFocus;
									break e;
								case 'img':
									o = !0;
									break e;
								default:
									o = !1;
							}
							o && Io(t);
						}
					}
					return (
						Se(t),
						bg(
							t,
							t.type,
							e === null ? null : e.memoizedProps,
							t.pendingProps,
							n
						),
						null
					);
				case 6:
					if (e && t.stateNode != null) e.memoizedProps !== o && Io(t);
					else {
						if (typeof o != 'string' && t.stateNode === null)
							throw Error(I(166));
						if (((e = vr.current), bi(t))) {
							if (
								((e = t.stateNode),
								(n = t.memoizedProps),
								(o = null),
								(r = ht),
								r !== null)
							)
								switch (r.tag) {
									case 27:
									case 5:
										o = r.memoizedProps;
								}
							(e[bt] = t),
								(e = !!(
									e.nodeValue === n ||
									(o !== null && o.suppressHydrationWarning === !0) ||
									wT(e.nodeValue, n)
								)),
								e || Er(t, !0);
						} else
							(e = $d(e).createTextNode(o)), (e[bt] = t), (t.stateNode = e);
					}
					return Se(t), null;
				case 31:
					if (((n = t.memoizedState), e === null || e.memoizedState !== null)) {
						if (((o = bi(t)), n !== null)) {
							if (e === null) {
								if (!o) throw Error(I(318));
								if (
									((e = t.memoizedState),
									(e = e !== null ? e.dehydrated : null),
									!e)
								)
									throw Error(I(557));
								e[bt] = t;
							} else
								fa(),
									(t.flags & 128) === 0 && (t.memoizedState = null),
									(t.flags |= 4);
							Se(t), (e = !1);
						} else
							(n = sg()),
								e !== null &&
									e.memoizedState !== null &&
									(e.memoizedState.hydrationErrors = n),
								(e = !0);
						if (!e) return t.flags & 256 ? ($t(t), t) : ($t(t), null);
						if ((t.flags & 128) !== 0) throw Error(I(558));
					}
					return Se(t), null;
				case 13:
					if (
						((o = t.memoizedState),
						e === null ||
							(e.memoizedState !== null && e.memoizedState.dehydrated !== null))
					) {
						if (((r = bi(t)), o !== null && o.dehydrated !== null)) {
							if (e === null) {
								if (!r) throw Error(I(318));
								if (
									((r = t.memoizedState),
									(r = r !== null ? r.dehydrated : null),
									!r)
								)
									throw Error(I(317));
								r[bt] = t;
							} else
								fa(),
									(t.flags & 128) === 0 && (t.memoizedState = null),
									(t.flags |= 4);
							Se(t), (r = !1);
						} else
							(r = sg()),
								e !== null &&
									e.memoizedState !== null &&
									(e.memoizedState.hydrationErrors = r),
								(r = !0);
						if (!r) return t.flags & 256 ? ($t(t), t) : ($t(t), null);
					}
					return (
						$t(t),
						(t.flags & 128) !== 0
							? ((t.lanes = n), t)
							: ((n = o !== null),
								(e = e !== null && e.memoizedState !== null),
								n &&
									((o = t.child),
									(r = null),
									o.alternate !== null &&
										o.alternate.memoizedState !== null &&
										o.alternate.memoizedState.cachePool !== null &&
										(r = o.alternate.memoizedState.cachePool.pool),
									(a = null),
									o.memoizedState !== null &&
										o.memoizedState.cachePool !== null &&
										(a = o.memoizedState.cachePool.pool),
									a !== r && (o.flags |= 2048)),
								n !== e && n && (t.child.flags |= 8192),
								ld(t, t.updateQueue),
								Se(t),
								null)
					);
				case 4:
					return Vi(), e === null && dh(t.stateNode.containerInfo), Se(t), null;
				case 10:
					return Vo(t.type), Se(t), null;
				case 19:
					if ((ut(qe), (o = t.memoizedState), o === null)) return Se(t), null;
					if (((r = (t.flags & 128) !== 0), (a = o.rendering), a === null))
						if (r) sl(o, !1);
						else {
							if (Oe !== 0 || (e !== null && (e.flags & 128) !== 0))
								for (e = t.child; e !== null; ) {
									if (((a = Hd(e)), a !== null)) {
										for (
											t.flags |= 128,
												sl(o, !1),
												e = a.updateQueue,
												t.updateQueue = e,
												ld(t, e),
												t.subtreeFlags = 0,
												e = n,
												n = t.child;
											n !== null;
										)
											Ux(n, e), (n = n.sibling);
										return (
											ye(qe, (qe.current & 1) | 2),
											ne && Oo(t, o.treeForkCount),
											t.child
										);
									}
									e = e.sibling;
								}
							o.tail !== null &&
								nn() > Xd &&
								((t.flags |= 128), (r = !0), sl(o, !1), (t.lanes = 4194304));
						}
					else {
						if (!r)
							if (((e = Hd(a)), e !== null)) {
								if (
									((t.flags |= 128),
									(r = !0),
									(e = e.updateQueue),
									(t.updateQueue = e),
									ld(t, e),
									sl(o, !0),
									o.tail === null &&
										o.tailMode === 'hidden' &&
										!a.alternate &&
										!ne)
								)
									return Se(t), null;
							} else
								2 * nn() - o.renderingStartTime > Xd &&
									n !== 536870912 &&
									((t.flags |= 128), (r = !0), sl(o, !1), (t.lanes = 4194304));
						o.isBackwards
							? ((a.sibling = t.child), (t.child = a))
							: ((e = o.last),
								e !== null ? (e.sibling = a) : (t.child = a),
								(o.last = a));
					}
					return o.tail !== null
						? ((e = o.tail),
							(o.rendering = e),
							(o.tail = e.sibling),
							(o.renderingStartTime = nn()),
							(e.sibling = null),
							(n = qe.current),
							ye(qe, r ? (n & 1) | 2 : n & 1),
							ne && Oo(t, o.treeForkCount),
							e)
						: (Se(t), null);
				case 22:
				case 23:
					return (
						$t(t),
						Gb(),
						(o = t.memoizedState !== null),
						e !== null
							? (e.memoizedState !== null) !== o && (t.flags |= 8192)
							: o && (t.flags |= 8192),
						o
							? (n & 536870912) !== 0 &&
								(t.flags & 128) === 0 &&
								(Se(t), t.subtreeFlags & 6 && (t.flags |= 8192))
							: Se(t),
						(n = t.updateQueue),
						n !== null && ld(t, n.retryQueue),
						(n = null),
						e !== null &&
							e.memoizedState !== null &&
							e.memoizedState.cachePool !== null &&
							(n = e.memoizedState.cachePool.pool),
						(o = null),
						t.memoizedState !== null &&
							t.memoizedState.cachePool !== null &&
							(o = t.memoizedState.cachePool.pool),
						o !== n && (t.flags |= 2048),
						e !== null && ut(ca),
						null
					);
				case 24:
					return (
						(n = null),
						e !== null && (n = e.memoizedState.cache),
						t.memoizedState.cache !== n && (t.flags |= 2048),
						Vo(Je),
						Se(t),
						null
					);
				case 25:
					return null;
				case 30:
					return null;
			}
			throw Error(I(156, t.tag));
		}
		function R3(e, t) {
			switch ((zb(t), t.tag)) {
				case 1:
					return (
						(e = t.flags),
						e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null
					);
				case 3:
					return (
						Vo(Je),
						Vi(),
						(e = t.flags),
						(e & 65536) !== 0 && (e & 128) === 0
							? ((t.flags = (e & -65537) | 128), t)
							: null
					);
				case 26:
				case 27:
				case 5:
					return _d(t), null;
				case 31:
					if (t.memoizedState !== null) {
						if (($t(t), t.alternate === null)) throw Error(I(340));
						fa();
					}
					return (
						(e = t.flags),
						e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null
					);
				case 13:
					if (
						($t(t), (e = t.memoizedState), e !== null && e.dehydrated !== null)
					) {
						if (t.alternate === null) throw Error(I(340));
						fa();
					}
					return (
						(e = t.flags),
						e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null
					);
				case 19:
					return ut(qe), null;
				case 4:
					return Vi(), null;
				case 10:
					return Vo(t.type), null;
				case 22:
				case 23:
					return (
						$t(t),
						Gb(),
						e !== null && ut(ca),
						(e = t.flags),
						e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null
					);
				case 24:
					return Vo(Je), null;
				case 25:
					return null;
				default:
					return null;
			}
		}
		function U2(e, t) {
			switch ((zb(t), t.tag)) {
				case 3:
					Vo(Je), Vi();
					break;
				case 26:
				case 27:
				case 5:
					_d(t);
					break;
				case 4:
					Vi();
					break;
				case 31:
					t.memoizedState !== null && $t(t);
					break;
				case 13:
					$t(t);
					break;
				case 19:
					ut(qe);
					break;
				case 10:
					Vo(t.type);
					break;
				case 22:
				case 23:
					$t(t), Gb(), e !== null && ut(ca);
					break;
				case 24:
					Vo(Je);
			}
		}
		function Jl(e, t) {
			try {
				var n = t.updateQueue,
					o = n !== null ? n.lastEffect : null;
				if (o !== null) {
					var r = o.next;
					n = r;
					do {
						if ((n.tag & e) === e) {
							o = void 0;
							var a = n.create,
								i = n.inst;
							(o = a()), (i.destroy = o);
						}
						n = n.next;
					} while (n !== r);
				}
			} catch (s) {
				ue(t, t.return, s);
			}
		}
		function Ir(e, t, n) {
			try {
				var o = t.updateQueue,
					r = o !== null ? o.lastEffect : null;
				if (r !== null) {
					var a = r.next;
					o = a;
					do {
						if ((o.tag & e) === e) {
							var i = o.inst,
								s = i.destroy;
							if (s !== void 0) {
								(i.destroy = void 0), (r = t);
								var l = n,
									u = s;
								try {
									u();
								} catch (d) {
									ue(r, l, d);
								}
							}
						}
						o = o.next;
					} while (o !== a);
				}
			} catch (d) {
				ue(t, t.return, d);
			}
		}
		function H2(e) {
			var t = e.updateQueue;
			if (t !== null) {
				var n = e.stateNode;
				try {
					Zx(t, n);
				} catch (o) {
					ue(e, e.return, o);
				}
			}
		}
		function P2(e, t, n) {
			(n.props = ba(e.type, e.memoizedProps)), (n.state = e.memoizedState);
			try {
				n.componentWillUnmount();
			} catch (o) {
				ue(e, t, o);
			}
		}
		function kl(e, t) {
			try {
				var n = e.ref;
				if (n !== null) {
					switch (e.tag) {
						case 26:
						case 27:
						case 5:
							var o = e.stateNode;
							break;
						case 30:
							o = e.stateNode;
							break;
						default:
							o = e.stateNode;
					}
					typeof n == 'function' ? (e.refCleanup = n(o)) : (n.current = o);
				}
			} catch (r) {
				ue(e, t, r);
			}
		}
		function uo(e, t) {
			var n = e.ref,
				o = e.refCleanup;
			if (n !== null)
				if (typeof o == 'function')
					try {
						o();
					} catch (r) {
						ue(e, t, r);
					} finally {
						(e.refCleanup = null),
							(e = e.alternate),
							e != null && (e.refCleanup = null);
					}
				else if (typeof n == 'function')
					try {
						n(null);
					} catch (r) {
						ue(e, t, r);
					}
				else n.current = null;
		}
		function G2(e) {
			var t = e.type,
				n = e.memoizedProps,
				o = e.stateNode;
			try {
				e: switch (t) {
					case 'button':
					case 'input':
					case 'select':
					case 'textarea':
						n.autoFocus && o.focus();
						break e;
					case 'img':
						n.src ? (o.src = n.src) : n.srcSet && (o.srcset = n.srcSet);
				}
			} catch (r) {
				ue(e, e.return, r);
			}
		}
		function hg(e, t, n) {
			try {
				var o = e.stateNode;
				X3(o, e.type, n, t), (o[Gt] = t);
			} catch (r) {
				ue(e, e.return, r);
			}
		}
		function F2(e) {
			return (
				e.tag === 5 ||
				e.tag === 3 ||
				e.tag === 26 ||
				(e.tag === 27 && _r(e.type)) ||
				e.tag === 4
			);
		}
		function vg(e) {
			e: for (;;) {
				for (; e.sibling === null; ) {
					if (e.return === null || F2(e.return)) return null;
					e = e.return;
				}
				for (
					e.sibling.return = e.return, e = e.sibling;
					e.tag !== 5 && e.tag !== 6 && e.tag !== 18;
				) {
					if (
						(e.tag === 27 && _r(e.type)) ||
						e.flags & 2 ||
						e.child === null ||
						e.tag === 4
					)
						continue e;
					(e.child.return = e), (e = e.child);
				}
				if (!(e.flags & 2)) return e.stateNode;
			}
		}
		function ib(e, t, n) {
			var o = e.tag;
			if (o === 5 || o === 6)
				(e = e.stateNode),
					t
						? (n.nodeType === 9
								? n.body
								: n.nodeName === 'HTML'
									? n.ownerDocument.body
									: n
							).insertBefore(e, t)
						: ((t =
								n.nodeType === 9
									? n.body
									: n.nodeName === 'HTML'
										? n.ownerDocument.body
										: n),
							t.appendChild(e),
							(n = n._reactRootContainer),
							n != null || t.onclick !== null || (t.onclick = Mo));
			else if (
				o !== 4 &&
				(o === 27 && _r(e.type) && ((n = e.stateNode), (t = null)),
				(e = e.child),
				e !== null)
			)
				for (ib(e, t, n), e = e.sibling; e !== null; )
					ib(e, t, n), (e = e.sibling);
		}
		function Yd(e, t, n) {
			var o = e.tag;
			if (o === 5 || o === 6)
				(e = e.stateNode), t ? n.insertBefore(e, t) : n.appendChild(e);
			else if (
				o !== 4 &&
				(o === 27 && _r(e.type) && (n = e.stateNode), (e = e.child), e !== null)
			)
				for (Yd(e, t, n), e = e.sibling; e !== null; )
					Yd(e, t, n), (e = e.sibling);
		}
		function q2(e) {
			var t = e.stateNode,
				n = e.memoizedProps;
			try {
				for (var o = e.type, r = t.attributes; r.length; )
					t.removeAttributeNode(r[0]);
				yt(t, o, n), (t[bt] = e), (t[Gt] = n);
			} catch (a) {
				ue(e, e.return, a);
			}
		}
		var Bo = !1,
			Ze = !1,
			yg = !1,
			kS = typeof WeakSet == 'function' ? WeakSet : Set,
			lt = null;
		function E3(e, t) {
			if (((e = e.containerInfo), (mb = of), (e = _x(e)), Ob(e))) {
				if ('selectionStart' in e)
					var n = { start: e.selectionStart, end: e.selectionEnd };
				else
					e: {
						n = ((n = e.ownerDocument) && n.defaultView) || window;
						var o = n.getSelection && n.getSelection();
						if (o && o.rangeCount !== 0) {
							n = o.anchorNode;
							var r = o.anchorOffset,
								a = o.focusNode;
							o = o.focusOffset;
							try {
								n.nodeType, a.nodeType;
							} catch {
								n = null;
								break e;
							}
							var i = 0,
								s = -1,
								l = -1,
								u = 0,
								d = 0,
								f = e,
								c = null;
							t: for (;;) {
								for (
									var p;
									f !== n || (r !== 0 && f.nodeType !== 3) || (s = i + r),
										f !== a || (o !== 0 && f.nodeType !== 3) || (l = i + o),
										f.nodeType === 3 && (i += f.nodeValue.length),
										(p = f.firstChild) !== null;
								)
									(c = f), (f = p);
								for (;;) {
									if (f === e) break t;
									if (
										(c === n && ++u === r && (s = i),
										c === a && ++d === o && (l = i),
										(p = f.nextSibling) !== null)
									)
										break;
									(f = c), (c = f.parentNode);
								}
								f = p;
							}
							n = s === -1 || l === -1 ? null : { start: s, end: l };
						} else n = null;
					}
				n = n || { start: 0, end: 0 };
			} else n = null;
			for (
				pb = { focusedElem: e, selectionRange: n }, of = !1, lt = t;
				lt !== null;
			)
				if (
					((t = lt), (e = t.child), (t.subtreeFlags & 1028) !== 0 && e !== null)
				)
					(e.return = t), (lt = e);
				else
					for (; lt !== null; ) {
						switch (((t = lt), (a = t.alternate), (e = t.flags), t.tag)) {
							case 0:
								if (
									(e & 4) !== 0 &&
									((e = t.updateQueue),
									(e = e !== null ? e.events : null),
									e !== null)
								)
									for (n = 0; n < e.length; n++)
										(r = e[n]), (r.ref.impl = r.nextImpl);
								break;
							case 11:
							case 15:
								break;
							case 1:
								if ((e & 1024) !== 0 && a !== null) {
									(e = void 0),
										(n = t),
										(r = a.memoizedProps),
										(a = a.memoizedState),
										(o = n.stateNode);
									try {
										var v = ba(n.type, r);
										(e = o.getSnapshotBeforeUpdate(v, a)),
											(o.__reactInternalSnapshotBeforeUpdate = e);
									} catch (C) {
										ue(n, n.return, C);
									}
								}
								break;
							case 3:
								if ((e & 1024) !== 0) {
									if (
										((e = t.stateNode.containerInfo), (n = e.nodeType), n === 9)
									)
										bb(e);
									else if (n === 1)
										switch (e.nodeName) {
											case 'HEAD':
											case 'HTML':
											case 'BODY':
												bb(e);
												break;
											default:
												e.textContent = '';
										}
								}
								break;
							case 5:
							case 26:
							case 27:
							case 6:
							case 4:
							case 17:
								break;
							default:
								if ((e & 1024) !== 0) throw Error(I(163));
						}
						if (((e = t.sibling), e !== null)) {
							(e.return = t.return), (lt = e);
							break;
						}
						lt = t.return;
					}
		}
		function Y2(e, t, n) {
			var o = n.flags;
			switch (n.tag) {
				case 0:
				case 11:
				case 15:
					Lo(e, n), o & 4 && Jl(5, n);
					break;
				case 1:
					if ((Lo(e, n), o & 4))
						if (((e = n.stateNode), t === null))
							try {
								e.componentDidMount();
							} catch (i) {
								ue(n, n.return, i);
							}
						else {
							var r = ba(n.type, t.memoizedProps);
							t = t.memoizedState;
							try {
								e.componentDidUpdate(
									r,
									t,
									e.__reactInternalSnapshotBeforeUpdate
								);
							} catch (i) {
								ue(n, n.return, i);
							}
						}
					o & 64 && H2(n), o & 512 && kl(n, n.return);
					break;
				case 3:
					if ((Lo(e, n), o & 64 && ((e = n.updateQueue), e !== null))) {
						if (((t = null), n.child !== null))
							switch (n.child.tag) {
								case 27:
								case 5:
									t = n.child.stateNode;
									break;
								case 1:
									t = n.child.stateNode;
							}
						try {
							Zx(e, t);
						} catch (i) {
							ue(n, n.return, i);
						}
					}
					break;
				case 27:
					t === null && o & 4 && q2(n);
				case 26:
				case 5:
					Lo(e, n), t === null && o & 4 && G2(n), o & 512 && kl(n, n.return);
					break;
				case 12:
					Lo(e, n);
					break;
				case 31:
					Lo(e, n), o & 4 && Q2(e, n);
					break;
				case 13:
					Lo(e, n),
						o & 4 && Z2(e, n),
						o & 64 &&
							((e = n.memoizedState),
							e !== null &&
								((e = e.dehydrated),
								e !== null && ((n = j3.bind(null, n)), tN(e, n))));
					break;
				case 22:
					if (((o = n.memoizedState !== null || Bo), !o)) {
						(t = (t !== null && t.memoizedState !== null) || Ze), (r = Bo);
						var a = Ze;
						(Bo = o),
							(Ze = t) && !a
								? _o(e, n, (n.subtreeFlags & 8772) !== 0)
								: Lo(e, n),
							(Bo = r),
							(Ze = a);
					}
					break;
				case 30:
					break;
				default:
					Lo(e, n);
			}
		}
		function X2(e) {
			var t = e.alternate;
			t !== null && ((e.alternate = null), X2(t)),
				(e.child = null),
				(e.deletions = null),
				(e.sibling = null),
				e.tag === 5 && ((t = e.stateNode), t !== null && Rb(t)),
				(e.stateNode = null),
				(e.return = null),
				(e.dependencies = null),
				(e.memoizedProps = null),
				(e.memoizedState = null),
				(e.pendingProps = null),
				(e.stateNode = null),
				(e.updateQueue = null);
		}
		var we = null,
			Ut = !1;
		function No(e, t, n) {
			for (n = n.child; n !== null; ) K2(e, t, n), (n = n.sibling);
		}
		function K2(e, t, n) {
			if (on && typeof on.onCommitFiberUnmount == 'function')
				try {
					on.onCommitFiberUnmount(Fl, n);
				} catch {}
			switch (n.tag) {
				case 26:
					Ze || uo(n, t),
						No(e, t, n),
						n.memoizedState
							? n.memoizedState.count--
							: n.stateNode && ((n = n.stateNode), n.parentNode.removeChild(n));
					break;
				case 27:
					Ze || uo(n, t);
					var o = we,
						r = Ut;
					_r(n.type) && ((we = n.stateNode), (Ut = !1)),
						No(e, t, n),
						El(n.stateNode),
						(we = o),
						(Ut = r);
					break;
				case 5:
					Ze || uo(n, t);
				case 6:
					if (
						((o = we),
						(r = Ut),
						(we = null),
						No(e, t, n),
						(we = o),
						(Ut = r),
						we !== null)
					)
						if (Ut)
							try {
								(we.nodeType === 9
									? we.body
									: we.nodeName === 'HTML'
										? we.ownerDocument.body
										: we
								).removeChild(n.stateNode);
							} catch (a) {
								ue(n, t, a);
							}
						else
							try {
								we.removeChild(n.stateNode);
							} catch (a) {
								ue(n, t, a);
							}
					break;
				case 18:
					we !== null &&
						(Ut
							? ((e = we),
								VS(
									e.nodeType === 9
										? e.body
										: e.nodeName === 'HTML'
											? e.ownerDocument.body
											: e,
									n.stateNode
								),
								Qi(e))
							: VS(we, n.stateNode));
					break;
				case 4:
					(o = we),
						(r = Ut),
						(we = n.stateNode.containerInfo),
						(Ut = !0),
						No(e, t, n),
						(we = o),
						(Ut = r);
					break;
				case 0:
				case 11:
				case 14:
				case 15:
					Ir(2, n, t), Ze || Ir(4, n, t), No(e, t, n);
					break;
				case 1:
					Ze ||
						(uo(n, t),
						(o = n.stateNode),
						typeof o.componentWillUnmount == 'function' && P2(n, t, o)),
						No(e, t, n);
					break;
				case 21:
					No(e, t, n);
					break;
				case 22:
					(Ze = (o = Ze) || n.memoizedState !== null), No(e, t, n), (Ze = o);
					break;
				default:
					No(e, t, n);
			}
		}
		function Q2(e, t) {
			if (
				t.memoizedState === null &&
				((e = t.alternate), e !== null && ((e = e.memoizedState), e !== null))
			) {
				e = e.dehydrated;
				try {
					Qi(e);
				} catch (n) {
					ue(t, t.return, n);
				}
			}
		}
		function Z2(e, t) {
			if (
				t.memoizedState === null &&
				((e = t.alternate),
				e !== null &&
					((e = e.memoizedState),
					e !== null && ((e = e.dehydrated), e !== null)))
			)
				try {
					Qi(e);
				} catch (n) {
					ue(t, t.return, n);
				}
		}
		function I3(e) {
			switch (e.tag) {
				case 31:
				case 13:
				case 19:
					var t = e.stateNode;
					return t === null && (t = e.stateNode = new kS()), t;
				case 22:
					return (
						(e = e.stateNode),
						(t = e._retryCache),
						t === null && (t = e._retryCache = new kS()),
						t
					);
				default:
					throw Error(I(435, e.tag));
			}
		}
		function cd(e, t) {
			var n = I3(e);
			t.forEach(function (o) {
				if (!n.has(o)) {
					n.add(o);
					var r = z3.bind(null, e, o);
					o.then(r, r);
				}
			});
		}
		function zt(e, t) {
			var n = t.deletions;
			if (n !== null)
				for (var o = 0; o < n.length; o++) {
					var r = n[o],
						a = e,
						i = t,
						s = i;
					e: for (; s !== null; ) {
						switch (s.tag) {
							case 27:
								if (_r(s.type)) {
									(we = s.stateNode), (Ut = !1);
									break e;
								}
								break;
							case 5:
								(we = s.stateNode), (Ut = !1);
								break e;
							case 3:
							case 4:
								(we = s.stateNode.containerInfo), (Ut = !0);
								break e;
						}
						s = s.return;
					}
					if (we === null) throw Error(I(160));
					K2(a, i, r),
						(we = null),
						(Ut = !1),
						(a = r.alternate),
						a !== null && (a.return = null),
						(r.return = null);
				}
			if (t.subtreeFlags & 13886)
				for (t = t.child; t !== null; ) J2(t, e), (t = t.sibling);
		}
		var Gn = null;
		function J2(e, t) {
			var n = e.alternate,
				o = e.flags;
			switch (e.tag) {
				case 0:
				case 11:
				case 14:
				case 15:
					zt(t, e),
						Vt(e),
						o & 4 && (Ir(3, e, e.return), Jl(3, e), Ir(5, e, e.return));
					break;
				case 1:
					zt(t, e),
						Vt(e),
						o & 512 && (Ze || n === null || uo(n, n.return)),
						o & 64 &&
							Bo &&
							((e = e.updateQueue),
							e !== null &&
								((o = e.callbacks),
								o !== null &&
									((n = e.shared.hiddenCallbacks),
									(e.shared.hiddenCallbacks = n === null ? o : n.concat(o)))));
					break;
				case 26:
					var r = Gn;
					if (
						(zt(t, e),
						Vt(e),
						o & 512 && (Ze || n === null || uo(n, n.return)),
						o & 4)
					) {
						var a = n !== null ? n.memoizedState : null;
						if (((o = e.memoizedState), n === null))
							if (o === null)
								if (e.stateNode === null) {
									e: {
										(o = e.type),
											(n = e.memoizedProps),
											(r = r.ownerDocument || r);
										t: switch (o) {
											case 'title':
												(a = r.getElementsByTagName('title')[0]),
													(!a ||
														a[Xl] ||
														a[bt] ||
														a.namespaceURI === 'http://www.w3.org/2000/svg' ||
														a.hasAttribute('itemprop')) &&
														((a = r.createElement(o)),
														r.head.insertBefore(
															a,
															r.querySelector('head > title')
														)),
													yt(a, o, n),
													(a[bt] = e),
													ct(a),
													(o = a);
												break e;
											case 'link':
												var i = YS('link', 'href', r).get(o + (n.href || ''));
												if (i) {
													for (var s = 0; s < i.length; s++)
														if (
															((a = i[s]),
															a.getAttribute('href') ===
																(n.href == null || n.href === ''
																	? null
																	: n.href) &&
																a.getAttribute('rel') ===
																	(n.rel == null ? null : n.rel) &&
																a.getAttribute('title') ===
																	(n.title == null ? null : n.title) &&
																a.getAttribute('crossorigin') ===
																	(n.crossOrigin == null
																		? null
																		: n.crossOrigin))
														) {
															i.splice(s, 1);
															break t;
														}
												}
												(a = r.createElement(o)),
													yt(a, o, n),
													r.head.appendChild(a);
												break;
											case 'meta':
												if (
													(i = YS('meta', 'content', r).get(
														o + (n.content || '')
													))
												) {
													for (s = 0; s < i.length; s++)
														if (
															((a = i[s]),
															a.getAttribute('content') ===
																(n.content == null ? null : '' + n.content) &&
																a.getAttribute('name') ===
																	(n.name == null ? null : n.name) &&
																a.getAttribute('property') ===
																	(n.property == null ? null : n.property) &&
																a.getAttribute('http-equiv') ===
																	(n.httpEquiv == null ? null : n.httpEquiv) &&
																a.getAttribute('charset') ===
																	(n.charSet == null ? null : n.charSet))
														) {
															i.splice(s, 1);
															break t;
														}
												}
												(a = r.createElement(o)),
													yt(a, o, n),
													r.head.appendChild(a);
												break;
											default:
												throw Error(I(468, o));
										}
										(a[bt] = e), ct(a), (o = a);
									}
									e.stateNode = o;
								} else XS(r, e.type, e.stateNode);
							else e.stateNode = qS(r, o, e.memoizedProps);
						else
							a !== o
								? (a === null
										? n.stateNode !== null &&
											((n = n.stateNode), n.parentNode.removeChild(n))
										: a.count--,
									o === null
										? XS(r, e.type, e.stateNode)
										: qS(r, o, e.memoizedProps))
								: o === null &&
									e.stateNode !== null &&
									hg(e, e.memoizedProps, n.memoizedProps);
					}
					break;
				case 27:
					zt(t, e),
						Vt(e),
						o & 512 && (Ze || n === null || uo(n, n.return)),
						n !== null && o & 4 && hg(e, e.memoizedProps, n.memoizedProps);
					break;
				case 5:
					if (
						(zt(t, e),
						Vt(e),
						o & 512 && (Ze || n === null || uo(n, n.return)),
						e.flags & 32)
					) {
						r = e.stateNode;
						try {
							Hi(r, '');
						} catch (v) {
							ue(e, e.return, v);
						}
					}
					o & 4 &&
						e.stateNode != null &&
						((r = e.memoizedProps), hg(e, r, n !== null ? n.memoizedProps : r)),
						o & 1024 && (yg = !0);
					break;
				case 6:
					if ((zt(t, e), Vt(e), o & 4)) {
						if (e.stateNode === null) throw Error(I(162));
						(o = e.memoizedProps), (n = e.stateNode);
						try {
							n.nodeValue = o;
						} catch (v) {
							ue(e, e.return, v);
						}
					}
					break;
				case 3:
					if (
						((Rd = null),
						(r = Gn),
						(Gn = ef(t.containerInfo)),
						zt(t, e),
						(Gn = r),
						Vt(e),
						o & 4 && n !== null && n.memoizedState.isDehydrated)
					)
						try {
							Qi(t.containerInfo);
						} catch (v) {
							ue(e, e.return, v);
						}
					yg && ((yg = !1), W2(e));
					break;
				case 4:
					(o = Gn),
						(Gn = ef(e.stateNode.containerInfo)),
						zt(t, e),
						Vt(e),
						(Gn = o);
					break;
				case 12:
					zt(t, e), Vt(e);
					break;
				case 31:
					zt(t, e),
						Vt(e),
						o & 4 &&
							((o = e.updateQueue),
							o !== null && ((e.updateQueue = null), cd(e, o)));
					break;
				case 13:
					zt(t, e),
						Vt(e),
						e.child.flags & 8192 &&
							(e.memoizedState !== null) !=
								(n !== null && n.memoizedState !== null) &&
							(hf = nn()),
						o & 4 &&
							((o = e.updateQueue),
							o !== null && ((e.updateQueue = null), cd(e, o)));
					break;
				case 22:
					r = e.memoizedState !== null;
					var l = n !== null && n.memoizedState !== null,
						u = Bo,
						d = Ze;
					if (
						((Bo = u || r),
						(Ze = d || l),
						zt(t, e),
						(Ze = d),
						(Bo = u),
						Vt(e),
						o & 8192)
					)
						e: for (
							t = e.stateNode,
								t._visibility = r ? t._visibility & -2 : t._visibility | 1,
								r && (n === null || l || Bo || Ze || ia(e)),
								n = null,
								t = e;
							;
						) {
							if (t.tag === 5 || t.tag === 26) {
								if (n === null) {
									l = n = t;
									try {
										if (((a = l.stateNode), r))
											(i = a.style),
												typeof i.setProperty == 'function'
													? i.setProperty('display', 'none', 'important')
													: (i.display = 'none');
										else {
											s = l.stateNode;
											var f = l.memoizedProps.style,
												c =
													f != null && f.hasOwnProperty('display')
														? f.display
														: null;
											s.style.display =
												c == null || typeof c == 'boolean'
													? ''
													: ('' + c).trim();
										}
									} catch (v) {
										ue(l, l.return, v);
									}
								}
							} else if (t.tag === 6) {
								if (n === null) {
									l = t;
									try {
										l.stateNode.nodeValue = r ? '' : l.memoizedProps;
									} catch (v) {
										ue(l, l.return, v);
									}
								}
							} else if (t.tag === 18) {
								if (n === null) {
									l = t;
									try {
										var p = l.stateNode;
										r ? US(p, !0) : US(l.stateNode, !1);
									} catch (v) {
										ue(l, l.return, v);
									}
								}
							} else if (
								((t.tag !== 22 && t.tag !== 23) ||
									t.memoizedState === null ||
									t === e) &&
								t.child !== null
							) {
								(t.child.return = t), (t = t.child);
								continue;
							}
							if (t === e) break e;
							for (; t.sibling === null; ) {
								if (t.return === null || t.return === e) break e;
								n === t && (n = null), (t = t.return);
							}
							n === t && (n = null),
								(t.sibling.return = t.return),
								(t = t.sibling);
						}
					o & 4 &&
						((o = e.updateQueue),
						o !== null &&
							((n = o.retryQueue),
							n !== null && ((o.retryQueue = null), cd(e, n))));
					break;
				case 19:
					zt(t, e),
						Vt(e),
						o & 4 &&
							((o = e.updateQueue),
							o !== null && ((e.updateQueue = null), cd(e, o)));
					break;
				case 30:
					break;
				case 21:
					break;
				default:
					zt(t, e), Vt(e);
			}
		}
		function Vt(e) {
			var t = e.flags;
			if (t & 2) {
				try {
					for (var n, o = e.return; o !== null; ) {
						if (F2(o)) {
							n = o;
							break;
						}
						o = o.return;
					}
					if (n == null) throw Error(I(160));
					switch (n.tag) {
						case 27:
							var r = n.stateNode,
								a = vg(e);
							Yd(e, a, r);
							break;
						case 5:
							var i = n.stateNode;
							n.flags & 32 && (Hi(i, ''), (n.flags &= -33));
							var s = vg(e);
							Yd(e, s, i);
							break;
						case 3:
						case 4:
							var l = n.stateNode.containerInfo,
								u = vg(e);
							ib(e, u, l);
							break;
						default:
							throw Error(I(161));
					}
				} catch (d) {
					ue(e, e.return, d);
				}
				e.flags &= -3;
			}
			t & 4096 && (e.flags &= -4097);
		}
		function W2(e) {
			if (e.subtreeFlags & 1024)
				for (e = e.child; e !== null; ) {
					var t = e;
					W2(t),
						t.tag === 5 && t.flags & 1024 && t.stateNode.reset(),
						(e = e.sibling);
				}
		}
		function Lo(e, t) {
			if (t.subtreeFlags & 8772)
				for (t = t.child; t !== null; ) Y2(e, t.alternate, t), (t = t.sibling);
		}
		function ia(e) {
			for (e = e.child; e !== null; ) {
				var t = e;
				switch (t.tag) {
					case 0:
					case 11:
					case 14:
					case 15:
						Ir(4, t, t.return), ia(t);
						break;
					case 1:
						uo(t, t.return);
						var n = t.stateNode;
						typeof n.componentWillUnmount == 'function' && P2(t, t.return, n),
							ia(t);
						break;
					case 27:
						El(t.stateNode);
					case 26:
					case 5:
						uo(t, t.return), ia(t);
						break;
					case 22:
						t.memoizedState === null && ia(t);
						break;
					case 30:
						ia(t);
						break;
					default:
						ia(t);
				}
				e = e.sibling;
			}
		}
		function _o(e, t, n) {
			for (n = n && (t.subtreeFlags & 8772) !== 0, t = t.child; t !== null; ) {
				var o = t.alternate,
					r = e,
					a = t,
					i = a.flags;
				switch (a.tag) {
					case 0:
					case 11:
					case 15:
						_o(r, a, n), Jl(4, a);
						break;
					case 1:
						if (
							(_o(r, a, n),
							(o = a),
							(r = o.stateNode),
							typeof r.componentDidMount == 'function')
						)
							try {
								r.componentDidMount();
							} catch (u) {
								ue(o, o.return, u);
							}
						if (((o = a), (r = o.updateQueue), r !== null)) {
							var s = o.stateNode;
							try {
								var l = r.shared.hiddenCallbacks;
								if (l !== null)
									for (
										r.shared.hiddenCallbacks = null, r = 0;
										r < l.length;
										r++
									)
										Qx(l[r], s);
							} catch (u) {
								ue(o, o.return, u);
							}
						}
						n && i & 64 && H2(a), kl(a, a.return);
						break;
					case 27:
						q2(a);
					case 26:
					case 5:
						_o(r, a, n), n && o === null && i & 4 && G2(a), kl(a, a.return);
						break;
					case 12:
						_o(r, a, n);
						break;
					case 31:
						_o(r, a, n), n && i & 4 && Q2(r, a);
						break;
					case 13:
						_o(r, a, n), n && i & 4 && Z2(r, a);
						break;
					case 22:
						a.memoizedState === null && _o(r, a, n), kl(a, a.return);
						break;
					case 30:
						break;
					default:
						_o(r, a, n);
				}
				t = t.sibling;
			}
		}
		function ah(e, t) {
			var n = null;
			e !== null &&
				e.memoizedState !== null &&
				e.memoizedState.cachePool !== null &&
				(n = e.memoizedState.cachePool.pool),
				(e = null),
				t.memoizedState !== null &&
					t.memoizedState.cachePool !== null &&
					(e = t.memoizedState.cachePool.pool),
				e !== n && (e != null && e.refCount++, n != null && Ql(n));
		}
		function ih(e, t) {
			(e = null),
				t.alternate !== null && (e = t.alternate.memoizedState.cache),
				(t = t.memoizedState.cache),
				t !== e && (t.refCount++, e != null && Ql(e));
		}
		function Pn(e, t, n, o) {
			if (t.subtreeFlags & 10256)
				for (t = t.child; t !== null; ) $2(e, t, n, o), (t = t.sibling);
		}
		function $2(e, t, n, o) {
			var r = t.flags;
			switch (t.tag) {
				case 0:
				case 11:
				case 15:
					Pn(e, t, n, o), r & 2048 && Jl(9, t);
					break;
				case 1:
					Pn(e, t, n, o);
					break;
				case 3:
					Pn(e, t, n, o),
						r & 2048 &&
							((e = null),
							t.alternate !== null && (e = t.alternate.memoizedState.cache),
							(t = t.memoizedState.cache),
							t !== e && (t.refCount++, e != null && Ql(e)));
					break;
				case 12:
					if (r & 2048) {
						Pn(e, t, n, o), (e = t.stateNode);
						try {
							var a = t.memoizedProps,
								i = a.id,
								s = a.onPostCommit;
							typeof s == 'function' &&
								s(
									i,
									t.alternate === null ? 'mount' : 'update',
									e.passiveEffectDuration,
									-0
								);
						} catch (l) {
							ue(t, t.return, l);
						}
					} else Pn(e, t, n, o);
					break;
				case 31:
					Pn(e, t, n, o);
					break;
				case 13:
					Pn(e, t, n, o);
					break;
				case 23:
					break;
				case 22:
					(a = t.stateNode),
						(i = t.alternate),
						t.memoizedState !== null
							? a._visibility & 2
								? Pn(e, t, n, o)
								: wl(e, t)
							: a._visibility & 2
								? Pn(e, t, n, o)
								: ((a._visibility |= 2),
									vi(e, t, n, o, (t.subtreeFlags & 10256) !== 0 || !1)),
						r & 2048 && ah(i, t);
					break;
				case 24:
					Pn(e, t, n, o), r & 2048 && ih(t.alternate, t);
					break;
				default:
					Pn(e, t, n, o);
			}
		}
		function vi(e, t, n, o, r) {
			for (
				r = r && ((t.subtreeFlags & 10256) !== 0 || !1), t = t.child;
				t !== null;
			) {
				var a = e,
					i = t,
					s = n,
					l = o,
					u = i.flags;
				switch (i.tag) {
					case 0:
					case 11:
					case 15:
						vi(a, i, s, l, r), Jl(8, i);
						break;
					case 23:
						break;
					case 22:
						var d = i.stateNode;
						i.memoizedState !== null
							? d._visibility & 2
								? vi(a, i, s, l, r)
								: wl(a, i)
							: ((d._visibility |= 2), vi(a, i, s, l, r)),
							r && u & 2048 && ah(i.alternate, i);
						break;
					case 24:
						vi(a, i, s, l, r), r && u & 2048 && ih(i.alternate, i);
						break;
					default:
						vi(a, i, s, l, r);
				}
				t = t.sibling;
			}
		}
		function wl(e, t) {
			if (t.subtreeFlags & 10256)
				for (t = t.child; t !== null; ) {
					var n = e,
						o = t,
						r = o.flags;
					switch (o.tag) {
						case 22:
							wl(n, o), r & 2048 && ah(o.alternate, o);
							break;
						case 24:
							wl(n, o), r & 2048 && ih(o.alternate, o);
							break;
						default:
							wl(n, o);
					}
					t = t.sibling;
				}
		}
		var gl = 8192;
		function hi(e, t, n) {
			if (e.subtreeFlags & gl)
				for (e = e.child; e !== null; ) eT(e, t, n), (e = e.sibling);
		}
		function eT(e, t, n) {
			switch (e.tag) {
				case 26:
					hi(e, t, n),
						e.flags & gl &&
							e.memoizedState !== null &&
							mN(n, Gn, e.memoizedState, e.memoizedProps);
					break;
				case 5:
					hi(e, t, n);
					break;
				case 3:
				case 4:
					var o = Gn;
					(Gn = ef(e.stateNode.containerInfo)), hi(e, t, n), (Gn = o);
					break;
				case 22:
					e.memoizedState === null &&
						((o = e.alternate),
						o !== null && o.memoizedState !== null
							? ((o = gl), (gl = 16777216), hi(e, t, n), (gl = o))
							: hi(e, t, n));
					break;
				default:
					hi(e, t, n);
			}
		}
		function tT(e) {
			var t = e.alternate;
			if (t !== null && ((e = t.child), e !== null)) {
				t.child = null;
				do (t = e.sibling), (e.sibling = null), (e = t);
				while (e !== null);
			}
		}
		function ll(e) {
			var t = e.deletions;
			if ((e.flags & 16) !== 0) {
				if (t !== null)
					for (var n = 0; n < t.length; n++) {
						var o = t[n];
						(lt = o), oT(o, e);
					}
				tT(e);
			}
			if (e.subtreeFlags & 10256)
				for (e = e.child; e !== null; ) nT(e), (e = e.sibling);
		}
		function nT(e) {
			switch (e.tag) {
				case 0:
				case 11:
				case 15:
					ll(e), e.flags & 2048 && Ir(9, e, e.return);
					break;
				case 3:
					ll(e);
					break;
				case 12:
					ll(e);
					break;
				case 22:
					var t = e.stateNode;
					e.memoizedState !== null &&
					t._visibility & 2 &&
					(e.return === null || e.return.tag !== 13)
						? ((t._visibility &= -3), wd(e))
						: ll(e);
					break;
				default:
					ll(e);
			}
		}
		function wd(e) {
			var t = e.deletions;
			if ((e.flags & 16) !== 0) {
				if (t !== null)
					for (var n = 0; n < t.length; n++) {
						var o = t[n];
						(lt = o), oT(o, e);
					}
				tT(e);
			}
			for (e = e.child; e !== null; ) {
				switch (((t = e), t.tag)) {
					case 0:
					case 11:
					case 15:
						Ir(8, t, t.return), wd(t);
						break;
					case 22:
						(n = t.stateNode),
							n._visibility & 2 && ((n._visibility &= -3), wd(t));
						break;
					default:
						wd(t);
				}
				e = e.sibling;
			}
		}
		function oT(e, t) {
			for (; lt !== null; ) {
				var n = lt;
				switch (n.tag) {
					case 0:
					case 11:
					case 15:
						Ir(8, n, t);
						break;
					case 23:
					case 22:
						if (
							n.memoizedState !== null &&
							n.memoizedState.cachePool !== null
						) {
							var o = n.memoizedState.cachePool.pool;
							o != null && o.refCount++;
						}
						break;
					case 24:
						Ql(n.memoizedState.cache);
				}
				if (((o = n.child), o !== null)) (o.return = n), (lt = o);
				else
					e: for (n = e; lt !== null; ) {
						o = lt;
						var r = o.sibling,
							a = o.return;
						if ((X2(o), o === n)) {
							lt = null;
							break e;
						}
						if (r !== null) {
							(r.return = a), (lt = r);
							break e;
						}
						lt = a;
					}
			}
		}
		var N3 = {
				getCacheForType: function (e) {
					var t = vt(Je),
						n = t.data.get(e);
					return n === void 0 && ((n = e()), t.data.set(e, n)), n;
				},
				cacheSignal: function () {
					return vt(Je).controller.signal;
				},
			},
			L3 = typeof WeakMap == 'function' ? WeakMap : Map,
			ae = 0,
			he = null,
			ee = null,
			te = 0,
			ce = 0,
			Wt = null,
			gr = !1,
			es = !1,
			sh = !1,
			qo = 0,
			Oe = 0,
			Nr = 0,
			da = 0,
			lh = 0,
			tn = 0,
			qi = 0,
			Al = null,
			Ht = null,
			sb = !1,
			hf = 0,
			rT = 0,
			Xd = 1 / 0,
			Kd = null,
			xr = null,
			ot = 0,
			Tr = null,
			Yi = null,
			Uo = 0,
			lb = 0,
			cb = null,
			aT = null,
			Rl = 0,
			ub = null;
		function an() {
			return (ae & 2) !== 0 && te !== 0 ? te & -te : q.T !== null ? uh() : px();
		}
		function iT() {
			if (tn === 0)
				if ((te & 536870912) === 0 || ne) {
					var e = $u;
					($u <<= 1), ($u & 3932160) === 0 && ($u = 262144), (tn = e);
				} else tn = 536870912;
			return (e = ln.current), e !== null && (e.flags |= 32), tn;
		}
		function Pt(e, t, n) {
			((e === he && (ce === 2 || ce === 9)) ||
				e.cancelPendingCommit !== null) &&
				(Xi(e, 0), br(e, te, tn, !1)),
				Yl(e, n),
				((ae & 2) === 0 || e !== he) &&
					(e === he &&
						((ae & 2) === 0 && (da |= n), Oe === 4 && br(e, te, tn, !1)),
					po(e));
		}
		function sT(e, t, n) {
			if ((ae & 6) !== 0) throw Error(I(327));
			var o = (!n && (t & 127) === 0 && (t & e.expiredLanes) === 0) || ql(e, t),
				r = o ? B3(e, t) : Cg(e, t, !0),
				a = o;
			do {
				if (r === 0) {
					es && !o && br(e, t, 0, !1);
					break;
				} else {
					if (((n = e.current.alternate), a && !_3(n))) {
						(r = Cg(e, t, !1)), (a = !1);
						continue;
					}
					if (r === 2) {
						if (((a = t), e.errorRecoveryDisabledLanes & a)) var i = 0;
						else
							(i = e.pendingLanes & -536870913),
								(i = i !== 0 ? i : i & 536870912 ? 536870912 : 0);
						if (i !== 0) {
							t = i;
							e: {
								var s = e;
								r = Al;
								var l = s.current.memoizedState.isDehydrated;
								if (
									(l && (Xi(s, i).flags |= 256), (i = Cg(s, i, !1)), i !== 2)
								) {
									if (sh && !l) {
										(s.errorRecoveryDisabledLanes |= a), (da |= a), (r = 4);
										break e;
									}
									(a = Ht),
										(Ht = r),
										a !== null &&
											(Ht === null ? (Ht = a) : Ht.push.apply(Ht, a));
								}
								r = i;
							}
							if (((a = !1), r !== 2)) continue;
						}
					}
					if (r === 1) {
						Xi(e, 0), br(e, t, 0, !0);
						break;
					}
					e: {
						switch (((o = e), (a = r), a)) {
							case 0:
							case 1:
								throw Error(I(345));
							case 4:
								if ((t & 4194048) !== t) break;
							case 6:
								br(o, t, tn, !gr);
								break e;
							case 2:
								Ht = null;
								break;
							case 3:
							case 5:
								break;
							default:
								throw Error(I(329));
						}
						if ((t & 62914560) === t && ((r = hf + 300 - nn()), 10 < r)) {
							if ((br(o, t, tn, !gr), af(o, 0, !0) !== 0)) break e;
							(Uo = t),
								(o.timeoutHandle = RT(
									wS.bind(
										null,
										o,
										n,
										Ht,
										Kd,
										sb,
										t,
										tn,
										da,
										qi,
										gr,
										a,
										'Throttled',
										-0,
										0
									),
									r
								));
							break e;
						}
						wS(o, n, Ht, Kd, sb, t, tn, da, qi, gr, a, null, -0, 0);
					}
				}
				break;
			} while (!0);
			po(e);
		}
		function wS(e, t, n, o, r, a, i, s, l, u, d, f, c, p) {
			if (
				((e.timeoutHandle = -1),
				(f = t.subtreeFlags),
				f & 8192 || (f & 16785408) === 16785408)
			) {
				(f = {
					stylesheets: null,
					count: 0,
					imgCount: 0,
					imgBytes: 0,
					suspenseyImages: [],
					waitingForImages: !0,
					waitingForViewTransition: !1,
					unsuspend: Mo,
				}),
					eT(t, a, f);
				var v =
					(a & 62914560) === a
						? hf - nn()
						: (a & 4194048) === a
							? rT - nn()
							: 0;
				if (((v = pN(f, v)), v !== null)) {
					(Uo = a),
						(e.cancelPendingCommit = v(
							RS.bind(null, e, t, a, n, o, r, i, s, l, d, f, null, c, p)
						)),
						br(e, a, i, !u);
					return;
				}
			}
			RS(e, t, a, n, o, r, i, s, l);
		}
		function _3(e) {
			for (var t = e; ; ) {
				var n = t.tag;
				if (
					(n === 0 || n === 11 || n === 15) &&
					t.flags & 16384 &&
					((n = t.updateQueue), n !== null && ((n = n.stores), n !== null))
				)
					for (var o = 0; o < n.length; o++) {
						var r = n[o],
							a = r.getSnapshot;
						r = r.value;
						try {
							if (!sn(a(), r)) return !1;
						} catch {
							return !1;
						}
					}
				if (((n = t.child), t.subtreeFlags & 16384 && n !== null))
					(n.return = t), (t = n);
				else {
					if (t === e) break;
					for (; t.sibling === null; ) {
						if (t.return === null || t.return === e) return !0;
						t = t.return;
					}
					(t.sibling.return = t.return), (t = t.sibling);
				}
			}
			return !0;
		}
		function br(e, t, n, o) {
			(t &= ~lh),
				(t &= ~da),
				(e.suspendedLanes |= t),
				(e.pingedLanes &= ~t),
				o && (e.warmLanes |= t),
				(o = e.expirationTimes);
			for (var r = t; 0 < r; ) {
				var a = 31 - rn(r),
					i = 1 << a;
				(o[a] = -1), (r &= ~i);
			}
			n !== 0 && dx(e, n, t);
		}
		function vf() {
			return (ae & 6) === 0 ? (Wl(0, !1), !1) : !0;
		}
		function ch() {
			if (ee !== null) {
				if (ce === 0) var e = ee.return;
				else (e = ee), (jo = Sa = null), Kb(e), (Mi = null), (Dl = 0), (e = ee);
				for (; e !== null; ) U2(e.alternate, e), (e = e.return);
				ee = null;
			}
		}
		function Xi(e, t) {
			var n = e.timeoutHandle;
			n !== -1 && ((e.timeoutHandle = -1), Z3(n)),
				(n = e.cancelPendingCommit),
				n !== null && ((e.cancelPendingCommit = null), n()),
				(Uo = 0),
				ch(),
				(he = e),
				(ee = n = zo(e.current, null)),
				(te = t),
				(ce = 0),
				(Wt = null),
				(gr = !1),
				(es = ql(e, t)),
				(sh = !1),
				(qi = tn = lh = da = Nr = Oe = 0),
				(Ht = Al = null),
				(sb = !1),
				(t & 8) !== 0 && (t |= t & 32);
			var o = e.entangledLanes;
			if (o !== 0)
				for (e = e.entanglements, o &= t; 0 < o; ) {
					var r = 31 - rn(o),
						a = 1 << r;
					(t |= e[r]), (o &= ~a);
				}
			return (qo = t), uf(), n;
		}
		function lT(e, t) {
			(Q = null),
				(q.H = jl),
				t === $i || t === ff
					? ((t = oS()), (ce = 3))
					: t === Hb
						? ((t = oS()), (ce = 4))
						: (ce =
								t === oh
									? 8
									: t !== null &&
											typeof t == 'object' &&
											typeof t.then == 'function'
										? 6
										: 1),
				(Wt = t),
				ee === null && ((Oe = 1), Fd(e, wn(t, e.current)));
		}
		function cT() {
			var e = ln.current;
			return e === null
				? !0
				: (te & 4194048) === te
					? Rn === null
					: (te & 62914560) === te || (te & 536870912) !== 0
						? e === Rn
						: !1;
		}
		function uT() {
			var e = q.H;
			return (q.H = jl), e === null ? jl : e;
		}
		function dT() {
			var e = q.A;
			return (q.A = N3), e;
		}
		function Qd() {
			(Oe = 4),
				gr || ((te & 4194048) !== te && ln.current !== null) || (es = !0),
				((Nr & 134217727) === 0 && (da & 134217727) === 0) ||
					he === null ||
					br(he, te, tn, !1);
		}
		function Cg(e, t, n) {
			var o = ae;
			ae |= 2;
			var r = uT(),
				a = dT();
			(he !== e || te !== t) && ((Kd = null), Xi(e, t)), (t = !1);
			var i = Oe;
			e: do
				try {
					if (ce !== 0 && ee !== null) {
						var s = ee,
							l = Wt;
						switch (ce) {
							case 8:
								ch(), (i = 6);
								break e;
							case 3:
							case 2:
							case 9:
							case 6:
								ln.current === null && (t = !0);
								var u = ce;
								if (((ce = 0), (Wt = null), Li(e, s, l, u), n && es)) {
									i = 0;
									break e;
								}
								break;
							default:
								(u = ce), (ce = 0), (Wt = null), Li(e, s, l, u);
						}
					}
					O3(), (i = Oe);
					break;
				} catch (d) {
					lT(e, d);
				}
			while (!0);
			return (
				t && e.shellSuspendCounter++,
				(jo = Sa = null),
				(ae = o),
				(q.H = r),
				(q.A = a),
				ee === null && ((he = null), (te = 0), uf()),
				i
			);
		}
		function O3() {
			for (; ee !== null; ) fT(ee);
		}
		function B3(e, t) {
			var n = ae;
			ae |= 2;
			var o = uT(),
				r = dT();
			he !== e || te !== t
				? ((Kd = null), (Xd = nn() + 500), Xi(e, t))
				: (es = ql(e, t));
			e: do
				try {
					if (ce !== 0 && ee !== null) {
						t = ee;
						var a = Wt;
						t: switch (ce) {
							case 1:
								(ce = 0), (Wt = null), Li(e, t, a, 1);
								break;
							case 2:
							case 9:
								if (nS(a)) {
									(ce = 0), (Wt = null), AS(t);
									break;
								}
								(t = function () {
									(ce !== 2 && ce !== 9) || he !== e || (ce = 7), po(e);
								}),
									a.then(t, t);
								break e;
							case 3:
								ce = 7;
								break e;
							case 4:
								ce = 5;
								break e;
							case 7:
								nS(a)
									? ((ce = 0), (Wt = null), AS(t))
									: ((ce = 0), (Wt = null), Li(e, t, a, 7));
								break;
							case 5:
								var i = null;
								switch (ee.tag) {
									case 26:
										i = ee.memoizedState;
									case 5:
									case 27:
										var s = ee;
										if (i ? _T(i) : s.stateNode.complete) {
											(ce = 0), (Wt = null);
											var l = s.sibling;
											if (l !== null) ee = l;
											else {
												var u = s.return;
												u !== null ? ((ee = u), yf(u)) : (ee = null);
											}
											break t;
										}
								}
								(ce = 0), (Wt = null), Li(e, t, a, 5);
								break;
							case 6:
								(ce = 0), (Wt = null), Li(e, t, a, 6);
								break;
							case 8:
								ch(), (Oe = 6);
								break e;
							default:
								throw Error(I(462));
						}
					}
					D3();
					break;
				} catch (d) {
					lT(e, d);
				}
			while (!0);
			return (
				(jo = Sa = null),
				(q.H = o),
				(q.A = r),
				(ae = n),
				ee !== null ? 0 : ((he = null), (te = 0), uf(), Oe)
			);
		}
		function D3() {
			for (; ee !== null && !rI(); ) fT(ee);
		}
		function fT(e) {
			var t = V2(e.alternate, e, qo);
			(e.memoizedProps = e.pendingProps), t === null ? yf(e) : (ee = t);
		}
		function AS(e) {
			var t = e,
				n = t.alternate;
			switch (t.tag) {
				case 15:
				case 0:
					t = yS(n, t, t.pendingProps, t.type, void 0, te);
					break;
				case 11:
					t = yS(n, t, t.pendingProps, t.type.render, t.ref, te);
					break;
				case 5:
					Kb(t);
				default:
					U2(n, t), (t = ee = Ux(t, qo)), (t = V2(n, t, qo));
			}
			(e.memoizedProps = e.pendingProps), t === null ? yf(e) : (ee = t);
		}
		function Li(e, t, n, o) {
			(jo = Sa = null), Kb(t), (Mi = null), (Dl = 0);
			var r = t.return;
			try {
				if (T3(e, r, t, n, te)) {
					(Oe = 1), Fd(e, wn(n, e.current)), (ee = null);
					return;
				}
			} catch (a) {
				if (r !== null) throw ((ee = r), a);
				(Oe = 1), Fd(e, wn(n, e.current)), (ee = null);
				return;
			}
			t.flags & 32768
				? (ne || o === 1
						? (e = !0)
						: es || (te & 536870912) !== 0
							? (e = !1)
							: ((gr = e = !0),
								(o === 2 || o === 9 || o === 3 || o === 6) &&
									((o = ln.current),
									o !== null && o.tag === 13 && (o.flags |= 16384))),
					mT(t, e))
				: yf(t);
		}
		function yf(e) {
			var t = e;
			do {
				if ((t.flags & 32768) !== 0) {
					mT(t, gr);
					return;
				}
				e = t.return;
				var n = A3(t.alternate, t, qo);
				if (n !== null) {
					ee = n;
					return;
				}
				if (((t = t.sibling), t !== null)) {
					ee = t;
					return;
				}
				ee = t = e;
			} while (t !== null);
			Oe === 0 && (Oe = 5);
		}
		function mT(e, t) {
			do {
				var n = R3(e.alternate, e);
				if (n !== null) {
					(n.flags &= 32767), (ee = n);
					return;
				}
				if (
					((n = e.return),
					n !== null &&
						((n.flags |= 32768), (n.subtreeFlags = 0), (n.deletions = null)),
					!t && ((e = e.sibling), e !== null))
				) {
					ee = e;
					return;
				}
				ee = e = n;
			} while (e !== null);
			(Oe = 6), (ee = null);
		}
		function RS(e, t, n, o, r, a, i, s, l) {
			e.cancelPendingCommit = null;
			do Cf();
			while (ot !== 0);
			if ((ae & 6) !== 0) throw Error(I(327));
			if (t !== null) {
				if (t === e.current) throw Error(I(177));
				if (
					((a = t.lanes | t.childLanes),
					(a |= Bb),
					pI(e, n, a, i, s, l),
					e === he && ((ee = he = null), (te = 0)),
					(Yi = t),
					(Tr = e),
					(Uo = n),
					(lb = a),
					(cb = r),
					(aT = o),
					(t.subtreeFlags & 10256) !== 0 || (t.flags & 10256) !== 0
						? ((e.callbackNode = null),
							(e.callbackPriority = 0),
							V3(Od, function () {
								return vT(), null;
							}))
						: ((e.callbackNode = null), (e.callbackPriority = 0)),
					(o = (t.flags & 13878) !== 0),
					(t.subtreeFlags & 13878) !== 0 || o)
				) {
					(o = q.T), (q.T = null), (r = ie.p), (ie.p = 2), (i = ae), (ae |= 4);
					try {
						E3(e, t, n);
					} finally {
						(ae = i), (ie.p = r), (q.T = o);
					}
				}
				(ot = 1), pT(), gT(), bT();
			}
		}
		function pT() {
			if (ot === 1) {
				ot = 0;
				var e = Tr,
					t = Yi,
					n = (t.flags & 13878) !== 0;
				if ((t.subtreeFlags & 13878) !== 0 || n) {
					(n = q.T), (q.T = null);
					var o = ie.p;
					ie.p = 2;
					var r = ae;
					ae |= 4;
					try {
						J2(t, e);
						var a = pb,
							i = _x(e.containerInfo),
							s = a.focusedElem,
							l = a.selectionRange;
						if (
							i !== s &&
							s &&
							s.ownerDocument &&
							Lx(s.ownerDocument.documentElement, s)
						) {
							if (l !== null && Ob(s)) {
								var u = l.start,
									d = l.end;
								if ((d === void 0 && (d = u), 'selectionStart' in s))
									(s.selectionStart = u),
										(s.selectionEnd = Math.min(d, s.value.length));
								else {
									var f = s.ownerDocument || document,
										c = (f && f.defaultView) || window;
									if (c.getSelection) {
										var p = c.getSelection(),
											v = s.textContent.length,
											C = Math.min(l.start, v),
											y = l.end === void 0 ? C : Math.min(l.end, v);
										!p.extend && C > y && ((i = y), (y = C), (C = i));
										var b = Q5(s, C),
											g = Q5(s, y);
										if (
											b &&
											g &&
											(p.rangeCount !== 1 ||
												p.anchorNode !== b.node ||
												p.anchorOffset !== b.offset ||
												p.focusNode !== g.node ||
												p.focusOffset !== g.offset)
										) {
											var m = f.createRange();
											m.setStart(b.node, b.offset),
												p.removeAllRanges(),
												C > y
													? (p.addRange(m), p.extend(g.node, g.offset))
													: (m.setEnd(g.node, g.offset), p.addRange(m));
										}
									}
								}
							}
							for (f = [], p = s; (p = p.parentNode); )
								p.nodeType === 1 &&
									f.push({ element: p, left: p.scrollLeft, top: p.scrollTop });
							for (
								typeof s.focus == 'function' && s.focus(), s = 0;
								s < f.length;
								s++
							) {
								var h = f[s];
								(h.element.scrollLeft = h.left), (h.element.scrollTop = h.top);
							}
						}
						(of = !!mb), (pb = mb = null);
					} finally {
						(ae = r), (ie.p = o), (q.T = n);
					}
				}
				(e.current = t), (ot = 2);
			}
		}
		function gT() {
			if (ot === 2) {
				ot = 0;
				var e = Tr,
					t = Yi,
					n = (t.flags & 8772) !== 0;
				if ((t.subtreeFlags & 8772) !== 0 || n) {
					(n = q.T), (q.T = null);
					var o = ie.p;
					ie.p = 2;
					var r = ae;
					ae |= 4;
					try {
						Y2(e, t.alternate, t);
					} finally {
						(ae = r), (ie.p = o), (q.T = n);
					}
				}
				ot = 3;
			}
		}
		function bT() {
			if (ot === 4 || ot === 3) {
				(ot = 0), aI();
				var e = Tr,
					t = Yi,
					n = Uo,
					o = aT;
				(t.subtreeFlags & 10256) !== 0 || (t.flags & 10256) !== 0
					? (ot = 5)
					: ((ot = 0), (Yi = Tr = null), hT(e, e.pendingLanes));
				var r = e.pendingLanes;
				if (
					(r === 0 && (xr = null),
					Ab(n),
					(t = t.stateNode),
					on && typeof on.onCommitFiberRoot == 'function')
				)
					try {
						on.onCommitFiberRoot(
							Fl,
							t,
							void 0,
							(t.current.flags & 128) === 128
						);
					} catch {}
				if (o !== null) {
					(t = q.T), (r = ie.p), (ie.p = 2), (q.T = null);
					try {
						for (var a = e.onRecoverableError, i = 0; i < o.length; i++) {
							var s = o[i];
							a(s.value, { componentStack: s.stack });
						}
					} finally {
						(q.T = t), (ie.p = r);
					}
				}
				(Uo & 3) !== 0 && Cf(),
					po(e),
					(r = e.pendingLanes),
					(n & 261930) !== 0 && (r & 42) !== 0
						? e === ub
							? Rl++
							: ((Rl = 0), (ub = e))
						: (Rl = 0),
					Wl(0, !1);
			}
		}
		function hT(e, t) {
			(e.pooledCacheLanes &= t) === 0 &&
				((t = e.pooledCache), t != null && ((e.pooledCache = null), Ql(t)));
		}
		function Cf() {
			return pT(), gT(), bT(), vT();
		}
		function vT() {
			if (ot !== 5) return !1;
			var e = Tr,
				t = lb;
			lb = 0;
			var n = Ab(Uo),
				o = q.T,
				r = ie.p;
			try {
				(ie.p = 32 > n ? 32 : n), (q.T = null), (n = cb), (cb = null);
				var a = Tr,
					i = Uo;
				if (((ot = 0), (Yi = Tr = null), (Uo = 0), (ae & 6) !== 0))
					throw Error(I(331));
				var s = ae;
				if (
					((ae |= 4),
					nT(a.current),
					$2(a, a.current, i, n),
					(ae = s),
					Wl(0, !1),
					on && typeof on.onPostCommitFiberRoot == 'function')
				)
					try {
						on.onPostCommitFiberRoot(Fl, a);
					} catch {}
				return !0;
			} finally {
				(ie.p = r), (q.T = o), hT(e, t);
			}
		}
		function ES(e, t, n) {
			(t = wn(n, t)),
				(t = ob(e.stateNode, t, 2)),
				(e = Sr(e, t, 2)),
				e !== null && (Yl(e, 2), po(e));
		}
		function ue(e, t, n) {
			if (e.tag === 3) ES(e, e, n);
			else
				for (; t !== null; ) {
					if (t.tag === 3) {
						ES(t, e, n);
						break;
					} else if (t.tag === 1) {
						var o = t.stateNode;
						if (
							typeof t.type.getDerivedStateFromError == 'function' ||
							(typeof o.componentDidCatch == 'function' &&
								(xr === null || !xr.has(o)))
						) {
							(e = wn(n, e)),
								(n = O2(2)),
								(o = Sr(t, n, 2)),
								o !== null && (B2(n, o, t, e), Yl(o, 2), po(o));
							break;
						}
					}
					t = t.return;
				}
		}
		function Sg(e, t, n) {
			var o = e.pingCache;
			if (o === null) {
				o = e.pingCache = new L3();
				var r = new Set();
				o.set(t, r);
			} else (r = o.get(t)), r === void 0 && ((r = new Set()), o.set(t, r));
			r.has(n) ||
				((sh = !0), r.add(n), (e = M3.bind(null, e, t, n)), t.then(e, e));
		}
		function M3(e, t, n) {
			var o = e.pingCache;
			o !== null && o.delete(t),
				(e.pingedLanes |= e.suspendedLanes & n),
				(e.warmLanes &= ~n),
				he === e &&
					(te & n) === n &&
					(Oe === 4 || (Oe === 3 && (te & 62914560) === te && 300 > nn() - hf)
						? (ae & 2) === 0 && Xi(e, 0)
						: (lh |= n),
					qi === te && (qi = 0)),
				po(e);
		}
		function yT(e, t) {
			t === 0 && (t = ux()), (e = Ca(e, t)), e !== null && (Yl(e, t), po(e));
		}
		function j3(e) {
			var t = e.memoizedState,
				n = 0;
			t !== null && (n = t.retryLane), yT(e, n);
		}
		function z3(e, t) {
			var n = 0;
			switch (e.tag) {
				case 31:
				case 13:
					var o = e.stateNode,
						r = e.memoizedState;
					r !== null && (n = r.retryLane);
					break;
				case 19:
					o = e.stateNode;
					break;
				case 22:
					o = e.stateNode._retryCache;
					break;
				default:
					throw Error(I(314));
			}
			o !== null && o.delete(t), yT(e, n);
		}
		function V3(e, t) {
			return kb(e, t);
		}
		var Zd = null,
			yi = null,
			db = !1,
			Jd = !1,
			xg = !1,
			hr = 0;
		function po(e) {
			e !== yi &&
				e.next === null &&
				(yi === null ? (Zd = yi = e) : (yi = yi.next = e)),
				(Jd = !0),
				db || ((db = !0), H3());
		}
		function Wl(e, t) {
			if (!xg && Jd) {
				xg = !0;
				do
					for (var n = !1, o = Zd; o !== null; ) {
						if (!t)
							if (e !== 0) {
								var r = o.pendingLanes;
								if (r === 0) var a = 0;
								else {
									var i = o.suspendedLanes,
										s = o.pingedLanes;
									(a = (1 << (31 - rn(42 | e) + 1)) - 1),
										(a &= r & ~(i & ~s)),
										(a = a & 201326741 ? (a & 201326741) | 1 : a ? a | 2 : 0);
								}
								a !== 0 && ((n = !0), IS(o, a));
							} else
								(a = te),
									(a = af(
										o,
										o === he ? a : 0,
										o.cancelPendingCommit !== null || o.timeoutHandle !== -1
									)),
									(a & 3) === 0 || ql(o, a) || ((n = !0), IS(o, a));
						o = o.next;
					}
				while (n);
				xg = !1;
			}
		}
		function U3() {
			CT();
		}
		function CT() {
			Jd = db = !1;
			var e = 0;
			hr !== 0 && Q3() && (e = hr);
			for (var t = nn(), n = null, o = Zd; o !== null; ) {
				var r = o.next,
					a = ST(o, t);
				a === 0
					? ((o.next = null),
						n === null ? (Zd = r) : (n.next = r),
						r === null && (yi = n))
					: ((n = o), (e !== 0 || (a & 3) !== 0) && (Jd = !0)),
					(o = r);
			}
			(ot !== 0 && ot !== 5) || Wl(e, !1), hr !== 0 && (hr = 0);
		}
		function ST(e, t) {
			for (
				var n = e.suspendedLanes,
					o = e.pingedLanes,
					r = e.expirationTimes,
					a = e.pendingLanes & -62914561;
				0 < a;
			) {
				var i = 31 - rn(a),
					s = 1 << i,
					l = r[i];
				l === -1
					? ((s & n) === 0 || (s & o) !== 0) && (r[i] = mI(s, t))
					: l <= t && (e.expiredLanes |= s),
					(a &= ~s);
			}
			if (
				((t = he),
				(n = te),
				(n = af(
					e,
					e === t ? n : 0,
					e.cancelPendingCommit !== null || e.timeoutHandle !== -1
				)),
				(o = e.callbackNode),
				n === 0 ||
					(e === t && (ce === 2 || ce === 9)) ||
					e.cancelPendingCommit !== null)
			)
				return (
					o !== null && o !== null && Jp(o),
					(e.callbackNode = null),
					(e.callbackPriority = 0)
				);
			if ((n & 3) === 0 || ql(e, n)) {
				if (((t = n & -n), t === e.callbackPriority)) return t;
				switch ((o !== null && Jp(o), Ab(n))) {
					case 2:
					case 8:
						n = lx;
						break;
					case 32:
						n = Od;
						break;
					case 268435456:
						n = cx;
						break;
					default:
						n = Od;
				}
				return (
					(o = xT.bind(null, e)),
					(n = kb(n, o)),
					(e.callbackPriority = t),
					(e.callbackNode = n),
					t
				);
			}
			return (
				o !== null && o !== null && Jp(o),
				(e.callbackPriority = 2),
				(e.callbackNode = null),
				2
			);
		}
		function xT(e, t) {
			if (ot !== 0 && ot !== 5)
				return (e.callbackNode = null), (e.callbackPriority = 0), null;
			var n = e.callbackNode;
			if (Cf() && e.callbackNode !== n) return null;
			var o = te;
			return (
				(o = af(
					e,
					e === he ? o : 0,
					e.cancelPendingCommit !== null || e.timeoutHandle !== -1
				)),
				o === 0
					? null
					: (sT(e, o, t),
						ST(e, nn()),
						e.callbackNode != null && e.callbackNode === n
							? xT.bind(null, e)
							: null)
			);
		}
		function IS(e, t) {
			if (Cf()) return null;
			sT(e, t, !0);
		}
		function H3() {
			J3(function () {
				(ae & 6) !== 0 ? kb(sx, U3) : CT();
			});
		}
		function uh() {
			if (hr === 0) {
				var e = Pi;
				e === 0 && ((e = Wu), (Wu <<= 1), (Wu & 261888) === 0 && (Wu = 256)),
					(hr = e);
			}
			return hr;
		}
		function NS(e) {
			return e == null || typeof e == 'symbol' || typeof e == 'boolean'
				? null
				: typeof e == 'function'
					? e
					: bd('' + e);
		}
		function LS(e, t) {
			var n = t.ownerDocument.createElement('input');
			return (
				(n.name = t.name),
				(n.value = t.value),
				e.id && n.setAttribute('form', e.id),
				t.parentNode.insertBefore(n, t),
				(e = new FormData(e)),
				n.parentNode.removeChild(n),
				e
			);
		}
		function P3(e, t, n, o, r) {
			if (t === 'submit' && n && n.stateNode === r) {
				var a = NS((r[Gt] || null).action),
					i = o.submitter;
				i &&
					((t = (t = i[Gt] || null)
						? NS(t.formAction)
						: i.getAttribute('formAction')),
					t !== null && ((a = t), (i = null)));
				var s = new sf('action', 'action', null, o, r);
				e.push({
					event: s,
					listeners: [
						{
							instance: null,
							listener: function () {
								if (o.defaultPrevented) {
									if (hr !== 0) {
										var l = i ? LS(r, i) : new FormData(r);
										tb(
											n,
											{ pending: !0, data: l, method: r.method, action: a },
											null,
											l
										);
									}
								} else
									typeof a == 'function' &&
										(s.preventDefault(),
										(l = i ? LS(r, i) : new FormData(r)),
										tb(
											n,
											{ pending: !0, data: l, method: r.method, action: a },
											a,
											l
										));
							},
							currentTarget: r,
						},
					],
				});
			}
		}
		for (ud = 0; ud < Gg.length; ud++)
			(dd = Gg[ud]),
				(_S = dd.toLowerCase()),
				(OS = dd[0].toUpperCase() + dd.slice(1)),
				Fn(_S, 'on' + OS);
		var dd, _S, OS, ud;
		Fn(Bx, 'onAnimationEnd');
		Fn(Dx, 'onAnimationIteration');
		Fn(Mx, 'onAnimationStart');
		Fn('dblclick', 'onDoubleClick');
		Fn('focusin', 'onFocus');
		Fn('focusout', 'onBlur');
		Fn(i3, 'onTransitionRun');
		Fn(s3, 'onTransitionStart');
		Fn(l3, 'onTransitionCancel');
		Fn(jx, 'onTransitionEnd');
		Ui('onMouseEnter', ['mouseout', 'mouseover']);
		Ui('onMouseLeave', ['mouseout', 'mouseover']);
		Ui('onPointerEnter', ['pointerout', 'pointerover']);
		Ui('onPointerLeave', ['pointerout', 'pointerover']);
		ha(
			'onChange',
			'change click focusin focusout input keydown keyup selectionchange'.split(
				' '
			)
		);
		ha(
			'onSelect',
			'focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange'.split(
				' '
			)
		);
		ha('onBeforeInput', ['compositionend', 'keypress', 'textInput', 'paste']);
		ha(
			'onCompositionEnd',
			'compositionend focusout keydown keypress keyup mousedown'.split(' ')
		);
		ha(
			'onCompositionStart',
			'compositionstart focusout keydown keypress keyup mousedown'.split(' ')
		);
		ha(
			'onCompositionUpdate',
			'compositionupdate focusout keydown keypress keyup mousedown'.split(' ')
		);
		var zl =
				'abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting'.split(
					' '
				),
			G3 = new Set(
				'beforetoggle cancel close invalid load scroll scrollend toggle'
					.split(' ')
					.concat(zl)
			);
		function TT(e, t) {
			t = (t & 4) !== 0;
			for (var n = 0; n < e.length; n++) {
				var o = e[n],
					r = o.event;
				o = o.listeners;
				e: {
					var a = void 0;
					if (t)
						for (var i = o.length - 1; 0 <= i; i--) {
							var s = o[i],
								l = s.instance,
								u = s.currentTarget;
							if (((s = s.listener), l !== a && r.isPropagationStopped()))
								break e;
							(a = s), (r.currentTarget = u);
							try {
								a(r);
							} catch (d) {
								Dd(d);
							}
							(r.currentTarget = null), (a = l);
						}
					else
						for (i = 0; i < o.length; i++) {
							if (
								((s = o[i]),
								(l = s.instance),
								(u = s.currentTarget),
								(s = s.listener),
								l !== a && r.isPropagationStopped())
							)
								break e;
							(a = s), (r.currentTarget = u);
							try {
								a(r);
							} catch (d) {
								Dd(d);
							}
							(r.currentTarget = null), (a = l);
						}
				}
			}
		}
		function $(e, t) {
			var n = t[Dg];
			n === void 0 && (n = t[Dg] = new Set());
			var o = e + '__bubble';
			n.has(o) || (kT(t, e, 2, !1), n.add(o));
		}
		function Tg(e, t, n) {
			var o = 0;
			t && (o |= 4), kT(n, e, o, t);
		}
		var fd = '_reactListening' + Math.random().toString(36).slice(2);
		function dh(e) {
			if (!e[fd]) {
				(e[fd] = !0),
					gx.forEach(function (n) {
						n !== 'selectionchange' &&
							(G3.has(n) || Tg(n, !1, e), Tg(n, !0, e));
					});
				var t = e.nodeType === 9 ? e : e.ownerDocument;
				t === null || t[fd] || ((t[fd] = !0), Tg('selectionchange', !1, t));
			}
		}
		function kT(e, t, n, o) {
			switch (jT(t)) {
				case 2:
					var r = hN;
					break;
				case 8:
					r = vN;
					break;
				default:
					r = gh;
			}
			(n = r.bind(null, t, n, e)),
				(r = void 0),
				!Ug ||
					(t !== 'touchstart' && t !== 'touchmove' && t !== 'wheel') ||
					(r = !0),
				o
					? r !== void 0
						? e.addEventListener(t, n, { capture: !0, passive: r })
						: e.addEventListener(t, n, !0)
					: r !== void 0
						? e.addEventListener(t, n, { passive: r })
						: e.addEventListener(t, n, !1);
		}
		function kg(e, t, n, o, r) {
			var a = o;
			if ((t & 1) === 0 && (t & 2) === 0 && o !== null)
				e: for (;;) {
					if (o === null) return;
					var i = o.tag;
					if (i === 3 || i === 4) {
						var s = o.stateNode.containerInfo;
						if (s === r) break;
						if (i === 4)
							for (i = o.return; i !== null; ) {
								var l = i.tag;
								if ((l === 3 || l === 4) && i.stateNode.containerInfo === r)
									return;
								i = i.return;
							}
						for (; s !== null; ) {
							if (((i = xi(s)), i === null)) return;
							if (((l = i.tag), l === 5 || l === 6 || l === 26 || l === 27)) {
								o = a = i;
								continue e;
							}
							s = s.parentNode;
						}
					}
					o = o.return;
				}
			Tx(function () {
				var u = a,
					d = Ib(n),
					f = [];
				e: {
					var c = zx.get(e);
					if (c !== void 0) {
						var p = sf,
							v = e;
						switch (e) {
							case 'keypress':
								if (vd(n) === 0) break e;
							case 'keydown':
							case 'keyup':
								p = zI;
								break;
							case 'focusin':
								(v = 'focus'), (p = ng);
								break;
							case 'focusout':
								(v = 'blur'), (p = ng);
								break;
							case 'beforeblur':
							case 'afterblur':
								p = ng;
								break;
							case 'click':
								if (n.button === 2) break e;
							case 'auxclick':
							case 'dblclick':
							case 'mousedown':
							case 'mousemove':
							case 'mouseup':
							case 'mouseout':
							case 'mouseover':
							case 'contextmenu':
								p = U5;
								break;
							case 'drag':
							case 'dragend':
							case 'dragenter':
							case 'dragexit':
							case 'dragleave':
							case 'dragover':
							case 'dragstart':
							case 'drop':
								p = AI;
								break;
							case 'touchcancel':
							case 'touchend':
							case 'touchmove':
							case 'touchstart':
								p = HI;
								break;
							case Bx:
							case Dx:
							case Mx:
								p = II;
								break;
							case jx:
								p = GI;
								break;
							case 'scroll':
							case 'scrollend':
								p = kI;
								break;
							case 'wheel':
								p = qI;
								break;
							case 'copy':
							case 'cut':
							case 'paste':
								p = LI;
								break;
							case 'gotpointercapture':
							case 'lostpointercapture':
							case 'pointercancel':
							case 'pointerdown':
							case 'pointermove':
							case 'pointerout':
							case 'pointerover':
							case 'pointerup':
								p = P5;
								break;
							case 'toggle':
							case 'beforetoggle':
								p = XI;
						}
						var C = (t & 4) !== 0,
							y = !C && (e === 'scroll' || e === 'scrollend'),
							b = C ? (c !== null ? c + 'Capture' : null) : c;
						C = [];
						for (var g = u, m; g !== null; ) {
							var h = g;
							if (
								((m = h.stateNode),
								(h = h.tag),
								(h !== 5 && h !== 26 && h !== 27) ||
									m === null ||
									b === null ||
									((h = Nl(g, b)), h != null && C.push(Vl(g, h, m))),
								y)
							)
								break;
							g = g.return;
						}
						0 < C.length &&
							((c = new p(c, v, null, n, d)),
							f.push({ event: c, listeners: C }));
					}
				}
				if ((t & 7) === 0) {
					e: {
						if (
							((c = e === 'mouseover' || e === 'pointerover'),
							(p = e === 'mouseout' || e === 'pointerout'),
							c &&
								n !== Vg &&
								(v = n.relatedTarget || n.fromElement) &&
								(xi(v) || v[Zi]))
						)
							break e;
						if (
							(p || c) &&
							((c =
								d.window === d
									? d
									: (c = d.ownerDocument)
										? c.defaultView || c.parentWindow
										: window),
							p
								? ((v = n.relatedTarget || n.toElement),
									(p = u),
									(v = v ? xi(v) : null),
									v !== null &&
										((y = Gl(v)),
										(C = v.tag),
										v !== y || (C !== 5 && C !== 27 && C !== 6)) &&
										(v = null))
								: ((p = null), (v = u)),
							p !== v)
						) {
							if (
								((C = U5),
								(h = 'onMouseLeave'),
								(b = 'onMouseEnter'),
								(g = 'mouse'),
								(e === 'pointerout' || e === 'pointerover') &&
									((C = P5),
									(h = 'onPointerLeave'),
									(b = 'onPointerEnter'),
									(g = 'pointer')),
								(y = p == null ? c : ml(p)),
								(m = v == null ? c : ml(v)),
								(c = new C(h, g + 'leave', p, n, d)),
								(c.target = y),
								(c.relatedTarget = m),
								(h = null),
								xi(d) === u &&
									((C = new C(b, g + 'enter', v, n, d)),
									(C.target = m),
									(C.relatedTarget = y),
									(h = C)),
								(y = h),
								p && v)
							)
								t: {
									for (C = F3, b = p, g = v, m = 0, h = b; h; h = C(h)) m++;
									h = 0;
									for (var k = g; k; k = C(k)) h++;
									for (; 0 < m - h; ) (b = C(b)), m--;
									for (; 0 < h - m; ) (g = C(g)), h--;
									for (; m--; ) {
										if (b === g || (g !== null && b === g.alternate)) {
											C = b;
											break t;
										}
										(b = C(b)), (g = C(g));
									}
									C = null;
								}
							else C = null;
							p !== null && BS(f, c, p, C, !1),
								v !== null && y !== null && BS(f, y, v, C, !0);
						}
					}
					e: {
						if (
							((c = u ? ml(u) : window),
							(p = c.nodeName && c.nodeName.toLowerCase()),
							p === 'select' || (p === 'input' && c.type === 'file'))
						)
							var A = Y5;
						else if (q5(c))
							if (Ix) A = o3;
							else {
								A = t3;
								var x = e3;
							}
						else
							(p = c.nodeName),
								!p ||
								p.toLowerCase() !== 'input' ||
								(c.type !== 'checkbox' && c.type !== 'radio')
									? u && Eb(u.elementType) && (A = Y5)
									: (A = n3);
						if (A && (A = A(e, u))) {
							Ex(f, A, n, d);
							break e;
						}
						x && x(e, c, u),
							e === 'focusout' &&
								u &&
								c.type === 'number' &&
								u.memoizedProps.value != null &&
								zg(c, 'number', c.value);
					}
					switch (((x = u ? ml(u) : window), e)) {
						case 'focusin':
							(q5(x) || x.contentEditable === 'true') &&
								((wi = x), (Hg = u), (vl = null));
							break;
						case 'focusout':
							vl = Hg = wi = null;
							break;
						case 'mousedown':
							Pg = !0;
							break;
						case 'contextmenu':
						case 'mouseup':
						case 'dragend':
							(Pg = !1), Z5(f, n, d);
							break;
						case 'selectionchange':
							if (a3) break;
						case 'keydown':
						case 'keyup':
							Z5(f, n, d);
					}
					var L;
					if (_b)
						e: {
							switch (e) {
								case 'compositionstart':
									var _ = 'onCompositionStart';
									break e;
								case 'compositionend':
									_ = 'onCompositionEnd';
									break e;
								case 'compositionupdate':
									_ = 'onCompositionUpdate';
									break e;
							}
							_ = void 0;
						}
					else
						ki
							? Ax(e, n) && (_ = 'onCompositionEnd')
							: e === 'keydown' &&
								n.keyCode === 229 &&
								(_ = 'onCompositionStart');
					_ &&
						(wx &&
							n.locale !== 'ko' &&
							(ki || _ !== 'onCompositionStart'
								? _ === 'onCompositionEnd' && ki && (L = kx())
								: ((pr = d),
									(Nb = 'value' in pr ? pr.value : pr.textContent),
									(ki = !0))),
						(x = Wd(u, _)),
						0 < x.length &&
							((_ = new H5(_, e, null, n, d)),
							f.push({ event: _, listeners: x }),
							L ? (_.data = L) : ((L = Rx(n)), L !== null && (_.data = L)))),
						(L = QI ? ZI(e, n) : JI(e, n)) &&
							((_ = Wd(u, 'onBeforeInput')),
							0 < _.length &&
								((x = new H5('onBeforeInput', 'beforeinput', null, n, d)),
								f.push({ event: x, listeners: _ }),
								(x.data = L))),
						P3(f, e, u, n, d);
				}
				TT(f, t);
			});
		}
		function Vl(e, t, n) {
			return { instance: e, listener: t, currentTarget: n };
		}
		function Wd(e, t) {
			for (var n = t + 'Capture', o = []; e !== null; ) {
				var r = e,
					a = r.stateNode;
				if (
					((r = r.tag),
					(r !== 5 && r !== 26 && r !== 27) ||
						a === null ||
						((r = Nl(e, n)),
						r != null && o.unshift(Vl(e, r, a)),
						(r = Nl(e, t)),
						r != null && o.push(Vl(e, r, a))),
					e.tag === 3)
				)
					return o;
				e = e.return;
			}
			return [];
		}
		function F3(e) {
			if (e === null) return null;
			do e = e.return;
			while (e && e.tag !== 5 && e.tag !== 27);
			return e || null;
		}
		function BS(e, t, n, o, r) {
			for (var a = t._reactName, i = []; n !== null && n !== o; ) {
				var s = n,
					l = s.alternate,
					u = s.stateNode;
				if (((s = s.tag), l !== null && l === o)) break;
				(s !== 5 && s !== 26 && s !== 27) ||
					u === null ||
					((l = u),
					r
						? ((u = Nl(n, a)), u != null && i.unshift(Vl(n, u, l)))
						: r || ((u = Nl(n, a)), u != null && i.push(Vl(n, u, l)))),
					(n = n.return);
			}
			i.length !== 0 && e.push({ event: t, listeners: i });
		}
		var q3 = /\r\n?/g,
			Y3 = /\u0000|\uFFFD/g;
		function DS(e) {
			return (typeof e == 'string' ? e : '' + e)
				.replace(
					q3,
					`
`
				)
				.replace(Y3, '');
		}
		function wT(e, t) {
			return (t = DS(t)), DS(e) === t;
		}
		function me(e, t, n, o, r, a) {
			switch (n) {
				case 'children':
					typeof o == 'string'
						? t === 'body' || (t === 'textarea' && o === '') || Hi(e, o)
						: (typeof o == 'number' || typeof o == 'bigint') &&
							t !== 'body' &&
							Hi(e, '' + o);
					break;
				case 'className':
					td(e, 'class', o);
					break;
				case 'tabIndex':
					td(e, 'tabindex', o);
					break;
				case 'dir':
				case 'role':
				case 'viewBox':
				case 'width':
				case 'height':
					td(e, n, o);
					break;
				case 'style':
					xx(e, o, a);
					break;
				case 'data':
					if (t !== 'object') {
						td(e, 'data', o);
						break;
					}
				case 'src':
				case 'href':
					if (o === '' && (t !== 'a' || n !== 'href')) {
						e.removeAttribute(n);
						break;
					}
					if (
						o == null ||
						typeof o == 'function' ||
						typeof o == 'symbol' ||
						typeof o == 'boolean'
					) {
						e.removeAttribute(n);
						break;
					}
					(o = bd('' + o)), e.setAttribute(n, o);
					break;
				case 'action':
				case 'formAction':
					if (typeof o == 'function') {
						e.setAttribute(
							n,
							"javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')"
						);
						break;
					} else
						typeof a == 'function' &&
							(n === 'formAction'
								? (t !== 'input' && me(e, t, 'name', r.name, r, null),
									me(e, t, 'formEncType', r.formEncType, r, null),
									me(e, t, 'formMethod', r.formMethod, r, null),
									me(e, t, 'formTarget', r.formTarget, r, null))
								: (me(e, t, 'encType', r.encType, r, null),
									me(e, t, 'method', r.method, r, null),
									me(e, t, 'target', r.target, r, null)));
					if (o == null || typeof o == 'symbol' || typeof o == 'boolean') {
						e.removeAttribute(n);
						break;
					}
					(o = bd('' + o)), e.setAttribute(n, o);
					break;
				case 'onClick':
					o != null && (e.onclick = Mo);
					break;
				case 'onScroll':
					o != null && $('scroll', e);
					break;
				case 'onScrollEnd':
					o != null && $('scrollend', e);
					break;
				case 'dangerouslySetInnerHTML':
					if (o != null) {
						if (typeof o != 'object' || !('__html' in o)) throw Error(I(61));
						if (((n = o.__html), n != null)) {
							if (r.children != null) throw Error(I(60));
							e.innerHTML = n;
						}
					}
					break;
				case 'multiple':
					e.multiple = o && typeof o != 'function' && typeof o != 'symbol';
					break;
				case 'muted':
					e.muted = o && typeof o != 'function' && typeof o != 'symbol';
					break;
				case 'suppressContentEditableWarning':
				case 'suppressHydrationWarning':
				case 'defaultValue':
				case 'defaultChecked':
				case 'innerHTML':
				case 'ref':
					break;
				case 'autoFocus':
					break;
				case 'xlinkHref':
					if (
						o == null ||
						typeof o == 'function' ||
						typeof o == 'boolean' ||
						typeof o == 'symbol'
					) {
						e.removeAttribute('xlink:href');
						break;
					}
					(n = bd('' + o)),
						e.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', n);
					break;
				case 'contentEditable':
				case 'spellCheck':
				case 'draggable':
				case 'value':
				case 'autoReverse':
				case 'externalResourcesRequired':
				case 'focusable':
				case 'preserveAlpha':
					o != null && typeof o != 'function' && typeof o != 'symbol'
						? e.setAttribute(n, '' + o)
						: e.removeAttribute(n);
					break;
				case 'inert':
				case 'allowFullScreen':
				case 'async':
				case 'autoPlay':
				case 'controls':
				case 'default':
				case 'defer':
				case 'disabled':
				case 'disablePictureInPicture':
				case 'disableRemotePlayback':
				case 'formNoValidate':
				case 'hidden':
				case 'loop':
				case 'noModule':
				case 'noValidate':
				case 'open':
				case 'playsInline':
				case 'readOnly':
				case 'required':
				case 'reversed':
				case 'scoped':
				case 'seamless':
				case 'itemScope':
					o && typeof o != 'function' && typeof o != 'symbol'
						? e.setAttribute(n, '')
						: e.removeAttribute(n);
					break;
				case 'capture':
				case 'download':
					o === !0
						? e.setAttribute(n, '')
						: o !== !1 &&
								o != null &&
								typeof o != 'function' &&
								typeof o != 'symbol'
							? e.setAttribute(n, o)
							: e.removeAttribute(n);
					break;
				case 'cols':
				case 'rows':
				case 'size':
				case 'span':
					o != null &&
					typeof o != 'function' &&
					typeof o != 'symbol' &&
					!isNaN(o) &&
					1 <= o
						? e.setAttribute(n, o)
						: e.removeAttribute(n);
					break;
				case 'rowSpan':
				case 'start':
					o == null ||
					typeof o == 'function' ||
					typeof o == 'symbol' ||
					isNaN(o)
						? e.removeAttribute(n)
						: e.setAttribute(n, o);
					break;
				case 'popover':
					$('beforetoggle', e), $('toggle', e), gd(e, 'popover', o);
					break;
				case 'xlinkActuate':
					Eo(e, 'http://www.w3.org/1999/xlink', 'xlink:actuate', o);
					break;
				case 'xlinkArcrole':
					Eo(e, 'http://www.w3.org/1999/xlink', 'xlink:arcrole', o);
					break;
				case 'xlinkRole':
					Eo(e, 'http://www.w3.org/1999/xlink', 'xlink:role', o);
					break;
				case 'xlinkShow':
					Eo(e, 'http://www.w3.org/1999/xlink', 'xlink:show', o);
					break;
				case 'xlinkTitle':
					Eo(e, 'http://www.w3.org/1999/xlink', 'xlink:title', o);
					break;
				case 'xlinkType':
					Eo(e, 'http://www.w3.org/1999/xlink', 'xlink:type', o);
					break;
				case 'xmlBase':
					Eo(e, 'http://www.w3.org/XML/1998/namespace', 'xml:base', o);
					break;
				case 'xmlLang':
					Eo(e, 'http://www.w3.org/XML/1998/namespace', 'xml:lang', o);
					break;
				case 'xmlSpace':
					Eo(e, 'http://www.w3.org/XML/1998/namespace', 'xml:space', o);
					break;
				case 'is':
					gd(e, 'is', o);
					break;
				case 'innerText':
				case 'textContent':
					break;
				default:
					(!(2 < n.length) ||
						(n[0] !== 'o' && n[0] !== 'O') ||
						(n[1] !== 'n' && n[1] !== 'N')) &&
						((n = xI.get(n) || n), gd(e, n, o));
			}
		}
		function fb(e, t, n, o, r, a) {
			switch (n) {
				case 'style':
					xx(e, o, a);
					break;
				case 'dangerouslySetInnerHTML':
					if (o != null) {
						if (typeof o != 'object' || !('__html' in o)) throw Error(I(61));
						if (((n = o.__html), n != null)) {
							if (r.children != null) throw Error(I(60));
							e.innerHTML = n;
						}
					}
					break;
				case 'children':
					typeof o == 'string'
						? Hi(e, o)
						: (typeof o == 'number' || typeof o == 'bigint') && Hi(e, '' + o);
					break;
				case 'onScroll':
					o != null && $('scroll', e);
					break;
				case 'onScrollEnd':
					o != null && $('scrollend', e);
					break;
				case 'onClick':
					o != null && (e.onclick = Mo);
					break;
				case 'suppressContentEditableWarning':
				case 'suppressHydrationWarning':
				case 'innerHTML':
				case 'ref':
					break;
				case 'innerText':
				case 'textContent':
					break;
				default:
					if (!bx.hasOwnProperty(n))
						e: {
							if (
								n[0] === 'o' &&
								n[1] === 'n' &&
								((r = n.endsWith('Capture')),
								(t = n.slice(2, r ? n.length - 7 : void 0)),
								(a = e[Gt] || null),
								(a = a != null ? a[n] : null),
								typeof a == 'function' && e.removeEventListener(t, a, r),
								typeof o == 'function')
							) {
								typeof a != 'function' &&
									a !== null &&
									(n in e
										? (e[n] = null)
										: e.hasAttribute(n) && e.removeAttribute(n)),
									e.addEventListener(t, o, r);
								break e;
							}
							n in e
								? (e[n] = o)
								: o === !0
									? e.setAttribute(n, '')
									: gd(e, n, o);
						}
			}
		}
		function yt(e, t, n) {
			switch (t) {
				case 'div':
				case 'span':
				case 'svg':
				case 'path':
				case 'a':
				case 'g':
				case 'p':
				case 'li':
					break;
				case 'img':
					$('error', e), $('load', e);
					var o = !1,
						r = !1,
						a;
					for (a in n)
						if (n.hasOwnProperty(a)) {
							var i = n[a];
							if (i != null)
								switch (a) {
									case 'src':
										o = !0;
										break;
									case 'srcSet':
										r = !0;
										break;
									case 'children':
									case 'dangerouslySetInnerHTML':
										throw Error(I(137, t));
									default:
										me(e, t, a, i, n, null);
								}
						}
					r && me(e, t, 'srcSet', n.srcSet, n, null),
						o && me(e, t, 'src', n.src, n, null);
					return;
				case 'input':
					$('invalid', e);
					var s = (a = i = r = null),
						l = null,
						u = null;
					for (o in n)
						if (n.hasOwnProperty(o)) {
							var d = n[o];
							if (d != null)
								switch (o) {
									case 'name':
										r = d;
										break;
									case 'type':
										i = d;
										break;
									case 'checked':
										l = d;
										break;
									case 'defaultChecked':
										u = d;
										break;
									case 'value':
										a = d;
										break;
									case 'defaultValue':
										s = d;
										break;
									case 'children':
									case 'dangerouslySetInnerHTML':
										if (d != null) throw Error(I(137, t));
										break;
									default:
										me(e, t, o, d, n, null);
								}
						}
					yx(e, a, s, l, u, i, r, !1);
					return;
				case 'select':
					$('invalid', e), (o = i = a = null);
					for (r in n)
						if (n.hasOwnProperty(r) && ((s = n[r]), s != null))
							switch (r) {
								case 'value':
									a = s;
									break;
								case 'defaultValue':
									i = s;
									break;
								case 'multiple':
									o = s;
								default:
									me(e, t, r, s, n, null);
							}
					(t = a),
						(n = i),
						(e.multiple = !!o),
						t != null ? Oi(e, !!o, t, !1) : n != null && Oi(e, !!o, n, !0);
					return;
				case 'textarea':
					$('invalid', e), (a = r = o = null);
					for (i in n)
						if (n.hasOwnProperty(i) && ((s = n[i]), s != null))
							switch (i) {
								case 'value':
									o = s;
									break;
								case 'defaultValue':
									r = s;
									break;
								case 'children':
									a = s;
									break;
								case 'dangerouslySetInnerHTML':
									if (s != null) throw Error(I(91));
									break;
								default:
									me(e, t, i, s, n, null);
							}
					Sx(e, o, r, a);
					return;
				case 'option':
					for (l in n)
						n.hasOwnProperty(l) &&
							((o = n[l]), o != null) &&
							(l === 'selected'
								? (e.selected =
										o && typeof o != 'function' && typeof o != 'symbol')
								: me(e, t, l, o, n, null));
					return;
				case 'dialog':
					$('beforetoggle', e), $('toggle', e), $('cancel', e), $('close', e);
					break;
				case 'iframe':
				case 'object':
					$('load', e);
					break;
				case 'video':
				case 'audio':
					for (o = 0; o < zl.length; o++) $(zl[o], e);
					break;
				case 'image':
					$('error', e), $('load', e);
					break;
				case 'details':
					$('toggle', e);
					break;
				case 'embed':
				case 'source':
				case 'link':
					$('error', e), $('load', e);
				case 'area':
				case 'base':
				case 'br':
				case 'col':
				case 'hr':
				case 'keygen':
				case 'meta':
				case 'param':
				case 'track':
				case 'wbr':
				case 'menuitem':
					for (u in n)
						if (n.hasOwnProperty(u) && ((o = n[u]), o != null))
							switch (u) {
								case 'children':
								case 'dangerouslySetInnerHTML':
									throw Error(I(137, t));
								default:
									me(e, t, u, o, n, null);
							}
					return;
				default:
					if (Eb(t)) {
						for (d in n)
							n.hasOwnProperty(d) &&
								((o = n[d]), o !== void 0 && fb(e, t, d, o, n, void 0));
						return;
					}
			}
			for (s in n)
				n.hasOwnProperty(s) &&
					((o = n[s]), o != null && me(e, t, s, o, n, null));
		}
		function X3(e, t, n, o) {
			switch (t) {
				case 'div':
				case 'span':
				case 'svg':
				case 'path':
				case 'a':
				case 'g':
				case 'p':
				case 'li':
					break;
				case 'input':
					var r = null,
						a = null,
						i = null,
						s = null,
						l = null,
						u = null,
						d = null;
					for (p in n) {
						var f = n[p];
						if (n.hasOwnProperty(p) && f != null)
							switch (p) {
								case 'checked':
									break;
								case 'value':
									break;
								case 'defaultValue':
									l = f;
								default:
									o.hasOwnProperty(p) || me(e, t, p, null, o, f);
							}
					}
					for (var c in o) {
						var p = o[c];
						if (((f = n[c]), o.hasOwnProperty(c) && (p != null || f != null)))
							switch (c) {
								case 'type':
									a = p;
									break;
								case 'name':
									r = p;
									break;
								case 'checked':
									u = p;
									break;
								case 'defaultChecked':
									d = p;
									break;
								case 'value':
									i = p;
									break;
								case 'defaultValue':
									s = p;
									break;
								case 'children':
								case 'dangerouslySetInnerHTML':
									if (p != null) throw Error(I(137, t));
									break;
								default:
									p !== f && me(e, t, c, p, o, f);
							}
					}
					jg(e, i, s, l, u, d, a, r);
					return;
				case 'select':
					p = i = s = c = null;
					for (a in n)
						if (((l = n[a]), n.hasOwnProperty(a) && l != null))
							switch (a) {
								case 'value':
									break;
								case 'multiple':
									p = l;
								default:
									o.hasOwnProperty(a) || me(e, t, a, null, o, l);
							}
					for (r in o)
						if (
							((a = o[r]),
							(l = n[r]),
							o.hasOwnProperty(r) && (a != null || l != null))
						)
							switch (r) {
								case 'value':
									c = a;
									break;
								case 'defaultValue':
									s = a;
									break;
								case 'multiple':
									i = a;
								default:
									a !== l && me(e, t, r, a, o, l);
							}
					(t = s),
						(n = i),
						(o = p),
						c != null
							? Oi(e, !!n, c, !1)
							: !!o != !!n &&
								(t != null ? Oi(e, !!n, t, !0) : Oi(e, !!n, n ? [] : '', !1));
					return;
				case 'textarea':
					p = c = null;
					for (s in n)
						if (
							((r = n[s]),
							n.hasOwnProperty(s) && r != null && !o.hasOwnProperty(s))
						)
							switch (s) {
								case 'value':
									break;
								case 'children':
									break;
								default:
									me(e, t, s, null, o, r);
							}
					for (i in o)
						if (
							((r = o[i]),
							(a = n[i]),
							o.hasOwnProperty(i) && (r != null || a != null))
						)
							switch (i) {
								case 'value':
									c = r;
									break;
								case 'defaultValue':
									p = r;
									break;
								case 'children':
									break;
								case 'dangerouslySetInnerHTML':
									if (r != null) throw Error(I(91));
									break;
								default:
									r !== a && me(e, t, i, r, o, a);
							}
					Cx(e, c, p);
					return;
				case 'option':
					for (var v in n)
						(c = n[v]),
							n.hasOwnProperty(v) &&
								c != null &&
								!o.hasOwnProperty(v) &&
								(v === 'selected'
									? (e.selected = !1)
									: me(e, t, v, null, o, c));
					for (l in o)
						(c = o[l]),
							(p = n[l]),
							o.hasOwnProperty(l) &&
								c !== p &&
								(c != null || p != null) &&
								(l === 'selected'
									? (e.selected =
											c && typeof c != 'function' && typeof c != 'symbol')
									: me(e, t, l, c, o, p));
					return;
				case 'img':
				case 'link':
				case 'area':
				case 'base':
				case 'br':
				case 'col':
				case 'embed':
				case 'hr':
				case 'keygen':
				case 'meta':
				case 'param':
				case 'source':
				case 'track':
				case 'wbr':
				case 'menuitem':
					for (var C in n)
						(c = n[C]),
							n.hasOwnProperty(C) &&
								c != null &&
								!o.hasOwnProperty(C) &&
								me(e, t, C, null, o, c);
					for (u in o)
						if (
							((c = o[u]),
							(p = n[u]),
							o.hasOwnProperty(u) && c !== p && (c != null || p != null))
						)
							switch (u) {
								case 'children':
								case 'dangerouslySetInnerHTML':
									if (c != null) throw Error(I(137, t));
									break;
								default:
									me(e, t, u, c, o, p);
							}
					return;
				default:
					if (Eb(t)) {
						for (var y in n)
							(c = n[y]),
								n.hasOwnProperty(y) &&
									c !== void 0 &&
									!o.hasOwnProperty(y) &&
									fb(e, t, y, void 0, o, c);
						for (d in o)
							(c = o[d]),
								(p = n[d]),
								!o.hasOwnProperty(d) ||
									c === p ||
									(c === void 0 && p === void 0) ||
									fb(e, t, d, c, o, p);
						return;
					}
			}
			for (var b in n)
				(c = n[b]),
					n.hasOwnProperty(b) &&
						c != null &&
						!o.hasOwnProperty(b) &&
						me(e, t, b, null, o, c);
			for (f in o)
				(c = o[f]),
					(p = n[f]),
					!o.hasOwnProperty(f) ||
						c === p ||
						(c == null && p == null) ||
						me(e, t, f, c, o, p);
		}
		function MS(e) {
			switch (e) {
				case 'css':
				case 'script':
				case 'font':
				case 'img':
				case 'image':
				case 'input':
				case 'link':
					return !0;
				default:
					return !1;
			}
		}
		function K3() {
			if (typeof performance.getEntriesByType == 'function') {
				for (
					var e = 0, t = 0, n = performance.getEntriesByType('resource'), o = 0;
					o < n.length;
					o++
				) {
					var r = n[o],
						a = r.transferSize,
						i = r.initiatorType,
						s = r.duration;
					if (a && s && MS(i)) {
						for (i = 0, s = r.responseEnd, o += 1; o < n.length; o++) {
							var l = n[o],
								u = l.startTime;
							if (u > s) break;
							var d = l.transferSize,
								f = l.initiatorType;
							d &&
								MS(f) &&
								((l = l.responseEnd),
								(i += d * (l < s ? 1 : (s - u) / (l - u))));
						}
						if ((--o, (t += (8 * (a + i)) / (r.duration / 1e3)), e++, 10 < e))
							break;
					}
				}
				if (0 < e) return t / e / 1e6;
			}
			return navigator.connection &&
				((e = navigator.connection.downlink), typeof e == 'number')
				? e
				: 5;
		}
		var mb = null,
			pb = null;
		function $d(e) {
			return e.nodeType === 9 ? e : e.ownerDocument;
		}
		function jS(e) {
			switch (e) {
				case 'http://www.w3.org/2000/svg':
					return 1;
				case 'http://www.w3.org/1998/Math/MathML':
					return 2;
				default:
					return 0;
			}
		}
		function AT(e, t) {
			if (e === 0)
				switch (t) {
					case 'svg':
						return 1;
					case 'math':
						return 2;
					default:
						return 0;
				}
			return e === 1 && t === 'foreignObject' ? 0 : e;
		}
		function gb(e, t) {
			return (
				e === 'textarea' ||
				e === 'noscript' ||
				typeof t.children == 'string' ||
				typeof t.children == 'number' ||
				typeof t.children == 'bigint' ||
				(typeof t.dangerouslySetInnerHTML == 'object' &&
					t.dangerouslySetInnerHTML !== null &&
					t.dangerouslySetInnerHTML.__html != null)
			);
		}
		var wg = null;
		function Q3() {
			var e = window.event;
			return e && e.type === 'popstate'
				? e === wg
					? !1
					: ((wg = e), !0)
				: ((wg = null), !1);
		}
		var RT = typeof setTimeout == 'function' ? setTimeout : void 0,
			Z3 = typeof clearTimeout == 'function' ? clearTimeout : void 0,
			zS = typeof Promise == 'function' ? Promise : void 0,
			J3 =
				typeof queueMicrotask == 'function'
					? queueMicrotask
					: typeof zS < 'u'
						? function (e) {
								return zS.resolve(null).then(e).catch(W3);
							}
						: RT;
		function W3(e) {
			setTimeout(function () {
				throw e;
			});
		}
		function _r(e) {
			return e === 'head';
		}
		function VS(e, t) {
			var n = t,
				o = 0;
			do {
				var r = n.nextSibling;
				if ((e.removeChild(n), r && r.nodeType === 8))
					if (((n = r.data), n === '/$' || n === '/&')) {
						if (o === 0) {
							e.removeChild(r), Qi(t);
							return;
						}
						o--;
					} else if (
						n === '$' ||
						n === '$?' ||
						n === '$~' ||
						n === '$!' ||
						n === '&'
					)
						o++;
					else if (n === 'html') El(e.ownerDocument.documentElement);
					else if (n === 'head') {
						(n = e.ownerDocument.head), El(n);
						for (var a = n.firstChild; a; ) {
							var i = a.nextSibling,
								s = a.nodeName;
							a[Xl] ||
								s === 'SCRIPT' ||
								s === 'STYLE' ||
								(s === 'LINK' && a.rel.toLowerCase() === 'stylesheet') ||
								n.removeChild(a),
								(a = i);
						}
					} else n === 'body' && El(e.ownerDocument.body);
				n = r;
			} while (n);
			Qi(t);
		}
		function US(e, t) {
			var n = e;
			e = 0;
			do {
				var o = n.nextSibling;
				if (
					(n.nodeType === 1
						? t
							? ((n._stashedDisplay = n.style.display),
								(n.style.display = 'none'))
							: ((n.style.display = n._stashedDisplay || ''),
								n.getAttribute('style') === '' && n.removeAttribute('style'))
						: n.nodeType === 3 &&
							(t
								? ((n._stashedText = n.nodeValue), (n.nodeValue = ''))
								: (n.nodeValue = n._stashedText || '')),
					o && o.nodeType === 8)
				)
					if (((n = o.data), n === '/$')) {
						if (e === 0) break;
						e--;
					} else (n !== '$' && n !== '$?' && n !== '$~' && n !== '$!') || e++;
				n = o;
			} while (n);
		}
		function bb(e) {
			var t = e.firstChild;
			for (t && t.nodeType === 10 && (t = t.nextSibling); t; ) {
				var n = t;
				switch (((t = t.nextSibling), n.nodeName)) {
					case 'HTML':
					case 'HEAD':
					case 'BODY':
						bb(n), Rb(n);
						continue;
					case 'SCRIPT':
					case 'STYLE':
						continue;
					case 'LINK':
						if (n.rel.toLowerCase() === 'stylesheet') continue;
				}
				e.removeChild(n);
			}
		}
		function $3(e, t, n, o) {
			for (; e.nodeType === 1; ) {
				var r = n;
				if (e.nodeName.toLowerCase() !== t.toLowerCase()) {
					if (!o && (e.nodeName !== 'INPUT' || e.type !== 'hidden')) break;
				} else if (o) {
					if (!e[Xl])
						switch (t) {
							case 'meta':
								if (!e.hasAttribute('itemprop')) break;
								return e;
							case 'link':
								if (
									((a = e.getAttribute('rel')),
									a === 'stylesheet' && e.hasAttribute('data-precedence'))
								)
									break;
								if (
									a !== r.rel ||
									e.getAttribute('href') !==
										(r.href == null || r.href === '' ? null : r.href) ||
									e.getAttribute('crossorigin') !==
										(r.crossOrigin == null ? null : r.crossOrigin) ||
									e.getAttribute('title') !== (r.title == null ? null : r.title)
								)
									break;
								return e;
							case 'style':
								if (e.hasAttribute('data-precedence')) break;
								return e;
							case 'script':
								if (
									((a = e.getAttribute('src')),
									(a !== (r.src == null ? null : r.src) ||
										e.getAttribute('type') !==
											(r.type == null ? null : r.type) ||
										e.getAttribute('crossorigin') !==
											(r.crossOrigin == null ? null : r.crossOrigin)) &&
										a &&
										e.hasAttribute('async') &&
										!e.hasAttribute('itemprop'))
								)
									break;
								return e;
							default:
								return e;
						}
				} else if (t === 'input' && e.type === 'hidden') {
					var a = r.name == null ? null : '' + r.name;
					if (r.type === 'hidden' && e.getAttribute('name') === a) return e;
				} else return e;
				if (((e = En(e.nextSibling)), e === null)) break;
			}
			return null;
		}
		function eN(e, t, n) {
			if (t === '') return null;
			for (; e.nodeType !== 3; )
				if (
					((e.nodeType !== 1 ||
						e.nodeName !== 'INPUT' ||
						e.type !== 'hidden') &&
						!n) ||
					((e = En(e.nextSibling)), e === null)
				)
					return null;
			return e;
		}
		function ET(e, t) {
			for (; e.nodeType !== 8; )
				if (
					((e.nodeType !== 1 ||
						e.nodeName !== 'INPUT' ||
						e.type !== 'hidden') &&
						!t) ||
					((e = En(e.nextSibling)), e === null)
				)
					return null;
			return e;
		}
		function hb(e) {
			return e.data === '$?' || e.data === '$~';
		}
		function vb(e) {
			return (
				e.data === '$!' ||
				(e.data === '$?' && e.ownerDocument.readyState !== 'loading')
			);
		}
		function tN(e, t) {
			var n = e.ownerDocument;
			if (e.data === '$~') e._reactRetry = t;
			else if (e.data !== '$?' || n.readyState !== 'loading') t();
			else {
				var o = function () {
					t(), n.removeEventListener('DOMContentLoaded', o);
				};
				n.addEventListener('DOMContentLoaded', o), (e._reactRetry = o);
			}
		}
		function En(e) {
			for (; e != null; e = e.nextSibling) {
				var t = e.nodeType;
				if (t === 1 || t === 3) break;
				if (t === 8) {
					if (
						((t = e.data),
						t === '$' ||
							t === '$!' ||
							t === '$?' ||
							t === '$~' ||
							t === '&' ||
							t === 'F!' ||
							t === 'F')
					)
						break;
					if (t === '/$' || t === '/&') return null;
				}
			}
			return e;
		}
		var yb = null;
		function HS(e) {
			e = e.nextSibling;
			for (var t = 0; e; ) {
				if (e.nodeType === 8) {
					var n = e.data;
					if (n === '/$' || n === '/&') {
						if (t === 0) return En(e.nextSibling);
						t--;
					} else
						(n !== '$' &&
							n !== '$!' &&
							n !== '$?' &&
							n !== '$~' &&
							n !== '&') ||
							t++;
				}
				e = e.nextSibling;
			}
			return null;
		}
		function PS(e) {
			e = e.previousSibling;
			for (var t = 0; e; ) {
				if (e.nodeType === 8) {
					var n = e.data;
					if (
						n === '$' ||
						n === '$!' ||
						n === '$?' ||
						n === '$~' ||
						n === '&'
					) {
						if (t === 0) return e;
						t--;
					} else (n !== '/$' && n !== '/&') || t++;
				}
				e = e.previousSibling;
			}
			return null;
		}
		function IT(e, t, n) {
			switch (((t = $d(n)), e)) {
				case 'html':
					if (((e = t.documentElement), !e)) throw Error(I(452));
					return e;
				case 'head':
					if (((e = t.head), !e)) throw Error(I(453));
					return e;
				case 'body':
					if (((e = t.body), !e)) throw Error(I(454));
					return e;
				default:
					throw Error(I(451));
			}
		}
		function El(e) {
			for (var t = e.attributes; t.length; ) e.removeAttributeNode(t[0]);
			Rb(e);
		}
		var In = new Map(),
			GS = new Set();
		function ef(e) {
			return typeof e.getRootNode == 'function'
				? e.getRootNode()
				: e.nodeType === 9
					? e
					: e.ownerDocument;
		}
		var Yo = ie.d;
		ie.d = { f: nN, r: oN, D: rN, C: aN, L: iN, m: sN, X: cN, S: lN, M: uN };
		function nN() {
			var e = Yo.f(),
				t = vf();
			return e || t;
		}
		function oN(e) {
			var t = Ji(e);
			t !== null && t.tag === 5 && t.type === 'form' ? x2(t) : Yo.r(e);
		}
		var ts = typeof document > 'u' ? null : document;
		function NT(e, t, n) {
			var o = ts;
			if (o && typeof t == 'string' && t) {
				var r = kn(t);
				(r = 'link[rel="' + e + '"][href="' + r + '"]'),
					typeof n == 'string' && (r += '[crossorigin="' + n + '"]'),
					GS.has(r) ||
						(GS.add(r),
						(e = { rel: e, crossOrigin: n, href: t }),
						o.querySelector(r) === null &&
							((t = o.createElement('link')),
							yt(t, 'link', e),
							ct(t),
							o.head.appendChild(t)));
			}
		}
		function rN(e) {
			Yo.D(e), NT('dns-prefetch', e, null);
		}
		function aN(e, t) {
			Yo.C(e, t), NT('preconnect', e, t);
		}
		function iN(e, t, n) {
			Yo.L(e, t, n);
			var o = ts;
			if (o && e && t) {
				var r = 'link[rel="preload"][as="' + kn(t) + '"]';
				t === 'image' && n && n.imageSrcSet
					? ((r += '[imagesrcset="' + kn(n.imageSrcSet) + '"]'),
						typeof n.imageSizes == 'string' &&
							(r += '[imagesizes="' + kn(n.imageSizes) + '"]'))
					: (r += '[href="' + kn(e) + '"]');
				var a = r;
				switch (t) {
					case 'style':
						a = Ki(e);
						break;
					case 'script':
						a = ns(e);
				}
				In.has(a) ||
					((e = Te(
						{
							rel: 'preload',
							href: t === 'image' && n && n.imageSrcSet ? void 0 : e,
							as: t,
						},
						n
					)),
					In.set(a, e),
					o.querySelector(r) !== null ||
						(t === 'style' && o.querySelector($l(a))) ||
						(t === 'script' && o.querySelector(ec(a))) ||
						((t = o.createElement('link')),
						yt(t, 'link', e),
						ct(t),
						o.head.appendChild(t)));
			}
		}
		function sN(e, t) {
			Yo.m(e, t);
			var n = ts;
			if (n && e) {
				var o = t && typeof t.as == 'string' ? t.as : 'script',
					r =
						'link[rel="modulepreload"][as="' +
						kn(o) +
						'"][href="' +
						kn(e) +
						'"]',
					a = r;
				switch (o) {
					case 'audioworklet':
					case 'paintworklet':
					case 'serviceworker':
					case 'sharedworker':
					case 'worker':
					case 'script':
						a = ns(e);
				}
				if (
					!In.has(a) &&
					((e = Te({ rel: 'modulepreload', href: e }, t)),
					In.set(a, e),
					n.querySelector(r) === null)
				) {
					switch (o) {
						case 'audioworklet':
						case 'paintworklet':
						case 'serviceworker':
						case 'sharedworker':
						case 'worker':
						case 'script':
							if (n.querySelector(ec(a))) return;
					}
					(o = n.createElement('link')),
						yt(o, 'link', e),
						ct(o),
						n.head.appendChild(o);
				}
			}
		}
		function lN(e, t, n) {
			Yo.S(e, t, n);
			var o = ts;
			if (o && e) {
				var r = _i(o).hoistableStyles,
					a = Ki(e);
				t = t || 'default';
				var i = r.get(a);
				if (!i) {
					var s = { loading: 0, preload: null };
					if ((i = o.querySelector($l(a)))) s.loading = 5;
					else {
						(e = Te({ rel: 'stylesheet', href: e, 'data-precedence': t }, n)),
							(n = In.get(a)) && fh(e, n);
						var l = (i = o.createElement('link'));
						ct(l),
							yt(l, 'link', e),
							(l._p = new Promise(function (u, d) {
								(l.onload = u), (l.onerror = d);
							})),
							l.addEventListener('load', function () {
								s.loading |= 1;
							}),
							l.addEventListener('error', function () {
								s.loading |= 2;
							}),
							(s.loading |= 4),
							Ad(i, t, o);
					}
					(i = { type: 'stylesheet', instance: i, count: 1, state: s }),
						r.set(a, i);
				}
			}
		}
		function cN(e, t) {
			Yo.X(e, t);
			var n = ts;
			if (n && e) {
				var o = _i(n).hoistableScripts,
					r = ns(e),
					a = o.get(r);
				a ||
					((a = n.querySelector(ec(r))),
					a ||
						((e = Te({ src: e, async: !0 }, t)),
						(t = In.get(r)) && mh(e, t),
						(a = n.createElement('script')),
						ct(a),
						yt(a, 'link', e),
						n.head.appendChild(a)),
					(a = { type: 'script', instance: a, count: 1, state: null }),
					o.set(r, a));
			}
		}
		function uN(e, t) {
			Yo.M(e, t);
			var n = ts;
			if (n && e) {
				var o = _i(n).hoistableScripts,
					r = ns(e),
					a = o.get(r);
				a ||
					((a = n.querySelector(ec(r))),
					a ||
						((e = Te({ src: e, async: !0, type: 'module' }, t)),
						(t = In.get(r)) && mh(e, t),
						(a = n.createElement('script')),
						ct(a),
						yt(a, 'link', e),
						n.head.appendChild(a)),
					(a = { type: 'script', instance: a, count: 1, state: null }),
					o.set(r, a));
			}
		}
		function FS(e, t, n, o) {
			var r = (r = vr.current) ? ef(r) : null;
			if (!r) throw Error(I(446));
			switch (e) {
				case 'meta':
				case 'title':
					return null;
				case 'style':
					return typeof n.precedence == 'string' && typeof n.href == 'string'
						? ((t = Ki(n.href)),
							(n = _i(r).hoistableStyles),
							(o = n.get(t)),
							o ||
								((o = { type: 'style', instance: null, count: 0, state: null }),
								n.set(t, o)),
							o)
						: { type: 'void', instance: null, count: 0, state: null };
				case 'link':
					if (
						n.rel === 'stylesheet' &&
						typeof n.href == 'string' &&
						typeof n.precedence == 'string'
					) {
						e = Ki(n.href);
						var a = _i(r).hoistableStyles,
							i = a.get(e);
						if (
							(i ||
								((r = r.ownerDocument || r),
								(i = {
									type: 'stylesheet',
									instance: null,
									count: 0,
									state: { loading: 0, preload: null },
								}),
								a.set(e, i),
								(a = r.querySelector($l(e))) &&
									!a._p &&
									((i.instance = a), (i.state.loading = 5)),
								In.has(e) ||
									((n = {
										rel: 'preload',
										as: 'style',
										href: n.href,
										crossOrigin: n.crossOrigin,
										integrity: n.integrity,
										media: n.media,
										hrefLang: n.hrefLang,
										referrerPolicy: n.referrerPolicy,
									}),
									In.set(e, n),
									a || dN(r, e, n, i.state))),
							t && o === null)
						)
							throw Error(I(528, ''));
						return i;
					}
					if (t && o !== null) throw Error(I(529, ''));
					return null;
				case 'script':
					return (
						(t = n.async),
						(n = n.src),
						typeof n == 'string' &&
						t &&
						typeof t != 'function' &&
						typeof t != 'symbol'
							? ((t = ns(n)),
								(n = _i(r).hoistableScripts),
								(o = n.get(t)),
								o ||
									((o = {
										type: 'script',
										instance: null,
										count: 0,
										state: null,
									}),
									n.set(t, o)),
								o)
							: { type: 'void', instance: null, count: 0, state: null }
					);
				default:
					throw Error(I(444, e));
			}
		}
		function Ki(e) {
			return 'href="' + kn(e) + '"';
		}
		function $l(e) {
			return 'link[rel="stylesheet"][' + e + ']';
		}
		function LT(e) {
			return Te({}, e, { 'data-precedence': e.precedence, precedence: null });
		}
		function dN(e, t, n, o) {
			e.querySelector('link[rel="preload"][as="style"][' + t + ']')
				? (o.loading = 1)
				: ((t = e.createElement('link')),
					(o.preload = t),
					t.addEventListener('load', function () {
						return (o.loading |= 1);
					}),
					t.addEventListener('error', function () {
						return (o.loading |= 2);
					}),
					yt(t, 'link', n),
					ct(t),
					e.head.appendChild(t));
		}
		function ns(e) {
			return '[src="' + kn(e) + '"]';
		}
		function ec(e) {
			return 'script[async]' + e;
		}
		function qS(e, t, n) {
			if ((t.count++, t.instance === null))
				switch (t.type) {
					case 'style':
						var o = e.querySelector('style[data-href~="' + kn(n.href) + '"]');
						if (o) return (t.instance = o), ct(o), o;
						var r = Te({}, n, {
							'data-href': n.href,
							'data-precedence': n.precedence,
							href: null,
							precedence: null,
						});
						return (
							(o = (e.ownerDocument || e).createElement('style')),
							ct(o),
							yt(o, 'style', r),
							Ad(o, n.precedence, e),
							(t.instance = o)
						);
					case 'stylesheet':
						r = Ki(n.href);
						var a = e.querySelector($l(r));
						if (a) return (t.state.loading |= 4), (t.instance = a), ct(a), a;
						(o = LT(n)),
							(r = In.get(r)) && fh(o, r),
							(a = (e.ownerDocument || e).createElement('link')),
							ct(a);
						var i = a;
						return (
							(i._p = new Promise(function (s, l) {
								(i.onload = s), (i.onerror = l);
							})),
							yt(a, 'link', o),
							(t.state.loading |= 4),
							Ad(a, n.precedence, e),
							(t.instance = a)
						);
					case 'script':
						return (
							(a = ns(n.src)),
							(r = e.querySelector(ec(a)))
								? ((t.instance = r), ct(r), r)
								: ((o = n),
									(r = In.get(a)) && ((o = Te({}, n)), mh(o, r)),
									(e = e.ownerDocument || e),
									(r = e.createElement('script')),
									ct(r),
									yt(r, 'link', o),
									e.head.appendChild(r),
									(t.instance = r))
						);
					case 'void':
						return null;
					default:
						throw Error(I(443, t.type));
				}
			else
				t.type === 'stylesheet' &&
					(t.state.loading & 4) === 0 &&
					((o = t.instance), (t.state.loading |= 4), Ad(o, n.precedence, e));
			return t.instance;
		}
		function Ad(e, t, n) {
			for (
				var o = n.querySelectorAll(
						'link[rel="stylesheet"][data-precedence],style[data-precedence]'
					),
					r = o.length ? o[o.length - 1] : null,
					a = r,
					i = 0;
				i < o.length;
				i++
			) {
				var s = o[i];
				if (s.dataset.precedence === t) a = s;
				else if (a !== r) break;
			}
			a
				? a.parentNode.insertBefore(e, a.nextSibling)
				: ((t = n.nodeType === 9 ? n.head : n),
					t.insertBefore(e, t.firstChild));
		}
		function fh(e, t) {
			e.crossOrigin == null && (e.crossOrigin = t.crossOrigin),
				e.referrerPolicy == null && (e.referrerPolicy = t.referrerPolicy),
				e.title == null && (e.title = t.title);
		}
		function mh(e, t) {
			e.crossOrigin == null && (e.crossOrigin = t.crossOrigin),
				e.referrerPolicy == null && (e.referrerPolicy = t.referrerPolicy),
				e.integrity == null && (e.integrity = t.integrity);
		}
		var Rd = null;
		function YS(e, t, n) {
			if (Rd === null) {
				var o = new Map(),
					r = (Rd = new Map());
				r.set(n, o);
			} else (r = Rd), (o = r.get(n)), o || ((o = new Map()), r.set(n, o));
			if (o.has(e)) return o;
			for (
				o.set(e, null), n = n.getElementsByTagName(e), r = 0;
				r < n.length;
				r++
			) {
				var a = n[r];
				if (
					!(
						a[Xl] ||
						a[bt] ||
						(e === 'link' && a.getAttribute('rel') === 'stylesheet')
					) &&
					a.namespaceURI !== 'http://www.w3.org/2000/svg'
				) {
					var i = a.getAttribute(t) || '';
					i = e + i;
					var s = o.get(i);
					s ? s.push(a) : o.set(i, [a]);
				}
			}
			return o;
		}
		function XS(e, t, n) {
			(e = e.ownerDocument || e),
				e.head.insertBefore(
					n,
					t === 'title' ? e.querySelector('head > title') : null
				);
		}
		function fN(e, t, n) {
			if (n === 1 || t.itemProp != null) return !1;
			switch (e) {
				case 'meta':
				case 'title':
					return !0;
				case 'style':
					if (
						typeof t.precedence != 'string' ||
						typeof t.href != 'string' ||
						t.href === ''
					)
						break;
					return !0;
				case 'link':
					if (
						typeof t.rel != 'string' ||
						typeof t.href != 'string' ||
						t.href === '' ||
						t.onLoad ||
						t.onError
					)
						break;
					return t.rel === 'stylesheet'
						? ((e = t.disabled), typeof t.precedence == 'string' && e == null)
						: !0;
				case 'script':
					if (
						t.async &&
						typeof t.async != 'function' &&
						typeof t.async != 'symbol' &&
						!t.onLoad &&
						!t.onError &&
						t.src &&
						typeof t.src == 'string'
					)
						return !0;
			}
			return !1;
		}
		function _T(e) {
			return !(e.type === 'stylesheet' && (e.state.loading & 3) === 0);
		}
		function mN(e, t, n, o) {
			if (
				n.type === 'stylesheet' &&
				(typeof o.media != 'string' || matchMedia(o.media).matches !== !1) &&
				(n.state.loading & 4) === 0
			) {
				if (n.instance === null) {
					var r = Ki(o.href),
						a = t.querySelector($l(r));
					if (a) {
						(t = a._p),
							t !== null &&
								typeof t == 'object' &&
								typeof t.then == 'function' &&
								(e.count++, (e = tf.bind(e)), t.then(e, e)),
							(n.state.loading |= 4),
							(n.instance = a),
							ct(a);
						return;
					}
					(a = t.ownerDocument || t),
						(o = LT(o)),
						(r = In.get(r)) && fh(o, r),
						(a = a.createElement('link')),
						ct(a);
					var i = a;
					(i._p = new Promise(function (s, l) {
						(i.onload = s), (i.onerror = l);
					})),
						yt(a, 'link', o),
						(n.instance = a);
				}
				e.stylesheets === null && (e.stylesheets = new Map()),
					e.stylesheets.set(n, t),
					(t = n.state.preload) &&
						(n.state.loading & 3) === 0 &&
						(e.count++,
						(n = tf.bind(e)),
						t.addEventListener('load', n),
						t.addEventListener('error', n));
			}
		}
		var Ag = 0;
		function pN(e, t) {
			return (
				e.stylesheets && e.count === 0 && Ed(e, e.stylesheets),
				0 < e.count || 0 < e.imgCount
					? function (n) {
							var o = setTimeout(function () {
								if ((e.stylesheets && Ed(e, e.stylesheets), e.unsuspend)) {
									var a = e.unsuspend;
									(e.unsuspend = null), a();
								}
							}, 6e4 + t);
							0 < e.imgBytes && Ag === 0 && (Ag = 62500 * K3());
							var r = setTimeout(
								function () {
									if (
										((e.waitingForImages = !1),
										e.count === 0 &&
											(e.stylesheets && Ed(e, e.stylesheets), e.unsuspend))
									) {
										var a = e.unsuspend;
										(e.unsuspend = null), a();
									}
								},
								(e.imgBytes > Ag ? 50 : 800) + t
							);
							return (
								(e.unsuspend = n),
								function () {
									(e.unsuspend = null), clearTimeout(o), clearTimeout(r);
								}
							);
						}
					: null
			);
		}
		function tf() {
			if (
				(this.count--,
				this.count === 0 && (this.imgCount === 0 || !this.waitingForImages))
			) {
				if (this.stylesheets) Ed(this, this.stylesheets);
				else if (this.unsuspend) {
					var e = this.unsuspend;
					(this.unsuspend = null), e();
				}
			}
		}
		var nf = null;
		function Ed(e, t) {
			(e.stylesheets = null),
				e.unsuspend !== null &&
					(e.count++,
					(nf = new Map()),
					t.forEach(gN, e),
					(nf = null),
					tf.call(e));
		}
		function gN(e, t) {
			if (!(t.state.loading & 4)) {
				var n = nf.get(e);
				if (n) var o = n.get(null);
				else {
					(n = new Map()), nf.set(e, n);
					for (
						var r = e.querySelectorAll(
								'link[data-precedence],style[data-precedence]'
							),
							a = 0;
						a < r.length;
						a++
					) {
						var i = r[a];
						(i.nodeName === 'LINK' || i.getAttribute('media') !== 'not all') &&
							(n.set(i.dataset.precedence, i), (o = i));
					}
					o && n.set(null, o);
				}
				(r = t.instance),
					(i = r.getAttribute('data-precedence')),
					(a = n.get(i) || o),
					a === o && n.set(null, r),
					n.set(i, r),
					this.count++,
					(o = tf.bind(this)),
					r.addEventListener('load', o),
					r.addEventListener('error', o),
					a
						? a.parentNode.insertBefore(r, a.nextSibling)
						: ((e = e.nodeType === 9 ? e.head : e),
							e.insertBefore(r, e.firstChild)),
					(t.state.loading |= 4);
			}
		}
		var Ul = {
			$$typeof: Do,
			Provider: null,
			Consumer: null,
			_currentValue: sa,
			_currentValue2: sa,
			_threadCount: 0,
		};
		function bN(e, t, n, o, r, a, i, s, l) {
			(this.tag = 1),
				(this.containerInfo = e),
				(this.pingCache = this.current = this.pendingChildren = null),
				(this.timeoutHandle = -1),
				(this.callbackNode =
					this.next =
					this.pendingContext =
					this.context =
					this.cancelPendingCommit =
						null),
				(this.callbackPriority = 0),
				(this.expirationTimes = Wp(-1)),
				(this.entangledLanes =
					this.shellSuspendCounter =
					this.errorRecoveryDisabledLanes =
					this.expiredLanes =
					this.warmLanes =
					this.pingedLanes =
					this.suspendedLanes =
					this.pendingLanes =
						0),
				(this.entanglements = Wp(0)),
				(this.hiddenUpdates = Wp(null)),
				(this.identifierPrefix = o),
				(this.onUncaughtError = r),
				(this.onCaughtError = a),
				(this.onRecoverableError = i),
				(this.pooledCache = null),
				(this.pooledCacheLanes = 0),
				(this.formState = l),
				(this.incompleteTransitions = new Map());
		}
		function OT(e, t, n, o, r, a, i, s, l, u, d, f) {
			return (
				(e = new bN(e, t, n, i, l, u, d, f, s)),
				(t = 1),
				a === !0 && (t |= 24),
				(a = en(3, null, null, t)),
				(e.current = a),
				(a.stateNode = e),
				(t = Vb()),
				t.refCount++,
				(e.pooledCache = t),
				t.refCount++,
				(a.memoizedState = { element: o, isDehydrated: n, cache: t }),
				Pb(a),
				e
			);
		}
		function BT(e) {
			return e ? ((e = Ei), e) : Ei;
		}
		function DT(e, t, n, o, r, a) {
			(r = BT(r)),
				o.context === null ? (o.context = r) : (o.pendingContext = r),
				(o = Cr(t)),
				(o.payload = { element: n }),
				(a = a === void 0 ? null : a),
				a !== null && (o.callback = a),
				(n = Sr(e, o, t)),
				n !== null && (Pt(n, e, t), Cl(n, e, t));
		}
		function KS(e, t) {
			if (((e = e.memoizedState), e !== null && e.dehydrated !== null)) {
				var n = e.retryLane;
				e.retryLane = n !== 0 && n < t ? n : t;
			}
		}
		function ph(e, t) {
			KS(e, t), (e = e.alternate) && KS(e, t);
		}
		function MT(e) {
			if (e.tag === 13 || e.tag === 31) {
				var t = Ca(e, 67108864);
				t !== null && Pt(t, e, 67108864), ph(e, 67108864);
			}
		}
		function QS(e) {
			if (e.tag === 13 || e.tag === 31) {
				var t = an();
				t = wb(t);
				var n = Ca(e, t);
				n !== null && Pt(n, e, t), ph(e, t);
			}
		}
		var of = !0;
		function hN(e, t, n, o) {
			var r = q.T;
			q.T = null;
			var a = ie.p;
			try {
				(ie.p = 2), gh(e, t, n, o);
			} finally {
				(ie.p = a), (q.T = r);
			}
		}
		function vN(e, t, n, o) {
			var r = q.T;
			q.T = null;
			var a = ie.p;
			try {
				(ie.p = 8), gh(e, t, n, o);
			} finally {
				(ie.p = a), (q.T = r);
			}
		}
		function gh(e, t, n, o) {
			if (of) {
				var r = Cb(o);
				if (r === null) kg(e, t, o, rf, n), ZS(e, o);
				else if (CN(r, e, t, n, o)) o.stopPropagation();
				else if ((ZS(e, o), t & 4 && -1 < yN.indexOf(e))) {
					for (; r !== null; ) {
						var a = Ji(r);
						if (a !== null)
							switch (a.tag) {
								case 3:
									if (
										((a = a.stateNode), a.current.memoizedState.isDehydrated)
									) {
										var i = ra(a.pendingLanes);
										if (i !== 0) {
											var s = a;
											for (s.pendingLanes |= 2, s.entangledLanes |= 2; i; ) {
												var l = 1 << (31 - rn(i));
												(s.entanglements[1] |= l), (i &= ~l);
											}
											po(a), (ae & 6) === 0 && ((Xd = nn() + 500), Wl(0, !1));
										}
									}
									break;
								case 31:
								case 13:
									(s = Ca(a, 2)), s !== null && Pt(s, a, 2), vf(), ph(a, 2);
							}
						if (((a = Cb(o)), a === null && kg(e, t, o, rf, n), a === r)) break;
						r = a;
					}
					r !== null && o.stopPropagation();
				} else kg(e, t, o, null, n);
			}
		}
		function Cb(e) {
			return (e = Ib(e)), bh(e);
		}
		var rf = null;
		function bh(e) {
			if (((rf = null), (e = xi(e)), e !== null)) {
				var t = Gl(e);
				if (t === null) e = null;
				else {
					var n = t.tag;
					if (n === 13) {
						if (((e = nx(t)), e !== null)) return e;
						e = null;
					} else if (n === 31) {
						if (((e = ox(t)), e !== null)) return e;
						e = null;
					} else if (n === 3) {
						if (t.stateNode.current.memoizedState.isDehydrated)
							return t.tag === 3 ? t.stateNode.containerInfo : null;
						e = null;
					} else t !== e && (e = null);
				}
			}
			return (rf = e), null;
		}
		function jT(e) {
			switch (e) {
				case 'beforetoggle':
				case 'cancel':
				case 'click':
				case 'close':
				case 'contextmenu':
				case 'copy':
				case 'cut':
				case 'auxclick':
				case 'dblclick':
				case 'dragend':
				case 'dragstart':
				case 'drop':
				case 'focusin':
				case 'focusout':
				case 'input':
				case 'invalid':
				case 'keydown':
				case 'keypress':
				case 'keyup':
				case 'mousedown':
				case 'mouseup':
				case 'paste':
				case 'pause':
				case 'play':
				case 'pointercancel':
				case 'pointerdown':
				case 'pointerup':
				case 'ratechange':
				case 'reset':
				case 'resize':
				case 'seeked':
				case 'submit':
				case 'toggle':
				case 'touchcancel':
				case 'touchend':
				case 'touchstart':
				case 'volumechange':
				case 'change':
				case 'selectionchange':
				case 'textInput':
				case 'compositionstart':
				case 'compositionend':
				case 'compositionupdate':
				case 'beforeblur':
				case 'afterblur':
				case 'beforeinput':
				case 'blur':
				case 'fullscreenchange':
				case 'focus':
				case 'hashchange':
				case 'popstate':
				case 'select':
				case 'selectstart':
					return 2;
				case 'drag':
				case 'dragenter':
				case 'dragexit':
				case 'dragleave':
				case 'dragover':
				case 'mousemove':
				case 'mouseout':
				case 'mouseover':
				case 'pointermove':
				case 'pointerout':
				case 'pointerover':
				case 'scroll':
				case 'touchmove':
				case 'wheel':
				case 'mouseenter':
				case 'mouseleave':
				case 'pointerenter':
				case 'pointerleave':
					return 8;
				case 'message':
					switch (iI()) {
						case sx:
							return 2;
						case lx:
							return 8;
						case Od:
						case sI:
							return 32;
						case cx:
							return 268435456;
						default:
							return 32;
					}
				default:
					return 32;
			}
		}
		var Sb = !1,
			kr = null,
			wr = null,
			Ar = null,
			Hl = new Map(),
			Pl = new Map(),
			fr = [],
			yN =
				'mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset'.split(
					' '
				);
		function ZS(e, t) {
			switch (e) {
				case 'focusin':
				case 'focusout':
					kr = null;
					break;
				case 'dragenter':
				case 'dragleave':
					wr = null;
					break;
				case 'mouseover':
				case 'mouseout':
					Ar = null;
					break;
				case 'pointerover':
				case 'pointerout':
					Hl.delete(t.pointerId);
					break;
				case 'gotpointercapture':
				case 'lostpointercapture':
					Pl.delete(t.pointerId);
			}
		}
		function cl(e, t, n, o, r, a) {
			return e === null || e.nativeEvent !== a
				? ((e = {
						blockedOn: t,
						domEventName: n,
						eventSystemFlags: o,
						nativeEvent: a,
						targetContainers: [r],
					}),
					t !== null && ((t = Ji(t)), t !== null && MT(t)),
					e)
				: ((e.eventSystemFlags |= o),
					(t = e.targetContainers),
					r !== null && t.indexOf(r) === -1 && t.push(r),
					e);
		}
		function CN(e, t, n, o, r) {
			switch (t) {
				case 'focusin':
					return (kr = cl(kr, e, t, n, o, r)), !0;
				case 'dragenter':
					return (wr = cl(wr, e, t, n, o, r)), !0;
				case 'mouseover':
					return (Ar = cl(Ar, e, t, n, o, r)), !0;
				case 'pointerover':
					var a = r.pointerId;
					return Hl.set(a, cl(Hl.get(a) || null, e, t, n, o, r)), !0;
				case 'gotpointercapture':
					return (
						(a = r.pointerId),
						Pl.set(a, cl(Pl.get(a) || null, e, t, n, o, r)),
						!0
					);
			}
			return !1;
		}
		function zT(e) {
			var t = xi(e.target);
			if (t !== null) {
				var n = Gl(t);
				if (n !== null) {
					if (((t = n.tag), t === 13)) {
						if (((t = nx(n)), t !== null)) {
							(e.blockedOn = t),
								O5(e.priority, function () {
									QS(n);
								});
							return;
						}
					} else if (t === 31) {
						if (((t = ox(n)), t !== null)) {
							(e.blockedOn = t),
								O5(e.priority, function () {
									QS(n);
								});
							return;
						}
					} else if (
						t === 3 &&
						n.stateNode.current.memoizedState.isDehydrated
					) {
						e.blockedOn = n.tag === 3 ? n.stateNode.containerInfo : null;
						return;
					}
				}
			}
			e.blockedOn = null;
		}
		function Id(e) {
			if (e.blockedOn !== null) return !1;
			for (var t = e.targetContainers; 0 < t.length; ) {
				var n = Cb(e.nativeEvent);
				if (n === null) {
					n = e.nativeEvent;
					var o = new n.constructor(n.type, n);
					(Vg = o), n.target.dispatchEvent(o), (Vg = null);
				} else return (t = Ji(n)), t !== null && MT(t), (e.blockedOn = n), !1;
				t.shift();
			}
			return !0;
		}
		function JS(e, t, n) {
			Id(e) && n.delete(t);
		}
		function SN() {
			(Sb = !1),
				kr !== null && Id(kr) && (kr = null),
				wr !== null && Id(wr) && (wr = null),
				Ar !== null && Id(Ar) && (Ar = null),
				Hl.forEach(JS),
				Pl.forEach(JS);
		}
		function md(e, t) {
			e.blockedOn === t &&
				((e.blockedOn = null),
				Sb ||
					((Sb = !0),
					rt.unstable_scheduleCallback(rt.unstable_NormalPriority, SN)));
		}
		var pd = null;
		function WS(e) {
			pd !== e &&
				((pd = e),
				rt.unstable_scheduleCallback(rt.unstable_NormalPriority, function () {
					pd === e && (pd = null);
					for (var t = 0; t < e.length; t += 3) {
						var n = e[t],
							o = e[t + 1],
							r = e[t + 2];
						if (typeof o != 'function') {
							if (bh(o || n) === null) continue;
							break;
						}
						var a = Ji(n);
						a !== null &&
							(e.splice(t, 3),
							(t -= 3),
							tb(
								a,
								{ pending: !0, data: r, method: n.method, action: o },
								o,
								r
							));
					}
				}));
		}
		function Qi(e) {
			function t(l) {
				return md(l, e);
			}
			kr !== null && md(kr, e),
				wr !== null && md(wr, e),
				Ar !== null && md(Ar, e),
				Hl.forEach(t),
				Pl.forEach(t);
			for (var n = 0; n < fr.length; n++) {
				var o = fr[n];
				o.blockedOn === e && (o.blockedOn = null);
			}
			for (; 0 < fr.length && ((n = fr[0]), n.blockedOn === null); )
				zT(n), n.blockedOn === null && fr.shift();
			if (((n = (e.ownerDocument || e).$$reactFormReplay), n != null))
				for (o = 0; o < n.length; o += 3) {
					var r = n[o],
						a = n[o + 1],
						i = r[Gt] || null;
					if (typeof a == 'function') i || WS(n);
					else if (i) {
						var s = null;
						if (a && a.hasAttribute('formAction')) {
							if (((r = a), (i = a[Gt] || null))) s = i.formAction;
							else if (bh(r) !== null) continue;
						} else s = i.action;
						typeof s == 'function'
							? (n[o + 1] = s)
							: (n.splice(o, 3), (o -= 3)),
							WS(n);
					}
				}
		}
		function VT() {
			function e(a) {
				a.canIntercept &&
					a.info === 'react-transition' &&
					a.intercept({
						handler: function () {
							return new Promise(function (i) {
								return (r = i);
							});
						},
						focusReset: 'manual',
						scroll: 'manual',
					});
			}
			function t() {
				r !== null && (r(), (r = null)), o || setTimeout(n, 20);
			}
			function n() {
				if (!o && !navigation.transition) {
					var a = navigation.currentEntry;
					a &&
						a.url != null &&
						navigation.navigate(a.url, {
							state: a.getState(),
							info: 'react-transition',
							history: 'replace',
						});
				}
			}
			if (typeof navigation == 'object') {
				var o = !1,
					r = null;
				return (
					navigation.addEventListener('navigate', e),
					navigation.addEventListener('navigatesuccess', t),
					navigation.addEventListener('navigateerror', t),
					setTimeout(n, 100),
					function () {
						(o = !0),
							navigation.removeEventListener('navigate', e),
							navigation.removeEventListener('navigatesuccess', t),
							navigation.removeEventListener('navigateerror', t),
							r !== null && (r(), (r = null));
					}
				);
			}
		}
		function hh(e) {
			this._internalRoot = e;
		}
		Sf.prototype.render = hh.prototype.render = function (e) {
			var t = this._internalRoot;
			if (t === null) throw Error(I(409));
			var n = t.current,
				o = an();
			DT(n, o, e, t, null, null);
		};
		Sf.prototype.unmount = hh.prototype.unmount = function () {
			var e = this._internalRoot;
			if (e !== null) {
				this._internalRoot = null;
				var t = e.containerInfo;
				DT(e.current, 2, null, e, null, null), vf(), (t[Zi] = null);
			}
		};
		function Sf(e) {
			this._internalRoot = e;
		}
		Sf.prototype.unstable_scheduleHydration = function (e) {
			if (e) {
				var t = px();
				e = { blockedOn: null, target: e, priority: t };
				for (var n = 0; n < fr.length && t !== 0 && t < fr[n].priority; n++);
				fr.splice(n, 0, e), n === 0 && zT(e);
			}
		};
		var $S = ex.version;
		if ($S !== '19.2.3') throw Error(I(527, $S, '19.2.3'));
		ie.findDOMNode = function (e) {
			var t = e._reactInternals;
			if (t === void 0)
				throw typeof e.render == 'function'
					? Error(I(188))
					: ((e = Object.keys(e).join(',')), Error(I(268, e)));
			return (
				(e = $E(t)),
				(e = e !== null ? rx(e) : null),
				(e = e === null ? null : e.stateNode),
				e
			);
		};
		var xN = {
			bundleType: 0,
			version: '19.2.3',
			rendererPackageName: 'react-dom',
			currentDispatcherRef: q,
			reconcilerVersion: '19.2.3',
		};
		if (
			typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < 'u' &&
			((ul = __REACT_DEVTOOLS_GLOBAL_HOOK__),
			!ul.isDisabled && ul.supportsFiber)
		)
			try {
				(Fl = ul.inject(xN)), (on = ul);
			} catch {}
		var ul;
		xf.createRoot = function (e, t) {
			if (!tx(e)) throw Error(I(299));
			var n = !1,
				o = '',
				r = N2,
				a = L2,
				i = _2;
			return (
				t != null &&
					(t.unstable_strictMode === !0 && (n = !0),
					t.identifierPrefix !== void 0 && (o = t.identifierPrefix),
					t.onUncaughtError !== void 0 && (r = t.onUncaughtError),
					t.onCaughtError !== void 0 && (a = t.onCaughtError),
					t.onRecoverableError !== void 0 && (i = t.onRecoverableError)),
				(t = OT(e, 1, !1, null, null, n, o, null, r, a, i, VT)),
				(e[Zi] = t.current),
				dh(e),
				new hh(t)
			);
		};
		xf.hydrateRoot = function (e, t, n) {
			if (!tx(e)) throw Error(I(299));
			var o = !1,
				r = '',
				a = N2,
				i = L2,
				s = _2,
				l = null;
			return (
				n != null &&
					(n.unstable_strictMode === !0 && (o = !0),
					n.identifierPrefix !== void 0 && (r = n.identifierPrefix),
					n.onUncaughtError !== void 0 && (a = n.onUncaughtError),
					n.onCaughtError !== void 0 && (i = n.onCaughtError),
					n.onRecoverableError !== void 0 && (s = n.onRecoverableError),
					n.formState !== void 0 && (l = n.formState)),
				(t = OT(e, 1, !0, t, n ?? null, o, r, l, a, i, s, VT)),
				(t.context = BT(null)),
				(n = t.current),
				(o = an()),
				(o = wb(o)),
				(r = Cr(o)),
				(r.callback = null),
				Sr(n, r, o),
				(n = o),
				(t.current.lanes = n),
				Yl(t, n),
				po(t),
				(e[Zi] = t.current),
				dh(e),
				new Sf(t)
			);
		};
		xf.version = '19.2.3';
	});
	var GT = qn((hH, PT) => {
		'use strict';
		function HT() {
			if (
				!(
					typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > 'u' ||
					typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != 'function'
				)
			)
				try {
					__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(HT);
				} catch (e) {
					console.error(e);
				}
		}
		HT(), (PT.exports = UT());
	});
	var DN = {};
	is(DN, {
		EMBED_PAYLOAD_EVENT: () => YT,
		bootstrapEmbedRuntime: () => KT,
		createEmbedRuntime: () => QT,
		initializeEmbedRuntime: () => BN,
		mountEmbedRuntime: () => xh,
		readEmbedPayload: () => Ch,
		resolveBackendURL: () => XT,
		unmountEmbedRuntime: () => Sh,
	});
	var Or = w(H(), 1);
	var ls = /^\/+/;
	function cs(e, t = null, n = null, o = null) {
		return { data: t, error: n, ok: e, response: o };
	}
	function zh(e, t = 500, n = 'ERROR', o) {
		return cs(!1, null, { message: e, status: t, code: n, cause: o }, null);
	}
	var Nn = {
			maxRetries: 3,
			initialDelayMs: 100,
			backoffFactor: 2,
			retryableStatusCodes: [500, 502, 503, 504],
			nonRetryableStatusCodes: [400, 401, 403, 404],
			retryOnNetworkError: !0,
			shouldRetry: void 0,
		},
		Vh = /^(?:[a-z+]+:)?\/\//i,
		Lf = ls;
	jr();
	var ka = (e) => new Promise((t) => setTimeout(t, e));
	function Fh() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (e) => {
			let t = (Math.random() * 16) | 0;
			return (e === 'x' ? t : (t & 3) | 8).toString(16);
		});
	}
	function qh(e) {
		let t = e.length;
		for (; t > 0 && e[t - 1] === '/'; ) t--;
		return e.slice(0, t);
	}
	function uk(e, t) {
		if (Vh.test(e)) {
			let r = new URL(e),
				a = qh(r.pathname),
				i = t.replace(Lf, ''),
				s = `${a}/${i}`;
			return (r.pathname = s), r.toString();
		}
		let n = qh(e),
			o = t.replace(Lf, '');
		return `${n}/${o}`;
	}
	var Ln = cs;
	async function ho(e, t, n) {
		let o = {
				...e.retryConfig,
				...(n?.retryConfig || {}),
				retryableStatusCodes:
					n?.retryConfig?.retryableStatusCodes ??
					e.retryConfig.retryableStatusCodes ??
					Nn.retryableStatusCodes,
				nonRetryableStatusCodes:
					n?.retryConfig?.nonRetryableStatusCodes ??
					e.retryConfig.nonRetryableStatusCodes ??
					Nn.nonRetryableStatusCodes,
			},
			{
				maxRetries: r,
				initialDelayMs: a,
				backoffFactor: i,
				retryableStatusCodes: s,
				nonRetryableStatusCodes: l,
				retryOnNetworkError: u,
			} = o,
			d = 0,
			f = a,
			c = null;
		for (; d <= (r ?? 0); ) {
			let v = Fh(),
				C = e.customFetch || globalThis.fetch,
				y = uk(e.backendURL, t),
				b;
			try {
				b = new URL(y);
			} catch {
				b = new URL(y, window.location.origin);
			}
			if (n?.query)
				for (let [m, h] of Object.entries(n.query))
					h !== void 0 && b.searchParams.append(m, String(h));
			let g = {
				method: n?.method || 'GET',
				mode: e.corsMode,
				credentials: 'include',
				headers: { ...e.headers, 'X-Request-ID': v, ...n?.headers },
				...n?.fetchOptions,
			};
			n?.body && g.method !== 'GET' && (g.body = JSON.stringify(n.body));
			try {
				let m = await C(b.toString(), g),
					h = null,
					k = null;
				try {
					m.headers.get('content-type')?.includes('application/json') &&
					m.status !== 204 &&
					m.headers.get('content-length') !== '0'
						? (h = await m.json())
						: m.status === 204 && (h = null);
				} catch (N) {
					k = N;
				}
				if (k) {
					let N = Ln(
						!1,
						null,
						{
							message: 'Failed to parse response',
							status: m.status,
							code: 'PARSE_ERROR',
							cause: k,
						},
						m
					);
					if ((n?.onError?.(N, t), n?.throw))
						throw new Error('Failed to parse response');
					return N;
				}
				if (m.status >= 200 && m.status < 300) {
					let N = Ln(!0, h, null, m);
					return n?.onSuccess?.(N), N;
				}
				let x = h,
					L = Ln(
						!1,
						null,
						{
							message: x?.message || `Request failed with status ${m.status}`,
							status: m.status,
							code: x?.code || 'API_ERROR',
							details: x?.details || null,
						},
						m
					);
				c = L;
				let _ = !1;
				if (l?.includes(m.status))
					be().debug(
						`Not retrying request to ${t} with status ${m.status} (nonRetryableStatusCodes)`
					),
						(_ = !1);
				else if (typeof o.shouldRetry == 'function')
					try {
						(_ = o.shouldRetry(m, {
							attemptsMade: d,
							url: b.toString(),
							method: g.method || 'GET',
						})),
							be().debug(
								`Custom retry strategy for ${t} with status ${m.status}: ${_}`
							);
					} catch {
						(_ = s?.includes(m.status) ?? !1),
							be().debug(
								`Custom retry strategy failed, falling back to status code check: ${_}`
							);
					}
				else
					(_ = s?.includes(m.status) ?? !1),
						be().debug(
							`Standard retry check for ${t} with status ${m.status}: ${_}`
						);
				if (!_ || d >= (r ?? 0)) {
					if ((n?.onError?.(L, t), n?.throw))
						throw new Error(L.error?.message || 'Request failed');
					return L;
				}
				d++, await ka(f ?? 0), (f = (f ?? 0) * (i ?? 2));
			} catch (m) {
				if (m && m.message === 'Failed to parse response') throw m;
				let h = !(m instanceof Response),
					k = Ln(
						!1,
						null,
						{
							message: m instanceof Error ? m.message : String(m),
							status: 0,
							code: 'NETWORK_ERROR',
							cause: m,
						},
						null
					);
				if (((c = k), !(h && u) || d >= (r ?? 0))) {
					if ((n?.onError?.(k, t), n?.throw)) throw m;
					return k;
				}
				d++, await ka(f ?? 0), (f = (f ?? 0) * (i ?? 2));
			}
		}
		let p =
			c ||
			Ln(
				!1,
				null,
				{
					message: `Request failed after ${r} retries`,
					status: 0,
					code: 'MAX_RETRIES_EXCEEDED',
				},
				null
			);
		if ((n?.onError?.(p, t), n?.throw))
			throw new Error(`Request failed after ${r} retries`);
		return p;
	}
	Qo();
	jr();
	var Kn = {
		INIT: '/init',
		POST_SUBJECT: '/subjects',
		GET_SUBJECT: '/subjects',
		PATCH_SUBJECT: '/subjects',
		CHECK_CONSENT: '/consents/check',
		LIST_SUBJECTS: '/subjects',
	};
	async function lc(e, t, n, o, r) {
		try {
			let a = await ho(e, t, { method: n, ...o });
			return a.ok
				? a
				: (console.warn(
						`API request failed, falling back to offline mode for ${t}`
					),
					r(o));
		} catch (a) {
			return (
				console.warn(`Error calling ${t}, falling back to offline mode:`, a),
				r(o)
			);
		}
	}
	async function mk(e) {
		let t = 'c15t-pending-identify-submissions';
		try {
			if (typeof window < 'u' && e?.body && window.localStorage) {
				let o = [];
				try {
					let i = window.localStorage.getItem(t);
					i && (o = JSON.parse(i));
				} catch (i) {
					console.warn('Error parsing pending identify submissions:', i),
						(o = []);
				}
				let r = e.body;
				o.some((i) => i.id === r.id && i.externalId === r.externalId) ||
					(o.push(r),
					window.localStorage.setItem(t, JSON.stringify(o)),
					be().log(
						'Queued identify user submission for retry on next page load'
					));
			}
		} catch (o) {
			console.warn(
				'Failed to write to localStorage in identify offline fallback:',
				o
			);
		}
		let n = Ln(!0, null, null, null);
		return e?.onSuccess && (await e.onSuccess(n)), n;
	}
	async function e1(e, t, n) {
		let { body: o, ...r } = n;
		if (!o?.id)
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
		let a = Xn(t);
		_n(
			{
				consents: a?.consents || {},
				consentInfo: {
					...a?.consentInfo,
					time: a?.consentInfo?.time || Date.now(),
					subjectId: o.id,
					externalId: o.externalId,
					identityProvider: o.identityProvider,
				},
			},
			void 0,
			t
		);
		let i = `${Kn.PATCH_SUBJECT}/${o.id}`,
			{ id: s, ...l } = o;
		return lc(e, i, 'PATCH', { ...r, body: l }, async (u) => {
			let d = { id: o.id, ...u?.body };
			return mk({ ...u, body: d });
		});
	}
	ss();
	async function t1(e, t) {
		let n = null;
		if (t?.enabled)
			try {
				let { fetchGVL: r } = await Promise.resolve().then(() => (fc(), Kf));
				n = await r(t.vendorIds);
			} catch (r) {
				console.warn('Failed to fetch GVL in offline fallback:', r);
			}
		let o = Ln(
			!0,
			{
				jurisdiction: 'NONE',
				location: { countryCode: null, regionCode: null },
				translations: { language: 'en', translations: Mr },
				branding: 'c15t',
				gvl: n,
			},
			null,
			null
		);
		return e?.onSuccess && (await e.onSuccess(o)), o;
	}
	async function n1(e, t, n) {
		try {
			let o = await ho(e, Kn.INIT, { method: 'GET', ...t });
			return o.ok
				? o
				: (console.warn(
						'API request failed, falling back to offline mode for consent banner'
					),
					t1(t, n));
		} catch (o) {
			return (
				console.warn(
					'Error fetching consent banner info, falling back to offline mode:',
					o
				),
				t1(t, n)
			);
		}
	}
	jr();
	var o1 = 'c15t-pending-consent-submissions',
		mc = 'c15t-pending-identify-submissions';
	function r1(e, t) {
		let n = o1;
		if (!(typeof window > 'u' || !window.localStorage))
			try {
				window.localStorage.setItem('c15t-storage-test-key', 'test'),
					window.localStorage.removeItem('c15t-storage-test-key');
				let o = window.localStorage.getItem(n);
				if (!o) return;
				let r = JSON.parse(o);
				if (!r.length) {
					window.localStorage.removeItem(n);
					return;
				}
				be().log(`Found ${r.length} pending consent submission(s) to retry`),
					setTimeout(() => {
						t(r);
					}, 2e3);
			} catch (o) {
				console.warn('Failed to check for pending consent submissions:', o);
			}
	}
	async function a1(e, t) {
		let n = o1,
			o = 3,
			r = [...t];
		for (let a = 0; a < o && r.length > 0; a++) {
			let i = [];
			for (let s = 0; s < r.length; s++) {
				let l = r[s];
				try {
					be().log('Retrying consent submission:', l),
						(await ho(e, Kn.POST_SUBJECT, { method: 'POST', body: l })).ok &&
							(be().log('Successfully resubmitted consent'), i.push(s));
				} catch (u) {
					console.warn('Failed to resend consent submission:', u);
				}
			}
			for (let s = i.length - 1; s >= 0; s--) {
				let l = i[s];
				l !== void 0 && r.splice(l, 1);
			}
			if (r.length === 0) break;
			a < o - 1 && (await ka(1e3 * (a + 1)));
		}
		try {
			typeof window < 'u' &&
				window.localStorage &&
				(r.length > 0
					? (window.localStorage.setItem(n, JSON.stringify(r)),
						be().log(
							`${r.length} consent submissions still pending for future retry`
						))
					: (window.localStorage.removeItem(n),
						be().log(
							'All pending consent submissions processed successfully'
						)));
		} catch (a) {
			console.warn('Error updating pending submissions storage:', a);
		}
	}
	function i1(e, t) {
		if (!(typeof window > 'u' || !window.localStorage))
			try {
				let n = window.localStorage.getItem(mc);
				if (!n) return;
				let o = JSON.parse(n);
				if (!o.length) {
					window.localStorage.removeItem(mc);
					return;
				}
				be().log(
					`Found ${o.length} pending identify user submission(s) to retry`
				),
					setTimeout(() => {
						t(o);
					}, 2500);
			} catch (n) {
				console.warn('Failed to check for pending identify submissions:', n);
			}
	}
	async function s1(e, t) {
		let o = [...t];
		for (let r = 0; r < 3 && o.length > 0; r++) {
			let a = [];
			for (let i = 0; i < o.length; i++) {
				let s = o[i];
				if (s)
					try {
						be().log('Retrying identify user submission:', s);
						let l = `${Kn.PATCH_SUBJECT}/${s.id}`,
							{ id: u, ...d } = s;
						(await ho(e, l, { method: 'PATCH', body: d })).ok &&
							(be().log('Successfully resubmitted identify user'), a.push(i));
					} catch (l) {
						console.warn('Failed to resend identify user submission:', l);
					}
			}
			for (let i = a.length - 1; i >= 0; i--) {
				let s = a[i];
				s !== void 0 && o.splice(s, 1);
			}
			if (o.length === 0) break;
			r < 2 && (await ka(1e3 * (r + 1)));
		}
		try {
			typeof window < 'u' &&
				window.localStorage &&
				(o.length > 0
					? (window.localStorage.setItem(mc, JSON.stringify(o)),
						be().log(
							`${o.length} identify submissions still pending for future retry`
						))
					: (window.localStorage.removeItem(mc),
						be().log(
							'All pending identify submissions processed successfully'
						)));
		} catch (r) {
			console.warn('Error updating pending identify submissions storage:', r);
		}
	}
	Qo();
	jr();
	async function gk(e, t) {
		let n = 'c15t-pending-consent-submissions',
			o = t?.body?.subjectId;
		try {
			if (
				typeof window < 'u' &&
				(_n(
					{
						consents: t?.body?.preferences || {},
						consentInfo: {
							time: Date.now(),
							subjectId: o,
							externalId: t?.body?.externalSubjectId,
							identityProvider: t?.body?.identityProvider,
						},
					},
					void 0,
					e
				),
				t?.body && window.localStorage)
			) {
				let a = [];
				try {
					let l = window.localStorage.getItem(n);
					l && (a = JSON.parse(l));
				} catch (l) {
					console.warn('Error parsing pending submissions:', l), (a = []);
				}
				let i = t.body;
				a.some((l) => JSON.stringify(l) === JSON.stringify(i)) ||
					(a.push(i),
					window.localStorage.setItem(n, JSON.stringify(a)),
					be().log('Queued consent submission for retry on next page load'));
			}
		} catch (a) {
			console.warn('Failed to write to localStorage in offline fallback:', a);
		}
		let r = Ln(!0, null, null, null);
		return t?.onSuccess && (await t.onSuccess(r)), r;
	}
	async function l1(e, t, n) {
		return (
			_n(
				{
					consents: n?.body?.preferences || {},
					consentInfo: {
						time: Date.now(),
						subjectId: n?.body?.subjectId,
						externalId: n?.body?.externalSubjectId,
						identityProvider: n?.body?.identityProvider,
					},
				},
				void 0,
				t
			),
			await lc(e, Kn.POST_SUBJECT, 'POST', n, async (r) => gk(t, r))
		);
	}
	var Ia = class {
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
					maxRetries: t.retryConfig?.maxRetries ?? Nn.maxRetries ?? 3,
					initialDelayMs:
						t.retryConfig?.initialDelayMs ?? Nn.initialDelayMs ?? 100,
					backoffFactor: t.retryConfig?.backoffFactor ?? Nn.backoffFactor ?? 2,
					retryableStatusCodes:
						t.retryConfig?.retryableStatusCodes ?? Nn.retryableStatusCodes,
					nonRetryableStatusCodes:
						t.retryConfig?.nonRetryableStatusCodes ??
						Nn.nonRetryableStatusCodes,
					shouldRetry: t.retryConfig?.shouldRetry ?? Nn.shouldRetry,
					retryOnNetworkError:
						t.retryConfig?.retryOnNetworkError ?? Nn.retryOnNetworkError,
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
			return n1(this.fetcherContext, t, this.iabConfig);
		}
		async setConsent(t) {
			return l1(this.fetcherContext, this.storageConfig, t);
		}
		async identifyUser(t) {
			return e1(this.fetcherContext, this.storageConfig, t);
		}
		async $fetch(t, n) {
			return ho(this.fetcherContext, t, n);
		}
		checkPendingConsentSubmissions() {
			r1(this.fetcherContext, (t) => this.processPendingConsentSubmissions(t));
		}
		async processPendingConsentSubmissions(t) {
			return a1(this.fetcherContext, t);
		}
		checkPendingIdentifySubmissions() {
			i1(this.fetcherContext, (t) => this.processPendingIdentifySubmissions(t));
		}
		async processPendingIdentifySubmissions(t) {
			return s1(this.fetcherContext, t);
		}
	};
	function gs(e, t = 500, n = 'HANDLER_ERROR', o) {
		return zh(e, t, n, o);
	}
	async function Na(e, t, n) {
		let o = e[t];
		if (!o) {
			let r = gs(
				`No endpoint handler found for '${String(t)}'`,
				404,
				'ENDPOINT_NOT_FOUND'
			);
			if (n?.throw)
				throw new Error(`No endpoint handler found for '${String(t)}'`);
			return r;
		}
		try {
			let r = await o(n);
			return {
				data: r.data,
				error: r.error,
				ok: r.ok ?? !r.error,
				response: r.response,
			};
		} catch (r) {
			let a = gs(
				r instanceof Error ? r.message : String(r),
				0,
				'HANDLER_ERROR',
				r
			);
			if (n?.throw) throw r;
			return a;
		}
	}
	async function c1(e, t, n, o) {
		let r = n.replace(ls, '').split('/')[0],
			a = t[n];
		if (a)
			try {
				return await a(o);
			} catch (i) {
				return gs(
					i instanceof Error ? i.message : String(i),
					0,
					'HANDLER_ERROR',
					i
				);
			}
		return !r || !(r in e)
			? gs(`No endpoint handler found for '${n}'`, 404, 'ENDPOINT_NOT_FOUND')
			: await Na(e, r, o);
	}
	async function u1(e, t) {
		let n = ('init' in e && e.init !== void 0, 'init');
		return await Na(e, n, t);
	}
	async function d1(e, t) {
		return await Na(e, 'setConsent', t);
	}
	var bs = class {
		constructor(t) {
			this.dynamicHandlers = {};
			this.endpointHandlers = t.endpointHandlers;
		}
		async init(t) {
			return u1(this.endpointHandlers, t);
		}
		async setConsent(t) {
			return d1(this.endpointHandlers, t);
		}
		async identifyUser(t) {
			if (this.endpointHandlers.identifyUser)
				return this.endpointHandlers.identifyUser(t);
			let n = t.body?.id;
			return n
				? this.$fetch(`/subjects/${n}`, { ...t, method: 'PATCH' })
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
		registerHandler(t, n) {
			this.dynamicHandlers[t] = n;
		}
		async $fetch(t, n) {
			return c1(this.endpointHandlers, this.dynamicHandlers, t, n);
		}
	};
	ss();
	function f1(e, t) {
		let n = {
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
			o = 'NONE';
		if (e) {
			let r = e.toUpperCase(),
				a =
					t && typeof t == 'string'
						? (t.includes('-') ? t.split('-').pop() : t).toUpperCase()
						: null;
			if (r === 'CA' && a && n.CA_QC_REGIONS.has(a)) return 'QC_LAW25';
			let i = [
				{ sets: [n.EU, n.EEA, n.UK], code: 'GDPR' },
				{ sets: [n.CH], code: 'CH' },
				{ sets: [n.BR], code: 'BR' },
				{ sets: [n.CA], code: 'PIPEDA' },
				{ sets: [n.AU], code: 'AU' },
				{ sets: [n.JP], code: 'APPI' },
				{ sets: [n.KR], code: 'PIPA' },
			];
			for (let { sets: s, code: l } of i)
				if (s.some((u) => u.has(r))) {
					o = l;
					break;
				}
		}
		return o;
	}
	sc();
	function Qf(e = null) {
		return cs(!0, e);
	}
	async function hs(e) {
		let t = Qf();
		return e?.onSuccess && (await e.onSuccess(t)), t;
	}
	async function m1(e, t, n) {
		let o = t?.headers?.['x-c15t-country'] ?? 'GB',
			r = t?.headers?.['x-c15t-region'] ?? null,
			a,
			i,
			s = t?.headers?.['accept-language'] ?? null;
		if (e?.translations && Object.keys(e.translations).length > 0) {
			let f = e.translations,
				c = Array.from(new Set(['en', ...Object.keys(f)])),
				p = e.defaultLanguage ?? 'en';
			a = If(c, { header: s, fallback: p });
			let v = f[a] ?? {};
			i = Ef(Mr, v);
		} else {
			let f = Object.keys(cn.translations),
				c = cn.defaultLanguage ?? 'en';
			(a = If(f, { header: s, fallback: c })), (i = cn.translations[a]);
		}
		let l = f1(o, r),
			u = null;
		if (n?.enabled)
			if (n.gvl) u = n.gvl;
			else
				try {
					let { fetchGVL: f } = await Promise.resolve().then(() => (fc(), Kf));
					u = await f(n.vendorIds);
				} catch (f) {
					console.warn('Failed to fetch GVL in offline mode:', f);
				}
		let d = Qf({
			jurisdiction: l,
			location: { countryCode: o, regionCode: r },
			translations: { language: a, translations: i },
			branding: 'c15t',
			gvl: u,
		});
		return t?.onSuccess && (await t.onSuccess(d)), d;
	}
	Qo();
	async function p1(e, t) {
		let n = t?.body?.subjectId;
		try {
			typeof window < 'u' &&
				_n(
					{
						consentInfo: {
							time: Date.now(),
							subjectId: n,
							externalId: t?.body?.externalSubjectId,
							identityProvider: t?.body?.identityProvider,
						},
						consents: t?.body?.preferences || {},
					},
					void 0,
					e
				);
		} catch (o) {
			console.warn('Failed to write to storage:', o);
		}
		return await hs(t);
	}
	var vs = class {
		constructor(t, n, o) {
			(this.storageConfig = t),
				(this.initialTranslationConfig = n),
				(this.iabConfig = o);
		}
		async init(t) {
			return m1(this.initialTranslationConfig, t, this.iabConfig);
		}
		async setConsent(t) {
			return p1(this.storageConfig, t);
		}
		async identifyUser(t) {
			return (
				console.warn(
					'identifyUser called in offline mode - external ID will not be linked'
				),
				hs(t)
			);
		}
		async $fetch(t, n) {
			return await hs(n);
		}
	};
	var bk = '/api/c15t',
		hk = 'c15t',
		pc = new Map();
	function vk(e) {
		return e
			? Object.keys(e)
					.sort()
					.map((n) => {
						let o = e[n];
						return o == null ? `${n}:null` : `${n}:${String(o)}`;
					})
					.join('|')
			: '';
	}
	function yk(e) {
		let t = vk(e.storageConfig),
			n = t ? `:storage:${t}` : '';
		if (e.mode === 'offline') {
			let r = e.store?.initialTranslationConfig?.translations,
				a = r ? `:translations:${Object.keys(r).sort().join(',')}` : '',
				s = e.store?.iab?.enabled ? ':iab:enabled' : '';
			return `offline${n}${a}${s}`;
		}
		if (e.mode === 'custom')
			return `custom:${Object.keys(e.endpointHandlers || {})
				.sort()
				.join(',')}${n}`;
		let o = '';
		return (
			'headers' in e &&
				e.headers &&
				(o = `:headers:${Object.keys(e.headers)
					.sort()
					.map((a) => `${a}=${e.headers?.[a]}`)
					.join(',')}`),
			`c15t:${e.backendURL || ''}${o}${n}`
		);
	}
	function La(e) {
		let t = yk(e);
		if (pc.has(t)) {
			if (
				e.mode !== 'offline' &&
				e.mode !== 'custom' &&
				'headers' in e &&
				e.headers
			) {
				let a = pc.get(t);
				a instanceof Ia &&
					(a.headers = { 'Content-Type': 'application/json', ...e.headers });
			}
			let r = pc.get(t);
			if (r)
				return new Proxy(r, {
					get(a, i) {
						return a[i];
					},
				});
		}
		let n = e.mode || hk,
			o;
		switch (n) {
			case 'custom': {
				let r = e;
				o = new bs({ endpointHandlers: r.endpointHandlers });
				break;
			}
			case 'offline': {
				let r = e.store?.iab;
				o = new vs(
					e.storageConfig,
					e.store?.initialTranslationConfig,
					r ? { enabled: r.enabled, vendorIds: r.vendors, gvl: r.gvl } : void 0
				);
				break;
			}
			default: {
				let r = e,
					a = e.store?.iab;
				o = new Ia({
					backendURL: r.backendURL || bk,
					headers: r.headers,
					customFetch: r.customFetch,
					retryConfig: r.retryConfig,
					storageConfig: e.storageConfig,
					iabConfig: a
						? { enabled: a.enabled, vendorIds: a.vendors, gvl: a.gvl }
						: void 0,
				});
				break;
			}
		}
		return pc.set(t, o), o;
	}
	Qo();
	gc();
	function g1(e, t) {
		if (e.length === 0) throw new TypeError(`${t} condition cannot be empty`);
	}
	function Tk(e, t) {
		if (!(e in t))
			throw new Error(`Consent category "${e}" not found in consent state`);
		return t[e] || !1;
	}
	function kk(e, t) {
		let n = Array.isArray(e) ? e : [e];
		return g1(n, 'AND'), n.every((o) => bc(o, t));
	}
	function wk(e, t) {
		let n = Array.isArray(e) ? e : [e];
		return g1(n, 'OR'), n.some((o) => bc(o, t));
	}
	function bc(e, t) {
		if (typeof e == 'string') return Tk(e, t);
		if (typeof e == 'object' && e !== null) {
			if ('and' in e) return kk(e.and, t);
			if ('or' in e) return wk(e.or, t);
			if ('not' in e) return !bc(e.not, t);
		}
		throw new TypeError(`Invalid condition structure: ${JSON.stringify(e)}`);
	}
	function On(e, t) {
		return bc(e, t);
	}
	function hc(e) {
		let t = new Set();
		function n(o) {
			if (typeof o == 'string') {
				t.add(o);
				return;
			}
			typeof o == 'object' &&
				o !== null &&
				('and' in o
					? (Array.isArray(o.and) ? o.and : [o.and]).forEach(n)
					: 'or' in o
						? (Array.isArray(o.or) ? o.or : [o.or]).forEach(n)
						: 'not' in o && n(o.not));
		}
		return n(e), Array.from(t);
	}
	wa();
	function Ak(e) {
		let t = e.getAttribute('data-category');
		if (t) {
			if (!Ko.includes(t))
				throw new Error(
					`Invalid category attribute "${t}" on iframe. Must be one of: ${Ko.join(', ')}`
				);
			return t;
		}
	}
	function Jf(e, t) {
		let n = e.getAttribute('data-src'),
			o = Ak(e);
		if (!o) return;
		On(o, t)
			? n && !e.src && ((e.src = n), e.removeAttribute('data-src'))
			: e.src && e.removeAttribute('src');
	}
	function vc() {
		if (typeof document > 'u') return [];
		let e = document.querySelectorAll('iframe[data-category]'),
			t = new Set();
		return e
			? (e.forEach((n) => {
					let o = n.getAttribute('data-category');
					if (!o) return;
					let r = o.trim();
					Ko.includes(r) && t.add(r);
				}),
				Array.from(t))
			: [];
	}
	function yc(e) {
		if (typeof document > 'u') return;
		let t = document.querySelectorAll('iframe');
		t &&
			t.forEach((n) => {
				Jf(n, e);
			});
	}
	function Wf(e, t) {
		let n = new MutationObserver((o) => {
			let r = e(),
				a = !1;
			if (
				(o.forEach((i) => {
					i.addedNodes.forEach((s) => {
						if (s.nodeType === Node.ELEMENT_NODE) {
							let l = s;
							l.tagName &&
								l.tagName.toUpperCase() === 'IFRAME' &&
								(Jf(l, r), l.hasAttribute('data-category') && (a = !0));
							let u = l.querySelectorAll?.('iframe');
							u &&
								u.length > 0 &&
								u.forEach((d) => {
									Jf(d, r), d.hasAttribute('data-category') && (a = !0);
								});
						}
					});
				}),
				a && t)
			) {
				let i = vc();
				i.length > 0 && t(i);
			}
		});
		return n.observe(document.body, { childList: !0, subtree: !0 }), n;
	}
	function Cc() {
		if (typeof crypto < 'u' && crypto.randomUUID)
			return crypto.randomUUID().replace(/-/g, '').substring(0, 8);
		if (typeof crypto < 'u' && crypto.getRandomValues) {
			let t = new Uint8Array(4);
			return (
				crypto.getRandomValues(t),
				Array.from(t, (n) => n.toString(36))
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
	function Sc(e, t, n) {
		return t ? (n[e] || (n[e] = Cc()), n[e]) : `c15t-script-${e}`;
	}
	var Cs = new Map();
	function Ur(e) {
		return Cs.has(e);
	}
	function Ss(e) {
		return Cs.get(e);
	}
	function xc(e, t) {
		Cs.set(e, t);
	}
	function Zo(e) {
		Cs.delete(e);
	}
	function b1() {
		return Cs;
	}
	function Ek(e, t) {
		if (e.vendorId !== void 0) {
			let n = String(e.vendorId);
			if (!t.vendorConsents[n]) return !1;
		}
		return !(
			(e.iabPurposes &&
				e.iabPurposes.length > 0 &&
				!e.iabPurposes.every((o) => t.purposeConsents[o] === !0)) ||
			(e.iabLegIntPurposes &&
				e.iabLegIntPurposes.length > 0 &&
				!e.iabLegIntPurposes.every(
					(o) => t.purposeLegitimateInterests[o] === !0
				)) ||
			(e.iabSpecialFeatures &&
				e.iabSpecialFeatures.length > 0 &&
				!e.iabSpecialFeatures.every((o) => t.specialFeatureOptIns[o] === !0))
		);
	}
	function Hr(e, t, n) {
		return n?.model === 'iab' &&
			n.iabConsent &&
			(e.vendorId !== void 0 ||
				e.iabPurposes ||
				e.iabLegIntPurposes ||
				e.iabSpecialFeatures)
			? Ek(e, n.iabConsent)
			: On(e.category, t);
	}
	function Tc(e, t, n = {}, o) {
		let r = [];
		return (
			e.forEach((a) => {
				if (!a.alwaysLoad && !Hr(a, t, o)) return;
				if (Ur(a.id)) {
					a.onConsentChange?.({
						id: a.id,
						elementId: Sc(a.id, a.anonymizeId !== !1, n),
						hasConsent: Hr(a, t, o),
						consents: t,
					});
					return;
				}
				if (a.src && a.textContent)
					throw new Error(
						`Script '${a.id}' cannot have both 'src' and 'textContent'. Choose one.`
					);
				if (!a.src && !a.textContent && !a.callbackOnly)
					throw new Error(
						`Script '${a.id}' must have either 'src', 'textContent', or 'callbackOnly' set to true.`
					);
				if (a.callbackOnly === !0) {
					let c = a.anonymizeId !== !1,
						p = Sc(a.id, c, n),
						v = {
							id: a.id,
							elementId: p,
							consents: t,
							hasConsent: Hr(a, t, o),
						};
					a.onBeforeLoad && a.onBeforeLoad(v),
						a.onLoad && a.onLoad(v),
						xc(a.id, null),
						r.push(a.id);
					return;
				}
				let i = a.anonymizeId !== !1,
					s = Sc(a.id, i, n);
				if (a.persistAfterConsentRevoked === !0) {
					let c = document.getElementById(s);
					if (c) {
						let p = {
							id: a.id,
							hasConsent: Hr(a, t, o),
							elementId: s,
							consents: t,
							element: c,
						};
						a.onConsentChange?.(p), a.onLoad?.(p), xc(a.id, c), r.push(a.id);
						return;
					}
				}
				let l = document.createElement('script');
				(l.id = s),
					a.src
						? (l.src = a.src)
						: a.textContent && (l.textContent = a.textContent),
					a.fetchPriority && (l.fetchPriority = a.fetchPriority),
					a.async && (l.async = !0),
					a.defer && (l.defer = !0),
					a.nonce && (l.nonce = a.nonce),
					a.attributes &&
						Object.entries(a.attributes).forEach(([c, p]) => {
							l.setAttribute(c, p);
						});
				let u = {
					id: a.id,
					hasConsent: Hr(a, t, o),
					elementId: s,
					consents: t,
					element: l,
				};
				a.onLoad &&
					(a.textContent
						? setTimeout(() => {
								a.onLoad?.({ ...u });
							}, 0)
						: l.addEventListener('load', () => {
								a.onLoad?.({ ...u });
							})),
					a.onError &&
						(a.textContent ||
							l.addEventListener('error', () => {
								a.onError?.({
									...u,
									error: new Error(`Failed to load script: ${a.src}`),
								});
							})),
					a.onBeforeLoad && a.onBeforeLoad(u);
				let d = a.target ?? 'head',
					f = d === 'body' ? document.body : document.head;
				if (!f)
					throw new Error(
						`Document ${d} is not available for script injection`
					);
				f.appendChild(l), xc(a.id, l), r.push(a.id);
			}),
			r
		);
	}
	function $f(e, t, n = {}, o) {
		let r = [];
		return (
			e.forEach((a) => {
				if (Ur(a.id) && !a.alwaysLoad && !Hr(a, t, o)) {
					let i = Ss(a.id);
					a.callbackOnly === !0 || i === null
						? (Zo(a.id), r.push(a.id))
						: i &&
							(a.persistAfterConsentRevoked
								? (Zo(a.id), r.push(a.id))
								: (i.remove(), Zo(a.id), r.push(a.id)));
				}
			}),
			r
		);
	}
	function kc(e, t, n = {}, o) {
		let r = $f(e, t, n, o);
		return { loaded: Tc(e, t, n, o), unloaded: r };
	}
	function wc(e) {
		return Ur(e);
	}
	function Ac() {
		return Array.from(b1().keys());
	}
	function em(e, t, n, o = {}, r) {
		let a = t.find((i) => i.id === e);
		if (!a) return !1;
		if (Ur(e)) {
			let i = Ss(e);
			a.callbackOnly === !0 || i === null
				? Zo(e)
				: i && (a.persistAfterConsentRevoked || i.remove(), Zo(e));
		}
		return !a.alwaysLoad && !Hr(a, n, r) ? !1 : (Tc([a], n, o, r), !0);
	}
	function tm(e, t) {
		let n = () => {
			let { scripts: o, consents: r, scriptIdMap: a, model: i, iab: s } = e(),
				l = s?.config.enabled
					? {
							vendorConsents: s.vendorConsents,
							vendorLegitimateInterests: s.vendorLegitimateInterests,
							purposeConsents: s.purposeConsents,
							purposeLegitimateInterests: s.purposeLegitimateInterests,
							specialFeatureOptIns: s.specialFeatureOptIns,
						}
					: void 0,
				u = kc(o, r, a, { model: i, iabConsent: l }),
				d = { ...e().loadedScripts };
			return (
				u.loaded.forEach((f) => {
					d[f] = !0;
				}),
				u.unloaded.forEach((f) => {
					d[f] = !1;
				}),
				t({ loadedScripts: d }),
				u
			);
		};
		return {
			updateScripts: () => n(),
			setScripts: (o) => {
				let r = e(),
					a = { ...r.scriptIdMap };
				o.forEach((u) => {
					u.anonymizeId !== !1 && (a[u.id] = Cc());
				});
				let i = o.flatMap((u) => hc(u.category)),
					s = new Set([...r.consentCategories, ...i]),
					l = Array.from(s);
				t({
					scripts: [...r.scripts, ...o],
					scriptIdMap: a,
					consentCategories: l,
				}),
					n();
			},
			removeScript: (o) => {
				let r = e();
				if (Ur(o)) {
					let i = Ss(o);
					i && (i.remove(), Zo(o));
				}
				let a = { ...r.scriptIdMap };
				delete a[o],
					t({
						scripts: r.scripts.filter((i) => i.id !== o),
						loadedScripts: { ...r.loadedScripts, [o]: !1 },
						scriptIdMap: a,
					});
			},
			reloadScript: (o) => {
				let r = e();
				return em(o, r.scripts, r.consents, r.scriptIdMap);
			},
			isScriptLoaded: (o) => wc(o),
			getLoadedScriptIds: () => Ac(),
		};
	}
	Aa();
	var h1 = (e) => {
			let t,
				n = new Set(),
				o = (u, d) => {
					let f = typeof u == 'function' ? u(t) : u;
					if (!Object.is(f, t)) {
						let c = t;
						(t =
							(d ?? (typeof f != 'object' || f === null))
								? f
								: Object.assign({}, t, f)),
							n.forEach((p) => p(t, c));
					}
				},
				r = () => t,
				s = {
					setState: o,
					getState: r,
					getInitialState: () => l,
					subscribe: (u) => (n.add(u), () => n.delete(u)),
				},
				l = (t = e(o, r, s));
			return s;
		},
		v1 = (e) => (e ? h1(e) : h1);
	Qo();
	jr();
	function y1(e, t) {
		let n = null,
			o = !1;
		return {
			initializeIframeBlocker: () => {
				if (o || typeof document > 'u') return;
				let r = e();
				if (r.iframeBlockerConfig?.disableAutomaticBlocking) return;
				let a = () => {
					let i = vc();
					i.length > 0 && e().updateConsentCategories(i);
				};
				document.readyState === 'loading'
					? document.addEventListener('DOMContentLoaded', a)
					: a(),
					setTimeout(a, 100),
					yc(r.consents),
					(n = Wf(
						() => e().consents,
						(i) => e().updateConsentCategories(i)
					)),
					(o = !0);
			},
			updateIframeConsents: () => {
				if (!o || typeof document > 'u') return;
				let r = e(),
					{ consents: a, iframeBlockerConfig: i } = r;
				i?.disableAutomaticBlocking || yc(a);
			},
			destroyIframeBlocker: () => {
				if (!o || typeof document > 'u') return;
				let r = e(),
					{ iframeBlockerConfig: a } = r;
				a?.disableAutomaticBlocking ||
					(n && (n.disconnect(), (n = null)), (o = !1));
			},
		};
	}
	gc();
	var Rc = 'c15t:pending-consent-sync';
	function Ik(e, t, n, o, r) {
		if (!o || n === null) return !1;
		let a = new Set(r.filter((s) => s.disabled).map((s) => s.name));
		return Object.entries(t).some(
			([s, l]) => !a.has(s) && e[s] === !0 && l === !1
		);
	}
	async function C1({ manager: e, type: t, get: n, set: o, options: r }) {
		let {
				callbacks: a,
				selectedConsents: i,
				consents: s,
				consentTypes: l,
				updateScripts: u,
				updateIframeConsents: d,
				updateNetworkBlockerConsents: f,
				consentCategories: c,
				locationInfo: p,
				model: v,
				consentInfo: C,
				reloadOnConsentRevoked: y,
			} = n(),
			b = { ...s },
			g = C,
			m = { ...(i ?? s ?? {}) },
			h = Date.now();
		if (t === 'all') for (let N of l) c.includes(N.name) && (m[N.name] = !0);
		else if (t === 'necessary')
			for (let N of l) m[N.name] = N.disabled === !0 ? N.defaultValue : !1;
		let k = C?.subjectId;
		k || (k = ys());
		let A = n().consentInfo?.externalId || n().user?.id,
			x = n().consentInfo?.identityProvider || n().user?.identityProvider,
			L = Ik(b, m, g, y, l);
		if (
			(o({
				consents: m,
				selectedConsents: m,
				activeUI: 'none',
				consentInfo: {
					time: h,
					subjectId: k,
					externalId: A,
					identityProvider: x,
				},
			}),
			L)
		) {
			let N = {
				type: t,
				subjectId: k,
				externalId: A,
				identityProvider: x,
				preferences: m,
				givenAt: h,
				jurisdiction: p?.jurisdiction ?? void 0,
				jurisdictionModel: v,
				domain: window.location.hostname,
				uiSource: r?.uiSource ?? 'api',
			};
			try {
				localStorage.setItem(Rc, JSON.stringify(N));
			} catch {}
			a.onConsentSet?.({ preferences: m }),
				a.onBeforeConsentRevocationReload?.({ preferences: m }),
				window.location.reload();
			return;
		}
		await new Promise((N) => setTimeout(N, 0)),
			d(),
			u(),
			f(),
			a.onConsentSet?.({ preferences: m });
		let _ = await e.setConsent({
			body: {
				type: 'cookie_banner',
				domain: window.location.hostname,
				preferences: m,
				subjectId: k,
				externalSubjectId: String(A),
				identityProvider: x,
				jurisdiction: p?.jurisdiction ?? void 0,
				jurisdictionModel: v ?? void 0,
				givenAt: h,
				uiSource: r?.uiSource ?? 'api',
				consentAction: t,
			},
		});
		if (!_.ok) {
			let N = _.error?.message ?? 'Failed to save consents';
			a.onError?.({ error: N }), a.onError || console.error(N);
		}
	}
	ss();
	function S1(e, t) {
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
	function x1() {
		if (typeof window > 'u') return !1;
		try {
			let t = window.navigator.globalPrivacyControl;
			return t === !0 || t === '1';
		} catch {
			return !1;
		}
	}
	Aa();
	Qo();
	var Mk = 0,
		jk = Yn;
	function Kr({ get: e, set: t }, n) {
		let { iab: o } = e();
		o && t({ iab: { ...o, ...n } });
	}
	async function ey(e, t, n) {
		let { get: o } = t;
		if (n !== null) {
			Kr(t, { isLoadingGVL: !0, nonIABVendors: e.customVendors ?? [] });
			try {
				let {
					initializeIABStub: r,
					fetchGVL: a,
					createCMPApi: i,
				} = await Promise.resolve().then(() => (Vc(), zc));
				r();
				let s;
				if (n) s = n;
				else if (((s = await a()), s === null)) {
					Kr(t, { isLoadingGVL: !1 });
					return;
				}
				Kr(t, { gvl: s, isLoadingGVL: !1 });
				let l = {},
					u = {};
				for (let [y, b] of Object.entries(s.vendors)) {
					let g = String(y);
					b.purposes && b.purposes.length > 0 && (l[g] = !1),
						b.legIntPurposes && b.legIntPurposes.length > 0 && (u[g] = !0);
				}
				(e.customVendors ?? []).forEach((y) => {
					let b = String(y.id);
					y.purposes && y.purposes.length > 0 && (l[b] = !1),
						y.legIntPurposes && y.legIntPurposes.length > 0 && (u[b] = !0);
				});
				let f = Xn(o().storageConfig);
				f?.iabCustomVendorConsents &&
					Object.assign(l, f.iabCustomVendorConsents),
					f?.iabCustomVendorLegitimateInterests &&
						Object.assign(u, f.iabCustomVendorLegitimateInterests),
					Kr(t, { vendorConsents: l, vendorLegitimateInterests: u });
				let c = e.cmpId ?? Mk,
					p = e.cmpVersion ?? jk;
				if (c === 0)
					throw new Error(
						'[c15t] IAB TCF Error: CMP ID is 0. A valid CMP ID registered with IAB Europe is required for IAB TCF compliance.\nIf using consent.io, the CMP ID should be provided automatically via /init.\nIf self-hosting, configure it on the backend via `advanced.iab.cmpId` or on the client via `iab.cmpId`.\nTo register your own CMP: https://iabeurope.eu/tcf-for-cmps/'
					);
				let v = i({ cmpId: c, cmpVersion: p, gvl: s, gdprApplies: !0 });
				Kr(t, { cmpApi: v });
				let C = v.loadFromStorage();
				C && (await zk(C, t)), o().updateScripts();
			} catch (r) {
				console.error('Failed to initialize IAB mode:', r),
					Kr(t, { isLoadingGVL: !1 });
			}
		}
	}
	async function zk(e, t) {
		let { set: n } = t;
		try {
			let { decodeTCString: o, iabPurposesToC15tConsents: r } =
					await Promise.resolve().then(() => (Vc(), zc)),
				a = await o(e),
				i = Xn(t.get().storageConfig),
				s = { ...a.vendorConsents, ...(i?.iabCustomVendorConsents ?? {}) },
				l = {
					...a.vendorLegitimateInterests,
					...(i?.iabCustomVendorLegitimateInterests ?? {}),
				},
				u = r(a.purposeConsents);
			Kr(t, {
				tcString: e,
				purposeConsents: a.purposeConsents,
				purposeLegitimateInterests: a.purposeLegitimateInterests,
				vendorConsents: s,
				vendorLegitimateInterests: l,
				specialFeatureOptIns: a.specialFeatureOptIns,
			}),
				n({ consents: u, selectedConsents: u, activeUI: 'none' });
		} catch {}
	}
	function Vk(e, t) {
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
	function ty(e, t, n, o) {
		let r = S1(e, t),
			a = o !== void 0 ? o : x1(),
			s = Vk((r === null || r === 'opt-out') && n === null, a);
		return { consentModel: r, autoGrantedConsents: s };
	}
	function Uk(e, t, n, o) {
		let { get: r, initialTranslationConfig: a } = t,
			{ consentInfo: i } = r(),
			{ translations: s, location: l } = e,
			{ consentModel: u, autoGrantedConsents: d } = ty(
				e.jurisdiction ?? null,
				o,
				i,
				t.get().overrides?.gpc
			),
			f = {
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
			i === null && (f.activeUI = u ? 'banner' : 'none'),
			d && ((f.consents = d), (f.selectedConsents = d)),
			s?.language &&
				s?.translations &&
				(f.translationConfig = Nf(
					{
						translations: { [s.language]: s.translations },
						disableAutoLanguageSwitch: !0,
						defaultLanguage: s.language,
					},
					a
				)),
			f
		);
	}
	function Hk(e, t, n) {
		let { get: o } = t,
			{ callbacks: r } = o(),
			{ translations: a } = e;
		n && r?.onConsentSet?.({ preferences: n }),
			a?.language &&
				a?.translations &&
				r?.onBannerFetched?.({
					jurisdiction: e.jurisdiction,
					location: e.location,
					translations: { language: a.language, translations: a.translations },
				});
	}
	async function Am(e, t, n, o) {
		let { set: r, get: a } = t,
			{ consentInfo: i } = a(),
			s = a().iab;
		if (t.iabConfig && !s) {
			let { createIABManager: p } = await Promise.resolve().then(
				() => (wm(), $v)
			);
			(s = p(t.iabConfig, a, r, t.manager)), r({ iab: s });
		}
		let l = s?.config.enabled && !o,
			u = s?.config.enabled && !l;
		l &&
			console.warn(
				'IAB mode disabled: Server returned 200 without GVL. Client IAB settings overridden.'
			);
		let { consentModel: d, autoGrantedConsents: f } = ty(
				e.jurisdiction ?? null,
				u,
				i,
				a().overrides?.gpc
			),
			c = Uk(e, t, n, u);
		if (
			(l && s
				? (c.iab = { ...s, config: { ...s.config, enabled: !1 } })
				: s &&
					e.cmpId != null &&
					(c.iab = { ...s, config: { ...s.config, cmpId: e.cmpId } }),
			r(c),
			Hk(e, t, f),
			a().updateScripts(),
			u && d === 'iab' && s)
		) {
			let p = e.customVendors ?? [],
				v = s.config.customVendors ?? [],
				C = new Set(p.map((g) => g.id)),
				y = [...p, ...v.filter((g) => !C.has(g.id))],
				b = {
					...s.config,
					customVendors: y,
					...(e.cmpId != null && { cmpId: e.cmpId }),
				};
			ey(b, { set: r, get: a }, o).catch((g) => {
				console.error('Failed to initialize IAB mode in updateStore:', g);
			});
		}
	}
	function ny(e) {
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
	async function Rm(e) {
		let { get: t, set: n, manager: o } = e,
			{ callbacks: r } = t();
		if (typeof window > 'u') return;
		let a = ny(n);
		if (!a) return;
		n({ isLoadingConsentInfo: !0 }), Fk(o, r);
		let i = await Pk(e);
		return i || Gk(e, a, o, r);
	}
	async function Pk(e) {
		let { ssrData: t, get: n, set: o } = e;
		if (!t || n().overrides) {
			o({ ssrDataUsed: !1, ssrSkippedReason: 'no_data' });
			return;
		}
		let r = await t;
		if (r?.init)
			return (
				await Am(r.init, e, !0, r.gvl),
				o({ ssrDataUsed: !0, ssrSkippedReason: null }),
				r.init
			);
		o({ ssrDataUsed: !1, ssrSkippedReason: 'fetch_failed' });
	}
	async function Gk(e, t, n, o) {
		let { set: r } = e;
		try {
			let { language: a, country: i, region: s } = e.get().overrides ?? {},
				{ data: l, error: u } = await n.init({
					headers: {
						...(a && { 'accept-language': a }),
						...(i && { 'x-c15t-country': i }),
						...(s && { 'x-c15t-region': s }),
					},
					onError: o.onError
						? (d) => {
								o.onError?.({ error: d.error?.message || 'Unknown error' });
							}
						: void 0,
				});
			if (u || !l)
				throw new Error(`Failed to fetch consent banner info: ${u?.message}`);
			return await Am(l, e, t, l.gvl ?? void 0), l;
		} catch (a) {
			console.error('Error fetching consent banner information:', a),
				r({ isLoadingConsentInfo: !1, activeUI: 'none' });
			let i =
				a instanceof Error
					? a.message
					: 'Unknown error fetching consent banner information';
			o.onError?.({ error: i });
			return;
		}
	}
	function Fk(e, t) {
		try {
			let n = localStorage.getItem(Rc);
			if (!n) return;
			localStorage.removeItem(Rc);
			let o = JSON.parse(n);
			e.setConsent({
				body: {
					type: 'cookie_banner',
					domain: o.domain,
					preferences: o.preferences,
					subjectId: o.subjectId,
					externalSubjectId: o.externalId,
					identityProvider: o.identityProvider,
					jurisdiction: o.jurisdiction,
					jurisdictionModel: o.jurisdictionModel ?? void 0,
					givenAt: o.givenAt,
					uiSource: o.uiSource ?? 'api',
				},
			})
				.then((r) => {
					if (!r.ok) {
						let a = r.error?.message ?? 'Failed to sync consent after reload';
						t.onError?.({ error: a }),
							t.onError ||
								console.error('Failed to sync consent after reload:', a);
					}
				})
				.catch((r) => {
					let a =
						r instanceof Error
							? r.message
							: 'Failed to sync consent after reload';
					t.onError?.({ error: a }),
						t.onError ||
							console.error('Failed to sync consent after reload:', r);
				});
		} catch {}
	}
	function Em(e) {
		return e ? e.toUpperCase() : 'GET';
	}
	function qk(e) {
		if (!e) return null;
		try {
			return typeof window > 'u' ? null : new URL(e, window.location.href);
		} catch {
			return null;
		}
	}
	function Yk(e, t) {
		if (!e) return !1;
		let n = t.domain.trim().toLowerCase(),
			o = e.trim().toLowerCase();
		if (!n || !o) return !1;
		if (o === n) return !0;
		let r = `.${n}`;
		return o.endsWith(r);
	}
	function Xk(e, t) {
		return typeof t.pathIncludes == 'string'
			? e
				? e.includes(t.pathIncludes)
				: !1
			: !0;
	}
	function Kk(e, t) {
		if (!t.methods || t.methods.length === 0) return !0;
		if (!e) return !1;
		let n = Em(e);
		return t.methods.some((o) => Em(o) === n);
	}
	function Qk(e, t, n) {
		return !(!Yk(e.hostname, n) || !Xk(e.pathname, n) || !Kk(t, n));
	}
	function Im(e, t, n) {
		if (!n) return { shouldBlock: !1 };
		if (!(n.enabled !== !1)) return { shouldBlock: !1 };
		if (!n.rules || n.rules.length === 0) return { shouldBlock: !1 };
		let r = qk(e.url);
		if (!r) return { shouldBlock: !1 };
		let a = Em(e.method);
		for (let i of n.rules) {
			if (!Qk(r, a, i)) continue;
			if (!On(i.category, t)) return { shouldBlock: !0, rule: i };
		}
		return { shouldBlock: !1 };
	}
	function oy(e, t) {
		let n = null,
			o = null,
			r = null,
			a = !1,
			i = null,
			s = (f, c) => {
				if (f) {
					if (f.logBlockedRequests !== !1) {
						let p = c.rule?.id ?? 'unknown';
						console.warn('[c15t] Network request blocked by consent manager', {
							method: c.method,
							url: c.url,
							ruleId: p,
						});
					}
					f.onRequestBlocked && f.onRequestBlocked(c);
				}
			},
			l = () => i || e().consents,
			u = () => {
				typeof window > 'u' ||
					!(typeof window.fetch == 'function') ||
					n ||
					((n = window.fetch),
					(window.fetch = (c, p) => {
						let C = e().networkBlocker;
						if (!n)
							throw new Error('Network blocker fetch wrapper not initialized.');
						if (!(C?.enabled && C?.rules && C?.rules.length > 0))
							return n.call(window, c, p);
						let b = 'GET';
						p?.method ? (b = p.method) : c instanceof Request && (b = c.method);
						let g;
						typeof c == 'string' || c instanceof URL
							? (g = c.toString())
							: (g = c.url);
						let m = l(),
							{ shouldBlock: h, rule: k } = Im({ url: g, method: b }, m, C);
						if (h) {
							s(C, { method: b, url: g, rule: k });
							let A = new Response(null, {
								status: 451,
								statusText: 'Request blocked by consent manager',
							});
							return Promise.resolve(A);
						}
						return n.call(window, c, p);
					}));
			},
			d = () => {
				typeof window > 'u' ||
					!(
						typeof window.XMLHttpRequest < 'u' &&
						typeof window.XMLHttpRequest.prototype.open == 'function' &&
						typeof window.XMLHttpRequest.prototype.send == 'function'
					) ||
					o ||
					r ||
					((o = window.XMLHttpRequest.prototype.open),
					(r = window.XMLHttpRequest.prototype.send),
					(window.XMLHttpRequest.prototype.open = function (c, p, v, C, y) {
						let b = this;
						if (((b.__c15tMethod = c), (b.__c15tUrl = p), !o))
							throw new Error(
								'Network blocker XHR open wrapper not initialized.'
							);
						return o.call(this, c, p, v ?? !0, C, y);
					}),
					(window.XMLHttpRequest.prototype.send = function (c) {
						let v = e().networkBlocker;
						if (v?.enabled !== !1 && v?.rules && v?.rules.length > 0) {
							let b = this,
								g = b.__c15tMethod || 'GET',
								m = b.__c15tUrl || '',
								h = l(),
								{ shouldBlock: k, rule: A } = Im({ url: m, method: g }, h, v);
							if (k) {
								s(v, { method: g, url: m, rule: A });
								try {
									this.abort();
								} catch {}
								let x = new ProgressEvent('error');
								typeof this.onerror == 'function' && this.onerror(x),
									this.dispatchEvent(x);
								return;
							}
						}
						if (!r)
							throw new Error(
								'Network blocker XHR send wrapper not initialized.'
							);
						return r.call(this, c);
					}));
			};
		return {
			initializeNetworkBlocker: () => {
				if (a || typeof window > 'u') return;
				let f = e(),
					c = f.networkBlocker;
				c?.enabled &&
					c?.rules &&
					c?.rules.length > 0 &&
					((i = f.consents), u(), d(), (a = !0));
			},
			updateNetworkBlockerConsents: () => {
				a && (i = e().consents);
			},
			setNetworkBlocker: (f) => {
				let p = f?.enabled !== !1 && f?.rules && f?.rules.length > 0;
				if ((t({ networkBlocker: f }), !p)) {
					if (!a || typeof window > 'u') return;
					n && ((window.fetch = n), (n = null)),
						o &&
							r &&
							((window.XMLHttpRequest.prototype.open = o),
							(window.XMLHttpRequest.prototype.send = r),
							(o = null),
							(r = null)),
						(i = null),
						(a = !1);
					return;
				}
				a || ((i = e().consents), u(), d(), (a = !0));
			},
			destroyNetworkBlocker: () => {
				a &&
					(typeof window > 'u' ||
						(n && ((window.fetch = n), (n = null)),
						o &&
							r &&
							((window.XMLHttpRequest.prototype.open = o),
							(window.XMLHttpRequest.prototype.send = r),
							(o = null),
							(r = null)),
						(i = null),
						(a = !1)));
			},
		};
	}
	wa();
	Pf();
	var ry = (e) => {
			if (typeof window > 'u') return null;
			try {
				return Xn(e);
			} catch (t) {
				return console.error('Failed to retrieve stored consent:', t), null;
			}
		},
		Nm = (e, t = {}) => {
			let {
				namespace: n = 'c15tStore',
				iab: o,
				ssrData: r,
				initialConsentCategories: a,
				initialTranslationConfig: i,
				enabled: s,
				debug: l,
				...u
			} = t;
			Gh(t.debug === !0);
			let d = ry(t.storageConfig),
				f = v1((c, p) => ({
					...Wh,
					...u,
					namespace: n,
					iab: null,
					...(a && { consentCategories: a }),
					...(d
						? {
								consents: d.consents,
								selectedConsents: d.consents,
								consentInfo: d.consentInfo,
								user: d.consentInfo?.externalId
									? {
											id: d.consentInfo.externalId,
											identityProvider: d.consentInfo.identityProvider,
										}
									: void 0,
								activeUI: 'none',
								isLoadingConsentInfo: !1,
							}
						: { activeUI: 'none', isLoadingConsentInfo: !0 }),
					setActiveUI: (v, C = {}) => {
						if (v === 'none' || v === 'dialog') {
							c({ activeUI: v });
							return;
						}
						if (C.force) {
							c({ activeUI: 'banner' });
							return;
						}
						let y = p();
						!ry() &&
							!y.consentInfo &&
							!y.isLoadingConsentInfo &&
							c({ activeUI: 'banner' });
					},
					setSelectedConsent: (v, C) => {
						c((y) =>
							y.consentTypes.find((g) => g.name === v)?.disabled
								? y
								: { selectedConsents: { ...y.selectedConsents, [v]: C } }
						);
					},
					saveConsents: async (v, C) =>
						await C1({ manager: e, type: v, get: p, set: c, options: C }),
					setConsent: (v, C) => {
						c((y) =>
							y.consentTypes.find((m) => m.name === v)?.disabled
								? y
								: { selectedConsents: { ...y.consents, [v]: C } }
						),
							p().saveConsents('custom');
					},
					resetConsents: () => {
						c(() => {
							let v = vo.reduce(
									(y, b) => ((y[b.name] = b.defaultValue), y),
									{}
								),
								C = { consents: v, selectedConsents: v, consentInfo: null };
							return ps(void 0, t.storageConfig), C;
						});
					},
					setConsentCategories: (v) => c({ consentCategories: v }),
					setCallback: (v, C) => {
						let y = p();
						if (
							(c((b) => ({ callbacks: { ...b.callbacks, [v]: C } })),
							v === 'onConsentSet' &&
								C &&
								typeof C == 'function' &&
								C?.({ preferences: y.consents }),
							v === 'onBannerFetched' &&
								y.hasFetchedBanner &&
								y.lastBannerFetchData &&
								C &&
								typeof C == 'function')
						) {
							let { lastBannerFetchData: b } = y,
								g = b.jurisdiction ?? 'NONE';
							C?.({
								jurisdiction: { code: g, message: '' },
								location: {
									countryCode: b.location.countryCode ?? null,
									regionCode: b.location.regionCode ?? null,
								},
								translations: {
									language: b.translations.language,
									translations: b.translations.translations,
								},
							});
						}
					},
					setLocationInfo: (v) => c({ locationInfo: v }),
					initConsentManager: () =>
						Rm({
							manager: e,
							ssrData: t.ssrData,
							initialTranslationConfig: t.initialTranslationConfig,
							iabConfig: o,
							get: p,
							set: c,
						}),
					getDisplayedConsents: () => {
						let { consentCategories: v, consentTypes: C } = p();
						return C.filter((y) => v.includes(y.name));
					},
					hasConsented: () => {
						let { consentInfo: v } = p();
						return v != null;
					},
					has: (v) => {
						let { consents: C } = p();
						return On(v, C);
					},
					setTranslationConfig: (v) => {
						c({ translationConfig: v });
					},
					updateConsentCategories: (v) => {
						let C = new Set([...p().consentCategories, ...v]),
							y = Array.from(C);
						c({ consentCategories: y });
					},
					identifyUser: async (v) => {
						let C = p().consentInfo,
							y = C?.subjectId;
						c({ user: v }),
							y &&
								((String(C?.externalId) === String(v.id) &&
									C?.identityProvider === v.identityProvider) ||
									(await e.identifyUser({
										body: {
											id: y,
											externalId: v.id,
											identityProvider: v.identityProvider,
										},
									}),
									c({
										consentInfo: {
											...C,
											time: C?.time || Date.now(),
											subjectId: y,
											externalId: v.id,
											identityProvider: v.identityProvider,
										},
									})));
					},
					setOverrides: async (v) => (
						c({ overrides: { ...p().overrides, ...v } }),
						await Rm({
							manager: e,
							initialTranslationConfig: t.initialTranslationConfig,
							get: p,
							set: c,
						})
					),
					setLanguage: async (v) =>
						await p().setOverrides({ ...(p().overrides ?? {}), language: v }),
					...tm(p, c),
					...y1(p, c),
					...oy(p, c),
				}));
			return (
				f.getState().initializeIframeBlocker(),
				t.networkBlocker &&
					(f.setState({ networkBlocker: t.networkBlocker }),
					f.getState().initializeNetworkBlocker()),
				t.scripts &&
					t.scripts.length > 0 &&
					f
						.getState()
						.updateConsentCategories(t.scripts.flatMap((c) => hc(c.category))),
				typeof window < 'u' &&
					((window[n] = f),
					f
						.getState()
						.callbacks.onConsentSet?.({ preferences: f.getState().consents }),
					t.user && f.getState().identifyUser(t.user),
					f.getState().initConsentManager()),
				f
			);
		};
	var Zk = '/api/c15t',
		ay = new Map(),
		iy = new Map();
	function Jk(e) {
		let t = e.enabled === !1 ? 'disabled' : 'enabled';
		return `${e.mode ?? 'c15t'}:${e.backendURL ?? 'default'}:${e.endpointHandlers ? 'custom' : 'none'}:${e.storageConfig?.storageKey ?? 'default'}:${e.defaultLanguage ?? 'default'}:${t}`;
	}
	function Lm(e, t) {
		let {
				mode: n,
				backendURL: o,
				store: r,
				translations: a,
				storageConfig: i,
				enabled: s,
				iab: l,
				consentCategories: u,
				debug: d,
			} = e,
			f = Jk({
				mode: n,
				backendURL: o,
				endpointHandlers: 'endpointHandlers' in e ? e.endpointHandlers : void 0,
				storageConfig: i,
				defaultLanguage: a?.defaultLanguage,
				enabled: s,
			}),
			c = ay.get(f);
		if (!c) {
			let v = { ...r, initialTranslationConfig: a, iab: l };
			n === 'offline'
				? (c = La({ mode: 'offline', store: v, storageConfig: i }))
				: n === 'custom' && 'endpointHandlers' in e
					? (c = La({
							mode: 'custom',
							endpointHandlers: e.endpointHandlers,
							store: v,
							storageConfig: i,
						}))
					: (c = La({
							mode: 'c15t',
							backendURL: o || Zk,
							store: v,
							storageConfig: i,
						})),
				ay.set(f, c);
		}
		let p = iy.get(f);
		return (
			p ||
				((p = Nm(c, {
					config: {
						pkg: t?.pkg || 'c15t',
						version: t?.version || Yn,
						mode: n || 'Unknown',
					},
					...e,
					...r,
					initialTranslationConfig: a,
					initialConsentCategories: u,
					debug: d,
				})),
				iy.set(f, p)),
			{ consentManager: c, consentStore: p, cacheKey: f }
		);
	}
	sc();
	wa();
	var zy = w(H(), 1);
	var $k = {
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/components/consent-banner.module.css'(
				e,
				t,
				n
			) {
				n.d(t, { A: () => s });
				var o = n(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'
					),
					r = n.n(o),
					a = n(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'
					),
					i = n.n(a)()(r());
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
				let s = i;
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'(
				e
			) {
				e.exports = function (t) {
					var n = [];
					return (
						(n.toString = function () {
							return this.map(function (o) {
								var r = '',
									a = o[5] !== void 0;
								return (
									o[4] && (r += '@supports ('.concat(o[4], ') {')),
									o[2] && (r += '@media '.concat(o[2], ' {')),
									a &&
										(r += '@layer'.concat(
											o[5].length > 0 ? ' '.concat(o[5]) : '',
											' {'
										)),
									(r += t(o)),
									a && (r += '}'),
									o[2] && (r += '}'),
									o[4] && (r += '}'),
									r
								);
							}).join('');
						}),
						(n.i = function (o, r, a, i, s) {
							typeof o == 'string' && (o = [[null, o, void 0]]);
							var l = {};
							if (a)
								for (var u = 0; u < this.length; u++) {
									var d = this[u][0];
									d != null && (l[d] = !0);
								}
							for (var f = 0; f < o.length; f++) {
								var c = [].concat(o[f]);
								(a && l[c[0]]) ||
									(s !== void 0 &&
										(c[5] === void 0 ||
											(c[1] = '@layer'
												.concat(c[5].length > 0 ? ' '.concat(c[5]) : '', ' {')
												.concat(c[1], '}')),
										(c[5] = s)),
									r &&
										(c[2] &&
											(c[1] = '@media '.concat(c[2], ' {').concat(c[1], '}')),
										(c[2] = r)),
									i &&
										(c[4]
											? ((c[1] = '@supports ('
													.concat(c[4], ') {')
													.concat(c[1], '}')),
												(c[4] = i))
											: (c[4] = ''.concat(i))),
									n.push(c));
							}
						}),
						n
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
				function n(r) {
					for (var a = -1, i = 0; i < t.length; i++)
						if (t[i].identifier === r) {
							a = i;
							break;
						}
					return a;
				}
				function o(r, a) {
					for (var i = {}, s = [], l = 0; l < r.length; l++) {
						var u = r[l],
							d = a.base ? u[0] + a.base : u[0],
							f = i[d] || 0,
							c = ''.concat(d, ' ').concat(f);
						i[d] = f + 1;
						var p = n(c),
							v = {
								css: u[1],
								media: u[2],
								sourceMap: u[3],
								supports: u[4],
								layer: u[5],
							};
						if (p !== -1) t[p].references++, t[p].updater(v);
						else {
							var C = (function (y, b) {
								var g = b.domAPI(b);
								return (
									g.update(y),
									function (m) {
										m
											? (m.css !== y.css ||
													m.media !== y.media ||
													m.sourceMap !== y.sourceMap ||
													m.supports !== y.supports ||
													m.layer !== y.layer) &&
												g.update((y = m))
											: g.remove();
									}
								);
							})(v, a);
							(a.byIndex = l),
								t.splice(l, 0, { identifier: c, updater: C, references: 1 });
						}
						s.push(c);
					}
					return s;
				}
				e.exports = function (r, a) {
					var i = o((r = r || []), (a = a || {}));
					return function (s) {
						s = s || [];
						for (var l = 0; l < i.length; l++) {
							var u = n(i[l]);
							t[u].references--;
						}
						for (var d = o(s, a), f = 0; f < i.length; f++) {
							var c = n(i[f]);
							t[c].references === 0 && (t[c].updater(), t.splice(c, 1));
						}
						i = d;
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'(
				e
			) {
				var t = {};
				e.exports = function (n, o) {
					var r = (function (a) {
						if (t[a] === void 0) {
							var i = document.querySelector(a);
							if (
								window.HTMLIFrameElement &&
								i instanceof window.HTMLIFrameElement
							)
								try {
									i = i.contentDocument.head;
								} catch {
									i = null;
								}
							t[a] = i;
						}
						return t[a];
					})(n);
					if (!r)
						throw Error(
							"Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid."
						);
					r.appendChild(o);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'(
				e
			) {
				e.exports = function (t) {
					var n = document.createElement('style');
					return t.setAttributes(n, t.attributes), t.insert(n, t.options), n;
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'(
				e,
				t,
				n
			) {
				e.exports = function (o) {
					var r = n.nc;
					r && o.setAttribute('nonce', r);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'(
				e
			) {
				e.exports = function (t) {
					if (typeof document > 'u')
						return { update: function () {}, remove: function () {} };
					var n = t.insertStyleElement(t);
					return {
						update: function (o) {
							var r, a, i;
							(r = ''),
								o.supports && (r += '@supports ('.concat(o.supports, ') {')),
								o.media && (r += '@media '.concat(o.media, ' {')),
								(a = o.layer !== void 0) &&
									(r += '@layer'.concat(
										o.layer.length > 0 ? ' '.concat(o.layer) : '',
										' {'
									)),
								(r += o.css),
								a && (r += '}'),
								o.media && (r += '}'),
								o.supports && (r += '}'),
								(i = o.sourceMap) &&
									typeof btoa < 'u' &&
									(r += `
/*# sourceMappingURL=data:application/json;base64,`.concat(
										btoa(unescape(encodeURIComponent(JSON.stringify(i)))),
										' */'
									)),
								t.styleTagTransform(r, n, t.options);
						},
						remove: function () {
							var o;
							(o = n).parentNode === null || o.parentNode.removeChild(o);
						},
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'(
				e
			) {
				e.exports = function (t, n) {
					if (n.styleSheet) n.styleSheet.cssText = t;
					else {
						for (; n.firstChild; ) n.removeChild(n.firstChild);
						n.appendChild(document.createTextNode(t));
					}
				};
			},
		},
		sy = {};
	function Be(e) {
		var t = sy[e];
		if (t !== void 0) return t.exports;
		var n = (sy[e] = { id: e, exports: {} });
		return $k[e](n, n.exports, Be), n.exports;
	}
	(Be.n = (e) => {
		var t = e && e.__esModule ? () => e.default : () => e;
		return Be.d(t, { a: t }), t;
	}),
		(Be.d = (e, t) => {
			for (var n in t)
				Be.o(t, n) &&
					!Be.o(e, n) &&
					Object.defineProperty(e, n, { enumerable: !0, get: t[n] });
		}),
		(Be.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t)),
		(Be.nc = void 0);
	var ew = Be(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'
		),
		tw = Be.n(ew),
		nw = Be(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'
		),
		ow = Be.n(nw),
		rw = Be(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'
		),
		aw = Be.n(rw),
		iw = Be(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'
		),
		sw = Be.n(iw),
		lw = Be(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'
		),
		cw = Be.n(lw),
		uw = Be(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'
		),
		dw = Be.n(uw),
		Uc = Be(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/components/consent-banner.module.css'
		),
		Va = {};
	(Va.styleTagTransform = dw()),
		(Va.setAttributes = sw()),
		(Va.insert = aw().bind(null, 'head')),
		(Va.domAPI = ow()),
		(Va.insertStyleElement = cw()),
		tw()(Uc.A, Va);
	var it = Uc.A && Uc.A.locals ? Uc.A.locals : void 0;
	var Ga = w(j(), 1);
	var Pa = w(j(), 1);
	var Cy = w(j(), 1),
		Pc = (0, Cy.createContext)(void 0);
	function K() {
		let e = (0, Pa.useContext)(Pc);
		if (e === void 0)
			throw Error(
				'useConsentManager must be used within a ConsentManagerProvider'
			);
		let {
				consents: t,
				consentInfo: n,
				consentCategories: o,
				consentTypes: r,
			} = e.state,
			a = (0, Pa.useCallback)((l) => On(l, t), [t]),
			i = (0, Pa.useCallback)(() => n != null, [n]),
			s = (0, Pa.useCallback)(
				() => r.filter((l) => o.includes(l.name)),
				[r, o]
			);
		return {
			...e.state,
			has: a,
			hasConsented: i,
			getDisplayedConsents: s,
			manager: e.manager,
		};
	}
	function Sy(e) {
		var t,
			n,
			o = '';
		if (typeof e == 'string' || typeof e == 'number') o += e;
		else if (typeof e == 'object')
			if (Array.isArray(e)) {
				var r = e.length;
				for (t = 0; t < r; t++)
					e[t] && (n = Sy(e[t])) && (o && (o += ' '), (o += n));
			} else for (n in e) e[n] && (o && (o += ' '), (o += n));
		return o;
	}
	function Ew() {
		for (var e, t, n = 0, o = '', r = arguments.length; n < r; n++)
			(e = arguments[n]) && (t = Sy(e)) && (o && (o += ' '), (o += t));
		return o;
	}
	var xy = Ew;
	function Gc(...e) {
		return xy(...e);
	}
	function Vm(e, t) {
		if (!t || typeof t != 'object') return e;
		let n = { ...e };
		for (let o in t)
			t[o] && typeof t[o] == 'object' && !Array.isArray(t[o])
				? (n[o] = Vm(n[o] || {}, t[o]))
				: (n[o] = t[o]);
		return n;
	}
	function ky(e) {
		let t = window.matchMedia('(prefers-color-scheme: dark)'),
			n = document.documentElement.classList.contains('dark'),
			o = (a) => {
				document.documentElement.classList.toggle('c15t-dark', a.matches);
			},
			r = new MutationObserver((a) => {
				for (let i of a)
					if (i.type === 'attributes' && i.attributeName === 'class') {
						let s = document.documentElement.classList.contains('dark');
						document.documentElement.classList.toggle('c15t-dark', s);
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
				o(t), t.addEventListener('change', o);
				break;
			default:
				document.documentElement.classList.toggle('c15t-dark', n),
					r.observe(document.documentElement, { attributes: !0 });
		}
		return () => {
			t.removeEventListener('change', o), r.disconnect();
		};
	}
	var Iw = ['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'ku', 'dv'];
	function Um(e) {
		let t = e ? e.split('-')[0]?.toLowerCase() : 'en';
		return Iw.includes(t || '') ? 'rtl' : 'ltr';
	}
	function wy(e) {
		return (
			Um(e) === 'rtl'
				? document.body.classList.add('c15t-rtl')
				: document.body.classList.remove('c15t-rtl'),
			() => {
				document.body.classList.remove('c15t-rtl');
			}
		);
	}
	function Ty(e) {
		return Array.from(
			e.querySelectorAll(
				'a[href]:not([disabled]),button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[contenteditable],[tabindex]:not([tabindex="-1"])'
			)
		).filter((t) => t.offsetWidth > 0 && t.offsetHeight > 0);
	}
	function Ay() {
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
	function Ry(e) {
		let t = document.activeElement,
			n = Ty(e);
		if (n.length > 0)
			setTimeout(() => {
				n[0]?.focus();
			}, 0);
		else if (e.tabIndex !== -1)
			try {
				e.focus();
			} catch {}
		let o = (r) => {
			if (r.key !== 'Tab') return;
			let a = Ty(e);
			if (a.length === 0) return;
			let i = a[0],
				s = a[a.length - 1];
			r.shiftKey && document.activeElement === i
				? (r.preventDefault(), s?.focus())
				: r.shiftKey ||
					document.activeElement !== s ||
					(r.preventDefault(), i?.focus());
		};
		return (
			document.addEventListener('keydown', o),
			() => {
				document.removeEventListener('keydown', o),
					t && typeof t.focus == 'function' && setTimeout(() => t.focus(), 0);
			}
		);
	}
	function Fc(e, t) {
		let n = (s) => {
				if (s !== void 0) return typeof s == 'string' ? { className: s } : s;
			},
			o = n(e),
			r = n(t);
		if ((o?.noStyle || r?.noStyle) && r?.noStyle)
			return { className: r.className, style: r.style, noStyle: !0 };
		let a = Gc(o?.baseClassName, o?.className, r?.baseClassName, r?.className),
			i = { ...o?.style, ...r?.style };
		return {
			className: a || void 0,
			style: Object.keys(i).length > 0 ? i : void 0,
			noStyle: o?.noStyle || r?.noStyle,
		};
	}
	function Ey(e, t, n, o = !1) {
		let r = t?.slots?.[e],
			a = typeof r == 'object' && r !== null && !!r.noStyle,
			i = typeof n == 'object' && n !== null && !!n.noStyle;
		if (o || a || i) {
			let u = Fc(r || {}, n || {});
			return { className: u.className, style: u.style, noStyle: !0 };
		}
		let s = Fc(
				typeof n == 'object' ? { ...n, className: void 0 } : {},
				r || {}
			),
			l = Fc(s, n || {});
		return { className: l.className, style: l.style };
	}
	function Ny(e, t) {
		let { translations: n = {}, defaultLanguage: o = 'en' } = e,
			r = n[o];
		if (Iy(r)) return r;
		let a = n.en;
		return Iy(a) ? a : t.translations.en;
	}
	function Iy(e) {
		return (
			!!e &&
			typeof e == 'object' &&
			'cookieBanner' in e &&
			'consentManagerDialog' in e &&
			'consentTypes' in e &&
			'common' in e
		);
	}
	var _y = {
			defaultPosition: 'bottom-right',
			offset: 20,
			persistPosition: !0,
			storageKey: 'c15t-trigger-position',
		},
		Nw = 30,
		Ly = 0.15;
	function Oy(e, t, n, o = {}) {
		let { threshold: r = Nw, velocityX: a = 0, velocityY: i = 0 } = o,
			s = Math.abs(t),
			l = Math.abs(n),
			u = Math.abs(a),
			d = Math.abs(i),
			f = s >= r || (u >= Ly && s >= 10),
			c = l >= r || (d >= Ly && l >= 10);
		if (!f && !c) return e;
		let p = e.includes('bottom'),
			v = e.includes('right'),
			C = p,
			y = v;
		return (
			f && (y = t > 0),
			c && (C = n > 0),
			C && y
				? 'bottom-right'
				: C && !y
					? 'bottom-left'
					: !C && y
						? 'top-right'
						: 'top-left'
		);
	}
	function By(e, t = _y.storageKey) {
		try {
			typeof localStorage < 'u' && localStorage.setItem(t, e);
		} catch {}
	}
	function Dy(e = _y.storageKey) {
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
	function qc() {
		return { isDragging: !1, startX: 0, startY: 0, currentX: 0, currentY: 0 };
	}
	var My = w(j(), 1);
	function dn(e) {
		(0, My.useEffect)(() => {
			if (e) return Ay();
		}, [e]);
	}
	var jy = w(j(), 1);
	var Pm = w(j(), 1);
	var Hm = w(j(), 1),
		Yc = (0, Hm.createContext)({
			theme: void 0,
			noStyle: !1,
			disableAnimation: !1,
			scrollLock: !1,
			trapFocus: !0,
			colorScheme: 'system',
		}),
		fn = (0, Hm.createContext)(null);
	var le = () => {
		let e = (0, Pm.useContext)(Yc),
			t = (0, Pm.useContext)(fn);
		if (!e) throw Error('Theme components must be used within Theme.Root');
		return (function n(o, r) {
			if (!r) return o;
			let a = { ...o };
			for (let i in r)
				r[i] !== void 0 &&
					(r[i] &&
					typeof r[i] == 'object' &&
					!Array.isArray(r[i]) &&
					o[i] &&
					typeof o[i] == 'object'
						? (a[i] = n(o[i], r[i]))
						: (a[i] = r[i]));
			return a;
		})(e, t || null);
	};
	function oe(e, t, n) {
		let { noStyle: o, theme: r } = le(),
			a = n ?? r;
		return (0, jy.useMemo)(() => Ey(e, a, t, o), [e, a, t, o]);
	}
	function wt(...e) {
		return Gc(...e);
	}
	var Vy = (0, Ga.forwardRef)(
			({ className: e, style: t, noStyle: n, asChild: o, ...r }, a) => {
				let i,
					{ activeUI: s } = K(),
					{ disableAnimation: l, noStyle: u, scrollLock: d } = le(),
					f = s === 'banner',
					[c, p] = (0, Ga.useState)(!1);
				(0, Ga.useEffect)(() => {
					if (f) p(!0);
					else if (l) p(!1);
					else {
						let y = setTimeout(
							() => {
								p(!1);
							},
							Number.parseInt(
								getComputedStyle(document.documentElement).getPropertyValue(
									'--consent-banner-animation-duration'
								) || '200',
								10
							)
						);
						return () => clearTimeout(y);
					}
				}, [f, l]);
				let v = oe('consentBannerOverlay', {
					baseClassName: !(u || n) && it.overlay,
					className: e,
					noStyle: u || n,
				});
				i = u || n || l ? void 0 : c ? it.overlayVisible : it.overlayHidden;
				let C = wt(v.className, i);
				return (
					dn(!!(f && d)),
					f && d
						? (0, zy.jsx)('div', {
								ref: a,
								...r,
								className: C,
								style: { ...v.style, ...t },
								'data-testid': 'consent-banner-overlay',
							})
						: null
				);
			}
		),
		Xc = Vy;
	var $n = w(H(), 1);
	var Bn = w(j(), 1),
		Fy = w(Co(), 1);
	var Qc = w(j(), 1),
		Dt = (0, Qc.createContext)({}),
		Zc = () => (0, Qc.useContext)(Dt);
	var Jc = w(j(), 1);
	function mn(e) {
		let t = (0, Jc.useMemo)(() => Um(e), [e]);
		return (0, Jc.useEffect)(() => wy(e), [e]), t;
	}
	var Wc = ({
			children: e,
			className: t,
			noStyle: n,
			disableAnimation: o,
			scrollLock: r,
			trapFocus: a = !0,
			models: i,
			uiSource: s,
			...l
		}) =>
			(0, $n.jsx)(Dt.Provider, {
				value: { uiSource: s ?? 'banner' },
				children: (0, $n.jsx)(fn.Provider, {
					value: {
						disableAnimation: o,
						noStyle: n,
						scrollLock: r,
						trapFocus: a,
					},
					children: (0, $n.jsx)(qy, {
						disableAnimation: o,
						className: t,
						noStyle: n,
						models: i,
						...l,
						children: e,
					}),
				}),
			}),
		qy = (0, Bn.forwardRef)(
			(
				{
					asChild: e,
					children: t,
					className: n,
					style: o,
					className: r,
					disableAnimation: a,
					noStyle: i,
					models: s = ['opt-in'],
					...l
				},
				u
			) => {
				let { activeUI: d, translationConfig: f, model: c } = K(),
					p = mn(f.defaultLanguage),
					[v, C] = (0, Bn.useState)(!1),
					[y, b] = (0, Bn.useState)(!1),
					[g, m] = (0, Bn.useState)(200),
					h = d === 'banner' && s.includes(c);
				(0, Bn.useEffect)(() => {
					m(
						Number.parseInt(
							getComputedStyle(document.documentElement).getPropertyValue(
								'--consent-banner-animation-duration'
							) || '200',
							10
						)
					);
				}, []),
					(0, Bn.useEffect)(() => {
						if (h)
							if (y) C(!0);
							else {
								let _ = setTimeout(() => {
									C(!0), b(!0);
								}, 10);
								return () => clearTimeout(_);
							}
						else if ((b(!1), a)) C(!1);
						else {
							let _ = setTimeout(() => {
								C(!1);
							}, g);
							return () => clearTimeout(_);
						}
					}, [h, a, y, g]);
				let k = oe('consentBanner', {
						baseClassName: [
							it.root,
							p === 'ltr' ? it.bottomLeft : it.bottomRight,
						],
						style: o,
						className: n || r,
						noStyle: i,
					}),
					[A, x] = (0, Bn.useState)(!1);
				if (
					((0, Bn.useEffect)(() => {
						x(!0);
					}, []),
					!A)
				)
					return null;
				let L = i
					? k.className || ''
					: `${k.className || ''} ${v ? it.bannerVisible : it.bannerHidden}`;
				return h
					? (0, Fy.createPortal)(
							(0, $n.jsxs)($n.Fragment, {
								children: [
									(0, $n.jsx)(Xc, {}),
									(0, $n.jsx)('div', {
										ref: u,
										...l,
										...k,
										className: L,
										'data-testid': 'consent-banner-root',
										dir: p,
										children: t,
									}),
								],
							}),
							document.body
						)
					: null;
			}
		);
	qy.displayName = 'ConsentBannerRootChildren';
	var Yy = Wc;
	var Kt = w(H(), 1);
	var bn = w(j(), 1);
	var Xy = w(j(), 1);
	function pn(e, t) {
		(0, Xy.useEffect)(() => {
			if (e && t && t.current) return Ry(t.current);
		}, [e, t]);
	}
	var Ky = w(j(), 1);
	function Ne() {
		let { translationConfig: e } = K();
		return (0, Ky.useMemo)(() => Ny(e, cn), [e]);
	}
	var Wy = w(H(), 1);
	var Xe = w(j(), 1);
	var Zy = w(j(), 1);
	function Qy(e, t) {
		if (typeof e == 'function') return e(t);
		e != null && (e.current = t);
	}
	function Os(...e) {
		return (t) => {
			let n = !1,
				o = e.map((r) => {
					let a = Qy(r, t);
					return !n && typeof a == 'function' && (n = !0), a;
				});
			if (n)
				return () => {
					for (let r = 0; r < o.length; r++) {
						let a = o[r];
						typeof a == 'function' ? a() : Qy(e[r], null);
					}
				};
		};
	}
	function gn(...e) {
		return Zy.useCallback(Os(...e), e);
	}
	var $c = w(H(), 1),
		Bw = Symbol.for('react.lazy'),
		eu = Xe[' use '.trim().toString()];
	function Dw(e) {
		return typeof e == 'object' && e !== null && 'then' in e;
	}
	function Jy(e) {
		return (
			e != null &&
			typeof e == 'object' &&
			'$$typeof' in e &&
			e.$$typeof === Bw &&
			'_payload' in e &&
			Dw(e._payload)
		);
	}
	function Mw(e) {
		let t = jw(e),
			n = Xe.forwardRef((o, r) => {
				let { children: a, ...i } = o;
				Jy(a) && typeof eu == 'function' && (a = eu(a._payload));
				let s = Xe.Children.toArray(a),
					l = s.find(Vw);
				if (l) {
					let u = l.props.children,
						d = s.map((f) =>
							f === l
								? Xe.Children.count(u) > 1
									? Xe.Children.only(null)
									: Xe.isValidElement(u)
										? u.props.children
										: null
								: f
						);
					return (0, $c.jsx)(t, {
						...i,
						ref: r,
						children: Xe.isValidElement(u)
							? Xe.cloneElement(u, void 0, d)
							: null,
					});
				}
				return (0, $c.jsx)(t, { ...i, ref: r, children: a });
			});
		return (n.displayName = `${e}.Slot`), n;
	}
	var Fa = Mw('Slot');
	function jw(e) {
		let t = Xe.forwardRef((n, o) => {
			let { children: r, ...a } = n;
			if (
				(Jy(r) && typeof eu == 'function' && (r = eu(r._payload)),
				Xe.isValidElement(r))
			) {
				let i = Hw(r),
					s = Uw(a, r.props);
				return (
					r.type !== Xe.Fragment && (s.ref = o ? Os(o, i) : i),
					Xe.cloneElement(r, s)
				);
			}
			return Xe.Children.count(r) > 1 ? Xe.Children.only(null) : null;
		});
		return (t.displayName = `${e}.SlotClone`), t;
	}
	var zw = Symbol('radix.slottable');
	function Vw(e) {
		return (
			Xe.isValidElement(e) &&
			typeof e.type == 'function' &&
			'__radixId' in e.type &&
			e.type.__radixId === zw
		);
	}
	function Uw(e, t) {
		let n = { ...t };
		for (let o in t) {
			let r = e[o],
				a = t[o];
			/^on[A-Z]/.test(o)
				? r && a
					? (n[o] = (...s) => {
							let l = a(...s);
							return r(...s), l;
						})
					: r && (n[o] = r)
				: o === 'style'
					? (n[o] = { ...r, ...a })
					: o === 'className' && (n[o] = [r, a].filter(Boolean).join(' '));
		}
		return { ...e, ...n };
	}
	function Hw(e) {
		let t = Object.getOwnPropertyDescriptor(e.props, 'ref')?.get,
			n = t && 'isReactWarning' in t && t.isReactWarning;
		return n
			? e.ref
			: ((t = Object.getOwnPropertyDescriptor(e, 'ref')?.get),
				(n = t && 'isReactWarning' in t && t.isReactWarning),
				n ? e.props.ref : e.props.ref || e.ref);
	}
	var $y = w(j(), 1);
	var de = (0, $y.forwardRef)(
		(
			{
				asChild: e,
				className: t,
				style: n,
				themeKey: o,
				baseClassName: r,
				noStyle: a,
				...i
			},
			s
		) => {
			let l = oe(o, { baseClassName: r, className: t, style: n, noStyle: a });
			return (0, Wy.jsx)(e ? Fa : 'div', { ref: s, ...i, ...l });
		}
	);
	de.displayName = 'Box';
	var r0 = w(H(), 1);
	var au = w(j(), 1);
	var qm = w(H(), 1);
	var Pw = {
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/primitives/accordion.module.css'(
				e,
				t,
				n
			) {
				n.d(t, { A: () => s });
				var o = n(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'
					),
					r = n.n(o),
					a = n(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'
					),
					i = n.n(a)()(r());
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
				let s = i;
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'(
				e
			) {
				e.exports = function (t) {
					var n = [];
					return (
						(n.toString = function () {
							return this.map(function (o) {
								var r = '',
									a = o[5] !== void 0;
								return (
									o[4] && (r += '@supports ('.concat(o[4], ') {')),
									o[2] && (r += '@media '.concat(o[2], ' {')),
									a &&
										(r += '@layer'.concat(
											o[5].length > 0 ? ' '.concat(o[5]) : '',
											' {'
										)),
									(r += t(o)),
									a && (r += '}'),
									o[2] && (r += '}'),
									o[4] && (r += '}'),
									r
								);
							}).join('');
						}),
						(n.i = function (o, r, a, i, s) {
							typeof o == 'string' && (o = [[null, o, void 0]]);
							var l = {};
							if (a)
								for (var u = 0; u < this.length; u++) {
									var d = this[u][0];
									d != null && (l[d] = !0);
								}
							for (var f = 0; f < o.length; f++) {
								var c = [].concat(o[f]);
								(a && l[c[0]]) ||
									(s !== void 0 &&
										(c[5] === void 0 ||
											(c[1] = '@layer'
												.concat(c[5].length > 0 ? ' '.concat(c[5]) : '', ' {')
												.concat(c[1], '}')),
										(c[5] = s)),
									r &&
										(c[2] &&
											(c[1] = '@media '.concat(c[2], ' {').concat(c[1], '}')),
										(c[2] = r)),
									i &&
										(c[4]
											? ((c[1] = '@supports ('
													.concat(c[4], ') {')
													.concat(c[1], '}')),
												(c[4] = i))
											: (c[4] = ''.concat(i))),
									n.push(c));
							}
						}),
						n
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
				function n(r) {
					for (var a = -1, i = 0; i < t.length; i++)
						if (t[i].identifier === r) {
							a = i;
							break;
						}
					return a;
				}
				function o(r, a) {
					for (var i = {}, s = [], l = 0; l < r.length; l++) {
						var u = r[l],
							d = a.base ? u[0] + a.base : u[0],
							f = i[d] || 0,
							c = ''.concat(d, ' ').concat(f);
						i[d] = f + 1;
						var p = n(c),
							v = {
								css: u[1],
								media: u[2],
								sourceMap: u[3],
								supports: u[4],
								layer: u[5],
							};
						if (p !== -1) t[p].references++, t[p].updater(v);
						else {
							var C = (function (y, b) {
								var g = b.domAPI(b);
								return (
									g.update(y),
									function (m) {
										m
											? (m.css !== y.css ||
													m.media !== y.media ||
													m.sourceMap !== y.sourceMap ||
													m.supports !== y.supports ||
													m.layer !== y.layer) &&
												g.update((y = m))
											: g.remove();
									}
								);
							})(v, a);
							(a.byIndex = l),
								t.splice(l, 0, { identifier: c, updater: C, references: 1 });
						}
						s.push(c);
					}
					return s;
				}
				e.exports = function (r, a) {
					var i = o((r = r || []), (a = a || {}));
					return function (s) {
						s = s || [];
						for (var l = 0; l < i.length; l++) {
							var u = n(i[l]);
							t[u].references--;
						}
						for (var d = o(s, a), f = 0; f < i.length; f++) {
							var c = n(i[f]);
							t[c].references === 0 && (t[c].updater(), t.splice(c, 1));
						}
						i = d;
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'(
				e
			) {
				var t = {};
				e.exports = function (n, o) {
					var r = (function (a) {
						if (t[a] === void 0) {
							var i = document.querySelector(a);
							if (
								window.HTMLIFrameElement &&
								i instanceof window.HTMLIFrameElement
							)
								try {
									i = i.contentDocument.head;
								} catch {
									i = null;
								}
							t[a] = i;
						}
						return t[a];
					})(n);
					if (!r)
						throw Error(
							"Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid."
						);
					r.appendChild(o);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'(
				e
			) {
				e.exports = function (t) {
					var n = document.createElement('style');
					return t.setAttributes(n, t.attributes), t.insert(n, t.options), n;
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'(
				e,
				t,
				n
			) {
				e.exports = function (o) {
					var r = n.nc;
					r && o.setAttribute('nonce', r);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'(
				e
			) {
				e.exports = function (t) {
					if (typeof document > 'u')
						return { update: function () {}, remove: function () {} };
					var n = t.insertStyleElement(t);
					return {
						update: function (o) {
							var r, a, i;
							(r = ''),
								o.supports && (r += '@supports ('.concat(o.supports, ') {')),
								o.media && (r += '@media '.concat(o.media, ' {')),
								(a = o.layer !== void 0) &&
									(r += '@layer'.concat(
										o.layer.length > 0 ? ' '.concat(o.layer) : '',
										' {'
									)),
								(r += o.css),
								a && (r += '}'),
								o.media && (r += '}'),
								o.supports && (r += '}'),
								(i = o.sourceMap) &&
									typeof btoa < 'u' &&
									(r += `
/*# sourceMappingURL=data:application/json;base64,`.concat(
										btoa(unescape(encodeURIComponent(JSON.stringify(i)))),
										' */'
									)),
								t.styleTagTransform(r, n, t.options);
						},
						remove: function () {
							var o;
							(o = n).parentNode === null || o.parentNode.removeChild(o);
						},
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'(
				e
			) {
				e.exports = function (t, n) {
					if (n.styleSheet) n.styleSheet.cssText = t;
					else {
						for (; n.firstChild; ) n.removeChild(n.firstChild);
						n.appendChild(document.createTextNode(t));
					}
				};
			},
		},
		e0 = {};
	function De(e) {
		var t = e0[e];
		if (t !== void 0) return t.exports;
		var n = (e0[e] = { id: e, exports: {} });
		return Pw[e](n, n.exports, De), n.exports;
	}
	(De.n = (e) => {
		var t = e && e.__esModule ? () => e.default : () => e;
		return De.d(t, { a: t }), t;
	}),
		(De.d = (e, t) => {
			for (var n in t)
				De.o(t, n) &&
					!De.o(e, n) &&
					Object.defineProperty(e, n, { enumerable: !0, get: t[n] });
		}),
		(De.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t)),
		(De.nc = void 0);
	var Gw = De(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'
		),
		Fw = De.n(Gw),
		qw = De(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'
		),
		Yw = De.n(qw),
		Xw = De(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'
		),
		Kw = De.n(Xw),
		Qw = De(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'
		),
		Zw = De.n(Qw),
		Jw = De(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'
		),
		Ww = De.n(Jw),
		$w = De(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'
		),
		eA = De.n($w),
		tu = De(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/primitives/accordion.module.css'
		),
		qa = {};
	(qa.styleTagTransform = eA()),
		(qa.setAttributes = Zw()),
		(qa.insert = Kw().bind(null, 'head')),
		(qa.domAPI = Yw()),
		(qa.insertStyleElement = Ww()),
		Fw()(tu.A, qa);
	var Dn = tu.A && tu.A.locals ? tu.A.locals : void 0;
	var $o = ({ variant: e = 'default', size: t = 'medium' } = {}) => {
		let n = { default: void 0, bordered: 'root-bordered' },
			o = { medium: void 0, small: 'root-small' };
		return {
			root: (r) => {
				let a = [Dn.root],
					i = n[e];
				i && a.push(Dn[i]);
				let s = o[t];
				return (
					s && a.push(Dn[s]),
					r?.class && a.push(r.class),
					a.filter(Boolean).join(' ')
				);
			},
			item: (r) => {
				let a = [Dn.item];
				return r?.class && a.push(r.class), a.filter(Boolean).join(' ');
			},
			trigger: (r) => {
				let a = [Dn.triggerInner];
				return r?.class && a.push(r.class), a.filter(Boolean).join(' ');
			},
			icon: (r) => {
				let a = [Dn.icon];
				return r?.class && a.push(r.class), a.filter(Boolean).join(' ');
			},
			arrowOpen: (r) => {
				let a = [Dn.arrowOpen];
				return r?.class && a.push(r.class), a.filter(Boolean).join(' ');
			},
			arrowClose: (r) => {
				let a = [Dn.arrowClose];
				return r?.class && a.push(r.class), a.filter(Boolean).join(' ');
			},
			content: (r) => {
				let a = [Dn.content];
				return r?.class && a.push(r.class), a.filter(Boolean).join(' ');
			},
			contentInner: (r) => {
				let a = [Dn.contentInner];
				return r?.class && a.push(r.class), a.filter(Boolean).join(' ');
			},
		};
	};
	var tA = {
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/primitives/button.module.css'(
				e,
				t,
				n
			) {
				n.d(t, { A: () => s });
				var o = n(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'
					),
					r = n.n(o),
					a = n(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'
					),
					i = n.n(a)()(r());
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
				let s = i;
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'(
				e
			) {
				e.exports = function (t) {
					var n = [];
					return (
						(n.toString = function () {
							return this.map(function (o) {
								var r = '',
									a = o[5] !== void 0;
								return (
									o[4] && (r += '@supports ('.concat(o[4], ') {')),
									o[2] && (r += '@media '.concat(o[2], ' {')),
									a &&
										(r += '@layer'.concat(
											o[5].length > 0 ? ' '.concat(o[5]) : '',
											' {'
										)),
									(r += t(o)),
									a && (r += '}'),
									o[2] && (r += '}'),
									o[4] && (r += '}'),
									r
								);
							}).join('');
						}),
						(n.i = function (o, r, a, i, s) {
							typeof o == 'string' && (o = [[null, o, void 0]]);
							var l = {};
							if (a)
								for (var u = 0; u < this.length; u++) {
									var d = this[u][0];
									d != null && (l[d] = !0);
								}
							for (var f = 0; f < o.length; f++) {
								var c = [].concat(o[f]);
								(a && l[c[0]]) ||
									(s !== void 0 &&
										(c[5] === void 0 ||
											(c[1] = '@layer'
												.concat(c[5].length > 0 ? ' '.concat(c[5]) : '', ' {')
												.concat(c[1], '}')),
										(c[5] = s)),
									r &&
										(c[2] &&
											(c[1] = '@media '.concat(c[2], ' {').concat(c[1], '}')),
										(c[2] = r)),
									i &&
										(c[4]
											? ((c[1] = '@supports ('
													.concat(c[4], ') {')
													.concat(c[1], '}')),
												(c[4] = i))
											: (c[4] = ''.concat(i))),
									n.push(c));
							}
						}),
						n
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
				function n(r) {
					for (var a = -1, i = 0; i < t.length; i++)
						if (t[i].identifier === r) {
							a = i;
							break;
						}
					return a;
				}
				function o(r, a) {
					for (var i = {}, s = [], l = 0; l < r.length; l++) {
						var u = r[l],
							d = a.base ? u[0] + a.base : u[0],
							f = i[d] || 0,
							c = ''.concat(d, ' ').concat(f);
						i[d] = f + 1;
						var p = n(c),
							v = {
								css: u[1],
								media: u[2],
								sourceMap: u[3],
								supports: u[4],
								layer: u[5],
							};
						if (p !== -1) t[p].references++, t[p].updater(v);
						else {
							var C = (function (y, b) {
								var g = b.domAPI(b);
								return (
									g.update(y),
									function (m) {
										m
											? (m.css !== y.css ||
													m.media !== y.media ||
													m.sourceMap !== y.sourceMap ||
													m.supports !== y.supports ||
													m.layer !== y.layer) &&
												g.update((y = m))
											: g.remove();
									}
								);
							})(v, a);
							(a.byIndex = l),
								t.splice(l, 0, { identifier: c, updater: C, references: 1 });
						}
						s.push(c);
					}
					return s;
				}
				e.exports = function (r, a) {
					var i = o((r = r || []), (a = a || {}));
					return function (s) {
						s = s || [];
						for (var l = 0; l < i.length; l++) {
							var u = n(i[l]);
							t[u].references--;
						}
						for (var d = o(s, a), f = 0; f < i.length; f++) {
							var c = n(i[f]);
							t[c].references === 0 && (t[c].updater(), t.splice(c, 1));
						}
						i = d;
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'(
				e
			) {
				var t = {};
				e.exports = function (n, o) {
					var r = (function (a) {
						if (t[a] === void 0) {
							var i = document.querySelector(a);
							if (
								window.HTMLIFrameElement &&
								i instanceof window.HTMLIFrameElement
							)
								try {
									i = i.contentDocument.head;
								} catch {
									i = null;
								}
							t[a] = i;
						}
						return t[a];
					})(n);
					if (!r)
						throw Error(
							"Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid."
						);
					r.appendChild(o);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'(
				e
			) {
				e.exports = function (t) {
					var n = document.createElement('style');
					return t.setAttributes(n, t.attributes), t.insert(n, t.options), n;
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'(
				e,
				t,
				n
			) {
				e.exports = function (o) {
					var r = n.nc;
					r && o.setAttribute('nonce', r);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'(
				e
			) {
				e.exports = function (t) {
					if (typeof document > 'u')
						return { update: function () {}, remove: function () {} };
					var n = t.insertStyleElement(t);
					return {
						update: function (o) {
							var r, a, i;
							(r = ''),
								o.supports && (r += '@supports ('.concat(o.supports, ') {')),
								o.media && (r += '@media '.concat(o.media, ' {')),
								(a = o.layer !== void 0) &&
									(r += '@layer'.concat(
										o.layer.length > 0 ? ' '.concat(o.layer) : '',
										' {'
									)),
								(r += o.css),
								a && (r += '}'),
								o.media && (r += '}'),
								o.supports && (r += '}'),
								(i = o.sourceMap) &&
									typeof btoa < 'u' &&
									(r += `
/*# sourceMappingURL=data:application/json;base64,`.concat(
										btoa(unescape(encodeURIComponent(JSON.stringify(i)))),
										' */'
									)),
								t.styleTagTransform(r, n, t.options);
						},
						remove: function () {
							var o;
							(o = n).parentNode === null || o.parentNode.removeChild(o);
						},
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'(
				e
			) {
				e.exports = function (t, n) {
					if (n.styleSheet) n.styleSheet.cssText = t;
					else {
						for (; n.firstChild; ) n.removeChild(n.firstChild);
						n.appendChild(document.createTextNode(t));
					}
				};
			},
		},
		t0 = {};
	function Me(e) {
		var t = t0[e];
		if (t !== void 0) return t.exports;
		var n = (t0[e] = { id: e, exports: {} });
		return tA[e](n, n.exports, Me), n.exports;
	}
	(Me.n = (e) => {
		var t = e && e.__esModule ? () => e.default : () => e;
		return Me.d(t, { a: t }), t;
	}),
		(Me.d = (e, t) => {
			for (var n in t)
				Me.o(t, n) &&
					!Me.o(e, n) &&
					Object.defineProperty(e, n, { enumerable: !0, get: t[n] });
		}),
		(Me.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t)),
		(Me.nc = void 0);
	var nA = Me(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'
		),
		oA = Me.n(nA),
		rA = Me(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'
		),
		aA = Me.n(rA),
		iA = Me(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'
		),
		sA = Me.n(iA),
		lA = Me(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'
		),
		cA = Me.n(lA),
		uA = Me(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'
		),
		dA = Me.n(uA),
		fA = Me(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'
		),
		mA = Me.n(fA),
		nu = Me(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/primitives/button.module.css'
		),
		Ya = {};
	(Ya.styleTagTransform = mA()),
		(Ya.setAttributes = cA()),
		(Ya.insert = sA().bind(null, 'head')),
		(Ya.domAPI = aA()),
		(Ya.insertStyleElement = dA()),
		oA()(nu.A, Ya);
	var Bs = nu.A && nu.A.locals ? nu.A.locals : void 0;
	var Xa = ({
		variant: e = 'primary',
		mode: t = 'filled',
		size: n = 'medium',
	} = {}) => {
		let o = [Bs.button, Bs[`button-${n}`]];
		o.push(
			Bs[
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
		let r = [Bs['button-icon']];
		return {
			root: (a) => [...o, a?.class].filter(Boolean).join(' '),
			icon: (a) => [...r, a?.class].filter(Boolean).join(' '),
		};
	};
	var pA = {
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/primitives/switch.module.css'(
				e,
				t,
				n
			) {
				n.d(t, { A: () => s });
				var o = n(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'
					),
					r = n.n(o),
					a = n(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'
					),
					i = n.n(a)()(r());
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
				let s = i;
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'(
				e
			) {
				e.exports = function (t) {
					var n = [];
					return (
						(n.toString = function () {
							return this.map(function (o) {
								var r = '',
									a = o[5] !== void 0;
								return (
									o[4] && (r += '@supports ('.concat(o[4], ') {')),
									o[2] && (r += '@media '.concat(o[2], ' {')),
									a &&
										(r += '@layer'.concat(
											o[5].length > 0 ? ' '.concat(o[5]) : '',
											' {'
										)),
									(r += t(o)),
									a && (r += '}'),
									o[2] && (r += '}'),
									o[4] && (r += '}'),
									r
								);
							}).join('');
						}),
						(n.i = function (o, r, a, i, s) {
							typeof o == 'string' && (o = [[null, o, void 0]]);
							var l = {};
							if (a)
								for (var u = 0; u < this.length; u++) {
									var d = this[u][0];
									d != null && (l[d] = !0);
								}
							for (var f = 0; f < o.length; f++) {
								var c = [].concat(o[f]);
								(a && l[c[0]]) ||
									(s !== void 0 &&
										(c[5] === void 0 ||
											(c[1] = '@layer'
												.concat(c[5].length > 0 ? ' '.concat(c[5]) : '', ' {')
												.concat(c[1], '}')),
										(c[5] = s)),
									r &&
										(c[2] &&
											(c[1] = '@media '.concat(c[2], ' {').concat(c[1], '}')),
										(c[2] = r)),
									i &&
										(c[4]
											? ((c[1] = '@supports ('
													.concat(c[4], ') {')
													.concat(c[1], '}')),
												(c[4] = i))
											: (c[4] = ''.concat(i))),
									n.push(c));
							}
						}),
						n
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
				function n(r) {
					for (var a = -1, i = 0; i < t.length; i++)
						if (t[i].identifier === r) {
							a = i;
							break;
						}
					return a;
				}
				function o(r, a) {
					for (var i = {}, s = [], l = 0; l < r.length; l++) {
						var u = r[l],
							d = a.base ? u[0] + a.base : u[0],
							f = i[d] || 0,
							c = ''.concat(d, ' ').concat(f);
						i[d] = f + 1;
						var p = n(c),
							v = {
								css: u[1],
								media: u[2],
								sourceMap: u[3],
								supports: u[4],
								layer: u[5],
							};
						if (p !== -1) t[p].references++, t[p].updater(v);
						else {
							var C = (function (y, b) {
								var g = b.domAPI(b);
								return (
									g.update(y),
									function (m) {
										m
											? (m.css !== y.css ||
													m.media !== y.media ||
													m.sourceMap !== y.sourceMap ||
													m.supports !== y.supports ||
													m.layer !== y.layer) &&
												g.update((y = m))
											: g.remove();
									}
								);
							})(v, a);
							(a.byIndex = l),
								t.splice(l, 0, { identifier: c, updater: C, references: 1 });
						}
						s.push(c);
					}
					return s;
				}
				e.exports = function (r, a) {
					var i = o((r = r || []), (a = a || {}));
					return function (s) {
						s = s || [];
						for (var l = 0; l < i.length; l++) {
							var u = n(i[l]);
							t[u].references--;
						}
						for (var d = o(s, a), f = 0; f < i.length; f++) {
							var c = n(i[f]);
							t[c].references === 0 && (t[c].updater(), t.splice(c, 1));
						}
						i = d;
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'(
				e
			) {
				var t = {};
				e.exports = function (n, o) {
					var r = (function (a) {
						if (t[a] === void 0) {
							var i = document.querySelector(a);
							if (
								window.HTMLIFrameElement &&
								i instanceof window.HTMLIFrameElement
							)
								try {
									i = i.contentDocument.head;
								} catch {
									i = null;
								}
							t[a] = i;
						}
						return t[a];
					})(n);
					if (!r)
						throw Error(
							"Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid."
						);
					r.appendChild(o);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'(
				e
			) {
				e.exports = function (t) {
					var n = document.createElement('style');
					return t.setAttributes(n, t.attributes), t.insert(n, t.options), n;
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'(
				e,
				t,
				n
			) {
				e.exports = function (o) {
					var r = n.nc;
					r && o.setAttribute('nonce', r);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'(
				e
			) {
				e.exports = function (t) {
					if (typeof document > 'u')
						return { update: function () {}, remove: function () {} };
					var n = t.insertStyleElement(t);
					return {
						update: function (o) {
							var r, a, i;
							(r = ''),
								o.supports && (r += '@supports ('.concat(o.supports, ') {')),
								o.media && (r += '@media '.concat(o.media, ' {')),
								(a = o.layer !== void 0) &&
									(r += '@layer'.concat(
										o.layer.length > 0 ? ' '.concat(o.layer) : '',
										' {'
									)),
								(r += o.css),
								a && (r += '}'),
								o.media && (r += '}'),
								o.supports && (r += '}'),
								(i = o.sourceMap) &&
									typeof btoa < 'u' &&
									(r += `
/*# sourceMappingURL=data:application/json;base64,`.concat(
										btoa(unescape(encodeURIComponent(JSON.stringify(i)))),
										' */'
									)),
								t.styleTagTransform(r, n, t.options);
						},
						remove: function () {
							var o;
							(o = n).parentNode === null || o.parentNode.removeChild(o);
						},
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'(
				e
			) {
				e.exports = function (t, n) {
					if (n.styleSheet) n.styleSheet.cssText = t;
					else {
						for (; n.firstChild; ) n.removeChild(n.firstChild);
						n.appendChild(document.createTextNode(t));
					}
				};
			},
		},
		n0 = {};
	function je(e) {
		var t = n0[e];
		if (t !== void 0) return t.exports;
		var n = (n0[e] = { id: e, exports: {} });
		return pA[e](n, n.exports, je), n.exports;
	}
	(je.n = (e) => {
		var t = e && e.__esModule ? () => e.default : () => e;
		return je.d(t, { a: t }), t;
	}),
		(je.d = (e, t) => {
			for (var n in t)
				je.o(t, n) &&
					!je.o(e, n) &&
					Object.defineProperty(e, n, { enumerable: !0, get: t[n] });
		}),
		(je.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t)),
		(je.nc = void 0);
	var gA = je(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'
		),
		bA = je.n(gA),
		hA = je(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'
		),
		vA = je.n(hA),
		yA = je(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'
		),
		CA = je.n(yA),
		SA = je(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'
		),
		xA = je.n(SA),
		TA = je(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'
		),
		kA = je.n(TA),
		wA = je(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'
		),
		AA = je.n(wA),
		ou = je(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/primitives/switch.module.css'
		),
		Ka = {};
	(Ka.styleTagTransform = AA()),
		(Ka.setAttributes = xA()),
		(Ka.insert = CA().bind(null, 'head')),
		(Ka.domAPI = vA()),
		(Ka.insertStyleElement = kA()),
		bA()(ou.A, Ka);
	var So = ou.A && ou.A.locals ? ou.A.locals : void 0;
	var Gm = ({ size: e = 'medium' } = {}) => {
		let t = { medium: void 0, small: 'root-small' },
			n = { medium: void 0, small: 'thumb-small' },
			o = { medium: void 0, small: 'track-small' };
		return {
			root: (r) => {
				let a = [So.root],
					i = t[e];
				return (
					i && a.push(So[i]),
					r?.class && a.push(r.class),
					a.filter(Boolean).join(' ')
				);
			},
			thumb: (r) => {
				let a = [So.thumb],
					i = n[e];
				return (
					i && a.push(So[i]),
					r?.disabled && a.push(So['thumb-disabled']),
					r?.class && a.push(r.class),
					a.filter(Boolean).join(' ')
				);
			},
			track: (r) => {
				let a = [So.track],
					i = o[e];
				return (
					i && a.push(So[i]),
					r?.disabled && a.push(So['track-disabled']),
					r?.class && a.push(r.class),
					a.filter(Boolean).join(' ')
				);
			},
		};
	};
	var ru = w(j(), 1);
	var Qa = w(j(), 1);
	function Fm(e, t, n, o, r) {
		let a = Qa.Children.map(e, (i) => {
			if (!(0, Qa.isValidElement)(i)) return i;
			let s = i.type?.displayName || '',
				l = n.includes(s) ? t : {},
				u = i.props;
			return (0, Qa.cloneElement)(
				i,
				{ ...l, key: `${o}-${i.key || s}` },
				Fm(u?.children, t, n, o, u?.asChild)
			);
		});
		return r ? a?.[0] : a;
	}
	var o0 = 'ButtonIcon',
		Xt = (0, ru.forwardRef)(
			(
				{
					children: e,
					variant: t,
					mode: n,
					size: o,
					asChild: r,
					className: a,
					noStyle: i,
					...s
				},
				l
			) => {
				let u = (0, ru.useId)(),
					d = r ? Fa : 'button',
					f = [i ? '' : Xa({ variant: t, mode: n, size: o }).root(), a]
						.filter(Boolean)
						.join(' '),
					c = Fm(
						e,
						{
							...(t && { variant: t }),
							...(n && { mode: n }),
							...(o && { size: o }),
						},
						[o0],
						u,
						r
					);
				return (0, qm.jsx)(d, { ref: l, className: f, ...s, children: c });
			}
		);
	function RA({ variant: e, mode: t, size: n, as: o, className: r, ...a }) {
		let { icon: i } = Xa({ variant: e, mode: t, size: n });
		return (0, qm.jsx)(o || 'div', { className: i({ class: r }), ...a });
	}
	(Xt.displayName = 'ButtonRoot'), (RA.displayName = o0);
	var EA = ['primary', 'secondary', 'neutral'],
		eo = (0, au.forwardRef)(
			(
				{
					asChild: e,
					className: t,
					style: n,
					noStyle: o,
					action: r,
					themeKey: a,
					baseClassName: i,
					variant: s = 'neutral',
					mode: l = 'stroke',
					size: u = 'small',
					onClick: d,
					closeConsentBanner: f = !1,
					closeConsentDialog: c = !1,
					category: p,
					...v
				},
				C
			) => {
				let { saveConsents: y, setActiveUI: b, setConsent: g } = K(),
					{ uiSource: m } = Zc(),
					{ noStyle: h } = le(),
					k = oe(a ?? (s === 'primary' ? 'buttonPrimary' : 'buttonSecondary'), {
						baseClassName: [
							!(h || o) && Xa({ variant: s, mode: l, size: u }).root(),
						],
						style: { ...n },
						className: t,
						noStyle: h || o,
					});
				if (!p && r === 'set-consent')
					throw Error('Category is required for set-consent action');
				let A = (0, au.useCallback)(
						(L) => {
							if (
								((f || c) && b('none'),
								r === 'open-consent-dialog' && b('dialog'),
								d && d(L),
								r !== 'open-consent-dialog')
							) {
								let _ = m ? { uiSource: m } : void 0;
								switch (r) {
									case 'accept-consent':
										y('all', _);
										break;
									case 'reject-consent':
										y('necessary', _);
										break;
									case 'custom-consent':
										y('custom', _);
										break;
									case 'set-consent':
										if (!p)
											throw Error(
												'Category is required for set-consent action'
											);
										g(p, !0);
								}
							}
						},
						[f, c, d, y, b, r, p, g, m]
					),
					x = Object.fromEntries(
						Object.entries(v).filter(([L]) => !EA.includes(L))
					);
				return (0, r0.jsx)(e ? Fa : 'button', {
					ref: C,
					...k,
					onClick: A,
					...x,
				});
			}
		);
	eo.displayName = 'ConsentButton';
	var su = w(H(), 1);
	var IA = {
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/primitives/legal-links.module.css'(
				e,
				t,
				n
			) {
				n.d(t, { A: () => s });
				var o = n(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'
					),
					r = n.n(o),
					a = n(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'
					),
					i = n.n(a)()(r());
				i.push([
					e.id,
					':root{--legal-links-gap:.75rem;--legal-links-font-size:.875rem;--legal-links-transition:text-decoration .2s ease;--legal-links-text-decoration:none;--legal-links-text-decoration-hover:underline;--legal-links-outline:2px solid currentColor;--legal-links-outline-offset:2px;--legal-links-color:#476cff;--legal-links-focus-color:#476cff;--legal-links-focus-color-dark:#2547d0}@layer components{.c15t-ui-legalLinks-xVTMr{gap:var(--legal-links-gap);flex-wrap:wrap;align-items:center;display:flex}.c15t-ui-legalLink-YVZqO{color:var(--legal-links-color);text-decoration:var(--legal-links-text-decoration);font-size:var(--legal-links-font-size);transition:var(--legal-links-transition)}.c15t-dark .c15t-ui-legalLink-YVZqO{color:var(--legal-links-focus-color-dark)}.c15t-ui-legalLink-YVZqO:hover{text-decoration:var(--legal-links-text-decoration-hover)}.c15t-ui-legalLink-YVZqO:focus{outline:none;text-decoration:underline}@media (prefers-reduced-motion:reduce){.c15t-ui-legalLink-YVZqO{transition:none}}}',
					'',
				]),
					(i.locals = {
						legalLinks: 'c15t-ui-legalLinks-xVTMr',
						legalLink: 'c15t-ui-legalLink-YVZqO',
					});
				let s = i;
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'(
				e
			) {
				e.exports = function (t) {
					var n = [];
					return (
						(n.toString = function () {
							return this.map(function (o) {
								var r = '',
									a = o[5] !== void 0;
								return (
									o[4] && (r += '@supports ('.concat(o[4], ') {')),
									o[2] && (r += '@media '.concat(o[2], ' {')),
									a &&
										(r += '@layer'.concat(
											o[5].length > 0 ? ' '.concat(o[5]) : '',
											' {'
										)),
									(r += t(o)),
									a && (r += '}'),
									o[2] && (r += '}'),
									o[4] && (r += '}'),
									r
								);
							}).join('');
						}),
						(n.i = function (o, r, a, i, s) {
							typeof o == 'string' && (o = [[null, o, void 0]]);
							var l = {};
							if (a)
								for (var u = 0; u < this.length; u++) {
									var d = this[u][0];
									d != null && (l[d] = !0);
								}
							for (var f = 0; f < o.length; f++) {
								var c = [].concat(o[f]);
								(a && l[c[0]]) ||
									(s !== void 0 &&
										(c[5] === void 0 ||
											(c[1] = '@layer'
												.concat(c[5].length > 0 ? ' '.concat(c[5]) : '', ' {')
												.concat(c[1], '}')),
										(c[5] = s)),
									r &&
										(c[2] &&
											(c[1] = '@media '.concat(c[2], ' {').concat(c[1], '}')),
										(c[2] = r)),
									i &&
										(c[4]
											? ((c[1] = '@supports ('
													.concat(c[4], ') {')
													.concat(c[1], '}')),
												(c[4] = i))
											: (c[4] = ''.concat(i))),
									n.push(c));
							}
						}),
						n
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
				function n(r) {
					for (var a = -1, i = 0; i < t.length; i++)
						if (t[i].identifier === r) {
							a = i;
							break;
						}
					return a;
				}
				function o(r, a) {
					for (var i = {}, s = [], l = 0; l < r.length; l++) {
						var u = r[l],
							d = a.base ? u[0] + a.base : u[0],
							f = i[d] || 0,
							c = ''.concat(d, ' ').concat(f);
						i[d] = f + 1;
						var p = n(c),
							v = {
								css: u[1],
								media: u[2],
								sourceMap: u[3],
								supports: u[4],
								layer: u[5],
							};
						if (p !== -1) t[p].references++, t[p].updater(v);
						else {
							var C = (function (y, b) {
								var g = b.domAPI(b);
								return (
									g.update(y),
									function (m) {
										m
											? (m.css !== y.css ||
													m.media !== y.media ||
													m.sourceMap !== y.sourceMap ||
													m.supports !== y.supports ||
													m.layer !== y.layer) &&
												g.update((y = m))
											: g.remove();
									}
								);
							})(v, a);
							(a.byIndex = l),
								t.splice(l, 0, { identifier: c, updater: C, references: 1 });
						}
						s.push(c);
					}
					return s;
				}
				e.exports = function (r, a) {
					var i = o((r = r || []), (a = a || {}));
					return function (s) {
						s = s || [];
						for (var l = 0; l < i.length; l++) {
							var u = n(i[l]);
							t[u].references--;
						}
						for (var d = o(s, a), f = 0; f < i.length; f++) {
							var c = n(i[f]);
							t[c].references === 0 && (t[c].updater(), t.splice(c, 1));
						}
						i = d;
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'(
				e
			) {
				var t = {};
				e.exports = function (n, o) {
					var r = (function (a) {
						if (t[a] === void 0) {
							var i = document.querySelector(a);
							if (
								window.HTMLIFrameElement &&
								i instanceof window.HTMLIFrameElement
							)
								try {
									i = i.contentDocument.head;
								} catch {
									i = null;
								}
							t[a] = i;
						}
						return t[a];
					})(n);
					if (!r)
						throw Error(
							"Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid."
						);
					r.appendChild(o);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'(
				e
			) {
				e.exports = function (t) {
					var n = document.createElement('style');
					return t.setAttributes(n, t.attributes), t.insert(n, t.options), n;
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'(
				e,
				t,
				n
			) {
				e.exports = function (o) {
					var r = n.nc;
					r && o.setAttribute('nonce', r);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'(
				e
			) {
				e.exports = function (t) {
					if (typeof document > 'u')
						return { update: function () {}, remove: function () {} };
					var n = t.insertStyleElement(t);
					return {
						update: function (o) {
							var r, a, i;
							(r = ''),
								o.supports && (r += '@supports ('.concat(o.supports, ') {')),
								o.media && (r += '@media '.concat(o.media, ' {')),
								(a = o.layer !== void 0) &&
									(r += '@layer'.concat(
										o.layer.length > 0 ? ' '.concat(o.layer) : '',
										' {'
									)),
								(r += o.css),
								a && (r += '}'),
								o.media && (r += '}'),
								o.supports && (r += '}'),
								(i = o.sourceMap) &&
									typeof btoa < 'u' &&
									(r += `
/*# sourceMappingURL=data:application/json;base64,`.concat(
										btoa(unescape(encodeURIComponent(JSON.stringify(i)))),
										' */'
									)),
								t.styleTagTransform(r, n, t.options);
						},
						remove: function () {
							var o;
							(o = n).parentNode === null || o.parentNode.removeChild(o);
						},
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'(
				e
			) {
				e.exports = function (t, n) {
					if (n.styleSheet) n.styleSheet.cssText = t;
					else {
						for (; n.firstChild; ) n.removeChild(n.firstChild);
						n.appendChild(document.createTextNode(t));
					}
				};
			},
		},
		a0 = {};
	function ze(e) {
		var t = a0[e];
		if (t !== void 0) return t.exports;
		var n = (a0[e] = { id: e, exports: {} });
		return IA[e](n, n.exports, ze), n.exports;
	}
	(ze.n = (e) => {
		var t = e && e.__esModule ? () => e.default : () => e;
		return ze.d(t, { a: t }), t;
	}),
		(ze.d = (e, t) => {
			for (var n in t)
				ze.o(t, n) &&
					!ze.o(e, n) &&
					Object.defineProperty(e, n, { enumerable: !0, get: t[n] });
		}),
		(ze.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t)),
		(ze.nc = void 0);
	var NA = ze(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'
		),
		LA = ze.n(NA),
		_A = ze(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'
		),
		OA = ze.n(_A),
		BA = ze(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'
		),
		DA = ze.n(BA),
		MA = ze(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'
		),
		jA = ze.n(MA),
		zA = ze(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'
		),
		VA = ze.n(zA),
		UA = ze(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'
		),
		HA = ze.n(UA),
		iu = ze(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/primitives/legal-links.module.css'
		),
		Za = {};
	(Za.styleTagTransform = HA()),
		(Za.setAttributes = jA()),
		(Za.insert = DA().bind(null, 'head')),
		(Za.domAPI = OA()),
		(Za.insertStyleElement = VA()),
		LA()(iu.A, Za);
	var i0 = iu.A && iu.A.locals ? iu.A.locals : void 0;
	function PA(e) {
		let { legalLinks: t } = K();
		return e == null
			? null
			: Object.fromEntries(
					Object.entries(t ?? {}).filter(([n]) => e.includes(n))
				);
	}
	function lu({ links: e, themeKey: t, testIdPrefix: n }) {
		let o = PA(e),
			{ legalLinks: r } = Ne(),
			a = oe(t, { baseClassName: i0.legalLink });
		return o && Object.keys(o).length !== 0
			? (0, su.jsxs)('span', {
					children: [
						' ',
						Object.entries(o).map(([i, s], l, u) =>
							s
								? (0, su.jsxs)(
										'span',
										{
											children: [
												(0, su.jsxs)('a', {
													href: s.href,
													target: s.target || '_blank',
													rel:
														s.rel ||
														(s.target === '_blank'
															? 'noopener noreferrer'
															: void 0),
													...a,
													'data-testid': n ? `${n}-${i}` : void 0,
													children: [
														s.label ?? r?.[i],
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
	var Ds = (0, bn.forwardRef)(({ children: e, ...t }, n) => {
		let { cookieBanner: o } = Ne();
		return (0, Kt.jsx)(de, {
			ref: n,
			baseClassName: it.title,
			'data-testid': 'consent-banner-title',
			themeKey: 'consentBannerTitle',
			...t,
			children: e ?? o.title,
		});
	});
	Ds.displayName = 'ConsentBannerTitle';
	var Ms = (0, bn.forwardRef)(
		({ children: e, legalLinks: t, asChild: n, ...o }, r) => {
			let { cookieBanner: a } = Ne();
			return n
				? (0, Kt.jsx)(de, {
						ref: r,
						baseClassName: it.description,
						'data-testid': 'consent-banner-description',
						themeKey: 'consentBannerDescription',
						asChild: n,
						...o,
						children: e ?? a.description,
					})
				: (0, Kt.jsxs)(de, {
						ref: r,
						baseClassName: it.description,
						'data-testid': 'consent-banner-description',
						themeKey: 'consentBannerDescription',
						asChild: n,
						...o,
						children: [
							e ?? a.description,
							(0, Kt.jsx)(lu, {
								links: t,
								themeKey: 'consentBannerDescription',
								testIdPrefix: 'consent-banner-legal-link',
							}),
						],
					});
		}
	);
	Ms.displayName = 'ConsentBannerDescription';
	var js = (0, bn.forwardRef)(({ children: e, ...t }, n) =>
		(0, Kt.jsx)(de, {
			ref: n,
			baseClassName: it.footer,
			'data-testid': 'consent-banner-footer',
			themeKey: 'consentBannerFooter',
			...t,
			children: e,
		})
	);
	js.displayName = 'ConsentBannerFooter';
	var zs = (0, bn.forwardRef)(({ children: e, ...t }, n) => {
		let { trapFocus: o } = le(),
			r = (0, bn.useRef)(null),
			a = n || r,
			i = !!o;
		return (
			pn(i, a),
			(0, Kt.jsx)(de, {
				ref: a,
				tabIndex: 0,
				baseClassName: it.card,
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
	zs.displayName = 'ConsentBannerCard';
	var Vs = (0, bn.forwardRef)(({ children: e, ...t }, n) =>
		(0, Kt.jsx)(de, {
			ref: n,
			baseClassName: it.header,
			'data-testid': 'consent-banner-header',
			themeKey: 'consentBannerHeader',
			...t,
			children: e,
		})
	);
	Vs.displayName = 'ConsentBannerHeader';
	var Us = (0, bn.forwardRef)(({ children: e, ...t }, n) =>
		(0, Kt.jsx)(de, {
			ref: n,
			baseClassName: it.footerSubGroup,
			'data-testid': 'consent-banner-footer-sub-group',
			themeKey: 'consentBannerFooterSubGroup',
			...t,
			children: e,
		})
	);
	Us.displayName = 'ConsentBannerFooterSubGroup';
	var Hs = (0, bn.forwardRef)(({ children: e, ...t }, n) => {
		let { common: o } = Ne();
		return (0, Kt.jsx)(eo, {
			ref: n,
			action: 'reject-consent',
			'data-testid': 'consent-banner-reject-button',
			closeConsentBanner: !0,
			...t,
			children: e ?? o.rejectAll,
		});
	});
	Hs.displayName = 'ConsentBannerRejectButton';
	var Ps = (0, bn.forwardRef)(({ children: e, ...t }, n) => {
		let { common: o } = Ne();
		return (0, Kt.jsx)(eo, {
			ref: n,
			action: 'open-consent-dialog',
			'data-testid': 'consent-banner-customize-button',
			...t,
			children: e ?? o.customize,
		});
	});
	Ps.displayName = 'ConsentBannerCustomizeButton';
	var Gs = (0, bn.forwardRef)(({ children: e, ...t }, n) => {
		let { common: o } = Ne(),
			{ noStyle: r } = le();
		return (0, Kt.jsx)(eo, {
			ref: n,
			action: 'accept-consent',
			'data-testid': 'consent-banner-accept-button',
			closeConsentBanner: !0,
			noStyle: r,
			...t,
			children: e ?? o.acceptAll,
		});
	});
	Gs.displayName = 'ConsentBannerAcceptButton';
	var s0 = Ds,
		l0 = Ms,
		c0 = js,
		Ym = Us,
		Xm = zs,
		u0 = Vs,
		d0 = Hs,
		f0 = Ps,
		m0 = Gs;
	var St = w(H(), 1),
		Km = w(j(), 1);
	var cu = w(j(), 1);
	function p0() {
		let [e, t] = (0, cu.useState)(!1);
		return (
			(0, cu.useEffect)(() => {
				if (typeof window > 'u') return;
				let n = window.matchMedia('(prefers-reduced-motion: reduce)');
				t(n.matches);
				let o = (r) => {
					t(r.matches);
				};
				return (
					n.addEventListener('change', o),
					() => n.removeEventListener('change', o)
				);
			}, []),
			e
		);
	}
	function er(e) {
		let t = le(),
			n = p0();
		return {
			noStyle: e?.noStyle ?? t.noStyle ?? !1,
			disableAnimation: e?.disableAnimation ?? t.disableAnimation ?? n,
			scrollLock: e?.scrollLock ?? t.scrollLock ?? !1,
			trapFocus: e?.trapFocus ?? t.trapFocus ?? !0,
		};
	}
	var g0 = w(j(), 1),
		uu = class extends g0.Component {
			constructor(t) {
				super(t), (this.state = { hasError: !1, error: null, errorInfo: null });
			}
			static getDerivedStateFromError(t) {
				return { hasError: !0, error: t, errorInfo: null };
			}
			componentDidCatch(t, n) {
				this.setState({ error: t, errorInfo: n });
			}
			render() {
				return this.state.hasError
					? typeof this.props.fallback == 'function'
						? this.props.fallback(this.state.error, this.state.errorInfo)
						: this.props.fallback
					: this.props.children;
			}
		};
	var GA = [['reject', 'accept'], 'customize'],
		b0 = ({
			noStyle: e,
			disableAnimation: t,
			scrollLock: n,
			trapFocus: o = !0,
			title: r,
			description: a,
			rejectButtonText: i,
			customizeButtonText: s,
			acceptButtonText: l,
			legalLinks: u,
			layout: d = GA,
			primaryButton: f = 'customize',
			models: c,
			uiSource: p,
		}) => {
			let { cookieBanner: v } = Ne(),
				C = er({
					noStyle: e,
					disableAnimation: t,
					scrollLock: n,
					trapFocus: o,
				}),
				y = (b) => {
					let g = Array.isArray(f) ? f.includes(b) : b === f;
					switch (b) {
						case 'reject':
							return (0, St.jsx)(Hs, {
								variant: g ? 'primary' : 'neutral',
								'data-testid': 'consent-banner-reject-button',
								children: i,
							});
						case 'accept':
							return (0, St.jsx)(Gs, {
								variant: g ? 'primary' : 'neutral',
								'data-testid': 'consent-banner-accept-button',
								children: l,
							});
						case 'customize':
							return (0, St.jsx)(Ps, {
								variant: g ? 'primary' : 'neutral',
								'data-testid': 'consent-banner-customize-button',
								children: s,
							});
					}
				};
			return (0, St.jsx)(uu, {
				fallback: (0, St.jsx)('div', {
					children: 'Something went wrong with the Consent Banner.',
				}),
				children: (0, St.jsx)(Wc, {
					...C,
					models: c,
					uiSource: p,
					children: (0, St.jsxs)(zs, {
						'aria-label': v.title,
						children: [
							(0, St.jsxs)(Vs, {
								children: [
									(0, St.jsx)(Ds, { children: r }),
									(0, St.jsx)(Ms, { legalLinks: u, children: a }),
								],
							}),
							(0, St.jsx)(js, {
								children: d.map((b, g) => {
									if (Array.isArray(b)) {
										let m = b.join('-');
										return (0, St.jsx)(
											Us,
											{
												children: b.map((h) =>
													(0, St.jsx)(Km.Fragment, { children: y(h) }, h)
												),
											},
											m ? `group-${m}` : `group-${g}`
										);
									}
									return (0, St.jsx)(Km.Fragment, { children: y(b) }, b);
								}),
							}),
						],
					}),
				}),
			});
		};
	var Qm = Object.assign(b0, {
		Root: Yy,
		Card: Xm,
		Header: u0,
		Title: s0,
		Description: l0,
		Footer: c0,
		FooterSubGroup: Ym,
		RejectButton: d0,
		CustomizeButton: f0,
		AcceptButton: m0,
		Overlay: Xc,
		Content: Xm,
		Actions: Ym,
	});
	var He = w(H(), 1);
	var FA = {
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/components/consent-dialog.module.css'(
				e,
				t,
				n
			) {
				n.d(t, { A: () => s });
				var o = n(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'
					),
					r = n.n(o),
					a = n(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'
					),
					i = n.n(a)()(r());
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
				let s = i;
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'(
				e
			) {
				e.exports = function (t) {
					var n = [];
					return (
						(n.toString = function () {
							return this.map(function (o) {
								var r = '',
									a = o[5] !== void 0;
								return (
									o[4] && (r += '@supports ('.concat(o[4], ') {')),
									o[2] && (r += '@media '.concat(o[2], ' {')),
									a &&
										(r += '@layer'.concat(
											o[5].length > 0 ? ' '.concat(o[5]) : '',
											' {'
										)),
									(r += t(o)),
									a && (r += '}'),
									o[2] && (r += '}'),
									o[4] && (r += '}'),
									r
								);
							}).join('');
						}),
						(n.i = function (o, r, a, i, s) {
							typeof o == 'string' && (o = [[null, o, void 0]]);
							var l = {};
							if (a)
								for (var u = 0; u < this.length; u++) {
									var d = this[u][0];
									d != null && (l[d] = !0);
								}
							for (var f = 0; f < o.length; f++) {
								var c = [].concat(o[f]);
								(a && l[c[0]]) ||
									(s !== void 0 &&
										(c[5] === void 0 ||
											(c[1] = '@layer'
												.concat(c[5].length > 0 ? ' '.concat(c[5]) : '', ' {')
												.concat(c[1], '}')),
										(c[5] = s)),
									r &&
										(c[2] &&
											(c[1] = '@media '.concat(c[2], ' {').concat(c[1], '}')),
										(c[2] = r)),
									i &&
										(c[4]
											? ((c[1] = '@supports ('
													.concat(c[4], ') {')
													.concat(c[1], '}')),
												(c[4] = i))
											: (c[4] = ''.concat(i))),
									n.push(c));
							}
						}),
						n
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
				function n(r) {
					for (var a = -1, i = 0; i < t.length; i++)
						if (t[i].identifier === r) {
							a = i;
							break;
						}
					return a;
				}
				function o(r, a) {
					for (var i = {}, s = [], l = 0; l < r.length; l++) {
						var u = r[l],
							d = a.base ? u[0] + a.base : u[0],
							f = i[d] || 0,
							c = ''.concat(d, ' ').concat(f);
						i[d] = f + 1;
						var p = n(c),
							v = {
								css: u[1],
								media: u[2],
								sourceMap: u[3],
								supports: u[4],
								layer: u[5],
							};
						if (p !== -1) t[p].references++, t[p].updater(v);
						else {
							var C = (function (y, b) {
								var g = b.domAPI(b);
								return (
									g.update(y),
									function (m) {
										m
											? (m.css !== y.css ||
													m.media !== y.media ||
													m.sourceMap !== y.sourceMap ||
													m.supports !== y.supports ||
													m.layer !== y.layer) &&
												g.update((y = m))
											: g.remove();
									}
								);
							})(v, a);
							(a.byIndex = l),
								t.splice(l, 0, { identifier: c, updater: C, references: 1 });
						}
						s.push(c);
					}
					return s;
				}
				e.exports = function (r, a) {
					var i = o((r = r || []), (a = a || {}));
					return function (s) {
						s = s || [];
						for (var l = 0; l < i.length; l++) {
							var u = n(i[l]);
							t[u].references--;
						}
						for (var d = o(s, a), f = 0; f < i.length; f++) {
							var c = n(i[f]);
							t[c].references === 0 && (t[c].updater(), t.splice(c, 1));
						}
						i = d;
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'(
				e
			) {
				var t = {};
				e.exports = function (n, o) {
					var r = (function (a) {
						if (t[a] === void 0) {
							var i = document.querySelector(a);
							if (
								window.HTMLIFrameElement &&
								i instanceof window.HTMLIFrameElement
							)
								try {
									i = i.contentDocument.head;
								} catch {
									i = null;
								}
							t[a] = i;
						}
						return t[a];
					})(n);
					if (!r)
						throw Error(
							"Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid."
						);
					r.appendChild(o);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'(
				e
			) {
				e.exports = function (t) {
					var n = document.createElement('style');
					return t.setAttributes(n, t.attributes), t.insert(n, t.options), n;
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'(
				e,
				t,
				n
			) {
				e.exports = function (o) {
					var r = n.nc;
					r && o.setAttribute('nonce', r);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'(
				e
			) {
				e.exports = function (t) {
					if (typeof document > 'u')
						return { update: function () {}, remove: function () {} };
					var n = t.insertStyleElement(t);
					return {
						update: function (o) {
							var r, a, i;
							(r = ''),
								o.supports && (r += '@supports ('.concat(o.supports, ') {')),
								o.media && (r += '@media '.concat(o.media, ' {')),
								(a = o.layer !== void 0) &&
									(r += '@layer'.concat(
										o.layer.length > 0 ? ' '.concat(o.layer) : '',
										' {'
									)),
								(r += o.css),
								a && (r += '}'),
								o.media && (r += '}'),
								o.supports && (r += '}'),
								(i = o.sourceMap) &&
									typeof btoa < 'u' &&
									(r += `
/*# sourceMappingURL=data:application/json;base64,`.concat(
										btoa(unescape(encodeURIComponent(JSON.stringify(i)))),
										' */'
									)),
								t.styleTagTransform(r, n, t.options);
						},
						remove: function () {
							var o;
							(o = n).parentNode === null || o.parentNode.removeChild(o);
						},
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'(
				e
			) {
				e.exports = function (t, n) {
					if (n.styleSheet) n.styleSheet.cssText = t;
					else {
						for (; n.firstChild; ) n.removeChild(n.firstChild);
						n.appendChild(document.createTextNode(t));
					}
				};
			},
		},
		h0 = {};
	function Ve(e) {
		var t = h0[e];
		if (t !== void 0) return t.exports;
		var n = (h0[e] = { id: e, exports: {} });
		return FA[e](n, n.exports, Ve), n.exports;
	}
	(Ve.n = (e) => {
		var t = e && e.__esModule ? () => e.default : () => e;
		return Ve.d(t, { a: t }), t;
	}),
		(Ve.d = (e, t) => {
			for (var n in t)
				Ve.o(t, n) &&
					!Ve.o(e, n) &&
					Object.defineProperty(e, n, { enumerable: !0, get: t[n] });
		}),
		(Ve.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t)),
		(Ve.nc = void 0);
	var qA = Ve(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'
		),
		YA = Ve.n(qA),
		XA = Ve(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'
		),
		KA = Ve.n(XA),
		QA = Ve(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'
		),
		ZA = Ve.n(QA),
		JA = Ve(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'
		),
		WA = Ve.n(JA),
		$A = Ve(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'
		),
		eR = Ve.n($A),
		tR = Ve(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'
		),
		nR = Ve.n(tR),
		du = Ve(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/components/consent-dialog.module.css'
		),
		Ja = {};
	(Ja.styleTagTransform = nR()),
		(Ja.setAttributes = WA()),
		(Ja.insert = ZA().bind(null, 'head')),
		(Ja.domAPI = KA()),
		(Ja.insertStyleElement = eR()),
		YA()(du.A, Ja);
	var Le = du.A && du.A.locals ? du.A.locals : void 0;
	var Wr = w(j(), 1);
	var Vn = w(H(), 1),
		fC = w(j(), 1);
	var vn = w(H(), 1);
	var oR = {
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/components/consent-widget.module.css'(
				e,
				t,
				n
			) {
				n.d(t, { A: () => s });
				var o = n(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'
					),
					r = n.n(o),
					a = n(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'
					),
					i = n.n(a)()(r());
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
				let s = i;
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'(
				e
			) {
				e.exports = function (t) {
					var n = [];
					return (
						(n.toString = function () {
							return this.map(function (o) {
								var r = '',
									a = o[5] !== void 0;
								return (
									o[4] && (r += '@supports ('.concat(o[4], ') {')),
									o[2] && (r += '@media '.concat(o[2], ' {')),
									a &&
										(r += '@layer'.concat(
											o[5].length > 0 ? ' '.concat(o[5]) : '',
											' {'
										)),
									(r += t(o)),
									a && (r += '}'),
									o[2] && (r += '}'),
									o[4] && (r += '}'),
									r
								);
							}).join('');
						}),
						(n.i = function (o, r, a, i, s) {
							typeof o == 'string' && (o = [[null, o, void 0]]);
							var l = {};
							if (a)
								for (var u = 0; u < this.length; u++) {
									var d = this[u][0];
									d != null && (l[d] = !0);
								}
							for (var f = 0; f < o.length; f++) {
								var c = [].concat(o[f]);
								(a && l[c[0]]) ||
									(s !== void 0 &&
										(c[5] === void 0 ||
											(c[1] = '@layer'
												.concat(c[5].length > 0 ? ' '.concat(c[5]) : '', ' {')
												.concat(c[1], '}')),
										(c[5] = s)),
									r &&
										(c[2] &&
											(c[1] = '@media '.concat(c[2], ' {').concat(c[1], '}')),
										(c[2] = r)),
									i &&
										(c[4]
											? ((c[1] = '@supports ('
													.concat(c[4], ') {')
													.concat(c[1], '}')),
												(c[4] = i))
											: (c[4] = ''.concat(i))),
									n.push(c));
							}
						}),
						n
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
				function n(r) {
					for (var a = -1, i = 0; i < t.length; i++)
						if (t[i].identifier === r) {
							a = i;
							break;
						}
					return a;
				}
				function o(r, a) {
					for (var i = {}, s = [], l = 0; l < r.length; l++) {
						var u = r[l],
							d = a.base ? u[0] + a.base : u[0],
							f = i[d] || 0,
							c = ''.concat(d, ' ').concat(f);
						i[d] = f + 1;
						var p = n(c),
							v = {
								css: u[1],
								media: u[2],
								sourceMap: u[3],
								supports: u[4],
								layer: u[5],
							};
						if (p !== -1) t[p].references++, t[p].updater(v);
						else {
							var C = (function (y, b) {
								var g = b.domAPI(b);
								return (
									g.update(y),
									function (m) {
										m
											? (m.css !== y.css ||
													m.media !== y.media ||
													m.sourceMap !== y.sourceMap ||
													m.supports !== y.supports ||
													m.layer !== y.layer) &&
												g.update((y = m))
											: g.remove();
									}
								);
							})(v, a);
							(a.byIndex = l),
								t.splice(l, 0, { identifier: c, updater: C, references: 1 });
						}
						s.push(c);
					}
					return s;
				}
				e.exports = function (r, a) {
					var i = o((r = r || []), (a = a || {}));
					return function (s) {
						s = s || [];
						for (var l = 0; l < i.length; l++) {
							var u = n(i[l]);
							t[u].references--;
						}
						for (var d = o(s, a), f = 0; f < i.length; f++) {
							var c = n(i[f]);
							t[c].references === 0 && (t[c].updater(), t.splice(c, 1));
						}
						i = d;
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'(
				e
			) {
				var t = {};
				e.exports = function (n, o) {
					var r = (function (a) {
						if (t[a] === void 0) {
							var i = document.querySelector(a);
							if (
								window.HTMLIFrameElement &&
								i instanceof window.HTMLIFrameElement
							)
								try {
									i = i.contentDocument.head;
								} catch {
									i = null;
								}
							t[a] = i;
						}
						return t[a];
					})(n);
					if (!r)
						throw Error(
							"Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid."
						);
					r.appendChild(o);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'(
				e
			) {
				e.exports = function (t) {
					var n = document.createElement('style');
					return t.setAttributes(n, t.attributes), t.insert(n, t.options), n;
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'(
				e,
				t,
				n
			) {
				e.exports = function (o) {
					var r = n.nc;
					r && o.setAttribute('nonce', r);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'(
				e
			) {
				e.exports = function (t) {
					if (typeof document > 'u')
						return { update: function () {}, remove: function () {} };
					var n = t.insertStyleElement(t);
					return {
						update: function (o) {
							var r, a, i;
							(r = ''),
								o.supports && (r += '@supports ('.concat(o.supports, ') {')),
								o.media && (r += '@media '.concat(o.media, ' {')),
								(a = o.layer !== void 0) &&
									(r += '@layer'.concat(
										o.layer.length > 0 ? ' '.concat(o.layer) : '',
										' {'
									)),
								(r += o.css),
								a && (r += '}'),
								o.media && (r += '}'),
								o.supports && (r += '}'),
								(i = o.sourceMap) &&
									typeof btoa < 'u' &&
									(r += `
/*# sourceMappingURL=data:application/json;base64,`.concat(
										btoa(unescape(encodeURIComponent(JSON.stringify(i)))),
										' */'
									)),
								t.styleTagTransform(r, n, t.options);
						},
						remove: function () {
							var o;
							(o = n).parentNode === null || o.parentNode.removeChild(o);
						},
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'(
				e
			) {
				e.exports = function (t, n) {
					if (n.styleSheet) n.styleSheet.cssText = t;
					else {
						for (; n.firstChild; ) n.removeChild(n.firstChild);
						n.appendChild(document.createTextNode(t));
					}
				};
			},
		},
		v0 = {};
	function Ue(e) {
		var t = v0[e];
		if (t !== void 0) return t.exports;
		var n = (v0[e] = { id: e, exports: {} });
		return oR[e](n, n.exports, Ue), n.exports;
	}
	(Ue.n = (e) => {
		var t = e && e.__esModule ? () => e.default : () => e;
		return Ue.d(t, { a: t }), t;
	}),
		(Ue.d = (e, t) => {
			for (var n in t)
				Ue.o(t, n) &&
					!Ue.o(e, n) &&
					Object.defineProperty(e, n, { enumerable: !0, get: t[n] });
		}),
		(Ue.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t)),
		(Ue.nc = void 0);
	var rR = Ue(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'
		),
		aR = Ue.n(rR),
		iR = Ue(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'
		),
		sR = Ue.n(iR),
		lR = Ue(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'
		),
		cR = Ue.n(lR),
		uR = Ue(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'
		),
		dR = Ue.n(uR),
		fR = Ue(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'
		),
		mR = Ue.n(fR),
		pR = Ue(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'
		),
		gR = Ue.n(pR),
		fu = Ue(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/components/consent-widget.module.css'
		),
		Wa = {};
	(Wa.styleTagTransform = gR()),
		(Wa.setAttributes = dR()),
		(Wa.insert = cR().bind(null, 'head')),
		(Wa.domAPI = sR()),
		(Wa.insertStyleElement = mR()),
		aR()(fu.A, Wa);
	var Qt = fu.A && fu.A.locals ? fu.A.locals : void 0;
	var Ys = w(j(), 1);
	var Et = w(H(), 1);
	var jt = w(j(), 1);
	var xo = w(j(), 1),
		y0 = w(H(), 1);
	function tr(e, t = []) {
		let n = [];
		function o(a, i) {
			let s = xo.createContext(i),
				l = n.length;
			n = [...n, i];
			let u = (f) => {
				let { scope: c, children: p, ...v } = f,
					C = c?.[e]?.[l] || s,
					y = xo.useMemo(() => v, Object.values(v));
				return (0, y0.jsx)(C.Provider, { value: y, children: p });
			};
			u.displayName = a + 'Provider';
			function d(f, c) {
				let p = c?.[e]?.[l] || s,
					v = xo.useContext(p);
				if (v) return v;
				if (i !== void 0) return i;
				throw new Error(`\`${f}\` must be used within \`${a}\``);
			}
			return [u, d];
		}
		let r = () => {
			let a = n.map((i) => xo.createContext(i));
			return function (s) {
				let l = s?.[e] || a;
				return xo.useMemo(
					() => ({ [`__scope${e}`]: { ...s, [e]: l } }),
					[s, l]
				);
			};
		};
		return (r.scopeName = e), [o, bR(r, ...t)];
	}
	function bR(...e) {
		let t = e[0];
		if (e.length === 1) return t;
		let n = () => {
			let o = e.map((r) => ({ useScope: r(), scopeName: r.scopeName }));
			return function (a) {
				let i = o.reduce((s, { useScope: l, scopeName: u }) => {
					let f = l(a)[`__scope${u}`];
					return { ...s, ...f };
				}, {});
				return xo.useMemo(() => ({ [`__scope${t.scopeName}`]: i }), [i]);
			};
		};
		return (n.scopeName = t.scopeName), n;
	}
	var nr = w(j(), 1);
	var tt = w(j(), 1);
	var mu = w(H(), 1);
	function Fs(e) {
		let t = hR(e),
			n = tt.forwardRef((o, r) => {
				let { children: a, ...i } = o,
					s = tt.Children.toArray(a),
					l = s.find(yR);
				if (l) {
					let u = l.props.children,
						d = s.map((f) =>
							f === l
								? tt.Children.count(u) > 1
									? tt.Children.only(null)
									: tt.isValidElement(u)
										? u.props.children
										: null
								: f
						);
					return (0, mu.jsx)(t, {
						...i,
						ref: r,
						children: tt.isValidElement(u)
							? tt.cloneElement(u, void 0, d)
							: null,
					});
				}
				return (0, mu.jsx)(t, { ...i, ref: r, children: a });
			});
		return (n.displayName = `${e}.Slot`), n;
	}
	function hR(e) {
		let t = tt.forwardRef((n, o) => {
			let { children: r, ...a } = n;
			if (tt.isValidElement(r)) {
				let i = SR(r),
					s = CR(a, r.props);
				return (
					r.type !== tt.Fragment && (s.ref = o ? Os(o, i) : i),
					tt.cloneElement(r, s)
				);
			}
			return tt.Children.count(r) > 1 ? tt.Children.only(null) : null;
		});
		return (t.displayName = `${e}.SlotClone`), t;
	}
	var vR = Symbol('radix.slottable');
	function yR(e) {
		return (
			tt.isValidElement(e) &&
			typeof e.type == 'function' &&
			'__radixId' in e.type &&
			e.type.__radixId === vR
		);
	}
	function CR(e, t) {
		let n = { ...t };
		for (let o in t) {
			let r = e[o],
				a = t[o];
			/^on[A-Z]/.test(o)
				? r && a
					? (n[o] = (...s) => {
							let l = a(...s);
							return r(...s), l;
						})
					: r && (n[o] = r)
				: o === 'style'
					? (n[o] = { ...r, ...a })
					: o === 'className' && (n[o] = [r, a].filter(Boolean).join(' '));
		}
		return { ...e, ...n };
	}
	function SR(e) {
		let t = Object.getOwnPropertyDescriptor(e.props, 'ref')?.get,
			n = t && 'isReactWarning' in t && t.isReactWarning;
		return n
			? e.ref
			: ((t = Object.getOwnPropertyDescriptor(e, 'ref')?.get),
				(n = t && 'isReactWarning' in t && t.isReactWarning),
				n ? e.props.ref : e.props.ref || e.ref);
	}
	var pu = w(H(), 1),
		xR = w(j(), 1);
	var TR = w(H(), 1);
	function C0(e) {
		let t = e + 'CollectionProvider',
			[n, o] = tr(t),
			[r, a] = n(t, { collectionRef: { current: null }, itemMap: new Map() }),
			i = (C) => {
				let { scope: y, children: b } = C,
					g = nr.default.useRef(null),
					m = nr.default.useRef(new Map()).current;
				return (0, pu.jsx)(r, {
					scope: y,
					itemMap: m,
					collectionRef: g,
					children: b,
				});
			};
		i.displayName = t;
		let s = e + 'CollectionSlot',
			l = Fs(s),
			u = nr.default.forwardRef((C, y) => {
				let { scope: b, children: g } = C,
					m = a(s, b),
					h = gn(y, m.collectionRef);
				return (0, pu.jsx)(l, { ref: h, children: g });
			});
		u.displayName = s;
		let d = e + 'CollectionItemSlot',
			f = 'data-radix-collection-item',
			c = Fs(d),
			p = nr.default.forwardRef((C, y) => {
				let { scope: b, children: g, ...m } = C,
					h = nr.default.useRef(null),
					k = gn(y, h),
					A = a(d, b);
				return (
					nr.default.useEffect(
						() => (
							A.itemMap.set(h, { ref: h, ...m }),
							() => {
								A.itemMap.delete(h);
							}
						)
					),
					(0, pu.jsx)(c, { [f]: '', ref: k, children: g })
				);
			});
		p.displayName = d;
		function v(C) {
			let y = a(e + 'CollectionConsumer', C);
			return nr.default.useCallback(() => {
				let g = y.collectionRef.current;
				if (!g) return [];
				let m = Array.from(g.querySelectorAll(`[${f}]`));
				return Array.from(y.itemMap.values()).sort(
					(A, x) => m.indexOf(A.ref.current) - m.indexOf(x.ref.current)
				);
			}, [y.collectionRef, y.itemMap]);
		}
		return [{ Provider: i, Slot: u, ItemSlot: p }, v, o];
	}
	var Sj = !!(
		typeof window < 'u' &&
		window.document &&
		window.document.createElement
	);
	function $a(e, t, { checkForDefaultPrevented: n = !0 } = {}) {
		return function (r) {
			if ((e?.(r), n === !1 || !r.defaultPrevented)) return t?.(r);
		};
	}
	var hn = w(j(), 1);
	var S0 = w(j(), 1),
		Mn = globalThis?.document ? S0.useLayoutEffect : () => {};
	var gu = w(j(), 1);
	var kR = hn[' useInsertionEffect '.trim().toString()] || Mn;
	function Qr({ prop: e, defaultProp: t, onChange: n = () => {}, caller: o }) {
		let [r, a, i] = wR({ defaultProp: t, onChange: n }),
			s = e !== void 0,
			l = s ? e : r;
		{
			let d = hn.useRef(e !== void 0);
			hn.useEffect(() => {
				let f = d.current;
				f !== s &&
					console.warn(
						`${o} is changing from ${f ? 'controlled' : 'uncontrolled'} to ${s ? 'controlled' : 'uncontrolled'}. Components should not switch from controlled to uncontrolled (or vice versa). Decide between using a controlled or uncontrolled value for the lifetime of the component.`
					),
					(d.current = s);
			}, [s, o]);
		}
		let u = hn.useCallback(
			(d) => {
				if (s) {
					let f = AR(d) ? d(e) : d;
					f !== e && i.current?.(f);
				} else a(d);
			},
			[s, e, a, i]
		);
		return [l, u];
	}
	function wR({ defaultProp: e, onChange: t }) {
		let [n, o] = hn.useState(e),
			r = hn.useRef(n),
			a = hn.useRef(t);
		return (
			kR(() => {
				a.current = t;
			}, [t]),
			hn.useEffect(() => {
				r.current !== n && (a.current?.(n), (r.current = n));
			}, [n, r]),
			[n, o, a]
		);
	}
	function AR(e) {
		return typeof e == 'function';
	}
	var x0 = w(j(), 1),
		RR = w(Co(), 1);
	var T0 = w(H(), 1),
		ER = [
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
		to = ER.reduce((e, t) => {
			let n = Fs(`Primitive.${t}`),
				o = x0.forwardRef((r, a) => {
					let { asChild: i, ...s } = r,
						l = i ? n : t;
					return (
						typeof window < 'u' && (window[Symbol.for('radix-ui')] = !0),
						(0, T0.jsx)(l, { ...s, ref: a })
					);
				});
			return (o.displayName = `Primitive.${t}`), { ...e, [t]: o };
		}, {});
	var mt = w(j(), 1);
	var Mt = w(j(), 1);
	var k0 = w(j(), 1);
	function IR(e, t) {
		return k0.useReducer((n, o) => t[n][o] ?? n, e);
	}
	var Zm = (e) => {
		let { present: t, children: n } = e,
			o = NR(t),
			r =
				typeof n == 'function'
					? n({ present: o.isPresent })
					: Mt.Children.only(n),
			a = gn(o.ref, LR(r));
		return typeof n == 'function' || o.isPresent
			? Mt.cloneElement(r, { ref: a })
			: null;
	};
	Zm.displayName = 'Presence';
	function NR(e) {
		let [t, n] = Mt.useState(),
			o = Mt.useRef(null),
			r = Mt.useRef(e),
			a = Mt.useRef('none'),
			i = e ? 'mounted' : 'unmounted',
			[s, l] = IR(i, {
				mounted: { UNMOUNT: 'unmounted', ANIMATION_OUT: 'unmountSuspended' },
				unmountSuspended: { MOUNT: 'mounted', ANIMATION_END: 'unmounted' },
				unmounted: { MOUNT: 'mounted' },
			});
		return (
			Mt.useEffect(() => {
				let u = bu(o.current);
				a.current = s === 'mounted' ? u : 'none';
			}, [s]),
			Mn(() => {
				let u = o.current,
					d = r.current;
				if (d !== e) {
					let c = a.current,
						p = bu(u);
					e
						? l('MOUNT')
						: p === 'none' || u?.display === 'none'
							? l('UNMOUNT')
							: l(d && c !== p ? 'ANIMATION_OUT' : 'UNMOUNT'),
						(r.current = e);
				}
			}, [e, l]),
			Mn(() => {
				if (t) {
					let u,
						d = t.ownerDocument.defaultView ?? window,
						f = (p) => {
							let C = bu(o.current).includes(CSS.escape(p.animationName));
							if (p.target === t && C && (l('ANIMATION_END'), !r.current)) {
								let y = t.style.animationFillMode;
								(t.style.animationFillMode = 'forwards'),
									(u = d.setTimeout(() => {
										t.style.animationFillMode === 'forwards' &&
											(t.style.animationFillMode = y);
									}));
							}
						},
						c = (p) => {
							p.target === t && (a.current = bu(o.current));
						};
					return (
						t.addEventListener('animationstart', c),
						t.addEventListener('animationcancel', f),
						t.addEventListener('animationend', f),
						() => {
							d.clearTimeout(u),
								t.removeEventListener('animationstart', c),
								t.removeEventListener('animationcancel', f),
								t.removeEventListener('animationend', f);
						}
					);
				} else l('ANIMATION_END');
			}, [t, l]),
			{
				isPresent: ['mounted', 'unmountSuspended'].includes(s),
				ref: Mt.useCallback((u) => {
					(o.current = u ? getComputedStyle(u) : null), n(u);
				}, []),
			}
		);
	}
	function bu(e) {
		return e?.animationName || 'none';
	}
	function LR(e) {
		let t = Object.getOwnPropertyDescriptor(e.props, 'ref')?.get,
			n = t && 'isReactWarning' in t && t.isReactWarning;
		return n
			? e.ref
			: ((t = Object.getOwnPropertyDescriptor(e, 'ref')?.get),
				(n = t && 'isReactWarning' in t && t.isReactWarning),
				n ? e.props.ref : e.props.ref || e.ref);
	}
	var Jm = w(j(), 1);
	var _R = Jm[' useId '.trim().toString()] || (() => {}),
		OR = 0;
	function hu(e) {
		let [t, n] = Jm.useState(_R());
		return (
			Mn(() => {
				e || n((o) => o ?? String(OR++));
			}, [e]),
			e || (t ? `radix-${t}` : '')
		);
	}
	var Zr = w(H(), 1),
		vu = 'Collapsible',
		[BR, Wm] = tr(vu),
		[DR, $m] = BR(vu),
		w0 = mt.forwardRef((e, t) => {
			let {
					__scopeCollapsible: n,
					open: o,
					defaultOpen: r,
					disabled: a,
					onOpenChange: i,
					...s
				} = e,
				[l, u] = Qr({ prop: o, defaultProp: r ?? !1, onChange: i, caller: vu });
			return (0, Zr.jsx)(DR, {
				scope: n,
				disabled: a,
				contentId: hu(),
				open: l,
				onOpenToggle: mt.useCallback(() => u((d) => !d), [u]),
				children: (0, Zr.jsx)(to.div, {
					'data-state': tp(l),
					'data-disabled': a ? '' : void 0,
					...s,
					ref: t,
				}),
			});
		});
	w0.displayName = vu;
	var A0 = 'CollapsibleTrigger',
		R0 = mt.forwardRef((e, t) => {
			let { __scopeCollapsible: n, ...o } = e,
				r = $m(A0, n);
			return (0, Zr.jsx)(to.button, {
				type: 'button',
				'aria-controls': r.contentId,
				'aria-expanded': r.open || !1,
				'data-state': tp(r.open),
				'data-disabled': r.disabled ? '' : void 0,
				disabled: r.disabled,
				...o,
				ref: t,
				onClick: $a(e.onClick, r.onOpenToggle),
			});
		});
	R0.displayName = A0;
	var ep = 'CollapsibleContent',
		E0 = mt.forwardRef((e, t) => {
			let { forceMount: n, ...o } = e,
				r = $m(ep, e.__scopeCollapsible);
			return (0, Zr.jsx)(Zm, {
				present: n || r.open,
				children: ({ present: a }) =>
					(0, Zr.jsx)(MR, { ...o, ref: t, present: a }),
			});
		});
	E0.displayName = ep;
	var MR = mt.forwardRef((e, t) => {
		let { __scopeCollapsible: n, present: o, children: r, ...a } = e,
			i = $m(ep, n),
			[s, l] = mt.useState(o),
			u = mt.useRef(null),
			d = gn(t, u),
			f = mt.useRef(0),
			c = f.current,
			p = mt.useRef(0),
			v = p.current,
			C = i.open || s,
			y = mt.useRef(C),
			b = mt.useRef(void 0);
		return (
			mt.useEffect(() => {
				let g = requestAnimationFrame(() => (y.current = !1));
				return () => cancelAnimationFrame(g);
			}, []),
			Mn(() => {
				let g = u.current;
				if (g) {
					(b.current = b.current || {
						transitionDuration: g.style.transitionDuration,
						animationName: g.style.animationName,
					}),
						(g.style.transitionDuration = '0s'),
						(g.style.animationName = 'none');
					let m = g.getBoundingClientRect();
					(f.current = m.height),
						(p.current = m.width),
						y.current ||
							((g.style.transitionDuration = b.current.transitionDuration),
							(g.style.animationName = b.current.animationName)),
						l(o);
				}
			}, [i.open, o]),
			(0, Zr.jsx)(to.div, {
				'data-state': tp(i.open),
				'data-disabled': i.disabled ? '' : void 0,
				id: i.contentId,
				hidden: !C,
				...a,
				ref: d,
				style: {
					'--radix-collapsible-content-height': c ? `${c}px` : void 0,
					'--radix-collapsible-content-width': v ? `${v}px` : void 0,
					...e.style,
				},
				children: C && r,
			})
		);
	});
	function tp(e) {
		return e ? 'open' : 'closed';
	}
	var I0 = w0,
		N0 = R0,
		L0 = E0;
	var yu = w(j(), 1),
		zR = w(H(), 1),
		VR = yu.createContext(void 0);
	function _0(e) {
		let t = yu.useContext(VR);
		return e || t || 'ltr';
	}
	var nt = w(H(), 1),
		jn = 'Accordion',
		UR = ['Home', 'End', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'],
		[op, HR, PR] = C0(jn),
		[Su, Jj] = tr(jn, [PR, Wm]),
		rp = Wm(),
		O0 = jt.default.forwardRef((e, t) => {
			let { type: n, ...o } = e,
				r = o,
				a = o;
			return (0, nt.jsx)(op.Provider, {
				scope: e.__scopeAccordion,
				children:
					n === 'multiple'
						? (0, nt.jsx)(YR, { ...a, ref: t })
						: (0, nt.jsx)(qR, { ...r, ref: t }),
			});
		});
	O0.displayName = jn;
	var [B0, GR] = Su(jn),
		[D0, FR] = Su(jn, { collapsible: !1 }),
		qR = jt.default.forwardRef((e, t) => {
			let {
					value: n,
					defaultValue: o,
					onValueChange: r = () => {},
					collapsible: a = !1,
					...i
				} = e,
				[s, l] = Qr({ prop: n, defaultProp: o ?? '', onChange: r, caller: jn });
			return (0, nt.jsx)(B0, {
				scope: e.__scopeAccordion,
				value: jt.default.useMemo(() => (s ? [s] : []), [s]),
				onItemOpen: l,
				onItemClose: jt.default.useCallback(() => a && l(''), [a, l]),
				children: (0, nt.jsx)(D0, {
					scope: e.__scopeAccordion,
					collapsible: a,
					children: (0, nt.jsx)(M0, { ...i, ref: t }),
				}),
			});
		}),
		YR = jt.default.forwardRef((e, t) => {
			let { value: n, defaultValue: o, onValueChange: r = () => {}, ...a } = e,
				[i, s] = Qr({ prop: n, defaultProp: o ?? [], onChange: r, caller: jn }),
				l = jt.default.useCallback((d) => s((f = []) => [...f, d]), [s]),
				u = jt.default.useCallback(
					(d) => s((f = []) => f.filter((c) => c !== d)),
					[s]
				);
			return (0, nt.jsx)(B0, {
				scope: e.__scopeAccordion,
				value: i,
				onItemOpen: l,
				onItemClose: u,
				children: (0, nt.jsx)(D0, {
					scope: e.__scopeAccordion,
					collapsible: !0,
					children: (0, nt.jsx)(M0, { ...a, ref: t }),
				}),
			});
		}),
		[XR, xu] = Su(jn),
		M0 = jt.default.forwardRef((e, t) => {
			let {
					__scopeAccordion: n,
					disabled: o,
					dir: r,
					orientation: a = 'vertical',
					...i
				} = e,
				s = jt.default.useRef(null),
				l = gn(s, t),
				u = HR(n),
				f = _0(r) === 'ltr',
				c = $a(e.onKeyDown, (p) => {
					if (!UR.includes(p.key)) return;
					let v = p.target,
						C = u().filter((L) => !L.ref.current?.disabled),
						y = C.findIndex((L) => L.ref.current === v),
						b = C.length;
					if (y === -1) return;
					p.preventDefault();
					let g = y,
						m = 0,
						h = b - 1,
						k = () => {
							(g = y + 1), g > h && (g = m);
						},
						A = () => {
							(g = y - 1), g < m && (g = h);
						};
					switch (p.key) {
						case 'Home':
							g = m;
							break;
						case 'End':
							g = h;
							break;
						case 'ArrowRight':
							a === 'horizontal' && (f ? k() : A());
							break;
						case 'ArrowDown':
							a === 'vertical' && k();
							break;
						case 'ArrowLeft':
							a === 'horizontal' && (f ? A() : k());
							break;
						case 'ArrowUp':
							a === 'vertical' && A();
							break;
					}
					let x = g % b;
					C[x].ref.current?.focus();
				});
			return (0, nt.jsx)(XR, {
				scope: n,
				disabled: o,
				direction: r,
				orientation: a,
				children: (0, nt.jsx)(op.Slot, {
					scope: n,
					children: (0, nt.jsx)(to.div, {
						...i,
						'data-orientation': a,
						ref: l,
						onKeyDown: o ? void 0 : c,
					}),
				}),
			});
		}),
		Cu = 'AccordionItem',
		[KR, ap] = Su(Cu),
		j0 = jt.default.forwardRef((e, t) => {
			let { __scopeAccordion: n, value: o, ...r } = e,
				a = xu(Cu, n),
				i = GR(Cu, n),
				s = rp(n),
				l = hu(),
				u = (o && i.value.includes(o)) || !1,
				d = a.disabled || e.disabled;
			return (0, nt.jsx)(KR, {
				scope: n,
				open: u,
				disabled: d,
				triggerId: l,
				children: (0, nt.jsx)(I0, {
					'data-orientation': a.orientation,
					'data-state': P0(u),
					...s,
					...r,
					ref: t,
					disabled: d,
					open: u,
					onOpenChange: (f) => {
						f ? i.onItemOpen(o) : i.onItemClose(o);
					},
				}),
			});
		});
	j0.displayName = Cu;
	var z0 = 'AccordionHeader',
		QR = jt.default.forwardRef((e, t) => {
			let { __scopeAccordion: n, ...o } = e,
				r = xu(jn, n),
				a = ap(z0, n);
			return (0, nt.jsx)(to.h3, {
				'data-orientation': r.orientation,
				'data-state': P0(a.open),
				'data-disabled': a.disabled ? '' : void 0,
				...o,
				ref: t,
			});
		});
	QR.displayName = z0;
	var np = 'AccordionTrigger',
		V0 = jt.default.forwardRef((e, t) => {
			let { __scopeAccordion: n, ...o } = e,
				r = xu(jn, n),
				a = ap(np, n),
				i = FR(np, n),
				s = rp(n);
			return (0, nt.jsx)(op.ItemSlot, {
				scope: n,
				children: (0, nt.jsx)(N0, {
					'aria-disabled': (a.open && !i.collapsible) || void 0,
					'data-orientation': r.orientation,
					id: a.triggerId,
					...s,
					...o,
					ref: t,
				}),
			});
		});
	V0.displayName = np;
	var U0 = 'AccordionContent',
		H0 = jt.default.forwardRef((e, t) => {
			let { __scopeAccordion: n, ...o } = e,
				r = xu(jn, n),
				a = ap(U0, n),
				i = rp(n);
			return (0, nt.jsx)(L0, {
				role: 'region',
				'aria-labelledby': a.triggerId,
				'data-orientation': r.orientation,
				...i,
				...o,
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
	H0.displayName = U0;
	function P0(e) {
		return e ? 'open' : 'closed';
	}
	var G0 = O0,
		F0 = j0;
	var q0 = V0,
		Y0 = H0;
	var qs = w(j(), 1);
	var Tu = w(H(), 1),
		X0 = w(j(), 1),
		ei = ({ title: e, iconPath: t }) =>
			(0, X0.forwardRef)((n, o) =>
				(0, Tu.jsxs)('svg', {
					xmlns: 'http://www.w3.org/2000/svg',
					viewBox: '0 0 24 24',
					fill: 'none',
					stroke: 'currentColor',
					strokeLinecap: 'round',
					strokeLinejoin: 'round',
					strokeWidth: 2,
					ref: o,
					...n,
					children: [(0, Tu.jsx)('title', { children: e }), t],
				})
			);
	var ip = (0, qs.forwardRef)(
		(
			{
				className: e,
				variant: t = 'default',
				size: n = 'medium',
				noStyle: o,
				...r
			},
			a
		) => {
			let { noStyle: i } = le(),
				s = $o({ variant: t, size: n });
			return (0, Et.jsx)(G0, {
				ref: a,
				className: i || o ? e : s.root({ class: e }),
				...r,
			});
		}
	);
	ip.displayName = 'AccordionRoot';
	var sp = (0, qs.forwardRef)(({ className: e, noStyle: t, ...n }, o) => {
		let { noStyle: r } = le(),
			a = $o();
		return (0, Et.jsx)(F0, {
			ref: o,
			className: r || t ? e : a.item({ class: e }),
			...n,
		});
	});
	sp.displayName = 'AccordionItem';
	var lp = (0, qs.forwardRef)(
		({ children: e, className: t, noStyle: n, ...o }, r) => {
			let { noStyle: a } = le(),
				i = $o();
			return (0, Et.jsx)(q0, {
				ref: r,
				className: a || n ? t : i.trigger({ class: t }),
				...o,
				children: e,
			});
		}
	);
	function ZR({ className: e, noStyle: t, as: n, ...o }) {
		let r = $o(),
			a = typeof e == 'string' ? e : void 0;
		return (0, Et.jsx)(n || 'div', {
			className: t ? a : r.icon({ class: a }),
			...o,
		});
	}
	function cp({
		openIcon: e = {
			Element: ei({
				title: 'Open',
				iconPath: (0, Et.jsx)('path', { d: 'M5 12h14M12 5v14' }),
			}),
		},
		closeIcon: t = {
			Element: ei({
				title: 'Close',
				iconPath: (0, Et.jsx)('path', { d: 'M5 12h14' }),
			}),
		},
		noStyle: n,
		...o
	}) {
		let r = $o(),
			a = n ? e.className : r.arrowOpen({ class: e.className }),
			i = n ? t.className : r.arrowClose({ class: t.className });
		return (0, Et.jsxs)(Et.Fragment, {
			children: [
				(0, Et.jsx)(e.Element, { ...o, className: a }),
				(0, Et.jsx)(t.Element, { ...o, className: i }),
			],
		});
	}
	(lp.displayName = 'AccordionTrigger'),
		(ZR.displayName = 'AccordionIcon'),
		(cp.displayName = 'AccordionArrow');
	var up = (0, qs.forwardRef)(
		({ children: e, className: t, innerClassName: n, noStyle: o, ...r }, a) => {
			let { noStyle: i } = le(),
				s = $o(),
				l = i || o,
				u = l ? t : s.content({ class: t }),
				d = l ? n : s.contentInner({ class: n });
			return (0, Et.jsx)(Y0, {
				ref: a,
				className: u,
				...r,
				children: (0, Et.jsx)('div', { className: d, children: e }),
			});
		}
	);
	up.displayName = 'AccordionContent';
	var Au = w(H(), 1);
	var zn = w(j(), 1);
	var ku = w(j(), 1);
	function K0(e) {
		let t = ku.useRef({ value: e, previous: e });
		return ku.useMemo(
			() => (
				t.current.value !== e &&
					((t.current.previous = t.current.value), (t.current.value = e)),
				t.current.previous
			),
			[e]
		);
	}
	var Q0 = w(j(), 1);
	function Z0(e) {
		let [t, n] = Q0.useState(void 0);
		return (
			Mn(() => {
				if (e) {
					n({ width: e.offsetWidth, height: e.offsetHeight });
					let o = new ResizeObserver((r) => {
						if (!Array.isArray(r) || !r.length) return;
						let a = r[0],
							i,
							s;
						if ('borderBoxSize' in a) {
							let l = a.borderBoxSize,
								u = Array.isArray(l) ? l[0] : l;
							(i = u.inlineSize), (s = u.blockSize);
						} else (i = e.offsetWidth), (s = e.offsetHeight);
						n({ width: i, height: s });
					});
					return o.observe(e, { box: 'border-box' }), () => o.unobserve(e);
				} else n(void 0);
			}, [e]),
			t
		);
	}
	var Jr = w(H(), 1),
		wu = 'Switch',
		[JR, b7] = tr(wu),
		[WR, $R] = JR(wu),
		J0 = zn.forwardRef((e, t) => {
			let {
					__scopeSwitch: n,
					name: o,
					checked: r,
					defaultChecked: a,
					required: i,
					disabled: s,
					value: l = 'on',
					onCheckedChange: u,
					form: d,
					...f
				} = e,
				[c, p] = zn.useState(null),
				v = gn(t, (m) => p(m)),
				C = zn.useRef(!1),
				y = c ? d || !!c.closest('form') : !0,
				[b, g] = Qr({ prop: r, defaultProp: a ?? !1, onChange: u, caller: wu });
			return (0, Jr.jsxs)(WR, {
				scope: n,
				checked: b,
				disabled: s,
				children: [
					(0, Jr.jsx)(to.button, {
						type: 'button',
						role: 'switch',
						'aria-checked': b,
						'aria-required': i,
						'data-state': tC(b),
						'data-disabled': s ? '' : void 0,
						disabled: s,
						value: l,
						...f,
						ref: v,
						onClick: $a(e.onClick, (m) => {
							g((h) => !h),
								y &&
									((C.current = m.isPropagationStopped()),
									C.current || m.stopPropagation());
						}),
					}),
					y &&
						(0, Jr.jsx)(eC, {
							control: c,
							bubbles: !C.current,
							name: o,
							value: l,
							checked: b,
							required: i,
							disabled: s,
							form: d,
							style: { transform: 'translateX(-100%)' },
						}),
				],
			});
		});
	J0.displayName = wu;
	var W0 = 'SwitchThumb',
		$0 = zn.forwardRef((e, t) => {
			let { __scopeSwitch: n, ...o } = e,
				r = $R(W0, n);
			return (0, Jr.jsx)(to.span, {
				'data-state': tC(r.checked),
				'data-disabled': r.disabled ? '' : void 0,
				...o,
				ref: t,
			});
		});
	$0.displayName = W0;
	var eE = 'SwitchBubbleInput',
		eC = zn.forwardRef(
			(
				{ __scopeSwitch: e, control: t, checked: n, bubbles: o = !0, ...r },
				a
			) => {
				let i = zn.useRef(null),
					s = gn(i, a),
					l = K0(n),
					u = Z0(t);
				return (
					zn.useEffect(() => {
						let d = i.current;
						if (!d) return;
						let f = window.HTMLInputElement.prototype,
							p = Object.getOwnPropertyDescriptor(f, 'checked').set;
						if (l !== n && p) {
							let v = new Event('click', { bubbles: o });
							p.call(d, n), d.dispatchEvent(v);
						}
					}, [l, n, o]),
					(0, Jr.jsx)('input', {
						type: 'checkbox',
						'aria-hidden': !0,
						defaultChecked: n,
						...r,
						tabIndex: -1,
						ref: s,
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
	eC.displayName = eE;
	function tC(e) {
		return e ? 'checked' : 'unchecked';
	}
	var dp = J0,
		nC = $0;
	var oC = w(j(), 1),
		no = (0, oC.forwardRef)(
			(
				{ className: e, disabled: t, size: n = 'medium', noStyle: o, ...r },
				a
			) => {
				let i = Gm({ size: n }),
					s = o ? e : i.root({ class: e }),
					l = o ? void 0 : i.thumb({ disabled: t }),
					u = o ? void 0 : i.track({ disabled: t });
				return (0, Au.jsx)(dp, {
					ref: a,
					disabled: t,
					className: s,
					...r,
					children: (0, Au.jsx)('span', {
						className: u,
						children: (0, Au.jsx)(nC, {
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
	no.displayName = dp.displayName;
	var tE = (0, Ys.forwardRef)(({ children: e, ...t }, n) =>
			(0, vn.jsx)(de, {
				ref: n,
				baseClassName: Qt.accordionTrigger,
				...t,
				children: e,
			})
		),
		nE = lp,
		oE = up,
		rE = cp,
		rC = ip,
		aE = no,
		aC = () => {
			let {
					selectedConsents: e,
					setSelectedConsent: t,
					getDisplayedConsents: n,
				} = K(),
				o = (0, Ys.useCallback)(
					(a, i) => {
						t(a, i);
					},
					[t]
				),
				{ consentTypes: r } = Ne();
			return n().map((a) =>
				(0, vn.jsxs)(
					iE,
					{
						value: a.name,
						className: Qt.accordionItem,
						children: [
							(0, vn.jsxs)(tE, {
								'data-testid': `consent-widget-accordion-trigger-${a.name}`,
								children: [
									(0, vn.jsxs)(nE, {
										className: Qt.accordionTriggerInner,
										'data-testid': `consent-widget-accordion-trigger-inner-${a.name}`,
										children: [
											(0, vn.jsx)(rE, {
												'data-testid': `consent-widget-accordion-arrow-${a.name}`,
												className: Qt.accordionArrow,
												openIcon: {
													Element: ei({
														title: 'Open',
														iconPath: (0, vn.jsx)('path', {
															d: 'M5 12h14M12 5v14',
														}),
													}),
													className: Qt.accordionArrowIcon,
												},
												closeIcon: {
													Element: ei({
														title: 'Close',
														iconPath: (0, vn.jsx)('path', { d: 'M5 12h14' }),
													}),
													className: Qt.accordionArrowIcon,
												},
											}),
											r[a.name]?.title ??
												a.name
													.replace(/_/g, ' ')
													.replace(/\b\w/g, (i) => i.toUpperCase()),
										],
									}),
									(0, vn.jsx)(aE, {
										checked: e[a.name],
										onClick: (i) => i.stopPropagation(),
										onKeyUp: (i) => i.stopPropagation(),
										onKeyDown: (i) => i.stopPropagation(),
										onCheckedChange: (i) => o(a.name, i),
										disabled: a.disabled,
										className: Qt.switch,
										size: 'small',
										'data-testid': `consent-widget-switch-${a.name}`,
									}),
								],
							}),
							(0, vn.jsx)(oE, {
								className: Qt.accordionContent,
								'data-testid': `consent-widget-accordion-content-${a.name}`,
								children: r[a.name]?.description ?? a.description,
							}),
						],
					},
					a.name
				)
			);
		},
		iE = (0, Ys.forwardRef)(({ className: e, ...t }, n) =>
			(0, vn.jsx)(sp, { ref: n, className: Qt.accordionItem, ...t })
		);
	var Xs = w(H(), 1),
		Ks = w(j(), 1);
	var iC = (0, Ks.forwardRef)(({ children: e, ...t }, n) => {
			let { common: o } = Ne();
			return (0, Xs.jsx)(eo, {
				ref: n,
				mode: 'stroke',
				size: 'small',
				action: 'accept-consent',
				...t,
				themeKey: 'buttonSecondary',
				'data-testid': 'consent-widget-footer-accept-button',
				closeConsentBanner: !0,
				closeConsentDialog: !0,
				children: e ?? o.acceptAll,
			});
		}),
		L7 = (0, Ks.forwardRef)(({ children: e, ...t }, n) => {
			let { common: o } = Ne();
			return (0, Xs.jsx)(eo, {
				ref: n,
				action: 'open-consent-dialog',
				...t,
				themeKey: 'buttonSecondary',
				'data-testid': 'consent-widget-footer-customize-button',
				children: e ?? o.customize,
			});
		}),
		sC = (0, Ks.forwardRef)(({ children: e, ...t }, n) => {
			let { common: o } = Ne();
			return (0, Xs.jsx)(eo, {
				ref: n,
				action: 'custom-consent',
				variant: 'primary',
				closeConsentDialog: !0,
				...t,
				themeKey: 'buttonPrimary',
				'data-testid': 'consent-widget-footer-save-button',
				children: e ?? o.save,
			});
		}),
		lC = (0, Ks.forwardRef)(({ children: e, ...t }, n) => {
			let { common: o } = Ne();
			return (0, Xs.jsx)(eo, {
				ref: n,
				mode: 'stroke',
				size: 'small',
				action: 'reject-consent',
				...t,
				themeKey: 'buttonSecondary',
				'data-testid': 'consent-widget-reject-button',
				closeConsentBanner: !0,
				closeConsentDialog: !0,
				children: e ?? o.rejectAll,
			});
		});
	var fp = w(H(), 1);
	var mp = w(j(), 1);
	var cC = (0, mp.forwardRef)(({ children: e, ...t }, n) =>
			(0, fp.jsx)(de, {
				ref: n,
				baseClassName: Qt.footer,
				'data-testid': 'consent-widget-footer',
				...t,
				themeKey: 'consentWidgetFooter',
				children: e,
			})
		),
		uC = (0, mp.forwardRef)(({ children: e, ...t }, n) =>
			(0, fp.jsx)(de, {
				ref: n,
				baseClassName: Qt.footerGroup,
				'data-testid': 'consent-widget-footer-sub-group',
				...t,
				themeKey: 'consentWidgetFooter',
				children: e,
			})
		);
	var Qs = w(H(), 1);
	var dC = ({
		children: e,
		noStyle: t = !1,
		disableAnimation: n = !1,
		useProvider: o = !0,
		uiSource: r,
	}) => {
		let { translationConfig: a } = K(),
			i = mn(a.defaultLanguage),
			s = Zc(),
			l = r ?? s.uiSource ?? 'widget',
			u = (0, Qs.jsx)(de, {
				'data-testid': 'consent-widget-root',
				themeKey: 'consentWidget',
				dir: i,
				children: e,
			});
		return o
			? (0, Qs.jsx)(Dt.Provider, {
					value: { uiSource: l },
					children: (0, Qs.jsx)(fn.Provider, {
						value: { disableAnimation: n, noStyle: t },
						children: u,
					}),
				})
			: (0, Qs.jsx)(Dt.Provider, { value: { uiSource: l }, children: u });
	};
	var mC = ({
		hideBranding: e,
		noStyle: t,
		disableAnimation: n,
		scrollLock: o,
		trapFocus: r,
		...a
	}) => {
		let [i, s] = (0, fC.useState)([]),
			l = le();
		return (0, Vn.jsxs)(dC, {
			noStyle: t ?? l.noStyle,
			disableAnimation: n ?? l.disableAnimation,
			scrollLock: o ?? l.scrollLock,
			trapFocus: r ?? l.trapFocus,
			...a,
			children: [
				(0, Vn.jsx)(rC, {
					type: 'multiple',
					value: i,
					onValueChange: s,
					children: (0, Vn.jsx)(aC, {}),
				}),
				(0, Vn.jsxs)(cC, {
					children: [
						(0, Vn.jsxs)(uC, {
							themeKey: 'consentWidgetFooter',
							children: [(0, Vn.jsx)(lC, {}), (0, Vn.jsx)(iC, {})],
						}),
						(0, Vn.jsx)(sC, {}),
					],
				}),
				(0, Vn.jsx)(ti, {
					themeKey: 'consentWidgetBranding',
					hideBranding: e ?? !0,
					'data-testid': 'consent-widget-branding',
				}),
			],
		});
	};
	var fe = w(H(), 1),
		pC = ({ title: e = 'c15t', titleId: t = 'c15t-icon', ...n }) =>
			(0, fe.jsxs)('svg', {
				xmlns: 'http://www.w3.org/2000/svg',
				viewBox: '0 0 446 445',
				'aria-labelledby': t,
				...n,
				children: [
					(0, fe.jsx)('title', { id: t, children: e }),
					(0, fe.jsx)('path', {
						fill: 'currentColor',
						d: 'M223.178.313c39.064 0 70.732 31.668 70.732 70.732-.001 39.064-31.668 70.731-70.732 70.731-12.181 0-23.642-3.079-33.649-8.502l-55.689 55.689a70.267 70.267 0 0 1 5.574 13.441h167.531c8.695-29.217 35.762-50.523 67.804-50.523 39.064 0 70.731 31.668 70.731 70.732s-31.668 70.732-70.731 70.732c-32.042 0-59.108-21.306-67.803-50.523H139.413a70.417 70.417 0 0 1-7.888 17.396l54.046 54.046c10.893-6.851 23.786-10.815 37.605-10.815 39.064 0 70.732 31.669 70.732 70.733 0 39.064-31.668 70.731-70.732 70.731s-70.732-31.667-70.732-70.731c0-10.518 2.296-20.499 6.414-29.471l-57.78-57.78c-8.972 4.117-18.952 6.414-29.47 6.414-39.063 0-70.731-31.668-70.732-70.732 0-39.064 31.669-70.732 70.733-70.732 12.18 0 23.642 3.079 33.649 8.502l55.688-55.688c-5.423-10.007-8.502-21.469-8.502-33.65 0-39.064 31.668-70.733 70.732-70.733Zm0 343.555c-16.742 0-30.314 13.572-30.314 30.314 0 16.741 13.572 30.313 30.314 30.313s30.314-13.572 30.314-30.313c0-16.742-13.572-30.314-30.314-30.314ZM71.611 192.299c-16.742 0-30.315 13.572-30.315 30.314s13.573 30.314 30.315 30.314c16.741 0 30.313-13.572 30.313-30.314 0-16.741-13.572-30.314-30.313-30.314Zm303.138 0c-16.729 0-30.294 13.551-30.315 30.275l.001.039-.001.038c.021 16.725 13.586 30.276 30.315 30.276 16.741 0 30.313-13.572 30.313-30.314 0-16.741-13.572-30.314-30.313-30.314ZM223.178 40.73c-16.742 0-30.314 13.573-30.314 30.315s13.573 30.313 30.314 30.313c16.742 0 30.313-13.572 30.314-30.313 0-16.742-13.572-30.314-30.314-30.315Z',
					}),
				],
			}),
		gC = ({ title: e = 'c15t', titleId: t = 'c15t', ...n }) =>
			(0, fe.jsxs)('svg', {
				xmlns: 'http://www.w3.org/2000/svg',
				viewBox: '0 0 408 149',
				'aria-labelledby': t,
				...n,
				children: [
					(0, fe.jsx)('title', { id: t, children: e }),
					(0, fe.jsx)('path', {
						fill: 'currentColor',
						fillRule: 'evenodd',
						d: 'M74.133 14.042c-5.58 0-10.105 4.524-10.105 10.104 0 5.581 4.524 10.105 10.105 10.105 5.58 0 10.105-4.524 10.105-10.105 0-5.58-4.524-10.104-10.105-10.104ZM50.556 24.146C50.556 11.125 61.112.57 74.133.57 87.154.57 97.71 11.125 97.71 24.146c0 13.022-10.556 23.578-23.577 23.578-4.06 0-7.88-1.027-11.216-2.834L44.354 63.453a23.424 23.424 0 0 1 1.858 4.48h55.843c2.899-9.74 11.921-16.841 22.601-16.841 13.022 0 23.578 10.556 23.578 23.577 0 13.022-10.556 23.578-23.578 23.578-10.68 0-19.702-7.102-22.601-16.841H46.211a23.455 23.455 0 0 1-2.628 5.798l18.015 18.015a23.473 23.473 0 0 1 12.535-3.604c13.021 0 23.577 10.556 23.577 23.577 0 13.022-10.556 23.577-23.577 23.577-13.021 0-23.577-10.555-23.577-23.577 0-3.506.765-6.833 2.138-9.824l-19.26-19.26a23.49 23.49 0 0 1-9.823 2.139C10.588 98.247.032 87.69.032 74.669c0-13.021 10.556-23.577 23.577-23.577 4.061 0 7.882 1.026 11.217 2.834L53.39 35.364a23.473 23.473 0 0 1-2.834-11.218Zm63.996 50.523v.023c.012 5.57 4.531 10.082 10.104 10.082 5.581 0 10.105-4.524 10.105-10.105 0-5.58-4.524-10.104-10.105-10.104-5.573 0-10.092 4.511-10.104 10.082v.022ZM23.61 64.565c-5.58 0-10.104 4.524-10.104 10.104 0 5.58 4.524 10.105 10.104 10.105 5.581 0 10.105-4.524 10.105-10.105 0-5.58-4.524-10.104-10.105-10.104Zm40.418 60.627c0-5.581 4.524-10.104 10.105-10.104 5.58 0 10.105 4.523 10.105 10.104 0 5.581-4.524 10.105-10.105 10.105-5.58 0-10.105-4.524-10.105-10.105Z',
						clipRule: 'evenodd',
					}),
					(0, fe.jsx)('path', {
						fill: 'currentColor',
						d: 'M213.869 86.31c0-18.48 14.64-32.04 32.88-32.04 9 0 17.28 3 24.24 10.44l-8.88 9.24c-4.08-4.2-8.88-6.6-15.36-6.6-10.56 0-18.6 8.04-18.6 18.96 0 10.92 8.04 18.959 18.6 18.959 6.48 0 11.28-2.4 15.36-6.6l8.88 9.24c-6.96 7.44-15.24 10.44-24.24 10.44-18.24 0-32.88-13.56-32.88-32.04Zm70.372-39.72h-11.88V33.03h26.88v83.639h-15v-70.08Zm23.468 54.599 12.24-6.96c2.88 6.12 9.24 10.2 16.44 10.2 10.2 0 17.04-6.36 17.04-15.84s-6.48-15.84-16.2-15.84c-4.68 0-9.48 1.44-12.48 4.32l-10.8-2.88 7.8-41.16h40.56v13.56h-29.28l-3 15.12c2.52-1.08 5.52-1.56 8.76-1.56 17.76 0 29.52 11.28 29.52 28.32 0 17.76-12.72 29.64-31.92 29.64-12.6 0-23.52-6.84-28.68-16.92Zm72.386-31.92h-7.8V56.19h7.8V33.03h14.4v23.16h13.08v13.08h-13.08v47.4h-14.4v-47.4Z',
					}),
				],
			});
	var Ru = ({ title: e = 'Consent', titleId: t = 'consent-icon', ...n }) =>
			(0, fe.jsxs)('svg', {
				xmlns: 'http://www.w3.org/2000/svg',
				viewBox: '0 0 140 97',
				fill: 'none',
				'aria-labelledby': t,
				...n,
				children: [
					(0, fe.jsx)('title', { id: t, children: e }),
					(0, fe.jsx)('path', {
						fill: 'currentColor',
						fillRule: 'evenodd',
						d: 'M53.179 70.787c6.17 0 11.172-5.002 11.172-11.172 0-4.009-2.111-7.524-5.283-9.495a23.87 23.87 0 0 1 8.817-1.677c13.217 0 23.93 10.714 23.93 23.93s-10.713 23.93-23.93 23.93c-13.216 0-23.93-10.714-23.93-23.93 0-1.924.227-3.795.656-5.588a11.148 11.148 0 0 0 8.568 4.002Z',
						clipRule: 'evenodd',
					}),
					(0, fe.jsx)('path', {
						fill: 'currentColor',
						fillRule: 'evenodd',
						d: 'M.618 74.716a68.453 68.453 0 0 1-.098-3.654c0-37.205 30.16-67.365 67.365-67.365s67.365 30.16 67.365 67.365c0 1.226-.032 2.444-.097 3.654h-21.927c.041-.776.061-1.557.061-2.343 0-24.531-19.887-44.418-44.418-44.418-24.532 0-44.418 19.887-44.418 44.418 0 .786.02 1.567.06 2.343H.618Z',
						clipRule: 'evenodd',
					}),
				],
			}),
		bC = ({ title: e = 'Privacy', titleId: t = 'fingerprint-icon', ...n }) =>
			(0, fe.jsxs)('svg', {
				xmlns: 'http://www.w3.org/2000/svg',
				viewBox: '0 0 24 24',
				fill: 'none',
				stroke: 'currentColor',
				strokeWidth: '2',
				strokeLinecap: 'round',
				strokeLinejoin: 'round',
				'aria-labelledby': t,
				...n,
				children: [
					(0, fe.jsx)('title', { id: t, children: e }),
					(0, fe.jsx)('path', {
						d: 'M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4',
					}),
					(0, fe.jsx)('path', { d: 'M14 13.12c0 2.38 0 6.38-1 8.88' }),
					(0, fe.jsx)('path', { d: 'M17.29 21.02c.12-.6.43-2.3.5-3.02' }),
					(0, fe.jsx)('path', { d: 'M2 12a10 10 0 0 1 18-6' }),
					(0, fe.jsx)('path', { d: 'M2 16h.01' }),
					(0, fe.jsx)('path', { d: 'M21.8 16c.2-2 .131-5.354 0-6' }),
					(0, fe.jsx)('path', {
						d: 'M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2',
					}),
					(0, fe.jsx)('path', { d: 'M8.65 22c.21-.66.45-1.32.57-2' }),
					(0, fe.jsx)('path', { d: 'M9 6.8a6 6 0 0 1 9 5.2v2' }),
				],
			}),
		hC = ({ title: e = 'Settings', titleId: t = 'settings-icon', ...n }) =>
			(0, fe.jsxs)('svg', {
				xmlns: 'http://www.w3.org/2000/svg',
				viewBox: '0 0 24 24',
				fill: 'none',
				stroke: 'currentColor',
				strokeWidth: '2',
				strokeLinecap: 'round',
				strokeLinejoin: 'round',
				'aria-labelledby': t,
				...n,
				children: [
					(0, fe.jsx)('title', { id: t, children: e }),
					(0, fe.jsx)('path', {
						d: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z',
					}),
					(0, fe.jsx)('circle', { cx: '12', cy: '12', r: '3' }),
				],
			});
	var vC = (0, Wr.forwardRef)(({ children: e, ...t }, n) =>
			(0, He.jsx)(de, {
				ref: n,
				baseClassName: Le.card,
				...t,
				themeKey: 'consentDialogCard',
				'data-testid': 'consent-dialog-card',
				children: e,
			})
		),
		Eu = (0, Wr.forwardRef)(({ children: e, ...t }, n) =>
			(0, He.jsx)(de, {
				ref: n,
				baseClassName: Le.header,
				...t,
				themeKey: 'consentDialogHeader',
				'data-testid': 'consent-dialog-header',
				children: e,
			})
		),
		Iu = (0, Wr.forwardRef)(({ children: e, ...t }, n) => {
			let { consentManagerDialog: o } = Ne();
			return (0, He.jsx)(de, {
				ref: n,
				baseClassName: Le.title,
				themeKey: 'consentDialogTitle',
				...t,
				'data-testid': 'consent-dialog-title',
				children: e ?? o.title,
			});
		}),
		Nu = (0, Wr.forwardRef)(
			({ children: e, legalLinks: t, asChild: n, ...o }, r) => {
				let { consentManagerDialog: a } = Ne();
				return n
					? (0, He.jsx)(de, {
							ref: r,
							baseClassName: Le.description,
							themeKey: 'consentDialogDescription',
							asChild: n,
							...o,
							children: e ?? a.description,
						})
					: (0, He.jsxs)(de, {
							ref: r,
							baseClassName: Le.description,
							themeKey: 'consentDialogDescription',
							asChild: n,
							...o,
							'data-testid': 'consent-dialog-description',
							children: [
								e ?? a.description,
								(0, He.jsx)(lu, {
									links: t,
									themeKey: 'consentDialogContent',
									testIdPrefix: 'consent-dialog-legal-link',
								}),
							],
						});
			}
		),
		Lu = (0, Wr.forwardRef)(({ children: e, ...t }, n) =>
			(0, He.jsx)(de, {
				ref: n,
				baseClassName: Le.content,
				themeKey: 'consentDialogContent',
				'data-testid': 'consent-dialog-content',
				...t,
				children: e,
			})
		),
		ti = (0, Wr.forwardRef)(
			(
				{ children: e, themeKey: t, hideBranding: n, 'data-testid': o, ...r },
				a
			) =>
				(0, He.jsx)(de, {
					ref: a,
					baseClassName: Le.footer,
					'data-testid': o ?? 'consent-dialog-footer',
					...r,
					themeKey: t ?? 'consentDialogFooter',
					children: e ?? (0, He.jsx)(pp, { hideBranding: n ?? !1 }),
				})
		);
	function pp({ hideBranding: e }) {
		let { branding: t } = K();
		if (t === 'none' || e) return null;
		let n = typeof window < 'u' ? `?ref=${window.location.hostname}` : '';
		return (0, He.jsxs)('a', {
			dir: 'ltr',
			className: Le.branding,
			href: t === 'consent' ? `https://consent.io${n}` : `https://c15t.com${n}`,
			children: [
				'Secured by',
				' ',
				t === 'consent'
					? (0, He.jsx)(Ru, { className: Le.brandingConsent })
					: (0, He.jsx)(gC, { className: Le.brandingC15T }),
			],
		});
	}
	var _u = ({ noStyle: e, legalLinks: t, hideBranding: n }) =>
			(0, He.jsxs)(vC, {
				children: [
					(0, He.jsxs)(Eu, {
						children: [(0, He.jsx)(Iu, {}), (0, He.jsx)(Nu, { legalLinks: t })],
					}),
					(0, He.jsx)(Lu, {
						children: (0, He.jsx)(mC, {
							hideBranding: !0,
							noStyle: e,
							useProvider: !0,
						}),
					}),
					(0, He.jsx)(ti, { hideBranding: n }),
				],
			}),
		yC = vC,
		CC = Eu,
		SC = Iu,
		xC = Nu,
		TC = Lu,
		kC = ti;
	var wC = w(H(), 1);
	var Ou = w(j(), 1);
	var AC = ({ noStyle: e, style: t }) => {
			let n,
				{ activeUI: o } = K(),
				{ disableAnimation: r, noStyle: a, scrollLock: i = !0 } = le(),
				s = o === 'dialog',
				[l, u] = (0, Ou.useState)(!1);
			(0, Ou.useEffect)(() => {
				if (s) u(!0);
				else if (r) u(!1);
				else {
					let p = setTimeout(
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
					return () => clearTimeout(p);
				}
			}, [s, r]);
			let d = typeof t == 'string' ? t : t?.className,
				f = oe('consentDialogOverlay', {
					baseClassName: !(a || e) && Le.overlay,
					className: d,
					noStyle: a || e,
				});
			n = a || e || r ? void 0 : l ? Le.overlayVisible : Le.overlayHidden;
			let c = wt(f.className, n);
			return (0, wC.jsx)('div', {
				style:
					typeof t == 'object' && 'style' in t
						? { ...f.style, ...t.style }
						: f.style,
				className: c,
				'data-testid': 'consent-dialog-overlay',
			});
		},
		Bu = AC;
	var oo = w(H(), 1);
	var To = w(j(), 1),
		RC = w(Co(), 1);
	var EC = ({
			children: e,
			open: t,
			models: n = ['opt-in', 'opt-out'],
			noStyle: o,
			disableAnimation: r,
			scrollLock: a = !0,
			trapFocus: i = !0,
			overlay: s,
			uiSource: l,
			className: u,
			style: d,
			...f
		}) => {
			let c = le(),
				p = r ?? c.disableAnimation ?? !1,
				v = o ?? c.noStyle ?? !1,
				C = a ?? c.scrollLock ?? !0,
				y = i ?? c.trapFocus ?? !0,
				{ activeUI: b, translationConfig: g, model: m } = K(),
				h = mn(g.defaultLanguage),
				k = n.includes(m) && (t ?? b === 'dialog'),
				[A, x] = (0, To.useState)(!1),
				L = (0, To.useRef)(null),
				_ = (0, To.useRef)(null),
				[N, B] = (0, To.useState)(!1);
			(0, To.useEffect)(() => {
				B(!0);
			}, []);
			let Z = c.theme?.motion?.duration?.normal;
			(0, To.useEffect)(() => {
				if (k) x(!0);
				else if (p) x(!1);
				else {
					let Ct = setTimeout(
						() => x(!1),
						Number.parseInt((Z || '200ms').replace('ms', ''), 10)
					);
					return () => clearTimeout(Ct);
				}
			}, [k, p, Z]),
				pn(k && y, L),
				dn(k && C);
			let P = oe('consentDialog', {
					baseClassName: void 0,
					className: wt(
						Le.root,
						!p && (A ? Le.dialogVisible : Le.dialogHidden),
						u
					),
					style: d,
					noStyle: v,
				}),
				ge = {
					disableAnimation: p,
					noStyle: v,
					scrollLock: C,
					trapFocus: y,
					theme: c.theme,
				},
				at = (0, oo.jsx)(Dt.Provider, {
					value: { uiSource: l ?? 'dialog' },
					children: (0, oo.jsx)(fn.Provider, {
						value: ge,
						children:
							k &&
							(0, oo.jsxs)(oo.Fragment, {
								children: [
									s === !1 ? null : (s ?? (0, oo.jsx)(Bu, {})),
									(0, oo.jsx)('dialog', {
										ref: L,
										...f,
										...P,
										className: P.className,
										'aria-labelledby': 'privacy-settings-title',
										tabIndex: -1,
										dir: h,
										'data-testid': 'consent-dialog-root',
										open: !0,
										children: (0, oo.jsx)('div', {
											ref: _,
											className: v
												? void 0
												: wt(
														Le.container,
														p
															? void 0
															: A
																? Le.contentVisible
																: Le.contentHidden
													),
											children: e,
										}),
									}),
								],
							}),
					}),
				});
			return N ? (0, RC.createPortal)(at, document.body) : null;
		},
		Du = EC;
	var ar = w(H(), 1);
	var ju = w(H(), 1);
	var OC = w(H(), 1);
	var sE = {
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/components/consent-dialog-trigger.module.css'(
				e,
				t,
				n
			) {
				n.d(t, { A: () => s });
				var o = n(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'
					),
					r = n.n(o),
					a = n(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'
					),
					i = n.n(a)()(r());
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
				let s = i;
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'(
				e
			) {
				e.exports = function (t) {
					var n = [];
					return (
						(n.toString = function () {
							return this.map(function (o) {
								var r = '',
									a = o[5] !== void 0;
								return (
									o[4] && (r += '@supports ('.concat(o[4], ') {')),
									o[2] && (r += '@media '.concat(o[2], ' {')),
									a &&
										(r += '@layer'.concat(
											o[5].length > 0 ? ' '.concat(o[5]) : '',
											' {'
										)),
									(r += t(o)),
									a && (r += '}'),
									o[2] && (r += '}'),
									o[4] && (r += '}'),
									r
								);
							}).join('');
						}),
						(n.i = function (o, r, a, i, s) {
							typeof o == 'string' && (o = [[null, o, void 0]]);
							var l = {};
							if (a)
								for (var u = 0; u < this.length; u++) {
									var d = this[u][0];
									d != null && (l[d] = !0);
								}
							for (var f = 0; f < o.length; f++) {
								var c = [].concat(o[f]);
								(a && l[c[0]]) ||
									(s !== void 0 &&
										(c[5] === void 0 ||
											(c[1] = '@layer'
												.concat(c[5].length > 0 ? ' '.concat(c[5]) : '', ' {')
												.concat(c[1], '}')),
										(c[5] = s)),
									r &&
										(c[2] &&
											(c[1] = '@media '.concat(c[2], ' {').concat(c[1], '}')),
										(c[2] = r)),
									i &&
										(c[4]
											? ((c[1] = '@supports ('
													.concat(c[4], ') {')
													.concat(c[1], '}')),
												(c[4] = i))
											: (c[4] = ''.concat(i))),
									n.push(c));
							}
						}),
						n
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
				function n(r) {
					for (var a = -1, i = 0; i < t.length; i++)
						if (t[i].identifier === r) {
							a = i;
							break;
						}
					return a;
				}
				function o(r, a) {
					for (var i = {}, s = [], l = 0; l < r.length; l++) {
						var u = r[l],
							d = a.base ? u[0] + a.base : u[0],
							f = i[d] || 0,
							c = ''.concat(d, ' ').concat(f);
						i[d] = f + 1;
						var p = n(c),
							v = {
								css: u[1],
								media: u[2],
								sourceMap: u[3],
								supports: u[4],
								layer: u[5],
							};
						if (p !== -1) t[p].references++, t[p].updater(v);
						else {
							var C = (function (y, b) {
								var g = b.domAPI(b);
								return (
									g.update(y),
									function (m) {
										m
											? (m.css !== y.css ||
													m.media !== y.media ||
													m.sourceMap !== y.sourceMap ||
													m.supports !== y.supports ||
													m.layer !== y.layer) &&
												g.update((y = m))
											: g.remove();
									}
								);
							})(v, a);
							(a.byIndex = l),
								t.splice(l, 0, { identifier: c, updater: C, references: 1 });
						}
						s.push(c);
					}
					return s;
				}
				e.exports = function (r, a) {
					var i = o((r = r || []), (a = a || {}));
					return function (s) {
						s = s || [];
						for (var l = 0; l < i.length; l++) {
							var u = n(i[l]);
							t[u].references--;
						}
						for (var d = o(s, a), f = 0; f < i.length; f++) {
							var c = n(i[f]);
							t[c].references === 0 && (t[c].updater(), t.splice(c, 1));
						}
						i = d;
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'(
				e
			) {
				var t = {};
				e.exports = function (n, o) {
					var r = (function (a) {
						if (t[a] === void 0) {
							var i = document.querySelector(a);
							if (
								window.HTMLIFrameElement &&
								i instanceof window.HTMLIFrameElement
							)
								try {
									i = i.contentDocument.head;
								} catch {
									i = null;
								}
							t[a] = i;
						}
						return t[a];
					})(n);
					if (!r)
						throw Error(
							"Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid."
						);
					r.appendChild(o);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'(
				e
			) {
				e.exports = function (t) {
					var n = document.createElement('style');
					return t.setAttributes(n, t.attributes), t.insert(n, t.options), n;
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'(
				e,
				t,
				n
			) {
				e.exports = function (o) {
					var r = n.nc;
					r && o.setAttribute('nonce', r);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'(
				e
			) {
				e.exports = function (t) {
					if (typeof document > 'u')
						return { update: function () {}, remove: function () {} };
					var n = t.insertStyleElement(t);
					return {
						update: function (o) {
							var r, a, i;
							(r = ''),
								o.supports && (r += '@supports ('.concat(o.supports, ') {')),
								o.media && (r += '@media '.concat(o.media, ' {')),
								(a = o.layer !== void 0) &&
									(r += '@layer'.concat(
										o.layer.length > 0 ? ' '.concat(o.layer) : '',
										' {'
									)),
								(r += o.css),
								a && (r += '}'),
								o.media && (r += '}'),
								o.supports && (r += '}'),
								(i = o.sourceMap) &&
									typeof btoa < 'u' &&
									(r += `
/*# sourceMappingURL=data:application/json;base64,`.concat(
										btoa(unescape(encodeURIComponent(JSON.stringify(i)))),
										' */'
									)),
								t.styleTagTransform(r, n, t.options);
						},
						remove: function () {
							var o;
							(o = n).parentNode === null || o.parentNode.removeChild(o);
						},
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'(
				e
			) {
				e.exports = function (t, n) {
					if (n.styleSheet) n.styleSheet.cssText = t;
					else {
						for (; n.firstChild; ) n.removeChild(n.firstChild);
						n.appendChild(document.createTextNode(t));
					}
				};
			},
		},
		IC = {};
	function Pe(e) {
		var t = IC[e];
		if (t !== void 0) return t.exports;
		var n = (IC[e] = { id: e, exports: {} });
		return sE[e](n, n.exports, Pe), n.exports;
	}
	(Pe.n = (e) => {
		var t = e && e.__esModule ? () => e.default : () => e;
		return Pe.d(t, { a: t }), t;
	}),
		(Pe.d = (e, t) => {
			for (var n in t)
				Pe.o(t, n) &&
					!Pe.o(e, n) &&
					Object.defineProperty(e, n, { enumerable: !0, get: t[n] });
		}),
		(Pe.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t)),
		(Pe.nc = void 0);
	var lE = Pe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'
		),
		cE = Pe.n(lE),
		uE = Pe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'
		),
		dE = Pe.n(uE),
		fE = Pe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'
		),
		mE = Pe.n(fE),
		pE = Pe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'
		),
		gE = Pe.n(pE),
		bE = Pe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'
		),
		hE = Pe.n(bE),
		vE = Pe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'
		),
		yE = Pe.n(vE),
		Mu = Pe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/components/consent-dialog-trigger.module.css'
		),
		ni = {};
	(ni.styleTagTransform = yE()),
		(ni.setAttributes = gE()),
		(ni.insert = mE().bind(null, 'head')),
		(ni.domAPI = dE()),
		(ni.insertStyleElement = hE()),
		cE()(Mu.A, ni);
	var It = Mu.A && Mu.A.locals ? Mu.A.locals : void 0;
	var BC = w(j(), 1);
	var NC = w(H(), 1),
		or = w(j(), 1),
		LC = w(Co(), 1);
	var Nt = w(j(), 1);
	function gp(e = {}) {
		let {
				defaultPosition: t = 'bottom-right',
				persistPosition: n = !0,
				onPositionChange: o,
			} = e,
			[r, a] = (0, Nt.useState)(() => {
				if (n && typeof window < 'u') {
					let h = Dy();
					if (h) return h;
				}
				return t;
			}),
			[i, s] = (0, Nt.useState)(qc),
			[l, u] = (0, Nt.useState)(!1),
			d = (0, Nt.useRef)(!1),
			f = (0, Nt.useRef)(null),
			c = (0, Nt.useRef)(0),
			p = (0, Nt.useCallback)(
				(h) => {
					a(h), n && By(h), o?.(h);
				},
				[n, o]
			),
			v = (0, Nt.useCallback)((h) => {
				h.button === 0 &&
					(h.target.setPointerCapture(h.pointerId),
					(f.current = h.target),
					(d.current = !1),
					(c.current = Date.now()),
					s({
						isDragging: !0,
						startX: h.clientX,
						startY: h.clientY,
						currentX: h.clientX,
						currentY: h.clientY,
					}),
					u(!1));
			}, []),
			C = (0, Nt.useCallback)((h) => {
				s((k) => {
					if (!k.isDragging) return k;
					let A = Math.abs(h.clientX - k.startX),
						x = Math.abs(h.clientY - k.startY);
					return (
						(A > 5 || x > 5) && (d.current = !0),
						{ ...k, currentX: h.clientX, currentY: h.clientY }
					);
				});
			}, []),
			y = (0, Nt.useCallback)(
				(h) => {
					f.current && f.current.releasePointerCapture(h.pointerId),
						s((k) => {
							if (!k.isDragging) return k;
							if (d.current) {
								let A = h.clientX - k.startX,
									x = h.clientY - k.startY,
									L = Date.now() - c.current,
									_ = Oy(r, A, x, {
										velocityX: L > 0 ? A / L : 0,
										velocityY: L > 0 ? x / L : 0,
									});
								_ !== r && (u(!0), setTimeout(() => u(!1), 300), p(_));
							}
							return qc();
						});
				},
				[r, p]
			),
			b = (0, Nt.useCallback)((h) => {
				f.current && f.current.releasePointerCapture(h.pointerId), s(qc());
			}, []),
			g = i.isDragging
				? {
						transform: `translate(${i.currentX - i.startX}px, ${i.currentY - i.startY}px)`,
						transition: 'none',
					}
				: {},
			m = (0, Nt.useCallback)(() => d.current, []);
		return {
			corner: r,
			isDragging: i.isDragging,
			isSnapping: l,
			wasDragged: m,
			handlers: {
				onPointerDown: v,
				onPointerMove: C,
				onPointerUp: y,
				onPointerCancel: b,
			},
			dragStyle: g,
		};
	}
	var _C = (0, or.createContext)(null);
	function $r() {
		let e = (0, or.useContext)(_C);
		if (!e)
			throw Error(
				'ConsentDialogTrigger components must be used within a ConsentDialogTrigger.Root'
			);
		return e;
	}
	function oi({
		children: e,
		defaultPosition: t = 'bottom-right',
		persistPosition: n = !0,
		showWhen: o = 'after-consent',
		onPositionChange: r,
		onClick: a,
	}) {
		let { branding: i, activeUI: s, setActiveUI: l, hasConsented: u } = K(),
			{
				corner: d,
				isDragging: f,
				isSnapping: c,
				wasDragged: p,
				handlers: v,
				dragStyle: C,
			} = gp({ defaultPosition: t, persistPosition: n, onPositionChange: r }),
			[y, b] = (0, or.useState)(!1);
		(0, or.useEffect)(() => (b(!0), () => b(!1)), []);
		let g = o !== 'never' && (o !== 'after-consent' || u()) && s === 'none';
		return y && g
			? (0, LC.createPortal)(
					(0, NC.jsx)(_C.Provider, {
						value: {
							corner: d,
							isDragging: f,
							isSnapping: c,
							wasDragged: p,
							handlers: v,
							dragStyle: C,
							branding: i,
							openDialog: () => {
								a?.(), l('dialog');
							},
							isVisible: g,
						},
						children: e,
					}),
					document.body
				)
			: null;
	}
	oi.displayName = 'ConsentDialogTrigger.Root';
	var CE = {
			'bottom-right': It.bottomRight,
			'bottom-left': It.bottomLeft,
			'top-right': It.topRight,
			'top-left': It.topLeft,
		},
		SE = { sm: It.sm, md: It.md, lg: It.lg },
		ri = (0, BC.forwardRef)(
			(
				{
					children: e,
					size: t = 'md',
					ariaLabel: n = 'Open privacy settings',
					className: o,
					noStyle: r = !1,
				},
				a
			) => {
				let {
						corner: i,
						isDragging: s,
						isSnapping: l,
						wasDragged: u,
						handlers: d,
						dragStyle: f,
						openDialog: c,
					} = $r(),
					p = () => {
						u() || c();
					};
				return (0, OC.jsx)('button', {
					ref: a,
					type: 'button',
					className: r
						? o
						: [It.trigger, CE[i], SE[t], s && It.dragging, l && It.snapping, o]
								.filter(Boolean)
								.join(' '),
					'aria-label': n,
					onClick: p,
					onKeyDown: (v) => {
						(v.key === 'Enter' || v.key === ' ') && (v.preventDefault(), p());
					},
					style: f,
					...d,
					children: e,
				});
			}
		);
	ri.displayName = 'ConsentDialogTrigger.Button';
	var ea = w(H(), 1);
	var DC = w(j(), 1);
	function ai({ icon: e = 'branding', className: t, noStyle: n = !1 }) {
		let o,
			{ branding: r } = $r(),
			a = n ? t : [It.icon, t].filter(Boolean).join(' ');
		if ((0, DC.isValidElement)(e))
			return (0, ea.jsx)('span', { className: a, children: e });
		switch (e) {
			case 'fingerprint':
				o = (0, ea.jsx)(bC, {});
				break;
			case 'settings':
				o = (0, ea.jsx)(hC, {});
				break;
			default:
				o = r === 'consent' ? (0, ea.jsx)(Ru, {}) : (0, ea.jsx)(pC, {});
		}
		return (0, ea.jsx)('span', { className: a, children: o });
	}
	ai.displayName = 'ConsentDialogTrigger.Icon';
	var MC = w(H(), 1);
	function Zs({ children: e, className: t, noStyle: n = !1 }) {
		return (0, MC.jsx)('span', {
			className: n ? t : [It.text, t].filter(Boolean).join(' '),
			children: e,
		});
	}
	Zs.displayName = 'ConsentDialogTrigger.Text';
	function jC({
		icon: e = 'branding',
		defaultPosition: t = 'bottom-right',
		persistPosition: n = !0,
		ariaLabel: o = 'Open privacy settings',
		showWhen: r = 'always',
		size: a = 'md',
		className: i,
		noStyle: s = !1,
		onClick: l,
		onPositionChange: u,
	}) {
		return (0, ju.jsx)(oi, {
			defaultPosition: t,
			persistPosition: n,
			showWhen: r,
			onClick: l,
			onPositionChange: u,
			children: (0, ju.jsx)(ri, {
				size: a,
				ariaLabel: o,
				className: i,
				noStyle: s,
				children: (0, ju.jsx)(ai, { icon: e, noStyle: s }),
			}),
		});
	}
	jC.displayName = 'ConsentDialogTrigger';
	var rr = Object.assign(jC, { Root: oi, Button: ri, Icon: ai, Text: Zs });
	var zC = ({
		open: e,
		noStyle: t,
		disableAnimation: n,
		scrollLock: o = !0,
		trapFocus: r = !0,
		hideBranding: a,
		legalLinks: i,
		showTrigger: s = !1,
		models: l,
		uiSource: u,
	}) => {
		let d = er({
				noStyle: t,
				disableAnimation: n,
				scrollLock: o,
				trapFocus: r,
			}),
			{ activeUI: f } = K(),
			c = { open: e ?? f === 'dialog', ...d, models: l, uiSource: u },
			p = s === !0 ? {} : s === !1 ? null : s;
		return (0, ar.jsxs)(ar.Fragment, {
			children: [
				p && (0, ar.jsx)(rr, { ...p }),
				(0, ar.jsx)(Du, {
					...c,
					children: (0, ar.jsx)(_u, {
						noStyle: c.noStyle,
						legalLinks: i,
						hideBranding: a,
					}),
				}),
			],
		});
	};
	var bp = Object.assign(zC, {
		Card: yC,
		Header: CC,
		HeaderTitle: SC,
		HeaderDescription: xC,
		Content: TC,
		Footer: kC,
		ConsentCustomizationCard: _u,
		ConsentDialogFooter: ti,
		ConsentDialogHeader: Eu,
		ConsentDialogHeaderTitle: Iu,
		ConsentDialogHeaderDescription: Nu,
		ConsentDialogContent: Lu,
		Overlay: Bu,
		Root: Du,
	});
	var hp = w(H(), 1);
	var xE = {
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/components/iab-consent-banner.module.css'(
				e,
				t,
				n
			) {
				n.d(t, { A: () => s });
				var o = n(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'
					),
					r = n.n(o),
					a = n(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'
					),
					i = n.n(a)()(r());
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
				let s = i;
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'(
				e
			) {
				e.exports = function (t) {
					var n = [];
					return (
						(n.toString = function () {
							return this.map(function (o) {
								var r = '',
									a = o[5] !== void 0;
								return (
									o[4] && (r += '@supports ('.concat(o[4], ') {')),
									o[2] && (r += '@media '.concat(o[2], ' {')),
									a &&
										(r += '@layer'.concat(
											o[5].length > 0 ? ' '.concat(o[5]) : '',
											' {'
										)),
									(r += t(o)),
									a && (r += '}'),
									o[2] && (r += '}'),
									o[4] && (r += '}'),
									r
								);
							}).join('');
						}),
						(n.i = function (o, r, a, i, s) {
							typeof o == 'string' && (o = [[null, o, void 0]]);
							var l = {};
							if (a)
								for (var u = 0; u < this.length; u++) {
									var d = this[u][0];
									d != null && (l[d] = !0);
								}
							for (var f = 0; f < o.length; f++) {
								var c = [].concat(o[f]);
								(a && l[c[0]]) ||
									(s !== void 0 &&
										(c[5] === void 0 ||
											(c[1] = '@layer'
												.concat(c[5].length > 0 ? ' '.concat(c[5]) : '', ' {')
												.concat(c[1], '}')),
										(c[5] = s)),
									r &&
										(c[2] &&
											(c[1] = '@media '.concat(c[2], ' {').concat(c[1], '}')),
										(c[2] = r)),
									i &&
										(c[4]
											? ((c[1] = '@supports ('
													.concat(c[4], ') {')
													.concat(c[1], '}')),
												(c[4] = i))
											: (c[4] = ''.concat(i))),
									n.push(c));
							}
						}),
						n
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
				function n(r) {
					for (var a = -1, i = 0; i < t.length; i++)
						if (t[i].identifier === r) {
							a = i;
							break;
						}
					return a;
				}
				function o(r, a) {
					for (var i = {}, s = [], l = 0; l < r.length; l++) {
						var u = r[l],
							d = a.base ? u[0] + a.base : u[0],
							f = i[d] || 0,
							c = ''.concat(d, ' ').concat(f);
						i[d] = f + 1;
						var p = n(c),
							v = {
								css: u[1],
								media: u[2],
								sourceMap: u[3],
								supports: u[4],
								layer: u[5],
							};
						if (p !== -1) t[p].references++, t[p].updater(v);
						else {
							var C = (function (y, b) {
								var g = b.domAPI(b);
								return (
									g.update(y),
									function (m) {
										m
											? (m.css !== y.css ||
													m.media !== y.media ||
													m.sourceMap !== y.sourceMap ||
													m.supports !== y.supports ||
													m.layer !== y.layer) &&
												g.update((y = m))
											: g.remove();
									}
								);
							})(v, a);
							(a.byIndex = l),
								t.splice(l, 0, { identifier: c, updater: C, references: 1 });
						}
						s.push(c);
					}
					return s;
				}
				e.exports = function (r, a) {
					var i = o((r = r || []), (a = a || {}));
					return function (s) {
						s = s || [];
						for (var l = 0; l < i.length; l++) {
							var u = n(i[l]);
							t[u].references--;
						}
						for (var d = o(s, a), f = 0; f < i.length; f++) {
							var c = n(i[f]);
							t[c].references === 0 && (t[c].updater(), t.splice(c, 1));
						}
						i = d;
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'(
				e
			) {
				var t = {};
				e.exports = function (n, o) {
					var r = (function (a) {
						if (t[a] === void 0) {
							var i = document.querySelector(a);
							if (
								window.HTMLIFrameElement &&
								i instanceof window.HTMLIFrameElement
							)
								try {
									i = i.contentDocument.head;
								} catch {
									i = null;
								}
							t[a] = i;
						}
						return t[a];
					})(n);
					if (!r)
						throw Error(
							"Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid."
						);
					r.appendChild(o);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'(
				e
			) {
				e.exports = function (t) {
					var n = document.createElement('style');
					return t.setAttributes(n, t.attributes), t.insert(n, t.options), n;
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'(
				e,
				t,
				n
			) {
				e.exports = function (o) {
					var r = n.nc;
					r && o.setAttribute('nonce', r);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'(
				e
			) {
				e.exports = function (t) {
					if (typeof document > 'u')
						return { update: function () {}, remove: function () {} };
					var n = t.insertStyleElement(t);
					return {
						update: function (o) {
							var r, a, i;
							(r = ''),
								o.supports && (r += '@supports ('.concat(o.supports, ') {')),
								o.media && (r += '@media '.concat(o.media, ' {')),
								(a = o.layer !== void 0) &&
									(r += '@layer'.concat(
										o.layer.length > 0 ? ' '.concat(o.layer) : '',
										' {'
									)),
								(r += o.css),
								a && (r += '}'),
								o.media && (r += '}'),
								o.supports && (r += '}'),
								(i = o.sourceMap) &&
									typeof btoa < 'u' &&
									(r += `
/*# sourceMappingURL=data:application/json;base64,`.concat(
										btoa(unescape(encodeURIComponent(JSON.stringify(i)))),
										' */'
									)),
								t.styleTagTransform(r, n, t.options);
						},
						remove: function () {
							var o;
							(o = n).parentNode === null || o.parentNode.removeChild(o);
						},
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'(
				e
			) {
				e.exports = function (t, n) {
					if (n.styleSheet) n.styleSheet.cssText = t;
					else {
						for (; n.firstChild; ) n.removeChild(n.firstChild);
						n.appendChild(document.createTextNode(t));
					}
				};
			},
		},
		VC = {};
	function Ge(e) {
		var t = VC[e];
		if (t !== void 0) return t.exports;
		var n = (VC[e] = { id: e, exports: {} });
		return xE[e](n, n.exports, Ge), n.exports;
	}
	(Ge.n = (e) => {
		var t = e && e.__esModule ? () => e.default : () => e;
		return Ge.d(t, { a: t }), t;
	}),
		(Ge.d = (e, t) => {
			for (var n in t)
				Ge.o(t, n) &&
					!Ge.o(e, n) &&
					Object.defineProperty(e, n, { enumerable: !0, get: t[n] });
		}),
		(Ge.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t)),
		(Ge.nc = void 0);
	var TE = Ge(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'
		),
		kE = Ge.n(TE),
		wE = Ge(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'
		),
		AE = Ge.n(wE),
		RE = Ge(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'
		),
		EE = Ge.n(RE),
		IE = Ge(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'
		),
		NE = Ge.n(IE),
		LE = Ge(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'
		),
		_E = Ge.n(LE),
		OE = Ge(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'
		),
		BE = Ge.n(OE),
		zu = Ge(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/components/iab-consent-banner.module.css'
		),
		ii = {};
	(ii.styleTagTransform = BE()),
		(ii.setAttributes = NE()),
		(ii.insert = EE().bind(null, 'head')),
		(ii.domAPI = AE()),
		(ii.insertStyleElement = _E()),
		kE()(zu.A, ii);
	var W = zu.A && zu.A.locals ? zu.A.locals : void 0;
	var vp = w(j(), 1),
		yp = (0, vp.forwardRef)(({ children: e, className: t, ...n }, o) =>
			(0, hp.jsx)('div', {
				ref: o,
				className: t ? `${W.footerButtonGroup} ${t}` : W.footerButtonGroup,
				...n,
				children: e,
			})
		);
	yp.displayName = 'IABConsentBannerButtonGroup';
	var Cp = (0, vp.forwardRef)(({ className: e, ...t }, n) =>
		(0, hp.jsx)('div', {
			ref: n,
			className: e ? `${W.footerSpacer} ${e}` : W.footerSpacer,
			...t,
		})
	);
	Cp.displayName = 'IABConsentBannerFooterSpacer';
	var UC = w(H(), 1);
	var HC = w(j(), 1);
	var Sp = (0, HC.forwardRef)(({ children: e, className: t, ...n }, o) => {
		let { trapFocus: r } = le();
		return (
			pn(!!r, o),
			(0, UC.jsx)('div', {
				ref: o,
				...oe('iabConsentBannerCard', { baseClassName: W.card, className: t }),
				tabIndex: 0,
				role: 'dialog',
				'aria-modal': r ? 'true' : void 0,
				'data-testid': 'iab-consent-banner-card',
				...n,
				children: e,
			})
		);
	});
	Sp.displayName = 'IABConsentBannerCard';
	var PC = w(H(), 1);
	var GC = w(j(), 1),
		xp = (0, GC.forwardRef)(({ children: e, className: t, ...n }, o) =>
			(0, PC.jsx)('p', {
				ref: o,
				className: t ? `${W.description} ${t}` : W.description,
				...n,
				children: e,
			})
		);
	xp.displayName = 'IABConsentBannerDescription';
	var FC = w(H(), 1);
	var qC = w(j(), 1);
	var Tp = (0, qC.forwardRef)(({ children: e, className: t, ...n }, o) =>
		(0, FC.jsx)('div', {
			ref: o,
			...oe('iabConsentBannerFooter', {
				baseClassName: W.footer,
				className: t,
			}),
			'data-testid': 'iab-consent-banner-footer',
			...n,
			children: e,
		})
	);
	Tp.displayName = 'IABConsentBannerFooter';
	var YC = w(H(), 1);
	var XC = w(j(), 1);
	var kp = (0, XC.forwardRef)(({ children: e, className: t, ...n }, o) =>
		(0, YC.jsx)('div', {
			ref: o,
			...oe('iabConsentBannerHeader', {
				baseClassName: W.header,
				className: t,
			}),
			'data-testid': 'iab-consent-banner-header',
			...n,
			children: e,
		})
	);
	kp.displayName = 'IABConsentBannerHeader';
	var KC = w(H(), 1);
	var si = w(j(), 1);
	var Js = (0, si.forwardRef)(
		({ className: e, style: t, noStyle: n, ...o }, r) => {
			let a,
				{ activeUI: i } = K(),
				{ disableAnimation: s, noStyle: l, scrollLock: u } = le(),
				[d, f] = (0, si.useState)(!1),
				c = i === 'banner';
			(0, si.useEffect)(() => {
				if (c) f(!0);
				else if (s) f(!1);
				else {
					let C = setTimeout(
						() => {
							f(!1);
						},
						Number.parseInt(
							getComputedStyle(document.documentElement).getPropertyValue(
								'--iab-consent-banner-animation-duration'
							) || '200',
							10
						)
					);
					return () => clearTimeout(C);
				}
			}, [c, s]);
			let p = oe('iabConsentBannerOverlay', {
				baseClassName: !(l || n) && W.overlay,
				className: e,
				noStyle: l || n,
			});
			l || n || s || (a = d ? W.overlayVisible : W.overlayHidden);
			let v = wt(p.className, a);
			return (
				dn(!!(c && u)),
				c && u
					? (0, KC.jsx)('div', {
							ref: r,
							...o,
							className: v,
							style: { ...p.style, ...t },
							'data-testid': 'iab-consent-banner-overlay',
						})
					: null
			);
		}
	);
	Js.displayName = 'IABConsentBannerOverlay';
	var ro = w(H(), 1);
	var Un = w(j(), 1),
		QC = w(Co(), 1);
	var Vu = ({
			children: e,
			className: t,
			noStyle: n,
			disableAnimation: o,
			scrollLock: r,
			trapFocus: a = !0,
			models: i,
			uiSource: s,
			...l
		}) =>
			(0, ro.jsx)(Dt.Provider, {
				value: { uiSource: s ?? 'iab_banner' },
				children: (0, ro.jsx)(fn.Provider, {
					value: {
						disableAnimation: o,
						noStyle: n,
						scrollLock: r,
						trapFocus: a,
					},
					children: (0, ro.jsx)(ZC, {
						disableAnimation: o,
						className: t,
						noStyle: n,
						models: i,
						...l,
						children: e,
					}),
				}),
			}),
		ZC = (0, Un.forwardRef)(
			(
				{
					children: e,
					className: t,
					style: n,
					className: o,
					disableAnimation: r,
					noStyle: a,
					models: i = ['iab'],
					...s
				},
				l
			) => {
				let { activeUI: u, translationConfig: d, model: f } = K(),
					c = mn(d.defaultLanguage),
					[p, v] = (0, Un.useState)(!1),
					[C, y] = (0, Un.useState)(!1),
					[b, g] = (0, Un.useState)(200),
					m = u === 'banner' && i.includes(f);
				(0, Un.useEffect)(() => {
					g(
						Number.parseInt(
							getComputedStyle(document.documentElement).getPropertyValue(
								'--iab-consent-banner-animation-duration'
							) || '200',
							10
						)
					);
				}, []),
					(0, Un.useEffect)(() => {
						if (m)
							if (C) v(!0);
							else {
								let L = setTimeout(() => {
									v(!0), y(!0);
								}, 10);
								return () => clearTimeout(L);
							}
						else if ((y(!1), r)) v(!1);
						else {
							let L = setTimeout(() => {
								v(!1);
							}, b);
							return () => clearTimeout(L);
						}
					}, [m, r, C, b]);
				let h = oe('iabConsentBanner', {
						baseClassName: [W.root],
						style: n,
						className: t || o,
						noStyle: a,
					}),
					[k, A] = (0, Un.useState)(!1);
				if (
					((0, Un.useEffect)(() => {
						A(!0);
					}, []),
					!k)
				)
					return null;
				let x = a
					? h.className || ''
					: `${h.className || ''} ${p ? W.bannerVisible : W.bannerHidden}`;
				return m
					? (0, QC.createPortal)(
							(0, ro.jsxs)(ro.Fragment, {
								children: [
									(0, ro.jsx)(Js, {}),
									(0, ro.jsx)('div', {
										ref: l,
										...s,
										...h,
										className: x,
										'data-testid': 'iab-consent-banner-root',
										dir: c,
										children: e,
									}),
								],
							}),
							document.body
						)
					: null;
			}
		);
	ZC.displayName = 'IABConsentBannerRootChildren';
	var JC = w(H(), 1);
	var WC = w(j(), 1),
		wp = (0, WC.forwardRef)(({ children: e, className: t, ...n }, o) =>
			(0, JC.jsx)('h2', {
				ref: o,
				className: t ? `${W.title} ${t}` : W.title,
				...n,
				children: e,
			})
		);
	wp.displayName = 'IABConsentBannerTitle';
	var st = w(H(), 1);
	var Ws = w(j(), 1);
	var Uu = cn.translations.en.iab;
	function Hu(e, t) {
		if (!t) return e;
		let n = { ...e };
		for (let o of Object.keys(e)) {
			let r = e[o],
				a = t[o];
			a === void 0 ||
			typeof r != 'object' ||
			r === null ||
			typeof a != 'object' ||
			a === null ||
			Array.isArray(r)
				? a !== void 0 && (n[o] = a)
				: (n[o] = Hu(r, a));
		}
		return n;
	}
	function pt() {
		let e = Ne();
		return e.iab
			? {
					banner: Hu(Uu.banner, e.iab.banner),
					common: Hu(Uu.common, e.iab.common),
					preferenceCenter: Hu(Uu.preferenceCenter, e.iab.preferenceCenter),
				}
			: Uu;
	}
	var $C = ({
		noStyle: e,
		disableAnimation: t,
		scrollLock: n = !0,
		trapFocus: o = !0,
		primaryButton: r = 'customize',
		models: a,
		uiSource: i,
	}) => {
		let s = pt(),
			{ iab: l, setActiveUI: u } = K(),
			d = (0, Ws.useRef)(null),
			f = er({ noStyle: e, disableAnimation: t, scrollLock: n, trapFocus: o }),
			c = (0, Ws.useMemo)(
				() =>
					l?.gvl
						? Object.keys(l.gvl.vendors).length + (l.nonIABVendors?.length ?? 0)
						: 0,
				[l?.gvl, l?.nonIABVendors]
			),
			p = (0, Ws.useMemo)(() => {
				if (!l?.gvl) return { displayed: [], remainingCount: 0, isReady: !1 };
				let b = l.gvl,
					g = Object.entries(b.purposes)
						.filter(([P]) =>
							Object.values(b.vendors).some(
								(ge) =>
									ge.purposes?.includes(Number(P)) ||
									ge.legIntPurposes?.includes(Number(P))
							)
						)
						.map(([P, ge]) => ({ id: Number(P), name: ge.name })),
					m = g.find((P) => P.id === 1),
					h = g.filter((P) => P.id !== 1),
					k = new Set(h.map((P) => P.id)),
					A = b.stacks || {},
					x = [];
				for (let [P, ge] of Object.entries(A)) {
					let at = ge.purposes.filter((Ct) => k.has(Ct));
					at.length >= 2 &&
						x.push({
							stackId: Number(P),
							name: ge.name,
							coveredPurposeIds: at,
							score: at.length,
						});
				}
				x.sort((P, ge) => ge.score - P.score);
				let L = [],
					_ = new Set();
				for (let { name: P, coveredPurposeIds: ge } of x) {
					let at = ge.filter((Ct) => !_.has(Ct));
					if (at.length >= 2) for (let Ct of (L.push(P), at)) _.add(Ct);
				}
				let N = h.filter((P) => !_.has(P.id)),
					B = Object.entries(b.specialFeatures || {})
						.filter(([P]) =>
							Object.values(b.vendors).some((ge) =>
								ge.specialFeatures?.includes(Number(P))
							)
						)
						.map(([, P]) => P.name),
					Z = [];
				for (let P of (m && Z.push(m.name), L)) Z.push(P);
				for (let P of N) Z.push(P.name);
				for (let P of B) Z.push(P);
				return {
					displayed: Z.slice(0, 5),
					remainingCount: Math.max(0, Z.length - 5),
					isReady: !0,
				};
			}, [l?.gvl]);
		if ((pn(!!f.trapFocus, d), !l?.config.enabled || !p.isReady)) return null;
		let v = s.banner.description.replace('{partnerCount}', String(c)),
			C = s.banner.partnersLink.replace('{count}', String(c)),
			y = s.banner.scopeServiceSpecific;
		return (0, st.jsx)(Vu, {
			...f,
			models: a,
			uiSource: i,
			children: (0, st.jsxs)(de, {
				ref: d,
				baseClassName: W.card,
				themeKey: 'iabConsentBannerCard',
				tabIndex: 0,
				role: 'dialog',
				'aria-modal': f.trapFocus ? 'true' : void 0,
				'aria-label': s.banner.title,
				'data-testid': 'iab-consent-banner-card',
				children: [
					(0, st.jsxs)(de, {
						baseClassName: W.header,
						themeKey: 'iabConsentBannerHeader',
						'data-testid': 'iab-consent-banner-header',
						children: [
							(0, st.jsx)('h2', {
								className: W.title,
								children: s.banner.title,
							}),
							(0, st.jsxs)('p', {
								className: W.description,
								children: [
									v.split(C)[0],
									(0, st.jsx)('button', {
										type: 'button',
										className: W.partnersLink,
										onClick: () => {
											l?.setPreferenceCenterTab('vendors'), u('dialog');
										},
										onMouseEnter: () => {},
										children: C,
									}),
									v.split(C)[1],
								],
							}),
							(0, st.jsxs)('ul', {
								className: W.purposeList,
								children: [
									p.displayed.map((b, g) =>
										(0, st.jsx)('li', { children: b }, g)
									),
									p.remainingCount > 0 &&
										(0, st.jsx)('li', {
											className: W.purposeMore,
											children: s.banner.andMore.replace(
												'{count}',
												String(p.remainingCount)
											),
										}),
								],
							}),
							(0, st.jsxs)('p', {
								className: W.legitimateInterestNotice,
								children: [s.banner.legitimateInterestNotice, ' ', y],
							}),
						],
					}),
					(0, st.jsxs)(de, {
						baseClassName: W.footer,
						themeKey: 'iabConsentBannerFooter',
						'data-testid': 'iab-consent-banner-footer',
						children: [
							(0, st.jsxs)('div', {
								className: W.footerButtonGroup,
								children: [
									(0, st.jsx)(Xt, {
										variant: r === 'reject' ? 'primary' : 'neutral',
										mode: 'stroke',
										size: 'small',
										onClick: () => {
											l?.rejectAll(), l?.save(), u('none');
										},
										className: W.rejectButton,
										'data-testid': 'iab-consent-banner-reject-button',
										children: s.common.rejectAll,
									}),
									(0, st.jsx)(Xt, {
										variant: r === 'accept' ? 'primary' : 'neutral',
										mode: r === 'accept' ? 'filled' : 'stroke',
										size: 'small',
										onClick: () => {
											l?.acceptAll(), l?.save(), u('none');
										},
										className: W.acceptButton,
										'data-testid': 'iab-consent-banner-accept-button',
										children: s.common.acceptAll,
									}),
								],
							}),
							(0, st.jsx)('div', { className: W.footerSpacer }),
							(0, st.jsx)(Xt, {
								variant: r === 'customize' ? 'primary' : 'neutral',
								mode: r === 'customize' ? 'filled' : 'stroke',
								size: 'small',
								onClick: () => {
									l?.setPreferenceCenterTab('purposes'), u('dialog');
								},
								className: W.customizeButton,
								'data-testid': 'iab-consent-banner-customize-button',
								children: s.common.customize,
							}),
						],
					}),
				],
			}),
		});
	};
	var Ap = Object.assign($C, {
		Root: Vu,
		Card: Sp,
		Header: kp,
		Title: wp,
		Description: xp,
		Footer: Tp,
		ButtonGroup: yp,
		FooterSpacer: Cp,
		Overlay: Js,
	});
	var t5 = w(H(), 1);
	var DE = {
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/components/iab-consent-dialog.module.css'(
				e,
				t,
				n
			) {
				n.d(t, { A: () => s });
				var o = n(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'
					),
					r = n.n(o),
					a = n(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'
					),
					i = n.n(a)()(r());
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
				let s = i;
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'(
				e
			) {
				e.exports = function (t) {
					var n = [];
					return (
						(n.toString = function () {
							return this.map(function (o) {
								var r = '',
									a = o[5] !== void 0;
								return (
									o[4] && (r += '@supports ('.concat(o[4], ') {')),
									o[2] && (r += '@media '.concat(o[2], ' {')),
									a &&
										(r += '@layer'.concat(
											o[5].length > 0 ? ' '.concat(o[5]) : '',
											' {'
										)),
									(r += t(o)),
									a && (r += '}'),
									o[2] && (r += '}'),
									o[4] && (r += '}'),
									r
								);
							}).join('');
						}),
						(n.i = function (o, r, a, i, s) {
							typeof o == 'string' && (o = [[null, o, void 0]]);
							var l = {};
							if (a)
								for (var u = 0; u < this.length; u++) {
									var d = this[u][0];
									d != null && (l[d] = !0);
								}
							for (var f = 0; f < o.length; f++) {
								var c = [].concat(o[f]);
								(a && l[c[0]]) ||
									(s !== void 0 &&
										(c[5] === void 0 ||
											(c[1] = '@layer'
												.concat(c[5].length > 0 ? ' '.concat(c[5]) : '', ' {')
												.concat(c[1], '}')),
										(c[5] = s)),
									r &&
										(c[2] &&
											(c[1] = '@media '.concat(c[2], ' {').concat(c[1], '}')),
										(c[2] = r)),
									i &&
										(c[4]
											? ((c[1] = '@supports ('
													.concat(c[4], ') {')
													.concat(c[1], '}')),
												(c[4] = i))
											: (c[4] = ''.concat(i))),
									n.push(c));
							}
						}),
						n
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
				function n(r) {
					for (var a = -1, i = 0; i < t.length; i++)
						if (t[i].identifier === r) {
							a = i;
							break;
						}
					return a;
				}
				function o(r, a) {
					for (var i = {}, s = [], l = 0; l < r.length; l++) {
						var u = r[l],
							d = a.base ? u[0] + a.base : u[0],
							f = i[d] || 0,
							c = ''.concat(d, ' ').concat(f);
						i[d] = f + 1;
						var p = n(c),
							v = {
								css: u[1],
								media: u[2],
								sourceMap: u[3],
								supports: u[4],
								layer: u[5],
							};
						if (p !== -1) t[p].references++, t[p].updater(v);
						else {
							var C = (function (y, b) {
								var g = b.domAPI(b);
								return (
									g.update(y),
									function (m) {
										m
											? (m.css !== y.css ||
													m.media !== y.media ||
													m.sourceMap !== y.sourceMap ||
													m.supports !== y.supports ||
													m.layer !== y.layer) &&
												g.update((y = m))
											: g.remove();
									}
								);
							})(v, a);
							(a.byIndex = l),
								t.splice(l, 0, { identifier: c, updater: C, references: 1 });
						}
						s.push(c);
					}
					return s;
				}
				e.exports = function (r, a) {
					var i = o((r = r || []), (a = a || {}));
					return function (s) {
						s = s || [];
						for (var l = 0; l < i.length; l++) {
							var u = n(i[l]);
							t[u].references--;
						}
						for (var d = o(s, a), f = 0; f < i.length; f++) {
							var c = n(i[f]);
							t[c].references === 0 && (t[c].updater(), t.splice(c, 1));
						}
						i = d;
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'(
				e
			) {
				var t = {};
				e.exports = function (n, o) {
					var r = (function (a) {
						if (t[a] === void 0) {
							var i = document.querySelector(a);
							if (
								window.HTMLIFrameElement &&
								i instanceof window.HTMLIFrameElement
							)
								try {
									i = i.contentDocument.head;
								} catch {
									i = null;
								}
							t[a] = i;
						}
						return t[a];
					})(n);
					if (!r)
						throw Error(
							"Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid."
						);
					r.appendChild(o);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'(
				e
			) {
				e.exports = function (t) {
					var n = document.createElement('style');
					return t.setAttributes(n, t.attributes), t.insert(n, t.options), n;
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'(
				e,
				t,
				n
			) {
				e.exports = function (o) {
					var r = n.nc;
					r && o.setAttribute('nonce', r);
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'(
				e
			) {
				e.exports = function (t) {
					if (typeof document > 'u')
						return { update: function () {}, remove: function () {} };
					var n = t.insertStyleElement(t);
					return {
						update: function (o) {
							var r, a, i;
							(r = ''),
								o.supports && (r += '@supports ('.concat(o.supports, ') {')),
								o.media && (r += '@media '.concat(o.media, ' {')),
								(a = o.layer !== void 0) &&
									(r += '@layer'.concat(
										o.layer.length > 0 ? ' '.concat(o.layer) : '',
										' {'
									)),
								(r += o.css),
								a && (r += '}'),
								o.media && (r += '}'),
								o.supports && (r += '}'),
								(i = o.sourceMap) &&
									typeof btoa < 'u' &&
									(r += `
/*# sourceMappingURL=data:application/json;base64,`.concat(
										btoa(unescape(encodeURIComponent(JSON.stringify(i)))),
										' */'
									)),
								t.styleTagTransform(r, n, t.options);
						},
						remove: function () {
							var o;
							(o = n).parentNode === null || o.parentNode.removeChild(o);
						},
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'(
				e
			) {
				e.exports = function (t, n) {
					if (n.styleSheet) n.styleSheet.cssText = t;
					else {
						for (; n.firstChild; ) n.removeChild(n.firstChild);
						n.appendChild(document.createTextNode(t));
					}
				};
			},
		},
		e5 = {};
	function Fe(e) {
		var t = e5[e];
		if (t !== void 0) return t.exports;
		var n = (e5[e] = { id: e, exports: {} });
		return DE[e](n, n.exports, Fe), n.exports;
	}
	(Fe.n = (e) => {
		var t = e && e.__esModule ? () => e.default : () => e;
		return Fe.d(t, { a: t }), t;
	}),
		(Fe.d = (e, t) => {
			for (var n in t)
				Fe.o(t, n) &&
					!Fe.o(e, n) &&
					Object.defineProperty(e, n, { enumerable: !0, get: t[n] });
		}),
		(Fe.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t)),
		(Fe.nc = void 0);
	var ME = Fe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'
		),
		jE = Fe.n(ME),
		zE = Fe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'
		),
		VE = Fe.n(zE),
		UE = Fe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'
		),
		HE = Fe.n(UE),
		PE = Fe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'
		),
		GE = Fe.n(PE),
		FE = Fe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'
		),
		qE = Fe.n(FE),
		YE = Fe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'
		),
		XE = Fe.n(YE),
		Pu = Fe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/components/iab-consent-dialog.module.css'
		),
		li = {};
	(li.styleTagTransform = XE()),
		(li.setAttributes = GE()),
		(li.insert = HE().bind(null, 'head')),
		(li.domAPI = VE()),
		(li.insertStyleElement = qE()),
		jE()(Pu.A, li);
	var S = Pu.A && Pu.A.locals ? Pu.A.locals : void 0;
	var ci = w(j(), 1);
	var Rp = (0, ci.forwardRef)(({ children: e, className: t, ...n }, o) => {
		let { trapFocus: r } = le(),
			{ activeUI: a } = K(),
			i = pt(),
			[s, l] = (0, ci.useState)(!1),
			u = a === 'dialog';
		return (
			pn(!!(u && r), o),
			(0, ci.useEffect)(() => {
				if (u) l(!0);
				else {
					let d = setTimeout(() => {
						l(!1);
					}, 150);
					return () => clearTimeout(d);
				}
			}, [u]),
			(0, t5.jsx)('div', {
				ref: o,
				...oe('iabConsentDialogCard', {
					baseClassName: wt(S.card, s ? S.contentVisible : S.contentHidden),
					className: t,
				}),
				role: 'dialog',
				'aria-modal': r ? 'true' : void 0,
				'aria-label': i.preferenceCenter.title,
				tabIndex: 0,
				'data-testid': 'iab-consent-dialog-card',
				...n,
				children: e,
			})
		);
	});
	Rp.displayName = 'IABConsentDialogCard';
	var n5 = w(H(), 1);
	var o5 = w(j(), 1),
		Ep = (0, o5.forwardRef)(({ children: e, className: t, ...n }, o) =>
			(0, n5.jsx)('div', {
				ref: o,
				className: t ? `${S.content} ${t}` : S.content,
				...n,
				children: e,
			})
		);
	Ep.displayName = 'IABConsentDialogContent';
	var Hn = w(H(), 1);
	var r5 = w(j(), 1);
	var Ip = w(j(), 1);
	function Gu() {
		let { iab: e } = K(),
			{
				purposes: t,
				specialPurposes: n,
				specialFeatures: o,
				features: r,
				stacks: a,
				standalonePurposes: i,
			} = (0, Ip.useMemo)(() => {
				if (!e?.gvl)
					return {
						purposes: [],
						specialPurposes: [],
						specialFeatures: [],
						features: [],
						stacks: [],
						standalonePurposes: [],
					};
				let s = e.gvl,
					l = e.nonIABVendors || [],
					u = (A, x, L) => ({
						id: Number(A),
						name: x.name,
						policyUrl: x.policyUrl ?? '',
						usesNonCookieAccess: x.usesNonCookieAccess,
						deviceStorageDisclosureUrl: x.deviceStorageDisclosureUrl ?? null,
						usesCookies: x.usesCookies,
						cookieMaxAgeSeconds: x.cookieMaxAgeSeconds,
						specialPurposes: x.specialPurposes || [],
						specialFeatures: x.specialFeatures || [],
						features: x.features || [],
						purposes: x.purposes || [],
						legIntPurposes: x.legIntPurposes || [],
						usesLegitimateInterest:
							!!L && (x.legIntPurposes?.includes(L) ?? !1),
						isCustom: !1,
					}),
					d = Object.entries(s.purposes)
						.map(([A, x]) => {
							let L = Object.entries(s.vendors)
									.filter(
										([, N]) =>
											N.purposes?.includes(Number(A)) ||
											N.legIntPurposes?.includes(Number(A))
									)
									.map(([N, B]) => u(N, B, Number(A))),
								_ = l
									.filter(
										(N) =>
											N.purposes?.includes(Number(A)) ||
											N.legIntPurposes?.includes(Number(A))
									)
									.map((N) => {
										let B;
										return (
											(B = Number(A)),
											{
												id: N.id,
												name: N.name,
												policyUrl: N.privacyPolicyUrl,
												usesNonCookieAccess: N.usesNonCookieAccess ?? !1,
												deviceStorageDisclosureUrl: null,
												usesCookies: N.usesCookies ?? !1,
												cookieMaxAgeSeconds: N.cookieMaxAgeSeconds ?? null,
												specialPurposes: [],
												specialFeatures: N.specialFeatures || [],
												features: N.features || [],
												purposes: N.purposes || [],
												legIntPurposes: N.legIntPurposes || [],
												usesLegitimateInterest:
													!!B && (N.legIntPurposes?.includes(B) ?? !1),
												isCustom: !0,
											}
										);
									});
							return {
								id: Number(A),
								name: x.name,
								description: x.description,
								descriptionLegal: x.descriptionLegal,
								illustrations: x.illustrations || [],
								vendors: [...L, ..._],
							};
						})
						.filter((A) => A.vendors.length > 0),
					f = Object.entries(s.specialPurposes || {})
						.map(([A, x]) => {
							let L = Object.entries(s.vendors)
								.filter(([, _]) => _.specialPurposes?.includes(Number(A)))
								.map(([_, N]) => u(_, N));
							return {
								id: Number(A),
								name: x.name,
								description: x.description,
								descriptionLegal: x.descriptionLegal,
								illustrations: x.illustrations || [],
								vendors: L,
								isSpecialPurpose: !0,
							};
						})
						.filter((A) => A.vendors.length > 0),
					c = Object.entries(s.specialFeatures || {})
						.map(([A, x]) => {
							let L = Object.entries(s.vendors)
								.filter(([, _]) => _.specialFeatures?.includes(Number(A)))
								.map(([_, N]) => u(_, N));
							return {
								id: Number(A),
								name: x.name,
								description: x.description,
								descriptionLegal: x.descriptionLegal,
								illustrations: x.illustrations || [],
								vendors: L,
							};
						})
						.filter((A) => A.vendors.length > 0),
					p = Object.entries(s.features || {})
						.map(([A, x]) => {
							let L = Object.entries(s.vendors)
								.filter(([, _]) => _.features?.includes(Number(A)))
								.map(([_, N]) => u(_, N));
							return {
								id: Number(A),
								name: x.name,
								description: x.description,
								descriptionLegal: x.descriptionLegal,
								illustrations: x.illustrations || [],
								vendors: L,
							};
						})
						.filter((A) => A.vendors.length > 0),
					v = d.find((A) => A.id === 1),
					C = d.filter((A) => A.id !== 1),
					y = new Set(C.map((A) => A.id)),
					b = s.stacks || {},
					g = [];
				for (let [A, x] of Object.entries(b)) {
					let L = Number(A),
						_ = x.purposes.filter((N) => y.has(N));
					_.length >= 2 &&
						g.push({
							stackId: L,
							stack: x,
							coveredPurposeIds: _,
							score: _.length,
						});
				}
				g.sort((A, x) => x.score - A.score);
				let m = [],
					h = new Set();
				for (let { stackId: A, stack: x, coveredPurposeIds: L } of g) {
					let _ = L.filter((N) => !h.has(N));
					if (_.length >= 2) {
						let N = C.filter((B) => _.includes(B.id));
						for (let B of (m.push({
							id: A,
							name: x.name,
							description: x.description,
							purposes: N,
						}),
						_))
							h.add(B);
					}
				}
				let k = C.filter((A) => !h.has(A.id));
				return {
					purposes: d,
					specialPurposes: f,
					specialFeatures: c,
					features: p,
					stacks: m,
					standalonePurposes: v ? [v, ...k] : k,
				};
			}, [e?.gvl, e?.nonIABVendors]);
		return {
			purposes: t,
			specialPurposes: n,
			specialFeatures: o,
			features: r,
			stacks: a,
			standalonePurposes: i,
			totalVendors: (0, Ip.useMemo)(
				() =>
					e?.gvl
						? Object.keys(e.gvl.vendors).length + (e.nonIABVendors?.length ?? 0)
						: 0,
				[e?.gvl, e?.nonIABVendors]
			),
			isLoading: !!(e?.isLoadingGVL || !e?.gvl),
		};
	}
	var Np = (0, r5.forwardRef)(({ children: e, className: t, ...n }, o) => {
		let { iab: r, setActiveUI: a } = K(),
			i = pt(),
			{ isLoading: s } = Gu();
		return (0, Hn.jsx)('div', {
			ref: o,
			...oe('iabConsentDialogFooter', {
				baseClassName: S.footer,
				className: t,
			}),
			...n,
			children:
				e ||
				(0, Hn.jsxs)(Hn.Fragment, {
					children: [
						(0, Hn.jsxs)('div', {
							className: S.footerButtons,
							children: [
								(0, Hn.jsx)(Xt, {
									variant: 'neutral',
									mode: 'stroke',
									size: 'small',
									onClick: () => {
										r?.rejectAll(), r?.save(), a('none');
									},
									disabled: s,
									children: i.common.rejectAll,
								}),
								(0, Hn.jsx)(Xt, {
									variant: 'neutral',
									mode: 'stroke',
									size: 'small',
									onClick: () => {
										r?.acceptAll(), r?.save(), a('none');
									},
									disabled: s,
									children: i.common.acceptAll,
								}),
							],
						}),
						(0, Hn.jsx)('div', { className: S.footerSpacer }),
						(0, Hn.jsx)(Xt, {
							variant: 'primary',
							mode: 'filled',
							size: 'small',
							onClick: () => {
								r?.save(), a('none');
							},
							disabled: s,
							children: i.common.saveSettings,
						}),
					],
				}),
		});
	});
	Np.displayName = 'IABConsentDialogFooter';
	var Zt = w(H(), 1);
	var a5 = w(j(), 1);
	var Lp = (0, a5.forwardRef)(
		(
			{
				children: e,
				headerTitle: t,
				description: n,
				showCloseButton: o = !0,
				className: r,
			},
			a
		) => {
			let { setActiveUI: i } = K(),
				s = pt();
			return (0, Zt.jsx)('div', {
				ref: a,
				...oe('iabConsentDialogHeader', {
					baseClassName: S.header,
					className: r,
				}),
				children:
					e ||
					(0, Zt.jsxs)(Zt.Fragment, {
						children: [
							(0, Zt.jsxs)('div', {
								className: S.headerContent,
								children: [
									(0, Zt.jsx)('h2', {
										className: S.title,
										children: t ?? s.preferenceCenter.title,
									}),
									(0, Zt.jsx)('p', {
										className: S.description,
										children: n ?? s.preferenceCenter.description,
									}),
								],
							}),
							o &&
								(0, Zt.jsx)('button', {
									type: 'button',
									onClick: () => {
										i('none');
									},
									className: S.closeButton,
									'aria-label': 'Close',
									children: (0, Zt.jsxs)('svg', {
										style: { width: '1rem', height: '1rem' },
										viewBox: '0 0 24 24',
										fill: 'none',
										stroke: 'currentColor',
										strokeWidth: '2',
										children: [
											(0, Zt.jsx)('line', {
												x1: '18',
												y1: '6',
												x2: '6',
												y2: '18',
											}),
											(0, Zt.jsx)('line', {
												x1: '6',
												y1: '6',
												x2: '18',
												y2: '18',
											}),
										],
									}),
								}),
						],
					}),
			});
		}
	);
	Lp.displayName = 'IABConsentDialogHeader';
	var i5 = w(H(), 1);
	var ui = w(j(), 1);
	var ta = (0, ui.forwardRef)(
		({ className: e, style: t, noStyle: n, isOpen: o, ...r }, a) => {
			let i,
				{ disableAnimation: s, noStyle: l, scrollLock: u } = le(),
				[d, f] = (0, ui.useState)(!1);
			(0, ui.useEffect)(() => {
				if (o) f(!0);
				else if (s) f(!1);
				else {
					let v = setTimeout(
						() => {
							f(!1);
						},
						Number.parseInt(
							getComputedStyle(document.documentElement).getPropertyValue(
								'--iab-cd-animation-duration'
							) || '150',
							10
						)
					);
					return () => clearTimeout(v);
				}
			}, [o, s]);
			let c = oe('iabConsentDialogOverlay', {
				baseClassName: !(l || n) && S.overlay,
				className: e,
				noStyle: l || n,
			});
			l || n || s || (i = d ? S.overlayVisible : S.overlayHidden);
			let p = wt(c.className, i);
			return (
				dn(!!(o && u)),
				o
					? (0, i5.jsx)('div', {
							ref: a,
							...r,
							className: p,
							style: { ...c.style, ...t },
							'data-testid': 'iab-consent-dialog-overlay',
						})
					: null
			);
		}
	);
	ta.displayName = 'IABConsentDialogOverlay';
	var M = w(H(), 1);
	var qu = w(j(), 1);
	var _p = w(H(), 1),
		ao = w(j(), 1),
		io = ({
			isOpen: e,
			children: t,
			duration: n = 250,
			easing: o = 'cubic-bezier(0.33, 1, 0.68, 1)',
			className: r,
		}) => {
			let a = (0, ao.useRef)(null),
				i = (0, ao.useRef)(null),
				s = (0, ao.useRef)(null),
				[l, u] = (0, ao.useState)(e),
				[d, f] = (0, ao.useState)(!1),
				[c, p] = (0, ao.useState)({
					height: e ? 'auto' : 0,
					overflow: e ? 'visible' : 'hidden',
					transition: 'none',
				});
			return (
				(0, ao.useLayoutEffect)(() => {
					let v = a.current,
						C = i.current;
					if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
						u(e),
							f(!1),
							p({
								height: e ? 'auto' : 0,
								overflow: e ? 'visible' : 'hidden',
								transition: 'none',
							});
						return;
					}
					if ((s.current !== null && cancelAnimationFrame(s.current), e))
						u(!0),
							f(!0),
							(s.current = requestAnimationFrame(() => {
								let y = i.current;
								if (!y) return void f(!1);
								let b = y.scrollHeight;
								p({ height: 0, overflow: 'hidden', transition: 'none' }),
									requestAnimationFrame(() => {
										p({
											height: b,
											overflow: 'hidden',
											transition: `height ${n}ms ${o}`,
										});
										let g = (m) => {
											m.propertyName === 'height' &&
												(p({
													height: 'auto',
													overflow: 'visible',
													transition: 'none',
												}),
												f(!1),
												v?.removeEventListener('transitionend', g));
										};
										v?.addEventListener('transitionend', g);
									});
							}));
					else {
						if (!v || !C) {
							u(!1),
								f(!1),
								p({ height: 0, overflow: 'hidden', transition: 'none' });
							return;
						}
						f(!0),
							p({
								height: C.scrollHeight,
								overflow: 'hidden',
								transition: 'none',
							}),
							(s.current = requestAnimationFrame(() => {
								v.offsetHeight,
									p({
										height: 0,
										overflow: 'hidden',
										transition: `height ${n}ms ${o}`,
									});
								let y = (b) => {
									b.propertyName === 'height' &&
										(u(!1), f(!1), v.removeEventListener('transitionend', y));
								};
								v.addEventListener('transitionend', y);
							}));
					}
					return () => {
						s.current !== null && cancelAnimationFrame(s.current);
					};
				}, [e, n, o]),
				e || l || d
					? (0, _p.jsx)('div', {
							ref: a,
							className: r,
							style: {
								height: c.height,
								overflow: c.overflow,
								transition: c.transition,
							},
							children:
								l &&
								(0, _p.jsx)('div', {
									ref: i,
									style: { overflow: 'hidden' },
									children: t,
								}),
						})
					: null
			);
		};
	io.displayName = 'AnimatedCollapse';
	var ko = ({
			purpose: e,
			isEnabled: t,
			onToggle: n,
			vendorConsents: o,
			onVendorToggle: r,
			onVendorClick: a,
			isLocked: i = !1,
			vendorLegitimateInterests: s = {},
			onVendorLegitimateInterestToggle: l,
			purposeLegitimateInterests: u = {},
			onPurposeLegitimateInterestToggle: d,
		}) => {
			let [f, c] = (0, qu.useState)(!1),
				[p, v] = (0, qu.useState)(!1),
				[C, y] = (0, qu.useState)(!1),
				b = pt(),
				g = e.vendors.filter((B) => B.usesLegitimateInterest),
				m = e.vendors.filter((B) => !B.usesLegitimateInterest),
				h = (B) => o[String(B)] ?? !1,
				k = (B) => s[String(B)] ?? !0,
				A = u[e.id] ?? !0,
				x = m.filter((B) => !B.isCustom),
				L = m.filter((B) => B.isCustom),
				_ = g.filter((B) => !B.isCustom),
				N = g.filter((B) => B.isCustom);
			return (0, M.jsxs)('div', {
				className: S.purposeItem,
				'data-testid': `purpose-item-${e.id}`,
				children: [
					(0, M.jsxs)('div', {
						className: S.purposeHeader,
						children: [
							(0, M.jsxs)('button', {
								type: 'button',
								onClick: () => c(!f),
								className: S.purposeTrigger,
								children: [
									(0, M.jsx)('svg', {
										className: S.purposeArrow,
										viewBox: '0 0 24 24',
										fill: 'none',
										stroke: 'currentColor',
										strokeWidth: '2',
										children: f
											? (0, M.jsx)('path', { d: 'M19 9l-7 7-7-7' })
											: (0, M.jsx)('path', { d: 'M9 5l7 7-7 7' }),
									}),
									(0, M.jsxs)('div', {
										className: S.purposeInfo,
										children: [
											(0, M.jsxs)('h3', {
												className: S.purposeName,
												children: [
													e.name,
													i &&
														(0, M.jsxs)('svg', {
															className: S.lockIcon,
															viewBox: '0 0 24 24',
															fill: 'none',
															stroke: 'currentColor',
															strokeWidth: '2',
															children: [
																(0, M.jsx)('rect', {
																	x: '3',
																	y: '11',
																	width: '18',
																	height: '11',
																	rx: '2',
																	ry: '2',
																}),
																(0, M.jsx)('path', {
																	d: 'M7 11V7a5 5 0 0 1 10 0v4',
																}),
															],
														}),
												],
											}),
											(0, M.jsx)('p', {
												className: S.purposeMeta,
												children:
													b.preferenceCenter.purposeItem.partners.replace(
														'{count}',
														String(e.vendors.length)
													),
											}),
											g.length > 0 &&
												(0, M.jsxs)('div', {
													className: S.legitimateInterestBadge,
													children: [
														(0, M.jsx)('svg', {
															className: S.legitimateInterestIcon,
															viewBox: '0 0 24 24',
															fill: 'none',
															stroke: 'currentColor',
															strokeWidth: '2',
															children: (0, M.jsx)('path', {
																d: 'M12 3v18M3 12h18M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07',
															}),
														}),
														b.preferenceCenter.purposeItem.vendorsUseLegitimateInterest.replace(
															'{count}',
															String(g.length)
														),
													],
												}),
										],
									}),
								],
							}),
							(0, M.jsx)(no, {
								checked: t,
								onCheckedChange: (B) => {
									for (let Z of (n(B), m)) r(Z.id, B);
								},
								disabled: i,
							}),
						],
					}),
					(0, M.jsx)(io, {
						isOpen: f,
						children: (0, M.jsxs)('div', {
							className: S.purposeContent,
							children: [
								(0, M.jsx)('p', {
									className: S.purposeDescription,
									children: e.description,
								}),
								g.length > 0 &&
									d &&
									(0, M.jsxs)('div', {
										className: S.purposeLISection,
										children: [
											(0, M.jsxs)('div', {
												className: S.purposeLISectionHeader,
												children: [
													(0, M.jsxs)('div', {
														className: S.purposeLIInfo,
														children: [
															(0, M.jsx)('svg', {
																className: S.legitimateInterestIcon,
																viewBox: '0 0 24 24',
																fill: 'none',
																stroke: 'currentColor',
																strokeWidth: '2',
																children: (0, M.jsx)('path', {
																	d: 'M12 3v18M3 12h18M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07',
																}),
															}),
															(0, M.jsx)('span', {
																children:
																	b.preferenceCenter.purposeItem.vendorsUseLegitimateInterest.replace(
																		'{count}',
																		String(g.length)
																	),
															}),
														],
													}),
													(0, M.jsx)('button', {
														type: 'button',
														onClick: () => {
															let B = !A;
															if ((d && d(e.id, B), l))
																for (let Z of g) l(Z.id, B);
														},
														className: `${S.objectButton} ${A ? '' : S.objectButtonActive}`,
														'aria-pressed': !A,
														children: A
															? b.preferenceCenter.purposeItem.objectButton
															: b.preferenceCenter.purposeItem.objected,
													}),
												],
											}),
											(0, M.jsx)('p', {
												className: S.liExplanation,
												children: b.preferenceCenter.purposeItem.rightToObject,
											}),
										],
									}),
								g.length > 0 &&
									!d &&
									(0, M.jsxs)('div', {
										className: S.legitimateInterestBadge,
										children: [
											(0, M.jsx)('svg', {
												className: S.legitimateInterestIcon,
												viewBox: '0 0 24 24',
												fill: 'none',
												stroke: 'currentColor',
												strokeWidth: '2',
												children: (0, M.jsx)('path', {
													d: 'M12 3v18M3 12h18M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07',
												}),
											}),
											b.preferenceCenter.purposeItem.vendorsUseLegitimateInterest.replace(
												'{count}',
												String(g.length)
											),
										],
									}),
								e.illustrations &&
									e.illustrations.length > 0 &&
									(0, M.jsxs)('div', {
										children: [
											(0, M.jsxs)('button', {
												type: 'button',
												onClick: () => v(!p),
												className: S.examplesToggle,
												children: [
													(0, M.jsx)('svg', {
														style: { width: '0.75rem', height: '0.75rem' },
														viewBox: '0 0 24 24',
														fill: 'none',
														stroke: 'currentColor',
														strokeWidth: '2',
														children: p
															? (0, M.jsx)('path', { d: 'M19 9l-7 7-7-7' })
															: (0, M.jsx)('path', { d: 'M9 5l7 7-7 7' }),
													}),
													b.preferenceCenter.purposeItem.examples,
													' (',
													e.illustrations.length,
													')',
												],
											}),
											(0, M.jsx)(io, {
												isOpen: p,
												children: (0, M.jsx)('ul', {
													className: S.examplesList,
													children: e.illustrations.map((B, Z) =>
														(0, M.jsx)('li', { children: B }, Z)
													),
												}),
											}),
										],
									}),
								(0, M.jsxs)('div', {
									children: [
										(0, M.jsxs)('button', {
											type: 'button',
											onClick: () => y(!C),
											className: S.vendorsToggle,
											children: [
												(0, M.jsx)('svg', {
													style: { width: '0.75rem', height: '0.75rem' },
													viewBox: '0 0 24 24',
													fill: 'none',
													stroke: 'currentColor',
													strokeWidth: '2',
													children: C
														? (0, M.jsx)('path', { d: 'M19 9l-7 7-7-7' })
														: (0, M.jsx)('path', { d: 'M9 5l7 7-7 7' }),
												}),
												b.preferenceCenter.purposeItem.partnersUsingPurpose,
												' (',
												e.vendors.length,
												')',
											],
										}),
										(0, M.jsx)(io, {
											isOpen: C,
											children: (0, M.jsxs)('div', {
												className: S.vendorSection,
												children: [
													x.length > 0 &&
														(0, M.jsxs)(M.Fragment, {
															children: [
																(0, M.jsxs)('h5', {
																	className: S.vendorSectionTitle,
																	children: [
																		b.preferenceCenter.purposeItem
																			.withYourPermission,
																		' (',
																		x.length,
																		')',
																	],
																}),
																x.map((B) =>
																	(0, M.jsx)(
																		Fu,
																		{
																			vendor: B,
																			isConsented: h(B.id),
																			onToggle: (Z) => r(B.id, Z),
																			onClick: () => a(B.id),
																		},
																		B.id
																	)
																),
															],
														}),
													_.length > 0 &&
														(0, M.jsxs)(M.Fragment, {
															children: [
																(0, M.jsxs)('h5', {
																	className: `${S.vendorSectionTitle} ${S.vendorSectionTitleLI}`,
																	children: [
																		(0, M.jsx)('svg', {
																			style: {
																				width: '0.75rem',
																				height: '0.75rem',
																			},
																			viewBox: '0 0 24 24',
																			fill: 'none',
																			stroke: 'currentColor',
																			strokeWidth: '2',
																			children: (0, M.jsx)('path', {
																				d: 'M12 3v18M3 12h18M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07',
																			}),
																		}),
																		b.preferenceCenter.purposeItem
																			.legitimateInterest,
																		' (',
																		_.length,
																		')',
																	],
																}),
																(0, M.jsx)('p', {
																	className: S.liExplanation,
																	children:
																		b.preferenceCenter.purposeItem
																			.rightToObject,
																}),
																_.map((B) =>
																	(0, M.jsx)(
																		Fu,
																		{
																			vendor: B,
																			isConsented: h(B.id),
																			onToggle: (Z) => r(B.id, Z),
																			onClick: () => a(B.id),
																			isLegitimateInterest: !0,
																			isLegitimateInterestAllowed: k(B.id),
																			onLegitimateInterestToggle: l
																				? (Z) => l(B.id, Z)
																				: void 0,
																		},
																		B.id
																	)
																),
															],
														}),
													(L.length > 0 || N.length > 0) &&
														(0, M.jsxs)('div', {
															className: S.customVendorPurposeSection,
															children: [
																(0, M.jsxs)('h5', {
																	className: S.vendorSectionTitleCustom,
																	children: [
																		(0, M.jsxs)('svg', {
																			style: {
																				width: '0.75rem',
																				height: '0.75rem',
																			},
																			viewBox: '0 0 24 24',
																			fill: 'none',
																			stroke: 'currentColor',
																			strokeWidth: '2',
																			children: [
																				(0, M.jsx)('circle', {
																					cx: '12',
																					cy: '12',
																					r: '10',
																				}),
																				(0, M.jsx)('line', {
																					x1: '2',
																					y1: '12',
																					x2: '22',
																					y2: '12',
																				}),
																				(0, M.jsx)('path', {
																					d: 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
																				}),
																			],
																		}),
																		b.preferenceCenter.vendorList
																			.customVendorsHeading,
																		' (',
																		L.length + N.length,
																		')',
																	],
																}),
																L.map((B) =>
																	(0, M.jsx)(
																		Fu,
																		{
																			vendor: B,
																			isConsented: h(B.id),
																			onToggle: (Z) => r(B.id, Z),
																			onClick: () => a(B.id),
																		},
																		B.id
																	)
																),
																N.map((B) =>
																	(0, M.jsx)(
																		Fu,
																		{
																			vendor: B,
																			isConsented: h(B.id),
																			onToggle: (Z) => r(B.id, Z),
																			onClick: () => a(B.id),
																			isLegitimateInterest: !0,
																			isLegitimateInterestAllowed: k(B.id),
																			onLegitimateInterestToggle: l
																				? (Z) => l(B.id, Z)
																				: void 0,
																		},
																		B.id
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
		Fu = ({
			vendor: e,
			isConsented: t,
			onToggle: n,
			onClick: o,
			isLegitimateInterest: r = !1,
			isLegitimateInterestAllowed: a = !0,
			onLegitimateInterestToggle: i,
		}) => {
			let s = pt(),
				l = r && i;
			return (0, M.jsxs)('div', {
				className: `${S.vendorRow} ${r ? S.vendorRowLI : ''}`,
				children: [
					(0, M.jsxs)('div', {
						className: S.vendorInfo,
						children: [
							(0, M.jsxs)('button', {
								type: 'button',
								onClick: o,
								className: S.vendorName,
								children: [
									(0, M.jsx)('span', { children: e.name }),
									e.isCustom &&
										(0, M.jsxs)('svg', {
											className: S.customVendorIcon,
											viewBox: '0 0 24 24',
											fill: 'none',
											stroke: 'currentColor',
											strokeWidth: '2',
											'aria-label': s.common.customPartner,
											children: [
												(0, M.jsx)('circle', { cx: '12', cy: '12', r: '10' }),
												(0, M.jsx)('line', {
													x1: '2',
													y1: '12',
													x2: '22',
													y2: '12',
												}),
												(0, M.jsx)('path', {
													d: 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
												}),
											],
										}),
								],
							}),
							(0, M.jsxs)('div', {
								className: S.vendorDetails,
								children: [
									r &&
										(0, M.jsx)('span', {
											className: `${S.vendorDetail} ${S.vendorDetailLI}`,
											children:
												s.preferenceCenter.purposeItem.legitimateInterest,
										}),
									e.usesCookies &&
										(0, M.jsx)('span', {
											className: S.vendorDetail,
											children: s.preferenceCenter.vendorList.usesCookies,
										}),
									e.usesNonCookieAccess &&
										(0, M.jsx)('span', {
											className: S.vendorDetail,
											children: s.preferenceCenter.vendorList.nonCookieAccess,
										}),
								],
							}),
						],
					}),
					l
						? (0, M.jsx)('button', {
								type: 'button',
								onClick: () => i(!a),
								className: `${S.objectButton} ${a ? '' : S.objectButtonActive}`,
								'aria-pressed': !a,
								children: a
									? s.preferenceCenter.purposeItem.objectButton
									: s.preferenceCenter.purposeItem.objected,
							})
						: (0, M.jsx)('div', {
								style: { transform: 'scale(0.75)' },
								children: (0, M.jsx)(no, { checked: t, onCheckedChange: n }),
							}),
				],
			});
		};
	var di = w(H(), 1);
	var fi = w(j(), 1),
		s5 = w(Co(), 1);
	var Op = ({
		children: e,
		open: t,
		models: n = ['iab'],
		noStyle: o,
		disableAnimation: r,
		scrollLock: a = !0,
		trapFocus: i = !0,
		uiSource: s,
	}) => {
		let { activeUI: l, translationConfig: u, iab: d, model: f } = K(),
			c = mn(u.defaultLanguage),
			[p, v] = (0, fi.useState)(!1),
			[C, y] = (0, fi.useState)(!1),
			b = n.includes(f) && (t ?? l === 'dialog');
		if (
			(dn(!!(b && a)),
			(0, fi.useEffect)(() => {
				v(!0);
			}, []),
			(0, fi.useEffect)(() => {
				if (b) y(!0);
				else if (r) y(!1);
				else {
					let h = setTimeout(() => {
						y(!1);
					}, 150);
					return () => clearTimeout(h);
				}
			}, [b, r]),
			!p || !d?.config.enabled || (!b && !C))
		)
			return null;
		let g = oe('iabConsentDialog', {
				baseClassName: wt(
					S.root,
					r ? void 0 : C ? S.dialogVisible : S.dialogHidden
				),
			}),
			m = (0, di.jsx)(Dt.Provider, {
				value: { uiSource: s ?? 'iab_dialog' },
				children: (0, di.jsxs)(fn.Provider, {
					value: {
						disableAnimation: r,
						noStyle: o,
						scrollLock: a,
						trapFocus: i,
					},
					children: [
						(0, di.jsx)(ta, { isOpen: b }),
						(0, di.jsx)('div', {
							...g,
							'data-testid': 'iab-consent-dialog-root',
							dir: c,
							children: e,
						}),
					],
				}),
			});
		return (0, s5.createPortal)(m, document.body);
	};
	Op.displayName = 'IABConsentDialogRoot';
	var Ke = w(H(), 1);
	var l5 = w(j(), 1);
	var Yu = ({
		stack: e,
		consents: t,
		onToggle: n,
		vendorConsents: o,
		onVendorToggle: r,
		onVendorClick: a,
		vendorLegitimateInterests: i = {},
		onVendorLegitimateInterestToggle: s,
		purposeLegitimateInterests: l = {},
		onPurposeLegitimateInterestToggle: u,
	}) => {
		let [d, f] = (0, l5.useState)(!1),
			c = e.purposes.every((C) => t[C.id] ?? !1),
			p = e.purposes.some((C) => t[C.id] ?? !1) && !c,
			v = new Set(e.purposes.flatMap((C) => C.vendors.map((y) => y.id))).size;
		return (0, Ke.jsxs)('div', {
			className: S.stackItem,
			'data-testid': `stack-item-${e.id}`,
			children: [
				(0, Ke.jsxs)('div', {
					className: S.stackHeader,
					children: [
						(0, Ke.jsxs)('button', {
							type: 'button',
							onClick: () => f(!d),
							className: S.stackTrigger,
							children: [
								(0, Ke.jsx)('svg', {
									className: S.purposeArrow,
									viewBox: '0 0 24 24',
									fill: 'none',
									stroke: 'currentColor',
									strokeWidth: '2',
									children: d
										? (0, Ke.jsx)('path', { d: 'M19 9l-7 7-7-7' })
										: (0, Ke.jsx)('path', { d: 'M9 5l7 7-7 7' }),
								}),
								(0, Ke.jsxs)('div', {
									className: S.stackInfo,
									children: [
										(0, Ke.jsx)('h3', {
											className: S.stackName,
											children: e.name,
										}),
										!d &&
											(0, Ke.jsxs)('p', {
												className: S.stackMeta,
												children: [v, ' ', v === 1 ? 'partner' : 'partners'],
											}),
									],
								}),
							],
						}),
						(0, Ke.jsxs)('div', {
							className: S.stackControls,
							children: [
								p &&
									(0, Ke.jsx)('div', {
										className: S.partialIndicator,
										title: 'Partially enabled',
									}),
								(0, Ke.jsx)(no, {
									checked: c,
									onCheckedChange: (C) => {
										for (let y of e.purposes)
											for (let b of (n(y.id, C), y.vendors))
												b.usesLegitimateInterest || r(b.id, C);
									},
								}),
							],
						}),
					],
				}),
				(0, Ke.jsxs)(io, {
					isOpen: d,
					children: [
						(0, Ke.jsxs)('div', {
							className: S.stackDescription,
							children: [
								(0, Ke.jsx)('p', { children: e.description }),
								(0, Ke.jsxs)('p', {
									className: S.stackMeta,
									children: [v, ' ', v === 1 ? 'partner' : 'partners'],
								}),
							],
						}),
						(0, Ke.jsx)('div', {
							className: S.stackContent,
							children: e.purposes.map((C) =>
								(0, Ke.jsx)(
									ko,
									{
										purpose: C,
										isEnabled: t[C.id] ?? !1,
										onToggle: (y) => n(C.id, y),
										vendorConsents: o,
										onVendorToggle: r,
										onVendorClick: a,
										vendorLegitimateInterests: i,
										onVendorLegitimateInterestToggle: s,
										purposeLegitimateInterests: l,
										onPurposeLegitimateInterestToggle: u,
									},
									C.id
								)
							),
						}),
					],
				}),
			],
		});
	};
	var wo = w(H(), 1);
	var Ao = w(j(), 1);
	var c5 = (0, Ao.createContext)(null);
	function KE() {
		let e = (0, Ao.useContext)(c5);
		if (!e)
			throw Error('Tab components must be used within IABConsentDialogTabs');
		return e;
	}
	var Bp = (0, Ao.forwardRef)(
		({ children: e, defaultTab: t = 'purposes', className: n, ...o }, r) => {
			let [a, i] = (0, Ao.useState)(t),
				s = pt(),
				{
					purposes: l,
					specialPurposes: u,
					specialFeatures: d,
					features: f,
					totalVendors: c,
					isLoading: p,
				} = Gu(),
				v = n ? `${S.tabsContainer} ${n}` : S.tabsContainer;
			return (0, wo.jsx)(c5.Provider, {
				value: { activeTab: a, setActiveTab: i },
				children: e
					? (0, wo.jsx)('div', { ref: r, className: v, ...o, children: e })
					: (0, wo.jsx)('div', {
							ref: r,
							className: v,
							...o,
							children: (0, wo.jsxs)('div', {
								className: S.tabsList,
								children: [
									(0, wo.jsxs)('button', {
										type: 'button',
										onClick: () => i('purposes'),
										className: S.tabButton,
										'data-state': a === 'purposes' ? 'active' : 'inactive',
										children: [
											s.preferenceCenter.tabs.purposes,
											!p && ` (${l.length + u.length + d.length + f.length})`,
										],
									}),
									(0, wo.jsxs)('button', {
										type: 'button',
										onClick: () => i('vendors'),
										className: S.tabButton,
										'data-state': a === 'vendors' ? 'active' : 'inactive',
										children: [
											s.preferenceCenter.tabs.vendors,
											!p && ` (${c})`,
										],
									}),
								],
							}),
						}),
			});
		}
	);
	Bp.displayName = 'IABConsentDialogTabs';
	var Dp = (0, Ao.forwardRef)(
		({ tab: e, children: t, className: n, ...o }, r) => {
			let { activeTab: a, setActiveTab: i } = KE();
			return (0, wo.jsx)('button', {
				ref: r,
				type: 'button',
				onClick: () => i(e),
				className: n ? `${S.tabButton} ${n}` : S.tabButton,
				'data-state': a === e ? 'active' : 'inactive',
				...o,
				children: t,
			});
		}
	);
	Dp.displayName = 'IABConsentDialogTabButton';
	var E = w(H(), 1);
	var $s = w(j(), 1);
	var Xu = ({
		vendorData: e,
		purposes: t,
		vendorConsents: n,
		onVendorToggle: o,
		selectedVendorId: r,
		onClearSelection: a,
		customVendors: i = [],
		vendorLegitimateInterests: s = {},
		onVendorLegitimateInterestToggle: l,
	}) => {
		let [u, d] = (0, $s.useState)(''),
			[f, c] = (0, $s.useState)(new Set()),
			p = pt(),
			v = [
				...(e
					? Object.entries(e.vendors).map(([m, h]) => ({
							id: Number(m),
							name: h.name,
							policyUrl: h.policyUrl ?? '',
							usesNonCookieAccess: h.usesNonCookieAccess,
							deviceStorageDisclosureUrl: h.deviceStorageDisclosureUrl ?? null,
							usesCookies: h.usesCookies,
							cookieMaxAgeSeconds: h.cookieMaxAgeSeconds,
							cookieRefresh: h.cookieRefresh,
							specialPurposes: h.specialPurposes || [],
							specialFeatures: h.specialFeatures || [],
							features: h.features || [],
							purposes: h.purposes || [],
							legIntPurposes: h.legIntPurposes || [],
							isCustom: !1,
							legitimateInterestUrl:
								h.urls?.find((k) => k.legIntClaim)?.legIntClaim ?? null,
							dataRetention: h.dataRetention,
							dataDeclaration: h.dataDeclaration || [],
						}))
					: []),
				...i.map((m) => ({
					id: m.id,
					name: m.name,
					policyUrl: m.privacyPolicyUrl,
					usesNonCookieAccess: m.usesNonCookieAccess ?? !1,
					deviceStorageDisclosureUrl: null,
					usesCookies: m.usesCookies ?? !1,
					cookieMaxAgeSeconds: m.cookieMaxAgeSeconds ?? null,
					cookieRefresh: void 0,
					specialPurposes: [],
					specialFeatures: m.specialFeatures || [],
					features: m.features || [],
					purposes: m.purposes || [],
					legIntPurposes: m.legIntPurposes || [],
					isCustom: !0,
					legitimateInterestUrl: null,
					dataRetention: void 0,
					dataDeclaration: m.dataCategories || [],
				})),
			].sort((m, h) => m.name.localeCompare(h.name));
		(0, $s.useEffect)(() => {
			r !== null &&
				(c((m) => new Set(m).add(r)),
				setTimeout(() => {
					let m = document.getElementById(`vendor-${String(r)}`);
					m && m.scrollIntoView({ behavior: 'smooth', block: 'start' });
				}, 100));
		}, [r]);
		let C =
				r !== null
					? v.filter((m) => String(m.id) === String(r))
					: v.filter((m) => m.name.toLowerCase().includes(u.toLowerCase())),
			y = C.filter((m) => !m.isCustom),
			b = C.filter((m) => m.isCustom);
		return (0, E.jsxs)('div', {
			children: [
				r !== null
					? (0, E.jsxs)('div', {
							className: S.selectedVendorBanner,
							children: [
								(0, E.jsx)('p', {
									className: S.selectedVendorText,
									children: p.common.showingSelectedVendor,
								}),
								(0, E.jsxs)('button', {
									type: 'button',
									onClick: a,
									className: S.clearSelectionButton,
									children: [
										(0, E.jsxs)('svg', {
											className: S.clearIcon,
											viewBox: '0 0 24 24',
											fill: 'none',
											stroke: 'currentColor',
											strokeWidth: '2',
											children: [
												(0, E.jsx)('line', {
													x1: '18',
													y1: '6',
													x2: '6',
													y2: '18',
												}),
												(0, E.jsx)('line', {
													x1: '6',
													y1: '6',
													x2: '18',
													y2: '18',
												}),
											],
										}),
										p.common.clearSelection,
									],
								}),
							],
						})
					: (0, E.jsxs)('div', {
							className: S.vendorListHeader,
							children: [
								(0, E.jsxs)('div', {
									className: S.searchContainer,
									children: [
										(0, E.jsxs)('svg', {
											className: S.searchIcon,
											viewBox: '0 0 24 24',
											fill: 'none',
											stroke: 'currentColor',
											strokeWidth: '2',
											children: [
												(0, E.jsx)('circle', { cx: '11', cy: '11', r: '8' }),
												(0, E.jsx)('line', {
													x1: '21',
													y1: '21',
													x2: '16.65',
													y2: '16.65',
												}),
											],
										}),
										(0, E.jsx)('input', {
											type: 'text',
											placeholder: p.preferenceCenter.vendorList.search,
											value: u,
											onChange: (m) => d(m.target.value),
											className: S.searchInput,
										}),
									],
								}),
								(0, E.jsx)('p', {
									className: S.vendorCount,
									children: p.preferenceCenter.vendorList.showingCount
										.replace('{filtered}', String(C.length))
										.replace('{total}', String(v.length)),
								}),
							],
						}),
				y.length > 0 &&
					(0, E.jsxs)('div', {
						className: S.vendorSection,
						children: [
							(0, E.jsxs)('div', {
								className: S.iabVendorSectionHeader,
								children: [
									(0, E.jsxs)('h3', {
										className: S.vendorSectionHeading,
										children: [
											(0, E.jsxs)('svg', {
												className: S.vendorSectionIcon,
												viewBox: '0 0 24 24',
												fill: 'none',
												stroke: 'currentColor',
												strokeWidth: '2',
												children: [
													(0, E.jsx)('path', {
														d: 'M12 2L2 7l10 5 10-5-10-5z',
													}),
													(0, E.jsx)('path', { d: 'M2 17l10 5 10-5' }),
													(0, E.jsx)('path', { d: 'M2 12l10 5 10-5' }),
												],
											}),
											p.preferenceCenter.vendorList.iabVendorsHeading,
											' (',
											y.length,
											')',
										],
									}),
									(0, E.jsx)('p', {
										className: S.iabVendorNotice,
										children: p.preferenceCenter.vendorList.iabVendorsNotice,
									}),
								],
							}),
							(0, E.jsx)('div', { children: y.map((m) => g(m)) }),
						],
					}),
				b.length > 0 &&
					(0, E.jsxs)('div', {
						className: S.vendorSection,
						children: [
							(0, E.jsxs)('div', {
								className: S.customVendorSectionHeader,
								children: [
									(0, E.jsxs)('h3', {
										className: S.vendorSectionHeading,
										children: [
											(0, E.jsxs)('svg', {
												className: S.vendorSectionIcon,
												viewBox: '0 0 24 24',
												fill: 'none',
												stroke: 'currentColor',
												strokeWidth: '2',
												children: [
													(0, E.jsx)('circle', { cx: '12', cy: '12', r: '10' }),
													(0, E.jsx)('line', {
														x1: '2',
														y1: '12',
														x2: '22',
														y2: '12',
													}),
													(0, E.jsx)('path', {
														d: 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
													}),
												],
											}),
											p.preferenceCenter.vendorList.customVendorsHeading,
											' (',
											b.length,
											')',
										],
									}),
									(0, E.jsx)('p', {
										className: S.customVendorNotice,
										children: p.preferenceCenter.vendorList.customVendorsNotice,
									}),
								],
							}),
							(0, E.jsx)('div', { children: b.map((m) => g(m)) }),
						],
					}),
				C.length === 0 &&
					(0, E.jsx)('div', {
						className: S.emptyState,
						children: (0, E.jsxs)('p', {
							className: S.emptyStateText,
							children: ['No vendors found matching "', u, '"'],
						}),
					}),
			],
		});
		function g(m) {
			var h, k, A, x;
			let L,
				_,
				N,
				B,
				Z = String(m.id),
				P =
					((h = m.id),
					(L = v.find((z) => String(z.id) === String(h)))
						? t
								.filter((z) =>
									z.vendors.some((Ae) => String(Ae.id) === String(h))
								)
								.map((z) => ({
									...z,
									usesLegitimateInterest: L.legIntPurposes.includes(z.id),
								}))
						: []),
				ge =
					((k = m.id),
					(_ = v.find((z) => String(z.id) === String(k))) && e
						? _.specialPurposes
								.map((z) => e.specialPurposes[z])
								.filter((z) => z != null)
								.map((z) => ({
									id: z.id,
									name: z.name,
									description: z.description,
								}))
						: []),
				at =
					((A = m.id),
					(N = v.find((z) => String(z.id) === String(A))) && e
						? N.specialFeatures
								.map((z) => e.specialFeatures[z])
								.filter((z) => z != null)
								.map((z) => ({
									id: z.id,
									name: z.name,
									description: z.description,
								}))
						: []),
				Ct =
					((x = m.id),
					(B = v.find((z) => String(z.id) === String(x))) && e
						? (B.features || [])
								.map((z) => e.features[z])
								.filter((z) => z != null)
								.map((z) => ({
									id: z.id,
									name: z.name,
									description: z.description,
								}))
						: []),
				os = f.has(m.id),
				Br = P.filter((z) => z.usesLegitimateInterest).length,
				Tf = m.legIntPurposes.length > 0,
				xa = s[Z] ?? !0,
				tc = m.dataRetention?.stdRetention,
				Xo = null;
			return (
				m.cookieMaxAgeSeconds &&
					((Xo = p.preferenceCenter.vendorList.maxAge.replace(
						'{days}',
						String(Math.floor(m.cookieMaxAgeSeconds / 86400))
					)),
					m.cookieRefresh && (Xo = `${Xo} (refreshes)`)),
				(0, E.jsxs)(
					'div',
					{
						id: `vendor-${Z}`,
						className: `${S.vendorListItem} ${m.isCustom ? S.customVendorItem : ''}`,
						children: [
							(0, E.jsxs)('div', {
								className: S.vendorListItemHeader,
								children: [
									(0, E.jsxs)('button', {
										type: 'button',
										onClick: () => {
											var z;
											return (
												(z = m.id),
												void c((Ae) => {
													let go = new Set(Ae);
													return go.has(z) ? go.delete(z) : go.add(z), go;
												})
											);
										},
										className: S.vendorListTrigger,
										children: [
											(0, E.jsxs)('div', {
												className: S.vendorListInfo,
												children: [
													(0, E.jsxs)('h3', {
														className: S.vendorListName,
														children: [
															m.name,
															m.isCustom &&
																(0, E.jsxs)('svg', {
																	className: S.customVendorIcon,
																	viewBox: '0 0 24 24',
																	fill: 'none',
																	stroke: 'currentColor',
																	strokeWidth: '2',
																	'aria-label': p.common.customPartner,
																	children: [
																		(0, E.jsx)('circle', {
																			cx: '12',
																			cy: '12',
																			r: '10',
																		}),
																		(0, E.jsx)('line', {
																			x1: '2',
																			y1: '12',
																			x2: '22',
																			y2: '12',
																		}),
																		(0, E.jsx)('path', {
																			d: 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
																		}),
																	],
																}),
														],
													}),
													(0, E.jsxs)('div', {
														className: S.vendorListMeta,
														children: [
															(0, E.jsxs)('span', {
																className: S.vendorListMetaText,
																children: [
																	P.length,
																	' purpose',
																	P.length !== 1 ? 's' : '',
																	ge.length > 0 && `, ${ge.length} special`,
																	at.length > 0 &&
																		`, ${at.length} feature${at.length !== 1 ? 's' : ''}`,
																],
															}),
															Br > 0 &&
																(0, E.jsxs)('span', {
																	className: S.vendorListLIBadge,
																	children: [
																		(0, E.jsx)('svg', {
																			style: {
																				width: '0.625rem',
																				height: '0.625rem',
																			},
																			viewBox: '0 0 24 24',
																			fill: 'none',
																			stroke: 'currentColor',
																			strokeWidth: '2',
																			children: (0, E.jsx)('path', {
																				d: 'M12 3v18M3 12h18M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07',
																			}),
																		}),
																		Br,
																		' ',
																		p.preferenceCenter.vendorList
																			.legitimateInterest,
																	],
																}),
														],
													}),
												],
											}),
											(0, E.jsx)('svg', {
												className: S.purposeArrow,
												viewBox: '0 0 24 24',
												fill: 'none',
												stroke: 'currentColor',
												strokeWidth: '2',
												children: os
													? (0, E.jsx)('path', { d: 'M19 15l-7-7-7 7' })
													: (0, E.jsx)('path', { d: 'M19 9l-7 7-7-7' }),
											}),
										],
									}),
									(0, E.jsx)(no, {
										checked: n[Z] ?? !1,
										onCheckedChange: (z) => o(m.id, z),
									}),
								],
							}),
							(0, E.jsx)(io, {
								isOpen: os,
								children: (0, E.jsxs)('div', {
									className: S.vendorListContent,
									children: [
										(0, E.jsxs)('div', {
											className: S.vendorLinks,
											children: [
												(0, E.jsxs)('a', {
													href: m.policyUrl,
													target: '_blank',
													rel: 'noopener noreferrer',
													className: S.vendorLink,
													children: [
														(0, E.jsxs)('svg', {
															className: S.vendorLinkIcon,
															viewBox: '0 0 24 24',
															fill: 'none',
															stroke: 'currentColor',
															strokeWidth: '2',
															children: [
																(0, E.jsx)('path', {
																	d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
																}),
																(0, E.jsx)('polyline', {
																	points: '15 3 21 3 21 9',
																}),
																(0, E.jsx)('line', {
																	x1: '10',
																	y1: '14',
																	x2: '21',
																	y2: '3',
																}),
															],
														}),
														p.preferenceCenter.vendorList.privacyPolicy,
													],
												}),
												m.legitimateInterestUrl &&
													(0, E.jsxs)('a', {
														href: m.legitimateInterestUrl,
														target: '_blank',
														rel: 'noopener noreferrer',
														className: S.vendorLink,
														children: [
															(0, E.jsxs)('svg', {
																className: S.vendorLinkIcon,
																viewBox: '0 0 24 24',
																fill: 'none',
																stroke: 'currentColor',
																strokeWidth: '2',
																children: [
																	(0, E.jsx)('path', {
																		d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
																	}),
																	(0, E.jsx)('polyline', {
																		points: '15 3 21 3 21 9',
																	}),
																	(0, E.jsx)('line', {
																		x1: '10',
																		y1: '14',
																		x2: '21',
																		y2: '3',
																	}),
																],
															}),
															p.preferenceCenter.purposeItem.legitimateInterest,
														],
													}),
												m.deviceStorageDisclosureUrl &&
													(0, E.jsxs)('a', {
														href: m.deviceStorageDisclosureUrl,
														target: '_blank',
														rel: 'noopener noreferrer',
														className: S.vendorLink,
														children: [
															(0, E.jsxs)('svg', {
																className: S.vendorLinkIcon,
																viewBox: '0 0 24 24',
																fill: 'none',
																stroke: 'currentColor',
																strokeWidth: '2',
																children: [
																	(0, E.jsx)('path', {
																		d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
																	}),
																	(0, E.jsx)('polyline', {
																		points: '15 3 21 3 21 9',
																	}),
																	(0, E.jsx)('line', {
																		x1: '10',
																		y1: '14',
																		x2: '21',
																		y2: '3',
																	}),
																],
															}),
															p.preferenceCenter.vendorList.storageDisclosure,
														],
													}),
											],
										}),
										(0, E.jsxs)('div', {
											className: S.vendorBadges,
											children: [
												m.usesCookies &&
													(0, E.jsx)('span', {
														className: S.vendorBadge,
														children: p.preferenceCenter.vendorList.usesCookies,
													}),
												m.usesNonCookieAccess &&
													(0, E.jsx)('span', {
														className: S.vendorBadge,
														children:
															p.preferenceCenter.vendorList.nonCookieAccess,
													}),
												Xo &&
													(0, E.jsx)('span', {
														className: S.vendorBadge,
														children: Xo,
													}),
												tc &&
													(0, E.jsx)('span', {
														className: S.vendorBadge,
														children:
															p.preferenceCenter.vendorList.retention.replace(
																'{days}',
																String(tc)
															),
													}),
											],
										}),
										P.length > 0 &&
											(0, E.jsxs)('div', {
												className: S.vendorPurposesList,
												children: [
													(0, E.jsxs)('h4', {
														className: S.vendorPurposesTitle,
														children: [
															p.preferenceCenter.vendorList.purposes,
															' (',
															P.length,
															')',
														],
													}),
													(0, E.jsx)('ul', {
														className: S.vendorPurposesItems,
														children: P.map((z) => {
															let Ae;
															return (
																m.dataRetention?.purposes?.[z.id]
																	? (Ae = m.dataRetention.purposes[z.id])
																	: m.dataRetention?.stdRetention &&
																		(Ae = m.dataRetention.stdRetention),
																(0, E.jsxs)(
																	'li',
																	{
																		className: `${S.vendorPurposeItem} ${z.usesLegitimateInterest ? S.vendorPurposeItemLI : ''}`,
																		children: [
																			(0, E.jsxs)('span', {
																				children: [
																					z.name,
																					Ae &&
																						(0, E.jsxs)('span', {
																							className: S.vendorRetention,
																							children: [
																								' ',
																								'(Retained: ',
																								Ae,
																								'd)',
																							],
																						}),
																				],
																			}),
																			z.usesLegitimateInterest &&
																				(0, E.jsxs)('span', {
																					className: S.vendorListLIBadge,
																					children: [
																						(0, E.jsx)('svg', {
																							style: {
																								width: '0.625rem',
																								height: '0.625rem',
																							},
																							viewBox: '0 0 24 24',
																							fill: 'none',
																							stroke: 'currentColor',
																							strokeWidth: '2',
																							children: (0, E.jsx)('path', {
																								d: 'M12 3v18M3 12h18M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07',
																							}),
																						}),
																						p.preferenceCenter.vendorList
																							.legitimateInterest,
																					],
																				}),
																		],
																	},
																	z.id
																)
															);
														}),
													}),
												],
											}),
										Tf &&
											l &&
											(0, E.jsxs)('div', {
												className: S.vendorLISection,
												children: [
													(0, E.jsxs)('div', {
														className: S.vendorLISectionHeader,
														children: [
															(0, E.jsxs)('h4', {
																className: S.vendorPurposesTitle,
																children: [
																	(0, E.jsx)('svg', {
																		style: {
																			width: '0.75rem',
																			height: '0.75rem',
																			marginRight: '0.25rem',
																		},
																		viewBox: '0 0 24 24',
																		fill: 'none',
																		stroke: 'currentColor',
																		strokeWidth: '2',
																		children: (0, E.jsx)('path', {
																			d: 'M12 3v18M3 12h18M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07',
																		}),
																	}),
																	p.preferenceCenter.purposeItem
																		.legitimateInterest,
																],
															}),
															(0, E.jsx)('button', {
																type: 'button',
																onClick: () => l(m.id, !xa),
																className: `${S.objectButton} ${xa ? '' : S.objectButtonActive}`,
																'aria-pressed': !xa,
																children: xa
																	? p.preferenceCenter.purposeItem.objectButton
																	: p.preferenceCenter.purposeItem.objected,
															}),
														],
													}),
													(0, E.jsx)('p', {
														className: S.liExplanation,
														children:
															p.preferenceCenter.purposeItem.rightToObject,
													}),
												],
											}),
										m.dataDeclaration &&
											m.dataDeclaration.length > 0 &&
											(0, E.jsxs)('div', {
												className: S.vendorPurposesList,
												children: [
													(0, E.jsxs)('h4', {
														className: S.vendorPurposesTitle,
														children: [
															p.preferenceCenter.vendorList.dataCategories,
															' (',
															m.dataDeclaration.length,
															')',
														],
													}),
													(0, E.jsx)('ul', {
														className: S.vendorPurposesItems,
														children: m.dataDeclaration.map((z) => {
															let Ae = e?.dataCategories?.[z];
															return (0, E.jsx)(
																'li',
																{
																	className: S.vendorPurposeItem,
																	title: Ae?.description,
																	children: Ae?.name || `Data Category ${z}`,
																},
																z
															);
														}),
													}),
												],
											}),
										ge.length > 0 &&
											(0, E.jsxs)('div', {
												className: S.vendorPurposesList,
												children: [
													(0, E.jsxs)('h4', {
														className: S.vendorPurposesTitle,
														children: [
															(0, E.jsxs)('svg', {
																'aria-label':
																	p.preferenceCenter.vendorList.specialPurposes,
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
																	(0, E.jsx)('title', {
																		children:
																			p.preferenceCenter.vendorList
																				.specialPurposes,
																	}),
																	(0, E.jsx)('rect', {
																		x: '3',
																		y: '11',
																		width: '18',
																		height: '11',
																		rx: '2',
																		ry: '2',
																	}),
																	(0, E.jsx)('path', {
																		d: 'M7 11V7a5 5 0 0 1 10 0v4',
																	}),
																],
															}),
															p.preferenceCenter.vendorList.specialPurposes,
															' (',
															ge.length,
															')',
														],
													}),
													(0, E.jsx)('ul', {
														className: S.vendorPurposesItems,
														children: ge.map((z) => {
															let Ae;
															return (
																m.dataRetention?.specialPurposes?.[z.id]
																	? (Ae = m.dataRetention.specialPurposes[z.id])
																	: m.dataRetention?.stdRetention &&
																		(Ae = m.dataRetention.stdRetention),
																(0, E.jsx)(
																	'li',
																	{
																		className: S.vendorPurposeItem,
																		children: (0, E.jsxs)('span', {
																			children: [
																				z.name,
																				Ae &&
																					(0, E.jsxs)('span', {
																						className: S.vendorRetention,
																						children: [
																							' ',
																							'(Retained: ',
																							Ae,
																							'd)',
																						],
																					}),
																			],
																		}),
																	},
																	z.id
																)
															);
														}),
													}),
													(0, E.jsx)('p', {
														className: S.vendorListMetaText,
														style: {
															fontStyle: 'italic',
															marginTop: '0.25rem',
														},
														children:
															p.preferenceCenter.vendorList.requiredNotice,
													}),
												],
											}),
										at.length > 0 &&
											(0, E.jsxs)('div', {
												className: S.vendorPurposesList,
												children: [
													(0, E.jsxs)('h4', {
														className: S.vendorPurposesTitle,
														children: [
															p.preferenceCenter.vendorList.specialFeatures,
															' (',
															at.length,
															')',
														],
													}),
													(0, E.jsx)('ul', {
														className: S.vendorPurposesItems,
														children: at.map((z) =>
															(0, E.jsx)(
																'li',
																{
																	className: S.vendorPurposeItem,
																	children: z.name,
																},
																z.id
															)
														),
													}),
												],
											}),
										Ct.length > 0 &&
											(0, E.jsxs)('div', {
												className: S.vendorPurposesList,
												children: [
													(0, E.jsxs)('h4', {
														className: S.vendorPurposesTitle,
														children: [
															p.preferenceCenter.vendorList.features,
															' (',
															Ct.length,
															')',
														],
													}),
													(0, E.jsx)('ul', {
														className: S.vendorPurposesItems,
														children: Ct.map((z) =>
															(0, E.jsx)(
																'li',
																{
																	className: S.vendorPurposeItem,
																	children: z.name,
																},
																z.id
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
					m.id
				)
			);
		}
	};
	var V = w(H(), 1);
	var ve = w(j(), 1),
		u5 = w(Co(), 1);
	var d5 = ({
		open: e,
		noStyle: t,
		disableAnimation: n,
		scrollLock: o = !0,
		trapFocus: r = !0,
		hideBranding: a,
		showTrigger: i = !1,
		models: s = ['iab'],
		uiSource: l,
	}) => {
		let u = pt(),
			{
				iab: d,
				activeUI: f,
				setActiveUI: c,
				translationConfig: p,
				model: v,
			} = K(),
			C = mn(p.defaultLanguage),
			y = (0, ve.useRef)(null),
			b = (0, ve.useRef)(null),
			g = (0, ve.useRef)(null),
			[m, h] = (0, ve.useState)(d?.preferenceCenterTab ?? 'purposes'),
			[k, A] = (0, ve.useState)(null),
			[x, L] = (0, ve.useState)(!1),
			[_, N] = (0, ve.useState)(!1),
			[B, Z] = (0, ve.useState)(!1),
			P = e ?? (f === 'dialog' && s.includes(v)),
			ge = er({ noStyle: t, disableAnimation: n, scrollLock: o, trapFocus: r }),
			{
				purposes: at,
				specialPurposes: Ct,
				specialFeatures: os,
				features: Br,
				stacks: Tf,
				standalonePurposes: xa,
			} = (0, ve.useMemo)(() => {
				if (!d?.gvl)
					return {
						purposes: [],
						specialPurposes: [],
						specialFeatures: [],
						features: [],
						stacks: [],
						standalonePurposes: [],
					};
				let U = d.gvl,
					Ie = d.nonIABVendors || [],
					Re = (J, Y, _t) => ({
						id: Number(J),
						name: Y.name,
						policyUrl: Y.policyUrl ?? '',
						usesNonCookieAccess: Y.usesNonCookieAccess,
						deviceStorageDisclosureUrl: Y.deviceStorageDisclosureUrl ?? null,
						usesCookies: Y.usesCookies,
						cookieMaxAgeSeconds: Y.cookieMaxAgeSeconds,
						cookieRefresh: Y.cookieRefresh,
						legitimateInterestUrl:
							Y.urls?.find((Ee) => Ee.legIntClaim)?.legIntClaim ?? null,
						specialPurposes: Y.specialPurposes || [],
						specialFeatures: Y.specialFeatures || [],
						features: Y.features || [],
						purposes: Y.purposes || [],
						legIntPurposes: Y.legIntPurposes || [],
						usesLegitimateInterest:
							!!_t && (Y.legIntPurposes?.includes(_t) ?? !1),
						dataRetention: Y.dataRetention,
						isCustom: !1,
					}),
					Dr = Object.entries(U.purposes)
						.map(([J, Y]) => {
							let _t = Object.entries(U.vendors)
									.filter(
										([, re]) =>
											re.purposes?.includes(Number(J)) ||
											re.legIntPurposes?.includes(Number(J))
									)
									.map(([re, bo]) => Re(re, bo, Number(J))),
								Ee = Ie.filter(
									(re) =>
										re.purposes?.includes(Number(J)) ||
										re.legIntPurposes?.includes(Number(J))
								).map((re) => {
									let bo;
									return (
										(bo = Number(J)),
										{
											id: re.id,
											name: re.name,
											policyUrl: re.privacyPolicyUrl,
											usesNonCookieAccess: re.usesNonCookieAccess ?? !1,
											deviceStorageDisclosureUrl: null,
											usesCookies: re.usesCookies ?? !1,
											cookieMaxAgeSeconds: re.cookieMaxAgeSeconds ?? null,
											cookieRefresh: void 0,
											legitimateInterestUrl: null,
											specialPurposes: [],
											specialFeatures: re.specialFeatures || [],
											features: re.features || [],
											purposes: re.purposes || [],
											legIntPurposes: re.legIntPurposes || [],
											usesLegitimateInterest:
												!!bo && (re.legIntPurposes?.includes(bo) ?? !1),
											dataRetention: void 0,
											isCustom: !0,
										}
									);
								});
							return {
								id: Number(J),
								name: Y.name,
								description: Y.description,
								descriptionLegal: Y.descriptionLegal,
								illustrations: Y.illustrations || [],
								vendors: [..._t, ...Ee],
							};
						})
						.filter((J) => J.vendors.length > 0),
					nc = Object.entries(U.specialPurposes || {})
						.map(([J, Y]) => {
							let _t = Object.entries(U.vendors)
								.filter(([, Ee]) => Ee.specialPurposes?.includes(Number(J)))
								.map(([Ee, re]) => Re(Ee, re));
							return {
								id: Number(J),
								name: Y.name,
								description: Y.description,
								descriptionLegal: Y.descriptionLegal,
								illustrations: Y.illustrations || [],
								vendors: _t,
								isSpecialPurpose: !0,
							};
						})
						.filter((J) => J.vendors.length > 0),
					kf = Object.entries(U.specialFeatures || {})
						.map(([J, Y]) => {
							let _t = Object.entries(U.vendors)
								.filter(([, Ee]) => Ee.specialFeatures?.includes(Number(J)))
								.map(([Ee, re]) => Re(Ee, re));
							return {
								id: Number(J),
								name: Y.name,
								description: Y.description,
								descriptionLegal: Y.descriptionLegal,
								illustrations: Y.illustrations || [],
								vendors: _t,
							};
						})
						.filter((J) => J.vendors.length > 0),
					JT = Object.entries(U.features || {})
						.map(([J, Y]) => {
							let _t = Object.entries(U.vendors)
								.filter(([, Ee]) => Ee.features?.includes(Number(J)))
								.map(([Ee, re]) => Re(Ee, re));
							return {
								id: Number(J),
								name: Y.name,
								description: Y.description,
								descriptionLegal: Y.descriptionLegal,
								illustrations: Y.illustrations || [],
								vendors: _t,
							};
						})
						.filter((J) => J.vendors.length > 0),
					Rh = Dr.find((J) => J.id === 1),
					wf = Dr.filter((J) => J.id !== 1),
					WT = new Set(wf.map((J) => J.id)),
					$T = U.stacks || {},
					Af = [];
				for (let [J, Y] of Object.entries($T)) {
					let _t = Number(J),
						Ee = Y.purposes.filter((re) => WT.has(re));
					Ee.length >= 2 &&
						Af.push({
							stackId: _t,
							stack: Y,
							coveredPurposeIds: Ee,
							score: Ee.length,
						});
				}
				Af.sort((J, Y) => Y.score - J.score);
				let Eh = [],
					Rf = new Set();
				for (let { stackId: J, stack: Y, coveredPurposeIds: _t } of Af) {
					let Ee = _t.filter((re) => !Rf.has(re));
					if (Ee.length >= 2) {
						let re = wf.filter((bo) => Ee.includes(bo.id));
						for (let bo of (Eh.push({
							id: J,
							name: Y.name,
							description: Y.description,
							purposes: re,
						}),
						Ee))
							Rf.add(bo);
					}
				}
				let Ih = wf.filter((J) => !Rf.has(J.id));
				return {
					purposes: Dr,
					specialPurposes: nc,
					specialFeatures: kf,
					features: JT,
					stacks: Eh,
					standalonePurposes: Rh ? [Rh, ...Ih] : Ih,
				};
			}, [d?.gvl, d?.nonIABVendors]),
			tc = (0, ve.useMemo)(
				() =>
					d?.gvl
						? Object.keys(d.gvl.vendors).length + (d.nonIABVendors?.length ?? 0)
						: 0,
				[d?.gvl, d?.nonIABVendors]
			),
			Xo = (0, ve.useCallback)(
				(U, Ie) => {
					d?.setPurposeConsent(U, Ie);
				},
				[d]
			),
			z = (0, ve.useCallback)(
				(U, Ie) => {
					d?.setSpecialFeatureOptIn(U, Ie);
				},
				[d]
			),
			Ae = (0, ve.useCallback)(
				(U, Ie) => {
					d?.setVendorConsent(U, Ie);
				},
				[d]
			),
			go = (0, ve.useCallback)(
				(U, Ie) => {
					d?.setVendorLegitimateInterest(U, Ie);
				},
				[d]
			),
			Th = (0, ve.useCallback)(
				(U, Ie) => {
					d?.setPurposeLegitimateInterest(U, Ie);
				},
				[d]
			),
			rs = (U) => {
				A(U), h('vendors'), d?.setPreferenceCenterTab('vendors');
			};
		pn(!!(P && ge.trapFocus), y),
			dn(!!(P && ge.scrollLock)),
			(0, ve.useEffect)(() => {
				N(!0);
			}, []),
			(0, ve.useEffect)(() => {
				if (P) Z(!0);
				else if (ge.disableAnimation) Z(!1);
				else {
					let U = setTimeout(() => {
						Z(!1);
					}, 150);
					return () => clearTimeout(U);
				}
			}, [P, ge.disableAnimation]),
			(0, ve.useEffect)(() => {
				P && d?.preferenceCenterTab && h(d.preferenceCenterTab);
			}, [P, d?.preferenceCenterTab]),
			(0, ve.useLayoutEffect)(() => {
				let U,
					Ie,
					Re = b.current;
				if (!Re || g.current === null) return;
				let Dr = g.current;
				if (
					((g.current = null),
					!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
				)
					return (
						(Re.style.height = `${Dr}px`),
						(Re.style.overflow = 'hidden'),
						(Re.style.transition = 'none'),
						(U = requestAnimationFrame(() => {
							Ie = requestAnimationFrame(() => {
								if (!Re) return;
								Re.style.height = 'auto';
								let nc = Re.getBoundingClientRect().height;
								if (((Re.style.height = `${Dr}px`), 1 > Math.abs(Dr - nc))) {
									(Re.style.height = ''),
										(Re.style.overflow = ''),
										(Re.style.transition = '');
									return;
								}
								Re.offsetHeight,
									(Re.style.transition =
										'height 250ms cubic-bezier(0.33, 1, 0.68, 1)'),
									(Re.style.height = `${nc}px`),
									Re.addEventListener(
										'transitionend',
										(kf) => {
											kf.propertyName === 'height' &&
												((Re.style.height = ''),
												(Re.style.overflow = ''),
												(Re.style.transition = ''));
										},
										{ once: !0 }
									);
							});
						})),
						() => {
							cancelAnimationFrame(U), cancelAnimationFrame(Ie);
						}
					);
			}, [m]);
		let kh = (0, ve.useCallback)(
			(U) => {
				b.current && (g.current = b.current.offsetHeight),
					h(U),
					d?.setPreferenceCenterTab(U);
			},
			[d]
		);
		if (!_ || !d?.config.enabled) return null;
		let Ta = d.isLoadingGVL || !d.gvl,
			ZT = (0, V.jsxs)(Dt.Provider, {
				value: { uiSource: l ?? 'iab_dialog' },
				children: [
					(0, V.jsx)(ta, { isOpen: P }),
					(0, V.jsx)('div', {
						className: `${S.root} ${B ? S.dialogVisible : S.dialogHidden}`,
						'data-testid': 'iab-consent-dialog-root',
						dir: C,
						children: (0, V.jsxs)('div', {
							ref: y,
							className: `${S.card} ${B ? S.contentVisible : S.contentHidden}`,
							role: 'dialog',
							'aria-modal': ge.trapFocus ? 'true' : void 0,
							'aria-label': u.preferenceCenter.title,
							tabIndex: 0,
							'data-testid': 'iab-consent-dialog-card',
							children: [
								(0, V.jsxs)('div', {
									className: S.header,
									children: [
										(0, V.jsxs)('div', {
											className: S.headerContent,
											children: [
												(0, V.jsx)('h2', {
													className: S.title,
													children: u.preferenceCenter.title,
												}),
												(0, V.jsx)('p', {
													className: S.description,
													children: u.preferenceCenter.description,
												}),
											],
										}),
										(0, V.jsx)('button', {
											type: 'button',
											onClick: () => {
												c('none');
											},
											className: S.closeButton,
											'aria-label': 'Close',
											children: (0, V.jsxs)('svg', {
												style: { width: '1rem', height: '1rem' },
												viewBox: '0 0 24 24',
												fill: 'none',
												stroke: 'currentColor',
												strokeWidth: '2',
												children: [
													(0, V.jsx)('line', {
														x1: '18',
														y1: '6',
														x2: '6',
														y2: '18',
													}),
													(0, V.jsx)('line', {
														x1: '6',
														y1: '6',
														x2: '18',
														y2: '18',
													}),
												],
											}),
										}),
									],
								}),
								(0, V.jsx)('div', {
									className: S.tabsContainer,
									children: (0, V.jsxs)('div', {
										className: S.tabsList,
										role: 'tablist',
										children: [
											(0, V.jsxs)('button', {
												type: 'button',
												role: 'tab',
												'aria-selected': m === 'purposes',
												onClick: () => kh('purposes'),
												className: S.tabButton,
												'data-state': m === 'purposes' ? 'active' : 'inactive',
												children: [
													u.preferenceCenter.tabs.purposes,
													!Ta &&
														` (${at.length + Ct.length + os.length + Br.length})`,
												],
											}),
											(0, V.jsxs)('button', {
												type: 'button',
												role: 'tab',
												'aria-selected': m === 'vendors',
												onClick: () => kh('vendors'),
												className: S.tabButton,
												'data-state': m === 'vendors' ? 'active' : 'inactive',
												children: [
													u.preferenceCenter.tabs.vendors,
													!Ta && ` (${tc})`,
												],
											}),
											(0, V.jsx)('div', {
												className: S.tabIndicator,
												'data-active-tab': m,
												'aria-hidden': 'true',
											}),
										],
									}),
								}),
								(0, V.jsx)('div', {
									ref: b,
									className: S.content,
									children: Ta
										? (0, V.jsxs)('div', {
												className: S.loadingContainer,
												children: [
													(0, V.jsx)('div', { className: S.loadingSpinner }),
													(0, V.jsx)('p', {
														className: S.loadingText,
														children: u.common.loading,
													}),
												],
											})
										: m === 'purposes'
											? (0, V.jsxs)(V.Fragment, {
													children: [
														xa.map((U) =>
															(0, V.jsx)(
																ko,
																{
																	purpose: U,
																	isEnabled: d.purposeConsents[U.id] ?? !1,
																	onToggle: (Ie) => Xo(U.id, Ie),
																	vendorConsents: d.vendorConsents,
																	onVendorToggle: Ae,
																	onVendorClick: rs,
																	vendorLegitimateInterests:
																		d.vendorLegitimateInterests,
																	onVendorLegitimateInterestToggle: go,
																	purposeLegitimateInterests:
																		d.purposeLegitimateInterests,
																	onPurposeLegitimateInterestToggle: Th,
																},
																U.id
															)
														),
														Tf.map((U) =>
															(0, V.jsx)(
																Yu,
																{
																	stack: U,
																	consents: d.purposeConsents,
																	onToggle: Xo,
																	vendorConsents: d.vendorConsents,
																	onVendorToggle: Ae,
																	onVendorClick: rs,
																	vendorLegitimateInterests:
																		d.vendorLegitimateInterests,
																	onVendorLegitimateInterestToggle: go,
																	purposeLegitimateInterests:
																		d.purposeLegitimateInterests,
																	onPurposeLegitimateInterestToggle: Th,
																},
																U.id
															)
														),
														os.map((U) =>
															(0, V.jsx)(
																ko,
																{
																	purpose: {
																		id: U.id,
																		name: U.name,
																		description: U.description,
																		illustrations: U.illustrations,
																		vendors: U.vendors,
																	},
																	isEnabled: d.specialFeatureOptIns[U.id] ?? !1,
																	onToggle: (Ie) => z(U.id, Ie),
																	vendorConsents: d.vendorConsents,
																	onVendorToggle: Ae,
																	onVendorClick: rs,
																	vendorLegitimateInterests:
																		d.vendorLegitimateInterests,
																	onVendorLegitimateInterestToggle: go,
																},
																`feature-${U.id}`
															)
														),
														(Ct.length > 0 || Br.length > 0) &&
															(0, V.jsxs)('div', {
																className: S.specialPurposesSection,
																children: [
																	(0, V.jsxs)('div', {
																		className: S.specialPurposesHeader,
																		children: [
																			(0, V.jsxs)('button', {
																				type: 'button',
																				onClick: () => L(!x),
																				className: S.purposeTrigger,
																				children: [
																					(0, V.jsx)('svg', {
																						className: S.purposeArrow,
																						viewBox: '0 0 24 24',
																						fill: 'none',
																						stroke: 'currentColor',
																						strokeWidth: '2',
																						children: x
																							? (0, V.jsx)('path', {
																									d: 'M19 9l-7 7-7-7',
																								})
																							: (0, V.jsx)('path', {
																									d: 'M9 5l7 7-7 7',
																								}),
																					}),
																					(0, V.jsxs)('div', {
																						className: S.purposeInfo,
																						children: [
																							(0, V.jsxs)('h3', {
																								className:
																									S.specialPurposesTitle,
																								children: [
																									u.preferenceCenter
																										.specialPurposes.title,
																									(0, V.jsxs)('svg', {
																										className: S.lockIcon,
																										viewBox: '0 0 24 24',
																										fill: 'none',
																										stroke: 'currentColor',
																										strokeWidth: '2',
																										children: [
																											(0, V.jsx)('rect', {
																												x: '3',
																												y: '11',
																												width: '18',
																												height: '11',
																												rx: '2',
																												ry: '2',
																											}),
																											(0, V.jsx)('path', {
																												d: 'M7 11V7a5 5 0 0 1 10 0v4',
																											}),
																										],
																									}),
																								],
																							}),
																							(0, V.jsxs)('p', {
																								className: S.purposeMeta,
																								children: [
																									new Set([
																										...Ct.flatMap((U) =>
																											U.vendors.map(
																												(Ie) => Ie.id
																											)
																										),
																										...Br.flatMap((U) =>
																											U.vendors.map(
																												(Ie) => Ie.id
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
																			(0, V.jsx)('div', {
																				style: { position: 'relative' },
																				children: (0, V.jsxs)('svg', {
																					className: S.infoIcon,
																					viewBox: '0 0 24 24',
																					fill: 'none',
																					stroke: 'currentColor',
																					strokeWidth: '2',
																					'aria-label':
																						u.preferenceCenter.specialPurposes
																							.tooltip,
																					children: [
																						(0, V.jsx)('circle', {
																							cx: '12',
																							cy: '12',
																							r: '10',
																						}),
																						(0, V.jsx)('line', {
																							x1: '12',
																							y1: '16',
																							x2: '12',
																							y2: '12',
																						}),
																						(0, V.jsx)('line', {
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
																	x &&
																		(0, V.jsxs)('div', {
																			style: { padding: '0.75rem' },
																			children: [
																				Ct.map((U) =>
																					(0, V.jsx)(
																						ko,
																						{
																							purpose: U,
																							isEnabled: !0,
																							onToggle: () => {},
																							vendorConsents: d.vendorConsents,
																							onVendorToggle: Ae,
																							onVendorClick: rs,
																							isLocked: !0,
																						},
																						`special-${U.id}`
																					)
																				),
																				Br.map((U) =>
																					(0, V.jsx)(
																						ko,
																						{
																							purpose: {
																								id: U.id,
																								name: U.name,
																								description: U.description,
																								illustrations: U.illustrations,
																								vendors: U.vendors,
																							},
																							isEnabled: !0,
																							onToggle: () => {},
																							vendorConsents: d.vendorConsents,
																							onVendorToggle: Ae,
																							onVendorClick: rs,
																							isLocked: !0,
																						},
																						`feature-${U.id}`
																					)
																				),
																			],
																		}),
																],
															}),
														(0, V.jsx)('div', {
															className: S.consentNotice,
															children: (0, V.jsx)('p', {
																className: S.consentNoticeText,
																children:
																	u.preferenceCenter.footer.consentStorage,
															}),
														}),
													],
												})
											: (0, V.jsx)(Xu, {
													vendorData: d.gvl,
													purposes: at,
													vendorConsents: d.vendorConsents,
													onVendorToggle: Ae,
													selectedVendorId: k,
													onClearSelection: () => A(null),
													customVendors: d.nonIABVendors,
													vendorLegitimateInterests:
														d.vendorLegitimateInterests,
													onVendorLegitimateInterestToggle: go,
												}),
								}),
								(0, V.jsxs)('div', {
									className: S.footer,
									children: [
										(0, V.jsxs)('div', {
											className: S.footerButtons,
											children: [
												(0, V.jsx)(Xt, {
													variant: 'neutral',
													mode: 'stroke',
													size: 'small',
													onClick: () => {
														d?.rejectAll(), d?.save(), c('none');
													},
													disabled: Ta,
													children: u.common.rejectAll,
												}),
												(0, V.jsx)(Xt, {
													variant: 'neutral',
													mode: 'stroke',
													size: 'small',
													onClick: () => {
														d?.acceptAll(), d?.save(), c('none');
													},
													disabled: Ta,
													children: u.common.acceptAll,
												}),
											],
										}),
										(0, V.jsx)('div', { className: S.footerSpacer }),
										(0, V.jsx)(Xt, {
											variant: 'primary',
											mode: 'filled',
											size: 'small',
											onClick: () => {
												d?.save(), c('none');
											},
											disabled: Ta,
											children: u.common.saveSettings,
										}),
									],
								}),
								!a &&
									(0, V.jsx)('div', {
										className: S.branding,
										children: (0, V.jsx)(pp, { hideBranding: a ?? !1 }),
									}),
							],
						}),
					}),
				],
			}),
			wh = i === !0 ? {} : i === !1 ? null : i,
			Ah = wh ? (0, V.jsx)(rr, { ...wh }) : null;
		return P || B
			? (0, V.jsxs)(V.Fragment, {
					children: [Ah, (0, u5.createPortal)(ZT, document.body)],
				})
			: Ah;
	};
	var Mp = Object.assign(d5, {
		Root: Op,
		Card: Rp,
		Header: Lp,
		Tabs: Bp,
		TabButton: Dp,
		Content: Ep,
		Footer: Np,
		Overlay: ta,
		PurposeItem: ko,
		StackItem: Yu,
		VendorList: Xu,
	});
	var f5 = w(j(), 1);
	function m5(e) {
		(0, f5.useEffect)(() => {
			if (e !== null) return ky(e);
		}, [e]);
	}
	var el = w(H(), 1);
	var QE = {
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
		p5 = {
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
			dark: QE,
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
		ZE = {
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
	function jp(e, t = !1) {
		let n = {},
			o = t ? { ...e.colors, ...e.dark } : e.colors;
		for (let [r, a] of Object.entries(ZE)) {
			let i = a(e, o);
			i && (n[r] = i);
		}
		return n;
	}
	function zp(e) {
		let t = jp(e, !1),
			n = jp(e, !0),
			o = Object.entries(t)
				.filter(([, a]) => a !== void 0)
				.map(([a, i]) => `${a}: ${i};`)
				.join(`
`),
			r = Object.entries(n)
				.filter(([, a]) => a !== void 0)
				.map(([a, i]) => `${a}: ${i};`)
				.join(`
`);
		return `
:root, .c15t-theme-root {
${o}
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
	var Jt = w(j(), 1);
	var g5 = p5;
	var b5 = '2.0.0-rc.3';
	function Vp({ children: e, options: t }) {
		let { consentManager: n, consentStore: o } = (0, Jt.useMemo)(
				() => Lm(t, { pkg: '@c15t/react', version: b5 }),
				[t]
			),
			[r, a] = (0, Jt.useState)(() => (o ? o.getState() : {})),
			i = (0, Jt.useRef)(!1);
		(0, Jt.useEffect)(() => {
			if (!o) return;
			let d = o.subscribe(a);
			if (!i.current) {
				let f = o.getState();
				(0, Jt.startTransition)(() => {
					a((c) => (c !== f ? ((i.current = !0), f) : ((i.current = !0), c)));
				});
			}
			return d;
		}, [o]);
		let s = (0, Jt.useMemo)(() => {
				let {
					theme: d = {},
					noStyle: f,
					disableAnimation: c,
					trapFocus: p = !0,
					colorScheme: v,
				} = t;
				return {
					theme: Vm(g5, d),
					noStyle: f,
					disableAnimation: c,
					trapFocus: p,
					colorScheme: v,
				};
			}, [t]),
			l = (0, Jt.useMemo)(() => zp(s.theme), [s.theme]);
		m5(t.colorScheme);
		let u = (0, Jt.useMemo)(() => {
			if (!o)
				throw Error(
					'Consent store must be initialized before creating context value'
				);
			return { state: r, store: o, manager: n };
		}, [r, o, n]);
		return (0, el.jsx)(Pc.Provider, {
			value: u,
			children: (0, el.jsxs)(Yc.Provider, {
				value: s,
				children: [
					l
						? (0, el.jsx)('style', {
								id: 'c15t-theme',
								dangerouslySetInnerHTML: { __html: l },
							})
						: null,
					e,
				],
			}),
		});
	}
	var qT = w(GT(), 1),
		TN = '2.0.0-rc.3',
		FT = 'c15t-embed-root',
		kN = 'c15t-devtools-overrides',
		YT = 'c15t:embed:payload',
		yh = null;
	function wN() {
		if (typeof document > 'u') return null;
		let e = document.currentScript;
		if (e instanceof HTMLScriptElement) return e;
		let t = document.querySelectorAll('script[src]');
		for (let n = t.length - 1; n >= 0; n -= 1) {
			let o = t[n];
			if (o?.src)
				try {
					if (
						new URL(o.src, window.location.href).pathname
							.replace(/\/+$/, '')
							.endsWith('/embed.js')
					)
						return o;
				} catch {}
		}
		return null;
	}
	function AN(e) {
		if (!e?.src) return '';
		let t = new URL(e.src, window.location.href),
			n = t.pathname.replace(/\/+$/, '');
		if (!n.endsWith('/embed.js')) return '';
		let o = n.slice(0, -9);
		return o ? `${t.origin}${o}` : '';
	}
	function XT(e) {
		return e !== void 0 ? e : typeof window > 'u' ? '' : AN(wN());
	}
	function RN(e) {
		if (e instanceof HTMLElement) return e;
		if (typeof document > 'u')
			throw new Error('Cannot mount c15t/embed outside a browser environment');
		if (typeof e == 'string') {
			let o = document.querySelector(e);
			if (!o) throw new Error(`Mount target not found: ${e}`);
			return o;
		}
		let t = document.getElementById(FT);
		if (t) return t;
		let n = document.createElement('div');
		return (n.id = FT), document.body.appendChild(n), n;
	}
	function EN(e) {
		return Promise.resolve({ init: e.init, gvl: e.init.gvl ?? void 0 });
	}
	function vh(e) {
		if (typeof e != 'string') return;
		let t = e.trim();
		return t.length > 0 ? t : void 0;
	}
	function IN(e) {
		return typeof e == 'boolean' ? e : void 0;
	}
	function NN(e) {
		if (!(typeof window > 'u'))
			try {
				let t = window.localStorage.getItem(e);
				if (!t) return;
				let n = JSON.parse(t);
				if (!n || typeof n != 'object') return;
				let o = n,
					r = vh(o.country),
					a = vh(o.region),
					i = vh(o.language),
					s = IN(o.gpc);
				return !r && !a && !i && s === void 0
					? void 0
					: {
							...(r !== void 0 ? { country: r } : {}),
							...(a !== void 0 ? { region: a } : {}),
							...(i !== void 0 ? { language: i } : {}),
							...(s !== void 0 ? { gpc: s } : {}),
						};
			} catch {
				return;
			}
	}
	function LN(e, t) {
		let n = t.overrides ?? e.options?.overrides,
			o = t.devToolsOverridesStorageKey ?? kN,
			r = NN(o);
		if (!n && !r) return;
		let i = {
			...{
				...(n?.country !== void 0 ? { country: n.country } : {}),
				...(n?.region !== void 0 ? { region: n.region } : {}),
				...(n?.language !== void 0 ? { language: n.language } : {}),
				...(n?.gpc !== void 0 ? { gpc: n.gpc } : {}),
			},
			...(r ?? {}),
		};
		if (!(!i.country && !i.region && !i.language && i.gpc === void 0)) return i;
	}
	function _N(e, t) {
		let n = t.storeNamespace ?? e.options?.store?.namespace ?? 'c15tStore',
			o = t.storageKey ?? e.options?.store?.storageKey,
			r = o ? { storageKey: o } : void 0;
		return {
			mode: 'c15t',
			backendURL: XT(t.backendURL),
			store: { namespace: n },
			storageConfig: r,
			ssrData: EN(e),
			overrides: LN(e, t),
			noStyle: e.options?.ui?.noStyle,
			disableAnimation: e.options?.ui?.disableAnimation,
			scrollLock: e.options?.ui?.scrollLock,
			trapFocus: e.options?.ui?.trapFocus,
			colorScheme: e.options?.ui?.colorScheme,
			theme: e.options?.theme,
		};
	}
	function Ch(e = window) {
		return e.__c15tEmbedPayload;
	}
	function Sh() {
		yh?.unmount(), (yh = null);
	}
	function xh(e, t = {}) {
		let n = RN(t.mountTarget);
		n.setAttribute('data-c15t-embed-runtime', 'true'), Sh();
		let o = _N(e, t),
			r = (0, qT.createRoot)(n);
		r.render(
			(0, Or.jsxs)(Vp, {
				options: o,
				children: [
					(0, Or.jsx)(Qm, { models: ['opt-in', 'opt-out'] }),
					(0, Or.jsx)(Ap, {}),
					(0, Or.jsx)(Mp, {}),
					(0, Or.jsx)(rr, {}),
					(0, Or.jsx)(bp, {}),
				],
			})
		),
			(yh = r);
	}
	function KT(e = {}, t = window) {
		let n = Ch(t);
		return n ? (xh(n, e), !0) : !1;
	}
	function ON(e) {
		if (document.readyState === 'loading')
			return void document.addEventListener(
				'DOMContentLoaded',
				() => {
					e.bootstrap();
				},
				{ once: !0 }
			);
		e.bootstrap();
	}
	function QT() {
		return {
			version: TN,
			mount: xh,
			bootstrap: (e) => KT(e),
			unmount: Sh,
			getPayload: () => Ch(),
		};
	}
	function BN() {
		if (typeof window > 'u' || typeof document > 'u') return null;
		if (window.__c15tEmbedRuntimeInitialized && window.c15tEmbed)
			return window.c15tEmbed;
		let e = QT();
		return (
			(window.c15tEmbed = e),
			(window.__c15tEmbedRuntimeInitialized = !0),
			window.addEventListener(YT, () => {
				e.bootstrap();
			}),
			ON(e),
			e
		);
	}
	return ik(DN);
})();
/*! Bundled license information:

react/cjs/react-jsx-runtime.production.js:
  (**
   * @license React
   * react-jsx-runtime.production.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react.production.js:
  (**
   * @license React
   * react.production.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react-dom/cjs/react-dom.production.js:
  (**
   * @license React
   * react-dom.production.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

scheduler/cjs/scheduler.production.js:
  (**
   * @license React
   * scheduler.production.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react-dom/cjs/react-dom-client.production.js:
  (**
   * @license React
   * react-dom-client.production.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/
