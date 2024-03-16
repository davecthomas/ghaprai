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

export class ghapraiGithub {
  private octokit: any
  private eventName: string
  private repoOwner: string
  private repoName: string
  private ghaContext: any
  private diffs: string[] = []
  private filenames: string[] = []

  constructor(token: string, context: any) {
    this.octokit = getOctokit(token)
    this.eventName = context.eventName
    this.repoOwner = context.repo.owner
    this.repoName = context.repo.repo
    this.ghaContext = context
  }

  async getDiffForFile(
    octokit: any,
    owner: string,
    repo: string,
    base: string,
    head: string,
    filename: string
  ): Promise<string> {
    let commitDiff: CommitComparisonResult
    try {
      const response = await octokit.rest.repos.compareCommits({
        owner,
        repo,
        base,
        head,
      })
      commitDiff = response.data as CommitComparisonResult
    } catch (error) {
      console.error("Error fetching commit diff:", error)
      return `Failed to fetch diffs for ${filename}`
    }
    const fileDiff = commitDiff.files?.find(
      (file) => file.filename === filename
    )

    if (fileDiff && fileDiff.patch) {
      return `Diff from base ${base} to head ${head} for ${filename}:\n${fileDiff.patch}\n`
      // return `Diff from base ${base} to head ${head} for ${filename}:\n`
    } else {
      return `No changes from base ${base} to head ${head} for ${filename}`
    }
  }

  async getFilesAndDiffs(): Promise<string[]> {
    try {
      const token: string = core.getInput("GITHUB_TOKEN", { required: true })

      if (this.eventName === "pull_request") {
        const prNumber = this.ghaContext.payload.pull_request!.number

        const { data: files } = await this.octokit.rest.pulls.listFiles({
          owner: this.repoOwner,
          repo: this.repoName,
          pull_number: prNumber,
        })

        for (const file of files) {
          const base = this.ghaContext.payload.pull_request!.base.sha
          const head = this.ghaContext.payload.pull_request!.head.sha

          const diff: string = await this.getDiffForFile(
            this.octokit,
            this.repoOwner,
            this.repoName,
            base,
            head,
            file.filename
          )
          this.diffs.push(diff)
          this.filenames.push(file.filename)
        }
      } else if (this.eventName === "push") {
        const ref: string = context.payload.after!
        const compare: string = context.payload.before!

        const { data: commitDiff }: { data: GitHubCommitComparison } =
          await this.octokit.rest.repos.compareCommits({
            owner: this.repoOwner,
            repo: this.repoName,
            base: compare,
            head: ref,
          })

        for (const file of commitDiff.files!) {
          const diff = await this.getDiffForFile(
            this.octokit,
            this.repoOwner,
            this.repoName,
            compare,
            ref,
            file.filename
          )
          this.diffs.push(diff)
          this.filenames.push(file.filename)
        }
      } else {
        console.log(
          "This action runs on pull_request and push events. Current event is neither."
        )
      }
    } catch (error) {
      core.setFailed(`Action failed with error: ${error}`)
    }
    return this.diffs
  }

  setGithubOutput() {
    const diffsJoined: string = this.diffs.join("\n")
    const encodedDiff = Buffer.from(diffsJoined).toString("base64")
    core.setOutput("encodedDiffs", encodedDiff)
    core.setOutput("filesList", this.filenames.join(", "))
    core.setOutput("countFiles", this.filenames.length.toString())
    core.setOutput("diffs", diffsJoined)
  }
}
