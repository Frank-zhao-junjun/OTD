import { readFileSync } from 'fs';
import { join } from 'path';

const cwd = process.cwd();
const paths = [
  join(cwd, '.env.runtime.local'),
  join(cwd, '.env.local'),
];

function readEnvLocal(key) {
  for (const envPath of paths) {
    try {
      const content = readFileSync(envPath, 'utf-8');
      const regex = new RegExp(`^${key}=(?:["'](.+?)["']|(.+))$`, 'm');
      const match = content.match(regex);
      if (match) {
        const val = match[1] || match[2];
        const commentIdx = val.search(/(?<!["'])#/);
        return (commentIdx > 0 ? val.substring(0, commentIdx).trimEnd() : val.trimEnd());
      }
    } catch {
      /* ignore */
    }
  }
  return undefined;
}

const config = {
  sapScheme: process.env.sapScheme || readEnvLocal('sapScheme') || 'https',
  sapHost: process.env.sapHost || readEnvLocal('sapHost') || '',
  sapUsername: process.env.sapUsername || readEnvLocal('sapUsername') || '',
  sapPassword: readEnvLocal('sapPassword') || process.env.sapPassword || '',
  sapClient: process.env.sapClient || readEnvLocal('sapClient') || '100',
};

console.log('Config source check:');
for (const p of paths) {
  try {
    readFileSync(p, 'utf-8');
    console.log('  found:', p);
  } catch {
    console.log('  missing:', p);
  }
}

console.log('\nEffective config (no secrets):');
console.log('  host:', config.sapHost);
console.log('  username:', config.sapUsername);
console.log('  password length:', config.sapPassword?.length ?? 0);
console.log('  client:', config.sapClient);

const url = `${config.sapScheme}://${config.sapHost}/sap/opu/odata/sap/API_PRODUCT_SRV/A_Product?sap-client=${config.sapClient}&$top=1&$format=json`;
const auth = `Basic ${Buffer.from(`${config.sapUsername}:${config.sapPassword}`).toString('base64')}`;

console.log('\nProbing SAP (API_PRODUCT_SRV, $top=1)...');
const res = await fetch(url, {
  headers: { Authorization: auth, Accept: 'application/json' },
});
console.log('  HTTP status:', res.status);
const text = await res.text();
if (res.ok) {
  console.log('  OK — credentials accepted');
} else {
  console.log('  body (first 300 chars):', text.slice(0, 300));
}
