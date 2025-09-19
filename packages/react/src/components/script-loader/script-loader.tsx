import type { AllConsentNames, Script as CoreScript, HasCondition } from 'c15t';
import React, { useEffect, useMemo } from 'react';
import { useConsentManager } from '../../hooks/use-consent-manager';

/**
 * Script type for React applications
 *
 * @public
 */
export interface ScriptConfig extends CoreScript {
	/** Discriminator for union type */
	type: 'script';
}

/**
 * React component configuration for consent-based rendering
 *
 * @public
 */
export interface ComponentConfig {
	/** Consent category or condition required for full functionality */
	category: HasCondition<AllConsentNames>;

	/**
	 * Type of component to render
	 * - 'standalone': Component will be rendered separately (like <Foobar />)
	 * - 'provider': Component will be treated as a provider (like <Foobar> {children} </Foobar>)
	 */
	type: 'standalone' | 'provider';

	/**
	 * Function that returns the React component to render
	 * @param hasConsent - Whether consent has been granted for the specified category
	 * @returns React component to render
	 */
	component: (hasConsent: boolean) => React.ReactNode;

	/**
	 * Whether this component should persist after consent is revoked
	 * @default false
	 */
	persistAfterConsentRevoked?: boolean;
}

/**
 * Union type for scripts and provider components with discriminated union
 *
 * @public
 */
export type ReactScript = ScriptConfig | ComponentConfig;

/**
 * Type guard to check if an item is a React component
 *
 * @param item - The item to check
 * @returns True if the item is a React component (standalone or provider)
 *
 * @internal
 */
function isComponent(item: ReactScript): item is ComponentConfig {
	return item.type === 'standalone' || item.type === 'provider';
}

/**
 * Type guard to check if an item is a Script
 *
 * @param item - The item to check
 * @returns True if the item is a Script
 *
 * @internal
 */
function isScript(item: ReactScript): item is ScriptConfig {
	return item.type === 'script';
}

/**
 * Script loader component for React applications
 *
 * Handles both:
 * 1. Loading JavaScript scripts based on consent settings
 * 2. Conditionally rendering components based on consent
 *
 * @param props - Component props
 * @param props.children - Child components to render
 * @param props.scripts - Array of scripts and/or provider components
 *
 * @public
 */
export function ScriptLoader({
	children,
	scripts = [],
}: {
	children: React.ReactNode;
	scripts?: ReactScript[];
}) {
	const { addScripts, updateScripts, has } = useConsentManager();

	// Filter scripts to only include actual Script objects (not React components)
	const standardScripts = useMemo(() => {
		return scripts.filter(isScript);
	}, [scripts]);

	// Process React components and determine consent status for each
	const { wrapperProviders, standaloneComponents } = useMemo(() => {
		const components = scripts.filter(isComponent).map((component) => {
			const hasConsent = has(component.category);

			// Should this component be rendered even without consent?
			const shouldRender =
				hasConsent || component.persistAfterConsentRevoked === true;

			// Return the component with its consent status
			return {
				...component,
				hasConsent,
				shouldRender,
				// Store the component function and hasConsent value for later rendering
				componentFn: component.component,
			};
		});

		return {
			// Components that wrap children (default behavior)
			wrapperProviders: components
				.filter((component) => component.type === 'provider')
				.filter((component) => component.shouldRender),

			// Standalone components that don't wrap children
			standaloneComponents: components
				.filter((component) => component.type === 'standalone')
				.filter((component) => component.shouldRender)
				.map((component) => component.componentFn(component.hasConsent)),
		};
	}, [scripts, has]);

	// Load standard scripts based on consent
	useEffect(() => {
		if (standardScripts.length > 0) {
			// Extract the type property and convert the rest to CoreScript
			const coreScripts = standardScripts.map((script) => {
				const { type: _, ...coreScript } = script;

				return coreScript as CoreScript;
			});

			addScripts(coreScripts);
			updateScripts();
		}
	}, [standardScripts, addScripts, updateScripts]);

	// Create a function to render nested providers
	const renderNestedProviders = useMemo(() => {
		// Start with the children
		let result = <>{children}</>;

		// Wrap the content with each wrapper provider, from innermost to outermost
		// This ensures proper nesting of providers
		for (let i = wrapperProviders.length - 1; i >= 0; i--) {
			const provider = wrapperProviders[i];
			if (provider) {
				// Get the rendered component with the current content as children
				const renderedComponent = provider.componentFn(provider.hasConsent);

				// If it's a valid React element that can have children
				if (React.isValidElement(renderedComponent)) {
					// Clone the element and inject the accumulated content as its children
					result = React.cloneElement(
						renderedComponent,
						{ key: `wrapper-${i}` },
						result
					);
				} else {
					// If it's not a valid element or doesn't support children, just render it
					console.warn(`Component doesn't support children properly`);
					result = (
						<React.Fragment key={`wrapper-${i}`}>
							{renderedComponent}
							{result}
						</React.Fragment>
					);
				}
			}
		}

		return result;
	}, [children, wrapperProviders]);

	return (
		<>
			{/* Standalone components rendered first */}
			{standaloneComponents.map((component, index) => (
				<React.Fragment key={`standalone-${index}`}>{component}</React.Fragment>
			))}

			{/* Wrapper providers with children nested inside */}
			{renderNestedProviders}
		</>
	);
}
