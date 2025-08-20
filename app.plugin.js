// app.plugin.js
const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const RAW_NAME = 'my_ca';

// helpers
function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
function ensurePemOnDisk(projectRoot) {
  // Prefer base64 env to avoid multiline issues
  const b64 = process.env.EXPO_MY_CA_PEM_B64;
  const plain = process.env.EXPO_MY_CA_PEM;
  const outDir = path.join(projectRoot, 'assets', 'certs');
  ensureDir(outDir);
  const out = path.join(outDir, `${RAW_NAME}.pem`);

  if (b64) {
    fs.writeFileSync(out, Buffer.from(b64, 'base64').toString('utf8'), 'utf8');
    return out;
  }
  if (plain) {
    fs.writeFileSync(out, plain, 'utf8');
    return out;
  }

  // Fall back to a checked-in file if present
  const fallback = path.join(outDir, 'my_ca.pem');
  if (fs.existsSync(fallback)) return fallback;

  throw new Error('No CA provided: set EXPO_MY_CA_PEM_B64 or include assets/certs/my_ca.pem');
}

module.exports = function (config) {
  // Decide cleartext policy by profile or override via env
  const profile = process.env.EAS_BUILD_PROFILE || process.env.APP_VARIANT || 'development';
  const isProd = profile === 'production';
  const allowCleartext = process.env.ALLOW_CLEARTEXT === '1' ? true : !isProd;

  // 1) Write res/xml/network_security_config.xml
  config = withDangerousMod(config, ['android', (cfg) => {
    const xmlDir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
    ensureDir(xmlDir);

    // If you switch to a hostname later, you can create a <domain-config> block instead.
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="${allowCleartext ? 'true' : 'false'}">
    <trust-anchors>
      <certificates src="@raw/${RAW_NAME}" />
      <certificates src="system" />
    </trust-anchors>
  </base-config>
</network-security-config>`;

    fs.writeFileSync(path.join(xmlDir, 'network_security_config.xml'), xml.trim(), 'utf8');
    return cfg;
  }]);

  // 2) Copy CA to res/raw
  config = withDangerousMod(config, ['android', (cfg) => {
    const rawDir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'raw');
    ensureDir(rawDir);
    const src = ensurePemOnDisk(cfg.modRequest.projectRoot);
    const dest = path.join(rawDir, `${RAW_NAME}.pem`);
    fs.copyFileSync(src, dest);
    return cfg;
  }]);

  // 3) Reference NSC from AndroidManifest
  config = withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    app.$ = app.$ || {};
    app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    return cfg;
  });

  return config;
};
