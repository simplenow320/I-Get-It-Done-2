const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const slug = process.argv[2];
const originalFile = path.resolve(".migration-backup/app.json");
const original = fs.existsSync(originalFile)
  ? JSON.parse(fs.readFileSync(originalFile, "utf8"))
  : require(path.resolve(".migration-backup/app.config.js"));
const actual = JSON.parse(fs.readFileSync(`artifacts/${slug}/app.json`, "utf8"));
// Dynamic API/billing values now come from Expo public build variables at runtime.
// All static product identity, permission, icon and plugin settings must match.
function check(before, after, location = "") {
  for (const [key, value] of Object.entries(before)) {
    const name = `${location}.${key}`;
    if (location === ".expo.extra" && ["apiUrl", "isProduction", "revenueCatApiKeyIOS", "revenueCatApiKeyAndroid"].includes(key)) continue;
    if (Array.isArray(value)) {
      if (key === "plugins") {
        for (const plugin of value) assert.ok(after[key].some(p => JSON.stringify(p) === JSON.stringify(plugin)), `Missing plugin ${JSON.stringify(plugin)}`);
      } else assert.deepEqual(after[key], value, name);
    } else if (value && typeof value === "object") {
      assert.ok(after[key], name);
      check(value, after[key], name);
    } else assert.equal(after[key], value, name);
  }
}
check(original, actual);
