export interface RawKnowledge {
  title: string;
  problem: string;
  solution: string;
}

export interface Knowledge extends RawKnowledge {
  issue_number: number;
}
