import dedent from 'dedent';
import mustache from 'mustache';

import { getActionInput } from '@/utils/action';

import { SimilarReference } from '@/types/knowledge';
import { context } from '@actions/github';

export function formatCommentBody(
  similars: SimilarReference[],
  type: 'discussion' | 'issue',
): string {
  const { template } = getActionInput();

  return template
    ? applyCustomTemplate(template, similars)
    : applyDefaultTemplate(similars, type);
}

function applyDefaultTemplate(
  similars: SimilarReference[],
  type: 'issue' | 'discussion',
): string {
  const { discussions } = getActionInput();
  const count = similars.length;

  const [ref, similarities] = formatReferences(similars);

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

  ${ref}

  It's possible that one of these ${noun} is already addressing your problem. If so, please close this ${type} and move the discussion to existing ${noun}.

  <sub>This comment is created by Duplikat, your friendly GitHub Action issue and discussion management bot.</sub>

  ${similarities}
  `.trim();
}

function applyCustomTemplate(
  template: string,
  similars: SimilarReference[],
): string {
  const replacer = {
    user: context.actor,
    count: similars.length,
    references: formatReferences(similars),
  };

  return mustache.render(template, replacer);
}

function formatReferences(similars: SimilarReference[]): [string, string] {
  const { showSimilarity } = getActionInput();

  const solutions: string[] = [];
  const similarities: string[] = [];

  for (const [index, reference] of similars.entries()) {
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

  return [solutions.join('\n'), similarities.join('\n')];
}
