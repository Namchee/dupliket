import { getInput } from '@actions/core';
import { getOctokit, context } from '@actions/github';

import type { GithubIssue, GithubComment } from '@/types/github';
import type { Knowledge } from '@/types/knowledge';

const KNOWLEDGE_PATH = '.github/issue_knowledge.json';

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

async function getExistingKnowledge(): Promise<RepositoryFile> {
  const token = getInput('access_token');
  const octokit = getOctokit(token);

  const { owner, repo } = context.issue;

  try {
    const existingContent = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: KNOWLEDGE_PATH,
    }) as {
      data: {
        sha: string,
        content: string,
      },
    };

    const text = Buffer.from(existingContent.data.content, 'base64').toString('utf8')

    return {
      content: text,
      sha: existingContent.data.sha,
    };
  } catch (err) {
    return {
      content: '',
      sha: '',
    };
  }
}

async function saveKnowledge(
  knowledge: Knowledge,
): Promise<void> {
  const token = getInput('access_token');

  const { owner, repo } = context.issue;

  const octokit = getOctokit(token);
  const { content, sha } = await getExistingKnowledge();

  const newKnowledge = [
    ...content,
    {
      issue_number: knowledge.issue_number,
      title: knowledge.title,
      prompt: knowledge.prompt.replace(/\s+/g, ''),
      completion: knowledge.completion.replace(/\s+/g, ''),
    },
  ];

  const knowledgeStr = JSON.stringify(newKnowledge);

  const params = {
    owner,
    repo,
    path: KNOWLEDGE_PATH,
    content: Buffer.from(knowledgeStr).toString('base64'),
    message: 'chore(summarizr): update knowledge',
    sha: '',
  };

  if (sha) {
    params['sha'] = sha;
  }

  await octokit.rest.repos.createOrUpdateFileContents(params);
}

async function hasWriteAccess(username: string): Promise<boolean> {
  const token = getInput('access_token');
  const octokit = getOctokit(token);

  const { owner, repo } = context.issue;

  try {
    await octokit.rest.repos.checkCollaborator({
      owner,
      repo,
      username,
    });

    return true;
  } catch (err) {
    return false;
  }
}

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

async function createReaction(reaction: Reaction, commentID: number): Promise<GithubReaction> {
  const token = getInput('access_token');
  const octokit = getOctokit(token);

  const { owner, repo } = context.issue;

  const { data } = await octokit.rest.reactions.createForIssueComment({
    owner,
    repo,
    comment_id: commentID,
    content: reaction,
  });

  return data as unknown as GithubReaction;
}

async function deleteReaction(commentID: number, reactionID: number): Promise<void> {
  const token = getInput('access_token');
  const octokit = getOctokit(token);

  const { owner, repo } = context.issue;

  await octokit.rest.reactions.deleteForIssueComment({
    owner,
    repo,
    comment_id: commentID,
    reaction_id: reactionID,
  })
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

