import { getInput, setFailed } from '@actions/core';
import { getOctokit, context } from '@actions/github';

import { Configuration, OpenAIApi } from 'openai';

import dedent from 'dedent';

const KNOWLEDGE_PATH = '.github/issue_knowledge.json';

const prompt = `Summarize the problem and solution from the following conversation in the provided format. Conversation have a title that can be used to understand the context of the conversation. Interaction with conversation participants will be separated by '###'.`
const promptPattern = /Problems?:\n{0,2}([\s\S]+)Solutions?:\n{0,2}?([\s\S]+)/ig;

type Reaction = 'eyes' | '+1' | 'confused' | '-1';

interface Knowledge {
  issue_number: number;
  title: string;
  prompt: string;
  completion: string;
}

interface GithubIssue {
  number: number;
  title: string;
  body: string;
}

interface GithubComment {
  id: number;
  user: {
    name: string;
  };
  body: string;
}

interface GithubReaction {
  id: number;
  content: Reaction;
}

interface RepositoryFile {
  content: string;
  sha: string;
}


function formatIssueToPrompt(
  issue: GithubIssue,
  comments: GithubComment[],
) {
  const commentStr = comments.map(comment => `@${comment.user.name}: ${comment.body}`);
  return dedent`
  Title: ${issue.title}

  ###
  ${commentStr.join("\n###\n")}
  ###

  Problem:
  Solution:
  `;
}

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
  const { content: prevContent, sha } = await getExistingKnowledge();

  const newKnowledge = [
    ...JSON.parse(prevContent || '[]'),
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
      anchorSummary = await summarizeIssue(issue) as RegExpExecArray;
    }

    const [_, problem, solution] = anchorSummary;

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

