#!/usr/bin/env python3
"""Measure the c15t consent surfaces on an Android device against the web surfaces.

The iOS twin, ios-surface-metrics.py, has to read geometry off pixels because a headless
simulator hands back no view tree. Android gives us `uiautomator dump`, so the numbers here
come from real view bounds and are the more exact half of the pair.

Two bands decide where a surface sits, and this script gets them in two different ways:

- the status band is the device's own. With no host measurement the SDK takes it from
  `StatusBar.currentHeight`, which is exactly the status bar window the system reports:
  136px at density 2.625 is 51.8 points. It is read out of the dump, so it follows the
  device instead of a constant.
- the bottom band is the SDK's floor (`RESERVED_BOTTOM_INSET`, 44 points) and is NOT this
  device's navigation bar, which is 24 here. The bare example passes no insets to the
  provider, so its surfaces lay out against the floor on every device. Wire
  `react-native-safe-area-context` into the provider and the real bar applies instead; pass
  `--nav-inset` then, because a device read cannot tell you which of the two regimes the
  running app is in.

Both bands are printed on every run. A number an assertion leans on is never a silent default.

One thing this deliberately does not measure: the branding tab's width and height. The dump
reports the tab's touch target (122.3 x 27.8 points on this device), not the pill painted
inside it, so grading that rectangle against the web's 129.4 x 28 would fail on the wrong
box. The tab is checked for presence here and for geometry in the iOS screenshot pass.

Usage:
    android-surface-metrics.py --serial emulator-5554 [--mode banner|dialog]
                               [--nav-inset 44] [--status-inset 51.8] [--json]
    android-surface-metrics.py --serial emulator-5554 --mode dialog \
        --from-xml /tmp/android-journey/v3-3/02-customize-dialog.xml

Exit 0 when every measured metric is inside tolerance, 1 when one is not, and 2 when the
surface was not measured at all, because "not measured" must never read as "passed".
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path
import xml.etree.ElementTree as ET

# The same table ios-surface-metrics.py grades against, in points. The banner's bottom gap
# is absent on purpose: it is the gutter plus whichever bottom band is in force.
EXPECTED = {
    "card_left": (16.0, 2.0),
    "card_right_gap": (16.0, 2.0),
    "button_height": (35.5, 2.5),
    "button_column_gap": (16.0, 2.5),
    "action_row_gap": (8.0, 2.5),
    "row_pitch": (54.0, 3.0),
}

GUTTER = 16.0  # --gutter, off every safe-area edge
TAB_HEIGHT = 28.0  # the branding tab, hung below the card
BOTTOM_BAND_FLOOR = 44.0  # RESERVED_BOTTOM_INSET, use-consent-safe-area.ts
BOTTOM_BAND_TOLERANCE = 3.0

LABELS = {"Reject All", "Accept All", "Customize", "Save Settings", "Dismiss"}
CATEGORIES = {"Strictly Necessary", "Functionality", "Analytics", "Marketing", "Experience"}
BANNER_TITLE = "your privacy"
DIALOG_TITLE = "Privacy Settings"
DENSITY = re.compile(r"density: (\d+)")
BOUNDS = re.compile(r"\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]")
REMOTE_DUMP = "/sdcard/c15t-metrics.xml"


def resolve_adb(explicit):
    """Find adb the way android-journey.sh does, so the two agree on the device."""
    for candidate in (
        explicit,
        os.environ.get("ADB"),
        shutil.which("adb"),
        f"{os.environ.get('ANDROID_HOME', '')}/platform-tools/adb",
        f"{os.environ.get('ANDROID_SDK_ROOT', '')}/platform-tools/adb",
        f"{os.path.expanduser('~')}/Library/Android/sdk/platform-tools/adb",
    ):
        if candidate and os.access(candidate, os.X_OK):
            return candidate
    sys.exit("no adb found. Pass --adb, or set ADB or ANDROID_HOME.")


def measure(args):
    if not args.serial:
        sys.exit("no device named. Pass --serial, or set ANDROID_SERIAL.")
    adb = resolve_adb(args.adb)

    def sh(*extra):
        return subprocess.run(
            [adb, "-s", args.serial, "shell", *extra],
            capture_output=True,
            text=True,
            check=False,
        ).stdout

    density = DENSITY.search(sh("wm", "density"))
    size = re.search(r"(\d+)x(\d+)", sh("wm", "size"))
    if not density or not size:
        return None, "cannot read the display: is the device attached?"
    dsf = int(density.group(1)) / 160
    screen_w, screen_h = int(size.group(1)), int(size.group(2))
    win_w, win_h = screen_w / dsf, screen_h / dsf

    # One all-windows dump carries the app's tree and the system bands. Saved evidence
    # grades too, which is what lets android-journey.sh measure the screen a step was
    # actually on rather than whatever the next step had already put there.
    if args.from_xml:
        try:
            raw = Path(args.from_xml).read_text(encoding="utf-8", errors="replace")
        except OSError as error:
            return None, f"cannot read {args.from_xml}: {error}"
    else:
        sh("uiautomator", "dump", "--windows", REMOTE_DUMP)
        raw = sh("cat", REMOTE_DUMP)
        sh("rm", REMOTE_DUMP)

    app_window = None
    bands = {"status": 0, "nav": 0}

    if "<displays" in raw:
        for window in ET.fromstring(raw).iter("window"):
            box = BOUNDS.match(window.get("bounds", ""))
            if not box:
                continue
            left, top, right, bottom = (int(v) for v in box.groups())
            packages = {n.get("package") for n in window.iter("node")}
            if window.get("type") == "TYPE_APPLICATION" and window.get("focused") == "true":
                app_window = window
            elif "com.android.systemui" in packages and left == 0 and right >= screen_w:
                # The status bar hugs the top edge, the navigation bar the bottom one.
                if top == 0 and bottom < screen_h // 4:
                    bands["status"] = max(bands["status"], bottom)
                elif bottom >= screen_h and top > screen_h * 3 // 4:
                    bands["nav"] = max(bands["nav"], bottom - top)
        if app_window is None:
            return None, "the app owns no focused window"
    elif "<hierarchy" in raw:
        # A single-window dump carries the app's tree and none of the chrome, so the status
        # band has to be named rather than read off the device.
        app_window = ET.fromstring(raw)
    else:
        return None, f"no view hierarchy in {args.from_xml or 'the device dump'}"
    if args.status_inset is None and bands["status"] == 0:
        return None, (
            "no status bar in this dump. Pass --status-inset with the band in points "
            "(the device reports one as its status bar window height); assuming none "
            "would move every vertical metric by it"
        )

    status_inset = args.status_inset if args.status_inset is not None else bands["status"] / dsf
    nav_inset = args.nav_inset if args.nav_inset is not None else BOTTOM_BAND_FLOOR

    parent = {c: p for p in app_window.iter("node") for c in p}
    nodes = []
    for node in app_window.iter("node"):
        box = BOUNDS.match(node.get("bounds", ""))
        if not box:
            continue
        left, top, right, bottom = (int(v) for v in box.groups())
        nodes.append(
            {
                "el": node,
                "text": (node.get("text") or "").strip(),
                "desc": (node.get("content-desc") or "").strip(),
                "box": (left / dsf, top / dsf, (right - left) / dsf, (bottom - top) / dsf),
                "clickable": node.get("clickable") == "true",
            }
        )

    def contains(outer, inner):
        return (
            outer[0] <= inner[0] + 1
            and outer[1] <= inner[1] + 1
            and outer[0] + outer[2] >= inner[0] + inner[2] - 1
            and outer[1] + outer[3] >= inner[1] + inner[3] - 1
        )

    def clickable_ancestor(node):
        current = parent.get(node["el"])
        while current is not None:
            found = next((x for x in nodes if x["el"] is current), None)
            if found and found["clickable"]:
                return found
            current = parent.get(current)
        return None

    checks = []

    def check(ok, name, got, want, tol=0):
        checks.append((bool(ok), name, got, want, tol))

    def metric(name, value, want=None, tol=None):
        if want is None:
            want, tol = EXPECTED[name]
        checks.append((abs(value - want) <= tol, name, round(value, 1), want, tol))

    findings = {
        "screen": {"width": round(win_w, 1), "height": round(win_h, 1), "density": round(dsf, 3)},
        "bands": {
            "status": round(status_inset, 1),
            "status_source": "given" if args.status_inset is not None else "device",
            "nav": round(nav_inset, 1),
            "nav_source": "given" if args.nav_inset is not None else "sdk-floor",
            "nav_device": round(bands["nav"] / dsf, 1) if bands["nav"] else None,
        },
    }
    # A gesture bar ships no window of its own, so "no reading" is its own answer
    # rather than a band of zero.
    device_band = f"{bands['nav'] / dsf:.1f}" if bands["nav"] else "no window"
    print(
        f"screen {win_w:.1f}x{win_h:.1f} css px (density factor {dsf:.3f})\n"
        f"bands  status {status_inset:.1f} ({findings['bands']['status_source']})   "
        f"bottom {nav_inset:.1f} ({findings['bands']['nav_source']}, "
        f"device reports {device_band})"
    )

    labels = [n for n in nodes if n["text"] in LABELS]
    title = next(
        (n for n in nodes if BANNER_TITLE in n["text"] or n["text"] == DIALOG_TITLE), None
    )
    tab = next((n for n in nodes if "Secured by" in n["text"] + n["desc"]), None)
    findings["surface_found"] = tab is not None and title is not None
    print(f"actions {[n['text'] for n in labels]}")

    if not findings["surface_found"]:
        check(False, "consent surface on screen", "not found", "found")
        return findings, checks

    buttons = []
    for label in labels:
        button = clickable_ancestor(label) or label
        if button not in buttons:
            buttons.append(button)
    for button in buttons:
        drawn = any(n is not button and contains(button["box"], n["box"]) and n["text"] for n in nodes)
        check(drawn, "action has a drawn label", button["text"] or button["desc"], "a label")

    heights = sorted(round(b["box"][3], 1) for b in buttons)
    print(f"action heights {heights}")
    for height in heights:
        metric("button_height", height)

    columns = {}
    for button in buttons:
        columns.setdefault(round(button["box"][1] / 6), []).append(button)
    for row in columns.values():
        row.sort(key=lambda b: b["box"][0])
        for first, second in zip(row, row[1:]):
            metric("button_column_gap", second["box"][0] - (first["box"][0] + first["box"][2]))

    stacked = []
    for button in sorted(buttons, key=lambda n: n["box"][1]):
        if stacked and abs(button["box"][1] - stacked[-1][0]["box"][1]) < 6:
            stacked[-1].append(button)
        else:
            stacked.append([button])
    for above, below in zip(stacked, stacked[1:]):
        lowest = max(x["box"][1] + x["box"][3] for x in above)
        metric("action_row_gap", min(x["box"][1] for x in below) - lowest)

    anchors = [title["box"]] + [b["box"] for b in buttons]
    framed = sorted(
        (n for n in nodes if n["box"][2] < win_w - 4 and all(contains(n["box"], a) for a in anchors)),
        key=lambda n: n["box"][2] * n["box"][3],
    )
    if not framed:
        check(False, "card framed around its contents", "not found", "found")
        return findings, checks

    # The smallest node holding the title and every action is the card itself. The wrapper
    # one level up also holds the branding tab, which is why the tab is measured separately.
    cx, cy, cw, ch = framed[0]["box"]
    print(f"card x{cx:.1f} y{cy:.1f} w{cw:.1f} h{ch:.1f}")
    metric("card_left", cx)
    metric("card_right_gap", win_w - (cx + cw))

    if args.mode == "dialog":
        spare_top = cy - (GUTTER + status_inset)
        spare_bottom = win_h - (cy + ch) - (GUTTER + nav_inset) - TAB_HEIGHT
        check(
            cy >= GUTTER + status_inset - 1,
            "clears the status band",
            round(cy, 1),
            f">= {GUTTER + status_inset:.1f}",
        )
        check(
            abs(spare_top - spare_bottom) <= 4,
            "centred between the bands",
            round(spare_top - spare_bottom, 1),
            0,
            4,
        )
    else:
        # Only a banner promises a gutter off the bottom edge.
        metric("card_bottom_gap", win_h - (cy + ch), GUTTER + nav_inset, BOTTOM_BAND_TOLERANCE)

    rows = [n for n in nodes if n["text"] in CATEGORIES]
    rows = [n for n in rows if contains((cx, cy, cw, ch), n["box"])]
    if args.mode == "dialog":
        rows.sort(key=lambda n: n["box"][1])
        if rows:
            print(f"category rows {[n['text'] for n in rows]}")
        check(len(rows) == 4, "four category rows", len(rows), 4)
        for first, second in zip(rows, rows[1:]):
            metric("row_pitch", second["box"][1] - first["box"][1])
    else:
        check(not rows, "banner lists no preferences", f"{len(rows)} rows", "none")

    dismissed = any(n["text"] == "Dismiss" for n in labels)
    check(not dismissed, "no invented Dismiss action", "present" if dismissed else "absent", "absent")
    return findings, checks


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--serial", default=os.environ.get("ANDROID_SERIAL"), help="adb device serial"
    )
    ap.add_argument("--mode", choices=("banner", "dialog"), default="banner")
    ap.add_argument("--nav-inset", type=float, default=None)
    ap.add_argument("--status-inset", type=float, default=None)
    ap.add_argument("--adb")
    ap.add_argument("--from-xml", help="grade a saved uiautomator dump instead of the live screen")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    findings, checks = measure(args)
    if findings is None:
        print(checks, file=sys.stderr)
        return 2

    findings["checks"] = [
        {"name": name, "got": got, "want": want, "tolerance": tol, "ok": ok}
        for ok, name, got, want, tol in checks
    ]
    matched = bool(checks) and all(ok for ok, *_ in checks)
    findings["result"] = "MATCH" if matched else "DIFFERS"

    if args.json:
        print(json.dumps(findings, indent=1))
    else:
        for ok, name, got, want, tol in checks:
            print(f"{'PASS' if ok else 'FAIL'}  {name}: {got} (want {want} +/-{tol})")
    print("RESULT", findings["result"])
    return 0 if matched else 1


if __name__ == "__main__":
    sys.exit(main())
