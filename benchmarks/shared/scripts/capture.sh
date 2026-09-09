#!/usr/bin/env bash
# Capture every benchmark suite for one checkout into one artifact directory.
#   perf-capture.sh <checkout-dir> <output-dir>
# Iteration counts: CORE_ITERS (1000), POLICY_ITERS (500), BROWSER_ITERS (5),
# SL_ITERS (7), HYDRATION_ITERS (30). Suites can be limited with
# SUITES="core policy bundle react nextjs nuxt lifecycle".
set -uo pipefail
CHECKOUT=$1; OUT=$2
CORE_ITERS=${CORE_ITERS:-1000}; POLICY_ITERS=${POLICY_ITERS:-500}
BROWSER_ITERS=${BROWSER_ITERS:-5}; SL_ITERS=${SL_ITERS:-7}; HYDRATION_ITERS=${HYDRATION_ITERS:-30}
SUITES=${SUITES:-"core policy bundle react nextjs nuxt lifecycle"}
if [[ -e "$OUT/exit-codes.txt" ]]; then
  echo "Refusing to mix capture results in $OUT" >&2
  exit 1
fi
mkdir -p "$OUT"
OUT=$(cd "$OUT" && pwd)
: > "$OUT/exit-codes.txt"
failed=0
cd "$CHECKOUT" || exit 1
unset C15T_BENCH_SCENARIO BENCHMARK_EXPECTED_SUITES
log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$OUT/capture.log"; }
run() { # run <name> <dir> <command...>
  local name=$1 dir=$2; shift 2
  log "start $name (load: $(uptime | sed 's/.*load averages*: //'))"
  (cd "$dir" && "$@") > "$OUT/$name.log" 2>&1
  local code=$?
  log "end $name exit=$code"
  echo "$name=$code" >> "$OUT/exit-codes.txt"
  if (( code != 0 )); then failed=1; fi
}
log "checkout $(git rev-parse HEAD) dirty=$(git status --porcelain --untracked-files=no | wc -l | tr -d ' ') node=$(node --version) bun=$(bun --version)"
for suite in $SUITES; do
  case $suite in
    core) run core-runtime benchmarks/core-benchmarks env BENCH_ITERATIONS=$CORE_ITERS BENCH_WARMUP_ITERATIONS=100 BENCH_OUTPUT_DIR="$OUT/core-runtime" bunx tsx src/run.ts ;;
    policy) run policy-runtime benchmarks/core-benchmarks env BENCH_ITERATIONS=$POLICY_ITERS BENCH_WARMUP_ITERATIONS=50 BENCH_OUTPUT_DIR="$OUT/policy-runtime" bunx tsx src/policy-runtime.ts ;;
    bundle) run bundle benchmarks/bundle-test-app env BENCH_OUTPUT_DIR="$OUT/bundle" bunx tsx analyze-bundle.ts
            run bundle-entries benchmarks/bundle-test-app env BENCH_OUTPUT_DIR="$OUT/bundle" bunx tsx analyze-entries.ts ;;
    react) run react-browser benchmarks/react-browser-bench env C15T_BENCH_ITERATIONS=$BROWSER_ITERS C15T_BENCH_HYDRATION_ITERATIONS=$HYDRATION_ITERS BENCH_OUTPUT_DIR="$OUT/browser-runtime/react" bunx tsx scripts/run-bench.ts ;;
    nextjs) run nextjs-browser benchmarks/nextjs-browser-bench env C15T_BENCH_ITERATIONS=$BROWSER_ITERS BENCH_OUTPUT_DIR="$OUT/browser-runtime/nextjs" bunx tsx scripts/run-bench.ts ;;
    nuxt) run nuxt-browser benchmarks/nuxt-browser-bench env C15T_BENCH_ITERATIONS=$BROWSER_ITERS BENCH_OUTPUT_DIR="$OUT/browser-runtime/nuxt" bunx tsx scripts/run-bench.ts ;;
    lifecycle) run script-lifecycle benchmarks/script-lifecycle-bench env BENCH_ITERATIONS=$SL_ITERS BENCH_OUTPUT_DIR="$OUT/script-lifecycle" bunx tsx scripts/run-bench.ts ;;
    *) log "unknown suite: $suite"; failed=1 ;;
  esac
done
log "done failed=$failed"
exit "$failed"
