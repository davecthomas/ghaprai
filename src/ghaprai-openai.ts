import OpenAI from "openai"
import prompts from "./resources/prompts.json"
import * as core from "@actions/core"
import { base64Encode } from "./ghaprai-utils"

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
        this.promptDescriptions + diff,
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
        this.promptAnalysis + diff,
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
        this.promptCodeSmell + diff,
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
