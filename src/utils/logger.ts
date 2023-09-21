import { info } from '@actions/core';

import { getActionInput } from '@/utils/action';

export function logDebug(message: string) {
  const { debug } = getActionInput();

  if (!debug) {
    return;
  }

  info(`[Debug] ${message}`);
}
