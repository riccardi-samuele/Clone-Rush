"""Zip a web root with fixed ordering and timestamps for repeatable uploads."""
import sys
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

root, output = map(Path, sys.argv[1:])
with ZipFile(output, 'w', compression=ZIP_DEFLATED, compresslevel=9) as archive:
    for path in sorted(item for item in root.rglob('*') if item.is_file()):
        info = ZipInfo(path.relative_to(root).as_posix(), (2026, 10, 12, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, path.read_bytes(), compress_type=ZIP_DEFLATED, compresslevel=9)
