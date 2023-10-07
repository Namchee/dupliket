# Duplikat

Duplikat is a GitHub action that helps repository maintainers to triage issues efficiently by detecting possible duplicate issues and discussions that has previously been created. It is powered by <abbr title="Large Language Model">LLM</abbr> provided by [OpenAI](https://openai.com/) to process issues and detect similarites.

## Installation

You can integrate Duplikat in your GitHub workflow by creating a new [workflow file](https://docs.github.com/en/actions/using-workflows/about-workflows), for example:

```yaml
name: Run duplikat

on:
  issues:
    types: [opened] # To detect duplicate issues when a new issue is created
  discussion:
    types: [created] # To detect duplicate issues when a new discussion is created

jobs:
  triage:
    runs-on: ubuntu-latest
    if: ${{ !github.event.issue.pull_request }} # Only runs on issues. 
    steps:
      - name: Find possible duplicates
        uses: Namchee/duplikat@<version>
        with:
          access_token: ${{ secrets.GITHUB_TOKEN }}
          api_key: ${{ secrets.API_KEY }}
```

## Inputs

You can customize this actions with these following options (fill it on `with` section):

| **Name** | **Required?** | **Default Value** | **Description** |
| -------- | ------------- | ----------------- | --------------- |
| `access_token` | `true` | *This field is required* | [GitHub's access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens). Used to interact with GitHub API for managing knowledge and creating comments. **Note: Ensure that your token have permissions to read and write code and issues**
| `api_key` | `true` | *This field is required* | OpenAI's API key. You can get it by [signing up](https://platform.openai.com/signup) for an OpenAI account |
| `model` | `false` | `text-embedding-ada-002` | Language model to be used when searching and calculating issue and discussion similarity. |
| `max_issues` | `false` | `3` | Maximum number of possibly similar issues and discussions to be displayed |
| `min_similarity` | `false` | `0.9` | Minimum similarity for an issue or discussion to be considered as similar. Must be a floating point between `0.0` and `1.0` |
| `show_similarity` | `false` | `false` | Include similarity percentage as [footnote](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#footnotes) |
| `label` | `false` |  | Label to be applied when an issue or discussion has duplicates. Fill with an empty string to not apply any labels |
| `template` | `false` | | Apply a custom message when an issue or discussion has duplicates. See section [customizing message](#customizing-message) for more detailed information on how to use this field.

### Customizing Message

By default, `duplikat` will create a message containing references existing issues and discussions when an issue or discussion is created and has potential duplicates. While this is good enough for normal use-cases, you might want to change the message to suit your needs or want to change the formatting instead.

You can customize the message by providing a [mustache template](https://github.com/janl/mustache.js) to `template` option in the workflow file. Markdown formatting is supported.

Below are the list of replacable values that you can use in your custom message:

| **Name** | **Description** |
| -------- | ------------- |
| `user` | Username that triggers the event |
| `count` | Number of similar issues and discussions |
| `references` | List of issue and discussion links |

## License

This project is licensed under the [MIT License](./LICENSE)
