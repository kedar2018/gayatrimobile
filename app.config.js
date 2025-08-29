// app.config.js
export default ({ config }) => ({
  ...config,
  name: "FieldVisitApp",
  slug: "FieldVisitApp",

  plugins: [
    "./app.plugin.js",
    ["expo-location", { isAndroidForegroundServiceEnabled: true }],
  ],

  android: {
    package: "com.kedar.calltracker",   // <<< REQUIRED
    usesCleartextTraffic: false,
    versionCode: 2,
  },

  extra: {
    apiUrl: "https://134.199.178.17",
  },
});
