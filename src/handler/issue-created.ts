import { context } from '@actions/github';

import dedent from 'dedent';

import { createIssueComment, getIssues } from '@/utils/github';

import { getSimilarIssues } from '@/utils/ai';

import type { GithubIssue } from '@/types/github';

export async function handleIssueCreatedEvent(): Promise<void> {
  const issue = context.payload.issue as GithubIssue;

  const allReferences = await getIssues();

  const similarIssues = await getSimilarIssues(issue, issues);
  const count = similarIssues.length;

  if (count) {
    const solutions = similarIssues.map(
      (issue, index) => `- ${issue.solution}[^${index + 1}]`,
    );
    const links = similarIssues.map(
      (issue, index) =>
        `[^${index + 1}]: #${issue.issue_number} (${(
          issue.similarity * 100
        ).toFixed(2)}%)`,
    );

    const nominator = similarIssues.length === 1 ? 'is' : 'are';
    const noun = similarIssues.length === 1 ? 'issue' : 'issues';

    const outputBody = dedent`
    Looks like there ${nominator} ${count} similar ${noun} to this one. Here is a list possible solutions based on those similar ${noun}:
  
    ${solutions.join('\n')}
    ${links.join('\n')}
  
    <sub>This comment is created by Duplikat, your friendly GitHub Action issue triaging bot.</sub>
    `;

    await createIssueComment(outputBody);
  }
}
