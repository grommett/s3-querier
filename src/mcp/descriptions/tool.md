Download files from S3-compatible storage and execute a DuckDB SQL query against them.

Queries must use DuckDB table functions such as read_parquet() or read_csv() with file paths
that reference objects in S3. S3 Querier resolves those paths, downloads the matching files,
and runs the query locally with DuckDB.

Use the `s3-querier://docs` resource for full documentation including token syntax, examples,
and query planning tips.
