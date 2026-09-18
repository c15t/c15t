#!/usr/bin/env bash
#
# Prove the c15t consent journey on the iOS Simulator, end to end, in one command.
#
#   examples/react-native-bare/scripts/ios-journey.sh
#
# The app is driven only through its own `c15t-demo://` verbs, because this Xcode has
# no `simctl tap`, no `swipe`, and no `Simulator.app` to click in. Nothing here
# synthesises a touch.
#
# Proof discipline is the reason this script exists. Every step prints the md5 of its
# screenshot next to the step name, and two consecutive byte-identical screenshots are
# reported as a FAILED step rather than a passed one, because that is what a step that
# never happened looks like. A command exiting 0 is never treated as evidence.
#
# Device state: the simulator is erased before the run, so this is a genuinely fresh
# subject. `simctl uninstall` is not enough on iOS, because the core keeps the subject
# id and the stored envelope in the Keychain and Keychain items outlive an uninstall.
#
# What this deliberately does not touch:
#   - port 8081, which belongs to the Android verification; Metro here starts at 8084
#   - adb and anything Android
#   - the packages the Next demo at :3000 serves, which is why the SDK build stays
#     filtered to @c15t/react-native and never becomes a root `bun turbo build`
#

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "${APP_DIR}/../.." && pwd)"

OUT_DIR="${IOS_JOURNEY_OUT:-/tmp/ios-journey}"
SIM_NAME="${IOS_JOURNEY_SIM:-c15t-ios-journey}"
SIM_DEVICE="${IOS_JOURNEY_DEVICE:-iPhone 17 Pro}"
SIM_RUNTIME="${IOS_JOURNEY_RUNTIME:-com.apple.CoreSimulator.SimRuntime.iOS-26-4}"
BUNDLE_ID="org.reactjs.native.example.C15tBare"
BACKEND_URL="${IOS_JOURNEY_BACKEND:-http://localhost:3000/api/self-host}"
DERIVED="${IOS_JOURNEY_DERIVED:-/tmp/ios-journey-derived}"
MODE="${1:-release}"

SIM_UDID=""
STEP_FAILS=0
PREV_MD5=""
PREV_STEP="none"
SUMMARY=()

log() { printf '==> %s\n' "$*"; }
warn() { printf 'warn %s\n' "$*"; }
die() { printf 'fail %s\n' "$*" >&2; exit 1; }

sim() { xcrun simctl "$@"; }

# ---------------------------------------------------------------------------
# 1. Preflight
# ---------------------------------------------------------------------------

xcode_developer_dir="$(xcode-select -p)"
[[ "${xcode_developer_dir}" == *Xcode.app/Contents/Developer ]] ||
	die "xcode-select points at ${xcode_developer_dir}, not a full Xcode."

curl -fsS -m 10 -o /dev/null "${BACKEND_URL}/init" ||
	die "the consent backend is not answering at ${BACKEND_URL}. Start it with:
      DATABASE_URL='postgres://postgres:c15t@localhost:5432/c15t' \\
        bun run --cwd examples/demo dev:localhost
    Without it the core retries quietly and no prompt ever renders, which looks
    exactly like a banner that never ships."

# ---------------------------------------------------------------------------
# 2. Device
# ---------------------------------------------------------------------------

SIM_UDID="$(sim list devices available | grep -m1 "${SIM_NAME} (" |
	sed -E 's/.*\(([A-F0-9-]{36})\).*/\1/')"

if [[ -z "${SIM_UDID}" ]]; then
	log "creating simulator ${SIM_NAME} (${SIM_DEVICE})"
	SIM_UDID="$(sim create "${SIM_NAME}" "${SIM_DEVICE}" "${SIM_RUNTIME}")"
fi

log "simulator ${SIM_NAME} ${SIM_UDID}"

sim shutdown "${SIM_UDID}" >/dev/null 2>&1 || true
log "erasing ${SIM_NAME}: this is the fresh-install step, Keychain included"
sim erase "${SIM_UDID}"
sim boot "${SIM_UDID}" >/dev/null 2>&1 || true
sim bootstatus "${SIM_UDID}" -b >/dev/null

# ---------------------------------------------------------------------------
# 3. Build
# ---------------------------------------------------------------------------

log "building @c15t/react-native, filtered: the Next demo must not see a rebuild"
(cd "${REPO_ROOT}" && bun turbo run build --filter=@c15t/react-native >/dev/null)

if [[ ! -d "${APP_DIR}/ios/Pods" ]]; then
	log "pod install"
	(cd "${APP_DIR}" && bun run pod-install >/dev/null)
fi

log "building the C15tBare app (${MODE})"

XCODE_ARGS=(
	-workspace "${APP_DIR}/ios/C15tBare.xcworkspace"
	-scheme C15tBare
	-sdk iphonesimulator
	-destination 'generic/platform=iOS Simulator'
	-derivedDataPath "${DERIVED}"
	CODE_SIGNING_ALLOWED=NO
)

if [[ "${MODE}" == "debug" ]]; then
	XCODE_ARGS+=(-configuration Debug)

	# A Metro-served debug bundle needs a packager. 8081 belongs to the Android
	# verification, so this probes upward and takes the first free port.
	METRO_PORT=8084
	while lsof -nP -iTCP:"${METRO_PORT}" -sTCP:LISTEN >/dev/null 2>&1; do
		METRO_PORT=$((METRO_PORT + 1))
	done

	log "starting Metro on ${METRO_PORT}, never 8081"
	(cd "${APP_DIR}" && npx react-native start --port "${METRO_PORT}" \
		>/tmp/ios-journey-metro.log 2>&1 &)
	trap 'pkill -f "react-native start --port ${METRO_PORT}" >/dev/null 2>&1 || true' EXIT

	for _ in $(seq 1 60); do
		curl -fsS -m 2 "http://localhost:${METRO_PORT}/status" >/dev/null 2>&1 && break
		sleep 1
	done
else
	# The stronger evidence: the binary carries the bundle, so what runs is what
	# shipped, and no packager sits between the proof and the app.
	log "bundling JavaScript for release, so the binary carries it"
	rm -f "${APP_DIR}/ios/main.jsbundle"
	(cd "${APP_DIR}" && bun run bundle:ios >/dev/null)
	XCODE_ARGS+=(-configuration Release)
fi

(cd "${APP_DIR}/ios" &&
	xcodebuild "${XCODE_ARGS[@]}" build >/tmp/ios-journey-build.log 2>&1) ||
	die "xcodebuild failed, see /tmp/ios-journey-build.log"

APP_PATH="$(find "${DERIVED}/Build/Products" -maxdepth 2 -name 'C15tBare.app' -type d | head -1)"
[[ -n "${APP_PATH}" ]] || die "no C15tBare.app under ${DERIVED}/Build/Products"

mkdir -p "${OUT_DIR}"
rm -f "${OUT_DIR}"/*.png "${OUT_DIR}"/*.png.md5

log "installing $(basename "${APP_PATH}")"
sim install "${SIM_UDID}" "${APP_PATH}"

# ---------------------------------------------------------------------------
# 4. Journey helpers
# ---------------------------------------------------------------------------

# relaunch [link]
#
# A link owed by a cold start cannot ride on an openurl. The launch variable is what
# JavaScript reads as the initial URL, and the verbs are unchanged either way.
relaunch() {
	local link="${1:-}"

	sim terminate "${SIM_UDID}" "${BUNDLE_ID}" >/dev/null 2>&1 || true
	sleep 1

	if [[ -n "${link}" ]]; then
		SIMCTL_CHILD_C15T_DEMO_LINK="${link}" sim launch \
			--terminate-running-process "${SIM_UDID}" "${BUNDLE_ID}" >/dev/null
	else
		sim launch --terminate-running-process "${SIM_UDID}" "${BUNDLE_ID}" >/dev/null
	fi
}

# send <url>: deliver to the running app, leaving any sheet it has open on screen.
send() {
	local url="$1"

	if ! sim openurl "${SIM_UDID}" "${url}" >/dev/null 2>&1; then
		warn "openurl refused ${url}; falling back to the launch variable"
		relaunch "${url}"
		return
	fi

	sleep 2
}

# step <file-stem> <description> [settle-seconds]
step() {
	local stem="$1" description="$2" settle="${3:-2}"
	local path="${OUT_DIR}/${stem}.png" md5 status="ok"

	sleep "${settle}"
	sim io "${SIM_UDID}" screenshot "${path}" >/dev/null

	md5="$(md5 -q "${path}")"

	if [[ -n "${PREV_MD5}" && "${md5}" == "${PREV_MD5}" ]]; then
		status="FAILED"
		STEP_FAILS=$((STEP_FAILS + 1))
	fi

	printf '%s  %s\n' "${md5}" "${path}" >"${path}.md5"

	if [[ "${status}" == "ok" ]]; then
		printf '  [%s] %-46s %s  %s\n' "${stem%%-*}" "${description}" "${md5}" "${path}"
	else
		printf '  [%s] %-46s %s  %s\n' "${stem%%-*}" \
			"${description} -- IDENTICAL TO ${PREV_STEP}, step did not happen" "${md5}" "${path}"
	fi

	SUMMARY+=("${stem}|${description}|${md5}|${status}")

	PREV_MD5="${md5}"
	PREV_STEP="${stem}"
}

# ---------------------------------------------------------------------------
# 5. The journey
# ---------------------------------------------------------------------------

log "journey, screenshots in ${OUT_DIR}"

# 1. Fresh launch: nothing answered, so the banner owes a decision.
relaunch
step "01-first-run-banner" "fresh launch, banner owing a decision" 12

# 2. The consent manager, the path the banner's Customize button takes.
send "c15t-demo://customize"
step "02-consent-manager" "consent manager open, every category listed" 3

# 3. One category moved.
#
# The switch inside ConsentDialog is the SDK's own uncommitted React state, and the
# only writer is that row's onValueChange, so no deep link reaches it. What a link can
# do is commit one category while the sheet is on screen: the rows are re-derived from
# the snapshot, so the switch moves in front of the camera. Named here so nobody reads
# this frame as a thumb on a switch.
send "c15t-demo://save?measurement=1"
step "03-category-toggled" "measurement committed on, sheet still open" 4

# 4. Saved, and the decision readable on the app rather than inside a sheet.
send "c15t-demo://dismiss"
step "04-decision-committed" "sheet closed, revision and categories on screen" 3

# 5. Process death and a cold start, the only relaunch that proves stored state.
relaunch
step "05-relaunch-saved" "relaunched: reads as saved, no prompt owed" 10

# 6. The standing preference centre.
send "c15t-demo://preferences"
step "06-preference-centre" "preference centre open" 3

# 7. The other palette, on the same sheet.
send "c15t-demo://dismiss"
send "c15t-demo://scheme/dark"
send "c15t-demo://preferences"
step "07-dark-scheme" "dark scheme, preference centre open" 4

# 8. Back to first launch through the core's own wipe rather than a reinstall.
send "c15t-demo://dismiss"
send "c15t-demo://scheme/light"
send "c15t-demo://reset"
step "08-reset-first-launch" "reset: first-run prompt owed again" 10

# ---------------------------------------------------------------------------
# 6. Report
# ---------------------------------------------------------------------------

printf '\n%-26s %-40s %-8s %s\n' "STEP" "DESCRIPTION" "RESULT" "MD5"
printf '%s\n' "-------------------------------------------------------------------------"
for row in "${SUMMARY[@]}"; do
	IFS='|' read -r stem description md5 status <<<"${row}"
	printf '%-26s %-40s %-8s %s\n' "${stem}" "${description}" "${status}" "${md5}"
done
printf '\n'

first_frame_md5="$(md5 -q "${OUT_DIR}/01-first-run-banner.png")"
reset_frame_md5="$(md5 -q "${OUT_DIR}/08-reset-first-launch.png")"

if [[ "${first_frame_md5}" == "${reset_frame_md5}" ]]; then
	log "reset restored the first frame pixel for pixel"
fi

unique="$(md5 -q "${OUT_DIR}"/*.png | sort -u | wc -l | tr -d ' ')"
log "${unique} distinct screenshots across ${#SUMMARY[@]} steps"
log "device ${SIM_NAME} ${SIM_UDID}"
log "app ${APP_PATH}"

if [[ "${STEP_FAILS}" -gt 0 ]]; then
	die "${STEP_FAILS} step(s) produced a screenshot identical to the one before them."
fi

log "every step produced a distinct frame"
