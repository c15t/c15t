/**
 * @module
 * User Type
 *
 * @remarks
 * This type is used to identify a user in the consent manager.
 * It is used to set the user's ID and identity provider.
 *
 * @example
 * ```tsx
 * const user: User = {
 * The external ID of the user.
 * Usually your own internal ID for the user from your auth provider
 *
 * @remarks
 * This can be set later using the {@link identifyUser} method.
 * @default undefined
 */
export interface User {
	/**
	 * Usually your own internal ID for the user from your auth provider
	 */
	id: string;

	/**
	 * The identity provider of the user.
	 * Usually the name of the identity provider e.g. 'clerk', 'auth0', 'custom', etc.
	 *
	 * @example 'better-auth'
	 *
	 * @defaultValue 'external'
	 */
	identityProvider?: string;
}
