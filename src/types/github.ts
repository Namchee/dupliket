interface PageInfo {
  hasNextPage: boolean;
  endCursor: string;
}

export interface IssueQueryResult {
  repository: {
    issues: {
      pageInfo: PageInfo;
      nodes: {
        url: string;
        title: string;
        body: string;
      }[];
    };
  };
}

export interface DiscussionQueryResult {
  repository: {
    discussions: {
      pageInfo: PageInfo;
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

export interface IssueCommentQueryResult {
  repository: {
    issue: {
      comments: {
        pageInfo: PageInfo;
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

export interface LabelQueryResult {
  repository: {
    labels: {
      pageInfo: PageInfo;
      nodes: {
        id: string;
        name: string;
      }[];
    };
  };
}

export interface DiscussionCommentQueryResult {
  comment: {
    databaseId: number;
  };
}

export interface GithubLabel {
  id: string;
  name: string;
}

export interface GithubReference {
  url: string;
  title: string;
  body: string;
}

export interface GithubDiscussion extends GithubReference {
  answer?: {
    url: string;
  };
}

export interface GithubComment {
  id: number;
  user: string;
  body: string;
  isMinimized: boolean;
}

export function mapDiscussionsToReferences(
  discussions: GithubDiscussion[],
): GithubReference[] {
  return discussions.map(discussion => ({
    title: discussion.title,
    body: discussion.body,
    url: discussion.answer ? discussion.answer.url : discussion.url,
  }));
}
