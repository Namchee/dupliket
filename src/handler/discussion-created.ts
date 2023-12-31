import { context } from '@actions/github';

import { getActionInput } from '@/utils/action';
import { getSimilarReferences } from '@/utils/ai';
import { formatCommentBody } from '@/utils/format';
import {
  getIssues,
  getDiscussions,
  createDiscussionComment,
} from '@/utils/github';
import { logInfo } from '@/utils/logger';

import { GithubReference, mapDiscussionsToReferences } from '@/types/github';

export async function handleDiscussionCreatedEvent() {
  const { discussions } = getActionInput();

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
    logInfo(`Found ${allDiscussions.length} discussions from repository`);

    references.push(...mapDiscussionsToReferences(allDiscussions));
  }

  references = references.filter(ref => ref.url !== reference.url);

  const similarReferences = await getSimilarReferences(reference, references);

  logInfo(`Found ${similarReferences.length} similar references`);

  if (similarReferences.length) {
    const outputBody = formatCommentBody(similarReferences, 'discussion');

    const operations: Promise<unknown>[] = [
      createDiscussionComment(outputBody),
    ];

    await Promise.all(operations);
  }
}
