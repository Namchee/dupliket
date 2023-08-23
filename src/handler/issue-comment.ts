import { getInput } from '@actions/core';
import { getOctokit, context } from '@actions/github';

import { createReaction, getExistingKnowledge, deleteReaction, hasWriteAccess } from '@/service/github';

import type { GithubIssue, GithubComment } from '@/types/github';
import type { Knowledge } from '@/types/knowledge';

const promptPattern = /Problems?:\n{0,2}([\s\S]+)Solutions?:\n{0,2}?([\s\S]+)/ig;

/*
async function summarizeIssue(
  issue: GithubIssue,
) {
  const comments = await getIssuesComments();

  const key = getInput('openai_key');
  const model = getInput('model');
  const temperature = Number(getInput('temperature'));
  const tokens = Number(getInput('max_tokens'));

  const configuration = new Configuration({
    apiKey: key,
  });
  const openai = new OpenAIApi(configuration);

  const completion = await openai.createCompletion({
    model: model,
    prompt: `${prompt}\n\n${formatIssueToPrompt(issue, comments)}`,
    temperature,
    max_tokens: tokens,
  });

  return promptPattern.exec(completion.data.object);
}
*/

async function getIssuesComments(): Promise<GithubComment[]> {
  const token = getInput('access_token');
  const octokit = getOctokit(token);

  const { owner, repo, number } = context.issue;

  const { data } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: number,
  })

  return data as unknown as GithubComment[];
}

export async function handleIssueCommentEvent(): Promise<void> {
  const issue = context.payload.issue as unknown as GithubIssue;
  const comment = context.payload.comment as unknown as GithubComment;
    
  if (!hasWriteAccess(comment.user.name)) {
    return;
  }

  if (comment.body.startsWith('/add-knowledge')) {
    const processingEmoji = await createReaction('eyes', comment.id);

    let anchorSummary = promptPattern.exec(comment.body as string);

    if (!anchorSummary) {
      // anchorSummary = await summarizeIssue(issue) as RegExpExecArray;
      anchorSummary = null;
    }

    const [_, problem, solution] = anchorSummary as RegExpExecArray;

    await saveKnowledge(
      {
        issue_number: issue.number,
        title: issue.title,
        prompt: problem,
        completion: solution,
      },
    );

    await Promise.all([
      createReaction('+1', comment.id),
      deleteReaction(comment.id, processingEmoji.id),
    ]);
  } else if (comment.body.startsWith('/delete-knowledge')) {

  }
}

