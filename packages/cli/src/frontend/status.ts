/** Credential-free authentication state supplied by the host. */
export interface AuthenticationSnapshot {
	isLoggedIn: boolean;
	isExpired: boolean;
	expiresAt?: number;
	origin?: string;
	selectedProject?: string;
}

/** Account status, safe to serialize without access or refresh tokens. */
export interface AuthenticationStatus {
	authenticated: boolean;
	expiresAt?: number;
	origin?: string;
	selectedProject?: string;
	status: 'logged-out' | 'expired' | 'logged-in';
}

/**
 * Describe authentication using the host's already-resolved session state.
 * @param snapshot Host session state without credentials.
 * @returns Serializable account status without refreshing or reading credentials.
 */
export const getAuthenticationStatus = (
	snapshot: AuthenticationSnapshot
): AuthenticationStatus => {
	let status: AuthenticationStatus['status'] = 'logged-out';
	if (snapshot.isLoggedIn) {
		status = snapshot.isExpired ? 'expired' : 'logged-in';
	}
	return {
		authenticated: snapshot.isLoggedIn && !snapshot.isExpired,
		expiresAt: snapshot.expiresAt,
		origin: snapshot.origin,
		selectedProject: snapshot.selectedProject,
		status,
	};
};
