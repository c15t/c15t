'use strict';
var c15tEmbedBundle = (() => {
	var ln = Object.defineProperty;
	var mp = Object.getOwnPropertyDescriptor;
	var gp = Object.getOwnPropertyNames;
	var hp = Object.prototype.hasOwnProperty;
	var bp = (e, t, o) =>
		t in e
			? ln(e, t, { enumerable: !0, configurable: !0, writable: !0, value: o })
			: (e[t] = o);
	var k = (e, t) => () => (e && (t = e((e = 0))), t);
	var Lt = (e, t) => {
			for (var o in t) ln(e, o, { get: t[o], enumerable: !0 });
		},
		yp = (e, t, o, n) => {
			if ((t && typeof t == 'object') || typeof t == 'function')
				for (let r of gp(t))
					!hp.call(e, r) &&
						r !== o &&
						ln(e, r, {
							get: () => t[r],
							enumerable: !(n = mp(t, r)) || n.enumerable,
						});
			return e;
		};
	var vp = (e) => yp(ln({}, '__esModule', { value: !0 }), e);
	var y = (e, t, o) => bp(e, typeof t != 'symbol' ? t + '' : t, o);
	function Gi(e) {
		return !(!e || typeof e != 'object' || Array.isArray(e));
	}
	function $i(e, t) {
		if (!e && !t) return {};
		let o = {};
		if (e) for (let n of Object.keys(e)) o[n] = e[n];
		if (!t) return o;
		for (let n of Object.keys(t)) {
			let r = t[n];
			if (r === void 0) continue;
			let s = e ? e[n] : void 0;
			Gi(s) && Gi(r) ? (o[n] = $i(s, r)) : (o[n] = r);
		}
		return o;
	}
	function Fr(e, t) {
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
			(s || i) && (n[r] = $i(s, i));
		}
		return n;
	}
	function Cp(e) {
		return e
			? e
					.split(',')
					.map((t) => t.split(';')[0]?.trim().toLowerCase())
					.filter((t) => !!t)
					.map((t) => t.split('-')[0] ?? t)
			: [];
	}
	function Vr(e, t) {
		let o = t?.fallback ?? 'en';
		if (!e.length) return o;
		let n = Cp(t?.header);
		for (let r of n) if (e.includes(r)) return r;
		return o;
	}
	function qi(e, t) {
		let o = { en: mt },
			n = [e.translations, t?.translations];
		for (let r of n)
			if (r)
				for (let [s, i] of Object.entries(r)) {
					if (!i) continue;
					let a = o[s] || o.en;
					o[s] = Fr(a, i);
				}
		return { ...e, ...t, translations: o };
	}
	function Wi(e, t, o = !1) {
		if (o || typeof window > 'u') return t || 'en';
		let n = window.navigator.language?.split('-')[0] || '';
		return n && n in e ? n : t || 'en';
	}
	function Ur(e, t) {
		let o = qi(e, t),
			n = Wi(o.translations, o.defaultLanguage, o.disableAutoLanguageSwitch);
		return { ...o, defaultLanguage: n };
	}
	var mt,
		yo = k(() => {
			'use strict';
			mt = {
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
	function Ji(e) {
		return e
			? {
					log: (...t) => console.log('[c15t]', ...t),
					debug: (...t) => console.debug('[c15t]', ...t),
				}
			: { log: Qi, debug: Qi };
	}
	function U() {
		return Xi;
	}
	function Zi(e) {
		Xi = Ji(e);
	}
	var Qi,
		Xi,
		gt = k(() => {
			'use strict';
			Qi = () => {};
			Xi = Ji(!1);
		});
	function dn(e) {
		return {
			expiryDays: e?.defaultExpiryDays ?? 365,
			crossSubdomain: e?.crossSubdomain ?? !1,
			domain: e?.defaultDomain ?? '',
			path: '/',
			secure: typeof window < 'u' && window.location.protocol === 'https:',
			sameSite: 'Lax',
		};
	}
	function _o() {
		if (typeof window > 'u') return '';
		let e = window.location.hostname;
		if (e === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(e)) return e;
		let t = e.split('.');
		return t.length >= 2 ? `.${t.slice(-2).join('.')}` : e;
	}
	var zr = k(() => {
		'use strict';
	});
	function $r(e) {
		let t = {};
		for (let [o, n] of Object.entries(e)) {
			let s = o.split('.').map((i) => Gr[i] || i);
			t[s.join('.')] = n;
		}
		return t;
	}
	function qr(e) {
		let t = {};
		for (let [o, n] of Object.entries(e)) {
			let s = o.split('.').map((i) => oa[i] || i);
			t[s.join('.')] = n;
		}
		return t;
	}
	var Gr,
		oa,
		Wr = k(() => {
			'use strict';
			(Gr = {
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
				(oa = Object.entries(Gr).reduce((e, [t, o]) => ((e[o] = t), e), {}));
		});
	function un(e, t = '') {
		let o = {};
		for (let [n, r] of Object.entries(e)) {
			let s = t ? `${t}.${n}` : n;
			r == null
				? (o[s] = '')
				: typeof r == 'boolean'
					? r && (o[s] = '1')
					: typeof r == 'object' && !Array.isArray(r)
						? Object.assign(o, un(r, s))
						: (o[s] = String(r));
		}
		return o;
	}
	function Kr(e) {
		let t = {};
		for (let [o, n] of Object.entries(e)) {
			let r = o.split('.');
			if (r.length === 0) continue;
			let s = t;
			for (let a = 0; a < r.length - 1; a++) {
				let c = r[a];
				c !== void 0 && (s[c] || (s[c] = {}), (s = s[c]));
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
	function Yr(e) {
		return Object.entries(e)
			.map(([t, o]) => `${t}:${o}`)
			.join(',');
	}
	function Qr(e) {
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
	var Jr = k(() => {
		'use strict';
	});
	function So(e, t, o, n) {
		if (typeof document > 'u') return;
		let r = { ...dn(n), ...o };
		r.crossSubdomain && !o?.domain && (r.domain = _o());
		try {
			let s;
			if (typeof t == 'string') s = t;
			else {
				let d = un(t),
					p = $r(d);
				s = Yr(p);
			}
			let i = new Date();
			i.setTime(i.getTime() + r.expiryDays * 24 * 60 * 60 * 1e3);
			let a = `expires=${i.toUTCString()}`,
				c = [`${e}=${s}`, a, `path=${r.path}`];
			r.domain && c.push(`domain=${r.domain}`),
				r.secure && c.push('secure'),
				r.sameSite && c.push(`SameSite=${r.sameSite}`),
				(document.cookie = c.join('; '));
		} catch (s) {
			console.warn(`Failed to set cookie "${e}":`, s);
		}
	}
	function pn(e) {
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
						let i = Qr(s),
							a = qr(i);
						return Kr(a);
					}
					return s;
				}
			}
			return null;
		} catch (t) {
			return console.warn(`Failed to get cookie "${e}":`, t), null;
		}
	}
	function xo(e, t, o) {
		if (typeof document > 'u') return;
		let n = { ...dn(o), ...t };
		n.crossSubdomain && !t?.domain && (n.domain = _o());
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
	var Xr = k(() => {
		'use strict';
		zr();
		Wr();
		Jr();
	});
	var Fe,
		fn = k(() => {
			'use strict';
			yo();
			Fe = {
				translations: { en: mt },
				defaultLanguage: 'en',
				disableAutoLanguageSwitch: !1,
			};
		});
	var Xe,
		rt,
		Nt = k(() => {
			'use strict';
			(Xe = [
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
				(rt = Xe.map((e) => e.name));
		});
	var na = k(() => {
		'use strict';
	});
	var ra = k(() => {
		'use strict';
	});
	var sa = k(() => {
		'use strict';
	});
	var ia = k(() => {
		'use strict';
	});
	var aa = k(() => {
		'use strict';
		Nt();
		na();
		ra();
		sa();
		ia();
	});
	var Ve,
		Dt = k(() => {
			'use strict';
			Ve = '2.0.0-rc.3';
		});
	var wo,
		Bt,
		ca,
		Zr = k(() => {
			'use strict';
			fn();
			aa();
			Dt();
			(wo = 'c15t'),
				(Bt = 'privacy-consent-storage'),
				(ca = {
					debug: !1,
					config: { pkg: 'c15t', version: Ve, mode: 'Unknown' },
					consents: Xe.reduce((e, t) => ((e[t.name] = t.defaultValue), e), {}),
					selectedConsents: Xe.reduce(
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
					translationConfig: Fe,
					user: void 0,
					networkBlocker: void 0,
					storageConfig: void 0,
					includeNonDisplayedConsents: !1,
					consentTypes: Xe,
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
	function Sp(e) {
		if (typeof e != 'object' || e === null) return !1;
		let o = e.consentInfo;
		if (!o || typeof o != 'object') return !1;
		let n = typeof o.id == 'string',
			r = typeof o.subjectId == 'string';
		return n && !r;
	}
	function xp(e) {
		let t = e?.storageKey || wo,
			o = Bt;
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
						U().log(`Migrated consent data from "${o}" to "${t}"`));
				}
			} catch (n) {
				console.warn('[c15t] Failed to migrate legacy storage:', n);
			}
	}
	function Ne(e, t, o) {
		let n = !1,
			r = !1,
			s = o?.storageKey || wo,
			i = Ue(o),
			c = {
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
		(!c.iabCustomVendorConsents ||
			Object.keys(c.iabCustomVendorConsents).length === 0) &&
			delete c.iabCustomVendorConsents,
			(!c.iabCustomVendorLegitimateInterests ||
				Object.keys(c.iabCustomVendorLegitimateInterests).length === 0) &&
				delete c.iabCustomVendorLegitimateInterests;
		try {
			typeof window < 'u' &&
				window.localStorage &&
				(window.localStorage.setItem(s, JSON.stringify(c)), (n = !0));
		} catch (d) {
			console.warn('Failed to save consent to localStorage:', d);
		}
		try {
			So(s, c, t, o), (r = !0);
		} catch (d) {
			console.warn('Failed to save consent to cookie:', d);
		}
		if (!n && !r)
			throw new Error('Failed to save consent to any storage method');
	}
	function es(e) {
		let t = e.consents || {},
			o = { ...t };
		for (let n of rt) o[n] = t[n] ?? !1;
		return { ...e, consents: o };
	}
	function Ue(e) {
		xp(e);
		let t = e?.storageKey || wo,
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
			n = pn(t);
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
					So(t, r, void 0, e),
						U().log('Synced consent from localStorage to cookie');
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
							(a = es(a));
						let c = null;
						try {
							let u = window.localStorage.getItem(t);
							if (u) {
								let l = JSON.parse(u);
								typeof l == 'object' && l !== null && 'consents' in l
									? (c = es(l))
									: (c = l);
							}
						} catch {
							c = null;
						}
						let d = JSON.stringify(a),
							p = JSON.stringify(c);
						d !== p &&
							(window.localStorage.setItem(t, d),
							c
								? i
									? U().log(
											'Updated localStorage with consent from cookie (cross-subdomain mode)'
										)
									: U().log('Updated localStorage with consent from cookie')
								: U().log('Synced consent from cookie to localStorage'));
					}
				} catch (a) {
					console.warn('[c15t] Failed to sync consent to localStorage:', a);
				}
		}
		return r && Sp(r)
			? (U().log(
					'Detected legacy consent format (v1.x). Re-consent required for v2.0.'
				),
				ko(void 0, e),
				null)
			: r && typeof r == 'object'
				? es(r)
				: r;
	}
	function ko(e, t) {
		let o = t?.storageKey || wo;
		try {
			typeof window < 'u' &&
				window.localStorage &&
				(window.localStorage.removeItem(o),
				o !== Bt && window.localStorage.removeItem(Bt));
		} catch (n) {
			console.warn('Failed to remove consent from localStorage:', n);
		}
		try {
			xo(o, e, t), o !== Bt && xo(Bt, e, t);
		} catch (n) {
			console.warn('Failed to remove consent cookie:', n);
		}
	}
	var la = k(() => {
		'use strict';
		Zr();
		Nt();
		gt();
		Xr();
	});
	var st = k(() => {
		'use strict';
		zr();
		Wr();
		Xr();
		Jr();
		la();
	});
	var ht,
		gn,
		hn = k(() => {
			'use strict';
			(ht = {
				TC_STRING_COOKIE: 'euconsent-v2',
				TC_STRING_LOCAL: 'euconsent-v2',
			}),
				(gn = 'https://gvl.consent.io');
		});
	var ss = {};
	Lt(ss, {
		clearGVLCache: () => ns,
		fetchGVL: () => ts,
		getCachedGVL: () => os,
		getMockGVL: () => kp,
		setMockGVL: () => rs,
	});
	async function ts(e, t = {}) {
		let o = typeof window < 'u' ? window.__c15t_mock_gvl : void 0;
		if (o !== void 0) return (bt = o), o;
		if (Mt !== void 0) return (bt = Mt), Mt;
		let { endpoint: n = gn, headers: r } = t,
			s = e ? [...e].sort((u, l) => u - l) : [],
			i = r ? JSON.stringify(r) : '',
			a = `${n}|${s.join(',')}|${i}`,
			c = bn.get(a);
		if (c) return c;
		let d = new URL(n);
		s.length > 0 && d.searchParams.set('vendorIds', s.join(','));
		let p = (async () => {
			try {
				let u = await fetch(d.toString(), { headers: r });
				if (u.status === 204) return (bt = null), null;
				if (!u.ok)
					throw new Error(`Failed to fetch GVL: ${u.status} ${u.statusText}`);
				let l = await u.json();
				if (!l.vendorListVersion || !l.purposes || !l.vendors)
					throw new Error('Invalid GVL response: missing required fields');
				return (bt = l), l;
			} finally {
				bn.delete(a);
			}
		})();
		return bn.set(a, p), p;
	}
	function os() {
		return bt;
	}
	function ns() {
		bn.clear(), (bt = void 0), (Mt = void 0);
	}
	function rs(e) {
		(Mt = e), e !== void 0 && (bt = e);
	}
	function kp() {
		return Mt;
	}
	var bn,
		bt,
		Mt,
		yn = k(() => {
			'use strict';
			hn();
			bn = new Map();
		});
	function Lp(e) {
		let t = BigInt(58),
			o = BigInt(0);
		for (let r of e) o = o * BigInt(256) + BigInt(r);
		let n = [];
		for (; o > 0; ) {
			let r = o % t;
			n.unshift(as.charAt(Number(r))), (o = o / t);
		}
		for (let r of e)
			if (r === 0) n.unshift(as.charAt(0));
			else break;
		return n.join('') || as.charAt(0);
	}
	function Ao() {
		let e = crypto.getRandomValues(new Uint8Array(20)),
			t = Date.now() - Op,
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
			`sub_${Lp(e)}`
		);
	}
	var as,
		Op,
		_n = k(() => {
			'use strict';
			as = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
			Op = 17e11;
		});
	var Nn,
		Dn,
		fs = k(() => {
			'use strict';
			Dt();
			(Nn = 0), (Dn = Ve);
		});
	function Up() {
		return {
			gdprApplies: void 0,
			cmpLoaded: !1,
			cmpStatus: 'stub',
			displayStatus: 'hidden',
			apiVersion: '2.3',
			cmpVersion: Ve,
			cmpId: 0,
			gvlVersion: 0,
			tcfPolicyVersion: 5,
		};
	}
	function Hp() {
		let e = [],
			t = (o, n, r, s) => {
				o === 'ping' ? r(Up(), !0) : e.push([o, n, r, s]);
			};
		return (t.queue = e), t;
	}
	function zp() {
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
	function Oa(e) {
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
	function Na() {
		typeof window > 'u' ||
			Bn ||
			(window.__tcfapi || (window.__tcfapi = Hp()),
			(Oo = zp()),
			window.addEventListener('message', Oa),
			(Bn = !0));
	}
	function Mn() {
		return typeof window > 'u' || !window.__tcfapi
			? []
			: (window.__tcfapi.queue ?? []);
	}
	function jn() {
		typeof window < 'u' &&
			window.__tcfapi?.queue &&
			(window.__tcfapi.queue = []);
	}
	function Da() {
		return typeof window > 'u' || !window.__tcfapi
			? !1
			: Array.isArray(window.__tcfapi.queue);
	}
	function Ba() {
		typeof window > 'u' ||
			(window.removeEventListener('message', Oa),
			Oo?.parentNode && (Oo.parentNode.removeChild(Oo), (Oo = null)),
			(Bn = !1));
	}
	function Ma() {
		return Bn;
	}
	var Bn,
		Oo,
		ms = k(() => {
			'use strict';
			Dt();
			(Bn = !1), (Oo = null);
		});
	var ce,
		ja = k(() => {
			ce = class extends Error {
				constructor(t) {
					super(t), (this.name = 'DecodingError');
				}
			};
		});
	var me,
		Fa = k(() => {
			me = class extends Error {
				constructor(t) {
					super(t), (this.name = 'EncodingError');
				}
			};
		});
	var ze,
		Va = k(() => {
			ze = class extends Error {
				constructor(t) {
					super(t), (this.name = 'GVLError');
				}
			};
		});
	var be,
		Ua = k(() => {
			be = class extends Error {
				constructor(t, o, n = '') {
					super(`invalid value ${o} passed for ${t} ${n}`),
						(this.name = 'TCModelError');
				}
			};
		});
	var ye = k(() => {
		ja();
		Fa();
		Va();
		Ua();
	});
	var Te,
		gs = k(() => {
			ye();
			Te = class {
				static encode(t) {
					if (!/^[0-1]+$/.test(t)) throw new me('Invalid bitField');
					let o = t.length % this.LCM;
					t += o ? '0'.repeat(this.LCM - o) : '';
					let n = '';
					for (let r = 0; r < t.length; r += this.BASIS)
						n += this.DICT[parseInt(t.substr(r, this.BASIS), 2)];
					return n;
				}
				static decode(t) {
					if (!/^[A-Za-z0-9\-_]+$/.test(t))
						throw new ce('Invalidly encoded Base64URL string');
					let o = '';
					for (let n = 0; n < t.length; n++) {
						let r = this.REVERSE_DICT.get(t[n]).toString(2);
						o += '0'.repeat(this.BASIS - r.length) + r;
					}
					return o;
				}
			};
			y(
				Te,
				'DICT',
				'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
			),
				y(
					Te,
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
				y(Te, 'BASIS', 6),
				y(Te, 'LCM', 24);
		});
	var Ge,
		No,
		Ha = k(() => {
			Ge = class Ge {
				has(t) {
					return Ge.langSet.has(t);
				}
				parseLanguage(t) {
					t = t.toUpperCase();
					let o = t.split('-')[0];
					if (t.length >= 2 && o.length == 2) {
						if (Ge.langSet.has(t)) return t;
						if (Ge.langSet.has(o)) return o;
						let n = o + '-' + o;
						if (Ge.langSet.has(n)) return n;
						for (let r of Ge.langSet)
							if (r.indexOf(t) !== -1 || r.indexOf(o) !== -1) return r;
					}
					throw new Error(`unsupported language ${t}`);
				}
				forEach(t) {
					Ge.langSet.forEach(t);
				}
				get size() {
					return Ge.langSet.size;
				}
			};
			y(
				Ge,
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
			No = Ge;
		});
	var S,
		hs = k(() => {
			S = class {};
			y(S, 'cmpId', 'cmpId'),
				y(S, 'cmpVersion', 'cmpVersion'),
				y(S, 'consentLanguage', 'consentLanguage'),
				y(S, 'consentScreen', 'consentScreen'),
				y(S, 'created', 'created'),
				y(S, 'supportOOB', 'supportOOB'),
				y(S, 'isServiceSpecific', 'isServiceSpecific'),
				y(S, 'lastUpdated', 'lastUpdated'),
				y(S, 'numCustomPurposes', 'numCustomPurposes'),
				y(S, 'policyVersion', 'policyVersion'),
				y(S, 'publisherCountryCode', 'publisherCountryCode'),
				y(S, 'publisherCustomConsents', 'publisherCustomConsents'),
				y(
					S,
					'publisherCustomLegitimateInterests',
					'publisherCustomLegitimateInterests'
				),
				y(S, 'publisherLegitimateInterests', 'publisherLegitimateInterests'),
				y(S, 'publisherConsents', 'publisherConsents'),
				y(S, 'publisherRestrictions', 'publisherRestrictions'),
				y(S, 'purposeConsents', 'purposeConsents'),
				y(S, 'purposeLegitimateInterests', 'purposeLegitimateInterests'),
				y(S, 'purposeOneTreatment', 'purposeOneTreatment'),
				y(S, 'specialFeatureOptins', 'specialFeatureOptins'),
				y(S, 'useNonStandardTexts', 'useNonStandardTexts'),
				y(S, 'vendorConsents', 'vendorConsents'),
				y(S, 'vendorLegitimateInterests', 'vendorLegitimateInterests'),
				y(S, 'vendorListVersion', 'vendorListVersion'),
				y(S, 'vendorsAllowed', 'vendorsAllowed'),
				y(S, 'vendorsDisclosed', 'vendorsDisclosed'),
				y(S, 'version', 'version');
		});
	var za = k(() => {});
	var Ga = k(() => {});
	var we,
		Ct = k(() => {
			we = class {
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
	var _e,
		Fn = k(() => {
			(function (e) {
				(e[(e.NOT_ALLOWED = 0)] = 'NOT_ALLOWED'),
					(e[(e.REQUIRE_CONSENT = 1)] = 'REQUIRE_CONSENT'),
					(e[(e.REQUIRE_LI = 2)] = 'REQUIRE_LI');
			})(_e || (_e = {}));
		});
	var Do,
		$e,
		bs = k(() => {
			Ct();
			ye();
			Fn();
			Do = class Do extends we {
				constructor(o, n) {
					super();
					y(this, 'purposeId_');
					y(this, 'restrictionType');
					o !== void 0 && (this.purposeId = o),
						n !== void 0 && (this.restrictionType = n);
				}
				static unHash(o) {
					let n = o.split(this.hashSeparator),
						r = new Do();
					if (n.length !== 2) throw new be('hash', o);
					return (
						(r.purposeId = parseInt(n[0], 10)),
						(r.restrictionType = parseInt(n[1], 10)),
						r
					);
				}
				get hash() {
					if (!this.isValid())
						throw new Error('cannot hash invalid PurposeRestriction');
					return `${this.purposeId}${Do.hashSeparator}${this.restrictionType}`;
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
						(this.restrictionType === _e.NOT_ALLOWED ||
							this.restrictionType === _e.REQUIRE_CONSENT ||
							this.restrictionType === _e.REQUIRE_LI)
					);
				}
				isSameAs(o) {
					return (
						this.purposeId === o.purposeId &&
						this.restrictionType === o.restrictionType
					);
				}
			};
			y(Do, 'hashSeparator', '-');
			$e = Do;
		});
	var _t,
		$a = k(() => {
			bs();
			Fn();
			Ct();
			_t = class extends we {
				constructor() {
					super(...arguments);
					y(this, 'bitLength', 0);
					y(this, 'map', new Map());
					y(this, 'gvl_');
				}
				has(o) {
					return this.map.has(o);
				}
				isOkToHave(o, n, r) {
					let s = !0;
					if (this.gvl?.vendors) {
						let i = this.gvl.vendors[r];
						if (i)
							if (o === _e.NOT_ALLOWED)
								s = i.legIntPurposes.includes(n) || i.purposes.includes(n);
							else if (i.flexiblePurposes.length)
								switch (o) {
									case _e.REQUIRE_CONSENT:
										s =
											i.flexiblePurposes.includes(n) &&
											i.legIntPurposes.includes(n);
										break;
									case _e.REQUIRE_LI:
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
							o ? r.has(o) && n.push($e.unHash(s)) : n.push($e.unHash(s));
						}),
						n
					);
				}
				getPurposes() {
					let o = new Set();
					return (
						this.map.forEach((n, r) => {
							o.add($e.unHash(r).purposeId);
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
							let s = $e.unHash(r);
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
	var ys,
		qa = k(() => {
			(function (e) {
				(e.COOKIE = 'cookie'), (e.WEB = 'web'), (e.APP = 'app');
			})(ys || (ys = {}));
		});
	var Wa = k(() => {});
	var V,
		vs = k(() => {
			(function (e) {
				(e.CORE = 'core'),
					(e.VENDORS_DISCLOSED = 'vendorsDisclosed'),
					(e.VENDORS_ALLOWED = 'vendorsAllowed'),
					(e.PUBLISHER_TC = 'publisherTC');
			})(V || (V = {}));
		});
	var Ze,
		Ka = k(() => {
			vs();
			Ze = class {};
			y(Ze, 'ID_TO_KEY', [
				V.CORE,
				V.VENDORS_DISCLOSED,
				V.VENDORS_ALLOWED,
				V.PUBLISHER_TC,
			]),
				y(Ze, 'KEY_TO_ID', {
					[V.CORE]: 0,
					[V.VENDORS_DISCLOSED]: 1,
					[V.VENDORS_ALLOWED]: 2,
					[V.PUBLISHER_TC]: 3,
				});
		});
	var le,
		Ya = k(() => {
			Ct();
			ye();
			le = class extends we {
				constructor() {
					super(...arguments);
					y(this, 'bitLength', 0);
					y(this, 'maxId_', 0);
					y(this, 'set_', new Set());
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
						throw new be(
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
	var Qa = k(() => {});
	var Ja = k(() => {});
	var Xa = k(() => {});
	var Za = k(() => {});
	var ec = k(() => {});
	var tc = k(() => {});
	var oc = k(() => {});
	var nc = k(() => {});
	var rc = k(() => {});
	var sc = k(() => {});
	var ic = k(() => {});
	var ac = k(() => {
		Qa();
		Ja();
		Xa();
		Za();
		ec();
		tc();
		oc();
		nc();
		rc();
		sc();
		ic();
	});
	var Se = k(() => {
		Ha();
		hs();
		za();
		Ga();
		bs();
		$a();
		qa();
		Wa();
		Fn();
		vs();
		Ka();
		Ya();
		ac();
	});
	var cc,
		lc,
		dc,
		uc,
		pc,
		fc,
		mc,
		gc,
		hc,
		bc,
		yc,
		vc,
		Cc,
		_c,
		Sc,
		xc,
		wc,
		kc,
		w,
		Vn = k(() => {
			Se();
			(kc = S.cmpId),
				(wc = S.cmpVersion),
				(xc = S.consentLanguage),
				(Sc = S.consentScreen),
				(_c = S.created),
				(Cc = S.isServiceSpecific),
				(vc = S.lastUpdated),
				(yc = S.policyVersion),
				(bc = S.publisherCountryCode),
				(hc = S.publisherLegitimateInterests),
				(gc = S.publisherConsents),
				(mc = S.purposeConsents),
				(fc = S.purposeLegitimateInterests),
				(pc = S.purposeOneTreatment),
				(uc = S.specialFeatureOptins),
				(dc = S.useNonStandardTexts),
				(lc = S.vendorListVersion),
				(cc = S.version);
			w = class {};
			y(w, kc, 12),
				y(w, wc, 12),
				y(w, xc, 12),
				y(w, Sc, 6),
				y(w, _c, 36),
				y(w, Cc, 1),
				y(w, vc, 36),
				y(w, yc, 6),
				y(w, bc, 12),
				y(w, hc, 24),
				y(w, gc, 24),
				y(w, mc, 24),
				y(w, fc, 24),
				y(w, pc, 1),
				y(w, uc, 12),
				y(w, dc, 1),
				y(w, lc, 12),
				y(w, cc, 6),
				y(w, 'anyBoolean', 1),
				y(w, 'encodingType', 1),
				y(w, 'maxId', 16),
				y(w, 'numCustomPurposes', 6),
				y(w, 'numEntries', 12),
				y(w, 'numRestrictions', 12),
				y(w, 'purposeId', 6),
				y(w, 'restrictionType', 2),
				y(w, 'segmentType', 3),
				y(w, 'singleOrRange', 1),
				y(w, 'vendorId', 16);
		});
	var Ic = k(() => {});
	var ge,
		Ut = k(() => {
			ge = class {
				static encode(t) {
					return String(Number(t));
				}
				static decode(t) {
					return t === '1';
				}
			};
		});
	var A,
		at = k(() => {
			ye();
			A = class {
				static encode(t, o) {
					let n;
					if (
						(typeof t == 'string' && (t = parseInt(t, 10)),
						(n = t.toString(2)),
						n.length > o || t < 0)
					)
						throw new me(`${t} too large to encode into ${o}`);
					return n.length < o && (n = '0'.repeat(o - n.length) + n), n;
				}
				static decode(t, o) {
					if (o !== t.length) throw new ce('invalid bit length');
					return parseInt(t, 2);
				}
			};
		});
	var Ht,
		Cs = k(() => {
			at();
			ye();
			Ht = class {
				static encode(t, o) {
					return A.encode(Math.round(t.getTime() / 100), o);
				}
				static decode(t, o) {
					if (o !== t.length) throw new ce('invalid bit length');
					let n = new Date();
					return n.setTime(A.decode(t, o) * 100), n;
				}
			};
		});
	var ke,
		Un = k(() => {
			Ut();
			ye();
			Se();
			ke = class {
				static encode(t, o) {
					let n = '';
					for (let r = 1; r <= o; r++) n += ge.encode(t.has(r));
					return n;
				}
				static decode(t, o) {
					if (t.length !== o) throw new ce('bitfield encoding length mismatch');
					let n = new le();
					for (let r = 1; r <= o; r++) ge.decode(t[r - 1]) && n.set(r);
					return (n.bitLength = t.length), n;
				}
			};
		});
	var zt,
		_s = k(() => {
			at();
			ye();
			zt = class {
				static encode(t, o) {
					t = t.toUpperCase();
					let n = 65,
						r = t.charCodeAt(0) - n,
						s = t.charCodeAt(1) - n;
					if (r < 0 || r > 25 || s < 0 || s > 25)
						throw new me(`invalid language code: ${t}`);
					if (o % 2 === 1)
						throw new me(`numBits must be even, ${o} is not valid`);
					o = o / 2;
					let i = A.encode(r, o),
						a = A.encode(s, o);
					return i + a;
				}
				static decode(t, o) {
					let n;
					if (o === t.length && !(t.length % 2)) {
						let s = t.length / 2,
							i = A.decode(t.slice(0, s), s) + 65,
							a = A.decode(t.slice(s), s) + 65;
						n = String.fromCharCode(i) + String.fromCharCode(a);
					} else throw new ce('invalid bit length for language');
					return n;
				}
			};
		});
	var Bo,
		Ss = k(() => {
			Vn();
			Ut();
			ye();
			at();
			Se();
			Bo = class {
				static encode(t) {
					let o = A.encode(t.numRestrictions, w.numRestrictions);
					if (!t.isEmpty()) {
						let n = (r, s) => {
							for (let i = r + 1; i <= s; i++)
								if (t.gvl.vendorIds.has(i)) return i;
							return r;
						};
						t.getRestrictions().forEach((r) => {
							(o += A.encode(r.purposeId, w.purposeId)),
								(o += A.encode(r.restrictionType, w.restrictionType));
							let s = t.getVendors(r),
								i = s.length,
								a = 0,
								c = 0,
								d = '';
							for (let p = 0; p < i; p++) {
								let u = s[p];
								if (
									(c === 0 && (a++, (c = u)),
									p === i - 1 || s[p + 1] > n(u, s[i - 1]))
								) {
									let l = u !== c;
									(d += ge.encode(l)),
										(d += A.encode(c, w.vendorId)),
										l && (d += A.encode(u, w.vendorId)),
										(c = 0);
								}
							}
							(o += A.encode(a, w.numEntries)), (o += d);
						});
					}
					return o;
				}
				static decode(t) {
					let o = 0,
						n = new _t(),
						r = A.decode(t.substr(o, w.numRestrictions), w.numRestrictions);
					o += w.numRestrictions;
					for (let s = 0; s < r; s++) {
						let i = A.decode(t.substr(o, w.purposeId), w.purposeId);
						o += w.purposeId;
						let a = A.decode(t.substr(o, w.restrictionType), w.restrictionType);
						o += w.restrictionType;
						let c = new $e(i, a),
							d = A.decode(t.substr(o, w.numEntries), w.numEntries);
						o += w.numEntries;
						for (let p = 0; p < d; p++) {
							let u = ge.decode(t.substr(o, w.anyBoolean));
							o += w.anyBoolean;
							let l = A.decode(t.substr(o, w.vendorId), w.vendorId);
							if (((o += w.vendorId), u)) {
								let m = A.decode(t.substr(o, w.vendorId), w.vendorId);
								if (((o += w.vendorId), m < l))
									throw new ce(
										`Invalid RangeEntry: endVendorId ${m} is less than ${l}`
									);
								for (let h = l; h <= m; h++) n.add(h, c);
							} else n.add(l, c);
						}
					}
					return (n.bitLength = o), n;
				}
			};
		});
	var St,
		xs = k(() => {
			(function (e) {
				(e[(e.FIELD = 0)] = 'FIELD'), (e[(e.RANGE = 1)] = 'RANGE');
			})(St || (St = {}));
		});
	var qe,
		ws = k(() => {
			Se();
			Hn();
			at();
			Ut();
			Un();
			xs();
			ye();
			qe = class {
				static encode(t) {
					let o = [],
						n = [],
						r = A.encode(t.maxId, w.maxId),
						s = '',
						i,
						a = w.maxId + w.encodingType,
						c = a + t.maxId,
						d = w.vendorId * 2 + w.singleOrRange + w.numEntries,
						p = a + w.numEntries;
					return (
						t.forEach((u, l) => {
							(s += ge.encode(u)),
								(i = t.maxId > d && p < c),
								i &&
									u &&
									(t.has(l + 1)
										? n.length === 0 &&
											(n.push(l), (p += w.singleOrRange), (p += w.vendorId))
										: (n.push(l), (p += w.vendorId), o.push(n), (n = [])));
						}),
						i
							? ((r += String(St.RANGE)), (r += this.buildRangeEncoding(o)))
							: ((r += String(St.FIELD)), (r += s)),
						r
					);
				}
				static decode(t, o) {
					let n,
						r = 0,
						s = A.decode(t.substr(r, w.maxId), w.maxId);
					r += w.maxId;
					let i = A.decode(t.charAt(r), w.encodingType);
					if (((r += w.encodingType), i === St.RANGE)) {
						if (((n = new le()), o === 1)) {
							if (t.substr(r, 1) === '1')
								throw new ce('Unable to decode default consent=1');
							r++;
						}
						let a = A.decode(t.substr(r, w.numEntries), w.numEntries);
						r += w.numEntries;
						for (let c = 0; c < a; c++) {
							let d = ge.decode(t.charAt(r));
							r += w.singleOrRange;
							let p = A.decode(t.substr(r, w.vendorId), w.vendorId);
							if (((r += w.vendorId), d)) {
								let u = A.decode(t.substr(r, w.vendorId), w.vendorId);
								r += w.vendorId;
								for (let l = p; l <= u; l++) n.set(l);
							} else n.set(p);
						}
					} else {
						let a = t.substr(r, s);
						(r += s), (n = ke.decode(a, s));
					}
					return (n.bitLength = r), n;
				}
				static buildRangeEncoding(t) {
					let o = t.length,
						n = A.encode(o, w.numEntries);
					return (
						t.forEach((r) => {
							let s = r.length === 1;
							(n += ge.encode(!s)),
								(n += A.encode(r[0], w.vendorId)),
								s || (n += A.encode(r[1], w.vendorId));
						}),
						n
					);
				}
			};
		});
	function zn() {
		return {
			[S.version]: A,
			[S.created]: Ht,
			[S.lastUpdated]: Ht,
			[S.cmpId]: A,
			[S.cmpVersion]: A,
			[S.consentScreen]: A,
			[S.consentLanguage]: zt,
			[S.vendorListVersion]: A,
			[S.policyVersion]: A,
			[S.isServiceSpecific]: ge,
			[S.useNonStandardTexts]: ge,
			[S.specialFeatureOptins]: ke,
			[S.purposeConsents]: ke,
			[S.purposeLegitimateInterests]: ke,
			[S.purposeOneTreatment]: ge,
			[S.publisherCountryCode]: zt,
			[S.vendorConsents]: qe,
			[S.vendorLegitimateInterests]: qe,
			[S.publisherRestrictions]: Bo,
			segmentType: A,
			[S.vendorsDisclosed]: qe,
			[S.vendorsAllowed]: qe,
			[S.publisherConsents]: ke,
			[S.publisherLegitimateInterests]: ke,
			[S.numCustomPurposes]: A,
			[S.publisherCustomConsents]: ke,
			[S.publisherCustomLegitimateInterests]: ke,
		};
	}
	var Rc = k(() => {
		Se();
		Ut();
		Cs();
		Un();
		at();
		_s();
		Ss();
		ws();
	});
	var ks = k(() => {
		Ut();
		Cs();
		Rc();
		Un();
		at();
		_s();
		Ss();
		xs();
		ws();
	});
	var Mo,
		Tc = k(() => {
			Se();
			Mo = class {
				constructor() {
					y(this, 1, {
						[V.CORE]: [
							S.version,
							S.created,
							S.lastUpdated,
							S.cmpId,
							S.cmpVersion,
							S.consentScreen,
							S.consentLanguage,
							S.vendorListVersion,
							S.purposeConsents,
							S.vendorConsents,
						],
					});
					y(this, 2, {
						[V.CORE]: [
							S.version,
							S.created,
							S.lastUpdated,
							S.cmpId,
							S.cmpVersion,
							S.consentScreen,
							S.consentLanguage,
							S.vendorListVersion,
							S.policyVersion,
							S.isServiceSpecific,
							S.useNonStandardTexts,
							S.specialFeatureOptins,
							S.purposeConsents,
							S.purposeLegitimateInterests,
							S.purposeOneTreatment,
							S.publisherCountryCode,
							S.vendorConsents,
							S.vendorLegitimateInterests,
							S.publisherRestrictions,
						],
						[V.VENDORS_DISCLOSED]: [S.vendorsDisclosed],
						[V.PUBLISHER_TC]: [
							S.publisherConsents,
							S.publisherLegitimateInterests,
							S.numCustomPurposes,
							S.publisherCustomConsents,
							S.publisherCustomLegitimateInterests,
						],
						[V.VENDORS_ALLOWED]: [S.vendorsAllowed],
					});
				}
			};
		});
	var jo,
		Ec = k(() => {
			Se();
			jo = class {
				constructor(t, o) {
					y(this, 1, [V.CORE]);
					y(this, 2, [V.CORE]);
					if (t.version === 2)
						if (t.isServiceSpecific)
							this[2].push(V.VENDORS_DISCLOSED), this[2].push(V.PUBLISHER_TC);
						else {
							let n = !!(o && o.isForVendors);
							(!n || t[S.supportOOB] === !0) &&
								this[2].push(V.VENDORS_DISCLOSED),
								n &&
									(t[S.supportOOB] &&
										t[S.vendorsAllowed].size > 0 &&
										this[2].push(V.VENDORS_ALLOWED),
									this[2].push(V.PUBLISHER_TC));
						}
				}
			};
		});
	var Ac = k(() => {});
	var Is = k(() => {
		Tc();
		Ec();
		Ac();
	});
	var xt,
		Pc = k(() => {
			gs();
			Vn();
			ks();
			Is();
			ye();
			hs();
			Se();
			xt = class {
				static encode(t, o) {
					let n;
					try {
						n = this.fieldSequence[String(t.version)][o];
					} catch {
						throw new me(
							`Unable to encode version: ${t.version}, segment: ${o}`
						);
					}
					let r = '';
					o !== V.CORE && (r = A.encode(Ze.KEY_TO_ID[o], w.segmentType));
					let s = zn();
					return (
						n.forEach((i) => {
							let a = t[i],
								c = s[i],
								d = w[i];
							d === void 0 &&
								this.isPublisherCustom(i) &&
								(d = Number(t[S.numCustomPurposes]));
							try {
								r += c.encode(a, d);
							} catch (p) {
								throw new me(`Error encoding ${o}->${i}: ${p.message}`);
							}
						}),
						Te.encode(r)
					);
				}
				static decode(t, o, n) {
					let r = Te.decode(t),
						s = 0;
					n === V.CORE &&
						(o.version = A.decode(r.substr(s, w[S.version]), w[S.version])),
						n !== V.CORE && (s += w.segmentType);
					let i = this.fieldSequence[String(o.version)][n],
						a = zn();
					return (
						i.forEach((c) => {
							let d = a[c],
								p = w[c];
							if (
								(p === void 0 &&
									this.isPublisherCustom(c) &&
									(p = Number(o[S.numCustomPurposes])),
								p !== 0)
							) {
								let u = r.substr(s, p);
								if (
									(d === qe
										? (o[c] = d.decode(u, o.version))
										: (o[c] = d.decode(u, p)),
									Number.isInteger(p))
								)
									s += p;
								else if (Number.isInteger(o[c].bitLength)) s += o[c].bitLength;
								else throw new ce(c);
							}
						}),
						o
					);
				}
				static isPublisherCustom(t) {
					return t.indexOf('publisherCustom') === 0;
				}
			};
			y(xt, 'fieldSequence', new Mo());
		});
	var Gt,
		Lc = k(() => {
			ye();
			Se();
			Gt = class {
				static process(t, o) {
					let n = t.gvl;
					if (!n) throw new me('Unable to encode TCModel without a GVL');
					if (!n.isReady)
						throw new me(
							'Unable to encode TCModel tcModel.gvl.readyPromise is not resolved'
						);
					(t = t.clone()),
						(t.consentLanguage = n.language.slice(0, 2).toUpperCase()),
						o?.version > 0 && o?.version <= this.processor.length
							? (t.version = o.version)
							: (t.version = this.processor.length);
					let r = t.version - 1;
					if (!this.processor[r]) throw new me(`Invalid version: ${t.version}`);
					return this.processor[r](t, n);
				}
			};
			y(Gt, 'processor', [
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
									let c = o.vendors[a];
									if (!c || c.deletedDate) r.unset(a);
									else if (c[s].length === 0)
										if (
											s === 'legIntPurposes' &&
											c.purposes.length === 0 &&
											c.legIntPurposes.length === 0 &&
											c.specialPurposes.length > 0
										)
											r.set(a);
										else if (
											s === 'legIntPurposes' &&
											c.purposes.length > 0 &&
											c.legIntPurposes.length === 0 &&
											c.specialPurposes.length > 0
										)
											r.set(a);
										else if (t.isServiceSpecific)
											if (c.flexiblePurposes.length === 0) r.unset(a);
											else {
												let d = t.publisherRestrictions.getRestrictions(a),
													p = !1;
												for (let u = 0, l = d.length; u < l && !p; u++)
													p =
														(d[u].restrictionType === _e.REQUIRE_CONSENT &&
															s === 'purposes') ||
														(d[u].restrictionType === _e.REQUIRE_LI &&
															s === 'legIntPurposes');
												p || r.unset(a);
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
	var Hn = k(() => {
		gs();
		Vn();
		Ic();
		Pc();
		Lc();
		ks();
		Is();
	});
	var Fo,
		Rs = k(() => {
			Fo = class {
				static absCall(t, o, n, r) {
					return new Promise((s, i) => {
						let a = new XMLHttpRequest(),
							c = () => {
								if (a.readyState == XMLHttpRequest.DONE)
									if (a.status >= 200 && a.status < 300) {
										let l = a.response;
										if (typeof l == 'string')
											try {
												l = JSON.parse(l);
											} catch {}
										s(l);
									} else
										i(
											new Error(
												`HTTP Status: ${a.status} response type: ${a.responseType}`
											)
										);
							},
							d = () => {
								i(new Error('error'));
							},
							p = () => {
								i(new Error('aborted'));
							},
							u = () => {
								i(new Error('Timeout ' + r + 'ms ' + t));
							};
						(a.withCredentials = n),
							a.addEventListener('load', c),
							a.addEventListener('error', d),
							a.addEventListener('abort', p),
							o === null ? a.open('GET', t, !0) : a.open('POST', t, !0),
							(a.responseType = 'json'),
							(a.timeout = r),
							(a.ontimeout = u),
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
	var E,
		wt,
		Ts = k(() => {
			Ct();
			ye();
			Rs();
			Se();
			E = class E extends we {
				constructor(o, n) {
					super();
					y(this, 'readyPromise');
					y(this, 'gvlSpecificationVersion');
					y(this, 'vendorListVersion');
					y(this, 'tcfPolicyVersion');
					y(this, 'lastUpdated');
					y(this, 'purposes');
					y(this, 'specialPurposes');
					y(this, 'features');
					y(this, 'specialFeatures');
					y(this, 'isReady_', !1);
					y(this, 'vendors_');
					y(this, 'vendorIds');
					y(this, 'fullVendorList');
					y(this, 'byPurposeVendorMap');
					y(this, 'bySpecialPurposeVendorMap');
					y(this, 'byFeatureVendorMap');
					y(this, 'bySpecialFeatureVendorMap');
					y(this, 'stacks');
					y(this, 'dataCategories');
					y(this, 'lang_');
					y(this, 'cacheLang_');
					y(this, 'isLatest', !1);
					let r = E.baseUrl,
						s = n?.language;
					if (s)
						try {
							s = E.consentLanguages.parseLanguage(s);
						} catch (i) {
							throw new ze('Error during parsing the language: ' + i.message);
						}
					if (
						((this.lang_ = s || E.DEFAULT_LANGUAGE),
						(this.cacheLang_ = s || E.DEFAULT_LANGUAGE),
						this.isVendorList(o))
					)
						this.populate(o), (this.readyPromise = Promise.resolve());
					else {
						if (!r)
							throw new ze('must specify GVL.baseUrl before loading GVL json');
						if (o > 0) {
							let i = o;
							E.CACHE.has(i)
								? (this.populate(E.CACHE.get(i)),
									(this.readyPromise = Promise.resolve()))
								: ((r += E.versionedFilename.replace('[VERSION]', String(i))),
									(this.readyPromise = this.fetchJson(r)));
						} else
							E.CACHE.has(E.LATEST_CACHE_KEY)
								? (this.populate(E.CACHE.get(E.LATEST_CACHE_KEY)),
									(this.readyPromise = Promise.resolve()))
								: ((this.isLatest = !0),
									(this.readyPromise = this.fetchJson(r + E.latestFilename)));
					}
				}
				static set baseUrl(o) {
					if (/^https?:\/\/vendorlist\.consensu\.org\//.test(o))
						throw new ze(
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
						o == null && E.LANGUAGE_CACHE.size > 0
							? ((E.LANGUAGE_CACHE = new Map()), (n = !0))
							: typeof o == 'string' &&
								this.consentLanguages.has(o.toUpperCase()) &&
								(E.LANGUAGE_CACHE.delete(o.toUpperCase()), (n = !0)),
						n
					);
				}
				static emptyCache(o) {
					let n = !1;
					return (
						Number.isInteger(o) && o >= 0
							? (E.CACHE.delete(o), (n = !0))
							: o === void 0 && ((E.CACHE = new Map()), (n = !0)),
						n
					);
				}
				cacheLanguage() {
					E.LANGUAGE_CACHE.has(this.cacheLang_) ||
						E.LANGUAGE_CACHE.set(this.cacheLang_, {
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
						this.populate(await Fo.fetch(o));
					} catch (n) {
						throw new ze(n.message);
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
						o[n] = E.cloneFeature(this.specialFeatures[n]);
					return o;
				}
				cloneFeatures() {
					let o = {};
					for (let n of Object.keys(this.features))
						o[n] = E.cloneFeature(this.features[n]);
					return o;
				}
				cloneStacks() {
					let o = {};
					for (let n of Object.keys(this.stacks))
						o[n] = E.cloneStack(this.stacks[n]);
					return o;
				}
				cloneDataCategories() {
					let o = {};
					for (let n of Object.keys(this.dataCategories))
						o[n] = E.cloneDataCategory(this.dataCategories[n]);
					return o;
				}
				cloneSpecialPurposes() {
					let o = {};
					for (let n of Object.keys(this.specialPurposes))
						o[n] = E.clonePurpose(this.specialPurposes[n]);
					return o;
				}
				clonePurposes() {
					let o = {};
					for (let n of Object.keys(this.purposes))
						o[n] = E.clonePurpose(this.purposes[n]);
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
						o[n] = E.cloneVendor(this.fullVendorList[n]);
					return o;
				}
				async changeLanguage(o) {
					let n = o;
					try {
						n = E.consentLanguages.parseLanguage(o);
					} catch (s) {
						throw new ze('Error during parsing the language: ' + s.message);
					}
					let r = o.toUpperCase();
					if (
						!(
							n.toLowerCase() === E.DEFAULT_LANGUAGE.toLowerCase() &&
							!E.LANGUAGE_CACHE.has(r)
						) &&
						n !== this.lang_
					)
						if (((this.lang_ = n), E.LANGUAGE_CACHE.has(r))) {
							let s = E.LANGUAGE_CACHE.get(r);
							for (let i in s) s.hasOwnProperty(i) && (this[i] = s[i]);
						} else {
							let s =
								E.baseUrl +
								E.languageFilename.replace('[LANG]', this.lang_.toLowerCase());
							try {
								await this.fetchJson(s),
									(this.cacheLang_ = r),
									this.cacheLanguage();
							} catch (i) {
								throw new ze('unable to load language: ' + i.message);
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
							this.isLatest && E.CACHE.set(E.LATEST_CACHE_KEY, this.getJson()),
							E.CACHE.has(this.vendorListVersion) ||
								E.CACHE.set(this.vendorListVersion, this.getJson())),
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
						c = {};
					return (
						o === 'purpose' && r
							? (a = this['by' + i + 'VendorMap'][String(n)][r])
							: (a =
									this['by' + (s ? 'Special' : '') + i + 'VendorMap'][
										String(n)
									]),
						a.forEach((d) => {
							c[String(d)] = this.vendors[String(d)];
						}),
						c
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
					let o = new E(this.getJson());
					return (
						this.lang_ !== E.DEFAULT_LANGUAGE && o.changeLanguage(this.lang_), o
					);
				}
				static isInstanceOf(o) {
					return typeof o == 'object' && typeof o.narrowVendorsTo == 'function';
				}
			};
			y(E, 'LANGUAGE_CACHE', new Map()),
				y(E, 'CACHE', new Map()),
				y(E, 'LATEST_CACHE_KEY', 0),
				y(E, 'DEFAULT_LANGUAGE', 'EN'),
				y(E, 'consentLanguages', new No()),
				y(E, 'baseUrl_'),
				y(E, 'latestFilename', 'vendor-list.json'),
				y(E, 'versionedFilename', 'archives/vendor-list-v[VERSION].json'),
				y(E, 'languageFilename', 'purposes-[LANG].json');
			wt = E;
		});
	var $t,
		Es = k(() => {
			Ct();
			ye();
			Ts();
			Se();
			$t = class extends we {
				constructor(o) {
					super();
					y(this, 'isServiceSpecific_', !0);
					y(this, 'supportOOB_', !1);
					y(this, 'useNonStandardTexts_', !1);
					y(this, 'purposeOneTreatment_', !1);
					y(this, 'publisherCountryCode_', 'AA');
					y(this, 'version_', 2);
					y(this, 'consentScreen_', 0);
					y(this, 'policyVersion_', 5);
					y(this, 'consentLanguage_', 'EN');
					y(this, 'cmpId_', 0);
					y(this, 'cmpVersion_', 0);
					y(this, 'vendorListVersion_', 0);
					y(this, 'numCustomPurposes_', 0);
					y(this, 'gvl_');
					y(this, 'created');
					y(this, 'lastUpdated');
					y(this, 'specialFeatureOptins', new le());
					y(this, 'purposeConsents', new le());
					y(this, 'purposeLegitimateInterests', new le());
					y(this, 'publisherConsents', new le());
					y(this, 'publisherLegitimateInterests', new le());
					y(this, 'publisherCustomConsents', new le());
					y(this, 'publisherCustomLegitimateInterests', new le());
					y(this, 'customPurposes');
					y(this, 'vendorConsents', new le());
					y(this, 'vendorLegitimateInterests', new le());
					y(this, 'vendorsDisclosed', new le());
					y(this, 'vendorsAllowed', new le());
					y(this, 'publisherRestrictions', new _t());
					o && (this.gvl = o), this.updated();
				}
				set gvl(o) {
					wt.isInstanceOf(o) || (o = new wt(o)),
						(this.gvl_ = o),
						(this.publisherRestrictions.gvl = o);
				}
				get gvl() {
					return this.gvl_;
				}
				set cmpId(o) {
					if (((o = Number(o)), Number.isInteger(o) && o > 1)) this.cmpId_ = o;
					else throw new be('cmpId', o);
				}
				get cmpId() {
					return this.cmpId_;
				}
				set cmpVersion(o) {
					if (((o = Number(o)), Number.isInteger(o) && o > -1))
						this.cmpVersion_ = o;
					else throw new be('cmpVersion', o);
				}
				get cmpVersion() {
					return this.cmpVersion_;
				}
				set consentScreen(o) {
					if (((o = Number(o)), Number.isInteger(o) && o > -1))
						this.consentScreen_ = o;
					else throw new be('consentScreen', o);
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
					else throw new be('publisherCountryCode', o);
				}
				get publisherCountryCode() {
					return this.publisherCountryCode_;
				}
				set vendorListVersion(o) {
					if (((o = Number(o) >> 0), o < 0))
						throw new be('vendorListVersion', o);
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
						throw new be('policyVersion', o);
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
						throw new be('numCustomPurposes', o);
				}
				updated() {
					let o = new Date(),
						n = new Date(
							Date.UTC(o.getUTCFullYear(), o.getUTCMonth(), o.getUTCDate())
						);
					(this.created = n), (this.lastUpdated = n);
				}
			};
			y($t, 'consentLanguages', wt.consentLanguages);
		});
	var As,
		Oc = k(() => {
			Hn();
			Se();
			at();
			Es();
			As = class {
				static encode(t, o) {
					let n = '',
						r;
					return (
						(t = Gt.process(t, o)),
						Array.isArray(o?.segments)
							? (r = o.segments)
							: (r = new jo(t, o)['' + t.version]),
						r.forEach((s, i) => {
							let a = '';
							i < r.length - 1 && (a = '.'), (n += xt.encode(t, s) + a);
						}),
						n
					);
				}
				static decode(t, o) {
					let n = t.split('.'),
						r = n.length;
					o || (o = new $t());
					for (let s = 0; s < r; s++) {
						let i = n[s],
							c = Te.decode(i.charAt(0)).substr(0, w.segmentType),
							d = Ze.ID_TO_KEY[A.decode(c, w.segmentType).toString()];
						xt.decode(i, o, d);
					}
					return o;
				}
			};
		});
	var Nc = {};
	Lt(Nc, {
		Base64Url: () => Te,
		BitLength: () => w,
		BooleanEncoder: () => ge,
		Cloneable: () => we,
		ConsentLanguages: () => No,
		DateEncoder: () => Ht,
		DecodingError: () => ce,
		DeviceDisclosureStorageAccessType: () => ys,
		EncodingError: () => me,
		FieldEncoderMap: () => zn,
		FieldSequence: () => Mo,
		Fields: () => S,
		FixedVectorEncoder: () => ke,
		GVL: () => wt,
		GVLError: () => ze,
		IntEncoder: () => A,
		Json: () => Fo,
		LangEncoder: () => zt,
		PurposeRestriction: () => $e,
		PurposeRestrictionVector: () => _t,
		PurposeRestrictionVectorEncoder: () => Bo,
		RestrictionType: () => _e,
		Segment: () => V,
		SegmentEncoder: () => xt,
		SegmentIDs: () => Ze,
		SegmentSequence: () => jo,
		SemanticPreEncoder: () => Gt,
		TCModel: () => $t,
		TCModelError: () => be,
		TCString: () => As,
		Vector: () => le,
		VectorEncodingType: () => St,
		VendorVectorEncoder: () => qe,
	});
	var Dc = k(() => {
		Hn();
		ye();
		Se();
		Ct();
		Ts();
		Rs();
		Es();
		Oc();
	});
	async function Vo() {
		return (
			qt ||
			kt ||
			((kt = Promise.resolve()
				.then(() => (Dc(), Nc))
				.then((e) => ((qt = e), (kt = null), e))
				.catch((e) => {
					throw (
						((kt = null),
						new Error(
							`Failed to load @iabtechlabtcf/core: ${e instanceof Error ? e.message : 'Unknown error'}. Make sure it is installed as a dependency.`
						))
					);
				})),
			kt)
		);
	}
	function Bc() {
		return qt !== null;
	}
	function Mc() {
		return qt;
	}
	function jc() {
		(qt = null), (kt = null);
	}
	var qt,
		kt,
		Ps = k(() => {
			'use strict';
			(qt = null), (kt = null);
		});
	async function Fc(e, t, o) {
		let { TCModel: n, TCString: r, GVL: s } = await Vo(),
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
		for (let [c, d] of Object.entries(e.purposeConsents))
			d && a.purposeConsents.set(Number(c));
		for (let [c, d] of Object.entries(e.purposeLegitimateInterests))
			d && a.purposeLegitimateInterests.set(Number(c));
		for (let [c, d] of Object.entries(e.vendorConsents)) {
			let p = Number(c);
			d && Number.isFinite(p) && a.vendorConsents.set(p);
		}
		for (let [c, d] of Object.entries(e.vendorLegitimateInterests)) {
			let p = Number(c);
			d && Number.isFinite(p) && a.vendorLegitimateInterests.set(p);
		}
		for (let [c, d] of Object.entries(e.specialFeatureOptIns))
			d && a.specialFeatureOptins.set(Number(c));
		for (let [c, d] of Object.entries(e.vendorsDisclosed))
			d && a.vendorsDisclosed.set(Number(c));
		return r.encode(a);
	}
	async function Wt(e) {
		let { TCString: t } = await Vo(),
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
	function Vc(e) {
		return !(
			!e ||
			typeof e != 'string' ||
			!/^[A-Za-z0-9_-]+$/.test(e) ||
			e.length < 10
		);
	}
	async function Uc(e, t) {
		return (await Wt(e)).vendorConsents[t] === !0;
	}
	async function Hc(e, t) {
		return (await Wt(e)).purposeConsents[t] === !0;
	}
	var Ls = k(() => {
		'use strict';
		Ps();
	});
	function Gp(e, t, o) {
		if (typeof document > 'u') return;
		let n = o * 24 * 60 * 60;
		document.cookie = `${e}=${encodeURIComponent(t)}; max-age=${n}; path=/; SameSite=Lax`;
	}
	function $p(e) {
		if (typeof document > 'u') return null;
		let t = document.cookie.match(new RegExp(`(^| )${e}=([^;]+)`));
		return t?.[2] ? decodeURIComponent(t[2]) : null;
	}
	function zc(e) {
		let { cmpId: t = Nn, cmpVersion: o = Dn, gvl: n, gdprApplies: r = !0 } = e,
			s = '',
			i = 'loading',
			a = 'hidden',
			c = new Map(),
			d = 0,
			p = null;
		async function u(x, I) {
			if (p && p.tcString === s && !x) return p;
			let T = {},
				P = {},
				B = {},
				M = {},
				O = {};
			if (s)
				try {
					let nt = await Wt(s);
					(T = nt.purposeConsents),
						(P = nt.purposeLegitimateInterests),
						(B = nt.vendorConsents),
						(M = nt.vendorLegitimateInterests),
						(O = nt.specialFeatureOptIns);
				} catch {}
			let ae = typeof o == 'number' ? o : Number.parseInt(String(o), 10) || 1,
				Re = {
					tcString: s,
					tcfPolicyVersion: n.tcfPolicyVersion,
					cmpId: t,
					cmpVersion: ae,
					gdprApplies: r,
					listenerId: I,
					eventStatus: x,
					cmpStatus: i,
					isServiceSpecific: !0,
					useNonStandardTexts: !1,
					publisherCC: 'US',
					purposeOneTreatment: !1,
					purpose: { consents: T, legitimateInterests: P },
					vendor: { consents: B, legitimateInterests: M },
					specialFeatureOptins: O,
					publisher: {
						consents: {},
						legitimateInterests: {},
						customPurpose: { consents: {}, legitimateInterests: {} },
						restrictions: {},
					},
				};
			return x || (p = Re), Re;
		}
		function l(x) {
			let I = {
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
			x(I, !0);
		}
		async function m(x, I) {
			let T = await u();
			x(T, !0);
		}
		async function h(x) {
			return m(x);
		}
		function _(x, I) {
			x(n, !0);
		}
		async function g(x) {
			let I = d++;
			c.set(I, x);
			let T = await u('tcloaded', I);
			x(T, !0);
		}
		function C(x, I) {
			let T = c.has(I);
			c.delete(I), x(T, !0);
		}
		async function v(x) {
			for (let [I, T] of c) {
				let P = await u(x, I);
				T(P, !0);
			}
		}
		function b() {
			if (typeof window > 'u') return;
			let x = Mn();
			(window.__tcfapi = (I, T, P, B) => {
				switch (I) {
					case 'ping':
						l(P);
						break;
					case 'getTCData':
						m(P, B);
						break;
					case 'getInAppTCData':
						h(P);
						break;
					case 'getVendorList':
						_(P, B);
						break;
					case 'addEventListener':
						g(P);
						break;
					case 'removeEventListener':
						C(P, B);
						break;
					default:
						P(null, !1);
				}
			}),
				jn();
			for (let I of x) window.__tcfapi?.(...I);
			i = 'loaded';
		}
		return (
			b(),
			{
				updateConsent: (x) => {
					(s = x), (p = null), (i = 'loaded'), v('useractioncomplete');
				},
				setDisplayStatus: (x) => {
					(a = x), x === 'visible' && v('cmpuishown');
				},
				loadFromStorage: () => {
					let x = $p(ht.TC_STRING_COOKIE);
					if (x) return (s = x), (p = null), v('tcloaded'), x;
					if (typeof localStorage < 'u')
						try {
							let I = localStorage.getItem(ht.TC_STRING_LOCAL);
							if (I) return (s = I), (p = null), v('tcloaded'), I;
						} catch {}
					return null;
				},
				saveToStorage: (x) => {
					if ((Gp(ht.TC_STRING_COOKIE, x, 395), typeof localStorage < 'u'))
						try {
							localStorage.setItem(ht.TC_STRING_LOCAL, x);
						} catch {}
				},
				getTcString: () => s,
				destroy: () => {
					c.clear(), (p = null), typeof window < 'u' && delete window.__tcfapi;
				},
			}
		);
	}
	var Gc = k(() => {
		'use strict';
		fs();
		ms();
		Ls();
		hn();
	});
	function $c(e) {
		return Os[e] ?? null;
	}
	function qc(e) {
		return Uo[e] ?? [];
	}
	function Wc(e) {
		let t = {};
		for (let [o, n] of Object.entries(e)) {
			let r = Uo[o];
			if (r) for (let s of r) t[s] = n;
		}
		return t;
	}
	function Kc(e) {
		let t = {
			necessary: !1,
			marketing: !1,
			experience: !1,
			measurement: !1,
			functionality: !1,
		};
		for (let [o, n] of Object.entries(Uo)) {
			let r = n.every((s) => e[s] === !0);
			t[o] = r;
		}
		return t;
	}
	function Yc(e, t = []) {
		return {
			consentRequired: e,
			legitInterest: t,
			all: [...new Set([...e, ...t])],
		};
	}
	function Qc(e, t, o, n) {
		let r = e.every((i) => o[i] === !0),
			s = t.every((i) => n[i] === !0);
		return r && s;
	}
	var Os,
		Uo,
		Jc = k(() => {
			'use strict';
			(Os = {
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
				(Uo = {
					necessary: [1],
					marketing: [2, 3, 4],
					experience: [5, 6],
					measurement: [7, 8, 9],
					functionality: [10, 11],
				});
		});
	function Ns(e, t) {
		let o = Array.isArray(e) ? e : Object.values(e),
			n = new Map();
		for (let p of o) n.set(p.id, p);
		let r = t ?? Ho,
			s = new Set(),
			i = [],
			a = n.get(1);
		a && (i.push(a), s.add(1));
		let c = [];
		for (let p of Object.values(r)) {
			let u = [];
			for (let l of p.purposes) {
				if (l === 1) continue;
				let m = n.get(l);
				m && (u.push(m), s.add(l));
			}
			u.length > 0 && c.push({ ...p, resolvedPurposes: u });
		}
		let d = [];
		for (let p of o) s.has(p.id) || d.push(p);
		return { stacks: c, standalonePurposes: i, ungroupedPurposes: d };
	}
	function Zc(e, t) {
		if (e === 1) return null;
		let o = t ?? Ho;
		for (let n of Object.values(o)) if (n.purposes.includes(e)) return n;
		return null;
	}
	function el(e) {
		return e === 1;
	}
	function tl(e, t, o) {
		let r = (o ?? Ho)[e];
		if (!r) return [];
		let s = Array.isArray(t) ? t : Object.values(t),
			i = new Map();
		for (let a of s) i.set(a.id, a);
		return r.purposes
			.filter((a) => a !== 1)
			.map((a) => i.get(a))
			.filter((a) => a !== void 0);
	}
	function ol(e, t) {
		let { standalonePurposes: o, stacks: n, ungroupedPurposes: r } = Ns(e, t),
			s = [];
		s.push(...o);
		for (let i of n) s.push(...i.resolvedPurposes);
		return s.push(...r), s;
	}
	function nl(e) {
		return Object.values(e).sort((t, o) => t.id - o.id);
	}
	var Xc,
		Ho,
		rl = k(() => {
			'use strict';
			(Xc = 1),
				(Ho = {
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
	var ll = {};
	Lt(ll, {
		createIABActions: () => cl,
		createIABManager: () => Ds,
		createInitialIABState: () => al,
	});
	function al(e) {
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
	function cl(e, t, o) {
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
				let { purposeConsents: s, purposeLegitimateInterests: i } = qp(
						r.gvl,
						!0
					),
					{ vendorConsents: a, vendorLegitimateInterests: c } = sl(
						r.gvl,
						r.nonIABVendors,
						!0
					),
					d = il(r.gvl, !0);
				n({
					purposeConsents: s,
					purposeLegitimateInterests: i,
					vendorConsents: a,
					vendorLegitimateInterests: c,
					specialFeatureOptIns: d,
				});
			},
			rejectAll: () => {
				let { iab: r } = e();
				if (!r?.gvl) return;
				let s = { 1: !0 },
					i = {};
				for (let p of Object.keys(r.gvl.purposes))
					Number(p) !== 1 && ((s[Number(p)] = !1), (i[Number(p)] = !1));
				let { vendorConsents: a, vendorLegitimateInterests: c } = sl(
						r.gvl,
						r.nonIABVendors,
						!1
					),
					d = il(r.gvl, !1);
				n({
					purposeConsents: s,
					purposeLegitimateInterests: i,
					vendorConsents: a,
					vendorLegitimateInterests: c,
					specialFeatureOptIns: d,
				});
			},
			save: async () => {
				let { iab: r, locationInfo: s, user: i, callbacks: a } = e();
				if (!r?.cmpApi || !r.gvl) return;
				let {
						config: c,
						gvl: d,
						cmpApi: p,
						purposeConsents: u,
						purposeLegitimateInterests: l,
						vendorConsents: m,
						vendorLegitimateInterests: h,
						specialFeatureOptIns: _,
					} = r,
					{ generateTCString: g, iabPurposesToC15tConsents: C } =
						await Promise.resolve().then(() => ($n(), Gn)),
					v = {};
				for (let O of Object.keys(d.vendors)) v[Number(O)] = !0;
				let b = await g(
					{
						purposeConsents: u,
						purposeLegitimateInterests: l,
						vendorConsents: m,
						vendorLegitimateInterests: h,
						specialFeatureOptIns: _,
						vendorsDisclosed: v,
					},
					d,
					{
						cmpId: c.cmpId ?? Nn,
						cmpVersion: c.cmpVersion ?? Dn,
						publisherCountryCode: c.publisherCountryCode ?? 'GB',
						isServiceSpecific: c.isServiceSpecific ?? !0,
					}
				);
				p.saveToStorage(b), p.updateConsent(b);
				let x = C(u),
					I = Date.now();
				n({ tcString: b, vendorsDisclosed: v });
				let T = e().consentInfo?.subjectId;
				T || (T = Ao()),
					t({
						consents: x,
						selectedConsents: x,
						activeUI: 'none',
						consentInfo: {
							time: I,
							subjectId: T,
							externalId: i?.id,
							identityProvider: i?.identityProvider,
						},
					});
				let P = {},
					B = {};
				for (let O of r.nonIABVendors) {
					let ae = String(O.id);
					O.purposes && O.purposes.length > 0 && (P[ae] = m[ae] ?? !1),
						O.legIntPurposes &&
							O.legIntPurposes.length > 0 &&
							(B[ae] = h[ae] ?? !0);
				}
				Ne(
					{
						consents: x,
						consentInfo: {
							time: I,
							subjectId: T,
							externalId: i?.id,
							identityProvider: i?.identityProvider,
						},
						iabCustomVendorConsents: P,
						iabCustomVendorLegitimateInterests: B,
					},
					void 0,
					e().storageConfig
				),
					e().updateScripts();
				let M = await o.setConsent({
					body: {
						subjectId: T,
						givenAt: I,
						type: 'cookie_banner',
						domain: typeof window < 'u' ? window.location.hostname : '',
						preferences: x,
						externalSubjectId: i?.id,
						identityProvider: i?.identityProvider,
						tcString: b,
						jurisdiction: s?.jurisdiction ?? void 0,
						jurisdictionModel: 'iab',
						metadata: { source: 'iab_tcf', acceptanceMethod: 'iab' },
					},
				});
				if (!M.ok) {
					let O = M.error?.message ?? 'Failed to save IAB consents';
					a.onError?.({ error: O }), a.onError || console.error(O);
				}
			},
		};
	}
	function Ds(e, t, o, n) {
		let r = al(e),
			s = cl(t, o, n);
		return { ...r, ...s };
	}
	function qp(e, t) {
		let o = {},
			n = {};
		for (let r of Object.keys(e.purposes))
			(o[Number(r)] = t), (n[Number(r)] = t);
		return { purposeConsents: o, purposeLegitimateInterests: n };
	}
	function sl(e, t, o) {
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
	function il(e, t) {
		let o = {};
		for (let n of Object.keys(e.specialFeatures)) o[Number(n)] = t;
		return o;
	}
	var Bs = k(() => {
		'use strict';
		st();
		_n();
		fs();
	});
	var Gn = {};
	Lt(Gn, {
		C15T_TO_IAB_PURPOSE_MAP: () => Uo,
		DEFAULT_STACKS: () => Ho,
		GVL_ENDPOINT: () => gn,
		IAB_PURPOSE_TO_C15T_MAP: () => Os,
		IAB_STORAGE_KEYS: () => ht,
		STANDALONE_PURPOSE_ID: () => Xc,
		c15tConsentsToIabPurposes: () => Wc,
		c15tToIabPurposes: () => qc,
		categorizeVendorPurposes: () => Yc,
		clearGVLCache: () => ns,
		clearStubQueue: () => jn,
		createCMPApi: () => zc,
		createIABManager: () => Ds,
		decodeTCString: () => Wt,
		destroyIABStub: () => Ba,
		fetchGVL: () => ts,
		flattenPurposesByStack: () => ol,
		generateTCString: () => Fc,
		getCachedGVL: () => os,
		getPurposesInStack: () => tl,
		getStackForPurpose: () => Zc,
		getStubQueue: () => Mn,
		getTCFCore: () => Vo,
		getTCFCoreSync: () => Mc,
		groupPurposesIntoStacks: () => Ns,
		hasPurposeConsent: () => Hc,
		hasVendorConsent: () => Uc,
		iabPurposeToC15t: () => $c,
		iabPurposesToC15tConsents: () => Kc,
		initializeIABStub: () => Na,
		isStandalonePurpose: () => el,
		isStubActive: () => Da,
		isStubInitialized: () => Ma,
		isTCFCoreLoaded: () => Bc,
		isValidTCStringFormat: () => Vc,
		purposesToArray: () => nl,
		resetTCFCoreCache: () => jc,
		setMockGVL: () => rs,
		vendorHasRequiredConsents: () => Qc,
	});
	var $n = k(() => {
		'use strict';
		Gc();
		yn();
		Ps();
		Jc();
		rl();
		Bs();
		ms();
		Ls();
		hn();
	});
	var Xh = {};
	Lt(Xh, {
		EMBED_PAYLOAD_EVENT: () => ap,
		bootstrapEmbedRuntime: () => lp,
		createEmbedRuntime: () => dp,
		initializeEmbedRuntime: () => Jh,
		mountEmbedRuntime: () => zi,
		readEmbedPayload: () => Vi,
		registerEmbedIABComponents: () => Hi,
		resetEmbedIABComponents: () => Yh,
		resolveBackendURL: () => cp,
		unmountEmbedRuntime: () => Ui,
	});
	var vo = /^\/+/;
	function Co(e, t = null, o = null, n = null) {
		return { data: t, error: o, ok: e, response: n };
	}
	function Ki(e, t = 500, o = 'ERROR', n) {
		return Co(!1, null, { message: e, status: t, code: o, cause: n }, null);
	}
	var Le = {
			maxRetries: 3,
			initialDelayMs: 100,
			backoffFactor: 2,
			retryableStatusCodes: [500, 502, 503, 504],
			nonRetryableStatusCodes: [400, 401, 403, 404],
			retryOnNetworkError: !0,
			shouldRetry: void 0,
		},
		Yi = /^(?:[a-z+]+:)?\/\//i,
		Hr = vo;
	gt();
	var Ot = (e) => new Promise((t) => setTimeout(t, e));
	function ea() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (e) => {
			let t = (Math.random() * 16) | 0;
			return (e === 'x' ? t : (t & 3) | 8).toString(16);
		});
	}
	function ta(e) {
		let t = e.length;
		for (; t > 0 && e[t - 1] === '/'; ) t--;
		return e.slice(0, t);
	}
	function _p(e, t) {
		if (Yi.test(e)) {
			let r = new URL(e),
				s = ta(r.pathname),
				i = t.replace(Hr, ''),
				a = `${s}/${i}`;
			return (r.pathname = a), r.toString();
		}
		let o = ta(e),
			n = t.replace(Hr, '');
		return `${o}/${n}`;
	}
	var Oe = Co;
	async function Je(e, t, o) {
		let n = {
				...e.retryConfig,
				...(o?.retryConfig || {}),
				retryableStatusCodes:
					o?.retryConfig?.retryableStatusCodes ??
					e.retryConfig.retryableStatusCodes ??
					Le.retryableStatusCodes,
				nonRetryableStatusCodes:
					o?.retryConfig?.nonRetryableStatusCodes ??
					e.retryConfig.nonRetryableStatusCodes ??
					Le.nonRetryableStatusCodes,
			},
			{
				maxRetries: r,
				initialDelayMs: s,
				backoffFactor: i,
				retryableStatusCodes: a,
				nonRetryableStatusCodes: c,
				retryOnNetworkError: d,
			} = n,
			p = 0,
			u = s,
			l = null;
		for (; p <= (r ?? 0); ) {
			let h = ea(),
				_ = e.customFetch || globalThis.fetch,
				g = _p(e.backendURL, t),
				C;
			try {
				C = new URL(g);
			} catch {
				C = new URL(g, window.location.origin);
			}
			if (o?.query)
				for (let [b, x] of Object.entries(o.query))
					x !== void 0 && C.searchParams.append(b, String(x));
			let v = {
				method: o?.method || 'GET',
				mode: e.corsMode,
				credentials: 'include',
				headers: { ...e.headers, 'X-Request-ID': h, ...o?.headers },
				...o?.fetchOptions,
			};
			o?.body && v.method !== 'GET' && (v.body = JSON.stringify(o.body));
			try {
				let b = await _(C.toString(), v),
					x = null,
					I = null;
				try {
					b.headers.get('content-type')?.includes('application/json') &&
					b.status !== 204 &&
					b.headers.get('content-length') !== '0'
						? (x = await b.json())
						: b.status === 204 && (x = null);
				} catch (O) {
					I = O;
				}
				if (I) {
					let O = Oe(
						!1,
						null,
						{
							message: 'Failed to parse response',
							status: b.status,
							code: 'PARSE_ERROR',
							cause: I,
						},
						b
					);
					if ((o?.onError?.(O, t), o?.throw))
						throw new Error('Failed to parse response');
					return O;
				}
				if (b.status >= 200 && b.status < 300) {
					let O = Oe(!0, x, null, b);
					return o?.onSuccess?.(O), O;
				}
				let P = x,
					B = Oe(
						!1,
						null,
						{
							message: P?.message || `Request failed with status ${b.status}`,
							status: b.status,
							code: P?.code || 'API_ERROR',
							details: P?.details || null,
						},
						b
					);
				l = B;
				let M = !1;
				if (c?.includes(b.status))
					U().debug(
						`Not retrying request to ${t} with status ${b.status} (nonRetryableStatusCodes)`
					),
						(M = !1);
				else if (typeof n.shouldRetry == 'function')
					try {
						(M = n.shouldRetry(b, {
							attemptsMade: p,
							url: C.toString(),
							method: v.method || 'GET',
						})),
							U().debug(
								`Custom retry strategy for ${t} with status ${b.status}: ${M}`
							);
					} catch {
						(M = a?.includes(b.status) ?? !1),
							U().debug(
								`Custom retry strategy failed, falling back to status code check: ${M}`
							);
					}
				else
					(M = a?.includes(b.status) ?? !1),
						U().debug(
							`Standard retry check for ${t} with status ${b.status}: ${M}`
						);
				if (!M || p >= (r ?? 0)) {
					if ((o?.onError?.(B, t), o?.throw))
						throw new Error(B.error?.message || 'Request failed');
					return B;
				}
				p++, await Ot(u ?? 0), (u = (u ?? 0) * (i ?? 2));
			} catch (b) {
				if (b && b.message === 'Failed to parse response') throw b;
				let x = !(b instanceof Response),
					I = Oe(
						!1,
						null,
						{
							message: b instanceof Error ? b.message : String(b),
							status: 0,
							code: 'NETWORK_ERROR',
							cause: b,
						},
						null
					);
				if (((l = I), !(x && d) || p >= (r ?? 0))) {
					if ((o?.onError?.(I, t), o?.throw)) throw b;
					return I;
				}
				p++, await Ot(u ?? 0), (u = (u ?? 0) * (i ?? 2));
			}
		}
		let m =
			l ||
			Oe(
				!1,
				null,
				{
					message: `Request failed after ${r} retries`,
					status: 0,
					code: 'MAX_RETRIES_EXCEEDED',
				},
				null
			);
		if ((o?.onError?.(m, t), o?.throw))
			throw new Error(`Request failed after ${r} retries`);
		return m;
	}
	st();
	gt();
	var He = {
		INIT: '/init',
		POST_SUBJECT: '/subjects',
		GET_SUBJECT: '/subjects',
		PATCH_SUBJECT: '/subjects',
		CHECK_CONSENT: '/consents/check',
		LIST_SUBJECTS: '/subjects',
	};
	async function mn(e, t, o, n, r) {
		try {
			let s = await Je(e, t, { method: o, ...n });
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
	async function wp(e) {
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
					U().log(
						'Queued identify user submission for retry on next page load'
					));
			}
		} catch (n) {
			console.warn(
				'Failed to write to localStorage in identify offline fallback:',
				n
			);
		}
		let o = Oe(!0, null, null, null);
		return e?.onSuccess && (await e.onSuccess(o)), o;
	}
	async function da(e, t, o) {
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
		let s = Ue(t);
		Ne(
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
		let i = `${He.PATCH_SUBJECT}/${n.id}`,
			{ id: a, ...c } = n;
		return mn(e, i, 'PATCH', { ...r, body: c }, async (d) => {
			let p = { id: n.id, ...d?.body };
			return wp({ ...d, body: p });
		});
	}
	yo();
	async function ua(e, t) {
		let o = null;
		if (t?.enabled)
			try {
				let { fetchGVL: r } = await Promise.resolve().then(() => (yn(), ss));
				o = await r(t.vendorIds);
			} catch (r) {
				console.warn('Failed to fetch GVL in offline fallback:', r);
			}
		let n = Oe(
			!0,
			{
				jurisdiction: 'NONE',
				location: { countryCode: null, regionCode: null },
				translations: { language: 'en', translations: mt },
				branding: 'c15t',
				gvl: o,
			},
			null,
			null
		);
		return e?.onSuccess && (await e.onSuccess(n)), n;
	}
	async function pa(e, t, o) {
		try {
			let n = await Je(e, He.INIT, { method: 'GET', ...t });
			return n.ok
				? n
				: (console.warn(
						'API request failed, falling back to offline mode for consent banner'
					),
					ua(t, o));
		} catch (n) {
			return (
				console.warn(
					'Error fetching consent banner info, falling back to offline mode:',
					n
				),
				ua(t, o)
			);
		}
	}
	gt();
	var fa = 'c15t-pending-consent-submissions',
		vn = 'c15t-pending-identify-submissions';
	function ma(e, t) {
		let o = fa;
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
				U().log(`Found ${r.length} pending consent submission(s) to retry`),
					setTimeout(() => {
						t(r);
					}, 2e3);
			} catch (n) {
				console.warn('Failed to check for pending consent submissions:', n);
			}
	}
	async function ga(e, t) {
		let o = fa,
			n = 3,
			r = [...t];
		for (let s = 0; s < n && r.length > 0; s++) {
			let i = [];
			for (let a = 0; a < r.length; a++) {
				let c = r[a];
				try {
					U().log('Retrying consent submission:', c),
						(await Je(e, He.POST_SUBJECT, { method: 'POST', body: c })).ok &&
							(U().log('Successfully resubmitted consent'), i.push(a));
				} catch (d) {
					console.warn('Failed to resend consent submission:', d);
				}
			}
			for (let a = i.length - 1; a >= 0; a--) {
				let c = i[a];
				c !== void 0 && r.splice(c, 1);
			}
			if (r.length === 0) break;
			s < n - 1 && (await Ot(1e3 * (s + 1)));
		}
		try {
			typeof window < 'u' &&
				window.localStorage &&
				(r.length > 0
					? (window.localStorage.setItem(o, JSON.stringify(r)),
						U().log(
							`${r.length} consent submissions still pending for future retry`
						))
					: (window.localStorage.removeItem(o),
						U().log('All pending consent submissions processed successfully')));
		} catch (s) {
			console.warn('Error updating pending submissions storage:', s);
		}
	}
	function ha(e, t) {
		if (!(typeof window > 'u' || !window.localStorage))
			try {
				let o = window.localStorage.getItem(vn);
				if (!o) return;
				let n = JSON.parse(o);
				if (!n.length) {
					window.localStorage.removeItem(vn);
					return;
				}
				U().log(
					`Found ${n.length} pending identify user submission(s) to retry`
				),
					setTimeout(() => {
						t(n);
					}, 2500);
			} catch (o) {
				console.warn('Failed to check for pending identify submissions:', o);
			}
	}
	async function ba(e, t) {
		let n = [...t];
		for (let r = 0; r < 3 && n.length > 0; r++) {
			let s = [];
			for (let i = 0; i < n.length; i++) {
				let a = n[i];
				if (a)
					try {
						U().log('Retrying identify user submission:', a);
						let c = `${He.PATCH_SUBJECT}/${a.id}`,
							{ id: d, ...p } = a;
						(await Je(e, c, { method: 'PATCH', body: p })).ok &&
							(U().log('Successfully resubmitted identify user'), s.push(i));
					} catch (c) {
						console.warn('Failed to resend identify user submission:', c);
					}
			}
			for (let i = s.length - 1; i >= 0; i--) {
				let a = s[i];
				a !== void 0 && n.splice(a, 1);
			}
			if (n.length === 0) break;
			r < 2 && (await Ot(1e3 * (r + 1)));
		}
		try {
			typeof window < 'u' &&
				window.localStorage &&
				(n.length > 0
					? (window.localStorage.setItem(vn, JSON.stringify(n)),
						U().log(
							`${n.length} identify submissions still pending for future retry`
						))
					: (window.localStorage.removeItem(vn),
						U().log(
							'All pending identify submissions processed successfully'
						)));
		} catch (r) {
			console.warn('Error updating pending identify submissions storage:', r);
		}
	}
	st();
	gt();
	async function Ip(e, t) {
		let o = 'c15t-pending-consent-submissions',
			n = t?.body?.subjectId;
		try {
			if (
				typeof window < 'u' &&
				(Ne(
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
					let c = window.localStorage.getItem(o);
					c && (s = JSON.parse(c));
				} catch (c) {
					console.warn('Error parsing pending submissions:', c), (s = []);
				}
				let i = t.body;
				s.some((c) => JSON.stringify(c) === JSON.stringify(i)) ||
					(s.push(i),
					window.localStorage.setItem(o, JSON.stringify(s)),
					U().log('Queued consent submission for retry on next page load'));
			}
		} catch (s) {
			console.warn('Failed to write to localStorage in offline fallback:', s);
		}
		let r = Oe(!0, null, null, null);
		return t?.onSuccess && (await t.onSuccess(r)), r;
	}
	async function ya(e, t, o) {
		return (
			Ne(
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
			await mn(e, He.POST_SUBJECT, 'POST', o, async (r) => Ip(t, r))
		);
	}
	var jt = class {
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
					maxRetries: t.retryConfig?.maxRetries ?? Le.maxRetries ?? 3,
					initialDelayMs:
						t.retryConfig?.initialDelayMs ?? Le.initialDelayMs ?? 100,
					backoffFactor: t.retryConfig?.backoffFactor ?? Le.backoffFactor ?? 2,
					retryableStatusCodes:
						t.retryConfig?.retryableStatusCodes ?? Le.retryableStatusCodes,
					nonRetryableStatusCodes:
						t.retryConfig?.nonRetryableStatusCodes ??
						Le.nonRetryableStatusCodes,
					shouldRetry: t.retryConfig?.shouldRetry ?? Le.shouldRetry,
					retryOnNetworkError:
						t.retryConfig?.retryOnNetworkError ?? Le.retryOnNetworkError,
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
			return pa(this.fetcherContext, t, this.iabConfig);
		}
		async setConsent(t) {
			return ya(this.fetcherContext, this.storageConfig, t);
		}
		async identifyUser(t) {
			return da(this.fetcherContext, this.storageConfig, t);
		}
		async $fetch(t, o) {
			return Je(this.fetcherContext, t, o);
		}
		checkPendingConsentSubmissions() {
			ma(this.fetcherContext, (t) => this.processPendingConsentSubmissions(t));
		}
		async processPendingConsentSubmissions(t) {
			return ga(this.fetcherContext, t);
		}
		checkPendingIdentifySubmissions() {
			ha(this.fetcherContext, (t) => this.processPendingIdentifySubmissions(t));
		}
		async processPendingIdentifySubmissions(t) {
			return ba(this.fetcherContext, t);
		}
	};
	function Io(e, t = 500, o = 'HANDLER_ERROR', n) {
		return Ki(e, t, o, n);
	}
	async function Ft(e, t, o) {
		let n = e[t];
		if (!n) {
			let r = Io(
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
			let s = Io(
				r instanceof Error ? r.message : String(r),
				0,
				'HANDLER_ERROR',
				r
			);
			if (o?.throw) throw r;
			return s;
		}
	}
	async function va(e, t, o, n) {
		let r = o.replace(vo, '').split('/')[0],
			s = t[o];
		if (s)
			try {
				return await s(n);
			} catch (i) {
				return Io(
					i instanceof Error ? i.message : String(i),
					0,
					'HANDLER_ERROR',
					i
				);
			}
		return !r || !(r in e)
			? Io(`No endpoint handler found for '${o}'`, 404, 'ENDPOINT_NOT_FOUND')
			: await Ft(e, r, n);
	}
	async function Ca(e, t) {
		let o = ('init' in e && e.init !== void 0, 'init');
		return await Ft(e, o, t);
	}
	async function _a(e, t) {
		return await Ft(e, 'setConsent', t);
	}
	var Ro = class {
		constructor(t) {
			this.dynamicHandlers = {};
			this.endpointHandlers = t.endpointHandlers;
		}
		async init(t) {
			return Ca(this.endpointHandlers, t);
		}
		async setConsent(t) {
			return _a(this.endpointHandlers, t);
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
			return va(this.endpointHandlers, this.dynamicHandlers, t, o);
		}
	};
	yo();
	function Sa(e, t) {
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
			for (let { sets: a, code: c } of i)
				if (a.some((d) => d.has(r))) {
					n = c;
					break;
				}
		}
		return n;
	}
	fn();
	function is(e = null) {
		return Co(!0, e);
	}
	async function To(e) {
		let t = is();
		return e?.onSuccess && (await e.onSuccess(t)), t;
	}
	async function xa(e, t, o) {
		let n = t?.headers?.['x-c15t-country'] ?? 'GB',
			r = t?.headers?.['x-c15t-region'] ?? null,
			s,
			i,
			a = t?.headers?.['accept-language'] ?? null;
		if (e?.translations && Object.keys(e.translations).length > 0) {
			let u = e.translations,
				l = Array.from(new Set(['en', ...Object.keys(u)])),
				m = e.defaultLanguage ?? 'en';
			s = Vr(l, { header: a, fallback: m });
			let h = u[s] ?? {};
			i = Fr(mt, h);
		} else {
			let u = Object.keys(Fe.translations),
				l = Fe.defaultLanguage ?? 'en';
			(s = Vr(u, { header: a, fallback: l })), (i = Fe.translations[s]);
		}
		let c = Sa(n, r),
			d = null;
		if (o?.enabled)
			if (o.gvl) d = o.gvl;
			else
				try {
					let { fetchGVL: u } = await Promise.resolve().then(() => (yn(), ss));
					d = await u(o.vendorIds);
				} catch (u) {
					console.warn('Failed to fetch GVL in offline mode:', u);
				}
		let p = is({
			jurisdiction: c,
			location: { countryCode: n, regionCode: r },
			translations: { language: s, translations: i },
			branding: 'c15t',
			gvl: d,
		});
		return t?.onSuccess && (await t.onSuccess(p)), p;
	}
	st();
	async function wa(e, t) {
		let o = t?.body?.subjectId;
		try {
			typeof window < 'u' &&
				Ne(
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
		return await To(t);
	}
	var Eo = class {
		constructor(t, o, n) {
			(this.storageConfig = t),
				(this.initialTranslationConfig = o),
				(this.iabConfig = n);
		}
		async init(t) {
			return xa(this.initialTranslationConfig, t, this.iabConfig);
		}
		async setConsent(t) {
			return wa(this.storageConfig, t);
		}
		async identifyUser(t) {
			return (
				console.warn(
					'identifyUser called in offline mode - external ID will not be linked'
				),
				To(t)
			);
		}
		async $fetch(t, o) {
			return await To(o);
		}
	};
	var Rp = '/api/c15t',
		Tp = 'c15t',
		Cn = new Map();
	function Ep(e) {
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
	function Ap(e) {
		let t = Ep(e.storageConfig),
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
	function Vt(e) {
		let t = Ap(e);
		if (Cn.has(t)) {
			if (
				e.mode !== 'offline' &&
				e.mode !== 'custom' &&
				'headers' in e &&
				e.headers
			) {
				let s = Cn.get(t);
				s instanceof jt &&
					(s.headers = { 'Content-Type': 'application/json', ...e.headers });
			}
			let r = Cn.get(t);
			if (r)
				return new Proxy(r, {
					get(s, i) {
						return s[i];
					},
				});
		}
		let o = e.mode || Tp,
			n;
		switch (o) {
			case 'custom': {
				let r = e;
				n = new Ro({ endpointHandlers: r.endpointHandlers });
				break;
			}
			case 'offline': {
				let r = e.store?.iab;
				n = new Eo(
					e.storageConfig,
					e.store?.initialTranslationConfig,
					r ? { enabled: r.enabled, vendorIds: r.vendors, gvl: r.gvl } : void 0
				);
				break;
			}
			default: {
				let r = e,
					s = e.store?.iab;
				n = new jt({
					backendURL: r.backendURL || Rp,
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
		return Cn.set(t, n), n;
	}
	st();
	_n();
	function ka(e, t) {
		if (e.length === 0) throw new TypeError(`${t} condition cannot be empty`);
	}
	function Np(e, t) {
		if (!(e in t))
			throw new Error(`Consent category "${e}" not found in consent state`);
		return t[e] || !1;
	}
	function Dp(e, t) {
		let o = Array.isArray(e) ? e : [e];
		return ka(o, 'AND'), o.every((n) => Sn(n, t));
	}
	function Bp(e, t) {
		let o = Array.isArray(e) ? e : [e];
		return ka(o, 'OR'), o.some((n) => Sn(n, t));
	}
	function Sn(e, t) {
		if (typeof e == 'string') return Np(e, t);
		if (typeof e == 'object' && e !== null) {
			if ('and' in e) return Dp(e.and, t);
			if ('or' in e) return Bp(e.or, t);
			if ('not' in e) return !Sn(e.not, t);
		}
		throw new TypeError(`Invalid condition structure: ${JSON.stringify(e)}`);
	}
	function De(e, t) {
		return Sn(e, t);
	}
	function xn(e) {
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
	Nt();
	function Mp(e) {
		let t = e.getAttribute('data-category');
		if (t) {
			if (!rt.includes(t))
				throw new Error(
					`Invalid category attribute "${t}" on iframe. Must be one of: ${rt.join(', ')}`
				);
			return t;
		}
	}
	function cs(e, t) {
		let o = e.getAttribute('data-src'),
			n = Mp(e);
		if (!n) return;
		De(n, t)
			? o && !e.src && ((e.src = o), e.removeAttribute('data-src'))
			: e.src && e.removeAttribute('src');
	}
	function wn() {
		if (typeof document > 'u') return [];
		let e = document.querySelectorAll('iframe[data-category]'),
			t = new Set();
		return e
			? (e.forEach((o) => {
					let n = o.getAttribute('data-category');
					if (!n) return;
					let r = n.trim();
					rt.includes(r) && t.add(r);
				}),
				Array.from(t))
			: [];
	}
	function kn(e) {
		if (typeof document > 'u') return;
		let t = document.querySelectorAll('iframe');
		t &&
			t.forEach((o) => {
				cs(o, e);
			});
	}
	function ls(e, t) {
		let o = new MutationObserver((n) => {
			let r = e(),
				s = !1;
			if (
				(n.forEach((i) => {
					i.addedNodes.forEach((a) => {
						if (a.nodeType === Node.ELEMENT_NODE) {
							let c = a;
							c.tagName &&
								c.tagName.toUpperCase() === 'IFRAME' &&
								(cs(c, r), c.hasAttribute('data-category') && (s = !0));
							let d = c.querySelectorAll?.('iframe');
							d &&
								d.length > 0 &&
								d.forEach((p) => {
									cs(p, r), p.hasAttribute('data-category') && (s = !0);
								});
						}
					});
				}),
				s && t)
			) {
				let i = wn();
				i.length > 0 && t(i);
			}
		});
		return o.observe(document.body, { childList: !0, subtree: !0 }), o;
	}
	function In() {
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
	function Rn(e, t, o) {
		return t ? (o[e] || (o[e] = In()), o[e]) : `c15t-script-${e}`;
	}
	var Po = new Map();
	function yt(e) {
		return Po.has(e);
	}
	function Lo(e) {
		return Po.get(e);
	}
	function Tn(e, t) {
		Po.set(e, t);
	}
	function it(e) {
		Po.delete(e);
	}
	function Ia() {
		return Po;
	}
	function Fp(e, t) {
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
	function vt(e, t, o) {
		return o?.model === 'iab' &&
			o.iabConsent &&
			(e.vendorId !== void 0 ||
				e.iabPurposes ||
				e.iabLegIntPurposes ||
				e.iabSpecialFeatures)
			? Fp(e, o.iabConsent)
			: De(e.category, t);
	}
	function En(e, t, o = {}, n) {
		let r = [];
		return (
			e.forEach((s) => {
				if (!s.alwaysLoad && !vt(s, t, n)) return;
				if (yt(s.id)) {
					s.onConsentChange?.({
						id: s.id,
						elementId: Rn(s.id, s.anonymizeId !== !1, o),
						hasConsent: vt(s, t, n),
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
					let l = s.anonymizeId !== !1,
						m = Rn(s.id, l, o),
						h = {
							id: s.id,
							elementId: m,
							consents: t,
							hasConsent: vt(s, t, n),
						};
					s.onBeforeLoad && s.onBeforeLoad(h),
						s.onLoad && s.onLoad(h),
						Tn(s.id, null),
						r.push(s.id);
					return;
				}
				let i = s.anonymizeId !== !1,
					a = Rn(s.id, i, o);
				if (s.persistAfterConsentRevoked === !0) {
					let l = document.getElementById(a);
					if (l) {
						let m = {
							id: s.id,
							hasConsent: vt(s, t, n),
							elementId: a,
							consents: t,
							element: l,
						};
						s.onConsentChange?.(m), s.onLoad?.(m), Tn(s.id, l), r.push(s.id);
						return;
					}
				}
				let c = document.createElement('script');
				(c.id = a),
					s.src
						? (c.src = s.src)
						: s.textContent && (c.textContent = s.textContent),
					s.fetchPriority && (c.fetchPriority = s.fetchPriority),
					s.async && (c.async = !0),
					s.defer && (c.defer = !0),
					s.nonce && (c.nonce = s.nonce),
					s.attributes &&
						Object.entries(s.attributes).forEach(([l, m]) => {
							c.setAttribute(l, m);
						});
				let d = {
					id: s.id,
					hasConsent: vt(s, t, n),
					elementId: a,
					consents: t,
					element: c,
				};
				s.onLoad &&
					(s.textContent
						? setTimeout(() => {
								s.onLoad?.({ ...d });
							}, 0)
						: c.addEventListener('load', () => {
								s.onLoad?.({ ...d });
							})),
					s.onError &&
						(s.textContent ||
							c.addEventListener('error', () => {
								s.onError?.({
									...d,
									error: new Error(`Failed to load script: ${s.src}`),
								});
							})),
					s.onBeforeLoad && s.onBeforeLoad(d);
				let p = s.target ?? 'head',
					u = p === 'body' ? document.body : document.head;
				if (!u)
					throw new Error(
						`Document ${p} is not available for script injection`
					);
				u.appendChild(c), Tn(s.id, c), r.push(s.id);
			}),
			r
		);
	}
	function ds(e, t, o = {}, n) {
		let r = [];
		return (
			e.forEach((s) => {
				if (yt(s.id) && !s.alwaysLoad && !vt(s, t, n)) {
					let i = Lo(s.id);
					s.callbackOnly === !0 || i === null
						? (it(s.id), r.push(s.id))
						: i &&
							(s.persistAfterConsentRevoked
								? (it(s.id), r.push(s.id))
								: (i.remove(), it(s.id), r.push(s.id)));
				}
			}),
			r
		);
	}
	function An(e, t, o = {}, n) {
		let r = ds(e, t, o, n);
		return { loaded: En(e, t, o, n), unloaded: r };
	}
	function Pn(e) {
		return yt(e);
	}
	function Ln() {
		return Array.from(Ia().keys());
	}
	function us(e, t, o, n = {}, r) {
		let s = t.find((i) => i.id === e);
		if (!s) return !1;
		if (yt(e)) {
			let i = Lo(e);
			s.callbackOnly === !0 || i === null
				? it(e)
				: i && (s.persistAfterConsentRevoked || i.remove(), it(e));
		}
		return !s.alwaysLoad && !vt(s, o, r) ? !1 : (En([s], o, n, r), !0);
	}
	function ps(e, t) {
		let o = () => {
			let { scripts: n, consents: r, scriptIdMap: s, model: i, iab: a } = e(),
				c = a?.config.enabled
					? {
							vendorConsents: a.vendorConsents,
							vendorLegitimateInterests: a.vendorLegitimateInterests,
							purposeConsents: a.purposeConsents,
							purposeLegitimateInterests: a.purposeLegitimateInterests,
							specialFeatureOptIns: a.specialFeatureOptIns,
						}
					: void 0,
				d = An(n, r, s, { model: i, iabConsent: c }),
				p = { ...e().loadedScripts };
			return (
				d.loaded.forEach((u) => {
					p[u] = !0;
				}),
				d.unloaded.forEach((u) => {
					p[u] = !1;
				}),
				t({ loadedScripts: p }),
				d
			);
		};
		return {
			updateScripts: () => o(),
			setScripts: (n) => {
				let r = e(),
					s = { ...r.scriptIdMap };
				n.forEach((d) => {
					d.anonymizeId !== !1 && (s[d.id] = In());
				});
				let i = n.flatMap((d) => xn(d.category)),
					a = new Set([...r.consentCategories, ...i]),
					c = Array.from(a);
				t({
					scripts: [...r.scripts, ...n],
					scriptIdMap: s,
					consentCategories: c,
				}),
					o();
			},
			removeScript: (n) => {
				let r = e();
				if (yt(n)) {
					let i = Lo(n);
					i && (i.remove(), it(n));
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
				return us(n, r.scripts, r.consents, r.scriptIdMap);
			},
			isScriptLoaded: (n) => Pn(n),
			getLoadedScriptIds: () => Ln(),
		};
	}
	Dt();
	var Ra = (e) => {
			let t,
				o = new Set(),
				n = (d, p) => {
					let u = typeof d == 'function' ? d(t) : d;
					if (!Object.is(u, t)) {
						let l = t;
						(t =
							(p ?? (typeof u != 'object' || u === null))
								? u
								: Object.assign({}, t, u)),
							o.forEach((m) => m(t, l));
					}
				},
				r = () => t,
				a = {
					setState: n,
					getState: r,
					getInitialState: () => c,
					subscribe: (d) => (o.add(d), () => o.delete(d)),
				},
				c = (t = e(n, r, a));
			return a;
		},
		Ta = (e) => (e ? Ra(e) : Ra);
	st();
	gt();
	function Ea(e, t) {
		let o = null,
			n = !1;
		return {
			initializeIframeBlocker: () => {
				if (n || typeof document > 'u') return;
				let r = e();
				if (r.iframeBlockerConfig?.disableAutomaticBlocking) return;
				let s = () => {
					let i = wn();
					i.length > 0 && e().updateConsentCategories(i);
				};
				document.readyState === 'loading'
					? document.addEventListener('DOMContentLoaded', s)
					: s(),
					setTimeout(s, 100),
					kn(r.consents),
					(o = ls(
						() => e().consents,
						(i) => e().updateConsentCategories(i)
					)),
					(n = !0);
			},
			updateIframeConsents: () => {
				if (!n || typeof document > 'u') return;
				let r = e(),
					{ consents: s, iframeBlockerConfig: i } = r;
				i?.disableAutomaticBlocking || kn(s);
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
	_n();
	var On = 'c15t:pending-consent-sync';
	function Vp(e, t, o, n, r) {
		if (!n || o === null) return !1;
		let s = new Set(r.filter((a) => a.disabled).map((a) => a.name));
		return Object.entries(t).some(
			([a, c]) => !s.has(a) && e[a] === !0 && c === !1
		);
	}
	async function Aa({ manager: e, type: t, get: o, set: n, options: r }) {
		let {
				callbacks: s,
				selectedConsents: i,
				consents: a,
				consentTypes: c,
				updateScripts: d,
				updateIframeConsents: p,
				updateNetworkBlockerConsents: u,
				consentCategories: l,
				locationInfo: m,
				model: h,
				consentInfo: _,
				reloadOnConsentRevoked: g,
			} = o(),
			C = { ...a },
			v = _,
			b = { ...(i ?? a ?? {}) },
			x = Date.now();
		if (t === 'all') for (let O of c) l.includes(O.name) && (b[O.name] = !0);
		else if (t === 'necessary')
			for (let O of c) b[O.name] = O.disabled === !0 ? O.defaultValue : !1;
		let I = _?.subjectId;
		I || (I = Ao());
		let T = o().consentInfo?.externalId || o().user?.id,
			P = o().consentInfo?.identityProvider || o().user?.identityProvider,
			B = Vp(C, b, v, g, c);
		if (
			(n({
				consents: b,
				selectedConsents: b,
				activeUI: 'none',
				consentInfo: {
					time: x,
					subjectId: I,
					externalId: T,
					identityProvider: P,
				},
			}),
			B)
		) {
			let O = {
				type: t,
				subjectId: I,
				externalId: T,
				identityProvider: P,
				preferences: b,
				givenAt: x,
				jurisdiction: m?.jurisdiction ?? void 0,
				jurisdictionModel: h,
				domain: window.location.hostname,
				uiSource: r?.uiSource ?? 'api',
			};
			try {
				localStorage.setItem(On, JSON.stringify(O));
			} catch {}
			s.onConsentSet?.({ preferences: b }),
				s.onBeforeConsentRevocationReload?.({ preferences: b }),
				window.location.reload();
			return;
		}
		await new Promise((O) => setTimeout(O, 0)),
			p(),
			d(),
			u(),
			s.onConsentSet?.({ preferences: b });
		let M = await e.setConsent({
			body: {
				type: 'cookie_banner',
				domain: window.location.hostname,
				preferences: b,
				subjectId: I,
				externalSubjectId: String(T),
				identityProvider: P,
				jurisdiction: m?.jurisdiction ?? void 0,
				jurisdictionModel: h ?? void 0,
				givenAt: x,
				uiSource: r?.uiSource ?? 'api',
				consentAction: t,
			},
		});
		if (!M.ok) {
			let O = M.error?.message ?? 'Failed to save consents';
			s.onError?.({ error: O }), s.onError || console.error(O);
		}
	}
	yo();
	function Pa(e, t) {
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
	function La() {
		if (typeof window > 'u') return !1;
		try {
			let t = window.navigator.globalPrivacyControl;
			return t === !0 || t === '1';
		} catch {
			return !1;
		}
	}
	Dt();
	st();
	var Wp = 0,
		Kp = Ve;
	function It({ get: e, set: t }, o) {
		let { iab: n } = e();
		n && t({ iab: { ...n, ...o } });
	}
	async function dl(e, t, o) {
		let { get: n } = t;
		if (o !== null) {
			It(t, { isLoadingGVL: !0, nonIABVendors: e.customVendors ?? [] });
			try {
				let {
					initializeIABStub: r,
					fetchGVL: s,
					createCMPApi: i,
				} = await Promise.resolve().then(() => ($n(), Gn));
				r();
				let a;
				if (o) a = o;
				else if (((a = await s()), a === null)) {
					It(t, { isLoadingGVL: !1 });
					return;
				}
				It(t, { gvl: a, isLoadingGVL: !1 });
				let c = {},
					d = {};
				for (let [g, C] of Object.entries(a.vendors)) {
					let v = String(g);
					C.purposes && C.purposes.length > 0 && (c[v] = !1),
						C.legIntPurposes && C.legIntPurposes.length > 0 && (d[v] = !0);
				}
				(e.customVendors ?? []).forEach((g) => {
					let C = String(g.id);
					g.purposes && g.purposes.length > 0 && (c[C] = !1),
						g.legIntPurposes && g.legIntPurposes.length > 0 && (d[C] = !0);
				});
				let u = Ue(n().storageConfig);
				u?.iabCustomVendorConsents &&
					Object.assign(c, u.iabCustomVendorConsents),
					u?.iabCustomVendorLegitimateInterests &&
						Object.assign(d, u.iabCustomVendorLegitimateInterests),
					It(t, { vendorConsents: c, vendorLegitimateInterests: d });
				let l = e.cmpId ?? Wp,
					m = e.cmpVersion ?? Kp;
				if (l === 0)
					throw new Error(
						'[c15t] IAB TCF Error: CMP ID is 0. A valid CMP ID registered with IAB Europe is required for IAB TCF compliance.\nIf using consent.io, the CMP ID should be provided automatically via /init.\nIf self-hosting, configure it on the backend via `advanced.iab.cmpId` or on the client via `iab.cmpId`.\nTo register your own CMP: https://iabeurope.eu/tcf-for-cmps/'
					);
				let h = i({ cmpId: l, cmpVersion: m, gvl: a, gdprApplies: !0 });
				It(t, { cmpApi: h });
				let _ = h.loadFromStorage();
				_ && (await Yp(_, t)), n().updateScripts();
			} catch (r) {
				console.error('Failed to initialize IAB mode:', r),
					It(t, { isLoadingGVL: !1 });
			}
		}
	}
	async function Yp(e, t) {
		let { set: o } = t;
		try {
			let { decodeTCString: n, iabPurposesToC15tConsents: r } =
					await Promise.resolve().then(() => ($n(), Gn)),
				s = await n(e),
				i = Ue(t.get().storageConfig),
				a = { ...s.vendorConsents, ...(i?.iabCustomVendorConsents ?? {}) },
				c = {
					...s.vendorLegitimateInterests,
					...(i?.iabCustomVendorLegitimateInterests ?? {}),
				},
				d = r(s.purposeConsents);
			It(t, {
				tcString: e,
				purposeConsents: s.purposeConsents,
				purposeLegitimateInterests: s.purposeLegitimateInterests,
				vendorConsents: a,
				vendorLegitimateInterests: c,
				specialFeatureOptIns: s.specialFeatureOptIns,
			}),
				o({ consents: d, selectedConsents: d, activeUI: 'none' });
		} catch {}
	}
	function Qp(e, t) {
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
	function ul(e, t, o, n) {
		let r = Pa(e, t),
			s = n !== void 0 ? n : La(),
			a = Qp((r === null || r === 'opt-out') && o === null, s);
		return { consentModel: r, autoGrantedConsents: a };
	}
	function Jp(e, t, o, n) {
		let { get: r, initialTranslationConfig: s } = t,
			{ consentInfo: i } = r(),
			{ translations: a, location: c } = e,
			{ consentModel: d, autoGrantedConsents: p } = ul(
				e.jurisdiction ?? null,
				n,
				i,
				t.get().overrides?.gpc
			),
			u = {
				model: d,
				isLoadingConsentInfo: !1,
				branding: e.branding ?? 'c15t',
				hasFetchedBanner: !0,
				lastBannerFetchData: e,
				locationInfo: {
					countryCode: c?.countryCode ?? null,
					regionCode: c?.regionCode ?? null,
					jurisdiction: e.jurisdiction ?? null,
				},
			};
		return (
			i === null && (u.activeUI = d ? 'banner' : 'none'),
			p && ((u.consents = p), (u.selectedConsents = p)),
			a?.language &&
				a?.translations &&
				(u.translationConfig = Ur(
					{
						translations: { [a.language]: a.translations },
						disableAutoLanguageSwitch: !0,
						defaultLanguage: a.language,
					},
					s
				)),
			u
		);
	}
	function Xp(e, t, o) {
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
	async function Ms(e, t, o, n) {
		let { set: r, get: s } = t,
			{ consentInfo: i } = s(),
			a = s().iab;
		if (t.iabConfig && !a) {
			let { createIABManager: m } = await Promise.resolve().then(
				() => (Bs(), ll)
			);
			(a = m(t.iabConfig, s, r, t.manager)), r({ iab: a });
		}
		let c = a?.config.enabled && !n,
			d = a?.config.enabled && !c;
		c &&
			console.warn(
				'IAB mode disabled: Server returned 200 without GVL. Client IAB settings overridden.'
			);
		let { consentModel: p, autoGrantedConsents: u } = ul(
				e.jurisdiction ?? null,
				d,
				i,
				s().overrides?.gpc
			),
			l = Jp(e, t, o, d);
		if (
			(c && a
				? (l.iab = { ...a, config: { ...a.config, enabled: !1 } })
				: a &&
					e.cmpId != null &&
					(l.iab = { ...a, config: { ...a.config, cmpId: e.cmpId } }),
			r(l),
			Xp(e, t, u),
			s().updateScripts(),
			d && p === 'iab' && a)
		) {
			let m = e.customVendors ?? [],
				h = a.config.customVendors ?? [],
				_ = new Set(m.map((v) => v.id)),
				g = [...m, ...h.filter((v) => !_.has(v.id))],
				C = {
					...a.config,
					customVendors: g,
					...(e.cmpId != null && { cmpId: e.cmpId }),
				};
			dl(C, { set: r, get: s }, n).catch((v) => {
				console.error('Failed to initialize IAB mode in updateStore:', v);
			});
		}
	}
	function pl(e) {
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
	async function js(e) {
		let { get: t, set: o, manager: n } = e,
			{ callbacks: r } = t();
		if (typeof window > 'u') return;
		let s = pl(o);
		if (!s) return;
		o({ isLoadingConsentInfo: !0 }), tf(n, r);
		let i = await Zp(e);
		return i || ef(e, s, n, r);
	}
	async function Zp(e) {
		let { ssrData: t, get: o, set: n } = e;
		if (!t || o().overrides) {
			n({ ssrDataUsed: !1, ssrSkippedReason: 'no_data' });
			return;
		}
		let r = await t;
		if (r?.init)
			return (
				await Ms(r.init, e, !0, r.gvl),
				n({ ssrDataUsed: !0, ssrSkippedReason: null }),
				r.init
			);
		n({ ssrDataUsed: !1, ssrSkippedReason: 'fetch_failed' });
	}
	async function ef(e, t, o, n) {
		let { set: r } = e;
		try {
			let { language: s, country: i, region: a } = e.get().overrides ?? {},
				{ data: c, error: d } = await o.init({
					headers: {
						...(s && { 'accept-language': s }),
						...(i && { 'x-c15t-country': i }),
						...(a && { 'x-c15t-region': a }),
					},
					onError: n.onError
						? (p) => {
								n.onError?.({ error: p.error?.message || 'Unknown error' });
							}
						: void 0,
				});
			if (d || !c)
				throw new Error(`Failed to fetch consent banner info: ${d?.message}`);
			return await Ms(c, e, t, c.gvl ?? void 0), c;
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
	function tf(e, t) {
		try {
			let o = localStorage.getItem(On);
			if (!o) return;
			localStorage.removeItem(On);
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
	function Fs(e) {
		return e ? e.toUpperCase() : 'GET';
	}
	function of(e) {
		if (!e) return null;
		try {
			return typeof window > 'u' ? null : new URL(e, window.location.href);
		} catch {
			return null;
		}
	}
	function nf(e, t) {
		if (!e) return !1;
		let o = t.domain.trim().toLowerCase(),
			n = e.trim().toLowerCase();
		if (!o || !n) return !1;
		if (n === o) return !0;
		let r = `.${o}`;
		return n.endsWith(r);
	}
	function rf(e, t) {
		return typeof t.pathIncludes == 'string'
			? e
				? e.includes(t.pathIncludes)
				: !1
			: !0;
	}
	function sf(e, t) {
		if (!t.methods || t.methods.length === 0) return !0;
		if (!e) return !1;
		let o = Fs(e);
		return t.methods.some((n) => Fs(n) === o);
	}
	function af(e, t, o) {
		return !(!nf(e.hostname, o) || !rf(e.pathname, o) || !sf(t, o));
	}
	function Vs(e, t, o) {
		if (!o) return { shouldBlock: !1 };
		if (!(o.enabled !== !1)) return { shouldBlock: !1 };
		if (!o.rules || o.rules.length === 0) return { shouldBlock: !1 };
		let r = of(e.url);
		if (!r) return { shouldBlock: !1 };
		let s = Fs(e.method);
		for (let i of o.rules) {
			if (!af(r, s, i)) continue;
			if (!De(i.category, t)) return { shouldBlock: !0, rule: i };
		}
		return { shouldBlock: !1 };
	}
	function fl(e, t) {
		let o = null,
			n = null,
			r = null,
			s = !1,
			i = null,
			a = (u, l) => {
				if (u) {
					if (u.logBlockedRequests !== !1) {
						let m = l.rule?.id ?? 'unknown';
						console.warn('[c15t] Network request blocked by consent manager', {
							method: l.method,
							url: l.url,
							ruleId: m,
						});
					}
					u.onRequestBlocked && u.onRequestBlocked(l);
				}
			},
			c = () => i || e().consents,
			d = () => {
				typeof window > 'u' ||
					!(typeof window.fetch == 'function') ||
					o ||
					((o = window.fetch),
					(window.fetch = (l, m) => {
						let _ = e().networkBlocker;
						if (!o)
							throw new Error('Network blocker fetch wrapper not initialized.');
						if (!(_?.enabled && _?.rules && _?.rules.length > 0))
							return o.call(window, l, m);
						let C = 'GET';
						m?.method ? (C = m.method) : l instanceof Request && (C = l.method);
						let v;
						typeof l == 'string' || l instanceof URL
							? (v = l.toString())
							: (v = l.url);
						let b = c(),
							{ shouldBlock: x, rule: I } = Vs({ url: v, method: C }, b, _);
						if (x) {
							a(_, { method: C, url: v, rule: I });
							let T = new Response(null, {
								status: 451,
								statusText: 'Request blocked by consent manager',
							});
							return Promise.resolve(T);
						}
						return o.call(window, l, m);
					}));
			},
			p = () => {
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
					(window.XMLHttpRequest.prototype.open = function (l, m, h, _, g) {
						let C = this;
						if (((C.__c15tMethod = l), (C.__c15tUrl = m), !n))
							throw new Error(
								'Network blocker XHR open wrapper not initialized.'
							);
						return n.call(this, l, m, h ?? !0, _, g);
					}),
					(window.XMLHttpRequest.prototype.send = function (l) {
						let h = e().networkBlocker;
						if (h?.enabled !== !1 && h?.rules && h?.rules.length > 0) {
							let C = this,
								v = C.__c15tMethod || 'GET',
								b = C.__c15tUrl || '',
								x = c(),
								{ shouldBlock: I, rule: T } = Vs({ url: b, method: v }, x, h);
							if (I) {
								a(h, { method: v, url: b, rule: T });
								try {
									this.abort();
								} catch {}
								let P = new ProgressEvent('error');
								typeof this.onerror == 'function' && this.onerror(P),
									this.dispatchEvent(P);
								return;
							}
						}
						if (!r)
							throw new Error(
								'Network blocker XHR send wrapper not initialized.'
							);
						return r.call(this, l);
					}));
			};
		return {
			initializeNetworkBlocker: () => {
				if (s || typeof window > 'u') return;
				let u = e(),
					l = u.networkBlocker;
				l?.enabled &&
					l?.rules &&
					l?.rules.length > 0 &&
					((i = u.consents), d(), p(), (s = !0));
			},
			updateNetworkBlockerConsents: () => {
				s && (i = e().consents);
			},
			setNetworkBlocker: (u) => {
				let m = u?.enabled !== !1 && u?.rules && u?.rules.length > 0;
				if ((t({ networkBlocker: u }), !m)) {
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
				s || ((i = e().consents), d(), p(), (s = !0));
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
	Nt();
	Zr();
	var ml = (e) => {
			if (typeof window > 'u') return null;
			try {
				return Ue(e);
			} catch (t) {
				return console.error('Failed to retrieve stored consent:', t), null;
			}
		},
		Us = (e, t = {}) => {
			let {
				namespace: o = 'c15tStore',
				iab: n,
				ssrData: r,
				initialConsentCategories: s,
				initialTranslationConfig: i,
				enabled: a,
				debug: c,
				...d
			} = t;
			Zi(t.debug === !0);
			let p = ml(t.storageConfig),
				u = Ta((l, m) => ({
					...ca,
					...d,
					namespace: o,
					iab: null,
					...(s && { consentCategories: s }),
					...(p
						? {
								consents: p.consents,
								selectedConsents: p.consents,
								consentInfo: p.consentInfo,
								user: p.consentInfo?.externalId
									? {
											id: p.consentInfo.externalId,
											identityProvider: p.consentInfo.identityProvider,
										}
									: void 0,
								activeUI: 'none',
								isLoadingConsentInfo: !1,
							}
						: { activeUI: 'none', isLoadingConsentInfo: !0 }),
					setActiveUI: (h, _ = {}) => {
						if (h === 'none' || h === 'dialog') {
							l({ activeUI: h });
							return;
						}
						if (_.force) {
							l({ activeUI: 'banner' });
							return;
						}
						let g = m();
						!ml() &&
							!g.consentInfo &&
							!g.isLoadingConsentInfo &&
							l({ activeUI: 'banner' });
					},
					setSelectedConsent: (h, _) => {
						l((g) =>
							g.consentTypes.find((v) => v.name === h)?.disabled
								? g
								: { selectedConsents: { ...g.selectedConsents, [h]: _ } }
						);
					},
					saveConsents: async (h, _) =>
						await Aa({ manager: e, type: h, get: m, set: l, options: _ }),
					setConsent: (h, _) => {
						l((g) =>
							g.consentTypes.find((b) => b.name === h)?.disabled
								? g
								: { selectedConsents: { ...g.consents, [h]: _ } }
						),
							m().saveConsents('custom');
					},
					resetConsents: () => {
						l(() => {
							let h = Xe.reduce(
									(g, C) => ((g[C.name] = C.defaultValue), g),
									{}
								),
								_ = { consents: h, selectedConsents: h, consentInfo: null };
							return ko(void 0, t.storageConfig), _;
						});
					},
					setConsentCategories: (h) => l({ consentCategories: h }),
					setCallback: (h, _) => {
						let g = m();
						if (
							(l((C) => ({ callbacks: { ...C.callbacks, [h]: _ } })),
							h === 'onConsentSet' &&
								_ &&
								typeof _ == 'function' &&
								_?.({ preferences: g.consents }),
							h === 'onBannerFetched' &&
								g.hasFetchedBanner &&
								g.lastBannerFetchData &&
								_ &&
								typeof _ == 'function')
						) {
							let { lastBannerFetchData: C } = g,
								v = C.jurisdiction ?? 'NONE';
							_?.({
								jurisdiction: { code: v, message: '' },
								location: {
									countryCode: C.location.countryCode ?? null,
									regionCode: C.location.regionCode ?? null,
								},
								translations: {
									language: C.translations.language,
									translations: C.translations.translations,
								},
							});
						}
					},
					setLocationInfo: (h) => l({ locationInfo: h }),
					initConsentManager: () =>
						js({
							manager: e,
							ssrData: t.ssrData,
							initialTranslationConfig: t.initialTranslationConfig,
							iabConfig: n,
							get: m,
							set: l,
						}),
					getDisplayedConsents: () => {
						let { consentCategories: h, consentTypes: _ } = m();
						return _.filter((g) => h.includes(g.name));
					},
					hasConsented: () => {
						let { consentInfo: h } = m();
						return h != null;
					},
					has: (h) => {
						let { consents: _ } = m();
						return De(h, _);
					},
					setTranslationConfig: (h) => {
						l({ translationConfig: h });
					},
					updateConsentCategories: (h) => {
						let _ = new Set([...m().consentCategories, ...h]),
							g = Array.from(_);
						l({ consentCategories: g });
					},
					identifyUser: async (h) => {
						let _ = m().consentInfo,
							g = _?.subjectId;
						l({ user: h }),
							g &&
								((String(_?.externalId) === String(h.id) &&
									_?.identityProvider === h.identityProvider) ||
									(await e.identifyUser({
										body: {
											id: g,
											externalId: h.id,
											identityProvider: h.identityProvider,
										},
									}),
									l({
										consentInfo: {
											..._,
											time: _?.time || Date.now(),
											subjectId: g,
											externalId: h.id,
											identityProvider: h.identityProvider,
										},
									})));
					},
					setOverrides: async (h) => (
						l({ overrides: { ...m().overrides, ...h } }),
						await js({
							manager: e,
							initialTranslationConfig: t.initialTranslationConfig,
							get: m,
							set: l,
						})
					),
					setLanguage: async (h) =>
						await m().setOverrides({ ...(m().overrides ?? {}), language: h }),
					...ps(m, l),
					...Ea(m, l),
					...fl(m, l),
				}));
			return (
				u.getState().initializeIframeBlocker(),
				t.networkBlocker &&
					(u.setState({ networkBlocker: t.networkBlocker }),
					u.getState().initializeNetworkBlocker()),
				t.scripts &&
					t.scripts.length > 0 &&
					u
						.getState()
						.updateConsentCategories(t.scripts.flatMap((l) => xn(l.category))),
				typeof window < 'u' &&
					((window[o] = u),
					u
						.getState()
						.callbacks.onConsentSet?.({ preferences: u.getState().consents }),
					t.user && u.getState().identifyUser(t.user),
					u.getState().initConsentManager()),
				u
			);
		};
	var cf = '/api/c15t',
		gl = new Map(),
		hl = new Map();
	function lf(e) {
		let t = e.enabled === !1 ? 'disabled' : 'enabled';
		return `${e.mode ?? 'c15t'}:${e.backendURL ?? 'default'}:${e.endpointHandlers ? 'custom' : 'none'}:${e.storageConfig?.storageKey ?? 'default'}:${e.defaultLanguage ?? 'default'}:${t}`;
	}
	function Hs(e, t) {
		let {
				mode: o,
				backendURL: n,
				store: r,
				translations: s,
				storageConfig: i,
				enabled: a,
				iab: c,
				consentCategories: d,
				debug: p,
			} = e,
			u = lf({
				mode: o,
				backendURL: n,
				endpointHandlers: 'endpointHandlers' in e ? e.endpointHandlers : void 0,
				storageConfig: i,
				defaultLanguage: s?.defaultLanguage,
				enabled: a,
			}),
			l = gl.get(u);
		if (!l) {
			let h = { ...r, initialTranslationConfig: s, iab: c };
			o === 'offline'
				? (l = Vt({ mode: 'offline', store: h, storageConfig: i }))
				: o === 'custom' && 'endpointHandlers' in e
					? (l = Vt({
							mode: 'custom',
							endpointHandlers: e.endpointHandlers,
							store: h,
							storageConfig: i,
						}))
					: (l = Vt({
							mode: 'c15t',
							backendURL: n || cf,
							store: h,
							storageConfig: i,
						})),
				gl.set(u, l);
		}
		let m = hl.get(u);
		return (
			m ||
				((m = Us(l, {
					config: {
						pkg: t?.pkg || 'c15t',
						version: t?.version || Ve,
						mode: o || 'Unknown',
					},
					...e,
					...r,
					initialTranslationConfig: s,
					initialConsentCategories: d,
					debug: p,
				})),
				hl.set(u, m)),
			{ consentManager: l, consentStore: m, cacheKey: u }
		);
	}
	fn();
	Nt();
	var $o,
		L,
		Cl,
		uf,
		Rt,
		bl,
		_l,
		Sl,
		xl,
		Ws,
		zs,
		Gs,
		wl,
		Go = {},
		kl = [],
		pf = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i,
		qo = Array.isArray;
	function We(e, t) {
		for (var o in t) e[o] = t[o];
		return e;
	}
	function Ks(e) {
		e && e.parentNode && e.parentNode.removeChild(e);
	}
	function Ee(e, t, o) {
		var n,
			r,
			s,
			i = {};
		for (s in t)
			s == 'key' ? (n = t[s]) : s == 'ref' ? (r = t[s]) : (i[s] = t[s]);
		if (
			(arguments.length > 2 &&
				(i.children = arguments.length > 3 ? $o.call(arguments, 2) : o),
			typeof e == 'function' && e.defaultProps != null)
		)
			for (s in e.defaultProps) i[s] === void 0 && (i[s] = e.defaultProps[s]);
		return zo(e, i, n, r, null);
	}
	function zo(e, t, o, n, r) {
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
			__v: r ?? ++Cl,
			__i: -1,
			__u: 0,
		};
		return r == null && L.vnode != null && L.vnode(s), s;
	}
	function Kn() {
		return { current: null };
	}
	function F(e) {
		return e.children;
	}
	function ve(e, t) {
		(this.props = e), (this.context = t);
	}
	function Kt(e, t) {
		if (t == null) return e.__ ? Kt(e.__, e.__i + 1) : null;
		for (var o; t < e.__k.length; t++)
			if ((o = e.__k[t]) != null && o.__e != null) return o.__e;
		return typeof e.type == 'function' ? Kt(e) : null;
	}
	function Il(e) {
		var t, o;
		if ((e = e.__) != null && e.__c != null) {
			for (e.__e = e.__c.base = null, t = 0; t < e.__k.length; t++)
				if ((o = e.__k[t]) != null && o.__e != null) {
					e.__e = e.__c.base = o.__e;
					break;
				}
			return Il(e);
		}
	}
	function $s(e) {
		((!e.__d && (e.__d = !0) && Rt.push(e) && !Wn.__r++) ||
			bl != L.debounceRendering) &&
			((bl = L.debounceRendering) || _l)(Wn);
	}
	function Wn() {
		for (var e, t, o, n, r, s, i, a = 1; Rt.length; )
			Rt.length > a && Rt.sort(Sl),
				(e = Rt.shift()),
				(a = Rt.length),
				e.__d &&
					((o = void 0),
					(n = void 0),
					(r = (n = (t = e).__v).__e),
					(s = []),
					(i = []),
					t.__P &&
						(((o = We({}, n)).__v = n.__v + 1),
						L.vnode && L.vnode(o),
						Ys(
							t.__P,
							o,
							n,
							t.__n,
							t.__P.namespaceURI,
							32 & n.__u ? [r] : null,
							s,
							r ?? Kt(n),
							!!(32 & n.__u),
							i
						),
						(o.__v = n.__v),
						(o.__.__k[o.__i] = o),
						El(s, o, i),
						(n.__e = n.__ = null),
						o.__e != r && Il(o)));
		Wn.__r = 0;
	}
	function Rl(e, t, o, n, r, s, i, a, c, d, p) {
		var u,
			l,
			m,
			h,
			_,
			g,
			C,
			v = (n && n.__k) || kl,
			b = t.length;
		for (c = ff(o, t, v, c, b), u = 0; u < b; u++)
			(m = o.__k[u]) != null &&
				((l = m.__i == -1 ? Go : v[m.__i] || Go),
				(m.__i = u),
				(g = Ys(e, m, l, r, s, i, a, c, d, p)),
				(h = m.__e),
				m.ref &&
					l.ref != m.ref &&
					(l.ref && Qs(l.ref, null, m), p.push(m.ref, m.__c || h, m)),
				_ == null && h != null && (_ = h),
				(C = !!(4 & m.__u)) || l.__k === m.__k
					? (c = Tl(m, c, e, C))
					: typeof m.type == 'function' && g !== void 0
						? (c = g)
						: h && (c = h.nextSibling),
				(m.__u &= -7));
		return (o.__e = _), c;
	}
	function ff(e, t, o, n, r) {
		var s,
			i,
			a,
			c,
			d,
			p = o.length,
			u = p,
			l = 0;
		for (e.__k = new Array(r), s = 0; s < r; s++)
			(i = t[s]) != null && typeof i != 'boolean' && typeof i != 'function'
				? ((c = s + l),
					((i = e.__k[s] =
						typeof i == 'string' ||
						typeof i == 'number' ||
						typeof i == 'bigint' ||
						i.constructor == String
							? zo(null, i, null, null, null)
							: qo(i)
								? zo(F, { children: i }, null, null, null)
								: i.constructor == null && i.__b > 0
									? zo(i.type, i.props, i.key, i.ref ? i.ref : null, i.__v)
									: i).__ = e),
					(i.__b = e.__b + 1),
					(a = null),
					(d = i.__i = mf(i, o, c, u)) != -1 &&
						(u--, (a = o[d]) && (a.__u |= 2)),
					a == null || a.__v == null
						? (d == -1 && (r > p ? l-- : r < p && l++),
							typeof i.type != 'function' && (i.__u |= 4))
						: d != c &&
							(d == c - 1
								? l--
								: d == c + 1
									? l++
									: (d > c ? l-- : l++, (i.__u |= 4))))
				: (e.__k[s] = null);
		if (u)
			for (s = 0; s < p; s++)
				(a = o[s]) != null &&
					(2 & a.__u) == 0 &&
					(a.__e == n && (n = Kt(a)), Pl(a, a));
		return n;
	}
	function Tl(e, t, o, n) {
		var r, s;
		if (typeof e.type == 'function') {
			for (r = e.__k, s = 0; r && s < r.length; s++)
				r[s] && ((r[s].__ = e), (t = Tl(r[s], t, o, n)));
			return t;
		}
		e.__e != t &&
			(n &&
				(t && e.type && !t.parentNode && (t = Kt(e)),
				o.insertBefore(e.__e, t || null)),
			(t = e.__e));
		do t = t && t.nextSibling;
		while (t != null && t.nodeType == 8);
		return t;
	}
	function Ke(e, t) {
		return (
			(t = t || []),
			e == null ||
				typeof e == 'boolean' ||
				(qo(e)
					? e.some(function (o) {
							Ke(o, t);
						})
					: t.push(e)),
			t
		);
	}
	function mf(e, t, o, n) {
		var r,
			s,
			i,
			a = e.key,
			c = e.type,
			d = t[o],
			p = d != null && (2 & d.__u) == 0;
		if ((d === null && e.key == null) || (p && a == d.key && c == d.type))
			return o;
		if (n > (p ? 1 : 0)) {
			for (r = o - 1, s = o + 1; r >= 0 || s < t.length; )
				if (
					(d = t[(i = r >= 0 ? r-- : s++)]) != null &&
					(2 & d.__u) == 0 &&
					a == d.key &&
					c == d.type
				)
					return i;
		}
		return -1;
	}
	function yl(e, t, o) {
		t[0] == '-'
			? e.setProperty(t, o ?? '')
			: (e[t] =
					o == null ? '' : typeof o != 'number' || pf.test(t) ? o : o + 'px');
	}
	function qn(e, t, o, n, r) {
		var s, i;
		e: if (t == 'style')
			if (typeof o == 'string') e.style.cssText = o;
			else {
				if ((typeof n == 'string' && (e.style.cssText = n = ''), n))
					for (t in n) (o && t in o) || yl(e.style, t, '');
				if (o) for (t in o) (n && o[t] == n[t]) || yl(e.style, t, o[t]);
			}
		else if (t[0] == 'o' && t[1] == 'n')
			(s = t != (t = t.replace(xl, '$1'))),
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
						: ((o.u = Ws), e.addEventListener(t, s ? Gs : zs, s))
					: e.removeEventListener(t, s ? Gs : zs, s);
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
	function vl(e) {
		return function (t) {
			if (this.l) {
				var o = this.l[t.type + e];
				if (t.t == null) t.t = Ws++;
				else if (t.t < o.u) return;
				return o(L.event ? L.event(t) : t);
			}
		};
	}
	function Ys(e, t, o, n, r, s, i, a, c, d) {
		var p,
			u,
			l,
			m,
			h,
			_,
			g,
			C,
			v,
			b,
			x,
			I,
			T,
			P,
			B,
			M,
			O,
			ae = t.type;
		if (t.constructor != null) return null;
		128 & o.__u && ((c = !!(32 & o.__u)), (s = [(a = t.__e = o.__e)])),
			(p = L.__b) && p(t);
		e: if (typeof ae == 'function')
			try {
				if (
					((C = t.props),
					(v = 'prototype' in ae && ae.prototype.render),
					(b = (p = ae.contextType) && n[p.__c]),
					(x = p ? (b ? b.props.value : p.__) : n),
					o.__c
						? (g = (u = t.__c = o.__c).__ = u.__E)
						: (v
								? (t.__c = u = new ae(C, x))
								: ((t.__c = u = new ve(C, x)),
									(u.constructor = ae),
									(u.render = hf)),
							b && b.sub(u),
							(u.props = C),
							u.state || (u.state = {}),
							(u.context = x),
							(u.__n = n),
							(l = u.__d = !0),
							(u.__h = []),
							(u._sb = [])),
					v && u.__s == null && (u.__s = u.state),
					v &&
						ae.getDerivedStateFromProps != null &&
						(u.__s == u.state && (u.__s = We({}, u.__s)),
						We(u.__s, ae.getDerivedStateFromProps(C, u.__s))),
					(m = u.props),
					(h = u.state),
					(u.__v = t),
					l)
				)
					v &&
						ae.getDerivedStateFromProps == null &&
						u.componentWillMount != null &&
						u.componentWillMount(),
						v && u.componentDidMount != null && u.__h.push(u.componentDidMount);
				else {
					if (
						(v &&
							ae.getDerivedStateFromProps == null &&
							C !== m &&
							u.componentWillReceiveProps != null &&
							u.componentWillReceiveProps(C, x),
						(!u.__e &&
							u.shouldComponentUpdate != null &&
							u.shouldComponentUpdate(C, u.__s, x) === !1) ||
							t.__v == o.__v)
					) {
						for (
							t.__v != o.__v &&
								((u.props = C), (u.state = u.__s), (u.__d = !1)),
								t.__e = o.__e,
								t.__k = o.__k,
								t.__k.some(function (Re) {
									Re && (Re.__ = t);
								}),
								I = 0;
							I < u._sb.length;
							I++
						)
							u.__h.push(u._sb[I]);
						(u._sb = []), u.__h.length && i.push(u);
						break e;
					}
					u.componentWillUpdate != null && u.componentWillUpdate(C, u.__s, x),
						v &&
							u.componentDidUpdate != null &&
							u.__h.push(function () {
								u.componentDidUpdate(m, h, _);
							});
				}
				if (
					((u.context = x),
					(u.props = C),
					(u.__P = e),
					(u.__e = !1),
					(T = L.__r),
					(P = 0),
					v)
				) {
					for (
						u.state = u.__s,
							u.__d = !1,
							T && T(t),
							p = u.render(u.props, u.state, u.context),
							B = 0;
						B < u._sb.length;
						B++
					)
						u.__h.push(u._sb[B]);
					u._sb = [];
				} else
					do
						(u.__d = !1),
							T && T(t),
							(p = u.render(u.props, u.state, u.context)),
							(u.state = u.__s);
					while (u.__d && ++P < 25);
				(u.state = u.__s),
					u.getChildContext != null && (n = We(We({}, n), u.getChildContext())),
					v &&
						!l &&
						u.getSnapshotBeforeUpdate != null &&
						(_ = u.getSnapshotBeforeUpdate(m, h)),
					(M = p),
					p != null &&
						p.type === F &&
						p.key == null &&
						(M = Al(p.props.children)),
					(a = Rl(e, qo(M) ? M : [M], t, o, n, r, s, i, a, c, d)),
					(u.base = t.__e),
					(t.__u &= -161),
					u.__h.length && i.push(u),
					g && (u.__E = u.__ = null);
			} catch (Re) {
				if (((t.__v = null), c || s != null))
					if (Re.then) {
						for (
							t.__u |= c ? 160 : 128;
							a && a.nodeType == 8 && a.nextSibling;
						)
							a = a.nextSibling;
						(s[s.indexOf(a)] = null), (t.__e = a);
					} else {
						for (O = s.length; O--; ) Ks(s[O]);
						qs(t);
					}
				else (t.__e = o.__e), (t.__k = o.__k), Re.then || qs(t);
				L.__e(Re, t, o);
			}
		else
			s == null && t.__v == o.__v
				? ((t.__k = o.__k), (t.__e = o.__e))
				: (a = t.__e = gf(o.__e, t, o, n, r, s, i, c, d));
		return (p = L.diffed) && p(t), 128 & t.__u ? void 0 : a;
	}
	function qs(e) {
		e && e.__c && (e.__c.__e = !0), e && e.__k && e.__k.forEach(qs);
	}
	function El(e, t, o) {
		for (var n = 0; n < o.length; n++) Qs(o[n], o[++n], o[++n]);
		L.__c && L.__c(t, e),
			e.some(function (r) {
				try {
					(e = r.__h),
						(r.__h = []),
						e.some(function (s) {
							s.call(r);
						});
				} catch (s) {
					L.__e(s, r.__v);
				}
			});
	}
	function Al(e) {
		return typeof e != 'object' || e == null || (e.__b && e.__b > 0)
			? e
			: qo(e)
				? e.map(Al)
				: We({}, e);
	}
	function gf(e, t, o, n, r, s, i, a, c) {
		var d,
			p,
			u,
			l,
			m,
			h,
			_,
			g = o.props,
			C = t.props,
			v = t.type;
		if (
			(v == 'svg'
				? (r = 'http://www.w3.org/2000/svg')
				: v == 'math'
					? (r = 'http://www.w3.org/1998/Math/MathML')
					: r || (r = 'http://www.w3.org/1999/xhtml'),
			s != null)
		) {
			for (d = 0; d < s.length; d++)
				if (
					(m = s[d]) &&
					'setAttribute' in m == !!v &&
					(v ? m.localName == v : m.nodeType == 3)
				) {
					(e = m), (s[d] = null);
					break;
				}
		}
		if (e == null) {
			if (v == null) return document.createTextNode(C);
			(e = document.createElementNS(r, v, C.is && C)),
				a && (L.__m && L.__m(t, s), (a = !1)),
				(s = null);
		}
		if (v == null) g === C || (a && e.data == C) || (e.data = C);
		else {
			if (
				((s = s && $o.call(e.childNodes)), (g = o.props || Go), !a && s != null)
			)
				for (g = {}, d = 0; d < e.attributes.length; d++)
					g[(m = e.attributes[d]).name] = m.value;
			for (d in g)
				if (((m = g[d]), d != 'children')) {
					if (d == 'dangerouslySetInnerHTML') u = m;
					else if (!(d in C)) {
						if (
							(d == 'value' && 'defaultValue' in C) ||
							(d == 'checked' && 'defaultChecked' in C)
						)
							continue;
						qn(e, d, null, m, r);
					}
				}
			for (d in C)
				(m = C[d]),
					d == 'children'
						? (l = m)
						: d == 'dangerouslySetInnerHTML'
							? (p = m)
							: d == 'value'
								? (h = m)
								: d == 'checked'
									? (_ = m)
									: (a && typeof m != 'function') ||
										g[d] === m ||
										qn(e, d, m, g[d], r);
			if (p)
				a ||
					(u && (p.__html == u.__html || p.__html == e.innerHTML)) ||
					(e.innerHTML = p.__html),
					(t.__k = []);
			else if (
				(u && (e.innerHTML = ''),
				Rl(
					t.type == 'template' ? e.content : e,
					qo(l) ? l : [l],
					t,
					o,
					n,
					v == 'foreignObject' ? 'http://www.w3.org/1999/xhtml' : r,
					s,
					i,
					s ? s[0] : o.__k && Kt(o, 0),
					a,
					c
				),
				s != null)
			)
				for (d = s.length; d--; ) Ks(s[d]);
			a ||
				((d = 'value'),
				v == 'progress' && h == null
					? e.removeAttribute('value')
					: h != null &&
						(h !== e[d] ||
							(v == 'progress' && !h) ||
							(v == 'option' && h != g[d])) &&
						qn(e, d, h, g[d], r),
				(d = 'checked'),
				_ != null && _ != e[d] && qn(e, d, _, g[d], r));
		}
		return e;
	}
	function Qs(e, t, o) {
		try {
			if (typeof e == 'function') {
				var n = typeof e.__u == 'function';
				n && e.__u(), (n && t == null) || (e.__u = e(t));
			} else e.current = t;
		} catch (r) {
			L.__e(r, o);
		}
	}
	function Pl(e, t, o) {
		var n, r;
		if (
			(L.unmount && L.unmount(e),
			(n = e.ref) && ((n.current && n.current != e.__e) || Qs(n, null, t)),
			(n = e.__c) != null)
		) {
			if (n.componentWillUnmount)
				try {
					n.componentWillUnmount();
				} catch (s) {
					L.__e(s, t);
				}
			n.base = n.__P = null;
		}
		if ((n = e.__k))
			for (r = 0; r < n.length; r++)
				n[r] && Pl(n[r], t, o || typeof e.type != 'function');
		o || Ks(e.__e), (e.__c = e.__ = e.__e = void 0);
	}
	function hf(e, t, o) {
		return this.constructor(e, o);
	}
	function Yt(e, t, o) {
		var n, r, s, i;
		t == document && (t = document.documentElement),
			L.__ && L.__(e, t),
			(r = (n = typeof o == 'function') ? null : (o && o.__k) || t.__k),
			(s = []),
			(i = []),
			Ys(
				t,
				(e = ((!n && o) || t).__k = Ee(F, null, [e])),
				r || Go,
				Go,
				t.namespaceURI,
				!n && o ? [o] : r ? null : t.firstChild ? $o.call(t.childNodes) : null,
				s,
				!n && o ? o : r ? r.__e : t.firstChild,
				n,
				i
			),
			El(s, e, i);
	}
	function Js(e, t) {
		Yt(e, t, Js);
	}
	function Ll(e, t, o) {
		var n,
			r,
			s,
			i,
			a = We({}, e.props);
		for (s in (e.type && e.type.defaultProps && (i = e.type.defaultProps), t))
			s == 'key'
				? (n = t[s])
				: s == 'ref'
					? (r = t[s])
					: (a[s] = t[s] === void 0 && i != null ? i[s] : t[s]);
		return (
			arguments.length > 2 &&
				(a.children = arguments.length > 3 ? $o.call(arguments, 2) : o),
			zo(e.type, a, n || e.key, r || e.ref, null)
		);
	}
	function ue(e) {
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
								(i.__e = !0), $s(i);
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
			(t.__c = '__cC' + wl++),
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
	($o = kl.slice),
		(L = {
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
		(Cl = 0),
		(uf = function (e) {
			return e != null && e.constructor == null;
		}),
		(ve.prototype.setState = function (e, t) {
			var o;
			(o =
				this.__s != null && this.__s != this.state
					? this.__s
					: (this.__s = We({}, this.state))),
				typeof e == 'function' && (e = e(We({}, o), this.props)),
				e && We(o, e),
				e != null && this.__v && (t && this._sb.push(t), $s(this));
		}),
		(ve.prototype.forceUpdate = function (e) {
			this.__v && ((this.__e = !0), e && this.__h.push(e), $s(this));
		}),
		(ve.prototype.render = F),
		(Rt = []),
		(_l =
			typeof Promise == 'function'
				? Promise.prototype.then.bind(Promise.resolve())
				: setTimeout),
		(Sl = function (e, t) {
			return e.__v.__b - t.__v.__b;
		}),
		(Wn.__r = 0),
		(xl = /(PointerCapture)$|Capture$/i),
		(Ws = 0),
		(zs = vl(!1)),
		(Gs = vl(!0)),
		(wl = 0);
	var bf = 0;
	function f(e, t, o, n, r, s) {
		t || (t = {});
		var i,
			a,
			c = t;
		if ('ref' in c)
			for (a in ((c = {}), t)) a == 'ref' ? (i = t[a]) : (c[a] = t[a]);
		var d = {
			type: e,
			props: c,
			key: o,
			ref: i,
			__k: null,
			__: null,
			__b: 0,
			__e: null,
			__c: null,
			constructor: void 0,
			__v: --bf,
			__i: -1,
			__u: 0,
			__source: r,
			__self: s,
		};
		if (typeof e == 'function' && (i = e.defaultProps))
			for (a in i) c[a] === void 0 && (c[a] = i[a]);
		return L.vnode && L.vnode(d), d;
	}
	var yf = {
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
							var c = {};
							if (s)
								for (var d = 0; d < this.length; d++) {
									var p = this[d][0];
									p != null && (c[p] = !0);
								}
							for (var u = 0; u < n.length; u++) {
								var l = [].concat(n[u]);
								(s && c[l[0]]) ||
									(a !== void 0 &&
										(l[5] === void 0 ||
											(l[1] = '@layer'
												.concat(l[5].length > 0 ? ' '.concat(l[5]) : '', ' {')
												.concat(l[1], '}')),
										(l[5] = a)),
									r &&
										(l[2] &&
											(l[1] = '@media '.concat(l[2], ' {').concat(l[1], '}')),
										(l[2] = r)),
									i &&
										(l[4]
											? ((l[1] = '@supports ('
													.concat(l[4], ') {')
													.concat(l[1], '}')),
												(l[4] = i))
											: (l[4] = ''.concat(i))),
									o.push(l));
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
					for (var i = {}, a = [], c = 0; c < r.length; c++) {
						var d = r[c],
							p = s.base ? d[0] + s.base : d[0],
							u = i[p] || 0,
							l = ''.concat(p, ' ').concat(u);
						i[p] = u + 1;
						var m = o(l),
							h = {
								css: d[1],
								media: d[2],
								sourceMap: d[3],
								supports: d[4],
								layer: d[5],
							};
						if (m !== -1) t[m].references++, t[m].updater(h);
						else {
							var _ = (function (g, C) {
								var v = C.domAPI(C);
								return (
									v.update(g),
									function (b) {
										b
											? (b.css !== g.css ||
													b.media !== g.media ||
													b.sourceMap !== g.sourceMap ||
													b.supports !== g.supports ||
													b.layer !== g.layer) &&
												v.update((g = b))
											: v.remove();
									}
								);
							})(h, s);
							(s.byIndex = c),
								t.splice(c, 0, { identifier: l, updater: _, references: 1 });
						}
						a.push(l);
					}
					return a;
				}
				e.exports = function (r, s) {
					var i = n((r = r || []), (s = s || {}));
					return function (a) {
						a = a || [];
						for (var c = 0; c < i.length; c++) {
							var d = o(i[c]);
							t[d].references--;
						}
						for (var p = n(a, s), u = 0; u < i.length; u++) {
							var l = o(i[u]);
							t[l].references === 0 && (t[l].updater(), t.splice(l, 1));
						}
						i = p;
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
		Ol = {};
	function J(e) {
		var t = Ol[e];
		if (t !== void 0) return t.exports;
		var o = (Ol[e] = { id: e, exports: {} });
		return yf[e](o, o.exports, J), o.exports;
	}
	(J.n = (e) => {
		var t = e && e.__esModule ? () => e.default : () => e;
		return J.d(t, { a: t }), t;
	}),
		(J.d = (e, t) => {
			for (var o in t)
				J.o(t, o) &&
					!J.o(e, o) &&
					Object.defineProperty(e, o, { enumerable: !0, get: t[o] });
		}),
		(J.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t)),
		(J.nc = void 0);
	var vf = J(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'
		),
		Cf = J.n(vf),
		_f = J(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'
		),
		Sf = J.n(_f),
		xf = J(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'
		),
		wf = J.n(xf),
		kf = J(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'
		),
		If = J.n(kf),
		Rf = J(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'
		),
		Tf = J.n(Rf),
		Ef = J(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'
		),
		Af = J.n(Ef),
		Yn = J(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/components/consent-banner.module.css'
		),
		Qt = {};
	(Qt.styleTagTransform = Af()),
		(Qt.setAttributes = If()),
		(Qt.insert = wf().bind(null, 'head')),
		(Qt.domAPI = Sf()),
		(Qt.insertStyleElement = Tf()),
		Cf()(Yn.A, Qt);
	var pe = Yn.A && Yn.A.locals ? Yn.A.locals : void 0;
	var X = {};
	Lt(X, {
		Children: () => fe,
		Component: () => ve,
		Fragment: () => F,
		PureComponent: () => Zn,
		StrictMode: () => ud,
		Suspense: () => Wo,
		SuspenseList: () => Zt,
		__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: () => sd,
		cloneElement: () => Ae,
		createContext: () => ue,
		createElement: () => Ee,
		createFactory: () => id,
		createPortal: () => lt,
		createRef: () => Kn,
		default: () => $,
		findDOMNode: () => ld,
		flushSync: () => li,
		forwardRef: () => R,
		hydrate: () => ai,
		isElement: () => pd,
		isFragment: () => ad,
		isMemo: () => cd,
		isValidElement: () => de,
		lazy: () => nd,
		memo: () => Zl,
		render: () => er,
		startTransition: () => Ko,
		unmountComponentAtNode: () => tr,
		unstable_batchedUpdates: () => dd,
		useCallback: () => z,
		useContext: () => he,
		useDebugValue: () => Xn,
		useDeferredValue: () => ri,
		useEffect: () => D,
		useErrorBoundary: () => Pf,
		useId: () => Xt,
		useImperativeHandle: () => Jn,
		useInsertionEffect: () => ii,
		useLayoutEffect: () => tt,
		useMemo: () => G,
		useReducer: () => ct,
		useRef: () => j,
		useState: () => N,
		useSyncExternalStore: () => ni,
		useTransition: () => si,
		version: () => Wf,
	});
	var et,
		H,
		Xs,
		Nl,
		Jt = 0,
		Hl = [],
		K = L,
		Dl = K.__b,
		Bl = K.__r,
		Ml = K.diffed,
		jl = K.__c,
		Fl = K.unmount,
		Vl = K.__;
	function Tt(e, t) {
		K.__h && K.__h(H, e, Jt || t), (Jt = 0);
		var o = H.__H || (H.__H = { __: [], __h: [] });
		return e >= o.__.length && o.__.push({}), o.__[e];
	}
	function N(e) {
		return (Jt = 1), ct(zl, e);
	}
	function ct(e, t, o) {
		var n = Tt(et++, 2);
		if (
			((n.t = e),
			!n.__c &&
				((n.__ = [
					o ? o(t) : zl(void 0, t),
					function (a) {
						var c = n.__N ? n.__N[0] : n.__[0],
							d = n.t(c, a);
						c !== d && ((n.__N = [d, n.__[1]]), n.__c.setState({}));
					},
				]),
				(n.__c = H),
				!H.__f))
		) {
			var r = function (a, c, d) {
				if (!n.__c.__H) return !0;
				var p = n.__c.__H.__.filter(function (l) {
					return !!l.__c;
				});
				if (
					p.every(function (l) {
						return !l.__N;
					})
				)
					return !s || s.call(this, a, c, d);
				var u = n.__c.props !== a;
				return (
					p.forEach(function (l) {
						if (l.__N) {
							var m = l.__[0];
							(l.__ = l.__N), (l.__N = void 0), m !== l.__[0] && (u = !0);
						}
					}),
					(s && s.call(this, a, c, d)) || u
				);
			};
			H.__f = !0;
			var s = H.shouldComponentUpdate,
				i = H.componentWillUpdate;
			(H.componentWillUpdate = function (a, c, d) {
				if (this.__e) {
					var p = s;
					(s = void 0), r(a, c, d), (s = p);
				}
				i && i.call(this, a, c, d);
			}),
				(H.shouldComponentUpdate = r);
		}
		return n.__N || n.__;
	}
	function D(e, t) {
		var o = Tt(et++, 3);
		!K.__s && ei(o.__H, t) && ((o.__ = e), (o.u = t), H.__H.__h.push(o));
	}
	function tt(e, t) {
		var o = Tt(et++, 4);
		!K.__s && ei(o.__H, t) && ((o.__ = e), (o.u = t), H.__h.push(o));
	}
	function j(e) {
		return (
			(Jt = 5),
			G(function () {
				return { current: e };
			}, [])
		);
	}
	function Jn(e, t, o) {
		(Jt = 6),
			tt(
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
	function G(e, t) {
		var o = Tt(et++, 7);
		return ei(o.__H, t) && ((o.__ = e()), (o.__H = t), (o.__h = e)), o.__;
	}
	function z(e, t) {
		return (
			(Jt = 8),
			G(function () {
				return e;
			}, t)
		);
	}
	function he(e) {
		var t = H.context[e.__c],
			o = Tt(et++, 9);
		return (
			(o.c = e),
			t ? (o.__ == null && ((o.__ = !0), t.sub(H)), t.props.value) : e.__
		);
	}
	function Xn(e, t) {
		K.useDebugValue && K.useDebugValue(t ? t(e) : e);
	}
	function Pf(e) {
		var t = Tt(et++, 10),
			o = N();
		return (
			(t.__ = e),
			H.componentDidCatch ||
				(H.componentDidCatch = function (n, r) {
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
	function Xt() {
		var e = Tt(et++, 11);
		if (!e.__) {
			for (var t = H.__v; t !== null && !t.__m && t.__ !== null; ) t = t.__;
			var o = t.__m || (t.__m = [0, 0]);
			e.__ = 'P' + o[0] + '-' + o[1]++;
		}
		return e.__;
	}
	function Lf() {
		for (var e; (e = Hl.shift()); )
			if (e.__P && e.__H)
				try {
					e.__H.__h.forEach(Qn), e.__H.__h.forEach(Zs), (e.__H.__h = []);
				} catch (t) {
					(e.__H.__h = []), K.__e(t, e.__v);
				}
	}
	(K.__b = function (e) {
		(H = null), Dl && Dl(e);
	}),
		(K.__ = function (e, t) {
			e && t.__k && t.__k.__m && (e.__m = t.__k.__m), Vl && Vl(e, t);
		}),
		(K.__r = function (e) {
			Bl && Bl(e), (et = 0);
			var t = (H = e.__c).__H;
			t &&
				(Xs === H
					? ((t.__h = []),
						(H.__h = []),
						t.__.forEach(function (o) {
							o.__N && (o.__ = o.__N), (o.u = o.__N = void 0);
						}))
					: (t.__h.forEach(Qn), t.__h.forEach(Zs), (t.__h = []), (et = 0))),
				(Xs = H);
		}),
		(K.diffed = function (e) {
			Ml && Ml(e);
			var t = e.__c;
			t &&
				t.__H &&
				(t.__H.__h.length &&
					((Hl.push(t) !== 1 && Nl === K.requestAnimationFrame) ||
						((Nl = K.requestAnimationFrame) || Of)(Lf)),
				t.__H.__.forEach(function (o) {
					o.u && (o.__H = o.u), (o.u = void 0);
				})),
				(Xs = H = null);
		}),
		(K.__c = function (e, t) {
			t.some(function (o) {
				try {
					o.__h.forEach(Qn),
						(o.__h = o.__h.filter(function (n) {
							return !n.__ || Zs(n);
						}));
				} catch (n) {
					t.some(function (r) {
						r.__h && (r.__h = []);
					}),
						(t = []),
						K.__e(n, o.__v);
				}
			}),
				jl && jl(e, t);
		}),
		(K.unmount = function (e) {
			Fl && Fl(e);
			var t,
				o = e.__c;
			o &&
				o.__H &&
				(o.__H.__.forEach(function (n) {
					try {
						Qn(n);
					} catch (r) {
						t = r;
					}
				}),
				(o.__H = void 0),
				t && K.__e(t, o.__v));
		});
	var Ul = typeof requestAnimationFrame == 'function';
	function Of(e) {
		var t,
			o = function () {
				clearTimeout(n), Ul && cancelAnimationFrame(t), setTimeout(e);
			},
			n = setTimeout(o, 35);
		Ul && (t = requestAnimationFrame(o));
	}
	function Qn(e) {
		var t = H,
			o = e.__c;
		typeof o == 'function' && ((e.__c = void 0), o()), (H = t);
	}
	function Zs(e) {
		var t = H;
		(e.__c = e.__()), (H = t);
	}
	function ei(e, t) {
		return (
			!e ||
			e.length !== t.length ||
			t.some(function (o, n) {
				return o !== e[n];
			})
		);
	}
	function zl(e, t) {
		return typeof t == 'function' ? t(e) : t;
	}
	function Xl(e, t) {
		for (var o in t) e[o] = t[o];
		return e;
	}
	function oi(e, t) {
		for (var o in e) if (o !== '__source' && !(o in t)) return !0;
		for (var n in t) if (n !== '__source' && e[n] !== t[n]) return !0;
		return !1;
	}
	function ni(e, t) {
		var o = t(),
			n = N({ t: { __: o, u: t } }),
			r = n[0].t,
			s = n[1];
		return (
			tt(
				function () {
					(r.__ = o), (r.u = t), ti(r) && s({ t: r });
				},
				[e, o, t]
			),
			D(
				function () {
					return (
						ti(r) && s({ t: r }),
						e(function () {
							ti(r) && s({ t: r });
						})
					);
				},
				[e]
			),
			o
		);
	}
	function ti(e) {
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
	function Ko(e) {
		e();
	}
	function ri(e) {
		return e;
	}
	function si() {
		return [!1, Ko];
	}
	var ii = tt;
	function Zn(e, t) {
		(this.props = e), (this.context = t);
	}
	function Zl(e, t) {
		function o(r) {
			var s = this.props.ref,
				i = s == r.ref;
			return (
				!i && s && (s.call ? s(null) : (s.current = null)),
				t ? !t(this.props, r) || !i : oi(this.props, r)
			);
		}
		function n(r) {
			return (this.shouldComponentUpdate = o), Ee(e, r);
		}
		return (
			(n.displayName = 'Memo(' + (e.displayName || e.name) + ')'),
			(n.prototype.isReactComponent = !0),
			(n.__f = !0),
			(n.type = e),
			n
		);
	}
	((Zn.prototype = new ve()).isPureReactComponent = !0),
		(Zn.prototype.shouldComponentUpdate = function (e, t) {
			return oi(this.props, e) || oi(this.state, t);
		});
	var Gl = L.__b;
	L.__b = function (e) {
		e.type && e.type.__f && e.ref && ((e.props.ref = e.ref), (e.ref = null)),
			Gl && Gl(e);
	};
	var Nf =
		(typeof Symbol < 'u' && Symbol.for && Symbol.for('react.forward_ref')) ||
		3911;
	function R(e) {
		function t(o) {
			var n = Xl({}, o);
			return delete n.ref, e(n, o.ref || null);
		}
		return (
			(t.$$typeof = Nf),
			(t.render = e),
			(t.prototype.isReactComponent = t.__f = !0),
			(t.displayName = 'ForwardRef(' + (e.displayName || e.name) + ')'),
			t
		);
	}
	var $l = function (e, t) {
			return e == null ? null : Ke(Ke(e).map(t));
		},
		fe = {
			map: $l,
			forEach: $l,
			count: function (e) {
				return e ? Ke(e).length : 0;
			},
			only: function (e) {
				var t = Ke(e);
				if (t.length !== 1) throw 'Children.only';
				return t[0];
			},
			toArray: Ke,
		},
		Df = L.__e;
	L.__e = function (e, t, o, n) {
		if (e.then) {
			for (var r, s = t; (s = s.__); )
				if ((r = s.__c) && r.__c)
					return (
						t.__e == null && ((t.__e = o.__e), (t.__k = o.__k)), r.__c(e, t)
					);
		}
		Df(e, t, o, n);
	};
	var ql = L.unmount;
	function ed(e, t, o) {
		return (
			e &&
				(e.__c &&
					e.__c.__H &&
					(e.__c.__H.__.forEach(function (n) {
						typeof n.__c == 'function' && n.__c();
					}),
					(e.__c.__H = null)),
				(e = Xl({}, e)).__c != null &&
					(e.__c.__P === o && (e.__c.__P = t),
					(e.__c.__e = !0),
					(e.__c = null)),
				(e.__k =
					e.__k &&
					e.__k.map(function (n) {
						return ed(n, t, o);
					}))),
			e
		);
	}
	function td(e, t, o) {
		return (
			e &&
				o &&
				((e.__v = null),
				(e.__k =
					e.__k &&
					e.__k.map(function (n) {
						return td(n, t, o);
					})),
				e.__c &&
					e.__c.__P === t &&
					(e.__e && o.appendChild(e.__e), (e.__c.__e = !0), (e.__c.__P = o))),
			e
		);
	}
	function Wo() {
		(this.__u = 0), (this.o = null), (this.__b = null);
	}
	function od(e) {
		var t = e.__.__c;
		return t && t.__a && t.__a(e);
	}
	function nd(e) {
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
			return Ee(o, s);
		}
		return (r.displayName = 'Lazy'), (r.__f = !0), r;
	}
	function Zt() {
		(this.i = null), (this.l = null);
	}
	(L.unmount = function (e) {
		var t = e.__c;
		t && t.__R && t.__R(), t && 32 & e.__u && (e.type = null), ql && ql(e);
	}),
		((Wo.prototype = new ve()).__c = function (e, t) {
			var o = t.__c,
				n = this;
			n.o == null && (n.o = []), n.o.push(o);
			var r = od(n.__v),
				s = !1,
				i = function () {
					s || ((s = !0), (o.__R = null), r ? r(a) : a());
				};
			o.__R = i;
			var a = function () {
				if (!--n.__u) {
					if (n.state.__a) {
						var c = n.state.__a;
						n.__v.__k[0] = td(c, c.__c.__P, c.__c.__O);
					}
					var d;
					for (n.setState({ __a: (n.__b = null) }); (d = n.o.pop()); )
						d.forceUpdate();
				}
			};
			n.__u++ || 32 & t.__u || n.setState({ __a: (n.__b = n.__v.__k[0]) }),
				e.then(i, i);
		}),
		(Wo.prototype.componentWillUnmount = function () {
			this.o = [];
		}),
		(Wo.prototype.render = function (e, t) {
			if (this.__b) {
				if (this.__v.__k) {
					var o = document.createElement('div'),
						n = this.__v.__k[0].__c;
					this.__v.__k[0] = ed(this.__b, o, (n.__O = n.__P));
				}
				this.__b = null;
			}
			var r = t.__a && Ee(F, null, e.fallback);
			return r && (r.__u &= -33), [Ee(F, null, t.__a ? null : e.children), r];
		});
	var Wl = function (e, t, o) {
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
	function Bf(e) {
		return (
			(this.getChildContext = function () {
				return e.context;
			}),
			e.children
		);
	}
	function Mf(e) {
		var t = this,
			o = e.h;
		if (
			((t.componentWillUnmount = function () {
				Yt(null, t.v), (t.v = null), (t.h = null);
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
		Yt(Ee(Bf, { context: t.context }, e.__v), t.v);
	}
	function lt(e, t) {
		var o = Ee(Mf, { __v: e, h: t });
		return (o.containerInfo = t), o;
	}
	((Zt.prototype = new ve()).__a = function (e) {
		var t = this,
			o = od(t.__v),
			n = t.l.get(e);
		return (
			n[0]++,
			function (r) {
				var s = function () {
					t.props.revealOrder ? (n.push(r), Wl(t, e, n)) : r();
				};
				o ? o(s) : s();
			}
		);
	}),
		(Zt.prototype.render = function (e) {
			(this.i = null), (this.l = new Map());
			var t = Ke(e.children);
			e.revealOrder && e.revealOrder[0] === 'b' && t.reverse();
			for (var o = t.length; o--; ) this.l.set(t[o], (this.i = [1, 0, this.i]));
			return e.children;
		}),
		(Zt.prototype.componentDidUpdate = Zt.prototype.componentDidMount =
			function () {
				var e = this;
				this.l.forEach(function (t, o) {
					Wl(e, o, t);
				});
			});
	var rd =
			(typeof Symbol < 'u' && Symbol.for && Symbol.for('react.element')) ||
			60103,
		jf =
			/^(?:accent|alignment|arabic|baseline|cap|clip(?!PathU)|color|dominant|fill|flood|font|glyph(?!R)|horiz|image(!S)|letter|lighting|marker(?!H|W|U)|overline|paint|pointer|shape|stop|strikethrough|stroke|text(?!L)|transform|underline|unicode|units|v|vector|vert|word|writing|x(?!C))[A-Z]/,
		Ff = /^on(Ani|Tra|Tou|BeforeInp|Compo)/,
		Vf = /[A-Z0-9]/g,
		Uf = typeof document < 'u',
		Hf = function (e) {
			return (
				typeof Symbol < 'u' && typeof Symbol() == 'symbol'
					? /fil|che|rad/
					: /fil|che|ra/
			).test(e);
		};
	function er(e, t, o) {
		return (
			t.__k == null && (t.textContent = ''),
			Yt(e, t),
			typeof o == 'function' && o(),
			e ? e.__c : null
		);
	}
	function ai(e, t, o) {
		return Js(e, t), typeof o == 'function' && o(), e ? e.__c : null;
	}
	(ve.prototype.isReactComponent = {}),
		[
			'componentWillMount',
			'componentWillReceiveProps',
			'componentWillUpdate',
		].forEach(function (e) {
			Object.defineProperty(ve.prototype, e, {
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
	var Kl = L.event;
	function zf() {}
	function Gf() {
		return this.cancelBubble;
	}
	function $f() {
		return this.defaultPrevented;
	}
	L.event = function (e) {
		return (
			Kl && (e = Kl(e)),
			(e.persist = zf),
			(e.isPropagationStopped = Gf),
			(e.isDefaultPrevented = $f),
			(e.nativeEvent = e)
		);
	};
	var ci,
		qf = {
			enumerable: !1,
			configurable: !0,
			get: function () {
				return this.class;
			},
		},
		Yl = L.vnode;
	L.vnode = function (e) {
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
							(Uf && i === 'children' && n === 'noscript') ||
							i === 'class' ||
							i === 'className'
						)
					) {
						var c = i.toLowerCase();
						i === 'defaultValue' && 'value' in o && o.value == null
							? (i = 'value')
							: i === 'download' && a === !0
								? (a = '')
								: c === 'translate' && a === 'no'
									? (a = !1)
									: c[0] === 'o' && c[1] === 'n'
										? c === 'ondoubleclick'
											? (i = 'ondblclick')
											: c !== 'onchange' ||
													(n !== 'input' && n !== 'textarea') ||
													Hf(o.type)
												? c === 'onfocus'
													? (i = 'onfocusin')
													: c === 'onblur'
														? (i = 'onfocusout')
														: Ff.test(i) && (i = c)
												: (c = i = 'oninput')
										: s && jf.test(i)
											? (i = i.replace(Vf, '-$&').toLowerCase())
											: a === null && (a = void 0),
							c === 'oninput' && r[(i = c)] && (i = 'oninputCapture'),
							(r[i] = a);
					}
				}
				n == 'select' &&
					r.multiple &&
					Array.isArray(r.value) &&
					(r.value = Ke(o.children).forEach(function (d) {
						d.props.selected = r.value.indexOf(d.props.value) != -1;
					})),
					n == 'select' &&
						r.defaultValue != null &&
						(r.value = Ke(o.children).forEach(function (d) {
							d.props.selected = r.multiple
								? r.defaultValue.indexOf(d.props.value) != -1
								: r.defaultValue == d.props.value;
						})),
					o.class && !o.className
						? ((r.class = o.class), Object.defineProperty(r, 'className', qf))
						: ((o.className && !o.class) || (o.class && o.className)) &&
							(r.class = r.className = o.className),
					(t.props = r);
			})(e),
			(e.$$typeof = rd),
			Yl && Yl(e);
	};
	var Ql = L.__r;
	L.__r = function (e) {
		Ql && Ql(e), (ci = e.__c);
	};
	var Jl = L.diffed;
	L.diffed = function (e) {
		Jl && Jl(e);
		var t = e.props,
			o = e.__e;
		o != null &&
			e.type === 'textarea' &&
			'value' in t &&
			t.value !== o.value &&
			(o.value = t.value == null ? '' : t.value),
			(ci = null);
	};
	var sd = {
			ReactCurrentDispatcher: {
				current: {
					readContext: function (e) {
						return ci.__n[e.__c].props.value;
					},
					useCallback: z,
					useContext: he,
					useDebugValue: Xn,
					useDeferredValue: ri,
					useEffect: D,
					useId: Xt,
					useImperativeHandle: Jn,
					useInsertionEffect: ii,
					useLayoutEffect: tt,
					useMemo: G,
					useReducer: ct,
					useRef: j,
					useState: N,
					useSyncExternalStore: ni,
					useTransition: si,
				},
			},
		},
		Wf = '18.3.1';
	function id(e) {
		return Ee.bind(null, e);
	}
	function de(e) {
		return !!e && e.$$typeof === rd;
	}
	function ad(e) {
		return de(e) && e.type === F;
	}
	function cd(e) {
		return (
			!!e &&
			!!e.displayName &&
			(typeof e.displayName == 'string' || e.displayName instanceof String) &&
			e.displayName.startsWith('Memo(')
		);
	}
	function Ae(e) {
		return de(e) ? Ll.apply(null, arguments) : e;
	}
	function tr(e) {
		return !!e.__k && (Yt(null, e), !0);
	}
	function ld(e) {
		return (e && (e.base || (e.nodeType === 1 && e))) || null;
	}
	var dd = function (e, t) {
			return e(t);
		},
		li = function (e, t) {
			return e(t);
		},
		ud = F,
		pd = de,
		$ = {
			useState: N,
			useId: Xt,
			useReducer: ct,
			useEffect: D,
			useLayoutEffect: tt,
			useInsertionEffect: ii,
			useTransition: si,
			useDeferredValue: ri,
			useSyncExternalStore: ni,
			startTransition: Ko,
			useRef: j,
			useImperativeHandle: Jn,
			useMemo: G,
			useCallback: z,
			useContext: he,
			useDebugValue: Xn,
			version: '18.3.1',
			Children: fe,
			render: er,
			hydrate: ai,
			unmountComponentAtNode: tr,
			createPortal: lt,
			createElement: Ee,
			createContext: ue,
			createFactory: id,
			cloneElement: Ae,
			createRef: Kn,
			Fragment: F,
			isValidElement: de,
			isElement: pd,
			isFragment: ad,
			isMemo: cd,
			findDOMNode: ld,
			Component: ve,
			PureComponent: Zn,
			memo: Zl,
			forwardRef: R,
			flushSync: li,
			unstable_batchedUpdates: dd,
			StrictMode: ud,
			Suspense: Wo,
			SuspenseList: Zt,
			lazy: nd,
			__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: sd,
		};
	var or = ue(void 0);
	function q() {
		let e = he(or);
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
			s = z((c) => De(c, t), [t]),
			i = z(() => o != null, [o]),
			a = z(() => r.filter((c) => n.includes(c.name)), [r, n]);
		return {
			...e.state,
			has: s,
			hasConsented: i,
			getDisplayedConsents: a,
			manager: e.manager,
		};
	}
	function fd(e) {
		var t,
			o,
			n = '';
		if (typeof e == 'string' || typeof e == 'number') n += e;
		else if (typeof e == 'object')
			if (Array.isArray(e)) {
				var r = e.length;
				for (t = 0; t < r; t++)
					e[t] && (o = fd(e[t])) && (n && (n += ' '), (n += o));
			} else for (o in e) e[o] && (n && (n += ' '), (n += o));
		return n;
	}
	function Kf() {
		for (var e, t, o = 0, n = '', r = arguments.length; o < r; o++)
			(e = arguments[o]) && (t = fd(e)) && (n && (n += ' '), (n += t));
		return n;
	}
	var md = Kf;
	function nr(...e) {
		return md(...e);
	}
	function di(e, t) {
		if (!t || typeof t != 'object') return e;
		let o = { ...e };
		for (let n in t)
			t[n] && typeof t[n] == 'object' && !Array.isArray(t[n])
				? (o[n] = di(o[n] || {}, t[n]))
				: (o[n] = t[n]);
		return o;
	}
	function hd(e) {
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
	var Yf = ['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'ku', 'dv'];
	function ui(e) {
		let t = e ? e.split('-')[0]?.toLowerCase() : 'en';
		return Yf.includes(t || '') ? 'rtl' : 'ltr';
	}
	function bd(e) {
		return (
			ui(e) === 'rtl'
				? document.body.classList.add('c15t-rtl')
				: document.body.classList.remove('c15t-rtl'),
			() => {
				document.body.classList.remove('c15t-rtl');
			}
		);
	}
	function gd(e) {
		return Array.from(
			e.querySelectorAll(
				'a[href]:not([disabled]),button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[contenteditable],[tabindex]:not([tabindex="-1"])'
			)
		).filter((t) => t.offsetWidth > 0 && t.offsetHeight > 0);
	}
	function yd() {
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
	function vd(e) {
		let t = document.activeElement,
			o = gd(e);
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
			let s = gd(e);
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
	function rr(e, t) {
		let o = (a) => {
				if (a !== void 0) return typeof a == 'string' ? { className: a } : a;
			},
			n = o(e),
			r = o(t);
		if ((n?.noStyle || r?.noStyle) && r?.noStyle)
			return { className: r.className, style: r.style, noStyle: !0 };
		let s = nr(n?.baseClassName, n?.className, r?.baseClassName, r?.className),
			i = { ...n?.style, ...r?.style };
		return {
			className: s || void 0,
			style: Object.keys(i).length > 0 ? i : void 0,
			noStyle: n?.noStyle || r?.noStyle,
		};
	}
	function Cd(e, t, o, n = !1) {
		let r = t?.slots?.[e],
			s = typeof r == 'object' && r !== null && !!r.noStyle,
			i = typeof o == 'object' && o !== null && !!o.noStyle;
		if (n || s || i) {
			let d = rr(r || {}, o || {});
			return { className: d.className, style: d.style, noStyle: !0 };
		}
		let a = rr(
				typeof o == 'object' ? { ...o, className: void 0 } : {},
				r || {}
			),
			c = rr(a, o || {});
		return { className: c.className, style: c.style };
	}
	function Sd(e, t) {
		let { translations: o = {}, defaultLanguage: n = 'en' } = e,
			r = o[n];
		if (_d(r)) return r;
		let s = o.en;
		return _d(s) ? s : t.translations.en;
	}
	function _d(e) {
		return (
			!!e &&
			typeof e == 'object' &&
			'cookieBanner' in e &&
			'consentManagerDialog' in e &&
			'consentTypes' in e &&
			'common' in e
		);
	}
	var wd = {
			defaultPosition: 'bottom-right',
			offset: 20,
			persistPosition: !0,
			storageKey: 'c15t-trigger-position',
		},
		Qf = 30,
		xd = 0.15;
	function kd(e, t, o, n = {}) {
		let { threshold: r = Qf, velocityX: s = 0, velocityY: i = 0 } = n,
			a = Math.abs(t),
			c = Math.abs(o),
			d = Math.abs(s),
			p = Math.abs(i),
			u = a >= r || (d >= xd && a >= 10),
			l = c >= r || (p >= xd && c >= 10);
		if (!u && !l) return e;
		let m = e.includes('bottom'),
			h = e.includes('right'),
			_ = m,
			g = h;
		return (
			u && (g = t > 0),
			l && (_ = o > 0),
			_ && g
				? 'bottom-right'
				: _ && !g
					? 'bottom-left'
					: !_ && g
						? 'top-right'
						: 'top-left'
		);
	}
	function Id(e, t = wd.storageKey) {
		try {
			typeof localStorage < 'u' && localStorage.setItem(t, e);
		} catch {}
	}
	function Rd(e = wd.storageKey) {
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
	function sr() {
		return { isDragging: !1, startX: 0, startY: 0, currentX: 0, currentY: 0 };
	}
	function ir(e) {
		D(() => {
			if (e) return yd();
		}, [e]);
	}
	var ar = ue({
			theme: void 0,
			noStyle: !1,
			disableAnimation: !1,
			scrollLock: !1,
			trapFocus: !0,
			colorScheme: 'system',
		}),
		dt = ue(null);
	var Y = () => {
		let e = he(ar),
			t = he(dt);
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
	function xe(e, t, o) {
		let { noStyle: n, theme: r } = Y(),
			s = o ?? r;
		return G(() => Cd(e, s, t, n), [e, s, t, n]);
	}
	function Et(...e) {
		return nr(...e);
	}
	var Td = R(({ className: e, style: t, noStyle: o, asChild: n, ...r }, s) => {
			let i,
				{ activeUI: a } = q(),
				{ disableAnimation: c, noStyle: d, scrollLock: p } = Y(),
				u = a === 'banner',
				[l, m] = N(!1);
			D(() => {
				if (u) m(!0);
				else if (c) m(!1);
				else {
					let g = setTimeout(
						() => {
							m(!1);
						},
						Number.parseInt(
							getComputedStyle(document.documentElement).getPropertyValue(
								'--consent-banner-animation-duration'
							) || '200',
							10
						)
					);
					return () => clearTimeout(g);
				}
			}, [u, c]);
			let h = xe('consentBannerOverlay', {
				baseClassName: !(d || o) && pe.overlay,
				className: e,
				noStyle: d || o,
			});
			i = d || o || c ? void 0 : l ? pe.overlayVisible : pe.overlayHidden;
			let _ = Et(h.className, i);
			return (
				ir(!!(u && p)),
				u && p
					? f('div', {
							ref: s,
							...r,
							className: _,
							style: { ...h.style, ...t },
							'data-testid': 'consent-banner-overlay',
						})
					: null
			);
		}),
		cr = Td;
	var ut = ue({}),
		lr = () => he(ut);
	function eo(e) {
		let t = G(() => ui(e), [e]);
		return D(() => bd(e), [e]), t;
	}
	var dr = ({
			children: e,
			className: t,
			noStyle: o,
			disableAnimation: n,
			scrollLock: r,
			trapFocus: s = !0,
			models: i,
			uiSource: a,
			...c
		}) =>
			f(ut.Provider, {
				value: { uiSource: a ?? 'banner' },
				children: f(dt.Provider, {
					value: {
						disableAnimation: n,
						noStyle: o,
						scrollLock: r,
						trapFocus: s,
					},
					children: f(Ed, {
						disableAnimation: n,
						className: t,
						noStyle: o,
						models: i,
						...c,
						children: e,
					}),
				}),
			}),
		Ed = R(
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
					...c
				},
				d
			) => {
				let { activeUI: p, translationConfig: u, model: l } = q(),
					m = eo(u.defaultLanguage),
					[h, _] = N(!1),
					[g, C] = N(!1),
					[v, b] = N(200),
					x = p === 'banner' && a.includes(l);
				D(() => {
					b(
						Number.parseInt(
							getComputedStyle(document.documentElement).getPropertyValue(
								'--consent-banner-animation-duration'
							) || '200',
							10
						)
					);
				}, []),
					D(() => {
						if (x)
							if (g) _(!0);
							else {
								let M = setTimeout(() => {
									_(!0), C(!0);
								}, 10);
								return () => clearTimeout(M);
							}
						else if ((C(!1), s)) _(!1);
						else {
							let M = setTimeout(() => {
								_(!1);
							}, v);
							return () => clearTimeout(M);
						}
					}, [x, s, g, v]);
				let I = xe('consentBanner', {
						baseClassName: [
							pe.root,
							m === 'ltr' ? pe.bottomLeft : pe.bottomRight,
						],
						style: n,
						className: o || r,
						noStyle: i,
					}),
					[T, P] = N(!1);
				if (
					(D(() => {
						P(!0);
					}, []),
					!T)
				)
					return null;
				let B = i
					? I.className || ''
					: `${I.className || ''} ${h ? pe.bannerVisible : pe.bannerHidden}`;
				return x
					? lt(
							f(F, {
								children: [
									f(cr, {}),
									f('div', {
										ref: d,
										...c,
										...I,
										className: B,
										'data-testid': 'consent-banner-root',
										dir: m,
										children: t,
									}),
								],
							}),
							document.body
						)
					: null;
			}
		);
	Ed.displayName = 'ConsentBannerRootChildren';
	var Ad = dr;
	function ur(e, t) {
		D(() => {
			if (e && t && t.current) return vd(t.current);
		}, [e, t]);
	}
	function ie() {
		let { translationConfig: e } = q();
		return G(() => Sd(e, Fe), [e]);
	}
	function Pd(e, t) {
		if (typeof e == 'function') return e(t);
		e != null && (e.current = t);
	}
	function Yo(...e) {
		return (t) => {
			let o = !1,
				n = e.map((r) => {
					let s = Pd(r, t);
					return !o && typeof s == 'function' && (o = !0), s;
				});
			if (o)
				return () => {
					for (let r = 0; r < n.length; r++) {
						let s = n[r];
						typeof s == 'function' ? s() : Pd(e[r], null);
					}
				};
		};
	}
	function Pe(...e) {
		return z(Yo(...e), e);
	}
	var Jf = Symbol.for('react.lazy'),
		pr = X[' use '.trim().toString()];
	function Xf(e) {
		return typeof e == 'object' && e !== null && 'then' in e;
	}
	function Ld(e) {
		return (
			e != null &&
			typeof e == 'object' &&
			'$$typeof' in e &&
			e.$$typeof === Jf &&
			'_payload' in e &&
			Xf(e._payload)
		);
	}
	function Zf(e) {
		let t = em(e),
			o = R((n, r) => {
				let { children: s, ...i } = n;
				Ld(s) && typeof pr == 'function' && (s = pr(s._payload));
				let a = fe.toArray(s),
					c = a.find(om);
				if (c) {
					let d = c.props.children,
						p = a.map((u) =>
							u === c
								? fe.count(d) > 1
									? fe.only(null)
									: de(d)
										? d.props.children
										: null
								: u
						);
					return f(t, {
						...i,
						ref: r,
						children: de(d) ? Ae(d, void 0, p) : null,
					});
				}
				return f(t, { ...i, ref: r, children: s });
			});
		return (o.displayName = `${e}.Slot`), o;
	}
	var to = Zf('Slot');
	function em(e) {
		let t = R((o, n) => {
			let { children: r, ...s } = o;
			if ((Ld(r) && typeof pr == 'function' && (r = pr(r._payload)), de(r))) {
				let i = rm(r),
					a = nm(s, r.props);
				return r.type !== F && (a.ref = n ? Yo(n, i) : i), Ae(r, a);
			}
			return fe.count(r) > 1 ? fe.only(null) : null;
		});
		return (t.displayName = `${e}.SlotClone`), t;
	}
	var tm = Symbol('radix.slottable');
	function om(e) {
		return (
			de(e) &&
			typeof e.type == 'function' &&
			'__radixId' in e.type &&
			e.type.__radixId === tm
		);
	}
	function nm(e, t) {
		let o = { ...t };
		for (let n in t) {
			let r = e[n],
				s = t[n];
			/^on[A-Z]/.test(n)
				? r && s
					? (o[n] = (...a) => {
							let c = s(...a);
							return r(...a), c;
						})
					: r && (o[n] = r)
				: n === 'style'
					? (o[n] = { ...r, ...s })
					: n === 'className' && (o[n] = [r, s].filter(Boolean).join(' '));
		}
		return { ...e, ...o };
	}
	function rm(e) {
		let t = Object.getOwnPropertyDescriptor(e.props, 'ref')?.get,
			o = t && 'isReactWarning' in t && t.isReactWarning;
		return o
			? e.ref
			: ((t = Object.getOwnPropertyDescriptor(e, 'ref')?.get),
				(o = t && 'isReactWarning' in t && t.isReactWarning),
				o ? e.props.ref : e.props.ref || e.ref);
	}
	var W = R(
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
			let c = xe(n, { baseClassName: r, className: t, style: o, noStyle: s });
			return f(e ? to : 'div', { ref: a, ...i, ...c });
		}
	);
	W.displayName = 'Box';
	var sm = {
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
							var c = {};
							if (s)
								for (var d = 0; d < this.length; d++) {
									var p = this[d][0];
									p != null && (c[p] = !0);
								}
							for (var u = 0; u < n.length; u++) {
								var l = [].concat(n[u]);
								(s && c[l[0]]) ||
									(a !== void 0 &&
										(l[5] === void 0 ||
											(l[1] = '@layer'
												.concat(l[5].length > 0 ? ' '.concat(l[5]) : '', ' {')
												.concat(l[1], '}')),
										(l[5] = a)),
									r &&
										(l[2] &&
											(l[1] = '@media '.concat(l[2], ' {').concat(l[1], '}')),
										(l[2] = r)),
									i &&
										(l[4]
											? ((l[1] = '@supports ('
													.concat(l[4], ') {')
													.concat(l[1], '}')),
												(l[4] = i))
											: (l[4] = ''.concat(i))),
									o.push(l));
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
					for (var i = {}, a = [], c = 0; c < r.length; c++) {
						var d = r[c],
							p = s.base ? d[0] + s.base : d[0],
							u = i[p] || 0,
							l = ''.concat(p, ' ').concat(u);
						i[p] = u + 1;
						var m = o(l),
							h = {
								css: d[1],
								media: d[2],
								sourceMap: d[3],
								supports: d[4],
								layer: d[5],
							};
						if (m !== -1) t[m].references++, t[m].updater(h);
						else {
							var _ = (function (g, C) {
								var v = C.domAPI(C);
								return (
									v.update(g),
									function (b) {
										b
											? (b.css !== g.css ||
													b.media !== g.media ||
													b.sourceMap !== g.sourceMap ||
													b.supports !== g.supports ||
													b.layer !== g.layer) &&
												v.update((g = b))
											: v.remove();
									}
								);
							})(h, s);
							(s.byIndex = c),
								t.splice(c, 0, { identifier: l, updater: _, references: 1 });
						}
						a.push(l);
					}
					return a;
				}
				e.exports = function (r, s) {
					var i = n((r = r || []), (s = s || {}));
					return function (a) {
						a = a || [];
						for (var c = 0; c < i.length; c++) {
							var d = o(i[c]);
							t[d].references--;
						}
						for (var p = n(a, s), u = 0; u < i.length; u++) {
							var l = o(i[u]);
							t[l].references === 0 && (t[l].updater(), t.splice(l, 1));
						}
						i = p;
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
		Od = {};
	function Z(e) {
		var t = Od[e];
		if (t !== void 0) return t.exports;
		var o = (Od[e] = { id: e, exports: {} });
		return sm[e](o, o.exports, Z), o.exports;
	}
	(Z.n = (e) => {
		var t = e && e.__esModule ? () => e.default : () => e;
		return Z.d(t, { a: t }), t;
	}),
		(Z.d = (e, t) => {
			for (var o in t)
				Z.o(t, o) &&
					!Z.o(e, o) &&
					Object.defineProperty(e, o, { enumerable: !0, get: t[o] });
		}),
		(Z.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t)),
		(Z.nc = void 0);
	var im = Z(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'
		),
		am = Z.n(im),
		cm = Z(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'
		),
		lm = Z.n(cm),
		dm = Z(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'
		),
		um = Z.n(dm),
		pm = Z(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'
		),
		fm = Z.n(pm),
		mm = Z(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'
		),
		gm = Z.n(mm),
		hm = Z(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'
		),
		bm = Z.n(hm),
		fr = Z(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/primitives/accordion.module.css'
		),
		oo = {};
	(oo.styleTagTransform = bm()),
		(oo.setAttributes = fm()),
		(oo.insert = um().bind(null, 'head')),
		(oo.domAPI = lm()),
		(oo.insertStyleElement = gm()),
		am()(fr.A, oo);
	var Be = fr.A && fr.A.locals ? fr.A.locals : void 0;
	var pt = ({ variant: e = 'default', size: t = 'medium' } = {}) => {
		let o = { default: void 0, bordered: 'root-bordered' },
			n = { medium: void 0, small: 'root-small' };
		return {
			root: (r) => {
				let s = [Be.root],
					i = o[e];
				i && s.push(Be[i]);
				let a = n[t];
				return (
					a && s.push(Be[a]),
					r?.class && s.push(r.class),
					s.filter(Boolean).join(' ')
				);
			},
			item: (r) => {
				let s = [Be.item];
				return r?.class && s.push(r.class), s.filter(Boolean).join(' ');
			},
			trigger: (r) => {
				let s = [Be.triggerInner];
				return r?.class && s.push(r.class), s.filter(Boolean).join(' ');
			},
			icon: (r) => {
				let s = [Be.icon];
				return r?.class && s.push(r.class), s.filter(Boolean).join(' ');
			},
			arrowOpen: (r) => {
				let s = [Be.arrowOpen];
				return r?.class && s.push(r.class), s.filter(Boolean).join(' ');
			},
			arrowClose: (r) => {
				let s = [Be.arrowClose];
				return r?.class && s.push(r.class), s.filter(Boolean).join(' ');
			},
			content: (r) => {
				let s = [Be.content];
				return r?.class && s.push(r.class), s.filter(Boolean).join(' ');
			},
			contentInner: (r) => {
				let s = [Be.contentInner];
				return r?.class && s.push(r.class), s.filter(Boolean).join(' ');
			},
		};
	};
	var ym = {
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
							var c = {};
							if (s)
								for (var d = 0; d < this.length; d++) {
									var p = this[d][0];
									p != null && (c[p] = !0);
								}
							for (var u = 0; u < n.length; u++) {
								var l = [].concat(n[u]);
								(s && c[l[0]]) ||
									(a !== void 0 &&
										(l[5] === void 0 ||
											(l[1] = '@layer'
												.concat(l[5].length > 0 ? ' '.concat(l[5]) : '', ' {')
												.concat(l[1], '}')),
										(l[5] = a)),
									r &&
										(l[2] &&
											(l[1] = '@media '.concat(l[2], ' {').concat(l[1], '}')),
										(l[2] = r)),
									i &&
										(l[4]
											? ((l[1] = '@supports ('
													.concat(l[4], ') {')
													.concat(l[1], '}')),
												(l[4] = i))
											: (l[4] = ''.concat(i))),
									o.push(l));
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
					for (var i = {}, a = [], c = 0; c < r.length; c++) {
						var d = r[c],
							p = s.base ? d[0] + s.base : d[0],
							u = i[p] || 0,
							l = ''.concat(p, ' ').concat(u);
						i[p] = u + 1;
						var m = o(l),
							h = {
								css: d[1],
								media: d[2],
								sourceMap: d[3],
								supports: d[4],
								layer: d[5],
							};
						if (m !== -1) t[m].references++, t[m].updater(h);
						else {
							var _ = (function (g, C) {
								var v = C.domAPI(C);
								return (
									v.update(g),
									function (b) {
										b
											? (b.css !== g.css ||
													b.media !== g.media ||
													b.sourceMap !== g.sourceMap ||
													b.supports !== g.supports ||
													b.layer !== g.layer) &&
												v.update((g = b))
											: v.remove();
									}
								);
							})(h, s);
							(s.byIndex = c),
								t.splice(c, 0, { identifier: l, updater: _, references: 1 });
						}
						a.push(l);
					}
					return a;
				}
				e.exports = function (r, s) {
					var i = n((r = r || []), (s = s || {}));
					return function (a) {
						a = a || [];
						for (var c = 0; c < i.length; c++) {
							var d = o(i[c]);
							t[d].references--;
						}
						for (var p = n(a, s), u = 0; u < i.length; u++) {
							var l = o(i[u]);
							t[l].references === 0 && (t[l].updater(), t.splice(l, 1));
						}
						i = p;
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
		Nd = {};
	function ee(e) {
		var t = Nd[e];
		if (t !== void 0) return t.exports;
		var o = (Nd[e] = { id: e, exports: {} });
		return ym[e](o, o.exports, ee), o.exports;
	}
	(ee.n = (e) => {
		var t = e && e.__esModule ? () => e.default : () => e;
		return ee.d(t, { a: t }), t;
	}),
		(ee.d = (e, t) => {
			for (var o in t)
				ee.o(t, o) &&
					!ee.o(e, o) &&
					Object.defineProperty(e, o, { enumerable: !0, get: t[o] });
		}),
		(ee.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t)),
		(ee.nc = void 0);
	var vm = ee(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'
		),
		Cm = ee.n(vm),
		_m = ee(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'
		),
		Sm = ee.n(_m),
		xm = ee(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'
		),
		wm = ee.n(xm),
		km = ee(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'
		),
		Im = ee.n(km),
		Rm = ee(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'
		),
		Tm = ee.n(Rm),
		Em = ee(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'
		),
		Am = ee.n(Em),
		mr = ee(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/primitives/button.module.css'
		),
		no = {};
	(no.styleTagTransform = Am()),
		(no.setAttributes = Im()),
		(no.insert = wm().bind(null, 'head')),
		(no.domAPI = Sm()),
		(no.insertStyleElement = Tm()),
		Cm()(mr.A, no);
	var Qo = mr.A && mr.A.locals ? mr.A.locals : void 0;
	var ro = ({
		variant: e = 'primary',
		mode: t = 'filled',
		size: o = 'medium',
	} = {}) => {
		let n = [Qo.button, Qo[`button-${o}`]];
		n.push(
			Qo[
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
		let r = [Qo['button-icon']];
		return {
			root: (s) => [...n, s?.class].filter(Boolean).join(' '),
			icon: (s) => [...r, s?.class].filter(Boolean).join(' '),
		};
	};
	var Pm = {
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
							var c = {};
							if (s)
								for (var d = 0; d < this.length; d++) {
									var p = this[d][0];
									p != null && (c[p] = !0);
								}
							for (var u = 0; u < n.length; u++) {
								var l = [].concat(n[u]);
								(s && c[l[0]]) ||
									(a !== void 0 &&
										(l[5] === void 0 ||
											(l[1] = '@layer'
												.concat(l[5].length > 0 ? ' '.concat(l[5]) : '', ' {')
												.concat(l[1], '}')),
										(l[5] = a)),
									r &&
										(l[2] &&
											(l[1] = '@media '.concat(l[2], ' {').concat(l[1], '}')),
										(l[2] = r)),
									i &&
										(l[4]
											? ((l[1] = '@supports ('
													.concat(l[4], ') {')
													.concat(l[1], '}')),
												(l[4] = i))
											: (l[4] = ''.concat(i))),
									o.push(l));
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
					for (var i = {}, a = [], c = 0; c < r.length; c++) {
						var d = r[c],
							p = s.base ? d[0] + s.base : d[0],
							u = i[p] || 0,
							l = ''.concat(p, ' ').concat(u);
						i[p] = u + 1;
						var m = o(l),
							h = {
								css: d[1],
								media: d[2],
								sourceMap: d[3],
								supports: d[4],
								layer: d[5],
							};
						if (m !== -1) t[m].references++, t[m].updater(h);
						else {
							var _ = (function (g, C) {
								var v = C.domAPI(C);
								return (
									v.update(g),
									function (b) {
										b
											? (b.css !== g.css ||
													b.media !== g.media ||
													b.sourceMap !== g.sourceMap ||
													b.supports !== g.supports ||
													b.layer !== g.layer) &&
												v.update((g = b))
											: v.remove();
									}
								);
							})(h, s);
							(s.byIndex = c),
								t.splice(c, 0, { identifier: l, updater: _, references: 1 });
						}
						a.push(l);
					}
					return a;
				}
				e.exports = function (r, s) {
					var i = n((r = r || []), (s = s || {}));
					return function (a) {
						a = a || [];
						for (var c = 0; c < i.length; c++) {
							var d = o(i[c]);
							t[d].references--;
						}
						for (var p = n(a, s), u = 0; u < i.length; u++) {
							var l = o(i[u]);
							t[l].references === 0 && (t[l].updater(), t.splice(l, 1));
						}
						i = p;
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
		Dd = {};
	function te(e) {
		var t = Dd[e];
		if (t !== void 0) return t.exports;
		var o = (Dd[e] = { id: e, exports: {} });
		return Pm[e](o, o.exports, te), o.exports;
	}
	(te.n = (e) => {
		var t = e && e.__esModule ? () => e.default : () => e;
		return te.d(t, { a: t }), t;
	}),
		(te.d = (e, t) => {
			for (var o in t)
				te.o(t, o) &&
					!te.o(e, o) &&
					Object.defineProperty(e, o, { enumerable: !0, get: t[o] });
		}),
		(te.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t)),
		(te.nc = void 0);
	var Lm = te(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'
		),
		Om = te.n(Lm),
		Nm = te(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'
		),
		Dm = te.n(Nm),
		Bm = te(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'
		),
		Mm = te.n(Bm),
		jm = te(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'
		),
		Fm = te.n(jm),
		Vm = te(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'
		),
		Um = te.n(Vm),
		Hm = te(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'
		),
		zm = te.n(Hm),
		gr = te(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/primitives/switch.module.css'
		),
		so = {};
	(so.styleTagTransform = zm()),
		(so.setAttributes = Fm()),
		(so.insert = Mm().bind(null, 'head')),
		(so.domAPI = Dm()),
		(so.insertStyleElement = Um()),
		Om()(gr.A, so);
	var ot = gr.A && gr.A.locals ? gr.A.locals : void 0;
	var pi = ({ size: e = 'medium' } = {}) => {
		let t = { medium: void 0, small: 'root-small' },
			o = { medium: void 0, small: 'thumb-small' },
			n = { medium: void 0, small: 'track-small' };
		return {
			root: (r) => {
				let s = [ot.root],
					i = t[e];
				return (
					i && s.push(ot[i]),
					r?.class && s.push(r.class),
					s.filter(Boolean).join(' ')
				);
			},
			thumb: (r) => {
				let s = [ot.thumb],
					i = o[e];
				return (
					i && s.push(ot[i]),
					r?.disabled && s.push(ot['thumb-disabled']),
					r?.class && s.push(r.class),
					s.filter(Boolean).join(' ')
				);
			},
			track: (r) => {
				let s = [ot.track],
					i = n[e];
				return (
					i && s.push(ot[i]),
					r?.disabled && s.push(ot['track-disabled']),
					r?.class && s.push(r.class),
					s.filter(Boolean).join(' ')
				);
			},
		};
	};
	function fi(e, t, o, n, r) {
		let s = fe.map(e, (i) => {
			if (!de(i)) return i;
			let a = i.type?.displayName || '',
				c = o.includes(a) ? t : {},
				d = i.props;
			return Ae(
				i,
				{ ...c, key: `${n}-${i.key || a}` },
				fi(d?.children, t, o, n, d?.asChild)
			);
		});
		return r ? s?.[0] : s;
	}
	var Bd = 'ButtonIcon',
		Gm = R(
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
				c
			) => {
				let d = Xt(),
					p = r ? to : 'button',
					u = [i ? '' : ro({ variant: t, mode: o, size: n }).root(), s]
						.filter(Boolean)
						.join(' '),
					l = fi(
						e,
						{
							...(t && { variant: t }),
							...(o && { mode: o }),
							...(n && { size: n }),
						},
						[Bd],
						d,
						r
					);
				return f(p, { ref: c, className: u, ...a, children: l });
			}
		);
	function $m({ variant: e, mode: t, size: o, as: n, className: r, ...s }) {
		let { icon: i } = ro({ variant: e, mode: t, size: o });
		return f(n || 'div', { className: i({ class: r }), ...s });
	}
	(Gm.displayName = 'ButtonRoot'), ($m.displayName = Bd);
	var qm = ['primary', 'secondary', 'neutral'],
		Ye = R(
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
					mode: c = 'stroke',
					size: d = 'small',
					onClick: p,
					closeConsentBanner: u = !1,
					closeConsentDialog: l = !1,
					category: m,
					...h
				},
				_
			) => {
				let { saveConsents: g, setActiveUI: C, setConsent: v } = q(),
					{ uiSource: b } = lr(),
					{ noStyle: x } = Y(),
					I = xe(s ?? (a === 'primary' ? 'buttonPrimary' : 'buttonSecondary'), {
						baseClassName: [
							!(x || n) && ro({ variant: a, mode: c, size: d }).root(),
						],
						style: { ...o },
						className: t,
						noStyle: x || n,
					});
				if (!m && r === 'set-consent')
					throw Error('Category is required for set-consent action');
				let T = z(
						(B) => {
							if (
								((u || l) && C('none'),
								r === 'open-consent-dialog' && C('dialog'),
								p && p(B),
								r !== 'open-consent-dialog')
							) {
								let M = b ? { uiSource: b } : void 0;
								switch (r) {
									case 'accept-consent':
										g('all', M);
										break;
									case 'reject-consent':
										g('necessary', M);
										break;
									case 'custom-consent':
										g('custom', M);
										break;
									case 'set-consent':
										if (!m)
											throw Error(
												'Category is required for set-consent action'
											);
										v(m, !0);
								}
							}
						},
						[u, l, p, g, C, r, m, v, b]
					),
					P = Object.fromEntries(
						Object.entries(h).filter(([B]) => !qm.includes(B))
					);
				return f(e ? to : 'button', { ref: _, ...I, onClick: T, ...P });
			}
		);
	Ye.displayName = 'ConsentButton';
	var Wm = {
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
							var c = {};
							if (s)
								for (var d = 0; d < this.length; d++) {
									var p = this[d][0];
									p != null && (c[p] = !0);
								}
							for (var u = 0; u < n.length; u++) {
								var l = [].concat(n[u]);
								(s && c[l[0]]) ||
									(a !== void 0 &&
										(l[5] === void 0 ||
											(l[1] = '@layer'
												.concat(l[5].length > 0 ? ' '.concat(l[5]) : '', ' {')
												.concat(l[1], '}')),
										(l[5] = a)),
									r &&
										(l[2] &&
											(l[1] = '@media '.concat(l[2], ' {').concat(l[1], '}')),
										(l[2] = r)),
									i &&
										(l[4]
											? ((l[1] = '@supports ('
													.concat(l[4], ') {')
													.concat(l[1], '}')),
												(l[4] = i))
											: (l[4] = ''.concat(i))),
									o.push(l));
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
					for (var i = {}, a = [], c = 0; c < r.length; c++) {
						var d = r[c],
							p = s.base ? d[0] + s.base : d[0],
							u = i[p] || 0,
							l = ''.concat(p, ' ').concat(u);
						i[p] = u + 1;
						var m = o(l),
							h = {
								css: d[1],
								media: d[2],
								sourceMap: d[3],
								supports: d[4],
								layer: d[5],
							};
						if (m !== -1) t[m].references++, t[m].updater(h);
						else {
							var _ = (function (g, C) {
								var v = C.domAPI(C);
								return (
									v.update(g),
									function (b) {
										b
											? (b.css !== g.css ||
													b.media !== g.media ||
													b.sourceMap !== g.sourceMap ||
													b.supports !== g.supports ||
													b.layer !== g.layer) &&
												v.update((g = b))
											: v.remove();
									}
								);
							})(h, s);
							(s.byIndex = c),
								t.splice(c, 0, { identifier: l, updater: _, references: 1 });
						}
						a.push(l);
					}
					return a;
				}
				e.exports = function (r, s) {
					var i = n((r = r || []), (s = s || {}));
					return function (a) {
						a = a || [];
						for (var c = 0; c < i.length; c++) {
							var d = o(i[c]);
							t[d].references--;
						}
						for (var p = n(a, s), u = 0; u < i.length; u++) {
							var l = o(i[u]);
							t[l].references === 0 && (t[l].updater(), t.splice(l, 1));
						}
						i = p;
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
		Md = {};
	function oe(e) {
		var t = Md[e];
		if (t !== void 0) return t.exports;
		var o = (Md[e] = { id: e, exports: {} });
		return Wm[e](o, o.exports, oe), o.exports;
	}
	(oe.n = (e) => {
		var t = e && e.__esModule ? () => e.default : () => e;
		return oe.d(t, { a: t }), t;
	}),
		(oe.d = (e, t) => {
			for (var o in t)
				oe.o(t, o) &&
					!oe.o(e, o) &&
					Object.defineProperty(e, o, { enumerable: !0, get: t[o] });
		}),
		(oe.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t)),
		(oe.nc = void 0);
	var Km = oe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'
		),
		Ym = oe.n(Km),
		Qm = oe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'
		),
		Jm = oe.n(Qm),
		Xm = oe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'
		),
		Zm = oe.n(Xm),
		eg = oe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'
		),
		tg = oe.n(eg),
		og = oe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'
		),
		ng = oe.n(og),
		rg = oe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'
		),
		sg = oe.n(rg),
		hr = oe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/primitives/legal-links.module.css'
		),
		io = {};
	(io.styleTagTransform = sg()),
		(io.setAttributes = tg()),
		(io.insert = Zm().bind(null, 'head')),
		(io.domAPI = Jm()),
		(io.insertStyleElement = ng()),
		Ym()(hr.A, io);
	var jd = hr.A && hr.A.locals ? hr.A.locals : void 0;
	function ig(e) {
		let { legalLinks: t } = q();
		return e == null
			? null
			: Object.fromEntries(
					Object.entries(t ?? {}).filter(([o]) => e.includes(o))
				);
	}
	function br({ links: e, themeKey: t, testIdPrefix: o }) {
		let n = ig(e),
			{ legalLinks: r } = ie(),
			s = xe(t, { baseClassName: jd.legalLink });
		return n && Object.keys(n).length !== 0
			? f('span', {
					children: [
						' ',
						Object.entries(n).map(([i, a], c, d) =>
							a
								? f(
										'span',
										{
											children: [
												f('a', {
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
														c < d.length - 1 && ',',
													],
												}),
												c < d.length - 1 && ' ',
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
	var Jo = R(({ children: e, ...t }, o) => {
		let { cookieBanner: n } = ie();
		return f(W, {
			ref: o,
			baseClassName: pe.title,
			'data-testid': 'consent-banner-title',
			themeKey: 'consentBannerTitle',
			...t,
			children: e ?? n.title,
		});
	});
	Jo.displayName = 'ConsentBannerTitle';
	var Xo = R(({ children: e, legalLinks: t, asChild: o, ...n }, r) => {
		let { cookieBanner: s } = ie();
		return o
			? f(W, {
					ref: r,
					baseClassName: pe.description,
					'data-testid': 'consent-banner-description',
					themeKey: 'consentBannerDescription',
					asChild: o,
					...n,
					children: e ?? s.description,
				})
			: f(W, {
					ref: r,
					baseClassName: pe.description,
					'data-testid': 'consent-banner-description',
					themeKey: 'consentBannerDescription',
					asChild: o,
					...n,
					children: [
						e ?? s.description,
						f(br, {
							links: t,
							themeKey: 'consentBannerDescription',
							testIdPrefix: 'consent-banner-legal-link',
						}),
					],
				});
	});
	Xo.displayName = 'ConsentBannerDescription';
	var Zo = R(({ children: e, ...t }, o) =>
		f(W, {
			ref: o,
			baseClassName: pe.footer,
			'data-testid': 'consent-banner-footer',
			themeKey: 'consentBannerFooter',
			...t,
			children: e,
		})
	);
	Zo.displayName = 'ConsentBannerFooter';
	var en = R(({ children: e, ...t }, o) => {
		let { trapFocus: n } = Y(),
			r = j(null),
			s = o || r,
			i = !!n;
		return (
			ur(i, s),
			f(W, {
				ref: s,
				tabIndex: 0,
				baseClassName: pe.card,
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
	en.displayName = 'ConsentBannerCard';
	var tn = R(({ children: e, ...t }, o) =>
		f(W, {
			ref: o,
			baseClassName: pe.header,
			'data-testid': 'consent-banner-header',
			themeKey: 'consentBannerHeader',
			...t,
			children: e,
		})
	);
	tn.displayName = 'ConsentBannerHeader';
	var on = R(({ children: e, ...t }, o) =>
		f(W, {
			ref: o,
			baseClassName: pe.footerSubGroup,
			'data-testid': 'consent-banner-footer-sub-group',
			themeKey: 'consentBannerFooterSubGroup',
			...t,
			children: e,
		})
	);
	on.displayName = 'ConsentBannerFooterSubGroup';
	var nn = R(({ children: e, ...t }, o) => {
		let { common: n } = ie();
		return f(Ye, {
			ref: o,
			action: 'reject-consent',
			'data-testid': 'consent-banner-reject-button',
			closeConsentBanner: !0,
			...t,
			children: e ?? n.rejectAll,
		});
	});
	nn.displayName = 'ConsentBannerRejectButton';
	var rn = R(({ children: e, ...t }, o) => {
		let { common: n } = ie();
		return f(Ye, {
			ref: o,
			action: 'open-consent-dialog',
			'data-testid': 'consent-banner-customize-button',
			...t,
			children: e ?? n.customize,
		});
	});
	rn.displayName = 'ConsentBannerCustomizeButton';
	var sn = R(({ children: e, ...t }, o) => {
		let { common: n } = ie(),
			{ noStyle: r } = Y();
		return f(Ye, {
			ref: o,
			action: 'accept-consent',
			'data-testid': 'consent-banner-accept-button',
			closeConsentBanner: !0,
			noStyle: r,
			...t,
			children: e ?? n.acceptAll,
		});
	});
	sn.displayName = 'ConsentBannerAcceptButton';
	var Fd = Jo,
		Vd = Xo,
		Ud = Zo,
		mi = on,
		gi = en,
		Hd = tn,
		zd = nn,
		Gd = rn,
		$d = sn;
	function qd() {
		let [e, t] = N(!1);
		return (
			D(() => {
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
	function yr(e) {
		let t = Y(),
			o = qd();
		return {
			noStyle: e?.noStyle ?? t.noStyle ?? !1,
			disableAnimation: e?.disableAnimation ?? t.disableAnimation ?? o,
			scrollLock: e?.scrollLock ?? t.scrollLock ?? !1,
			trapFocus: e?.trapFocus ?? t.trapFocus ?? !0,
		};
	}
	var vr = class extends ve {
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
	var ag = [['reject', 'accept'], 'customize'],
		Wd = ({
			noStyle: e,
			disableAnimation: t,
			scrollLock: o,
			trapFocus: n = !0,
			title: r,
			description: s,
			rejectButtonText: i,
			customizeButtonText: a,
			acceptButtonText: c,
			legalLinks: d,
			layout: p = ag,
			primaryButton: u = 'customize',
			models: l,
			uiSource: m,
		}) => {
			let { cookieBanner: h } = ie(),
				_ = yr({
					noStyle: e,
					disableAnimation: t,
					scrollLock: o,
					trapFocus: n,
				}),
				g = (C) => {
					let v = Array.isArray(u) ? u.includes(C) : C === u;
					switch (C) {
						case 'reject':
							return f(nn, {
								variant: v ? 'primary' : 'neutral',
								'data-testid': 'consent-banner-reject-button',
								children: i,
							});
						case 'accept':
							return f(sn, {
								variant: v ? 'primary' : 'neutral',
								'data-testid': 'consent-banner-accept-button',
								children: c,
							});
						case 'customize':
							return f(rn, {
								variant: v ? 'primary' : 'neutral',
								'data-testid': 'consent-banner-customize-button',
								children: a,
							});
					}
				};
			return f(vr, {
				fallback: f('div', {
					children: 'Something went wrong with the Consent Banner.',
				}),
				children: f(dr, {
					..._,
					models: l,
					uiSource: m,
					children: f(en, {
						'aria-label': h.title,
						children: [
							f(tn, {
								children: [
									f(Jo, { children: r }),
									f(Xo, { legalLinks: d, children: s }),
								],
							}),
							f(Zo, {
								children: p.map((C, v) => {
									if (Array.isArray(C)) {
										let b = C.join('-');
										return f(
											on,
											{ children: C.map((x) => f(F, { children: g(x) }, x)) },
											b ? `group-${b}` : `group-${v}`
										);
									}
									return f(F, { children: g(C) }, C);
								}),
							}),
						],
					}),
				}),
			});
		};
	var hi = Object.assign(Wd, {
		Root: Ad,
		Card: gi,
		Header: Hd,
		Title: Fd,
		Description: Vd,
		Footer: Ud,
		FooterSubGroup: mi,
		RejectButton: zd,
		CustomizeButton: Gd,
		AcceptButton: $d,
		Overlay: cr,
		Content: gi,
		Actions: mi,
	});
	var cg = {
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
							var c = {};
							if (s)
								for (var d = 0; d < this.length; d++) {
									var p = this[d][0];
									p != null && (c[p] = !0);
								}
							for (var u = 0; u < n.length; u++) {
								var l = [].concat(n[u]);
								(s && c[l[0]]) ||
									(a !== void 0 &&
										(l[5] === void 0 ||
											(l[1] = '@layer'
												.concat(l[5].length > 0 ? ' '.concat(l[5]) : '', ' {')
												.concat(l[1], '}')),
										(l[5] = a)),
									r &&
										(l[2] &&
											(l[1] = '@media '.concat(l[2], ' {').concat(l[1], '}')),
										(l[2] = r)),
									i &&
										(l[4]
											? ((l[1] = '@supports ('
													.concat(l[4], ') {')
													.concat(l[1], '}')),
												(l[4] = i))
											: (l[4] = ''.concat(i))),
									o.push(l));
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
					for (var i = {}, a = [], c = 0; c < r.length; c++) {
						var d = r[c],
							p = s.base ? d[0] + s.base : d[0],
							u = i[p] || 0,
							l = ''.concat(p, ' ').concat(u);
						i[p] = u + 1;
						var m = o(l),
							h = {
								css: d[1],
								media: d[2],
								sourceMap: d[3],
								supports: d[4],
								layer: d[5],
							};
						if (m !== -1) t[m].references++, t[m].updater(h);
						else {
							var _ = (function (g, C) {
								var v = C.domAPI(C);
								return (
									v.update(g),
									function (b) {
										b
											? (b.css !== g.css ||
													b.media !== g.media ||
													b.sourceMap !== g.sourceMap ||
													b.supports !== g.supports ||
													b.layer !== g.layer) &&
												v.update((g = b))
											: v.remove();
									}
								);
							})(h, s);
							(s.byIndex = c),
								t.splice(c, 0, { identifier: l, updater: _, references: 1 });
						}
						a.push(l);
					}
					return a;
				}
				e.exports = function (r, s) {
					var i = n((r = r || []), (s = s || {}));
					return function (a) {
						a = a || [];
						for (var c = 0; c < i.length; c++) {
							var d = o(i[c]);
							t[d].references--;
						}
						for (var p = n(a, s), u = 0; u < i.length; u++) {
							var l = o(i[u]);
							t[l].references === 0 && (t[l].updater(), t.splice(l, 1));
						}
						i = p;
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
		Kd = {};
	function ne(e) {
		var t = Kd[e];
		if (t !== void 0) return t.exports;
		var o = (Kd[e] = { id: e, exports: {} });
		return cg[e](o, o.exports, ne), o.exports;
	}
	(ne.n = (e) => {
		var t = e && e.__esModule ? () => e.default : () => e;
		return ne.d(t, { a: t }), t;
	}),
		(ne.d = (e, t) => {
			for (var o in t)
				ne.o(t, o) &&
					!ne.o(e, o) &&
					Object.defineProperty(e, o, { enumerable: !0, get: t[o] });
		}),
		(ne.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t)),
		(ne.nc = void 0);
	var lg = ne(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'
		),
		dg = ne.n(lg),
		ug = ne(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'
		),
		pg = ne.n(ug),
		fg = ne(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'
		),
		mg = ne.n(fg),
		gg = ne(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'
		),
		hg = ne.n(gg),
		bg = ne(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'
		),
		yg = ne.n(bg),
		vg = ne(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'
		),
		Cg = ne.n(vg),
		Cr = ne(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/components/consent-dialog.module.css'
		),
		ao = {};
	(ao.styleTagTransform = Cg()),
		(ao.setAttributes = hg()),
		(ao.insert = mg().bind(null, 'head')),
		(ao.domAPI = pg()),
		(ao.insertStyleElement = yg()),
		dg()(Cr.A, ao);
	var Q = Cr.A && Cr.A.locals ? Cr.A.locals : void 0;
	var _g = {
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
							var c = {};
							if (s)
								for (var d = 0; d < this.length; d++) {
									var p = this[d][0];
									p != null && (c[p] = !0);
								}
							for (var u = 0; u < n.length; u++) {
								var l = [].concat(n[u]);
								(s && c[l[0]]) ||
									(a !== void 0 &&
										(l[5] === void 0 ||
											(l[1] = '@layer'
												.concat(l[5].length > 0 ? ' '.concat(l[5]) : '', ' {')
												.concat(l[1], '}')),
										(l[5] = a)),
									r &&
										(l[2] &&
											(l[1] = '@media '.concat(l[2], ' {').concat(l[1], '}')),
										(l[2] = r)),
									i &&
										(l[4]
											? ((l[1] = '@supports ('
													.concat(l[4], ') {')
													.concat(l[1], '}')),
												(l[4] = i))
											: (l[4] = ''.concat(i))),
									o.push(l));
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
					for (var i = {}, a = [], c = 0; c < r.length; c++) {
						var d = r[c],
							p = s.base ? d[0] + s.base : d[0],
							u = i[p] || 0,
							l = ''.concat(p, ' ').concat(u);
						i[p] = u + 1;
						var m = o(l),
							h = {
								css: d[1],
								media: d[2],
								sourceMap: d[3],
								supports: d[4],
								layer: d[5],
							};
						if (m !== -1) t[m].references++, t[m].updater(h);
						else {
							var _ = (function (g, C) {
								var v = C.domAPI(C);
								return (
									v.update(g),
									function (b) {
										b
											? (b.css !== g.css ||
													b.media !== g.media ||
													b.sourceMap !== g.sourceMap ||
													b.supports !== g.supports ||
													b.layer !== g.layer) &&
												v.update((g = b))
											: v.remove();
									}
								);
							})(h, s);
							(s.byIndex = c),
								t.splice(c, 0, { identifier: l, updater: _, references: 1 });
						}
						a.push(l);
					}
					return a;
				}
				e.exports = function (r, s) {
					var i = n((r = r || []), (s = s || {}));
					return function (a) {
						a = a || [];
						for (var c = 0; c < i.length; c++) {
							var d = o(i[c]);
							t[d].references--;
						}
						for (var p = n(a, s), u = 0; u < i.length; u++) {
							var l = o(i[u]);
							t[l].references === 0 && (t[l].updater(), t.splice(l, 1));
						}
						i = p;
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
		Yd = {};
	function re(e) {
		var t = Yd[e];
		if (t !== void 0) return t.exports;
		var o = (Yd[e] = { id: e, exports: {} });
		return _g[e](o, o.exports, re), o.exports;
	}
	(re.n = (e) => {
		var t = e && e.__esModule ? () => e.default : () => e;
		return re.d(t, { a: t }), t;
	}),
		(re.d = (e, t) => {
			for (var o in t)
				re.o(t, o) &&
					!re.o(e, o) &&
					Object.defineProperty(e, o, { enumerable: !0, get: t[o] });
		}),
		(re.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t)),
		(re.nc = void 0);
	var Sg = re(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'
		),
		xg = re.n(Sg),
		wg = re(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'
		),
		kg = re.n(wg),
		Ig = re(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'
		),
		Rg = re.n(Ig),
		Tg = re(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'
		),
		Eg = re.n(Tg),
		Ag = re(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'
		),
		Pg = re.n(Ag),
		Lg = re(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'
		),
		Og = re.n(Lg),
		_r = re(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/components/consent-widget.module.css'
		),
		co = {};
	(co.styleTagTransform = Og()),
		(co.setAttributes = Eg()),
		(co.insert = Rg().bind(null, 'head')),
		(co.domAPI = kg()),
		(co.insertStyleElement = Pg()),
		xg()(_r.A, co);
	var Ie = _r.A && _r.A.locals ? _r.A.locals : void 0;
	function ft(e, t = []) {
		let o = [];
		function n(s, i) {
			let a = ue(i),
				c = o.length;
			o = [...o, i];
			let d = (u) => {
				let { scope: l, children: m, ...h } = u,
					_ = l?.[e]?.[c] || a,
					g = G(() => h, Object.values(h));
				return f(_.Provider, { value: g, children: m });
			};
			d.displayName = s + 'Provider';
			function p(u, l) {
				let m = l?.[e]?.[c] || a,
					h = he(m);
				if (h) return h;
				if (i !== void 0) return i;
				throw new Error(`\`${u}\` must be used within \`${s}\``);
			}
			return [d, p];
		}
		let r = () => {
			let s = o.map((i) => ue(i));
			return function (a) {
				let c = a?.[e] || s;
				return G(() => ({ [`__scope${e}`]: { ...a, [e]: c } }), [a, c]);
			};
		};
		return (r.scopeName = e), [n, Ng(r, ...t)];
	}
	function Ng(...e) {
		let t = e[0];
		if (e.length === 1) return t;
		let o = () => {
			let n = e.map((r) => ({ useScope: r(), scopeName: r.scopeName }));
			return function (s) {
				let i = n.reduce((a, { useScope: c, scopeName: d }) => {
					let u = c(s)[`__scope${d}`];
					return { ...a, ...u };
				}, {});
				return G(() => ({ [`__scope${t.scopeName}`]: i }), [i]);
			};
		};
		return (o.scopeName = t.scopeName), o;
	}
	function an(e) {
		let t = Dg(e),
			o = R((n, r) => {
				let { children: s, ...i } = n,
					a = fe.toArray(s),
					c = a.find(Mg);
				if (c) {
					let d = c.props.children,
						p = a.map((u) =>
							u === c
								? fe.count(d) > 1
									? fe.only(null)
									: de(d)
										? d.props.children
										: null
								: u
						);
					return f(t, {
						...i,
						ref: r,
						children: de(d) ? Ae(d, void 0, p) : null,
					});
				}
				return f(t, { ...i, ref: r, children: s });
			});
		return (o.displayName = `${e}.Slot`), o;
	}
	function Dg(e) {
		let t = R((o, n) => {
			let { children: r, ...s } = o;
			if (de(r)) {
				let i = Fg(r),
					a = jg(s, r.props);
				return r.type !== F && (a.ref = n ? Yo(n, i) : i), Ae(r, a);
			}
			return fe.count(r) > 1 ? fe.only(null) : null;
		});
		return (t.displayName = `${e}.SlotClone`), t;
	}
	var Bg = Symbol('radix.slottable');
	function Mg(e) {
		return (
			de(e) &&
			typeof e.type == 'function' &&
			'__radixId' in e.type &&
			e.type.__radixId === Bg
		);
	}
	function jg(e, t) {
		let o = { ...t };
		for (let n in t) {
			let r = e[n],
				s = t[n];
			/^on[A-Z]/.test(n)
				? r && s
					? (o[n] = (...a) => {
							let c = s(...a);
							return r(...a), c;
						})
					: r && (o[n] = r)
				: n === 'style'
					? (o[n] = { ...r, ...s })
					: n === 'className' && (o[n] = [r, s].filter(Boolean).join(' '));
		}
		return { ...e, ...o };
	}
	function Fg(e) {
		let t = Object.getOwnPropertyDescriptor(e.props, 'ref')?.get,
			o = t && 'isReactWarning' in t && t.isReactWarning;
		return o
			? e.ref
			: ((t = Object.getOwnPropertyDescriptor(e, 'ref')?.get),
				(o = t && 'isReactWarning' in t && t.isReactWarning),
				o ? e.props.ref : e.props.ref || e.ref);
	}
	function Qd(e) {
		let t = e + 'CollectionProvider',
			[o, n] = ft(t),
			[r, s] = o(t, { collectionRef: { current: null }, itemMap: new Map() }),
			i = (_) => {
				let { scope: g, children: C } = _,
					v = $.useRef(null),
					b = $.useRef(new Map()).current;
				return f(r, { scope: g, itemMap: b, collectionRef: v, children: C });
			};
		i.displayName = t;
		let a = e + 'CollectionSlot',
			c = an(a),
			d = $.forwardRef((_, g) => {
				let { scope: C, children: v } = _,
					b = s(a, C),
					x = Pe(g, b.collectionRef);
				return f(c, { ref: x, children: v });
			});
		d.displayName = a;
		let p = e + 'CollectionItemSlot',
			u = 'data-radix-collection-item',
			l = an(p),
			m = $.forwardRef((_, g) => {
				let { scope: C, children: v, ...b } = _,
					x = $.useRef(null),
					I = Pe(g, x),
					T = s(p, C);
				return (
					$.useEffect(
						() => (
							T.itemMap.set(x, { ref: x, ...b }),
							() => {
								T.itemMap.delete(x);
							}
						)
					),
					f(l, { [u]: '', ref: I, children: v })
				);
			});
		m.displayName = p;
		function h(_) {
			let g = s(e + 'CollectionConsumer', _);
			return $.useCallback(() => {
				let v = g.collectionRef.current;
				if (!v) return [];
				let b = Array.from(v.querySelectorAll(`[${u}]`));
				return Array.from(g.itemMap.values()).sort(
					(T, P) => b.indexOf(T.ref.current) - b.indexOf(P.ref.current)
				);
			}, [g.collectionRef, g.itemMap]);
		}
		return [{ Provider: i, Slot: d, ItemSlot: m }, h, n];
	}
	var w5 = !!(
		typeof window < 'u' &&
		window.document &&
		window.document.createElement
	);
	function lo(e, t, { checkForDefaultPrevented: o = !0 } = {}) {
		return function (r) {
			if ((e?.(r), o === !1 || !r.defaultPrevented)) return t?.(r);
		};
	}
	var Me = globalThis?.document ? tt : () => {};
	var Vg = X[' useInsertionEffect '.trim().toString()] || Me;
	function At({ prop: e, defaultProp: t, onChange: o = () => {}, caller: n }) {
		let [r, s, i] = Ug({ defaultProp: t, onChange: o }),
			a = e !== void 0,
			c = a ? e : r;
		{
			let p = j(e !== void 0);
			D(() => {
				let u = p.current;
				u !== a &&
					console.warn(
						`${n} is changing from ${u ? 'controlled' : 'uncontrolled'} to ${a ? 'controlled' : 'uncontrolled'}. Components should not switch from controlled to uncontrolled (or vice versa). Decide between using a controlled or uncontrolled value for the lifetime of the component.`
					),
					(p.current = a);
			}, [a, n]);
		}
		let d = z(
			(p) => {
				if (a) {
					let u = Hg(p) ? p(e) : p;
					u !== e && i.current?.(u);
				} else s(p);
			},
			[a, e, s, i]
		);
		return [c, d];
	}
	function Ug({ defaultProp: e, onChange: t }) {
		let [o, n] = N(e),
			r = j(o),
			s = j(t);
		return (
			Vg(() => {
				s.current = t;
			}, [t]),
			D(() => {
				r.current !== o && (s.current?.(o), (r.current = o));
			}, [o, r]),
			[o, n, s]
		);
	}
	function Hg(e) {
		return typeof e == 'function';
	}
	var zg = [
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
		Qe = zg.reduce((e, t) => {
			let o = an(`Primitive.${t}`),
				n = R((r, s) => {
					let { asChild: i, ...a } = r,
						c = i ? o : t;
					return (
						typeof window < 'u' && (window[Symbol.for('radix-ui')] = !0),
						f(c, { ...a, ref: s })
					);
				});
			return (n.displayName = `Primitive.${t}`), { ...e, [t]: n };
		}, {});
	function Gg(e, t) {
		return ct((o, n) => t[o][n] ?? o, e);
	}
	var bi = (e) => {
		let { present: t, children: o } = e,
			n = $g(t),
			r = typeof o == 'function' ? o({ present: n.isPresent }) : fe.only(o),
			s = Pe(n.ref, qg(r));
		return typeof o == 'function' || n.isPresent ? Ae(r, { ref: s }) : null;
	};
	bi.displayName = 'Presence';
	function $g(e) {
		let [t, o] = N(),
			n = j(null),
			r = j(e),
			s = j('none'),
			i = e ? 'mounted' : 'unmounted',
			[a, c] = Gg(i, {
				mounted: { UNMOUNT: 'unmounted', ANIMATION_OUT: 'unmountSuspended' },
				unmountSuspended: { MOUNT: 'mounted', ANIMATION_END: 'unmounted' },
				unmounted: { MOUNT: 'mounted' },
			});
		return (
			D(() => {
				let d = Sr(n.current);
				s.current = a === 'mounted' ? d : 'none';
			}, [a]),
			Me(() => {
				let d = n.current,
					p = r.current;
				if (p !== e) {
					let l = s.current,
						m = Sr(d);
					e
						? c('MOUNT')
						: m === 'none' || d?.display === 'none'
							? c('UNMOUNT')
							: c(p && l !== m ? 'ANIMATION_OUT' : 'UNMOUNT'),
						(r.current = e);
				}
			}, [e, c]),
			Me(() => {
				if (t) {
					let d,
						p = t.ownerDocument.defaultView ?? window,
						u = (m) => {
							let _ = Sr(n.current).includes(CSS.escape(m.animationName));
							if (m.target === t && _ && (c('ANIMATION_END'), !r.current)) {
								let g = t.style.animationFillMode;
								(t.style.animationFillMode = 'forwards'),
									(d = p.setTimeout(() => {
										t.style.animationFillMode === 'forwards' &&
											(t.style.animationFillMode = g);
									}));
							}
						},
						l = (m) => {
							m.target === t && (s.current = Sr(n.current));
						};
					return (
						t.addEventListener('animationstart', l),
						t.addEventListener('animationcancel', u),
						t.addEventListener('animationend', u),
						() => {
							p.clearTimeout(d),
								t.removeEventListener('animationstart', l),
								t.removeEventListener('animationcancel', u),
								t.removeEventListener('animationend', u);
						}
					);
				} else c('ANIMATION_END');
			}, [t, c]),
			{
				isPresent: ['mounted', 'unmountSuspended'].includes(a),
				ref: z((d) => {
					(n.current = d ? getComputedStyle(d) : null), o(d);
				}, []),
			}
		);
	}
	function Sr(e) {
		return e?.animationName || 'none';
	}
	function qg(e) {
		let t = Object.getOwnPropertyDescriptor(e.props, 'ref')?.get,
			o = t && 'isReactWarning' in t && t.isReactWarning;
		return o
			? e.ref
			: ((t = Object.getOwnPropertyDescriptor(e, 'ref')?.get),
				(o = t && 'isReactWarning' in t && t.isReactWarning),
				o ? e.props.ref : e.props.ref || e.ref);
	}
	var Wg = X[' useId '.trim().toString()] || (() => {}),
		Kg = 0;
	function xr(e) {
		let [t, o] = N(Wg());
		return (
			Me(() => {
				e || o((n) => n ?? String(Kg++));
			}, [e]),
			e || (t ? `radix-${t}` : '')
		);
	}
	var wr = 'Collapsible',
		[Yg, yi] = ft(wr),
		[Qg, vi] = Yg(wr),
		Jd = R((e, t) => {
			let {
					__scopeCollapsible: o,
					open: n,
					defaultOpen: r,
					disabled: s,
					onOpenChange: i,
					...a
				} = e,
				[c, d] = At({ prop: n, defaultProp: r ?? !1, onChange: i, caller: wr });
			return f(Qg, {
				scope: o,
				disabled: s,
				contentId: xr(),
				open: c,
				onOpenToggle: z(() => d((p) => !p), [d]),
				children: f(Qe.div, {
					'data-state': _i(c),
					'data-disabled': s ? '' : void 0,
					...a,
					ref: t,
				}),
			});
		});
	Jd.displayName = wr;
	var Xd = 'CollapsibleTrigger',
		Zd = R((e, t) => {
			let { __scopeCollapsible: o, ...n } = e,
				r = vi(Xd, o);
			return f(Qe.button, {
				type: 'button',
				'aria-controls': r.contentId,
				'aria-expanded': r.open || !1,
				'data-state': _i(r.open),
				'data-disabled': r.disabled ? '' : void 0,
				disabled: r.disabled,
				...n,
				ref: t,
				onClick: lo(e.onClick, r.onOpenToggle),
			});
		});
	Zd.displayName = Xd;
	var Ci = 'CollapsibleContent',
		eu = R((e, t) => {
			let { forceMount: o, ...n } = e,
				r = vi(Ci, e.__scopeCollapsible);
			return f(bi, {
				present: o || r.open,
				children: ({ present: s }) => f(Jg, { ...n, ref: t, present: s }),
			});
		});
	eu.displayName = Ci;
	var Jg = R((e, t) => {
		let { __scopeCollapsible: o, present: n, children: r, ...s } = e,
			i = vi(Ci, o),
			[a, c] = N(n),
			d = j(null),
			p = Pe(t, d),
			u = j(0),
			l = u.current,
			m = j(0),
			h = m.current,
			_ = i.open || a,
			g = j(_),
			C = j(void 0);
		return (
			D(() => {
				let v = requestAnimationFrame(() => (g.current = !1));
				return () => cancelAnimationFrame(v);
			}, []),
			Me(() => {
				let v = d.current;
				if (v) {
					(C.current = C.current || {
						transitionDuration: v.style.transitionDuration,
						animationName: v.style.animationName,
					}),
						(v.style.transitionDuration = '0s'),
						(v.style.animationName = 'none');
					let b = v.getBoundingClientRect();
					(u.current = b.height),
						(m.current = b.width),
						g.current ||
							((v.style.transitionDuration = C.current.transitionDuration),
							(v.style.animationName = C.current.animationName)),
						c(n);
				}
			}, [i.open, n]),
			f(Qe.div, {
				'data-state': _i(i.open),
				'data-disabled': i.disabled ? '' : void 0,
				id: i.contentId,
				hidden: !_,
				...s,
				ref: p,
				style: {
					'--radix-collapsible-content-height': l ? `${l}px` : void 0,
					'--radix-collapsible-content-width': h ? `${h}px` : void 0,
					...e.style,
				},
				children: _ && r,
			})
		);
	});
	function _i(e) {
		return e ? 'open' : 'closed';
	}
	var tu = Jd,
		ou = Zd,
		nu = eu;
	var Zg = ue(void 0);
	function ru(e) {
		let t = he(Zg);
		return e || t || 'ltr';
	}
	var je = 'Accordion',
		eh = ['Home', 'End', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'],
		[xi, th, oh] = Qd(je),
		[Ir, sk] = ft(je, [oh, yi]),
		wi = yi(),
		su = $.forwardRef((e, t) => {
			let { type: o, ...n } = e,
				r = n,
				s = n;
			return f(xi.Provider, {
				scope: e.__scopeAccordion,
				children:
					o === 'multiple' ? f(ih, { ...s, ref: t }) : f(sh, { ...r, ref: t }),
			});
		});
	su.displayName = je;
	var [iu, nh] = Ir(je),
		[au, rh] = Ir(je, { collapsible: !1 }),
		sh = $.forwardRef((e, t) => {
			let {
					value: o,
					defaultValue: n,
					onValueChange: r = () => {},
					collapsible: s = !1,
					...i
				} = e,
				[a, c] = At({ prop: o, defaultProp: n ?? '', onChange: r, caller: je });
			return f(iu, {
				scope: e.__scopeAccordion,
				value: $.useMemo(() => (a ? [a] : []), [a]),
				onItemOpen: c,
				onItemClose: $.useCallback(() => s && c(''), [s, c]),
				children: f(au, {
					scope: e.__scopeAccordion,
					collapsible: s,
					children: f(cu, { ...i, ref: t }),
				}),
			});
		}),
		ih = $.forwardRef((e, t) => {
			let { value: o, defaultValue: n, onValueChange: r = () => {}, ...s } = e,
				[i, a] = At({ prop: o, defaultProp: n ?? [], onChange: r, caller: je }),
				c = $.useCallback((p) => a((u = []) => [...u, p]), [a]),
				d = $.useCallback((p) => a((u = []) => u.filter((l) => l !== p)), [a]);
			return f(iu, {
				scope: e.__scopeAccordion,
				value: i,
				onItemOpen: c,
				onItemClose: d,
				children: f(au, {
					scope: e.__scopeAccordion,
					collapsible: !0,
					children: f(cu, { ...s, ref: t }),
				}),
			});
		}),
		[ah, Rr] = Ir(je),
		cu = $.forwardRef((e, t) => {
			let {
					__scopeAccordion: o,
					disabled: n,
					dir: r,
					orientation: s = 'vertical',
					...i
				} = e,
				a = $.useRef(null),
				c = Pe(a, t),
				d = th(o),
				u = ru(r) === 'ltr',
				l = lo(e.onKeyDown, (m) => {
					if (!eh.includes(m.key)) return;
					let h = m.target,
						_ = d().filter((B) => !B.ref.current?.disabled),
						g = _.findIndex((B) => B.ref.current === h),
						C = _.length;
					if (g === -1) return;
					m.preventDefault();
					let v = g,
						b = 0,
						x = C - 1,
						I = () => {
							(v = g + 1), v > x && (v = b);
						},
						T = () => {
							(v = g - 1), v < b && (v = x);
						};
					switch (m.key) {
						case 'Home':
							v = b;
							break;
						case 'End':
							v = x;
							break;
						case 'ArrowRight':
							s === 'horizontal' && (u ? I() : T());
							break;
						case 'ArrowDown':
							s === 'vertical' && I();
							break;
						case 'ArrowLeft':
							s === 'horizontal' && (u ? T() : I());
							break;
						case 'ArrowUp':
							s === 'vertical' && T();
							break;
					}
					let P = v % C;
					_[P].ref.current?.focus();
				});
			return f(ah, {
				scope: o,
				disabled: n,
				direction: r,
				orientation: s,
				children: f(xi.Slot, {
					scope: o,
					children: f(Qe.div, {
						...i,
						'data-orientation': s,
						ref: c,
						onKeyDown: n ? void 0 : l,
					}),
				}),
			});
		}),
		kr = 'AccordionItem',
		[ch, ki] = Ir(kr),
		lu = $.forwardRef((e, t) => {
			let { __scopeAccordion: o, value: n, ...r } = e,
				s = Rr(kr, o),
				i = nh(kr, o),
				a = wi(o),
				c = xr(),
				d = (n && i.value.includes(n)) || !1,
				p = s.disabled || e.disabled;
			return f(ch, {
				scope: o,
				open: d,
				disabled: p,
				triggerId: c,
				children: f(tu, {
					'data-orientation': s.orientation,
					'data-state': mu(d),
					...a,
					...r,
					ref: t,
					disabled: p,
					open: d,
					onOpenChange: (u) => {
						u ? i.onItemOpen(n) : i.onItemClose(n);
					},
				}),
			});
		});
	lu.displayName = kr;
	var du = 'AccordionHeader',
		lh = $.forwardRef((e, t) => {
			let { __scopeAccordion: o, ...n } = e,
				r = Rr(je, o),
				s = ki(du, o);
			return f(Qe.h3, {
				'data-orientation': r.orientation,
				'data-state': mu(s.open),
				'data-disabled': s.disabled ? '' : void 0,
				...n,
				ref: t,
			});
		});
	lh.displayName = du;
	var Si = 'AccordionTrigger',
		uu = $.forwardRef((e, t) => {
			let { __scopeAccordion: o, ...n } = e,
				r = Rr(je, o),
				s = ki(Si, o),
				i = rh(Si, o),
				a = wi(o);
			return f(xi.ItemSlot, {
				scope: o,
				children: f(ou, {
					'aria-disabled': (s.open && !i.collapsible) || void 0,
					'data-orientation': r.orientation,
					id: s.triggerId,
					...a,
					...n,
					ref: t,
				}),
			});
		});
	uu.displayName = Si;
	var pu = 'AccordionContent',
		fu = $.forwardRef((e, t) => {
			let { __scopeAccordion: o, ...n } = e,
				r = Rr(je, o),
				s = ki(pu, o),
				i = wi(o);
			return f(nu, {
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
	fu.displayName = pu;
	function mu(e) {
		return e ? 'open' : 'closed';
	}
	var gu = su,
		hu = lu;
	var bu = uu,
		yu = fu;
	var uo = ({ title: e, iconPath: t }) =>
		R((o, n) =>
			f('svg', {
				xmlns: 'http://www.w3.org/2000/svg',
				viewBox: '0 0 24 24',
				fill: 'none',
				stroke: 'currentColor',
				strokeLinecap: 'round',
				strokeLinejoin: 'round',
				strokeWidth: 2,
				ref: n,
				...o,
				children: [f('title', { children: e }), t],
			})
		);
	var Ii = R(
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
			let { noStyle: i } = Y(),
				a = pt({ variant: t, size: o });
			return f(gu, {
				ref: s,
				className: i || n ? e : a.root({ class: e }),
				...r,
			});
		}
	);
	Ii.displayName = 'AccordionRoot';
	var Ri = R(({ className: e, noStyle: t, ...o }, n) => {
		let { noStyle: r } = Y(),
			s = pt();
		return f(hu, {
			ref: n,
			className: r || t ? e : s.item({ class: e }),
			...o,
		});
	});
	Ri.displayName = 'AccordionItem';
	var Ti = R(({ children: e, className: t, noStyle: o, ...n }, r) => {
		let { noStyle: s } = Y(),
			i = pt();
		return f(bu, {
			ref: r,
			className: s || o ? t : i.trigger({ class: t }),
			...n,
			children: e,
		});
	});
	function dh({ className: e, noStyle: t, as: o, ...n }) {
		let r = pt(),
			s = typeof e == 'string' ? e : void 0;
		return f(o || 'div', { className: t ? s : r.icon({ class: s }), ...n });
	}
	function Ei({
		openIcon: e = {
			Element: uo({
				title: 'Open',
				iconPath: f('path', { d: 'M5 12h14M12 5v14' }),
			}),
		},
		closeIcon: t = {
			Element: uo({ title: 'Close', iconPath: f('path', { d: 'M5 12h14' }) }),
		},
		noStyle: o,
		...n
	}) {
		let r = pt(),
			s = o ? e.className : r.arrowOpen({ class: e.className }),
			i = o ? t.className : r.arrowClose({ class: t.className });
		return f(F, {
			children: [
				f(e.Element, { ...n, className: s }),
				f(t.Element, { ...n, className: i }),
			],
		});
	}
	(Ti.displayName = 'AccordionTrigger'),
		(dh.displayName = 'AccordionIcon'),
		(Ei.displayName = 'AccordionArrow');
	var Ai = R(
		({ children: e, className: t, innerClassName: o, noStyle: n, ...r }, s) => {
			let { noStyle: i } = Y(),
				a = pt(),
				c = i || n,
				d = c ? t : a.content({ class: t }),
				p = c ? o : a.contentInner({ class: o });
			return f(yu, {
				ref: s,
				className: d,
				...r,
				children: f('div', { className: p, children: e }),
			});
		}
	);
	Ai.displayName = 'AccordionContent';
	function vu(e) {
		let t = j({ value: e, previous: e });
		return G(
			() => (
				t.current.value !== e &&
					((t.current.previous = t.current.value), (t.current.value = e)),
				t.current.previous
			),
			[e]
		);
	}
	function Cu(e) {
		let [t, o] = N(void 0);
		return (
			Me(() => {
				if (e) {
					o({ width: e.offsetWidth, height: e.offsetHeight });
					let n = new ResizeObserver((r) => {
						if (!Array.isArray(r) || !r.length) return;
						let s = r[0],
							i,
							a;
						if ('borderBoxSize' in s) {
							let c = s.borderBoxSize,
								d = Array.isArray(c) ? c[0] : c;
							(i = d.inlineSize), (a = d.blockSize);
						} else (i = e.offsetWidth), (a = e.offsetHeight);
						o({ width: i, height: a });
					});
					return n.observe(e, { box: 'border-box' }), () => n.unobserve(e);
				} else o(void 0);
			}, [e]),
			t
		);
	}
	var Tr = 'Switch',
		[uh, Ek] = ft(Tr),
		[ph, fh] = uh(Tr),
		_u = R((e, t) => {
			let {
					__scopeSwitch: o,
					name: n,
					checked: r,
					defaultChecked: s,
					required: i,
					disabled: a,
					value: c = 'on',
					onCheckedChange: d,
					form: p,
					...u
				} = e,
				[l, m] = N(null),
				h = Pe(t, (b) => m(b)),
				_ = j(!1),
				g = l ? p || !!l.closest('form') : !0,
				[C, v] = At({ prop: r, defaultProp: s ?? !1, onChange: d, caller: Tr });
			return f(ph, {
				scope: o,
				checked: C,
				disabled: a,
				children: [
					f(Qe.button, {
						type: 'button',
						role: 'switch',
						'aria-checked': C,
						'aria-required': i,
						'data-state': ku(C),
						'data-disabled': a ? '' : void 0,
						disabled: a,
						value: c,
						...u,
						ref: h,
						onClick: lo(e.onClick, (b) => {
							v((x) => !x),
								g &&
									((_.current = b.isPropagationStopped()),
									_.current || b.stopPropagation());
						}),
					}),
					g &&
						f(wu, {
							control: l,
							bubbles: !_.current,
							name: n,
							value: c,
							checked: C,
							required: i,
							disabled: a,
							form: p,
							style: { transform: 'translateX(-100%)' },
						}),
				],
			});
		});
	_u.displayName = Tr;
	var Su = 'SwitchThumb',
		xu = R((e, t) => {
			let { __scopeSwitch: o, ...n } = e,
				r = fh(Su, o);
			return f(Qe.span, {
				'data-state': ku(r.checked),
				'data-disabled': r.disabled ? '' : void 0,
				...n,
				ref: t,
			});
		});
	xu.displayName = Su;
	var mh = 'SwitchBubbleInput',
		wu = R(
			(
				{ __scopeSwitch: e, control: t, checked: o, bubbles: n = !0, ...r },
				s
			) => {
				let i = j(null),
					a = Pe(i, s),
					c = vu(o),
					d = Cu(t);
				return (
					D(() => {
						let p = i.current;
						if (!p) return;
						let u = window.HTMLInputElement.prototype,
							m = Object.getOwnPropertyDescriptor(u, 'checked').set;
						if (c !== o && m) {
							let h = new Event('click', { bubbles: n });
							m.call(p, o), p.dispatchEvent(h);
						}
					}, [c, o, n]),
					f('input', {
						type: 'checkbox',
						'aria-hidden': !0,
						defaultChecked: o,
						...r,
						tabIndex: -1,
						ref: a,
						style: {
							...r.style,
							...d,
							position: 'absolute',
							pointerEvents: 'none',
							opacity: 0,
							margin: 0,
						},
					})
				);
			}
		);
	wu.displayName = mh;
	function ku(e) {
		return e ? 'checked' : 'unchecked';
	}
	var Pi = _u,
		Iu = xu;
	var Li = R(
		(
			{ className: e, disabled: t, size: o = 'medium', noStyle: n, ...r },
			s
		) => {
			let i = pi({ size: o }),
				a = n ? e : i.root({ class: e }),
				c = n ? void 0 : i.thumb({ disabled: t }),
				d = n ? void 0 : i.track({ disabled: t });
			return f(Pi, {
				ref: s,
				disabled: t,
				className: a,
				...r,
				children: f('span', {
					className: d,
					children: f(Iu, {
						className: c,
						style: {
							'--mask':
								'radial-gradient(circle farthest-side at 50% 50%, #0000 1.95px, #000 2.05px 100%) 50% 50%/100% 100% no-repeat',
						},
					}),
				}),
			});
		}
	);
	Li.displayName = Pi.displayName;
	var gh = R(({ children: e, ...t }, o) =>
			f(W, { ref: o, baseClassName: Ie.accordionTrigger, ...t, children: e })
		),
		hh = Ti,
		bh = Ai,
		yh = Ei,
		Ru = Ii,
		vh = Li,
		Tu = () => {
			let {
					selectedConsents: e,
					setSelectedConsent: t,
					getDisplayedConsents: o,
				} = q(),
				n = z(
					(s, i) => {
						t(s, i);
					},
					[t]
				),
				{ consentTypes: r } = ie();
			return o().map((s) =>
				f(
					Ch,
					{
						value: s.name,
						className: Ie.accordionItem,
						children: [
							f(gh, {
								'data-testid': `consent-widget-accordion-trigger-${s.name}`,
								children: [
									f(hh, {
										className: Ie.accordionTriggerInner,
										'data-testid': `consent-widget-accordion-trigger-inner-${s.name}`,
										children: [
											f(yh, {
												'data-testid': `consent-widget-accordion-arrow-${s.name}`,
												className: Ie.accordionArrow,
												openIcon: {
													Element: uo({
														title: 'Open',
														iconPath: f('path', { d: 'M5 12h14M12 5v14' }),
													}),
													className: Ie.accordionArrowIcon,
												},
												closeIcon: {
													Element: uo({
														title: 'Close',
														iconPath: f('path', { d: 'M5 12h14' }),
													}),
													className: Ie.accordionArrowIcon,
												},
											}),
											r[s.name]?.title ??
												s.name
													.replace(/_/g, ' ')
													.replace(/\b\w/g, (i) => i.toUpperCase()),
										],
									}),
									f(vh, {
										checked: e[s.name],
										onClick: (i) => i.stopPropagation(),
										onKeyUp: (i) => i.stopPropagation(),
										onKeyDown: (i) => i.stopPropagation(),
										onCheckedChange: (i) => n(s.name, i),
										disabled: s.disabled,
										className: Ie.switch,
										size: 'small',
										'data-testid': `consent-widget-switch-${s.name}`,
									}),
								],
							}),
							f(bh, {
								className: Ie.accordionContent,
								'data-testid': `consent-widget-accordion-content-${s.name}`,
								children: r[s.name]?.description ?? s.description,
							}),
						],
					},
					s.name
				)
			);
		},
		Ch = R(({ className: e, ...t }, o) =>
			f(Ri, { ref: o, className: Ie.accordionItem, ...t })
		);
	var Eu = R(({ children: e, ...t }, o) => {
			let { common: n } = ie();
			return f(Ye, {
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
		Qk = R(({ children: e, ...t }, o) => {
			let { common: n } = ie();
			return f(Ye, {
				ref: o,
				action: 'open-consent-dialog',
				...t,
				themeKey: 'buttonSecondary',
				'data-testid': 'consent-widget-footer-customize-button',
				children: e ?? n.customize,
			});
		}),
		Au = R(({ children: e, ...t }, o) => {
			let { common: n } = ie();
			return f(Ye, {
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
		Pu = R(({ children: e, ...t }, o) => {
			let { common: n } = ie();
			return f(Ye, {
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
	var Lu = R(({ children: e, ...t }, o) =>
			f(W, {
				ref: o,
				baseClassName: Ie.footer,
				'data-testid': 'consent-widget-footer',
				...t,
				themeKey: 'consentWidgetFooter',
				children: e,
			})
		),
		Ou = R(({ children: e, ...t }, o) =>
			f(W, {
				ref: o,
				baseClassName: Ie.footerGroup,
				'data-testid': 'consent-widget-footer-sub-group',
				...t,
				themeKey: 'consentWidgetFooter',
				children: e,
			})
		);
	var Nu = ({
		children: e,
		noStyle: t = !1,
		disableAnimation: o = !1,
		useProvider: n = !0,
		uiSource: r,
	}) => {
		let { translationConfig: s } = q(),
			i = eo(s.defaultLanguage),
			a = lr(),
			c = r ?? a.uiSource ?? 'widget',
			d = f(W, {
				'data-testid': 'consent-widget-root',
				themeKey: 'consentWidget',
				dir: i,
				children: e,
			});
		return n
			? f(ut.Provider, {
					value: { uiSource: c },
					children: f(dt.Provider, {
						value: { disableAnimation: o, noStyle: t },
						children: d,
					}),
				})
			: f(ut.Provider, { value: { uiSource: c }, children: d });
	};
	var Du = ({
		hideBranding: e,
		noStyle: t,
		disableAnimation: o,
		scrollLock: n,
		trapFocus: r,
		...s
	}) => {
		let [i, a] = N([]),
			c = Y();
		return f(Nu, {
			noStyle: t ?? c.noStyle,
			disableAnimation: o ?? c.disableAnimation,
			scrollLock: n ?? c.scrollLock,
			trapFocus: r ?? c.trapFocus,
			...s,
			children: [
				f(Ru, {
					type: 'multiple',
					value: i,
					onValueChange: a,
					children: f(Tu, {}),
				}),
				f(Lu, {
					children: [
						f(Ou, {
							themeKey: 'consentWidgetFooter',
							children: [f(Pu, {}), f(Eu, {})],
						}),
						f(Au, {}),
					],
				}),
				f(po, {
					themeKey: 'consentWidgetBranding',
					hideBranding: e ?? !0,
					'data-testid': 'consent-widget-branding',
				}),
			],
		});
	};
	var Bu = ({ title: e = 'c15t', titleId: t = 'c15t-icon', ...o }) =>
			f('svg', {
				xmlns: 'http://www.w3.org/2000/svg',
				viewBox: '0 0 446 445',
				'aria-labelledby': t,
				...o,
				children: [
					f('title', { id: t, children: e }),
					f('path', {
						fill: 'currentColor',
						d: 'M223.178.313c39.064 0 70.732 31.668 70.732 70.732-.001 39.064-31.668 70.731-70.732 70.731-12.181 0-23.642-3.079-33.649-8.502l-55.689 55.689a70.267 70.267 0 0 1 5.574 13.441h167.531c8.695-29.217 35.762-50.523 67.804-50.523 39.064 0 70.731 31.668 70.731 70.732s-31.668 70.732-70.731 70.732c-32.042 0-59.108-21.306-67.803-50.523H139.413a70.417 70.417 0 0 1-7.888 17.396l54.046 54.046c10.893-6.851 23.786-10.815 37.605-10.815 39.064 0 70.732 31.669 70.732 70.733 0 39.064-31.668 70.731-70.732 70.731s-70.732-31.667-70.732-70.731c0-10.518 2.296-20.499 6.414-29.471l-57.78-57.78c-8.972 4.117-18.952 6.414-29.47 6.414-39.063 0-70.731-31.668-70.732-70.732 0-39.064 31.669-70.732 70.733-70.732 12.18 0 23.642 3.079 33.649 8.502l55.688-55.688c-5.423-10.007-8.502-21.469-8.502-33.65 0-39.064 31.668-70.733 70.732-70.733Zm0 343.555c-16.742 0-30.314 13.572-30.314 30.314 0 16.741 13.572 30.313 30.314 30.313s30.314-13.572 30.314-30.313c0-16.742-13.572-30.314-30.314-30.314ZM71.611 192.299c-16.742 0-30.315 13.572-30.315 30.314s13.573 30.314 30.315 30.314c16.741 0 30.313-13.572 30.313-30.314 0-16.741-13.572-30.314-30.313-30.314Zm303.138 0c-16.729 0-30.294 13.551-30.315 30.275l.001.039-.001.038c.021 16.725 13.586 30.276 30.315 30.276 16.741 0 30.313-13.572 30.313-30.314 0-16.741-13.572-30.314-30.313-30.314ZM223.178 40.73c-16.742 0-30.314 13.573-30.314 30.315s13.573 30.313 30.314 30.313c16.742 0 30.313-13.572 30.314-30.313 0-16.742-13.572-30.314-30.314-30.315Z',
					}),
				],
			}),
		Mu = ({ title: e = 'c15t', titleId: t = 'c15t', ...o }) =>
			f('svg', {
				xmlns: 'http://www.w3.org/2000/svg',
				viewBox: '0 0 408 149',
				'aria-labelledby': t,
				...o,
				children: [
					f('title', { id: t, children: e }),
					f('path', {
						fill: 'currentColor',
						fillRule: 'evenodd',
						d: 'M74.133 14.042c-5.58 0-10.105 4.524-10.105 10.104 0 5.581 4.524 10.105 10.105 10.105 5.58 0 10.105-4.524 10.105-10.105 0-5.58-4.524-10.104-10.105-10.104ZM50.556 24.146C50.556 11.125 61.112.57 74.133.57 87.154.57 97.71 11.125 97.71 24.146c0 13.022-10.556 23.578-23.577 23.578-4.06 0-7.88-1.027-11.216-2.834L44.354 63.453a23.424 23.424 0 0 1 1.858 4.48h55.843c2.899-9.74 11.921-16.841 22.601-16.841 13.022 0 23.578 10.556 23.578 23.577 0 13.022-10.556 23.578-23.578 23.578-10.68 0-19.702-7.102-22.601-16.841H46.211a23.455 23.455 0 0 1-2.628 5.798l18.015 18.015a23.473 23.473 0 0 1 12.535-3.604c13.021 0 23.577 10.556 23.577 23.577 0 13.022-10.556 23.577-23.577 23.577-13.021 0-23.577-10.555-23.577-23.577 0-3.506.765-6.833 2.138-9.824l-19.26-19.26a23.49 23.49 0 0 1-9.823 2.139C10.588 98.247.032 87.69.032 74.669c0-13.021 10.556-23.577 23.577-23.577 4.061 0 7.882 1.026 11.217 2.834L53.39 35.364a23.473 23.473 0 0 1-2.834-11.218Zm63.996 50.523v.023c.012 5.57 4.531 10.082 10.104 10.082 5.581 0 10.105-4.524 10.105-10.105 0-5.58-4.524-10.104-10.105-10.104-5.573 0-10.092 4.511-10.104 10.082v.022ZM23.61 64.565c-5.58 0-10.104 4.524-10.104 10.104 0 5.58 4.524 10.105 10.104 10.105 5.581 0 10.105-4.524 10.105-10.105 0-5.58-4.524-10.104-10.105-10.104Zm40.418 60.627c0-5.581 4.524-10.104 10.105-10.104 5.58 0 10.105 4.523 10.105 10.104 0 5.581-4.524 10.105-10.105 10.105-5.58 0-10.105-4.524-10.105-10.105Z',
						clipRule: 'evenodd',
					}),
					f('path', {
						fill: 'currentColor',
						d: 'M213.869 86.31c0-18.48 14.64-32.04 32.88-32.04 9 0 17.28 3 24.24 10.44l-8.88 9.24c-4.08-4.2-8.88-6.6-15.36-6.6-10.56 0-18.6 8.04-18.6 18.96 0 10.92 8.04 18.959 18.6 18.959 6.48 0 11.28-2.4 15.36-6.6l8.88 9.24c-6.96 7.44-15.24 10.44-24.24 10.44-18.24 0-32.88-13.56-32.88-32.04Zm70.372-39.72h-11.88V33.03h26.88v83.639h-15v-70.08Zm23.468 54.599 12.24-6.96c2.88 6.12 9.24 10.2 16.44 10.2 10.2 0 17.04-6.36 17.04-15.84s-6.48-15.84-16.2-15.84c-4.68 0-9.48 1.44-12.48 4.32l-10.8-2.88 7.8-41.16h40.56v13.56h-29.28l-3 15.12c2.52-1.08 5.52-1.56 8.76-1.56 17.76 0 29.52 11.28 29.52 28.32 0 17.76-12.72 29.64-31.92 29.64-12.6 0-23.52-6.84-28.68-16.92Zm72.386-31.92h-7.8V56.19h7.8V33.03h14.4v23.16h13.08v13.08h-13.08v47.4h-14.4v-47.4Z',
					}),
				],
			});
	var Er = ({ title: e = 'Consent', titleId: t = 'consent-icon', ...o }) =>
			f('svg', {
				xmlns: 'http://www.w3.org/2000/svg',
				viewBox: '0 0 140 97',
				fill: 'none',
				'aria-labelledby': t,
				...o,
				children: [
					f('title', { id: t, children: e }),
					f('path', {
						fill: 'currentColor',
						fillRule: 'evenodd',
						d: 'M53.179 70.787c6.17 0 11.172-5.002 11.172-11.172 0-4.009-2.111-7.524-5.283-9.495a23.87 23.87 0 0 1 8.817-1.677c13.217 0 23.93 10.714 23.93 23.93s-10.713 23.93-23.93 23.93c-13.216 0-23.93-10.714-23.93-23.93 0-1.924.227-3.795.656-5.588a11.148 11.148 0 0 0 8.568 4.002Z',
						clipRule: 'evenodd',
					}),
					f('path', {
						fill: 'currentColor',
						fillRule: 'evenodd',
						d: 'M.618 74.716a68.453 68.453 0 0 1-.098-3.654c0-37.205 30.16-67.365 67.365-67.365s67.365 30.16 67.365 67.365c0 1.226-.032 2.444-.097 3.654h-21.927c.041-.776.061-1.557.061-2.343 0-24.531-19.887-44.418-44.418-44.418-24.532 0-44.418 19.887-44.418 44.418 0 .786.02 1.567.06 2.343H.618Z',
						clipRule: 'evenodd',
					}),
				],
			}),
		ju = ({ title: e = 'Privacy', titleId: t = 'fingerprint-icon', ...o }) =>
			f('svg', {
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
					f('title', { id: t, children: e }),
					f('path', { d: 'M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4' }),
					f('path', { d: 'M14 13.12c0 2.38 0 6.38-1 8.88' }),
					f('path', { d: 'M17.29 21.02c.12-.6.43-2.3.5-3.02' }),
					f('path', { d: 'M2 12a10 10 0 0 1 18-6' }),
					f('path', { d: 'M2 16h.01' }),
					f('path', { d: 'M21.8 16c.2-2 .131-5.354 0-6' }),
					f('path', { d: 'M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2' }),
					f('path', { d: 'M8.65 22c.21-.66.45-1.32.57-2' }),
					f('path', { d: 'M9 6.8a6 6 0 0 1 9 5.2v2' }),
				],
			}),
		Fu = ({ title: e = 'Settings', titleId: t = 'settings-icon', ...o }) =>
			f('svg', {
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
					f('title', { id: t, children: e }),
					f('path', {
						d: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z',
					}),
					f('circle', { cx: '12', cy: '12', r: '3' }),
				],
			});
	var Vu = R(({ children: e, ...t }, o) =>
			f(W, {
				ref: o,
				baseClassName: Q.card,
				...t,
				themeKey: 'consentDialogCard',
				'data-testid': 'consent-dialog-card',
				children: e,
			})
		),
		Ar = R(({ children: e, ...t }, o) =>
			f(W, {
				ref: o,
				baseClassName: Q.header,
				...t,
				themeKey: 'consentDialogHeader',
				'data-testid': 'consent-dialog-header',
				children: e,
			})
		),
		Pr = R(({ children: e, ...t }, o) => {
			let { consentManagerDialog: n } = ie();
			return f(W, {
				ref: o,
				baseClassName: Q.title,
				themeKey: 'consentDialogTitle',
				...t,
				'data-testid': 'consent-dialog-title',
				children: e ?? n.title,
			});
		}),
		Lr = R(({ children: e, legalLinks: t, asChild: o, ...n }, r) => {
			let { consentManagerDialog: s } = ie();
			return o
				? f(W, {
						ref: r,
						baseClassName: Q.description,
						themeKey: 'consentDialogDescription',
						asChild: o,
						...n,
						children: e ?? s.description,
					})
				: f(W, {
						ref: r,
						baseClassName: Q.description,
						themeKey: 'consentDialogDescription',
						asChild: o,
						...n,
						'data-testid': 'consent-dialog-description',
						children: [
							e ?? s.description,
							f(br, {
								links: t,
								themeKey: 'consentDialogContent',
								testIdPrefix: 'consent-dialog-legal-link',
							}),
						],
					});
		}),
		Or = R(({ children: e, ...t }, o) =>
			f(W, {
				ref: o,
				baseClassName: Q.content,
				themeKey: 'consentDialogContent',
				'data-testid': 'consent-dialog-content',
				...t,
				children: e,
			})
		),
		po = R(
			(
				{ children: e, themeKey: t, hideBranding: o, 'data-testid': n, ...r },
				s
			) =>
				f(W, {
					ref: s,
					baseClassName: Q.footer,
					'data-testid': n ?? 'consent-dialog-footer',
					...r,
					themeKey: t ?? 'consentDialogFooter',
					children: e ?? f(_h, { hideBranding: o ?? !1 }),
				})
		);
	function _h({ hideBranding: e }) {
		let { branding: t } = q();
		if (t === 'none' || e) return null;
		let o = typeof window < 'u' ? `?ref=${window.location.hostname}` : '';
		return f('a', {
			dir: 'ltr',
			className: Q.branding,
			href: t === 'consent' ? `https://consent.io${o}` : `https://c15t.com${o}`,
			children: [
				'Secured by',
				' ',
				t === 'consent'
					? f(Er, { className: Q.brandingConsent })
					: f(Mu, { className: Q.brandingC15T }),
			],
		});
	}
	var Nr = ({ noStyle: e, legalLinks: t, hideBranding: o }) =>
			f(Vu, {
				children: [
					f(Ar, { children: [f(Pr, {}), f(Lr, { legalLinks: t })] }),
					f(Or, {
						children: f(Du, { hideBranding: !0, noStyle: e, useProvider: !0 }),
					}),
					f(po, { hideBranding: o }),
				],
			}),
		Uu = Vu,
		Hu = Ar,
		zu = Pr,
		Gu = Lr,
		$u = Or,
		qu = po;
	var Wu = ({ noStyle: e, style: t }) => {
			let o,
				{ activeUI: n } = q(),
				{ disableAnimation: r, noStyle: s, scrollLock: i = !0 } = Y(),
				a = n === 'dialog',
				[c, d] = N(!1);
			D(() => {
				if (a) d(!0);
				else if (r) d(!1);
				else {
					let m = setTimeout(
						() => {
							d(!1);
						},
						Number.parseInt(
							getComputedStyle(document.documentElement).getPropertyValue(
								'--consent-dialog-animation-duration'
							) || '200',
							10
						)
					);
					return () => clearTimeout(m);
				}
			}, [a, r]);
			let p = typeof t == 'string' ? t : t?.className,
				u = xe('consentDialogOverlay', {
					baseClassName: !(s || e) && Q.overlay,
					className: p,
					noStyle: s || e,
				});
			o = s || e || r ? void 0 : c ? Q.overlayVisible : Q.overlayHidden;
			let l = Et(u.className, o);
			return f('div', {
				style:
					typeof t == 'object' && 'style' in t
						? { ...u.style, ...t.style }
						: u.style,
				className: l,
				'data-testid': 'consent-dialog-overlay',
			});
		},
		Dr = Wu;
	var Ku = ({
			children: e,
			open: t,
			models: o = ['opt-in', 'opt-out'],
			noStyle: n,
			disableAnimation: r,
			scrollLock: s = !0,
			trapFocus: i = !0,
			overlay: a,
			uiSource: c,
			className: d,
			style: p,
			...u
		}) => {
			let l = Y(),
				m = r ?? l.disableAnimation ?? !1,
				h = n ?? l.noStyle ?? !1,
				_ = s ?? l.scrollLock ?? !0,
				g = i ?? l.trapFocus ?? !0,
				{ activeUI: C, translationConfig: v, model: b } = q(),
				x = eo(v.defaultLanguage),
				I = o.includes(b) && (t ?? C === 'dialog'),
				[T, P] = N(!1),
				B = j(null),
				M = j(null),
				[O, ae] = N(!1);
			D(() => {
				ae(!0);
			}, []);
			let Re = l.theme?.motion?.duration?.normal;
			D(() => {
				if (I) P(!0);
				else if (m) P(!1);
				else {
					let fp = setTimeout(
						() => P(!1),
						Number.parseInt((Re || '200ms').replace('ms', ''), 10)
					);
					return () => clearTimeout(fp);
				}
			}, [I, m, Re]),
				ur(I && g, B),
				ir(I && _);
			let nt = xe('consentDialog', {
					baseClassName: void 0,
					className: Et(
						Q.root,
						!m && (T ? Q.dialogVisible : Q.dialogHidden),
						d
					),
					style: p,
					noStyle: h,
				}),
				up = {
					disableAnimation: m,
					noStyle: h,
					scrollLock: _,
					trapFocus: g,
					theme: l.theme,
				},
				pp = f(ut.Provider, {
					value: { uiSource: c ?? 'dialog' },
					children: f(dt.Provider, {
						value: up,
						children:
							I &&
							f(F, {
								children: [
									a === !1 ? null : (a ?? f(Dr, {})),
									f('dialog', {
										ref: B,
										...u,
										...nt,
										className: nt.className,
										'aria-labelledby': 'privacy-settings-title',
										tabIndex: -1,
										dir: x,
										'data-testid': 'consent-dialog-root',
										open: !0,
										children: f('div', {
											ref: M,
											className: h
												? void 0
												: Et(
														Q.container,
														m ? void 0 : T ? Q.contentVisible : Q.contentHidden
													),
											children: e,
										}),
									}),
								],
							}),
					}),
				});
			return O ? lt(pp, document.body) : null;
		},
		Br = Ku;
	var Sh = {
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
							var c = {};
							if (s)
								for (var d = 0; d < this.length; d++) {
									var p = this[d][0];
									p != null && (c[p] = !0);
								}
							for (var u = 0; u < n.length; u++) {
								var l = [].concat(n[u]);
								(s && c[l[0]]) ||
									(a !== void 0 &&
										(l[5] === void 0 ||
											(l[1] = '@layer'
												.concat(l[5].length > 0 ? ' '.concat(l[5]) : '', ' {')
												.concat(l[1], '}')),
										(l[5] = a)),
									r &&
										(l[2] &&
											(l[1] = '@media '.concat(l[2], ' {').concat(l[1], '}')),
										(l[2] = r)),
									i &&
										(l[4]
											? ((l[1] = '@supports ('
													.concat(l[4], ') {')
													.concat(l[1], '}')),
												(l[4] = i))
											: (l[4] = ''.concat(i))),
									o.push(l));
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
					for (var i = {}, a = [], c = 0; c < r.length; c++) {
						var d = r[c],
							p = s.base ? d[0] + s.base : d[0],
							u = i[p] || 0,
							l = ''.concat(p, ' ').concat(u);
						i[p] = u + 1;
						var m = o(l),
							h = {
								css: d[1],
								media: d[2],
								sourceMap: d[3],
								supports: d[4],
								layer: d[5],
							};
						if (m !== -1) t[m].references++, t[m].updater(h);
						else {
							var _ = (function (g, C) {
								var v = C.domAPI(C);
								return (
									v.update(g),
									function (b) {
										b
											? (b.css !== g.css ||
													b.media !== g.media ||
													b.sourceMap !== g.sourceMap ||
													b.supports !== g.supports ||
													b.layer !== g.layer) &&
												v.update((g = b))
											: v.remove();
									}
								);
							})(h, s);
							(s.byIndex = c),
								t.splice(c, 0, { identifier: l, updater: _, references: 1 });
						}
						a.push(l);
					}
					return a;
				}
				e.exports = function (r, s) {
					var i = n((r = r || []), (s = s || {}));
					return function (a) {
						a = a || [];
						for (var c = 0; c < i.length; c++) {
							var d = o(i[c]);
							t[d].references--;
						}
						for (var p = n(a, s), u = 0; u < i.length; u++) {
							var l = o(i[u]);
							t[l].references === 0 && (t[l].updater(), t.splice(l, 1));
						}
						i = p;
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
		Yu = {};
	function se(e) {
		var t = Yu[e];
		if (t !== void 0) return t.exports;
		var o = (Yu[e] = { id: e, exports: {} });
		return Sh[e](o, o.exports, se), o.exports;
	}
	(se.n = (e) => {
		var t = e && e.__esModule ? () => e.default : () => e;
		return se.d(t, { a: t }), t;
	}),
		(se.d = (e, t) => {
			for (var o in t)
				se.o(t, o) &&
					!se.o(e, o) &&
					Object.defineProperty(e, o, { enumerable: !0, get: t[o] });
		}),
		(se.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t)),
		(se.nc = void 0);
	var xh = se(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'
		),
		wh = se.n(xh),
		kh = se(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'
		),
		Ih = se.n(kh),
		Rh = se(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'
		),
		Th = se.n(Rh),
		Eh = se(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'
		),
		Ah = se.n(Eh),
		Ph = se(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'
		),
		Lh = se.n(Ph),
		Oh = se(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'
		),
		Nh = se.n(Oh),
		Mr = se(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/components/consent-dialog-trigger.module.css'
		),
		fo = {};
	(fo.styleTagTransform = Nh()),
		(fo.setAttributes = Ah()),
		(fo.insert = Th().bind(null, 'head')),
		(fo.domAPI = Ih()),
		(fo.insertStyleElement = Lh()),
		wh()(Mr.A, fo);
	var Ce = Mr.A && Mr.A.locals ? Mr.A.locals : void 0;
	function Oi(e = {}) {
		let {
				defaultPosition: t = 'bottom-right',
				persistPosition: o = !0,
				onPositionChange: n,
			} = e,
			[r, s] = N(() => {
				if (o && typeof window < 'u') {
					let x = Rd();
					if (x) return x;
				}
				return t;
			}),
			[i, a] = N(sr),
			[c, d] = N(!1),
			p = j(!1),
			u = j(null),
			l = j(0),
			m = z(
				(x) => {
					s(x), o && Id(x), n?.(x);
				},
				[o, n]
			),
			h = z((x) => {
				x.button === 0 &&
					(x.target.setPointerCapture(x.pointerId),
					(u.current = x.target),
					(p.current = !1),
					(l.current = Date.now()),
					a({
						isDragging: !0,
						startX: x.clientX,
						startY: x.clientY,
						currentX: x.clientX,
						currentY: x.clientY,
					}),
					d(!1));
			}, []),
			_ = z((x) => {
				a((I) => {
					if (!I.isDragging) return I;
					let T = Math.abs(x.clientX - I.startX),
						P = Math.abs(x.clientY - I.startY);
					return (
						(T > 5 || P > 5) && (p.current = !0),
						{ ...I, currentX: x.clientX, currentY: x.clientY }
					);
				});
			}, []),
			g = z(
				(x) => {
					u.current && u.current.releasePointerCapture(x.pointerId),
						a((I) => {
							if (!I.isDragging) return I;
							if (p.current) {
								let T = x.clientX - I.startX,
									P = x.clientY - I.startY,
									B = Date.now() - l.current,
									M = kd(r, T, P, {
										velocityX: B > 0 ? T / B : 0,
										velocityY: B > 0 ? P / B : 0,
									});
								M !== r && (d(!0), setTimeout(() => d(!1), 300), m(M));
							}
							return sr();
						});
				},
				[r, m]
			),
			C = z((x) => {
				u.current && u.current.releasePointerCapture(x.pointerId), a(sr());
			}, []),
			v = i.isDragging
				? {
						transform: `translate(${i.currentX - i.startX}px, ${i.currentY - i.startY}px)`,
						transition: 'none',
					}
				: {},
			b = z(() => p.current, []);
		return {
			corner: r,
			isDragging: i.isDragging,
			isSnapping: c,
			wasDragged: b,
			handlers: {
				onPointerDown: h,
				onPointerMove: _,
				onPointerUp: g,
				onPointerCancel: C,
			},
			dragStyle: v,
		};
	}
	var Qu = ue(null);
	function Pt() {
		let e = he(Qu);
		if (!e)
			throw Error(
				'ConsentDialogTrigger components must be used within a ConsentDialogTrigger.Root'
			);
		return e;
	}
	function mo({
		children: e,
		defaultPosition: t = 'bottom-right',
		persistPosition: o = !0,
		showWhen: n = 'after-consent',
		onPositionChange: r,
		onClick: s,
	}) {
		let { branding: i, activeUI: a, setActiveUI: c, hasConsented: d } = q(),
			{
				corner: p,
				isDragging: u,
				isSnapping: l,
				wasDragged: m,
				handlers: h,
				dragStyle: _,
			} = Oi({ defaultPosition: t, persistPosition: o, onPositionChange: r }),
			[g, C] = N(!1);
		D(() => (C(!0), () => C(!1)), []);
		let v = n !== 'never' && (n !== 'after-consent' || d()) && a === 'none';
		return g && v
			? lt(
					f(Qu.Provider, {
						value: {
							corner: p,
							isDragging: u,
							isSnapping: l,
							wasDragged: m,
							handlers: h,
							dragStyle: _,
							branding: i,
							openDialog: () => {
								s?.(), c('dialog');
							},
							isVisible: v,
						},
						children: e,
					}),
					document.body
				)
			: null;
	}
	mo.displayName = 'ConsentDialogTrigger.Root';
	var Dh = {
			'bottom-right': Ce.bottomRight,
			'bottom-left': Ce.bottomLeft,
			'top-right': Ce.topRight,
			'top-left': Ce.topLeft,
		},
		Bh = { sm: Ce.sm, md: Ce.md, lg: Ce.lg },
		go = R(
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
						isSnapping: c,
						wasDragged: d,
						handlers: p,
						dragStyle: u,
						openDialog: l,
					} = Pt(),
					m = () => {
						d() || l();
					};
				return f('button', {
					ref: s,
					type: 'button',
					className: r
						? n
						: [Ce.trigger, Dh[i], Bh[t], a && Ce.dragging, c && Ce.snapping, n]
								.filter(Boolean)
								.join(' '),
					'aria-label': o,
					onClick: m,
					onKeyDown: (h) => {
						(h.key === 'Enter' || h.key === ' ') && (h.preventDefault(), m());
					},
					style: u,
					...p,
					children: e,
				});
			}
		);
	go.displayName = 'ConsentDialogTrigger.Button';
	function ho({ icon: e = 'branding', className: t, noStyle: o = !1 }) {
		let n,
			{ branding: r } = Pt(),
			s = o ? t : [Ce.icon, t].filter(Boolean).join(' ');
		if (de(e)) return f('span', { className: s, children: e });
		switch (e) {
			case 'fingerprint':
				n = f(ju, {});
				break;
			case 'settings':
				n = f(Fu, {});
				break;
			default:
				n = r === 'consent' ? f(Er, {}) : f(Bu, {});
		}
		return f('span', { className: s, children: n });
	}
	ho.displayName = 'ConsentDialogTrigger.Icon';
	function cn({ children: e, className: t, noStyle: o = !1 }) {
		return f('span', {
			className: o ? t : [Ce.text, t].filter(Boolean).join(' '),
			children: e,
		});
	}
	cn.displayName = 'ConsentDialogTrigger.Text';
	function Ju({
		icon: e = 'branding',
		defaultPosition: t = 'bottom-right',
		persistPosition: o = !0,
		ariaLabel: n = 'Open privacy settings',
		showWhen: r = 'always',
		size: s = 'md',
		className: i,
		noStyle: a = !1,
		onClick: c,
		onPositionChange: d,
	}) {
		return f(mo, {
			defaultPosition: t,
			persistPosition: o,
			showWhen: r,
			onClick: c,
			onPositionChange: d,
			children: f(go, {
				size: s,
				ariaLabel: n,
				className: i,
				noStyle: a,
				children: f(ho, { icon: e, noStyle: a }),
			}),
		});
	}
	Ju.displayName = 'ConsentDialogTrigger';
	var bo = Object.assign(Ju, { Root: mo, Button: go, Icon: ho, Text: cn });
	var Xu = ({
		open: e,
		noStyle: t,
		disableAnimation: o,
		scrollLock: n = !0,
		trapFocus: r = !0,
		hideBranding: s,
		legalLinks: i,
		showTrigger: a = !1,
		models: c,
		uiSource: d,
	}) => {
		let p = yr({
				noStyle: t,
				disableAnimation: o,
				scrollLock: n,
				trapFocus: r,
			}),
			{ activeUI: u } = q(),
			l = { open: e ?? u === 'dialog', ...p, models: c, uiSource: d },
			m = a === !0 ? {} : a === !1 ? null : a;
		return f(F, {
			children: [
				m && f(bo, { ...m }),
				f(Br, {
					...l,
					children: f(Nr, {
						noStyle: l.noStyle,
						legalLinks: i,
						hideBranding: s,
					}),
				}),
			],
		});
	};
	var Ni = Object.assign(Xu, {
		Card: Uu,
		Header: Hu,
		HeaderTitle: zu,
		HeaderDescription: Gu,
		Content: $u,
		Footer: qu,
		ConsentCustomizationCard: Nr,
		ConsentDialogFooter: po,
		ConsentDialogHeader: Ar,
		ConsentDialogHeaderTitle: Pr,
		ConsentDialogHeaderDescription: Lr,
		ConsentDialogContent: Or,
		Overlay: Dr,
		Root: Br,
	});
	function Zu(e) {
		D(() => {
			if (e !== null) return hd(e);
		}, [e]);
	}
	var Mh = {
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
		ep = {
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
			dark: Mh,
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
		jh = {
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
	function Di(e, t = !1) {
		let o = {},
			n = t ? { ...e.colors, ...e.dark } : e.colors;
		for (let [r, s] of Object.entries(jh)) {
			let i = s(e, n);
			i && (o[r] = i);
		}
		return o;
	}
	function Bi(e) {
		let t = Di(e, !1),
			o = Di(e, !0),
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
	var tp = ep;
	var op = '2.0.0-rc.3';
	function Mi({ children: e, options: t }) {
		let { consentManager: o, consentStore: n } = G(
				() => Hs(t, { pkg: '@c15t/react', version: op }),
				[t]
			),
			[r, s] = N(() => (n ? n.getState() : {})),
			i = j(!1);
		D(() => {
			if (!n) return;
			let p = n.subscribe(s);
			if (!i.current) {
				let u = n.getState();
				Ko(() => {
					s((l) => (l !== u ? ((i.current = !0), u) : ((i.current = !0), l)));
				});
			}
			return p;
		}, [n]);
		let a = G(() => {
				let {
					theme: p = {},
					noStyle: u,
					disableAnimation: l,
					trapFocus: m = !0,
					colorScheme: h,
				} = t;
				return {
					theme: di(tp, p),
					noStyle: u,
					disableAnimation: l,
					trapFocus: m,
					colorScheme: h,
				};
			}, [t]),
			c = G(() => Bi(a.theme), [a.theme]);
		Zu(t.colorScheme);
		let d = G(() => {
			if (!n)
				throw Error(
					'Consent store must be initialized before creating context value'
				);
			return { state: r, store: n, manager: o };
		}, [r, n, o]);
		return f(or.Provider, {
			value: d,
			children: f(ar.Provider, {
				value: a,
				children: [
					c
						? f('style', {
								id: 'c15t-theme',
								dangerouslySetInnerHTML: { __html: c },
							})
						: null,
					e,
				],
			}),
		});
	}
	function np(e) {
		return {
			render: function (t) {
				er(t, e);
			},
			unmount: function () {
				tr(e);
			},
		};
	}
	var rp = '2.0.0-rc.3';
	var sp = 'c15t-embed-root',
		Fh = 'c15t-devtools-overrides',
		ap = 'c15t:embed:payload',
		Fi = null,
		jr = {};
	function ip(e, t) {
		let o = e.options?.componentHints?.preload;
		return o ? o.includes(t) : !0;
	}
	function Vh() {
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
	function Uh(e) {
		if (!e?.src) return '';
		let t = new URL(e.src, window.location.href),
			o = t.pathname.replace(/\/+$/, '');
		if (!o.endsWith('/embed.js')) return '';
		let n = o.slice(0, -9);
		return n ? `${t.origin}${n}` : '';
	}
	function cp(e) {
		return e !== void 0 ? e : typeof window > 'u' ? '' : Uh(Vh());
	}
	function Hh(e) {
		e.__c15tEmbedPendingIABComponents &&
			(Hi(e.__c15tEmbedPendingIABComponents),
			delete e.__c15tEmbedPendingIABComponents);
	}
	function zh(e) {
		if (e instanceof HTMLElement) return e;
		if (typeof document > 'u')
			throw new Error('Cannot mount c15t/embed outside a browser environment');
		if (typeof e == 'string') {
			let n = document.querySelector(e);
			if (!n) throw new Error(`Mount target not found: ${e}`);
			return n;
		}
		let t = document.getElementById(sp);
		if (t) return t;
		let o = document.createElement('div');
		return (o.id = sp), document.body.appendChild(o), o;
	}
	function Gh(e) {
		return Promise.resolve({ init: e.init, gvl: e.init.gvl ?? void 0 });
	}
	function ji(e) {
		if (typeof e != 'string') return;
		let t = e.trim();
		return t.length > 0 ? t : void 0;
	}
	function $h(e) {
		return typeof e == 'boolean' ? e : void 0;
	}
	function qh(e) {
		if (!(typeof window > 'u'))
			try {
				let t = window.localStorage.getItem(e);
				if (!t) return;
				let o = JSON.parse(t);
				if (!o || typeof o != 'object') return;
				let n = o,
					r = ji(n.country),
					s = ji(n.region),
					i = ji(n.language),
					a = $h(n.gpc);
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
	function Wh(e, t) {
		let o = t.overrides ?? e.options?.overrides,
			n = t.devToolsOverridesStorageKey ?? Fh,
			r = qh(n);
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
	function Kh(e, t) {
		let o = t.storeNamespace ?? e.options?.store?.namespace ?? 'c15tStore',
			n = t.storageKey ?? e.options?.store?.storageKey,
			r = n ? { storageKey: n } : void 0;
		return {
			mode: 'c15t',
			backendURL: cp(t.backendURL),
			store: { namespace: o },
			storageConfig: r,
			ssrData: Gh(e),
			overrides: Wh(e, t),
			noStyle: e.options?.ui?.noStyle,
			disableAnimation: e.options?.ui?.disableAnimation,
			scrollLock: e.options?.ui?.scrollLock,
			trapFocus: e.options?.ui?.trapFocus,
			colorScheme: e.options?.ui?.colorScheme,
			theme: e.options?.theme,
		};
	}
	function Vi(e = window) {
		return e.__c15tEmbedPayload;
	}
	function Ui() {
		Fi?.unmount(), (Fi = null);
	}
	function Hi(e) {
		typeof e.Banner != 'function' ||
			typeof e.Dialog != 'function' ||
			(jr = { Banner: e.Banner, Dialog: e.Dialog });
	}
	function Yh() {
		jr = {};
	}
	function zi(e, t = {}) {
		let o = zh(t.mountTarget);
		o.setAttribute('data-c15t-embed-runtime', 'true'), Ui();
		let n = Kh(e, t),
			r = ip(e, 'iabBanner'),
			s = ip(e, 'iabDialog'),
			i = jr.Banner,
			a = jr.Dialog,
			c = [
				f(hi, { models: ['opt-in', 'opt-out'] }, 'banner'),
				...(r && i ? [f(i, {}, 'iab-banner')] : []),
				...(s && a ? [f(a, {}, 'iab-dialog')] : []),
				f(bo, {}, 'dialog-trigger'),
				f(Ni, {}, 'dialog'),
			],
			d = np(o);
		d.render(f(Mi, { options: n, children: c })), (Fi = d);
	}
	function lp(e = {}, t = window) {
		let o = Vi(t);
		return o ? (zi(o, e), !0) : !1;
	}
	function Qh(e) {
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
	function dp() {
		return {
			version: rp,
			mount: zi,
			bootstrap: (e) => lp(e),
			unmount: Ui,
			getPayload: () => Vi(),
			registerIABComponents: Hi,
		};
	}
	function Jh() {
		if (typeof window > 'u' || typeof document > 'u') return null;
		if (window.__c15tEmbedRuntimeInitialized && window.c15tEmbed)
			return window.c15tEmbed;
		let e = dp();
		return (
			(window.c15tEmbed = e),
			(window.__c15tEmbedRuntimeInitialized = !0),
			Hh(window),
			window.addEventListener(ap, () => {
				e.bootstrap();
			}),
			Qh(e),
			e
		);
	}
	return vp(Xh);
})();
