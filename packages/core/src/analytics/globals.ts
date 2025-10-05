/**
 * @packageDocumentation
 * SSR-safe global utilities for analytics.
 * Provides safe access to browser globals across different environments.
 */

/**
 * SSR-safe window object access.
 * Returns undefined in non-browser environments.
 */
export const getWindow = (): Window | undefined => {
	if (typeof window !== 'undefined') {
		return window;
	}
	return undefined;
};

/**
 * SSR-safe document object access.
 * Returns undefined in non-browser environments.
 */
export const getDocument = (): Document | undefined => {
	if (typeof document !== 'undefined') {
		return document;
	}
	return undefined;
};

/**
 * SSR-safe navigator object access.
 * Returns undefined in non-browser environments.
 */
export const getNavigator = (): Navigator | undefined => {
	if (typeof navigator !== 'undefined') {
		return navigator;
	}
	return undefined;
};

/**
 * SSR-safe location object access.
 * Returns undefined in non-browser environments.
 */
export const getLocation = (): Location | undefined => {
	if (typeof location !== 'undefined') {
		return location;
	}
	return undefined;
};

/**
 * Get user agent string safely.
 * Returns undefined if navigator is not available.
 */
export const getUserAgent = (): string | undefined => {
	const navigator = getNavigator();
	return navigator?.userAgent;
};

/**
 * Get current URL safely.
 * Returns undefined if location is not available.
 */
export const getCurrentUrl = (): string | undefined => {
	const location = getLocation();
	return location?.href;
};

/**
 * Get current pathname safely.
 * Returns undefined if location is not available.
 */
export const getCurrentPath = (): string | undefined => {
	const location = getLocation();
	return location?.pathname;
};

/**
 * Get current search params safely.
 * Returns undefined if location is not available.
 */
export const getCurrentSearch = (): string | undefined => {
	const location = getLocation();
	return location?.search;
};

/**
 * Get page title safely.
 * Returns undefined if document is not available.
 */
export const getPageTitle = (): string | undefined => {
	const document = getDocument();
	return document?.title;
};

/**
 * Get document referrer safely.
 * Returns undefined if document is not available.
 */
export const getDocumentReferrer = (): string | undefined => {
	const document = getDocument();
	return document?.referrer || undefined;
};

/**
 * Get browser language safely.
 * Returns undefined if navigator is not available.
 */
export const getBrowserLanguage = (): string | undefined => {
	const navigator = getNavigator();
	return navigator?.language;
};

/**
 * Get screen dimensions safely.
 * Returns undefined if screen is not available.
 */
export const getScreenDimensions = ():
	| { width: number; height: number }
	| undefined => {
	const window = getWindow();
	if (!window?.screen) {
		return undefined;
	}

	return {
		width: window.screen.width,
		height: window.screen.height,
	};
};

/**
 * Get viewport dimensions safely.
 * Returns undefined if window is not available.
 */
export const getViewportDimensions = ():
	| { width: number; height: number }
	| undefined => {
	const window = getWindow();
	if (!window) {
		return undefined;
	}

	return {
		width: window.innerWidth,
		height: window.innerHeight,
	};
};

/**
 * Get device pixel ratio safely.
 * Returns 1 if window is not available.
 */
export const getDevicePixelRatio = (): number => {
	const window = getWindow();
	return window?.devicePixelRatio ?? 1;
};

/**
 * Check if we're in a browser environment.
 */
export const isBrowser = (): boolean => {
	return typeof window !== 'undefined';
};

/**
 * Check if we're in a server environment.
 */
export const isServer = (): boolean => {
	return typeof window === 'undefined';
};
