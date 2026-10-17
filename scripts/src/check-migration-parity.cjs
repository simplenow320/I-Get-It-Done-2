const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const target = "artifacts/i-get-it-done";
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? files(file) : [file];
  });
}
let count = 0;
for (const file of files(".migration-backup/client")) {
  const rel = path.relative(".migration-backup/client", file);
  if (rel === "index.js") continue; // Expo Router now owns the entry registration.
  const migrated = path.join(target, rel === "App.tsx" ? "LegacyApp.tsx" : rel);
  assert.ok(fs.existsSync(migrated), `Missing source: ${rel}`);
  if (rel === "lib/api-url.ts") continue; // Workspace API routing replaces the old port.
  const original = fs.readFileSync(file, "utf8");
  const actual = fs.readFileSync(migrated, "utf8");
  assert.equal(actual, original.replaceAll("../../assets/", "@/assets/"), `Unexpected source change: ${rel}`);
  count++;
}
for (const file of files(".migration-backup/assets")) {
  const rel = path.relative(".migration-backup/assets", file);
  assert.ok(fs.readFileSync(file).equals(fs.readFileSync(path.join(target, "assets", rel))), `Changed asset: ${rel}`);
  count++;
}
for (const file of files(".migration-backup/server")) {
  const rel = path.relative(".migration-backup/server", file);
  assert.ok(fs.existsSync(path.join("artifacts/api-server/src", rel)), `Missing backend: ${rel}`);
  count++;
}
const originalPackage = require("../../.migration-backup/package.json");
const migratedPackage = require("../../artifacts/i-get-it-done/package.json");
for (const [name, version] of Object.entries(originalPackage.dependencies)) {
  if (name === "react" || name === "react-dom" || name.startsWith("react-native") || name === "expo" || name.startsWith("expo-")) {
    if (name === "expo-server-sdk") continue;
    assert.equal(migratedPackage.devDependencies[name], version, `Native package changed: ${name}`);
    count++;
  }
}
console.log(`PASS: ${count} source, asset, backend-file, and native-version parity checks`);
