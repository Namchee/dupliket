import core from '@actions/core';
import github from '@actions/github';

import { Configuration, OpenAIApi } from 'openai';

interface Knowledge {
  id: number;
  title: string;
  summary: string;
  solution: string;
}

async function callGPT(token: string) {
  const configuration = new Configuration({
    apiKey: token,
  });

  const client = new OpenAIApi(configuration);

  const completion = await client.createChatCompletion();
}

async function saveKnowledge(knowledge: Knowledge) {

}

async function run(): Promise<void> {
  try {
    const accessToken = core.getInput('access_token');
    const openAIKey = core.getInput('openai_key');

    const octokit = github.getOctokit(accessToken);
    const { number, owner, repo } = github.context.issue;

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

    if (anchorSummary) {
      const [_, problem, solution] = anchorSummary;

      await saveKnowledge({
        id: number,
        title: issue.data.title,
        summary: problem,
        solution: solution,
      });
    } else {
      // Call GPT
    }
  } catch (err) {
    core.setFailed(err);
  }
}

run();
