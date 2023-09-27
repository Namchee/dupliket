export interface Knowledge {
  issue_number: number;
  solution: string;
}

export interface EmbedeedKnowledge extends Knowledge {
  embedding: string;
}
