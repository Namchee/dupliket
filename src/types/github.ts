export type Reaction = 'eyes' | '+1' | 'confused' | '-1';

interface GithubUser {
  login: string;
  type: 'User' | 'Bot';
}

export interface GithubIssue {
  number: number;
  user: GithubUser;
  title: string;
  body: string;
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
  user: GithubUser;
  body: string;
}

export interface GithubReaction {
  id: number;
  content: Reaction;
}
