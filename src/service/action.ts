import { getInput } from '@actions/core';

export function validateInput() {
  const maxTokens = Number(getInput('max_tokens'));
  const maxIssues = Number(getInput('max_issues'));
  const similarityThreshold = Number(getInput('similarity_threshold'));

  if (isNaN(maxTokens) || maxTokens <= 0) {
    throw new Error('Maximum token must be a positive number');
  }

  if (isNaN(maxIssues) || maxIssues <= 0) {
    throw new Error(
      'Maximum issues for similarity search must be a positive number',
    );
  }

  if (
    isNaN(similarityThreshold) ||
    similarityThreshold < 0 ||
    similarityThreshold > 1
  ) {
    throw new Error('Similarity threshold must be a number between 0.0 and 1.0');
  }
}
