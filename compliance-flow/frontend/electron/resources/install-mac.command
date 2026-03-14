#!/bin/bash
# ===========================================
#  Compliance Ready AI — Installer
# ===========================================
#  Double-click this file to install the app.
# ===========================================

APP_NAME="Compliance Ready AI"
DMG_APP_PATH="$(dirname "$0")/${APP_NAME}.app"
INSTALL_PATH="/Applications/${APP_NAME}.app"

clear
echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║   Compliance Ready AI — Installer    ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# Check if the .app exists in the DMG
if [ ! -d "$DMG_APP_PATH" ]; then
    echo "  ❌  Could not find ${APP_NAME}.app"
    echo "     Make sure you opened the DMG file first."
    echo ""
    read -n 1 -s -r -p "  Press any key to close..."
    exit 1
fi

# Copy to /Applications
echo "  📦  Installing ${APP_NAME}..."
echo ""

if [ -d "$INSTALL_PATH" ]; then
    echo "  ⚠️   Existing installation found. Replacing..."
    rm -rf "$INSTALL_PATH"
fi

cp -R "$DMG_APP_PATH" "$INSTALL_PATH"

if [ $? -ne 0 ]; then
    echo "  ❌  Installation failed. You may need to enter your password."
    echo ""
    sudo cp -R "$DMG_APP_PATH" "$INSTALL_PATH"
    if [ $? -ne 0 ]; then
        echo "  ❌  Installation failed."
        echo ""
        read -n 1 -s -r -p "  Press any key to close..."
        exit 1
    fi
fi

# Remove quarantine attribute
echo "  🔓  Removing macOS quarantine..."
xattr -cr "$INSTALL_PATH" 2>/dev/null
sudo xattr -cr "$INSTALL_PATH" 2>/dev/null

echo "  ✅  ${APP_NAME} installed successfully!"
echo ""
echo "  🚀  Launching..."
echo ""

# Launch the app
open "$INSTALL_PATH"

# Close terminal window after 2 seconds
sleep 2
osascript -e 'tell application "Terminal" to close front window' 2>/dev/null &
exit 0
