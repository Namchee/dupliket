import { context } from '@actions/github';

import { getExistingKnowledge } from '@/service/github';

import { getSimilarIssues } from '@/service/model/similarity';
import { summarizeIssueBody } from '@/service/model/summarization';

import type { GithubIssue } from '@/types/github';

export async function handleIssueCreatedEvent() {
  const issue = context.payload.issue as GithubIssue;

  const { knowledges } = await getExistingKnowledge();

  if (!knowledges.length) {
    return;
  }

  const issueSummary = await summarizeIssueBody(issue);
}
