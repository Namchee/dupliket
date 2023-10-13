import { getOctokit as newOctokit, context } from '@actions/github';

import { getActionInput } from '@/utils/action';

import type {
  GithubLabel,
  GithubComment,
  GithubReference,
  GithubDiscussion,
  DiscussionCommentQueryResult,
  DiscussionQueryResult,
  IssueCommentQueryResult,
  IssueQueryResult,
  LabelQueryResult,
} from '@/types/github';

function getOctokit() {
  const { accessToken } = getActionInput();

  return newOctokit(accessToken);
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

  const result: IssueCommentQueryResult = await octokit.graphql(
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
  );

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

export async function createDiscussionComment(body: string): Promise<number> {
  const octokit = getOctokit();

  const { discussion } = context.payload;

  const result: DiscussionCommentQueryResult = await octokit.graphql(
    `
    mutation addDiscussionComment($input: AddDiscussionCommentInput!) {
      addDiscussionComment(input: $input) {
        comment {
          databaseId
        }
      }
    }
    `,
    {
      input: {
        discussionId: discussion.node_id,
        body,
      },
    },
  );

  return result.comment.databaseId;
}

async function _getLabels(results: GithubLabel[] = [], cursor?: string) {
  const octokit = getOctokit();

  const { owner, repo } = context.repo;

  const result: LabelQueryResult = await octokit.graphql(
    `
    query getLabels($owner: String!, $repo: String!, $cursor: String) {
      repository(owner: $owner, repo: $repo) {
        labels(first: 100, after: $cursor) {
          pageInfo {
            endCursor
            hasNextPage
          }
          nodes {
            id
            name
          }
        }
      }
    }
    `,
    {
      owner,
      repo,
      cursor,
    },
  );

  results.push(...result.repository.labels.nodes);
  if (result.repository.labels.pageInfo.hasNextPage) {
    results = await _getLabels(
      results,
      result.repository.labels.pageInfo.endCursor,
    );
  }

  return results;
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
