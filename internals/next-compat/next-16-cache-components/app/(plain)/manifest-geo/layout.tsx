import { ConsentShell } from '@c15t/next-compat-shared/consent-shell';
import type { ReactNode } from 'react';

const ManifestGeoLayout = ({ children }: { children: ReactNode }) => (
	<ConsentShell
		styles={false}
		scenario="manifest-geo"
		transport="manifest-geo"
	>
		{children}
	</ConsentShell>
);

export default ManifestGeoLayout;
