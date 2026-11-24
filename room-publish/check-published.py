#!/usr/bin/env python3
"""Check published entry pages, native model/maps and the current app delta."""

import hashlib
import importlib.util
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


def load_update_helpers():
    location = Path(__file__).with_name("apply-updates.py")
    spec = importlib.util.spec_from_file_location("somass_room_updates", location)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def expected_inventory(base_manifest_path=Path("room-web-manifest.json"), update_manifest_path=Path("updates/manifest.json")):
    helpers = load_update_helpers()
    manifest = json.loads(base_manifest_path.read_bytes())
    if manifest.get("format") != "somass-room-pages-bundle-v1" or manifest.get("publicPrefix") != PREFIX:
        raise ValueError("Unexpected baseline publication inventory")
    expected = helpers.record_map(manifest["files"])
    update_names = []
    if update_manifest_path.exists():
        root, delta, files = helpers.read_delta(update_manifest_path)
        if expected.get("runtime-manifest.json", {}).get("sha256") != delta["baseRuntimeManifestSHA256"]:
            raise ValueError("Delta baseline differs from the frozen archive")
        for name, record in files.items():
            old = expected.get(name)
            if record["previousSHA256"] is None:
                if old is not None:
                    raise ValueError("New published file already exists in baseline")
            elif old is None or old["sha256"] != record["previousSHA256"]:
                raise ValueError("Published delta replaces a different baseline file")
            path = helpers.regular_file(root / "files", name)
            if path.stat().st_size != record["bytes"] or helpers.digest_file(path) != record["sha256"]:
                raise ValueError("Published delta source differs from its inventory")
            expected[name] = record
        # Check every changed/new file, not only the first customer UI entry;
        # explicit smokeTestFiles are retained for stable display ordering.
        update_names = list(dict.fromkeys(delta.get("smokeTestFiles", []) + sorted(files)))
        runtime = json.loads(helpers.regular_file(root / "files", "runtime-manifest.json").read_bytes())
        runtime_expected = helpers.validate_runtime(runtime)
        if set(runtime_expected) != set(expected) - {"runtime-manifest.json"} or any(
            not helpers.same_record(record, expected[name]) for name, record in runtime_expected.items()
        ):
            raise ValueError("Published runtime manifest differs from the merged inventory")
    targets = tuple(dict.fromkeys(FILES + tuple(update_names)))
    if not set(targets).issubset(expected):
        raise ValueError("Published smoke-test asset is missing from the bundle")
    return expected, targets


def main():
    expected, targets = expected_inventory()
    url = os.environ["SOMASS_PAGES_URL"].rstrip("/") + "/"
    parsed = urlsplit(url)
    if parsed.scheme != "https" or f"{parsed.scheme}://{parsed.netloc}" != ORIGIN or parsed.path != PREFIX or parsed.query or parsed.fragment:
        raise ValueError("Unexpected deployment URL")
    token = expected["runtime-manifest.json"]["sha256"][:16]
    failures = []
    for attempt in range(1, 13):
        failures = []
        for name in targets:
            item = expected[name]
            request = Request(url + name + "?release=" + token,
                              headers={"Cache-Control": "no-cache", "User-Agent": "SO-MASS-Room-Pages-Check/2"})
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
            print(json.dumps({"pass": True, "url": url, "filesChecked": len(targets),
                              "entryPagesByteExact": True, "nativeModelAndMapsByteExact": True,
                              "applicationDeltaByteExact": True, "release": token}))
            return
        if attempt < 12:
            print(f"Waiting for deployed release visibility: {attempt}/12")
            time.sleep(5)
    raise SystemExit("Published release did not match: " + ", ".join(failures))


if __name__ == "__main__":
    main()
