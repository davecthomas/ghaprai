# ghaprai

Github action for PR reviews with AI

## Installation

To install this github action, you will need to commit the .github/workflows content to your repo.

## Prerequisites

Before you begin, ensure you have met the following requirements:

- You have a GitHub account and have owner or admin access to a repository where you want to use this action.
- You understand the basics of creating and configuring GitHub Actions workflows.

## Adding to Your Repository

To use in your repository, follow these steps:

### 1. Create a Workflow File

Create a new file in your repository under `.github/workflows`, for example, `.github/workflows/pr_details_logger.yml`. If the `.github/workflows` directory doesn't exist, create it.

### 2. Configure the Workflow

Add the following content to your workflow file, replacing placeholders with your specific configuration where necessary. Note that the GITHUB_TOKEN is automatically generated and is a reserved name in Github for this purpose.

```yaml
name: PR Details Logger
on:
  pull_request:
    types: [opened, ready_for_review]

jobs:
  log-pr-details:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Log Pull Request Details
        uses: <Your-GitHub-Username>/<Your-Action-Repository>@<Version-Tag>
        with:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
