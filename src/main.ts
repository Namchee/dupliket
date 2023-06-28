import * as core from '@actions/core';

async function run(): Promise<void> {
  try {
    const openAIKey = core.getInput('openai_key');

    console.log(openAIKey);
  } catch (err) {
    core.setFailed(err);
  }
}

run();
