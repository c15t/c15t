import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { showConsentBanner } from '../../shared/show-consent-banner';

/**
 * Middleware for Next.js to handle consent banner functionality
 *
 * @param request - The NextRequest object
 */
export default async function c15tMiddleware(request: NextRequest) {
	const cookieStore = await cookies();

	// Check if the user has consented
	const consent = cookieStore.get('c15t-consent');

	// If the user has not consented, show the consent banner
	if (!consent) {
		const showBanner = showConsentBanner(request.headers);

		// Set a cookie of the location and jurisdiction
		cookieStore.set(
			'show-consent-banner',
			JSON.stringify({
				showConsentBanner: showBanner.showConsentBanner,
				location: showBanner.location,
				jurisdiction: showBanner.jurisdiction,
			})
		);
	}
}
