export interface Knowledge {
  issue_number: number;
  solution: string;
}

export interface SimilarKnowledge extends Knowledge {
  similarity: number;
}

export interface EmbedeedKnowledge extends Knowledge {
  embedding: number[];
}

export interface UserKnowledge {
  problem?: string;
  solution?: string;
}
