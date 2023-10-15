import { setFailed } from '@actions/core';
import { context } from '@actions/github';

import { handleIssueOpenedEvent } from '@/handler/issue-opened';
import { handleDiscussionCreatedEvent } from './handler/discussion-created';

const HANDLER_MAP = {
  'issues/opened': handleIssueOpenedEvent,
  'discussion/created': handleDiscussionCreatedEvent,
};

async function run(): Promise<void> {
  try {
    const { eventName, payload } = context;
    const event = `${eventName}/${payload}`;

    if (event in HANDLER_MAP) {
      const handler = HANDLER_MAP[event as keyof typeof HANDLER_MAP];

      await handler();
    }
  } catch (err) {
    const error = err as Error;

    setFailed(error);
  }
}

run();
