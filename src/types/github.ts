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
