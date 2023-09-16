export class InputException extends Error {
  public readonly key: string;

  constructor(key: string, message: string) {
    super(`[Input] ${message}`);

    this.key = key;
  }
}
