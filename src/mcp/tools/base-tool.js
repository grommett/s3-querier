export default class BaseTool {
  constructor(config) {
    this.config = config;
  }

  getConfig() {
    throw new Error('Tools must implement getConfig()');
  }

  handler() {
    throw new Error('Tools must implement handler()');
  }
}
