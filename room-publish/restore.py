#!/usr/bin/env python3
"""Restore only the verified Room Planner static runtime into a fresh Pages site."""

import argparse
import hashlib
import json
import os
import re
import shutil
import stat
import tempfile
import zipfile
from pathlib import Path, PurePosixPath


PUBLIC_PREFIX = "/somass-room-planner/"
MAX_SITE_BYTES = 1_000_000_000
PART_BYTES = 2 * 1024 * 1024
REQUIRED_FILES = {
    "index.html", "model-inceleme.html", "model-denetimi.html",
    "tum-modeller.html", "malzeme-studyosu.html",
    "material-studio/index.html", "runtime-manifest.json",
    "models/watkins_tv210.json.gz",
}


def safe_name(name):
    if not isinstance(name, str) or not name or "\\" in name:
        raise ValueError("Invalid runtime path")
    value = PurePosixPath(name)
    if value.is_absolute() or value.as_posix() != name or any(
        piece in ("", ".", "..", ".git", ".github") for piece in value.parts
    ) or any(ord(char) < 32 for char in name):
        raise ValueError("Unsafe runtime path: " + name)
    return Path(*value.parts)


def digest_file(path):
    value = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            value.update(block)
    return value.hexdigest()


def validate_record(record):
    safe_name(record["path"])
    if type(record["bytes"]) is not int or record["bytes"] <= 0:
        raise ValueError("Invalid runtime file size")
    if not re.fullmatch(r"[0-9a-f]{64}", record["sha256"]):
        raise ValueError("Invalid runtime checksum")


def restore(manifest_path, site):
    root = manifest_path.resolve(strict=True).parent
    manifest = json.loads(manifest_path.read_bytes())
    if manifest.get("format") != "somass-room-pages-bundle-v1":
        raise ValueError("Unsupported Room Planner bundle")
    if manifest.get("publicPrefix") != PUBLIC_PREFIX:
        raise ValueError("Pages path prefix differs from this repository")
    if manifest.get("sourceInputsUnchanged") is not True or manifest.get("geometryOrTextureContentChanged") is not False:
        raise ValueError("Source or binary integrity declaration is missing")
    if manifest.get("verification", {}).get("pass") is not True:
        raise ValueError("Export verification did not pass")
    records = manifest["files"]
    for record in records:
        validate_record(record)
    expected = {record["path"]: record for record in records}
    if len(expected) != len(records) or not REQUIRED_FILES.issubset(expected):
        raise ValueError("Duplicate or missing required runtime files")
    total = sum(record["bytes"] for record in records)
    if total != manifest["totalFileBytes"] or total > MAX_SITE_BYTES:
        raise ValueError("Room Planner exceeds the published site byte budget")
    if manifest["partSizeBytes"] != PART_BYTES:
        raise ValueError("Unexpected archive part size")
    parts = manifest["parts"]
    if not parts:
        raise ValueError("Missing archive parts")
    archive_record = manifest["archive"]
    if archive_record.get("path") != "room-web.zip":
        raise ValueError("Unexpected source archive name")
    site = site.resolve()
    if site.exists() or site.is_symlink():
        raise ValueError("Refuse to replace an existing output site")
    if root == site or site in root.parents or root in site.parents and site.name != "_site":
        raise ValueError("Choose an isolated output directory")
    site.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".room-restore-", dir=site.parent) as temporary:
        temp = Path(temporary)
        archive = temp / "room-web.zip"
        whole = hashlib.sha256()
        archive_size = 0
        with archive.open("xb") as target:
            for index, part in enumerate(parts, 1):
                validate_record(part)
                if part["path"] != f"parts/room-web.part-{index:04d}":
                    raise ValueError("Archive parts are not contiguous and ordered")
                if part["bytes"] > PART_BYTES or index < len(parts) and part["bytes"] != PART_BYTES:
                    raise ValueError("Archive part size differs")
                source = root / safe_name(part["path"])
                if source.is_symlink() or not source.is_file() or any(parent.is_symlink() for parent in source.parents if parent != root.parent):
                    raise ValueError("Missing or unsafe archive part")
                part_digest = hashlib.sha256()
                part_size = 0
                with source.open("rb") as handle:
                    for block in iter(lambda: handle.read(1024 * 1024), b""):
                        target.write(block)
                        part_digest.update(block)
                        whole.update(block)
                        part_size += len(block)
                        archive_size += len(block)
                if part_size != part["bytes"] or part_digest.hexdigest() != part["sha256"]:
                    raise ValueError("Archive part checksum differs: " + part["path"])
        if archive_size != archive_record["bytes"] or whole.hexdigest() != archive_record["sha256"]:
            raise ValueError("Complete archive checksum differs")
        staged = temp / "site"
        staged.mkdir()
        with zipfile.ZipFile(archive) as package:
            seen = set()
            for info in package.infolist():
                path = safe_name(info.filename)
                mode = info.external_attr >> 16
                if info.filename in seen or info.filename not in expected or info.is_dir() or stat.S_ISLNK(mode):
                    raise ValueError("Unexpected or unsafe ZIP member")
                if stat.S_IFMT(mode) not in (0, stat.S_IFREG) or info.flag_bits & 1:
                    raise ValueError("Unsupported ZIP member")
                record = expected[info.filename]
                if info.file_size != record["bytes"]:
                    raise ValueError("Runtime member size differs")
                target = staged / path
                target.parent.mkdir(parents=True, exist_ok=True)
                value = hashlib.sha256()
                size = 0
                with package.open(info) as handle, target.open("xb") as output:
                    for block in iter(lambda: handle.read(1024 * 1024), b""):
                        value.update(block)
                        output.write(block)
                        size += len(block)
                if size != record["bytes"] or value.hexdigest() != record["sha256"]:
                    raise ValueError("Runtime member checksum differs: " + info.filename)
                seen.add(info.filename)
            if seen != set(expected):
                raise ValueError("Missing ZIP members")
        runtime = json.loads((staged / "runtime-manifest.json").read_bytes())
        if runtime.get("format") != "somass-room-pages-runtime-v1" or runtime.get("publicPrefix") != PUBLIC_PREFIX:
            raise ValueError("Runtime manifest identity differs")
        if runtime.get("geometryOrTextureContentChanged") is not False or runtime.get("binaryIntegrity", {}).get("allByteExact") is not True:
            raise ValueError("Runtime binary integrity proof is missing")
        if runtime.get("verification", {}).get("pass") is not True:
            raise ValueError("Runtime reference verification did not pass")
        runtime_expected = {item["path"]: item for item in runtime["files"]}
        if len(runtime_expected) != len(runtime["files"]) or set(runtime_expected) != set(expected) - {"runtime-manifest.json"}:
            raise ValueError("Runtime and archive file inventories differ")
        for name, record in runtime_expected.items():
            if record["bytes"] != expected[name]["bytes"] or record["sha256"] != expected[name]["sha256"]:
                raise ValueError("Runtime and archive checksums differ")
        os.rename(staged, site)
    report = {"pass": True, "files": len(expected), "siteBytes": total,
              "archiveBytes": archive_size, "parts": len(parts),
              "publicPrefix": PUBLIC_PREFIX, "allRuntimeHashesVerified": True,
              "geometryOrTextureContentChanged": False}
    print(json.dumps(report, ensure_ascii=False))
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=Path("room-web-manifest.json"))
    parser.add_argument("--site", type=Path, default=Path("_site"))
    args = parser.parse_args()
    restore(args.manifest, args.site)


if __name__ == "__main__":
    main()
