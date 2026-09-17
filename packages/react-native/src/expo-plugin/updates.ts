import type { ExportedConfig } from '@expo/config-plugins';

import {
	isProtocolVersionSupported,
	MAX_SUPPORTED_PROTOCOL_VERSION,
	MIN_SUPPORTED_PROTOCOL_VERSION,
	PROTOCOL_VERSION,
} from '../protocol/version';
import { C15tPluginError } from './errors';

/** The protocol range this JavaScript package speaks, as embeddable data. */
export interface C15tProtocolInfo {
	/** Protocol this package speaks. */
	protocolVersion: number;
	/** Oldest native build this package can talk to. */
	minSupportedProtocolVersion: number;
	/** Newest native build this package can talk to. */
	maxSupportedProtocolVersion: number;
}

/**
 * Read the range out of the installed package.
 *
 * The point of putting it in `extra` is that it travels with the JavaScript
 * bundle, while the binary reports the range it was compiled against. The
 * provider compares the two at mount, which is the only check that can see an
 * over-the-air update at all.
 */
export const buildProtocolInfo =
	function buildProtocolInfo(): C15tProtocolInfo {
		return {
			maxSupportedProtocolVersion: MAX_SUPPORTED_PROTOCOL_VERSION,
			minSupportedProtocolVersion: MIN_SUPPORTED_PROTOCOL_VERSION,
			protocolVersion: PROTOCOL_VERSION,
		};
	};

const isUpdatesEnabled = function isUpdatesEnabled(
	config: ExportedConfig
): boolean {
	return config.updates?.enabled !== false && config.updates?.url !== undefined;
};

/**
 * Refuse an over-the-air configuration that can ship a bundle ahead of its binary.
 *
 * A JavaScript-only update replaces the bundle and leaves the consent core in the
 * binary alone. Without a `runtimeVersion` the update group spans every binary
 * the channel has ever served, so a bundle that speaks a newer protocol reaches a
 * build that does not, and the provider's handshake is the only thing standing
 * between that and a silently deny-all app. Pinning the runtime version is what
 * makes the update server refuse the pairing instead.
 *
 * @param config - The Expo config as it stands.
 * @throws {C15tPluginError} When updates are enabled with nothing to match on.
 */
export const assertUpdatesCannotOutrunTheBinary =
	function assertUpdatesCannotOutrunTheBinary(config: ExportedConfig): void {
		if (!isProtocolVersionSupported(PROTOCOL_VERSION)) {
			throw new C15tPluginError(
				`the installed package speaks consent protocol ` +
					`${String(PROTOCOL_VERSION)} and supports ` +
					`${String(MIN_SUPPORTED_PROTOCOL_VERSION)} to ` +
					`${String(MAX_SUPPORTED_PROTOCOL_VERSION)}, which contradicts ` +
					`itself. This is a broken @c15t/react-native install, not an app ` +
					`misconfiguration: reinstall it.`
			);
		}

		if (!isUpdatesEnabled(config) || config.runtimeVersion !== undefined) {
			return;
		}

		throw new C15tPluginError(
			'updates.url is set but runtimeVersion is not. An over-the-air ' +
				'update swaps the JavaScript bundle and leaves the embedded consent ' +
				'core behind, so without a runtime version one channel can serve a ' +
				'bundle that speaks a newer protocol than the binary it lands on. ' +
				'Set "runtimeVersion" to a value you bump with each native build ' +
				'(the "fingerprint" policy does it automatically), or set ' +
				'"updates.enabled": false.'
		);
	};
