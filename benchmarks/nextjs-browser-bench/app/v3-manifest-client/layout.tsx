import type { ReactNode } from 'react';
import { NextjsV3ManifestClientBenchmarkProvider } from '../_bench/v3-provider';

export default function V3ManifestClientLayout({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<NextjsV3ManifestClientBenchmarkProvider scenario="nextjs-v3-manifest-client">
			{children}
		</NextjsV3ManifestClientBenchmarkProvider>
	);
}
