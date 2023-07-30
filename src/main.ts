import { Readable } from 'stream';

import { getInput, setFailed } from '@actions/core';
import { getOctokit, context } from '@actions/github';

import { Configuration, OpenAIApi } from 'openai';

import dedent from 'dedent';
import { ReadStream, createReadStream, createWriteStream, fstat, writeFile, writeFileSync } from 'fs';

const prompt = `Summarize the problem and solution from the following conversation in the following format. Interaction with conversation participants will be separated by '###'.`
const promptPattern = /Problems?:\n{0,2}([\s\S]+)Solutions?:\n{0,2}?([\s\S]+)/ig;

type Reaction = 'eyes' | '+1' | 'confused' | '-1';

interface Knowledge {
  id: number;
  title: string;
  summary: string;
  solution: string;
}

interface GithubIssue {
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
  comments: GithubComment[],
) {
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

async function saveKnowledge(
  knowledge: Knowledge,
): Promise<void> {
  const model = getInput('model');

  const prompt = `ID: ${knowledge.id}\nTitle: ${knowledge.title}\nProblem: ${knowledge.summary.replace(/\s+/g, '')}`;
  const knowledgeStr = `{"prompt": "${prompt}", "completion": "${knowledge.solution.replace(/\s+/g, '')}"}`;

  const file = createWriteStream(`./knowledge-${knowledge.id}`);
  file.end(knowledgeStr);

  const key = getInput('openai_key');
  const configuration = new Configuration({
    apiKey: key,
  });
  const openai = new OpenAIApi(configuration);

  const trainingFile = await openai.createFile(file as unknown as File, 'fine-tune');

  console.log(trainingFile.data.status);

  const fineTuneResult = await openai.createFineTune({ training_file: trainingFile.data.id, model });

  console.log(fineTuneResult.data);
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

async function getIssue(): Promise<GithubIssue> {
  const token = getInput('access_token');
  const octokit = getOctokit(token);

  const { owner, repo, number } = context.issue;

  const { data } = await octokit.rest.issues.get({
    owner,
    repo,
    issue_number: number,
  });

  return data as unknown as GithubIssue;
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

async function run(): Promise<void> {
  try {
    const { number } = context.issue;

    const comments = await getIssuesComments();
    const anchor = comments.find(text => text.body && text.body.startsWith('/summarize'));

    if (!anchor || !hasWriteAccess(anchor.user.name)) {
      return;
    }

    const reaction = await createReaction('eyes', anchor.id);
    const issue = await getIssue();

    let anchorSummary = promptPattern.exec(anchor.body as string);

    if (!anchorSummary) {
      anchorSummary = await summarizeIssue(issue, comments) as RegExpExecArray;
    }

    const [_, problem, solution] = anchorSummary;

    await saveKnowledge(
      {
        id: number,
        title: issue.title,
        summary: problem,
        solution: solution,
      },
    );

    console.log('Knowledge saved');

    await Promise.all([
      createReaction('+1', anchor.id),
      deleteReaction(anchor.id, reaction.id),
    ]);
  } catch (err) {
    const error = err as Error;
    setFailed(error.message);
  }
}

run();
