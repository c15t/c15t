'use client';

import { ConsentDialogLink } from 'c15t/next';
import { ShieldCheck } from 'lucide-react';

// Persistent route to the preference center. Rendered from the (server)
// Sidebar, so it needs its own client boundary.
export function PrivacySettingsLink() {
	return (
		<ConsentDialogLink
			aria-label="Privacy settings"
			className="text-gray inline-flex items-center gap-2 rounded-md p-1.5 text-xs font-medium tracking-wide transition-colors hover:text-black dark:hover:text-white"
		>
			<ShieldCheck className="size-4" />
			<span className="hidden lg:inline">Privacy settings</span>
		</ConsentDialogLink>
	);
}
