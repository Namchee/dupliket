# Duplikat

Duplikat is a GitHub action that helps repository maintainers to triage issues efficiently by detecting possible duplicate issues and provide possible solutions for them. The solutions are based on similar issues that have been solved in the past and stored as knowledge base.

It is powered by <abbr title="Large Language Model">LLM</abbr> via [LangChain](https://www.langchain.com/) to process issues and detect similarites from stored issues that can be added or deleted using slash-like commands from GitHub UI.

## Features

- ♿ Equipped with sensible default options, minimal setup doesn't require more than 2 inputs
- 🤝 Supports multiple LLM provider and model
- 🧠 Add new knowledge in any way you like, be it automatically with LLM or just manually typing out the knowledge.

## Installation

You can integrate Duplikat in your GitHub workflow by creating a new [workflow file](https://docs.github.com/en/actions/using-workflows/about-workflows), for example:

```yaml
name: Run duplikat

on:
  # To modify knowledge base
  issue_comment:
    types: [created]
  # To detect duplicate issues
  issues:
    types: [opened]

jobs:
  summarize:
    runs-on: ubuntu-latest
    steps:
      - name: Summarize issue and add new knowledge
        uses: Namchee/duplikat@<version>
        with:
          access_token: ${{ secrets.GITHUB_TOKEN }}
          api_key: ${{ secrets.API_KEY }}
```

## Usage

There are 2 main features of Duplikat:

### Duplicate Issue Detection

Every time a new issue is created, Duplikat will try to find similar issue(s) that have been solved in the past. If similar issue(s) are found, Duplikat will create an additional comment that lists possible solutions and reference link for each similar issue(s).

Similarity of issues are determined by the `similarity_threshold` input.

See [Issue #22](https://github.com/Namchee/duplikat/issues/22) for hands-on examples.

### Knowledge Gathering

To keep Duplikat relevant, maintainers may add or delete issue data through slash-like commands.

#### Adding New Knowledge

Maintainers may add a new knowledge related to an issue by creating a new comment on the issue with the following format

```
/add-knowledge
```

Additionally, maintainers may write the problem and solution manually and include them to the base command

```
/add-knowledge

Problem: <summary of the issue>
Solution: <solution for this issue>
```

Doing this will skip any kind of data processing by LLM.

See [Issue #23](https://github.com/Namchee/duplikat/issues/23) for more detailed examples.

> Maintainers may not add an issue as a knowledge more than once

#### Removing Knowledge

Maintainers may also remove knowledge related to an issue by creating a new comment on the issue with the following format

```
/delete-knowledge
```

See [Issue #23](https://github.com/Namchee/duplikat/issues/23) for more detailed examples.

## Inputs

You can customize this actions with these following options (fill it on `with` section):

| **Name** | **Required?** | **Default Value** | **Description** |
| -------- | ------------- | ----------------- | --------------- |
| `access_token` | `true` | `-` | [GitHub's access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens). Used to interact with GitHub API for managing knowledge and creating comments. **Note: Ensure that your token have permissions to read and write code and issues**
| `api_key` | `true` | `-` | LLM provider API key. Please consult to the LLM provider of your choice on how to generate an API key. |
| `model_provider` | `false` | `openai` | LLM provider name. Currently supported values are `openai` and `huggingface` (untested) |
| `model` | `false` | `gpt-3.5-turbo` | LLM to be used for [knowledge gathering](#knowledge-gathering) |
| `embedding_model` | `false` | `text-embedding-ada-002` | LLM to be used for calculating [issue similarity](#duplicate-issue-detection) |
| `temperature` | `false` | `0.5` | Randomness of LLM on [knowledge gathering](#knowledge-gathering) phase. Must be a floating point between `0.0` and `1.0`
| `max_tokens` | `false` | `250` | Maximum number of tokens to be generated on issue summarization. [What is token?](https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them) |
| `max_issues` | `false` | `3` | Maximum number of possibly similar issues to be displayed |
| `similarity_threshold` | `false` | `0.85` | Minimum similarity for an issue to be considered as similar. Must be a floating point between `0.0` and `1.0` |
| `debug` | `false` | `false` | Enable verbose logging |




## File Store

Duplikat stores knowledges that are used for finding similar issues in a JSON file that is stored in `.github/issue_knowledge.json`. The knowledge are stored in the following format

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

> It is not recommended to edit the knowledge base manually, but can be useful when LLM is off-mark.

## License

This project is licensed under the [MIT License](./LICENSE)
