export interface RawKnowledge {
  problem: string;
  solution: string;
}

export interface Knowledge extends RawKnowledge {
  issue_number: number;
}
