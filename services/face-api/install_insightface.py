"""Install insightface 0.7.3 without compiling the C extension.

The mesh_core_cython extension is only used for 3D mesh rendering,
not for face detection / embedding extraction.
"""

import os
import sys
import tarfile
import shutil
import subprocess
import glob

scratch = os.path.join(os.path.dirname(__file__), "scratch_dl")
archives = glob.glob(os.path.join(scratch, "insightface-0.7.3*"))

if not archives:
    print("ERROR: insightface source archive not found in scratch_dl/")
    sys.exit(1)

archive_path = archives[0]
extract_dir = os.path.join(scratch, "insightface_src")

# Clean up any previous extraction
if os.path.exists(extract_dir):
    shutil.rmtree(extract_dir)

# Extract
print(f"Extracting {archive_path}...")
with tarfile.open(archive_path, "r:gz") as tar:
    tar.extractall(extract_dir)

# Find the setup.py
src_dir = os.path.join(extract_dir, "insightface-0.7.3")
setup_py = os.path.join(src_dir, "setup.py")

# Patch setup.py to remove ext_modules
print("Patching setup.py to skip C extension build...")
with open(setup_py, "r") as f:
    content = f.read()

# Replace ext_modules with empty list
content = content.replace(
    "ext_modules=cythonize(ext_modules),",
    "ext_modules=[],  # patched: skip C extension"
)
# Also handle case without cythonize
content = content.replace(
    "ext_modules=ext_modules,",
    "ext_modules=[],  # patched: skip C extension"
)

with open(setup_py, "w") as f:
    f.write(content)

print("Installing from patched source...")
venv_pip = os.path.join(os.path.dirname(__file__), ".venv", "Scripts", "pip.exe")
result = subprocess.run(
    [venv_pip, "install", "--no-build-isolation", "--no-deps", src_dir],
    cwd=os.path.dirname(__file__),
)
sys.exit(result.returncode)
