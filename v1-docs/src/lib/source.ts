import { loader } from 'fumadocs-core/source';
import { icons } from 'lucide-react';
import { createElement } from 'react';
import { docs } from '~/.source';
// import { iconMap } from '~/components/icons';

// `loader()` also assign a URL to your pages
// See https://fumadocs.vercel.app/docs/headless/source-api for more info
export const source = loader({
	baseUrl: '/docs',
	source: docs.toFumadocsSource(),
	icon(icon) {
		if (!icon) {
			// You may set a default icon
			return;
		}

		// if (icon in iconMap) {
		// 	return createElement(iconMap[icon as keyof typeof iconMap]);
		// }
		if (icon in icons) {
			return createElement(icons[icon as keyof typeof icons]);
		}
	},
});
