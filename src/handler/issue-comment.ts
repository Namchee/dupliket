import { context } from '@actions/github';

import {
  createReaction,
  deleteReaction,
  getIssueComments,
  getRepositoryContent,
  hasWriteAccess,
  updateRepositoryContent,
} from '@/service/github';
import { summarizeIssue } from '@/service/model/summarization';
import { logDebug } from '@/service/logger';

import { ADD_KNOWLEDGE_PATTERN } from '@/constant/template';

import type { GithubIssue, GithubComment } from '@/types/github';
import type { Knowledge, RawKnowledge } from '@/types/knowledge';

async function handleAddKnowledgeCommand(
  issue: GithubIssue,
  comment: GithubComment,
): Promise<void> {
  const processingEmoji = await createReaction('eyes', comment.id);

  const { content, sha } = await getRepositoryContent();
  const knowledges = JSON.parse(content) as Knowledge[];

  if (knowledges.find(knowledge => knowledge.issue_number === issue.number)) {
    await Promise.all([
      createReaction('-1', comment.id),
      deleteReaction(comment.id, processingEmoji.id),
    ]);

    throw new Error('Duplicate knowledge found. Please remove existing knowledge with the same issue number first');
  }

  let knowledgeInput: RawKnowledge;
  const anchorSummary = ADD_KNOWLEDGE_PATTERN.exec(comment.body as string);
  if (anchorSummary?.length === 3) {
    logDebug('Found user-written summary');

    const [_, problem, solution] = anchorSummary;

    knowledgeInput = {
      problem: problem.trim(),
      solution: solution.trim(),
    };
  } else {
    logDebug('User-written summary not found. Calling LLM to identify the solution');

    let comments = await getIssueComments();
    comments = comments.filter(comment => comment.user.type !== 'Bot');

    knowledgeInput = await summarizeIssue(issue, comments);

    logDebug(`Summary by LLM: Problem: ${knowledgeInput.problem}\nSolution: ${knowledgeInput.solution}`);
  }

  await updateRepositoryContent(
    JSON.stringify([
      ...knowledges,
      {
        issue_number: issue.number,
        ...knowledgeInput,
      },
    ], null, 2),
    sha,
  );

  await Promise.all([
    createReaction('+1', comment.id),
    deleteReaction(comment.id, processingEmoji.id),
  ]);
}

async function handleDeleteKnowledgeCommand(
  issue: GithubIssue,
  comment: GithubComment,
): Promise<void> {
  const processingEmoji = await createReaction('eyes', comment.id);

  const { content, sha } = await getRepositoryContent();
  const knowlegdes = JSON.parse(content) as Knowledge[];

  const newKnowledges = knowlegdes.filter(
    knowledge => knowledge.issue_number !== issue.number,
  );

  await updateRepositoryContent(JSON.stringify(newKnowledges), sha);

  await Promise.all([
    createReaction('+1', comment.id),
    deleteReaction(comment.id, processingEmoji.id),
  ]);
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
    await handleDeleteKnowledgeCommand(issue, comment);
  }
}
