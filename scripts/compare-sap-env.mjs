import { readFileSync } from 'fs';
import { join } from 'path';

function readFromFile(file, key) {
  const content = readFileSync(file, 'utf-8');
  const regex = new RegExp(`^${key}=(?:["'](.+?)["']|(.+))$`, 'm');
  const match = content.match(regex);
  if (!match) return undefined;
  const val = match[1] || match[2];
  const commentIdx = val.search(/(?<!["'])#/);
  return (commentIdx > 0 ? val.substring(0, commentIdx).trimEnd() : val.trimEnd());
}

async function probe(label, file) {
  const host = readFromFile(file, 'sapHost');
  const client = readFromFile(file, 'sapClient') || '100';
  const username = readFromFile(file, 'sapUsername');
  const password = readFromFile(file, 'sapPassword');
  const auth = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
  const url = `https://${host}/sap/opu/odata/sap/API_PRODUCT_SRV/A_Product?sap-client=${client}&$top=1&$format=json`;
  const res = await fetch(url, { headers: { Authorization: auth, Accept: 'application/json' } });
  console.log(`${label}: user=${username} pwdLen=${password?.length} -> HTTP ${res.status}`);
}

const cwd = process.cwd();
await probe('runtime (.env.runtime.local)', join(cwd, '.env.runtime.local'));
await probe('local   (.env.local)', join(cwd, '.env.local'));
