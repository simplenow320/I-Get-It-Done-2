const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const ts = require("typescript");
const source = fs.readFileSync("artifacts/i-get-it-done/lib/api-url.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText;
function resolve({ env = {}, extra = {}, platform = "ios", origin } = {}) {
  const exports = {};
  const context = {
    exports, process: { env },
    require(name) {
      if (name === "react-native") return { Platform: { OS: platform } };
      if (name === "expo-constants") return { expoConfig: { extra } };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  };
  if (origin) context.window = { location: { origin } };
  vm.runInNewContext(compiled, context);
  return exports.getApiUrl();
}
assert.equal(resolve(), "https://igetitdone.co", "Native no-env fallback");
assert.equal(resolve({ platform: "android" }), "https://igetitdone.co", "Android no-env fallback");
assert.equal(resolve({ env: { EXPO_PUBLIC_DOMAIN: "workspace.example.test" } }), "https://workspace.example.test");
assert.equal(resolve({ env: { EXPO_PUBLIC_API_URL: "https://custom-api.example.test" } }), "https://custom-api.example.test");
assert.equal(resolve({ extra: { apiUrl: "https://extra.example.test" } }), "https://extra.example.test");
assert.equal(resolve({ platform: "web", origin: "https://web.example.test" }), "https://web.example.test");
assert.equal(resolve({ env: { EXPO_PUBLIC_DOMAIN: "workspace.example.test", EXPO_PUBLIC_API_URL: "https://custom-api.example.test" } }), "https://workspace.example.test");
const config = JSON.parse(fs.readFileSync("artifacts/i-get-it-done/app.json", "utf8"));
const eas = JSON.parse(fs.readFileSync("artifacts/i-get-it-done/eas.json", "utf8"));
for (const [name, profile] of Object.entries(eas.build)) {
  assert.ok(new URL(resolve({ env: profile.env || {}, extra: config.expo.extra })), `${name} build has an API endpoint`);
}
console.log("PASS: native no-env fallbacks, build profiles, public API override, config and web API resolution");
