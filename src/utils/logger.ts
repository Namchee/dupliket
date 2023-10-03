import { info } from '@actions/core';

export function logInfo(message: string) {
  info(`${new Date().toISOString()} [Info] ${message}`);
}
