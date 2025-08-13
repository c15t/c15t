import type { PageTree } from 'fumadocs-core/server';
import {
	type GetSidebarTabsOptions,
	getSidebarTabs,
} from 'fumadocs-ui/utils/get-sidebar-tabs';
import type { ReactNode } from 'react';
import type { Option } from '../../layout/root-toggle';
import {
	type SidebarComponents,
	SidebarFolder,
	SidebarFolderContent,
	SidebarFolderLink,
	SidebarFolderTrigger,
	SidebarItem,
	type SidebarProps,
} from '../../layout/sidebar';
import type { LinkItemType } from '../links';

export const layoutVariables = {
	'--fd-layout-offset': 'max(calc(50vw - var(--fd-layout-width) / 2), 0px)',
};

export interface SidebarOptions extends SidebarProps {
	collapsible?: boolean;
	components?: Partial<SidebarComponents>;

	/**
	 * Root Toggle options
	 */
	tabs?: Option[] | GetSidebarTabsOptions | false;

	banner?: ReactNode;
	footer?: ReactNode;

	/**
	 * Hide search trigger. You can also disable search for the entire site from `<RootProvider />`.
	 *
	 * @defaultValue false
	 */
	hideSearch?: boolean;
}

export function SidebarLinkItem({
	item,
	...props
}: {
	item: LinkItemType;
	className?: string;
}) {
	if (item.type === 'menu') {
		return (
			<SidebarFolder {...props}>
				{item.url ? (
					<SidebarFolderLink href={item.url}>
						{item.icon}
						{item.text}
					</SidebarFolderLink>
				) : (
					<SidebarFolderTrigger>
						{item.icon}
						{item.text}
					</SidebarFolderTrigger>
				)}
				<SidebarFolderContent>
					{item.items.map((child, i) => (
						<SidebarLinkItem key={i} item={child} />
					))}
				</SidebarFolderContent>
			</SidebarFolder>
		);
	}

	if (item.type === 'custom') {
		return <div {...props}>{item.children}</div>;
	}

	return (
		<SidebarItem
			href={item.url}
			icon={item.icon}
			external={item.external}
			{...props}
		>
			{item.text}
		</SidebarItem>
	);
}

export function getSidebarTabsFromOptions(
	options: SidebarOptions['tabs'],
	tree: PageTree.Root
) {
	if (Array.isArray(options)) {
		return options;
	}

	if (typeof options === 'object') {
		return getSidebarTabs(tree, options);
	}

	if (options !== false) {
		return getSidebarTabs(tree);
	}
}
