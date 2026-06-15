#!/usr/bin/env node

import { S3QuerierMCP } from './s3querier-mcp.js';

await new S3QuerierMCP().start();
