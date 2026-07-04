import type { ReactNode } from 'react';
import { NextjsV3ClientBenchmarkProvider } from '../_bench/v3-provider';

export default function V3ClientLayout({ children }: { children: ReactNode }) {
	return (
		<NextjsV3ClientBenchmarkProvider scenario="nextjs-v3-client">
			{children}
		</NextjsV3ClientBenchmarkProvider>
	);
}
