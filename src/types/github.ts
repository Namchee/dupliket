import type { Knowledge } from '@/types/knowledge';

export type Reaction = 'eyes' | '+1' | 'confused' | '-1';

interface GithubUser {
  name: string;
}

export interface GithubIssue {
  number: number;
  title: string;
  body: string;
}

export interface KnowledgeFile {
  knowledges: Knowledge[];
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
