import { afterEach, beforeEach, vi } from 'vitest';

/** Give each test its own page, including the retained HubSpot installation. */
export const isolateHubSpotPage = () => {
	let frame: HTMLIFrameElement;
	beforeEach(() => {
		frame = document.createElement('iframe');
		document.body.appendChild(frame);
		const page = frame.contentWindow;
		const pageDocument = frame.contentDocument;
		if (!page || !pageDocument) {
			throw new Error('HubSpot tests require an independent browser window');
		}
		vi.stubGlobal('window', page);
		vi.stubGlobal('document', pageDocument);
		vi.stubGlobal(
			'HTMLScriptElement',
			pageDocument.createElement('script').constructor
		);
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		frame.remove();
	});
};
