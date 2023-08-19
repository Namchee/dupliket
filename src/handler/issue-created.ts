import { context } from '@actions/github';

import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";

import foo from '.github/issue_knowledge.json';
import type { Knowledge } from '@/types/knowledge';

export async function handleIssueCreatedEvent() {
  // const { issue } = context;

  const knowledge: Knowledge[] = foo;

  const texts = knowledge.map(k => k.prompt);
  const meta = knowledge.map(({ prompt, ...rest }) => rest);

  const vectorStore = await MemoryVectorStore.fromTexts(
    texts,
    meta,
    new OpenAIEmbeddings({ openAIApiKey: '<fill_this_lmao>' }),
  );

  const result = await vectorStore.similaritySearchWithScore('Conventional PR output is insufficient permissions', 3);

  console.log(result);
}

(async () => {
  await handleIssueCreatedEvent();
})();
