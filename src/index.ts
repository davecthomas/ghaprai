import * as core from "@actions/core"
import { context } from "@actions/github"
import { ghapraiGithub } from "./ghaprai-github"
import { ghapraiOpenAI } from "./ghaprai-openai"

const apiKey: string | undefined = process.env.OPENAI_API_KEY

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
