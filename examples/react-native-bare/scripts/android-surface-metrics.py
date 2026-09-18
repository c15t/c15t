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

--mode iab-drawer grades the full-page IAB disclosure instead of a banner or a dialog,
against the web iab-panel figures recorded in WEB_IAB. Open it with the demo link
`c15t-demo://iab` (the partner list, which is what the web's `{count} partners` link
opens) or `c15t-demo://iab/purposes`. The gap between purpose rows is only gradeable on
the purposes tab and the row pitch only on the partners tab, because the purposes rows
differ in height and the partner rows do not; whichever half is not on screen is
printed under NOT MEASURED rather than quietly dropped.
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

# What the web IAB disclosure measures, in CSS px, and where each figure came from.
# Every one is a `getBoundingClientRect()` read out of the live `examples/demo` app at
# 411 x 914, forced light, scenario `preset-europe-iab`, against the fixture in
# /tmp/ui-parity/truth/iab-light.json (purposes tab) and iab-light-vendors.json
# (vendors tab). Nothing here is read out of the CSS by eye.
WEB_IAB = {
    "card_inset": 16.0,  # iab-consent-dialog-card x, and the right gap
    "tab_button": 170.5,  # button.tabButton w
    "tab_button_height": 32.0,  # button.tabButton h
    "tab_list_height": 40.0,  # div.tabsList h
    "purpose_row_height": 78.0,  # purpose-item-1 h, a two-line name
    "vendor_row_height": 58.0,  # div.vendorListItem-* h, 168 of 168 rows
    "vendor_row_pitch": 64.0,  # consecutive div.vendorListItem-* tops
    "button_height": 35.5,  # button.button h
    "button_column_gap": 16.0,  # div.actionGroup column-gap
    "action_row_gap": 16.0,  # div.footer.actionRoot row-gap, not the dialog's 8
    "footer_height": 112.0,  # div.footer.actionRoot h, at no bottom band
}

# The drawer's own contract. Its card is a page and not a floating card, so the inset
# is zero on both sides: the web's 16.0 is `.root { padding: 16 }` around a centred
# dialog, which is the one thing this presentation exists to avoid. Everything else
# here is the web's figure, taken from WEB_IAB.
EXPECTED_IAB = {
    "card_left": (0.0, 2.0),
    "card_right_gap": (0.0, 2.0),
    "tab_height": (WEB_IAB["tab_button_height"], 2.0),
    "tab_list_height": (WEB_IAB["tab_list_height"], 2.0),
    # The web's 86 pitch is one row's own height plus its gap, and a row's height is
    # however many lines its name wraps to on this device. The gap is the half that
    # travels between devices, and 86 - 78 is where the web's 8 comes from.
    "purpose_row_gap": (8.0, 2.0),
    "vendor_row_pitch": (WEB_IAB["vendor_row_pitch"], 3.0),
    "button_height": (WEB_IAB["button_height"], 2.5),
    "button_column_gap": (WEB_IAB["button_column_gap"], 2.5),
    # 16 and not the 8 the banner and dialog footers grade at: `.actionRoot` is
    # `gap: 1rem`, and only `[data-split]` drops the web's own step to .5rem.
    "action_row_gap": (WEB_IAB["action_row_gap"], 2.5),
}

TABLES = {"banner": EXPECTED, "dialog": EXPECTED, "iab-drawer": EXPECTED_IAB}

# A purpose, a stack, and the locked section all put their partner count on the second
# line and nothing else does, so this selects a row without naming a row.
PARTNERS_META = re.compile(r"^\d+ partners$")
# A partner row on the vendors tab is the only one that counts its claims instead.
CLAIMS_META = re.compile(r"^\d+ purposes?(, \d+ special)?(, \d+ features?)?$")
IAB_ACTIONS = {"Reject All", "Accept All", "Save Settings"}
IAB_TAB = re.compile(r"^(Purposes|Vendors) \(\d+\)$")

GUTTER = 16.0  # --gutter, off every safe-area edge
TAB_HEIGHT = 28.0  # the branding tab, hung below the card
BOTTOM_BAND_FLOOR = 44.0  # RESERVED_BOTTOM_INSET, use-consent-safe-area.ts
BOTTOM_BAND_TOLERANCE = 3.0
WEB_WIDTH = 411.0  # the viewport every WEB_IAB figure was taken at

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


def modal(values):
    """The most repeated value, so one wrapped row name cannot set the pitch."""
    counts = {v: values.count(v) for v in set(values)}
    return max(sorted(counts), key=lambda v: counts[v]) if counts else None


def measure_iab(
    nodes, win_w, nav_inset, contains, clickable_ancestor, metric, check, reported
):
    """Grade the IAB disclosure drawer, whose rows are found by what they say.

    React Native's `testID` does not reach a `uiautomator` dump on this build: the
    dumps this script has ever read carry no app resource-ids at all. So the model's
    `purpose-item-1` cannot be looked up here and the rows are identified by their
    own second line instead, which is what the web's `data-testid` sits on. That
    picks out the same rows without naming a single purpose or partner.

    @param nodes - Every node in the app window, in points.
    @param win_w - Window width in points.
    @param nav_inset - Bottom band the surface lays out against, in points.
    @param contains - Does an outer box hold an inner one.
    @param clickable_ancestor - The control a text node sits inside.
    @param metric - Record one graded measurement.
    @param check - Record one pass or fail.
    @returns What was found for the JSON report, and why the screen does not carry a
      drawer. A reason means exit 2: the drawer was not there to measure.
    """
    actions = [n for n in nodes if n["text"] in IAB_ACTIONS]
    tabs = {}
    for node in nodes:
        named = IAB_TAB.match(node["text"]) or IAB_TAB.match(node["desc"])
        if named and named.group(1) not in tabs:
            tabs[named.group(1)] = clickable_ancestor(node) or node

    if len(tabs) < 2 or len(actions) < 3:
        return None, (
            f"no IAB drawer on screen: {len(tabs)} of the 2 tabs and {len(actions)} "
            f"of the 3 actions it owes were found"
        )

    anchors = [tabs["Purposes"]["box"], tabs["Vendors"]["box"]] + [
        a["box"] for a in actions
    ]
    holders = sorted(
        (n for n in nodes if all(contains(n["box"], a) for a in anchors)),
        key=lambda n: n["box"][2] * n["box"][3],
    )
    if not holders:
        return None, "the tabs and the actions are on screen but no card holds them"

    cx, cy, cw, ch = holders[0]["box"]
    print(f"card   x{cx:.1f} y{cy:.1f} w{cw:.1f} h{ch:.1f}")
    print(
        f"web    card inset {WEB_IAB['card_inset']} on a {WEB_WIDTH:.0f} viewport, which is "
        f"the centred dialog's gutter; the drawer is a page and takes 0"
    )
    metric("card_left", cx)
    metric("card_right_gap", win_w - (cx + cw))

    # The two tabs. Their height is the web's, but their width cannot be: the web
    # splits a 353pt list -- 411 less the dialog's 32 of side gutter -- and the
    # drawer splits its own, which is 32 wider. So the target is the web's own grid
    # (a 4 pad each side, a 4 gap, two 1fr tracks) over the list actually measured,
    # and the web's 170.5 is printed rather than asserted.
    for name, tab in sorted(tabs.items()):
        print(f"tab    {name} w{tab['box'][2]:.1f} h{tab['box'][3]:.1f}")
        metric("tab_height", tab["box"][3])
    (first, second) = (tabs["Purposes"]["box"], tabs["Vendors"]["box"])
    check(
        abs(first[2] - second[2]) <= 1.0,
        "the two tabs share a width",
        round(abs(first[2] - second[2]), 1),
        0.0,
        1.0,
    )

    lists = sorted(
        (
            n
            for n in nodes
            if n["box"][3] < 64
            and contains(n["box"], first)
            and contains(n["box"], second)
        ),
        key=lambda n: n["box"][2] * n["box"][3],
    )
    if lists:
        lx, ly, lw, lh = lists[0]["box"]
        metric("tab_list_height", lh)
        metric("tab_width", first[2], round((lw - 2 * 4 - 4) / 2, 1), 2.0)
    else:
        reported.append("tab_width and tab_list_height: the tabs' own list was not found")

    # The footer. It is the node that holds the three actions and is smaller than one,
    # so the web's 12 of top and bottom padding are inside the box being graded, and
    # the device's bottom band is added to the target rather than subtracted from the
    # measurement. The web's 112 carries a 1px border the RN sheet does not draw.
    footers = sorted(
        (
            n
            for n in nodes
            if all(contains(n["box"], a["box"]) for a in actions)
            and n["box"][3] < 132 + nav_inset
        ),
        key=lambda n: n["box"][2] * n["box"][3],
    )
    if footers:
        metric(
            "footer_height",
            footers[0]["box"][3],
            round(WEB_IAB["footer_height"] - 1.0 + nav_inset, 1),
            4.0,
        )
    else:
        reported.append("footer_height: no node wraps the three actions alone")

    rows = {}
    for action in actions:
        rows.setdefault(round(action["box"][1] / 6), []).append(action)
    ordered = sorted(rows.values(), key=lambda g: min(b["box"][1] for b in g))
    for group in ordered:
        group.sort(key=lambda b: b["box"][0])
        for a, b in zip(group, group[1:]):
            metric("button_column_gap", b["box"][0] - (a["box"][0] + a["box"][2]))
    for above, below in zip(ordered, ordered[1:]):
        lowest = max(b["box"][1] + b["box"][3] for b in above)
        metric("action_row_gap", min(b["box"][1] for b in below) - lowest)
    for action in actions:
        metric("button_height", action["box"][3])

    # The rows of whichever tab is on screen.
    selected = next(
        (
            n
            for n in nodes
            if (n["el"].get("selected") or "") == "true"
            and IAB_TAB.match(n["desc"] or n["text"])
        ),
        None
    )
    on_vendors = bool(
        selected and IAB_TAB.match(selected["desc"] or selected["text"]).group(1) == "Vendors"
    )
    meta = [
        n
        for n in nodes
        if (CLAIMS_META if on_vendors else PARTNERS_META).match(n["text"])
    ]
    headers = sorted(
        ((clickable_ancestor(n) or n) for n in meta), key=lambda n: n["box"][1]
    )
    if len(headers) < 2:
        reported.append(
            f"row pitch: only {len(headers)} gradable rows in view on the "
            f"{'vendors' if on_vendors else 'purposes'} tab"
        )
        return (
            {
                "card": [round(v, 1) for v in (cx, cy, cw, ch)],
                "actions": len(actions),
                "tab": "vendors" if on_vendors else "purposes",
                "rows": len(headers),
            },
            None,
        )

    pitch = [
        round(b["box"][1] - a["box"][1], 1) for a, b in zip(headers, headers[1:])
    ]
    gaps = [
        round(b["box"][1] - (a["box"][1] + a["box"][3]), 1)
        for a, b in zip(headers, headers[1:])
        if abs(a["box"][3] - b["box"][3]) <= 1.0
    ]
    print(f"row    tops {[round(h['box'][1], 1) for h in headers]}")
    print(f"pitch  {pitch}   gap {gaps}")

    if on_vendors:
        # Every web partner row is 58 tall and 64 pitch, 168 times over, because no
        # name in the sample GVL wraps at 263px. The drawer separates its rows by 8
        # where the web's `.vendorListItem` separates by 6 -- one gap part serves both
        # lists -- so the pitch lands ~2 over and the gap is reported, not graded.
        metric("vendor_row_pitch", modal(pitch))
        print(
            f"note   vendor row gap {modal(gaps) if gaps else 'n/a'} against the web's "
            f"6; recorded divergence, one gap part serves both lists"
        )
    elif gaps:
        # The purposes tab is where the web's 86 pitch was measured, and 86 is 78 plus
        # the storyboard's gap, so the gap is the half that transfers between devices:
        # a row's own height is however many lines its name wraps to.
        metric("purpose_row_gap", modal(gaps))
    else:
        reported.append(
            "purpose_row_gap: no two visible purpose rows are the same height, so no "
            "row-to-row gap can be taken between them"
        )

    return (
        {
            "card": [round(v, 1) for v in (cx, cy, cw, ch)],
            "actions": len(actions),
            "tab": "vendors" if on_vendors else "purposes",
            "rows": len(headers),
            "pitch": pitch,
            "gaps": gaps,
        },
        None,
    )


def measure(args):
    # A saved dump plus a named display is a complete record and needs no device.
    # The two have to arrive together: bounds mean nothing without the density that
    # produced them, which is the one thing a uiautomator XML never carries.
    offline = bool(args.from_xml and args.density_factor and args.screen)
    if not offline:
        if not args.serial:
            sys.exit(
                "no device named. Pass --serial, or set ANDROID_SERIAL. To grade a "
                "saved dump with no device, pass --from-xml with --density-factor "
                "and --screen too."
            )
        adb = resolve_adb(args.adb)

    def sh(*extra):
        return subprocess.run(
            [adb, "-s", args.serial, "shell", *extra],
            capture_output=True,
            text=True,
            check=False,
        ).stdout

    if offline:
        dsf = args.density_factor
        screen_w, screen_h = (int(v) for v in args.screen.lower().split("x"))
    else:
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
            want, tol = TABLES[args.mode][name]
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

    if args.mode == "iab-drawer":
        reported = []
        graded, missing = measure_iab(
            nodes,
            win_w,
            nav_inset,
            contains,
            clickable_ancestor,
            metric,
            check,
            reported,
        )
        if missing:
            return None, missing
        graded["web_truth"] = WEB_IAB
        graded["web_viewport_width"] = WEB_WIDTH
        findings.update(graded)
        if reported:
            findings["not_measured"] = reported
            print("NOT MEASURED  " + "  |  ".join(reported))
        return findings, checks

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
    ap.add_argument(
        "--mode", choices=("banner", "dialog", "iab-drawer"), default="banner"
    )
    ap.add_argument("--nav-inset", type=float, default=None)
    ap.add_argument("--status-inset", type=float, default=None)
    ap.add_argument("--adb")
    ap.add_argument("--from-xml", help="grade a saved uiautomator dump instead of the live screen")
    ap.add_argument(
        "--density-factor",
        type=float,
        help="with --from-xml: the dump's density over 160, e.g. 2.625",
    )
    ap.add_argument(
        "--screen",
        help="with --from-xml: the dump's device size in px, e.g. 1080x2400",
    )
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
