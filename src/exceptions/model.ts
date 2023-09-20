import { Input } from '@/types/action';

export class ModelException extends Error {
  constructor(
    message: string,
    readonly config: Partial<Input>,
  ) {
    super(`[Model] [${config.model}@${config.modelProvider}] ${message}`);
  }
}
