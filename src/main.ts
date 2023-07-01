import { getInput, setFailed } from '@actions/core';
import { getOctokit, context } from '@actions/github';

import { Configuration, OpenAIApi } from 'openai';

const KNOWLEDGE_PATH = '.github/issue_data.jsonl';

interface Knowledge {
  id: number;
  title: string;
  summary: string;
  solution: string;
}

interface RepositoryMetadata {
  owner: string;
  repo: string;
}

interface RepositoryFile {
  content: string;
  sha: string;
}

async function callGPT(token: string) {
  const configuration = new Configuration({
    apiKey: token,
  });

  const client = new OpenAIApi(configuration);

  // const completion = await client.createChatCompletion();
}

async function getExistingKnowledge(
  token: string,
  metadata: RepositoryMetadata,
): Promise<RepositoryFile> {
  const octokit = getOctokit(token);

  try {
    const existingContent = await octokit.rest.repos.getContent({
      owner: metadata.owner,
      repo: metadata.repo,
      path: KNOWLEDGE_PATH,
    }) as {
      data: {
        content: string,
        sha: string,
      },
      status: 200 | 404,
    };

    if (existingContent.status === 404) {
      return {
        content: '',
        sha: '',
      };
    }

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
  token: string,
  metadata: RepositoryMetadata,
  knowledge: Knowledge,
) {
  const prompt = `ID: ${knowledge.id}\nTitle: ${knowledge.title}Problem: ${knowledge.summary}`;
  const knowledgeStr = `{"prompt": "${prompt}", "completion": "${knowledge.solution}"}`

  const octokit = getOctokit(token);

  const { content: prevContent, sha } = await getExistingKnowledge(token, metadata);

  const params = {
    owner: metadata.owner,
    repo: metadata.repo,
    path: KNOWLEDGE_PATH,
    content: `${prevContent}\n${knowledgeStr}`,
    message: 'chore: update knowledge',
  };

  if (sha) {
    params['sha'] = sha;
  }

  await octokit.rest.repos.createOrUpdateFileContents(params);
}

async function run(): Promise<void> {
  try {
    const token = getInput('access_token');
    const key = getInput('openai_key');

    const octokit = getOctokit(token);
    const { number, owner, repo } = context.issue;

    const comments = await octokit.request("GET /repos/{owner}/{repo}/issues/comments", {
      owner,
      repo,
    });
    
    const texts = (comments.data).map(comment => comment.body) as string[];
    const anchor = texts.find(text => text === '/summarizr');

    if (!anchor) {
      return;
    }

    const issue = await octokit.rest.issues.get({
      issue_number: number,
      owner,
      repo,
    });

    const anchorSummary = /[pP]roblems?:\n\n?([\s\S]+?)\n\n[sS]olutions?:\n\n?([\s\S]+)/ig.exec(anchor);

    if (!anchorSummary) {

    }

    if (anchorSummary) {
      const [_, problem, solution] = anchorSummary;

      await saveKnowledge(
        token,
        {
          owner,
          repo,
        },
        {
          id: number,
          title: issue.data.title,
          summary: problem,
          solution: solution,
        },
      );
    } else {
      // Call GPT
    }
  } catch (err) {
      setFailed(err);
  }
}

run();
