import type { ReactNode } from 'react';

import './globals.css';

/** No consent library: the zero point every other arm is measured against. */
const RootLayout = ({ children }: { children: ReactNode }) => (
	<html lang="en">
		<body>
			{children}
			<footer className="mx-auto max-w-3xl px-6 py-8">Privacy settings</footer>
		</body>
	</html>
);

export default RootLayout;
