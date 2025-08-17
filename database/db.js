import * as SQLite from 'expo-sqlite'; // Keep this import style

let database = null; // Declare database globally, will be initialized in initDb

// Function to initialize the database (now asynchronous)
export const initDb = async () => {
  try {
    // openDatabaseAsync is the modern asynchronous way to open the database
    database = await SQLite.openDatabaseAsync('spendanalyzer.db');
    // execAsync is used for executing SQL commands that don't return rows (like CREATE TABLE, INSERT, DELETE)
    await database.execAsync(`
      PRAGMA journal_mode = WAL; -- Recommended for better performance and reliability
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY NOT NULL,
        amount REAL NOT NULL,
        note TEXT,
        tag TEXT NOT NULL,
        date TEXT NOT NULL
      );
    `);
    console.log('Expenses table created or already exists (Async API)!');
  } catch (error) {
    console.error('Failed to initialize database (Async API):', error);
    throw error; // Re-throw the error for App.js to catch
  }
};

// Function to insert a new expense record (now asynchronous)
export const insertExpense = async (amount, note, tag, date) => {
  try {
    // runAsync is used for INSERT, UPDATE, DELETE queries that return a single result object (like lastInsertId)
    const result = await database.runAsync(
      `INSERT INTO expenses (amount, note, tag, date) VALUES (?, ?, ?, ?);`,
      [amount, note, tag, date]
    );
    console.log('Expense inserted (Async API):', result);
    return { success: true, insertId: result.lastInsertId }; // Returns the ID of the newly inserted row
  } catch (error) {
    console.error('Failed to insert expense (Async API):', error);
    throw error; // Re-throw the error for ManualAddScreen.js to catch
  }
};

// Function to fetch all expenses (now asynchronous)
export const fetchExpenses = async () => {
  try {
    // getAllAsync is used for SELECT queries that return multiple rows
    const rows = await database.getAllAsync(`SELECT * FROM expenses ORDER BY date DESC;`);
    console.log('Fetched expenses (Async API):', rows);
    return rows; // Returns an array of objects
  } catch (error) {
    console.error('Failed to fetch expenses (Async API):', error);
    throw error; // Re-throw the error
  }
};

// Function to delete all expenses (now asynchronous)
export const deleteAllExpenses = async () => {
  try {
    // runAsync for DELETE operations
    await database.runAsync(`DELETE FROM expenses;`);
    console.log('All expenses deleted (Async API)!');
  } catch (error) {
    console.error('Failed to delete all expenses (Async API):', error);
    throw error; // Re-throw the error
  }
};

export const updateExpense = async (id, amount, note, tag, date) => {
  try {
    await database.runAsync(
      `UPDATE expenses SET amount = ?, note = ?, tag = ?, date = ? WHERE id = ?;`,
      [amount, note, tag, date, id]
    );
    console.log(`Expense with ID ${id} updated successfully.`);
    return { success: true };
  } catch (error) {
    console.error('Failed to update expense:', error);
    throw error;
  }
};

