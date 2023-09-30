export interface Knowledge {
  issue_number: number;
  solution: string;
}

export interface EncodedKnowledge extends Knowledge {
  embedding: string;
}

export interface UserKnowledge {
  problem?: string;
  solution?: string;
}
