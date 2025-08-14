export function getBranch(env: NodeJS.ProcessEnv): string {
	const refEnv = env.GITHUB_REF || '';
	const headRef = env.GITHUB_HEAD_REF || '';
	if (headRef) {
		return headRef;
	}
	if (refEnv.startsWith('refs/heads/')) {
		return refEnv.replace('refs/heads/', '');
	}
	if (refEnv.startsWith('refs/tags/')) {
		return refEnv.replace('refs/tags/', '');
	}
	return 'unknown';
}
