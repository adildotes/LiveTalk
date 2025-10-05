const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// allow .cjs files
config.resolver.assetExts.push("cjs");

// disable bridgeless mode (compatibility for old Expo apps)
config.server = {
    ...config.server,
    experimentalImportSupport: false,
};

module.exports = config;
