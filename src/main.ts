import { setFailed, info } from '@actions/core';
import { context } from '@actions/github';

import { ModelException } from '@/exceptions/model';

import { handleIssueCreatedEvent } from '@/handler/issue-created';
import { handleIssueCommentEvent } from '@/handler/issue-comment';

const HANDLER_MAP = {
  issues: handleIssueCreatedEvent,
  issue_comment: handleIssueCommentEvent,
};

async function run(): Promise<void> {
  try {
    const event = context.eventName;

    if (event in HANDLER_MAP) {
      const handler = HANDLER_MAP[event as keyof typeof HANDLER_MAP];

      await handler();
    }
  } catch (err) {
    const error = err as Error;

    if (error instanceof ModelException) {
      return info(error.message);
    }

    setFailed(error);
  }
}

run();
