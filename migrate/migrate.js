const mysql = require('mysql2/promise');
const CryptoJS = require("crypto-js");
const bcrypt = require("bcrypt");

// 1. Database Configuration
const config = {
  host: process.env.homeIP,
  user: process.env.SQLUSERNAME2, 
  password: process.env.SQLPASSWORD2,
  database: 'mydb'
};

// 2. Encryption Keys (Ensure these are set in your environment variables)
const SQL_SALT = process.env.SQLSALT; 
const BCRYPT_ROUNDS = 10;

async function migratePasswords() {
  if (!SQL_SALT) {
    console.error("CRITICAL ERROR: process.env.SQLSALT is not defined. Migration aborted.");
    process.exit(1);
  }

  console.log("Connecting to the database...");
  const connection = await mysql.createConnection(config);

  try {
    // Fetch all users containing their username and encrypted password
    console.log("Fetching users from database...");
    const [users] = await connection.query("SELECT username, password FROM users");
    console.log(`Found ${users.length} users to migrate.`);

    let successCount = 0;
    let failureCount = 0;

    for (const user of users) {
      try {
        // Step A: Decrypt the original password using CryptoJS
        const bytes = CryptoJS.AES.decrypt(user.password, SQL_SALT);
        const originalPassword = bytes.toString(CryptoJS.enc.Utf8);

        // Sanity check: If decryption fails or yields an empty string, skip it
        if (!originalPassword) {
          console.warn(`[SKIP] Could not decrypt password for user: ${user.username}. (It might already be hashed or invalid).`);
          failureCount++;
          continue;
        }

        // Step B: Hash the plain text password using bcrypt
        const hashedPassword = await bcrypt.hash(originalPassword, BCRYPT_ROUNDS);

        // Step C: Update the row in the database
        await connection.query(
          "UPDATE users SET password = ? WHERE username = ?",
          [hashedPassword, user.username]
        );

        successCount++;
        console.log(`[SUCCESS] Migrated user: ${user.username} (${successCount}/${users.length})`);

      } catch (err) {
        console.error(`[ERROR] Failed migrating user ${user.username}:`, err.message);
        failureCount++;
      }
    }

    console.log("\n--- Migration Complete ---");
    console.log(`Successfully migrated: ${successCount} users.`);
    console.log(`Failed/Skipped:        ${failureCount} users.`);

  } catch (error) {
    console.error("Migration failed unexpectedly:", error);
  } finally {
    // Always close the connection when done
    await connection.end();
    console.log("Database connection closed.");
  }
}

migratePasswords();