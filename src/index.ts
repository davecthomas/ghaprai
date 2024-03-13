import * as core from "@actions/core"
import { context, getOctokit } from "@actions/github"
import { Endpoints } from "@octokit/types"

// Define types for the files obtained from GitHub API responses
type GitHubFile =
  Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}/files"]["response"]["data"][number]
type GitHubCommitComparison =
  Endpoints["GET /repos/{owner}/{repo}/compare/{base}...{head}"]["response"]["data"]

// Define a type for the commit comparison result to simplify type assertions
type CommitComparisonFile = {
  filename: string
  patch?: string
}

// Assuming this type for the commit comparison API response
type CommitComparisonResult = {
  files: CommitComparisonFile[]
}

async function getDiffForFile(
  octokit: any,
  owner: string,
  repo: string,
  base: string,
  head: string,
  filename: string
): Promise<string> {
  //   console.log(
  //     `Fetching diff for ${filename} params: ${JSON.stringify(
  //       {
  //         owner,
  //         repo,
  //         base,
  //         head,
  //       },
  //       null,
  //       2
  //     )}`
  //   )
  let commitDiff: CommitComparisonResult
  try {
    const response = await octokit.rest.repos.compareCommits({
      owner,
      repo,
      base,
      head,
    })
    commitDiff = response.data as CommitComparisonResult
    // console.log(commitDiff)
  } catch (error) {
    console.error("Error fetching commit diff:", error)
    return `Failed to fetch diffs for ${filename}`
  }

  //   console.log(`Comparing commits: base ${base}, head ${head}`)
  //   console.log(`Total files changed: ${commitDiff.files?.length}`)

  const fileDiff = commitDiff.files?.find((file) => file.filename === filename)

  if (fileDiff && fileDiff.patch) {
    console.log(`Found changes for ${filename}`)
    return `Diff from base ${base} to head ${head} for ${filename}:\n${fileDiff.patch}\n`
  } else {
    console.log(`No changes found for ${filename}`)
    return `No changes from base ${base} to head ${head} for ${filename}`
  }
}

export async function run(): Promise<void> {
  try {
    const token: string = core.getInput("GITHUB_TOKEN", { required: true })
    const octokit: any = getOctokit(token) // This actually returns a type of Octokit, but we're using `any`

    const eventName: string = context.eventName
    const repoOwner: string = context.repo.owner
    const repoName: string = context.repo.repo

    let diffs: string[] = []
    let filenames: string[] = []

    if (eventName === "pull_request") {
      const prNumber = context.payload.pull_request!.number

      const { data: files } = await octokit.rest.pulls.listFiles({
        owner: repoOwner,
        repo: repoName,
        pull_number: prNumber,
      })

      for (const file of files) {
        const base = context.payload.pull_request!.base.sha
        const head = context.payload.pull_request!.head.sha
        const diff: string = await getDiffForFile(
          octokit,
          repoOwner,
          repoName,
          base,
          head,
          file.filename
        )
        diffs.push(diff)
        filenames.push(file.filename)
      }
    } else if (eventName === "push") {
      const ref: string = context.payload.after!
      const compare: string = context.payload.before!

      const { data: commitDiff }: { data: GitHubCommitComparison } =
        await octokit.rest.repos.compareCommits({
          owner: repoOwner,
          repo: repoName,
          base: compare,
          head: ref,
        })

      for (const file of commitDiff.files!) {
        const diff = await getDiffForFile(
          octokit,
          repoOwner,
          repoName,
          compare,
          ref,
          file.filename
        )
        diffs.push(diff)
        filenames.push(file.filename)
      }
    } else {
      console.log(
        "This action runs on pull_request and push events. Current event is neither."
      )
    }
    console.log("File names: \n\n\n" + filenames.join("\n") + "\n")
    const diffsJoined: string = diffs.join("\n")

    const encodedDiff = Buffer.from(diffsJoined).toString("base64")
    core.setOutput("encodedDiffs", encodedDiff)
    core.setOutput("filesList", filenames.join(", "))
    core.setOutput("countFiles", filenames.length.toString())

    // core.setOutput("diffs", diffsJoined)
    // console.log(diffsJoined)
  } catch (error) {
    core.setFailed(`Action failed with error: ${error}`)
  }
}
if (require.main === module) {
  run()
}
