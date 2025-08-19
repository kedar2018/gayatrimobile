// app.plugin.js (Bundled-CA only)
const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');

const RAW_NAME = 'my_ca'; // => res/raw/my_ca.pem

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

module.exports = function (config) {
  // 1) Write res/xml/network_security_config.xml
  config = withDangerousMod(config, ['android', (cfg) => {
    const xmlDir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
    ensureDir(xmlDir);
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <certificates src="@raw/${RAW_NAME}" />
      <certificates src="system" />
    </trust-anchors>
  </base-config>
</network-security-config>`;
    fs.writeFileSync(path.join(xmlDir, 'network_security_config.xml'), xml);
    return cfg;
  }]);

  // 2) Copy assets/certs/my_ca.pem -> res/raw/my_ca.pem
  config = withDangerousMod(config, ['android', (cfg) => {
    const rawDir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'raw');
    ensureDir(rawDir);
    const src = path.join(cfg.modRequest.projectRoot, 'assets', 'certs', 'my_ca.pem');
    if (!fs.existsSync(src)) throw new Error(`Missing PEM at ${src}`);
    fs.copyFileSync(src, path.join(rawDir, `${RAW_NAME}.pem`));
    return cfg;
  }]);

  // 3) Reference it from AndroidManifest <application>
  config = withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (!app) throw new Error('No <application> in AndroidManifest.xml');
    app.$ = app.$ || {};
    app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    return cfg;
  });

  return config;
};
