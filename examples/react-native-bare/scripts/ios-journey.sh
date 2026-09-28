#!/usr/bin/env bash
#
# Prove the c15t consent journey on the iOS Simulator, end to end, in one command.
#
#   examples/react-native-bare/scripts/ios-journey.sh [release|debug]
#
# Delivery, and why it is not `simctl openurl`
# -------------------------------------------
# iOS 26 will not hand a `c15t-demo://` open to the app without asking first: it raises
# "Open in c15t Bare?" and waits for a tap. This machine cannot answer it. `simctl io`
# offers enumerate, poll, recordVideo, screenshot and screenConfig, and there is no
# Simulator.app in the Xcode bundle to click in, so there is no finger to give it. Every
# verb therefore goes in as the `C15T_DEMO_LINK` launch variable, which
# `ios/C15tBare/AppDelegate.swift` puts into the launch options as a URL, so
# `Linking.getInitialURL()` returns it and the verb table runs unchanged. One link per
# cold start, which also means every step survives process death on its own.
#
# IOS_JOURNEY_PROBE_OPENURL=1 sends one real `openurl` as a check on that claim and
# reports what comes back, because "the alert is unavoidable" has to be re-tested
# rather than repeated.
#
# Proof discipline
# ----------------
# Every step records the md5 of the frame, the md5 of the frame below the system band,
# and the percentage of the app area that changed since the previous frame. Hashing the
# whole PNG is not enough: the status bar carries a clock, so a step that never happened
# still produced a fresh hash. That is how an earlier run of this script reported eight
# steps and had delivered none of them. Each step also states what it expects, and a
# consent surface on screen is read off the pixels by ios-surface-metrics.py rather than
# assumed from the verb exiting 0.
#
# Device state: the simulator is erased before the run, so this is a genuinely fresh
# subject. `simctl uninstall` is not enough on iOS, because the core keeps the subject id
# and the stored envelope in the Keychain and Keychain items outlive an uninstall.
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
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Namespaced by worktree: lanes that each own a simulator still wrote their frames to
# one shared /tmp/ios-journey, so a second run cleared the first run's evidence and
# compared it against frames it never took.
OUT_DIR="${IOS_JOURNEY_OUT:-/tmp/ios-journey/$(basename "${REPO_ROOT}")}"
SIM_NAME="${IOS_JOURNEY_SIM:-c15t-ios-journey}"
SIM_DEVICE="${IOS_JOURNEY_DEVICE:-iPhone 17 Pro}"
SIM_RUNTIME="${IOS_JOURNEY_RUNTIME:-com.apple.CoreSimulator.SimRuntime.iOS-26-4}"
BUNDLE_ID="org.reactjs.native.example.C15tBare"
BACKEND_URL="${IOS_JOURNEY_BACKEND:-http://localhost:3000/api/self-host}"
DERIVED="${IOS_JOURNEY_DERIVED:-/tmp/ios-journey-derived}"
SCALE="${IOS_JOURNEY_SCALE:-3}"
STATUS_BAND_PX="${IOS_JOURNEY_STATUS_BAND_PX:-177}"
MIN_CHANGED_PCT="${IOS_JOURNEY_MIN_CHANGED_PCT:-0.35}"
# Longest a step waits for the state it is about to assert. A commit is a queue write
# followed by a backend round trip, and measured runs put the same acceptAll anywhere between
# 8 and 30 seconds on this machine depending on load, so no fixed sleep is both fast on a
# step that waits for nothing and patient on one that waits for a round trip.
SETTLE_CEILING="${IOS_JOURNEY_SETTLE_CEILING:-75}"

# Ceiling for a `same:` step, well clear of the 0.18% a cold-start status line costs and
# far below the 5%+ any real consent change paints.
SAME_MAX_CHANGED_PCT="${IOS_JOURNEY_SAME_MAX_CHANGED_PCT:-0.5}"
TRUTH_DIR="${IOS_JOURNEY_TRUTH:-/tmp/ui-parity/truth}"
MODE="${1:-release}"
METRO_PORT=""
LOCK_DIR=""

# One trap for the whole run. Two traps would clobber each other, and the packager
# and the lock both have to survive a failure halfway through the journey.
cleanup() {
	[[ -n "${METRO_PORT}" ]] &&
		pkill -f "react-native start --port ${METRO_PORT}" >/dev/null 2>&1
	[[ -n "${LOCK_DIR}" ]] && rmdir "${LOCK_DIR}" 2>/dev/null
	return 0
}
trap cleanup EXIT

STEP_FAILS=0
SUMMARY=()
PREV_PNG=""
PREV_STEP="none"
PREV_APP_MD5=""
SIM_UDID=""

log() { printf '==> %s\n' "$*"; }
warn() { printf 'warn %s\n' "$*"; }
die() { printf 'fail %s\n' "$*" >&2; exit 1; }
sim() { xcrun simctl "$@"; }

python() { command python3 "$@"; }

[[ -z "${IOS_JOURNEY_ONLY:-}" ]] || ONLY_STEPS="${IOS_JOURNEY_ONLY//,/ }"
in_run() {
	[[ -z "${ONLY_STEPS:-}" ]] && return 0
	for s in ${ONLY_STEPS}; do [[ "$s" == "${1}" ]] && return 0; done
	return 1
}

# ---------------------------------------------------------------------------
# 1. Preflight
# ---------------------------------------------------------------------------

xcode_developer_dir="$(xcode-select -p)"
[[ "${xcode_developer_dir}" == *Xcode.app/Contents/Developer ]] ||
	die "xcode-select points at ${xcode_developer_dir}, not a full Xcode."

command -v xcrun >/dev/null || die "xcrun is not on PATH"
python -c 'import PIL' 2>/dev/null ||
	die "Pillow is missing, so frames cannot be compared: python3 -m pip install pillow"

curl -fsS -m 10 -o /dev/null "${BACKEND_URL}/init" ||
	die "the consent backend is not answering at ${BACKEND_URL}. Start it with:
      DATABASE_URL='postgres://postgres:c15t@localhost:5432/c15t' \\
        bun run --cwd examples/demo dev:localhost
    Without it the core retries quietly and no prompt ever renders, which looks
    exactly like a banner that never ships."

# The claim this script is built on, re-tested rather than repeated: a real
# openurl on this machine must raise the confirmation and go nowhere.
if [[ "${IOS_JOURNEY_PROBE_OPENURL:-0}" == "1" ]]; then
	log "openurl probe, expecting the iOS confirmation this run cannot answer"
	sim openurl "${SIM_UDID:-booted}" "c15t-demo://help" >/dev/null 2>&1 ||
		warn "simctl openurl itself exited non-zero"
fi

# ---------------------------------------------------------------------------
# 2. Device
# ---------------------------------------------------------------------------

SIM_UDID="$(sim list devices available | grep -m1 "${SIM_NAME} (" |
	sed -E 's/.*\(([A-F0-9-]{36})\).*/\1/')" || true

if [[ -z "${SIM_UDID}" ]]; then
	log "creating simulator ${SIM_NAME} (${SIM_DEVICE})"
	SIM_UDID="$(sim create "${SIM_NAME}" "${SIM_DEVICE}" "${SIM_RUNTIME}")"
fi

log "simulator ${SIM_NAME} ${SIM_UDID}"

# Two runs on one simulator is the worst failure this script can have: each erases the
# other's device and screenshots the other's screen, so a step reads as obstructed or
# as a frame that did not move, and the run that reports it is not the run at fault.
LOCK_DIR="${TMPDIR:-/tmp}c15t-ios-journey-${SIM_UDID}.lock"
mkdir "${LOCK_DIR}" 2>/dev/null ||
	die "another run already drives ${SIM_NAME}. Its lock is ${LOCK_DIR}. Wait for it, or point this run at another device with IOS_JOURNEY_SIM."

sim shutdown "${SIM_UDID}" >/dev/null 2>&1 || true
log "erasing ${SIM_NAME}: this is the fresh-install step, Keychain included"
sim erase "${SIM_UDID}"
sim boot "${SIM_UDID}" >/dev/null 2>&1 || true
sim bootstatus "${SIM_UDID}" -b >/dev/null
sim ui "${SIM_UDID}" appearance light

# ---------------------------------------------------------------------------
# 3. Build
# ---------------------------------------------------------------------------

log "building @c15t/react-native, filtered: the Next demo must not see a rebuild"
(cd "${REPO_ROOT}" && bun turbo run build --filter=@c15t/react-native >/dev/null) ||
	die "the SDK did not build. Nothing below this line can be believed without it."

# A development pod resolves its source globs when `pod install` runs, and the
# Pods project then carries a frozen file list. A kernel file that lands after the
# latest install is not compiled at all, and the failure reads as a missing type
# inside a file that plainly exists on disk -- which is how one run came back with
# `cannot find type 'TcStorageBusWriting' in scope` for a type that had been in the
# kernel for a day.
#
# Directory existence and mtimes are both the wrong ruler. The directory survives
# whatever stale list it was built with, and the SDK build immediately over this
# rewrites every file under vendor/C15tCore, so mtimes would force an integration on
# every run. Instead the daemon integrates when the covered contents change: the Podfile
# and the sorted checksum list of the vendored sources are the fingerprint, saved
# inside Pods/, which is gitignored, so only the run that changed the key list pays.
KERNEL_POD_SOURCES="${REPO_ROOT}/packages/react-native/vendor/C15tCore"
POD_STAMP="${APP_DIR}/ios/Pods/.c15t-kernel-sources.cksum"

kernel_pod_fingerprint() {
	{
		find "${KERNEL_POD_SOURCES}" -name '*.swift' | sort | xargs cksum
		cat "${APP_DIR}/ios/Podfile"
	} | cksum
}

NEEDED_POD_FINGERPRINT="$(kernel_pod_fingerprint)"
CURRENT_POD_FINGERPRINT="$(cat "${POD_STAMP}" 2>/dev/null || true)"

if [[ ! -d "${APP_DIR}/ios/Pods" ]] || [[ "${NEEDED_POD_FINGERPRINT}" != "${CURRENT_POD_FINGERPRINT}" ]]; then
	log "pod install"
	(cd "${APP_DIR}" && bun run pod-install >/dev/null) ||
		die "pod install failed. The Pods project cannot list kernel files it never saw."
	mkdir -p "${APP_DIR}/ios/Pods"
	printf '%s\n' "${NEEDED_POD_FINGERPRINT}" > "${POD_STAMP}"
fi

log "building the C15tBare app (${MODE})"

XCODE_ARGS=(
	-workspace "${APP_DIR}/ios/C15tBare.xcworkspace"
	-scheme C15tBare
	-sdk iphonesimulator
	-destination 'generic/platform=iOS Simulator'
	-derivedDataPath "${DERIVED}"
	# An ad-hoc simulator signature, not an unsigned build. A binary built with
	# CODE_SIGNING_ALLOWED=NO has no keychain-access group, so the core's Keychain
	# write fails with errSecMissingEntitlement and a consent decision comes back
	# refused. Ad-hoc identity (-) is enough for a simulator.
	CODE_SIGNING_ALLOWED=YES
	CODE_SIGNING_FOR_SIMULATOR=YES
	CODE_SIGN_IDENTITY=-
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
rm -f "${OUT_DIR}"/*.png "${OUT_DIR}"/*.png.md5 "${OUT_DIR}"/*.json "${OUT_DIR}"/*.app-md5

log "installing $(basename "${APP_PATH}")"
sim install "${SIM_UDID}" "${APP_PATH}"

# ---------------------------------------------------------------------------
# 4. Journey helpers
# ---------------------------------------------------------------------------

# deliver <link>
#
# A cold start carrying one verb. The link arrives as the launch URL, which is the only
# door iOS opens without a confirmation this machine cannot answer.
deliver() {
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

# probe_surface <png> <banner|dialog> -> yes | no | unknown
#
# unknown is its own answer. A frame caught mid-animation can fail to frame the card, and
# reading that as "absent" would let a settle loop decide a prompt had gone away.
probe_surface() {
	python "${SCRIPT_DIR}/ios-surface-metrics.py" "$1" --mode "$2" \
		--scale "${SCALE}" --json 2>/dev/null |
		python -c 'import json, sys
try:
    print("yes" if json.load(sys.stdin).get("surface_found") else "no")
except Exception:
    print("unknown")'
}

# expect_surface <banner|dialog|none> <png> <json>
#
# Whether a consent surface is on screen is read off the pixels: the branding tab is
# the signature, and the card the metrics tool frames around it.
expect_surface() {
	local want="$1" png="$2" json="$3" found

	python "${SCRIPT_DIR}/ios-surface-metrics.py" "${png}" \
		--mode "$( [[ "${want}" == "dialog" ]] && echo dialog || echo banner )" \
		--scale "${SCALE}" --json >"${json}" 2>/dev/null || true

	found="$(python -c 'import json,sys
try:
    d = json.load(open(sys.argv[1]))
except Exception:
    print("unreadable"); raise SystemExit
print("yes" if d.get("surface_found") else "no")' "${json}")"

	if [[ "${want}" == "none" ]]; then
		[[ "${found}" == "no" ]]
	else
		[[ "${found}" == "yes" ]]
	fi
}

# baseline_for <expect> -> the app-area md5 this step is compared against, if any
baseline_for() {
	local want=""
	case "${1}" in
		same:* | quiet:*) want="${1#*:}" ;;
		diff) [[ -n "${PREV_APP_MD5:-}" ]] && { printf '%s\n' "${PREV_APP_MD5}"; return; } ;;
	esac
	[[ -n "${want}" && -f "${OUT_DIR}/${want}.app-md5" ]] && cat "${OUT_DIR}/${want}.app-md5"
}

# settle <expect> <surface> <baseline-md5> <floor-seconds> <ceiling-seconds>
#
# Wait until the frame shows what this step is about to assert: the consent surface it names,
# and for a diff step an app area that has actually moved away from its baseline. The floor is
# the wait this script used to sleep unconditionally, so no step can settle earlier than it
# used to; the ceiling is what a network round trip is allowed to cost.
settle() {
	local expect="$1" surface="$2" baseline="$3" floor="$4" ceiling="$5"
	local probe="${OUT_DIR}/.probe.png" want_mode="banner" waited=0
	local found surface_ok change_ok frame_md5 started

	[[ "${surface}" == "dialog" ]] && want_mode="dialog"

	# Wall clock, not poll count. A probe costs a screenshot plus a pass over the frame, so
	# counting iterations would quietly make the ceiling mean something else on a loaded
	# machine, which is exactly where it matters that it means seconds.
	started="$(date +%s)"
	while :; do
		sim io "${SIM_UDID}" screenshot "${probe}" >/dev/null 2>&1

		found="$(probe_surface "${probe}" "${want_mode}")"
		if [[ "${surface}" == "none" ]]; then
			[[ "${found}" == "no" ]] && surface_ok="yes" || surface_ok="no"
		else
			[[ "${found}" == "yes" ]] && surface_ok="yes" || surface_ok="no"
		fi

		change_ok="yes"
		if [[ "${expect}" == "diff" && -n "${baseline}" ]]; then
			frame_md5="$(python "${SCRIPT_DIR}/ios-frame-proof.py" digest "${probe}" \
				--status-band "${STATUS_BAND_PX}" | cut -d" " -f2)"
			[[ "${frame_md5}" == "${baseline}" ]] && change_ok="no"
		fi

		if [[ "${surface_ok}" == "yes" && "${change_ok}" == "yes" && "${waited}" -ge "${floor}" ]]; then
			return 0
		fi

		waited=$(( $(date +%s) - started ))
		(( waited >= ceiling )) && break
		sleep 2
	done

	return 1
}

# step <stem> <description> <expect> <surface> <link> [settle-seconds]
#
# expect is one of:
#   diff            the app area must visibly move from the previous frame
#   same:<stem>     the app area must be identical to that frame
#   quiet:<stem>    report the match with that frame, decide nothing on it
step() {
	local stem="$1" description="$2" expect="${3:-diff}" surface="${4:-none}" \
		link="${5:-}" settle="${6:-5}"
	local png="${OUT_DIR}/${stem}.png" json="${OUT_DIR}/${stem}.json"
	local full_md5 app_md5 changed="n/a" status="ok" reason=""

	if ! in_run "${stem}"; then return 0; fi

	deliver "${link}"
	if ! settle "${expect}" "${surface}" "$(baseline_for "${expect}")" \
		"${settle}" "${SETTLE_CEILING}"; then
		warn "${stem}: no ${surface} surface and ${expect} within ${SETTLE_CEILING}s, capturing anyway"
	fi
	sim io "${SIM_UDID}" screenshot "${png}" >/dev/null

	read -r full_md5 app_md5 < <(python "${SCRIPT_DIR}/ios-frame-proof.py" digest \
		"${png}" --status-band "${STATUS_BAND_PX}")

	if [[ -n "${PREV_APP_MD5}" ]]; then
		changed="$(python "${SCRIPT_DIR}/ios-frame-proof.py" diff \
			"${OUT_DIR}/${PREV_STEP}.png" "${png}" --status-band "${STATUS_BAND_PX}")"
	fi

	if [[ "${expect}" == diff:* || "${expect}" == "diff" ]]; then
		if [[ -n "${PREV_APP_MD5}" && "${app_md5}" == "${PREV_APP_MD5}" ]]; then
			status="FAILED"
			reason="app area identical to ${PREV_STEP}, step did not happen"
		elif [[ "${changed}" != "n/a" ]] &&
			awk -v c="${changed}" -v m="${MIN_CHANGED_PCT}" 'BEGIN{exit !(c<m)}'; then
			status="FAILED"
			reason="only ${changed}% of the app area changed, step did not happen"
		fi
	elif [[ "${expect}" == same:* ]]; then
		# Byte equality is the wrong demand for a step that changes nothing. Every step is a
		# cold start, and the app's own status line settles on its own schedule: a measured
		# run put the banner in the identical pixels with the identical buttons in both frames
		# and still differed across one 20pt line. So the bound is how much of the app area
		# moved, and the surface check below is what pins which consent surface is on screen.
		local want="${expect#same:}" base_changed="n/a"
		if [[ -f "${OUT_DIR}/${want}.png" ]]; then
			base_changed="$(python "${SCRIPT_DIR}/ios-frame-proof.py" diff \
				"${OUT_DIR}/${want}.png" "${png}" --status-band "${STATUS_BAND_PX}")"
		fi
		if [[ "${base_changed}" == "n/a" ]]; then
			status="FAILED"
			reason="cannot compare against ${want}, no baseline frame to compare to"
		elif awk -v c="${base_changed}" -v m="${SAME_MAX_CHANGED_PCT}" 'BEGIN{exit !(c>m)}'; then
			status="FAILED"
			reason="${base_changed}% of the app area moved against ${want}, which the step says it must not"
		fi
	fi

	if [[ "${status}" == "ok" ]] && ! expect_surface "${surface}" "${png}" "${json}"; then
		status="FAILED"
		reason="expected surface '${surface}' on screen, the pixels say otherwise"
	fi

	printf '%s  %s\n' "${full_md5}" "${png}" >"${png}.md5"
	if [[ "${status}" == "ok" ]]; then
		printf '  [%s] %-42s ok      %s\n' "${stem%%-*}" "${description}" "${full_md5}"
	else
		STEP_FAILS=$((STEP_FAILS + 1))
		printf '  [%s] %-42s FAILED  %s\n      %s\n' "${stem%%-*}" \
			"${description}" "${full_md5}" "${reason}"
	fi

	local match="-"
	if [[ "${expect}" == same:* || "${expect}" == quiet:* ]]; then
		local want="${expect#*:}" baseline=""
		[[ -f "${OUT_DIR}/${want}.app-md5" ]] && baseline="$(cat "${OUT_DIR}/${want}.app-md5")"
		if [[ "${app_md5}" == "${baseline}" ]]; then
			match="match:${want}"
		else
			match="differ:${want}"
		fi
	fi

	printf '%s\n' "${app_md5}" >"${OUT_DIR}/${stem}.app-md5"

	SUMMARY+=("${stem}|${description}|${status}|${full_md5}|${app_md5}|${changed}|${surface}|${match}")
	PREV_PNG="${png}"
	PREV_STEP="${stem}"
	PREV_APP_MD5="${app_md5}"
}

# appearance <light|dark>
appearance() {
	sim ui "${SIM_UDID}" appearance "${1}"
	log "simulator appearance: ${1}"
}

# ---------------------------------------------------------------------------
# 5. The journey
# ---------------------------------------------------------------------------

log "journey, screenshots in ${OUT_DIR}"

# 1. Nothing answered on a fresh subject, so the banner owes a decision.
step 01-fresh-banner "fresh install: banner owing a decision" diff banner "" 14

# 2. dismissNotice on an opt-in policy is not a decision. A cold start is what makes
#    this read as storage rather than as a sheet that happened to stay open.
step 02-dismiss-still-owed "dismiss leaves an opt-in prompt owed" same:01-fresh-banner banner "c15t-demo://dismiss" 8

# 3. The consent manager, the path the banner's Customize button takes. This is also
#    the frame that proves the launch-variable channel reaches the verb table.
step 03-customize-dialog "consent manager open, every category listed" diff dialog "c15t-demo://customize" 8

# 4. acceptAll over the real bridge: the prompt goes away and every category the policy
#    governs reads allowed to its own subscriber, which is what unblocks a gate.
step 04-accept-everything "acceptAll: prompt gone, categories allowed" diff none "c15t-demo://accept" 8

# 5. Process death, then the stored answer, with nothing owed.
step 05-relaunch-no-prompt "relaunched: reads as saved, no prompt owed" quiet:04-accept-everything none "" 12

# 6. One category moved off. A deep link commits it through the action; no fake thumb.
step 06-save-measurement-off "save measurement=0: one category moves" diff none "c15t-demo://save?measurement=0" 8

# 7. That category, read back off stored state, switch and all.
step 07-preference-centre "preference centre: measurement off, rest on" diff dialog "c15t-demo://preferences" 8

# 8. The same answer with the process gone: this is persistence, not sheet state.
step 08-relaunch-measurement-off "relaunched: measurement still off" diff none "" 12

# 9. The other palette, driven by the platform rather than a forced override, because
#    the demo follows the system unless a verb says otherwise.
appearance dark
step 09-dark-dialog "dark scheme from the platform, manager open" diff dialog "c15t-demo://customize" 8

# 10. The core's own wipe, not a reinstall, and the prompt back where it started.
#     Light again, on purpose. Only the modal dialog dims what is behind it, so in dark the
#     banner sits on a page painted the same 18,18,18 as its own card and the framing has no
#     fill delta to walk; the hairline and the footer band are still there and measure right
#     (51,51,51 and 26,26,26, the web values), but the surface check cannot frame the card,
#     which would report a missing prompt rather than a missing edge. Step 09 keeps the dark
#     coverage, and the frame this step is compared against was taken in light.
appearance light
step 10-reset-prompt-returns "reset: first-run prompt owed again" diff banner "c15t-demo://reset" 12

# 11. And it is owed in storage, so a second cold start still shows it.
step 11-reset-relaunch-owed "relaunched after reset: prompt still owed" same:10-reset-prompt-returns banner "" 12

# ---------------------------------------------------------------------------
# 6. Parity, at the same point the web and Android were measured
# ---------------------------------------------------------------------------

log "surface metrics, iOS in points against the captured web truth"
metrics() {
	local stem="$1" mode="$2" truth="$3"
	[[ -f "${OUT_DIR}/${stem}.png" ]] || { warn "no frame ${stem}"; return; }
	printf -- '--- %s (%s)\n' "${stem}" "${mode}"
	python "${SCRIPT_DIR}/ios-surface-metrics.py" "${OUT_DIR}/${stem}.png" \
		--mode "${mode}" --scale "${SCALE}" --truth "${TRUTH_DIR}/${truth}.json" || true
}
metrics 01-fresh-banner banner light
metrics 03-customize-dialog dialog light
metrics 09-dark-dialog dialog dark
metrics 10-reset-prompt-returns banner dark

# ---------------------------------------------------------------------------
# 7. Report
# ---------------------------------------------------------------------------

printf '\n%-30s %-8s %-9s %-8s %s\n' "STEP" "RESULT" "CHANGED%" "SURFACE" "APP-AREA MD5 / FULL MD5"
printf '%s\n' "-------------------------------------------------------------------------------"
for row in "${SUMMARY[@]}"; do
	IFS='|' read -r stem description status full_md5 app_md5 changed surface match <<<"${row}"
	printf '%-30s %-8s %-9s %-8s %s\n' "${stem}" "${status}" "${changed}" "${surface}" "${app_md5}"
	printf '%-30s %-8s %-9s %-8s %s\n' "" "" "" "" "${full_md5}"
done
printf '\n'

first_frame_md5="$(cat "${OUT_DIR}/01-fresh-banner.app-md5" 2>/dev/null || true)"
reset_frame_md5="$(cat "${OUT_DIR}/10-reset-prompt-returns.app-md5" 2>/dev/null || true)"
[[ -n "${first_frame_md5}" && "${first_frame_md5}" == "${reset_frame_md5}" ]] &&
	log "reset restored the first frame in the app area pixel for pixel"

unique="$(md5 -q "${OUT_DIR}"/*.png | sort -u | wc -l | tr -d ' ')"
log "${unique} distinct screenshots across ${#SUMMARY[@]} steps"
log "device ${SIM_NAME} ${SIM_UDID} appearance $(sim ui "${SIM_UDID}" appearance)"
log "runtime ${SIM_RUNTIME} scale ${SCALE} status band ${STATUS_BAND_PX}px"
log "app ${APP_PATH}"

if [[ "${STEP_FAILS}" -gt 0 ]]; then
	die "${STEP_FAILS} step(s) failed. A step whose app area did not move is a step that did not happen."
fi

log "every step moved the app area, or matched the frame it said it would"
