// import { NodeSDK } from '@opentelemetry/sdk-node';
// import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
// import { Resource } from '@opentelemetry/resources';
// import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
// import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
// import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

// // For troubleshooting, enable diagnostic logging
// diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

// // Configure the SDK
// export const otelSDK = new NodeSDK({
//   resource: new Resource({
//     [SemanticResourceAttributes.SERVICE_NAME]: '@doubletie/results',
//     [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
//   }),
//   spanProcessor: new SimpleSpanProcessor(new ConsoleSpanExporter()),
// });

// // Initialize the SDK
// otelSDK.start();
