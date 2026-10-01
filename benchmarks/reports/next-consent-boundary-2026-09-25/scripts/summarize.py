"""Summarize paint.mjs output: median [min-max] per arm and scenario.

Usage: python3 summarize.py results/paint-native-docs.json [...]
"""
import json
import statistics
import sys

FIELDS = [
    ("ttfb", "shell (TTFB)"),
    ("srv", "server resolved"),
    ("contentInDomAt", "content chunk in DOM"),
    ("revealAt", "first $RV (any boundary)"),
    ("contentVisibleAt", "page content revealed"),
    ("cssDoneAt", "CSS done"),
    ("fcp", "FCP"),
    ("lcp", "LCP"),
    ("hydratedAt", "hydrated (probe)"),
    ("bannerVisibleDomAt", "banner in DOM"),
    ("bannerReadyMs", "banner ready (hydrated)"),
    ("promptSettledMs", "policy settled"),
]


def val(row, key):
    if key == "srv":
        s = row.get("server")
        return s and s.get("resolvedRel")
    return row.get(key)


def fmt(values):
    values = [v for v in values if v is not None]
    if not values:
        return "–"
    return f"{statistics.median(values):.0f} [{min(values):.0f}–{max(values):.0f}]"


def main(paths):
    for path in paths:
        data = json.load(open(path))
        rows = [r for r in data["rows"] if "error" not in r]
        errors = [r for r in data["rows"] if "error" in r]
        print(f"## {path}")
        print(f"condition={data['condition']} route={data['route']} samples/arm={data['samples']}")
        print(f"load start: {data['startLoad']}")
        print(f"load end:   {data.get('endLoad')}")
        for scen, loads in (data.get("loadAt") or {}).items():
            print(f"  {scen}: {loads.get('start','')[-40:]} -> {loads.get('end','')[-40:]}")
        if errors:
            print(f"errors: {len(errors)}")
        arms = [a["label"] for a in data["arms"]]
        scenarios = []
        for r in rows:
            if r["scenario"] not in scenarios:
                scenarios.append(r["scenario"])
        for scen in scenarios:
            print(f"\n### {scen}")
            print("| metric | " + " | ".join(arms) + " |")
            print("| --- | " + " | ".join("---:" for _ in arms) + " |")
            for key, label in FIELDS:
                cells = []
                for arm in arms:
                    sel = [r for r in rows if r["arm"] == arm and r["scenario"] == scen]
                    cells.append(fmt([val(r, key) for r in sel]))
                print(f"| {label} | " + " | ".join(cells) + " |")
            cells = []
            for arm in arms:
                sel = [r for r in rows if r["arm"] == arm and r["scenario"] == scen]
                slow = sum(
                    1
                    for r in sel
                    if r.get("contentVisibleAt") is not None
                    and r.get("contentInDomAt") is not None
                    and r["contentVisibleAt"] - r["contentInDomAt"] >= 80
                )
                cells.append(f"{slow}/{len(sel)}")
            print("| content held >=80 ms after arrival | " + " | ".join(cells) + " |")
            cells = []
            for arm in arms:
                sel = [r for r in rows if r["arm"] == arm and r["scenario"] == scen]
                cells.append(f"{sum(1 for r in sel if r.get('bannerPresent'))}/{len(sel)}")
            print("| banner shown | " + " | ".join(cells) + " |")
            cells = []
            for arm in arms:
                sel = [r for r in rows if r["arm"] == arm and r["scenario"] == scen]
                n = sel[0]["cssCount"] if sel else 0
                b = sel[0]["cssTransfer"] if sel else 0
                cells.append(f"{n} / {b}")
            print("| CSS files / bytes | " + " | ".join(cells) + " |")
        print()


if __name__ == "__main__":
    main(sys.argv[1:])
