import dedent from 'dedent';

import { OpenAI } from 'langchain/llms/openai';
import { HuggingFaceInference } from 'langchain/llms/hf';

import { getActionInput } from '@/utils/action';

import { InputException } from '@/exceptions/input';

import { ADD_KNOWLEDGE_PATTERN } from '@/constant/template';

import type { GithubIssue, GithubComment } from '@/types/github';
import type { RawKnowledge } from '@/types/knowledge';

const conversationPrompt = `Identify the solution from the following problem-solution conversation. Present the solution in form of simple suggestion. Conversation between participants will be separated by '---'.

Conversation may have a title or a link to a reproduction attempt that can be used to understand the context of the conversation.`;

const bodyPrompt = `Summarize the following article. The article may have a title or a link to a reproduction attempt that can be used to understand the context. Emphasize the problems that can be found in the article.`;

function getLLM() {
  const { apiKey, modelProvider, model, maxTokens, temperature } =
    getActionInput();

  switch (modelProvider) {
    case 'openai':
      return new OpenAI({
        openAIApiKey: apiKey,
        modelName: model,
        maxTokens,
        temperature,
      });
    case 'huggingface':
      return new HuggingFaceInference({
        apiKey,
        model,
        maxTokens,
        temperature,
      });
    default:
      throw new InputException('model_provider', 'Unsupported model provider.');
  }
}

function formatIssueToPrompt(issue: GithubIssue, comments: GithubComment[]) {
  const commentStr = comments.map(
    comment => `@${comment.user.name}: ${comment.body}`,
  );

  commentStr.push(`@${issue.user}: ${issue.body}`);

  return dedent`
  Title: ${issue.title}

  ---
  ${commentStr.join('\n---\n')}
  ---

  Solution:
  `;
}

export async function summarizeIssueBody(issue: GithubIssue): Promise<string> {
  const llm = getLLM();

  return llm.call(
    dedent`
    ${bodyPrompt}

    Title: ${issue.title}
    Content:
    
    ${issue.body}
    `,
  );
}

export async function summarizeIssue(
  issue: GithubIssue,
  comments: GithubComment[],
): Promise<RawKnowledge> {
  const llm = getLLM();

  const prompt = `${conversationPrompt}\n\n${formatIssueToPrompt(
    issue,
    comments,
  )}`;

  const completion = await llm.call(prompt);
  const matchArr = ADD_KNOWLEDGE_PATTERN.exec(completion) as RegExpExecArray;

  if (matchArr && matchArr.length === 3) {
    return {
      problem: issue.body,
      solution: matchArr[1].trim(),
    };
  }

  throw new Error(
    `Failed to extract summarized knowledge from LLM response. Length is ${matchArr.length}`,
  );
}