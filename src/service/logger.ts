import { getInput } from '@actions/core';

export function logDebug(message: string) {
  const isDebugging = Boolean(getInput('debug'));

  if (!isDebugging) {
    return;
  }

  console.log(`[DEBUG] ${message}`);
}
