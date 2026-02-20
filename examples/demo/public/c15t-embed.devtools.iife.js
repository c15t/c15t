'use strict';
var c15tEmbedDevToolsBundle = (() => {
	var ye = Object.defineProperty;
	var rt = Object.getOwnPropertyDescriptor;
	var at = Object.getOwnPropertyNames;
	var st = Object.prototype.hasOwnProperty;
	var it = (e, t) => {
			for (var o in t) ye(e, o, { get: t[o], enumerable: !0 });
		},
		lt = (e, t, o, s) => {
			if ((t && typeof t == 'object') || typeof t == 'function')
				for (let n of at(t))
					!st.call(e, n) &&
						n !== o &&
						ye(e, n, {
							get: () => t[n],
							enumerable: !(s = rt(t, n)) || s.enumerable,
						});
			return e;
		};
	var ct = (e) => lt(ye({}, '__esModule', { value: !0 }), e);
	var sn = {};
	it(sn, {
		initializeEmbedDevTools: () => Ne,
		mountEmbedDevTools: () => Oe,
		unmountEmbedDevTools: () => xe,
		version: () => he,
	});
	var dt = {
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/animations.module.css'(
				e,
				t,
				o
			) {
				o.d(t, { A: () => c });
				var s = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'
					),
					n = o.n(s),
					r = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'
					),
					a = o.n(r),
					i = a()(n());
				i.push([
					e.id,
					`@keyframes devtoolsEnter-Jgl1Uz {
  from {
    opacity: 0;
    transform: scale(.95)translateY(8px);
  }

  to {
    opacity: 1;
    transform: scale(1)translateY(0);
  }
}

@keyframes devtoolsExit-GVem79 {
  from {
    opacity: 1;
    transform: scale(1)translateY(0);
  }

  to {
    opacity: 0;
    transform: scale(.95)translateY(8px);
  }
}

@keyframes buttonPulse-thl_xD {
  0%, 100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.05);
  }
}

@keyframes buttonEnter-nmbQm7 {
  from {
    opacity: 0;
    transform: scale(.8);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes buttonExit-pxOnsy {
  from {
    opacity: 1;
    transform: scale(1);
  }

  to {
    opacity: 0;
    transform: scale(.8);
  }
}

@keyframes accordionDown-N6mY7b {
  from {
    opacity: 0;
    height: 0;
  }

  to {
    height: var(--accordion-content-height);
    opacity: 1;
  }
}

@keyframes accordionUp-NUVQrz {
  from {
    height: var(--accordion-content-height);
    opacity: 1;
  }

  to {
    opacity: 0;
    height: 0;
  }
}

@keyframes fadeIn-M9eDrv {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes fadeOut-feL7tl {
  from {
    opacity: 1;
  }

  to {
    opacity: 0;
  }
}

@keyframes slideInFromRight-F7lMwz {
  from {
    opacity: 0;
    transform: translateX(16px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInFromBottom-_z3hvX {
  from {
    opacity: 0;
    transform: translateY(16px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animateEnter-detbYr {
  animation: devtoolsEnter-Jgl1Uz var(--c15t-duration-normal, .2s) var(--c15t-easing-out, cubic-bezier(.215, .61, .355, 1)) forwards;
  transform-origin: 100% 100%;
}

.animateExit-qZjCsw {
  animation: devtoolsExit-GVem79 var(--c15t-duration-fast, .1s) var(--c15t-easing-out, cubic-bezier(.215, .61, .355, 1)) forwards;
  transform-origin: 100% 100%;
}

.animateButtonEnter-amkZhT {
  animation: buttonEnter-nmbQm7 var(--c15t-duration-normal, .2s) var(--c15t-easing-spring, cubic-bezier(.34, 1.56, .64, 1)) forwards;
  transform-origin: center;
}

.animateButtonExit-fMVAL4 {
  animation: buttonExit-pxOnsy var(--c15t-duration-fast, .1s) var(--c15t-easing-out, cubic-bezier(.215, .61, .355, 1)) forwards;
  transform-origin: center;
}

.animateFadeIn-TrkV7T {
  animation: fadeIn-M9eDrv var(--c15t-duration-fast, .1s) var(--c15t-easing, cubic-bezier(.4, 0, .2, 1)) forwards;
}

.animateFadeOut-sS4sE4 {
  animation: fadeOut-feL7tl var(--c15t-duration-fast, .1s) var(--c15t-easing, cubic-bezier(.4, 0, .2, 1)) forwards;
}

.animateSlideIn-ccDCyI {
  animation: slideInFromBottom-_z3hvX var(--c15t-duration-normal, .2s) var(--c15t-easing-out, cubic-bezier(.215, .61, .355, 1)) forwards;
}

.staggerItem-tzBuCo {
  opacity: 0;
  animation: slideInFromRight-F7lMwz var(--c15t-duration-normal, .2s) var(--c15t-easing-out, cubic-bezier(.215, .61, .355, 1)) forwards;
}

.staggerItem-tzBuCo:first-child {
  animation-delay: 0s;
}

.staggerItem-tzBuCo:nth-child(2) {
  animation-delay: 30ms;
}

.staggerItem-tzBuCo:nth-child(3) {
  animation-delay: 60ms;
}

.staggerItem-tzBuCo:nth-child(4) {
  animation-delay: 90ms;
}

.staggerItem-tzBuCo:nth-child(5) {
  animation-delay: .12s;
}

.staggerItem-tzBuCo:nth-child(6) {
  animation-delay: .15s;
}

.staggerItem-tzBuCo:nth-child(7) {
  animation-delay: .18s;
}

.staggerItem-tzBuCo:nth-child(8) {
  animation-delay: .21s;
}

.staggerItem-tzBuCo:nth-child(9) {
  animation-delay: .24s;
}

.staggerItem-tzBuCo:nth-child(10) {
  animation-delay: .27s;
}

@media (prefers-reduced-motion: reduce) {
  .animateEnter-detbYr, .animateExit-qZjCsw, .animateButtonEnter-amkZhT, .animateButtonExit-fMVAL4, .animateFadeIn-TrkV7T, .animateFadeOut-sS4sE4, .animateSlideIn-ccDCyI, .staggerItem-tzBuCo {
    opacity: 1;
    animation: none;
    transform: none;
  }
}
`,
					'',
				]),
					(i.locals = {
						animateEnter: 'animateEnter-detbYr',
						devtoolsEnter: 'devtoolsEnter-Jgl1Uz',
						animateExit: 'animateExit-qZjCsw',
						devtoolsExit: 'devtoolsExit-GVem79',
						animateButtonEnter: 'animateButtonEnter-amkZhT',
						buttonEnter: 'buttonEnter-nmbQm7',
						animateButtonExit: 'animateButtonExit-fMVAL4',
						buttonExit: 'buttonExit-pxOnsy',
						animateFadeIn: 'animateFadeIn-TrkV7T',
						fadeIn: 'fadeIn-M9eDrv',
						animateFadeOut: 'animateFadeOut-sS4sE4',
						fadeOut: 'fadeOut-feL7tl',
						animateSlideIn: 'animateSlideIn-ccDCyI',
						slideInFromBottom: 'slideInFromBottom-_z3hvX',
						staggerItem: 'staggerItem-tzBuCo',
						slideInFromRight: 'slideInFromRight-F7lMwz',
						buttonPulse: 'buttonPulse-thl_xD',
						accordionDown: 'accordionDown-N6mY7b',
						accordionUp: 'accordionUp-NUVQrz',
					});
				let c = i;
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/components.module.css'(
				e,
				t,
				o
			) {
				o.d(t, { A: () => c });
				var s = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'
					),
					n = o.n(s),
					r = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'
					),
					a = o.n(r),
					i = a()(n());
				i.push([
					e.id,
					`.toggle-bPZtik {
  border-radius: var(--c15t-radius-full, 9999px);
  background-color: var(--c15t-switch-track, #ccc);
  cursor: pointer;
  width: 36px;
  height: 20px;
  transition: background-color var(--c15t-duration-fast, .1s) var(--c15t-easing, cubic-bezier(.4, 0, .2, 1));
  border: none;
  align-items: center;
  padding: 0;
  display: inline-flex;
  position: relative;
}

.toggle-bPZtik:focus-visible {
  outline: 2px solid var(--c15t-primary, #335cff);
  outline-offset: 2px;
}

.toggleActive-Ldlasg {
  background-color: var(--c15t-switch-track-active, #335cff);
}

.toggleThumb-hjGfoX {
  border-radius: var(--c15t-radius-full, 9999px);
  background-color: var(--c15t-switch-thumb, #fff);
  width: 16px;
  height: 16px;
  transition: transform var(--c15t-duration-fast, .1s) var(--c15t-easing-spring, cubic-bezier(.34, 1.56, .64, 1));
  position: absolute;
  left: 2px;
  box-shadow: 0 1px 2px #0003;
}

.toggleActive-Ldlasg .toggleThumb-hjGfoX {
  transform: translateX(16px);
}

.toggle-bPZtik:disabled, .toggleDisabled-ZcD8nZ {
  opacity: .5;
  cursor: not-allowed;
}

.toggle-bPZtik:disabled .toggleThumb-hjGfoX, .toggleDisabled-ZcD8nZ .toggleThumb-hjGfoX {
  box-shadow: none;
}

.badge-yA0giZ {
  border-radius: var(--c15t-radius-sm, .25rem);
  font-size: var(--c15t-devtools-font-size-xs, .75rem);
  font-weight: var(--c15t-font-weight-medium, 500);
  white-space: nowrap;
  align-items: center;
  padding: 2px 6px;
  line-height: 1;
  display: inline-flex;
}

.badgeSuccess-mA76a4 {
  background-color: var(--c15t-devtools-badge-success-bg, #e4fbed);
  color: var(--c15t-devtools-badge-success, #21c45d);
}

.badgeError-Agsq7I {
  background-color: var(--c15t-devtools-badge-error-bg, #fde7e7);
  color: var(--c15t-devtools-badge-error, #ef4343);
}

.badgeWarning-xpdwMQ {
  background-color: var(--c15t-devtools-badge-warning-bg, #fef7dc);
  color: var(--c15t-devtools-badge-warning, #f59f0a);
}

.badgeInfo-uWdPCK {
  background-color: var(--c15t-devtools-badge-info-bg, #dcebfe);
  color: var(--c15t-devtools-badge-info, #2463eb);
}

.badgeNeutral-j3EsE0 {
  background-color: var(--c15t-devtools-badge-neutral-bg, #f0f0f0);
  color: var(--c15t-devtools-badge-neutral, #737373);
}

.btn-evRVlh {
  justify-content: center;
  align-items: center;
  gap: var(--c15t-space-xs, .25rem);
  border: 1px solid var(--c15t-border, #e3e3e3);
  border-radius: var(--c15t-radius-md, .5rem);
  background-color: var(--c15t-surface, #fff);
  min-height: 30px;
  color: var(--c15t-text, #171717);
  font-family: inherit;
  font-size: 12px;
  font-weight: var(--c15t-font-weight-medium, 500);
  cursor: pointer;
  transition: background-color var(--c15t-duration-fast, .1s) var(--c15t-easing, cubic-bezier(.4, 0, .2, 1)), border-color var(--c15t-duration-fast, .1s) var(--c15t-easing, cubic-bezier(.4, 0, .2, 1)), box-shadow var(--c15t-duration-fast, .1s) var(--c15t-easing, cubic-bezier(.4, 0, .2, 1)), color var(--c15t-duration-fast, .1s) var(--c15t-easing, cubic-bezier(.4, 0, .2, 1));
  padding: 5px 10px;
  line-height: 1;
  display: inline-flex;
  box-shadow: 0 1px 1px #0000000a;
}

.btn-evRVlh:hover {
  background-color: var(--c15t-surface-hover, #f7f7f7);
  border-color: var(--c15t-border-hover, #c9c9c9);
  box-shadow: 0 2px 6px #00000014;
}

.btn-evRVlh:focus-visible {
  outline: 2px solid var(--c15t-primary, #335cff);
  outline-offset: 1px;
}

.btn-evRVlh:active {
  box-shadow: 0 1px 2px #00000014;
}

.btn-evRVlh:disabled {
  opacity: .5;
  cursor: not-allowed;
  box-shadow: none;
}

.btnPrimary-dA6nqY {
  background-color: var(--c15t-primary, #335cff);
  border-color: var(--c15t-primary, #335cff);
  color: var(--c15t-text-on-primary, #fff);
}

.btnPrimary-dA6nqY:hover {
  background-color: var(--c15t-primary-hover, #03f);
  border-color: var(--c15t-primary-hover, #03f);
}

.btnDanger-eDnqOX {
  background-color: var(--c15t-devtools-badge-error, #ef4343);
  border-color: var(--c15t-devtools-badge-error, #ef4343);
  color: var(--c15t-text-on-primary, #fff);
}

.btnDanger-eDnqOX:hover {
  background-color: #eb1414;
  border-color: #eb1414;
}

.btnSmall-TjXoqZ {
  border-radius: var(--c15t-radius-sm, .375rem);
  min-height: 26px;
  padding: 3px 8px;
  font-size: 11px;
}

.btnIcon-fiYQAh {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
}

.input-IeTcCs {
  width: 100%;
  padding: var(--c15t-space-xs, .25rem) var(--c15t-space-sm, .5rem);
  border: 1px solid var(--c15t-border, #e3e3e3);
  border-radius: var(--c15t-radius-md, .5rem);
  background-color: var(--c15t-surface, #fff);
  color: var(--c15t-text, #171717);
  font-family: inherit;
  font-size: var(--c15t-font-size-sm, .875rem);
  transition: border-color var(--c15t-duration-fast, .1s) var(--c15t-easing, cubic-bezier(.4, 0, .2, 1));
}

.input-IeTcCs:focus {
  border-color: var(--c15t-primary, #335cff);
  outline: none;
}

.input-IeTcCs::placeholder {
  color: var(--c15t-text-muted, #737373);
}

.inputSmall-pJyXcL {
  padding: 2px var(--c15t-space-xs, .25rem);
  font-size: var(--c15t-devtools-font-size-xs, .75rem);
}

.select-byJ1WM {
  width: 100%;
  padding: var(--c15t-space-xs, .25rem) var(--c15t-space-sm, .5rem);
  border: 1px solid var(--c15t-border, #e3e3e3);
  border-radius: var(--c15t-radius-md, .5rem);
  background-color: var(--c15t-surface, #fff);
  color: var(--c15t-text, #171717);
  font-family: inherit;
  font-size: var(--c15t-devtools-font-size-xs, .75rem);
  cursor: pointer;
}

.select-byJ1WM:focus {
  border-color: var(--c15t-primary, #335cff);
  outline: none;
}

.grid-LlrmEz {
  gap: var(--c15t-space-sm, .5rem);
  padding: var(--c15t-space-sm, .5rem) var(--c15t-space-md, 1rem);
  display: grid;
}

.gridCols2-UgcIqI {
  grid-template-columns: repeat(2, 1fr);
}

.gridCols3-OmMIq6 {
  grid-template-columns: repeat(3, 1fr);
}

.gridCard-Qm5xxI {
  padding: var(--c15t-space-sm, .5rem) var(--c15t-space-md, .75rem);
  border: 1px solid var(--c15t-border, #e3e3e3);
  border-radius: var(--c15t-radius-md, .5rem);
  background-color: var(--c15t-surface, #fff);
  transition: border-color var(--c15t-duration-fast, .1s) var(--c15t-easing, cubic-bezier(.4, 0, .2, 1));
  justify-content: space-between;
  align-items: center;
  display: flex;
}

.gridCard-Qm5xxI:hover {
  border-color: var(--c15t-border-hover, #c9c9c9);
}

.gridCardTitle-HjXETp {
  font-size: var(--c15t-devtools-font-size-xs, .75rem);
  font-weight: var(--c15t-font-weight-medium, 500);
  color: var(--c15t-text, #171717);
}

.listItem-XUKGIo {
  padding: var(--c15t-space-xs, .25rem) var(--c15t-space-md, 1rem);
  border-bottom: 1px solid var(--c15t-border, #e3e3e3);
  justify-content: space-between;
  align-items: center;
  display: flex;
}

.listItem-XUKGIo:last-child {
  border-bottom: none;
}

.listItemContent-WDBF1N {
  flex-direction: column;
  flex: 1;
  gap: 2px;
  min-width: 0;
  display: flex;
}

.listItemTitle-N89OkC {
  font-size: var(--c15t-font-size-sm, .875rem);
  font-weight: var(--c15t-font-weight-medium, 500);
  color: var(--c15t-text, #171717);
}

.listItemDescription-E6JHyZ {
  font-size: var(--c15t-devtools-font-size-xs, .75rem);
  color: var(--c15t-text-muted, #737373);
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}

.listItemActions-F1BfOm {
  align-items: center;
  gap: var(--c15t-space-sm, .5rem);
  flex-shrink: 0;
  display: flex;
}

.section-a197cB {
  padding: var(--c15t-space-sm, .5rem) var(--c15t-space-md, 1rem);
  border-bottom: 1px solid var(--c15t-border, #e3e3e3);
}

.section-a197cB:last-child {
  border-bottom: none;
}

.sectionHeader-Xcljcw {
  margin-bottom: var(--c15t-space-sm, .5rem);
  justify-content: space-between;
  align-items: center;
  display: flex;
}

.sectionTitle-RUiFld {
  font-size: var(--c15t-devtools-font-size-xs, .75rem);
  font-weight: var(--c15t-font-weight-semibold, 600);
  color: var(--c15t-text-muted, #737373);
  text-transform: uppercase;
  letter-spacing: .5px;
}

.overrideField-keNdpJ {
  flex-direction: column;
  gap: 3px;
  margin-bottom: 0;
  display: flex;
}

.overrideLabel-ApMoTw {
  color: var(--c15t-text-muted, #737373);
  font-size: 11px;
  font-weight: 600;
}

.overrideHint-yCfwGt {
  color: var(--c15t-devtools-text-muted, #737373);
  margin-top: 6px;
  font-size: 11px;
}

.overrideActions-imdcn7 {
  border-top: 1px dashed var(--c15t-border, #e3e3e3);
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding-top: 8px;
  display: flex;
}

.overrideActionButtons-gYOx1e {
  flex-wrap: wrap;
  gap: 6px;
  display: flex;
}

.overrideStatus-sty_qS {
  color: var(--c15t-text-muted, #737373);
  font-size: 11px;
}

.overrideStatusDirty-OUdDMw {
  color: var(--c15t-devtools-badge-warning, #f59f0a);
}

.infoRow-RlB_0h {
  padding: var(--c15t-space-xs, .25rem) 0;
  justify-content: space-between;
  align-items: center;
  display: flex;
}

.infoLabel-_pbK33 {
  font-size: var(--c15t-devtools-font-size-xs, .75rem);
  color: var(--c15t-text-muted, #737373);
}

.infoValue-flMl_e {
  font-size: var(--c15t-devtools-font-size-xs, .75rem);
  font-weight: var(--c15t-font-weight-medium, 500);
  color: var(--c15t-text, #171717);
  font-family: ui-monospace, Cascadia Code, Source Code Pro, Menlo, Consolas, DejaVu Sans Mono, monospace;
}

.emptyState-QcmzTQ {
  padding: var(--c15t-space-xl, 2rem);
  text-align: center;
  color: var(--c15t-text-muted, #737373);
  flex-direction: column;
  justify-content: center;
  align-items: center;
  display: flex;
}

.emptyStateIcon-WHFkX8 {
  width: 32px;
  height: 32px;
  margin-bottom: var(--c15t-space-sm, .5rem);
  opacity: .5;
}

.emptyStateText-TaLvAJ {
  font-size: var(--c15t-font-size-sm, .875rem);
}

@media (prefers-reduced-motion: reduce) {
  .toggle-bPZtik, .toggleThumb-hjGfoX, .btn-evRVlh, .input-IeTcCs, .select-byJ1WM {
    transition: none;
  }
}

@media (hover: none) {
  .btn-evRVlh:hover {
    background-color: var(--c15t-surface, #fff);
    border-color: var(--c15t-border, #e3e3e3);
  }

  .btnPrimary-dA6nqY:hover {
    background-color: var(--c15t-primary, #335cff);
    border-color: var(--c15t-primary, #335cff);
  }
}
`,
					'',
				]),
					(i.locals = {
						toggle: 'toggle-bPZtik',
						toggleActive: 'toggleActive-Ldlasg',
						toggleThumb: 'toggleThumb-hjGfoX',
						toggleDisabled: 'toggleDisabled-ZcD8nZ',
						badge: 'badge-yA0giZ',
						badgeSuccess: 'badgeSuccess-mA76a4',
						badgeError: 'badgeError-Agsq7I',
						badgeWarning: 'badgeWarning-xpdwMQ',
						badgeInfo: 'badgeInfo-uWdPCK',
						badgeNeutral: 'badgeNeutral-j3EsE0',
						btn: 'btn-evRVlh',
						btnPrimary: 'btnPrimary-dA6nqY',
						btnDanger: 'btnDanger-eDnqOX',
						btnSmall: 'btnSmall-TjXoqZ',
						btnIcon: 'btnIcon-fiYQAh',
						input: 'input-IeTcCs',
						inputSmall: 'inputSmall-pJyXcL',
						select: 'select-byJ1WM',
						grid: 'grid-LlrmEz',
						gridCols2: 'gridCols2-UgcIqI',
						gridCols3: 'gridCols3-OmMIq6',
						gridCard: 'gridCard-Qm5xxI',
						gridCardTitle: 'gridCardTitle-HjXETp',
						listItem: 'listItem-XUKGIo',
						listItemContent: 'listItemContent-WDBF1N',
						listItemTitle: 'listItemTitle-N89OkC',
						listItemDescription: 'listItemDescription-E6JHyZ',
						listItemActions: 'listItemActions-F1BfOm',
						section: 'section-a197cB',
						sectionHeader: 'sectionHeader-Xcljcw',
						sectionTitle: 'sectionTitle-RUiFld',
						overrideField: 'overrideField-keNdpJ',
						overrideLabel: 'overrideLabel-ApMoTw',
						overrideHint: 'overrideHint-yCfwGt',
						overrideActions: 'overrideActions-imdcn7',
						overrideActionButtons: 'overrideActionButtons-gYOx1e',
						overrideStatus: 'overrideStatus-sty_qS',
						overrideStatusDirty: 'overrideStatusDirty-OUdDMw',
						infoRow: 'infoRow-RlB_0h',
						infoLabel: 'infoLabel-_pbK33',
						infoValue: 'infoValue-flMl_e',
						emptyState: 'emptyState-QcmzTQ',
						emptyStateIcon: 'emptyStateIcon-WHFkX8',
						emptyStateText: 'emptyStateText-TaLvAJ',
					});
				let c = i;
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/panel.module.css'(
				e,
				t,
				o
			) {
				o.d(t, { A: () => c });
				var s = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'
					),
					n = o.n(s),
					r = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'
					),
					a = o.n(r),
					i = a()(n());
				i.push([
					e.id,
					`.container-XiXwoL {
  z-index: var(--c15t-devtools-z-index, 99999);
  font-family: var(--c15t-font-family, system-ui, -apple-system, sans-serif);
  font-size: var(--c15t-font-size-sm, .875rem);
  line-height: var(--c15t-line-height-normal, 1.5);
  color: var(--c15t-text, #171717);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  position: fixed;
}

.floatingButton-Gw8MtJ {
  width: var(--c15t-devtools-button-size, 40px);
  height: var(--c15t-devtools-button-size, 40px);
  border: 1px solid var(--c15t-border, #e3e3e3);
  border-radius: var(--c15t-radius-full, 9999px);
  background-color: var(--c15t-surface, #fff);
  box-shadow: var(--c15t-shadow-lg, 0 10px 15px -3px #0000001a, 0 4px 6px -4px #0000001a);
  cursor: grab;
  z-index: var(--c15t-devtools-z-index, 99999);
  transition: transform var(--c15t-duration-fast, .1s) var(--c15t-easing, cubic-bezier(.4, 0, .2, 1)), box-shadow var(--c15t-duration-fast, .1s) var(--c15t-easing, cubic-bezier(.4, 0, .2, 1)), background-color var(--c15t-duration-fast, .1s) var(--c15t-easing, cubic-bezier(.4, 0, .2, 1));
  transform-origin: center;
  touch-action: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  justify-content: center;
  align-items: center;
  padding: 0;
  display: flex;
  position: fixed;
}

@media (hover: hover) and (pointer: fine) {
  .floatingButton-Gw8MtJ:hover {
    background-color: var(--c15t-surface-hover, #f2f2f2);
    box-shadow: var(--c15t-shadow-xl, 0 20px 25px -5px #0000001a, 0 8px 10px -6px #0000001a);
  }
}

.floatingButton-Gw8MtJ:focus {
  outline: none;
}

.floatingButton-Gw8MtJ:focus-visible {
  outline: 2px solid var(--c15t-primary, #335cff);
  outline-offset: 2px;
}

.floatingButton-Gw8MtJ:active {
  cursor: grabbing;
  transform: scale(1.02);
}

.floatingButtonIcon-cHWefk {
  width: 50%;
  height: 50%;
  color: var(--c15t-text, #171717);
  pointer-events: none;
  flex-shrink: 0;
  justify-content: center;
  align-items: center;
  display: flex;
}

.floatingButtonIcon-cHWefk svg {
  width: 100%;
  height: 100%;
}

.positionBottomRight-ZPD58v {
  bottom: 20px;
  right: 20px;
}

.positionBottomLeft-MDd6AY {
  bottom: 20px;
  left: 20px;
}

.positionTopRight-L6yusU {
  top: 20px;
  right: 20px;
}

.positionTopLeft-C65boy {
  top: 20px;
  left: 20px;
}

.backdrop-LhVMB5 {
  background-color: var(--c15t-overlay, #00000080);
  z-index: calc(var(--c15t-devtools-z-index, 99999)  + 1);
  position: fixed;
  inset: 0;
}

.panel-jtWove {
  width: var(--c15t-devtools-panel-width, 480px);
  max-height: var(--c15t-devtools-panel-max-height, 560px);
  background-color: var(--c15t-surface, #fff);
  border: 1px solid var(--c15t-border, #e3e3e3);
  border-radius: var(--c15t-radius-lg, .75rem);
  box-shadow: var(--c15t-shadow-lg, 0 8px 24px #0000001f);
  z-index: calc(var(--c15t-devtools-z-index, 99999)  + 2);
  flex-direction: column;
  display: flex;
  position: fixed;
  overflow: hidden;
}

.panel-jtWove.positionBottomRight-ZPD58v {
  transform-origin: 100% 100%;
  bottom: 80px;
  right: 20px;
}

.panel-jtWove.positionBottomLeft-MDd6AY {
  transform-origin: 0 100%;
  bottom: 80px;
  left: 20px;
}

.panel-jtWove.positionTopRight-L6yusU {
  transform-origin: 100% 0;
  top: 80px;
  right: 20px;
}

.panel-jtWove.positionTopLeft-C65boy {
  transform-origin: 0 0;
  top: 80px;
  left: 20px;
}

.header-xluoTr {
  padding: var(--c15t-space-sm, .5rem) var(--c15t-space-md, 1rem);
  border-bottom: 1px solid var(--c15t-border, #e3e3e3);
  background-color: var(--c15t-devtools-surface-muted, #f5f5f5);
  justify-content: space-between;
  align-items: center;
  display: flex;
}

.headerTitle-kJ9XjK {
  align-items: center;
  gap: var(--c15t-space-sm, .5rem);
  font-size: var(--c15t-font-size-sm, .875rem);
  font-weight: var(--c15t-font-weight-semibold, 600);
  color: var(--c15t-text, #171717);
  display: flex;
}

.headerLogo-PxJ_w1 {
  width: 20px;
  height: 20px;
  color: var(--c15t-primary, #335cff);
}

.closeButton-Yto0Nb {
  border-radius: var(--c15t-radius-sm, .25rem);
  width: 28px;
  height: 28px;
  color: var(--c15t-text-muted, #737373);
  cursor: pointer;
  transition: background-color var(--c15t-duration-fast, .1s) var(--c15t-easing, cubic-bezier(.4, 0, .2, 1)), color var(--c15t-duration-fast, .1s) var(--c15t-easing, cubic-bezier(.4, 0, .2, 1));
  background-color: #0000;
  border: none;
  justify-content: center;
  align-items: center;
  padding: 0;
  display: flex;
}

.closeButton-Yto0Nb:hover {
  background-color: var(--c15t-surface-hover, #f7f7f7);
  color: var(--c15t-text, #171717);
}

.closeButton-Yto0Nb:focus-visible {
  outline: 2px solid var(--c15t-primary, #335cff);
  outline-offset: 1px;
}

.closeButtonIcon-fVlR1I {
  width: 16px;
  height: 16px;
}

.content-yDMYfG {
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  flex: auto;
  min-height: 200px;
  overflow: hidden auto;
}

.footer-ESbmwQ {
  padding: var(--c15t-space-xs, .25rem) var(--c15t-space-md, 1rem);
  border-top: 1px solid var(--c15t-border, #e3e3e3);
  background-color: var(--c15t-devtools-surface-muted, #f5f5f5);
  font-size: var(--c15t-devtools-font-size-xs, .75rem);
  color: var(--c15t-text-muted, #737373);
  justify-content: space-between;
  align-items: center;
  display: flex;
}

.footerStatus-rlb99A {
  align-items: center;
  gap: var(--c15t-space-xs, .25rem);
  display: flex;
}

.statusDot-hYJoej {
  border-radius: var(--c15t-radius-full, 9999px);
  width: 6px;
  height: 6px;
}

.statusConnected-hPSUgS {
  background-color: var(--c15t-devtools-badge-success, #21c45d);
}

.statusDisconnected-HIpcee {
  background-color: var(--c15t-devtools-badge-error, #ef4343);
}

.errorState-DRtU3f {
  padding: var(--c15t-space-xl, 2rem);
  text-align: center;
  justify-content: center;
  align-items: center;
  gap: var(--c15t-space-md, 1rem);
  flex-direction: column;
  display: flex;
}

.errorIcon-_o6Vta {
  width: 48px;
  height: 48px;
  color: var(--c15t-devtools-badge-warning, #f59f0a);
}

.errorTitle-tkOy1H {
  font-size: var(--c15t-font-size-base, 1rem);
  font-weight: var(--c15t-font-weight-semibold, 600);
  color: var(--c15t-text, #171717);
}

.errorMessage-MPRZNN {
  font-size: var(--c15t-font-size-sm, .875rem);
  color: var(--c15t-text-muted, #737373);
  max-width: 280px;
}

@media (prefers-reduced-motion: reduce) {
  .floatingButton-Gw8MtJ, .closeButton-Yto0Nb {
    transition: none;
  }
}

@media (hover: none) {
  .floatingButton-Gw8MtJ:hover {
    box-shadow: var(--c15t-shadow-md, 0 4px 12px #00000014);
    transform: none;
  }
}

.dropdownMenu-aKK18l {
  min-width: 200px;
  padding: var(--c15t-space-xs, .25rem);
  border: 1px solid var(--c15t-border, #e3e3e3);
  border-radius: var(--c15t-radius-lg, .75rem);
  background-color: var(--c15t-surface, #fff);
  box-shadow: var(--c15t-shadow-lg, 0 8px 24px #0000001f);
  z-index: calc(var(--c15t-devtools-z-index, 99999)  + 1);
  opacity: 0;
  transform-origin: 0 100%;
  pointer-events: none;
  transition: opacity var(--c15t-duration-fast, .1s) var(--c15t-easing-out, cubic-bezier(.215, .61, .355, 1)), transform var(--c15t-duration-fast, .1s) var(--c15t-easing-out, cubic-bezier(.215, .61, .355, 1));
  position: fixed;
  transform: scale(.95)translateY(8px);
}

.dropdownMenu-aKK18l[data-state="open"] {
  opacity: 1;
  pointer-events: auto;
  transform: scale(1)translateY(0);
}

.dropdownMenuBottomLeft-MKUEpC {
  transform-origin: 0 100%;
}

.dropdownMenuBottomRight-nXiRRF {
  transform-origin: 100% 100%;
}

.dropdownMenuTopLeft-YlFVSe {
  transform-origin: 0 0;
}

.dropdownMenuTopRight-OpvmUO {
  transform-origin: 100% 0;
}

.menuItem-kBbHRP {
  align-items: center;
  gap: var(--c15t-space-sm, .5rem);
  width: 100%;
  padding: var(--c15t-space-sm, .5rem) var(--c15t-space-md, .75rem);
  border-radius: var(--c15t-radius-md, .5rem);
  color: var(--c15t-text, #171717);
  font-size: var(--c15t-font-size-sm, .875rem);
  font-weight: var(--c15t-font-weight-medium, 500);
  text-align: left;
  cursor: pointer;
  transition: background-color var(--c15t-duration-fast, .1s) var(--c15t-easing, cubic-bezier(.4, 0, .2, 1));
  background: none;
  border: none;
  display: flex;
}

.menuItem-kBbHRP:hover {
  background-color: var(--c15t-surface-hover, #f2f2f2);
}

.menuItem-kBbHRP:focus-visible {
  outline: 2px solid var(--c15t-primary, #335cff);
  outline-offset: -2px;
}

.menuItemIcon-P3pP5K {
  width: 20px;
  height: 20px;
  color: var(--c15t-text-muted, #737373);
  flex-shrink: 0;
}

.menuItemLabel-d_d7sD {
  flex: 1;
}

.menuItemDescription-hqdfJA {
  font-size: var(--c15t-devtools-font-size-xs, .75rem);
  color: var(--c15t-text-muted, #737373);
  font-weight: var(--c15t-font-weight-normal, 400);
}

.menuItemContent-hBlruV {
  flex: 1;
  min-width: 0;
}

.menuItemToggle-RHrCAX {
  flex-shrink: 0;
  margin-left: auto;
}

.menuItemToggleTrack-gDp_f3 {
  background-color: var(--c15t-switch-track, #d9d9d9);
  border-radius: var(--c15t-radius-full, 9999px);
  width: 36px;
  height: 20px;
  transition: background-color var(--c15t-duration-fast, .1s) var(--c15t-easing, cubic-bezier(.4, 0, .2, 1));
  position: relative;
}

.menuItemToggleThumb-ioqqyc {
  background-color: var(--c15t-switch-thumb, #fff);
  border-radius: var(--c15t-radius-full, 9999px);
  width: 16px;
  height: 16px;
  box-shadow: var(--c15t-shadow-sm, 0 1px 2px #0000001a);
  transition: transform var(--c15t-duration-fast, .1s) var(--c15t-easing, cubic-bezier(.4, 0, .2, 1));
  position: absolute;
  top: 2px;
  left: 2px;
}

.menuItemToggleChecked-K3BPtk .menuItemToggleTrack-gDp_f3 {
  background-color: var(--c15t-switch-track-checked, #335cff);
}

.menuItemToggleChecked-K3BPtk .menuItemToggleThumb-ioqqyc {
  transform: translateX(16px);
}

.menuDivider-JIBdhU {
  height: 1px;
  margin: var(--c15t-space-xs, .25rem) 0;
  background-color: var(--c15t-border, #e3e3e3);
}

.unifiedButtonWrapper-d3Frwt {
  display: contents;
}

@media (prefers-reduced-motion: reduce) {
  .dropdownMenu-aKK18l {
    transition: none;
  }
}
`,
					'',
				]),
					(i.locals = {
						container: 'container-XiXwoL',
						floatingButton: 'floatingButton-Gw8MtJ',
						floatingButtonIcon: 'floatingButtonIcon-cHWefk',
						positionBottomRight: 'positionBottomRight-ZPD58v',
						positionBottomLeft: 'positionBottomLeft-MDd6AY',
						positionTopRight: 'positionTopRight-L6yusU',
						positionTopLeft: 'positionTopLeft-C65boy',
						backdrop: 'backdrop-LhVMB5',
						panel: 'panel-jtWove',
						header: 'header-xluoTr',
						headerTitle: 'headerTitle-kJ9XjK',
						headerLogo: 'headerLogo-PxJ_w1',
						closeButton: 'closeButton-Yto0Nb',
						closeButtonIcon: 'closeButtonIcon-fVlR1I',
						content: 'content-yDMYfG',
						footer: 'footer-ESbmwQ',
						footerStatus: 'footerStatus-rlb99A',
						statusDot: 'statusDot-hYJoej',
						statusConnected: 'statusConnected-hPSUgS',
						statusDisconnected: 'statusDisconnected-HIpcee',
						errorState: 'errorState-DRtU3f',
						errorIcon: 'errorIcon-_o6Vta',
						errorTitle: 'errorTitle-tkOy1H',
						errorMessage: 'errorMessage-MPRZNN',
						dropdownMenu: 'dropdownMenu-aKK18l',
						dropdownMenuBottomLeft: 'dropdownMenuBottomLeft-MKUEpC',
						dropdownMenuBottomRight: 'dropdownMenuBottomRight-nXiRRF',
						dropdownMenuTopLeft: 'dropdownMenuTopLeft-YlFVSe',
						dropdownMenuTopRight: 'dropdownMenuTopRight-OpvmUO',
						menuItem: 'menuItem-kBbHRP',
						menuItemIcon: 'menuItemIcon-P3pP5K',
						menuItemLabel: 'menuItemLabel-d_d7sD',
						menuItemDescription: 'menuItemDescription-hqdfJA',
						menuItemContent: 'menuItemContent-hBlruV',
						menuItemToggle: 'menuItemToggle-RHrCAX',
						menuItemToggleTrack: 'menuItemToggleTrack-gDp_f3',
						menuItemToggleThumb: 'menuItemToggleThumb-ioqqyc',
						menuItemToggleChecked: 'menuItemToggleChecked-K3BPtk',
						menuDivider: 'menuDivider-JIBdhU',
						unifiedButtonWrapper: 'unifiedButtonWrapper-d3Frwt',
					});
				let c = i;
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/tabs.module.css'(
				e,
				t,
				o
			) {
				o.d(t, { A: () => c });
				var s = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'
					),
					n = o.n(s),
					r = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'
					),
					a = o.n(r),
					i = a()(n());
				i.push([
					e.id,
					`.tabList-IyuiBE {
  align-items: center;
  gap: var(--c15t-space-xs, .25rem);
  padding: var(--c15t-space-sm, .5rem) var(--c15t-space-sm, .5rem);
  border-bottom: 1px solid var(--c15t-border, #e3e3e3);
  background-color: var(--c15t-surface, #fff);
  scrollbar-width: none;
  -ms-overflow-style: none;
  scroll-padding-inline-end: var(--c15t-space-sm, .5rem);
  display: flex;
  overflow-x: auto;
}

.tabList-IyuiBE:after {
  content: "";
  flex: 0 0 var(--c15t-space-sm, .5rem);
}

.tabList-IyuiBE::-webkit-scrollbar {
  display: none;
}

.tab-yfDEqg {
  align-items: center;
  gap: var(--c15t-space-xs, .25rem);
  border-radius: var(--c15t-radius-md, .5rem);
  color: var(--c15t-text-muted, #737373);
  font-family: inherit;
  font-size: 11px;
  font-weight: var(--c15t-font-weight-medium, 500);
  cursor: pointer;
  white-space: nowrap;
  transition: background-color var(--c15t-duration-fast, .1s) var(--c15t-easing, cubic-bezier(.4, 0, .2, 1)), color var(--c15t-duration-fast, .1s) var(--c15t-easing, cubic-bezier(.4, 0, .2, 1));
  background-color: #0000;
  border: none;
  padding: 3px 7px;
  display: flex;
}

.tab-yfDEqg:hover {
  background-color: var(--c15t-surface-hover, #f7f7f7);
  color: var(--c15t-text, #171717);
}

.tab-yfDEqg:focus-visible {
  outline: 2px solid var(--c15t-primary, #335cff);
  outline-offset: 1px;
}

.tabActive-r4hing {
  background-color: var(--c15t-primary, #335cff);
  color: var(--c15t-text-on-primary, #fff);
}

.tabActive-r4hing:hover {
  background-color: var(--c15t-primary-hover, #03f);
  color: var(--c15t-text-on-primary, #fff);
}

.tabIcon-U9tnu0 {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
}

.tabDisabled-lDuv5l {
  opacity: .5;
  cursor: not-allowed;
  pointer-events: none;
}

.tabDisabled-lDuv5l:hover {
  color: var(--c15t-text-muted, #737373);
  background-color: #0000;
}

.tabPanel-QKO8FX {
  display: none;
}

.tabPanelActive-mrNlGE {
  display: block;
}

@media (prefers-reduced-motion: reduce) {
  .tab-yfDEqg {
    transition: none;
  }
}

@media (hover: none) {
  .tab-yfDEqg:hover:not(.tabActive-r4hing) {
    color: var(--c15t-text-muted, #737373);
    background-color: #0000;
  }
}
`,
					'',
				]),
					(i.locals = {
						tabList: 'tabList-IyuiBE',
						tab: 'tab-yfDEqg',
						tabActive: 'tabActive-r4hing',
						tabIcon: 'tabIcon-U9tnu0',
						tabDisabled: 'tabDisabled-lDuv5l',
						tabPanel: 'tabPanel-QKO8FX',
						tabPanelActive: 'tabPanelActive-mrNlGE',
					});
				let c = i;
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/tokens.css'(
				e,
				t,
				o
			) {
				o.d(t, { A: () => c });
				var s = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/noSourceMaps.js'
					),
					n = o.n(s),
					r = o(
						'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'
					),
					a = o.n(r),
					i = a()(n());
				i.push([
					e.id,
					`:root {
  --c15t-devtools-panel-width: 480px;
  --c15t-devtools-panel-max-height: 560px;
  --c15t-devtools-button-size: 40px;
  --c15t-devtools-z-index: 99999;
  --c15t-devtools-surface-muted: var(--c15t-surface-hover, #f7f7f7);
  --c15t-devtools-font-size-xs: .75rem;
  --c15t-devtools-badge-success: #21c45d;
  --c15t-devtools-badge-success-bg: #e4fbed;
  --c15t-devtools-badge-error: #ef4343;
  --c15t-devtools-badge-error-bg: #fde7e7;
  --c15t-devtools-badge-warning: #f59f0a;
  --c15t-devtools-badge-warning-bg: #fef7dc;
  --c15t-devtools-badge-info: #2463eb;
  --c15t-devtools-badge-info-bg: #dcebfe;
  --c15t-devtools-badge-neutral: #737373;
  --c15t-devtools-badge-neutral-bg: #f0f0f0;
}

:is(:global(.c15t-dark), :global(.dark)) {
  --c15t-devtools-surface-muted: var(--c15t-surface-hover, #292929);
  --c15t-devtools-badge-success-bg: #21c45d33;
  --c15t-devtools-badge-error-bg: #ef434333;
  --c15t-devtools-badge-warning-bg: #f59f0a33;
  --c15t-devtools-badge-info-bg: #2463eb33;
  --c15t-devtools-badge-neutral-bg: #383838;
}

@media (prefers-color-scheme: dark) {
  :root {
    --c15t-devtools-surface-muted: var(--c15t-surface-hover, #292929);
    --c15t-devtools-badge-success-bg: #21c45d33;
    --c15t-devtools-badge-error-bg: #ef434333;
    --c15t-devtools-badge-warning-bg: #f59f0a33;
    --c15t-devtools-badge-info-bg: #2463eb33;
    --c15t-devtools-badge-neutral-bg: #383838;
  }
}
`,
					'',
				]);
				let c = i;
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/api.js'(
				e
			) {
				e.exports = function (t) {
					var o = [];
					return (
						(o.toString = function () {
							return this.map(function (s) {
								var n = '',
									r = s[5] !== void 0;
								return (
									s[4] && (n += '@supports ('.concat(s[4], ') {')),
									s[2] && (n += '@media '.concat(s[2], ' {')),
									r &&
										(n += '@layer'.concat(
											s[5].length > 0 ? ' '.concat(s[5]) : '',
											' {'
										)),
									(n += t(s)),
									r && (n += '}'),
									s[2] && (n += '}'),
									s[4] && (n += '}'),
									n
								);
							}).join('');
						}),
						(o.i = function (s, n, r, a, i) {
							typeof s == 'string' && (s = [[null, s, void 0]]);
							var c = {};
							if (r)
								for (var l = 0; l < this.length; l++) {
									var f = this[l][0];
									f != null && (c[f] = !0);
								}
							for (var b = 0; b < s.length; b++) {
								var m = [].concat(s[b]);
								(!r || !c[m[0]]) &&
									(i !== void 0 &&
										(m[5] === void 0 ||
											(m[1] = '@layer'
												.concat(m[5].length > 0 ? ' '.concat(m[5]) : '', ' {')
												.concat(m[1], '}')),
										(m[5] = i)),
									n &&
										(m[2] &&
											(m[1] = '@media '.concat(m[2], ' {').concat(m[1], '}')),
										(m[2] = n)),
									a &&
										(m[4]
											? ((m[1] = '@supports ('
													.concat(m[4], ') {')
													.concat(m[1], '}')),
												(m[4] = a))
											: (m[4] = ''.concat(a))),
									o.push(m));
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
					for (var a = -1, i = 0; i < t.length; i++)
						if (t[i].identifier === r) {
							a = i;
							break;
						}
					return a;
				}
				function s(r, a) {
					for (var i = {}, c = [], l = 0; l < r.length; l++) {
						var f = r[l],
							b = a.base ? f[0] + a.base : f[0],
							m = i[b] || 0,
							_ = ''.concat(b, ' ').concat(m);
						i[b] = m + 1;
						var y = o(_),
							p = {
								css: f[1],
								media: f[2],
								sourceMap: f[3],
								supports: f[4],
								layer: f[5],
							};
						if (y !== -1) t[y].references++, t[y].updater(p);
						else {
							var w = n(p, a);
							(a.byIndex = l),
								t.splice(l, 0, { identifier: _, updater: w, references: 1 });
						}
						c.push(_);
					}
					return c;
				}
				function n(r, a) {
					var i = a.domAPI(a);
					i.update(r);
					var c = function (l) {
						if (l) {
							if (
								l.css === r.css &&
								l.media === r.media &&
								l.sourceMap === r.sourceMap &&
								l.supports === r.supports &&
								l.layer === r.layer
							)
								return;
							i.update((r = l));
						} else i.remove();
					};
					return c;
				}
				e.exports = function (r, a) {
					(a = a || {}), (r = r || []);
					var i = s(r, a);
					return function (c) {
						c = c || [];
						for (var l = 0; l < i.length; l++) {
							var f = i[l],
								b = o(f);
							t[b].references--;
						}
						for (var m = s(c, a), _ = 0; _ < i.length; _++) {
							var y = i[_],
								p = o(y);
							t[p].references === 0 && (t[p].updater(), t.splice(p, 1));
						}
						i = m;
					};
				};
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'(
				e
			) {
				var t = {};
				function o(n) {
					if (t[n] === void 0) {
						var r = document.querySelector(n);
						if (
							window.HTMLIFrameElement &&
							r instanceof window.HTMLIFrameElement
						)
							try {
								r = r.contentDocument.head;
							} catch {
								r = null;
							}
						t[n] = r;
					}
					return t[n];
				}
				function s(n, r) {
					var a = o(n);
					if (!a)
						throw new Error(
							"Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid."
						);
					a.appendChild(r);
				}
				e.exports = s;
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'(
				e
			) {
				function t(o) {
					var s = document.createElement('style');
					return o.setAttributes(s, o.attributes), o.insert(s, o.options), s;
				}
				e.exports = t;
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'(
				e,
				t,
				o
			) {
				function s(n) {
					var r = o.nc;
					r && n.setAttribute('nonce', r);
				}
				e.exports = s;
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'(
				e
			) {
				function t(n, r, a) {
					var i = '';
					a.supports && (i += '@supports ('.concat(a.supports, ') {')),
						a.media && (i += '@media '.concat(a.media, ' {'));
					var c = a.layer !== void 0;
					c &&
						(i += '@layer'.concat(
							a.layer.length > 0 ? ' '.concat(a.layer) : '',
							' {'
						)),
						(i += a.css),
						c && (i += '}'),
						a.media && (i += '}'),
						a.supports && (i += '}');
					var l = a.sourceMap;
					l &&
						typeof btoa < 'u' &&
						(i += `
/*# sourceMappingURL=data:application/json;base64,`.concat(
							btoa(unescape(encodeURIComponent(JSON.stringify(l)))),
							' */'
						)),
						r.styleTagTransform(i, n, r.options);
				}
				function o(n) {
					if (n.parentNode === null) return !1;
					n.parentNode.removeChild(n);
				}
				function s(n) {
					if (typeof document > 'u')
						return { update: function () {}, remove: function () {} };
					var r = n.insertStyleElement(n);
					return {
						update: function (a) {
							t(r, n, a);
						},
						remove: function () {
							o(r);
						},
					};
				}
				e.exports = s;
			},
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'(
				e
			) {
				function t(o, s) {
					if (s.styleSheet) s.styleSheet.cssText = o;
					else {
						for (; s.firstChild; ) s.removeChild(s.firstChild);
						s.appendChild(document.createTextNode(o));
					}
				}
				e.exports = t;
			},
		},
		De = {};
	function L(e) {
		var t = De[e];
		if (t !== void 0) return t.exports;
		var o = (De[e] = { id: e, exports: {} });
		return dt[e](o, o.exports, L), o.exports;
	}
	L.n = (e) => {
		var t = e && e.__esModule ? () => e.default : () => e;
		return L.d(t, { a: t }), t;
	};
	L.d = (e, t) => {
		for (var o in t)
			L.o(t, o) &&
				!L.o(e, o) &&
				Object.defineProperty(e, o, { enumerable: !0, get: t[o] });
	};
	L.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t);
	L.nc = void 0;
	var be = 'c15t-devtools-position',
		ut = 30,
		ze = 0.15;
	function _e() {
		return { isDragging: !1, startX: 0, startY: 0, currentX: 0, currentY: 0 };
	}
	function pt(e, t, o, s = {}) {
		let { threshold: n = ut, velocityX: r = 0, velocityY: a = 0 } = s,
			i = Math.abs(t),
			c = Math.abs(o),
			l = Math.abs(r),
			f = Math.abs(a),
			b = l >= ze,
			m = f >= ze,
			_ = 10,
			y = i >= n || (b && i >= _),
			p = c >= n || (m && c >= _);
		if (!y && !p) return e;
		let w = e.includes('bottom'),
			T = e.includes('right'),
			S = w,
			x = T;
		return (
			y && (x = t > 0),
			p && (S = o > 0),
			S && x
				? 'bottom-right'
				: S && !x
					? 'bottom-left'
					: !S && x
						? 'top-right'
						: 'top-left'
		);
	}
	function ft(e, t = 20) {
		let o = {};
		return (
			e.includes('bottom') ? (o.bottom = `${t}px`) : (o.top = `${t}px`),
			e.includes('right') ? (o.right = `${t}px`) : (o.left = `${t}px`),
			o
		);
	}
	function gt(e, t = be) {
		try {
			typeof localStorage < 'u' && localStorage.setItem(t, e);
		} catch {}
	}
	function mt(e = be) {
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
	function vt(e) {
		return e.isDragging
			? { x: e.currentX - e.startX, y: e.currentY - e.startY }
			: { x: 0, y: 0 };
	}
	function bt(e = {}) {
		let {
				defaultPosition: t = 'bottom-right',
				persistPosition: o = !0,
				onPositionChange: s,
				onDragStart: n,
				onDragEnd: r,
			} = e,
			a = t;
		if (o && typeof window < 'u') {
			let g = mt(be);
			g && (a = g);
		}
		let i = _e(),
			c = !1,
			l = 0,
			f = null,
			b = null,
			m = null,
			_ = null,
			y = null;
		function p(g) {
			(a = g), o && gt(g, be), s?.(g);
		}
		function w(g) {
			g.button === 0 &&
				(g.target.setPointerCapture(g.pointerId),
				(c = !1),
				(l = Date.now()),
				(i = {
					isDragging: !0,
					startX: g.clientX,
					startY: g.clientY,
					currentX: g.clientX,
					currentY: g.clientY,
				}),
				n?.());
		}
		function T(g) {
			if (!i.isDragging) return;
			let d = Math.abs(g.clientX - i.startX),
				C = Math.abs(g.clientY - i.startY);
			if (
				((d > 5 || C > 5) && (c = !0),
				(i = { ...i, currentX: g.clientX, currentY: g.clientY }),
				f && c)
			) {
				let A = vt(i);
				(f.style.transform = `translate(${A.x}px, ${A.y}px)`),
					(f.style.transition = 'none');
			}
		}
		function S(g) {
			if (i.isDragging) {
				if ((g.target.releasePointerCapture(g.pointerId), c)) {
					let d = g.clientX - i.startX,
						C = g.clientY - i.startY,
						A = Date.now() - l,
						N = A > 0 ? d / A : 0,
						z = A > 0 ? C / A : 0,
						O = pt(a, d, C, { velocityX: N, velocityY: z });
					O !== a && p(O),
						f && (h(f), (f.style.transform = ''), (f.style.transition = ''));
				}
				(i = _e()), r?.(c);
			}
		}
		function x(g) {
			g.target.releasePointerCapture(g.pointerId),
				(i = _e()),
				f && ((f.style.transform = ''), (f.style.transition = '')),
				r?.(!1);
		}
		function h(g) {
			let d = ft(a, 20);
			(g.style.top = ''),
				(g.style.bottom = ''),
				(g.style.left = ''),
				(g.style.right = '');
			for (let [C, A] of Object.entries(d))
				A !== void 0 && g.style.setProperty(C, A);
		}
		function v(g) {
			E(),
				(f = g),
				(b = w),
				(m = T),
				(_ = S),
				(y = x),
				g.addEventListener('pointerdown', b),
				g.addEventListener('pointermove', m),
				g.addEventListener('pointerup', _),
				g.addEventListener('pointercancel', y),
				h(g),
				(g.style.touchAction = 'none');
		}
		function E() {
			f &&
				(b && f.removeEventListener('pointerdown', b),
				m && f.removeEventListener('pointermove', m),
				_ && f.removeEventListener('pointerup', _),
				y && f.removeEventListener('pointercancel', y),
				(f = null));
		}
		return {
			getCorner: () => a,
			setCorner: p,
			isDragging: () => i.isDragging,
			wasDragged: () => c,
			attach: v,
			detach: E,
			applyPositionStyles: h,
			destroy: E,
		};
	}
	function te(e = {}) {
		let {
				tag: t = 'div',
				text: o,
				html: s,
				children: n,
				className: r,
				id: a,
				style: i,
				dataset: c,
				onClick: l,
				onMouseEnter: f,
				onMouseLeave: b,
				onKeyDown: m,
				onKeyUp: _,
				onFocus: y,
				onBlur: p,
				onChange: w,
				onInput: T,
				onAnimationEnd: S,
				onTransitionEnd: x,
				...h
			} = e,
			v = document.createElement(t);
		if ((r && (v.className = r), a && (v.id = a), i))
			for (let [E, g] of Object.entries(i))
				g !== void 0 &&
					v.style.setProperty(
						E.replace(/([A-Z])/g, '-$1').toLowerCase(),
						String(g)
					);
		if (c) for (let [E, g] of Object.entries(c)) v.dataset[E] = g;
		if ((o && (v.textContent = o), s && (v.innerHTML = s), n))
			for (let E of n)
				E != null &&
					(typeof E == 'string'
						? v.appendChild(document.createTextNode(E))
						: v.appendChild(E));
		h.ariaLabel !== void 0 && v.setAttribute('aria-label', h.ariaLabel),
			h.ariaExpanded !== void 0 &&
				v.setAttribute('aria-expanded', h.ariaExpanded),
			h.ariaHidden !== void 0 && v.setAttribute('aria-hidden', h.ariaHidden),
			h.ariaSelected !== void 0 &&
				v.setAttribute('aria-selected', h.ariaSelected),
			h.ariaControls !== void 0 &&
				v.setAttribute('aria-controls', h.ariaControls),
			h.ariaChecked !== void 0 && v.setAttribute('aria-checked', h.ariaChecked);
		for (let [E, g] of Object.entries(h))
			g !== void 0 &&
				!E.startsWith('aria') &&
				(typeof g == 'boolean'
					? g && v.setAttribute(E, '')
					: v.setAttribute(E, String(g)));
		return (
			l && v.addEventListener('click', l),
			f && v.addEventListener('mouseenter', f),
			b && v.addEventListener('mouseleave', b),
			m && v.addEventListener('keydown', m),
			_ && v.addEventListener('keyup', _),
			y && v.addEventListener('focus', y),
			p && v.addEventListener('blur', p),
			w && v.addEventListener('change', w),
			T && v.addEventListener('input', T),
			S && v.addEventListener('animationend', S),
			x && v.addEventListener('transitionend', x),
			v
		);
	}
	function u(e = {}) {
		return te({ ...e, tag: 'div' });
	}
	function Y(e = {}) {
		return te({ ...e, tag: 'button', type: e.type ?? 'button' });
	}
	function B(e = {}) {
		return te({ ...e, tag: 'span' });
	}
	function ht(e = {}) {
		return te({ ...e, tag: 'input' });
	}
	function xt(e = {}) {
		let { options: t, selectedValue: o, ...s } = e,
			n = te({ ...s, tag: 'select' });
		if (t)
			for (let r of t) {
				let a = document.createElement('option');
				(a.value = r.value),
					(a.textContent = r.label),
					o === r.value && (a.selected = !0),
					n.appendChild(a);
			}
		return n;
	}
	function U(e, t = {}) {
		let { className: o, ariaHidden: s = !0, width: n = 24, height: r = 24 } = t,
			a = document.createElement('div');
		a.innerHTML = e.trim();
		let i = a.firstElementChild;
		return (
			i &&
				(o && i.setAttribute('class', o),
				s && i.setAttribute('aria-hidden', 'true'),
				i.setAttribute('width', String(n)),
				i.setAttribute('height', String(r))),
			i
		);
	}
	function V(e) {
		for (; e.firstChild; ) e.removeChild(e.firstChild);
	}
	function yt(e) {
		return (
			document.body.appendChild(e),
			() => {
				e.parentNode && e.parentNode.removeChild(e);
			}
		);
	}
	var _t = L(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/injectStylesIntoStyleTag.js'
		),
		oe = L.n(_t),
		St = L(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleDomAPI.js'
		),
		ne = L.n(St),
		wt = L(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertBySelector.js'
		),
		re = L.n(wt),
		Ct = L(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/setAttributesWithoutAttributes.js'
		),
		ae = L.n(Ct),
		kt = L(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/insertStyleElement.js'
		),
		se = L.n(kt),
		It = L(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/style-loader/runtime/styleTagTransform.js'
		),
		ie = L.n(It),
		ue = L(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/animations.module.css'
		),
		Z = {};
	Z.styleTagTransform = ie();
	Z.setAttributes = ae();
	Z.insert = re().bind(null, 'head');
	Z.domAPI = ne();
	Z.insertStyleElement = se();
	oe()(ue.A, Z);
	var $ = ue.A && ue.A.locals ? ue.A.locals : void 0,
		pe = L(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/panel.module.css'
		),
		J = {};
	J.styleTagTransform = ie();
	J.setAttributes = ae();
	J.insert = re().bind(null, 'head');
	J.domAPI = ne();
	J.insertStyleElement = se();
	oe()(pe.A, J);
	var I = pe.A && pe.A.locals ? pe.A.locals : void 0,
		Ke =
			'[data-c15t-trigger], [aria-label*="privacy settings"], [aria-label*="preference"]';
	function Et() {
		return document.querySelectorAll(Ke).length > 0;
	}
	function Tt() {
		return document.querySelectorAll(Ke);
	}
	function At(e) {
		let t = Tt();
		for (let o of t) o.style.display = e ? '' : 'none';
	}
	function Le(e = 'c15tStore') {
		let o = window[e];
		if (o && typeof o.getState == 'function') {
			let s = o.getState();
			if (typeof s.setActiveUI == 'function')
				return () => {
					s.setActiveUI('dialog');
				};
		}
		return null;
	}
	var Bt = '2.0.0-rc.3',
		Ot = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 446 445" aria-label="c15t">
  <path fill="currentColor" d="M223.178.313c39.064 0 70.732 31.668 70.732 70.732-.001 39.064-31.668 70.731-70.732 70.731-12.181 0-23.642-3.079-33.649-8.502l-55.689 55.689a70.267 70.267 0 0 1 5.574 13.441h167.531c8.695-29.217 35.762-50.523 67.804-50.523 39.064 0 70.731 31.668 70.731 70.732s-31.668 70.732-70.731 70.732c-32.042 0-59.108-21.306-67.803-50.523H139.413a70.417 70.417 0 0 1-7.888 17.396l54.046 54.046c10.893-6.851 23.786-10.815 37.605-10.815 39.064 0 70.732 31.669 70.732 70.733 0 39.064-31.668 70.731-70.732 70.731s-70.732-31.667-70.732-70.731c0-10.518 2.296-20.499 6.414-29.471l-57.78-57.78c-8.972 4.117-18.952 6.414-29.47 6.414-39.063 0-70.731-31.668-70.732-70.732 0-39.064 31.669-70.732 70.733-70.732 12.18 0 23.642 3.079 33.649 8.502l55.688-55.688c-5.423-10.007-8.502-21.469-8.502-33.65 0-39.064 31.668-70.733 70.732-70.733Zm0 343.555c-16.742 0-30.314 13.572-30.314 30.314 0 16.741 13.572 30.313 30.314 30.313s30.314-13.572 30.314-30.313c0-16.742-13.572-30.314-30.314-30.314ZM71.611 192.299c-16.742 0-30.315 13.572-30.315 30.314s13.573 30.314 30.315 30.314c16.741 0 30.313-13.572 30.313-30.314 0-16.741-13.572-30.314-30.313-30.314Zm303.138 0c-16.729 0-30.294 13.551-30.315 30.275l.001.039-.001.038c.021 16.725 13.586 30.276 30.315 30.276 16.741 0 30.313-13.572 30.313-30.314 0-16.741-13.572-30.314-30.313-30.314ZM223.178 40.73c-16.742 0-30.314 13.573-30.314 30.315s13.573 30.313 30.314 30.313c16.742 0 30.313-13.572 30.314-30.313 0-16.742-13.572-30.314-30.314-30.315Z"/>
</svg>`,
		Nt = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
  <circle cx="12" cy="12" r="3"/>
</svg>`,
		Dt = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
  <circle cx="12" cy="12" r="3"/>
</svg>`;
	function Re(e) {
		switch (e) {
			case 'bottom-left':
				return I.dropdownMenuBottomLeft ?? '';
			case 'bottom-right':
				return I.dropdownMenuBottomRight ?? '';
			case 'top-left':
				return I.dropdownMenuTopLeft ?? '';
			case 'top-right':
				return I.dropdownMenuTopRight ?? '';
		}
	}
	function zt(e) {
		let { items: t, onOpen: o, onClose: s } = e,
			n = !1,
			r = e.position,
			a = e.referenceElement,
			i = u({
				className: `${I.dropdownMenu ?? ''} ${Re(r)}`,
				role: 'menu',
				ariaLabel: 'c15t Options',
			});
		i.dataset.state = 'closed';
		function c() {
			if (!a) return;
			let x = a.getBoundingClientRect();
			i.getBoundingClientRect();
			let h = 8;
			r.includes('bottom')
				? ((i.style.bottom = `${window.innerHeight - x.top + h}px`),
					(i.style.top = ''))
				: ((i.style.top = `${x.bottom + h}px`), (i.style.bottom = '')),
				r.includes('left')
					? ((i.style.left = `${x.left}px`), (i.style.right = ''))
					: ((i.style.right = `${window.innerWidth - x.right}px`),
						(i.style.left = ''));
		}
		let l = new Map();
		for (let x of t) {
			let h = x.type === 'toggle',
				v = Y({
					className: I.menuItem ?? '',
					role: h ? 'menuitemcheckbox' : 'menuitem',
					onClick: () => {
						x.onClick(), h || _();
					},
				});
			if (
				(h && v.setAttribute('aria-checked', x.checked ? 'true' : 'false'),
				x.icon)
			) {
				let C = u({ className: I.menuItemIcon ?? '' }),
					A = U(x.icon, { width: 20, height: 20 });
				C.appendChild(A), v.appendChild(C);
			}
			let E = u({ className: I.menuItemContent ?? '' }),
				g = B({ className: I.menuItemLabel ?? '', text: x.label });
			if ((E.appendChild(g), x.description)) {
				let C = u({
					className: I.menuItemDescription ?? '',
					text: x.description,
				});
				E.appendChild(C);
			}
			v.appendChild(E);
			let d;
			if (h) {
				d = u({
					className: [
						I.menuItemToggle ?? '',
						x.checked ? (I.menuItemToggleChecked ?? '') : '',
					]
						.filter(Boolean)
						.join(' '),
				});
				let C = u({ className: I.menuItemToggleTrack ?? '' }),
					A = u({ className: I.menuItemToggleThumb ?? '' });
				C.appendChild(A), d.appendChild(C), v.appendChild(d);
			}
			i.appendChild(v), l.set(x.id, { element: v, toggleIndicator: d });
		}
		function f(x) {
			i.contains(x.target) || _();
		}
		function b(x) {
			x.key === 'Escape' && _();
		}
		function m() {
			n ||
				((n = !0),
				c(),
				(i.dataset.state = 'open'),
				o?.(),
				setTimeout(() => {
					document.addEventListener('click', f),
						document.addEventListener('keydown', b);
				}, 10));
		}
		function _() {
			n &&
				((n = !1),
				(i.dataset.state = 'closed'),
				s?.(),
				document.removeEventListener('click', f),
				document.removeEventListener('keydown', b));
		}
		function y() {
			n ? _() : m();
		}
		function p(x) {
			i.classList.remove(
				I.dropdownMenuBottomLeft ?? '',
				I.dropdownMenuBottomRight ?? '',
				I.dropdownMenuTopLeft ?? '',
				I.dropdownMenuTopRight ?? ''
			),
				i.classList.add(Re(x)),
				(r = x),
				n && c();
		}
		function w(x) {
			a = x;
		}
		function T() {
			_();
		}
		function S(x, h) {
			let v = l.get(x);
			if (!v) return;
			let { element: E, toggleIndicator: g } = v;
			E.setAttribute('aria-checked', h ? 'true' : 'false'),
				g &&
					(h
						? g.classList.add(I.menuItemToggleChecked ?? '')
						: g.classList.remove(I.menuItemToggleChecked ?? ''));
		}
		return {
			element: i,
			isOpen: () => n,
			open: m,
			close: _,
			toggle: y,
			updatePosition: p,
			setReferenceElement: w,
			updateItemChecked: S,
			destroy: T,
		};
	}
	var Pe = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 446 445" aria-label="c15t">
  <path fill="currentColor" d="M223.178.313c39.064 0 70.732 31.668 70.732 70.732-.001 39.064-31.668 70.731-70.732 70.731-12.181 0-23.642-3.079-33.649-8.502l-55.689 55.689a70.267 70.267 0 0 1 5.574 13.441h167.531c8.695-29.217 35.762-50.523 67.804-50.523 39.064 0 70.731 31.668 70.731 70.732s-31.668 70.732-70.731 70.732c-32.042 0-59.108-21.306-67.803-50.523H139.413a70.417 70.417 0 0 1-7.888 17.396l54.046 54.046c10.893-6.851 23.786-10.815 37.605-10.815 39.064 0 70.732 31.669 70.732 70.733 0 39.064-31.668 70.731-70.732 70.731s-70.732-31.667-70.732-70.731c0-10.518 2.296-20.499 6.414-29.471l-57.78-57.78c-8.972 4.117-18.952 6.414-29.47 6.414-39.063 0-70.731-31.668-70.732-70.732 0-39.064 31.669-70.732 70.733-70.732 12.18 0 23.642 3.079 33.649 8.502l55.688-55.688c-5.423-10.007-8.502-21.469-8.502-33.65 0-39.064 31.668-70.733 70.732-70.733Zm0 343.555c-16.742 0-30.314 13.572-30.314 30.314 0 16.741 13.572 30.313 30.314 30.313s30.314-13.572 30.314-30.313c0-16.742-13.572-30.314-30.314-30.314ZM71.611 192.299c-16.742 0-30.315 13.572-30.315 30.314s13.573 30.314 30.315 30.314c16.741 0 30.313-13.572 30.313-30.314 0-16.741-13.572-30.314-30.313-30.314Zm303.138 0c-16.729 0-30.294 13.551-30.315 30.275l.001.039-.001.038c.021 16.725 13.586 30.276 30.315 30.276 16.741 0 30.313-13.572 30.313-30.314 0-16.741-13.572-30.314-30.313-30.314ZM223.178 40.73c-16.742 0-30.314 13.573-30.314 30.315s13.573 30.313 30.314 30.313c16.742 0 30.313-13.572 30.314-30.313 0-16.742-13.572-30.314-30.314-30.315Z"/>
</svg>`,
		Lt = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="18" y1="6" x2="6" y2="18"></line>
  <line x1="6" y1="6" x2="18" y2="18"></line>
</svg>`,
		Rt = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
  <line x1="12" y1="9" x2="12" y2="13"></line>
  <line x1="12" y1="17" x2="12.01" y2="17"></line>
</svg>`;
	function Pt(e) {
		switch (e) {
			case 'bottom-right':
				return I.positionBottomRight ?? '';
			case 'bottom-left':
				return I.positionBottomLeft ?? '';
			case 'top-right':
				return I.positionTopRight ?? '';
			case 'top-left':
				return I.positionTopLeft ?? '';
		}
	}
	function Mt(e) {
		let {
				stateManager: t,
				storeConnector: o,
				onRenderContent: s,
				namespace: n = 'c15tStore',
				enableUnifiedMode: r = !0,
			} = e,
			a = null,
			i = !1,
			c = null,
			l = null,
			f = !1,
			b = !1,
			m = !1;
		function _(D) {
			(m = D), At(D), l && l.updateItemChecked('toggle-trigger', D);
		}
		let y = u({ className: I.container, dataset: { c15tDevtools: 'true' } }),
			p = Y({
				className: I.floatingButton ?? '',
				ariaLabel: 'Open c15t Options',
			});
		function w() {
			if (!r) {
				b = !1;
				return;
			}
			f = Et();
			let D = Le(n);
			(b = f && D !== null),
				b &&
					!l &&
					((l = zt({
						items: [
							{
								id: 'devtools',
								label: 'DevTools',
								description: 'View and manage consents',
								icon: Ot,
								onClick: () => {
									t.setOpen(!0);
								},
							},
							{
								id: 'preferences',
								label: 'Preferences',
								description: 'Open privacy settings',
								icon: Nt,
								onClick: () => {
									let M = Le(n);
									M && M();
								},
							},
							{
								id: 'toggle-trigger',
								label: 'Show Trigger',
								description: 'Show preference button',
								icon: Dt,
								type: 'toggle',
								checked: m,
								onClick: () => {
									_(!m);
								},
							},
						],
						position: c?.getCorner() ?? t.getState().position,
						referenceElement: p,
						onOpen: () => {
							p.ariaLabel = 'Close c15t Options';
						},
						onClose: () => {
							p.ariaLabel = 'Open c15t Options';
						},
					})),
					y.appendChild(l.element),
					_(!1)),
				(p.ariaLabel = b ? 'Open c15t Options' : 'Open c15t DevTools');
		}
		c = bt({
			defaultPosition: t.getState().position,
			persistPosition: !0,
			onPositionChange: (D) => {
				t.setPosition(D), l && l.updatePosition(D);
			},
			onDragEnd: (D) => {
				D || (b && l ? l.toggle() : t.toggle());
			},
		});
		let T = u({ className: I.floatingButtonIcon }),
			S = U(Pe, { width: 24, height: 24 });
		T.appendChild(S), p.appendChild(T), c.attach(p), setTimeout(w, 100);
		let x = null,
			h = null,
			v = null,
			E = null;
		function g() {
			let D = c?.getCorner() ?? t.getState().position,
				M = Pt(D),
				j = u({
					className: `${I.panel} ${M} ${$.animateEnter}`,
					role: 'dialog',
					ariaLabel: 'c15t DevTools',
				}),
				le = u({
					className: I.header,
					children: [
						u({
							className: I.headerTitle,
							children: [
								(() => {
									let ee = u({ className: I.headerLogo });
									return ee.appendChild(U(Pe, { width: 20, height: 20 })), ee;
								})(),
								B({ text: 'c15t DevTools' }),
							],
						}),
						Y({
							className: I.closeButton,
							ariaLabel: 'Close DevTools',
							onClick: () => N(),
							children: [
								(() => {
									let ee = u({ className: I.closeButtonIcon });
									return ee.appendChild(U(Lt, { width: 16, height: 16 })), ee;
								})(),
							],
						}),
					],
				});
			return (
				(v = u({ className: I.content })),
				(E = u({ className: I.footer })),
				d(),
				j.appendChild(le),
				j.appendChild(v),
				j.appendChild(E),
				o.isConnected() ? s(v) : C(v),
				j
			);
		}
		function d() {
			if (!E) return;
			V(E);
			let D = o.isConnected(),
				j = o.getState()?.isLoadingConsentInfo ?? !1,
				le = [
					B({
						className: `${I.statusDot} ${D ? I.statusConnected : I.statusDisconnected}`,
					}),
					B({ text: D ? 'Connected' : 'Disconnected' }),
				];
			j &&
				le.push(
					B({
						style: { marginLeft: '4px', opacity: '0.7' },
						text: '\xB7 Fetching /init\u2026',
					})
				),
				E.appendChild(u({ className: I.footerStatus, children: le })),
				D ||
					E.appendChild(
						Y({
							className: I.closeButton,
							text: 'Retry',
							onClick: () => {
								o.retryConnection();
							},
						})
					),
				E.appendChild(B({ text: `v${Bt}` }));
		}
		function C(D) {
			V(D);
			let M = u({
				className: I.errorState,
				children: [
					(() => {
						let j = u({ className: I.errorIcon });
						return j.appendChild(U(Rt, { width: 48, height: 48 })), j;
					})(),
					u({ className: I.errorTitle, text: 'Store Not Found' }),
					u({
						className: I.errorMessage,
						text: 'c15t consent manager is not initialized. Make sure you have set up the ConsentManagerProvider in your app.',
					}),
					Y({
						className: I.closeButton,
						text: 'Retry Connection',
						onClick: () => {
							o.retryConnection();
						},
					}),
				],
			});
			D.appendChild(M);
		}
		function A() {
			x ||
				i ||
				((p.style.display = 'none'),
				(h = u({
					className: `${I.backdrop} ${$.animateFadeIn}`,
					onClick: () => N(),
				})),
				(x = g()),
				y.appendChild(h),
				y.appendChild(x));
		}
		function N() {
			!x ||
				i ||
				((i = !0),
				h &&
					($.animateFadeIn && h.classList.remove($.animateFadeIn),
					$.animateFadeOut && h.classList.add($.animateFadeOut)),
				$.animateEnter && x.classList.remove($.animateEnter),
				$.animateExit && x.classList.add($.animateExit),
				x.addEventListener(
					'animationend',
					() => {
						h && (h.remove(), (h = null)),
							x && (x.remove(), (x = null)),
							(v = null),
							(E = null),
							(i = !1),
							(p.style.display = ''),
							t.setOpen(!1);
					},
					{ once: !0 }
				));
		}
		function z() {
			let D = t.getState();
			!D.isOpen || x || i ? !D.isOpen && x && !i && N() : A(),
				v && o.isConnected() && s(v);
		}
		let O = t.subscribe(() => {
				z();
			}),
			P = o.subscribe(() => {
				d(), v && (o.isConnected() ? s(v) : C(v));
			});
		return (
			y.appendChild(p),
			(a = yt(y)),
			{
				element: y,
				floatingButton: p,
				update: z,
				destroy: () => {
					O(),
						P(),
						l && (l.destroy(), (l = null)),
						c && (c.destroy(), (c = null)),
						a && (a(), (a = null));
				},
			}
		);
	}
	var fe = L(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/tabs.module.css'
		),
		K = {};
	K.styleTagTransform = ie();
	K.setAttributes = ae();
	K.insert = re().bind(null, 'head');
	K.domAPI = ne();
	K.insertStyleElement = se();
	oe()(fe.A, K);
	var H = fe.A && fe.A.locals ? fe.A.locals : void 0,
		jt = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
</svg>`,
		Ft = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"></circle>
  <line x1="2" y1="12" x2="22" y2="12"></line>
  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
</svg>`,
		$t = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="16 18 22 12 16 6"></polyline>
  <polyline points="8 6 2 12 8 18"></polyline>
</svg>`,
		Ut = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
  <circle cx="12" cy="12" r="3"></circle>
</svg>`,
		Vt = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
  <path d="m9 12 2 2 4-4"></path>
</svg>`,
		Yt = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 20h9"></path>
  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
</svg>`,
		Me = [
			{ id: 'location', label: 'Location', icon: Ft },
			{ id: 'consents', label: 'Consents', icon: jt },
			{ id: 'scripts', label: 'Scripts', icon: $t },
			{ id: 'iab', label: 'IAB', icon: Vt },
			{ id: 'actions', label: 'Actions', icon: Ut },
			{ id: 'events', label: 'Events', icon: Yt },
		];
	function Ht(e) {
		let { onTabChange: t, disabledTabs: o = [] } = e,
			s = e.activeTab,
			n = new Map(),
			r = u({
				className: H.tabList,
				role: 'tablist',
				ariaLabel: 'DevTools tabs',
			});
		for (let c of Me) {
			let l = c.id === s,
				f = o.includes(c.id),
				b = Y({
					className: `${H.tab} ${l ? H.tabActive : ''} ${f ? H.tabDisabled : ''}`,
					role: 'tab',
					ariaSelected: l ? 'true' : 'false',
					ariaControls: `panel-${c.id}`,
					ariaDisabled: f ? 'true' : void 0,
					tabIndex: l ? 0 : -1,
					disabled: f,
					onClick: () => {
						f || (i(c.id), t(c.id));
					},
					onKeyDown: (_) => a(_, c.id),
				}),
				m = u({ className: H.tabIcon });
			m.appendChild(U(c.icon, { width: 14, height: 14 })),
				b.appendChild(m),
				b.appendChild(document.createTextNode(c.label)),
				n.set(c.id, b),
				r.appendChild(b);
		}
		function a(c, l) {
			let b = Me.map((p) => p.id).filter((p) => !o.includes(p)),
				m = b.indexOf(l),
				_ = m;
			switch (c.key) {
				case 'ArrowLeft':
					_ = m > 0 ? m - 1 : b.length - 1;
					break;
				case 'ArrowRight':
					_ = m < b.length - 1 ? m + 1 : 0;
					break;
				case 'Home':
					_ = 0;
					break;
				case 'End':
					_ = b.length - 1;
					break;
				default:
					return;
			}
			c.preventDefault();
			let y = b[_];
			y && (i(y), t(y), n.get(y)?.focus());
		}
		function i(c) {
			s = c;
			for (let [l, f] of n) {
				let b = l === c;
				H.tabActive && f.classList.toggle(H.tabActive, b),
					f.setAttribute('aria-selected', b ? 'true' : 'false'),
					(f.tabIndex = b ? 0 : -1);
			}
		}
		return {
			element: r,
			setActiveTab: i,
			destroy: () => {
				n.clear();
			},
		};
	}
	var ge = L(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/components.module.css'
		),
		q = {};
	q.styleTagTransform = ie();
	q.setAttributes = ae();
	q.insert = re().bind(null, 'head');
	q.domAPI = ne();
	q.insertStyleElement = se();
	oe()(ge.A, q);
	var k = ge.A && ge.A.locals ? ge.A.locals : void 0;
	function Ie(e) {
		let { checked: t, onChange: o, ariaLabel: s, disabled: n = !1 } = e,
			r = Y({
				className: `${k.toggle} ${t ? k.toggleActive : ''}`,
				role: 'switch',
				ariaLabel: s,
				ariaChecked: t ? 'true' : 'false',
				disabled: n,
				onClick: () => {
					n || o(!t);
				},
			}),
			a = u({ className: k.toggleThumb });
		return r.appendChild(a), r;
	}
	function Ee(e) {
		let { text: t, variant: o = 'neutral' } = e,
			s = {
				success: k.badgeSuccess,
				error: k.badgeError,
				warning: k.badgeWarning,
				info: k.badgeInfo,
				neutral: k.badgeNeutral,
			}[o];
		return B({ className: `${k.badge} ${s}`, text: t });
	}
	function R(e) {
		let {
				text: t,
				variant: o = 'default',
				small: s = !1,
				icon: n,
				disabled: r = !1,
				onClick: a,
			} = e,
			i = { default: '', primary: k.btnPrimary, danger: k.btnDanger }[o],
			c = s ? k.btnSmall : '',
			l = Y({
				className: `${k.btn} ${i} ${c}`.trim(),
				disabled: r,
				onClick: a,
			});
		if (n) {
			let f = u({ className: k.btnIcon });
			f.appendChild(U(n, { width: 14, height: 14 })), l.appendChild(f);
		}
		return l.appendChild(document.createTextNode(t)), l;
	}
	function Xt(e) {
		let { title: t, description: o, actions: s = [] } = e,
			n = u({
				className: k.listItemContent,
				children: [
					B({ className: k.listItemTitle, text: t }),
					o ? B({ className: k.listItemDescription, text: o }) : null,
				],
			}),
			r = u({ className: k.listItemActions, children: s });
		return u({ className: k.listItem, children: [n, r] });
	}
	function F(e) {
		let { title: t, actions: o = [], children: s } = e,
			n = u({
				className: k.sectionHeader,
				children: [B({ className: k.sectionTitle, text: t }), ...o],
			});
		return u({ className: k.section, children: [n, ...s] });
	}
	function G(e) {
		let { label: t, value: o } = e;
		return u({
			className: k.infoRow,
			children: [
				B({ className: k.infoLabel, text: t }),
				B({ className: k.infoValue, text: o }),
			],
		});
	}
	function Gt(e) {
		let { icon: t, text: o } = e,
			s = [];
		if (t) {
			let n = u({ className: k.emptyStateIcon });
			n.appendChild(U(t, { width: 32, height: 32 })), s.push(n);
		}
		return (
			s.push(B({ className: k.emptyStateText, text: o })),
			u({ className: k.emptyState, children: s.filter(Boolean) })
		);
	}
	function Te(e) {
		let { columns: t = 2, children: o } = e,
			s = t === 3 ? k.gridCols3 : k.gridCols2;
		return u({ className: `${k.grid} ${s}`, children: o });
	}
	function Wt(e) {
		let { title: t, action: o } = e,
			s = [B({ className: k.gridCardTitle, text: t })];
		return o && s.push(o), u({ className: k.gridCard, children: s });
	}
	var Zt = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
  <path d="M21 3v5h-5"></path>
  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
  <path d="M8 16H3v5"></path>
</svg>`,
		Jt = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3 6h18"></path>
  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
</svg>`,
		Kt = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
</svg>`,
		qt = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
  <circle cx="12" cy="12" r="3"></circle>
</svg>`,
		Qt = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
  <circle cx="12" cy="12" r="3"></circle>
</svg>`,
		eo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="4 17 10 11 4 5"></polyline>
  <line x1="12" y1="19" x2="20" y2="19"></line>
</svg>`;
	function to(e, t) {
		let {
			getState: o,
			onResetConsents: s,
			onRefetchBanner: n,
			onShowBanner: r,
			onOpenPreferences: a,
			onCopyState: i,
		} = t;
		V(e);
		let c = o();
		if (!c)
			return void e.appendChild(
				u({
					style: {
						padding: '24px',
						textAlign: 'center',
						color: 'var(--c15t-text-muted)',
						fontSize: 'var(--c15t-devtools-font-size-sm)',
					},
					text: 'Store not connected',
				})
			);
		let l = [
				ce({ icon: qt, label: 'Show Banner', onClick: r }),
				ce({ icon: Qt, label: 'Preferences', onClick: a }),
				ce({ icon: Zt, label: 'Re-fetch', onClick: n }),
				ce({ icon: Kt, label: 'Copy State', onClick: i }),
			],
			f = Te({ columns: 2, children: l });
		e.appendChild(f);
		let b = u({
			style: {
				padding: '12px 16px',
				borderTop: '1px solid var(--c15t-border)',
			},
			children: [
				R({
					text: 'Reset All Consents',
					icon: Jt,
					variant: 'danger',
					onClick: s,
				}),
			],
		});
		e.appendChild(b);
		let m = u({
			style: {
				padding: '12px 16px',
				borderTop: '1px solid var(--c15t-border)',
			},
			children: [
				u({
					style: {
						display: 'flex',
						alignItems: 'center',
						gap: '6px',
						marginBottom: '8px',
					},
					children: [
						qe(eo, 14),
						B({
							style: {
								fontSize: 'var(--c15t-devtools-font-size-xs)',
								fontWeight: '600',
								color: 'var(--c15t-text)',
							},
							text: 'Console API',
						}),
					],
				}),
				u({
					style: {
						display: 'flex',
						flexDirection: 'column',
						gap: '4px',
						padding: '8px',
						borderRadius: 'var(--c15t-radius-md)',
						backgroundColor: 'var(--c15t-surface-muted)',
						fontFamily:
							'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace',
						fontSize: '11px',
						color: 'var(--c15t-text-muted)',
					},
					children: [
						B({ text: `window.${oo(c)}.getState()` }),
						B({ text: 'window.__c15tDevTools.open()' }),
					],
				}),
			],
		});
		e.appendChild(m);
	}
	function ce(e) {
		let { icon: t, label: o, onClick: s } = e,
			n = u({
				className: k.gridCard ?? '',
				style: {
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					gap: '6px',
					padding: '16px 8px',
					cursor: 'pointer',
					transition:
						'background-color var(--c15t-duration-fast) var(--c15t-easing)',
				},
				children: [
					qe(t, 20),
					B({
						style: {
							fontSize: 'var(--c15t-devtools-font-size-xs)',
							fontWeight: '500',
							color: 'var(--c15t-text)',
							textAlign: 'center',
						},
						text: o,
					}),
				],
			});
		return (
			n.addEventListener('click', s),
			n.addEventListener('mouseenter', () => {
				n.style.backgroundColor = 'var(--c15t-surface-hover)';
			}),
			n.addEventListener('mouseleave', () => {
				n.style.backgroundColor = '';
			}),
			n
		);
	}
	function qe(e, t) {
		let o = u({
			style: {
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				color: 'var(--c15t-text-muted)',
			},
		});
		return o.appendChild(U(e, { width: t, height: t })), o;
	}
	function oo(e) {
		return e.config?.meta?.namespace || 'c15tStore';
	}
	function no(e, t) {
		let {
			getState: o,
			onConsentChange: s,
			onSave: n,
			onAcceptAll: r,
			onRejectAll: a,
			onReset: i,
		} = t;
		V(e);
		let c = o();
		if (!c)
			return void e.appendChild(
				u({
					style: {
						padding: '24px',
						textAlign: 'center',
						color: 'var(--c15t-text-muted)',
						fontSize: 'var(--c15t-devtools-font-size-sm)',
					},
					text: 'Store not connected',
				})
			);
		let l = c.model === 'iab',
			f = c.consents || {},
			b = c.selectedConsents || {},
			m = { ...f };
		for (let [S, x] of Object.entries(b)) m[S] = x;
		let _ = !l && Object.entries(m).some(([S, x]) => f[S] !== x),
			y = c.consentTypes || [],
			p = new Map(y.map((S) => [S.name, S])),
			w = Object.entries(m);
		if (w.length === 0)
			e.appendChild(
				u({
					style: {
						padding: '24px',
						textAlign: 'center',
						color: 'var(--c15t-devtools-text-muted)',
						fontSize: 'var(--c15t-devtools-font-size-sm)',
					},
					text: 'No consents configured',
				})
			);
		else {
			if (l) {
				let h = u({
					style: {
						padding: '8px 12px',
						margin: '0 0 8px',
						backgroundColor: 'var(--c15t-devtools-badge-info-bg)',
						borderRadius: '4px',
						fontSize: 'var(--c15t-devtools-font-size-xs)',
						color: 'var(--c15t-devtools-badge-info)',
					},
					text: 'IAB TCF mode: Consents are managed via the IAB framework',
				});
				e.appendChild(h);
			}
			let S = [];
			for (let [h, v] of w) {
				let E = p.get(h),
					g = h === 'necessary',
					d = E?.name || h,
					C = f[h] === v,
					A = Ie({
						checked: !!v,
						disabled: g || l,
						ariaLabel: `Toggle ${d} consent`,
						onChange: (z) => s(String(h), z),
					}),
					N = Wt({ title: ro(d) + (l || C ? '' : ' \u2022'), action: A });
				S.push(N);
			}
			let x = Te({ columns: 2, children: S });
			e.appendChild(x);
		}
		if (l) {
			let S = u({
				style: {
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'flex-end',
					padding: '12px 16px',
					marginTop: 'auto',
					borderTop: '1px solid var(--c15t-border)',
					backgroundColor: 'var(--c15t-surface)',
				},
				children: [
					R({ text: 'Reset All', variant: 'danger', small: !0, onClick: i }),
				],
			});
			e.appendChild(S);
			return;
		}
		let T = u({
			style: {
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				padding: '12px 16px',
				marginTop: 'auto',
				borderTop: '1px solid var(--c15t-border)',
				backgroundColor: _
					? 'var(--c15t-devtools-badge-warning-bg)'
					: 'var(--c15t-surface)',
			},
			children: [
				u({
					style: { display: 'flex', gap: '6px' },
					children: [
						R({ text: 'Accept', variant: 'primary', small: !0, onClick: r }),
						R({ text: 'Reject', variant: 'default', small: !0, onClick: a }),
						R({ text: 'Reset', variant: 'danger', small: !0, onClick: i }),
					],
				}),
				_
					? u({
							style: { display: 'flex', alignItems: 'center', gap: '8px' },
							children: [
								B({
									style: {
										fontSize: 'var(--c15t-devtools-font-size-xs)',
										color: 'var(--c15t-devtools-badge-warning)',
									},
									text: 'Unsaved',
								}),
								R({ text: 'Save', variant: 'primary', small: !0, onClick: n }),
							],
						})
					: B({
							style: {
								fontSize: 'var(--c15t-devtools-font-size-xs)',
								color: 'var(--c15t-text-muted)',
							},
							text: 'No changes',
						}),
			],
		});
		e.appendChild(T);
	}
	function ro(e) {
		return e.replace(/_/g, ' ').replace(/\b\w/g, (t) => t.toUpperCase());
	}
	var Se = 'all',
		X = null;
	function me(e, t) {
		let { getEvents: o, onClear: s } = t;
		V(e);
		let n = o(),
			r = n.filter((l) => io(l, Se));
		r.some((l) => l.id === X) || (X = r[0]?.id ?? null);
		let a = r.find((l) => l.id === X) ?? null,
			i = u({
				style: {
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					padding: '12px 16px 8px',
					gap: '8px',
				},
				children: [
					B({
						style: {
							fontSize: 'var(--c15t-devtools-font-size-xs)',
							fontWeight: '600',
							color: 'var(--c15t-text-muted)',
							textTransform: 'uppercase',
							letterSpacing: '0.5px',
						},
						text: `Events (${r.length}/${n.length})`,
					}),
					u({
						style: { display: 'flex', gap: '6px' },
						children: [
							R({ text: 'Export', small: !0, onClick: () => uo(n) }),
							R({
								text: 'Clear',
								small: !0,
								onClick: () => {
									s(), (X = null), me(e, t);
								},
							}),
						],
					}),
				],
			});
		e.appendChild(i),
			e.appendChild(
				u({
					style: {
						display: 'flex',
						flexWrap: 'wrap',
						gap: '6px',
						padding: '0 16px 8px',
					},
					children: ao.map((l) =>
						so(l, l === Se, () => {
							(Se = l), (X = null), me(e, t);
						})
					),
				})
			);
		let c = u({
			style: {
				display: 'flex',
				flexDirection: 'column',
				gap: '4px',
				padding: '0 12px 12px',
				maxHeight: '300px',
				overflowY: 'auto',
			},
		});
		if (r.length === 0)
			c.appendChild(
				u({
					style: {
						padding: '20px 16px',
						textAlign: 'center',
						color: 'var(--c15t-text-muted)',
						fontSize: 'var(--c15t-devtools-font-size-sm)',
					},
					text: 'No events match this filter',
				})
			);
		else
			for (let l of r)
				c.appendChild(
					co(l, l.id === X, () => {
						(X = l.id), me(e, t);
					})
				);
		e.appendChild(c), e.appendChild(lo(a));
	}
	var ao = ['all', 'error', 'consent', 'network', 'iab'];
	function so(e, t, o) {
		return R({
			text: e.toUpperCase(),
			small: !0,
			variant: t ? 'primary' : 'default',
			onClick: o,
		});
	}
	function io(e, t) {
		return t === 'all'
			? !0
			: t === 'error'
				? e.type === 'error'
				: t === 'consent'
					? e.type === 'consent_set' ||
						e.type === 'consent_save' ||
						e.type === 'consent_reset'
					: t === 'network'
						? e.type === 'network'
						: e.type === 'iab';
	}
	function lo(e) {
		let t = e?.data ? JSON.stringify(e.data, null, 2) : null;
		return u({
			style: { padding: '0 12px 12px' },
			children: [
				u({
					style: {
						fontSize: 'var(--c15t-devtools-font-size-xs)',
						fontWeight: '600',
						color: 'var(--c15t-text-muted)',
						textTransform: 'uppercase',
						letterSpacing: '0.5px',
						marginBottom: '6px',
					},
					text: 'Payload',
				}),
				u({
					className: k.gridCard ?? '',
					style: {
						padding: '8px',
						fontFamily:
							'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace',
						fontSize: '11px',
						color: 'var(--c15t-text-muted)',
						maxHeight: '140px',
						overflowY: 'auto',
						whiteSpace: 'pre-wrap',
						wordBreak: 'break-word',
					},
					text: t || 'Select an event with payload data',
				}),
			],
		});
	}
	function co(e, t, o) {
		let s = po(e.timestamp),
			n = fo(e.type),
			r = go(e.type);
		return u({
			className: k.gridCard ?? '',
			style: {
				display: 'flex',
				alignItems: 'center',
				gap: '8px',
				padding: '6px 10px',
				fontSize: 'var(--c15t-devtools-font-size-xs)',
				cursor: 'pointer',
				borderColor: t
					? 'var(--c15t-devtools-badge-info, #3b82f6)'
					: 'var(--c15t-border)',
			},
			onClick: o,
			children: [
				B({ style: { color: r, fontSize: '8px', lineHeight: '1' }, text: n }),
				B({
					style: {
						color: 'var(--c15t-text-muted)',
						fontFamily: 'monospace',
						fontSize: '10px',
						flexShrink: '0',
					},
					text: s,
				}),
				B({ style: { color: 'var(--c15t-text)', flex: '1' }, text: e.message }),
			],
		});
	}
	function uo(e) {
		let t = JSON.stringify(e, null, 2),
			o = new Blob([t], { type: 'application/json' }),
			s = URL.createObjectURL(o),
			n = new Date().toISOString().replace(/[:.]/g, '-'),
			r = document.createElement('a');
		(r.href = s),
			(r.download = `c15t-events-${n}.json`),
			r.click(),
			URL.revokeObjectURL(s);
	}
	function po(e) {
		return new Date(e).toLocaleTimeString('en-US', {
			hour12: !1,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
		});
	}
	function fo(e) {
		switch (e) {
			case 'consent_set':
			case 'consent_save':
				return '\u25CF';
			case 'consent_reset':
				return '\u25CB';
			case 'error':
				return '\u2715';
			case 'network':
				return '\u25C9';
			case 'iab':
				return '\u25C6';
			default:
				return '\u25CB';
		}
	}
	function go(e) {
		switch (e) {
			case 'consent_set':
			case 'consent_save':
				return 'var(--c15t-devtools-badge-success, #10b981)';
			case 'consent_reset':
				return 'var(--c15t-devtools-badge-warning, #f59e0b)';
			case 'error':
				return 'var(--c15t-devtools-badge-error, #ef4444)';
			case 'network':
				return 'var(--c15t-devtools-badge-warning, #f59e0b)';
			case 'iab':
				return 'var(--c15t-devtools-badge-info, #3b82f6)';
			default:
				return 'var(--c15t-text-muted)';
		}
	}
	function mo(e, t) {
		let {
			getState: o,
			onSetPurposeConsent: s,
			onSetVendorConsent: n,
			onSetSpecialFeatureOptIn: r,
			onAcceptAll: a,
			onRejectAll: i,
			onSave: c,
			onReset: l,
		} = t;
		V(e);
		let f = o();
		if (!f)
			return void e.appendChild(
				u({
					style: {
						padding: '24px',
						textAlign: 'center',
						color: 'var(--c15t-text-muted)',
						fontSize: 'var(--c15t-devtools-font-size-sm)',
					},
					text: 'Store not connected',
				})
			);
		if (f.model !== 'iab')
			return void e.appendChild(
				u({
					style: {
						padding: '24px',
						textAlign: 'center',
						color: 'var(--c15t-text-muted)',
						fontSize: 'var(--c15t-devtools-font-size-sm)',
					},
					text: 'IAB TCF mode is not configured',
				})
			);
		let b = f.iab;
		if (!b)
			return void e.appendChild(
				u({
					style: {
						padding: '24px',
						textAlign: 'center',
						color: 'var(--c15t-text-muted)',
						fontSize: 'var(--c15t-devtools-font-size-sm)',
					},
					text: 'IAB state not available',
				})
			);
		let m = b.tcString,
			_ = F({
				title: 'TC String',
				actions: m
					? [
							R({
								text: 'Copy',
								small: !0,
								onClick: () => {
									navigator.clipboard.writeText(m);
								},
							}),
						]
					: [],
				children: [
					u({
						style: {
							padding: '8px',
							backgroundColor: 'var(--c15t-surface-muted)',
							borderRadius: '4px',
							fontSize: 'var(--c15t-devtools-font-size-xs)',
							fontFamily: 'monospace',
							wordBreak: 'break-all',
							maxHeight: '80px',
							overflowY: 'auto',
							color: m ? 'var(--c15t-text)' : 'var(--c15t-text-muted)',
						},
						text: m || 'No TC String generated yet',
					}),
				],
			});
		e.appendChild(_);
		let y = b.gvl,
			p = b.purposeConsents || {},
			w = y?.purposes || {},
			T = Object.entries(p);
		if (T.length > 0) {
			let N = u({
				style: {
					display: 'flex',
					flexDirection: 'column',
					gap: '4px',
					maxHeight: '120px',
					overflowY: 'auto',
				},
			});
			for (let [O, P] of T) {
				let M = w[O]?.name || `Purpose ${O}`;
				N.appendChild(
					je(O, M, !!P, (j) => {
						s(Number(O), j);
					})
				);
			}
			let z = F({ title: `Purposes (${T.length})`, children: [N] });
			e.appendChild(z);
		}
		let S = b.specialFeatureOptIns || {},
			x = y?.specialFeatures || {},
			h = Object.entries(S);
		if (h.length > 0) {
			let N = u({
				style: {
					display: 'flex',
					flexDirection: 'column',
					gap: '4px',
					maxHeight: '100px',
					overflowY: 'auto',
				},
			});
			for (let [O, P] of h) {
				let M = x[O]?.name || `Special Feature ${O}`;
				N.appendChild(
					je(
						O,
						M,
						!!P,
						(j) => {
							r(Number(O), j);
						},
						'feature'
					)
				);
			}
			let z = F({ title: `Special Features (${h.length})`, children: [N] });
			e.appendChild(z);
		}
		let v = b.vendorConsents || {},
			E = y?.vendors || {},
			g = Object.entries(v),
			d = [],
			C = [];
		for (let [N, z] of g) {
			let O = E[N],
				P = O?.name || `Vendor ${N}`;
			O !== void 0 ? d.push([N, !!z, P]) : C.push([N, !!z, P]);
		}
		if (d.length > 0) {
			let N = u({
				style: {
					display: 'flex',
					flexDirection: 'column',
					gap: '4px',
					maxHeight: '120px',
					overflowY: 'auto',
				},
			});
			for (let [O, P, D] of d)
				N.appendChild(
					Fe(O, D, P, 'iab', (M) => {
						n(Number(O), M);
					})
				);
			let z = F({ title: `IAB Vendors (${d.length})`, children: [N] });
			e.appendChild(z);
		}
		if (C.length > 0) {
			let N = u({
				style: {
					display: 'flex',
					flexDirection: 'column',
					gap: '4px',
					maxHeight: '100px',
					overflowY: 'auto',
				},
			});
			for (let [O, P, D] of C)
				N.appendChild(
					Fe(O, D, P, 'custom', (M) => {
						n(O, M);
					})
				);
			let z = F({ title: `Custom Vendors (${C.length})`, children: [N] });
			e.appendChild(z);
		}
		T.length === 0 &&
			h.length === 0 &&
			g.length === 0 &&
			e.appendChild(
				u({
					style: {
						padding: '16px',
						textAlign: 'center',
						color: 'var(--c15t-text-muted)',
						fontSize: 'var(--c15t-devtools-font-size-sm)',
					},
					text: 'No purposes or vendors configured',
				})
			);
		let A = u({
			style: {
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				padding: '12px 16px',
				marginTop: 'auto',
				borderTop: '1px solid var(--c15t-border)',
				backgroundColor: 'var(--c15t-surface)',
			},
			children: [
				u({
					style: { display: 'flex', gap: '6px' },
					children: [
						R({
							text: 'Accept All',
							variant: 'primary',
							small: !0,
							onClick: a,
						}),
						R({ text: 'Reject All', small: !0, onClick: i }),
						R({ text: 'Save', variant: 'primary', small: !0, onClick: c }),
					],
				}),
				R({ text: 'Reset', variant: 'danger', small: !0, onClick: l }),
			],
		});
		e.appendChild(A);
	}
	function je(e, t, o, s, n = 'purpose') {
		return u({
			style: {
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				padding: '4px 0',
				fontSize: 'var(--c15t-devtools-font-size-xs)',
				borderBottom: '1px solid var(--c15t-border)',
			},
			children: [
				B({
					style: {
						color: 'var(--c15t-text)',
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
						flex: '1',
						marginRight: '8px',
					},
					text: `${e}. ${t}`,
					title: t,
				}),
				u({
					style: { display: 'flex', alignItems: 'center', gap: '6px' },
					children: [
						Ee({
							text: o ? '\u2713' : '\u2715',
							variant: o ? 'success' : 'error',
						}),
						Ie({ checked: o, onChange: s, ariaLabel: `Toggle ${n} ${e}` }),
					],
				}),
			],
		});
	}
	function Fe(e, t, o, s, n) {
		return u({
			style: {
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				padding: '4px 0',
				fontSize: 'var(--c15t-devtools-font-size-xs)',
				borderBottom: '1px solid var(--c15t-border)',
			},
			children: [
				u({
					style: {
						display: 'flex',
						alignItems: 'center',
						gap: '6px',
						overflow: 'hidden',
						flex: '1',
						marginRight: '8px',
					},
					children: [
						s === 'custom'
							? B({
									style: {
										fontSize: '9px',
										padding: '1px 4px',
										backgroundColor: 'var(--c15t-devtools-badge-info-bg)',
										color: 'var(--c15t-devtools-badge-info)',
										borderRadius: '2px',
										flexShrink: '0',
									},
									text: 'CUSTOM',
								})
							: null,
						B({
							style: {
								color: 'var(--c15t-text)',
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								whiteSpace: 'nowrap',
							},
							text: `${e}. ${vo(t, 25)}`,
							title: t,
						}),
					].filter(Boolean),
				}),
				Ee({ text: o ? '\u2713' : '\u2715', variant: o ? 'success' : 'error' }),
				Ie({ checked: o, onChange: n, ariaLabel: `Toggle vendor ${e}` }),
			],
		});
	}
	function vo(e, t) {
		return e.length <= t ? e : `${e.slice(0, t - 3)}...`;
	}
	function bo(e, t) {
		let { getState: o, onApplyOverrides: s, onClearOverrides: n } = t;
		V(e);
		let r = o();
		if (!r)
			return void e.appendChild(
				u({
					style: {
						padding: '24px',
						textAlign: 'center',
						color: 'var(--c15t-text-muted)',
						fontSize: 'var(--c15t-devtools-font-size-sm)',
					},
					text: 'Store not connected',
				})
			);
		let a = r.locationInfo,
			i = r.overrides,
			c = r.translationConfig,
			l = [
				W('Country', a?.countryCode || '\u2014'),
				W('Region', a?.regionCode || '\u2014'),
				W('Jurisdiction', a?.jurisdiction || '\u2014'),
				W('Language', c?.defaultLanguage || '\u2014'),
			];
		l.push(W('GPC', So(i?.gpc))), r.model && l.push(W('Model', wo(r.model)));
		let f = Te({ columns: 3, children: l });
		e.appendChild(f);
		let b = we(i),
			m = Ve(b),
			_ = !1,
			y = Ue({ label: 'Country', selectOptions: yo, value: b.country }),
			p = $e({
				label: 'Region',
				placeholder: 'e.g., CA, NY, BE',
				value: b.region,
			}),
			w = $e({
				label: 'Language',
				placeholder: 'e.g., de, fr, en-US',
				value: b.language,
			}),
			T = Ue({ label: 'GPC', selectOptions: _o, value: b.gpc }),
			S = B({ className: k.overrideStatus, text: 'In sync' }),
			x = R({
				text: 'Apply',
				variant: 'primary',
				small: !0,
				disabled: !0,
				onClick: () => {
					d();
				},
			}),
			h = R({
				text: 'Revert',
				small: !0,
				disabled: !0,
				onClick: () => {
					N(we(m)), z();
				},
			}),
			v = R({
				text: 'Clear',
				small: !0,
				onClick: () => {
					C();
				},
			}),
			E = u({
				style: {
					display: 'grid',
					gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
					gap: '8px 10px',
				},
				children: [y.element, p.element, w.element, T.element],
			}),
			g = F({
				title: 'Override Settings',
				children: [
					E,
					B({
						className: k.overrideHint,
						text: 'GPC override only affects opt-out or unregulated jurisdictions.',
					}),
					u({
						className: k.overrideActions,
						children: [
							u({ className: k.overrideActionButtons, children: [h, x, v] }),
							S,
						],
					}),
				],
			});
		e.appendChild(g),
			y.control.addEventListener('change', z),
			p.control.addEventListener('input', z),
			w.control.addEventListener('input', z),
			T.control.addEventListener('change', z),
			z();
		async function d() {
			if (_) return;
			let O = A();
			if (!He(O, m)) {
				(_ = !0), z();
				try {
					await s(O), (m = O);
				} finally {
					(_ = !1), z();
				}
			}
		}
		async function C() {
			if (!_) {
				(_ = !0), z();
				try {
					await n(), (m = {}), N(we(void 0));
				} finally {
					(_ = !1), z();
				}
			}
		}
		function A() {
			return Ve({
				country: y.control.value,
				region: p.control.value,
				language: w.control.value,
				gpc: T.control.value,
			});
		}
		function N(O) {
			(y.control.value = O.country),
				(p.control.value = O.region),
				(w.control.value = O.language),
				(T.control.value = O.gpc);
		}
		function z() {
			let O = A(),
				P = !He(O, m);
			(x.disabled = !P || _),
				(h.disabled = !P || _),
				(v.disabled = _),
				(S.textContent = _
					? 'Applying...'
					: P
						? 'Unsaved changes'
						: xo(m)
							? 'Overrides active'
							: 'No overrides'),
				k.overrideStatusDirty &&
					S.classList.toggle(k.overrideStatusDirty, !_ && P);
		}
	}
	function $e(e) {
		let { label: t, placeholder: o, value: s } = e,
			n = ht({
				className: `${k.input ?? ''} ${k.inputSmall ?? ''}`.trim(),
				placeholder: o,
				value: s,
			});
		return {
			element: u({
				className: k.overrideField,
				children: [B({ className: k.overrideLabel, text: t }), n],
			}),
			control: n,
		};
	}
	function Ue(e) {
		let { label: t, selectOptions: o, value: s } = e,
			n = xt({
				className: `${k.input ?? ''} ${k.inputSmall ?? ''}`.trim(),
				options: o,
				selectedValue: s,
			});
		return {
			element: u({
				className: k.overrideField,
				children: [B({ className: k.overrideLabel, text: t }), n],
			}),
			control: n,
		};
	}
	function we(e) {
		return {
			country: e?.country ?? '',
			region: e?.region ?? '',
			language: e?.language ?? '',
			gpc: e?.gpc === !0 ? 'true' : e?.gpc === !1 ? 'false' : '',
		};
	}
	function Ve(e) {
		return {
			country: Ye(e.country),
			region: Ye(e.region),
			language: ho(e.language),
			gpc: e.gpc === 'true' ? !0 : e.gpc === 'false' ? !1 : void 0,
		};
	}
	function Ye(e) {
		return e.trim().toUpperCase() || void 0;
	}
	function ho(e) {
		return e.trim() || void 0;
	}
	function He(e, t) {
		return (
			e.country === t.country &&
			e.region === t.region &&
			e.language === t.language &&
			e.gpc === t.gpc
		);
	}
	function xo(e) {
		return !!(e.country || e.region || e.language || e.gpc !== void 0);
	}
	var yo = [
			{ value: '', label: '-- Select --' },
			{ value: 'US', label: 'US - United States' },
			{ value: 'CA', label: 'CA - Canada' },
			{ value: 'GB', label: 'GB - United Kingdom' },
			{ value: 'DE', label: 'DE - Germany' },
			{ value: 'FR', label: 'FR - France' },
			{ value: 'IT', label: 'IT - Italy' },
			{ value: 'ES', label: 'ES - Spain' },
			{ value: 'NL', label: 'NL - Netherlands' },
			{ value: 'BE', label: 'BE - Belgium' },
			{ value: 'AT', label: 'AT - Austria' },
			{ value: 'CH', label: 'CH - Switzerland' },
			{ value: 'PL', label: 'PL - Poland' },
			{ value: 'SE', label: 'SE - Sweden' },
			{ value: 'NO', label: 'NO - Norway' },
			{ value: 'DK', label: 'DK - Denmark' },
			{ value: 'FI', label: 'FI - Finland' },
			{ value: 'IE', label: 'IE - Ireland' },
			{ value: 'PT', label: 'PT - Portugal' },
			{ value: 'AU', label: 'AU - Australia' },
			{ value: 'NZ', label: 'NZ - New Zealand' },
			{ value: 'JP', label: 'JP - Japan' },
			{ value: 'BR', label: 'BR - Brazil' },
			{ value: 'MX', label: 'MX - Mexico' },
			{ value: 'IN', label: 'IN - India' },
			{ value: 'CN', label: 'CN - China' },
			{ value: 'KR', label: 'KR - South Korea' },
			{ value: 'SG', label: 'SG - Singapore' },
			{ value: 'HK', label: 'HK - Hong Kong' },
			{ value: 'ZA', label: 'ZA - South Africa' },
		],
		_o = [
			{ value: '', label: '-- Browser Default --' },
			{ value: 'true', label: 'Force On (Simulated)' },
			{ value: 'false', label: 'Force Off (Simulated)' },
		];
	function So(e) {
		if (e === !0) return 'On (Override)';
		if (e === !1) return 'Off (Override)';
		if (typeof window > 'u' || typeof navigator > 'u') return 'Unknown';
		try {
			let o = navigator.globalPrivacyControl;
			return o === !0 || o === '1' ? 'Active' : 'Inactive';
		} catch {
			return 'Unknown';
		}
	}
	function wo(e) {
		switch (e) {
			case 'opt-in':
				return 'Opt-In';
			case 'opt-out':
				return 'Opt-Out';
			case 'iab':
				return 'IAB TCF';
			default:
				return 'None';
		}
	}
	function W(e, t) {
		return u({
			className: k.gridCard ?? '',
			style: {
				padding: '6px 8px',
				minHeight: 'auto',
				flexDirection: 'column',
				alignItems: 'flex-start',
				gap: '1px',
			},
			children: [
				B({
					style: {
						fontSize: 'var(--c15t-devtools-font-size-xs)',
						color: 'var(--c15t-text-muted)',
					},
					text: e,
				}),
				B({
					style: {
						fontSize: 'var(--c15t-font-size-sm)',
						fontWeight: '500',
						fontFamily: 'ui-monospace, monospace',
					},
					text: t,
				}),
			],
		});
	}
	var Qe = new Set();
	function Co(e) {
		let t = [],
			o = e.scripts || [],
			s = [];
		for (let a of o)
			if (a.src)
				try {
					let i = new URL(a.src, window.location.origin);
					i.hostname !== window.location.hostname &&
						s.push({
							scriptId: a.id,
							domain: i.hostname,
							pathPrefix: et(i.pathname),
						});
				} catch {}
		let n = document.querySelectorAll('script[src]');
		for (let a of n) {
			let i = a.getAttribute('src');
			if (!i) continue;
			let c = Xe(i, 'script', s);
			c && t.push(c);
		}
		let r = document.querySelectorAll('iframe[src]');
		for (let a of r) {
			let i = a.getAttribute('src');
			if (!i) continue;
			let c = Xe(i, 'iframe', s);
			c && t.push(c);
		}
		return t;
	}
	function Xe(e, t, o) {
		try {
			let s = new URL(e, window.location.origin),
				n = s.hostname;
			if (
				n === window.location.hostname ||
				s.protocol === 'data:' ||
				s.protocol === 'blob:'
			)
				return null;
			let r = ko(s, o);
			return {
				type: t,
				src: e,
				domain: n,
				status: !!r ? 'managed' : 'unmanaged',
				managedBy: r,
			};
		} catch {}
		return null;
	}
	function ko(e, t) {
		let o = e.hostname,
			s = et(e.pathname),
			n = null;
		for (let r of t)
			r.domain === o &&
				(r.pathPrefix === '/' || s.startsWith(r.pathPrefix)) &&
				(!n || r.pathPrefix.length > n.pathPrefix.length) &&
				(n = r);
		return n?.scriptId;
	}
	function et(e) {
		let t = e.trim();
		return t.length > 0 ? t : '/';
	}
	function Io(e) {
		let t = null,
			o = [],
			s = () => {
				t &&
					Eo(t, o, (i) => {
						Qe.add(i), s();
					});
			},
			r = F({
				title: 'DOM Scanner',
				actions: [
					R({
						text: 'Scan DOM',
						small: !0,
						onClick: () => {
							!e || !t || ((o = Co(e)), s());
						},
					}),
				],
				children: [],
			});
		t = u({});
		let a = u({
			style: {
				fontSize: 'var(--c15t-devtools-font-size-xs)',
				color: 'var(--c15t-text-muted)',
				textAlign: 'center',
				padding: '8px 0',
			},
			text: 'Click "Scan DOM" to check for external scripts and iframes',
		});
		return t.appendChild(a), r.appendChild(t), r;
	}
	function Eo(e, t, o) {
		for (; e.firstChild; ) e.removeChild(e.firstChild);
		let s = t.filter((l) => !Qe.has(l.src));
		if (s.length === 0 && t.length === 0)
			return void e.appendChild(
				u({
					style: {
						fontSize: 'var(--c15t-devtools-font-size-xs)',
						color: 'var(--c15t-text-muted)',
						textAlign: 'center',
						padding: '8px 0',
					},
					text: 'No external scripts or iframes found',
				})
			);
		if (s.length === 0 && t.length > 0)
			return void e.appendChild(
				u({
					style: {
						fontSize: 'var(--c15t-devtools-font-size-xs)',
						color: 'var(--c15t-text-muted)',
						textAlign: 'center',
						padding: '8px 0',
					},
					text: `All ${t.length} alerts dismissed`,
				})
			);
		let n = s.filter((l) => l.status === 'unmanaged'),
			r = s.filter((l) => l.status === 'managed'),
			a = t.length - s.length,
			i =
				a > 0
					? `Found: ${r.length} managed, ${n.length} unmanaged (${a} dismissed)`
					: `Found: ${r.length} managed, ${n.length} unmanaged`,
			c = u({
				style: {
					fontSize: 'var(--c15t-devtools-font-size-xs)',
					color: 'var(--c15t-text-muted)',
					marginBottom: '8px',
				},
				text: i,
			});
		if ((e.appendChild(c), n.length > 0))
			for (let l of n) e.appendChild(Ge(l, 'warning', o));
		if (r.length > 0) {
			let l = u({
				style: {
					fontSize: 'var(--c15t-devtools-font-size-xs)',
					fontWeight: '600',
					color: 'var(--c15t-devtools-badge-success)',
					marginBottom: '4px',
					marginTop: '8px',
				},
				text: 'MANAGED',
			});
			e.appendChild(l);
			for (let f of r) e.appendChild(Ge(f, 'success', o));
		}
	}
	function Ge(e, t, o) {
		return u({
			style: {
				display: 'flex',
				alignItems: 'center',
				gap: '6px',
				padding: '4px 0',
				fontSize: 'var(--c15t-devtools-font-size-xs)',
				borderBottom: '1px solid var(--c15t-border)',
			},
			children: [
				B({
					style: {
						color:
							t === 'warning'
								? 'var(--c15t-devtools-badge-warning)'
								: 'var(--c15t-devtools-badge-success)',
						flexShrink: '0',
					},
					text: t === 'warning' ? '\u26A0' : '\u2713',
				}),
				B({
					style: { color: 'var(--c15t-text-muted)', flexShrink: '0' },
					text: `${e.type}:`,
				}),
				B({
					style: {
						fontWeight: '500',
						color: 'var(--c15t-text)',
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
						flex: '1',
					},
					text: e.domain,
					title: e.src,
				}),
				t === 'warning'
					? (() => {
							let a = document.createElement('button');
							return (
								(a.textContent = '\u2715'),
								(a.title = 'Dismiss this alert'),
								(a.style.cssText = `
						background: none;
						border: none;
						color: var(--c15t-text-muted);
						cursor: pointer;
						padding: 2px 4px;
						font-size: 10px;
						opacity: 0.6;
						flex-shrink: 0;
					`),
								(a.onmouseenter = () => {
									a.style.opacity = '1';
								}),
								(a.onmouseleave = () => {
									a.style.opacity = '0.6';
								}),
								(a.onclick = (i) => {
									i.stopPropagation(), o(e.src);
								}),
								a
							);
						})()
					: null,
			].filter(Boolean),
		});
	}
	var To = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="16 18 22 12 16 6"></polyline>
  <polyline points="8 6 2 12 8 18"></polyline>
</svg>`;
	function Ao(e, t) {
		let { getState: o, getEvents: s } = t;
		V(e);
		let n = o();
		if (!n)
			return void e.appendChild(
				u({
					style: {
						padding: '24px',
						textAlign: 'center',
						color: 'var(--c15t-text-muted)',
						fontSize: 'var(--c15t-devtools-font-size-sm)',
					},
					text: 'Store not connected',
				})
			);
		let r = n.scripts || [],
			a = n.loadedScripts || {},
			i = n.networkBlocker,
			c = s?.() ?? [];
		if (r.length === 0) {
			let w = F({
				title: 'Configured Scripts',
				children: [Gt({ icon: To, text: 'No scripts configured' })],
			});
			e.appendChild(w);
		} else {
			let w = u({
				style: { display: 'flex', flexDirection: 'column', gap: '4px' },
			});
			for (let S of r) {
				let x = S.id,
					h = a[x] === !0,
					v = S.category,
					E = typeof v == 'string' ? v : JSON.stringify(v),
					g = 'pending',
					d = 'neutral';
				h
					? ((g = 'loaded'), (d = 'success'))
					: Bo(n, v)
						? ((g = 'pending'), (d = 'warning'))
						: ((g = 'blocked'), (d = 'neutral'));
				let C = Ee({
						text: g.charAt(0).toUpperCase() + g.slice(1),
						variant: d,
					}),
					A = Xt({ title: x, description: `Category: ${E}`, actions: [C] });
				w.appendChild(A);
			}
			let T = F({ title: `Configured Scripts (${r.length})`, children: [w] });
			e.appendChild(T);
		}
		let l = F({
			title: 'Network Blocker',
			children: i
				? [
						G({ label: 'Status', value: 'Active' }),
						G({
							label: 'Blocked Domains',
							value: String(i.rules?.length || 0),
						}),
					]
				: [
						u({
							style: {
								fontSize: 'var(--c15t-devtools-font-size-xs)',
								color: 'var(--c15t-devtools-text-muted)',
							},
							text: 'Network blocker not configured',
						}),
					],
		});
		e.appendChild(l);
		let f = c.filter((w) => w.type === 'network'),
			b = F({
				title: `Blocked Requests (${f.length})`,
				children:
					f.length === 0
						? [
								u({
									style: {
										fontSize: 'var(--c15t-devtools-font-size-xs)',
										color: 'var(--c15t-devtools-text-muted)',
									},
									text: 'No blocked network requests recorded in this session',
								}),
							]
						: Oo(f),
			});
		e.appendChild(b);
		let m = Object.values(a).filter(Boolean).length,
			_ = r.length,
			y = F({
				title: 'Summary',
				children: [
					G({ label: 'Total Scripts', value: String(_) }),
					G({ label: 'Loaded', value: String(m) }),
					G({ label: 'Pending/Blocked', value: String(_ - m) }),
				],
			});
		e.appendChild(y);
		let p = Io(n);
		e.appendChild(p);
	}
	function Bo(e, t) {
		if (!t) return !0;
		if (typeof e.has == 'function')
			try {
				return e.has(t);
			} catch {}
		return typeof t == 'string' ? (e.consents || {})[t] === !0 : !1;
	}
	function Oo(e) {
		let t = new Map();
		for (let r of e) {
			let a = No(r) ?? 'unknown';
			t.set(a, (t.get(a) ?? 0) + 1);
		}
		let o = u({
				style: {
					display: 'flex',
					flexDirection: 'column',
					gap: '4px',
					marginBottom: '8px',
				},
				children: [...t.entries()]
					.sort((r, a) => a[1] - r[1])
					.map(([r, a]) =>
						G({
							label: r === 'unknown' ? 'Unknown Rule' : `Rule: ${r}`,
							value: `${a}`,
						})
					),
			}),
			s = e.slice(0, 5),
			n = u({
				style: { display: 'flex', flexDirection: 'column', gap: '4px' },
				children: s.map((r) =>
					G({ label: `${Lo(r.timestamp)} ${Do(r)}`, value: Ro(zo(r), 38) })
				),
			});
		return [o, n];
	}
	function No(e) {
		let t = e.data,
			s = t?.rule?.id ?? t?.ruleId;
		return typeof s == 'string' || typeof s == 'number' ? String(s) : void 0;
	}
	function Do(e) {
		let o = e.data?.method;
		return typeof o == 'string' ? o.toUpperCase() : 'REQ';
	}
	function zo(e) {
		let o = e.data?.url;
		return typeof o == 'string' ? o : e.message;
	}
	function Lo(e) {
		return new Date(e).toLocaleTimeString('en-US', {
			hour12: !1,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
		});
	}
	function Ro(e, t) {
		return e.length <= t ? e : `${e.slice(0, t - 3)}...`;
	}
	var Ae = 'c15t-devtools-overrides';
	function Ce(e) {
		if (typeof e != 'string') return;
		let t = e.trim();
		return t.length > 0 ? t : void 0;
	}
	function Po(e) {
		return typeof e == 'boolean' ? e : void 0;
	}
	function Mo(e) {
		if (!e || typeof e != 'object') return null;
		let t = e,
			o = {
				country: Ce(t.country),
				region: Ce(t.region),
				language: Ce(t.language),
				gpc: Po(t.gpc),
			};
		return tt(o) ? o : null;
	}
	function tt(e) {
		return !!(e.country || e.region || e.language || e.gpc !== void 0);
	}
	function jo(e = Ae) {
		if (typeof window > 'u') return null;
		try {
			let t = localStorage.getItem(e);
			if (!t) return null;
			let o = JSON.parse(t);
			return Mo(o);
		} catch {
			return null;
		}
	}
	function Fo(e, t = Ae) {
		if (!(typeof window > 'u'))
			try {
				if (!tt(e)) return void localStorage.removeItem(t);
				localStorage.setItem(t, JSON.stringify(e));
			} catch {}
	}
	function $o(e = Ae) {
		if (!(typeof window > 'u'))
			try {
				localStorage.removeItem(e);
			} catch {}
	}
	var de = {
			C15T: 'c15t',
			PENDING_SYNC: 'c15t:pending-consent-sync',
			PENDING_SUBMISSIONS: 'c15t-pending-consent-submissions',
			EUCONSENT: 'euconsent-v2',
		},
		We = { C15T: 'c15t', EUCONSENT: 'euconsent-v2' };
	function Ze(e) {
		document.cookie = `${e}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
	}
	function Uo() {
		Ze(We.C15T), Ze(We.EUCONSENT);
	}
	function Vo() {
		try {
			localStorage.removeItem(de.C15T),
				localStorage.removeItem(de.PENDING_SYNC),
				localStorage.removeItem(de.PENDING_SUBMISSIONS),
				localStorage.removeItem(de.EUCONSENT);
		} catch {}
	}
	async function ke(e, t) {
		let o = e.getState();
		o.resetConsents(),
			Uo(),
			Vo(),
			await o.initConsentManager(),
			t?.addEvent({
				type: 'consent_reset',
				message: 'All consents reset (storage cleared)',
			});
	}
	var ot = 'c15t-devtools-events';
	function Yo() {
		if (typeof window > 'u') return [];
		try {
			let e = sessionStorage.getItem(ot);
			if (e) return JSON.parse(e);
		} catch {}
		return [];
	}
	function Je(e) {
		if (!(typeof window > 'u'))
			try {
				sessionStorage.setItem(ot, JSON.stringify(e));
			} catch {}
	}
	function Ho(e = {}) {
		let o = {
				isOpen: !1,
				activeTab: 'location',
				position: 'bottom-right',
				isConnected: !1,
				eventLog: Yo(),
				maxEventLogSize: 100,
				...e,
			},
			s = new Set();
		function n(a) {
			for (let i of s) i(o, a);
		}
		function r(a) {
			let i = o;
			(o = { ...o, ...a }), n(i);
		}
		return {
			getState: () => o,
			subscribe: (a) => (
				s.add(a),
				() => {
					s.delete(a);
				}
			),
			setOpen: (a) => {
				r({ isOpen: a });
			},
			toggle: () => {
				r({ isOpen: !o.isOpen });
			},
			setActiveTab: (a) => {
				r({ activeTab: a });
			},
			setPosition: (a) => {
				r({ position: a });
			},
			setConnected: (a) => {
				r({ isConnected: a });
			},
			addEvent: (a) => {
				let c = [
					{
						...a,
						id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
						timestamp: Date.now(),
					},
					...o.eventLog,
				].slice(0, o.maxEventLogSize);
				r({ eventLog: c }), Je(c);
			},
			clearEventLog: () => {
				r({ eventLog: [] }), Je([]);
			},
			destroy: () => {
				s.clear();
			},
		};
	}
	function Xo(e = {}) {
		let {
				namespace: t = 'c15tStore',
				onConnect: o,
				onStateChange: s,
				onDisconnect: n,
			} = e,
			r = null,
			a = null,
			i = null,
			c = 0,
			l = !1,
			f = new Set(),
			b = 100,
			m = 2e3,
			_ = 5;
		function y() {
			i && (clearTimeout(i), (i = null));
		}
		function p() {
			(c = 0), (l = !1);
		}
		function w() {
			l || ((l = !0), n?.());
		}
		function T() {
			if (typeof window > 'u') return !1;
			let h = window[t];
			if (h && typeof h.getState == 'function') {
				if (r === h && a) return !0;
				a && (a(), (a = null)),
					(r = h),
					(a = r.subscribe((E) => {
						s?.(E);
						for (let g of f) g(E);
					}));
				let v = r.getState();
				return o?.(v, r), y(), p(), !0;
			}
			return !1;
		}
		function S(h = !1) {
			if (r || i) return;
			let v = h ? 0 : Math.min(b * 2 ** Math.min(c, 5), m);
			i = setTimeout(() => {
				(i = null), c++, !T() && (c >= _ && w(), S());
			}, v);
		}
		function x() {
			T() || S(!0);
		}
		return (
			x(),
			{
				getState: () => r?.getState() ?? null,
				getStore: () => r,
				isConnected: () => r !== null,
				subscribe: (h) => (
					f.add(h),
					r && h(r.getState()),
					() => {
						f.delete(h);
					}
				),
				retryConnection: () => {
					r || (p(), S(!0));
				},
				destroy: () => {
					y(), a && (a(), (a = null)), (r = null), f.clear();
				},
			}
		);
	}
	var ve = L(
			'../../node_modules/.bun/@rsbuild+core@1.6.12/node_modules/@rsbuild/core/compiled/css-loader/index.js??ruleSet[1].rules[1].use[1]!builtin:lightningcss-loader??ruleSet[1].rules[1].use[2]!./src/styles/tokens.css'
		),
		Q = {};
	Q.styleTagTransform = ie();
	Q.setAttributes = ae();
	Q.insert = re().bind(null, 'head');
	Q.domAPI = ne();
	Q.insertStyleElement = se();
	oe()(ve.A, Q);
	ve.A && ve.A.locals && ve.A.locals;
	var Go =
			'height var(--c15t-duration-normal, 200ms) var(--c15t-easing, cubic-bezier(0.4, 0, 0.2, 1))',
		Wo = 200,
		Zo = 80;
	function Jo(e) {
		return {
			country: e?.country?.trim() || void 0,
			region: e?.region?.trim() || void 0,
			language: e?.language?.trim() || void 0,
			gpc: e?.gpc,
		};
	}
	function Ko(e, t) {
		return (
			e.country === t.country &&
			e.region === t.region &&
			e.language === t.language &&
			e.gpc === t.gpc
		);
	}
	function qo(e) {
		let t = e,
			o = typeof t?.method == 'string' ? t.method.toUpperCase() : 'REQUEST',
			s = typeof t?.url == 'string' ? t.url : 'unknown-url';
		return `Network blocked: ${o} ${s}`;
	}
	function Qo() {
		return (
			typeof window < 'u' &&
			typeof window.matchMedia == 'function' &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches
		);
	}
	function en() {
		let e = null,
			t = null,
			o = null,
			s = null;
		function n() {
			t !== null && (window.cancelAnimationFrame(t), (t = null)),
				o !== null && (clearTimeout(o), (o = null)),
				s && (s(), (s = null)),
				e &&
					((e.style.height = ''),
					(e.style.transition = ''),
					(e.style.willChange = ''),
					(e = null));
		}
		function r(a, i) {
			if (!Number.isFinite(i) || Qo()) return;
			let c = a.getBoundingClientRect().height;
			if (!Number.isFinite(c) || Math.abs(c - i) < 1) return;
			n(),
				(e = a),
				(a.style.height = `${i}px`),
				(a.style.willChange = 'height'),
				a.getBoundingClientRect();
			let l = (f) => {
				let b = f;
				(typeof b.propertyName == 'string' &&
					b.propertyName &&
					b.propertyName !== 'height') ||
					n();
			};
			a.addEventListener('transitionend', l),
				(s = () => {
					a.removeEventListener('transitionend', l);
				}),
				(t = window.requestAnimationFrame(() => {
					(t = null), (a.style.transition = Go), (a.style.height = `${c}px`);
				})),
				(o = setTimeout(() => {
					n();
				}, Wo + Zo));
		}
		return { animate: r, destroy: n };
	}
	function nt(e = {}) {
		let {
				namespace: t = 'c15tStore',
				position: o = 'bottom-right',
				defaultOpen: s = !1,
			} = e,
			n = Ho({ position: o, isOpen: s }),
			r = {},
			a,
			i = !1,
			c = Xo({
				namespace: t,
				onConnect: (y, p) => {
					n.setConnected(!0),
						n.addEvent({ type: 'info', message: 'Connected to c15tStore' }),
						(r = { ...y.callbacks }),
						p.getState().setCallback('onBannerFetched', (S) => {
							n.addEvent({
								type: 'info',
								message: `Banner fetched: ${String(S.jurisdiction)}`,
								data: S,
							}),
								typeof r.onBannerFetched == 'function' && r.onBannerFetched(S);
						}),
						p.getState().setCallback('onConsentSet', (S) => {
							n.addEvent({
								type: 'consent_set',
								message: 'Consent preferences updated',
								data: S,
							}),
								typeof r.onConsentSet == 'function' && r.onConsentSet(S);
						}),
						p.getState().setCallback('onError', (S) => {
							n.addEvent({
								type: 'error',
								message: `Error: ${S.error}`,
								data: S,
							}),
								typeof r.onError == 'function' && r.onError(S);
						}),
						p.getState().setCallback('onBeforeConsentRevocationReload', (S) => {
							n.addEvent({
								type: 'info',
								message: 'Consent revocation - page will reload',
								data: S,
							}),
								typeof r.onBeforeConsentRevocationReload == 'function' &&
									r.onBeforeConsentRevocationReload(S);
						});
					let w = p.getState().networkBlocker;
					w &&
						!i &&
						((a = w.onRequestBlocked),
						(i = !0),
						p.getState().setNetworkBlocker({
							...w,
							onRequestBlocked: (S) => {
								n.addEvent({ type: 'network', message: qo(S), data: S }),
									typeof a == 'function' && a(S);
							},
						}));
					let T = jo();
					if (T) {
						let S = Jo(p.getState().overrides);
						Ko(T, S) ||
							p
								.getState()
								.setOverrides({
									country: T.country,
									region: T.region,
									language: T.language,
									gpc: T.gpc,
								})
								.then(() => {
									n.addEvent({
										type: 'info',
										message: 'Applied persisted devtools overrides',
										data: {
											country: T.country,
											region: T.region,
											language: T.language,
											gpc: T.gpc,
										},
									});
								})
								.catch(() => {
									n.addEvent({
										type: 'error',
										message: 'Failed to apply persisted devtools overrides',
									});
								});
					}
				},
				onDisconnect: () => {
					n.setConnected(!1),
						n.addEvent({
							type: 'error',
							message: 'Disconnected from c15tStore',
						});
				},
				onStateChange: () => {},
			}),
			l = null,
			f = en(),
			b = Mt({
				stateManager: n,
				storeConnector: c,
				namespace: t,
				onRenderContent: (y) => {
					m(y, n, c);
				},
			});
		function m(y, p, w) {
			let T = y.parentElement,
				S = T?.getBoundingClientRect().height ?? 0;
			V(y);
			let x = w.getState(),
				h = [];
			(!x || x.model !== 'iab') && h.push('iab'),
				l && l.destroy(),
				(l = Ht({
					activeTab: p.getState().activeTab,
					onTabChange: (d) => {
						p.setActiveTab(d);
					},
					disabledTabs: h,
				})),
				y.appendChild(l.element);
			let v = u({
				style: { display: 'flex', flexDirection: 'column', gap: '0' },
			});
			y.appendChild(v);
			let E = p.getState(),
				g = () => w.getState();
			switch (E.activeTab) {
				case 'consents':
					no(v, {
						getState: g,
						onConsentChange: (d, C) => {
							let A = w.getStore();
							if (A) {
								let N = String(d);
								A.getState().setSelectedConsent(N, C),
									p.addEvent({
										type: 'info',
										message: `${N} toggled to ${C} (not saved)`,
										data: { name: N, value: C },
									});
							}
						},
						onSave: () => {
							let d = w.getStore();
							d &&
								(d.getState().saveConsents('custom'),
								p.addEvent({
									type: 'consent_save',
									message: 'Saved consent preferences',
								}));
						},
						onAcceptAll: () => {
							let d = w.getStore();
							d &&
								(d.getState().saveConsents('all'),
								p.addEvent({
									type: 'consent_save',
									message: 'Accepted all consents',
								}));
						},
						onRejectAll: () => {
							let d = w.getStore();
							d &&
								(d.getState().saveConsents('necessary'),
								p.addEvent({
									type: 'consent_save',
									message: 'Rejected all optional consents',
								}));
						},
						onReset: async () => {
							let d = w.getStore();
							d && (await ke(d, p));
						},
					});
					break;
				case 'location':
					bo(v, {
						getState: g,
						onApplyOverrides: async (d) => {
							let C = w.getStore();
							C &&
								(await C.getState().setOverrides({
									country: d.country,
									region: d.region,
									language: d.language,
									gpc: d.gpc,
								}),
								Fo({
									country: d.country,
									region: d.region,
									language: d.language,
									gpc: d.gpc,
								}),
								p.addEvent({
									type: 'info',
									message: 'Overrides updated',
									data: {
										country: d.country,
										region: d.region,
										language: d.language,
										gpc: d.gpc,
									},
								}));
						},
						onClearOverrides: async () => {
							let d = w.getStore();
							d &&
								(await d
									.getState()
									.setOverrides({
										country: void 0,
										region: void 0,
										language: void 0,
										gpc: void 0,
									}),
								$o(),
								p.addEvent({ type: 'info', message: 'Overrides cleared' }));
						},
					});
					break;
				case 'scripts':
					Ao(v, { getState: g, getEvents: () => p.getState().eventLog });
					break;
				case 'iab':
					mo(v, {
						getState: g,
						onSetPurposeConsent: (d, C) => {
							let A = w.getStore()?.getState().iab;
							A &&
								(A.setPurposeConsent(d, C),
								p.addEvent({
									type: 'iab',
									message: `IAB purpose ${d} set to ${C}`,
									data: { purposeId: d, value: C },
								}));
						},
						onSetVendorConsent: (d, C) => {
							let A = w.getStore()?.getState().iab;
							A &&
								(A.setVendorConsent(d, C),
								p.addEvent({
									type: 'iab',
									message: `IAB vendor ${d} set to ${C}`,
									data: { vendorId: d, value: C },
								}));
						},
						onSetSpecialFeatureOptIn: (d, C) => {
							let A = w.getStore()?.getState().iab;
							A &&
								(A.setSpecialFeatureOptIn(d, C),
								p.addEvent({
									type: 'iab',
									message: `IAB feature ${d} set to ${C}`,
									data: { featureId: d, value: C },
								}));
						},
						onAcceptAll: () => {
							let d = w.getStore()?.getState().iab;
							d &&
								(d.acceptAll(),
								p.addEvent({
									type: 'iab',
									message: 'IAB accept all selected',
								}));
						},
						onRejectAll: () => {
							let d = w.getStore()?.getState().iab;
							d &&
								(d.rejectAll(),
								p.addEvent({
									type: 'iab',
									message: 'IAB reject all selected',
								}));
						},
						onSave: () => {
							let d = w.getStore()?.getState().iab;
							d &&
								d
									.save()
									.then(() => {
										p.addEvent({
											type: 'iab',
											message: 'IAB preferences saved',
										});
									})
									.catch((C) => {
										p.addEvent({
											type: 'error',
											message: `Failed to save IAB preferences: ${String(C)}`,
										});
									});
						},
						onReset: async () => {
							let d = w.getStore();
							d && (await ke(d, p));
						},
					});
					break;
				case 'events':
					me(v, {
						getEvents: () => p.getState().eventLog,
						onClear: () => {
							p.clearEventLog(),
								p.addEvent({ type: 'info', message: 'Event log cleared' });
						},
					});
					break;
				case 'actions':
					to(v, {
						getState: g,
						onResetConsents: async () => {
							let d = w.getStore();
							d && (await ke(d, p));
						},
						onRefetchBanner: async () => {
							let d = w.getStore();
							d &&
								(await d.getState().initConsentManager(),
								p.addEvent({ type: 'info', message: 'Banner data refetched' }));
						},
						onShowBanner: () => {
							let d = w.getStore();
							d &&
								(d.getState().setActiveUI('banner', { force: !0 }),
								p.addEvent({ type: 'info', message: 'Banner shown' }));
						},
						onOpenPreferences: () => {
							let d = w.getStore();
							d &&
								(d.getState().setActiveUI('dialog'),
								p.addEvent({
									type: 'info',
									message: 'Preference center opened',
								}));
						},
						onCopyState: () => {
							let d = w.getState();
							if (d) {
								let C = {
									consents: d.consents,
									consentInfo: d.consentInfo,
									locationInfo: d.locationInfo,
									model: d.model,
									overrides: d.overrides,
									scripts: d.scripts?.map((A) => ({ id: A.id })),
									loadedScripts: d.loadedScripts,
								};
								navigator.clipboard
									.writeText(JSON.stringify(C, null, 2))
									.then(() => {
										p.addEvent({
											type: 'info',
											message: 'State copied to clipboard',
										});
									})
									.catch(() => {
										p.addEvent({
											type: 'error',
											message: 'Failed to copy state',
										});
									});
							}
						},
					});
					break;
			}
			T && f.animate(T, S);
		}
		c.subscribe(() => {
			b.update();
		});
		let _ = {
			open: () => n.setOpen(!0),
			close: () => n.setOpen(!1),
			toggle: () => n.toggle(),
			getState: () => {
				let y = n.getState();
				return {
					isOpen: y.isOpen,
					activeTab: y.activeTab,
					isConnected: y.isConnected,
				};
			},
			destroy: () => {
				let y = c.getStore();
				if (
					y &&
					(y.getState().setCallback('onBannerFetched', r.onBannerFetched),
					y.getState().setCallback('onConsentSet', r.onConsentSet),
					y.getState().setCallback('onError', r.onError),
					y
						.getState()
						.setCallback(
							'onBeforeConsentRevocationReload',
							r.onBeforeConsentRevocationReload
						),
					i)
				) {
					let p = y.getState().networkBlocker;
					p && y.getState().setNetworkBlocker({ ...p, onRequestBlocked: a });
				}
				f.destroy(),
					l?.destroy(),
					b.destroy(),
					c.destroy(),
					n.destroy(),
					typeof window < 'u' && delete window.__c15tDevTools;
			},
		};
		return typeof window < 'u' && (window.__c15tDevTools = _), _;
	}
	var he = '2.0.0-rc.3';
	var tn = 'c15tStore',
		Be = null;
	function on(e) {
		return (
			e === 'bottom-right' ||
			e === 'bottom-left' ||
			e === 'top-right' ||
			e === 'top-left'
		);
	}
	function nn() {
		if (typeof document > 'u') return null;
		let e = document.currentScript;
		return e instanceof HTMLScriptElement
			? e
			: (document.querySelector('script[src$="/embed-devtools.js"]') ??
					document.querySelector(
						'script[src$="/c15t-embed.devtools.iife.js"]'
					) ??
					null);
	}
	function rn(e) {
		if (!e) return {};
		let t = e.dataset.c15tNamespace?.trim(),
			o = e.dataset.c15tPosition?.trim(),
			s = e.dataset.c15tDefaultOpen?.trim(),
			n = s === 'true' ? !0 : s === 'false' ? !1 : void 0;
		return {
			namespace: t || void 0,
			position: on(o) ? o : void 0,
			defaultOpen: n,
		};
	}
	function an(e = {}) {
		return {
			namespace: e.namespace ?? tn,
			position: e.position,
			defaultOpen: e.defaultOpen,
		};
	}
	function xe() {
		Be?.destroy(), (Be = null);
	}
	function Oe(e = {}) {
		typeof window > 'u' || typeof document > 'u' || (xe(), (Be = nt(an(e))));
	}
	function Ne(e) {
		if (typeof window > 'u' || typeof document > 'u') return null;
		if (window.__c15tEmbedDevToolsInitialized && window.c15tEmbedDevTools)
			return window.c15tEmbedDevTools;
		let t = e ?? rn(nn()),
			o = { version: he, mount: Oe, unmount: xe };
		return (
			(window.c15tEmbedDevTools = o),
			(window.__c15tEmbedDevToolsInitialized = !0),
			o.mount(t),
			o
		);
	}
	Ne();
	return ct(sn);
})();
