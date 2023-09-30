import { context } from '@actions/github';

import {
  createReaction,
  deleteReaction,
  getIssueComments,
  getRepositoryContent,
  hasWriteAccess,
  updateRepositoryContent,
} from '@/utils/github';
import { extractKnowledge, getTextEmbedding } from '@/utils/ai';
import { extractUserKnowledge, filterRelevantComments } from '@/utils/comment';
import { logDebug } from '@/utils/logger';

import { StorageException } from '@/exceptions/storage';

import { ADD_COMMAND, DELETE_COMMAND } from '@/constant/command';

import type { GithubIssue, GithubComment } from '@/types/github';
import type { Knowledge } from '@/types/knowledge';

async function handleAddKnowledgeCommand(
  issue: GithubIssue,
  comment: GithubComment,
): Promise<void> {
  const processingEmoji = await createReaction(comment.id, 'eyes');

  try {
    const { content, sha } = await getRepositoryContent();
    const knowledges = JSON.parse(content) as Knowledge[];

    if (knowledges.find(knowledge => knowledge.issue_number === issue.number)) {
      throw new StorageException(
        `Duplicate knowledge for issue ${issue.number}. Please remove existing knowledge first.`,
      );
    }

    const knowledge = extractUserKnowledge(issue.body);
    if (!knowledge.problem) {
      logDebug('User-written problem not found. Embedding from issue body.');

      knowledge.problem = issue.body;
    }

    knowledge.problem = await getTextEmbedding(knowledge.problem);

    if (!knowledge.solution) {
      logDebug(
        'User-written problem not found. Analyzing from issue state with LLM.',
      );

      let comments = await getIssueComments();
      comments = filterRelevantComments(comments);

      knowledge.solution = await extractKnowledge(issue, comments);

      logDebug(`Extracted solution from LLM: ${knowledge.solution}`);
    }

    await updateRepositoryContent(
      JSON.stringify(
        [...knowledges, { ...knowledge, issue_number: issue.number }],
        null,
        2,
      ),
      sha,
    );

    await createReaction(comment.id, '+1');
  } catch (err) {
    await createReaction(comment.id, 'confused');

    throw err;
  } finally {
    await deleteReaction(comment.id, processingEmoji.id);
  }
}

async function handleDeleteKnowledgeCommand(
  issue: GithubIssue,
  comment: GithubComment,
): Promise<void> {
  const processingEmoji = await createReaction(comment.id, 'eyes');

  const { content, sha } = await getRepositoryContent();
  const knowlegdes = JSON.parse(content) as Knowledge[];

  const newKnowledges = knowlegdes.filter(
    knowledge => knowledge.issue_number !== issue.number,
  );

  await updateRepositoryContent(JSON.stringify(newKnowledges), sha);

  await Promise.all([
    createReaction(comment.id, '+1'),
    deleteReaction(comment.id, processingEmoji.id),
  ]);
}

export async function handleIssueCommentEvent(): Promise<void> {
  const issue = context.payload.issue as unknown as GithubIssue;
  const comment = context.payload.comment as unknown as GithubComment;

  if (!hasWriteAccess(comment.user.login)) {
    return;
  }

  if (comment.body.startsWith(ADD_COMMAND)) {
    await handleAddKnowledgeCommand(issue, comment);
  } else if (comment.body.startsWith(DELETE_COMMAND)) {
    await handleDeleteKnowledgeCommand(issue, comment);
  }
}
