import { getInput } from '@actions/core';

import { InputException } from '@/exceptions/input';

import type { Input } from '@/types/action';

let input: Input;

export function getActionInput(): Input {
  if (!input) {
    const accessToken = getInput('access_token');
    const apiKey = getInput('api_key');
    const model = getInput('model');
    const maxIssues = Number(getInput('max_issues'));
    const minSimilarity = Number(getInput('min_similarity'));
    const showSimilarity = getInput('show_similarity') === 'true';
    const label = getInput('label');
    const discussions = getInput('discussions') === 'true';
    const template = getInput('template');

    const newInput = {
      accessToken,
      apiKey,
      model,
      maxIssues,
      minSimilarity,
      discussions,
      showSimilarity,
      label,
      template,
    };

    validateInput(newInput);

    input = newInput;
  }

  return input;
}

function validateInput({ maxIssues, minSimilarity }: Input) {
  if (isNaN(maxIssues) || maxIssues <= 0) {
    throw new InputException(
      'max_issues',
      'Maximum issues for similarity search must be a positive number',
    );
  }

  if (isNaN(minSimilarity) || minSimilarity < 0 || minSimilarity > 1) {
    throw new InputException(
      'similarity_threshold',
      'Similarity threshold must be a floating point between 0.0 and 1.0',
    );
  }
}
