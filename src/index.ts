import * as core from '@actions/core';
import * as github from '@actions/github';
import { context } from '@actions/github';

export async function run(): Promise<void> {
  try {
    const token: string = core.getInput('GITHUB_TOKEN', { required: true });
    const octokit = github.getOctokit(token);

    const eventName: string = context.eventName;
    const repoOwner: string = context.repo.owner;
    const repoName: string = context.repo.repo;

    if (eventName === 'pull_request' || eventName === 'push') {
      let fileList: string = 'No files changed.';

      if (eventName === 'pull_request') {
        const prNumber = context.payload.pull_request!.number;

        const { data: files } = await octokit.rest.pulls.listFiles({
          owner: repoOwner,
          repo: repoName,
          pull_number: prNumber,
        });

        fileList = files.map((file) => file.filename).join('\n');
        // console.log(`Files changed in PR #${prNumber}: ${fileList}`);
      } else {
        const ref: string = context.payload.after!;
        const compare: string = context.payload.before!;

        const { data: commitDiff } = await octokit.rest.repos.compareCommits({
          owner: repoOwner,
          repo: repoName,
          base: compare,
          head: ref,
        });

        fileList = commitDiff.files?.map((file) => file.filename).join('\n') || 'No files changed.';
        // console.log(`Files changed in push: ${fileList}`);
      }

      // Setting a single, consistent output for both event types.
      core.setOutput('filesList', fileList);
    } else {
      console.log('This action runs on pull_request and push events. Current event is neither.');
    }
  } catch (error) {
    core.setFailed(`Action failed with error: ${error}`);
  }
}

if (require.main === module) {
  run();
}
