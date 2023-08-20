import { context } from '@actions/github';

import { OpenAIEmbeddings } from "langchain/embeddings/openai";

import { getExistingKnowledge } from '@/service/github';

export async function handleIssueCreatedEvent() {
  const { issue } = context;

  const { knowledges } = await getExistingKnowledge();

  if (!knowledges.length) {
    return;
  }

  const texts = knowledges.map(k => k.prompt);
  const meta = knowledges.map(({ prompt, ...rest }) => rest);
}
