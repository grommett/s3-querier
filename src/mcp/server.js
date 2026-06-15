#!/usr/bin/env node

import { DatalakeMCP } from './datalake-mcp.js';

await new DatalakeMCP().start();
