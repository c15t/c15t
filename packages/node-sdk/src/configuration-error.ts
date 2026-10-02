/** One rejected client option. */
export interface C15tConfigurationIssue {
	/** Option path, such as `baseUrl` or `retry.maxRetries`. */
	readonly option: string;
	readonly message: string;
}

/**
 * Thrown by `createC15tClient` when its options are invalid.
 *
 * Every problem is collected first, so one throw reports all of them. This is
 * the only error the client throws; calls return failures as results.
 */
export class C15tConfigurationError extends Error {
	override readonly name = 'C15tConfigurationError';

	readonly issues: readonly C15tConfigurationIssue[];

	constructor(issues: readonly C15tConfigurationIssue[]) {
		const count = issues.length;
		super(
			[
				`Invalid c15t client options: ${count} ${count === 1 ? 'problem' : 'problems'}.`,
				...issues.map((issue) => `- ${issue.option}: ${issue.message}`),
			].join('\n')
		);
		this.issues = issues;
	}
}
