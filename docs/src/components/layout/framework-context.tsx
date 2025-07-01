'use client';

import { usePathname } from 'fumadocs-core/framework';
import type { PageTree } from 'fumadocs-core/server';
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react';

// localStorage key for the active framework
const ACTIVE_FRAMEWORK_KEY = 'active-framework';

// Framework preference order
const PREFERRED_FRAMEWORKS = ['nextjs', 'react', 'javascript'];

interface FrameworkContextType {
	/** Currently active framework */
	activeFramework: string;
	/** Set the active framework */
	setActiveFramework: (framework: string) => void;
	/** Check if a string is a valid framework */
	isValidFramework: (framework: string) => boolean;
}

// Create context with default values
const FrameworkContext = createContext<FrameworkContextType>({
	activeFramework: 'nextjs',
	setActiveFramework: () => undefined,
	isValidFramework: () => false,
});

interface FrameworkProviderProps {
	children: ReactNode;
	tree: PageTree.Root;
	defaultFramework?: string;
}

/**
 * Provider component for framework selection
 */
export function FrameworkProvider({
	children,
	tree,
	defaultFramework = 'nextjs',
}: FrameworkProviderProps) {
	const pathname = usePathname();

	// Find a valid framework from the available options
	const validFramework = useMemo(() => {
		// First check all preferred frameworks in order
		for (const fw of PREFERRED_FRAMEWORKS) {
			if (isValidFrameworkInTree(fw, tree)) {
				return fw;
			}
		}

		// Then try any other available framework
		for (const item of tree.children) {
			if (
				item.type === 'folder' &&
				item.root === true &&
				typeof item.name === 'string'
			) {
				return item.name.toLowerCase();
			}
		}

		return 'nextjs';
	}, [tree]);

	// Initialize with a valid framework
	const [activeFramework, setActiveFrameworkState] = useState<string>(
		defaultFramework || validFramework
	);

	// Update framework with persistence
	const setActiveFramework = (framework: string) => {
		if (framework && isValidFrameworkInTree(framework, tree)) {
			setActiveFrameworkState(framework);
			try {
				localStorage.setItem(ACTIVE_FRAMEWORK_KEY, framework);
			} catch {
				// Ignore localStorage errors
			}
		}
	};

	// Check if a framework is valid
	const isValidFramework = (framework: string) => {
		return isValidFrameworkInTree(framework, tree);
	};

	// Initialize framework from URL path or localStorage
	// biome-ignore lint/correctness/useExhaustiveDependencies: this is okay as we are in a useEffect
	useEffect(() => {
		// Try to get framework from URL path
		const pathParts = pathname.split('/').filter(Boolean);
		const pathFramework = pathParts.length > 1 ? pathParts[1] : '';

		// Try getting stored framework preference
		let storedFramework: string | null = null;
		try {
			storedFramework = localStorage.getItem(ACTIVE_FRAMEWORK_KEY);
		} catch {
			// Ignore localStorage errors
		}

		// Priority: URL path > localStorage > default > auto-detect
		if (pathFramework && isValidFrameworkInTree(pathFramework, tree)) {
			setActiveFramework(pathFramework);
		} else if (
			storedFramework &&
			isValidFrameworkInTree(storedFramework, tree)
		) {
			setActiveFramework(storedFramework);
		} else if (
			defaultFramework &&
			isValidFrameworkInTree(defaultFramework, tree)
		) {
			setActiveFramework(defaultFramework);
		} else {
			setActiveFramework(validFramework);
		}
	}, [pathname, tree, defaultFramework, validFramework]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: this is needed for the context to work
	const contextValue = useMemo(
		() => ({
			activeFramework,
			setActiveFramework,
			isValidFramework,
		}),
		[activeFramework]
	);

	return (
		<FrameworkContext.Provider value={contextValue}>
			{children}
		</FrameworkContext.Provider>
	);
}

/**
 * Hook to access the current framework context
 */
export function useFramework() {
	const context = useContext(FrameworkContext);
	if (!context) {
		throw new Error('useFramework must be used within a FrameworkProvider');
	}
	return context;
}

/**
 * Check if a framework is valid by finding its folder in the tree
 */
function isValidFrameworkInTree(
	framework: string,
	tree: PageTree.Root
): boolean {
	if (!framework) {
		return false;
	}

	return tree.children.some(
		(item) =>
			item.type === 'folder' &&
			item.root === true &&
			typeof item.name === 'string' &&
			item.name.toLowerCase() === framework.toLowerCase()
	);
}
