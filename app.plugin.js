// app.plugin.js
const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');

const RAW_NAME = 'my_ca';                    // -> res/raw/my_ca.pem
const SRC_REL  = path.join('assets', 'certs', 'my_ca.pem');

function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p,{ recursive:true }); }

function ensurePemOnDisk(projectRoot) {
  const src = path.join(projectRoot, SRC_REL);
  if (fs.existsSync(src)) return src;

  // Optional fallback: env variables (only if you don't commit the file)
  const plain = process.env.EXPO_MY_CA_PEM;
  const b64   = process.env.EXPO_MY_CA_PEM_B64;
  if (!plain && !b64) {
    throw new Error(`[android.dangerous]: Missing PEM at ${src} (and no EXPO_MY_CA_PEM[_B64])`);
  }
  const pem = plain ? plain : Buffer.from(b64, 'base64').toString('utf8');
  ensureDir(path.dirname(src));
  fs.writeFileSync(src, pem, 'utf8');
  return src;
}

module.exports = function(config) {
  // Do BOTH writes atomically in one mod (no ordering issues)
  config = withDangerousMod(config, ['android', (cfg) => {
    const projectRoot = cfg.modRequest.projectRoot;
    const androidRoot = cfg.modRequest.platformProjectRoot;

    const xmlDir = path.join(androidRoot, 'app', 'src', 'main', 'res', 'xml');
    const rawDir = path.join(androidRoot, 'app', 'src', 'main', 'res', 'raw');
    ensureDir(xmlDir); ensureDir(rawDir);

    // 1) Copy PEM -> res/raw/my_ca.pem
    const srcPem  = ensurePemOnDisk(projectRoot);
    const destPem = path.join(rawDir, `${RAW_NAME}.pem`);
    fs.copyFileSync(srcPem, destPem);

    // 2) Write network_security_config.xml referencing @raw/my_ca
    const xmlPath = path.join(xmlDir, 'network_security_config.xml');
    fs.writeFileSync(xmlPath, `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <certificates src="@raw/${RAW_NAME}" />
      <certificates src="system" />
    </trust-anchors>
  </base-config>
</network-security-config>`);

    console.log('[plugin] wrote:', destPem, 'size=', fs.statSync(destPem).size);
    console.log('[plugin] wrote:', xmlPath);
    return cfg;
  }]);

  // Attach the XML in AndroidManifest
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    app.$ = app.$ || {};
    app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    return cfg;
  });
};
