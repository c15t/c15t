import type { ReactNode } from 'react';
import { NextjsBenchmarkProvider } from '../_bench/provider';

export default function ClientLayout({ children }: { children: ReactNode }) {
	return (
		<NextjsBenchmarkProvider scenario="client">
			{children}
		</NextjsBenchmarkProvider>
	);
}
