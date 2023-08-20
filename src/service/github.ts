import { getInput } from '@actions/core';
import { getOctokit as newOctokit, context } from '@actions/github';

import type { GithubError, KnowledgeFile } from '@/types/github';
import type { Knowledge } from '@/types/knowledge';

const KNOWLEDGE_PATH = '.github/issue_knowledge.json';

function getOctokit() {
  const token = getInput('access_token');
  return newOctokit(token);
}

export async function getExistingKnowledge(): Promise<KnowledgeFile> {
  const octokit = getOctokit();

  const { owner, repo } = context.issue;

  try {
    const existingContent = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: KNOWLEDGE_PATH,
    }) as {
      data: {
        sha: string,
        content: string,
      },
    };

    const textContent = Buffer.from(
      existingContent.data.content,
      'base64',
    ).toString('utf8');

    return {
      knowledges: JSON.parse(textContent) as Knowledge[],
      sha: existingContent.data.sha,
    };
  } catch (err) {
    const error = err as GithubError;

    if (error.status === 404) {
      return {
        knowledges: [],
      };
    }

    throw error;
  }
}
