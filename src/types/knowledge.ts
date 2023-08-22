export interface IssueData {
  issue_number: number;
  title: string;
  completion: string;
}

export interface Knowledge extends IssueData {
  prompt: string;
  completion: string;
}
