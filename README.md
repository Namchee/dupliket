# Halp

Halp is a GitHub action that helps you manage new issues on your project by detecting newly-created duplicate issues and provide possible solutions for the mentioned issue.

It is powered by LLMs via [LangChain](https://www.langchain.com/) to summarize and find similar issues based on previously solved issues that you can easily manage using simple slash-like commands.

## Features

- TBD

## Installation

You can install Halp by creating a new [workflow file](https://docs.github.com/en/actions/using-workflows/about-workflows), for example:

```yaml
name: Run Halp

on:
  issue_comment:
    types: [created]
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

## Inputs

You can customize this actions with these following options (fill it on `with` section):

| **Name** | **Required?** | **Default Value** | **Description** |
| -------- | ------------- | ----------------- | --------------- |
| `access_token` | `true` | `-` | [GitHub's access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens). Used to interact with GitHub API for managing knowledge and creating comments. 
