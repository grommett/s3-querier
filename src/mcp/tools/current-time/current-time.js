import BaseTool from '../base-tool.js';

export default class CurentTimeTool extends BaseTool {
  name = 'get_current_time';

  getConfig() {
    return {
      description:
        'Returns the current UTC time as an ISO 8601 timestamp. ' +
        'Call this before constructing time-partitioned queries that involve "now", "recent", or a relative time range. ' +
        'Not needed for static file queries or queries for a specific known date range.',
      inputSchema: {},
    };
  }

  handler() {
    return { content: [{ type: 'text', text: new Date().toISOString() }] };
  }
}
