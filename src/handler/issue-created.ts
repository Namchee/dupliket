import { context } from '@actions/github';

import dedent from 'dedent';

import { createIssueComment, getRepositoryContent } from '@/utils/github';

import { getSimilarIssues } from '@/utils/ai';
import { logInfo } from '@/utils/logger';

import type { GithubIssue } from '@/types/github';
import type { EmbedeedKnowledge } from '@/types/knowledge';

export async function handleIssueCreatedEvent(): Promise<void> {
  const issue = context.payload.issue as GithubIssue;

  const { content } = await getRepositoryContent();
  const knowledges = JSON.parse(content) as EmbedeedKnowledge[];
  if (!knowledges.length) {
    logInfo('Existing knowledge not found');

    return;
  }

  const similarIssues = await getSimilarIssues(issue, knowledges);
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
