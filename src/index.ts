import * as core from "@actions/core"
import { context, getOctokit } from "@actions/github"
import { Endpoints } from "@octokit/types"
import OpenAI from "openai"
import prompts from "./resources/prompts.json"

const apiKey: string | undefined = process.env.OPENAI_API_KEY

// GHA output strings have problems with newlines and quotes, so we encode them to base64
function base64Encode(data: string): string {
  return Buffer.from(data).toString("base64")
}

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

export class githubActionPrAi {
  private github: ghapraiGithub
  private openAi: ghapraiOpenAI

  constructor(token: string, context: any) {
    this.github = new ghapraiGithub(token, context)
    this.openAi = new ghapraiOpenAI(
      process.env.OPENAI_API_KEY,
      process.env.OPENAI_MODEL
    )
  }

  async runGithubActionPrAiHelper() {
    const diffs: string[] = await this.github.getFilesAndDiffs()
    this.github.setGithubOutput()
    await this.openAi.processDiffsAiDescription(diffs) // For each diff, fetch a description from OpenAI and set the output
    await this.openAi.processDiffsAiAnalysis(diffs) // For each diff, fetch analysis from OpenAI and set the output
    await this.openAi.processDiffsAiCodeSmell(diffs) // For each diff, look for code smells and set the output
  }
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

export class ghapraiOpenAI {
  private openAiClient: OpenAI
  private openAiModel: string
  private defaultOpenAiModel: string
  private chatCompletionCoherentTechnical: number = 0.6 // Lower temperature to make the response more coherent and technical, rather than creative.
  private chatCompletionTechCreativeBalance: number = 0.8 // Moderate temperature to make the response more coherent and technical, rather than creative.
  private chatCompletionMoreCreativity: number = 1.1 // Higher temperature to make the response more creative and less technical, as we're asking for the developer's intent.
  private maxTokensDescribe: number = 200 // Max tokens for OpenAI diff descriptions. Making this huge is both expensive and unnecessary.
  private maxTokensAnalyze: number = 125 // Max tokens for OpenAI analysis. Should be brief!
  private promptDescriptions: string = prompts.prompts.promptDescriptions
  private promptAnalysis: string = prompts.prompts.promptAnalysis
  private promptCodeSmell: string = prompts.prompts.promptCodeSmell

  constructor(apiKey: string | undefined, openAiModel: string | undefined) {
    this.openAiClient = new OpenAI({
      apiKey: apiKey,
    })
    this.defaultOpenAiModel = "gpt-4-turbo-preview"
    this.openAiModel = openAiModel ? openAiModel : this.defaultOpenAiModel
  }

  async promptOpenAI(
    prompt: string = "",
    maxTokens: number = this.maxTokensDescribe,
    temperature: number = this.chatCompletionTechCreativeBalance
  ): Promise<string> {
    try {
      const completion = await this.openAiClient.chat.completions.create({
        model: this.openAiModel,
        messages: [
          {
            role: "system",
            content: prompt,
          },
        ],
        max_tokens: maxTokens,
        temperature: temperature,
      })
      if (
        completion.choices &&
        completion.choices.length > 0 &&
        completion.choices[0].message.content
      ) {
        const assistantMessage: string = completion.choices[0].message.content
        //   console.log("OpenAI response:", assistantMessage)
        return assistantMessage.trim()
      } else {
        return "No explanation was provided."
      }
    } catch (error) {
      console.error("Error fetching explanation from OpenAI:", error)
      return "Error fetching explanation."
    }
  }

  async processDiffsAiDescription(diffs: string[]) {
    let promises = diffs.map((diff) =>
      this.promptOpenAI(
        this.promptDescriptions,
        this.maxTokensDescribe,
        this.chatCompletionCoherentTechnical // Lower temperature to make the response more coherent and technical, rather than creative.
      )
    )
    let arrayDiffResponse = await Promise.all(promises)
    core.setOutput(
      "processDiffsAiDescription",
      base64Encode(JSON.stringify(arrayDiffResponse))
    )
  }
  // Fetch analysis from OpenAI for each diff and set the output based on the function name
  async processDiffsAiAnalysis(diffs: string[]) {
    let promises = diffs.map((diff) =>
      this.promptOpenAI(
        this.promptAnalysis,
        this.maxTokensAnalyze,
        this.chatCompletionMoreCreativity // Higher temperature to make the response more creative and less technical, as we're asking for the developer's intent.
      )
    )
    let arrayDiffResponse = await Promise.all(promises)
    core.setOutput(
      "processDiffsAiAnalysis",
      base64Encode(JSON.stringify(arrayDiffResponse))
    )
  }

  // Fetch analysis from OpenAI for each diff and set the output based on the function name
  async processDiffsAiCodeSmell(diffs: string[]) {
    let promises = diffs.map((diff) =>
      this.promptOpenAI(
        this.promptCodeSmell,
        this.maxTokensAnalyze,
        this.chatCompletionTechCreativeBalance // Moderate temperature to make the response more coherent and technical, rather than creative.
      )
    )
    let arrayDiffResponse = await Promise.all(promises)
    core.setOutput(
      "processDiffsAiCodeSmell",
      base64Encode(JSON.stringify(arrayDiffResponse))
    )
  }
}

// Run the github action by first getting the diffs and then processing them with OpenAI
export async function run(): Promise<void> {
  try {
    const token: string = core.getInput("GITHUB_TOKEN", { required: true })
    const githubActionPrAiInstance = new githubActionPrAi(token, context)
    await githubActionPrAiInstance.runGithubActionPrAiHelper()
  } catch (error) {
    core.setFailed(`Action failed with error: ${error}`)
  }
}

// Run the action if it's being run as a script (which is is when executed by tests or by GitHub Actions)
if (require.main === module) {
  run()
}
