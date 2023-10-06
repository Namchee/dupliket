import OpenAI from 'openai';

import stripMarkdown from 'strip-markdown';
import githubFlavoredMarkdown from 'remark-gfm';

import { remark } from 'remark';

import { getActionInput } from '@/utils/action';
import { cosineSimilarity } from '@/utils/meth';

import type { GithubReference } from '@/types/github';
import type { EmbedeedReference, SimilarReference } from '@/types/knowledge';

const _systemPrompt =
  'You are a repository maintainer and an expert on analyzing and triaging issues.';

const _UserPrompt = `Identify the solution from the following GitHub issue and its comments. Present the solution as a suggestion in one sentence.

Interaction between participants are separated by '---'. All interactions begins with an '@' followed with a username that can be used to distinguish issue participants. All interactions may have a title or a link to a reproduction attempt that can be used to understand the context of the conversation.

If no solution are found or the issue has not been resolved, reply with 'Not Found'`;

function sanitizeMarkdown(text: string): string {
  return remark()
    .use(githubFlavoredMarkdown)
    .use(stripMarkdown)
    .processSync(text)
    .toString();
}

export async function getEmbeddings(
  references: GithubReference[],
): Promise<EmbedeedReference[]> {
  const { apiKey, model } = getActionInput();

  const inputs = references.map(reference =>
    sanitizeMarkdown(`Title: ${reference.title}\nBody: ${reference.body}`),
  );

  const openai = new OpenAI({ apiKey });
  const embeddings = await openai.embeddings.create({
    input: inputs,
    model,
  });

  return embeddings.data.map((embedding, idx) => ({
    url: references[idx].url,
    embedding: embedding.embedding,
  }));
}

export async function getSimilarReferences(
  source: GithubReference,
  references: GithubReference[],
): Promise<SimilarReference[]> {
  const { minSimilarity, maxIssues } = getActionInput();

  const referenceEmbeddings = await getEmbeddings([source, ...references]);
  const [target, ...rest] = referenceEmbeddings;

  const similarity: SimilarReference[] = rest.map(reference => ({
    url: reference.url,
    similarity: cosineSimilarity(target.embedding, reference.embedding),
  }));

  return similarity
    .sort((a, b) => b.similarity - a.similarity)
    .filter(issue => issue.similarity >= minSimilarity)
    .slice(0, maxIssues);
}
