import * as core from "@actions/core"
import { context, getOctokit } from "@actions/github"
import { Endpoints } from "@octokit/types"
import OpenAI from "openai"

const apiKey: string | undefined = process.env.OPENAI_API_KEY

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

  //   console.log(`Comparing commits: base ${base}, head ${head}`)
  //   console.log(`Total files changed: ${commitDiff.files?.length}`)

  const fileDiff = commitDiff.files?.find((file) => file.filename === filename)

  if (fileDiff && fileDiff.patch) {
    console.log(`Found changes for ${filename}`)
    return `Diff from base ${base} to head ${head} for ${filename}:\n${fileDiff.patch}\n`
    // return `Diff from base ${base} to head ${head} for ${filename}:\n`
  } else {
    console.log(`No changes found for ${filename}`)
    return `No changes from base ${base} to head ${head} for ${filename}`
  }
}

async function listModels(openAiClient: OpenAI): Promise<string[]> {
  try {
    const response = await openAiClient.models.list()
    // Assuming the response properly contains the JSON structure as per the OpenAI API reference.
    // Directly accessing 'data' from the response to get the array of models.
    const models = response.data

    // Extract model IDs from each model object in the array.
    const modelIds: string[] = models.map((model: { id: string }) => model.id)
    console.log("OpenAI models:", modelIds)
    return modelIds
  } catch (error) {
    console.error("Error listing OpenAI models:", error)
    return []
  }
}

async function fetchOpenAIDescription(
  openai: OpenAI,
  diff: string
): Promise<string> {
  try {
    // const completion = await openai.completions.create({
    //   model: "gpt-4-turbo-preview", // Adjust the model as needed
    //   prompt: `Describe the following code changes in this github diff between a base and head commit:\n${diff}`,
    //   temperature: 0.7,
    //   max_tokens: 200,
    //   n: 1, // Number of completions to generate
    // })
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview", // Adjust as necessary to the model you intend to use.
      messages: [
        {
          role: "system",
          content: `Describe the following code changes in this github diff between a base and head commit:\n${diff}`,
        },
      ],
    })
    if (
      completion.choices &&
      completion.choices.length > 0 &&
      completion.choices[0].message.content
    ) {
      const assistantMessage: string = completion.choices[0].message.content
      return assistantMessage?.trim()
    } else {
      return "No explanation was provided."
    }
  } catch (error) {
    console.error("Error fetching explanation from OpenAI:", error)
    return "Error fetching explanation."
  }
}

async function processDiffsAndSetOutput(openAiClient: OpenAI, diffs: string[]) {
  let promises = diffs.map((diff) => fetchOpenAIDescription(openAiClient, diff))
  let arrayDiffResponse = await Promise.all(promises)
  core.setOutput("openAiDiffResponse", JSON.stringify(arrayDiffResponse))
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
        if (file.filename === "dist/index.js") continue
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
        if (file.filename === "dist/index.js") continue
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
      return
    }

    const diffsJoined: string = diffs.join("\n")
    const encodedDiff = Buffer.from(diffsJoined).toString("base64")
    core.setOutput("encodedDiffs", encodedDiff)
    core.setOutput("filesList", filenames.join(", "))
    core.setOutput("countFiles", filenames.length.toString())
    core.setOutput("diffs", diffsJoined)
    const openAiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
    const models = await listModels(openAiClient)
    core.setOutput("openAiModels", JSON.stringify(models))
    await processDiffsAndSetOutput(openAiClient, diffs) // For each diff, fetch a description from OpenAI and set the output

    // console.log(diffsJoined)
  } catch (error) {
    core.setFailed(`Action failed with error: ${error}`)
  }
}
if (require.main === module) {
  run()
}
