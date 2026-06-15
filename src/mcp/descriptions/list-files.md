List files and sub-directories in an S3 bucket at a given prefix level.

Returns:
- directories: sub-prefixes to drill into (e.g. "env=production/", "year=2026/")
- files: objects at this level with path, size, and column names for parquet files
- truncated: true if there are more results — narrow the prefix or increase maxResults

NAVIGATION STRATEGY

Start with an empty prefix to see the top-level structure. Drill into directories
one level at a time. Each call only shows what is directly under the given prefix,
not the full recursive tree.

HIVE-PARTITIONED DATA

Today's date is {{TODAY}}.

Many datasets use Hive-style partitioning with partition keys in the path:
  year=YYYY/month=MM/day=DD/hour=HH/minute=MM/

To find the most recent data:
1. List down to the partition root (e.g. env=production/) — one call per structural level
2. Then STOP listing. Do NOT list year, month, or day directories individually.
3. Construct the date segment directly from today: year=YYYY/month=MM/day=DD/
4. Append it to the partition root and list from the day directory to find the latest hour.

Example: if you reach env=production/ and today is 2026-06-14, your next call is
  prefix: "…/env=production/year=2026/month=06/day=14/"
Then list that to find the available hours, pick the highest, and continue.

Only fall back to listing year/month/day if the constructed path returns empty directories and files.

Always check for a "latest/" directory first — it often contains the most recent
snapshot and avoids navigating the full partition tree.
