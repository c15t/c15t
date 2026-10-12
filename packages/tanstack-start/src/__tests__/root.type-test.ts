import { expectTypeOf } from 'vitest';

import type { ConsentRootProps } from '../root';
import type { ConsentState } from '../server';

// An awaited root loader hands over the state; a streamed one hands over the
// pending server function call.
expectTypeOf<ConsentState>().toExtend<ConsentRootProps['state']>();
expectTypeOf<Promise<ConsentState>>().toExtend<ConsentRootProps['state']>();
