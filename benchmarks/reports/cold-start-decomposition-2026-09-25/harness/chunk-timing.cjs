// Preload (`node --require`) that times each CommonJS file the server loads:
// read + compile + top-level evaluation. Turbopack server chunks only
// register module factories at top level, so this is the cost of bringing a
// chunk into the process; factory execution is measured by the CPU profile.
// `preloadHrUs` marks process start on the `process.hrtime` clock, which is
// how analyze-profile.mjs lines the V8 profile up with request times.
const fs = require('node:fs');
const Module = require('node:module');

const PRELOAD_HR_US = Number(process.hrtime.bigint() / 1000n);
const loads = [];
const original = Module.prototype._compile;
Module.prototype._compile = function _compile(content, filename) {
	const hr = process.hrtime.bigint();
	const t0 = performance.now();
	try {
		return original.call(this, content, filename);
	} finally {
		loads.push({
			bytes: content.length,
			file: filename,
			ms: performance.now() - t0,
			startHrUs: Number(hr / 1000n),
		});
	}
};

process.on('exit', () => {
	if (process.env.CHUNK_TIMING_OUT) {
		fs.writeFileSync(
			process.env.CHUNK_TIMING_OUT,
			JSON.stringify({ loads, preloadHrUs: PRELOAD_HR_US })
		);
	}
});
