export {
	createTelemetry,
	Telemetry,
	TelemetryEventName,
	type TelemetryEventName as TelemetryEventNameType,
	type TelemetryOptions,
} from '../utils/telemetry';

import { createTelemetry } from '../utils/telemetry';

export function createDisabledTelemetry() {
	return createTelemetry({ disabled: true });
}
