A DuckDB SQL query. File paths inside read_parquet() or read_csv() are resolved against S3
and downloaded before the query runs.

REQUIRED: always call read_parquet() or read_csv() — plain table names are not supported.
Prefer union_by_name=1 when reading multiple files.

SCHEMA DISCOVERY: Never guess column names. Before writing any query that joins files or
references specific columns, run SELECT * FROM read_parquet('path') LIMIT 1 on each file
to inspect the actual schema. Only then write the real query.

FILE PATH TOKENS

Date tokens — expanded using the `from` and `to` parameters:
  {yyyy}  4-digit year      e.g. 2025
  {MM}    2-digit month     e.g. 08
  {dd}    2-digit day       e.g. 03
  {hh}    2-digit hour      e.g. 14
  {mm}    2-digit minute    e.g. 30
  {ss}    2-digit second    e.g. 00

Location tokens — override endpoint or bucket per path:
  {endpoint:https://s3.example.com}
  {bucket:my-bucket}

Glob syntax — wildcard matching for non-time path segments:
  jobs/window=202308032130/*.parquet

HIVE-PARTITIONED DATA

For paths partitioned only by year and month (no day segment), use {yyyy} and {MM} together:
  sales/year={yyyy}/month={MM}/data.parquet

s3-querier generates one prefix per calendar month in the from/to range, so a Q1 query
(from=2024-01-01, to=2024-03-31) fetches exactly months 01, 02, 03 — not all of 2024.

Do NOT use DuckDB character-class globs like month=0[1-3] — DuckDB does not support them.
Use {yyyy}/{MM} tokens instead, which s3-querier expands correctly.

EXAMPLES

Single file:
  SELECT * FROM read_parquet('reports/summary.parquet') LIMIT 10

Day-partitioned files (requires from/to):
  SELECT id FROM read_parquet('events/year={yyyy}/month={MM}/day={dd}/data.parquet', union_by_name=1)

Month-partitioned files (no day segment — use {yyyy}/{MM} only):
  SELECT * FROM read_parquet('sales/year={yyyy}/month={MM}/data.parquet', union_by_name=1)

Cross-endpoint join:
  WITH east AS (SELECT id FROM read_parquet('{endpoint:https://s3.us-east.example.com}/{bucket:logs}/data/{yyyy}{MM}{dd}.parquet'))
  SELECT * FROM read_parquet('{endpoint:https://s3.eu-west.example.com}/{bucket:logs}/data/{yyyy}{MM}{dd}.parquet') AS west
  JOIN east ON west.id = east.id
