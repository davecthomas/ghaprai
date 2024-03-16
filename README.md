# GitHub Action for Code Changes Explanation and Analysis with OpenAI

This GitHub Action (GHA) leverages OpenAI to provide explanations for code changes in your pull requests or commits. It uses OpenAI's powerful models to generate human-like interpretations of the differences, helping to streamline code reviews and improve understanding of code changes.

### Author

[Dave Thomas](https://github.com/davecthomas)

## Prerequisites

- An OpenAI account with API access. You can sign up and obtain an API key at [OpenAI](https://openai.com/).
- Billing details added to your OpenAI account to fund the API usage. Manage your billing at [OpenAI Account Billing](https://platform.openai.com/account/billing/overview).

## Setup Instructions

1. **Generate a GitHub API Token:**

   - Navigate to your [GitHub Tokens Settings](https://github.com/settings/tokens).
   - Click "Generate new token".
   - Add a note for the token (e.g., "GitHub Action Access").
   - Select the necessary scopes. For reading repository data, select `repo`.
   - Click "Generate token" and copy the generated token.

2. **Add Repository Secrets:**
   You need to configure two secrets in your GitHub repository to securely store your OpenAI API key and the AI model you intend to use.

   - For GitHub API Token:
     - Name: `GITHUB_TOKEN`
     - Value: Paste the GitHub API token.
   - For OpenAI API Key:
     - Name: `OPENAI_API_KEY`
     - Value: Paste your OpenAI API key.
   - (Optional) For specifying an OpenAI model:
     - Name: `OPENAI_MODEL`
     - Value: ID of the OpenAI model (defaults to `"gpt-4-turbo-preview"`).

   To add these secrets:

   - Go to your repository on GitHub.
   - Navigate to **Settings** > **Secrets** > **Actions**.
   - Click **New repository secret** to add each of the above secrets.

3. **GitHub Action Configuration:**
   Create a `.github/workflows` directory in your repository if it doesn't already exist. Then, add a new YAML file for the GitHub Action configuration. Here's a basic example to get you started:

   ```yaml
   name: Code Change Explanation

   on:
     push:
       branches:
         - main
     pull_request:
       types: [opened, ready_for_review]

   jobs:
     explain-code-changes:
       runs-on: ubuntu-latest
       steps:
         - name: Checkout
           uses: actions/checkout@v4
           with:
             fetch-depth: 1

         - name: Explain Code Changes
           uses: <Your-GHA-Repository>@main
           env:
             OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
           with:
             GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
             OPEN_AI_MODEL: ${{ secrets.OPEN_AI_MODEL }} # Optional. Defaults to "gpt-4-turbo-preview".
   ```

### Additional Notes

- Ensure your OpenAI account is funded to cover the costs associated with API usage.
- The GitHub API token is used to securely interact with GitHub's API to fetch code diffs.
- The OpenAI API key is required to access OpenAI's API for generating code analyses.

### Build

`npm run build`

## Contributing - not yet

Contributions to this GitHub Action will be welcome once I get the basic V1 features built! In the meantime, please feel free to open issues.
