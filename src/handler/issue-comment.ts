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
import { filterRelevantComments } from '@/utils/comment';
import { logDebug } from '@/utils/logger';

import { StorageException } from '@/exceptions/storage';

import { ADD_COMMAND, DELETE_COMMAND } from '@/constant/command';
import { ADD_KNOWLEDGE_PATTERN } from '@/constant/template';

import type { GithubIssue, GithubComment } from '@/types/github';
import type { EmbedeedKnowledge, Knowledge } from '@/types/knowledge';

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

    let knowledge: EmbedeedKnowledge;
    const anchorSummary = ADD_KNOWLEDGE_PATTERN.exec(comment.body as string);
    if (anchorSummary?.length === 3) {
      logDebug('Found user-written summary');

      const [_, problem, solution] = anchorSummary;

      const embedding = await getTextEmbedding(
        `Title: ${issue.title.trim()}\nBody:${problem.trim()}`,
      );

      knowledge = {
        issue_number: issue.number,
        embedding: JSON.stringify(embedding),
        solution: solution.trim(),
      };
    } else {
      logDebug(
        'User-written summary not found. Calling LLM to identify the solution',
      );

      const allComments = await getIssueComments();
      const comments = filterRelevantComments(allComments);

      knowledge = await extractKnowledge(issue, comments);
    }

    await updateRepositoryContent(
      JSON.stringify([...knowledges, knowledge], null, 2),
      sha,
    );

    await createReaction(comment.id, '+1');
  } catch (err) {
    await createReaction(comment.id, '-1');

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
