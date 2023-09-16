import { getInput } from '@actions/core';

import { InputException } from '@/exceptions/input';

import type { Input } from '@/types/action';

let input: Input;

export function getActionInput(): Input {
  if (!input) {
    const accessToken = getInput('access_token');
    const apiKey = getInput('apiKey');
    const modelProvider = getInput('model_provider');
    const model = getInput('model');
    const embeddingModel = getInput('embedding_model');
    const temperature = Number(getInput('temperature'));
    const maxTokens = Number(getInput('max_tokens'));
    const maxIssues = Number(getInput('max_issues'));
    const similarityThreshold = Number(getInput('similarity_threshold'));
    const debug = getInput('debug') === 'true';

    const newInput = {
      accessToken,
      apiKey,
      modelProvider,
      model,
      embeddingModel,
      temperature,
      maxIssues,
      maxTokens,
      similarityThreshold,
      debug,
    };

    validateInput(newInput);

    input = newInput;
  }

  return input;
}

function validateInput({
  maxIssues,
  maxTokens,
  similarityThreshold,
  temperature,
}: Input) {
  if (isNaN(maxTokens) || maxTokens <= 0) {
    throw new InputException(
      'max_tokens',
      'Maximum tokens must be a positive number',
    );
  }

  if (isNaN(maxIssues) || maxIssues <= 0) {
    throw new InputException(
      'max_issues',
      'Maximum issues for similarity search must be a positive number',
    );
  }

  if (isNaN(temperature) || temperature < 0 || temperature > 1) {
    throw new InputException(
      'temperature',
      'Model temperature must be a floating point between 0.0 and 1.0',
    );
  }

  if (
    isNaN(similarityThreshold) ||
    similarityThreshold < 0 ||
    similarityThreshold > 1
  ) {
    throw new InputException(
      'similarity_threshold',
      'Similarity threshold must be a floating point between 0.0 and 1.0',
    );
  }
}
