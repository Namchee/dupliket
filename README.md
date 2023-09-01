# Halp

Halp is a GitHub action that helps you on triaging issues on your repository by detecting possible duplicate issues and provide possible solutions for them. The solutions are based on similar issues that has been solved in the past and stored as knowledge base.

It is powered by <abbr title="Large Language Model">LLM</abbr> via [LangChain](https://www.langchain.com/) to summarize issues and detect similarites from issues on the past that can be added or deleted using slash-like commands.

## Features

- ♿ Sensible default options
- 🤝 Supports multiple LLM provider and model
- 🧠 Automatically summarize issues to be added to knowledge base via simple commands

## Installation

You can integrate Halp in your GitHub workflow by creating a new [workflow file](https://docs.github.com/en/actions/using-workflows/about-workflows), for example:

```yaml
name: Run Halp

on:
  # To modify knowledge base
  issue_comment:
    types: [created]
  # To triage issues
  issues:
    types: [opened]

jobs:
  summarize:
    runs-on: ubuntu-latest
    steps:
      - name: Summarize issue and add new knowledge
        uses: Namchee/halp@latest
        with:
          access_token: ${{ secrets.GITHUB_TOKEN }}
          api_key: ${{ secrets.OPENAI_KEY }}
```

## Usage

There are 2 main features of Halp:

### Duplicate Issue Detection

Ha

### Knowledge Gathering

To detect duplicate issue from similar issues in the past

## Inputs

You can customize this actions with these following options (fill it on `with` section):

| **Name** | **Required?** | **Default Value** | **Description** |
| -------- | ------------- | ----------------- | --------------- |
| `access_token` | `true` | `-` | [GitHub's access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens). Used to interact with GitHub API for managing knowledge and creating comments. **Note: Ensure that your token have permissions to read and write code and issues**
| `api_key` | `true` | `-` | LLM provider API key. Please consult to the LLM provider of your choice on how to generate an API key. |
| `model_provider` | `false` | `openai` | LLM provider name. Currently supported values are `openai` and `huggingface` (untested) |
| `summarization_model` | `false` | `gpt-3.5-turbo` | LLM to be used for issue summarization |
| `embedding_model` | `false` | `text-embedding-ada-002` | LLM to be used for calculating similar issues |
| `max_tokens` | `false` | `250` | Maximum number of tokens to be generated on issue summarization. [What is token?](https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them) |
| `max_issues` | `false` | `3` | Maximum number of possibly similar issues to be displayed |
| `similarity_threshold` | `false` | `0.85` | Minimum similarity for an issue to be considered as similar. Must be a floating point between `0.0` and `1.0` |
| `debug` | `false` | `false` | Enable verbose logging |




## Knowledge Store

Halp stores knowledges that are used for finding similar issues in a JSON file that is stored in `.github/issue_knowledge.json`. The knowledge are stored in the following format

```json
[
  {
    "issue_number": 1,
    "problem": "Simple problem description",
    "solution": "Solution to the problem"
  },
  // ...
]
```

> It is not recommended to edit the knowledge base manually, but can be useful when LLM summarization is off-mark.

