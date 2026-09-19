#!/usr/bin/env bash
#
# Prove the c15t consent journey on a connected Android device, end to end, in one command.
#
#   examples/react-native-bare/scripts/android-journey.sh
#
# This is the Android half of the same proof ios-journey.sh gives you. Android hands a
# c15t-demo:// link to the app without a confirmation, so verbs go in as real deep links and
# no launch-variable workaround is needed.
#
# What each step asserts is read out of the view hierarchy (uiautomator), not off a
# screenshot, so a step that rendered the wrong thing fails on the word it got rather than on
# a frame the reader has to compare by eye. Screenshots are written alongside anyway.
#
# The device is cleared with `pm clear`, which is enough on Android: unlike iOS, the core's
# stored envelope lives in app storage, so there is no Keychain item that outlives it.
#
# Environment:
#
#   ANDROID_SERIAL   device serial when more than one is attached
#   JOURNEY_OUT      where frames and receipts land   (default /tmp/android-journey/<worktree>)
#   JOURNEY_BACKEND  consent backend to check first   (default http://localhost:3000)
#   ADB              adb binary to use

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${APP_DIR}/../.." && pwd)"

PKG="com.c15t.bare"
ACTIVITY="${PKG}/com.c15t.bare.MainActivity"
OUT_DIR="${JOURNEY_OUT:-/tmp/android-journey/$(basename "${REPO_ROOT}")}"
BACKEND_URL="${JOURNEY_BACKEND:-http://localhost:3000/api/self-host}"

log() { printf '==> %s\n' "$*"; }
die() { printf 'fail %s\n' "$*" >&2; exit 1; }

ADB="${ADB:-}"
if [[ -z "${ADB}" ]]; then
	for candidate in \
		"$(command -v adb 2>/dev/null || true)" \
		"${ANDROID_HOME:-}/platform-tools/adb" \
		"${HOME}/Library/Android/sdk/platform-tools/adb"; do
		[[ -n "${candidate}" && -x "${candidate}" ]] && { ADB="${candidate}"; break; }
	done
fi
[[ -n "${ADB}" ]] || die "no adb found. Set ADB or ANDROID_HOME."

# ---------------------------------------------------------------------------
# 0. The backend has to be there, or nothing below means anything
# ---------------------------------------------------------------------------

curl -fsS -m 10 -o /dev/null "${BACKEND_URL}/init" ||
	die "the consent backend is not answering at ${BACKEND_URL}. Start it with:
      bun run --cwd examples/demo dev:localhost --port 3000
    Without it the core resolves nothing and no prompt is ever owed, which looks exactly
    like a banner that never ships."

# ---------------------------------------------------------------------------
# 1. One device, chosen on purpose
# ---------------------------------------------------------------------------

devices="$("${ADB}" devices | awk 'NR>1 && $2=="device" {print $1}')"
count="$(printf '%s\n' "${devices}" | grep -c . || true)"

if [[ -n "${ANDROID_SERIAL:-}" ]]; then
	SERIAL="${ANDROID_SERIAL}"
elif [[ "${count}" == "1" ]]; then
	SERIAL="${devices}"
else
	"${ADB}" devices
	die "${count} devices attached. Set ANDROID_SERIAL to the one this run should drive."
fi

# Two runs driving one device read each other's screens, so one of them reports a step that
# never happened. The lock is per serial, which is the thing actually being fought over.
LOCK_DIR="${TMPDIR:-/tmp}c15t-android-journey-${SERIAL}.lock"
mkdir "${LOCK_DIR}" 2>/dev/null ||
	die "another run already drives ${SERIAL}. Its lock is ${LOCK_DIR}."
trap 'rmdir "${LOCK_DIR}" 2>/dev/null || true' EXIT

log "device ${SERIAL}, frames in ${OUT_DIR}"
mkdir -p "${OUT_DIR}"
rm -f "${OUT_DIR}"/*.png "${OUT_DIR}"/*.xml

# Quoting guard. Every parameterised verb below depends on the device's `sh`
# receiving an ampersand rather than reading it as "run the rest in the
# background", and a shell that eats it fails quietly: `save?experience=1&
# marketing=0` arrives as `save?experience=1`, the denial is never recorded, and
# the step reports green while grading a different save than the one it names.
# Say so once, here, instead of leaving it to be discovered as a wrong assertion.
amp="$(
	"${ADB}" -s "${SERIAL}" shell "printf %s 'a&b'" 2>/dev/null |
		tr -d '\r\n'
)"
[[ "${amp}" == "a&b" ]] ||
	die "${SERIAL}: its shell returned ${amp:-<empty>} for a quoted 'a&b', so link() would truncate every verb that carries a second parameter"

FAILED=0

# texts <name>: dump the hierarchy and print the distinct strings on screen
#
# --windows, so the saved evidence carries the status bar window and android-surface-metrics.py
# can grade a frame after the device is gone. The remote file is removed before the dump
# because a failed dump leaves the previous one in place, and `cat` would hand back the screen
# from the step before: the needles would match, and the step that never rendered would report
# green.
texts () {
	local name="$1"
	"${ADB}" -s "${SERIAL}" shell rm -f /sdcard/journey.xml >/dev/null 2>&1 || true
	"${ADB}" -s "${SERIAL}" shell uiautomator dump --windows /sdcard/journey.xml >/dev/null 2>&1 || true
	"${ADB}" -s "${SERIAL}" shell cat /sdcard/journey.xml >"${OUT_DIR}/${name}.xml" 2>/dev/null || true
	python3 - "${OUT_DIR}/${name}.xml" <<'PY'
import re, sys
try:
    tree = open(sys.argv[1], encoding='utf-8', errors='replace').read()
except OSError:
    print('<no hierarchy>')
    raise SystemExit(0)
seen = []
for value in re.findall(r'text="([^"]+)"', tree):
    if value not in seen:
        seen.append(value)
print(' | '.join(seen[:24]))
PY
}

# parity <name> <banner|dialog>: grade the geometry of the surface this step is standing on.
#
# The text assertions prove the right words are somewhere on screen. This proves the surface
# is built to the web's measurements, which no amount of grep can tell. It reads the live
# screen, so it belongs inside the step, while that step's surface is still up: a later pass
# over the saved frames would grade whatever the next step had already put there and call it
# the previous one.
parity () {
	local name="$1" mode="$2"
	printf -- '--- %s (%s)\n' "${name}" "${mode}"
	python3 "${SCRIPT_DIR}/android-surface-metrics.py" --serial "${SERIAL}" --mode "${mode}" |
		tee "${OUT_DIR}/${name}-metrics.txt" || true
	grep -q '^RESULT MATCH$' "${OUT_DIR}/${name}-metrics.txt" || {
		log "FAIL: ${name} geometry is not at web parity"
		FAILED=$((FAILED + 1))
	}
}

# capture <name>
#
# exec-out, not exec-screencap. The latter runs screencap through the device shell, which
# rewrites the PNG's line endings on the way out and leaves a zero-byte file behind: the run
# reports every step green while writing no frames at all, and the frames are the half of the
# evidence a human can check. exec-out keeps the stream binary.
capture () {
	local png="${OUT_DIR}/${1}.png"
	if ! "${ADB}" -s "${SERIAL}" exec-out screencap -p >"${png}" 2>/dev/null ||
		[[ ! -s "${png}" ]]; then
		"${ADB}" -s "${SERIAL}" shell screencap -p /sdcard/journey.png >/dev/null 2>&1 &&
			"${ADB}" -s "${SERIAL}" pull /sdcard/journey.png "${png}" >/dev/null 2>&1
	fi
	[[ -s "${png}" ]] || die "no screenshot for step $1 in ${png}"
}

# die_if_dead <name>: the app can fail before JavaScript, and then every consent label is
# missing for a reason that has nothing to do with consent. Both journey scripts rebuild
# @c15t/react-native, and the debug Android app is served that same dist over Metro, so a run
# that starts while another worktree is rebuilding lands on a dead instance. Saying so beats
# reporting that the banner never appeared.
die_if_dead () {
	local xml="${OUT_DIR}/${1}.xml"
	if grep -qE "loadJSBundleFromAssets|ReactHostImpl|JSBundleLoader|Unable to load script" \
		"${xml}" 2>/dev/null; then
		rm -f "${xml}"
		die "the app on ${SERIAL} crashed loading its JavaScript bundle, so nothing below this line could mean anything. Another build was probably replacing @c15t/react-native mid-run. Wait for it and re-run."
	fi
}

# expect <name> <description> <needle>...: every needle must be on screen
expect () {
	local name="$1" description="$2"
	shift 2
	local missing=""
	for needle in "$@"; do
		grep -qF -- "${needle}" "${OUT_DIR}/${name}.xml" || missing="${missing} ${needle}"
	done
	if [[ -n "${missing}" ]]; then
		printf '  [FAIL] %-46s missing:%s\n' "${description}" "${missing}"
		FAILED=$((FAILED + 1))
	else
		printf '  [ ok ] %-46s %s\n' "${description}" "$*"
	fi
}

# forbid <name> <description> <needle>...: none of them may be on screen
forbid () {
	local name="$1" description="$2"
	shift 2
	local present=""
	for needle in "$@"; do
		grep -qF -- "${needle}" "${OUT_DIR}/${name}.xml" && present="${present} ${needle}"
	done
	if [[ -n "${present}" ]]; then
		printf '  [FAIL] %-46s still on screen:%s\n' "${description}" "${present}"
		FAILED=$((FAILED + 1))
	else
		printf '  [ ok ] %-46s absent: %s\n' "${description}" "$*"
	fi
}

# link <verb> [seconds]: cold-start the app on one deep link, so each step survives process
# death and no step inherits the previous step's JavaScript instance.
#
# The URI carries a second layer of shell. `adb shell` joins its arguments and hands the
# result to the device's `sh`, which reads a bare `&` as "run the rest in the background"
# and truncates the link at it: `save?experience=1&marketing=0` reached the app as
# `save?experience=1`, so the denial was never recorded and the step silently graded a
# different save than the one it names. The inner single quotes are for that shell.
link () {
	"${ADB}" -s "${SERIAL}" shell am force-stop "${PKG}" >/dev/null 2>&1
	sleep 1
	"${ADB}" -s "${SERIAL}" shell am start -a android.intent.action.VIEW \
		-d "'c15t-demo://${1}'" >/dev/null 2>&1
	sleep "${2:-8}"
}

relaunch () {
	"${ADB}" -s "${SERIAL}" shell am force-stop "${PKG}" >/dev/null 2>&1
	sleep 1
	"${ADB}" -s "${SERIAL}" shell am start -n "${ACTIVITY}" >/dev/null 2>&1
	sleep "${1:-12}"
}

banner_texts=("We value your privacy" "Accept All" "Reject All" "Customize")
dialog_texts=("Privacy Settings" "Strictly Necessary" "Functionality" "Analytics" "Marketing" "Save Settings")

# ---------------------------------------------------------------------------
# 2. The journey
# ---------------------------------------------------------------------------

log "step 1: cleared app, first run owes a decision"
"${ADB}" -s "${SERIAL}" shell am force-stop "${PKG}" >/dev/null 2>&1
"${ADB}" -s "${SERIAL}" shell pm clear "${PKG}" >/dev/null 2>&1
sleep 2
"${ADB}" -s "${SERIAL}" shell am start -n "${ACTIVITY}" >/dev/null 2>&1
sleep 28
capture 01-fresh-banner
texts 01-fresh-banner >/dev/null
die_if_dead 01-fresh-banner
expect 01-fresh-banner "fresh install: banner owing a decision" "${banner_texts[@]}"
parity 01-fresh-banner banner

log "step 2: customize opens the consent manager"
link "customize" 8
capture 02-customize-dialog
texts 02-customize-dialog >/dev/null
die_if_dead 02-customize-dialog
expect 02-customize-dialog "consent manager lists every category" "${dialog_texts[@]}"
parity 02-customize-dialog dialog

log "step 3: save a per-category set"
link "save?experience=1&marketing=0" 10
capture 03-saved
texts 03-saved >/dev/null
die_if_dead 03-saved
expect 03-saved "save left the app screen readable" "WHAT THIS APP USES" "Experience"

log "step 4: a decision was given, so nothing is owed"
relaunch 14
capture 04-relaunch-no-prompt
texts 04-relaunch-no-prompt >/dev/null
die_if_dead 04-relaunch-no-prompt
forbid 04-relaunch-no-prompt "relaunched: no prompt owed" "We value your privacy" "Accept All"
expect 04-relaunch-no-prompt "relaunched: the choice survived" "WHAT THIS APP USES" "Experience"

log "step 5: reset owes the first-run prompt again"
link "reset" 12
capture 05-reset
texts 05-reset >/dev/null
die_if_dead 05-reset
expect 05-reset "reset: first-run prompt owed again" "${banner_texts[@]}"
parity 05-reset banner

printf '\n'
if [[ "${FAILED}" == "0" ]]; then
	log "all steps passed on ${SERIAL}. Frames and hierarchies in ${OUT_DIR}"
else
	die "${FAILED} assertion(s) failed on ${SERIAL}. Hierarchies in ${OUT_DIR}"
fi
