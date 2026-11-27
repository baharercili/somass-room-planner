#!/usr/bin/env python3
"""Append the exact V179 image archive after the frozen Room Planner updater.

The original 1299-member app is verified before and after. This script neither
edits its runtime manifest nor permits general new binaries or deletions.
"""
import argparse
import hashlib
import json
import os
import shutil
import stat
import tempfile
import zipfile
from pathlib import Path, PurePosixPath

PART_BYTES = 2 * 1024 * 1024
MAX_SITE_BYTES = 1_000_000_000

def digest(path):
    result = hashlib.sha256()
    with path.open('rb') as source:
        for block in iter(lambda: source.read(1024*1024), b''):
            result.update(block)
    return result.hexdigest()

def safe_path(value):
    if not isinstance(value, str) or not value or '\\' in value or any(ord(c)<32 for c in value):
        raise ValueError('Invalid package path')
    path = PurePosixPath(value)
    if path.is_absolute() or path.as_posix() != value or any(x in ('', '.', '..', '.git', '.github') for x in path.parts):
        raise ValueError('Unsafe package path: ' + value)
    return Path(*path.parts)

def records_map(records):
    result = {}
    if not isinstance(records, list):
        raise ValueError('Expected an exact file inventory')
    for row in records:
        safe_path(row['path'])
        if row['path'] in result or type(row['bytes']) is not int or row['bytes'] <= 0 or not isinstance(row['sha256'], str) or len(row['sha256']) != 64 or any(c not in '0123456789abcdef' for c in row['sha256']):
            raise ValueError('Invalid or duplicate file record')
        result[row['path']] = row
    return result

def file_record(root, name):
    path = root / safe_path(name)
    if path.is_symlink() or not path.is_file() or any(p.is_symlink() for p in path.parents):
        raise ValueError('Missing or symlinked file: ' + name)
    return {'path': name, 'bytes': path.stat().st_size, 'sha256': digest(path)}

def actual_inventory(root):
    result = {}
    for path in root.rglob('*'):
        if path.is_symlink():
            raise ValueError('Site contains a symlink')
        if path.is_file():
            name = path.relative_to(root).as_posix()
            result[name] = file_record(root, name)
        elif not path.is_dir():
            raise ValueError('Site contains a non-regular entry')
    return result

def equal(left, right):
    return left['bytes'] == right['bytes'] and left['sha256'] == right['sha256']

def require_same(actual, expected):
    if set(actual) != set(expected):
        raise ValueError('Site file set differs from the pinned baseline or final union')
    if any(not equal(actual[name], row) for name, row in expected.items()):
        raise ValueError('Site bytes differ from the pinned baseline or final union')

def restore(manifest_path, site, verify_only=False):
    if manifest_path.is_symlink() or any(p.is_symlink() for p in manifest_path.parents):
        raise ValueError('Manifest path contains a symlink')
    manifest_path = manifest_path.resolve(strict=True)
    root = manifest_path.parent
    manifest = json.loads(manifest_path.read_bytes())
    if manifest.get('format') != 'somass-v179-immutable-assets-package-v1' or manifest.get('publicPrefix') != '/somass-room-planner/':
        raise ValueError('Wrong archive identity')
    if manifest.get('partSizeBytes') != PART_BYTES or manifest.get('maxSiteBytes') != MAX_SITE_BYTES or manifest.get('sourcesUnchanged') is not True or manifest.get('resizeCount') != 0:
        raise ValueError('Archive integrity or byte guard differs')
    prefix = manifest['assetPathPrefix']
    if prefix != 'material-gallery-v179-' + manifest['immutableAssetSetSHA256'][:12] + '/':
        raise ValueError('Archive path is not content-addressed')
    safe_path(prefix.rstrip('/'))
    baseline_record = manifest['expectedBaselineManifest']
    if not equal(file_record(root, baseline_record['path']), baseline_record):
        raise ValueError('Pinned app inventory checksum differs')
    baseline_doc = json.loads((root / safe_path(baseline_record['path'])).read_bytes())
    if baseline_doc['headSHA'] != manifest['expectedBaselineHeadSHA']:
        raise ValueError('Pinned app commit differs')
    baseline = records_map(baseline_doc['files'])
    if len(baseline) != manifest['expectedBaselineFiles'] or sum(r['bytes'] for r in baseline.values()) != manifest['expectedBaselineBytes']:
        raise ValueError('Pinned app totals differ')
    additions = records_map(manifest['files'])
    if len(additions) != manifest['fileCount'] or sum(r['bytes'] for r in additions.values()) != manifest['totalFileBytes'] or any(not p.startswith(prefix) for p in additions):
        raise ValueError('Asset archive members or totals differ')
    if set(additions) & set(baseline):
        raise ValueError('Asset archive would overwrite an app member')
    expected = {**baseline, **additions}
    total = sum(r['bytes'] for r in expected.values())
    if len(expected) != manifest['expectedFinalFiles'] or total != manifest['expectedFinalBytes'] or total > MAX_SITE_BYTES:
        raise ValueError('Final site exceeds its exact inventory or byte budget')
    if site.is_symlink() or any(p.is_symlink() for p in site.parents) or not site.is_dir():
        raise ValueError('Choose the existing freshly restored app site')
    site = site.resolve(strict=True)
    if site == root or site in root.parents or root in site.parents:
        raise ValueError('Archive control files and app site must be separate')
    require_same(actual_inventory(site), baseline)

    with tempfile.TemporaryDirectory(prefix='.v179-assets-', dir=site.parent) as temporary:
        temporary = Path(temporary)
        archive = temporary / 'v179-assets.zip'
        archive_hash = hashlib.sha256()
        archive_bytes = 0
        parts = manifest['parts']
        if not parts:
            raise ValueError('No archive parts')
        with archive.open('xb') as output:
            for index, row in enumerate(parts, 1):
                if row['path'] != f'parts/v179-assets.part-{index:04d}' or row['bytes'] > PART_BYTES or index < len(parts) and row['bytes'] != PART_BYTES:
                    raise ValueError('Archive parts are not contiguous or correctly sized')
                if not equal(file_record(root, row['path']), row):
                    raise ValueError('Archive part checksum differs')
                with (root / safe_path(row['path'])).open('rb') as source:
                    for block in iter(lambda: source.read(1024*1024), b''):
                        archive_hash.update(block)
                        archive_bytes += len(block)
                        output.write(block)
        if archive_bytes != manifest['archive']['bytes'] or archive_hash.hexdigest() != manifest['archive']['sha256']:
            raise ValueError('Complete archive checksum differs')
        staged = temporary / 'site'
        staged.mkdir()
        with zipfile.ZipFile(archive) as package:
            infos = package.infolist()
            if len(infos) != len(additions) or {i.filename for i in infos} != set(additions):
                raise ValueError('Unexpected, missing or duplicate ZIP member')
            for info in infos:
                relative = safe_path(info.filename)
                mode = info.external_attr >> 16
                record = additions[info.filename]
                if info.is_dir() or stat.S_ISLNK(mode) or stat.S_IFMT(mode) not in (0, stat.S_IFREG) or info.flag_bits & 1 or info.file_size != record['bytes']:
                    raise ValueError('Unsafe ZIP member or mismatched size')
                path = staged / relative
                path.parent.mkdir(parents=True, exist_ok=True)
                with package.open(info) as source, path.open('xb') as output:
                    shutil.copyfileobj(source, output, 1024*1024)
                if not equal(file_record(staged, info.filename), record):
                    raise ValueError('Extracted asset checksum differs')
        require_same(actual_inventory(staged), additions)
        if not verify_only:
            # A single new directory rename; no app member is opened for write.
            target = site / prefix.rstrip('/')
            if target.exists() or target.is_symlink():
                raise ValueError('Refuse to replace an existing immutable asset archive')
            os.rename(staged / prefix.rstrip('/'), target)
    if verify_only:
        require_same(actual_inventory(site), baseline)
    else:
        require_same(actual_inventory(site), expected)
    report = {'pass': True, 'verifyOnly': verify_only, 'baselineFiles': len(baseline), 'baselineBytes': manifest['expectedBaselineBytes'], 'allOriginalAppMembersUnchanged': True, 'newAssetFiles': len(additions), 'newAssetBytes': manifest['totalFileBytes'], 'finalFiles': len(expected), 'finalBytes': total, 'maxSiteBytes': MAX_SITE_BYTES, 'marginBytes': MAX_SITE_BYTES-total, 'immutableAssetPrefix': prefix, 'allArchiveAndMemberHashesVerified': True}
    print(json.dumps(report))
    return report

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', type=Path, default=Path(__file__).with_name('asset-package-manifest.json'))
    parser.add_argument('--site', type=Path, required=True)
    parser.add_argument('--verify-only', action='store_true')
    args = parser.parse_args()
    restore(args.manifest, args.site, args.verify_only)
