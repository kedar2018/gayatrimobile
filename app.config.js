// app.config.js
export default ({ config }) => ({
  ...config,
  name: "FieldVisitApp",
  slug: "FieldVisitApp",

  android: {
    package: "com.kedar.calltracker",   // keep consistent
    usesCleartextTraffic: false,
    versionCode: 2,
  },

  plugins: [
    "./app.plugin.js",
    ["expo-location", { isAndroidForegroundServiceEnabled: true }],
  ],

  extra: {
    ...(config.extra || {}),
    apiUrl: "https://134.199.178.17",
    eas: { projectId: "07374876-184e-4802-bea5-5e816168a83f" }, // <<< REQUIRED
  },
});
