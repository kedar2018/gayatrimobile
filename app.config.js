// app.config.js
export default ({ config }) => ({
  ...config,
  name: "FieldVisitApp",
  slug: "FieldVisitApp",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",

  // >>> IMPORTANT: include our CA plugin + expo-location together
  plugins: [
    "./app.plugin.js",
    ["expo-location", { isAndroidForegroundServiceEnabled: true }]
  ],

  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },

  android: {
    package: "com.kedar.calltracker",
    versionCode: 2,

    // We’re using HTTPS, so no cleartext needed
    usesCleartextTraffic: false,

    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff"
    },
    edgeToEdgeEnabled: true,
    permissions: [
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
      "ACCESS_BACKGROUND_LOCATION",
      "FOREGROUND_SERVICE",
      // (No need to repeat the android.permission.* variants)
    ]
  },

  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.kedar.calltracker",
    infoPlist: {
      // Since we’re HTTPS, you can remove this. If you keep it, it’s fine for now.
      // NSAppTransportSecurity: { NSAllowsArbitraryLoads: true },
      ITSAppUsesNonExemptEncryption: false
    }
  },

  web: { favicon: "./assets/favicon.png" },

  extra: {
    // Default to HTTPS (can still override at build time)
    apiUrl: process.env.EXPO_PUBLIC_API_URL || "https://134.199.178.17",
    eas: { projectId: "07374876-184e-4802-bea5-5e816168a83f" }
  },

  owner: "kedar1811"
});
