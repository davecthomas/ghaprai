// __mocks__/@actions/github.ts
module.exports = {
  getOctokit: jest.fn(() => ({
    rest: {
      pulls: {
        listFiles: jest.fn().mockResolvedValue({
          data: [{ filename: 'mockfile1.txt' }, { filename: 'mockfile2.txt' }],
        }),
      },
    },
  })),
  context: {
    repo: {
      owner: 'mockOwner',
      repo: 'mockRepo',
    },
    payload: {
      pull_request: { number: 1 },
    },
  },
};
