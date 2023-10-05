import { getOctokit as newOctokit, context } from '@actions/github';

import { getActionInput } from '@/utils/action';

import type {
  GithubReaction,
  Reaction,
  GithubComment,
  GithubReference,
  GithubDiscussion,
} from '@/types/github';

interface IssueCommentQueryResult {
  repository: {
    issue: {
      comments: {
        pageInfo: {
          hasNextPage: boolean;
          endCursor: string;
        };
        nodes: {
          fullDatabaseId: number;
          body: string;
          author: {
            login: string;
          };
          isMinimized: boolean;
        }[];
      };
    };
  };
}

interface DiscussionQueryResult {
  repository: {
    discussions: {
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string;
      };
      nodes: {
        url: string;
        title: string;
        body: string;
        answer?: {
          url: string;
        };
      }[];
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

export async function getIssues(): Promise<GithubReference[]> {
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
      url: issue.url,
      title: issue.title,
      body: issue.body as string,
      user: {
        login: issue.user?.name as string,
        type: issue.user?.type as 'User' | 'Bot',
      },
    }));
}

export async function getDiscussions(
  results: GithubDiscussion[] = [],
  cursor?: string,
): Promise<GithubDiscussion[]> {
  const octokit = getOctokit();

  const { repo } = context;

  const result: DiscussionQueryResult = await octokit.graphql(
    `query getDiscussions($owner: String!, $repo: String!, $cursor: String) {
      repository(owner: $owner, name: $repo) {
        discussions(first: 100, after: $cursor) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            url
            title
            body
            answer {
              url
            }
          }
        }
      }
    }`,
    {
      owner: repo.owner,
      repo: repo.repo,
      cursor,
    },
  );

  results.push(...result.repository.discussions.nodes);

  if (result.repository.discussions.pageInfo.hasNextPage) {
    results = await getDiscussions(
      results,
      result.repository.discussions.pageInfo.endCursor,
    );
  }

  return results;
}

export async function getIssueComments(
  results: GithubComment[] = [],
  cursor?: string,
): Promise<GithubComment[]> {
  const octokit = getOctokit();

  const { owner, repo, number } = context.issue;

  const result = (await octokit.graphql(
    `
    query getComments($owner: String!, $repo: String!, $number: Int!, $cursor: String) {
      repository(owner: $owner, name: $repo) {
        issue(number: $number) {
          comments(first: 100, after: $cursor) {
            pageInfo {
              hasNextPage
              endCursor
            }
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
      cursor,
    },
  )) as IssueCommentQueryResult;

  results.push(
    ...result.repository.issue.comments.nodes.map(comment => ({
      id: comment.fullDatabaseId,
      user: comment.author.login,
      body: comment.body,
      isMinimized: comment.isMinimized,
    })),
  );

  if (result.repository.issue.comments.pageInfo.hasNextPage) {
    results = await getIssueComments(
      results,
      result.repository.issue.comments.pageInfo.endCursor,
    );
  }

  return results;
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
