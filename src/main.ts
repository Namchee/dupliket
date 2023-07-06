import { getInput, setFailed } from '@actions/core';
import { getOctokit, context } from '@actions/github';

import dedent from 'dedent';

import { Configuration, OpenAIApi } from 'openai';

const KNOWLEDGE_PATH = '.github/issue_data.jsonl';

const prompt = `Summarize the problem and solution from the following conversation. Interaction with conversation participants will be separated by '###'`

interface Knowledge {
  id: number;
  title: string;
  summary: string;
  solution: string;
}

interface RepositoryFile {
  content: string;
  sha: string;
}

function formatIssueToPrompt(
  issue: { title: string, body?: string | null },
  comments: { user: { name: string }, body: string }[],
) {
  const commentStr = comments.map(comment => `@${comment.user.name}: ${comment.body}`);
  return dedent`
  Title: ${issue.title}

  ###
  ${commentStr.join("\n###\n")}
  ###
  `;
}

async function summarizeIssue(
  issue: { title: string, body?: string | null },
  comments: { body: string }[],
) {
  const key = getInput('openai_key');

  const configuration = new Configuration({
    apiKey: key,
  });
  const openai = new OpenAIApi(configuration);

  const completion = await openai.createCompletion({
    model: 'gpt-3.5-turbo',
    prompt: `${prompt}\n\n${formatIssueToPrompt()}`,
    temperature: 0.35,
    max_tokens: 150,
  });
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
) {
  const token = getInput('access_token');
  const { owner, repo } = context.issue;

  const prompt = `ID: ${knowledge.id}\nTitle: ${knowledge.title}Problem: ${knowledge.summary}`;
  const knowledgeStr = `{"prompt": "${prompt}", "completion": "${knowledge.solution}"}`

  const octokit = getOctokit(token);

  const { content: prevContent, sha } = await getExistingKnowledge();

  const params = {
    owner,
    repo,
    path: KNOWLEDGE_PATH,
    content: `${prevContent}\n${knowledgeStr}`,
    message: 'chore(summarizr): update knowledge',
  };

  if (sha) {
    params['sha'] = sha;
  }

  await octokit.rest.repos.createOrUpdateFileContents(params);
}

async function hasWriteAccess(): Promise<boolean> {
  const token = getInput('access_token');
  const octokit = getOctokit(token);

  const { owner, repo } = context.issue;
  const user = context.actor;

  try {
    await octokit.rest.repos.checkCollaborator({
      owner,
      repo,
      username: user,
    });

    return true;
  } catch (err) {
    return false;
  }
}

async function getIssue(): Promise<{ title: string, body?: string | null }> {
  const token = getInput('access_token');
  const octokit = getOctokit(token);

  const { owner, repo, number } = context.issue;

  const { data } = await octokit.rest.issues.get({
    owner,
    repo,
    issue_number: number,
  });

  return data;
}

async function run(): Promise<void> {
  try {
    const token = getInput('access_token');
    const key = getInput('openai_key');

    const octokit = getOctokit(token);
    const { number, owner, repo } = context.issue;

    const comments = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: number,
    });
        
    const anchor = comments.data.find(text => text.body && text.body.startsWith('/summarizr'));

    if (!anchor || !hasWriteAccess()) {
      return;
    }

    const reaction = await octokit.rest.reactions.createForIssueComment({
      owner,
      repo,
      comment_id: anchor.id,
      content: 'eyes',
    })

    const issue = await octokit.rest.issues.get({
      issue_number: number,
      owner,
      repo,
    });

    const anchorSummary = /[pP]roblems?:\n\n?([\s\S]+?)\n\n[sS]olutions?:\n\n?([\s\S]+)/ig.
      exec(anchor.body as string);

    if (!anchorSummary) {
      const summary = summarizeIssue(key);

      await Promise.all([
        octokit.rest.reactions.createForIssueComment({
          owner,
          repo,
          comment_id: anchor.id,
          content: '-1',
        }),
        octokit.rest.reactions.deleteForIssueComment({
          owner,
          repo,
          comment_id: anchor.id,
          reaction_id: reaction.data.id,
        }),
      ]);

      return;
    }

    const [_, problem, solution] = anchorSummary;

    await saveKnowledge(
      {
        id: number,
        title: issue.data.title,
        summary: problem,
        solution: solution,
      },
    );

    await Promise.all([
      octokit.rest.reactions.createForIssueComment({
        owner,
        repo,
        comment_id: anchor.id,
        content: '+1',
      }),
      octokit.rest.reactions.deleteForIssueComment({
        owner,
        repo,
        comment_id: anchor.id,
        reaction_id: reaction.data.id,
      }),
    ]);
  } catch (err) {
      setFailed(err);
  }
}

run();
