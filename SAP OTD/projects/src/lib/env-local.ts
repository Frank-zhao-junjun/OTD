import { readFileSync } from 'fs';
import { getEnvLocalPaths } from '@/lib/app-config';

export function readEnvLocal(key: string): string | undefined {
  for (const envPath of getEnvLocalPaths()) {
    try {
      const content = readFileSync(envPath, 'utf-8');
      const regex = new RegExp(`^${key}=(?:["'](.+?)["']|(.+))$`, 'm');
      const match = content.match(regex);
      if (match) {
        const val = match[1] || match[2];
        const commentIdx = val.search(/(?<!["'])#/);
        return commentIdx > 0 ? val.substring(0, commentIdx).trimEnd() : val.trimEnd();
      }
    } catch {
      /* file not found */
    }
  }
  return undefined;
}
