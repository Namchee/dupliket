import dedent from 'dedent';

import OpenAI from 'openai';

import stripMarkdown from 'strip-markdown';
import githubFlavoredMarkdown from 'remark-gfm';

import { remark } from 'remark';

import { getActionInput } from '@/utils/action';
import { cosineSimilarity } from '@/utils/meth';

import { ModelException } from '@/exceptions/model';

import type { GithubIssue, GithubComment } from '@/types/github';
import type { EmbedeedKnowledge, Knowledge } from '@/types/knowledge';

function generatePrompt(issue: GithubIssue, comments: GithubComment[]): string {
  const header = `Identify the solution from the following GitHub issue and its comments. Present the solution as a suggestion in one sentence.

  Interaction between participants are separated by '---'. All interactions begins with an '@' followed with a username that can be used to distinguish issue participants. All interactions may have a title or a link to a reproduction attempt that can be used to understand the context of the conversation.

  If no solution are found or the issue has not been resolved, reply with 'Not Found'`;

  const commentStr: string[] = [];

  commentStr.push(`@${issue.user.login}: ${issue.body}`);
  commentStr.push(
    ...comments.map(comment => `@${comment.user.login}: ${comment.body}`),
  );

  return dedent`
  ${header}

  Title: ${issue.title}

  ---
  ${commentStr.join('\n---\n')}
  ---
  `;
}

function sanitizeMarkdown(text: string): string {
  return remark()
    .use(githubFlavoredMarkdown)
    .use(stripMarkdown)
    .processSync(text)
    .toString();
}

export async function getTextEmbedding(text: string): Promise<number[]> {
  const { apiKey } = getActionInput();

  const openai = new OpenAI({ apiKey });
  const embeddings = await openai.embeddings.create({
    input: sanitizeMarkdown(text),
    model: 'text-embedding-ada-002',
  });

  return embeddings.data[0].embedding;
}

export async function extractKnowledge(
  issue: GithubIssue,
  comments: GithubComment[],
): Promise<EmbedeedKnowledge> {
  const { apiKey, model } = getActionInput();

  const openai = new OpenAI({ apiKey });
  const prompt = generatePrompt(issue, comments);

  const completion = await openai.chat.completions.create({
    model,
    temperature: 0,
    messages: [{ role: 'user', content: prompt }],
  });
  let result = completion.choices[0].message.content as string;

  if (result.startsWith('Solution:')) {
    result = result.replace('Solution:', '');
  }

  if (result.startsWith('Not Found')) {
    throw new ModelException('Issue solution not found');
  }

  const title = sanitizeMarkdown(issue.title);
  const body = sanitizeMarkdown(issue.body);

  const embedding = await getTextEmbedding(`Title: ${title}\nBody: ${body}`);

  return {
    issue_number: issue.number,
    embedding: JSON.stringify(embedding),
    solution: result.trim(),
  };
}

export async function getSimilarIssues(
  { title, body }: GithubIssue,
  knowledges: EmbedeedKnowledge[],
): Promise<Knowledge[]> {
  const { minSimilarity, maxIssues } = getActionInput();

  title = sanitizeMarkdown(title);
  body = sanitizeMarkdown(body);

  const embedding = await getTextEmbedding(`Title: ${title}\nBody: ${body}`);
  const similarity: (Knowledge & { similarity: number })[] = knowledges.map(
    knowledge => ({
      ...knowledge,
      similarity: cosineSimilarity(embedding, JSON.parse(knowledge.embedding)),
    }),
  );

  const similarIssues = similarity
    .sort((a, b) => {
      if (a.similarity !== b.similarity) {
        return a.similarity - b.similarity;
      }

      return b.issue_number - a.issue_number;
    })
    .reverse()
    .filter(issue => issue.similarity >= minSimilarity)
    .slice(0, maxIssues);

  return similarIssues.map(issue => ({
    issue_number: issue.issue_number,
    solution: issue.solution,
  }));
}