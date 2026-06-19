import { readFileSync } from 'node:fs';

import BaseResource from '../base-resource.js';

const docsContent = readFileSync(new URL('../../../../docs/s3-querier.md', import.meta.url), 'utf8');

export default class S3QuerierDocsResource extends BaseResource {
  name = 's3-querier-docs';
  uri = 's3-querier://docs';

  getMeta() {
    return {
      title: 'S3 Querier Documentation',
      description: 'Full documentation: query planning, file tokens, location tokens, and examples.',
      mimeType: 'text/markdown',
    };
  }

  handler(uri) {
    return { contents: [{ uri: uri.href, text: docsContent, mimeType: 'text/markdown' }] };
  }
}
