import { mark } from './app/bench-timing';

/** Runs once per server process, so its mark proves a sample's process is new. */
export const register = function register() {
	mark('instrumentation:register');
};
