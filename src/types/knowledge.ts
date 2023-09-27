export interface RawKnowledge {
  embedding: number[];
  solution: string;
}

export interface Knowledge extends RawKnowledge {
  issue_number: number;
}
