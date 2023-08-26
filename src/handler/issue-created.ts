import { context } from '@actions/github';

import dedent from 'dedent';

import { createIssueComment, getRepositoryContent } from '@/service/github';

import { getSimilarIssues } from '@/service/model/similarity';
import { summarizeIssueBody } from '@/service/model/summarization';

import type { GithubIssue } from '@/types/github';
import type { Knowledge } from '@/types/knowledge';

export async function handleIssueCreatedEvent(): Promise<void> {
  const issue = context.payload.issue as GithubIssue;

  const { content } = await getRepositoryContent();
  const knowledges = JSON.parse(content) as Knowledge[];
  if (!knowledges.length) {
    return;
  }

  const issueSummary = await summarizeIssueBody(issue);
  const similarIssues = await getSimilarIssues(issueSummary, knowledges);

  if (similarIssues.length) {
    const possibleSolutions = similarIssues.map(
      (issue, index) => `${index + 1}. ${issue.completion}`,
    );
    const references = similarIssues.map(
      issue => `- ${issue.title} #${issue.issue_number}`,
    );

    const outputBody = dedent`
    ## Possible Solutions
  
    ${possibleSolutions.join('\n')}
  
    ## Related Issues
  
    ${references.join('\n')}
  
    <sub>This comment is created by Halp, your friendly GitHub Action triaging bot.</sub>
    `;

    await createIssueComment(outputBody);
  }
}
