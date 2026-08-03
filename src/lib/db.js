import { neon } from '@neondatabase/serverless';

function getSQL() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is missing. Please set DATABASE_URL in your .env.local file or Vercel Environment Variables.');
  }
  return neon(databaseUrl);
}

// Auto-initialize Neon PostgreSQL tables
let tablesInitialized = false;
async function initTables() {
  if (tablesInitialized) return;
  const sql = getSQL();
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      username VARCHAR(255) PRIMARY KEY,
      password TEXT NOT NULL,
      created_at VARCHAR(255)
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS expenses (
      id VARCHAR(255) PRIMARY KEY,
      username VARCHAR(255) NOT NULL,
      amount NUMERIC(12, 2) NOT NULL,
      reason TEXT NOT NULL,
      date VARCHAR(50) NOT NULL,
      timestamp BIGINT NOT NULL,
      created_at VARCHAR(255)
    );
  `;
  // Seed default user 'rrp' / 'rrp123' if not exists
  const existing = await sql`SELECT username FROM users WHERE username = 'rrp'`;
  if (existing.length === 0) {
    await sql`INSERT INTO users (username, password, created_at) VALUES ('rrp', 'rrp123', ${new Date().toISOString()})`;
  }
  tablesInitialized = true;
}

export async function registerUser(username, password) {
  await initTables();
  const sql = getSQL();
  const userClean = (username || '').trim().toLowerCase();
  const passClean = (password || '').trim();

  if (!userClean || !passClean) {
    throw new Error('Username and password are required.');
  }

  const existing = await sql`SELECT username FROM users WHERE username = ${userClean}`;
  if (existing.length > 0) {
    throw new Error('Username already exists!');
  }

  await sql`INSERT INTO users (username, password, created_at) VALUES (${userClean}, ${passClean}, ${new Date().toISOString()})`;
  return { username: userClean };
}

export async function loginUser(username, password) {
  await initTables();
  const sql = getSQL();
  const userClean = (username || '').trim().toLowerCase();
  const passClean = (password || '').trim();

  const rows = await sql`SELECT username, password FROM users WHERE username = ${userClean}`;
  if (rows.length === 0) {
    throw new Error('User not found. Please Sign Up.');
  }
  if (rows[0].password !== passClean) {
    throw new Error('Incorrect password. Please try again.');
  }

  return { username: userClean };
}

export async function getExpenses(username) {
  await initTables();
  const sql = getSQL();
  const userClean = (username || '').trim().toLowerCase();

  let rows;
  if (userClean) {
    rows = await sql`SELECT id, username, amount, reason, date, timestamp, created_at FROM expenses WHERE username = ${userClean} ORDER BY timestamp DESC`;
  } else {
    rows = await sql`SELECT id, username, amount, reason, date, timestamp, created_at FROM expenses ORDER BY timestamp DESC`;
  }

  return rows.map(r => ({
    id: r.id,
    username: r.username,
    amount: parseFloat(r.amount),
    reason: r.reason,
    date: r.date,
    timestamp: Number(r.timestamp),
    createdAt: r.created_at
  }));
}

export async function addExpense(amount, reason, username) {
  await initTables();
  const sql = getSQL();
  const userClean = (username || '').trim().toLowerCase();
  const amtNum = parseFloat(amount);
  const reasonClean = (reason || '').trim();

  if (!userClean || isNaN(amtNum) || amtNum <= 0 || !reasonClean) {
    throw new Error('Invalid expense parameters.');
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD

  // Count existing expenses on this date for sequence number (01, 02, 03...)
  const existingOnDate = await sql`
    SELECT id FROM expenses WHERE username = ${userClean} AND date = ${dateStr}
  `;

  const seqNum = (existingOnDate.length + 1).toString().padStart(2, '0');
  const recordId = `exp-${dateStr}-${seqNum}`;

  const record = {
    id: recordId,
    username: userClean,
    amount: amtNum,
    reason: reasonClean,
    date: dateStr,
    timestamp: now.getTime(),
    createdAt: now.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
  };

  await sql`
    INSERT INTO expenses (id, username, amount, reason, date, timestamp, created_at)
    VALUES (${record.id}, ${record.username}, ${record.amount}, ${record.reason}, ${record.date}, ${record.timestamp}, ${record.createdAt})
    ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount, reason = EXCLUDED.reason
  `;

  return record;
}

export async function deleteExpense(id) {
  await initTables();
  const sql = getSQL();
  await sql`DELETE FROM expenses WHERE id = ${id}`;
  return true;
}

export async function clearExpenses(username) {
  await initTables();
  const sql = getSQL();
  const userClean = (username || '').trim().toLowerCase();
  if (userClean) {
    await sql`DELETE FROM expenses WHERE username = ${userClean}`;
  } else {
    await sql`DELETE FROM expenses`;
  }
  return true;
}

export async function importExpenses(items, username) {
  await initTables();
  const sql = getSQL();
  const userClean = (username || '').trim().toLowerCase();

  if (Array.isArray(items)) {
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const uName = userClean || item.username || 'rrp';
      const dateStr = item.date || new Date().toISOString().split('T')[0];
      const seqNum = (index + 1).toString().padStart(2, '0');
      const id = item.id && item.id.startsWith('exp-') ? item.id : `exp-${dateStr}-${seqNum}`;
      const amount = parseFloat(item.amount);
      const reason = item.reason;
      const timestamp = item.timestamp || Date.now();
      const createdAt = item.createdAt || new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

      await sql`
        INSERT INTO expenses (id, username, amount, reason, date, timestamp, created_at)
        VALUES (${id}, ${uName}, ${amount}, ${reason}, ${dateStr}, ${timestamp}, ${createdAt})
        ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount, reason = EXCLUDED.reason
      `;
    }
  }
  return true;
}
