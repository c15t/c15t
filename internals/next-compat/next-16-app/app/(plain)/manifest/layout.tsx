import { ConsentShell } from '@c15t/next-compat-shared/consent-shell';
import type { ReactNode } from 'react';

const ManifestLayout = ({ children }: { children: ReactNode }) => (
	<ConsentShell
		scenario="manifest"
		transport="manifest"
	>
		{children}
	</ConsentShell>
);

export default ManifestLayout;
