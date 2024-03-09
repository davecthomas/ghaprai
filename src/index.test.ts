// src/index.test.ts
import * as github from '@actions/github';
jest.mock('@actions/core');
jest.mock('@actions/github');

import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import run from './index'; // Assuming you export a run function in your action script

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
    (core.getInput as jest.Mock).mockReturnValue('fake-token');
    // Reset mocks before each test if needed
    jest.clearAllMocks();
  });
  it('correctly lists files in a PR', async () => {
    // Execute the action
    await run();

    // Optionally, you can check the mock calls to see if the function was called with expected arguments
    // This is useful if your action script sets outputs based on the files or performs other operations
    // For example:
    // expect(core.setOutput).toHaveBeenCalledWith('someOutput', expect.anything());
  });
});
