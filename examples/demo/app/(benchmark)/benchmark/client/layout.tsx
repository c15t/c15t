import type { ReactNode } from 'react';
import { BenchmarkConsentProvider } from '../_components/consent-provider';

export default function ClientBenchmarkLayout({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<BenchmarkConsentProvider variant="client">
			{children}
		</BenchmarkConsentProvider>
	);
}
