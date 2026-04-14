import type {
	CheckConsentOutput,
	CheckConsentQuery,
	GetSubjectOutput,
	GetSubjectQuery,
	InitOutput,
	ListSubjectsOutput,
	ListSubjectsQuery,
	PatchSubjectFullInput,
	PatchSubjectOutput,
	PostSubjectInput,
	PostSubjectOutput,
	StatusOutput,
} from '@c15t/schema/types';
import {
	checkConsent,
	createSubject,
	getSubject,
	init,
	listSubjects,
	patchSubject,
	status,
} from './endpoints';
import {
	DEFAULT_RETRY_CONFIG,
	DEFAULT_TIMEOUT_MS,
	type FetcherContext,
	fetcher,
} from './fetcher';
import type {
	C15TClientOptions,
	FetchOptions,
	ResponseContext,
	RetryConfig,
} from './types';

/**
 * C15T Client for interacting with the consent management API
 *
 * @example
 * ```typescript
 * const client = new C15TClient({
 *   baseUrl: 'https://api.example.com',
 *   token: 'your-auth-token',
 * });
 *
 * // Check API status
 * const statusResponse = await client.status();
 *
 * // Initialize consent manager
 * const initResponse = await client.init();
 *
 * // Create a subject with consent
 * const subject = await client.createSubject({
 *   type: 'new',
 *   subjectId: 'sub_123',
 *   consents: { analytics: true },
 * });
 * ```
 */
export class C15TClient {
	/**
	 * Internal fetcher context
	 */
	private context: FetcherContext;

	/**
	 * Creates a new C15T client instance
	 *
	 * @param options - Client configuration options
	 * @throws {TypeError} If baseUrl is invalid or not provided (and no env var)
	 */
	constructor(options: C15TClientOptions = {}) {
		// Resolve baseUrl from options or environment variable
		const baseUrlString =
			options.baseUrl ||
			(typeof process !== 'undefined' ? process.env?.C15T_API_URL : undefined);

		if (!baseUrlString) {
			throw new TypeError(
				'baseUrl is required. Provide it in options or set C15T_API_URL environment variable.'
			);
		}

		// Validate base URL
		const baseUrl = new URL(baseUrlString);

		// Apply prefix if provided
		if (options.prefix) {
			baseUrl.pathname = options.prefix;
		}

		// Resolve token from options or environment variable
		const token =
			options.token ||
			(typeof process !== 'undefined'
				? process.env?.C15T_API_TOKEN
				: undefined);

		// Prepare authorization header if token is provided
		const authHeaders: Record<string, string> = token
			? { Authorization: `Bearer ${token}` }
			: {};

		// Merge retry config with defaults
		const retryConfig: RetryConfig = {
			...DEFAULT_RETRY_CONFIG,
			...options.retryConfig,
		};

		// Resolve debug mode from options or environment variable
		const debug =
			options.debug ??
			(typeof process !== 'undefined'
				? process.env?.C15T_DEBUG === 'true'
				: false);

		// Resolve timeout from options or use default
		const timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;

		this.context = {
			baseUrl: baseUrl.toString(),
			headers: {
				...authHeaders,
				...options.headers,
			},
			retryConfig,
			debug,
			timeout,
		};
	}

	/**
	 * Get API status
	 *
	 * @param options - Optional fetch options
	 * @returns Status response with version and client info
	 */
	async status(
		options?: FetchOptions<StatusOutput>
	): Promise<ResponseContext<StatusOutput>> {
		return status(this.context, options);
	}

	/**
	 * Initialize consent manager
	 *
	 * @param options - Optional fetch options
	 * @returns Init response with jurisdiction, location, translations, branding
	 */
	async init(
		options?: FetchOptions<InitOutput>
	): Promise<ResponseContext<InitOutput>> {
		return init(this.context, options);
	}

	/**
	 * Create a new subject with consent preferences
	 *
	 * @param input - Subject creation input
	 * @param options - Optional fetch options
	 * @returns Created subject response
	 */
	async createSubject(
		input: PostSubjectInput,
		options?: FetchOptions<PostSubjectOutput, PostSubjectInput>
	): Promise<ResponseContext<PostSubjectOutput>> {
		return createSubject(this.context, input, options);
	}

	/**
	 * Get a subject by ID
	 *
	 * @param id - Subject ID
	 * @param query - Optional query parameters
	 * @param options - Optional fetch options
	 * @returns Subject data response
	 */
	async getSubject(
		id: string,
		query?: GetSubjectQuery,
		options?: FetchOptions<GetSubjectOutput, never, GetSubjectQuery>
	): Promise<ResponseContext<GetSubjectOutput>> {
		return getSubject(this.context, id, query, options);
	}

	/**
	 * Update a subject (link external ID or update preferences)
	 *
	 * @param id - Subject ID
	 * @param input - Patch input with externalId or other fields
	 * @param options - Optional fetch options
	 * @returns Updated subject response
	 */
	async patchSubject(
		id: string,
		input: Omit<PatchSubjectFullInput, 'id'>,
		options?: FetchOptions<
			PatchSubjectOutput,
			Omit<PatchSubjectFullInput, 'id'>
		>
	): Promise<ResponseContext<PatchSubjectOutput>> {
		return patchSubject(this.context, id, input, options);
	}

	/**
	 * List subjects with optional filtering
	 *
	 * @param query - Query parameters for filtering
	 * @param options - Optional fetch options
	 * @returns List of subjects
	 */
	async listSubjects(
		query?: ListSubjectsQuery,
		options?: FetchOptions<ListSubjectsOutput, never, ListSubjectsQuery>
	): Promise<ResponseContext<ListSubjectsOutput>> {
		return listSubjects(this.context, query, options);
	}

	/**
	 * Check consent status for an external ID
	 *
	 * @param query - Query parameters (externalId required)
	 * @param options - Optional fetch options
	 * @returns Consent check response
	 */
	async checkConsent(
		query: CheckConsentQuery,
		options?: FetchOptions<CheckConsentOutput, never, CheckConsentQuery>
	): Promise<ResponseContext<CheckConsentOutput>> {
		return checkConsent(this.context, query, options);
	}

	/**
	 * Make a custom API request to any endpoint
	 *
	 * @param path - API endpoint path
	 * @param options - Fetch options
	 * @returns Response context
	 */
	async $fetch<ResponseType, BodyType = unknown, QueryType = unknown>(
		path: string,
		options?: FetchOptions<ResponseType, BodyType, QueryType>
	): Promise<ResponseContext<ResponseType>> {
		return fetcher<ResponseType, BodyType, QueryType>(
			this.context,
			path,
			options
		);
	}

	/**
	 * Namespaced access to consent endpoints
	 */
	consent = {
		/**
		 * Check consent status for an external ID
		 */
		check: (
			query: CheckConsentQuery,
			options?: FetchOptions<CheckConsentOutput, never, CheckConsentQuery>
		) => this.checkConsent(query, options),
	};

	/**
	 * Namespaced access to subject endpoints
	 */
	subjects = {
		/**
		 * Create a new subject
		 */
		create: (
			input: PostSubjectInput,
			options?: FetchOptions<PostSubjectOutput, PostSubjectInput>
		) => this.createSubject(input, options),

		/**
		 * Get a subject by ID
		 */
		get: (
			id: string,
			query?: GetSubjectQuery,
			options?: FetchOptions<GetSubjectOutput, never, GetSubjectQuery>
		) => this.getSubject(id, query, options),

		/**
		 * Update a subject
		 */
		patch: (
			id: string,
			input: Omit<PatchSubjectFullInput, 'id'>,
			options?: FetchOptions<
				PatchSubjectOutput,
				Omit<PatchSubjectFullInput, 'id'>
			>
		) => this.patchSubject(id, input, options),

		/**
		 * List subjects
		 */
		list: (
			query?: ListSubjectsQuery,
			options?: FetchOptions<ListSubjectsOutput, never, ListSubjectsQuery>
		) => this.listSubjects(query, options),
	};

	/**
	 * Namespaced access to meta endpoints
	 */
	meta = {
		/**
		 * Get API status
		 */
		status: (options?: FetchOptions<StatusOutput>) => this.status(options),

		/**
		 * Initialize consent manager
		 */
		init: (options?: FetchOptions<InitOutput>) => this.init(options),
	};
}
