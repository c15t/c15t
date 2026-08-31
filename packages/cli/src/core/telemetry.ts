import { createTelemetry } from '../utils/telemetry';

export {
	createTelemetry,
	Telemetry,
	TelemetryEventName,
	type TelemetryEventNameType,
	type TelemetryOptions,
} from '../utils/telemetry';

export function createDisabledTelemetry() {
	return createTelemetry({ disabled: true });
}
