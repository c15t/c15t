'use client';

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

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
	private errorInfo: ErrorInfo | null = null;

	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { error: null, errorInfo: null, hasError: false };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { error, errorInfo: null, hasError: true };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		this.errorInfo = errorInfo;
		this.forceUpdate();
		// console.error('Uncaught error:', error, errorInfo);
		// Optionally log error to an external service
		// logErrorToService(error, errorInfo)
	}

	render() {
		if (this.state.hasError) {
			if (typeof this.props.fallback === 'function') {
				// oxlint-disable-next-line typescript/no-non-null-assertion -- it's fine
				return this.props.fallback(this.state.error!, this.errorInfo!);
			}
			return this.props.fallback;
		}

		return this.props.children;
	}
}
