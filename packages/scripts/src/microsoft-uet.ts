import type { Script } from 'c15t';

// Extended Window interface to include microsoft uet specific properties
declare global {
	interface Window {
		uetq: unknown[] | undefined;
	}
}

export interface MicrosoftUetOptions {
	/**
	 * Your Microsoft UET ID
	 * @example `123456789012345`
	 */
	id: string;

	/**
	 * Override or extend the default script values.
	 *
	 * Default values:
	 * - `id`: 'microsoft-uet'
	 * - `src`: `//bat.bing.com/bat.js`
	 * - `category`: 'marketing'
	 */
	script?: Partial<Script>;
}

/**
 * Microsoft UET Script
 * This script is persistent after consent is revoked because it has built-in functionality to opt into and out of tracking based on consent, which allows us to not need to load the script again when consent is revoked.
 *
 * @param options - The options for the Microsoft UET script
 * @returns The Microsoft UET script configuration
 *
 * @example
 * ```ts
 * const microsoftUetScript = microsoftUet({
 *   id: '123456789012345',
 * });
 * ```
 *
 * @see https://learn.microsoft.com/en-us/advertising/guides/universal-event-tracking?view=bingads-13
 */
export function microsoftUet({ id, script }: MicrosoftUetOptions): Script {
	const category = script?.category ?? 'marketing';

	return {
		id: script?.id ?? 'microsoft-uet',
		category,
		textContent: `
    (function(w,d,t,r,u)
    {
        var f,n,i;
        w[u]=w[u]||[],f=function()
        {
            var o={ti:"${id}", enableAutoSpaTracking: true};
            o.q=w[u],w[u]=new UET(o),w[u].push("pageLoad")
        },
        n=d.createElement(t),n.src=r,n.async=1,n.onload=n.onreadystatechange=function()
        {
            var s=this.readyState;
            s&&s!=="loaded"&&s!=="complete"||(f(),n.onload=n.onreadystatechange=null)
        },
        i=d.getElementsByTagName(t)[0],i.parentNode.insertBefore(n,i)
    })
    (window,document,"script","${script?.src ?? '//bat.bing.com/bat.js'}","uetq");
		`.trim(),
		onLoad: (rest) => {
			if (!document.head) {
				throw new Error('Document head is not available for script injection');
			}

			const existingElement = document.getElementById(
				`${rest.elementId}-default`
			);

			if (existingElement) {
				// Element already exists, just update consent
				window.uetq = window.uetq || [];
				window.uetq.push('consent', 'update', {
					ad_storage: 'granted',
				});
			} else {
				// Create and append the consent script
				const defaultConsentScript = document.createElement('script');
				defaultConsentScript.id = `${rest.elementId}-default`;
				defaultConsentScript.textContent = `
					window.uetq = window.uetq || [];
					window.uetq.push('consent', 'default', {
						ad_storage: 'granted',
					});
				`;
				document.head.appendChild(defaultConsentScript);
			}

			if (script?.onLoad) {
				script.onLoad(rest);
			}
		},
		onDelete({ elementId, ...rest }) {
			window.uetq?.push('consent', 'update', {
				ad_storage: 'denied',
			});

			if (script?.onDelete) {
				script.onDelete({ elementId, ...rest });
			}
		},
	};
}
