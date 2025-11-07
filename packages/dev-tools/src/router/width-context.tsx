'use client';

import { createContext, type ReactNode, useContext, useState } from 'react';

interface WidthContextValue {
	tabWidth: number | null;
	setTabWidth: (width: number) => void;
	selectedTabIndex: number | null;
	setSelectedTabIndex: (index: number | null) => void;
	tabWidths: Map<number, 'auto' | `${number}px`>;
	setTabWidths: (widths: Map<number, 'auto' | `${number}px`>) => void;
}

const WidthContext = createContext<WidthContextValue | null>(null);

interface WidthProviderProps {
	children: ReactNode;
}

export function WidthProvider({ children }: WidthProviderProps) {
	const [tabWidth, setTabWidth] = useState<number | null>(null);
	const [selectedTabIndex, setSelectedTabIndex] = useState<number | null>(0);
	const [tabWidths, setTabWidths] = useState<
		Map<number, 'auto' | `${number}px`>
	>(new Map());

	return (
		<WidthContext.Provider
			value={{
				tabWidth,
				setTabWidth,
				selectedTabIndex,
				setSelectedTabIndex,
				tabWidths,
				setTabWidths,
			}}
		>
			{children}
		</WidthContext.Provider>
	);
}

export function useWidthContext(): WidthContextValue {
	const context = useContext(WidthContext);
	if (context === null) {
		throw new Error('useWidthContext must be used within a WidthProvider');
	}
	return context;
}
