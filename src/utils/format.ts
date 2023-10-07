import dedent from 'dedent';

import { getActionInput } from '@/utils/action';

import { SimilarReference } from '@/types/knowledge';

export function formatCommentBody(references: SimilarReference[]) {
  const { showSimilarity, discussions } = getActionInput();

  const count = references.length;

  const solutions: string[] = [];
  const similarities: string[] = [];

  for (const [index, reference] of references.entries()) {
    let refUrl = `- ${reference.url}`;
    if (showSimilarity) {
      refUrl += ` [^${index + 1}]`;
    }

    solutions.push(refUrl);

    if (showSimilarity) {
      similarities.push(
        `[^${index + 1}]: ${(reference.similarity * 100).toFixed(2)}%`,
      );
    }
  }

  const nominator = count === 1 ? 'is' : 'are';
  const nouns = ['issue'];
  if (discussions) {
    nouns.push('discussion');
  }

  if (count > 1) {
    nouns.forEach((noun, idx) => {
      nouns[idx] = noun + 's';
    });
  }

  const noun = nouns.join(' and ');

  return dedent`
  Looks like there ${nominator} ${count} similar ${noun} to this one:

  ${solutions.join('\n')}

  <sub>This comment is created by Duplikat, your friendly GitHub Action issue triaging bot.</sub>

  ${similarities.join('\n')}
  `.trim();
}
