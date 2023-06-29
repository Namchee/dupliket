import core from '@actions/core';
import github from '@actions/github';

async function run(): Promise<void> {
  try {
    const accessToken = core.getInput('access_token');
    const openAIKey = core.getInput('openai_key');

    const octokit = github.getOctokit(accessToken);
    const { owner, repo } = github.context.issue;
    
    const comments = await octokit.request("GET /repos/{owner}/{repo}/issues/comments", {
      owner,
      repo,
    });
    
    const texts = comments.data.map(comment => comment.body);
    const anchor = texts.find(text => text?.startsWith('/summarizr'));

    if (!anchor) {
      return;
    }

    const anchorSummary = /[pP]roblems?:\n\n?([\s\S]+?)\n\n[sS]olutions?:\n\n?([\s\S]+)/ig.exec(anchor);

    if (anchorSummary) {

    } else {
      // Call GPT
    }
  } catch (err) {
    core.setFailed(err);
  }
}

run();
