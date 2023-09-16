import { context } from '@actions/github';

import dedent from 'dedent';

import { createIssueComment, getRepositoryContent } from '@/utils/github';

import { getSimilarIssues } from '@/utils/similarity';
import { summarizeIssueBody } from '@/utils/summarization';
import { logDebug } from '@/utils/logger';

import type { GithubIssue } from '@/types/github';
import type { Knowledge } from '@/types/knowledge';

export async function handleIssueCreatedEvent(): Promise<void> {
  const issue = context.payload.issue as GithubIssue;

  const { content } = await getRepositoryContent();
  const knowledges = JSON.parse(content) as Knowledge[];
  if (!knowledges.length) {
    logDebug('Existing knowledge not found');

    return;
  }

  const issueSummary = await summarizeIssueBody(issue);
  const similarIssues = await getSimilarIssues(issueSummary, knowledges);

  logDebug(`Found ${similarIssues.length} similar issue(s)`);

  if (similarIssues.length) {
    const possibleSolutions = similarIssues.map(
      (issue, index) => `${index + 1}. ${issue.solution}`,
    );
    const references = similarIssues.map(
      (issue, index) => `${index + 1}. #${issue.issue_number}`,
    );

    const outputBody = dedent`
    ### Possible Solutions
  
    ${possibleSolutions.join('\n')}
  
    ## Related Issues
  
    ${references.join('\n')}
  
    <sub>This comment is created by Halp, your friendly GitHub Action triaging bot.</sub>
    `;

    await createIssueComment(outputBody);
  }
}
