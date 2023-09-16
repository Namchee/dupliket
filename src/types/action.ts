export interface Input {
  accessToken: string;
  apiKey: string;
  modelProvider: string;
  model: string;
  embeddingModel: string;
  temperature: number;
  maxTokens: number;
  maxIssues: number;
  similarityThreshold: number;
  debug: boolean;
}
