
import { Component, type ComponentChildren, type JSX } from 'preact';

interface ErrorBoundaryProps {
	/** Elements to render within the boundary */
	children: ComponentChildren;
	/**
	 * UI to display when an error occurs.
	 * Can be a node or a function receiving the Error.
	 */
	fallback: JSX.Element | ((error: Error) => JSX.Element);
}

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
}

/**
 * Preact error boundary to catch runtime errors in descendants.
 */
export class ErrorBoundary extends Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	// Preact provides only the error, no errorInfo object
	componentDidCatch(error: unknown) {
		this.setState({ error: (error as Error) ?? new Error('Unknown error') });
		// Optionally log to your telemetry here
	}

	render() {
		const { hasError, error } = this.state;
		const { fallback, children } = this.props;

		if (hasError && error) {
			return typeof fallback === 'function' ? fallback(error) : fallback;
		}

		return children as JSX.Element;
	}
}
