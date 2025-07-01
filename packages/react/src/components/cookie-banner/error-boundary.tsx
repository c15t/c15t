'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Props for the ErrorBoundary component.
 *
 * @public
 */
interface ErrorBoundaryProps {
	/** @remarks React elements to be rendered within the boundary */
	children: ReactNode;

	/**
	 * UI to display when an error occurs.
	 *
	 * @remarks
	 * Can be either a React node or a function that receives error details and returns a React node.
	 * When provided as a function, it receives the error object and error info as arguments.
	 */
	fallback: ReactNode | ((error: Error, errorInfo: ErrorInfo) => ReactNode);
}

/**
 * Internal state for the ErrorBoundary component.
 *
 * @internal
 */
interface ErrorBoundaryState {
	/** @remarks Flag indicating if an error has been caught */
	hasError: boolean;
	/** @remarks The caught error object, if any */
	error: Error | null;
	/** @remarks Additional details about the error context */
	errorInfo: ErrorInfo | null;
}

/**
 * A React component that catches JavaScript errors in its child component tree.
 *
 * @remarks
 * This boundary component provides error isolation and fallback UI rendering
 * when errors occur in its child components. It prevents the entire app from
 * crashing and allows graceful error handling.
 *
 * @example
 * ```tsx
 * <ErrorBoundary fallback={<ErrorMessageType />}>
 *   <ComponentThatMayError />
 * </ErrorBoundary>
 * ```
 *
 * @public
 */
export class ErrorBoundary extends Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null, errorInfo: null };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error, errorInfo: null };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		this.setState({ error, errorInfo });
		// console.error('Uncaught error:', error, errorInfo);
		// Optionally log error to an external service
		// logErrorToService(error, errorInfo)
	}

	render() {
		if (this.state.hasError) {
			if (typeof this.props.fallback === 'function') {
				// biome-ignore lint/style/noNonNullAssertion: this is okay as we are in error boundary
				return this.props.fallback(this.state.error!, this.state.errorInfo!);
			}
			return this.props.fallback;
		}

		return this.props.children;
	}
}
