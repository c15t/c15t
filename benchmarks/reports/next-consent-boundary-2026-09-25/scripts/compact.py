"""Reduce paint.mjs, enforce.mjs and lh.mjs output to the committed results.

Usage: python3 compact.py <kind paint|enforce|lighthouse> <in.json> <out.json>

Paint results keep, per sample, the milestones the report uses (ms from
navigation start): content chunk parsed into the DOM, page content
revealed, CSS done, FCP, LCP, hydration, banner in the DOM and hydrated
banner readiness, plus server-side resolution time.
"""
import json
import statistics
import sys

PAINT_FIELDS = [
    "ttfb",
    "contentInDomAt",
    "contentVisibleAt",
    "cssDoneAt",
    "fcp",
    "lcp",
    "hydratedAt",
    "bannerVisibleDomAt",
    "bannerReadyMs",
    "promptSettledMs",
]


def rnd(value):
    return None if value is None else round(value, 1)


def stats(values):
    values = [v for v in values if v is not None]
    if not values:
        return None
    return {
        "median": rnd(statistics.median(values)),
        "min": rnd(min(values)),
        "max": rnd(max(values)),
        "n": len(values),
    }


def paint(data):
    rows = [r for r in data["rows"] if "error" not in r]
    out = {
        "condition": data["condition"],
        "conditionDetail": data.get("conditionDetail"),
        "httpCache": data.get("httpCache", "cold"),
        "route": data["route"],
        "samplesPerArm": data["samples"],
        "arms": [a["label"] for a in data["arms"]],
        "loadAverage": {"start": data["startLoad"], "end": data.get("endLoad")},
        "loadAverageByScenario": data.get("loadAt"),
        "errors": len(data["rows"]) - len(rows),
        "scenarios": {},
    }
    for row in rows:
        scen = out["scenarios"].setdefault(row["scenario"], {})
        arm = scen.setdefault(
            row["arm"],
            {
                "protocol": row.get("protocol"),
                "cssFiles": row.get("cssCount"),
                "cssTransferBytes": row.get("cssTransfer"),
                "jsFiles": row.get("jsCount"),
                "jsTransferBytes": row.get("jsTransfer"),
                "samples": [],
            },
        )
        sample = {k: rnd(row.get(k)) for k in PAINT_FIELDS}
        server = row.get("server")
        sample["serverResolveMs"] = rnd(server["durationMs"]) if server else None
        sample["bannerShown"] = row.get("bannerPresent")
        arm["samples"].append(sample)
    for scen in out["scenarios"].values():
        for arm in scen.values():
            samples = arm["samples"]
            arm["summary"] = {
                k: stats([s[k] for s in samples]) for k in PAINT_FIELDS + ["serverResolveMs"]
            }
            arm["summary"]["contentHeldAtLeast80ms"] = sum(
                1
                for s in samples
                if s["contentVisibleAt"] is not None
                and s["contentInDomAt"] is not None
                and s["contentVisibleAt"] - s["contentInDomAt"] >= 80
            )
    return out


def enforce(data):
    keep = [
        "arm",
        "source",
        "visit",
        "i",
        "watchMs",
        "settledAt",
        "activeUI",
        "fcpMs",
        "contentVisibleAt",
        "trackerRequests",
        "embedRequests",
        "afterAccept",
    ]
    rows = []
    for row in data["rows"]:
        compact = {k: row.get(k) for k in keep}
        compact["initRequests"] = [f"{r['path']}@{r['at']}" for r in row["initRequests"]]
        rows.append(compact)
    return {
        "loadAverage": {"start": data["startLoad"], "end": data.get("endLoad")},
        "rows": rows,
    }


def lighthouse(data):
    return {
        "loadAverage": {"start": data["startLoad"], "end": data["endLoad"]},
        "summary": data["summary"],
        "rows": data["rows"],
    }


if __name__ == "__main__":
    kind, src, dst = sys.argv[1:4]
    data = json.load(open(src))
    result = {"paint": paint, "enforce": enforce, "lighthouse": lighthouse}[kind](data)
    with open(dst, "w") as handle:
        json.dump(result, handle, indent="\t")
        handle.write("\n")
