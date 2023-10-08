import { context } from '@actions/github';

import { getActionInput } from '@/utils/action';
import { getSimilarReferences } from '@/utils/ai';
import { formatCommentBody } from '@/utils/format';
import {
  getIssues,
  getDiscussions,
  createIssueComment,
  addLabelToIssue,
} from '@/utils/github';
import { logInfo } from '@/utils/logger';

import { GithubReference, mapDiscussionsToReferences } from '@/types/github';

export async function handleDiscussionCreatedEvent() {
  const { discussions, label } = getActionInput();

  const { discussion } = context.payload;
  const reference: GithubReference = {
    url: discussion.html_url,
    title: discussion.title,
    body: discussion.body,
  };

  let references = await getIssues();
  logInfo(`Found ${references.length} issues from repository`);

  if (discussions) {
    const allDiscussions = await getDiscussions();
    logInfo(`Found ${allDiscussions} discussions from repository`);

    references.push(...mapDiscussionsToReferences(allDiscussions));
  }

  references = references.filter(ref => ref.url !== reference.url);

  const similarReferences = await getSimilarReferences(reference, references);

  logInfo(`Found ${similarReferences.length} similar references`);

  if (similarReferences.length) {
    const outputBody = formatCommentBody(similarReferences, 'issue');

    const operations: Promise<unknown>[] = [createIssueComment(outputBody)];
    if (label) {
      operations.push(addLabelToIssue(label));
    }

    await Promise.all(operations);
  }
}
