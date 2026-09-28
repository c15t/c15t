/**
 * The single error type the plugin raises.
 *
 * Every message here names the prop or file to change, because the alternative
 * is a prebuild that fails inside a plist writer with no idea that c15t asked
 * for it.
 */
export class C15tPluginError extends Error {
	/**
	 * @param message - Actionable detail, without the package prefix.
	 */
	constructor(message: string) {
		super(`@c15t/react-native config plugin: ${message}`);
		this.name = 'C15tPluginError';
	}
}
