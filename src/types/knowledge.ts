export interface IssueData {
  issue_number: number;
  title: string;
  completion: string;
}

export interface KnowledgeInput {
  prompt: string;
  completion: string;
}

export type Knowledge = KnowledgeInput & IssueData;
