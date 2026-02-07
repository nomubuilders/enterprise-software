#!/bin/bash
set -e

echo "Building Compliance Ready AI Desktop..."

cd "$(dirname "$0")/.."

# Build electron-vite (main + preload + renderer)
echo "Building with electron-vite..."
npx electron-vite build

# Package for each platform
case "$1" in
  mac)
    echo "Packaging for macOS..."
    npx electron-builder --mac
    ;;
  win)
    echo "Packaging for Windows..."
    npx electron-builder --win
    ;;
  linux)
    echo "Packaging for Linux..."
    npx electron-builder --linux
    ;;
  all)
    echo "Packaging for all platforms..."
    npx electron-builder --mac --win --linux
    ;;
  *)
    echo "Usage: ./scripts/build-all.sh [mac|win|linux|all]"
    exit 1
    ;;
esac

echo "Build complete! Output in dist-electron/"
