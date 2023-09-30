import { getOctokit as newOctokit, context } from '@actions/github';

import { getActionInput } from '@/utils/action';

import type {
  GithubError,
  GithubReaction,
  RepositoryFile,
  Reaction,
  GithubComment,
} from '@/types/github';

interface IssueCommentQueryResult {
  repository: {
    issue: {
      comments: {
        nodes: {
          fullDatabaseId: number;
          body: string;
          author: {
            login: string;
            type: 'User' | 'Bot';
          };
          isMinimized: boolean;
        }[];
      };
    };
  };
}

const KNOWLEDGE_PATH = '.github/issue_knowledge.json';

function getOctokit() {
  const { accessToken } = getActionInput();

  return newOctokit(accessToken);
}

export async function getRepositoryContent(): Promise<RepositoryFile> {
  const octokit = getOctokit();

  const { owner, repo } = context.issue;

  try {
    const existingContent = (await octokit.rest.repos.getContent({
      owner,
      repo,
      path: KNOWLEDGE_PATH,
    })) as {
      data: {
        sha: string;
        content: string;
      };
    };

    const content = Buffer.from(
      existingContent.data.content,
      'base64',
    ).toString('utf8');

    return {
      content,
      sha: existingContent.data.sha,
    };
  } catch (err) {
    const error = err as GithubError;

    if (error.status === 404) {
      return {
        content: '',
      };
    }

    throw error;
  }
}

export async function updateRepositoryContent(
  content: string,
  sha?: string,
): Promise<void> {
  const { owner, repo } = context.issue;

  const octokit = getOctokit();

  const params = {
    owner,
    repo,
    path: KNOWLEDGE_PATH,
    content: Buffer.from(content).toString('base64'),
    message: 'chore(duplikat): update knowledge',
    sha: '',
  };

  if (sha) {
    params.sha = sha;
  }

  await octokit.rest.repos.createOrUpdateFileContents(params);
}

export async function hasWriteAccess(username: string): Promise<boolean> {
  const octokit = getOctokit();

  const { owner, repo } = context.issue;

  try {
    const result = await octokit.rest.repos.checkCollaborator({
      owner,
      repo,
      username,
    });

    return result.status === 204;
  } catch (err) {
    return false;
  }
}

export async function getIssueComments(): Promise<GithubComment[]> {
  const octokit = getOctokit();

  const { owner, repo, number } = context.issue;

  const result = (await octokit.graphql(
    `
    query getComments($owner: String!, $repo: String!, $number: Int!, $amount: Int = 100) {
      repository(owner: $owner, name: $repo) {
        issue(number: $number) {
          comments(first: $amount) {
            nodes {
              fullDatabaseId
              body
              author {
                login
              }
              isMinimized
            }
          }
        }
      }
    }
  `,
    {
      owner,
      repo,
      number,
    },
  )) as IssueCommentQueryResult;

  const gqlComments = result.repository.issue.comments.nodes;

  return gqlComments.map(comment => ({
    id: comment.fullDatabaseId,
    body: comment.body,
    user: comment.author,
    isMinimized: comment.isMinimized,
  }));
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

export async function createReaction(
  commentID: number,
  reaction: Reaction,
): Promise<GithubReaction> {
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

export async function deleteReaction(
  commentID: number,
  reactionID: number,
): Promise<void> {
  const octokit = getOctokit();

  const { owner, repo } = context.issue;

  await octokit.rest.reactions.deleteForIssueComment({
    owner,
    repo,
    comment_id: commentID,
    reaction_id: reactionID,
  });
}
