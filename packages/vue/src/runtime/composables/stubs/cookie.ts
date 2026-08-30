import { customRef } from 'vue';
import type { Ref } from 'vue';

export interface UseCookieOptions<T> {
	default?: () => T;
}

export function useCookie<T extends Object | string | null>(
	name: string,
	options: UseCookieOptions<T> = {}
): Ref<T> {
	const defaultValue = options.default?.() ?? (null as T);
	return customRef((track, trigger) => {
		return {
			get() {
				track();

				if (typeof document === 'undefined') {
					console.warn([
						'[c15t] For SSR support, please use Nuxt or make an issue',
					]);
					return defaultValue;
				}

				// Parse the cookie value
				const match = document.cookie.match(
					new RegExp(`(?:^|; )${name}=([^;]*)`)
				);
				return match ? decode(decodeURIComponent(match[1]!)) : defaultValue;
			},
			set(newValue) {
				if (typeof document !== 'undefined') {
					if (!newValue) {
						// Delete the cookie if the ref is set to null or empty string
						document.cookie = `${name}=; max-age=0; path=/`;
					} else {
						// Set the cookie (defaults to 1 year expiration and root path)
						const maxAge = 60 * 60 * 24 * 365;
						document.cookie = `${name}=${encodeURIComponent(encode(newValue))}; path=/; max-age=${maxAge}`;
					}
				}

				// Tells Vue the value changed so it can trigger DOM updates
				trigger();
			},
		};
	});
}

// JSON.parse and JSON.stringify with silent errors that return the original value
function decode<T>(value: string): T {
	try {
		return JSON.parse(value) as T;
	} catch {
		return value as T;
	}
}

function encode<T>(value: T): string {
	try {
		return JSON.stringify(value);
	} catch {
		return value as string;
	}
}
