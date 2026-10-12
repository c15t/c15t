import { defineNetworkBlockerSuite } from '../../shared/src/suite/network-blocker';

// webpack evaluates client component modules when the route's chunk loads.
defineNetworkBlockerSuite('Next 15 / App Router / network blocker', {
	modulesEvaluateBeforeRender: true,
});
