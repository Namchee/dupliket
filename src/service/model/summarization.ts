import { getInput } from '@actions/core';

import { OpenAI } from 'langchain/llms/openai';

const basePrompt = `Summarize the problem and solution from the following conversation in the provided format. Interaction with conversation participants will be separated by '###'.

Conversation may have a title or a link to a reproduction attempt that can be used to understand the context of the conversation.`;

function getLLM() {
  const modelKey = getInput('api_key');
  const modelName = getInput('model_name');
  const maxTokens = Number(getInput('max_tokens'));

  return new OpenAI({
    openAIApiKey: modelKey,
    modelName,
    maxTokens,
  });
}

export async function summarizeIssue(
  prompt: string
): Promise<string> {
  const llm = getLLM();

  return llm.call(prompt);
}

