export class InputException extends Error {
  constructor(key: string, message: string) {
    super(`[Input] [${key}] ${message}`);
  }
}
