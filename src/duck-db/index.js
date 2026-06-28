import { DuckDBInstance } from '@duckdb/node-api';
import { logger } from '../utils/logger.js';

const db = await DuckDBInstance.create(':memory:', {
  threads: 4,
});

const formatStrategies = {
  jsonRecords: formatJsonRecords,
  default: formatColumnar,
};

/**
 * Execute a SQL query and return results in the specified format
 *
 * @param {string} sql - The SQL query to execute
 * @param {object} options - Query options
 * @param {string} options.format - Output format: 'jsonRecords' for row objects, otherwise columnar (default)
 * @returns {Promise<Array>} Query results in the requested format
 */
export async function query(sql, options = {}) {
  const { format } = options;
  try {
    const connection = await db.connect();
    const reader = await connection.runAndReadAll(sql);
    const columnsResult = reader.getColumnsObjectJS();

    const formatter = formatStrategies[format] ?? formatStrategies.default;
    return formatter(columnsResult) ?? [];
  } catch (error) {
    logger.error(error);
    throw error;
  }
}

function formatColumnar(columnsResult) {
  return Object.keys(columnsResult).map((key) => ({ name: key, fields: columnsResult[key] }));
}

function formatJsonRecords(columnsResult) {
  const keys = Object.keys(columnsResult);
  if (keys.length === 0) return [];
  const rowCount = columnsResult[keys[0]].length;
  return Array.from({ length: rowCount }, (_, rowIndex) => {
    const row = {};
    keys.forEach((key) => {
      row[key] = columnsResult[key][rowIndex];
    });
    return row;
  });
}
