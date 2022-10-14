#!/bin/sh

echo "Set exit on simple errors"
set -e

rm -rf $(PWD)/TNSWidgets/build

echo "Build for iphonesimulator"
xcodebuild \
    -project TNSWidgets/TNSWidgets.xcodeproj \
    -scheme TNSWidgets \
    -sdk iphonesimulator \
    -configuration Release \
    -destination "generic/platform=iOS Simulator" \
    clean build \
    BUILD_DIR=$(PWD)/TNSWidgets/build \
    SKIP_INSTALL=NO \
    -quiet

echo "Build for iphoneos"
xcodebuild \
    -project TNSWidgets/TNSWidgets.xcodeproj \
    -scheme TNSWidgets \
    -sdk iphoneos \
    -configuration Release \
    -destination "generic/platform=iOS" \
    clean build \
    BUILD_DIR=$(PWD)/TNSWidgets/build \
    CODE_SIGN_IDENTITY="" \
    CODE_SIGNING_REQUIRED=NO \
    SKIP_INSTALL=NO \
    -quiet

echo "Build for Mac Catalyst"
xcodebuild \
    -project TNSWidgets/TNSWidgets.xcodeproj \
    -scheme TNSWidgets \
    -configuration Release \
    -destination "generic/platform=macOS,variant=Mac Catalyst" \
    clean build \
    BUILD_DIR=$(PWD)/TNSWidgets/build \
    CODE_SIGN_IDENTITY="" \
    CODE_SIGNING_REQUIRED=NO \
    SKIP_INSTALL=NO \
    -quiet

echo "Creating XCFramework"
xcodebuild \
    -create-xcframework \
    -framework $(PWD)/TNSWidgets/build/Release-iphoneos/TNSWidgets.framework \
    -debug-symbols $(PWD)/TNSWidgets/build/Release-iphoneos/TNSWidgets.framework.dSYM \
    -framework $(PWD)/TNSWidgets/build/Release-iphonesimulator/TNSWidgets.framework \
    -debug-symbols $(PWD)/TNSWidgets/build/Release-iphonesimulator/TNSWidgets.framework.dSYM \
    -framework $(PWD)/TNSWidgets/build/Release-maccatalyst/TNSWidgets.framework \
    -debug-symbols $(PWD)/TNSWidgets/build/Release-maccatalyst/TNSWidgets.framework.dSYM \
    -output $(PWD)/TNSWidgets/build/TNSWidgets.xcframework
