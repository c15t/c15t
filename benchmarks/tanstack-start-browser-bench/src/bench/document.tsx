import { HeadContent, Scripts } from '@tanstack/react-router';
import type { ReactNode } from 'react';

/** The document shell both root variants render around the outlet. */
export const BenchDocument = ({ children }: { children: ReactNode }) => (
	<html lang="en">
		<head>
			<HeadContent />
		</head>
		<body>
			{children}
			<Scripts />
		</body>
	</html>
);
