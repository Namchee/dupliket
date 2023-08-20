import { getInput } from '@actions/core';

import { MemoryVectorStore } from 'langchain/vectorstores/memory';

import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { HuggingFaceInferenceEmbeddings } from 'langchain/embeddings/hf';

import type { Knowledge } from '@/types/knowledge';

const EMBEDDING_PROVIDER = {
  openai: OpenAIEmbeddings,
  huggingface: HuggingFaceInferenceEmbeddings,
}

function getEmbeddings() {
  const apiKey = getInput('api_key');
  const provider = getInput('model_provider');
  const model = getInput('model_name');

  if (!(provider in EMBEDDING_PROVIDER)) {
    throw new Error('Unsupported model provider.');
  }

  switch (provider) {
    case 'openai': return new OpenAIEmbeddings({
      openAIApiKey: apiKey,
      modelName: model,
    });
    case 'huggingface': return new HuggingFaceInferenceEmbeddings({
      apiKey,
      model,
    });
    default: throw new Error('Unsupported model provider.');
  }
}

export function getSimilarIssues(
  issue: string,
  knowledges: Knowledge[],
) {
  const threshold = Number(getInput('confidence'));
  const embeddings = getEmbeddings();

  const store = new MemoryVectorStore(embeddings);

  return store.similaritySearchWithScore(issue, threshold);
}
