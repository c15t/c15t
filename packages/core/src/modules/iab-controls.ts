import type { ConsentKernel } from '../types';

/** Operations supplied by the provider's existing IAB module. */
export interface KernelIABControls {
	setVendorConsent: (id: string | number, value: boolean) => void;
	setVendorLegitimateInterest: (id: string | number, value: boolean) => void;
	setPurposeConsent: (id: number, value: boolean) => void;
	setPurposeLegitimateInterest: (id: number, value: boolean) => void;
	setSpecialFeatureOptIn: (id: number, value: boolean) => void;
	acceptAll: () => void;
	rejectAll: () => void;
	save: () => Promise<void>;
}

interface Registration {
	controls?: KernelIABControls;
	listeners: Set<() => void>;
}

const registrations = new WeakMap<ConsentKernel, Registration>();

const registrationFor = (kernel: ConsentKernel): Registration => {
	let registration = registrations.get(kernel);
	if (!registration) {
		registration = { listeners: new Set() };
		registrations.set(kernel, registration);
	}
	return registration;
};

const notify = (registration: Registration): void => {
	for (const listener of registration.listeners) {
		try {
			listener();
		} catch {
			// Inspection must not interrupt the provider's lifecycle.
		}
	}
};

/**
 * Connects an IAB module to inspection tools without a second CMP instance.
 * @param kernel - The module's consent kernel.
 * @param controls - Operations owned by the module.
 * @returns Cleanup that removes only this registration.
 * @internal
 */
export const registerIABControls = (
	kernel: ConsentKernel,
	controls: KernelIABControls
): (() => void) => {
	const registration = registrationFor(kernel);
	registration.controls = controls;
	notify(registration);
	return () => {
		if (registration.controls === controls) {
			registration.controls = undefined;
			notify(registration);
		}
	};
};

/**
 * Reads the IAB operations already attached to a kernel.
 * @param kernel - The provider's kernel.
 * @returns Its controls, or undefined before initialization/after disposal.
 */
export const getIABControls = (
	kernel: ConsentKernel
): KernelIABControls | undefined => registrations.get(kernel)?.controls;

/**
 * Observes IAB module registration and disposal, including lazy initialization.
 * @param kernel - The provider's kernel.
 * @param listener - Called when the available controls change.
 * @returns Subscription cleanup.
 */
export const subscribeIABControls = (
	kernel: ConsentKernel,
	listener: () => void
): (() => void) => {
	const registration = registrationFor(kernel);
	registration.listeners.add(listener);
	return () => registration.listeners.delete(listener);
};
