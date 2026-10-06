// Stand-in for the gtag vendor script in the typical-install arm. It is
// served by the bench app, so no request leaves the machine. It records when
// it ran; the runner reads its request start from resource timing.
(window.__c15tBenchVendors ??= {})['gtag'] = performance.now();
