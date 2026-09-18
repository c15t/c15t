#!/usr/bin/env bash
#
# Prove the iOS consent journey end to end, in one command.
#
# It builds the fixture, creates a simulator that has never seen the app, walks the
# journey a reviewer would tap through, and leaves a numbered screenshot per step in
# $SHOT_DIR. Nothing here is a smoke test of the UI: iOS gives a headless run no way to
# tap a screen, so every step enters as a `c15t-demo://` link through the launch
# environment, which is the one channel that reaches JavaScript without the "Open in
# c15t Bare?" confirmation a machine cannot answer.
#
# The device is created from scratch on every pass, not uninstalled. `simctl uninstall`
# leaves the Keychain behind, and the consent snapshot lives in the Keychain, so a
# reinstalled app is not a fresh subject and never shows a prompt.
#
# Usage:
#
#   scripts/ios-consent-journey.sh                 # build, then both schemes
#   scripts/ios-consent-journey.sh --no-build      # reuse the last build
#   scripts/ios-consent-journey.sh --reuse         # erase the device, keep its identity
#   scripts/ios-consent-journey.sh --only light    # one scheme
#
# Environment:
#
#   SHOT_DIR        where screenshots and evidence land   (default /tmp/ios-proof)
#   DEVICE_NAME     simulator to own                      (default c15t-ios-proof)
#   DEVICE_MODEL    device type to create                 (default iPhone 17)
#   RUNTIME         full runtime identifier               (default newest iOS available)
#   BACKEND         consent backend to check first        (default http://localhost:3000)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_NAME="C15tBare"
BUNDLE_ID="org.reactjs.native.example.C15tBare"
SHOT_DIR="${SHOT_DIR:-/tmp/ios-proof}"
DEVICE_NAME="${DEVICE_NAME:-c15t-ios-proof}"
DEVICE_MODEL="${DEVICE_MODEL:-iPhone 17}"
RUNTIME="${RUNTIME:-}"
MAX_IOS_MAJOR="${MAX_IOS_MAJOR:-26}"
BACKEND="${BACKEND:-http://localhost:3000}"
INIT_URL="${BACKEND}/api/self-host/init"
DERIVED="${SHOT_DIR}/derived"

BUILD=1
REUSE=0
SCHEMES=(light dark)

while [[ $# -gt 0 ]]; do
	case "$1" in
		--no-build) BUILD=0 ;;
		--reuse) REUSE=1 ;;
		--only)
			shift
			SCHEMES=("$1")
			;;
		*)
			printf 'unknown argument: %s\n' "$1" >&2
			exit 2
			;;
	esac
	shift
done

mkdir -p "$SHOT_DIR/logs"

say() { printf '\033[1m==\033[0m %s\n' "$*"; }
die() { printf '\033[31mFAIL\033[0m %s\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# The journey. One row per screenshot: number, slug, link, seconds to settle.
#
# A link with `report=1` answers on the Diagnostics tab, which is the only way the
# receipt a verb writes is inside the frame that proves the step: the tab is app state,
# and the next launch resets it.
# ---------------------------------------------------------------------------
STEPS=(
	"01|first-run-banner||12"
	"02|consent-manager|customize|8"
	"03|preference-centre|preferences|8"
	"04|category-toggled-and-saved|save?measurement=1&marketing=0&report=1|9"
	"05|preference-centre-after-save|preferences|8"
	"06|decision-committed|accept?report=1|10"
	"07|relaunch-app-state||8"
	"08|relaunch-diagnostics|help?report=1|9"
)

# ---------------------------------------------------------------------------
# Backend
# ---------------------------------------------------------------------------
say "backend: $INIT_URL"
init_body="$(curl -sS -m 10 "$INIT_URL" || true)"
if ! grep -q '"policyResolution"' <<<"$init_body"; then
	printf '%s\n' "${init_body:0:300}" >&2
	die "the backend did not answer /init with a policy. Start it with:
  DATABASE_URL='postgres://postgres:c15t@localhost:5432/c15t' \\
    bun run --cwd examples/demo dev:localhost
Without it the core resolves nothing and no prompt is ever owed."
fi
printf 'policy resolved: %s\n' "$(grep -o '"policyId":"[^"]*"' <<<"$init_body" | head -1)"

# A warning, not a failure. The subject's prompt and the on-device receipts do not
# depend on this endpoint, and neither does anything this script screenshots, because
# the core acknowledges a commit locally and delivers it afterwards. A backend that
# cannot write is still worth saying out loud: it is the difference between a subject
# whose decision is stored and one whose decision only ever lived on the phone.
SAVE_URL="$BACKEND/api/self-host/subjects"
save_status="$(curl -sS -m 15 -o /dev/null -w '%{http_code}' \
	-X POST -H 'content-type: application/json' \
	-d '{"subjectId":"00000000-0000-4000-8000-000000000001","consents":{"measurement":true}}' \
	"$SAVE_URL" || echo 000)"
if [[ "$save_status" != "2"* ]]; then
	printf '\033[33mWARN\033[0m POST %s answered %s: this backend cannot record a consent write, so every decision on screen stays queued on the device. The journey below still proves the prompt and the on-device state.\n' "$SAVE_URL" "$save_status"
fi

# ---------------------------------------------------------------------------
# Build
#
# No CODE_SIGNING_ALLOWED=NO here, on purpose. A simulator build with signing turned off
# has no ad-hoc signature, and the core's Keychain writes then fail: the first-run
# banner still renders, because /init is a read, but every decision comes back
# `refused (queue-write-failed)`. Xcode's default ad-hoc signature is what lets the
# subject's answer be written at all.
# ---------------------------------------------------------------------------
if [[ "$BUILD" == "1" ]]; then
	say "build: $APP_NAME (Release, simulator)"
	# The React Native bundle phase is chatty, and its noise buries the journey output,
	# so the transcript goes next to the screenshots and the failure still stops the run.
	if ! xcodebuild -quiet \
		-workspace "$ROOT/ios/$APP_NAME.xcworkspace" \
		-scheme "$APP_NAME" \
		-configuration Release \
		-destination 'generic/platform=iOS Simulator' \
		-derivedDataPath "$DERIVED" \
		>"$SHOT_DIR/logs/build.log" 2>&1; then
		tail -30 "$SHOT_DIR/logs/build.log" >&2
		die "the build failed; full transcript in $SHOT_DIR/logs/build.log"
	fi
else
	[[ -d "$DERIVED/Build/Products/Release-iphonesimulator/$APP_NAME.app" ]] ||
		die "--no-build was passed and there is nothing in $DERIVED to reuse"
fi

APP="$DERIVED/Build/Products/Release-iphonesimulator/$APP_NAME.app"
[[ -f "$APP/main.jsbundle" ]] ||
	die "$APP has no main.jsbundle: the app would load its bundle from a Metro server someone else owns"

# ---------------------------------------------------------------------------
# Simulator
# ---------------------------------------------------------------------------
# Newest runtime, capped at iOS 26.
#
# iOS 27 turned UIKit's scene-lifecycle warning into a fatal one: an app whose
# `AppDelegate` builds its own `UIWindow` and ships no `UIApplicationSceneManifest` is
# killed on scene creation with SIGTRAP in
# `___UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`. React Native 0.87's
# template `AppDelegate` is exactly that, so this fixture runs on iOS 26 and dies on 27
# until the project adopts a scene delegate. Raise `MAX_IOS_MAJOR` once it does, and the
# run below says so out loud rather than picking a runtime the app cannot launch on.
if [[ -z "$RUNTIME" ]]; then
	RUNTIME="$(xcrun simctl list -j runtimes |
		bun -e '
			const data = await Bun.stdin.text();
			const cap = Number(process.argv[1]);
			const ios = (JSON.parse(data).runtimes ?? []).filter(
				(r) => r.isAvailable && r.identifier.startsWith("com.apple.CoreSimulator.SimRuntime.iOS"),
			);
			if (ios.length === 0) { console.error("no available iOS simulator runtime"); process.exit(1); }

			const major = (r) => Number((r.version ?? "0").split(".")[0]);
			const newest = (list) => [...list].sort((a, b) => major(a) - major(b) || a.version.localeCompare(b.version, undefined, { numeric: true })).at(-1);

			const usable = ios.filter((r) => major(r) <= cap);
			if (usable.length === 0) { console.error(`no iOS runtime at or below ${cap}`); process.exit(1); }

			const skipped = ios.filter((r) => major(r) > cap);
			if (skipped.length > 0) {
				const top = newest(skipped);
				console.error(`skipped ${top.identifier}: this app has no UIApplicationSceneManifest, so iOS ${major(top)} kills it on launch`);
			}

			console.log(newest(usable).identifier);
		' "$MAX_IOS_MAJOR")"
fi
printf 'runtime: %s\n' "$RUNTIME"

existing() { xcrun simctl list -j devices |
	bun -e '
		const data = await Bun.stdin.text();
		const wanted = process.argv[1];
		for (const list of Object.values(JSON.parse(data).devices)) {
			const found = list.find((d) => d.name === wanted);
			if (found) { console.log(found.udid); break; }
		}
	' "$DEVICE_NAME"; }

# Answer on stdout with the UDID and nothing else, so every progress line in here has
# to go to stderr or it ends up inside the identifier.
make_device() {
	local udid
	udid="$(existing)"

	if [[ -n "$udid" ]]; then
		xcrun simctl shutdown "$udid" >/dev/null 2>&1 || true

		if [[ "$REUSE" == "1" ]]; then
			# Erase clears the Keychain too, so the subject is still new. The device
			# identity stays, which is what --reuse is for.
			xcrun simctl erase "$udid"
			printf 'erased %s (%s)\n' "$DEVICE_NAME" "$udid" >&2
		else
			xcrun simctl delete "$udid"
			udid=""
		fi
	fi

	if [[ -z "$udid" ]]; then
		udid="$(xcrun simctl create "$DEVICE_NAME" "$DEVICE_MODEL" "$RUNTIME")"
		printf 'created %s (%s)\n' "$DEVICE_NAME" "$udid" >&2
	fi

	xcrun simctl bootstatus "$udid" -b >/dev/null
	printf '%s' "$udid"
}

launch() { # launch <udid> [link] -> echoes the app pid
	local udid="$1" link="${2:-}" line pid

	# `env` rather than a bare assignment: the assignment has to be on the same line as
	# the command it prefixes, and a link is long enough to want a continuation.
	if [[ -n "$link" ]]; then
		line="$(env "SIMCTL_CHILD_C15T_DEMO_LINK=c15t-demo://$link" \
			xcrun simctl launch --terminate-running-process "$udid" "$BUNDLE_ID")"
	else
		line="$(xcrun simctl launch --terminate-running-process "$udid" "$BUNDLE_ID")"
	fi

	pid="${line##*: }"
	[[ "$pid" =~ ^[0-9]+$ ]] || die "launch did not report a pid: $line"
	printf '%s' "$pid"
}

# A launch that reports a pid and then dies is the worst way a run can fail: every
# screenshot is then a clean picture of the home screen. Say which, and point at the
# crash report, rather than leaving eight PNGs to be interpreted.
assert_running() { # assert_running <pid> <step>
	local pid="$1" step="$2" crash reason

	kill -0 "$pid" 2>/dev/null && return 0

	crash="$(ls -t "$HOME"/Library/Logs/DiagnosticReports/"$APP_NAME"-*.ips 2>/dev/null | head -1)"
	reason="no crash report for $APP_NAME was found"

	if [[ -n "$crash" ]]; then
		reason="$(tail -n +2 "$crash" |
			bun -e '
				const j = JSON.parse(await Bun.stdin.text());
				const frame = (j.threads?.[j.faultingThread ?? 0]?.frames ?? [])[0];
				console.log(`${j.exception?.type ?? "unknown exception"} ${j.exception?.signal ?? ""} at ${frame?.symbol ?? "an unresolved frame"}`);
			' 2>/dev/null || echo "the crash report did not parse")"
	fi

	die "step $step: the app died on launch (pid $pid is gone).
  ${crash:+crash report: $crash}
  $reason"
}

# Sample who holds a socket to the backend while the app starts. The core resolves
# policy over the network, and this is the cheapest proof that the requests leave the
# native process rather than being answered by a cache or a stub.
watch_backend() { # watch_backend <pid> <seconds> <outfile>
	local pid="$1" seconds="$2" out="$3" i

	: >"$out"
	for ((i = 0; i < seconds * 10; i++)); do
		lsof -nP -iTCP:3000 -a -p "$pid" 2>/dev/null | tail -n +2 >>"$out" || true
		sleep 0.1
	done

	sort -u -o "$out" "$out"
}

native_log() { # native_log <udid> <outfile>
	local udid="$1" out="$2"

	xcrun simctl spawn "$udid" log show --style compact --last 12m \
		--predicate 'process == "C15tBare"' 2>/dev/null |
		grep -iE "c15t|self-host|SecItem|TransportSecurity|ATS" >"$out" || true
}

# ---------------------------------------------------------------------------
# Walk the journey once per colour scheme
# ---------------------------------------------------------------------------
for scheme in "${SCHEMES[@]}"; do
	case "$scheme" in
		light | dark) ;;
		*) die "--only takes light or dark, got $scheme" ;;
	esac

	say "pass: $scheme"
	frames=()
	UDID="$(make_device)"
	xcrun simctl ui "$UDID" appearance "$scheme"
	xcrun simctl install "$UDID" "$APP"

	for step in "${STEPS[@]}"; do
		IFS='|' read -r number slug link settle <<<"$step"
		png="$SHOT_DIR/$number-$slug-$scheme.png"
		pid="$(launch "$UDID" "$link")"

		assert_running "$pid" "$number $slug"

		if [[ "$number" == "01" ]]; then
			watch_backend "$pid" "$settle" "$SHOT_DIR/logs/$number-backend-connections-$scheme.txt"
		else
			sleep "$settle"
		fi

		xcrun simctl io "$UDID" screenshot "$png" >/dev/null
		[[ -s "$png" ]] || die "no screenshot written to $png"
		frames+=("$(md5 -q "$png")")
		printf '  %s  %-34s %s\n' "$number" "$slug" "${link:-(plain launch)}"
	done

	# A run where every step is the same picture proved nothing, however many files it
	# wrote: that is what a link that never reached JavaScript looks like.
	distinct="$(printf '%s\n' "${frames[@]}" | sort -u | wc -l | tr -d ' ')"
	[[ "$distinct" -ge 5 ]] ||
		die "only $distinct distinct frame(s) across ${#STEPS[@]} steps: the journey did not move"
	printf '  distinct frames: %s of %s\n' "$distinct" "${#STEPS[@]}"

	logfile="$SHOT_DIR/logs/native-$scheme.txt"
	native_log "$UDID" "$logfile"

	# The first-run banner only appears when policy arrived, so the request line is the
	# evidence that the journey on screen was a real consent journey.
	grep -q "api/self-host/init" "$logfile" ||
		die "the native core never requested $INIT_URL: see $logfile"

	# The socket sample belongs to step 01, the cold launch that resolves policy.
	sockets="$SHOT_DIR/logs/01-backend-connections-$scheme.txt"
	printf '  native requests logged: %s | sockets to the backend seen at launch: %s\n' \
		"$(grep -c "api/self-host" "$logfile" || true)" \
		"$(grep -c '3000 (ESTABLISHED)' "$sockets" 2>/dev/null || true)"

	xcrun simctl shutdown "$UDID" >/dev/null 2>&1 || true
done

say "done"
printf 'screenshots and evidence: %s\n' "$SHOT_DIR"
ls -1 "$SHOT_DIR"/*-*.png
