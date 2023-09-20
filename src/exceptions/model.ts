export class ModelException extends Error {
  constructor(message: string) {
    super(`[Model] ${message}`);
  }
}
