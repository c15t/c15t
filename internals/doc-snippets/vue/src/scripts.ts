// Type-check scaffolding: the `scripts` that `customize.ts` passes to the
// plugin. The quickstart publishes the real file from `examples/vue`.
import { posthog } from '@c15t/integrations/posthog';

export const scripts = [posthog({ id: 'phc_your_project_key' })];
