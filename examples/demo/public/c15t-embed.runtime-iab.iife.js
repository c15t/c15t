'use strict';
var c15tEmbedIabBundle = (() => {
	var Lo = Object.defineProperty;
	var cs = Object.getOwnPropertyDescriptor;
	var ls = Object.getOwnPropertyNames;
	var ds = Object.prototype.hasOwnProperty;
	var de = (e, t) => () => (e && (t = e((e = 0))), t);
	var jr = (e, t) => {
			for (var o in t) Lo(e, o, { get: t[o], enumerable: !0 });
		},
		us = (e, t, o, r) => {
			if ((t && typeof t == 'object') || typeof t == 'function')
				for (let n of ls(t))
					!ds.call(e, n) &&
						n !== o &&
						Lo(e, n, {
							get: () => t[n],
							enumerable: !(r = cs(t, n)) || r.enumerable,
						});
			return e;
		};
	var ps = (e) => us(Lo({}, '__esModule', { value: !0 }), e);
	var Or,
		Mr = de(() => {
			'use strict';
			Or = {
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
	function ms(e) {
		return e
			? {
					log: (...t) => console.log('[c15t]', ...t),
					debug: (...t) => console.debug('[c15t]', ...t),
				}
			: { log: Fr, debug: Fr };
	}
	var Fr,
		td,
		Ge = de(() => {
			'use strict';
			Fr = () => {};
			td = ms(!1);
		});
	var No = de(() => {
		'use strict';
	});
	var Vr,
		hs,
		Ao = de(() => {
			'use strict';
			(Vr = {
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
				(hs = Object.entries(Vr).reduce((e, [t, o]) => ((e[o] = t), e), {}));
		});
	var Bo = de(() => {
		'use strict';
	});
	var Eo = de(() => {
		'use strict';
		No();
		Ao();
		Bo();
	});
	var Pe,
		Ot = de(() => {
			'use strict';
			Mr();
			Pe = {
				translations: { en: Or },
				defaultLanguage: 'en',
				disableAutoLanguageSwitch: !1,
			};
		});
	var Fe,
		Mt,
		tt = de(() => {
			'use strict';
			(Fe = [
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
				(Mt = Fe.map((e) => e.name));
		});
	var Ur = de(() => {
		'use strict';
	});
	var zr = de(() => {
		'use strict';
	});
	var $r = de(() => {
		'use strict';
	});
	var qr = de(() => {
		'use strict';
	});
	var Gr = de(() => {
		'use strict';
		tt();
		Ur();
		zr();
		$r();
		qr();
	});
	var Dt,
		Ft = de(() => {
			'use strict';
			Dt = '2.0.0-rc.3';
		});
	var ws,
		Po = de(() => {
			'use strict';
			Ot();
			Gr();
			Ft();
			ws = {
				debug: !1,
				config: { pkg: 'c15t', version: Dt, mode: 'Unknown' },
				consents: Fe.reduce((e, t) => ((e[t.name] = t.defaultValue), e), {}),
				selectedConsents: Fe.reduce(
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
				translationConfig: Pe,
				user: void 0,
				networkBlocker: void 0,
				storageConfig: void 0,
				includeNonDisplayedConsents: !1,
				consentTypes: Fe,
				iframeBlockerConfig: { disableAutomaticBlocking: !1 },
				scripts: [],
				loadedScripts: {},
				scriptIdMap: {},
				model: 'opt-in',
				iab: null,
				reloadOnConsentRevoked: !0,
				ssrDataUsed: !1,
				ssrSkippedReason: null,
			};
		});
	var Xr = de(() => {
		'use strict';
		Po();
		tt();
		Ge();
		Eo();
	});
	var We = de(() => {
		'use strict';
		No();
		Ao();
		Eo();
		Bo();
		Xr();
	});
	var Oo = de(() => {
		'use strict';
	});
	var Yl = {};
	jr(Yl, { registerEmbedIABAddon: () => rs });
	Ge();
	We();
	Ge();
	Ge();
	We();
	Ge();
	Ot();
	We();
	We();
	Oo();
	function tn(e, t) {
		if (e.length === 0) throw new TypeError(`${t} condition cannot be empty`);
	}
	function Bs(e, t) {
		if (!(e in t))
			throw new Error(`Consent category "${e}" not found in consent state`);
		return t[e] || !1;
	}
	function Es(e, t) {
		let o = Array.isArray(e) ? e : [e];
		return tn(o, 'AND'), o.every((r) => zt(r, t));
	}
	function Ps(e, t) {
		let o = Array.isArray(e) ? e : [e];
		return tn(o, 'OR'), o.some((r) => zt(r, t));
	}
	function zt(e, t) {
		if (typeof e == 'string') return Bs(e, t);
		if (typeof e == 'object' && e !== null) {
			if ('and' in e) return Es(e.and, t);
			if ('or' in e) return Ps(e.or, t);
			if ('not' in e) return !zt(e.not, t);
		}
		throw new TypeError(`Invalid condition structure: ${JSON.stringify(e)}`);
	}
	function Ke(e, t) {
		return zt(e, t);
	}
	tt();
	Ft();
	We();
	Ge();
	Oo();
	Ft();
	We();
	tt();
	Po();
	Ot();
	tt();
	var St,
		B,
		ln,
		Xs,
		Ye,
		sn,
		dn,
		un,
		pn,
		Ho,
		Mo,
		Do,
		mn,
		_t = {},
		fn = [],
		Zs = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i,
		wt = Array.isArray;
	function Re(e, t) {
		for (var o in t) e[o] = t[o];
		return e;
	}
	function Uo(e) {
		e && e.parentNode && e.parentNode.removeChild(e);
	}
	function Se(e, t, o) {
		var r,
			n,
			i,
			s = {};
		for (i in t)
			i == 'key' ? (r = t[i]) : i == 'ref' ? (n = t[i]) : (s[i] = t[i]);
		if (
			(arguments.length > 2 &&
				(s.children = arguments.length > 3 ? St.call(arguments, 2) : o),
			typeof e == 'function' && e.defaultProps != null)
		)
			for (i in e.defaultProps) s[i] === void 0 && (s[i] = e.defaultProps[i]);
		return xt(e, s, r, n, null);
	}
	function xt(e, t, o, r, n) {
		var i = {
			type: e,
			props: t,
			key: o,
			ref: r,
			__k: null,
			__: null,
			__b: 0,
			__e: null,
			__c: null,
			constructor: void 0,
			__v: n ?? ++ln,
			__i: -1,
			__u: 0,
		};
		return n == null && B.vnode != null && B.vnode(i), i;
	}
	function Gt() {
		return { current: null };
	}
	function H(e) {
		return e.children;
	}
	function Ce(e, t) {
		(this.props = e), (this.context = t);
	}
	function ot(e, t) {
		if (t == null) return e.__ ? ot(e.__, e.__i + 1) : null;
		for (var o; t < e.__k.length; t++)
			if ((o = e.__k[t]) != null && o.__e != null) return o.__e;
		return typeof e.type == 'function' ? ot(e) : null;
	}
	function gn(e) {
		var t, o;
		if ((e = e.__) != null && e.__c != null) {
			for (e.__e = e.__c.base = null, t = 0; t < e.__k.length; t++)
				if ((o = e.__k[t]) != null && o.__e != null) {
					e.__e = e.__c.base = o.__e;
					break;
				}
			return gn(e);
		}
	}
	function Fo(e) {
		((!e.__d && (e.__d = !0) && Ye.push(e) && !qt.__r++) ||
			sn != B.debounceRendering) &&
			((sn = B.debounceRendering) || dn)(qt);
	}
	function qt() {
		for (var e, t, o, r, n, i, s, c = 1; Ye.length; )
			Ye.length > c && Ye.sort(un),
				(e = Ye.shift()),
				(c = Ye.length),
				e.__d &&
					((o = void 0),
					(r = void 0),
					(n = (r = (t = e).__v).__e),
					(i = []),
					(s = []),
					t.__P &&
						(((o = Re({}, r)).__v = r.__v + 1),
						B.vnode && B.vnode(o),
						zo(
							t.__P,
							o,
							r,
							t.__n,
							t.__P.namespaceURI,
							32 & r.__u ? [n] : null,
							i,
							n ?? ot(r),
							!!(32 & r.__u),
							s
						),
						(o.__v = r.__v),
						(o.__.__k[o.__i] = o),
						vn(i, o, s),
						(r.__e = r.__ = null),
						o.__e != n && gn(o)));
		qt.__r = 0;
	}
	function bn(e, t, o, r, n, i, s, c, u, d, m) {
		var p,
			l,
			b,
			y,
			k,
			h,
			v,
			C = (r && r.__k) || fn,
			g = t.length;
		for (u = Js(o, t, C, u, g), p = 0; p < g; p++)
			(b = o.__k[p]) != null &&
				((l = b.__i == -1 ? _t : C[b.__i] || _t),
				(b.__i = p),
				(h = zo(e, b, l, n, i, s, c, u, d, m)),
				(y = b.__e),
				b.ref &&
					l.ref != b.ref &&
					(l.ref && $o(l.ref, null, b), m.push(b.ref, b.__c || y, b)),
				k == null && y != null && (k = y),
				(v = !!(4 & b.__u)) || l.__k === b.__k
					? (u = hn(b, u, e, v))
					: typeof b.type == 'function' && h !== void 0
						? (u = h)
						: y && (u = y.nextSibling),
				(b.__u &= -7));
		return (o.__e = k), u;
	}
	function Js(e, t, o, r, n) {
		var i,
			s,
			c,
			u,
			d,
			m = o.length,
			p = m,
			l = 0;
		for (e.__k = new Array(n), i = 0; i < n; i++)
			(s = t[i]) != null && typeof s != 'boolean' && typeof s != 'function'
				? ((u = i + l),
					((s = e.__k[i] =
						typeof s == 'string' ||
						typeof s == 'number' ||
						typeof s == 'bigint' ||
						s.constructor == String
							? xt(null, s, null, null, null)
							: wt(s)
								? xt(H, { children: s }, null, null, null)
								: s.constructor == null && s.__b > 0
									? xt(s.type, s.props, s.key, s.ref ? s.ref : null, s.__v)
									: s).__ = e),
					(s.__b = e.__b + 1),
					(c = null),
					(d = s.__i = Qs(s, o, u, p)) != -1 &&
						(p--, (c = o[d]) && (c.__u |= 2)),
					c == null || c.__v == null
						? (d == -1 && (n > m ? l-- : n < m && l++),
							typeof s.type != 'function' && (s.__u |= 4))
						: d != u &&
							(d == u - 1
								? l--
								: d == u + 1
									? l++
									: (d > u ? l-- : l++, (s.__u |= 4))))
				: (e.__k[i] = null);
		if (p)
			for (i = 0; i < m; i++)
				(c = o[i]) != null &&
					(2 & c.__u) == 0 &&
					(c.__e == r && (r = ot(c)), Cn(c, c));
		return r;
	}
	function hn(e, t, o, r) {
		var n, i;
		if (typeof e.type == 'function') {
			for (n = e.__k, i = 0; n && i < n.length; i++)
				n[i] && ((n[i].__ = e), (t = hn(n[i], t, o, r)));
			return t;
		}
		e.__e != t &&
			(r &&
				(t && e.type && !t.parentNode && (t = ot(e)),
				o.insertBefore(e.__e, t || null)),
			(t = e.__e));
		do t = t && t.nextSibling;
		while (t != null && t.nodeType == 8);
		return t;
	}
	function Te(e, t) {
		return (
			(t = t || []),
			e == null ||
				typeof e == 'boolean' ||
				(wt(e)
					? e.some(function (o) {
							Te(o, t);
						})
					: t.push(e)),
			t
		);
	}
	function Qs(e, t, o, r) {
		var n,
			i,
			s,
			c = e.key,
			u = e.type,
			d = t[o],
			m = d != null && (2 & d.__u) == 0;
		if ((d === null && e.key == null) || (m && c == d.key && u == d.type))
			return o;
		if (r > (m ? 1 : 0)) {
			for (n = o - 1, i = o + 1; n >= 0 || i < t.length; )
				if (
					(d = t[(s = n >= 0 ? n-- : i++)]) != null &&
					(2 & d.__u) == 0 &&
					c == d.key &&
					u == d.type
				)
					return s;
		}
		return -1;
	}
	function an(e, t, o) {
		t[0] == '-'
			? e.setProperty(t, o ?? '')
			: (e[t] =
					o == null ? '' : typeof o != 'number' || Zs.test(t) ? o : o + 'px');
	}
	function $t(e, t, o, r, n) {
		var i, s;
		e: if (t == 'style')
			if (typeof o == 'string') e.style.cssText = o;
			else {
				if ((typeof r == 'string' && (e.style.cssText = r = ''), r))
					for (t in r) (o && t in o) || an(e.style, t, '');
				if (o) for (t in o) (r && o[t] == r[t]) || an(e.style, t, o[t]);
			}
		else if (t[0] == 'o' && t[1] == 'n')
			(i = t != (t = t.replace(pn, '$1'))),
				(s = t.toLowerCase()),
				(t =
					s in e || t == 'onFocusOut' || t == 'onFocusIn'
						? s.slice(2)
						: t.slice(2)),
				e.l || (e.l = {}),
				(e.l[t + i] = o),
				o
					? r
						? (o.u = r.u)
						: ((o.u = Ho), e.addEventListener(t, i ? Do : Mo, i))
					: e.removeEventListener(t, i ? Do : Mo, i);
		else {
			if (n == 'http://www.w3.org/2000/svg')
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
	function cn(e) {
		return function (t) {
			if (this.l) {
				var o = this.l[t.type + e];
				if (t.t == null) t.t = Ho++;
				else if (t.t < o.u) return;
				return o(B.event ? B.event(t) : t);
			}
		};
	}
	function zo(e, t, o, r, n, i, s, c, u, d) {
		var m,
			p,
			l,
			b,
			y,
			k,
			h,
			v,
			C,
			g,
			x,
			V,
			w,
			I,
			j,
			E,
			N,
			_ = t.type;
		if (t.constructor != null) return null;
		128 & o.__u && ((u = !!(32 & o.__u)), (i = [(c = t.__e = o.__e)])),
			(m = B.__b) && m(t);
		e: if (typeof _ == 'function')
			try {
				if (
					((v = t.props),
					(C = 'prototype' in _ && _.prototype.render),
					(g = (m = _.contextType) && r[m.__c]),
					(x = m ? (g ? g.props.value : m.__) : r),
					o.__c
						? (h = (p = t.__c = o.__c).__ = p.__E)
						: (C
								? (t.__c = p = new _(v, x))
								: ((t.__c = p = new Ce(v, x)),
									(p.constructor = _),
									(p.render = ta)),
							g && g.sub(p),
							(p.props = v),
							p.state || (p.state = {}),
							(p.context = x),
							(p.__n = r),
							(l = p.__d = !0),
							(p.__h = []),
							(p._sb = [])),
					C && p.__s == null && (p.__s = p.state),
					C &&
						_.getDerivedStateFromProps != null &&
						(p.__s == p.state && (p.__s = Re({}, p.__s)),
						Re(p.__s, _.getDerivedStateFromProps(v, p.__s))),
					(b = p.props),
					(y = p.state),
					(p.__v = t),
					l)
				)
					C &&
						_.getDerivedStateFromProps == null &&
						p.componentWillMount != null &&
						p.componentWillMount(),
						C && p.componentDidMount != null && p.__h.push(p.componentDidMount);
				else {
					if (
						(C &&
							_.getDerivedStateFromProps == null &&
							v !== b &&
							p.componentWillReceiveProps != null &&
							p.componentWillReceiveProps(v, x),
						(!p.__e &&
							p.shouldComponentUpdate != null &&
							p.shouldComponentUpdate(v, p.__s, x) === !1) ||
							t.__v == o.__v)
					) {
						for (
							t.__v != o.__v &&
								((p.props = v), (p.state = p.__s), (p.__d = !1)),
								t.__e = o.__e,
								t.__k = o.__k,
								t.__k.some(function (F) {
									F && (F.__ = t);
								}),
								V = 0;
							V < p._sb.length;
							V++
						)
							p.__h.push(p._sb[V]);
						(p._sb = []), p.__h.length && s.push(p);
						break e;
					}
					p.componentWillUpdate != null && p.componentWillUpdate(v, p.__s, x),
						C &&
							p.componentDidUpdate != null &&
							p.__h.push(function () {
								p.componentDidUpdate(b, y, k);
							});
				}
				if (
					((p.context = x),
					(p.props = v),
					(p.__P = e),
					(p.__e = !1),
					(w = B.__r),
					(I = 0),
					C)
				) {
					for (
						p.state = p.__s,
							p.__d = !1,
							w && w(t),
							m = p.render(p.props, p.state, p.context),
							j = 0;
						j < p._sb.length;
						j++
					)
						p.__h.push(p._sb[j]);
					p._sb = [];
				} else
					do
						(p.__d = !1),
							w && w(t),
							(m = p.render(p.props, p.state, p.context)),
							(p.state = p.__s);
					while (p.__d && ++I < 25);
				(p.state = p.__s),
					p.getChildContext != null && (r = Re(Re({}, r), p.getChildContext())),
					C &&
						!l &&
						p.getSnapshotBeforeUpdate != null &&
						(k = p.getSnapshotBeforeUpdate(b, y)),
					(E = m),
					m != null &&
						m.type === H &&
						m.key == null &&
						(E = yn(m.props.children)),
					(c = bn(e, wt(E) ? E : [E], t, o, r, n, i, s, c, u, d)),
					(p.base = t.__e),
					(t.__u &= -161),
					p.__h.length && s.push(p),
					h && (p.__E = p.__ = null);
			} catch (F) {
				if (((t.__v = null), u || i != null))
					if (F.then) {
						for (
							t.__u |= u ? 160 : 128;
							c && c.nodeType == 8 && c.nextSibling;
						)
							c = c.nextSibling;
						(i[i.indexOf(c)] = null), (t.__e = c);
					} else {
						for (N = i.length; N--; ) Uo(i[N]);
						Vo(t);
					}
				else (t.__e = o.__e), (t.__k = o.__k), F.then || Vo(t);
				B.__e(F, t, o);
			}
		else
			i == null && t.__v == o.__v
				? ((t.__k = o.__k), (t.__e = o.__e))
				: (c = t.__e = ea(o.__e, t, o, r, n, i, s, u, d));
		return (m = B.diffed) && m(t), 128 & t.__u ? void 0 : c;
	}
	function Vo(e) {
		e && e.__c && (e.__c.__e = !0), e && e.__k && e.__k.forEach(Vo);
	}
	function vn(e, t, o) {
		for (var r = 0; r < o.length; r++) $o(o[r], o[++r], o[++r]);
		B.__c && B.__c(t, e),
			e.some(function (n) {
				try {
					(e = n.__h),
						(n.__h = []),
						e.some(function (i) {
							i.call(n);
						});
				} catch (i) {
					B.__e(i, n.__v);
				}
			});
	}
	function yn(e) {
		return typeof e != 'object' || e == null || (e.__b && e.__b > 0)
			? e
			: wt(e)
				? e.map(yn)
				: Re({}, e);
	}
	function ea(e, t, o, r, n, i, s, c, u) {
		var d,
			m,
			p,
			l,
			b,
			y,
			k,
			h = o.props,
			v = t.props,
			C = t.type;
		if (
			(C == 'svg'
				? (n = 'http://www.w3.org/2000/svg')
				: C == 'math'
					? (n = 'http://www.w3.org/1998/Math/MathML')
					: n || (n = 'http://www.w3.org/1999/xhtml'),
			i != null)
		) {
			for (d = 0; d < i.length; d++)
				if (
					(b = i[d]) &&
					'setAttribute' in b == !!C &&
					(C ? b.localName == C : b.nodeType == 3)
				) {
					(e = b), (i[d] = null);
					break;
				}
		}
		if (e == null) {
			if (C == null) return document.createTextNode(v);
			(e = document.createElementNS(n, C, v.is && v)),
				c && (B.__m && B.__m(t, i), (c = !1)),
				(i = null);
		}
		if (C == null) h === v || (c && e.data == v) || (e.data = v);
		else {
			if (
				((i = i && St.call(e.childNodes)), (h = o.props || _t), !c && i != null)
			)
				for (h = {}, d = 0; d < e.attributes.length; d++)
					h[(b = e.attributes[d]).name] = b.value;
			for (d in h)
				if (((b = h[d]), d != 'children')) {
					if (d == 'dangerouslySetInnerHTML') p = b;
					else if (!(d in v)) {
						if (
							(d == 'value' && 'defaultValue' in v) ||
							(d == 'checked' && 'defaultChecked' in v)
						)
							continue;
						$t(e, d, null, b, n);
					}
				}
			for (d in v)
				(b = v[d]),
					d == 'children'
						? (l = b)
						: d == 'dangerouslySetInnerHTML'
							? (m = b)
							: d == 'value'
								? (y = b)
								: d == 'checked'
									? (k = b)
									: (c && typeof b != 'function') ||
										h[d] === b ||
										$t(e, d, b, h[d], n);
			if (m)
				c ||
					(p && (m.__html == p.__html || m.__html == e.innerHTML)) ||
					(e.innerHTML = m.__html),
					(t.__k = []);
			else if (
				(p && (e.innerHTML = ''),
				bn(
					t.type == 'template' ? e.content : e,
					wt(l) ? l : [l],
					t,
					o,
					r,
					C == 'foreignObject' ? 'http://www.w3.org/1999/xhtml' : n,
					i,
					s,
					i ? i[0] : o.__k && ot(o, 0),
					c,
					u
				),
				i != null)
			)
				for (d = i.length; d--; ) Uo(i[d]);
			c ||
				((d = 'value'),
				C == 'progress' && y == null
					? e.removeAttribute('value')
					: y != null &&
						(y !== e[d] ||
							(C == 'progress' && !y) ||
							(C == 'option' && y != h[d])) &&
						$t(e, d, y, h[d], n),
				(d = 'checked'),
				k != null && k != e[d] && $t(e, d, k, h[d], n));
		}
		return e;
	}
	function $o(e, t, o) {
		try {
			if (typeof e == 'function') {
				var r = typeof e.__u == 'function';
				r && e.__u(), (r && t == null) || (e.__u = e(t));
			} else e.current = t;
		} catch (n) {
			B.__e(n, o);
		}
	}
	function Cn(e, t, o) {
		var r, n;
		if (
			(B.unmount && B.unmount(e),
			(r = e.ref) && ((r.current && r.current != e.__e) || $o(r, null, t)),
			(r = e.__c) != null)
		) {
			if (r.componentWillUnmount)
				try {
					r.componentWillUnmount();
				} catch (i) {
					B.__e(i, t);
				}
			r.base = r.__P = null;
		}
		if ((r = e.__k))
			for (n = 0; n < r.length; n++)
				r[n] && Cn(r[n], t, o || typeof e.type != 'function');
		o || Uo(e.__e), (e.__c = e.__ = e.__e = void 0);
	}
	function ta(e, t, o) {
		return this.constructor(e, o);
	}
	function rt(e, t, o) {
		var r, n, i, s;
		t == document && (t = document.documentElement),
			B.__ && B.__(e, t),
			(n = (r = typeof o == 'function') ? null : (o && o.__k) || t.__k),
			(i = []),
			(s = []),
			zo(
				t,
				(e = ((!r && o) || t).__k = Se(H, null, [e])),
				n || _t,
				_t,
				t.namespaceURI,
				!r && o ? [o] : n ? null : t.firstChild ? St.call(t.childNodes) : null,
				i,
				!r && o ? o : n ? n.__e : t.firstChild,
				r,
				s
			),
			vn(i, e, s);
	}
	function qo(e, t) {
		rt(e, t, qo);
	}
	function kn(e, t, o) {
		var r,
			n,
			i,
			s,
			c = Re({}, e.props);
		for (i in (e.type && e.type.defaultProps && (s = e.type.defaultProps), t))
			i == 'key'
				? (r = t[i])
				: i == 'ref'
					? (n = t[i])
					: (c[i] = t[i] === void 0 && s != null ? s[i] : t[i]);
		return (
			arguments.length > 2 &&
				(c.children = arguments.length > 3 ? St.call(arguments, 2) : o),
			xt(e.type, c, r || e.key, n || e.ref, null)
		);
	}
	function ue(e) {
		function t(o) {
			var r, n;
			return (
				this.getChildContext ||
					((r = new Set()),
					((n = {})[t.__c] = this),
					(this.getChildContext = function () {
						return n;
					}),
					(this.componentWillUnmount = function () {
						r = null;
					}),
					(this.shouldComponentUpdate = function (i) {
						this.props.value != i.value &&
							r.forEach(function (s) {
								(s.__e = !0), Fo(s);
							});
					}),
					(this.sub = function (i) {
						r.add(i);
						var s = i.componentWillUnmount;
						i.componentWillUnmount = function () {
							r && r.delete(i), s && s.call(i);
						};
					})),
				o.children
			);
		}
		return (
			(t.__c = '__cC' + mn++),
			(t.__ = e),
			(t.Provider =
				t.__l =
				(t.Consumer = function (o, r) {
					return o.children(r);
				}).contextType =
					t),
			t
		);
	}
	(St = fn.slice),
		(B = {
			__e: function (e, t, o, r) {
				for (var n, i, s; (t = t.__); )
					if ((n = t.__c) && !n.__)
						try {
							if (
								((i = n.constructor) &&
									i.getDerivedStateFromError != null &&
									(n.setState(i.getDerivedStateFromError(e)), (s = n.__d)),
								n.componentDidCatch != null &&
									(n.componentDidCatch(e, r || {}), (s = n.__d)),
								s)
							)
								return (n.__E = n);
						} catch (c) {
							e = c;
						}
				throw e;
			},
		}),
		(ln = 0),
		(Xs = function (e) {
			return e != null && e.constructor == null;
		}),
		(Ce.prototype.setState = function (e, t) {
			var o;
			(o =
				this.__s != null && this.__s != this.state
					? this.__s
					: (this.__s = Re({}, this.state))),
				typeof e == 'function' && (e = e(Re({}, o), this.props)),
				e && Re(o, e),
				e != null && this.__v && (t && this._sb.push(t), Fo(this));
		}),
		(Ce.prototype.forceUpdate = function (e) {
			this.__v && ((this.__e = !0), e && this.__h.push(e), Fo(this));
		}),
		(Ce.prototype.render = H),
		(Ye = []),
		(dn =
			typeof Promise == 'function'
				? Promise.prototype.then.bind(Promise.resolve())
				: setTimeout),
		(un = function (e, t) {
			return e.__v.__b - t.__v.__b;
		}),
		(qt.__r = 0),
		(pn = /(PointerCapture)$|Capture$/i),
		(Ho = 0),
		(Mo = cn(!1)),
		(Do = cn(!0)),
		(mn = 0);
	var oa = 0;
	function a(e, t, o, r, n, i) {
		t || (t = {});
		var s,
			c,
			u = t;
		if ('ref' in u)
			for (c in ((u = {}), t)) c == 'ref' ? (s = t[c]) : (u[c] = t[c]);
		var d = {
			type: e,
			props: u,
			key: o,
			ref: s,
			__k: null,
			__: null,
			__b: 0,
			__e: null,
			__c: null,
			constructor: void 0,
			__v: --oa,
			__i: -1,
			__u: 0,
			__source: n,
			__self: i,
		};
		if (typeof e == 'function' && (s = e.defaultProps))
			for (c in s) u[c] === void 0 && (u[c] = s[c]);
		return B.vnode && B.vnode(d), d;
	}
	var be = {};
	jr(be, {
		Children: () => ge,
		Component: () => Ce,
		Fragment: () => H,
		PureComponent: () => Xt,
		StrictMode: () => oi,
		Suspense: () => It,
		SuspenseList: () => at,
		__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: () => Yn,
		cloneElement: () => Ne,
		createContext: () => ue,
		createElement: () => Se,
		createFactory: () => Xn,
		createPortal: () => Le,
		createRef: () => Gt,
		default: () => Ca,
		findDOMNode: () => ei,
		flushSync: () => rr,
		forwardRef: () => T,
		hydrate: () => Kn,
		isElement: () => ri,
		isFragment: () => Zn,
		isMemo: () => Jn,
		isValidElement: () => le,
		lazy: () => qn,
		memo: () => Hn,
		render: () => Wn,
		startTransition: () => Jo,
		unmountComponentAtNode: () => Qn,
		unstable_batchedUpdates: () => ti,
		useCallback: () => G,
		useContext: () => fe,
		useDebugValue: () => Yt,
		useDeferredValue: () => Qo,
		useEffect: () => M,
		useErrorBoundary: () => ra,
		useId: () => st,
		useImperativeHandle: () => Kt,
		useInsertionEffect: () => tr,
		useLayoutEffect: () => ke,
		useMemo: () => $,
		useReducer: () => it,
		useRef: () => z,
		useState: () => L,
		useSyncExternalStore: () => Zo,
		useTransition: () => er,
		version: () => ya,
	});
	var je,
		q,
		Go,
		xn,
		nt = 0,
		Nn = [],
		Q = B,
		_n = Q.__b,
		Sn = Q.__r,
		wn = Q.diffed,
		In = Q.__c,
		Rn = Q.unmount,
		Tn = Q.__;
	function Xe(e, t) {
		Q.__h && Q.__h(q, e, nt || t), (nt = 0);
		var o = q.__H || (q.__H = { __: [], __h: [] });
		return e >= o.__.length && o.__.push({}), o.__[e];
	}
	function L(e) {
		return (nt = 1), it(An, e);
	}
	function it(e, t, o) {
		var r = Xe(je++, 2);
		if (
			((r.t = e),
			!r.__c &&
				((r.__ = [
					o ? o(t) : An(void 0, t),
					function (c) {
						var u = r.__N ? r.__N[0] : r.__[0],
							d = r.t(u, c);
						u !== d && ((r.__N = [d, r.__[1]]), r.__c.setState({}));
					},
				]),
				(r.__c = q),
				!q.__f))
		) {
			var n = function (c, u, d) {
				if (!r.__c.__H) return !0;
				var m = r.__c.__H.__.filter(function (l) {
					return !!l.__c;
				});
				if (
					m.every(function (l) {
						return !l.__N;
					})
				)
					return !i || i.call(this, c, u, d);
				var p = r.__c.props !== c;
				return (
					m.forEach(function (l) {
						if (l.__N) {
							var b = l.__[0];
							(l.__ = l.__N), (l.__N = void 0), b !== l.__[0] && (p = !0);
						}
					}),
					(i && i.call(this, c, u, d)) || p
				);
			};
			q.__f = !0;
			var i = q.shouldComponentUpdate,
				s = q.componentWillUpdate;
			(q.componentWillUpdate = function (c, u, d) {
				if (this.__e) {
					var m = i;
					(i = void 0), n(c, u, d), (i = m);
				}
				s && s.call(this, c, u, d);
			}),
				(q.shouldComponentUpdate = n);
		}
		return r.__N || r.__;
	}
	function M(e, t) {
		var o = Xe(je++, 3);
		!Q.__s && Ko(o.__H, t) && ((o.__ = e), (o.u = t), q.__H.__h.push(o));
	}
	function ke(e, t) {
		var o = Xe(je++, 4);
		!Q.__s && Ko(o.__H, t) && ((o.__ = e), (o.u = t), q.__h.push(o));
	}
	function z(e) {
		return (
			(nt = 5),
			$(function () {
				return { current: e };
			}, [])
		);
	}
	function Kt(e, t, o) {
		(nt = 6),
			ke(
				function () {
					if (typeof e == 'function') {
						var r = e(t());
						return function () {
							e(null), r && typeof r == 'function' && r();
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
	function $(e, t) {
		var o = Xe(je++, 7);
		return Ko(o.__H, t) && ((o.__ = e()), (o.__H = t), (o.__h = e)), o.__;
	}
	function G(e, t) {
		return (
			(nt = 8),
			$(function () {
				return e;
			}, t)
		);
	}
	function fe(e) {
		var t = q.context[e.__c],
			o = Xe(je++, 9);
		return (
			(o.c = e),
			t ? (o.__ == null && ((o.__ = !0), t.sub(q)), t.props.value) : e.__
		);
	}
	function Yt(e, t) {
		Q.useDebugValue && Q.useDebugValue(t ? t(e) : e);
	}
	function ra(e) {
		var t = Xe(je++, 10),
			o = L();
		return (
			(t.__ = e),
			q.componentDidCatch ||
				(q.componentDidCatch = function (r, n) {
					t.__ && t.__(r, n), o[1](r);
				}),
			[
				o[0],
				function () {
					o[1](void 0);
				},
			]
		);
	}
	function st() {
		var e = Xe(je++, 11);
		if (!e.__) {
			for (var t = q.__v; t !== null && !t.__m && t.__ !== null; ) t = t.__;
			var o = t.__m || (t.__m = [0, 0]);
			e.__ = 'P' + o[0] + '-' + o[1]++;
		}
		return e.__;
	}
	function na() {
		for (var e; (e = Nn.shift()); )
			if (e.__P && e.__H)
				try {
					e.__H.__h.forEach(Wt), e.__H.__h.forEach(Wo), (e.__H.__h = []);
				} catch (t) {
					(e.__H.__h = []), Q.__e(t, e.__v);
				}
	}
	(Q.__b = function (e) {
		(q = null), _n && _n(e);
	}),
		(Q.__ = function (e, t) {
			e && t.__k && t.__k.__m && (e.__m = t.__k.__m), Tn && Tn(e, t);
		}),
		(Q.__r = function (e) {
			Sn && Sn(e), (je = 0);
			var t = (q = e.__c).__H;
			t &&
				(Go === q
					? ((t.__h = []),
						(q.__h = []),
						t.__.forEach(function (o) {
							o.__N && (o.__ = o.__N), (o.u = o.__N = void 0);
						}))
					: (t.__h.forEach(Wt), t.__h.forEach(Wo), (t.__h = []), (je = 0))),
				(Go = q);
		}),
		(Q.diffed = function (e) {
			wn && wn(e);
			var t = e.__c;
			t &&
				t.__H &&
				(t.__H.__h.length &&
					((Nn.push(t) !== 1 && xn === Q.requestAnimationFrame) ||
						((xn = Q.requestAnimationFrame) || ia)(na)),
				t.__H.__.forEach(function (o) {
					o.u && (o.__H = o.u), (o.u = void 0);
				})),
				(Go = q = null);
		}),
		(Q.__c = function (e, t) {
			t.some(function (o) {
				try {
					o.__h.forEach(Wt),
						(o.__h = o.__h.filter(function (r) {
							return !r.__ || Wo(r);
						}));
				} catch (r) {
					t.some(function (n) {
						n.__h && (n.__h = []);
					}),
						(t = []),
						Q.__e(r, o.__v);
				}
			}),
				In && In(e, t);
		}),
		(Q.unmount = function (e) {
			Rn && Rn(e);
			var t,
				o = e.__c;
			o &&
				o.__H &&
				(o.__H.__.forEach(function (r) {
					try {
						Wt(r);
					} catch (n) {
						t = n;
					}
				}),
				(o.__H = void 0),
				t && Q.__e(t, o.__v));
		});
	var Ln = typeof requestAnimationFrame == 'function';
	function ia(e) {
		var t,
			o = function () {
				clearTimeout(r), Ln && cancelAnimationFrame(t), setTimeout(e);
			},
			r = setTimeout(o, 35);
		Ln && (t = requestAnimationFrame(o));
	}
	function Wt(e) {
		var t = q,
			o = e.__c;
		typeof o == 'function' && ((e.__c = void 0), o()), (q = t);
	}
	function Wo(e) {
		var t = q;
		(e.__c = e.__()), (q = t);
	}
	function Ko(e, t) {
		return (
			!e ||
			e.length !== t.length ||
			t.some(function (o, r) {
				return o !== e[r];
			})
		);
	}
	function An(e, t) {
		return typeof t == 'function' ? t(e) : t;
	}
	function Vn(e, t) {
		for (var o in t) e[o] = t[o];
		return e;
	}
	function Xo(e, t) {
		for (var o in e) if (o !== '__source' && !(o in t)) return !0;
		for (var r in t) if (r !== '__source' && e[r] !== t[r]) return !0;
		return !1;
	}
	function Zo(e, t) {
		var o = t(),
			r = L({ t: { __: o, u: t } }),
			n = r[0].t,
			i = r[1];
		return (
			ke(
				function () {
					(n.__ = o), (n.u = t), Yo(n) && i({ t: n });
				},
				[e, o, t]
			),
			M(
				function () {
					return (
						Yo(n) && i({ t: n }),
						e(function () {
							Yo(n) && i({ t: n });
						})
					);
				},
				[e]
			),
			o
		);
	}
	function Yo(e) {
		var t,
			o,
			r = e.u,
			n = e.__;
		try {
			var i = r();
			return !(
				((t = n) === (o = i) && (t !== 0 || 1 / t == 1 / o)) ||
				(t != t && o != o)
			);
		} catch {
			return !0;
		}
	}
	function Jo(e) {
		e();
	}
	function Qo(e) {
		return e;
	}
	function er() {
		return [!1, Jo];
	}
	var tr = ke;
	function Xt(e, t) {
		(this.props = e), (this.context = t);
	}
	function Hn(e, t) {
		function o(n) {
			var i = this.props.ref,
				s = i == n.ref;
			return (
				!s && i && (i.call ? i(null) : (i.current = null)),
				t ? !t(this.props, n) || !s : Xo(this.props, n)
			);
		}
		function r(n) {
			return (this.shouldComponentUpdate = o), Se(e, n);
		}
		return (
			(r.displayName = 'Memo(' + (e.displayName || e.name) + ')'),
			(r.prototype.isReactComponent = !0),
			(r.__f = !0),
			(r.type = e),
			r
		);
	}
	((Xt.prototype = new Ce()).isPureReactComponent = !0),
		(Xt.prototype.shouldComponentUpdate = function (e, t) {
			return Xo(this.props, e) || Xo(this.state, t);
		});
	var Bn = B.__b;
	B.__b = function (e) {
		e.type && e.type.__f && e.ref && ((e.props.ref = e.ref), (e.ref = null)),
			Bn && Bn(e);
	};
	var sa =
		(typeof Symbol < 'u' && Symbol.for && Symbol.for('react.forward_ref')) ||
		3911;
	function T(e) {
		function t(o) {
			var r = Vn({}, o);
			return delete r.ref, e(r, o.ref || null);
		}
		return (
			(t.$$typeof = sa),
			(t.render = e),
			(t.prototype.isReactComponent = t.__f = !0),
			(t.displayName = 'ForwardRef(' + (e.displayName || e.name) + ')'),
			t
		);
	}
	var En = function (e, t) {
			return e == null ? null : Te(Te(e).map(t));
		},
		ge = {
			map: En,
			forEach: En,
			count: function (e) {
				return e ? Te(e).length : 0;
			},
			only: function (e) {
				var t = Te(e);
				if (t.length !== 1) throw 'Children.only';
				return t[0];
			},
			toArray: Te,
		},
		aa = B.__e;
	B.__e = function (e, t, o, r) {
		if (e.then) {
			for (var n, i = t; (i = i.__); )
				if ((n = i.__c) && n.__c)
					return (
						t.__e == null && ((t.__e = o.__e), (t.__k = o.__k)), n.__c(e, t)
					);
		}
		aa(e, t, o, r);
	};
	var Pn = B.unmount;
	function Un(e, t, o) {
		return (
			e &&
				(e.__c &&
					e.__c.__H &&
					(e.__c.__H.__.forEach(function (r) {
						typeof r.__c == 'function' && r.__c();
					}),
					(e.__c.__H = null)),
				(e = Vn({}, e)).__c != null &&
					(e.__c.__P === o && (e.__c.__P = t),
					(e.__c.__e = !0),
					(e.__c = null)),
				(e.__k =
					e.__k &&
					e.__k.map(function (r) {
						return Un(r, t, o);
					}))),
			e
		);
	}
	function zn(e, t, o) {
		return (
			e &&
				o &&
				((e.__v = null),
				(e.__k =
					e.__k &&
					e.__k.map(function (r) {
						return zn(r, t, o);
					})),
				e.__c &&
					e.__c.__P === t &&
					(e.__e && o.appendChild(e.__e), (e.__c.__e = !0), (e.__c.__P = o))),
			e
		);
	}
	function It() {
		(this.__u = 0), (this.o = null), (this.__b = null);
	}
	function $n(e) {
		var t = e.__.__c;
		return t && t.__a && t.__a(e);
	}
	function qn(e) {
		var t, o, r;
		function n(i) {
			if (
				(t ||
					(t = e()).then(
						function (s) {
							o = s.default || s;
						},
						function (s) {
							r = s;
						}
					),
				r)
			)
				throw r;
			if (!o) throw t;
			return Se(o, i);
		}
		return (n.displayName = 'Lazy'), (n.__f = !0), n;
	}
	function at() {
		(this.i = null), (this.l = null);
	}
	(B.unmount = function (e) {
		var t = e.__c;
		t && t.__R && t.__R(), t && 32 & e.__u && (e.type = null), Pn && Pn(e);
	}),
		((It.prototype = new Ce()).__c = function (e, t) {
			var o = t.__c,
				r = this;
			r.o == null && (r.o = []), r.o.push(o);
			var n = $n(r.__v),
				i = !1,
				s = function () {
					i || ((i = !0), (o.__R = null), n ? n(c) : c());
				};
			o.__R = s;
			var c = function () {
				if (!--r.__u) {
					if (r.state.__a) {
						var u = r.state.__a;
						r.__v.__k[0] = zn(u, u.__c.__P, u.__c.__O);
					}
					var d;
					for (r.setState({ __a: (r.__b = null) }); (d = r.o.pop()); )
						d.forceUpdate();
				}
			};
			r.__u++ || 32 & t.__u || r.setState({ __a: (r.__b = r.__v.__k[0]) }),
				e.then(s, s);
		}),
		(It.prototype.componentWillUnmount = function () {
			this.o = [];
		}),
		(It.prototype.render = function (e, t) {
			if (this.__b) {
				if (this.__v.__k) {
					var o = document.createElement('div'),
						r = this.__v.__k[0].__c;
					this.__v.__k[0] = Un(this.__b, o, (r.__O = r.__P));
				}
				this.__b = null;
			}
			var n = t.__a && Se(H, null, e.fallback);
			return n && (n.__u &= -33), [Se(H, null, t.__a ? null : e.children), n];
		});
	var jn = function (e, t, o) {
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
	function ca(e) {
		return (
			(this.getChildContext = function () {
				return e.context;
			}),
			e.children
		);
	}
	function la(e) {
		var t = this,
			o = e.h;
		if (
			((t.componentWillUnmount = function () {
				rt(null, t.v), (t.v = null), (t.h = null);
			}),
			t.h && t.h !== o && t.componentWillUnmount(),
			!t.v)
		) {
			for (var r = t.__v; r !== null && !r.__m && r.__ !== null; ) r = r.__;
			(t.h = o),
				(t.v = {
					nodeType: 1,
					parentNode: o,
					childNodes: [],
					__k: { __m: r.__m },
					contains: function () {
						return !0;
					},
					insertBefore: function (n, i) {
						this.childNodes.push(n), t.h.insertBefore(n, i);
					},
					removeChild: function (n) {
						this.childNodes.splice(this.childNodes.indexOf(n) >>> 1, 1),
							t.h.removeChild(n);
					},
				});
		}
		rt(Se(ca, { context: t.context }, e.__v), t.v);
	}
	function Le(e, t) {
		var o = Se(la, { __v: e, h: t });
		return (o.containerInfo = t), o;
	}
	((at.prototype = new Ce()).__a = function (e) {
		var t = this,
			o = $n(t.__v),
			r = t.l.get(e);
		return (
			r[0]++,
			function (n) {
				var i = function () {
					t.props.revealOrder ? (r.push(n), jn(t, e, r)) : n();
				};
				o ? o(i) : i();
			}
		);
	}),
		(at.prototype.render = function (e) {
			(this.i = null), (this.l = new Map());
			var t = Te(e.children);
			e.revealOrder && e.revealOrder[0] === 'b' && t.reverse();
			for (var o = t.length; o--; ) this.l.set(t[o], (this.i = [1, 0, this.i]));
			return e.children;
		}),
		(at.prototype.componentDidUpdate = at.prototype.componentDidMount =
			function () {
				var e = this;
				this.l.forEach(function (t, o) {
					jn(e, o, t);
				});
			});
	var Gn =
			(typeof Symbol < 'u' && Symbol.for && Symbol.for('react.element')) ||
			60103,
		da =
			/^(?:accent|alignment|arabic|baseline|cap|clip(?!PathU)|color|dominant|fill|flood|font|glyph(?!R)|horiz|image(!S)|letter|lighting|marker(?!H|W|U)|overline|paint|pointer|shape|stop|strikethrough|stroke|text(?!L)|transform|underline|unicode|units|v|vector|vert|word|writing|x(?!C))[A-Z]/,
		ua = /^on(Ani|Tra|Tou|BeforeInp|Compo)/,
		pa = /[A-Z0-9]/g,
		ma = typeof document < 'u',
		fa = function (e) {
			return (
				typeof Symbol < 'u' && typeof Symbol() == 'symbol'
					? /fil|che|rad/
					: /fil|che|ra/
			).test(e);
		};
	function Wn(e, t, o) {
		return (
			t.__k == null && (t.textContent = ''),
			rt(e, t),
			typeof o == 'function' && o(),
			e ? e.__c : null
		);
	}
	function Kn(e, t, o) {
		return qo(e, t), typeof o == 'function' && o(), e ? e.__c : null;
	}
	(Ce.prototype.isReactComponent = {}),
		[
			'componentWillMount',
			'componentWillReceiveProps',
			'componentWillUpdate',
		].forEach(function (e) {
			Object.defineProperty(Ce.prototype, e, {
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
	var On = B.event;
	function ga() {}
	function ba() {
		return this.cancelBubble;
	}
	function ha() {
		return this.defaultPrevented;
	}
	B.event = function (e) {
		return (
			On && (e = On(e)),
			(e.persist = ga),
			(e.isPropagationStopped = ba),
			(e.isDefaultPrevented = ha),
			(e.nativeEvent = e)
		);
	};
	var or,
		va = {
			enumerable: !1,
			configurable: !0,
			get: function () {
				return this.class;
			},
		},
		Mn = B.vnode;
	B.vnode = function (e) {
		typeof e.type == 'string' &&
			(function (t) {
				var o = t.props,
					r = t.type,
					n = {},
					i = r.indexOf('-') === -1;
				for (var s in o) {
					var c = o[s];
					if (
						!(
							(s === 'value' && 'defaultValue' in o && c == null) ||
							(ma && s === 'children' && r === 'noscript') ||
							s === 'class' ||
							s === 'className'
						)
					) {
						var u = s.toLowerCase();
						s === 'defaultValue' && 'value' in o && o.value == null
							? (s = 'value')
							: s === 'download' && c === !0
								? (c = '')
								: u === 'translate' && c === 'no'
									? (c = !1)
									: u[0] === 'o' && u[1] === 'n'
										? u === 'ondoubleclick'
											? (s = 'ondblclick')
											: u !== 'onchange' ||
													(r !== 'input' && r !== 'textarea') ||
													fa(o.type)
												? u === 'onfocus'
													? (s = 'onfocusin')
													: u === 'onblur'
														? (s = 'onfocusout')
														: ua.test(s) && (s = u)
												: (u = s = 'oninput')
										: i && da.test(s)
											? (s = s.replace(pa, '-$&').toLowerCase())
											: c === null && (c = void 0),
							u === 'oninput' && n[(s = u)] && (s = 'oninputCapture'),
							(n[s] = c);
					}
				}
				r == 'select' &&
					n.multiple &&
					Array.isArray(n.value) &&
					(n.value = Te(o.children).forEach(function (d) {
						d.props.selected = n.value.indexOf(d.props.value) != -1;
					})),
					r == 'select' &&
						n.defaultValue != null &&
						(n.value = Te(o.children).forEach(function (d) {
							d.props.selected = n.multiple
								? n.defaultValue.indexOf(d.props.value) != -1
								: n.defaultValue == d.props.value;
						})),
					o.class && !o.className
						? ((n.class = o.class), Object.defineProperty(n, 'className', va))
						: ((o.className && !o.class) || (o.class && o.className)) &&
							(n.class = n.className = o.className),
					(t.props = n);
			})(e),
			(e.$$typeof = Gn),
			Mn && Mn(e);
	};
	var Dn = B.__r;
	B.__r = function (e) {
		Dn && Dn(e), (or = e.__c);
	};
	var Fn = B.diffed;
	B.diffed = function (e) {
		Fn && Fn(e);
		var t = e.props,
			o = e.__e;
		o != null &&
			e.type === 'textarea' &&
			'value' in t &&
			t.value !== o.value &&
			(o.value = t.value == null ? '' : t.value),
			(or = null);
	};
	var Yn = {
			ReactCurrentDispatcher: {
				current: {
					readContext: function (e) {
						return or.__n[e.__c].props.value;
					},
					useCallback: G,
					useContext: fe,
					useDebugValue: Yt,
					useDeferredValue: Qo,
					useEffect: M,
					useId: st,
					useImperativeHandle: Kt,
					useInsertionEffect: tr,
					useLayoutEffect: ke,
					useMemo: $,
					useReducer: it,
					useRef: z,
					useState: L,
					useSyncExternalStore: Zo,
					useTransition: er,
				},
			},
		},
		ya = '18.3.1';
	function Xn(e) {
		return Se.bind(null, e);
	}
	function le(e) {
		return !!e && e.$$typeof === Gn;
	}
	function Zn(e) {
		return le(e) && e.type === H;
	}
	function Jn(e) {
		return (
			!!e &&
			!!e.displayName &&
			(typeof e.displayName == 'string' || e.displayName instanceof String) &&
			e.displayName.startsWith('Memo(')
		);
	}
	function Ne(e) {
		return le(e) ? kn.apply(null, arguments) : e;
	}
	function Qn(e) {
		return !!e.__k && (rt(null, e), !0);
	}
	function ei(e) {
		return (e && (e.base || (e.nodeType === 1 && e))) || null;
	}
	var ti = function (e, t) {
			return e(t);
		},
		rr = function (e, t) {
			return e(t);
		},
		oi = H,
		ri = le,
		Ca = {
			useState: L,
			useId: st,
			useReducer: it,
			useEffect: M,
			useLayoutEffect: ke,
			useInsertionEffect: tr,
			useTransition: er,
			useDeferredValue: Qo,
			useSyncExternalStore: Zo,
			startTransition: Jo,
			useRef: z,
			useImperativeHandle: Kt,
			useMemo: $,
			useCallback: G,
			useContext: fe,
			useDebugValue: Yt,
			version: '18.3.1',
			Children: ge,
			render: Wn,
			hydrate: Kn,
			unmountComponentAtNode: Qn,
			createPortal: Le,
			createElement: Se,
			createContext: ue,
			createFactory: Xn,
			cloneElement: Ne,
			createRef: Gt,
			Fragment: H,
			isValidElement: le,
			isElement: ri,
			isFragment: Zn,
			isMemo: Jn,
			findDOMNode: ei,
			Component: Ce,
			PureComponent: Xt,
			memo: Hn,
			forwardRef: T,
			flushSync: rr,
			unstable_batchedUpdates: ti,
			StrictMode: oi,
			Suspense: It,
			SuspenseList: at,
			lazy: qn,
			__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: Yn,
		};
	var ni = ue(void 0);
	function W() {
		let e = fe(ni);
		if (e === void 0)
			throw Error(
				'useConsentManager must be used within a ConsentManagerProvider'
			);
		let {
				consents: t,
				consentInfo: o,
				consentCategories: r,
				consentTypes: n,
			} = e.state,
			i = G((u) => Ke(u, t), [t]),
			s = G(() => o != null, [o]),
			c = G(() => n.filter((u) => r.includes(u.name)), [n, r]);
		return {
			...e.state,
			has: i,
			hasConsented: s,
			getDisplayedConsents: c,
			manager: e.manager,
		};
	}
	function ii(e) {
		var t,
			o,
			r = '';
		if (typeof e == 'string' || typeof e == 'number') r += e;
		else if (typeof e == 'object')
			if (Array.isArray(e)) {
				var n = e.length;
				for (t = 0; t < n; t++)
					e[t] && (o = ii(e[t])) && (r && (r += ' '), (r += o));
			} else for (o in e) e[o] && (r && (r += ' '), (r += o));
		return r;
	}
	function ka() {
		for (var e, t, o = 0, r = '', n = arguments.length; o < n; o++)
			(e = arguments[o]) && (t = ii(e)) && (r && (r += ' '), (r += t));
		return r;
	}
	var si = ka;
	function Zt(...e) {
		return si(...e);
	}
	var xa = ['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'ku', 'dv'];
	function nr(e) {
		let t = e ? e.split('-')[0]?.toLowerCase() : 'en';
		return xa.includes(t || '') ? 'rtl' : 'ltr';
	}
	function ci(e) {
		return (
			nr(e) === 'rtl'
				? document.body.classList.add('c15t-rtl')
				: document.body.classList.remove('c15t-rtl'),
			() => {
				document.body.classList.remove('c15t-rtl');
			}
		);
	}
	function ai(e) {
		return Array.from(
			e.querySelectorAll(
				'a[href]:not([disabled]),button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[contenteditable],[tabindex]:not([tabindex="-1"])'
			)
		).filter((t) => t.offsetWidth > 0 && t.offsetHeight > 0);
	}
	function li() {
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
	function di(e) {
		let t = document.activeElement,
			o = ai(e);
		if (o.length > 0)
			setTimeout(() => {
				o[0]?.focus();
			}, 0);
		else if (e.tabIndex !== -1)
			try {
				e.focus();
			} catch {}
		let r = (n) => {
			if (n.key !== 'Tab') return;
			let i = ai(e);
			if (i.length === 0) return;
			let s = i[0],
				c = i[i.length - 1];
			n.shiftKey && document.activeElement === s
				? (n.preventDefault(), c?.focus())
				: n.shiftKey ||
					document.activeElement !== c ||
					(n.preventDefault(), s?.focus());
		};
		return (
			document.addEventListener('keydown', r),
			() => {
				document.removeEventListener('keydown', r),
					t && typeof t.focus == 'function' && setTimeout(() => t.focus(), 0);
			}
		);
	}
	function Jt(e, t) {
		let o = (c) => {
				if (c !== void 0) return typeof c == 'string' ? { className: c } : c;
			},
			r = o(e),
			n = o(t);
		if ((r?.noStyle || n?.noStyle) && n?.noStyle)
			return { className: n.className, style: n.style, noStyle: !0 };
		let i = Zt(r?.baseClassName, r?.className, n?.baseClassName, n?.className),
			s = { ...r?.style, ...n?.style };
		return {
			className: i || void 0,
			style: Object.keys(s).length > 0 ? s : void 0,
			noStyle: r?.noStyle || n?.noStyle,
		};
	}
	function ui(e, t, o, r = !1) {
		let n = t?.slots?.[e],
			i = typeof n == 'object' && n !== null && !!n.noStyle,
			s = typeof o == 'object' && o !== null && !!o.noStyle;
		if (r || i || s) {
			let d = Jt(n || {}, o || {});
			return { className: d.className, style: d.style, noStyle: !0 };
		}
		let c = Jt(
				typeof o == 'object' ? { ...o, className: void 0 } : {},
				n || {}
			),
			u = Jt(c, o || {});
		return { className: u.className, style: u.style };
	}
	function mi(e, t) {
		let { translations: o = {}, defaultLanguage: r = 'en' } = e,
			n = o[r];
		if (pi(n)) return n;
		let i = o.en;
		return pi(i) ? i : t.translations.en;
	}
	function pi(e) {
		return (
			!!e &&
			typeof e == 'object' &&
			'cookieBanner' in e &&
			'consentManagerDialog' in e &&
			'consentTypes' in e &&
			'common' in e
		);
	}
	var gi = {
			defaultPosition: 'bottom-right',
			offset: 20,
			persistPosition: !0,
			storageKey: 'c15t-trigger-position',
		},
		_a = 30,
		fi = 0.15;
	function bi(e, t, o, r = {}) {
		let { threshold: n = _a, velocityX: i = 0, velocityY: s = 0 } = r,
			c = Math.abs(t),
			u = Math.abs(o),
			d = Math.abs(i),
			m = Math.abs(s),
			p = c >= n || (d >= fi && c >= 10),
			l = u >= n || (m >= fi && u >= 10);
		if (!p && !l) return e;
		let b = e.includes('bottom'),
			y = e.includes('right'),
			k = b,
			h = y;
		return (
			p && (h = t > 0),
			l && (k = o > 0),
			k && h
				? 'bottom-right'
				: k && !h
					? 'bottom-left'
					: !k && h
						? 'top-right'
						: 'top-left'
		);
	}
	function hi(e, t = gi.storageKey) {
		try {
			typeof localStorage < 'u' && localStorage.setItem(t, e);
		} catch {}
	}
	function vi(e = gi.storageKey) {
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
	function Qt() {
		return { isDragging: !1, startX: 0, startY: 0, currentX: 0, currentY: 0 };
	}
	function Ve(e) {
		M(() => {
			if (e) return li();
		}, [e]);
	}
	var yi = ue({
			theme: void 0,
			noStyle: !1,
			disableAnimation: !1,
			scrollLock: !1,
			trapFocus: !0,
			colorScheme: 'system',
		}),
		ct = ue(null);
	var we = () => {
		let e = fe(yi),
			t = fe(ct);
		if (!e) throw Error('Theme components must be used within Theme.Root');
		return (function o(r, n) {
			if (!n) return r;
			let i = { ...r };
			for (let s in n)
				n[s] !== void 0 &&
					(n[s] &&
					typeof n[s] == 'object' &&
					!Array.isArray(n[s]) &&
					r[s] &&
					typeof r[s] == 'object'
						? (i[s] = o(r[s], n[s]))
						: (i[s] = n[s]));
			return i;
		})(e, t || null);
	};
	function Y(e, t, o) {
		let { noStyle: r, theme: n } = we(),
			i = o ?? n;
		return $(() => ui(e, i, t, r), [e, i, t, r]);
	}
	function He(...e) {
		return Zt(...e);
	}
	var lt = ue({});
	function dt(e) {
		let t = $(() => nr(e), [e]);
		return M(() => ci(e), [e]), t;
	}
	function Ue(e, t) {
		M(() => {
			if (e && t && t.current) return di(t.current);
		}, [e, t]);
	}
	function Ze() {
		let { translationConfig: e } = W();
		return $(() => mi(e, Pe), [e]);
	}
	function Ci(e, t) {
		if (typeof e == 'function') return e(t);
		e != null && (e.current = t);
	}
	function Rt(...e) {
		return (t) => {
			let o = !1,
				r = e.map((n) => {
					let i = Ci(n, t);
					return !o && typeof i == 'function' && (o = !0), i;
				});
			if (o)
				return () => {
					for (let n = 0; n < r.length; n++) {
						let i = r[n];
						typeof i == 'function' ? i() : Ci(e[n], null);
					}
				};
		};
	}
	function ir(...e) {
		return G(Rt(...e), e);
	}
	var Sa = Symbol.for('react.lazy'),
		eo = be[' use '.trim().toString()];
	function wa(e) {
		return typeof e == 'object' && e !== null && 'then' in e;
	}
	function ki(e) {
		return (
			e != null &&
			typeof e == 'object' &&
			'$$typeof' in e &&
			e.$$typeof === Sa &&
			'_payload' in e &&
			wa(e._payload)
		);
	}
	function Ia(e) {
		let t = Ra(e),
			o = T((r, n) => {
				let { children: i, ...s } = r;
				ki(i) && typeof eo == 'function' && (i = eo(i._payload));
				let c = ge.toArray(i),
					u = c.find(La);
				if (u) {
					let d = u.props.children,
						m = c.map((p) =>
							p === u
								? ge.count(d) > 1
									? ge.only(null)
									: le(d)
										? d.props.children
										: null
								: p
						);
					return a(t, {
						...s,
						ref: n,
						children: le(d) ? Ne(d, void 0, m) : null,
					});
				}
				return a(t, { ...s, ref: n, children: i });
			});
		return (o.displayName = `${e}.Slot`), o;
	}
	var to = Ia('Slot');
	function Ra(e) {
		let t = T((o, r) => {
			let { children: n, ...i } = o;
			if ((ki(n) && typeof eo == 'function' && (n = eo(n._payload)), le(n))) {
				let s = Aa(n),
					c = Na(i, n.props);
				return n.type !== H && (c.ref = r ? Rt(r, s) : s), Ne(n, c);
			}
			return ge.count(n) > 1 ? ge.only(null) : null;
		});
		return (t.displayName = `${e}.SlotClone`), t;
	}
	var Ta = Symbol('radix.slottable');
	function La(e) {
		return (
			le(e) &&
			typeof e.type == 'function' &&
			'__radixId' in e.type &&
			e.type.__radixId === Ta
		);
	}
	function Na(e, t) {
		let o = { ...t };
		for (let r in t) {
			let n = e[r],
				i = t[r];
			/^on[A-Z]/.test(r)
				? n && i
					? (o[r] = (...c) => {
							let u = i(...c);
							return n(...c), u;
						})
					: n && (o[r] = n)
				: r === 'style'
					? (o[r] = { ...n, ...i })
					: r === 'className' && (o[r] = [n, i].filter(Boolean).join(' '));
		}
		return { ...e, ...o };
	}
	function Aa(e) {
		let t = Object.getOwnPropertyDescriptor(e.props, 'ref')?.get,
			o = t && 'isReactWarning' in t && t.isReactWarning;
		return o
			? e.ref
			: ((t = Object.getOwnPropertyDescriptor(e, 'ref')?.get),
				(o = t && 'isReactWarning' in t && t.isReactWarning),
				o ? e.props.ref : e.props.ref || e.ref);
	}
	var xe = T(
		(
			{
				asChild: e,
				className: t,
				style: o,
				themeKey: r,
				baseClassName: n,
				noStyle: i,
				...s
			},
			c
		) => {
			let u = Y(r, { baseClassName: n, className: t, style: o, noStyle: i });
			return a(e ? to : 'div', { ref: c, ...s, ...u });
		}
	);
	xe.displayName = 'Box';
	var Ba = {
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/primitives/accordion.module.css'(
				e,
				t,
				o
			) {
				o.d(t, { A: () => c });
				var r = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'
					),
					n = o.n(r),
					i = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'
					),
					s = o.n(i)()(n());
				s.push([
					e.id,
					':root{--accordion-padding:var(--c15t-space-md);--accordion-radius:var(--c15t-radius-md);--accordion-duration:var(--c15t-duration-normal);--accordion-ease:var(--c15t-easing);--accordion-icon-size:1.25rem;--accordion-background-color:var(--c15t-surface);--accordion-background-color-dark:var(--c15t-surface);--accordion-background-hover:var(--c15t-surface-hover);--accordion-background-hover-dark:var(--c15t-surface-hover);--accordion-border-color:var(--c15t-border);--accordion-border-color-dark:var(--c15t-border);--accordion-text-color:var(--c15t-text);--accordion-text-color-dark:var(--c15t-text);--accordion-icon-color:var(--c15t-text-muted);--accordion-icon-color-dark:var(--c15t-text-muted);--accordion-arrow-color:var(--c15t-text-muted);--accordion-arrow-color-dark:var(--c15t-text-muted);--accordion-content-color:var(--c15t-text-muted);--accordion-content-color-dark:var(--c15t-text-muted);--accordion-focus-ring:var(--c15t-primary);--accordion-focus-ring-dark:var(--c15t-primary);--accordion-focus-shadow:0 0 0 2px var(--accordion-focus-ring);--accordion-focus-shadow-dark:0 0 0 2px var(--accordion-focus-ring-dark)}@layer components{.c15t-ui-root-RhSvQ{&>:not([hidden])~:not([hidden]){--space-y-reverse:0;margin-top:calc(1rem*calc(1 - var(--space-y-reverse)));margin-bottom:calc(1rem*var(--space-y-reverse))}}.c15t-ui-item-v83OH{padding:var(--accordion-padding);background-color:var(--accordion-background-color);box-shadow:inset 0 0 0 1px var(--accordion-border-color);transition:background-color var(--accordion-duration)var(--accordion-ease),box-shadow var(--accordion-duration)var(--accordion-ease);border-radius:var(--accordion-radius);position:relative;overflow:visible}.c15t-dark .c15t-ui-item-v83OH{background-color:var(--accordion-background-color-dark);box-shadow:inset 0 0 0 1px var(--accordion-border-color-dark)}.c15t-ui-item-v83OH:is(:hover,[data-state=open]){background-color:var(--accordion-background-hover);box-shadow:inset 0 0 0 1px #0000}.c15t-dark .c15t-ui-item-v83OH:is(:hover,[data-state=open]){background-color:var(--accordion-background-hover-dark);box-shadow:inset 0 0 0 1px #0000}.c15t-ui-item-v83OH:focus-within:not(:has(.c15t-ui-triggerInner-lwGP6:focus-visible)){background-color:var(--accordion-background-hover);box-shadow:inset 0 0 0 1px #0000}.c15t-dark .c15t-ui-item-v83OH:focus-within:not(:has(.c15t-ui-triggerInner-lwGP6:focus-visible)){background-color:var(--accordion-background-hover-dark);box-shadow:inset 0 0 0 1px #0000}.c15t-ui-item-v83OH:has(.c15t-ui-triggerInner-lwGP6:focus-visible){box-shadow:var(--accordion-focus-shadow)}.c15t-dark .c15t-ui-item-v83OH:has(.c15t-ui-triggerInner-lwGP6:focus-visible){box-shadow:var(--accordion-focus-shadow-dark)}.c15t-ui-trigger-uhpMT{justify-content:space-between;align-items:center;width:100%;display:flex;position:relative;overflow:visible}.c15t-ui-triggerInner-lwGP6{width:90%;margin:calc(-1*var(--accordion-padding));padding:var(--accordion-padding);letter-spacing:-.006em;text-align:left;color:var(--accordion-text-color);cursor:pointer;border-radius:var(--accordion-radius);z-index:1;touch-action:manipulation;background:0 0;border:0;grid-template-columns:auto 1fr;align-items:center;gap:.625rem;font-size:.875rem;font-weight:500;line-height:1.25rem;display:grid;position:relative}.c15t-dark .c15t-ui-triggerInner-lwGP6{color:var(--accordion-text-color-dark)}.c15t-ui-triggerInner-lwGP6:focus-visible{outline:none}.c15t-ui-icon-X1brh{width:var(--accordion-icon-size);height:var(--accordion-icon-size);color:var(--accordion-icon-color);flex-shrink:0}.c15t-dark .c15t-ui-icon-X1brh{color:var(--accordion-icon-color-dark)}.c15t-ui-arrowOpen-yE84x,.c15t-ui-arrowClose-QjqQt{width:var(--accordion-icon-size);height:var(--accordion-icon-size);transition:color var(--accordion-duration)var(--accordion-ease);flex-shrink:0}.c15t-ui-arrowOpen-yE84x{color:var(--accordion-arrow-color)}.c15t-dark .c15t-ui-arrowOpen-yE84x{color:var(--accordion-arrow-color-dark)}.c15t-ui-item-v83OH:hover .c15t-ui-arrowOpen-yE84x{color:var(--accordion-icon-color)}.c15t-dark .c15t-ui-item-v83OH:hover .c15t-ui-arrowOpen-yE84x{color:var(--accordion-icon-color-dark)}.c15t-ui-arrowClose-QjqQt{color:var(--accordion-icon-color);display:none}.c15t-dark .c15t-ui-arrowClose-QjqQt{color:var(--accordion-icon-color-dark)}.c15t-ui-item-v83OH[data-state=open] .c15t-ui-arrowOpen-yE84x{display:none}.c15t-ui-item-v83OH[data-state=open] .c15t-ui-arrowClose-QjqQt{display:block}.c15t-ui-content-YJGot{overflow:hidden}@keyframes c15t-ui-accordionDown-PlK5g{0%{opacity:0;height:0}to{height:var(--radix-accordion-content-height);opacity:1}}@keyframes c15t-ui-accordionUp-aU8rE{0%{height:var(--radix-accordion-content-height);opacity:1}to{opacity:0;height:0}}.c15t-ui-content-YJGot[data-state=open]{animation:c15t-ui-accordionDown-PlK5g var(--accordion-duration)var(--accordion-ease)}.c15t-ui-content-YJGot[data-state=closed]{animation:c15t-ui-accordionUp-aU8rE var(--accordion-duration)var(--accordion-ease)}.c15t-ui-contentInner-lPIUe{letter-spacing:-.006em;color:var(--accordion-content-color);font-size:.875rem;line-height:1.25rem}.c15t-dark .c15t-ui-contentInner-lPIUe{color:var(--accordion-content-color-dark)}@media (prefers-reduced-motion:reduce){.c15t-ui-item-v83OH,.c15t-ui-arrowOpen-yE84x,.c15t-ui-arrowClose-QjqQt{transition:none}.c15t-ui-content-YJGot[data-state=open],.c15t-ui-content-YJGot[data-state=closed]{animation:none}}@media (hover:none){.c15t-ui-item-v83OH:hover{background-color:var(--accordion-background-color)}.c15t-ui-item-v83OH:hover .c15t-ui-arrowOpen-yE84x{color:var(--accordion-arrow-color)}}}',
					'',
				]),
					(s.locals = {
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
				let c = s;
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'(
				e
			) {
				e.exports = function (t) {
					var o = [];
					return (
						(o.toString = function () {
							return this.map(function (r) {
								var n = '',
									i = r[5] !== void 0;
								return (
									r[4] && (n += '@supports ('.concat(r[4], ') {')),
									r[2] && (n += '@media '.concat(r[2], ' {')),
									i &&
										(n += '@layer'.concat(
											r[5].length > 0 ? ' '.concat(r[5]) : '',
											' {'
										)),
									(n += t(r)),
									i && (n += '}'),
									r[2] && (n += '}'),
									r[4] && (n += '}'),
									n
								);
							}).join('');
						}),
						(o.i = function (r, n, i, s, c) {
							typeof r == 'string' && (r = [[null, r, void 0]]);
							var u = {};
							if (i)
								for (var d = 0; d < this.length; d++) {
									var m = this[d][0];
									m != null && (u[m] = !0);
								}
							for (var p = 0; p < r.length; p++) {
								var l = [].concat(r[p]);
								(i && u[l[0]]) ||
									(c !== void 0 &&
										(l[5] === void 0 ||
											(l[1] = '@layer'
												.concat(l[5].length > 0 ? ' '.concat(l[5]) : '', ' {')
												.concat(l[1], '}')),
										(l[5] = c)),
									n &&
										(l[2] &&
											(l[1] = '@media '.concat(l[2], ' {').concat(l[1], '}')),
										(l[2] = n)),
									s &&
										(l[4]
											? ((l[1] = '@supports ('
													.concat(l[4], ') {')
													.concat(l[1], '}')),
												(l[4] = s))
											: (l[4] = ''.concat(s))),
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
				function o(n) {
					for (var i = -1, s = 0; s < t.length; s++)
						if (t[s].identifier === n) {
							i = s;
							break;
						}
					return i;
				}
				function r(n, i) {
					for (var s = {}, c = [], u = 0; u < n.length; u++) {
						var d = n[u],
							m = i.base ? d[0] + i.base : d[0],
							p = s[m] || 0,
							l = ''.concat(m, ' ').concat(p);
						s[m] = p + 1;
						var b = o(l),
							y = {
								css: d[1],
								media: d[2],
								sourceMap: d[3],
								supports: d[4],
								layer: d[5],
							};
						if (b !== -1) t[b].references++, t[b].updater(y);
						else {
							var k = (function (h, v) {
								var C = v.domAPI(v);
								return (
									C.update(h),
									function (g) {
										g
											? (g.css !== h.css ||
													g.media !== h.media ||
													g.sourceMap !== h.sourceMap ||
													g.supports !== h.supports ||
													g.layer !== h.layer) &&
												C.update((h = g))
											: C.remove();
									}
								);
							})(y, i);
							(i.byIndex = u),
								t.splice(u, 0, { identifier: l, updater: k, references: 1 });
						}
						c.push(l);
					}
					return c;
				}
				e.exports = function (n, i) {
					var s = r((n = n || []), (i = i || {}));
					return function (c) {
						c = c || [];
						for (var u = 0; u < s.length; u++) {
							var d = o(s[u]);
							t[d].references--;
						}
						for (var m = r(c, i), p = 0; p < s.length; p++) {
							var l = o(s[p]);
							t[l].references === 0 && (t[l].updater(), t.splice(l, 1));
						}
						s = m;
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'(
				e
			) {
				var t = {};
				e.exports = function (o, r) {
					var n = (function (i) {
						if (t[i] === void 0) {
							var s = document.querySelector(i);
							if (
								window.HTMLIFrameElement &&
								s instanceof window.HTMLIFrameElement
							)
								try {
									s = s.contentDocument.head;
								} catch {
									s = null;
								}
							t[i] = s;
						}
						return t[i];
					})(o);
					if (!n)
						throw Error(
							"Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid."
						);
					n.appendChild(r);
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
				e.exports = function (r) {
					var n = o.nc;
					n && r.setAttribute('nonce', n);
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
						update: function (r) {
							var n, i, s;
							(n = ''),
								r.supports && (n += '@supports ('.concat(r.supports, ') {')),
								r.media && (n += '@media '.concat(r.media, ' {')),
								(i = r.layer !== void 0) &&
									(n += '@layer'.concat(
										r.layer.length > 0 ? ' '.concat(r.layer) : '',
										' {'
									)),
								(n += r.css),
								i && (n += '}'),
								r.media && (n += '}'),
								r.supports && (n += '}'),
								(s = r.sourceMap) &&
									typeof btoa < 'u' &&
									(n += `
/*# sourceMappingURL=data:application/json;base64,`.concat(
										btoa(unescape(encodeURIComponent(JSON.stringify(s)))),
										' */'
									)),
								t.styleTagTransform(n, o, t.options);
						},
						remove: function () {
							var r;
							(r = o).parentNode === null || r.parentNode.removeChild(r);
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
		xi = {};
	function te(e) {
		var t = xi[e];
		if (t !== void 0) return t.exports;
		var o = (xi[e] = { id: e, exports: {} });
		return Ba[e](o, o.exports, te), o.exports;
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
	var Ea = te(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'
		),
		Pa = te.n(Ea),
		ja = te(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'
		),
		Oa = te.n(ja),
		Ma = te(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'
		),
		Da = te.n(Ma),
		Fa = te(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'
		),
		Va = te.n(Fa),
		Ha = te(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'
		),
		Ua = te.n(Ha),
		za = te(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'
		),
		$a = te.n(za),
		oo = te(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/primitives/accordion.module.css'
		),
		ut = {};
	(ut.styleTagTransform = $a()),
		(ut.setAttributes = Va()),
		(ut.insert = Da().bind(null, 'head')),
		(ut.domAPI = Oa()),
		(ut.insertStyleElement = Ua()),
		Pa()(oo.A, ut);
	var qa = oo.A && oo.A.locals ? oo.A.locals : void 0;
	var Ga = {
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/primitives/button.module.css'(
				e,
				t,
				o
			) {
				o.d(t, { A: () => c });
				var r = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'
					),
					n = o.n(r),
					i = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'
					),
					s = o.n(i)()(n());
				s.push([
					e.id,
					':root{--button-primary:var(--c15t-primary);--button-primary-dark:var(--c15t-primary);--button-primary-hover:var(--c15t-primary-hover);--button-primary-hover-dark:var(--c15t-primary-hover);--button-neutral:var(--c15t-text-muted);--button-neutral-dark:var(--c15t-text-muted);--button-neutral-hover:var(--c15t-text);--button-neutral-hover-dark:var(--c15t-text);--button-neutral-soft:var(--c15t-surface-hover);--button-neutral-soft-dark:var(--c15t-surface-hover);--button-focus-ring:var(--c15t-primary);--button-focus-ring-dark:var(--c15t-primary);--button-text:var(--c15t-text);--button-text-dark:var(--c15t-text);--button-text-hover:var(--c15t-text);--button-text-hover-dark:var(--c15t-text);--button-background-color:var(--c15t-surface);--button-background-color-dark:var(--c15t-surface);--button-border:var(--c15t-border);--button-border-dark:var(--c15t-border);--button-hover-overlay:var(--c15t-surface-hover);--button-hover-overlay-dark:var(--c15t-surface-hover);--button-primary-hover-tint:color-mix(in srgb,var(--c15t-primary)10%,transparent);--button-neutral-hover-tint:color-mix(in srgb,var(--c15t-text)10%,transparent);--button-font:var(--c15t-font-family);--button-border-width:1px;--button-border-style:solid;--button-border-color:var(--c15t-border);--button-border-radius:var(--c15t-radius-md);--button-font-weight:var(--c15t-font-weight-medium);--button-font-size:var(--c15t-font-size-sm);--button-line-height:var(--c15t-line-height-tight);--button-transition:opacity var(--c15t-duration-fast)var(--c15t-easing),transform var(--c15t-duration-fast)var(--c15t-easing);--button-hover-transition-color:background-color var(--c15t-duration-fast)var(--c15t-easing);--button-hover-transition-full:background-color var(--c15t-duration-fast)var(--c15t-easing),box-shadow var(--c15t-duration-fast)var(--c15t-easing),color var(--c15t-duration-fast)var(--c15t-easing);--button-cursor:pointer;--button-shadow:var(--c15t-shadow-sm);--button-shadow-dark:var(--c15t-shadow-sm);--button-shadow-primary-focus:0 0 0 2px var(--button-focus-ring);--button-shadow-neutral-focus:0 0 0 2px var(--button-focus-ring);--button-shadow-primary-focus-dark:0 0 0 2px var(--button-focus-ring-dark);--button-shadow-neutral-focus-dark:0 0 0 2px var(--button-focus-ring-dark);--button-shadow-primary:var(--button-shadow),inset 0 0 0 1px var(--button-primary);--button-shadow-primary-dark:var(--button-shadow-dark),inset 0 0 0 1px var(--button-primary-dark);--button-shadow-primary-hover:none;--button-shadow-primary-hover-dark:none;--button-shadow-neutral:var(--button-shadow),inset 0 0 0 1px var(--button-neutral-soft);--button-shadow-neutral-dark:var(--button-shadow-dark),inset 0 0 0 1px var(--button-neutral-soft-dark);--button-shadow-neutral-hover:none;--button-shadow-neutral-hover-dark:none}@layer components{.c15t-ui-button-Lo5cc{border-radius:var(--button-border-radius);font-weight:var(--button-font-weight);transition:var(--button-transition);cursor:var(--button-cursor);border:var(--button-border-width)var(--button-border-style)var(--button-border-color);font-size:var(--button-font-size);line-height:var(--button-line-height);color:var(--button-text);font-family:var(--button-font);touch-action:manipulation;justify-content:center;align-items:center;gap:.5rem;display:inline-flex}.c15t-ui-button-Lo5cc:focus-visible{box-shadow:var(--button-shadow-primary-focus);outline:none}.c15t-dark .c15t-ui-button-Lo5cc:focus-visible{box-shadow:var(--button-shadow-primary-focus-dark)}.c15t-dark .c15t-ui-button-Lo5cc{color:var(--button-text-dark)}.c15t-ui-button-Lo5cc:disabled{opacity:.5;cursor:not-allowed}.c15t-ui-button-Lo5cc:active:not(:disabled){transform:scale(.97)}.c15t-ui-button-medium-zdZk5{font-size:var(--button-font-size);line-height:var(--button-line-height);padding:.625rem 1rem}.c15t-ui-button-small-nclev{font-size:var(--button-font-size);line-height:var(--button-line-height);padding:.5rem .75rem}.c15t-ui-button-xsmall-xj0Fq{font-size:var(--button-font-size);line-height:var(--button-line-height);padding:.375rem .625rem}.c15t-ui-button-xxsmall-qDcpO{font-size:var(--button-font-size);line-height:var(--button-line-height);padding:.25rem .5rem}.c15t-ui-button-primary-filled-u895k{background-color:var(--button-primary);color:var(--button-background-color)}.c15t-ui-button-primary-filled-u895k:focus-visible{box-shadow:var(--button-shadow-primary-focus)}.c15t-dark .c15t-ui-button-primary-filled-u895k{background-color:var(--button-primary-dark);color:var(--button-background-color-dark)}.c15t-ui-button-primary-filled-u895k:hover:not(:disabled){background-color:var(--button-primary-hover);transition:var(--button-hover-transition-color)}.c15t-dark .c15t-ui-button-primary-filled-u895k:hover:not(:disabled){background-color:var(--button-primary-hover-dark);transition:var(--button-hover-transition-color)}.c15t-ui-button-primary-stroke-rMkBn{background-color:var(--button-background-color);color:var(--button-primary);box-shadow:var(--button-shadow-primary)}.c15t-dark .c15t-ui-button-primary-stroke-rMkBn{background-color:var(--button-background-color-dark);color:var(--button-primary-dark);box-shadow:var(--button-shadow-primary-dark)}.c15t-ui-button-primary-stroke-rMkBn:hover:not(:disabled){background-color:var(--button-primary-hover-tint);box-shadow:var(--button-shadow-primary-hover);transition:var(--button-hover-transition-full)}.c15t-dark .c15t-ui-button-primary-stroke-rMkBn:hover:not(:disabled){background-color:var(--button-primary-hover-tint);box-shadow:var(--button-shadow-primary-hover-dark);transition:var(--button-hover-transition-full)}.c15t-ui-button-primary-lighter-pa1_G{background-color:color-mix(in srgb,var(--button-primary)10%,transparent);color:var(--button-primary)}.c15t-dark .c15t-ui-button-primary-lighter-pa1_G{background-color:color-mix(in srgb,var(--button-primary-dark)10%,transparent);color:var(--button-primary-dark)}.c15t-ui-button-primary-lighter-pa1_G:hover:not(:disabled){background-color:color-mix(in srgb,var(--button-primary)20%,transparent);transition:var(--button-hover-transition-color)}.c15t-dark .c15t-ui-button-primary-lighter-pa1_G:hover:not(:disabled){background-color:color-mix(in srgb,var(--button-primary-dark)20%,transparent);transition:var(--button-hover-transition-color)}.c15t-ui-button-primary-ghost-gUXbr{color:var(--button-primary)}.c15t-dark .c15t-ui-button-primary-ghost-gUXbr{color:var(--button-primary-dark)}.c15t-ui-button-primary-ghost-gUXbr:hover:not(:disabled){background-color:var(--button-primary-hover-tint);transition:var(--button-hover-transition-color)}.c15t-dark .c15t-ui-button-primary-ghost-gUXbr:hover:not(:disabled){background-color:var(--button-primary-hover-tint);transition:var(--button-hover-transition-color)}.c15t-ui-button-neutral-filled-iBUdt{background-color:var(--button-neutral);color:var(--button-background-color)}.c15t-ui-button-neutral-filled-iBUdt:focus-visible{box-shadow:var(--button-shadow-neutral-focus)}.c15t-dark .c15t-ui-button-neutral-filled-iBUdt{background-color:var(--button-neutral-dark);color:var(--button-background-color-dark)}.c15t-ui-button-neutral-filled-iBUdt:hover:not(:disabled){background-color:var(--button-neutral-hover);box-shadow:none;transition:var(--button-hover-transition-color)}.c15t-dark .c15t-ui-button-neutral-filled-iBUdt:hover:not(:disabled){background-color:var(--button-neutral-hover-dark);box-shadow:none;transition:var(--button-hover-transition-color)}.c15t-ui-button-neutral-stroke-FNAAx{background-color:var(--button-background-color);box-shadow:var(--button-shadow-neutral)}.c15t-dark .c15t-ui-button-neutral-stroke-FNAAx{background-color:var(--button-background-color-dark);box-shadow:var(--button-shadow-neutral-dark)}.c15t-ui-button-neutral-stroke-FNAAx:hover:not(:disabled){background-color:var(--button-neutral-hover-tint);box-shadow:none;color:var(--button-text-hover);transition:var(--button-hover-transition-full)}.c15t-dark .c15t-ui-button-neutral-stroke-FNAAx:hover:not(:disabled){background-color:var(--button-neutral-hover-tint);box-shadow:none;color:var(--button-text-hover-dark);transition:var(--button-hover-transition-full)}.c15t-ui-button-neutral-lighter-CHsDA{background-color:color-mix(in srgb,var(--button-neutral)10%,transparent);color:var(--button-neutral)}.c15t-dark .c15t-ui-button-neutral-lighter-CHsDA{background-color:color-mix(in srgb,var(--button-neutral-dark)10%,transparent);color:var(--button-neutral-dark)}.c15t-ui-button-neutral-lighter-CHsDA:hover:not(:disabled){background-color:color-mix(in srgb,var(--button-neutral)20%,transparent);transition:var(--button-hover-transition-color)}.c15t-dark .c15t-ui-button-neutral-lighter-CHsDA:hover:not(:disabled){background-color:color-mix(in srgb,var(--button-neutral-dark)20%,transparent);transition:var(--button-hover-transition-color)}.c15t-ui-button-neutral-ghost-a6Cdw{color:var(--button-neutral)}.c15t-dark .c15t-ui-button-neutral-ghost-a6Cdw{color:var(--button-neutral-dark)}.c15t-ui-button-neutral-ghost-a6Cdw:hover:not(:disabled){background-color:var(--button-neutral-hover-tint);box-shadow:none;transition:var(--button-hover-transition-color)}.c15t-dark .c15t-ui-button-neutral-ghost-a6Cdw:hover:not(:disabled){background-color:var(--button-neutral-hover-tint);box-shadow:none;transition:var(--button-hover-transition-color)}.c15t-ui-button-icon-JD5sB{justify-content:center;align-items:center;display:inline-flex}@media (prefers-reduced-motion:reduce){.c15t-ui-button-Lo5cc,.c15t-ui-button-primary-filled-u895k:hover:not(:disabled),.c15t-ui-button-primary-stroke-rMkBn:hover:not(:disabled),.c15t-ui-button-primary-lighter-pa1_G:hover:not(:disabled),.c15t-ui-button-primary-ghost-gUXbr:hover:not(:disabled),.c15t-ui-button-neutral-filled-iBUdt:hover:not(:disabled),.c15t-ui-button-neutral-stroke-FNAAx:hover:not(:disabled),.c15t-ui-button-neutral-lighter-CHsDA:hover:not(:disabled),.c15t-ui-button-neutral-ghost-a6Cdw:hover:not(:disabled){transition:none}}@media (hover:none){.c15t-ui-button-primary-filled-u895k:hover:not(:disabled){background-color:var(--button-primary)}.c15t-ui-button-primary-stroke-rMkBn:hover:not(:disabled){background-color:var(--button-background-color);box-shadow:var(--button-shadow-primary)}.c15t-ui-button-primary-lighter-pa1_G:hover:not(:disabled){background-color:color-mix(in srgb,var(--button-primary)10%,transparent)}.c15t-ui-button-primary-ghost-gUXbr:hover:not(:disabled){background-color:#0000}.c15t-ui-button-neutral-filled-iBUdt:hover:not(:disabled){background-color:var(--button-neutral)}.c15t-ui-button-neutral-stroke-FNAAx:hover:not(:disabled){background-color:var(--button-background-color);box-shadow:var(--button-shadow-neutral)}.c15t-ui-button-neutral-lighter-CHsDA:hover:not(:disabled){background-color:color-mix(in srgb,var(--button-neutral)10%,transparent)}.c15t-ui-button-neutral-ghost-a6Cdw:hover:not(:disabled){background-color:#0000}}}',
					'',
				]),
					(s.locals = {
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
				let c = s;
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'(
				e
			) {
				e.exports = function (t) {
					var o = [];
					return (
						(o.toString = function () {
							return this.map(function (r) {
								var n = '',
									i = r[5] !== void 0;
								return (
									r[4] && (n += '@supports ('.concat(r[4], ') {')),
									r[2] && (n += '@media '.concat(r[2], ' {')),
									i &&
										(n += '@layer'.concat(
											r[5].length > 0 ? ' '.concat(r[5]) : '',
											' {'
										)),
									(n += t(r)),
									i && (n += '}'),
									r[2] && (n += '}'),
									r[4] && (n += '}'),
									n
								);
							}).join('');
						}),
						(o.i = function (r, n, i, s, c) {
							typeof r == 'string' && (r = [[null, r, void 0]]);
							var u = {};
							if (i)
								for (var d = 0; d < this.length; d++) {
									var m = this[d][0];
									m != null && (u[m] = !0);
								}
							for (var p = 0; p < r.length; p++) {
								var l = [].concat(r[p]);
								(i && u[l[0]]) ||
									(c !== void 0 &&
										(l[5] === void 0 ||
											(l[1] = '@layer'
												.concat(l[5].length > 0 ? ' '.concat(l[5]) : '', ' {')
												.concat(l[1], '}')),
										(l[5] = c)),
									n &&
										(l[2] &&
											(l[1] = '@media '.concat(l[2], ' {').concat(l[1], '}')),
										(l[2] = n)),
									s &&
										(l[4]
											? ((l[1] = '@supports ('
													.concat(l[4], ') {')
													.concat(l[1], '}')),
												(l[4] = s))
											: (l[4] = ''.concat(s))),
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
				function o(n) {
					for (var i = -1, s = 0; s < t.length; s++)
						if (t[s].identifier === n) {
							i = s;
							break;
						}
					return i;
				}
				function r(n, i) {
					for (var s = {}, c = [], u = 0; u < n.length; u++) {
						var d = n[u],
							m = i.base ? d[0] + i.base : d[0],
							p = s[m] || 0,
							l = ''.concat(m, ' ').concat(p);
						s[m] = p + 1;
						var b = o(l),
							y = {
								css: d[1],
								media: d[2],
								sourceMap: d[3],
								supports: d[4],
								layer: d[5],
							};
						if (b !== -1) t[b].references++, t[b].updater(y);
						else {
							var k = (function (h, v) {
								var C = v.domAPI(v);
								return (
									C.update(h),
									function (g) {
										g
											? (g.css !== h.css ||
													g.media !== h.media ||
													g.sourceMap !== h.sourceMap ||
													g.supports !== h.supports ||
													g.layer !== h.layer) &&
												C.update((h = g))
											: C.remove();
									}
								);
							})(y, i);
							(i.byIndex = u),
								t.splice(u, 0, { identifier: l, updater: k, references: 1 });
						}
						c.push(l);
					}
					return c;
				}
				e.exports = function (n, i) {
					var s = r((n = n || []), (i = i || {}));
					return function (c) {
						c = c || [];
						for (var u = 0; u < s.length; u++) {
							var d = o(s[u]);
							t[d].references--;
						}
						for (var m = r(c, i), p = 0; p < s.length; p++) {
							var l = o(s[p]);
							t[l].references === 0 && (t[l].updater(), t.splice(l, 1));
						}
						s = m;
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'(
				e
			) {
				var t = {};
				e.exports = function (o, r) {
					var n = (function (i) {
						if (t[i] === void 0) {
							var s = document.querySelector(i);
							if (
								window.HTMLIFrameElement &&
								s instanceof window.HTMLIFrameElement
							)
								try {
									s = s.contentDocument.head;
								} catch {
									s = null;
								}
							t[i] = s;
						}
						return t[i];
					})(o);
					if (!n)
						throw Error(
							"Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid."
						);
					n.appendChild(r);
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
				e.exports = function (r) {
					var n = o.nc;
					n && r.setAttribute('nonce', n);
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
						update: function (r) {
							var n, i, s;
							(n = ''),
								r.supports && (n += '@supports ('.concat(r.supports, ') {')),
								r.media && (n += '@media '.concat(r.media, ' {')),
								(i = r.layer !== void 0) &&
									(n += '@layer'.concat(
										r.layer.length > 0 ? ' '.concat(r.layer) : '',
										' {'
									)),
								(n += r.css),
								i && (n += '}'),
								r.media && (n += '}'),
								r.supports && (n += '}'),
								(s = r.sourceMap) &&
									typeof btoa < 'u' &&
									(n += `
/*# sourceMappingURL=data:application/json;base64,`.concat(
										btoa(unescape(encodeURIComponent(JSON.stringify(s)))),
										' */'
									)),
								t.styleTagTransform(n, o, t.options);
						},
						remove: function () {
							var r;
							(r = o).parentNode === null || r.parentNode.removeChild(r);
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
		_i = {};
	function oe(e) {
		var t = _i[e];
		if (t !== void 0) return t.exports;
		var o = (_i[e] = { id: e, exports: {} });
		return Ga[e](o, o.exports, oe), o.exports;
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
	var Wa = oe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'
		),
		Ka = oe.n(Wa),
		Ya = oe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'
		),
		Xa = oe.n(Ya),
		Za = oe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'
		),
		Ja = oe.n(Za),
		Qa = oe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'
		),
		ec = oe.n(Qa),
		tc = oe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'
		),
		oc = oe.n(tc),
		rc = oe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'
		),
		nc = oe.n(rc),
		ro = oe(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/primitives/button.module.css'
		),
		pt = {};
	(pt.styleTagTransform = nc()),
		(pt.setAttributes = ec()),
		(pt.insert = Ja().bind(null, 'head')),
		(pt.domAPI = Xa()),
		(pt.insertStyleElement = oc()),
		Ka()(ro.A, pt);
	var Tt = ro.A && ro.A.locals ? ro.A.locals : void 0;
	var no = ({
		variant: e = 'primary',
		mode: t = 'filled',
		size: o = 'medium',
	} = {}) => {
		let r = [Tt.button, Tt[`button-${o}`]];
		r.push(
			Tt[
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
		let n = [Tt['button-icon']];
		return {
			root: (i) => [...r, i?.class].filter(Boolean).join(' '),
			icon: (i) => [...n, i?.class].filter(Boolean).join(' '),
		};
	};
	var ic = {
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/primitives/switch.module.css'(
				e,
				t,
				o
			) {
				o.d(t, { A: () => c });
				var r = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'
					),
					n = o.n(r),
					i = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'
					),
					s = o.n(i)()(n());
				s.push([
					e.id,
					':root{--switch-height:1.25rem;--switch-width:2rem;--switch-padding:.125rem;--switch-duration:var(--c15t-duration-normal);--switch-ease:var(--c15t-easing);--switch-thumb-size:.75rem;--switch-thumb-size-disabled:.625rem;--switch-thumb-translate:.75rem;--switch-background-color:var(--c15t-switch-track);--switch-background-color-dark:var(--c15t-switch-track);--switch-background-color-hover:var(--c15t-surface-hover);--switch-background-color-hover-dark:var(--c15t-surface-hover);--switch-background-color-checked:var(--c15t-switch-track-active);--switch-background-color-checked-dark:var(--c15t-switch-track-active);--switch-background-color-disabled:var(--c15t-border);--switch-background-color-disabled-dark:var(--c15t-border);--switch-thumb-background-color:var(--c15t-switch-thumb);--switch-thumb-background-color-dark:var(--c15t-switch-thumb);--switch-thumb-background-color-disabled:var(--c15t-surface-hover);--switch-thumb-background-color-disabled-dark:var(--c15t-surface-hover);--switch-shadow-thumb:0 0 0 1px var(--c15t-border);--switch-shadow-thumb-dark:0 0 0 1px var(--c15t-border);--switch-focus-ring:var(--c15t-primary);--switch-focus-ring-dark:var(--c15t-primary);--switch-focus-shadow:0 0 0 2px var(--switch-focus-ring);--switch-focus-shadow-dark:0 0 0 2px var(--switch-focus-ring-dark)}@layer components{.c15t-ui-root-Pd0rf{height:var(--switch-height);width:var(--switch-width);padding:var(--switch-padding);white-space:nowrap;touch-action:manipulation;background:0 0;border:0;border-radius:9999px;outline:none;flex-shrink:0;margin:0;font-family:inherit;font-size:100%;line-height:1.15;display:block}.c15t-ui-track-kWz9_{height:calc(var(--switch-height) - 2*var(--switch-padding));width:calc(var(--switch-width) - 2*var(--switch-padding));padding:var(--switch-padding);background-color:var(--switch-background-color);transition:background-color var(--switch-duration)var(--switch-ease);border-radius:9999px;outline:none;align-items:center;display:flex;position:relative}.c15t-dark .c15t-ui-track-kWz9_{background-color:var(--switch-background-color-dark)}.c15t-ui-track-kWz9_:hover{background-color:var(--switch-background-color-hover)}.c15t-dark .c15t-ui-track-kWz9_:hover{background-color:var(--switch-background-color-hover-dark)}.c15t-ui-track-kWz9_:focus-visible{background-color:var(--switch-background-color-hover)}.c15t-dark .c15t-ui-track-kWz9_:focus-visible{background-color:var(--switch-background-color-hover-dark)}.c15t-ui-track-kWz9_:active{background-color:var(--switch-background-color)}.c15t-dark .c15t-ui-track-kWz9_:active{background-color:var(--switch-background-color-dark)}.c15t-ui-root-Pd0rf[data-state=checked] .c15t-ui-track-kWz9_{background-color:var(--switch-background-color-checked)}.c15t-dark .c15t-ui-root-Pd0rf[data-state=checked] .c15t-ui-track-kWz9_{background-color:var(--switch-background-color-checked-dark)}.c15t-ui-root-Pd0rf[data-state=checked]:hover .c15t-ui-track-kWz9_{background-color:var(--switch-background-color-checked)}.c15t-dark .c15t-ui-root-Pd0rf[data-state=checked]:hover .c15t-ui-track-kWz9_{background-color:var(--switch-background-color-checked-dark)}.c15t-ui-root-Pd0rf[data-disabled]{cursor:not-allowed}.c15t-ui-root-Pd0rf:focus{outline:none}.c15t-dark .c15t-ui-root-Pd0rf:focus{outline:none}.c15t-ui-track-disabled-VxwND{background-color:var(--switch-background-color-disabled);opacity:.4;box-shadow:inset 0 0 0 1px #ebebeb}.c15t-dark .c15t-ui-track-disabled-VxwND{background-color:var(--switch-background-color-disabled-dark)}.c15t-ui-root-Pd0rf[data-state=checked] .c15t-ui-track-disabled-VxwND{background-color:var(--switch-background-color-checked);opacity:.4;box-shadow:none}.c15t-dark .c15t-ui-root-Pd0rf[data-state=checked] .c15t-ui-track-disabled-VxwND{background-color:var(--switch-background-color-checked-dark)}.c15t-ui-thumb-mP7_o{pointer-events:none;width:var(--switch-thumb-size);height:var(--switch-thumb-size);transition:transform var(--switch-duration)var(--switch-ease);display:block;position:relative;transform:translate(0)}.c15t-ui-thumb-mP7_o:before{content:"";inset-block:0;background-color:var(--switch-thumb-background-color);border-radius:9999px;width:100%;position:absolute;left:0;mask:radial-gradient(circle farthest-side,#0000 1.95px,#000 2.05px 100%) 50%/100% 100% no-repeat}.c15t-dark .c15t-ui-thumb-mP7_o:before{background-color:var(--switch-thumb-background-color-dark)}.c15t-ui-thumb-mP7_o:after{content:"";inset-block:0;width:100%;box-shadow:var(--switch-shadow-thumb);border-radius:9999px;position:absolute;left:0}.c15t-dark .c15t-ui-thumb-mP7_o:after{box-shadow:var(--switch-shadow-thumb-dark)}.c15t-ui-root-Pd0rf[data-state=checked] .c15t-ui-thumb-mP7_o{transform:translateX(var(--switch-thumb-translate))}.c15t-ui-root-Pd0rf[dir=rtl][data-state=checked] .c15t-ui-thumb-mP7_o{transform:translateX(calc(-1*var(--switch-thumb-translate)))}.c15t-ui-track-kWz9_:active .c15t-ui-thumb-mP7_o{transform:scale(.833)}.c15t-ui-thumb-disabled-fwQIy{box-shadow:none}.c15t-ui-root-Pd0rf[data-state=checked] .c15t-ui-thumb-disabled-fwQIy{transform:translateX(var(--switch-thumb-translate))}.c15t-ui-root-Pd0rf:focus-visible{box-shadow:var(--switch-focus-shadow);outline:none}.c15t-dark .c15t-ui-root-Pd0rf:focus-visible{box-shadow:var(--switch-focus-shadow-dark)}@media (prefers-reduced-motion:reduce){.c15t-ui-track-kWz9_,.c15t-ui-thumb-mP7_o{transition:none}}@media (hover:none){.c15t-ui-track-kWz9_:hover{background-color:var(--switch-background-color)}.c15t-ui-root-Pd0rf[data-state=checked] .c15t-ui-track-kWz9_:hover{background-color:var(--switch-background-color-checked)}}}',
					'',
				]),
					(s.locals = {
						root: 'c15t-ui-root-Pd0rf',
						track: 'c15t-ui-track-kWz9_',
						'track-disabled': 'c15t-ui-track-disabled-VxwND',
						trackDisabled: 'c15t-ui-track-disabled-VxwND',
						thumb: 'c15t-ui-thumb-mP7_o',
						'thumb-disabled': 'c15t-ui-thumb-disabled-fwQIy',
						thumbDisabled: 'c15t-ui-thumb-disabled-fwQIy',
					});
				let c = s;
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'(
				e
			) {
				e.exports = function (t) {
					var o = [];
					return (
						(o.toString = function () {
							return this.map(function (r) {
								var n = '',
									i = r[5] !== void 0;
								return (
									r[4] && (n += '@supports ('.concat(r[4], ') {')),
									r[2] && (n += '@media '.concat(r[2], ' {')),
									i &&
										(n += '@layer'.concat(
											r[5].length > 0 ? ' '.concat(r[5]) : '',
											' {'
										)),
									(n += t(r)),
									i && (n += '}'),
									r[2] && (n += '}'),
									r[4] && (n += '}'),
									n
								);
							}).join('');
						}),
						(o.i = function (r, n, i, s, c) {
							typeof r == 'string' && (r = [[null, r, void 0]]);
							var u = {};
							if (i)
								for (var d = 0; d < this.length; d++) {
									var m = this[d][0];
									m != null && (u[m] = !0);
								}
							for (var p = 0; p < r.length; p++) {
								var l = [].concat(r[p]);
								(i && u[l[0]]) ||
									(c !== void 0 &&
										(l[5] === void 0 ||
											(l[1] = '@layer'
												.concat(l[5].length > 0 ? ' '.concat(l[5]) : '', ' {')
												.concat(l[1], '}')),
										(l[5] = c)),
									n &&
										(l[2] &&
											(l[1] = '@media '.concat(l[2], ' {').concat(l[1], '}')),
										(l[2] = n)),
									s &&
										(l[4]
											? ((l[1] = '@supports ('
													.concat(l[4], ') {')
													.concat(l[1], '}')),
												(l[4] = s))
											: (l[4] = ''.concat(s))),
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
				function o(n) {
					for (var i = -1, s = 0; s < t.length; s++)
						if (t[s].identifier === n) {
							i = s;
							break;
						}
					return i;
				}
				function r(n, i) {
					for (var s = {}, c = [], u = 0; u < n.length; u++) {
						var d = n[u],
							m = i.base ? d[0] + i.base : d[0],
							p = s[m] || 0,
							l = ''.concat(m, ' ').concat(p);
						s[m] = p + 1;
						var b = o(l),
							y = {
								css: d[1],
								media: d[2],
								sourceMap: d[3],
								supports: d[4],
								layer: d[5],
							};
						if (b !== -1) t[b].references++, t[b].updater(y);
						else {
							var k = (function (h, v) {
								var C = v.domAPI(v);
								return (
									C.update(h),
									function (g) {
										g
											? (g.css !== h.css ||
													g.media !== h.media ||
													g.sourceMap !== h.sourceMap ||
													g.supports !== h.supports ||
													g.layer !== h.layer) &&
												C.update((h = g))
											: C.remove();
									}
								);
							})(y, i);
							(i.byIndex = u),
								t.splice(u, 0, { identifier: l, updater: k, references: 1 });
						}
						c.push(l);
					}
					return c;
				}
				e.exports = function (n, i) {
					var s = r((n = n || []), (i = i || {}));
					return function (c) {
						c = c || [];
						for (var u = 0; u < s.length; u++) {
							var d = o(s[u]);
							t[d].references--;
						}
						for (var m = r(c, i), p = 0; p < s.length; p++) {
							var l = o(s[p]);
							t[l].references === 0 && (t[l].updater(), t.splice(l, 1));
						}
						s = m;
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'(
				e
			) {
				var t = {};
				e.exports = function (o, r) {
					var n = (function (i) {
						if (t[i] === void 0) {
							var s = document.querySelector(i);
							if (
								window.HTMLIFrameElement &&
								s instanceof window.HTMLIFrameElement
							)
								try {
									s = s.contentDocument.head;
								} catch {
									s = null;
								}
							t[i] = s;
						}
						return t[i];
					})(o);
					if (!n)
						throw Error(
							"Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid."
						);
					n.appendChild(r);
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
				e.exports = function (r) {
					var n = o.nc;
					n && r.setAttribute('nonce', n);
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
						update: function (r) {
							var n, i, s;
							(n = ''),
								r.supports && (n += '@supports ('.concat(r.supports, ') {')),
								r.media && (n += '@media '.concat(r.media, ' {')),
								(i = r.layer !== void 0) &&
									(n += '@layer'.concat(
										r.layer.length > 0 ? ' '.concat(r.layer) : '',
										' {'
									)),
								(n += r.css),
								i && (n += '}'),
								r.media && (n += '}'),
								r.supports && (n += '}'),
								(s = r.sourceMap) &&
									typeof btoa < 'u' &&
									(n += `
/*# sourceMappingURL=data:application/json;base64,`.concat(
										btoa(unescape(encodeURIComponent(JSON.stringify(s)))),
										' */'
									)),
								t.styleTagTransform(n, o, t.options);
						},
						remove: function () {
							var r;
							(r = o).parentNode === null || r.parentNode.removeChild(r);
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
		Si = {};
	function re(e) {
		var t = Si[e];
		if (t !== void 0) return t.exports;
		var o = (Si[e] = { id: e, exports: {} });
		return ic[e](o, o.exports, re), o.exports;
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
	var sc = re(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'
		),
		ac = re.n(sc),
		cc = re(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'
		),
		lc = re.n(cc),
		dc = re(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'
		),
		uc = re.n(dc),
		pc = re(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'
		),
		mc = re.n(pc),
		fc = re(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'
		),
		gc = re.n(fc),
		bc = re(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'
		),
		hc = re.n(bc),
		io = re(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/primitives/switch.module.css'
		),
		mt = {};
	(mt.styleTagTransform = hc()),
		(mt.setAttributes = mc()),
		(mt.insert = uc().bind(null, 'head')),
		(mt.domAPI = lc()),
		(mt.insertStyleElement = gc()),
		ac()(io.A, mt);
	var Oe = io.A && io.A.locals ? io.A.locals : void 0;
	var sr = ({ size: e = 'medium' } = {}) => {
		let t = { medium: void 0, small: 'root-small' },
			o = { medium: void 0, small: 'thumb-small' },
			r = { medium: void 0, small: 'track-small' };
		return {
			root: (n) => {
				let i = [Oe.root],
					s = t[e];
				return (
					s && i.push(Oe[s]),
					n?.class && i.push(n.class),
					i.filter(Boolean).join(' ')
				);
			},
			thumb: (n) => {
				let i = [Oe.thumb],
					s = o[e];
				return (
					s && i.push(Oe[s]),
					n?.disabled && i.push(Oe['thumb-disabled']),
					n?.class && i.push(n.class),
					i.filter(Boolean).join(' ')
				);
			},
			track: (n) => {
				let i = [Oe.track],
					s = r[e];
				return (
					s && i.push(Oe[s]),
					n?.disabled && i.push(Oe['track-disabled']),
					n?.class && i.push(n.class),
					i.filter(Boolean).join(' ')
				);
			},
		};
	};
	function ar(e, t, o, r, n) {
		let i = ge.map(e, (s) => {
			if (!le(s)) return s;
			let c = s.type?.displayName || '',
				u = o.includes(c) ? t : {},
				d = s.props;
			return Ne(
				s,
				{ ...u, key: `${r}-${s.key || c}` },
				ar(d?.children, t, o, r, d?.asChild)
			);
		});
		return n ? i?.[0] : i;
	}
	var wi = 'ButtonIcon',
		_e = T(
			(
				{
					children: e,
					variant: t,
					mode: o,
					size: r,
					asChild: n,
					className: i,
					noStyle: s,
					...c
				},
				u
			) => {
				let d = st(),
					m = n ? to : 'button',
					p = [s ? '' : no({ variant: t, mode: o, size: r }).root(), i]
						.filter(Boolean)
						.join(' '),
					l = ar(
						e,
						{
							...(t && { variant: t }),
							...(o && { mode: o }),
							...(r && { size: r }),
						},
						[wi],
						d,
						n
					);
				return a(m, { ref: u, className: p, ...c, children: l });
			}
		);
	function vc({ variant: e, mode: t, size: o, as: r, className: n, ...i }) {
		let { icon: s } = no({ variant: e, mode: t, size: o });
		return a(r || 'div', { className: s({ class: n }), ...i });
	}
	(_e.displayName = 'ButtonRoot'), (vc.displayName = wi);
	var yc = {
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/primitives/legal-links.module.css'(
				e,
				t,
				o
			) {
				o.d(t, { A: () => c });
				var r = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'
					),
					n = o.n(r),
					i = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'
					),
					s = o.n(i)()(n());
				s.push([
					e.id,
					':root{--legal-links-gap:.75rem;--legal-links-font-size:.875rem;--legal-links-transition:text-decoration .2s ease;--legal-links-text-decoration:none;--legal-links-text-decoration-hover:underline;--legal-links-outline:2px solid currentColor;--legal-links-outline-offset:2px;--legal-links-color:#476cff;--legal-links-focus-color:#476cff;--legal-links-focus-color-dark:#2547d0}@layer components{.c15t-ui-legalLinks-xVTMr{gap:var(--legal-links-gap);flex-wrap:wrap;align-items:center;display:flex}.c15t-ui-legalLink-YVZqO{color:var(--legal-links-color);text-decoration:var(--legal-links-text-decoration);font-size:var(--legal-links-font-size);transition:var(--legal-links-transition)}.c15t-dark .c15t-ui-legalLink-YVZqO{color:var(--legal-links-focus-color-dark)}.c15t-ui-legalLink-YVZqO:hover{text-decoration:var(--legal-links-text-decoration-hover)}.c15t-ui-legalLink-YVZqO:focus{outline:none;text-decoration:underline}@media (prefers-reduced-motion:reduce){.c15t-ui-legalLink-YVZqO{transition:none}}}',
					'',
				]),
					(s.locals = {
						legalLinks: 'c15t-ui-legalLinks-xVTMr',
						legalLink: 'c15t-ui-legalLink-YVZqO',
					});
				let c = s;
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'(
				e
			) {
				e.exports = function (t) {
					var o = [];
					return (
						(o.toString = function () {
							return this.map(function (r) {
								var n = '',
									i = r[5] !== void 0;
								return (
									r[4] && (n += '@supports ('.concat(r[4], ') {')),
									r[2] && (n += '@media '.concat(r[2], ' {')),
									i &&
										(n += '@layer'.concat(
											r[5].length > 0 ? ' '.concat(r[5]) : '',
											' {'
										)),
									(n += t(r)),
									i && (n += '}'),
									r[2] && (n += '}'),
									r[4] && (n += '}'),
									n
								);
							}).join('');
						}),
						(o.i = function (r, n, i, s, c) {
							typeof r == 'string' && (r = [[null, r, void 0]]);
							var u = {};
							if (i)
								for (var d = 0; d < this.length; d++) {
									var m = this[d][0];
									m != null && (u[m] = !0);
								}
							for (var p = 0; p < r.length; p++) {
								var l = [].concat(r[p]);
								(i && u[l[0]]) ||
									(c !== void 0 &&
										(l[5] === void 0 ||
											(l[1] = '@layer'
												.concat(l[5].length > 0 ? ' '.concat(l[5]) : '', ' {')
												.concat(l[1], '}')),
										(l[5] = c)),
									n &&
										(l[2] &&
											(l[1] = '@media '.concat(l[2], ' {').concat(l[1], '}')),
										(l[2] = n)),
									s &&
										(l[4]
											? ((l[1] = '@supports ('
													.concat(l[4], ') {')
													.concat(l[1], '}')),
												(l[4] = s))
											: (l[4] = ''.concat(s))),
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
				function o(n) {
					for (var i = -1, s = 0; s < t.length; s++)
						if (t[s].identifier === n) {
							i = s;
							break;
						}
					return i;
				}
				function r(n, i) {
					for (var s = {}, c = [], u = 0; u < n.length; u++) {
						var d = n[u],
							m = i.base ? d[0] + i.base : d[0],
							p = s[m] || 0,
							l = ''.concat(m, ' ').concat(p);
						s[m] = p + 1;
						var b = o(l),
							y = {
								css: d[1],
								media: d[2],
								sourceMap: d[3],
								supports: d[4],
								layer: d[5],
							};
						if (b !== -1) t[b].references++, t[b].updater(y);
						else {
							var k = (function (h, v) {
								var C = v.domAPI(v);
								return (
									C.update(h),
									function (g) {
										g
											? (g.css !== h.css ||
													g.media !== h.media ||
													g.sourceMap !== h.sourceMap ||
													g.supports !== h.supports ||
													g.layer !== h.layer) &&
												C.update((h = g))
											: C.remove();
									}
								);
							})(y, i);
							(i.byIndex = u),
								t.splice(u, 0, { identifier: l, updater: k, references: 1 });
						}
						c.push(l);
					}
					return c;
				}
				e.exports = function (n, i) {
					var s = r((n = n || []), (i = i || {}));
					return function (c) {
						c = c || [];
						for (var u = 0; u < s.length; u++) {
							var d = o(s[u]);
							t[d].references--;
						}
						for (var m = r(c, i), p = 0; p < s.length; p++) {
							var l = o(s[p]);
							t[l].references === 0 && (t[l].updater(), t.splice(l, 1));
						}
						s = m;
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'(
				e
			) {
				var t = {};
				e.exports = function (o, r) {
					var n = (function (i) {
						if (t[i] === void 0) {
							var s = document.querySelector(i);
							if (
								window.HTMLIFrameElement &&
								s instanceof window.HTMLIFrameElement
							)
								try {
									s = s.contentDocument.head;
								} catch {
									s = null;
								}
							t[i] = s;
						}
						return t[i];
					})(o);
					if (!n)
						throw Error(
							"Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid."
						);
					n.appendChild(r);
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
				e.exports = function (r) {
					var n = o.nc;
					n && r.setAttribute('nonce', n);
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
						update: function (r) {
							var n, i, s;
							(n = ''),
								r.supports && (n += '@supports ('.concat(r.supports, ') {')),
								r.media && (n += '@media '.concat(r.media, ' {')),
								(i = r.layer !== void 0) &&
									(n += '@layer'.concat(
										r.layer.length > 0 ? ' '.concat(r.layer) : '',
										' {'
									)),
								(n += r.css),
								i && (n += '}'),
								r.media && (n += '}'),
								r.supports && (n += '}'),
								(s = r.sourceMap) &&
									typeof btoa < 'u' &&
									(n += `
/*# sourceMappingURL=data:application/json;base64,`.concat(
										btoa(unescape(encodeURIComponent(JSON.stringify(s)))),
										' */'
									)),
								t.styleTagTransform(n, o, t.options);
						},
						remove: function () {
							var r;
							(r = o).parentNode === null || r.parentNode.removeChild(r);
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
		Ii = {};
	function ne(e) {
		var t = Ii[e];
		if (t !== void 0) return t.exports;
		var o = (Ii[e] = { id: e, exports: {} });
		return yc[e](o, o.exports, ne), o.exports;
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
	var Cc = ne(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'
		),
		kc = ne.n(Cc),
		xc = ne(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'
		),
		_c = ne.n(xc),
		Sc = ne(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'
		),
		wc = ne.n(Sc),
		Ic = ne(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'
		),
		Rc = ne.n(Ic),
		Tc = ne(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'
		),
		Lc = ne.n(Tc),
		Nc = ne(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'
		),
		Ac = ne.n(Nc),
		so = ne(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/primitives/legal-links.module.css'
		),
		ft = {};
	(ft.styleTagTransform = Ac()),
		(ft.setAttributes = Rc()),
		(ft.insert = wc().bind(null, 'head')),
		(ft.domAPI = _c()),
		(ft.insertStyleElement = Lc()),
		kc()(so.A, ft);
	var Ri = so.A && so.A.locals ? so.A.locals : void 0;
	function Bc(e) {
		let { legalLinks: t } = W();
		return e == null
			? null
			: Object.fromEntries(
					Object.entries(t ?? {}).filter(([o]) => e.includes(o))
				);
	}
	function Ti({ links: e, themeKey: t, testIdPrefix: o }) {
		let r = Bc(e),
			{ legalLinks: n } = Ze(),
			i = Y(t, { baseClassName: Ri.legalLink });
		return r && Object.keys(r).length !== 0
			? a('span', {
					children: [
						' ',
						Object.entries(r).map(([s, c], u, d) =>
							c
								? a(
										'span',
										{
											children: [
												a('a', {
													href: c.href,
													target: c.target || '_blank',
													rel:
														c.rel ||
														(c.target === '_blank'
															? 'noopener noreferrer'
															: void 0),
													...i,
													'data-testid': o ? `${o}-${s}` : void 0,
													children: [
														c.label ?? n?.[s],
														u < d.length - 1 && ',',
													],
												}),
												u < d.length - 1 && ' ',
											],
										},
										String(s)
									)
								: null
						),
					],
				})
			: null;
	}
	function Li() {
		let [e, t] = L(!1);
		return (
			M(() => {
				if (typeof window > 'u') return;
				let o = window.matchMedia('(prefers-reduced-motion: reduce)');
				t(o.matches);
				let r = (n) => {
					t(n.matches);
				};
				return (
					o.addEventListener('change', r),
					() => o.removeEventListener('change', r)
				);
			}, []),
			e
		);
	}
	function ao(e) {
		let t = we(),
			o = Li();
		return {
			noStyle: e?.noStyle ?? t.noStyle ?? !1,
			disableAnimation: e?.disableAnimation ?? t.disableAnimation ?? o,
			scrollLock: e?.scrollLock ?? t.scrollLock ?? !1,
			trapFocus: e?.trapFocus ?? t.trapFocus ?? !0,
		};
	}
	var Ec = {
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/components/consent-dialog.module.css'(
				e,
				t,
				o
			) {
				o.d(t, { A: () => c });
				var r = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'
					),
					n = o.n(r),
					i = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'
					),
					s = o.n(i)()(n());
				s.push([
					e.id,
					':root{--consent-dialog-font-family:var(--c15t-font-family);--consent-dialog-line-height:var(--c15t-line-height-tight);--consent-dialog-title-font-size:var(--c15t-font-size-sm);--consent-dialog-title-font-weight:var(--c15t-font-weight-semibold);--consent-dialog-title-letter-spacing:-.025em;--consent-dialog-description-font-size:var(--c15t-font-size-base);--consent-dialog-description-font-weight:var(--c15t-font-weight-normal);--consent-dialog-description-line-height:var(--c15t-line-height-normal);--consent-dialog-footer-gap:var(--c15t-space-sm);--consent-dialog-footer-font-size:14px;--consent-dialog-branding-font-size:var(--c15t-font-size-base);--consent-dialog-branding-font-weight:var(--c15t-font-weight-medium);--consent-dialog-branding-line-height:var(--c15t-line-height-relaxed);--consent-dialog-branding-letter-spacing:-.01em;--consent-dialog-stroke-color:var(--c15t-border);--consent-dialog-stroke-color-dark:var(--c15t-border);--consent-dialog-branding-focus-color:var(--c15t-primary);--consent-dialog-branding-focus-color-dark:var(--c15t-primary);--consent-dialog-link-text-color:var(--c15t-text);--consent-dialog-link-text-color-dark:var(--c15t-text);--consent-dialog-border-color:var(--c15t-border);--consent-dialog-border-color-dark:var(--c15t-border);--consent-dialog-background-color:var(--c15t-surface);--consent-dialog-background-color-dark:var(--c15t-surface);--consent-dialog-foreground-color:var(--c15t-text);--consent-dialog-foreground-color-dark:var(--c15t-text);--consent-dialog-muted-color:var(--c15t-text-muted);--consent-dialog-muted-color-dark:var(--c15t-text-muted);--consent-dialog-overlay-background-color:var(--c15t-overlay);--consent-dialog-overlay-background-color-dark:var(--c15t-overlay);--consent-dialog-card-padding:var(--c15t-space-lg);--consent-dialog-card-padding-mobile:var(--c15t-space-md);--consent-dialog-card-gap:var(--c15t-space-xs);--consent-dialog-header-gap:var(--c15t-space-xs);--consent-dialog-content-gap:var(--c15t-space-md);--consent-dialog-footer-padding-y:var(--c15t-space-md);--consent-dialog-card-radius:var(--c15t-radius-lg);--consent-dialog-max-width:28rem;--consent-dialog-height:80%;--consent-dialog-z-index:1000000000;--consent-dialog-overlay-z-index:1000000000;--consent-dialog-card-shadow:0 1px 2px 0 #0000000d;--consent-dialog-border-width:1px;--consent-dialog-border-width-hairline:1px;--consent-dialog-border-style:solid;--consent-dialog-animation-duration:.2s;--consent-dialog-animation-timing:ease-out;--consent-dialog-branding-gap:.5rem;--consent-dialog-branding-icon-height:1.25rem;--consent-dialog-branding-icon-width:auto}@media only screen and (resolution>=192dpi){:root{--consent-dialog-border-width-hairline:.5px}}@layer components{.c15t-ui-root-SIREQ{isolation:isolate;font-family:var(--consent-dialog-font-family);line-height:var(--consent-dialog-line-height);-webkit-text-size-adjust:100%;tab-size:4;padding:var(--consent-dialog-card-padding-mobile);z-index:var(--consent-dialog-z-index);border-radius:var(--consent-dialog-card-radius);width:100%;height:var(--consent-dialog-height);background:0 0;border:0;justify-content:center;align-items:center;margin:0;display:flex;position:fixed;inset:0}.c15t-ui-root-SIREQ[dir=rtl]{direction:rtl}.c15t-ui-dialogVisible-kshSO{opacity:1;transition:opacity var(--consent-dialog-animation-duration)var(--consent-dialog-animation-timing)}.c15t-ui-dialogHidden-Nkf8B{opacity:0;transition:opacity var(--consent-dialog-animation-duration)var(--consent-dialog-animation-timing)}.c15t-ui-contentVisible-JdLax{opacity:1;transition:opacity var(--consent-dialog-animation-duration)var(--consent-dialog-animation-timing),transform var(--consent-dialog-animation-duration)cubic-bezier(.34,1.56,.64,1);transform:scale(1)}.c15t-ui-contentHidden-b7Eem{opacity:0;transition:opacity var(--consent-dialog-animation-duration)var(--consent-dialog-animation-timing),transform var(--consent-dialog-animation-duration)var(--consent-dialog-animation-timing);transform:scale(.95)}@media (width>=640px){.c15t-ui-root-SIREQ{padding:var(--consent-dialog-card-padding);width:auto}}.c15t-ui-container-kzMoS{width:100%}.c15t-ui-branding-cFvDg{justify-content:center;align-items:center;gap:var(--consent-dialog-branding-gap);font-size:var(--consent-dialog-branding-font-size);font-weight:var(--consent-dialog-branding-font-weight);line-height:var(--consent-dialog-branding-line-height);letter-spacing:var(--consent-dialog-branding-letter-spacing);color:var(--consent-dialog-foreground-color);border-radius:.25rem;margin:auto 0;padding:0 .5rem;text-decoration:none;display:flex}.c15t-ui-branding-cFvDg:focus-visible{box-shadow:0 0 0 2px var(--consent-dialog-branding-focus-color);outline:none}.c15t-dark .c15t-ui-branding-cFvDg:focus-visible{box-shadow:0 0 0 2px var(--consent-dialog-branding-focus-color-dark)}.c15t-dark .c15t-ui-branding-cFvDg{color:var(--consent-dialog-foreground-color-dark)}.c15t-ui-brandingC15T-zxnCt{width:var(--consent-dialog-branding-icon-width);height:var(--consent-dialog-branding-icon-height)}.c15t-ui-brandingConsent-qPIfz{width:var(--consent-dialog-branding-icon-width);height:1rem}.c15t-ui-headerWrapper-unPKA{position:relative}.c15t-ui-closeButton-xUsO9{position:absolute;top:22px;right:22px}.c15t-ui-footer-wtxGp{border-top:solid 1px var(--consent-dialog-stroke-color);justify-content:center;padding-top:1rem;padding-bottom:1rem;font-size:14px}.c15t-ui-overlay-zmCXe{color:var(--consent-dialog-link-text-color);background-color:var(--consent-dialog-overlay-background-color);z-index:var(--consent-dialog-overlay-z-index);position:fixed;inset:0}.c15t-ui-overlayVisible-csRAE{opacity:1;transition:opacity var(--consent-dialog-animation-duration)var(--consent-dialog-animation-timing)}.c15t-ui-overlayHidden-zcSPn{opacity:0;transition:opacity var(--consent-dialog-animation-duration)var(--consent-dialog-animation-timing)}.c15t-dark .c15t-ui-overlay-zmCXe{background-color:var(--consent-dialog-overlay-background-color-dark);color:var(--consent-dialog-link-text-color-dark)}.c15t-ui-card-OCFER{width:min(100%,var(--consent-dialog-max-width));border-radius:var(--consent-dialog-card-radius);border:var(--consent-dialog-border-width)var(--consent-dialog-border-style)var(--consent-dialog-border-color);background-color:var(--consent-dialog-background-color);color:var(--consent-dialog-foreground-color);box-shadow:var(--consent-dialog-card-shadow);margin:0 auto;overflow:hidden}.c15t-dark .c15t-ui-card-OCFER{background-color:var(--consent-dialog-background-color-dark);color:var(--consent-dialog-foreground-color-dark);border-color:var(--consent-dialog-border-color-dark)}.c15t-ui-header-BhjKW{padding:var(--consent-dialog-card-padding);gap:var(--consent-dialog-header-gap);flex-direction:column;display:flex}.c15t-ui-header-BhjKW>*+*{margin-top:var(--consent-dialog-card-gap)}.c15t-ui-title-nqdol{font-weight:var(--consent-dialog-title-font-weight);font-size:var(--consent-dialog-title-font-size);letter-spacing:var(--consent-dialog-title-letter-spacing);line-height:1}.c15t-ui-description-qNkW1{color:var(--consent-dialog-muted-color);font-size:var(--consent-dialog-description-font-size);font-weight:var(--consent-dialog-description-font-weight);line-height:var(--consent-dialog-description-line-height)}.c15t-dark .c15t-ui-description-qNkW1{color:var(--consent-dialog-muted-color-dark)}.c15t-ui-content-lXTS6{padding:var(--consent-dialog-card-padding);gap:var(--consent-dialog-content-gap);padding-top:0}.c15t-ui-footer-wtxGp{justify-content:center;align-items:center;gap:var(--consent-dialog-footer-gap);font-size:var(--consent-dialog-footer-font-size);padding-top:var(--consent-dialog-footer-padding-y);padding-bottom:var(--consent-dialog-footer-padding-y);border-top:var(--consent-dialog-border-width)var(--consent-dialog-border-style)var(--consent-dialog-stroke-color);flex-direction:column;display:flex}.c15t-ui-footer-wtxGp:empty{border-top:none;display:none}.c15t-dark .c15t-ui-footer-wtxGp{border-color:var(--consent-dialog-stroke-color-dark)}@media (prefers-reduced-motion:reduce){.c15t-ui-dialogVisible-kshSO,.c15t-ui-dialogHidden-Nkf8B,.c15t-ui-contentVisible-JdLax,.c15t-ui-contentHidden-b7Eem,.c15t-ui-overlayVisible-csRAE,.c15t-ui-overlayHidden-zcSPn{transition:none}}}',
					'',
				]),
					(s.locals = {
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
				let c = s;
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'(
				e
			) {
				e.exports = function (t) {
					var o = [];
					return (
						(o.toString = function () {
							return this.map(function (r) {
								var n = '',
									i = r[5] !== void 0;
								return (
									r[4] && (n += '@supports ('.concat(r[4], ') {')),
									r[2] && (n += '@media '.concat(r[2], ' {')),
									i &&
										(n += '@layer'.concat(
											r[5].length > 0 ? ' '.concat(r[5]) : '',
											' {'
										)),
									(n += t(r)),
									i && (n += '}'),
									r[2] && (n += '}'),
									r[4] && (n += '}'),
									n
								);
							}).join('');
						}),
						(o.i = function (r, n, i, s, c) {
							typeof r == 'string' && (r = [[null, r, void 0]]);
							var u = {};
							if (i)
								for (var d = 0; d < this.length; d++) {
									var m = this[d][0];
									m != null && (u[m] = !0);
								}
							for (var p = 0; p < r.length; p++) {
								var l = [].concat(r[p]);
								(i && u[l[0]]) ||
									(c !== void 0 &&
										(l[5] === void 0 ||
											(l[1] = '@layer'
												.concat(l[5].length > 0 ? ' '.concat(l[5]) : '', ' {')
												.concat(l[1], '}')),
										(l[5] = c)),
									n &&
										(l[2] &&
											(l[1] = '@media '.concat(l[2], ' {').concat(l[1], '}')),
										(l[2] = n)),
									s &&
										(l[4]
											? ((l[1] = '@supports ('
													.concat(l[4], ') {')
													.concat(l[1], '}')),
												(l[4] = s))
											: (l[4] = ''.concat(s))),
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
				function o(n) {
					for (var i = -1, s = 0; s < t.length; s++)
						if (t[s].identifier === n) {
							i = s;
							break;
						}
					return i;
				}
				function r(n, i) {
					for (var s = {}, c = [], u = 0; u < n.length; u++) {
						var d = n[u],
							m = i.base ? d[0] + i.base : d[0],
							p = s[m] || 0,
							l = ''.concat(m, ' ').concat(p);
						s[m] = p + 1;
						var b = o(l),
							y = {
								css: d[1],
								media: d[2],
								sourceMap: d[3],
								supports: d[4],
								layer: d[5],
							};
						if (b !== -1) t[b].references++, t[b].updater(y);
						else {
							var k = (function (h, v) {
								var C = v.domAPI(v);
								return (
									C.update(h),
									function (g) {
										g
											? (g.css !== h.css ||
													g.media !== h.media ||
													g.sourceMap !== h.sourceMap ||
													g.supports !== h.supports ||
													g.layer !== h.layer) &&
												C.update((h = g))
											: C.remove();
									}
								);
							})(y, i);
							(i.byIndex = u),
								t.splice(u, 0, { identifier: l, updater: k, references: 1 });
						}
						c.push(l);
					}
					return c;
				}
				e.exports = function (n, i) {
					var s = r((n = n || []), (i = i || {}));
					return function (c) {
						c = c || [];
						for (var u = 0; u < s.length; u++) {
							var d = o(s[u]);
							t[d].references--;
						}
						for (var m = r(c, i), p = 0; p < s.length; p++) {
							var l = o(s[p]);
							t[l].references === 0 && (t[l].updater(), t.splice(l, 1));
						}
						s = m;
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'(
				e
			) {
				var t = {};
				e.exports = function (o, r) {
					var n = (function (i) {
						if (t[i] === void 0) {
							var s = document.querySelector(i);
							if (
								window.HTMLIFrameElement &&
								s instanceof window.HTMLIFrameElement
							)
								try {
									s = s.contentDocument.head;
								} catch {
									s = null;
								}
							t[i] = s;
						}
						return t[i];
					})(o);
					if (!n)
						throw Error(
							"Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid."
						);
					n.appendChild(r);
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
				e.exports = function (r) {
					var n = o.nc;
					n && r.setAttribute('nonce', n);
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
						update: function (r) {
							var n, i, s;
							(n = ''),
								r.supports && (n += '@supports ('.concat(r.supports, ') {')),
								r.media && (n += '@media '.concat(r.media, ' {')),
								(i = r.layer !== void 0) &&
									(n += '@layer'.concat(
										r.layer.length > 0 ? ' '.concat(r.layer) : '',
										' {'
									)),
								(n += r.css),
								i && (n += '}'),
								r.media && (n += '}'),
								r.supports && (n += '}'),
								(s = r.sourceMap) &&
									typeof btoa < 'u' &&
									(n += `
/*# sourceMappingURL=data:application/json;base64,`.concat(
										btoa(unescape(encodeURIComponent(JSON.stringify(s)))),
										' */'
									)),
								t.styleTagTransform(n, o, t.options);
						},
						remove: function () {
							var r;
							(r = o).parentNode === null || r.parentNode.removeChild(r);
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
		Ni = {};
	function ie(e) {
		var t = Ni[e];
		if (t !== void 0) return t.exports;
		var o = (Ni[e] = { id: e, exports: {} });
		return Ec[e](o, o.exports, ie), o.exports;
	}
	(ie.n = (e) => {
		var t = e && e.__esModule ? () => e.default : () => e;
		return ie.d(t, { a: t }), t;
	}),
		(ie.d = (e, t) => {
			for (var o in t)
				ie.o(t, o) &&
					!ie.o(e, o) &&
					Object.defineProperty(e, o, { enumerable: !0, get: t[o] });
		}),
		(ie.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t)),
		(ie.nc = void 0);
	var Pc = ie(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'
		),
		jc = ie.n(Pc),
		Oc = ie(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'
		),
		Mc = ie.n(Oc),
		Dc = ie(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'
		),
		Fc = ie.n(Dc),
		Vc = ie(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'
		),
		Hc = ie.n(Vc),
		Uc = ie(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'
		),
		zc = ie.n(Uc),
		$c = ie(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'
		),
		qc = ie.n($c),
		co = ie(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/components/consent-dialog.module.css'
		),
		gt = {};
	(gt.styleTagTransform = qc()),
		(gt.setAttributes = Hc()),
		(gt.insert = Fc().bind(null, 'head')),
		(gt.domAPI = Mc()),
		(gt.insertStyleElement = zc()),
		jc()(co.A, gt);
	var Ie = co.A && co.A.locals ? co.A.locals : void 0;
	function Ai(e, t = []) {
		let o = [];
		function r(i, s) {
			let c = ue(s),
				u = o.length;
			o = [...o, s];
			let d = (p) => {
				let { scope: l, children: b, ...y } = p,
					k = l?.[e]?.[u] || c,
					h = $(() => y, Object.values(y));
				return a(k.Provider, { value: h, children: b });
			};
			d.displayName = i + 'Provider';
			function m(p, l) {
				let b = l?.[e]?.[u] || c,
					y = fe(b);
				if (y) return y;
				if (s !== void 0) return s;
				throw new Error(`\`${p}\` must be used within \`${i}\``);
			}
			return [d, m];
		}
		let n = () => {
			let i = o.map((s) => ue(s));
			return function (c) {
				let u = c?.[e] || i;
				return $(() => ({ [`__scope${e}`]: { ...c, [e]: u } }), [c, u]);
			};
		};
		return (n.scopeName = e), [r, Gc(n, ...t)];
	}
	function Gc(...e) {
		let t = e[0];
		if (e.length === 1) return t;
		let o = () => {
			let r = e.map((n) => ({ useScope: n(), scopeName: n.scopeName }));
			return function (i) {
				let s = r.reduce((c, { useScope: u, scopeName: d }) => {
					let p = u(i)[`__scope${d}`];
					return { ...c, ...p };
				}, {});
				return $(() => ({ [`__scope${t.scopeName}`]: s }), [s]);
			};
		};
		return (o.scopeName = t.scopeName), o;
	}
	function Bi(e) {
		let t = Wc(e),
			o = T((r, n) => {
				let { children: i, ...s } = r,
					c = ge.toArray(i),
					u = c.find(Yc);
				if (u) {
					let d = u.props.children,
						m = c.map((p) =>
							p === u
								? ge.count(d) > 1
									? ge.only(null)
									: le(d)
										? d.props.children
										: null
								: p
						);
					return a(t, {
						...s,
						ref: n,
						children: le(d) ? Ne(d, void 0, m) : null,
					});
				}
				return a(t, { ...s, ref: n, children: i });
			});
		return (o.displayName = `${e}.Slot`), o;
	}
	function Wc(e) {
		let t = T((o, r) => {
			let { children: n, ...i } = o;
			if (le(n)) {
				let s = Zc(n),
					c = Xc(i, n.props);
				return n.type !== H && (c.ref = r ? Rt(r, s) : s), Ne(n, c);
			}
			return ge.count(n) > 1 ? ge.only(null) : null;
		});
		return (t.displayName = `${e}.SlotClone`), t;
	}
	var Kc = Symbol('radix.slottable');
	function Yc(e) {
		return (
			le(e) &&
			typeof e.type == 'function' &&
			'__radixId' in e.type &&
			e.type.__radixId === Kc
		);
	}
	function Xc(e, t) {
		let o = { ...t };
		for (let r in t) {
			let n = e[r],
				i = t[r];
			/^on[A-Z]/.test(r)
				? n && i
					? (o[r] = (...c) => {
							let u = i(...c);
							return n(...c), u;
						})
					: n && (o[r] = n)
				: r === 'style'
					? (o[r] = { ...n, ...i })
					: r === 'className' && (o[r] = [n, i].filter(Boolean).join(' '));
		}
		return { ...e, ...o };
	}
	function Zc(e) {
		let t = Object.getOwnPropertyDescriptor(e.props, 'ref')?.get,
			o = t && 'isReactWarning' in t && t.isReactWarning;
		return o
			? e.ref
			: ((t = Object.getOwnPropertyDescriptor(e, 'ref')?.get),
				(o = t && 'isReactWarning' in t && t.isReactWarning),
				o ? e.props.ref : e.props.ref || e.ref);
	}
	var cb = !!(
		typeof window < 'u' &&
		window.document &&
		window.document.createElement
	);
	function Ei(e, t, { checkForDefaultPrevented: o = !0 } = {}) {
		return function (n) {
			if ((e?.(n), o === !1 || !n.defaultPrevented)) return t?.(n);
		};
	}
	var lo = globalThis?.document ? ke : () => {};
	var Jc = be[' useInsertionEffect '.trim().toString()] || lo;
	function Pi({ prop: e, defaultProp: t, onChange: o = () => {}, caller: r }) {
		let [n, i, s] = Qc({ defaultProp: t, onChange: o }),
			c = e !== void 0,
			u = c ? e : n;
		{
			let m = z(e !== void 0);
			M(() => {
				let p = m.current;
				p !== c &&
					console.warn(
						`${r} is changing from ${p ? 'controlled' : 'uncontrolled'} to ${c ? 'controlled' : 'uncontrolled'}. Components should not switch from controlled to uncontrolled (or vice versa). Decide between using a controlled or uncontrolled value for the lifetime of the component.`
					),
					(m.current = c);
			}, [c, r]);
		}
		let d = G(
			(m) => {
				if (c) {
					let p = el(m) ? m(e) : m;
					p !== e && s.current?.(p);
				} else i(m);
			},
			[c, e, i, s]
		);
		return [u, d];
	}
	function Qc({ defaultProp: e, onChange: t }) {
		let [o, r] = L(e),
			n = z(o),
			i = z(t);
		return (
			Jc(() => {
				i.current = t;
			}, [t]),
			M(() => {
				n.current !== o && (i.current?.(o), (n.current = o));
			}, [o, n]),
			[o, r, i]
		);
	}
	function el(e) {
		return typeof e == 'function';
	}
	var tl = [
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
		cr = tl.reduce((e, t) => {
			let o = Bi(`Primitive.${t}`),
				r = T((n, i) => {
					let { asChild: s, ...c } = n,
						u = s ? o : t;
					return (
						typeof window < 'u' && (window[Symbol.for('radix-ui')] = !0),
						a(u, { ...c, ref: i })
					);
				});
			return (r.displayName = `Primitive.${t}`), { ...e, [t]: r };
		}, {});
	function ji(e) {
		let t = z({ value: e, previous: e });
		return $(
			() => (
				t.current.value !== e &&
					((t.current.previous = t.current.value), (t.current.value = e)),
				t.current.previous
			),
			[e]
		);
	}
	function Oi(e) {
		let [t, o] = L(void 0);
		return (
			lo(() => {
				if (e) {
					o({ width: e.offsetWidth, height: e.offsetHeight });
					let r = new ResizeObserver((n) => {
						if (!Array.isArray(n) || !n.length) return;
						let i = n[0],
							s,
							c;
						if ('borderBoxSize' in i) {
							let u = i.borderBoxSize,
								d = Array.isArray(u) ? u[0] : u;
							(s = d.inlineSize), (c = d.blockSize);
						} else (s = e.offsetWidth), (c = e.offsetHeight);
						o({ width: s, height: c });
					});
					return r.observe(e, { box: 'border-box' }), () => r.unobserve(e);
				} else o(void 0);
			}, [e]),
			t
		);
	}
	var uo = 'Switch',
		[ol, Rb] = Ai(uo),
		[rl, nl] = ol(uo),
		Mi = T((e, t) => {
			let {
					__scopeSwitch: o,
					name: r,
					checked: n,
					defaultChecked: i,
					required: s,
					disabled: c,
					value: u = 'on',
					onCheckedChange: d,
					form: m,
					...p
				} = e,
				[l, b] = L(null),
				y = ir(t, (g) => b(g)),
				k = z(!1),
				h = l ? m || !!l.closest('form') : !0,
				[v, C] = Pi({ prop: n, defaultProp: i ?? !1, onChange: d, caller: uo });
			return a(rl, {
				scope: o,
				checked: v,
				disabled: c,
				children: [
					a(cr.button, {
						type: 'button',
						role: 'switch',
						'aria-checked': v,
						'aria-required': s,
						'data-state': Hi(v),
						'data-disabled': c ? '' : void 0,
						disabled: c,
						value: u,
						...p,
						ref: y,
						onClick: Ei(e.onClick, (g) => {
							C((x) => !x),
								h &&
									((k.current = g.isPropagationStopped()),
									k.current || g.stopPropagation());
						}),
					}),
					h &&
						a(Vi, {
							control: l,
							bubbles: !k.current,
							name: r,
							value: u,
							checked: v,
							required: s,
							disabled: c,
							form: m,
							style: { transform: 'translateX(-100%)' },
						}),
				],
			});
		});
	Mi.displayName = uo;
	var Di = 'SwitchThumb',
		Fi = T((e, t) => {
			let { __scopeSwitch: o, ...r } = e,
				n = nl(Di, o);
			return a(cr.span, {
				'data-state': Hi(n.checked),
				'data-disabled': n.disabled ? '' : void 0,
				...r,
				ref: t,
			});
		});
	Fi.displayName = Di;
	var il = 'SwitchBubbleInput',
		Vi = T(
			(
				{ __scopeSwitch: e, control: t, checked: o, bubbles: r = !0, ...n },
				i
			) => {
				let s = z(null),
					c = ir(s, i),
					u = ji(o),
					d = Oi(t);
				return (
					M(() => {
						let m = s.current;
						if (!m) return;
						let p = window.HTMLInputElement.prototype,
							b = Object.getOwnPropertyDescriptor(p, 'checked').set;
						if (u !== o && b) {
							let y = new Event('click', { bubbles: r });
							b.call(m, o), m.dispatchEvent(y);
						}
					}, [u, o, r]),
					a('input', {
						type: 'checkbox',
						'aria-hidden': !0,
						defaultChecked: o,
						...n,
						tabIndex: -1,
						ref: c,
						style: {
							...n.style,
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
	Vi.displayName = il;
	function Hi(e) {
		return e ? 'checked' : 'unchecked';
	}
	var lr = Mi,
		Ui = Fi;
	var ze = T(
		(
			{ className: e, disabled: t, size: o = 'medium', noStyle: r, ...n },
			i
		) => {
			let s = sr({ size: o }),
				c = r ? e : s.root({ class: e }),
				u = r ? void 0 : s.thumb({ disabled: t }),
				d = r ? void 0 : s.track({ disabled: t });
			return a(lr, {
				ref: i,
				disabled: t,
				className: c,
				...n,
				children: a('span', {
					className: d,
					children: a(Ui, {
						className: u,
						style: {
							'--mask':
								'radial-gradient(circle farthest-side at 50% 50%, #0000 1.95px, #000 2.05px 100%) 50% 50%/100% 100% no-repeat',
						},
					}),
				}),
			});
		}
	);
	ze.displayName = lr.displayName;
	var zi = ({ title: e = 'c15t', titleId: t = 'c15t-icon', ...o }) =>
			a('svg', {
				xmlns: 'http://www.w3.org/2000/svg',
				viewBox: '0 0 446 445',
				'aria-labelledby': t,
				...o,
				children: [
					a('title', { id: t, children: e }),
					a('path', {
						fill: 'currentColor',
						d: 'M223.178.313c39.064 0 70.732 31.668 70.732 70.732-.001 39.064-31.668 70.731-70.732 70.731-12.181 0-23.642-3.079-33.649-8.502l-55.689 55.689a70.267 70.267 0 0 1 5.574 13.441h167.531c8.695-29.217 35.762-50.523 67.804-50.523 39.064 0 70.731 31.668 70.731 70.732s-31.668 70.732-70.731 70.732c-32.042 0-59.108-21.306-67.803-50.523H139.413a70.417 70.417 0 0 1-7.888 17.396l54.046 54.046c10.893-6.851 23.786-10.815 37.605-10.815 39.064 0 70.732 31.669 70.732 70.733 0 39.064-31.668 70.731-70.732 70.731s-70.732-31.667-70.732-70.731c0-10.518 2.296-20.499 6.414-29.471l-57.78-57.78c-8.972 4.117-18.952 6.414-29.47 6.414-39.063 0-70.731-31.668-70.732-70.732 0-39.064 31.669-70.732 70.733-70.732 12.18 0 23.642 3.079 33.649 8.502l55.688-55.688c-5.423-10.007-8.502-21.469-8.502-33.65 0-39.064 31.668-70.733 70.732-70.733Zm0 343.555c-16.742 0-30.314 13.572-30.314 30.314 0 16.741 13.572 30.313 30.314 30.313s30.314-13.572 30.314-30.313c0-16.742-13.572-30.314-30.314-30.314ZM71.611 192.299c-16.742 0-30.315 13.572-30.315 30.314s13.573 30.314 30.315 30.314c16.741 0 30.313-13.572 30.313-30.314 0-16.741-13.572-30.314-30.313-30.314Zm303.138 0c-16.729 0-30.294 13.551-30.315 30.275l.001.039-.001.038c.021 16.725 13.586 30.276 30.315 30.276 16.741 0 30.313-13.572 30.313-30.314 0-16.741-13.572-30.314-30.313-30.314ZM223.178 40.73c-16.742 0-30.314 13.573-30.314 30.315s13.573 30.313 30.314 30.313c16.742 0 30.313-13.572 30.314-30.313 0-16.742-13.572-30.314-30.314-30.315Z',
					}),
				],
			}),
		$i = ({ title: e = 'c15t', titleId: t = 'c15t', ...o }) =>
			a('svg', {
				xmlns: 'http://www.w3.org/2000/svg',
				viewBox: '0 0 408 149',
				'aria-labelledby': t,
				...o,
				children: [
					a('title', { id: t, children: e }),
					a('path', {
						fill: 'currentColor',
						fillRule: 'evenodd',
						d: 'M74.133 14.042c-5.58 0-10.105 4.524-10.105 10.104 0 5.581 4.524 10.105 10.105 10.105 5.58 0 10.105-4.524 10.105-10.105 0-5.58-4.524-10.104-10.105-10.104ZM50.556 24.146C50.556 11.125 61.112.57 74.133.57 87.154.57 97.71 11.125 97.71 24.146c0 13.022-10.556 23.578-23.577 23.578-4.06 0-7.88-1.027-11.216-2.834L44.354 63.453a23.424 23.424 0 0 1 1.858 4.48h55.843c2.899-9.74 11.921-16.841 22.601-16.841 13.022 0 23.578 10.556 23.578 23.577 0 13.022-10.556 23.578-23.578 23.578-10.68 0-19.702-7.102-22.601-16.841H46.211a23.455 23.455 0 0 1-2.628 5.798l18.015 18.015a23.473 23.473 0 0 1 12.535-3.604c13.021 0 23.577 10.556 23.577 23.577 0 13.022-10.556 23.577-23.577 23.577-13.021 0-23.577-10.555-23.577-23.577 0-3.506.765-6.833 2.138-9.824l-19.26-19.26a23.49 23.49 0 0 1-9.823 2.139C10.588 98.247.032 87.69.032 74.669c0-13.021 10.556-23.577 23.577-23.577 4.061 0 7.882 1.026 11.217 2.834L53.39 35.364a23.473 23.473 0 0 1-2.834-11.218Zm63.996 50.523v.023c.012 5.57 4.531 10.082 10.104 10.082 5.581 0 10.105-4.524 10.105-10.105 0-5.58-4.524-10.104-10.105-10.104-5.573 0-10.092 4.511-10.104 10.082v.022ZM23.61 64.565c-5.58 0-10.104 4.524-10.104 10.104 0 5.58 4.524 10.105 10.104 10.105 5.581 0 10.105-4.524 10.105-10.105 0-5.58-4.524-10.104-10.105-10.104Zm40.418 60.627c0-5.581 4.524-10.104 10.105-10.104 5.58 0 10.105 4.523 10.105 10.104 0 5.581-4.524 10.105-10.105 10.105-5.58 0-10.105-4.524-10.105-10.105Z',
						clipRule: 'evenodd',
					}),
					a('path', {
						fill: 'currentColor',
						d: 'M213.869 86.31c0-18.48 14.64-32.04 32.88-32.04 9 0 17.28 3 24.24 10.44l-8.88 9.24c-4.08-4.2-8.88-6.6-15.36-6.6-10.56 0-18.6 8.04-18.6 18.96 0 10.92 8.04 18.959 18.6 18.959 6.48 0 11.28-2.4 15.36-6.6l8.88 9.24c-6.96 7.44-15.24 10.44-24.24 10.44-18.24 0-32.88-13.56-32.88-32.04Zm70.372-39.72h-11.88V33.03h26.88v83.639h-15v-70.08Zm23.468 54.599 12.24-6.96c2.88 6.12 9.24 10.2 16.44 10.2 10.2 0 17.04-6.36 17.04-15.84s-6.48-15.84-16.2-15.84c-4.68 0-9.48 1.44-12.48 4.32l-10.8-2.88 7.8-41.16h40.56v13.56h-29.28l-3 15.12c2.52-1.08 5.52-1.56 8.76-1.56 17.76 0 29.52 11.28 29.52 28.32 0 17.76-12.72 29.64-31.92 29.64-12.6 0-23.52-6.84-28.68-16.92Zm72.386-31.92h-7.8V56.19h7.8V33.03h14.4v23.16h13.08v13.08h-13.08v47.4h-14.4v-47.4Z',
					}),
				],
			});
	var po = ({ title: e = 'Consent', titleId: t = 'consent-icon', ...o }) =>
			a('svg', {
				xmlns: 'http://www.w3.org/2000/svg',
				viewBox: '0 0 140 97',
				fill: 'none',
				'aria-labelledby': t,
				...o,
				children: [
					a('title', { id: t, children: e }),
					a('path', {
						fill: 'currentColor',
						fillRule: 'evenodd',
						d: 'M53.179 70.787c6.17 0 11.172-5.002 11.172-11.172 0-4.009-2.111-7.524-5.283-9.495a23.87 23.87 0 0 1 8.817-1.677c13.217 0 23.93 10.714 23.93 23.93s-10.713 23.93-23.93 23.93c-13.216 0-23.93-10.714-23.93-23.93 0-1.924.227-3.795.656-5.588a11.148 11.148 0 0 0 8.568 4.002Z',
						clipRule: 'evenodd',
					}),
					a('path', {
						fill: 'currentColor',
						fillRule: 'evenodd',
						d: 'M.618 74.716a68.453 68.453 0 0 1-.098-3.654c0-37.205 30.16-67.365 67.365-67.365s67.365 30.16 67.365 67.365c0 1.226-.032 2.444-.097 3.654h-21.927c.041-.776.061-1.557.061-2.343 0-24.531-19.887-44.418-44.418-44.418-24.532 0-44.418 19.887-44.418 44.418 0 .786.02 1.567.06 2.343H.618Z',
						clipRule: 'evenodd',
					}),
				],
			}),
		qi = ({ title: e = 'Privacy', titleId: t = 'fingerprint-icon', ...o }) =>
			a('svg', {
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
					a('title', { id: t, children: e }),
					a('path', { d: 'M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4' }),
					a('path', { d: 'M14 13.12c0 2.38 0 6.38-1 8.88' }),
					a('path', { d: 'M17.29 21.02c.12-.6.43-2.3.5-3.02' }),
					a('path', { d: 'M2 12a10 10 0 0 1 18-6' }),
					a('path', { d: 'M2 16h.01' }),
					a('path', { d: 'M21.8 16c.2-2 .131-5.354 0-6' }),
					a('path', { d: 'M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2' }),
					a('path', { d: 'M8.65 22c.21-.66.45-1.32.57-2' }),
					a('path', { d: 'M9 6.8a6 6 0 0 1 9 5.2v2' }),
				],
			}),
		Gi = ({ title: e = 'Settings', titleId: t = 'settings-icon', ...o }) =>
			a('svg', {
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
					a('title', { id: t, children: e }),
					a('path', {
						d: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z',
					}),
					a('circle', { cx: '12', cy: '12', r: '3' }),
				],
			});
	var $b = T(({ children: e, ...t }, o) =>
			a(xe, {
				ref: o,
				baseClassName: Ie.card,
				...t,
				themeKey: 'consentDialogCard',
				'data-testid': 'consent-dialog-card',
				children: e,
			})
		),
		qb = T(({ children: e, ...t }, o) =>
			a(xe, {
				ref: o,
				baseClassName: Ie.header,
				...t,
				themeKey: 'consentDialogHeader',
				'data-testid': 'consent-dialog-header',
				children: e,
			})
		),
		Gb = T(({ children: e, ...t }, o) => {
			let { consentManagerDialog: r } = Ze();
			return a(xe, {
				ref: o,
				baseClassName: Ie.title,
				themeKey: 'consentDialogTitle',
				...t,
				'data-testid': 'consent-dialog-title',
				children: e ?? r.title,
			});
		}),
		Wb = T(({ children: e, legalLinks: t, asChild: o, ...r }, n) => {
			let { consentManagerDialog: i } = Ze();
			return o
				? a(xe, {
						ref: n,
						baseClassName: Ie.description,
						themeKey: 'consentDialogDescription',
						asChild: o,
						...r,
						children: e ?? i.description,
					})
				: a(xe, {
						ref: n,
						baseClassName: Ie.description,
						themeKey: 'consentDialogDescription',
						asChild: o,
						...r,
						'data-testid': 'consent-dialog-description',
						children: [
							e ?? i.description,
							a(Ti, {
								links: t,
								themeKey: 'consentDialogContent',
								testIdPrefix: 'consent-dialog-legal-link',
							}),
						],
					});
		}),
		Kb = T(({ children: e, ...t }, o) =>
			a(xe, {
				ref: o,
				baseClassName: Ie.content,
				themeKey: 'consentDialogContent',
				'data-testid': 'consent-dialog-content',
				...t,
				children: e,
			})
		),
		Yb = T(
			(
				{ children: e, themeKey: t, hideBranding: o, 'data-testid': r, ...n },
				i
			) =>
				a(xe, {
					ref: i,
					baseClassName: Ie.footer,
					'data-testid': r ?? 'consent-dialog-footer',
					...n,
					themeKey: t ?? 'consentDialogFooter',
					children: e ?? a(dr, { hideBranding: o ?? !1 }),
				})
		);
	function dr({ hideBranding: e }) {
		let { branding: t } = W();
		if (t === 'none' || e) return null;
		let o = typeof window < 'u' ? `?ref=${window.location.hostname}` : '';
		return a('a', {
			dir: 'ltr',
			className: Ie.branding,
			href: t === 'consent' ? `https://consent.io${o}` : `https://c15t.com${o}`,
			children: [
				'Secured by',
				' ',
				t === 'consent'
					? a(po, { className: Ie.brandingConsent })
					: a($i, { className: Ie.brandingC15T }),
			],
		});
	}
	var sl = {
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/components/consent-dialog-trigger.module.css'(
				e,
				t,
				o
			) {
				o.d(t, { A: () => c });
				var r = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'
					),
					n = o.n(r),
					i = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'
					),
					s = o.n(i)()(n());
				s.push([
					e.id,
					'.c15t-ui-trigger-BryZ5{--cdt-size-sm:32px;--cdt-size-md:40px;--cdt-size-lg:48px;--cdt-bg:var(--c15t-surface,#fff);--cdt-bg-hover:var(--c15t-surface-hover,var(--cdt-bg));--cdt-border:var(--c15t-border,#e5e5e5);--cdt-shadow:var(--c15t-shadow-lg,0 10px 15px -3px #0000001a,0 4px 6px -4px #0000001a);--cdt-shadow-hover:var(--c15t-shadow-xl,0 20px 25px -5px #0000001a,0 8px 10px -6px #0000001a);--cdt-radius:var(--c15t-radius-full,9999px);--cdt-offset:var(--c15t-space-md,20px);--cdt-transition-duration:var(--c15t-motion-duration,.2s);--cdt-transition-easing:var(--c15t-motion-easing,ease-out);--cdt-snap-duration:var(--c15t-motion-duration-slow,.3s);--cdt-snap-easing:var(--c15t-motion-easing-smooth,cubic-bezier(.77,0,.175,1));--cdt-icon-color:var(--c15t-text,#171717);--cdt-focus-ring:var(--c15t-primary,#3b82f6);z-index:9999;width:var(--cdt-size-md);height:var(--cdt-size-md);border:1px solid var(--cdt-border);border-radius:var(--cdt-radius);background:var(--cdt-bg);box-shadow:var(--cdt-shadow);cursor:grab;transition:transform var(--cdt-transition-duration)var(--cdt-transition-easing),box-shadow var(--cdt-transition-duration)var(--cdt-transition-easing),background var(--cdt-transition-duration)var(--cdt-transition-easing);touch-action:none;user-select:none;-webkit-tap-highlight-color:transparent;will-change:transform;justify-content:center;align-items:center;margin:0;padding:0;display:flex;position:fixed}@media (hover:hover) and (pointer:fine){.c15t-ui-trigger-BryZ5:hover{background:var(--cdt-bg-hover);box-shadow:var(--cdt-shadow-hover)}}.c15t-ui-trigger-BryZ5:active,.c15t-ui-trigger-BryZ5.c15t-ui-dragging-HLEr2{cursor:grabbing;transform:scale(1.02)}.c15t-ui-trigger-BryZ5:focus{outline:none}.c15t-ui-trigger-BryZ5:focus-visible{outline:2px solid var(--cdt-focus-ring);outline-offset:2px}.c15t-ui-sm-meEur{width:var(--cdt-size-sm);height:var(--cdt-size-sm)}.c15t-ui-md-lnKl5{width:var(--cdt-size-md);height:var(--cdt-size-md)}.c15t-ui-lg-vVljq{width:var(--cdt-size-lg);height:var(--cdt-size-lg)}.c15t-ui-icon-QeBf0{width:50%;height:50%;color:var(--cdt-icon-color);pointer-events:none;flex-shrink:0;justify-content:center;align-items:center;display:flex}.c15t-ui-icon-QeBf0 svg{width:100%;height:100%}.c15t-ui-text-Q2Rdp{margin-left:var(--c15t-space-xs,6px);font-family:var(--c15t-font-family,system-ui,sans-serif);font-size:var(--c15t-font-size-sm,14px);font-weight:var(--c15t-font-weight-medium,500);color:var(--cdt-icon-color);white-space:nowrap;pointer-events:none;line-height:1}.c15t-ui-trigger-BryZ5:has(.c15t-ui-text-Q2Rdp){width:auto;height:auto;padding:var(--c15t-space-sm,8px)var(--c15t-space-md,16px);border-radius:var(--c15t-radius-lg,12px);gap:var(--c15t-space-xs,6px)}.c15t-ui-trigger-BryZ5:has(.c15t-ui-text-Q2Rdp) .c15t-ui-icon-QeBf0{width:16px;height:16px}.c15t-ui-trigger-BryZ5:has(.c15t-ui-text-Q2Rdp).c15t-ui-sm-meEur{padding:var(--c15t-space-xs,6px)var(--c15t-space-sm,10px)}.c15t-ui-trigger-BryZ5:has(.c15t-ui-text-Q2Rdp).c15t-ui-sm-meEur .c15t-ui-icon-QeBf0{width:14px;height:14px}.c15t-ui-trigger-BryZ5:has(.c15t-ui-text-Q2Rdp).c15t-ui-sm-meEur .c15t-ui-text-Q2Rdp{font-size:var(--c15t-font-size-xs,12px)}.c15t-ui-trigger-BryZ5:has(.c15t-ui-text-Q2Rdp).c15t-ui-lg-vVljq{padding:var(--c15t-space-md,12px)var(--c15t-space-lg,20px)}.c15t-ui-trigger-BryZ5:has(.c15t-ui-text-Q2Rdp).c15t-ui-lg-vVljq .c15t-ui-icon-QeBf0{width:20px;height:20px}.c15t-ui-trigger-BryZ5:has(.c15t-ui-text-Q2Rdp).c15t-ui-lg-vVljq .c15t-ui-text-Q2Rdp{font-size:var(--c15t-font-size-md,16px)}.c15t-ui-bottomRight-uY0Me{right:var(--cdt-offset);bottom:var(--cdt-offset)}.c15t-ui-bottomLeft-w0x9m{bottom:var(--cdt-offset);left:var(--cdt-offset)}.c15t-ui-topRight-yHVfA{top:var(--cdt-offset);right:var(--cdt-offset)}.c15t-ui-topLeft-wGrIZ{top:var(--cdt-offset);left:var(--cdt-offset)}.c15t-ui-snapping-dPWx_{transition:top var(--cdt-snap-duration)var(--cdt-snap-easing),right var(--cdt-snap-duration)var(--cdt-snap-easing),bottom var(--cdt-snap-duration)var(--cdt-snap-easing),left var(--cdt-snap-duration)var(--cdt-snap-easing),transform var(--cdt-snap-duration)var(--cdt-snap-easing)}.c15t-ui-hidden-QnkHi{display:none}.c15t-dark .c15t-ui-trigger-BryZ5{--cdt-bg:var(--c15t-surface,#262626);--cdt-bg-hover:var(--c15t-surface-hover,#404040);--cdt-border:var(--c15t-border,#404040);--cdt-icon-color:var(--c15t-text,#fafafa);--cdt-shadow:0 10px 15px -3px #0000004d,0 4px 6px -4px #0000004d;--cdt-shadow-hover:0 20px 25px -5px #0006,0 8px 10px -6px #0006}@media (prefers-reduced-motion:reduce){.c15t-ui-trigger-BryZ5,.c15t-ui-snapping-dPWx_{transition:none}}',
					'',
				]),
					(s.locals = {
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
				let c = s;
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'(
				e
			) {
				e.exports = function (t) {
					var o = [];
					return (
						(o.toString = function () {
							return this.map(function (r) {
								var n = '',
									i = r[5] !== void 0;
								return (
									r[4] && (n += '@supports ('.concat(r[4], ') {')),
									r[2] && (n += '@media '.concat(r[2], ' {')),
									i &&
										(n += '@layer'.concat(
											r[5].length > 0 ? ' '.concat(r[5]) : '',
											' {'
										)),
									(n += t(r)),
									i && (n += '}'),
									r[2] && (n += '}'),
									r[4] && (n += '}'),
									n
								);
							}).join('');
						}),
						(o.i = function (r, n, i, s, c) {
							typeof r == 'string' && (r = [[null, r, void 0]]);
							var u = {};
							if (i)
								for (var d = 0; d < this.length; d++) {
									var m = this[d][0];
									m != null && (u[m] = !0);
								}
							for (var p = 0; p < r.length; p++) {
								var l = [].concat(r[p]);
								(i && u[l[0]]) ||
									(c !== void 0 &&
										(l[5] === void 0 ||
											(l[1] = '@layer'
												.concat(l[5].length > 0 ? ' '.concat(l[5]) : '', ' {')
												.concat(l[1], '}')),
										(l[5] = c)),
									n &&
										(l[2] &&
											(l[1] = '@media '.concat(l[2], ' {').concat(l[1], '}')),
										(l[2] = n)),
									s &&
										(l[4]
											? ((l[1] = '@supports ('
													.concat(l[4], ') {')
													.concat(l[1], '}')),
												(l[4] = s))
											: (l[4] = ''.concat(s))),
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
				function o(n) {
					for (var i = -1, s = 0; s < t.length; s++)
						if (t[s].identifier === n) {
							i = s;
							break;
						}
					return i;
				}
				function r(n, i) {
					for (var s = {}, c = [], u = 0; u < n.length; u++) {
						var d = n[u],
							m = i.base ? d[0] + i.base : d[0],
							p = s[m] || 0,
							l = ''.concat(m, ' ').concat(p);
						s[m] = p + 1;
						var b = o(l),
							y = {
								css: d[1],
								media: d[2],
								sourceMap: d[3],
								supports: d[4],
								layer: d[5],
							};
						if (b !== -1) t[b].references++, t[b].updater(y);
						else {
							var k = (function (h, v) {
								var C = v.domAPI(v);
								return (
									C.update(h),
									function (g) {
										g
											? (g.css !== h.css ||
													g.media !== h.media ||
													g.sourceMap !== h.sourceMap ||
													g.supports !== h.supports ||
													g.layer !== h.layer) &&
												C.update((h = g))
											: C.remove();
									}
								);
							})(y, i);
							(i.byIndex = u),
								t.splice(u, 0, { identifier: l, updater: k, references: 1 });
						}
						c.push(l);
					}
					return c;
				}
				e.exports = function (n, i) {
					var s = r((n = n || []), (i = i || {}));
					return function (c) {
						c = c || [];
						for (var u = 0; u < s.length; u++) {
							var d = o(s[u]);
							t[d].references--;
						}
						for (var m = r(c, i), p = 0; p < s.length; p++) {
							var l = o(s[p]);
							t[l].references === 0 && (t[l].updater(), t.splice(l, 1));
						}
						s = m;
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'(
				e
			) {
				var t = {};
				e.exports = function (o, r) {
					var n = (function (i) {
						if (t[i] === void 0) {
							var s = document.querySelector(i);
							if (
								window.HTMLIFrameElement &&
								s instanceof window.HTMLIFrameElement
							)
								try {
									s = s.contentDocument.head;
								} catch {
									s = null;
								}
							t[i] = s;
						}
						return t[i];
					})(o);
					if (!n)
						throw Error(
							"Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid."
						);
					n.appendChild(r);
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
				e.exports = function (r) {
					var n = o.nc;
					n && r.setAttribute('nonce', n);
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
						update: function (r) {
							var n, i, s;
							(n = ''),
								r.supports && (n += '@supports ('.concat(r.supports, ') {')),
								r.media && (n += '@media '.concat(r.media, ' {')),
								(i = r.layer !== void 0) &&
									(n += '@layer'.concat(
										r.layer.length > 0 ? ' '.concat(r.layer) : '',
										' {'
									)),
								(n += r.css),
								i && (n += '}'),
								r.media && (n += '}'),
								r.supports && (n += '}'),
								(s = r.sourceMap) &&
									typeof btoa < 'u' &&
									(n += `
/*# sourceMappingURL=data:application/json;base64,`.concat(
										btoa(unescape(encodeURIComponent(JSON.stringify(s)))),
										' */'
									)),
								t.styleTagTransform(n, o, t.options);
						},
						remove: function () {
							var r;
							(r = o).parentNode === null || r.parentNode.removeChild(r);
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
		Wi = {};
	function se(e) {
		var t = Wi[e];
		if (t !== void 0) return t.exports;
		var o = (Wi[e] = { id: e, exports: {} });
		return sl[e](o, o.exports, se), o.exports;
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
	var al = se(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'
		),
		cl = se.n(al),
		ll = se(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'
		),
		dl = se.n(ll),
		ul = se(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'
		),
		pl = se.n(ul),
		ml = se(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'
		),
		fl = se.n(ml),
		gl = se(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'
		),
		bl = se.n(gl),
		hl = se(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'
		),
		vl = se.n(hl),
		mo = se(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/components/consent-dialog-trigger.module.css'
		),
		bt = {};
	(bt.styleTagTransform = vl()),
		(bt.setAttributes = fl()),
		(bt.insert = pl().bind(null, 'head')),
		(bt.domAPI = dl()),
		(bt.insertStyleElement = bl()),
		cl()(mo.A, bt);
	var he = mo.A && mo.A.locals ? mo.A.locals : void 0;
	function Ki(e = {}) {
		let {
				defaultPosition: t = 'bottom-right',
				persistPosition: o = !0,
				onPositionChange: r,
			} = e,
			[n, i] = L(() => {
				if (o && typeof window < 'u') {
					let x = vi();
					if (x) return x;
				}
				return t;
			}),
			[s, c] = L(Qt),
			[u, d] = L(!1),
			m = z(!1),
			p = z(null),
			l = z(0),
			b = G(
				(x) => {
					i(x), o && hi(x), r?.(x);
				},
				[o, r]
			),
			y = G((x) => {
				x.button === 0 &&
					(x.target.setPointerCapture(x.pointerId),
					(p.current = x.target),
					(m.current = !1),
					(l.current = Date.now()),
					c({
						isDragging: !0,
						startX: x.clientX,
						startY: x.clientY,
						currentX: x.clientX,
						currentY: x.clientY,
					}),
					d(!1));
			}, []),
			k = G((x) => {
				c((V) => {
					if (!V.isDragging) return V;
					let w = Math.abs(x.clientX - V.startX),
						I = Math.abs(x.clientY - V.startY);
					return (
						(w > 5 || I > 5) && (m.current = !0),
						{ ...V, currentX: x.clientX, currentY: x.clientY }
					);
				});
			}, []),
			h = G(
				(x) => {
					p.current && p.current.releasePointerCapture(x.pointerId),
						c((V) => {
							if (!V.isDragging) return V;
							if (m.current) {
								let w = x.clientX - V.startX,
									I = x.clientY - V.startY,
									j = Date.now() - l.current,
									E = bi(n, w, I, {
										velocityX: j > 0 ? w / j : 0,
										velocityY: j > 0 ? I / j : 0,
									});
								E !== n && (d(!0), setTimeout(() => d(!1), 300), b(E));
							}
							return Qt();
						});
				},
				[n, b]
			),
			v = G((x) => {
				p.current && p.current.releasePointerCapture(x.pointerId), c(Qt());
			}, []),
			C = s.isDragging
				? {
						transform: `translate(${s.currentX - s.startX}px, ${s.currentY - s.startY}px)`,
						transition: 'none',
					}
				: {},
			g = G(() => m.current, []);
		return {
			corner: n,
			isDragging: s.isDragging,
			isSnapping: u,
			wasDragged: g,
			handlers: {
				onPointerDown: y,
				onPointerMove: k,
				onPointerUp: h,
				onPointerCancel: v,
			},
			dragStyle: C,
		};
	}
	var Yi = ue(null);
	function ht() {
		let e = fe(Yi);
		if (!e)
			throw Error(
				'ConsentDialogTrigger components must be used within a ConsentDialogTrigger.Root'
			);
		return e;
	}
	function Lt({
		children: e,
		defaultPosition: t = 'bottom-right',
		persistPosition: o = !0,
		showWhen: r = 'after-consent',
		onPositionChange: n,
		onClick: i,
	}) {
		let { branding: s, activeUI: c, setActiveUI: u, hasConsented: d } = W(),
			{
				corner: m,
				isDragging: p,
				isSnapping: l,
				wasDragged: b,
				handlers: y,
				dragStyle: k,
			} = Ki({ defaultPosition: t, persistPosition: o, onPositionChange: n }),
			[h, v] = L(!1);
		M(() => (v(!0), () => v(!1)), []);
		let C = r !== 'never' && (r !== 'after-consent' || d()) && c === 'none';
		return h && C
			? Le(
					a(Yi.Provider, {
						value: {
							corner: m,
							isDragging: p,
							isSnapping: l,
							wasDragged: b,
							handlers: y,
							dragStyle: k,
							branding: s,
							openDialog: () => {
								i?.(), u('dialog');
							},
							isVisible: C,
						},
						children: e,
					}),
					document.body
				)
			: null;
	}
	Lt.displayName = 'ConsentDialogTrigger.Root';
	var yl = {
			'bottom-right': he.bottomRight,
			'bottom-left': he.bottomLeft,
			'top-right': he.topRight,
			'top-left': he.topLeft,
		},
		Cl = { sm: he.sm, md: he.md, lg: he.lg },
		Nt = T(
			(
				{
					children: e,
					size: t = 'md',
					ariaLabel: o = 'Open privacy settings',
					className: r,
					noStyle: n = !1,
				},
				i
			) => {
				let {
						corner: s,
						isDragging: c,
						isSnapping: u,
						wasDragged: d,
						handlers: m,
						dragStyle: p,
						openDialog: l,
					} = ht(),
					b = () => {
						d() || l();
					};
				return a('button', {
					ref: i,
					type: 'button',
					className: n
						? r
						: [he.trigger, yl[s], Cl[t], c && he.dragging, u && he.snapping, r]
								.filter(Boolean)
								.join(' '),
					'aria-label': o,
					onClick: b,
					onKeyDown: (y) => {
						(y.key === 'Enter' || y.key === ' ') && (y.preventDefault(), b());
					},
					style: p,
					...m,
					children: e,
				});
			}
		);
	Nt.displayName = 'ConsentDialogTrigger.Button';
	function At({ icon: e = 'branding', className: t, noStyle: o = !1 }) {
		let r,
			{ branding: n } = ht(),
			i = o ? t : [he.icon, t].filter(Boolean).join(' ');
		if (le(e)) return a('span', { className: i, children: e });
		switch (e) {
			case 'fingerprint':
				r = a(qi, {});
				break;
			case 'settings':
				r = a(Gi, {});
				break;
			default:
				r = n === 'consent' ? a(po, {}) : a(zi, {});
		}
		return a('span', { className: i, children: r });
	}
	At.displayName = 'ConsentDialogTrigger.Icon';
	function fo({ children: e, className: t, noStyle: o = !1 }) {
		return a('span', {
			className: o ? t : [he.text, t].filter(Boolean).join(' '),
			children: e,
		});
	}
	fo.displayName = 'ConsentDialogTrigger.Text';
	function Xi({
		icon: e = 'branding',
		defaultPosition: t = 'bottom-right',
		persistPosition: o = !0,
		ariaLabel: r = 'Open privacy settings',
		showWhen: n = 'always',
		size: i = 'md',
		className: s,
		noStyle: c = !1,
		onClick: u,
		onPositionChange: d,
	}) {
		return a(Lt, {
			defaultPosition: t,
			persistPosition: o,
			showWhen: n,
			onClick: u,
			onPositionChange: d,
			children: a(Nt, {
				size: i,
				ariaLabel: r,
				className: s,
				noStyle: c,
				children: a(At, { icon: e, noStyle: c }),
			}),
		});
	}
	Xi.displayName = 'ConsentDialogTrigger';
	var ur = Object.assign(Xi, { Root: Lt, Button: Nt, Icon: At, Text: fo });
	var kl = {
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/components/iab-consent-banner.module.css'(
				e,
				t,
				o
			) {
				o.d(t, { A: () => c });
				var r = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'
					),
					n = o.n(r),
					i = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'
					),
					s = o.n(i)()(n());
				s.push([
					e.id,
					':root{--iab-consent-banner-font-family:var(--c15t-font-family);--iab-consent-banner-line-height:var(--c15t-line-height-normal);--iab-consent-banner-text-size-adjust:100%;--iab-consent-banner-tab-size:4;--iab-consent-banner-border-radius-sm:var(--c15t-radius-sm);--iab-consent-banner-border-radius:var(--c15t-radius-lg);--iab-consent-banner-max-width:560px;--iab-consent-banner-animation-duration:var(--c15t-duration-normal);--iab-consent-banner-animation-timing:var(--c15t-easing);--iab-consent-banner-entry-animation:c15t-ui-iabConsentBannerEnter-Pe3nZ var(--c15t-duration-fast)var(--c15t-easing);--iab-consent-banner-exit-animation:c15t-ui-iabConsentBannerExit-saqVJ var(--c15t-duration-fast)var(--c15t-easing);--iab-consent-banner-border-width:1px;--iab-consent-banner-border-width-hairline:1px;--iab-consent-banner-shadow:var(--c15t-shadow-lg);--iab-consent-banner-shadow-dark:var(--c15t-shadow-lg);--iab-consent-banner-background-color:var(--c15t-surface);--iab-consent-banner-background-color-dark:var(--c15t-surface);--iab-consent-banner-footer-background-color:var(--c15t-surface-hover);--iab-consent-banner-footer-background-color-dark:var(--c15t-surface-hover);--iab-consent-banner-text-color:var(--c15t-text);--iab-consent-banner-text-color-dark:var(--c15t-text);--iab-consent-banner-border-color:var(--c15t-border);--iab-consent-banner-border-color-dark:var(--c15t-border);--iab-consent-banner-title-color:var(--c15t-text);--iab-consent-banner-title-color-dark:var(--c15t-text);--iab-consent-banner-description-color:var(--c15t-text-muted);--iab-consent-banner-description-color-dark:var(--c15t-text-muted);--iab-consent-banner-overlay-background-color:var(--c15t-overlay);--iab-consent-banner-overlay-background-color-dark:var(--c15t-overlay);--iab-consent-banner-link-color:var(--c15t-primary);--iab-consent-banner-link-color-dark:var(--c15t-primary)}@media only screen and (resolution>=192dpi){:root{--iab-consent-banner-border-width-hairline:.5px}}@layer components{.c15t-ui-root-ohkUO{z-index:999999998;font-family:var(--iab-consent-banner-font-family);line-height:var(--iab-consent-banner-line-height);-webkit-text-size-adjust:var(--iab-consent-banner-text-size-adjust);-webkit-font-smoothing:antialiased;tab-size:var(--iab-consent-banner-tab-size);justify-content:center;align-items:center;padding:1rem;display:flex;position:fixed;inset:0}.c15t-ui-bannerVisible-mCqjY{opacity:1;transition:opacity var(--iab-consent-banner-animation-duration)var(--iab-consent-banner-animation-timing),transform var(--iab-consent-banner-animation-duration)cubic-bezier(.34,1.56,.64,1);transform:scale(1)}.c15t-ui-bannerHidden-gf6eK{opacity:0;transition:opacity var(--iab-consent-banner-animation-duration)var(--iab-consent-banner-animation-timing),transform var(--iab-consent-banner-animation-duration)var(--iab-consent-banner-animation-timing);transform:scale(.95)}@media (width>=640px){.c15t-ui-root-ohkUO{padding:1.5rem}}.c15t-ui-card-UZXwa{width:min(100%,var(--iab-consent-banner-max-width));border-radius:var(--iab-consent-banner-border-radius);border-width:var(--iab-consent-banner-border-width);border-style:solid;border-color:var(--iab-consent-banner-border-color);background-color:var(--iab-consent-banner-background-color);box-shadow:var(--iab-consent-banner-shadow);position:relative;overflow:hidden}.c15t-dark .c15t-ui-card-UZXwa{background-color:var(--iab-consent-banner-background-color-dark);border-color:var(--iab-consent-banner-border-color-dark);box-shadow:var(--iab-consent-banner-shadow-dark)}.c15t-ui-card-UZXwa[data-state=open]{animation:var(--iab-consent-banner-entry-animation)}.c15t-ui-card-UZXwa[data-state=closed]{animation:var(--iab-consent-banner-exit-animation)}.c15t-ui-card-UZXwa>:not([hidden])~:not([hidden]){border-top-width:var(--iab-consent-banner-border-width);border-top-style:solid;border-color:var(--iab-consent-banner-border-color)}.c15t-dark .c15t-ui-card-UZXwa>:not([hidden])~:not([hidden]){border-color:var(--iab-consent-banner-border-color-dark)}.c15t-ui-card-UZXwa:focus{outline-offset:2px;outline:none}@keyframes c15t-ui-iabConsentBannerEnter-Pe3nZ{0%{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}@keyframes c15t-ui-iabConsentBannerExit-saqVJ{0%{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(.95)}}.c15t-ui-header-vZPUf{color:var(--iab-consent-banner-text-color);flex-direction:column;gap:.5rem;padding:1.25rem;display:flex}.c15t-dark .c15t-ui-header-vZPUf{color:var(--iab-consent-banner-text-color-dark)}@media (width>=640px){.c15t-ui-header-vZPUf{padding:1.5rem}}.c15t-ui-title-jG39K{letter-spacing:-.011em;color:var(--iab-consent-banner-title-color);margin:0;font-size:1.125rem;font-weight:600;line-height:1.5rem}.c15t-dark .c15t-ui-title-jG39K{color:var(--iab-consent-banner-title-color-dark)}.c15t-ui-description-zvYpT{letter-spacing:-.006em;color:var(--iab-consent-banner-description-color);margin:0;font-size:.875rem;font-weight:400;line-height:1.5}.c15t-dark .c15t-ui-description-zvYpT{color:var(--iab-consent-banner-description-color-dark)}.c15t-ui-partnersLink-Adxgr{color:var(--iab-consent-banner-link-color);cursor:pointer;font-weight:500;font-size:inherit;background:0 0;border:none;padding:0;text-decoration:none}.c15t-ui-partnersLink-Adxgr:hover{text-decoration:underline}.c15t-dark .c15t-ui-partnersLink-Adxgr{color:var(--iab-consent-banner-link-color-dark)}.c15t-ui-purposeList-uJSoO{color:var(--iab-consent-banner-description-color);margin:.5rem 0 0;padding-left:1.25rem;font-size:.875rem;line-height:1.5;list-style-type:disc}.c15t-ui-purposeList-uJSoO li{margin-bottom:.25rem}.c15t-dark .c15t-ui-purposeList-uJSoO{color:var(--iab-consent-banner-description-color-dark)}.c15t-ui-legitimateInterestNotice-yZmKl{color:var(--iab-consent-banner-description-color);margin-top:.25rem;font-size:.8125rem;line-height:1.5}.c15t-dark .c15t-ui-legitimateInterestNotice-yZmKl{color:var(--iab-consent-banner-description-color-dark)}.c15t-ui-privacyLink-sIqYI{color:var(--iab-consent-banner-link-color);cursor:pointer;font-size:inherit;background:0 0;border:none;padding:0;text-decoration:none}.c15t-ui-privacyLink-sIqYI:hover{text-decoration:underline}.c15t-dark .c15t-ui-privacyLink-sIqYI{color:var(--iab-consent-banner-link-color-dark)}.c15t-ui-footer-YMUGl{background-color:var(--iab-consent-banner-footer-background-color);flex-direction:column;justify-content:space-between;gap:.5rem;padding:.75rem 1rem;display:flex}.c15t-dark .c15t-ui-footer-YMUGl{background-color:var(--iab-consent-banner-footer-background-color-dark)}@media (width>=640px){.c15t-ui-footer-YMUGl{flex-direction:row;padding:1rem}}.c15t-ui-footerButtonGroup-WiFbg{flex-direction:row;gap:.5rem;display:flex}.c15t-ui-footerSpacer-lniRb,.c15t-ui-rejectButton-UHGRK,.c15t-ui-acceptButton-_VyN6,.c15t-ui-customizeButton-TV7Im{flex:1}@media (width>=640px){.c15t-ui-rejectButton-UHGRK,.c15t-ui-acceptButton-_VyN6,.c15t-ui-customizeButton-TV7Im{flex:none}}.c15t-ui-overlay-l1gsp{background-color:var(--iab-consent-banner-overlay-background-color);z-index:999999997;position:fixed;inset:0}.c15t-ui-overlayVisible-A4Wuk{opacity:1;transition:opacity var(--iab-consent-banner-animation-duration)var(--iab-consent-banner-animation-timing)}.c15t-ui-overlayHidden-Fawca{opacity:0;transition:opacity var(--iab-consent-banner-animation-duration)var(--iab-consent-banner-animation-timing)}.c15t-dark .c15t-ui-overlay-l1gsp{background-color:var(--iab-consent-banner-overlay-background-color-dark)}@media (prefers-reduced-motion:reduce){.c15t-ui-bannerVisible-mCqjY,.c15t-ui-bannerHidden-gf6eK,.c15t-ui-overlayVisible-A4Wuk,.c15t-ui-overlayHidden-Fawca{transition:none}.c15t-ui-card-UZXwa[data-state=open],.c15t-ui-card-UZXwa[data-state=closed]{animation:none}}}',
					'',
				]),
					(s.locals = {
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
				let c = s;
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'(
				e
			) {
				e.exports = function (t) {
					var o = [];
					return (
						(o.toString = function () {
							return this.map(function (r) {
								var n = '',
									i = r[5] !== void 0;
								return (
									r[4] && (n += '@supports ('.concat(r[4], ') {')),
									r[2] && (n += '@media '.concat(r[2], ' {')),
									i &&
										(n += '@layer'.concat(
											r[5].length > 0 ? ' '.concat(r[5]) : '',
											' {'
										)),
									(n += t(r)),
									i && (n += '}'),
									r[2] && (n += '}'),
									r[4] && (n += '}'),
									n
								);
							}).join('');
						}),
						(o.i = function (r, n, i, s, c) {
							typeof r == 'string' && (r = [[null, r, void 0]]);
							var u = {};
							if (i)
								for (var d = 0; d < this.length; d++) {
									var m = this[d][0];
									m != null && (u[m] = !0);
								}
							for (var p = 0; p < r.length; p++) {
								var l = [].concat(r[p]);
								(i && u[l[0]]) ||
									(c !== void 0 &&
										(l[5] === void 0 ||
											(l[1] = '@layer'
												.concat(l[5].length > 0 ? ' '.concat(l[5]) : '', ' {')
												.concat(l[1], '}')),
										(l[5] = c)),
									n &&
										(l[2] &&
											(l[1] = '@media '.concat(l[2], ' {').concat(l[1], '}')),
										(l[2] = n)),
									s &&
										(l[4]
											? ((l[1] = '@supports ('
													.concat(l[4], ') {')
													.concat(l[1], '}')),
												(l[4] = s))
											: (l[4] = ''.concat(s))),
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
				function o(n) {
					for (var i = -1, s = 0; s < t.length; s++)
						if (t[s].identifier === n) {
							i = s;
							break;
						}
					return i;
				}
				function r(n, i) {
					for (var s = {}, c = [], u = 0; u < n.length; u++) {
						var d = n[u],
							m = i.base ? d[0] + i.base : d[0],
							p = s[m] || 0,
							l = ''.concat(m, ' ').concat(p);
						s[m] = p + 1;
						var b = o(l),
							y = {
								css: d[1],
								media: d[2],
								sourceMap: d[3],
								supports: d[4],
								layer: d[5],
							};
						if (b !== -1) t[b].references++, t[b].updater(y);
						else {
							var k = (function (h, v) {
								var C = v.domAPI(v);
								return (
									C.update(h),
									function (g) {
										g
											? (g.css !== h.css ||
													g.media !== h.media ||
													g.sourceMap !== h.sourceMap ||
													g.supports !== h.supports ||
													g.layer !== h.layer) &&
												C.update((h = g))
											: C.remove();
									}
								);
							})(y, i);
							(i.byIndex = u),
								t.splice(u, 0, { identifier: l, updater: k, references: 1 });
						}
						c.push(l);
					}
					return c;
				}
				e.exports = function (n, i) {
					var s = r((n = n || []), (i = i || {}));
					return function (c) {
						c = c || [];
						for (var u = 0; u < s.length; u++) {
							var d = o(s[u]);
							t[d].references--;
						}
						for (var m = r(c, i), p = 0; p < s.length; p++) {
							var l = o(s[p]);
							t[l].references === 0 && (t[l].updater(), t.splice(l, 1));
						}
						s = m;
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'(
				e
			) {
				var t = {};
				e.exports = function (o, r) {
					var n = (function (i) {
						if (t[i] === void 0) {
							var s = document.querySelector(i);
							if (
								window.HTMLIFrameElement &&
								s instanceof window.HTMLIFrameElement
							)
								try {
									s = s.contentDocument.head;
								} catch {
									s = null;
								}
							t[i] = s;
						}
						return t[i];
					})(o);
					if (!n)
						throw Error(
							"Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid."
						);
					n.appendChild(r);
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
				e.exports = function (r) {
					var n = o.nc;
					n && r.setAttribute('nonce', n);
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
						update: function (r) {
							var n, i, s;
							(n = ''),
								r.supports && (n += '@supports ('.concat(r.supports, ') {')),
								r.media && (n += '@media '.concat(r.media, ' {')),
								(i = r.layer !== void 0) &&
									(n += '@layer'.concat(
										r.layer.length > 0 ? ' '.concat(r.layer) : '',
										' {'
									)),
								(n += r.css),
								i && (n += '}'),
								r.media && (n += '}'),
								r.supports && (n += '}'),
								(s = r.sourceMap) &&
									typeof btoa < 'u' &&
									(n += `
/*# sourceMappingURL=data:application/json;base64,`.concat(
										btoa(unescape(encodeURIComponent(JSON.stringify(s)))),
										' */'
									)),
								t.styleTagTransform(n, o, t.options);
						},
						remove: function () {
							var r;
							(r = o).parentNode === null || r.parentNode.removeChild(r);
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
		Zi = {};
	function ae(e) {
		var t = Zi[e];
		if (t !== void 0) return t.exports;
		var o = (Zi[e] = { id: e, exports: {} });
		return kl[e](o, o.exports, ae), o.exports;
	}
	(ae.n = (e) => {
		var t = e && e.__esModule ? () => e.default : () => e;
		return ae.d(t, { a: t }), t;
	}),
		(ae.d = (e, t) => {
			for (var o in t)
				ae.o(t, o) &&
					!ae.o(e, o) &&
					Object.defineProperty(e, o, { enumerable: !0, get: t[o] });
		}),
		(ae.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t)),
		(ae.nc = void 0);
	var xl = ae(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'
		),
		_l = ae.n(xl),
		Sl = ae(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'
		),
		wl = ae.n(Sl),
		Il = ae(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'
		),
		Rl = ae.n(Il),
		Tl = ae(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'
		),
		Ll = ae.n(Tl),
		Nl = ae(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'
		),
		Al = ae.n(Nl),
		Bl = ae(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'
		),
		El = ae.n(Bl),
		go = ae(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/components/iab-consent-banner.module.css'
		),
		vt = {};
	(vt.styleTagTransform = El()),
		(vt.setAttributes = Ll()),
		(vt.insert = Rl().bind(null, 'head')),
		(vt.domAPI = wl()),
		(vt.insertStyleElement = Al()),
		_l()(go.A, vt);
	var D = go.A && go.A.locals ? go.A.locals : void 0;
	var pr = T(({ children: e, className: t, ...o }, r) =>
		a('div', {
			ref: r,
			className: t ? `${D.footerButtonGroup} ${t}` : D.footerButtonGroup,
			...o,
			children: e,
		})
	);
	pr.displayName = 'IABConsentBannerButtonGroup';
	var mr = T(({ className: e, ...t }, o) =>
		a('div', {
			ref: o,
			className: e ? `${D.footerSpacer} ${e}` : D.footerSpacer,
			...t,
		})
	);
	mr.displayName = 'IABConsentBannerFooterSpacer';
	var fr = T(({ children: e, className: t, ...o }, r) => {
		let { trapFocus: n } = we();
		return (
			Ue(!!n, r),
			a('div', {
				ref: r,
				...Y('iabConsentBannerCard', { baseClassName: D.card, className: t }),
				tabIndex: 0,
				role: 'dialog',
				'aria-modal': n ? 'true' : void 0,
				'data-testid': 'iab-consent-banner-card',
				...o,
				children: e,
			})
		);
	});
	fr.displayName = 'IABConsentBannerCard';
	var gr = T(({ children: e, className: t, ...o }, r) =>
		a('p', {
			ref: r,
			className: t ? `${D.description} ${t}` : D.description,
			...o,
			children: e,
		})
	);
	gr.displayName = 'IABConsentBannerDescription';
	var br = T(({ children: e, className: t, ...o }, r) =>
		a('div', {
			ref: r,
			...Y('iabConsentBannerFooter', { baseClassName: D.footer, className: t }),
			'data-testid': 'iab-consent-banner-footer',
			...o,
			children: e,
		})
	);
	br.displayName = 'IABConsentBannerFooter';
	var hr = T(({ children: e, className: t, ...o }, r) =>
		a('div', {
			ref: r,
			...Y('iabConsentBannerHeader', { baseClassName: D.header, className: t }),
			'data-testid': 'iab-consent-banner-header',
			...o,
			children: e,
		})
	);
	hr.displayName = 'IABConsentBannerHeader';
	var Bt = T(({ className: e, style: t, noStyle: o, ...r }, n) => {
		let i,
			{ activeUI: s } = W(),
			{ disableAnimation: c, noStyle: u, scrollLock: d } = we(),
			[m, p] = L(!1),
			l = s === 'banner';
		M(() => {
			if (l) p(!0);
			else if (c) p(!1);
			else {
				let k = setTimeout(
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
				return () => clearTimeout(k);
			}
		}, [l, c]);
		let b = Y('iabConsentBannerOverlay', {
			baseClassName: !(u || o) && D.overlay,
			className: e,
			noStyle: u || o,
		});
		u || o || c || (i = m ? D.overlayVisible : D.overlayHidden);
		let y = He(b.className, i);
		return (
			Ve(!!(l && d)),
			l && d
				? a('div', {
						ref: n,
						...r,
						className: y,
						style: { ...b.style, ...t },
						'data-testid': 'iab-consent-banner-overlay',
					})
				: null
		);
	});
	Bt.displayName = 'IABConsentBannerOverlay';
	var bo = ({
			children: e,
			className: t,
			noStyle: o,
			disableAnimation: r,
			scrollLock: n,
			trapFocus: i = !0,
			models: s,
			uiSource: c,
			...u
		}) =>
			a(lt.Provider, {
				value: { uiSource: c ?? 'iab_banner' },
				children: a(ct.Provider, {
					value: {
						disableAnimation: r,
						noStyle: o,
						scrollLock: n,
						trapFocus: i,
					},
					children: a(Ji, {
						disableAnimation: r,
						className: t,
						noStyle: o,
						models: s,
						...u,
						children: e,
					}),
				}),
			}),
		Ji = T(
			(
				{
					children: e,
					className: t,
					style: o,
					className: r,
					disableAnimation: n,
					noStyle: i,
					models: s = ['iab'],
					...c
				},
				u
			) => {
				let { activeUI: d, translationConfig: m, model: p } = W(),
					l = dt(m.defaultLanguage),
					[b, y] = L(!1),
					[k, h] = L(!1),
					[v, C] = L(200),
					g = d === 'banner' && s.includes(p);
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
							if (k) y(!0);
							else {
								let j = setTimeout(() => {
									y(!0), h(!0);
								}, 10);
								return () => clearTimeout(j);
							}
						else if ((h(!1), n)) y(!1);
						else {
							let j = setTimeout(() => {
								y(!1);
							}, v);
							return () => clearTimeout(j);
						}
					}, [g, n, k, v]);
				let x = Y('iabConsentBanner', {
						baseClassName: [D.root],
						style: o,
						className: t || r,
						noStyle: i,
					}),
					[V, w] = L(!1);
				if (
					(M(() => {
						w(!0);
					}, []),
					!V)
				)
					return null;
				let I = i
					? x.className || ''
					: `${x.className || ''} ${b ? D.bannerVisible : D.bannerHidden}`;
				return g
					? Le(
							a(H, {
								children: [
									a(Bt, {}),
									a('div', {
										ref: u,
										...c,
										...x,
										className: I,
										'data-testid': 'iab-consent-banner-root',
										dir: l,
										children: e,
									}),
								],
							}),
							document.body
						)
					: null;
			}
		);
	Ji.displayName = 'IABConsentBannerRootChildren';
	var vr = T(({ children: e, className: t, ...o }, r) =>
		a('h2', {
			ref: r,
			className: t ? `${D.title} ${t}` : D.title,
			...o,
			children: e,
		})
	);
	vr.displayName = 'IABConsentBannerTitle';
	var ho = Pe.translations.en.iab;
	function vo(e, t) {
		if (!t) return e;
		let o = { ...e };
		for (let r of Object.keys(e)) {
			let n = e[r],
				i = t[r];
			i === void 0 ||
			typeof n != 'object' ||
			n === null ||
			typeof i != 'object' ||
			i === null ||
			Array.isArray(n)
				? i !== void 0 && (o[r] = i)
				: (o[r] = vo(n, i));
		}
		return o;
	}
	function pe() {
		let e = Ze();
		return e.iab
			? {
					banner: vo(ho.banner, e.iab.banner),
					common: vo(ho.common, e.iab.common),
					preferenceCenter: vo(ho.preferenceCenter, e.iab.preferenceCenter),
				}
			: ho;
	}
	var Qi = ({
		noStyle: e,
		disableAnimation: t,
		scrollLock: o = !0,
		trapFocus: r = !0,
		primaryButton: n = 'customize',
		models: i,
		uiSource: s,
	}) => {
		let c = pe(),
			{ iab: u, setActiveUI: d } = W(),
			m = z(null),
			p = ao({ noStyle: e, disableAnimation: t, scrollLock: o, trapFocus: r }),
			l = $(
				() =>
					u?.gvl
						? Object.keys(u.gvl.vendors).length + (u.nonIABVendors?.length ?? 0)
						: 0,
				[u?.gvl, u?.nonIABVendors]
			),
			b = $(() => {
				if (!u?.gvl) return { displayed: [], remainingCount: 0, isReady: !1 };
				let v = u.gvl,
					C = Object.entries(v.purposes)
						.filter(([A]) =>
							Object.values(v.vendors).some(
								(K) =>
									K.purposes?.includes(Number(A)) ||
									K.legIntPurposes?.includes(Number(A))
							)
						)
						.map(([A, K]) => ({ id: Number(A), name: K.name })),
					g = C.find((A) => A.id === 1),
					x = C.filter((A) => A.id !== 1),
					V = new Set(x.map((A) => A.id)),
					w = v.stacks || {},
					I = [];
				for (let [A, K] of Object.entries(w)) {
					let me = K.purposes.filter((ve) => V.has(ve));
					me.length >= 2 &&
						I.push({
							stackId: Number(A),
							name: K.name,
							coveredPurposeIds: me,
							score: me.length,
						});
				}
				I.sort((A, K) => K.score - A.score);
				let j = [],
					E = new Set();
				for (let { name: A, coveredPurposeIds: K } of I) {
					let me = K.filter((ve) => !E.has(ve));
					if (me.length >= 2) for (let ve of (j.push(A), me)) E.add(ve);
				}
				let N = x.filter((A) => !E.has(A.id)),
					_ = Object.entries(v.specialFeatures || {})
						.filter(([A]) =>
							Object.values(v.vendors).some((K) =>
								K.specialFeatures?.includes(Number(A))
							)
						)
						.map(([, A]) => A.name),
					F = [];
				for (let A of (g && F.push(g.name), j)) F.push(A);
				for (let A of N) F.push(A.name);
				for (let A of _) F.push(A);
				return {
					displayed: F.slice(0, 5),
					remainingCount: Math.max(0, F.length - 5),
					isReady: !0,
				};
			}, [u?.gvl]);
		if ((Ue(!!p.trapFocus, m), !u?.config.enabled || !b.isReady)) return null;
		let y = c.banner.description.replace('{partnerCount}', String(l)),
			k = c.banner.partnersLink.replace('{count}', String(l)),
			h = c.banner.scopeServiceSpecific;
		return a(bo, {
			...p,
			models: i,
			uiSource: s,
			children: a(xe, {
				ref: m,
				baseClassName: D.card,
				themeKey: 'iabConsentBannerCard',
				tabIndex: 0,
				role: 'dialog',
				'aria-modal': p.trapFocus ? 'true' : void 0,
				'aria-label': c.banner.title,
				'data-testid': 'iab-consent-banner-card',
				children: [
					a(xe, {
						baseClassName: D.header,
						themeKey: 'iabConsentBannerHeader',
						'data-testid': 'iab-consent-banner-header',
						children: [
							a('h2', { className: D.title, children: c.banner.title }),
							a('p', {
								className: D.description,
								children: [
									y.split(k)[0],
									a('button', {
										type: 'button',
										className: D.partnersLink,
										onClick: () => {
											u?.setPreferenceCenterTab('vendors'), d('dialog');
										},
										onMouseEnter: () => {},
										children: k,
									}),
									y.split(k)[1],
								],
							}),
							a('ul', {
								className: D.purposeList,
								children: [
									b.displayed.map((v, C) => a('li', { children: v }, C)),
									b.remainingCount > 0 &&
										a('li', {
											className: D.purposeMore,
											children: c.banner.andMore.replace(
												'{count}',
												String(b.remainingCount)
											),
										}),
								],
							}),
							a('p', {
								className: D.legitimateInterestNotice,
								children: [c.banner.legitimateInterestNotice, ' ', h],
							}),
						],
					}),
					a(xe, {
						baseClassName: D.footer,
						themeKey: 'iabConsentBannerFooter',
						'data-testid': 'iab-consent-banner-footer',
						children: [
							a('div', {
								className: D.footerButtonGroup,
								children: [
									a(_e, {
										variant: n === 'reject' ? 'primary' : 'neutral',
										mode: 'stroke',
										size: 'small',
										onClick: () => {
											u?.rejectAll(), u?.save(), d('none');
										},
										className: D.rejectButton,
										'data-testid': 'iab-consent-banner-reject-button',
										children: c.common.rejectAll,
									}),
									a(_e, {
										variant: n === 'accept' ? 'primary' : 'neutral',
										mode: n === 'accept' ? 'filled' : 'stroke',
										size: 'small',
										onClick: () => {
											u?.acceptAll(), u?.save(), d('none');
										},
										className: D.acceptButton,
										'data-testid': 'iab-consent-banner-accept-button',
										children: c.common.acceptAll,
									}),
								],
							}),
							a('div', { className: D.footerSpacer }),
							a(_e, {
								variant: n === 'customize' ? 'primary' : 'neutral',
								mode: n === 'customize' ? 'filled' : 'stroke',
								size: 'small',
								onClick: () => {
									u?.setPreferenceCenterTab('purposes'), d('dialog');
								},
								className: D.customizeButton,
								'data-testid': 'iab-consent-banner-customize-button',
								children: c.common.customize,
							}),
						],
					}),
				],
			}),
		});
	};
	var yr = Object.assign(Qi, {
		Root: bo,
		Card: fr,
		Header: hr,
		Title: vr,
		Description: gr,
		Footer: br,
		ButtonGroup: pr,
		FooterSpacer: mr,
		Overlay: Bt,
	});
	var Pl = {
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/components/iab-consent-dialog.module.css'(
				e,
				t,
				o
			) {
				o.d(t, { A: () => c });
				var r = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'
					),
					n = o.n(r),
					i = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'
					),
					s = o.n(i)()(n());
				s.push([
					e.id,
					':root{--iab-cd-font-family:var(--c15t-font-family);--iab-cd-line-height:var(--c15t-line-height-tight);--iab-cd-title-font-size:1.125rem;--iab-cd-title-font-weight:var(--c15t-font-weight-semibold);--iab-cd-description-font-size:.75rem;--iab-cd-description-line-height:var(--c15t-line-height-normal);--iab-cd-background-color:var(--c15t-surface);--iab-cd-background-color-dark:var(--c15t-surface);--iab-cd-text-color:var(--c15t-text);--iab-cd-text-color-dark:var(--c15t-text);--iab-cd-text-muted-color:var(--c15t-text-muted);--iab-cd-text-muted-color-dark:var(--c15t-text-muted);--iab-cd-border-color:var(--c15t-border);--iab-cd-border-color-dark:var(--c15t-border);--iab-cd-overlay-background:var(--c15t-overlay);--iab-cd-overlay-background-dark:var(--c15t-overlay);--iab-cd-primary-color:var(--c15t-primary);--iab-cd-primary-color-dark:var(--c15t-primary);--iab-cd-surface-hover:var(--c15t-surface-hover);--iab-cd-surface-hover-dark:var(--c15t-surface-hover);--iab-cd-max-width:48rem;--iab-cd-max-height:85vh;--iab-cd-border-radius:var(--c15t-radius-lg);--iab-cd-z-index:1000000000;--iab-cd-overlay-z-index:1000000000;--iab-cd-padding:var(--c15t-space-md);--iab-cd-padding-sm:var(--c15t-space-sm);--iab-cd-gap:var(--c15t-space-sm);--iab-cd-animation-duration:.15s;--iab-cd-animation-timing:ease-out;--iab-cd-shadow:var(--c15t-shadow-xl)}@layer components{.c15t-ui-root-oQ3Q4{isolation:isolate;font-family:var(--iab-cd-font-family);line-height:var(--iab-cd-line-height);-webkit-text-size-adjust:100%;tab-size:4;padding:var(--iab-cd-padding);z-index:var(--iab-cd-z-index);background:0 0;border:0;justify-content:center;align-items:center;margin:0;display:flex;position:fixed;inset:0}.c15t-ui-dialogVisible-PUG1v{opacity:1;transition:opacity var(--iab-cd-animation-duration)var(--iab-cd-animation-timing)}.c15t-ui-dialogHidden-FoTkw{opacity:0;transition:opacity var(--iab-cd-animation-duration)var(--iab-cd-animation-timing)}.c15t-ui-contentVisible-G8YSA{opacity:1;transition:opacity var(--iab-cd-animation-duration)var(--iab-cd-animation-timing),transform var(--iab-cd-animation-duration)cubic-bezier(.34,1.56,.64,1);transform:scale(1)}.c15t-ui-contentHidden-iYnZI{opacity:0;transition:opacity var(--iab-cd-animation-duration)var(--iab-cd-animation-timing),transform var(--iab-cd-animation-duration)var(--iab-cd-animation-timing);transform:scale(.95)}.c15t-ui-overlay-h1Tzu{background-color:var(--iab-cd-overlay-background);z-index:var(--iab-cd-overlay-z-index);position:fixed;inset:0}.c15t-ui-overlayVisible-HizR9{opacity:1;transition:opacity var(--iab-cd-animation-duration)var(--iab-cd-animation-timing)}.c15t-ui-overlayHidden-IFPwA{opacity:0;transition:opacity var(--iab-cd-animation-duration)var(--iab-cd-animation-timing)}.c15t-dark .c15t-ui-overlay-h1Tzu{background-color:var(--iab-cd-overlay-background-dark)}.c15t-ui-card-iVcxY{width:min(100%,var(--iab-cd-max-width));max-height:var(--iab-cd-max-height);border-radius:var(--iab-cd-border-radius);border:1px solid var(--iab-cd-border-color);background-color:var(--iab-cd-background-color);box-shadow:var(--iab-cd-shadow);flex-direction:column;display:flex;overflow:hidden}.c15t-dark .c15t-ui-card-iVcxY{background-color:var(--iab-cd-background-color-dark);border-color:var(--iab-cd-border-color-dark)}.c15t-ui-header-q_v_l{border-bottom:1px solid var(--iab-cd-border-color);flex-shrink:0;justify-content:space-between;align-items:center;padding:.75rem 1rem;display:flex}.c15t-dark .c15t-ui-header-q_v_l{border-color:var(--iab-cd-border-color-dark)}@media (width>=768px){.c15t-ui-header-q_v_l{padding:1rem}}.c15t-ui-headerContent-BVSE_{flex:1}.c15t-ui-title-Rrshj{font-size:var(--iab-cd-title-font-size);font-weight:var(--iab-cd-title-font-weight);color:var(--iab-cd-text-color);margin:0;line-height:1.25}.c15t-dark .c15t-ui-title-Rrshj{color:var(--iab-cd-text-color-dark)}.c15t-ui-description-wjYno{font-size:var(--iab-cd-description-font-size);color:var(--iab-cd-text-muted-color);line-height:var(--iab-cd-description-line-height);margin:.25rem 0 0}.c15t-dark .c15t-ui-description-wjYno{color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-closeButton-wGCHD{border-radius:var(--c15t-radius-md);cursor:pointer;color:var(--iab-cd-text-muted-color);background:0 0;border:none;justify-content:center;align-items:center;padding:.375rem;transition:background-color .15s;display:flex}.c15t-ui-closeButton-wGCHD:hover{background-color:var(--iab-cd-surface-hover)}.c15t-dark .c15t-ui-closeButton-wGCHD{color:var(--iab-cd-text-muted-color-dark)}.c15t-dark .c15t-ui-closeButton-wGCHD:hover{background-color:var(--iab-cd-surface-hover-dark)}.c15t-ui-tabsContainer-aTkFk{flex-shrink:0;padding:.75rem .75rem 0}@media (width>=768px){.c15t-ui-tabsContainer-aTkFk{padding:1rem 1rem 0}}.c15t-ui-tabsList-BI6D3{isolation:isolate;border-radius:var(--c15t-radius-lg,.625rem);background-color:var(--iab-cd-surface-hover);grid-auto-columns:1fr;grid-auto-flow:column;gap:.25rem;padding:.25rem;display:grid;position:relative}.c15t-dark .c15t-ui-tabsList-BI6D3{background-color:var(--iab-cd-surface-hover-dark)}.c15t-ui-tabButton-xZKks{z-index:10;white-space:nowrap;border-radius:var(--c15t-radius-md,.375rem);height:2rem;color:var(--iab-cd-text-muted-color);cursor:pointer;background:0 0;border:none;outline:none;justify-content:center;align-items:center;gap:.375rem;padding:0 .75rem;font-size:.8125rem;font-weight:500;transition:color .2s cubic-bezier(.33,1,.68,1),background-color .2s cubic-bezier(.33,1,.68,1);display:flex;position:relative}.c15t-ui-tabButton-xZKks:hover{color:var(--iab-cd-text-color)}.c15t-ui-tabButton-xZKks:focus-visible{outline:2px solid var(--iab-cd-primary-color);outline-offset:2px}.c15t-ui-tabButton-xZKks[data-state=active]{color:var(--iab-cd-text-color)}.c15t-dark .c15t-ui-tabButton-xZKks{color:var(--iab-cd-text-muted-color-dark)}.c15t-dark .c15t-ui-tabButton-xZKks:hover{color:var(--iab-cd-text-color-dark)}.c15t-dark .c15t-ui-tabButton-xZKks[data-state=active]{color:var(--iab-cd-text-color-dark)}.c15t-ui-tabIndicator-bGaYj{z-index:0;border-radius:var(--c15t-radius-md,.375rem);background-color:var(--iab-cd-background-color);transition:transform .3s cubic-bezier(.65,0,.35,1),width .3s cubic-bezier(.65,0,.35,1);position:absolute;inset-block:.25rem;box-shadow:0 1px 2px #0000000f,0 1px 3px #0000001a}.c15t-dark .c15t-ui-tabIndicator-bGaYj{background-color:var(--iab-cd-background-color-dark);box-shadow:0 1px 2px #0003,0 1px 3px #0000004d}.c15t-ui-tabIndicator-bGaYj[data-active-tab=purposes]{width:calc(50% - .125rem);left:.25rem;transform:translate(0)}.c15t-ui-tabIndicator-bGaYj[data-active-tab=vendors]{width:calc(50% - .125rem);left:.125rem;transform:translate(100%)}.c15t-ui-content-HHYIK{flex:auto;padding:.75rem;overflow-y:auto}@media (width>=768px){.c15t-ui-content-HHYIK{padding:1rem}}.c15t-ui-purposeItem-bTIsY{border-radius:var(--c15t-radius-md);border:1px solid var(--iab-cd-border-color);background-color:var(--iab-cd-background-color);margin-bottom:.5rem}.c15t-dark .c15t-ui-purposeItem-bTIsY{border-color:var(--iab-cd-border-color-dark);background-color:var(--iab-cd-background-color-dark)}.c15t-ui-purposeHeader-foPCp{justify-content:space-between;align-items:flex-start;gap:.75rem;padding:.75rem;display:flex}.c15t-ui-purposeTrigger-cB3th{text-align:left;cursor:pointer;background:0 0;border:none;flex:1;align-items:center;gap:.5rem;min-width:0;padding:0;display:flex}.c15t-ui-purposeArrow-oJXon{width:1rem;height:1rem;color:var(--iab-cd-text-muted-color);flex-shrink:0}.c15t-dark .c15t-ui-purposeArrow-oJXon{color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-purposeInfo-liE3b{flex:1;min-width:0}.c15t-ui-purposeName-zDAD_{color:var(--iab-cd-text-color);align-items:center;gap:.5rem;margin:0;font-size:.875rem;font-weight:500;display:flex}.c15t-dark .c15t-ui-purposeName-zDAD_{color:var(--iab-cd-text-color-dark)}.c15t-ui-lockIcon-G9Bb9{width:.75rem;height:.75rem;color:var(--iab-cd-text-muted-color)}.c15t-dark .c15t-ui-lockIcon-G9Bb9{color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-purposeMeta-jIesh{color:var(--iab-cd-text-muted-color);margin:.125rem 0 0;font-size:.75rem}.c15t-dark .c15t-ui-purposeMeta-jIesh{color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-legitimateInterestBadge-eFgxM{color:var(--iab-cd-text-muted-color);align-items:center;gap:.25rem;margin-top:.25rem;font-size:.625rem;font-weight:500;display:inline-flex}.c15t-ui-legitimateInterestIcon-MdoA6{width:.75rem;height:.75rem}.c15t-ui-purposeContent-ufSwo{border-top:1px solid var(--iab-cd-border-color);margin-top:.75rem;padding:.75rem}.c15t-dark .c15t-ui-purposeContent-ufSwo{border-color:var(--iab-cd-border-color-dark)}.c15t-ui-purposeDescription-TlhAc{color:var(--iab-cd-text-muted-color);margin:0;font-size:.75rem;line-height:1.5}.c15t-dark .c15t-ui-purposeDescription-TlhAc{color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-examplesToggle-sX0IF{color:var(--iab-cd-text-color);cursor:pointer;background:0 0;border:none;align-items:center;gap:.25rem;margin-top:.75rem;padding:0;font-size:.75rem;font-weight:500;display:flex}.c15t-ui-examplesToggle-sX0IF:hover{color:var(--iab-cd-primary-color)}.c15t-dark .c15t-ui-examplesToggle-sX0IF{color:var(--iab-cd-text-color-dark)}.c15t-dark .c15t-ui-examplesToggle-sX0IF:hover{color:var(--iab-cd-primary-color-dark)}.c15t-ui-examplesList-zB8Gu{margin:.375rem 0 0;padding-left:1rem;list-style-type:disc}.c15t-ui-examplesList-zB8Gu li{color:var(--iab-cd-text-muted-color);font-size:.75rem;line-height:1.5}.c15t-dark .c15t-ui-examplesList-zB8Gu li{color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-vendorsToggle-uCSbo{color:var(--iab-cd-text-color);cursor:pointer;background:0 0;border:none;align-items:center;gap:.25rem;margin-top:.75rem;padding:0;font-size:.75rem;font-weight:500;display:flex}.c15t-ui-vendorsToggle-uCSbo:hover{color:var(--iab-cd-primary-color)}.c15t-dark .c15t-ui-vendorsToggle-uCSbo{color:var(--iab-cd-text-color-dark)}.c15t-ui-vendorSection-jLX4W{z-index:1;margin-top:.375rem;position:relative}.c15t-ui-vendorSectionTitle-ucQyu{color:var(--iab-cd-text-muted-color);text-transform:uppercase;letter-spacing:.05em;margin:.5rem 0 .375rem;font-size:.625rem;font-weight:500}.c15t-dark .c15t-ui-vendorSectionTitle-ucQyu{color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-vendorSectionTitleLI-D_m3R{color:var(--iab-cd-text-muted-color);align-items:center;gap:.25rem;display:flex}.c15t-ui-vendorRow-ynEOC{border-radius:var(--c15t-radius-sm);background-color:var(--iab-cd-surface-hover);justify-content:space-between;align-items:center;gap:.5rem;margin-bottom:.375rem;padding:.5rem;display:flex}.c15t-dark .c15t-ui-vendorRow-ynEOC{background-color:var(--iab-cd-surface-hover-dark)}.c15t-ui-vendorRowLI-j9Z37{background-color:var(--iab-cd-surface-hover);border:1px solid var(--iab-cd-border-color)}.c15t-ui-vendorInfo-SzGWD{flex:1;min-width:0}.c15t-ui-vendorName-PyL1i{color:var(--iab-cd-text-color);cursor:pointer;text-align:left;background:0 0;border:none;align-items:center;gap:.375rem;padding:0;font-size:.75rem;font-weight:500;display:flex}.c15t-ui-vendorName-PyL1i:hover{color:var(--iab-cd-primary-color)}.c15t-dark .c15t-ui-vendorName-PyL1i{color:var(--iab-cd-text-color-dark)}.c15t-ui-customVendorIcon-W8oJg{width:.75rem;height:.75rem;color:var(--iab-cd-primary-color)}.c15t-dark .c15t-ui-customVendorIcon-W8oJg{color:var(--iab-cd-primary-color-dark)}.c15t-ui-vendorDetails-Ou6m6{flex-wrap:wrap;gap:.5rem;margin-top:.125rem;display:flex}.c15t-ui-vendorDetail-lOMDC{color:var(--iab-cd-text-muted-color);font-size:.625rem}.c15t-dark .c15t-ui-vendorDetail-lOMDC{color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-vendorDetailLI-NNcid{color:var(--iab-cd-text-muted-color);font-weight:500}.c15t-ui-stackItem-VcXtI{border-radius:var(--c15t-radius-md);border:1px solid var(--iab-cd-border-color);background-color:var(--iab-cd-background-color);margin-bottom:.5rem}.c15t-dark .c15t-ui-stackItem-VcXtI{border-color:var(--iab-cd-border-color-dark);background-color:var(--iab-cd-background-color-dark)}.c15t-ui-stackHeader-RZahv{justify-content:space-between;align-items:flex-start;gap:.75rem;padding:.75rem;display:flex}.c15t-ui-stackTrigger-JqLyX{text-align:left;cursor:pointer;background:0 0;border:none;flex:1;align-items:center;gap:.5rem;min-width:0;padding:0;display:flex}.c15t-ui-stackInfo-s7JaD{flex:1;min-width:0}.c15t-ui-stackName-cYp1z{color:var(--iab-cd-text-color);margin:0;font-size:.875rem;font-weight:500;line-height:1.25}.c15t-dark .c15t-ui-stackName-cYp1z{color:var(--iab-cd-text-color-dark)}.c15t-ui-stackMeta-OnclK{color:var(--iab-cd-text-muted-color);margin-top:.25rem;font-size:.75rem}.c15t-dark .c15t-ui-stackMeta-OnclK{color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-stackControls-uhDRo{flex-shrink:0;align-items:center;gap:.5rem;display:flex}.c15t-ui-partialIndicator-SvNip{background-color:var(--iab-cd-primary-color);border-radius:50%;width:.375rem;height:.375rem}.c15t-ui-stackDescription-yd0M5{color:var(--iab-cd-text-muted-color);margin:.5rem 0 0 1.5rem;padding-bottom:.75rem;font-size:.75rem}.c15t-dark .c15t-ui-stackDescription-yd0M5{color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-stackContent-TId3a{border-top:1px solid var(--iab-cd-border-color);background-color:var(--iab-cd-surface-hover);padding:.5rem}.c15t-dark .c15t-ui-stackContent-TId3a{border-color:var(--iab-cd-border-color-dark);background-color:var(--iab-cd-surface-hover-dark)}.c15t-ui-specialPurposesSection-pRrtz{border-radius:var(--c15t-radius-md);border:1px solid var(--iab-cd-border-color);background-color:var(--iab-cd-background-color);margin-bottom:.5rem}.c15t-dark .c15t-ui-specialPurposesSection-pRrtz{border-color:var(--iab-cd-border-color-dark);background-color:var(--iab-cd-background-color-dark)}.c15t-ui-specialPurposesHeader-HiKU4{justify-content:space-between;align-items:flex-start;gap:.75rem;padding:.75rem;display:flex}.c15t-ui-specialPurposesTitle-ZZIyy{color:var(--iab-cd-text-color);align-items:center;gap:.5rem;margin:0;font-size:.875rem;font-weight:500;display:flex}.c15t-dark .c15t-ui-specialPurposesTitle-ZZIyy{color:var(--iab-cd-text-color-dark)}.c15t-ui-infoIcon-yoBJo{width:.875rem;height:.875rem;color:var(--iab-cd-text-muted-color);cursor:help}.c15t-dark .c15t-ui-infoIcon-yoBJo{color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-tooltip-klAzU{background-color:var(--iab-cd-background-color);border:1px solid var(--iab-cd-border-color);border-radius:var(--c15t-radius-md);width:16rem;box-shadow:var(--c15t-shadow-lg);color:var(--iab-cd-text-color);z-index:10;opacity:0;visibility:hidden;padding:.5rem;font-size:.75rem;transition:opacity .15s,visibility .15s;position:absolute;top:1.5rem;right:0}.c15t-ui-tooltipVisible-PE80C{opacity:1;visibility:visible}.c15t-dark .c15t-ui-tooltip-klAzU{background-color:var(--iab-cd-background-color-dark);border-color:var(--iab-cd-border-color-dark);color:var(--iab-cd-text-color-dark)}.c15t-ui-vendorListHeader-wt620{background-color:var(--iab-cd-background-color);z-index:10;margin-top:-.75rem;padding-top:.75rem;padding-bottom:.5rem;position:sticky;top:-.75rem}@media (width>=768px){.c15t-ui-vendorListHeader-wt620{margin-top:-1rem;padding-top:1rem;top:-1rem}}.c15t-dark .c15t-ui-vendorListHeader-wt620{background-color:var(--iab-cd-background-color-dark)}.c15t-ui-searchContainer-GGLB3{position:relative}.c15t-ui-searchIcon-Vfyaq{width:.875rem;height:.875rem;color:var(--iab-cd-text-muted-color);position:absolute;top:50%;left:.625rem;transform:translateY(-50%)}.c15t-dark .c15t-ui-searchIcon-Vfyaq{color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-searchInput-Q33NC{border-radius:var(--c15t-radius-md);border:1px solid var(--iab-cd-border-color);background-color:var(--iab-cd-background-color);width:100%;color:var(--iab-cd-text-color);padding:.5rem .75rem .5rem 2rem;font-size:.875rem}.c15t-ui-searchInput-Q33NC:focus{border-color:var(--iab-cd-primary-color);outline:none;box-shadow:0 0 0 2px #3b82f633}.c15t-dark .c15t-ui-searchInput-Q33NC{background-color:var(--iab-cd-background-color-dark);border-color:var(--iab-cd-border-color-dark);color:var(--iab-cd-text-color-dark)}.c15t-ui-vendorCount-LTBE9{color:var(--iab-cd-text-muted-color);margin-top:.375rem;font-size:.75rem}.c15t-dark .c15t-ui-vendorCount-LTBE9{color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-selectedVendorBanner-a9iA2{border-radius:var(--c15t-radius-md);z-index:100;isolation:isolate;background-color:#dbeafe;border:1px solid #3b82f64d;align-items:center;gap:.5rem;margin-bottom:.5rem;padding:.5rem .625rem;display:flex;position:sticky;top:0;box-shadow:0 2px 4px #0000000d}.c15t-dark .c15t-ui-selectedVendorBanner-a9iA2{background-color:#1e3a8a;border-color:#3b82f666}.c15t-ui-selectedVendorText-Pudgx{color:var(--iab-cd-primary-color);flex:1;font-size:.75rem}.c15t-ui-clearSelectionButton-OXp7e{color:var(--iab-cd-primary-color);cursor:pointer;background:0 0;border:none;align-items:center;gap:.25rem;padding:0;font-size:.75rem;display:flex}.c15t-ui-clearSelectionButton-OXp7e:hover{opacity:.8}.c15t-ui-clearIcon-nhj3A{width:.75rem;height:.75rem}.c15t-ui-vendorListItem-yS2cU{z-index:1;border:1px solid var(--iab-cd-border-color);border-radius:var(--c15t-radius-md);margin-bottom:.375rem;scroll-margin-top:6rem;position:relative;overflow:hidden}.c15t-dark .c15t-ui-vendorListItem-yS2cU{border-color:var(--iab-cd-border-color-dark)}.c15t-ui-vendorListItemHeader-v7x4k{align-items:center;gap:.5rem;padding:.625rem;display:flex}.c15t-ui-vendorListTrigger-H5lqi{text-align:left;cursor:pointer;background:0 0;border:none;flex:1;justify-content:space-between;align-items:center;min-width:0;padding:0;display:flex}.c15t-ui-vendorListTrigger-H5lqi:hover{color:var(--iab-cd-primary-color)}.c15t-ui-vendorListInfo-QYJou{flex:1;min-width:0}.c15t-ui-vendorListName-dlnJx{color:var(--iab-cd-text-color);align-items:center;gap:.5rem;margin:0;font-size:.875rem;font-weight:500;display:flex}.c15t-dark .c15t-ui-vendorListName-dlnJx{color:var(--iab-cd-text-color-dark)}.c15t-ui-vendorListMeta-ULPAo{flex-wrap:wrap;align-items:center;gap:.375rem;margin-top:.125rem;display:flex}.c15t-ui-vendorListMetaText-bruFU{color:var(--iab-cd-text-muted-color);font-size:.75rem}.c15t-dark .c15t-ui-vendorListMetaText-bruFU{color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-vendorListLIBadge-cnZi7{color:var(--iab-cd-text-muted-color);align-items:center;gap:.125rem;font-size:.625rem;font-weight:500;display:inline-flex}.c15t-ui-vendorListContent-Jo1kN{border-top:1px solid var(--iab-cd-border-color);background-color:var(--iab-cd-surface-hover);padding:0 .625rem .625rem}.c15t-dark .c15t-ui-vendorListContent-Jo1kN{border-color:var(--iab-cd-border-color-dark);background-color:var(--iab-cd-surface-hover-dark)}.c15t-ui-vendorLinks-MqbfV{padding-top:.5rem}.c15t-ui-vendorLink-sfRW9{color:var(--iab-cd-primary-color);align-items:center;gap:.25rem;margin-right:.75rem;font-size:.75rem;text-decoration:none;display:inline-flex}.c15t-ui-vendorLink-sfRW9:hover{text-decoration:underline}.c15t-ui-vendorLinkIcon-XFOjn{width:.75rem;height:.75rem}.c15t-ui-vendorBadges-mpcxI{flex-wrap:wrap;gap:.5rem;margin-top:.375rem;display:flex}.c15t-ui-vendorBadge-pvgVW{border-radius:var(--c15t-radius-sm);background-color:var(--iab-cd-surface-hover);color:var(--iab-cd-text-muted-color);padding:.125rem .375rem;font-size:.625rem}.c15t-dark .c15t-ui-vendorBadge-pvgVW{background-color:var(--iab-cd-surface-hover-dark);color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-vendorPurposesList-LjkUB{margin-top:.5rem}.c15t-ui-vendorPurposesTitle-goJri{color:var(--iab-cd-text-color);align-items:center;gap:.5rem;margin:0 0 .25rem;font-size:.75rem;font-weight:500;display:flex}.c15t-dark .c15t-ui-vendorPurposesTitle-goJri{color:var(--iab-cd-text-color-dark)}.c15t-ui-vendorPurposesItems-lRTbJ{margin:0;padding:0;list-style:none}.c15t-ui-vendorPurposeItem-dsY4R{color:var(--iab-cd-text-muted-color);border-left:2px solid var(--iab-cd-border-color);justify-content:space-between;align-items:center;gap:.5rem;margin-bottom:.125rem;padding-left:.5rem;font-size:.75rem;display:flex}.c15t-dark .c15t-ui-vendorPurposeItem-dsY4R{color:var(--iab-cd-text-muted-color-dark);border-color:var(--iab-cd-border-color-dark)}.c15t-ui-vendorPurposeItemLI-Iv4NY{border-color:var(--iab-cd-text-muted-color);color:var(--iab-cd-text-muted-color)}.c15t-ui-vendorRetention-YFyBS{opacity:.7;font-size:.625rem}.c15t-ui-footer-luLru{border-top:1px solid var(--iab-cd-border-color);background-color:var(--iab-cd-surface-hover);flex-shrink:0;justify-content:space-between;align-items:center;padding:.75rem 1rem;display:flex}.c15t-dark .c15t-ui-footer-luLru{border-color:var(--iab-cd-border-color-dark);background-color:var(--iab-cd-surface-hover-dark)}.c15t-ui-footerButtons-kcS68{gap:.5rem;display:flex}.c15t-ui-footerSpacer-pcXLL{flex:1}.c15t-ui-consentNotice-v9BBK{text-align:center;padding-top:1.5rem}.c15t-dark .c15t-ui-consentNotice-v9BBK{border-color:var(--iab-cd-border-color-dark)}.c15t-ui-consentNoticeText-x_Wq_{color:var(--iab-cd-text-muted-color);margin-block:0;font-size:.625rem}.c15t-dark .c15t-ui-consentNoticeText-x_Wq_{color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-loadingContainer-_P6Gs{flex-direction:column;justify-content:center;align-items:center;gap:.75rem;height:100%;display:flex}.c15t-ui-loadingSpinner-xnPfZ{border:2px solid var(--iab-cd-border-color);border-top-color:var(--iab-cd-primary-color);border-radius:50%;width:1.75rem;height:1.75rem;animation:1s linear infinite c15t-ui-spin-AtPOH}@keyframes c15t-ui-spin-AtPOH{to{transform:rotate(360deg)}}.c15t-ui-loadingText-MM9pG{color:var(--iab-cd-text-muted-color);font-size:.875rem}.c15t-dark .c15t-ui-loadingText-MM9pG{color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-emptyState-kXcux{text-align:center;padding:2rem}.c15t-ui-emptyStateText-bmfpF{color:var(--iab-cd-text-muted-color);margin:0;font-size:.875rem}.c15t-dark .c15t-ui-emptyStateText-bmfpF{color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-branding-pxwbo{border-top:1px solid var(--iab-cd-border-color);color:var(--iab-cd-text-color);justify-content:center;align-items:center;gap:.5rem;padding:.75rem;font-size:.75rem;text-decoration:none;display:flex}.c15t-dark .c15t-ui-branding-pxwbo{border-color:var(--iab-cd-border-color-dark);color:var(--iab-cd-text-color-dark)}.c15t-ui-brandingIcon-N7ULi{width:auto;height:1.25rem}.c15t-ui-vendorSection-jLX4W{z-index:1;margin-bottom:1.5rem;position:relative}.c15t-ui-vendorSectionHeading-VcNql{text-transform:uppercase;letter-spacing:.05em;color:var(--iab-cd-text-muted-color);background:var(--iab-cd-surface-hover-color);border-bottom:1px solid var(--iab-cd-border-color);align-items:center;gap:.5rem;margin:0;padding:.75rem 0;font-size:.75rem;font-weight:600;display:flex}.c15t-dark .c15t-ui-vendorSectionHeading-VcNql{color:var(--iab-cd-text-muted-color-dark);background:var(--iab-cd-surface-hover-color-dark);border-color:var(--iab-cd-border-color-dark)}.c15t-ui-vendorSectionIcon-WYSlx{flex-shrink:0;width:1rem;height:1rem}.c15t-ui-iabVendorSectionHeader-XoOsW{background-color:var(--iab-cd-background-color);border-bottom:1px solid var(--iab-cd-border-color);z-index:10;padding:.5rem 0;position:relative}.c15t-dark .c15t-ui-iabVendorSectionHeader-XoOsW{border-color:var(--iab-cd-border-color-dark);background-color:var(--iab-cd-background-color-dark)}.c15t-ui-iabVendorSectionHeader-XoOsW .c15t-ui-vendorSectionHeading-VcNql{border-bottom:none;padding-bottom:.25rem}.c15t-ui-iabVendorNotice-kcdl1{color:var(--iab-cd-text-muted-color);margin:0;font-size:.6875rem}.c15t-dark .c15t-ui-iabVendorNotice-kcdl1{color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-customVendorSectionHeader-pvTOf{background-color:var(--iab-cd-background-color);border-bottom:1px solid var(--iab-cd-border-color);z-index:10;padding:.5rem 0;position:relative}.c15t-dark .c15t-ui-customVendorSectionHeader-pvTOf{border-color:var(--iab-cd-border-color-dark);background-color:var(--iab-cd-background-color-dark)}.c15t-ui-customVendorSectionHeader-pvTOf .c15t-ui-vendorSectionHeading-VcNql{background:0 0;border-bottom:none;padding-bottom:.25rem}.c15t-ui-customVendorNotice-qL5iK{color:var(--iab-cd-text-muted-color);margin:0;padding:.25rem 0 1rem;font-size:.6875rem}.c15t-dark .c15t-ui-customVendorNotice-qL5iK{color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-customVendorItem-GSwuY{border-left:3px solid var(--iab-cd-primary-color)}.c15t-dark .c15t-ui-customVendorItem-GSwuY{border-left-color:var(--iab-cd-primary-color-dark)}.c15t-ui-customVendorPurposeSection-CHCdx{border-top:1px solid var(--iab-cd-border-color);margin-top:.75rem;padding-top:.75rem}.c15t-dark .c15t-ui-customVendorPurposeSection-CHCdx{border-color:var(--iab-cd-border-color-dark)}.c15t-ui-vendorSectionTitleCustom-T5bOQ{text-transform:uppercase;letter-spacing:.05em;color:var(--iab-cd-primary-color);align-items:center;gap:.375rem;margin:0 0 .5rem;font-size:.625rem;font-weight:600;display:flex}.c15t-dark .c15t-ui-vendorSectionTitleCustom-T5bOQ{color:var(--iab-cd-primary-color-dark)}.c15t-ui-objectButton-TXelw{border-radius:var(--c15t-radius-sm);border:1px solid var(--iab-cd-border-color);color:var(--iab-cd-text-muted-color);cursor:pointer;white-space:nowrap;background-color:#0000;padding:.25rem .5rem;font-size:.6875rem;font-weight:500;transition:background-color .15s,border-color .15s,color .15s}.c15t-ui-objectButton-TXelw:hover{border-color:var(--iab-cd-text-muted-color);color:var(--iab-cd-text-color)}.c15t-ui-objectButtonActive-HK4NE{background-color:var(--iab-cd-text-muted-color);border-color:var(--iab-cd-text-muted-color);color:var(--iab-cd-background-color)}.c15t-ui-objectButtonActive-HK4NE:hover{opacity:.9}.c15t-dark .c15t-ui-objectButton-TXelw{border-color:var(--iab-cd-border-color-dark);color:var(--iab-cd-text-muted-color-dark)}.c15t-dark .c15t-ui-objectButton-TXelw:hover{border-color:var(--iab-cd-text-muted-color-dark);color:var(--iab-cd-text-color-dark)}.c15t-dark .c15t-ui-objectButtonActive-HK4NE{background-color:var(--iab-cd-text-muted-color-dark);border-color:var(--iab-cd-text-muted-color-dark);color:var(--iab-cd-background-color-dark)}.c15t-ui-liExplanation-qSK2Z{color:var(--iab-cd-text-muted-color);background-color:var(--iab-cd-surface-hover);font-size:.6875rem;font-style:italic}.c15t-dark .c15t-ui-liExplanation-qSK2Z{color:var(--iab-cd-text-muted-color-dark);background-color:var(--iab-cd-surface-hover-dark);border-color:var(--iab-cd-text-muted-color-dark)}.c15t-ui-vendorLISection-mrh74{border-top:1px solid var(--iab-cd-border-color);margin-top:.75rem;padding-top:.75rem}.c15t-dark .c15t-ui-vendorLISection-mrh74{border-color:var(--iab-cd-border-color-dark)}.c15t-ui-vendorLISectionHeader-pWhrl{justify-content:space-between;align-items:center;gap:.5rem;margin-bottom:.375rem;display:flex}.c15t-ui-vendorLISectionHeader-pWhrl .c15t-ui-vendorPurposesTitle-goJri{align-items:center;margin:0;display:flex}.c15t-ui-purposeLISection-nKeYo{background-color:var(--iab-cd-surface-hover);border-radius:var(--c15t-radius-sm);border:1px solid var(--iab-cd-border-color);margin:.75rem 0;padding:.75rem}.c15t-dark .c15t-ui-purposeLISection-nKeYo{background-color:var(--iab-cd-surface-hover-dark);border-color:var(--iab-cd-border-color-dark)}.c15t-ui-purposeLISectionHeader-o_SvL{justify-content:space-between;align-items:center;gap:.75rem;margin-bottom:.5rem;display:flex}.c15t-ui-purposeLIInfo-jokDR{color:var(--iab-cd-text-color);align-items:center;gap:.375rem;font-size:.75rem;font-weight:500;display:flex}.c15t-dark .c15t-ui-purposeLIInfo-jokDR{color:var(--iab-cd-text-color-dark)}.c15t-ui-purposeLIInfo-jokDR .c15t-ui-legitimateInterestIcon-MdoA6{flex-shrink:0}@media (prefers-reduced-motion:reduce){.c15t-ui-dialogVisible-PUG1v,.c15t-ui-dialogHidden-FoTkw,.c15t-ui-contentVisible-G8YSA,.c15t-ui-contentHidden-iYnZI,.c15t-ui-overlayVisible-HizR9,.c15t-ui-overlayHidden-IFPwA,.c15t-ui-closeButton-wGCHD,.c15t-ui-tabButton-xZKks,.c15t-ui-tooltip-klAzU,.c15t-ui-objectButton-TXelw{transition:none}.c15t-ui-loadingSpinner-xnPfZ{animation:none}}@media (hover:none){.c15t-ui-closeButton-wGCHD:hover{background-color:#0000}.c15t-ui-tabButton-xZKks:hover{color:var(--iab-cd-text-muted-color)}.c15t-ui-objectButton-TXelw:hover{border-color:var(--iab-cd-border-color);color:var(--iab-cd-text-muted-color)}}}',
					'',
				]),
					(s.locals = {
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
				let c = s;
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'(
				e
			) {
				e.exports = function (t) {
					var o = [];
					return (
						(o.toString = function () {
							return this.map(function (r) {
								var n = '',
									i = r[5] !== void 0;
								return (
									r[4] && (n += '@supports ('.concat(r[4], ') {')),
									r[2] && (n += '@media '.concat(r[2], ' {')),
									i &&
										(n += '@layer'.concat(
											r[5].length > 0 ? ' '.concat(r[5]) : '',
											' {'
										)),
									(n += t(r)),
									i && (n += '}'),
									r[2] && (n += '}'),
									r[4] && (n += '}'),
									n
								);
							}).join('');
						}),
						(o.i = function (r, n, i, s, c) {
							typeof r == 'string' && (r = [[null, r, void 0]]);
							var u = {};
							if (i)
								for (var d = 0; d < this.length; d++) {
									var m = this[d][0];
									m != null && (u[m] = !0);
								}
							for (var p = 0; p < r.length; p++) {
								var l = [].concat(r[p]);
								(i && u[l[0]]) ||
									(c !== void 0 &&
										(l[5] === void 0 ||
											(l[1] = '@layer'
												.concat(l[5].length > 0 ? ' '.concat(l[5]) : '', ' {')
												.concat(l[1], '}')),
										(l[5] = c)),
									n &&
										(l[2] &&
											(l[1] = '@media '.concat(l[2], ' {').concat(l[1], '}')),
										(l[2] = n)),
									s &&
										(l[4]
											? ((l[1] = '@supports ('
													.concat(l[4], ') {')
													.concat(l[1], '}')),
												(l[4] = s))
											: (l[4] = ''.concat(s))),
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
				function o(n) {
					for (var i = -1, s = 0; s < t.length; s++)
						if (t[s].identifier === n) {
							i = s;
							break;
						}
					return i;
				}
				function r(n, i) {
					for (var s = {}, c = [], u = 0; u < n.length; u++) {
						var d = n[u],
							m = i.base ? d[0] + i.base : d[0],
							p = s[m] || 0,
							l = ''.concat(m, ' ').concat(p);
						s[m] = p + 1;
						var b = o(l),
							y = {
								css: d[1],
								media: d[2],
								sourceMap: d[3],
								supports: d[4],
								layer: d[5],
							};
						if (b !== -1) t[b].references++, t[b].updater(y);
						else {
							var k = (function (h, v) {
								var C = v.domAPI(v);
								return (
									C.update(h),
									function (g) {
										g
											? (g.css !== h.css ||
													g.media !== h.media ||
													g.sourceMap !== h.sourceMap ||
													g.supports !== h.supports ||
													g.layer !== h.layer) &&
												C.update((h = g))
											: C.remove();
									}
								);
							})(y, i);
							(i.byIndex = u),
								t.splice(u, 0, { identifier: l, updater: k, references: 1 });
						}
						c.push(l);
					}
					return c;
				}
				e.exports = function (n, i) {
					var s = r((n = n || []), (i = i || {}));
					return function (c) {
						c = c || [];
						for (var u = 0; u < s.length; u++) {
							var d = o(s[u]);
							t[d].references--;
						}
						for (var m = r(c, i), p = 0; p < s.length; p++) {
							var l = o(s[p]);
							t[l].references === 0 && (t[l].updater(), t.splice(l, 1));
						}
						s = m;
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'(
				e
			) {
				var t = {};
				e.exports = function (o, r) {
					var n = (function (i) {
						if (t[i] === void 0) {
							var s = document.querySelector(i);
							if (
								window.HTMLIFrameElement &&
								s instanceof window.HTMLIFrameElement
							)
								try {
									s = s.contentDocument.head;
								} catch {
									s = null;
								}
							t[i] = s;
						}
						return t[i];
					})(o);
					if (!n)
						throw Error(
							"Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid."
						);
					n.appendChild(r);
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
				e.exports = function (r) {
					var n = o.nc;
					n && r.setAttribute('nonce', n);
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
						update: function (r) {
							var n, i, s;
							(n = ''),
								r.supports && (n += '@supports ('.concat(r.supports, ') {')),
								r.media && (n += '@media '.concat(r.media, ' {')),
								(i = r.layer !== void 0) &&
									(n += '@layer'.concat(
										r.layer.length > 0 ? ' '.concat(r.layer) : '',
										' {'
									)),
								(n += r.css),
								i && (n += '}'),
								r.media && (n += '}'),
								r.supports && (n += '}'),
								(s = r.sourceMap) &&
									typeof btoa < 'u' &&
									(n += `
/*# sourceMappingURL=data:application/json;base64,`.concat(
										btoa(unescape(encodeURIComponent(JSON.stringify(s)))),
										' */'
									)),
								t.styleTagTransform(n, o, t.options);
						},
						remove: function () {
							var r;
							(r = o).parentNode === null || r.parentNode.removeChild(r);
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
		es = {};
	function ce(e) {
		var t = es[e];
		if (t !== void 0) return t.exports;
		var o = (es[e] = { id: e, exports: {} });
		return Pl[e](o, o.exports, ce), o.exports;
	}
	(ce.n = (e) => {
		var t = e && e.__esModule ? () => e.default : () => e;
		return ce.d(t, { a: t }), t;
	}),
		(ce.d = (e, t) => {
			for (var o in t)
				ce.o(t, o) &&
					!ce.o(e, o) &&
					Object.defineProperty(e, o, { enumerable: !0, get: t[o] });
		}),
		(ce.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t)),
		(ce.nc = void 0);
	var jl = ce(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'
		),
		Ol = ce.n(jl),
		Ml = ce(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'
		),
		Dl = ce.n(Ml),
		Fl = ce(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'
		),
		Vl = ce.n(Fl),
		Hl = ce(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'
		),
		Ul = ce.n(Hl),
		zl = ce(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'
		),
		$l = ce.n(zl),
		ql = ce(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'
		),
		Gl = ce.n(ql),
		yo = ce(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/components/iab-consent-dialog.module.css'
		),
		yt = {};
	(yt.styleTagTransform = Gl()),
		(yt.setAttributes = Ul()),
		(yt.insert = Vl().bind(null, 'head')),
		(yt.domAPI = Dl()),
		(yt.insertStyleElement = $l()),
		Ol()(yo.A, yt);
	var f = yo.A && yo.A.locals ? yo.A.locals : void 0;
	var Cr = T(({ children: e, className: t, ...o }, r) => {
		let { trapFocus: n } = we(),
			{ activeUI: i } = W(),
			s = pe(),
			[c, u] = L(!1),
			d = i === 'dialog';
		return (
			Ue(!!(d && n), r),
			M(() => {
				if (d) u(!0);
				else {
					let m = setTimeout(() => {
						u(!1);
					}, 150);
					return () => clearTimeout(m);
				}
			}, [d]),
			a('div', {
				ref: r,
				...Y('iabConsentDialogCard', {
					baseClassName: He(f.card, c ? f.contentVisible : f.contentHidden),
					className: t,
				}),
				role: 'dialog',
				'aria-modal': n ? 'true' : void 0,
				'aria-label': s.preferenceCenter.title,
				tabIndex: 0,
				'data-testid': 'iab-consent-dialog-card',
				...o,
				children: e,
			})
		);
	});
	Cr.displayName = 'IABConsentDialogCard';
	var kr = T(({ children: e, className: t, ...o }, r) =>
		a('div', {
			ref: r,
			className: t ? `${f.content} ${t}` : f.content,
			...o,
			children: e,
		})
	);
	kr.displayName = 'IABConsentDialogContent';
	function Co() {
		let { iab: e } = W(),
			{
				purposes: t,
				specialPurposes: o,
				specialFeatures: r,
				features: n,
				stacks: i,
				standalonePurposes: s,
			} = $(() => {
				if (!e?.gvl)
					return {
						purposes: [],
						specialPurposes: [],
						specialFeatures: [],
						features: [],
						stacks: [],
						standalonePurposes: [],
					};
				let c = e.gvl,
					u = e.nonIABVendors || [],
					d = (w, I, j) => ({
						id: Number(w),
						name: I.name,
						policyUrl: I.policyUrl ?? '',
						usesNonCookieAccess: I.usesNonCookieAccess,
						deviceStorageDisclosureUrl: I.deviceStorageDisclosureUrl ?? null,
						usesCookies: I.usesCookies,
						cookieMaxAgeSeconds: I.cookieMaxAgeSeconds,
						specialPurposes: I.specialPurposes || [],
						specialFeatures: I.specialFeatures || [],
						features: I.features || [],
						purposes: I.purposes || [],
						legIntPurposes: I.legIntPurposes || [],
						usesLegitimateInterest:
							!!j && (I.legIntPurposes?.includes(j) ?? !1),
						isCustom: !1,
					}),
					m = Object.entries(c.purposes)
						.map(([w, I]) => {
							let j = Object.entries(c.vendors)
									.filter(
										([, N]) =>
											N.purposes?.includes(Number(w)) ||
											N.legIntPurposes?.includes(Number(w))
									)
									.map(([N, _]) => d(N, _, Number(w))),
								E = u
									.filter(
										(N) =>
											N.purposes?.includes(Number(w)) ||
											N.legIntPurposes?.includes(Number(w))
									)
									.map((N) => {
										let _;
										return (
											(_ = Number(w)),
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
													!!_ && (N.legIntPurposes?.includes(_) ?? !1),
												isCustom: !0,
											}
										);
									});
							return {
								id: Number(w),
								name: I.name,
								description: I.description,
								descriptionLegal: I.descriptionLegal,
								illustrations: I.illustrations || [],
								vendors: [...j, ...E],
							};
						})
						.filter((w) => w.vendors.length > 0),
					p = Object.entries(c.specialPurposes || {})
						.map(([w, I]) => {
							let j = Object.entries(c.vendors)
								.filter(([, E]) => E.specialPurposes?.includes(Number(w)))
								.map(([E, N]) => d(E, N));
							return {
								id: Number(w),
								name: I.name,
								description: I.description,
								descriptionLegal: I.descriptionLegal,
								illustrations: I.illustrations || [],
								vendors: j,
								isSpecialPurpose: !0,
							};
						})
						.filter((w) => w.vendors.length > 0),
					l = Object.entries(c.specialFeatures || {})
						.map(([w, I]) => {
							let j = Object.entries(c.vendors)
								.filter(([, E]) => E.specialFeatures?.includes(Number(w)))
								.map(([E, N]) => d(E, N));
							return {
								id: Number(w),
								name: I.name,
								description: I.description,
								descriptionLegal: I.descriptionLegal,
								illustrations: I.illustrations || [],
								vendors: j,
							};
						})
						.filter((w) => w.vendors.length > 0),
					b = Object.entries(c.features || {})
						.map(([w, I]) => {
							let j = Object.entries(c.vendors)
								.filter(([, E]) => E.features?.includes(Number(w)))
								.map(([E, N]) => d(E, N));
							return {
								id: Number(w),
								name: I.name,
								description: I.description,
								descriptionLegal: I.descriptionLegal,
								illustrations: I.illustrations || [],
								vendors: j,
							};
						})
						.filter((w) => w.vendors.length > 0),
					y = m.find((w) => w.id === 1),
					k = m.filter((w) => w.id !== 1),
					h = new Set(k.map((w) => w.id)),
					v = c.stacks || {},
					C = [];
				for (let [w, I] of Object.entries(v)) {
					let j = Number(w),
						E = I.purposes.filter((N) => h.has(N));
					E.length >= 2 &&
						C.push({
							stackId: j,
							stack: I,
							coveredPurposeIds: E,
							score: E.length,
						});
				}
				C.sort((w, I) => I.score - w.score);
				let g = [],
					x = new Set();
				for (let { stackId: w, stack: I, coveredPurposeIds: j } of C) {
					let E = j.filter((N) => !x.has(N));
					if (E.length >= 2) {
						let N = k.filter((_) => E.includes(_.id));
						for (let _ of (g.push({
							id: w,
							name: I.name,
							description: I.description,
							purposes: N,
						}),
						E))
							x.add(_);
					}
				}
				let V = k.filter((w) => !x.has(w.id));
				return {
					purposes: m,
					specialPurposes: p,
					specialFeatures: l,
					features: b,
					stacks: g,
					standalonePurposes: y ? [y, ...V] : V,
				};
			}, [e?.gvl, e?.nonIABVendors]);
		return {
			purposes: t,
			specialPurposes: o,
			specialFeatures: r,
			features: n,
			stacks: i,
			standalonePurposes: s,
			totalVendors: $(
				() =>
					e?.gvl
						? Object.keys(e.gvl.vendors).length + (e.nonIABVendors?.length ?? 0)
						: 0,
				[e?.gvl, e?.nonIABVendors]
			),
			isLoading: !!(e?.isLoadingGVL || !e?.gvl),
		};
	}
	var xr = T(({ children: e, className: t, ...o }, r) => {
		let { iab: n, setActiveUI: i } = W(),
			s = pe(),
			{ isLoading: c } = Co();
		return a('div', {
			ref: r,
			...Y('iabConsentDialogFooter', { baseClassName: f.footer, className: t }),
			...o,
			children:
				e ||
				a(H, {
					children: [
						a('div', {
							className: f.footerButtons,
							children: [
								a(_e, {
									variant: 'neutral',
									mode: 'stroke',
									size: 'small',
									onClick: () => {
										n?.rejectAll(), n?.save(), i('none');
									},
									disabled: c,
									children: s.common.rejectAll,
								}),
								a(_e, {
									variant: 'neutral',
									mode: 'stroke',
									size: 'small',
									onClick: () => {
										n?.acceptAll(), n?.save(), i('none');
									},
									disabled: c,
									children: s.common.acceptAll,
								}),
							],
						}),
						a('div', { className: f.footerSpacer }),
						a(_e, {
							variant: 'primary',
							mode: 'filled',
							size: 'small',
							onClick: () => {
								n?.save(), i('none');
							},
							disabled: c,
							children: s.common.saveSettings,
						}),
					],
				}),
		});
	});
	xr.displayName = 'IABConsentDialogFooter';
	var _r = T(
		(
			{
				children: e,
				headerTitle: t,
				description: o,
				showCloseButton: r = !0,
				className: n,
			},
			i
		) => {
			let { setActiveUI: s } = W(),
				c = pe();
			return a('div', {
				ref: i,
				...Y('iabConsentDialogHeader', {
					baseClassName: f.header,
					className: n,
				}),
				children:
					e ||
					a(H, {
						children: [
							a('div', {
								className: f.headerContent,
								children: [
									a('h2', {
										className: f.title,
										children: t ?? c.preferenceCenter.title,
									}),
									a('p', {
										className: f.description,
										children: o ?? c.preferenceCenter.description,
									}),
								],
							}),
							r &&
								a('button', {
									type: 'button',
									onClick: () => {
										s('none');
									},
									className: f.closeButton,
									'aria-label': 'Close',
									children: a('svg', {
										style: { width: '1rem', height: '1rem' },
										viewBox: '0 0 24 24',
										fill: 'none',
										stroke: 'currentColor',
										strokeWidth: '2',
										children: [
											a('line', { x1: '18', y1: '6', x2: '6', y2: '18' }),
											a('line', { x1: '6', y1: '6', x2: '18', y2: '18' }),
										],
									}),
								}),
						],
					}),
			});
		}
	);
	_r.displayName = 'IABConsentDialogHeader';
	var Je = T(({ className: e, style: t, noStyle: o, isOpen: r, ...n }, i) => {
		let s,
			{ disableAnimation: c, noStyle: u, scrollLock: d } = we(),
			[m, p] = L(!1);
		M(() => {
			if (r) p(!0);
			else if (c) p(!1);
			else {
				let y = setTimeout(
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
				return () => clearTimeout(y);
			}
		}, [r, c]);
		let l = Y('iabConsentDialogOverlay', {
			baseClassName: !(u || o) && f.overlay,
			className: e,
			noStyle: u || o,
		});
		u || o || c || (s = m ? f.overlayVisible : f.overlayHidden);
		let b = He(l.className, s);
		return (
			Ve(!!(r && d)),
			r
				? a('div', {
						ref: i,
						...n,
						className: b,
						style: { ...l.style, ...t },
						'data-testid': 'iab-consent-dialog-overlay',
					})
				: null
		);
	});
	Je.displayName = 'IABConsentDialogOverlay';
	var Ae = ({
		isOpen: e,
		children: t,
		duration: o = 250,
		easing: r = 'cubic-bezier(0.33, 1, 0.68, 1)',
		className: n,
	}) => {
		let i = z(null),
			s = z(null),
			c = z(null),
			[u, d] = L(e),
			[m, p] = L(!1),
			[l, b] = L({
				height: e ? 'auto' : 0,
				overflow: e ? 'visible' : 'hidden',
				transition: 'none',
			});
		return (
			ke(() => {
				let y = i.current,
					k = s.current;
				if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
					d(e),
						p(!1),
						b({
							height: e ? 'auto' : 0,
							overflow: e ? 'visible' : 'hidden',
							transition: 'none',
						});
					return;
				}
				if ((c.current !== null && cancelAnimationFrame(c.current), e))
					d(!0),
						p(!0),
						(c.current = requestAnimationFrame(() => {
							let h = s.current;
							if (!h) return void p(!1);
							let v = h.scrollHeight;
							b({ height: 0, overflow: 'hidden', transition: 'none' }),
								requestAnimationFrame(() => {
									b({
										height: v,
										overflow: 'hidden',
										transition: `height ${o}ms ${r}`,
									});
									let C = (g) => {
										g.propertyName === 'height' &&
											(b({
												height: 'auto',
												overflow: 'visible',
												transition: 'none',
											}),
											p(!1),
											y?.removeEventListener('transitionend', C));
									};
									y?.addEventListener('transitionend', C);
								});
						}));
				else {
					if (!y || !k) {
						d(!1),
							p(!1),
							b({ height: 0, overflow: 'hidden', transition: 'none' });
						return;
					}
					p(!0),
						b({
							height: k.scrollHeight,
							overflow: 'hidden',
							transition: 'none',
						}),
						(c.current = requestAnimationFrame(() => {
							y.offsetHeight,
								b({
									height: 0,
									overflow: 'hidden',
									transition: `height ${o}ms ${r}`,
								});
							let h = (v) => {
								v.propertyName === 'height' &&
									(d(!1), p(!1), y.removeEventListener('transitionend', h));
							};
							y.addEventListener('transitionend', h);
						}));
				}
				return () => {
					c.current !== null && cancelAnimationFrame(c.current);
				};
			}, [e, o, r]),
			e || u || m
				? a('div', {
						ref: i,
						className: n,
						style: {
							height: l.height,
							overflow: l.overflow,
							transition: l.transition,
						},
						children:
							u &&
							a('div', { ref: s, style: { overflow: 'hidden' }, children: t }),
					})
				: null
		);
	};
	Ae.displayName = 'AnimatedCollapse';
	var Me = ({
			purpose: e,
			isEnabled: t,
			onToggle: o,
			vendorConsents: r,
			onVendorToggle: n,
			onVendorClick: i,
			isLocked: s = !1,
			vendorLegitimateInterests: c = {},
			onVendorLegitimateInterestToggle: u,
			purposeLegitimateInterests: d = {},
			onPurposeLegitimateInterestToggle: m,
		}) => {
			let [p, l] = L(!1),
				[b, y] = L(!1),
				[k, h] = L(!1),
				v = pe(),
				C = e.vendors.filter((_) => _.usesLegitimateInterest),
				g = e.vendors.filter((_) => !_.usesLegitimateInterest),
				x = (_) => r[String(_)] ?? !1,
				V = (_) => c[String(_)] ?? !0,
				w = d[e.id] ?? !0,
				I = g.filter((_) => !_.isCustom),
				j = g.filter((_) => _.isCustom),
				E = C.filter((_) => !_.isCustom),
				N = C.filter((_) => _.isCustom);
			return a('div', {
				className: f.purposeItem,
				'data-testid': `purpose-item-${e.id}`,
				children: [
					a('div', {
						className: f.purposeHeader,
						children: [
							a('button', {
								type: 'button',
								onClick: () => l(!p),
								className: f.purposeTrigger,
								children: [
									a('svg', {
										className: f.purposeArrow,
										viewBox: '0 0 24 24',
										fill: 'none',
										stroke: 'currentColor',
										strokeWidth: '2',
										children: p
											? a('path', { d: 'M19 9l-7 7-7-7' })
											: a('path', { d: 'M9 5l7 7-7 7' }),
									}),
									a('div', {
										className: f.purposeInfo,
										children: [
											a('h3', {
												className: f.purposeName,
												children: [
													e.name,
													s &&
														a('svg', {
															className: f.lockIcon,
															viewBox: '0 0 24 24',
															fill: 'none',
															stroke: 'currentColor',
															strokeWidth: '2',
															children: [
																a('rect', {
																	x: '3',
																	y: '11',
																	width: '18',
																	height: '11',
																	rx: '2',
																	ry: '2',
																}),
																a('path', { d: 'M7 11V7a5 5 0 0 1 10 0v4' }),
															],
														}),
												],
											}),
											a('p', {
												className: f.purposeMeta,
												children:
													v.preferenceCenter.purposeItem.partners.replace(
														'{count}',
														String(e.vendors.length)
													),
											}),
											C.length > 0 &&
												a('div', {
													className: f.legitimateInterestBadge,
													children: [
														a('svg', {
															className: f.legitimateInterestIcon,
															viewBox: '0 0 24 24',
															fill: 'none',
															stroke: 'currentColor',
															strokeWidth: '2',
															children: a('path', {
																d: 'M12 3v18M3 12h18M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07',
															}),
														}),
														v.preferenceCenter.purposeItem.vendorsUseLegitimateInterest.replace(
															'{count}',
															String(C.length)
														),
													],
												}),
										],
									}),
								],
							}),
							a(ze, {
								checked: t,
								onCheckedChange: (_) => {
									for (let F of (o(_), g)) n(F.id, _);
								},
								disabled: s,
							}),
						],
					}),
					a(Ae, {
						isOpen: p,
						children: a('div', {
							className: f.purposeContent,
							children: [
								a('p', {
									className: f.purposeDescription,
									children: e.description,
								}),
								C.length > 0 &&
									m &&
									a('div', {
										className: f.purposeLISection,
										children: [
											a('div', {
												className: f.purposeLISectionHeader,
												children: [
													a('div', {
														className: f.purposeLIInfo,
														children: [
															a('svg', {
																className: f.legitimateInterestIcon,
																viewBox: '0 0 24 24',
																fill: 'none',
																stroke: 'currentColor',
																strokeWidth: '2',
																children: a('path', {
																	d: 'M12 3v18M3 12h18M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07',
																}),
															}),
															a('span', {
																children:
																	v.preferenceCenter.purposeItem.vendorsUseLegitimateInterest.replace(
																		'{count}',
																		String(C.length)
																	),
															}),
														],
													}),
													a('button', {
														type: 'button',
														onClick: () => {
															let _ = !w;
															if ((m && m(e.id, _), u))
																for (let F of C) u(F.id, _);
														},
														className: `${f.objectButton} ${w ? '' : f.objectButtonActive}`,
														'aria-pressed': !w,
														children: w
															? v.preferenceCenter.purposeItem.objectButton
															: v.preferenceCenter.purposeItem.objected,
													}),
												],
											}),
											a('p', {
												className: f.liExplanation,
												children: v.preferenceCenter.purposeItem.rightToObject,
											}),
										],
									}),
								C.length > 0 &&
									!m &&
									a('div', {
										className: f.legitimateInterestBadge,
										children: [
											a('svg', {
												className: f.legitimateInterestIcon,
												viewBox: '0 0 24 24',
												fill: 'none',
												stroke: 'currentColor',
												strokeWidth: '2',
												children: a('path', {
													d: 'M12 3v18M3 12h18M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07',
												}),
											}),
											v.preferenceCenter.purposeItem.vendorsUseLegitimateInterest.replace(
												'{count}',
												String(C.length)
											),
										],
									}),
								e.illustrations &&
									e.illustrations.length > 0 &&
									a('div', {
										children: [
											a('button', {
												type: 'button',
												onClick: () => y(!b),
												className: f.examplesToggle,
												children: [
													a('svg', {
														style: { width: '0.75rem', height: '0.75rem' },
														viewBox: '0 0 24 24',
														fill: 'none',
														stroke: 'currentColor',
														strokeWidth: '2',
														children: b
															? a('path', { d: 'M19 9l-7 7-7-7' })
															: a('path', { d: 'M9 5l7 7-7 7' }),
													}),
													v.preferenceCenter.purposeItem.examples,
													' (',
													e.illustrations.length,
													')',
												],
											}),
											a(Ae, {
												isOpen: b,
												children: a('ul', {
													className: f.examplesList,
													children: e.illustrations.map((_, F) =>
														a('li', { children: _ }, F)
													),
												}),
											}),
										],
									}),
								a('div', {
									children: [
										a('button', {
											type: 'button',
											onClick: () => h(!k),
											className: f.vendorsToggle,
											children: [
												a('svg', {
													style: { width: '0.75rem', height: '0.75rem' },
													viewBox: '0 0 24 24',
													fill: 'none',
													stroke: 'currentColor',
													strokeWidth: '2',
													children: k
														? a('path', { d: 'M19 9l-7 7-7-7' })
														: a('path', { d: 'M9 5l7 7-7 7' }),
												}),
												v.preferenceCenter.purposeItem.partnersUsingPurpose,
												' (',
												e.vendors.length,
												')',
											],
										}),
										a(Ae, {
											isOpen: k,
											children: a('div', {
												className: f.vendorSection,
												children: [
													I.length > 0 &&
														a(H, {
															children: [
																a('h5', {
																	className: f.vendorSectionTitle,
																	children: [
																		v.preferenceCenter.purposeItem
																			.withYourPermission,
																		' (',
																		I.length,
																		')',
																	],
																}),
																I.map((_) =>
																	a(
																		ko,
																		{
																			vendor: _,
																			isConsented: x(_.id),
																			onToggle: (F) => n(_.id, F),
																			onClick: () => i(_.id),
																		},
																		_.id
																	)
																),
															],
														}),
													E.length > 0 &&
														a(H, {
															children: [
																a('h5', {
																	className: `${f.vendorSectionTitle} ${f.vendorSectionTitleLI}`,
																	children: [
																		a('svg', {
																			style: {
																				width: '0.75rem',
																				height: '0.75rem',
																			},
																			viewBox: '0 0 24 24',
																			fill: 'none',
																			stroke: 'currentColor',
																			strokeWidth: '2',
																			children: a('path', {
																				d: 'M12 3v18M3 12h18M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07',
																			}),
																		}),
																		v.preferenceCenter.purposeItem
																			.legitimateInterest,
																		' (',
																		E.length,
																		')',
																	],
																}),
																a('p', {
																	className: f.liExplanation,
																	children:
																		v.preferenceCenter.purposeItem
																			.rightToObject,
																}),
																E.map((_) =>
																	a(
																		ko,
																		{
																			vendor: _,
																			isConsented: x(_.id),
																			onToggle: (F) => n(_.id, F),
																			onClick: () => i(_.id),
																			isLegitimateInterest: !0,
																			isLegitimateInterestAllowed: V(_.id),
																			onLegitimateInterestToggle: u
																				? (F) => u(_.id, F)
																				: void 0,
																		},
																		_.id
																	)
																),
															],
														}),
													(j.length > 0 || N.length > 0) &&
														a('div', {
															className: f.customVendorPurposeSection,
															children: [
																a('h5', {
																	className: f.vendorSectionTitleCustom,
																	children: [
																		a('svg', {
																			style: {
																				width: '0.75rem',
																				height: '0.75rem',
																			},
																			viewBox: '0 0 24 24',
																			fill: 'none',
																			stroke: 'currentColor',
																			strokeWidth: '2',
																			children: [
																				a('circle', {
																					cx: '12',
																					cy: '12',
																					r: '10',
																				}),
																				a('line', {
																					x1: '2',
																					y1: '12',
																					x2: '22',
																					y2: '12',
																				}),
																				a('path', {
																					d: 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
																				}),
																			],
																		}),
																		v.preferenceCenter.vendorList
																			.customVendorsHeading,
																		' (',
																		j.length + N.length,
																		')',
																	],
																}),
																j.map((_) =>
																	a(
																		ko,
																		{
																			vendor: _,
																			isConsented: x(_.id),
																			onToggle: (F) => n(_.id, F),
																			onClick: () => i(_.id),
																		},
																		_.id
																	)
																),
																N.map((_) =>
																	a(
																		ko,
																		{
																			vendor: _,
																			isConsented: x(_.id),
																			onToggle: (F) => n(_.id, F),
																			onClick: () => i(_.id),
																			isLegitimateInterest: !0,
																			isLegitimateInterestAllowed: V(_.id),
																			onLegitimateInterestToggle: u
																				? (F) => u(_.id, F)
																				: void 0,
																		},
																		_.id
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
		ko = ({
			vendor: e,
			isConsented: t,
			onToggle: o,
			onClick: r,
			isLegitimateInterest: n = !1,
			isLegitimateInterestAllowed: i = !0,
			onLegitimateInterestToggle: s,
		}) => {
			let c = pe(),
				u = n && s;
			return a('div', {
				className: `${f.vendorRow} ${n ? f.vendorRowLI : ''}`,
				children: [
					a('div', {
						className: f.vendorInfo,
						children: [
							a('button', {
								type: 'button',
								onClick: r,
								className: f.vendorName,
								children: [
									a('span', { children: e.name }),
									e.isCustom &&
										a('svg', {
											className: f.customVendorIcon,
											viewBox: '0 0 24 24',
											fill: 'none',
											stroke: 'currentColor',
											strokeWidth: '2',
											'aria-label': c.common.customPartner,
											children: [
												a('circle', { cx: '12', cy: '12', r: '10' }),
												a('line', { x1: '2', y1: '12', x2: '22', y2: '12' }),
												a('path', {
													d: 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
												}),
											],
										}),
								],
							}),
							a('div', {
								className: f.vendorDetails,
								children: [
									n &&
										a('span', {
											className: `${f.vendorDetail} ${f.vendorDetailLI}`,
											children:
												c.preferenceCenter.purposeItem.legitimateInterest,
										}),
									e.usesCookies &&
										a('span', {
											className: f.vendorDetail,
											children: c.preferenceCenter.vendorList.usesCookies,
										}),
									e.usesNonCookieAccess &&
										a('span', {
											className: f.vendorDetail,
											children: c.preferenceCenter.vendorList.nonCookieAccess,
										}),
								],
							}),
						],
					}),
					u
						? a('button', {
								type: 'button',
								onClick: () => s(!i),
								className: `${f.objectButton} ${i ? '' : f.objectButtonActive}`,
								'aria-pressed': !i,
								children: i
									? c.preferenceCenter.purposeItem.objectButton
									: c.preferenceCenter.purposeItem.objected,
							})
						: a('div', {
								style: { transform: 'scale(0.75)' },
								children: a(ze, { checked: t, onCheckedChange: o }),
							}),
				],
			});
		};
	var Sr = ({
		children: e,
		open: t,
		models: o = ['iab'],
		noStyle: r,
		disableAnimation: n,
		scrollLock: i = !0,
		trapFocus: s = !0,
		uiSource: c,
	}) => {
		let { activeUI: u, translationConfig: d, iab: m, model: p } = W(),
			l = dt(d.defaultLanguage),
			[b, y] = L(!1),
			[k, h] = L(!1),
			v = o.includes(p) && (t ?? u === 'dialog');
		if (
			(Ve(!!(v && i)),
			M(() => {
				y(!0);
			}, []),
			M(() => {
				if (v) h(!0);
				else if (n) h(!1);
				else {
					let x = setTimeout(() => {
						h(!1);
					}, 150);
					return () => clearTimeout(x);
				}
			}, [v, n]),
			!b || !m?.config.enabled || (!v && !k))
		)
			return null;
		let C = Y('iabConsentDialog', {
				baseClassName: He(
					f.root,
					n ? void 0 : k ? f.dialogVisible : f.dialogHidden
				),
			}),
			g = a(lt.Provider, {
				value: { uiSource: c ?? 'iab_dialog' },
				children: a(ct.Provider, {
					value: {
						disableAnimation: n,
						noStyle: r,
						scrollLock: i,
						trapFocus: s,
					},
					children: [
						a(Je, { isOpen: v }),
						a('div', {
							...C,
							'data-testid': 'iab-consent-dialog-root',
							dir: l,
							children: e,
						}),
					],
				}),
			});
		return Le(g, document.body);
	};
	Sr.displayName = 'IABConsentDialogRoot';
	var xo = ({
		stack: e,
		consents: t,
		onToggle: o,
		vendorConsents: r,
		onVendorToggle: n,
		onVendorClick: i,
		vendorLegitimateInterests: s = {},
		onVendorLegitimateInterestToggle: c,
		purposeLegitimateInterests: u = {},
		onPurposeLegitimateInterestToggle: d,
	}) => {
		let [m, p] = L(!1),
			l = e.purposes.every((k) => t[k.id] ?? !1),
			b = e.purposes.some((k) => t[k.id] ?? !1) && !l,
			y = new Set(e.purposes.flatMap((k) => k.vendors.map((h) => h.id))).size;
		return a('div', {
			className: f.stackItem,
			'data-testid': `stack-item-${e.id}`,
			children: [
				a('div', {
					className: f.stackHeader,
					children: [
						a('button', {
							type: 'button',
							onClick: () => p(!m),
							className: f.stackTrigger,
							children: [
								a('svg', {
									className: f.purposeArrow,
									viewBox: '0 0 24 24',
									fill: 'none',
									stroke: 'currentColor',
									strokeWidth: '2',
									children: m
										? a('path', { d: 'M19 9l-7 7-7-7' })
										: a('path', { d: 'M9 5l7 7-7 7' }),
								}),
								a('div', {
									className: f.stackInfo,
									children: [
										a('h3', { className: f.stackName, children: e.name }),
										!m &&
											a('p', {
												className: f.stackMeta,
												children: [y, ' ', y === 1 ? 'partner' : 'partners'],
											}),
									],
								}),
							],
						}),
						a('div', {
							className: f.stackControls,
							children: [
								b &&
									a('div', {
										className: f.partialIndicator,
										title: 'Partially enabled',
									}),
								a(ze, {
									checked: l,
									onCheckedChange: (k) => {
										for (let h of e.purposes)
											for (let v of (o(h.id, k), h.vendors))
												v.usesLegitimateInterest || n(v.id, k);
									},
								}),
							],
						}),
					],
				}),
				a(Ae, {
					isOpen: m,
					children: [
						a('div', {
							className: f.stackDescription,
							children: [
								a('p', { children: e.description }),
								a('p', {
									className: f.stackMeta,
									children: [y, ' ', y === 1 ? 'partner' : 'partners'],
								}),
							],
						}),
						a('div', {
							className: f.stackContent,
							children: e.purposes.map((k) =>
								a(
									Me,
									{
										purpose: k,
										isEnabled: t[k.id] ?? !1,
										onToggle: (h) => o(k.id, h),
										vendorConsents: r,
										onVendorToggle: n,
										onVendorClick: i,
										vendorLegitimateInterests: s,
										onVendorLegitimateInterestToggle: c,
										purposeLegitimateInterests: u,
										onPurposeLegitimateInterestToggle: d,
									},
									k.id
								)
							),
						}),
					],
				}),
			],
		});
	};
	var ts = ue(null);
	function Wl() {
		let e = fe(ts);
		if (!e)
			throw Error('Tab components must be used within IABConsentDialogTabs');
		return e;
	}
	var wr = T(
		({ children: e, defaultTab: t = 'purposes', className: o, ...r }, n) => {
			let [i, s] = L(t),
				c = pe(),
				{
					purposes: u,
					specialPurposes: d,
					specialFeatures: m,
					features: p,
					totalVendors: l,
					isLoading: b,
				} = Co(),
				y = o ? `${f.tabsContainer} ${o}` : f.tabsContainer;
			return a(ts.Provider, {
				value: { activeTab: i, setActiveTab: s },
				children: e
					? a('div', { ref: n, className: y, ...r, children: e })
					: a('div', {
							ref: n,
							className: y,
							...r,
							children: a('div', {
								className: f.tabsList,
								children: [
									a('button', {
										type: 'button',
										onClick: () => s('purposes'),
										className: f.tabButton,
										'data-state': i === 'purposes' ? 'active' : 'inactive',
										children: [
											c.preferenceCenter.tabs.purposes,
											!b && ` (${u.length + d.length + m.length + p.length})`,
										],
									}),
									a('button', {
										type: 'button',
										onClick: () => s('vendors'),
										className: f.tabButton,
										'data-state': i === 'vendors' ? 'active' : 'inactive',
										children: [
											c.preferenceCenter.tabs.vendors,
											!b && ` (${l})`,
										],
									}),
								],
							}),
						}),
			});
		}
	);
	wr.displayName = 'IABConsentDialogTabs';
	var Ir = T(({ tab: e, children: t, className: o, ...r }, n) => {
		let { activeTab: i, setActiveTab: s } = Wl();
		return a('button', {
			ref: n,
			type: 'button',
			onClick: () => s(e),
			className: o ? `${f.tabButton} ${o}` : f.tabButton,
			'data-state': i === e ? 'active' : 'inactive',
			...r,
			children: t,
		});
	});
	Ir.displayName = 'IABConsentDialogTabButton';
	var _o = ({
		vendorData: e,
		purposes: t,
		vendorConsents: o,
		onVendorToggle: r,
		selectedVendorId: n,
		onClearSelection: i,
		customVendors: s = [],
		vendorLegitimateInterests: c = {},
		onVendorLegitimateInterestToggle: u,
	}) => {
		let [d, m] = L(''),
			[p, l] = L(new Set()),
			b = pe(),
			y = [
				...(e
					? Object.entries(e.vendors).map(([g, x]) => ({
							id: Number(g),
							name: x.name,
							policyUrl: x.policyUrl ?? '',
							usesNonCookieAccess: x.usesNonCookieAccess,
							deviceStorageDisclosureUrl: x.deviceStorageDisclosureUrl ?? null,
							usesCookies: x.usesCookies,
							cookieMaxAgeSeconds: x.cookieMaxAgeSeconds,
							cookieRefresh: x.cookieRefresh,
							specialPurposes: x.specialPurposes || [],
							specialFeatures: x.specialFeatures || [],
							features: x.features || [],
							purposes: x.purposes || [],
							legIntPurposes: x.legIntPurposes || [],
							isCustom: !1,
							legitimateInterestUrl:
								x.urls?.find((V) => V.legIntClaim)?.legIntClaim ?? null,
							dataRetention: x.dataRetention,
							dataDeclaration: x.dataDeclaration || [],
						}))
					: []),
				...s.map((g) => ({
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
			].sort((g, x) => g.name.localeCompare(x.name));
		M(() => {
			n !== null &&
				(l((g) => new Set(g).add(n)),
				setTimeout(() => {
					let g = document.getElementById(`vendor-${String(n)}`);
					g && g.scrollIntoView({ behavior: 'smooth', block: 'start' });
				}, 100));
		}, [n]);
		let k =
				n !== null
					? y.filter((g) => String(g.id) === String(n))
					: y.filter((g) => g.name.toLowerCase().includes(d.toLowerCase())),
			h = k.filter((g) => !g.isCustom),
			v = k.filter((g) => g.isCustom);
		return a('div', {
			children: [
				n !== null
					? a('div', {
							className: f.selectedVendorBanner,
							children: [
								a('p', {
									className: f.selectedVendorText,
									children: b.common.showingSelectedVendor,
								}),
								a('button', {
									type: 'button',
									onClick: i,
									className: f.clearSelectionButton,
									children: [
										a('svg', {
											className: f.clearIcon,
											viewBox: '0 0 24 24',
											fill: 'none',
											stroke: 'currentColor',
											strokeWidth: '2',
											children: [
												a('line', { x1: '18', y1: '6', x2: '6', y2: '18' }),
												a('line', { x1: '6', y1: '6', x2: '18', y2: '18' }),
											],
										}),
										b.common.clearSelection,
									],
								}),
							],
						})
					: a('div', {
							className: f.vendorListHeader,
							children: [
								a('div', {
									className: f.searchContainer,
									children: [
										a('svg', {
											className: f.searchIcon,
											viewBox: '0 0 24 24',
											fill: 'none',
											stroke: 'currentColor',
											strokeWidth: '2',
											children: [
												a('circle', { cx: '11', cy: '11', r: '8' }),
												a('line', {
													x1: '21',
													y1: '21',
													x2: '16.65',
													y2: '16.65',
												}),
											],
										}),
										a('input', {
											type: 'text',
											placeholder: b.preferenceCenter.vendorList.search,
											value: d,
											onChange: (g) => m(g.target.value),
											className: f.searchInput,
										}),
									],
								}),
								a('p', {
									className: f.vendorCount,
									children: b.preferenceCenter.vendorList.showingCount
										.replace('{filtered}', String(k.length))
										.replace('{total}', String(y.length)),
								}),
							],
						}),
				h.length > 0 &&
					a('div', {
						className: f.vendorSection,
						children: [
							a('div', {
								className: f.iabVendorSectionHeader,
								children: [
									a('h3', {
										className: f.vendorSectionHeading,
										children: [
											a('svg', {
												className: f.vendorSectionIcon,
												viewBox: '0 0 24 24',
												fill: 'none',
												stroke: 'currentColor',
												strokeWidth: '2',
												children: [
													a('path', { d: 'M12 2L2 7l10 5 10-5-10-5z' }),
													a('path', { d: 'M2 17l10 5 10-5' }),
													a('path', { d: 'M2 12l10 5 10-5' }),
												],
											}),
											b.preferenceCenter.vendorList.iabVendorsHeading,
											' (',
											h.length,
											')',
										],
									}),
									a('p', {
										className: f.iabVendorNotice,
										children: b.preferenceCenter.vendorList.iabVendorsNotice,
									}),
								],
							}),
							a('div', { children: h.map((g) => C(g)) }),
						],
					}),
				v.length > 0 &&
					a('div', {
						className: f.vendorSection,
						children: [
							a('div', {
								className: f.customVendorSectionHeader,
								children: [
									a('h3', {
										className: f.vendorSectionHeading,
										children: [
											a('svg', {
												className: f.vendorSectionIcon,
												viewBox: '0 0 24 24',
												fill: 'none',
												stroke: 'currentColor',
												strokeWidth: '2',
												children: [
													a('circle', { cx: '12', cy: '12', r: '10' }),
													a('line', { x1: '2', y1: '12', x2: '22', y2: '12' }),
													a('path', {
														d: 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
													}),
												],
											}),
											b.preferenceCenter.vendorList.customVendorsHeading,
											' (',
											v.length,
											')',
										],
									}),
									a('p', {
										className: f.customVendorNotice,
										children: b.preferenceCenter.vendorList.customVendorsNotice,
									}),
								],
							}),
							a('div', { children: v.map((g) => C(g)) }),
						],
					}),
				k.length === 0 &&
					a('div', {
						className: f.emptyState,
						children: a('p', {
							className: f.emptyStateText,
							children: ['No vendors found matching "', d, '"'],
						}),
					}),
			],
		});
		function C(g) {
			var x, V, w, I;
			let j,
				E,
				N,
				_,
				F = String(g.id),
				A =
					((x = g.id),
					(j = y.find((S) => String(S.id) === String(x)))
						? t
								.filter((S) =>
									S.vendors.some((X) => String(X.id) === String(x))
								)
								.map((S) => ({
									...S,
									usesLegitimateInterest: j.legIntPurposes.includes(S.id),
								}))
						: []),
				K =
					((V = g.id),
					(E = y.find((S) => String(S.id) === String(V))) && e
						? E.specialPurposes
								.map((S) => e.specialPurposes[S])
								.filter((S) => S != null)
								.map((S) => ({
									id: S.id,
									name: S.name,
									description: S.description,
								}))
						: []),
				me =
					((w = g.id),
					(N = y.find((S) => String(S.id) === String(w))) && e
						? N.specialFeatures
								.map((S) => e.specialFeatures[S])
								.filter((S) => S != null)
								.map((S) => ({
									id: S.id,
									name: S.name,
									description: S.description,
								}))
						: []),
				ve =
					((I = g.id),
					(_ = y.find((S) => String(S.id) === String(I))) && e
						? (_.features || [])
								.map((S) => e.features[S])
								.filter((S) => S != null)
								.map((S) => ({
									id: S.id,
									name: S.name,
									description: S.description,
								}))
						: []),
				Ct = p.has(g.id),
				$e = A.filter((S) => S.usesLegitimateInterest).length,
				So = g.legIntPurposes.length > 0,
				Qe = c[F] ?? !0,
				Et = g.dataRetention?.stdRetention,
				De = null;
			return (
				g.cookieMaxAgeSeconds &&
					((De = b.preferenceCenter.vendorList.maxAge.replace(
						'{days}',
						String(Math.floor(g.cookieMaxAgeSeconds / 86400))
					)),
					g.cookieRefresh && (De = `${De} (refreshes)`)),
				a(
					'div',
					{
						id: `vendor-${F}`,
						className: `${f.vendorListItem} ${g.isCustom ? f.customVendorItem : ''}`,
						children: [
							a('div', {
								className: f.vendorListItemHeader,
								children: [
									a('button', {
										type: 'button',
										onClick: () => {
											var S;
											return (
												(S = g.id),
												void l((X) => {
													let Be = new Set(X);
													return Be.has(S) ? Be.delete(S) : Be.add(S), Be;
												})
											);
										},
										className: f.vendorListTrigger,
										children: [
											a('div', {
												className: f.vendorListInfo,
												children: [
													a('h3', {
														className: f.vendorListName,
														children: [
															g.name,
															g.isCustom &&
																a('svg', {
																	className: f.customVendorIcon,
																	viewBox: '0 0 24 24',
																	fill: 'none',
																	stroke: 'currentColor',
																	strokeWidth: '2',
																	'aria-label': b.common.customPartner,
																	children: [
																		a('circle', {
																			cx: '12',
																			cy: '12',
																			r: '10',
																		}),
																		a('line', {
																			x1: '2',
																			y1: '12',
																			x2: '22',
																			y2: '12',
																		}),
																		a('path', {
																			d: 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
																		}),
																	],
																}),
														],
													}),
													a('div', {
														className: f.vendorListMeta,
														children: [
															a('span', {
																className: f.vendorListMetaText,
																children: [
																	A.length,
																	' purpose',
																	A.length !== 1 ? 's' : '',
																	K.length > 0 && `, ${K.length} special`,
																	me.length > 0 &&
																		`, ${me.length} feature${me.length !== 1 ? 's' : ''}`,
																],
															}),
															$e > 0 &&
																a('span', {
																	className: f.vendorListLIBadge,
																	children: [
																		a('svg', {
																			style: {
																				width: '0.625rem',
																				height: '0.625rem',
																			},
																			viewBox: '0 0 24 24',
																			fill: 'none',
																			stroke: 'currentColor',
																			strokeWidth: '2',
																			children: a('path', {
																				d: 'M12 3v18M3 12h18M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07',
																			}),
																		}),
																		$e,
																		' ',
																		b.preferenceCenter.vendorList
																			.legitimateInterest,
																	],
																}),
														],
													}),
												],
											}),
											a('svg', {
												className: f.purposeArrow,
												viewBox: '0 0 24 24',
												fill: 'none',
												stroke: 'currentColor',
												strokeWidth: '2',
												children: Ct
													? a('path', { d: 'M19 15l-7-7-7 7' })
													: a('path', { d: 'M19 9l-7 7-7-7' }),
											}),
										],
									}),
									a(ze, {
										checked: o[F] ?? !1,
										onCheckedChange: (S) => r(g.id, S),
									}),
								],
							}),
							a(Ae, {
								isOpen: Ct,
								children: a('div', {
									className: f.vendorListContent,
									children: [
										a('div', {
											className: f.vendorLinks,
											children: [
												a('a', {
													href: g.policyUrl,
													target: '_blank',
													rel: 'noopener noreferrer',
													className: f.vendorLink,
													children: [
														a('svg', {
															className: f.vendorLinkIcon,
															viewBox: '0 0 24 24',
															fill: 'none',
															stroke: 'currentColor',
															strokeWidth: '2',
															children: [
																a('path', {
																	d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
																}),
																a('polyline', { points: '15 3 21 3 21 9' }),
																a('line', {
																	x1: '10',
																	y1: '14',
																	x2: '21',
																	y2: '3',
																}),
															],
														}),
														b.preferenceCenter.vendorList.privacyPolicy,
													],
												}),
												g.legitimateInterestUrl &&
													a('a', {
														href: g.legitimateInterestUrl,
														target: '_blank',
														rel: 'noopener noreferrer',
														className: f.vendorLink,
														children: [
															a('svg', {
																className: f.vendorLinkIcon,
																viewBox: '0 0 24 24',
																fill: 'none',
																stroke: 'currentColor',
																strokeWidth: '2',
																children: [
																	a('path', {
																		d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
																	}),
																	a('polyline', { points: '15 3 21 3 21 9' }),
																	a('line', {
																		x1: '10',
																		y1: '14',
																		x2: '21',
																		y2: '3',
																	}),
																],
															}),
															b.preferenceCenter.purposeItem.legitimateInterest,
														],
													}),
												g.deviceStorageDisclosureUrl &&
													a('a', {
														href: g.deviceStorageDisclosureUrl,
														target: '_blank',
														rel: 'noopener noreferrer',
														className: f.vendorLink,
														children: [
															a('svg', {
																className: f.vendorLinkIcon,
																viewBox: '0 0 24 24',
																fill: 'none',
																stroke: 'currentColor',
																strokeWidth: '2',
																children: [
																	a('path', {
																		d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
																	}),
																	a('polyline', { points: '15 3 21 3 21 9' }),
																	a('line', {
																		x1: '10',
																		y1: '14',
																		x2: '21',
																		y2: '3',
																	}),
																],
															}),
															b.preferenceCenter.vendorList.storageDisclosure,
														],
													}),
											],
										}),
										a('div', {
											className: f.vendorBadges,
											children: [
												g.usesCookies &&
													a('span', {
														className: f.vendorBadge,
														children: b.preferenceCenter.vendorList.usesCookies,
													}),
												g.usesNonCookieAccess &&
													a('span', {
														className: f.vendorBadge,
														children:
															b.preferenceCenter.vendorList.nonCookieAccess,
													}),
												De &&
													a('span', { className: f.vendorBadge, children: De }),
												Et &&
													a('span', {
														className: f.vendorBadge,
														children:
															b.preferenceCenter.vendorList.retention.replace(
																'{days}',
																String(Et)
															),
													}),
											],
										}),
										A.length > 0 &&
											a('div', {
												className: f.vendorPurposesList,
												children: [
													a('h4', {
														className: f.vendorPurposesTitle,
														children: [
															b.preferenceCenter.vendorList.purposes,
															' (',
															A.length,
															')',
														],
													}),
													a('ul', {
														className: f.vendorPurposesItems,
														children: A.map((S) => {
															let X;
															return (
																g.dataRetention?.purposes?.[S.id]
																	? (X = g.dataRetention.purposes[S.id])
																	: g.dataRetention?.stdRetention &&
																		(X = g.dataRetention.stdRetention),
																a(
																	'li',
																	{
																		className: `${f.vendorPurposeItem} ${S.usesLegitimateInterest ? f.vendorPurposeItemLI : ''}`,
																		children: [
																			a('span', {
																				children: [
																					S.name,
																					X &&
																						a('span', {
																							className: f.vendorRetention,
																							children: [
																								' ',
																								'(Retained: ',
																								X,
																								'd)',
																							],
																						}),
																				],
																			}),
																			S.usesLegitimateInterest &&
																				a('span', {
																					className: f.vendorListLIBadge,
																					children: [
																						a('svg', {
																							style: {
																								width: '0.625rem',
																								height: '0.625rem',
																							},
																							viewBox: '0 0 24 24',
																							fill: 'none',
																							stroke: 'currentColor',
																							strokeWidth: '2',
																							children: a('path', {
																								d: 'M12 3v18M3 12h18M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07',
																							}),
																						}),
																						b.preferenceCenter.vendorList
																							.legitimateInterest,
																					],
																				}),
																		],
																	},
																	S.id
																)
															);
														}),
													}),
												],
											}),
										So &&
											u &&
											a('div', {
												className: f.vendorLISection,
												children: [
													a('div', {
														className: f.vendorLISectionHeader,
														children: [
															a('h4', {
																className: f.vendorPurposesTitle,
																children: [
																	a('svg', {
																		style: {
																			width: '0.75rem',
																			height: '0.75rem',
																			marginRight: '0.25rem',
																		},
																		viewBox: '0 0 24 24',
																		fill: 'none',
																		stroke: 'currentColor',
																		strokeWidth: '2',
																		children: a('path', {
																			d: 'M12 3v18M3 12h18M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07',
																		}),
																	}),
																	b.preferenceCenter.purposeItem
																		.legitimateInterest,
																],
															}),
															a('button', {
																type: 'button',
																onClick: () => u(g.id, !Qe),
																className: `${f.objectButton} ${Qe ? '' : f.objectButtonActive}`,
																'aria-pressed': !Qe,
																children: Qe
																	? b.preferenceCenter.purposeItem.objectButton
																	: b.preferenceCenter.purposeItem.objected,
															}),
														],
													}),
													a('p', {
														className: f.liExplanation,
														children:
															b.preferenceCenter.purposeItem.rightToObject,
													}),
												],
											}),
										g.dataDeclaration &&
											g.dataDeclaration.length > 0 &&
											a('div', {
												className: f.vendorPurposesList,
												children: [
													a('h4', {
														className: f.vendorPurposesTitle,
														children: [
															b.preferenceCenter.vendorList.dataCategories,
															' (',
															g.dataDeclaration.length,
															')',
														],
													}),
													a('ul', {
														className: f.vendorPurposesItems,
														children: g.dataDeclaration.map((S) => {
															let X = e?.dataCategories?.[S];
															return a(
																'li',
																{
																	className: f.vendorPurposeItem,
																	title: X?.description,
																	children: X?.name || `Data Category ${S}`,
																},
																S
															);
														}),
													}),
												],
											}),
										K.length > 0 &&
											a('div', {
												className: f.vendorPurposesList,
												children: [
													a('h4', {
														className: f.vendorPurposesTitle,
														children: [
															a('svg', {
																'aria-label':
																	b.preferenceCenter.vendorList.specialPurposes,
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
																	a('title', {
																		children:
																			b.preferenceCenter.vendorList
																				.specialPurposes,
																	}),
																	a('rect', {
																		x: '3',
																		y: '11',
																		width: '18',
																		height: '11',
																		rx: '2',
																		ry: '2',
																	}),
																	a('path', { d: 'M7 11V7a5 5 0 0 1 10 0v4' }),
																],
															}),
															b.preferenceCenter.vendorList.specialPurposes,
															' (',
															K.length,
															')',
														],
													}),
													a('ul', {
														className: f.vendorPurposesItems,
														children: K.map((S) => {
															let X;
															return (
																g.dataRetention?.specialPurposes?.[S.id]
																	? (X = g.dataRetention.specialPurposes[S.id])
																	: g.dataRetention?.stdRetention &&
																		(X = g.dataRetention.stdRetention),
																a(
																	'li',
																	{
																		className: f.vendorPurposeItem,
																		children: a('span', {
																			children: [
																				S.name,
																				X &&
																					a('span', {
																						className: f.vendorRetention,
																						children: [
																							' ',
																							'(Retained: ',
																							X,
																							'd)',
																						],
																					}),
																			],
																		}),
																	},
																	S.id
																)
															);
														}),
													}),
													a('p', {
														className: f.vendorListMetaText,
														style: {
															fontStyle: 'italic',
															marginTop: '0.25rem',
														},
														children:
															b.preferenceCenter.vendorList.requiredNotice,
													}),
												],
											}),
										me.length > 0 &&
											a('div', {
												className: f.vendorPurposesList,
												children: [
													a('h4', {
														className: f.vendorPurposesTitle,
														children: [
															b.preferenceCenter.vendorList.specialFeatures,
															' (',
															me.length,
															')',
														],
													}),
													a('ul', {
														className: f.vendorPurposesItems,
														children: me.map((S) =>
															a(
																'li',
																{
																	className: f.vendorPurposeItem,
																	children: S.name,
																},
																S.id
															)
														),
													}),
												],
											}),
										ve.length > 0 &&
											a('div', {
												className: f.vendorPurposesList,
												children: [
													a('h4', {
														className: f.vendorPurposesTitle,
														children: [
															b.preferenceCenter.vendorList.features,
															' (',
															ve.length,
															')',
														],
													}),
													a('ul', {
														className: f.vendorPurposesItems,
														children: ve.map((S) =>
															a(
																'li',
																{
																	className: f.vendorPurposeItem,
																	children: S.name,
																},
																S.id
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
	var os = ({
		open: e,
		noStyle: t,
		disableAnimation: o,
		scrollLock: r = !0,
		trapFocus: n = !0,
		hideBranding: i,
		showTrigger: s = !1,
		models: c = ['iab'],
		uiSource: u,
	}) => {
		let d = pe(),
			{
				iab: m,
				activeUI: p,
				setActiveUI: l,
				translationConfig: b,
				model: y,
			} = W(),
			k = dt(b.defaultLanguage),
			h = z(null),
			v = z(null),
			C = z(null),
			[g, x] = L(m?.preferenceCenterTab ?? 'purposes'),
			[V, w] = L(null),
			[I, j] = L(!1),
			[E, N] = L(!1),
			[_, F] = L(!1),
			A = e ?? (p === 'dialog' && c.includes(y)),
			K = ao({ noStyle: t, disableAnimation: o, scrollLock: r, trapFocus: n }),
			{
				purposes: me,
				specialPurposes: ve,
				specialFeatures: Ct,
				features: $e,
				stacks: So,
				standalonePurposes: Qe,
			} = $(() => {
				if (!m?.gvl)
					return {
						purposes: [],
						specialPurposes: [],
						specialFeatures: [],
						features: [],
						stacks: [],
						standalonePurposes: [],
					};
				let R = m.gvl,
					ee = m.nonIABVendors || [],
					Z = (O, P, ye) => ({
						id: Number(O),
						name: P.name,
						policyUrl: P.policyUrl ?? '',
						usesNonCookieAccess: P.usesNonCookieAccess,
						deviceStorageDisclosureUrl: P.deviceStorageDisclosureUrl ?? null,
						usesCookies: P.usesCookies,
						cookieMaxAgeSeconds: P.cookieMaxAgeSeconds,
						cookieRefresh: P.cookieRefresh,
						legitimateInterestUrl:
							P.urls?.find((J) => J.legIntClaim)?.legIntClaim ?? null,
						specialPurposes: P.specialPurposes || [],
						specialFeatures: P.specialFeatures || [],
						features: P.features || [],
						purposes: P.purposes || [],
						legIntPurposes: P.legIntPurposes || [],
						usesLegitimateInterest:
							!!ye && (P.legIntPurposes?.includes(ye) ?? !1),
						dataRetention: P.dataRetention,
						isCustom: !1,
					}),
					qe = Object.entries(R.purposes)
						.map(([O, P]) => {
							let ye = Object.entries(R.vendors)
									.filter(
										([, U]) =>
											U.purposes?.includes(Number(O)) ||
											U.legIntPurposes?.includes(Number(O))
									)
									.map(([U, Ee]) => Z(U, Ee, Number(O))),
								J = ee
									.filter(
										(U) =>
											U.purposes?.includes(Number(O)) ||
											U.legIntPurposes?.includes(Number(O))
									)
									.map((U) => {
										let Ee;
										return (
											(Ee = Number(O)),
											{
												id: U.id,
												name: U.name,
												policyUrl: U.privacyPolicyUrl,
												usesNonCookieAccess: U.usesNonCookieAccess ?? !1,
												deviceStorageDisclosureUrl: null,
												usesCookies: U.usesCookies ?? !1,
												cookieMaxAgeSeconds: U.cookieMaxAgeSeconds ?? null,
												cookieRefresh: void 0,
												legitimateInterestUrl: null,
												specialPurposes: [],
												specialFeatures: U.specialFeatures || [],
												features: U.features || [],
												purposes: U.purposes || [],
												legIntPurposes: U.legIntPurposes || [],
												usesLegitimateInterest:
													!!Ee && (U.legIntPurposes?.includes(Ee) ?? !1),
												dataRetention: void 0,
												isCustom: !0,
											}
										);
									});
							return {
								id: Number(O),
								name: P.name,
								description: P.description,
								descriptionLegal: P.descriptionLegal,
								illustrations: P.illustrations || [],
								vendors: [...ye, ...J],
							};
						})
						.filter((O) => O.vendors.length > 0),
					Pt = Object.entries(R.specialPurposes || {})
						.map(([O, P]) => {
							let ye = Object.entries(R.vendors)
								.filter(([, J]) => J.specialPurposes?.includes(Number(O)))
								.map(([J, U]) => Z(J, U));
							return {
								id: Number(O),
								name: P.name,
								description: P.description,
								descriptionLegal: P.descriptionLegal,
								illustrations: P.illustrations || [],
								vendors: ye,
								isSpecialPurpose: !0,
							};
						})
						.filter((O) => O.vendors.length > 0),
					wo = Object.entries(R.specialFeatures || {})
						.map(([O, P]) => {
							let ye = Object.entries(R.vendors)
								.filter(([, J]) => J.specialFeatures?.includes(Number(O)))
								.map(([J, U]) => Z(J, U));
							return {
								id: Number(O),
								name: P.name,
								description: P.description,
								descriptionLegal: P.descriptionLegal,
								illustrations: P.illustrations || [],
								vendors: ye,
							};
						})
						.filter((O) => O.vendors.length > 0),
					is = Object.entries(R.features || {})
						.map(([O, P]) => {
							let ye = Object.entries(R.vendors)
								.filter(([, J]) => J.features?.includes(Number(O)))
								.map(([J, U]) => Z(J, U));
							return {
								id: Number(O),
								name: P.name,
								description: P.description,
								descriptionLegal: P.descriptionLegal,
								illustrations: P.illustrations || [],
								vendors: ye,
							};
						})
						.filter((O) => O.vendors.length > 0),
					Br = qe.find((O) => O.id === 1),
					Io = qe.filter((O) => O.id !== 1),
					ss = new Set(Io.map((O) => O.id)),
					as = R.stacks || {},
					Ro = [];
				for (let [O, P] of Object.entries(as)) {
					let ye = Number(O),
						J = P.purposes.filter((U) => ss.has(U));
					J.length >= 2 &&
						Ro.push({
							stackId: ye,
							stack: P,
							coveredPurposeIds: J,
							score: J.length,
						});
				}
				Ro.sort((O, P) => P.score - O.score);
				let Er = [],
					To = new Set();
				for (let { stackId: O, stack: P, coveredPurposeIds: ye } of Ro) {
					let J = ye.filter((U) => !To.has(U));
					if (J.length >= 2) {
						let U = Io.filter((Ee) => J.includes(Ee.id));
						for (let Ee of (Er.push({
							id: O,
							name: P.name,
							description: P.description,
							purposes: U,
						}),
						J))
							To.add(Ee);
					}
				}
				let Pr = Io.filter((O) => !To.has(O.id));
				return {
					purposes: qe,
					specialPurposes: Pt,
					specialFeatures: wo,
					features: is,
					stacks: Er,
					standalonePurposes: Br ? [Br, ...Pr] : Pr,
				};
			}, [m?.gvl, m?.nonIABVendors]),
			Et = $(
				() =>
					m?.gvl
						? Object.keys(m.gvl.vendors).length + (m.nonIABVendors?.length ?? 0)
						: 0,
				[m?.gvl, m?.nonIABVendors]
			),
			De = G(
				(R, ee) => {
					m?.setPurposeConsent(R, ee);
				},
				[m]
			),
			S = G(
				(R, ee) => {
					m?.setSpecialFeatureOptIn(R, ee);
				},
				[m]
			),
			X = G(
				(R, ee) => {
					m?.setVendorConsent(R, ee);
				},
				[m]
			),
			Be = G(
				(R, ee) => {
					m?.setVendorLegitimateInterest(R, ee);
				},
				[m]
			),
			Tr = G(
				(R, ee) => {
					m?.setPurposeLegitimateInterest(R, ee);
				},
				[m]
			),
			kt = (R) => {
				w(R), x('vendors'), m?.setPreferenceCenterTab('vendors');
			};
		Ue(!!(A && K.trapFocus), h),
			Ve(!!(A && K.scrollLock)),
			M(() => {
				N(!0);
			}, []),
			M(() => {
				if (A) F(!0);
				else if (K.disableAnimation) F(!1);
				else {
					let R = setTimeout(() => {
						F(!1);
					}, 150);
					return () => clearTimeout(R);
				}
			}, [A, K.disableAnimation]),
			M(() => {
				A && m?.preferenceCenterTab && x(m.preferenceCenterTab);
			}, [A, m?.preferenceCenterTab]),
			ke(() => {
				let R,
					ee,
					Z = v.current;
				if (!Z || C.current === null) return;
				let qe = C.current;
				if (
					((C.current = null),
					!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
				)
					return (
						(Z.style.height = `${qe}px`),
						(Z.style.overflow = 'hidden'),
						(Z.style.transition = 'none'),
						(R = requestAnimationFrame(() => {
							ee = requestAnimationFrame(() => {
								if (!Z) return;
								Z.style.height = 'auto';
								let Pt = Z.getBoundingClientRect().height;
								if (((Z.style.height = `${qe}px`), 1 > Math.abs(qe - Pt))) {
									(Z.style.height = ''),
										(Z.style.overflow = ''),
										(Z.style.transition = '');
									return;
								}
								Z.offsetHeight,
									(Z.style.transition =
										'height 250ms cubic-bezier(0.33, 1, 0.68, 1)'),
									(Z.style.height = `${Pt}px`),
									Z.addEventListener(
										'transitionend',
										(wo) => {
											wo.propertyName === 'height' &&
												((Z.style.height = ''),
												(Z.style.overflow = ''),
												(Z.style.transition = ''));
										},
										{ once: !0 }
									);
							});
						})),
						() => {
							cancelAnimationFrame(R), cancelAnimationFrame(ee);
						}
					);
			}, [g]);
		let Lr = G(
			(R) => {
				v.current && (C.current = v.current.offsetHeight),
					x(R),
					m?.setPreferenceCenterTab(R);
			},
			[m]
		);
		if (!E || !m?.config.enabled) return null;
		let et = m.isLoadingGVL || !m.gvl,
			ns = a(lt.Provider, {
				value: { uiSource: u ?? 'iab_dialog' },
				children: [
					a(Je, { isOpen: A }),
					a('div', {
						className: `${f.root} ${_ ? f.dialogVisible : f.dialogHidden}`,
						'data-testid': 'iab-consent-dialog-root',
						dir: k,
						children: a('div', {
							ref: h,
							className: `${f.card} ${_ ? f.contentVisible : f.contentHidden}`,
							role: 'dialog',
							'aria-modal': K.trapFocus ? 'true' : void 0,
							'aria-label': d.preferenceCenter.title,
							tabIndex: 0,
							'data-testid': 'iab-consent-dialog-card',
							children: [
								a('div', {
									className: f.header,
									children: [
										a('div', {
											className: f.headerContent,
											children: [
												a('h2', {
													className: f.title,
													children: d.preferenceCenter.title,
												}),
												a('p', {
													className: f.description,
													children: d.preferenceCenter.description,
												}),
											],
										}),
										a('button', {
											type: 'button',
											onClick: () => {
												l('none');
											},
											className: f.closeButton,
											'aria-label': 'Close',
											children: a('svg', {
												style: { width: '1rem', height: '1rem' },
												viewBox: '0 0 24 24',
												fill: 'none',
												stroke: 'currentColor',
												strokeWidth: '2',
												children: [
													a('line', { x1: '18', y1: '6', x2: '6', y2: '18' }),
													a('line', { x1: '6', y1: '6', x2: '18', y2: '18' }),
												],
											}),
										}),
									],
								}),
								a('div', {
									className: f.tabsContainer,
									children: a('div', {
										className: f.tabsList,
										role: 'tablist',
										children: [
											a('button', {
												type: 'button',
												role: 'tab',
												'aria-selected': g === 'purposes',
												onClick: () => Lr('purposes'),
												className: f.tabButton,
												'data-state': g === 'purposes' ? 'active' : 'inactive',
												children: [
													d.preferenceCenter.tabs.purposes,
													!et &&
														` (${me.length + ve.length + Ct.length + $e.length})`,
												],
											}),
											a('button', {
												type: 'button',
												role: 'tab',
												'aria-selected': g === 'vendors',
												onClick: () => Lr('vendors'),
												className: f.tabButton,
												'data-state': g === 'vendors' ? 'active' : 'inactive',
												children: [
													d.preferenceCenter.tabs.vendors,
													!et && ` (${Et})`,
												],
											}),
											a('div', {
												className: f.tabIndicator,
												'data-active-tab': g,
												'aria-hidden': 'true',
											}),
										],
									}),
								}),
								a('div', {
									ref: v,
									className: f.content,
									children: et
										? a('div', {
												className: f.loadingContainer,
												children: [
													a('div', { className: f.loadingSpinner }),
													a('p', {
														className: f.loadingText,
														children: d.common.loading,
													}),
												],
											})
										: g === 'purposes'
											? a(H, {
													children: [
														Qe.map((R) =>
															a(
																Me,
																{
																	purpose: R,
																	isEnabled: m.purposeConsents[R.id] ?? !1,
																	onToggle: (ee) => De(R.id, ee),
																	vendorConsents: m.vendorConsents,
																	onVendorToggle: X,
																	onVendorClick: kt,
																	vendorLegitimateInterests:
																		m.vendorLegitimateInterests,
																	onVendorLegitimateInterestToggle: Be,
																	purposeLegitimateInterests:
																		m.purposeLegitimateInterests,
																	onPurposeLegitimateInterestToggle: Tr,
																},
																R.id
															)
														),
														So.map((R) =>
															a(
																xo,
																{
																	stack: R,
																	consents: m.purposeConsents,
																	onToggle: De,
																	vendorConsents: m.vendorConsents,
																	onVendorToggle: X,
																	onVendorClick: kt,
																	vendorLegitimateInterests:
																		m.vendorLegitimateInterests,
																	onVendorLegitimateInterestToggle: Be,
																	purposeLegitimateInterests:
																		m.purposeLegitimateInterests,
																	onPurposeLegitimateInterestToggle: Tr,
																},
																R.id
															)
														),
														Ct.map((R) =>
															a(
																Me,
																{
																	purpose: {
																		id: R.id,
																		name: R.name,
																		description: R.description,
																		illustrations: R.illustrations,
																		vendors: R.vendors,
																	},
																	isEnabled: m.specialFeatureOptIns[R.id] ?? !1,
																	onToggle: (ee) => S(R.id, ee),
																	vendorConsents: m.vendorConsents,
																	onVendorToggle: X,
																	onVendorClick: kt,
																	vendorLegitimateInterests:
																		m.vendorLegitimateInterests,
																	onVendorLegitimateInterestToggle: Be,
																},
																`feature-${R.id}`
															)
														),
														(ve.length > 0 || $e.length > 0) &&
															a('div', {
																className: f.specialPurposesSection,
																children: [
																	a('div', {
																		className: f.specialPurposesHeader,
																		children: [
																			a('button', {
																				type: 'button',
																				onClick: () => j(!I),
																				className: f.purposeTrigger,
																				children: [
																					a('svg', {
																						className: f.purposeArrow,
																						viewBox: '0 0 24 24',
																						fill: 'none',
																						stroke: 'currentColor',
																						strokeWidth: '2',
																						children: I
																							? a('path', {
																									d: 'M19 9l-7 7-7-7',
																								})
																							: a('path', {
																									d: 'M9 5l7 7-7 7',
																								}),
																					}),
																					a('div', {
																						className: f.purposeInfo,
																						children: [
																							a('h3', {
																								className:
																									f.specialPurposesTitle,
																								children: [
																									d.preferenceCenter
																										.specialPurposes.title,
																									a('svg', {
																										className: f.lockIcon,
																										viewBox: '0 0 24 24',
																										fill: 'none',
																										stroke: 'currentColor',
																										strokeWidth: '2',
																										children: [
																											a('rect', {
																												x: '3',
																												y: '11',
																												width: '18',
																												height: '11',
																												rx: '2',
																												ry: '2',
																											}),
																											a('path', {
																												d: 'M7 11V7a5 5 0 0 1 10 0v4',
																											}),
																										],
																									}),
																								],
																							}),
																							a('p', {
																								className: f.purposeMeta,
																								children: [
																									new Set([
																										...ve.flatMap((R) =>
																											R.vendors.map(
																												(ee) => ee.id
																											)
																										),
																										...$e.flatMap((R) =>
																											R.vendors.map(
																												(ee) => ee.id
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
																			a('div', {
																				style: { position: 'relative' },
																				children: a('svg', {
																					className: f.infoIcon,
																					viewBox: '0 0 24 24',
																					fill: 'none',
																					stroke: 'currentColor',
																					strokeWidth: '2',
																					'aria-label':
																						d.preferenceCenter.specialPurposes
																							.tooltip,
																					children: [
																						a('circle', {
																							cx: '12',
																							cy: '12',
																							r: '10',
																						}),
																						a('line', {
																							x1: '12',
																							y1: '16',
																							x2: '12',
																							y2: '12',
																						}),
																						a('line', {
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
																	I &&
																		a('div', {
																			style: { padding: '0.75rem' },
																			children: [
																				ve.map((R) =>
																					a(
																						Me,
																						{
																							purpose: R,
																							isEnabled: !0,
																							onToggle: () => {},
																							vendorConsents: m.vendorConsents,
																							onVendorToggle: X,
																							onVendorClick: kt,
																							isLocked: !0,
																						},
																						`special-${R.id}`
																					)
																				),
																				$e.map((R) =>
																					a(
																						Me,
																						{
																							purpose: {
																								id: R.id,
																								name: R.name,
																								description: R.description,
																								illustrations: R.illustrations,
																								vendors: R.vendors,
																							},
																							isEnabled: !0,
																							onToggle: () => {},
																							vendorConsents: m.vendorConsents,
																							onVendorToggle: X,
																							onVendorClick: kt,
																							isLocked: !0,
																						},
																						`feature-${R.id}`
																					)
																				),
																			],
																		}),
																],
															}),
														a('div', {
															className: f.consentNotice,
															children: a('p', {
																className: f.consentNoticeText,
																children:
																	d.preferenceCenter.footer.consentStorage,
															}),
														}),
													],
												})
											: a(_o, {
													vendorData: m.gvl,
													purposes: me,
													vendorConsents: m.vendorConsents,
													onVendorToggle: X,
													selectedVendorId: V,
													onClearSelection: () => w(null),
													customVendors: m.nonIABVendors,
													vendorLegitimateInterests:
														m.vendorLegitimateInterests,
													onVendorLegitimateInterestToggle: Be,
												}),
								}),
								a('div', {
									className: f.footer,
									children: [
										a('div', {
											className: f.footerButtons,
											children: [
												a(_e, {
													variant: 'neutral',
													mode: 'stroke',
													size: 'small',
													onClick: () => {
														m?.rejectAll(), m?.save(), l('none');
													},
													disabled: et,
													children: d.common.rejectAll,
												}),
												a(_e, {
													variant: 'neutral',
													mode: 'stroke',
													size: 'small',
													onClick: () => {
														m?.acceptAll(), m?.save(), l('none');
													},
													disabled: et,
													children: d.common.acceptAll,
												}),
											],
										}),
										a('div', { className: f.footerSpacer }),
										a(_e, {
											variant: 'primary',
											mode: 'filled',
											size: 'small',
											onClick: () => {
												m?.save(), l('none');
											},
											disabled: et,
											children: d.common.saveSettings,
										}),
									],
								}),
								!i &&
									a('div', {
										className: f.branding,
										children: a(dr, { hideBranding: i ?? !1 }),
									}),
							],
						}),
					}),
				],
			}),
			Nr = s === !0 ? {} : s === !1 ? null : s,
			Ar = Nr ? a(ur, { ...Nr }) : null;
		return A || _ ? a(H, { children: [Ar, Le(ns, document.body)] }) : Ar;
	};
	var Rr = Object.assign(os, {
		Root: Sr,
		Card: Cr,
		Header: _r,
		Tabs: wr,
		TabButton: Ir,
		Content: kr,
		Footer: xr,
		Overlay: Je,
		PurposeItem: Me,
		StackItem: xo,
		VendorList: _o,
	});
	function Kl(e) {
		let t = { Banner: yr, Dialog: Rr };
		if (e.c15tEmbed?.registerIABComponents) {
			e.c15tEmbed.registerIABComponents(t);
			return;
		}
		e.__c15tEmbedPendingIABComponents = t;
	}
	function rs(e = window) {
		Kl(e);
	}
	typeof window < 'u' && rs(window);
	return ps(Yl);
})();
