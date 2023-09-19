import { remark } from 'remark';

import stripMarkdown from 'strip-markdown';
import githubFlavoredMarkdown from 'remark-gfm';

import { logDebug } from './logger';

export function sanitizeMarkdown(text: string): string {
  logDebug(`Before: ${text}`);

  const result = remark()
    .use(githubFlavoredMarkdown)
    .use(stripMarkdown, { keep: ['inlineCode', 'code'] })
    .processSync(text)
    .toString();

  logDebug(`After: ${result}`);

  return result;
}
