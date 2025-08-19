const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');

const RAW_NAME = 'my_ca';
const SRC_REL = path.join('assets', 'certs', 'my_ca.pem');

function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p,{ recursive:true }); }

function ensurePemOnDisk(projectRoot){
  const src = path.join(projectRoot, SRC_REL);
  if (fs.existsSync(src)) return src;

  const plain = process.env.EXPO_MY_CA_PEM;
  const b64   = process.env.EXPO_MY_CA_PEM_B64;

  if (!plain && !b64) {
    throw new Error(`[android.dangerous]: withAndroidDangerousBaseMod: Missing PEM at ${src}`);
  }

  const pem = plain ? plain : Buffer.from(b64, 'base64').toString('utf8');
  ensureDir(path.dirname(src));
  fs.writeFileSync(src, pem, 'utf8');
  return src;
}

module.exports = function (config) {
  // write res/xml/network_security_config.xml
  config = withDangerousMod(config, ['android', (cfg) => {
    const xmlDir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
    ensureDir(xmlDir);
    fs.writeFileSync(path.join(xmlDir, 'network_security_config.xml'),
`<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <certificates src="@raw/${RAW_NAME}" />
      <certificates src="system" />
    </trust-anchors>
  </base-config>
</network-security-config>`);
    return cfg;
  }]);

  // copy assets/certs/my_ca.pem -> res/raw/my_ca.pem
  config = withDangerousMod(config, ['android', (cfg) => {
    const rawDir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'raw');
    ensureDir(rawDir);
    const src  = ensurePemOnDisk(cfg.modRequest.projectRoot);
    const dest = path.join(rawDir, `${RAW_NAME}.pem`);
    fs.copyFileSync(src, dest);
    return cfg;
  }]);

  // reference from AndroidManifest
  config = withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    app.$ = app.$ || {};
    app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    return cfg;
  });

  return config;
};
