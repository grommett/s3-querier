import { readFileSync } from 'node:fs';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import QueryTool from './tools/query/query.js';
import ListFilesTool from './tools/list-files/list-files.js';
import CurentTimeTool from './tools/current-time/current-time.js';

import S3QuerierDocsResource from './resources/s3-querier-docs/s3-querier-docs.js';
import S3QuerierDatasetsResource from './resources/s3-querier-datasets/s3-querier-datasets.js';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

export class S3QuerierMCP {
  constructor(config = {}) {
    this.config = config;
    this.toolClasses = [QueryTool, ListFilesTool, CurentTimeTool];
    this.resourceClasses = [S3QuerierDocsResource, S3QuerierDatasetsResource];
  }

  async start() {
    const server = new McpServer({ name: 's3-querier', version: pkg.version });
    const transport = new StdioServerTransport();

    this.resourceClasses.forEach((ResourceClass) => {
      const resource = new ResourceClass(this.config);
      if (!resource.isEnabled()) return;
      server.registerResource(resource.name, resource.uri, resource.getMeta(), resource.handler.bind(resource));
    });

    this.toolClasses.forEach((ToolClass) => {
      const tool = new ToolClass(this.config);
      server.registerTool(tool.name, tool.getConfig(), tool.handler.bind(tool));
    });

    (this.config.tools ?? []).forEach(({ name, description, inputSchema, handler }) => {
      server.registerTool(name, { description, inputSchema }, handler);
    });

    await server.connect(transport);
  }
}
