import dedent from 'dedent';

import OpenAI from 'openai';

import stripMarkdown from 'strip-markdown';
import githubFlavoredMarkdown from 'remark-gfm';

import { remark } from 'remark';

import { getActionInput } from '@/utils/action';
import { cosineSimilarity } from '@/utils/meth';
import { logDebug } from '@/utils/logger';

import { ModelException } from '@/exceptions/model';

import type { GithubIssue, GithubComment } from '@/types/github';
import type { EmbedeedKnowledge, Knowledge } from '@/types/knowledge';

function generatePrompt(issue: GithubIssue, comments: GithubComment[]): string {
  const header = `Identify the solution from the following problem-solution conversation. Present the solution in form of simple suggestion.

Interaction between conversation participants will be separated by '---'. All conversations begins with @<name> that can be used to identify a participant. Conversation may have a title or a link to a reproduction attempt that can be used to understand the context of the conversation.

If no solution for the issue are found or the potential solution has not been marked as solved by ${issue.user.login}, reply with \`Not Found\`.`;

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

  Solution: 
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

  logDebug(prompt);

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

  logDebug(
    dedent`Solution to issue ${issue.number} according to LLM: ${result}`,
  );

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
