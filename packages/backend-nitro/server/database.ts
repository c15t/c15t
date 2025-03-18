import { createQueryBuilder } from '@doubletie/query-builder';
import { schemaConfig } from './schema/registry';

export const queryBuilder = createQueryBuilder({
  ...schemaConfig,
  // other config options as needed
});