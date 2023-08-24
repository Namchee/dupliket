import { context } from '@actions/github';

import { createReaction, deleteReaction, getIssueComments, getRepositoryContent, hasWriteAccess, updateRepositoryContent } from '@/service/github';
import { summarizeIssue } from '@/service/model/summarization';

import { ADD_KNOWLEDGE_PATTERN } from '@/constant/template';

import type { GithubIssue, GithubComment } from '@/types/github';
import type { KnowledgeInput } from '@/types/knowledge';

async function handleAddKnowledgeCommand(
  issue: GithubIssue,
  comment: GithubComment
): Promise<void> {
  const processingEmoji = await createReaction('eyes', comment.id);

  let knowledgeInput: KnowledgeInput;
  const anchorSummary = ADD_KNOWLEDGE_PATTERN.exec(comment.body as string);
  if (anchorSummary?.length === 3) {
    const [_, problem, solution] = anchorSummary;

    knowledgeInput = {
      prompt: problem,
      completion: solution,
    };
  } else {
    const comments = await getIssueComments();

    knowledgeInput = await summarizeIssue(issue, comments);
  }

  const { content, sha } = await getRepositoryContent();

  await updateRepositoryContent(
    JSON.stringify([
      ...JSON.parse(content),
      {
        issue_number: issue.number,
        title: issue.title,
        ...knowledgeInput,
      },
    ]),
    sha,
  );

  await Promise.all([
    createReaction('+1', comment.id),
    deleteReaction(comment.id, processingEmoji.id),
  ]);
}

async function handleDeleteKnowledgeCommand(): Promise<void> {

}

export async function handleIssueCommentEvent(): Promise<void> {
  const issue = context.payload.issue as unknown as GithubIssue;
  const comment = context.payload.comment as unknown as GithubComment;

  if (!hasWriteAccess(comment.user.name)) {
    return;
  }

  if (comment.body.startsWith('/add-knowledge')) {
    await handleAddKnowledgeCommand(issue, comment);
  } else if (comment.body.startsWith('/delete-knowledge')) {

  }
}

