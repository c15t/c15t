/**
 * The inline script a server-rendered banner runs before hydration, and
 * the names it shares with the runtime. Apart from the replay, so the
 * banner's bundle carries the script text and the runtime's does not.
 */

/** One recorded tap. @internal */
export interface EarlyConsentTap {
	action: 'accept' | 'reject' | 'dismiss' | 'customize';
	/** Epoch milliseconds of the click. */
	at: number;
	/** The banner root's `data-model` when it was tapped. */
	model: string | null;
	/** The banner root's `data-prompt` when it was tapped. */
	prompt: string | null;
}

/** What the inline script leaves on `window`. @internal */
export interface EarlyConsentTapQueue {
	taps?: EarlyConsentTap[];
	stop?: () => void;
}

/** Window property the inline script and the runtime share. @internal */
export const EARLY_TAPS_WINDOW_KEY = '__c15tEarlyTaps';

/** Id of the `<style>` that hides the banner after a tap. @internal */
export const EARLY_TAP_STYLE_ID = 'c15t-early-tap';

/** The stock banner's root. @internal */
export const EARLY_TAP_ROOT = '[data-testid="consent-banner-root"]';

/**
 * Attribute on a banner button whose click the stock action does not
 * decide, such as one with its own `onClick`. Set to `off`, the script
 * leaves that button's taps alone instead of replaying a choice its
 * handler might refuse. @internal
 */
export const EARLY_TAP_OPT_OUT = 'data-early-tap';

/**
 * Source of the inline script a server-rendered banner puts before its
 * markup. Render it in a `<script>` element (with the page's CSP nonce, if
 * any) only in server HTML: a script inserted by client code never runs.
 *
 * Plain ES5 with no dependencies, because it runs before any bundle. It
 * captures clicks on `[data-action]` inside the stock banner root, skips
 * buttons marked with {@link EARLY_TAP_OPT_OUT} and the IAB banner (its choice needs the CMP's TC string), and copies its own
 * nonce to the hiding `<style>` so a nonce-based style policy allows it.
 * With more than one banner on the page it holds nothing: the queue is
 * shared, so the first banner to hydrate would claim a tap on another.
 *
 * @internal
 */
export const EARLY_CONSENT_TAP_SCRIPT = `(function(w,d,k){if(w[k])return;var q=[],s,c=d.currentScript,n=c&&c.nonce,R='${EARLY_TAP_ROOT}';function h(e){var t=e.target,b=t&&t.closest&&t.closest(R+' [data-action]'),a=b&&b.getAttribute('data-action'),r;if(!/^(accept|reject|dismiss|customize)$/.test(a)||b.getAttribute('${EARLY_TAP_OPT_OUT}')==='off')return;r=b.closest(R);if(r.getAttribute('data-model')==='iab'||d.querySelectorAll(R).length>1)return;e.stopImmediatePropagation();q.push({action:a,at:Date.now(),model:r.getAttribute('data-model'),prompt:r.getAttribute('data-prompt')});if(a!=='customize'&&!s){s=d.createElement('style');s.id='${EARLY_TAP_STYLE_ID}';if(n)s.nonce=n;s.textContent=R+',[data-testid="consent-banner-overlay"]{display:none!important}';(d.head||d.documentElement).appendChild(s)}}d.addEventListener('click',h,true);w[k]={taps:q,stop:function(){d.removeEventListener('click',h,true)}}})(window,document,'${EARLY_TAPS_WINDOW_KEY}')`;
