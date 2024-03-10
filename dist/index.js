"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const github_1 = require("@actions/github");
async function run() {
    try {
        // Explicitly type the 'token' variable
        const token = core.getInput('GITHUB_TOKEN', { required: true });
        // Correctly type the 'octokit' variable with the specific type for the authenticated Octokit instance
        const octokit = github.getOctokit(token);
        // Check if the event that triggered the action was a pull request
        if (github_1.context.payload.pull_request) {
            // Explicitly type 'prNumber' as 'number'
            const prNumber = github_1.context.payload.pull_request.number;
            const owner = github_1.context.repo.owner;
            const repo = github_1.context.repo.repo;
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
            // Convert the list of files to a string
            const fileList = files.map((file) => file.filename).join('\n');
            console.log(`Files changed in PR #${prNumber}: ${fileList}`);
            // Set the output for the workflow by assigning the list of files to the 'prFiles' output
            core.setOutput('prFiles', fileList);
        }
        else {
            // Use 'core.setFailed' to log an error if the action was not triggered by a pull request
            core.setFailed('Action was not triggered by a pull request');
        }
    }
    catch (error) {
        // Use 'core.setFailed' to log any caught errors
        core.setFailed(`Action failed with error: ${error}`);
    }
}
exports.default = run;
if (require.main === module) {
    run();
}
