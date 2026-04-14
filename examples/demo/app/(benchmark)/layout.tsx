import { Geist, Geist_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import '../globals.css';

const geist = Geist({ subsets: ['latin'] });
const geistMono = Geist_Mono({ subsets: ['latin'] });

export default function BenchmarkRootLayout({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={`${geist.className} ${geistMono.className} font-sans antialiased`}
			>
				{children}
			</body>
		</html>
	);
}
