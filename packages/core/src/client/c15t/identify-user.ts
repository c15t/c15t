import type { StorageConfig } from '../../libs/cookie';
import { getConsentFromStorage, saveConsentToStorage } from '../../libs/cookie';
import type { ConsentState } from '../../types/compliance';
import type { ConsentInfo } from '../../types/gdpr';
import type {
	IdentifyUserRequestBody,
	IdentifyUserResponse,
} from '../client-interface';
import type { FetchOptions, ResponseContext } from '../types';
import { API_ENDPOINTS } from '../types';
import type { FetcherContext } from './fetcher';
import { createResponseContext } from './fetcher';
import { withFallback } from './with-fallback';

/**
 * Provides offline mode fallback for identifyUser API.
 * Queues the identify request for retry on next page load.
 * @internal
 */
export async function offlineFallbackForIdentifyUser(
	options?: FetchOptions<IdentifyUserResponse, IdentifyUserRequestBody>
): Promise<ResponseContext<IdentifyUserResponse>> {
	const pendingSubmissionsKey = 'c15t-pending-identify-submissions';

	try {
		if (typeof window !== 'undefined' && options?.body && window.localStorage) {
			let pendingSubmissions: IdentifyUserRequestBody[] = [];

			try {
				const storedSubmissions = window.localStorage.getItem(
					pendingSubmissionsKey
				);
				if (storedSubmissions) {
					pendingSubmissions = JSON.parse(storedSubmissions);
				}
			} catch (e) {
				// If there's an error parsing existing submissions, start fresh
				console.warn('Error parsing pending identify submissions:', e);
				pendingSubmissions = [];
			}

			// Add this submission to the queue if not already present
			const newSubmission = options.body;
			const isDuplicate = pendingSubmissions.some(
				(submission) =>
					submission.id === newSubmission.id &&
					submission.externalId === newSubmission.externalId
			);

			if (!isDuplicate) {
				pendingSubmissions.push(newSubmission);
				window.localStorage.setItem(
					pendingSubmissionsKey,
					JSON.stringify(pendingSubmissions)
				);

				console.log(
					'Queued identify user submission for retry on next page load'
				);
			}
		}
	} catch (error) {
		// Ignore localStorage errors but log them
		console.warn(
			'Failed to write to localStorage in identify offline fallback:',
			error
		);
	}

	// Create a success response even if we couldn't save to localStorage
	// This prevents UI errors and allows the flow to continue
	const response = createResponseContext<IdentifyUserResponse>(
		true,
		null,
		null,
		null
	);

	// Call success callback if provided
	if (options?.onSuccess) {
		await options.onSuccess(response);
	}

	return response;
}

/**
 * Links an external user ID to a subject via PATCH /subject/:id.
 * Saves to storage first (optimistic), then makes API call with fallback.
 *
 * @param context - Fetcher context for API requests
 * @param storageConfig - Storage configuration for cookie/localStorage
 * @param options - Request options containing subjectId, externalId, and identityProvider
 * @returns Response context with the updated subject
 */
export async function identifyUser(
	context: FetcherContext,
	storageConfig: StorageConfig | undefined,
	options: FetchOptions<IdentifyUserResponse, IdentifyUserRequestBody>
): Promise<ResponseContext<IdentifyUserResponse>> {
	const { body, ...restOptions } = options;

	if (!body?.id) {
		return {
			ok: false,
			data: null,
			response: null,
			error: {
				message: 'Subject ID is required to identify user',
				status: 400,
				code: 'MISSING_SUBJECT_ID',
			},
		};
	}

	// 1. Save externalId to storage FIRST (optimistic update)
	// This ensures the externalId is persisted even if the API call fails
	// Read existing data to preserve consents
	const existingData = getConsentFromStorage<{
		consents?: Partial<ConsentState>;
		consentInfo?: ConsentInfo;
	}>(storageConfig);

	saveConsentToStorage(
		{
			consents: existingData?.consents || {},
			consentInfo: {
				...existingData?.consentInfo,
				time: existingData?.consentInfo?.time || Date.now(),
				subjectId: body.id,
				externalId: body.externalId,
				identityProvider: body.identityProvider,
			},
		},
		undefined,
		storageConfig
	);

	// 2. Build the path with the subject ID
	const path = `${API_ENDPOINTS.PATCH_SUBJECT}/${body.id}`;

	// Extract the body fields (excluding id which goes in the path)
	const { id: _subjectId, ...patchBody } = body;

	// 3. Make API call with fallback
	return withFallback<IdentifyUserResponse, typeof patchBody>(
		context,
		path,
		'PATCH',
		{
			...restOptions,
			body: patchBody,
		},
		async (fallbackOptions) => {
			// Re-add the id for the fallback queue
			const fullBody = { id: body.id, ...fallbackOptions?.body };
			return offlineFallbackForIdentifyUser({
				...fallbackOptions,
				body: fullBody as IdentifyUserRequestBody,
			});
		}
	);
}
