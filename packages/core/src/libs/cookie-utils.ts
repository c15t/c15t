/**
 * Utility functions for managing cookies
 */

/**
 * Sets a cookie with the specified name, value and options
 *
 * @param name - The name of the cookie
 * @param value - The value to store in the cookie
 * @param options - Cookie options including expiry, path, etc.
 */
export const setCookie = (
	name: string,
	value: string,
	options: {
		days?: number;
		path?: string;
		domain?: string;
		secure?: boolean;
		sameSite?: 'Strict' | 'Lax' | 'None';
	} = {}
) => {
	const {
		days = 365, // Default to 1 year
		path = '/',
		domain,
		secure = true,
		sameSite = 'Lax',
	} = options;

	const expires = new Date(Date.now() + days * 864e5).toUTCString();

	document.cookie = [
		`${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
		`expires=${expires}`,
		`path=${path}`,
		domain && `domain=${domain}`,
		secure && 'secure',
		`SameSite=${sameSite}`,
	]
		.filter(Boolean)
		.join('; ');
};

/**
 * Gets a cookie value by name
 *
 * @param name - The name of the cookie to retrieve
 * @returns The cookie value or null if not found
 */
export const getCookie = (name: string): string | null => {
	const value = `; ${document.cookie}`;
	const parts = value.split(`; ${name}=`);

	if (parts.length === 2) {
		const cookieValue = parts.pop()?.split(';').shift();
		return cookieValue ? decodeURIComponent(cookieValue) : null;
	}

	return null;
};

/**
 * Removes a cookie by name
 *
 * @param name - The name of the cookie to remove
 * @param options - Cookie options for path and domain
 */
export const removeCookie = (
	name: string,
	options: { path?: string; domain?: string } = {}
) => {
	setCookie(name, '', {
		...options,
		days: -1, // Set expiry to past date to remove cookie
	});
};
