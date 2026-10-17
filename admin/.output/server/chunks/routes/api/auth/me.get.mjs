import { d as defineEventHandler } from '../../../nitro/nitro.mjs';
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

const me_get = defineEventHandler((event) => ({ email: event.context.admin.email }));

export { me_get as default };
//# sourceMappingURL=me.get.mjs.map
