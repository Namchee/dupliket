import { getInput } from '@actions/core';

import dedent from 'dedent';

import { OpenAI } from 'langchain/llms/openai';
import { HuggingFaceInference } from 'langchain/llms/hf';

import { ADD_KNOWLEDGE_PATTERN } from '@/constant/template';

import type { GithubIssue, GithubComment } from '@/types/github';
import type { RawKnowledge } from '@/types/knowledge';

const conversationPrompt = `Summarize the problem and solution from the following conversation in the provided format. Interaction with conversation participants will be separated by '---'.

Conversation may have a title or a link to a reproduction attempt that can be used to understand the context of the conversation.`;

const bodyPrompt = `Summarize the following article. The article may have a title or a link to a reproduction attempt that can be used to understand the context. Emphasize the problems that can be found in the article.`;

function getLLM() {
  const apiKey = getInput('api_key');
  const provider = getInput('model_provider');
  const modelName = getInput('summarization_model');
  const maxTokens = Number(getInput('max_tokens'));

  switch (provider) {
    case 'openai':
      return new OpenAI({
        openAIApiKey: apiKey,
        modelName,
        maxTokens,
      });
    case 'huggingface':
      return new HuggingFaceInference({
        apiKey,
        model: modelName,
        maxTokens,
      });
    default:
      throw new Error('Unsupported model provider.');
  }
}

function formatIssueToPrompt(issue: GithubIssue, comments: GithubComment[]) {
  const commentStr = comments.map(
    comment => `@${comment.user.name}: ${comment.body}`,
  );
  return dedent`
  Title: ${issue.title}

  ---
  ${commentStr.join('\n---\n')}
  ---

  Problem:
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

  if (matchArr.length === 3) {
    return {
      problem: matchArr[1].trim(),
      solution: matchArr[2].trim(),
    };
  }

  throw new Error(
    `Failed to extract summarized knowledge from LLM response. Length is ${matchArr.length}`,
  );
}
