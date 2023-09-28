import { ADD_COMMAND, DELETE_COMMAND } from '@/constant/command';

import type { GithubComment } from '@/types/github';

export function filterRelevantComments(
  comments: GithubComment[],
): GithubComment[] {
  const result = [];

  for (const comment of comments) {
    const isBot = comment.user.type === 'Bot';
    const isCommand =
      comment.body.startsWith(ADD_COMMAND) ||
      comment.body.startsWith(DELETE_COMMAND);
    const isExcluded = comment.reactions['-1'] > 0;

    if (!isBot && !isCommand && !isExcluded) {
      result.push(comment);
    }
  }

  return result;
}
