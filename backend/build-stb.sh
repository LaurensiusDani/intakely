#!/bin/sh
set -eu

if [ "$(uname -m)" != aarch64 ]; then
    echo "Run this build on the ARM64 STB." >&2
    exit 1
fi

if ! mountpoint -q /mnt/storage; then
    echo "Mount the STB USB storage at /mnt/storage first." >&2
    exit 1
fi

backend_dir=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
build_dir=$(mktemp -d /mnt/storage/.intakely-build.XXXXXX)
cleanup() {
    rm -rf -- "$build_dir"
}
trap cleanup EXIT

version=0.40.6
checksum=d22c66ceb67ca92b7d767f36d826e848a276bcfa3c197ead20bf87c42208984f
archive="pocketbase_${version}_linux_arm64.zip"

curl -fsSL --max-time 120 -o "$build_dir/pocketbase.zip" \
    "https://github.com/pocketbase/pocketbase/releases/download/v${version}/$archive"
printf '%s  %s\n' "$checksum" "$build_dir/pocketbase.zip" | sha256sum -c -
cp -- "$backend_dir/Dockerfile" "$build_dir/Dockerfile"
cp -R -- "$backend_dir/pb_migrations" "$backend_dir/pb_hooks" "$build_dir/"
sudo docker build --network=none -t intakely-pocketbase:latest "$build_dir"
