import { MemoryVectorStore } from 'langchain/vectorstores/memory';

import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { HuggingFaceInferenceEmbeddings } from 'langchain/embeddings/hf';

import { getActionInput } from '@/utils/action';

import { InputException } from '@/exceptions/input';

import type { Knowledge } from '@/types/knowledge';

function getEmbeddings() {
  const { apiKey, modelProvider, embeddingModel } = getActionInput();

  switch (modelProvider) {
    case 'openai':
      return new OpenAIEmbeddings({
        openAIApiKey: apiKey,
        modelName: embeddingModel,
      });
    case 'huggingface':
      return new HuggingFaceInferenceEmbeddings({
        apiKey,
        model: embeddingModel,
      });
    default:
      throw new InputException('model_provider', 'Unsupported model provider.');
  }
}

export async function getSimilarIssues(
  issue: string,
  knowledges: Knowledge[],
): Promise<Knowledge[]> {
  const { similarityThreshold, maxIssues } = getActionInput();

  const texts = [];
  const meta = [];

  for (let idx = 0; idx < knowledges.length; idx++) {
    const { title, problem, ...metadata } = knowledges[idx];

    texts.push(`Title: ${title}\nBody: ${problem}`);
    meta.push(metadata);
  }

  const embeddings = getEmbeddings();

  const store = await MemoryVectorStore.fromTexts(texts, meta, embeddings);

  let result = await store.similaritySearchWithScore(issue, maxIssues);
  result = result.filter(document => document[1] >= similarityThreshold);

  return result.map(document => document[0].metadata as Knowledge);
}
