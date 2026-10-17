import { d as defineEventHandler, e as adminSession } from '../../../nitro/nitro.mjs';
import { a as audit } from '../../../_/audit.mjs';
import 'unhead/server';
import 'vue';
import 'unhead/legacy';
import 'unhead/plugins';
import 'node:http';
import 'node:https';
import 'node:crypto';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:url';
import '../../../_/db.mjs';
import 'pg';

const logout_post = defineEventHandler(async (event) => {
  const session = await adminSession(event);
  if (session.data.email) await audit(event, "auth.logout", { adminEmail: session.data.email });
  await session.clear();
  return { ok: true };
});

export { logout_post as default };
//# sourceMappingURL=logout.post.mjs.map
