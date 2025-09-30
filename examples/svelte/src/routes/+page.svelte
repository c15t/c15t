<script>
import { onMount } from 'svelte';
import { consentManager } from '$lib/c15t.client';

const showCookieBanner = true;

let debugConsole = '';
let c15tConsent = '';

function updateDebugInfo(msg) {
	debugConsole = typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2);
	if (typeof window !== 'undefined') {
		c15tConsent = localStorage.getItem('c15t-consent') || '';
	} else {
		c15tConsent = '';
	}
}

onMount(() => {
	if (typeof window !== 'undefined') {
		updateDebugInfo('Waiting for consent...');
	}
});

function acceptCookies() {
	consentManager.setConsent({
		body: {
			type: 'cookie_banner',
			domain: 'localhost',
			preferences: {
				necessary: true,
				marketing: true,
			},
		},
	});
	updateDebugInfo('Accepted cookies');
}

function rejectCookies() {
	consentManager.setConsent({
		body: {
			type: 'cookie_banner',
			domain: 'localhost',
			preferences: {
				necessary: true,
				marketing: false,
			},
		},
	});
	updateDebugInfo('Rejected cookies');
}
</script>

<div class="fixed top-0 left-0 w-full bg-black bg-opacity-80 text-xs text-white p-4 z-[100]">
  <div class="mb-2 font-bold">Debug Info</div>
  <div><span class="font-semibold">Console Output:</span> <pre class="inline whitespace-pre-wrap">{debugConsole}</pre></div>
  <div><span class="font-semibold">localStorage['c15t-consent']:</span> <pre class="inline whitespace-pre-wrap">{c15tConsent}</pre></div>
</div>


<div class="flex flex-col items-center justify-center min-h-screen">
  <h1 class="text-4xl font-bold mb-4">Svelte + c15t</h1>
  <p class="text-lg">Visit <a href="https://c15t.com/doc/javascript/quickstart" class="text-blue-500 hover:text-blue-700">c15t.com/docs/javascript/quickstart</a> to read the documentation</p>
</div>


{#if showCookieBanner}
  <div class="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-md bg-zinc-900 text-zinc-100 rounded-2xl shadow-2xl p-6 z-50 border border-zinc-700">
    <div class="mb-4">
      <div class="font-semibold text-lg mb-1"><!-- c15t:cookie-title -->We value your privacy<!-- /c15t:cookie-title --></div>
      <div class="text-zinc-400 text-base"><!-- c15t:cookie-message -->This site uses cookies to improve your browsing experience, analyze site traffic, and show personalized content.<!-- /c15t:cookie-message --></div>
    </div>
    <div class="flex justify-end gap-3 mt-4">
      <button class="px-5 py-2 rounded-lg border border-zinc-600 text-zinc-200 hover:bg-zinc-800 transition" on:click={rejectCookies}>
        <!-- c15t:reject-button -->Reject All<!-- /c15t:reject-button -->
      </button>
      <button class="px-5 py-2 rounded-lg border border-blue-600 text-blue-500 hover:bg-blue-950 hover:text-blue-200 transition focus:outline-none focus:ring-2 focus:ring-blue-600" on:click={acceptCookies}>
        <!-- c15t:accept-button -->Accept All<!-- /c15t:accept-button -->
      </button>
    </div>
  </div>
{/if}

