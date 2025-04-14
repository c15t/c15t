import type { C15TOptions } from '@c15t/backend';
import type { Adapter } from '@c15t/backend/pkgs/db-adapters';

export type SchemaGenerator = (opts: {
  file?: string;
  adapter: Adapter;
  options: C15TOptions;
}) => Promise<{
  code?: string;
  fileName: string;
  overwrite?: boolean;
  append?: boolean;
}>;
