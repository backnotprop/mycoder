// mycoder.config.js
export default {
  // GitHub integration
  githubMode: true,

  // Browser settings
  headless: true,
  userSession: false,

  // System browser detection settings
  browser: {
    // Whether to use system browsers or Playwright's bundled browsers
    useSystemBrowsers: true,

    // Preferred browser type (chromium, firefox, webkit)
    preferredType: 'chromium',

    // Custom browser executable path (overrides automatic detection)
    // executablePath: null, // e.g., '/path/to/chrome'
  },

  // Sub-agent workflow mode: 'disabled' (default), 'sync' (experimental), or 'async' (experimental)
  subAgentMode: 'disabled',

  // Model settings
  //provider: 'anthropic',
  //model: 'claude-3-7-sonnet-20250219',
  //provider: 'openai',
  //model: 'gpt-4o',
  //provider: 'ollama',
  //model: 'medragondot/Sky-T1-32B-Preview:latest',
  //model: 'llama3.2:3b',
  //provider: 'xai',
  //model: 'grok-2-latest',
  //provider: 'openai',
  //model: 'qwen2.5-coder:14b',
  //baseUrl: 'http://192.168.2.66:80/v1-openai',
  // Manual override for context window size (in tokens)
  // Useful for models that don't have a known context window size
  // contextWindow: 16384,
  maxTokens: 4096,
  temperature: 0.7,

  // Custom settings
  // customPrompt can be a string or an array of strings for multiple lines
  customPrompt: '',
  // Example of multiple line custom prompts:
  // customPrompt: [
  //   'Custom instruction line 1',
  //   'Custom instruction line 2',
  //   'Custom instruction line 3',
  // ],
  profile: false,

  // Custom commands
  // Uncomment and modify to add your own commands
  /*
  commands: {
    // Function-based command example
    "search": {
      description: "Search for a term in the codebase",
      args: [
        { name: "term", description: "Search term", required: true }
      ],
      execute: (args) => {
        return `Find all instances of ${args.term} in the codebase and suggest improvements`;
      }
    },
    
    // Another example with multiple arguments
    "fix-issue": {
      description: "Fix a GitHub issue",
      args: [
        { name: "issue", description: "Issue number", required: true },
        { name: "scope", description: "Scope of the fix", default: "full" }
      ],
      execute: (args) => {
        return `Analyze GitHub issue #${args.issue} and implement a ${args.scope} fix`;
      }
    }
  }
  */
};
