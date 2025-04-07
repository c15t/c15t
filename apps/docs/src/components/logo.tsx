import { ConsentManagementShortIcon } from './icons/logo-short';

export const LogoWithBadge = () => {
	return (
		<div className="flex items-center gap-2">
			<ConsentManagementShortIcon className="h-6 w-auto text-black dark:text-white" />
			<span className="inline-flex items-center rounded-full border bg-fd-primary/10 px-2.5 py-0.5 font-semibold text-fd-primary text-xs">
				RC 13
			</span>
		</div>
	);
};
