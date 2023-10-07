import { getOctokit as newOctokit, context } from '@actions/github';

import { getActionInput } from '@/utils/action';

import type {
  GithubComment,
  GithubReference,
  GithubDiscussion,
} from '@/types/github';

interface IssueQueryResult {
  repository: {
    issues: {
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string;
      };
      nodes: {
        url: string;
        title: string;
        body: string;
      }[];
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

export async function getIssues(
  results: GithubReference[] = [],
  cursor?: string,
): Promise<GithubReference[]> {
  const octokit = getOctokit();

  const { repo } = context;

  const result: IssueQueryResult = await octokit.graphql(
    `query getIssues($owner: String!, $repo: String!, $cursor: String) {
      repository(owner: $owner, name: $repo) {
        issues(first: 100, after: $cursor) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            url
            title
            body
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

  results.push(...result.repository.issues.nodes);

  if (result.repository.issues.pageInfo.hasNextPage) {
    results = await getDiscussions(
      results,
      result.repository.issues.pageInfo.endCursor,
    );
  }

  return results;
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

export async function createIssueComment(body: string): Promise<number> {
  const octokit = getOctokit();

  const { owner, repo, number } = context.issue;

  const comment = await octokit.rest.issues.createComment({
    body,
    issue_number: number,
    owner,
    repo,
  });

  return comment.data.id;
}

export async function addLabelToIssue(label: string): Promise<void> {
  const octokit = getOctokit();

  const { owner, repo, number } = context.issue;

  await octokit.rest.issues.addLabels({
    owner,
    repo,
    issue_number: number,
    labels: [label],
  });
}
