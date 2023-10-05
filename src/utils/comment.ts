import { ADD_COMMAND, DELETE_COMMAND } from '@/constant/command';

import type { GithubComment } from '@/types/github';
import type { UserKnowledge } from '@/types/knowledge';

export function filterRelevantComments(
  comments: GithubComment[],
): GithubComment[] {
  const result = [];

  for (const comment of comments) {
    const isCommand =
      comment.body.startsWith(ADD_COMMAND) ||
      comment.body.startsWith(DELETE_COMMAND);
    const isExcluded = comment.isMinimized;

    if (!isCommand && !isExcluded) {
      result.push(comment);
    }
  }

  return result;
}

export function extractUserKnowledge(body: string): UserKnowledge {
  const knowledge: UserKnowledge = {};

  const userProblem = /Problems?:\s*([\s\S]*?)(?=(?:Solutions?:|$))/i.exec(
    body,
  );
  if (userProblem) {
    knowledge.problem = userProblem[1].trim();
  }

  const userSolution = /Solutions?:\s*([\s\S]*?)(?=(?:Problems?:|$))/i.exec(
    body,
  );
  if (userSolution) {
    knowledge.solution = userSolution[1].trim();
  }

  return knowledge;
}
