export type Reaction = 'eyes' | '+1' | 'confused' | '-1';

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

export interface RepositoryFile {
  content: string;
  sha?: string;
}

export interface GithubError {
  status: number;
}

export interface GithubComment {
  id: number;
  user: string;
  body: string;
  isMinimized: boolean;
}

export interface GithubReaction {
  id: number;
  content: Reaction;
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
