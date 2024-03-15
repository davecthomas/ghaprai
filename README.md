# GitHub Action for Code Changes Explanation and Analysis with OpenAI

This GitHub Action (GHA) leverages OpenAI to provide explanations for code changes in your pull requests or commits. It uses OpenAI's powerful models to generate human-like interpretations of the differences, helping to streamline code reviews and improve understanding of code changes.

## Prerequisites

- An OpenAI account with API access. You can sign up and obtain an API key at [OpenAI](https://openai.com/).
- Billing details added to your OpenAI account to fund the API usage. Manage your billing at [OpenAI Account Billing](https://platform.openai.com/account/billing/overview).

## Setup Instructions

1. **Add Repository Secrets:**
   You need to configure two secrets in your GitHub repository to securely store your OpenAI API key and the AI model you intend to use.

   - `OPENAI_API_KEY`: Your OpenAI API key. This is required to authenticate API requests.
   - `OPEN_AI_MODEL`: The ID of the OpenAI model you wish to use for generating explanations. Defaults to `"gpt-4-turbo-preview"` if not specified.

   To add these secrets:

   - Go to your repository on GitHub.
   - Navigate to **Settings** > **Secrets** > **Actions**.
   - Click **New repository secret** to add each of the above secrets.

2. **GitHub Action Configuration:**
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
