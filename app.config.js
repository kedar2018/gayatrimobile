// app.config.js
export default ({ config }) => {
  // ⬇️ compute values BEFORE returning the object
  const profile = process.env.EAS_BUILD_PROFILE || 'development';
  const isProd = profile === 'production';

  // Use your env if provided; otherwise fall back (you can make dev HTTP if needed)
  const API_URL =
    process.env.EXPO_PUBLIC_API_URL ||
    (isProd ? 'https://134.199.178.17' : 'https://192.34.58.213'); // change dev URL as you like

  return {
    ...config,
    name: "Employee",
    slug: "Employee",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",

    // Plugins (custom CA plugin first)
    plugins: [
      "./app.plugin.js",
      ["expo-location", { isAndroidForegroundServiceEnabled: true }],
      ["expo-build-properties", { android: { compileSdkVersion: 35, targetSdkVersion: 35 } }]
    ],

    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#0C7CFF"
    },

    android: {
      package: "com.kedar.calltracker",
      versionCode: 2,

      // Allow HTTP only for non-production builds
      usesCleartextTraffic: !isProd,

      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0C7CFF",
        monochromeImage: "./assets/adaptive-icon-monochrome.png"
      },
      edgeToEdgeEnabled: true,
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "FOREGROUND_SERVICE"
      ]
    },

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.kedar.calltracker",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false
      }
    },

    web: { favicon: "./assets/favicon.png" },

    extra: {
      apiUrl: API_URL,
      eas: { projectId: "50d621d4-ca6c-43ad-8dbf-a253c283c13c" }
    },

    owner: "kedar1811"
  };
};
