declare module '#app' {
	interface PageMeta {
		/** Render the page with the Vapor ConsentPrompt instead of ConsentRoot. */
		headlessConsent?: boolean;
	}
}

export {};
