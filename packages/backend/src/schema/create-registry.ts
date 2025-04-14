import type { RegistryContext } from '~/pkgs/types';

import {
  auditLogRegistry,
  consentPurposeRegistry,
  consentRegistry,
  domainRegistry,
  policyRegistry,
  subjectRegistry,
} from './index';

export const createRegistry = (ctx: RegistryContext) => {
  return {
    ...auditLogRegistry(ctx),
    ...consentRegistry(ctx),
    ...domainRegistry(ctx),
    ...consentPurposeRegistry(ctx),
    ...policyRegistry(ctx),
    ...subjectRegistry(ctx),
  };
};
