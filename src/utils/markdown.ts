import { remark } from 'remark';

import stripMarkdown from 'strip-markdown';
import githubFlavoredMarkdown from 'remark-gfm';

export function sanitizeMarkdown(text: string): string {
  return remark()
    .use(githubFlavoredMarkdown)
    .use(stripMarkdown, { keep: ['inlineCode', 'code'] })
    .processSync(text)
    .toString();
}
