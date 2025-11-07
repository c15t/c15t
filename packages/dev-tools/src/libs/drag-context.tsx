import {
	createContext,
	type Ref,
	type RefObject,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
} from 'react';

interface DragContextValue {
	disabled: boolean;
	handles: Set<HTMLElement>;
	register: (el: HTMLElement) => void;
	unregister: (el: HTMLElement) => void;
}

const DragContext = createContext<DragContextValue | null>(null);

/**
 * DragProvider component that manages drag handle registration
 *
 * @param children - The child components to render
 * @param disabled - Whether dragging is disabled
 */
export function DragProvider({
	children,
	disabled = false,
}: {
	children: React.ReactNode;
	disabled?: boolean;
}) {
	const handlesRef = useRef<Set<HTMLElement>>(new Set());

	const register = useCallback((el: HTMLElement) => {
		handlesRef.current.add(el);
	}, []);

	const unregister = useCallback((el: HTMLElement) => {
		handlesRef.current.delete(el);
	}, []);

	const value = useMemo<DragContextValue>(
		() => ({
			disabled,
			handles: handlesRef.current,
			register,
			unregister,
		}),
		[register, unregister, disabled]
	);

	return <DragContext.Provider value={value}>{children}</DragContext.Provider>;
}

/**
 * Hook to access the drag context
 *
 * @returns The drag context value or null if outside provider
 */
export function useDragContext() {
	return useContext(DragContext);
}

/**
 * DragHandle component that marks an element as a drag handle
 *
 * @param children - The child components to render
 * @param ref - Optional ref to forward to the div element
 * @param props - Additional HTML div attributes
 */
export function DragHandle({
	children,
	ref,
	...props
}: React.HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement> }) {
	const internalRef = useRef<HTMLDivElement>(null);
	const ctx = useDragContext();

	const setRef = useCallback(
		(node: HTMLDivElement | null) => {
			internalRef.current = node ?? null;
			if (typeof ref === 'function') {
				ref(node);
			} else if (ref && typeof ref === 'object') {
				(ref as RefObject<HTMLDivElement | null>).current = node;
			}
		},
		[ref]
	);

	useEffect(() => {
		if (!ctx || !internalRef.current || ctx.disabled) {
			return;
		}
		const el = internalRef.current;
		ctx.register(el);
		return () => {
			return ctx.unregister(el);
		};
	}, [ctx]);

	return (
		<div
			ref={setRef}
			{...props}
			style={{
				cursor: ctx?.disabled ? 'default' : 'grab',
				...(props.style || {}),
			}}
		>
			{children}
		</div>
	);
}
