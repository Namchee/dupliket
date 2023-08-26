import { getInput } from '@actions/core';

import { MemoryVectorStore } from 'langchain/vectorstores/memory';

import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { HuggingFaceInferenceEmbeddings } from 'langchain/embeddings/hf';

import type { Knowledge, IssueData } from '@/types/knowledge';

function getEmbeddings() {
  const apiKey = getInput('api_key');
  const provider = getInput('model_provider');
  const model = getInput('embedding_model');

  switch (provider) {
    case 'openai':
      return new OpenAIEmbeddings({
        openAIApiKey: apiKey,
        modelName: model,
      });
    case 'huggingface':
      return new HuggingFaceInferenceEmbeddings({
        apiKey,
        model,
      });
    default:
      throw new Error('Unsupported model provider.');
  }
}

export async function getSimilarIssues(
  issue: string,
  knowledges: Knowledge[],
): Promise<IssueData[]> {
  const threshold = Number(getInput('similarity_threshold'));
  const numberOfIssues = Number(getInput('max_issues'));

  const texts = [];
  const meta = [];

  for (let idx = 0; idx < knowledges.length; idx++) {
    const { prompt, ...metadata } = knowledges[idx];

    texts.push(prompt);
    meta.push(metadata);
  }

  const embeddings = getEmbeddings();

  const store = await MemoryVectorStore.fromTexts(texts, meta, embeddings);

  console.log('store created');

  let result = await store.similaritySearchWithScore(issue, numberOfIssues);

  console.log(result);
  result = result.filter(document => document[1] >= threshold);

  return result.map(document => document[0].metadata as IssueData);
}
