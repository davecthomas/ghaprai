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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock('@actions/core');
jest.mock('@actions/github');
const core = __importStar(require("@actions/core"));
const index_1 = __importDefault(require("./index")); // Assuming you export a run function in your action script
// Mock the getOctokit method to return a mocked octokit instance
jest.mock('@actions/github', () => ({
    getOctokit: jest.fn().mockReturnValue({
        rest: {
            pulls: {
                listFiles: jest.fn().mockResolvedValue({
                    data: [{ filename: 'mockfile1.txt' }, { filename: 'mockfile2.txt' }],
                }),
            },
        },
    }),
}));
describe('My GitHub Action', () => {
    beforeEach(() => {
        // Setup core.getInput mock to return a fake token
        core.getInput.mockReturnValue('fake-token');
        // Reset mocks before each test if needed
        jest.clearAllMocks();
    });
    it('correctly lists files in a PR', async () => {
        // Execute the action
        await (0, index_1.default)();
        // Optionally, you can check the mock calls to see if the function was called with expected arguments
        // This is useful if your action script sets outputs based on the files or performs other operations
        // For example:
        // expect(core.setOutput).toHaveBeenCalledWith('someOutput', expect.anything());
    });
});
