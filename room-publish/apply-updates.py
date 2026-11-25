#!/usr/bin/env python3
"""Apply a verified cumulative delta with explicitly registered model additions.

Customer records are browser/server runtime data and never belong in this delta.
The update manifest is an inventory of application files, not customer content.
"""

import argparse
import gzip
import hashlib
import json
import math
import os
import re
import shutil
import struct
import tempfile
from pathlib import Path, PurePosixPath


PUBLIC_PREFIX = "/somass-room-planner/"
MAX_SITE_BYTES = 1_000_000_000
MANIFEST_NAME = "runtime-manifest.json"
SHA256 = re.compile(r"[0-9a-f]{64}\Z")
ADDITION_PREFIXES = {"watkins-konsol/", "watkins-konsol-160/"}
APPROVED_SOURCE_SHA256 = "3e08fd046270382894b91082afb312ae398ea1f5aa6c375f094e4471db88fa22"
TEXT_SUFFIXES = {".html", ".js", ".css"}
DRAFT_PREFIX = "draft-models/"
DRAFT_INDEX = DRAFT_PREFIX + "models.json"
DRAFT_LICENSE = DRAFT_PREFIX + "vendor/THREE-LICENSE.txt"
DRAFT_MODELS = {
    "fluted-sideboard": {
        "sourceDwgSHA256": "3a76fe67c995bb1fa696f8efb066229e27acbf8ab29884a922459c7cdad34129",
        "status": "ready", "nativeBodyCount": 37, "nativeFaceCount": 620,
        "convertedFaceCount": 620,
        "modelAssetPath": DRAFT_PREFIX + "models/fluted-sideboard.glb",
        "modelSHA256": "c9a3dd6805d70cc24d20e24e1629ec9dbca57ea402328aba993de3b87592ef8e",
        "dimensionsCm": {"width": 160, "depth": 45, "height": 75},
    },
    "azora-chair": {
        "sourceDwgSHA256": "edda26a4cb2c788194af72741467249d98e9bbd7d3d99bc617fc5ff50b8bfc96",
        "status": "source-ready", "nativeBodyCount": 24, "nativeFaceCount": 684,
        "convertedFaceCount": 0, "modelAssetPath": None, "modelSHA256": None,
        "dimensionsCm": None,
    },
}
DRAFT_IDENTITY_FIELDS = (
    "id", "sourceDwgSHA256", "sourceOriginalPreserved", "officialProduct", "status",
    "nativeBodyCount", "nativeFaceCount", "convertedFaceCount", "dimensionsCm",
)


def safe_name(name):
    if not isinstance(name, str) or not name or "\\" in name:
        raise ValueError("Invalid runtime path")
    value = PurePosixPath(name)
    if value.is_absolute() or value.as_posix() != name or any(
        piece in ("", ".", "..", ".git", ".github") for piece in value.parts
    ) or any(ord(char) < 32 for char in name):
        raise ValueError("Unsafe runtime path: " + name)
    return Path(*value.parts)


def sha_bytes(value):
    return hashlib.sha256(value).hexdigest()


def digest_file(path):
    value = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            value.update(block)
    return value.hexdigest()


def regular_file(root, relative):
    path = root / safe_name(relative)
    if path.is_symlink() or not path.is_file():
        raise ValueError("Missing or unsafe file: " + relative)
    for parent in path.parents:
        if parent == root:
            break
        if parent.is_symlink():
            raise ValueError("Symlinked file directory: " + relative)
    return path


def validate_record(record, previous=False):
    if not isinstance(record, dict):
        raise ValueError("Invalid runtime file record")
    safe_name(record.get("path"))
    if type(record.get("bytes")) is not int or not 0 < record["bytes"] <= MAX_SITE_BYTES:
        raise ValueError("Invalid runtime file size")
    if not isinstance(record.get("sha256"), str) or not SHA256.fullmatch(record["sha256"]):
        raise ValueError("Invalid runtime checksum")
    if previous:
        if "previousSHA256" not in record or record["previousSHA256"] is not None and (
            not isinstance(record["previousSHA256"], str) or not SHA256.fullmatch(record["previousSHA256"])
        ):
            raise ValueError("Invalid previous runtime checksum")


def record_map(records, previous=False):
    if not isinstance(records, list):
        raise ValueError("Runtime file inventory must be an array")
    result = {}
    for record in records:
        validate_record(record, previous)
        name = record["path"]
        if name in result:
            raise ValueError("Duplicate runtime file: " + name)
        result[name] = record
    return result


def validate_runtime(document):
    if not isinstance(document, dict) or document.get("format") != "somass-room-pages-runtime-v1" or document.get("publicPrefix") != PUBLIC_PREFIX:
        raise ValueError("Runtime manifest identity differs")
    if document.get("binaryIntegrity", {}).get("allByteExact") is not True:
        raise ValueError("Runtime binary integrity proof is missing")
    if document.get("geometryOrTextureContentChanged") is not False:
        # A new model page is explicit; the pre-existing source binaries stay exact.
        additions = document.get("derivedModelAdditions")
        if document.get("geometryOrTextureContentChanged") is not True or not isinstance(additions, list) or len(additions) != 1 or document.get("existingProductGeometryOrTextureContentChanged") is not False or document.get("binaryIntegrity", {}).get("allOriginalBaselineBinaryFilesUnchanged") is not True:
            raise ValueError("Only an explicit new derived-model addition is permitted")
        validate_addition_metadata(additions[0])
    if document.get("verification", {}).get("pass") is not True:
        raise ValueError("Runtime reference verification did not pass")
    draft_addition_metadata(document)
    expected = record_map(document.get("files"))
    if MANIFEST_NAME in expected:
        raise ValueError("Runtime manifest must exclude its own checksum")
    if document.get("filesExcludingManifest") != len(expected):
        raise ValueError("Runtime inventory count differs")
    return expected


def read_delta(manifest_path):
    """Read and validate inventory metadata without touching the restored site."""
    if manifest_path.is_symlink() or any(p.is_symlink() for p in manifest_path.parents):
        raise ValueError("Update manifest path contains a symlink")
    root = manifest_path.parent.resolve(strict=True)
    manifest = json.loads(manifest_path.read_bytes())
    if not isinstance(manifest, dict) or type(manifest.get("version")) is not int or manifest["version"] != 1:
        raise ValueError("Unsupported runtime update manifest")
    baseline = manifest.get("baseRuntimeManifestSHA256")
    if not isinstance(baseline, str) or not SHA256.fullmatch(baseline):
        raise ValueError("Invalid baseline runtime manifest checksum")
    files = record_map(manifest.get("files"), previous=True)
    if not files or MANIFEST_NAME not in files:
        raise ValueError("Runtime update must include its updated manifest")
    smoke = manifest.get("smokeTestFiles", [])
    if not isinstance(smoke, list) or len(smoke) > 100:
        raise ValueError("Invalid update smoke-test inventory")
    for name in smoke:
        safe_name(name)
        if name not in files:
            raise ValueError("Smoke-test file is absent from the delta: " + name)
    if len(set(smoke)) != len(smoke):
        raise ValueError("Duplicate update smoke-test file")
    return root, manifest, files


def actual_inventory(site):
    files = {}
    for path in site.rglob("*"):
        if path.is_symlink():
            raise ValueError("Restored site contains a symlink")
        if path.is_file():
            name = path.relative_to(site).as_posix()
            safe_name(name)
            files[name] = {"path": name, "bytes": path.stat().st_size, "sha256": digest_file(path)}
        elif not path.is_dir():
            raise ValueError("Restored site contains a non-regular entry")
    return files


def same_record(left, right):
    return left["bytes"] == right["bytes"] and left["sha256"] == right["sha256"]


def validate_addition_metadata(addition):
    if not isinstance(addition, dict) or addition.get("pathPrefix") not in ADDITION_PREFIXES:
        raise ValueError("Derived model addition is outside the approved new page")
    prefix = addition["pathPrefix"]
    safe_name(prefix + "index.html")
    if not isinstance(addition.get("key"), str) or not addition["key"].startswith("WATKINS_CONSOLE"):
        raise ValueError("Unknown derived model key")
    size = addition.get("canonicalSizeCm")
    if not isinstance(size, list) or len(size) != 3 or not all(type(x) in (int, float) and 0 < x < 1000 for x in size):
        raise ValueError("Derived model dimensions are missing")
    for field in ("sourceAssetSHA256", "newAssetSHA256"):
        if not isinstance(addition.get(field), str) or not SHA256.fullmatch(addition[field]):
            raise ValueError("Derived model checksum is missing")
    if addition["sourceAssetSHA256"] != APPROVED_SOURCE_SHA256 or addition.get("derivedAssetSHA256") != addition["newAssetSHA256"]:
        raise ValueError("Derived model source or asset identity differs")
    asset = addition.get("assetPath")
    safe_name(asset)
    if not asset.startswith(prefix) or not asset.endswith(".json.gz"):
        raise ValueError("Derived asset is outside its dedicated page")
    if addition.get("sourceGeometryIsOriginalCAD") is not False or addition.get("derivedFromOriginalSource") is not True or addition.get("officialProduct") is not False:
        raise ValueError("Derived-model provenance must be explicit")


def draft_addition_metadata(document):
    """An explicit, fixed registry, never a general binary-prefix exception."""
    additions = document.get("draftDwgModelAdditions", [])
    if not isinstance(additions, list):
        raise ValueError("Draft DWG model additions must be an array")
    if not additions:
        return {}, set()
    if document.get("geometryOrTextureContentChanged") is not True or document.get("existingProductGeometryOrTextureContentChanged") is not False or document.get("binaryIntegrity", {}).get("allOriginalBaselineBinaryFilesUnchanged") is not True:
        raise ValueError("Draft additions require an explicit geometry addition and original binary preservation proof")
    if len(additions) != len(DRAFT_MODELS):
        raise ValueError("Both registered draft model identities must be explicit")
    by_id, paths = {}, {DRAFT_INDEX, DRAFT_LICENSE}
    for addition in additions:
        if not isinstance(addition, dict) or not isinstance(addition.get("id"), str) or addition["id"] not in DRAFT_MODELS or addition["id"] in by_id:
            raise ValueError("Unknown or duplicate draft model identity")
        model_id = addition["id"]
        for key, value in DRAFT_MODELS[model_id].items():
            if key not in addition or addition[key] != value:
                raise ValueError("Draft source, status, geometry or dimensions differ: " + model_id)
        for key in ("nativeBodyCount", "nativeFaceCount", "convertedFaceCount"):
            if type(addition.get(key)) is not int:
                raise ValueError("Draft model counts must be exact integers")
        if addition.get("sourceOriginalPreserved") is not True or addition.get("officialProduct") is not False:
            raise ValueError("Draft model provenance must be explicit")
        for asset_type, folder, suffix in (("preview", "previews", ".png"), ("provenance", "provenance", ".json")):
            name = DRAFT_PREFIX + folder + "/" + model_id + suffix
            if addition.get(asset_type + "AssetPath") != name:
                raise ValueError("Draft asset is outside its registered path")
            checksum = addition.get(asset_type + "SHA256")
            if not isinstance(checksum, str) or not SHA256.fullmatch(checksum):
                raise ValueError("Draft asset checksum is missing")
            paths.add(name)
        if addition["modelAssetPath"] is not None:
            paths.add(addition["modelAssetPath"])
        by_id[model_id] = addition
    return by_id, paths


def read_small_json(path):
    if path.stat().st_size > 1_000_000:
        raise ValueError("Draft metadata exceeds the bounded document size")
    value = json.loads(path.read_bytes())
    if not isinstance(value, dict):
        raise ValueError("Draft metadata must be a JSON object")
    return value


def validate_draft_glb(path, addition):
    if path.stat().st_size > 50_000_000:
        raise ValueError("Draft GLB exceeds the bounded model size")
    blob = path.read_bytes()
    if len(blob) < 28 or struct.unpack_from("<4sII", blob) != (b"glTF", 2, len(blob)):
        raise ValueError("Draft GLB header differs")
    size, kind = struct.unpack_from("<I4s", blob, 12)
    if kind != b"JSON" or size % 4 or size > len(blob) - 28:
        raise ValueError("Draft GLB JSON chunk differs")
    model = json.loads(blob[20:20 + size])
    binary_size, kind = struct.unpack_from("<I4s", blob, 20 + size)
    if kind != b"BIN\0" or 28 + size + binary_size != len(blob) or model.get("buffers") != [{"byteLength": binary_size}]:
        raise ValueError("Draft GLB binary chunk differs")
    nodes, meshes = model.get("nodes", []), model.get("meshes", [])
    if len(nodes) != addition["nativeBodyCount"] or len(meshes) != addition["nativeBodyCount"]:
        raise ValueError("Draft GLB native body count differs")
    extras = model.get("extras", {})
    if extras.get("sourceDWGSHA256") != addition["sourceDwgSHA256"] or extras.get("omittedSourceFaces") != 0 or extras.get("units") != "metres" or extras.get("upAxis") != "Y":
        raise ValueError("Draft GLB source trace or units differ")
    faces, handles, minima, maxima = 0, set(), [], []
    for node in nodes:
        evidence = node.get("extras", {})
        handle = evidence.get("handle")
        if not isinstance(handle, str) or not handle or handle in handles or evidence.get("omittedFaces") != 0 or type(evidence.get("sourceFaces")) is not int:
            raise ValueError("Draft GLB source body evidence differs")
        handles.add(handle)
        faces += evidence["sourceFaces"]
        native_faces = evidence.get("tessellatedNativeFaceRecords")
        if not isinstance(native_faces, list) or len(native_faces) != evidence["sourceFaces"] or len(set(native_faces)) != len(native_faces):
            raise ValueError("Draft GLB native face coverage differs")
        if type(node.get("mesh")) is not int or not 0 <= node["mesh"] < len(meshes):
            raise ValueError("Draft GLB mesh reference differs")
        primitive, = meshes[node["mesh"]]["primitives"]
        a = model["accessors"][primitive["attributes"]["POSITION"]]
        if a.get("componentType") != 5126 or a.get("type") != "VEC3" or type(a.get("count")) is not int or a["count"] <= 0 or a["count"] % 3:
            raise ValueError("Draft GLB position accessor differs")
        for key, collection in (("min", minima), ("max", maxima)):
            v = a.get(key)
            if not isinstance(v, list) or len(v) != 3 or not all(type(c) in (float, int) and math.isfinite(c) for c in v):
                raise ValueError("Draft GLB bounds are invalid")
            collection.append(v)
    if faces != addition["convertedFaceCount"]:
        raise ValueError("Draft GLB converted face count differs")
    bounds = [max(v[i] for v in maxima) - min(v[i] for v in minima) for i in range(3)]
    if not all(abs(a - b) < 0.00001 for a, b in zip(bounds, (1.6, .75, .45))):
        raise ValueError("Draft GLB millimetres-to-metres scale differs")


def validate_draft_additions(document, current, merged, delta, source):
    additions, allowed = draft_addition_metadata(document)
    if not additions:
        return
    if any(name.startswith(DRAFT_PREFIX) for name in current):
        raise ValueError("Draft model page must be new to the frozen baseline")
    # A draft registry cannot exempt a changed original model, texture or data.
    for name, old in current.items():
        if name != MANIFEST_NAME and Path(name).suffix not in TEXT_SUFFIXES and (name not in merged or not same_record(old, merged[name])):
            raise ValueError("An original baseline binary was modified: " + name)
    for name in allowed:
        if name not in merged or name not in delta or delta[name]["previousSHA256"] is not None:
            raise ValueError("Registered draft asset must be an explicit new file: " + name)
    for name, record in delta.items():
        if record["previousSHA256"] is None and Path(name).suffix not in TEXT_SUFFIXES and name not in allowed and not any(name.startswith(prefix) for prefix in ADDITION_PREFIXES):
            raise ValueError("New binary is outside registered model additions: " + name)
        if name.startswith(DRAFT_PREFIX) and (name not in allowed and Path(name).suffix not in TEXT_SUFFIXES or record["previousSHA256"] is not None):
            raise ValueError("Unregistered or pre-existing draft model asset: " + name)
    index = read_small_json(regular_file(source, DRAFT_INDEX))
    entries = index.get("models")
    if index.get("format") != "somass-draft-dwg-models-v1" or not isinstance(entries, list) or len(entries) != len(additions):
        raise ValueError("Draft model index identity differs")
    indexed = {}
    for entry in entries:
        if not isinstance(entry, dict) or not isinstance(entry.get("id"), str) or entry["id"] not in additions or entry["id"] in indexed:
            raise ValueError("Draft model index has an unknown or duplicate identity")
        indexed[entry["id"]] = entry
    for model_id, addition in additions.items():
        entry = indexed[model_id]
        for field in DRAFT_IDENTITY_FIELDS:
            if type(entry.get(field)) is not type(addition[field]) or entry[field] != addition[field]:
                raise ValueError("Draft model index provenance differs: " + model_id)
        if entry.get("sourceSHA256") != addition["sourceDwgSHA256"]:
            raise ValueError("Draft viewer source checksum differs")
        for asset_type in ("model", "preview", "provenance"):
            name = addition[asset_type + "AssetPath"]
            if entry.get(asset_type + "URL") != (name[len(DRAFT_PREFIX):] if name else None):
                raise ValueError("Draft model index asset URL differs")
            if name and digest_file(regular_file(source, name)) != addition[asset_type + "SHA256"]:
                raise ValueError("Draft asset checksum differs: " + name)
        provenance = read_small_json(regular_file(source, addition["provenanceAssetPath"]))
        fields = DRAFT_IDENTITY_FIELDS + ("modelAssetPath", "modelSHA256", "previewAssetPath", "previewSHA256", "provenanceAssetPath")
        if provenance.get("format") != "somass-draft-dwg-provenance-v1" or any(type(provenance.get(k)) is not type(addition[k]) or provenance[k] != addition[k] for k in fields):
            raise ValueError("Draft provenance document differs: " + model_id)
        preview = regular_file(source, addition["previewAssetPath"])
        with preview.open("rb") as image:
            if preview.stat().st_size > 10_000_000 or image.read(8) != b"\x89PNG\r\n\x1a\n":
                raise ValueError("Draft preview must be a bounded PNG")
        if addition["modelAssetPath"]:
            validate_draft_glb(regular_file(source, addition["modelAssetPath"]), addition)


def validate_derived_additions(document, current, merged, delta, source):
    additions = document.get("derivedModelAdditions", [])
    if not additions:
        return
    if len(additions) != 1:
        raise ValueError("Only one dedicated derived-model page may be added")
    addition = additions[0]
    validate_addition_metadata(addition)
    prefix = addition["pathPrefix"]
    _, draft_paths = draft_addition_metadata(document)
    if any(name.startswith(prefix) for name in current):
        raise ValueError("The derived page must be new to the frozen baseline")
    # Check the actual merged inventory, never trust a boolean proof alone.
    for name, old in current.items():
        if name == MANIFEST_NAME or Path(name).suffix in TEXT_SUFFIXES:
            continue
        if name not in merged or not same_record(old, merged[name]):
            raise ValueError("An original baseline binary was modified: " + name)
    for name, record in delta.items():
        if record["previousSHA256"] is None and Path(name).suffix not in TEXT_SUFFIXES and not name.startswith(prefix) and name not in draft_paths:
            raise ValueError("New binary is outside the dedicated derived page: " + name)
    new_page = [name for name in merged if name.startswith(prefix)]
    if not new_page or prefix + "index.html" not in new_page:
        raise ValueError("Derived page inventory is empty")
    for name in new_page:
        if name not in delta or delta[name]["previousSHA256"] is not None:
            raise ValueError("Every derived page file must be an explicit new delta file")
    path = regular_file(source, addition["assetPath"])
    raw = gzip.decompress(path.read_bytes())
    if sha_bytes(raw) != addition["newAssetSHA256"]:
        raise ValueError("Derived geometry's unpacked checksum differs")
    asset = json.loads(raw)
    evidence = asset.get("evidence", {})
    if asset.get("key") != addition["key"] or evidence.get("canonicalSizeCm") != addition["canonicalSizeCm"] or evidence.get("sourceAssetSHA256") != addition["sourceAssetSHA256"] or evidence.get("sourceGeometryIsOriginalCAD") is not False or evidence.get("derivedFromOriginalSource") is not True or evidence.get("isOfficial3D") is not False or evidence.get("originalSourceFilesUnchanged") is not True:
        raise ValueError("Derived asset provenance or dimensions differ from the manifest")
    total = sum(record["bytes"] for record in merged.values())
    if total > MAX_SITE_BYTES:
        raise ValueError("Derived addition exceeds the Pages byte budget")


def apply_updates(manifest_path, site):
    root, manifest, delta = read_delta(manifest_path)
    if site.is_symlink() or any(p.is_symlink() for p in site.parents) or not site.is_dir():
        raise ValueError("Choose an existing, non-symlink restored site directory")
    site = site.resolve(strict=True)
    source = root / "files"
    if source.is_symlink() or not source.is_dir() or site == root or site in root.parents or root in site.parents:
        raise ValueError("Update files and restored site must be separate")
    current = actual_inventory(site)
    if MANIFEST_NAME not in current or current[MANIFEST_NAME]["sha256"] != manifest["baseRuntimeManifestSHA256"]:
        raise ValueError("Update baseline differs from the restored runtime")
    base_expected = validate_runtime(json.loads((site / MANIFEST_NAME).read_bytes()))
    if set(base_expected) != set(current) - {MANIFEST_NAME} or any(not same_record(record, current[name]) for name, record in base_expected.items()):
        raise ValueError("Restored site differs from its baseline inventory")
    merged = dict(current)
    for name, record in delta.items():
        old = current.get(name)
        if record["previousSHA256"] is None:
            if old is not None:
                raise ValueError("New update file already exists: " + name)
        elif old is None or old["sha256"] != record["previousSHA256"]:
            raise ValueError("Previous runtime checksum differs: " + name)
        path = regular_file(source, name)
        if path.stat().st_size != record["bytes"] or digest_file(path) != record["sha256"]:
            raise ValueError("Update file checksum differs: " + name)
        merged[name] = record
    total = sum(record["bytes"] for record in merged.values())
    if total > MAX_SITE_BYTES:
        raise ValueError("Updated runtime exceeds the Pages byte budget")
    updated_runtime = json.loads(regular_file(source, MANIFEST_NAME).read_bytes())
    updated_expected = validate_runtime(updated_runtime)
    if set(updated_expected) != set(merged) - {MANIFEST_NAME} or any(not same_record(record, merged[name]) for name, record in updated_expected.items()):
        raise ValueError("Updated runtime manifest differs from the merged inventory")

    validate_derived_additions(updated_runtime, current, merged, delta, source)
    validate_draft_additions(updated_runtime, current, merged, delta, source)

    # Validation above is complete before any write. Hard links preserve the
    # frozen assets without copying 600+ MB; changed files replace links instead
    # of modifying their source inode. The original site survives any staging
    # failure, and is restored if the final directory swap fails.
    with tempfile.TemporaryDirectory(prefix=".room-update-", dir=site.parent) as temporary:
        temporary = Path(temporary)
        staged = temporary / "site"
        shutil.copytree(site, staged, copy_function=os.link)
        for name, record in delta.items():
            path = regular_file(source, name)
            target = staged / safe_name(name)
            target.parent.mkdir(parents=True, exist_ok=True)
            candidate = temporary / "replacement"
            shutil.copyfile(path, candidate)
            if candidate.stat().st_size != record["bytes"] or digest_file(candidate) != record["sha256"]:
                raise ValueError("Update source changed during staging: " + name)
            os.replace(candidate, target)
        backup = temporary / "previous-site"
        os.rename(site, backup)
        try:
            os.rename(staged, site)
        except BaseException:
            os.rename(backup, site)
            raise
    report = {"pass": True, "updatedFiles": len(delta), "totalFiles": len(merged), "siteBytes": total,
              "publicPrefix": PUBLIC_PREFIX, "allUpdateHashesVerified": True,
              "allMergedRuntimeHashesVerified": True, "baselineManifestSHA256": manifest["baseRuntimeManifestSHA256"],
              "runtimeManifestSHA256": delta[MANIFEST_NAME]["sha256"]}
    print(json.dumps(report, ensure_ascii=False))
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=Path("updates/manifest.json"))
    parser.add_argument("--site", type=Path, default=Path("_site"))
    args = parser.parse_args()
    apply_updates(args.manifest, args.site)


if __name__ == "__main__":
    main()
