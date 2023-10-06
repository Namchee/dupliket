import { context } from '@actions/github';

import { createIssueComment, getDiscussions, getIssues } from '@/utils/github';

import { getActionInput } from '@/utils/action';
import { getSimilarReferences } from '@/utils/ai';
import { formatCommentBody } from '@/utils/format';

import { GithubReference, mapDiscussionsToReferences } from '@/types/github';

export async function handleIssueCreatedEvent(): Promise<void> {
  const { discussions } = getActionInput();

  const issue = context.payload.issue as unknown as GithubReference;

  let references = await getIssues();
  references = references.filter(ref => ref.url !== issue.url);

  if (discussions) {
    const allDiscussions = await getDiscussions();

    references.push(...mapDiscussionsToReferences(allDiscussions));
  }

  const similarReferences = await getSimilarReferences(issue, references);

  if (similarReferences.length) {
    const outputBody = formatCommentBody(similarReferences);

    await createIssueComment(outputBody);
  }
}
