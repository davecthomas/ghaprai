import * as core from '@actions/core';
import * as github from '@actions/github';
import { context } from '@actions/github';

export default async function run(): Promise<void> {
  try {
    // Explicitly type the 'token' variable
    const token: string = core.getInput('GITHUB_TOKEN', { required: true });

    // Correctly type the 'octokit' variable with the specific type for the authenticated Octokit instance
    const octokit: ReturnType<typeof github.getOctokit> = github.getOctokit(token);

    // Check if the event that triggered the action was a pull request
    if (context.payload.pull_request) {
      // Explicitly type 'prNumber' as 'number'
      const prNumber: number = context.payload.pull_request.number;
      const owner: string = context.repo.owner;
      const repo: string = context.repo.repo;

      // Use the 'octokit' instance to call the GitHub REST API
      const { data: pr } = await octokit.rest.pulls.get({
        owner: owner,
        repo: repo,
        pull_number: prNumber,
      });

      // Log the PR number to the console
      console.log(`Fetched PR: #${pr.number}`);

      // Fetching details of files changed in the PR
      const { data: files } = await octokit.rest.pulls.listFiles({
        owner: owner,
        repo: repo,
        pull_number: prNumber,
      });

      console.log(`Files changed in PR #${prNumber}:`);
      files.forEach((file) => {
        console.log(file.filename);
      });
    } else {
      // Use 'core.setFailed' to log an error if the action was not triggered by a pull request
      core.setFailed('Action was not triggered by a pull request');
    }
  } catch (error) {
    // Use 'core.setFailed' to log any caught errors
    core.setFailed(`Action failed with error: ${error}`);
  }
}

if (require.main === module) {
  run();
}
