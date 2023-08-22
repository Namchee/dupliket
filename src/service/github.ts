import { getInput } from '@actions/core';
import { getOctokit as newOctokit, context } from '@actions/github';

import type { GithubError, GithubReaction, KnowledgeFile, Reaction } from '@/types/github';
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

export async function createIssueComment(body: string): Promise<void> {
  const octokit = getOctokit();

  const { owner, repo, number } = context.issue;

  await octokit.rest.issues.createComment({
    body,
    issue_number: number,
    owner,
    repo,
  });
}

export async function createReaction(reaction: Reaction, commentID: number): Promise<GithubReaction> {
  const octokit = getOctokit();

  const { owner, repo } = context.issue;

  const { data } = await octokit.rest.reactions.createForIssueComment({
    owner,
    repo,
    comment_id: commentID,
    content: reaction,
  });

  return data as unknown as GithubReaction;
}

export async function deleteReaction(commentID: number, reactionID: number): Promise<void> {
  const octokit = getOctokit();

  const { owner, repo } = context.issue;

  await octokit.rest.reactions.deleteForIssueComment({
    owner,
    repo,
    comment_id: commentID,
    reaction_id: reactionID,
  })
}
