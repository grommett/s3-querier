export default class BaseResource {
  constructor(config) {
    this.config = config;
  }

  isEnabled() {
    return true;
  }

  getMeta() {
    throw new Error('Resources must implement getMeta()');
  }

  handler() {
    throw new Error('Resources must implement handler()');
  }
}
