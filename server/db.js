import 'dotenv/config';
import mysql from 'mysql2/promise';

/*
 * One pool for the whole app. Settings that matter for the frontend:
 *   dateStrings     DATE columns arrive as 'YYYY-MM-DD' text, not shifted Date objects
 *   decimalNumbers  DECIMAL and SUM() arrive as numbers, not strings
 */
export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'spit_placement',
  dateStrings: true,
  decimalNumbers: true,
  connectionLimit: 8,
});

/** Run one statement and return the rows. */
export const query = async (sql, params = []) => {
  const [rows] = await pool.query(sql, params);
  return rows;
};

/**
 * Run several statements as ONE transaction.
 *   START TRANSACTION ... COMMIT   when the callback finishes
 *   ROLLBACK                       when anything inside it throws (triggers included)
 */
export const transaction = async (work) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work((sql, params = []) => conn.query(sql, params).then(([rows]) => rows));
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};
