import { context } from '@actions/github';

import {
  addLabelToIssue,
  createIssueComment,
  getDiscussions,
  getIssues,
} from '@/utils/github';

import { getActionInput } from '@/utils/action';
import { getSimilarReferences } from '@/utils/ai';
import { formatCommentBody } from '@/utils/format';
import { logInfo } from '@/utils/logger';

import { GithubReference, mapDiscussionsToReferences } from '@/types/github';

export async function handleIssueOpenedEvent(): Promise<void> {
  const { discussions, label } = getActionInput();

  const issue = context.payload.issue as Record<string, string>;
  const reference: GithubReference = {
    url: issue.html_url,
    title: issue.title,
    body: issue.body,
  };

  let references = await getIssues();
  logInfo(`Found ${references.length} issues from repository`);

  if (discussions) {
    const allDiscussions = await getDiscussions();
    logInfo(`Found ${allDiscussions.length} discussions from repository`);

    references.push(...mapDiscussionsToReferences(allDiscussions));
  }

  console.log(reference.url);
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
