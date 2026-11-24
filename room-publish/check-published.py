#!/usr/bin/env python3
"""Check the exact deployed entry pages and representative native model/maps."""

import hashlib
import json
import os
import time
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen


ORIGIN = "https://baharercili.github.io"
PREFIX = "/somass-room-planner/"
FILES = (
    "index.html", "model-inceleme.html", "model-denetimi.html",
    "tum-modeller.html", "material-studio/index.html", "runtime-manifest.json",
    "models/watkins_tv210.json.gz",
    "watkins-tv210-studio-materials/light/M01/BaseColor.png",
    "watkins-tv210-studio-materials/dark/D01/BaseColor.png",
)


def main():
    manifest = json.loads(Path("room-web-manifest.json").read_bytes())
    expected = {record["path"]: record for record in manifest["files"]}
    if not set(FILES).issubset(expected):
        raise ValueError("Published smoke-test asset is missing from the bundle")
    url = os.environ["SOMASS_PAGES_URL"].rstrip("/") + "/"
    parsed = urlsplit(url)
    if parsed.scheme != "https" or f"{parsed.scheme}://{parsed.netloc}" != ORIGIN or parsed.path != PREFIX or parsed.query or parsed.fragment:
        raise ValueError("Unexpected deployment URL")
    token = expected["runtime-manifest.json"]["sha256"][:16]
    failures = []
    for attempt in range(1, 13):
        failures = []
        for name in FILES:
            item = expected[name]
            request = Request(url + name + "?release=" + token,
                              headers={"Cache-Control": "no-cache", "User-Agent": "SO-MASS-Room-Pages-Check/1"})
            try:
                with urlopen(request, timeout=30) as response:
                    if response.status != 200:
                        raise ValueError("Non-200 published response")
                    value = hashlib.sha256()
                    size = 0
                    for block in iter(lambda: response.read(1024 * 1024), b""):
                        value.update(block)
                        size += len(block)
                        if size > item["bytes"]:
                            raise ValueError("Published response exceeds expected size")
                if size != item["bytes"] or value.hexdigest() != item["sha256"]:
                    raise ValueError("Published file checksum differs")
            except (OSError, ValueError):
                failures.append(name)
        if not failures:
            print(json.dumps({"pass": True, "url": url, "filesChecked": len(FILES),
                              "entryPagesByteExact": True, "nativeModelAndMapsByteExact": True,
                              "release": token}))
            return
        if attempt < 12:
            print(f"Waiting for deployed release visibility: {attempt}/12")
            time.sleep(5)
    raise SystemExit("Published release did not match: " + ", ".join(failures))


if __name__ == "__main__":
    main()
