import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/svelte';
import { afterEach } from 'vitest';

import { preloadPersistenceWriter } from '../../../core/src/modules/persistence/mount';

afterEach(() => {
	cleanup();
});

// Persistence loads its write code on demand. Load it once up front, as
// core's own setup does, so a save is stored in the macrotask after it and
// not once the chunk lands, possibly in a later test's storage.
await preloadPersistenceWriter();
