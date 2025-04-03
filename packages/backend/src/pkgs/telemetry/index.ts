import { Resource } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import type { DoubleTieOptions } from '../types/options';

let sdk: NodeSDK | undefined;

export const initTelemetry = (options?: DoubleTieOptions) => {
	if (sdk || options?.telemetry?.disabled) {
		return;
	}

	const resource = new Resource({
		'service.name': options?.appName || 'c15t',
		'service.version': process.env.npm_package_version || 'unknown',
		...options?.telemetry?.defaultAttributes,
	});

	sdk = new NodeSDK({
		resource,
		traceExporter: options?.telemetry?.tracer
			? undefined
			: new ConsoleSpanExporter(),
	});

	sdk.start();
};

export const shutdownTelemetry = async () => {
	if (sdk) {
		await sdk.shutdown();
		sdk = undefined;
	}
};
