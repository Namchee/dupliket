import { getOctokit as newOctokit, context } from '@actions/github';

import { getActionInput } from '@/utils/action';

import type {
  GithubReaction,
  Reaction,
  GithubComment,
  GithubIssue,
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

function getOctokit() {
  const { accessToken } = getActionInput();

  return newOctokit(accessToken);
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

export async function getIssues(): Promise<GithubIssue[]> {
  const octokit = getOctokit();

  const { repo } = context;

  const response = await octokit.paginate(octokit.rest.issues.listForRepo, {
    owner: repo.owner,
    repo: repo.repo,
    per_page: 100,
  });

  return response
    .filter(issue => !issue.pull_request)
    .map(issue => ({
      number: issue.number,
      title: issue.title,
      body: issue.body as string,
      user: {
        login: issue.user?.name as string,
        type: issue.user?.type as 'User' | 'Bot',
      },
    }));
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
