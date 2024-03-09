let inputs: { [key: string]: string } = {
  GITHUB_TOKEN: 'mock-fake-token', // Example initial input
};

export const getInput = jest.fn().mockImplementation((name: string) => {
  // Now TypeScript knows that inputs can be safely indexed with any string
  return inputs[name];
});

export const setOutput = jest.fn();
export const setFailed = jest.fn();

// Function to modify inputs for different test scenarios
export const __setInput = (name: string, value: string) => {
  inputs[name] = value;
};
