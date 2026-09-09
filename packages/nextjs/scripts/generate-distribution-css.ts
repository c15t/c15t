import { join } from 'node:path';

import { generateDistributionCss } from '../../shared/generate-distribution-css';

generateDistributionCss(join(import.meta.dirname, '..'));
