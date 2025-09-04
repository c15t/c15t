// Main layout updater (handles detection and routing)

export type { AvailablePackages } from '~/context/framework-detection';
export { updateReactLayout } from './layout';
export { updateNextLayout } from './next';
export { updateAppLayout } from './next/app/layout';
export { updatePagesLayout } from './next/pages/layout';
export {
	generateOptionsText,
	getBaseImports,
	getCustomModeImports,
} from './shared/options';
