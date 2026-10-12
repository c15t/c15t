import { registerStockTranslations } from './stock';
import { baseTranslations } from './translations';

// Loading every language makes each one's built-in copy known, so app
// messages that repeat it do not shadow backend edits.
registerStockTranslations(baseTranslations);

export type { BaseTranslations } from './translations';
export { baseTranslations };
