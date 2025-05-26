const { Pool, Client } = require("pg");
const dotenv = require("dotenv");
dotenv.config();

const appDbUrl = process.env.DATABASE_URL;
const dbName = appDbUrl.split('/').pop().split('?')[0]; 


const defaultDbClient = new Client({
  connectionString: appDbUrl.replace(dbName, 'postgres'),
});

const pool = new Pool({
  connectionString: appDbUrl,
});

const createDatabaseIfNotExists = async () => {
  try {
    await defaultDbClient.connect();

   
    const res = await defaultDbClient.query(`SELECT 1 FROM pg_database WHERE datname='${dbName}'`);
    if (res.rowCount === 0) {
     
      await defaultDbClient.query(`CREATE DATABASE ${dbName}`);
      console.log(`Database "${dbName}" created`);
    } else {
      console.log(`Database "${dbName}" already exists`);
    }
  } catch (error) {
    console.error('Error creating database:', error);
  } finally {
    await defaultDbClient.end();
  }
};

const createSchemaIfNotExists = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS contact (
      id SERIAL PRIMARY KEY,
      phoneNumber VARCHAR(20),
      email VARCHAR(255),
      linkedId INTEGER REFERENCES contact(id) ON DELETE SET NULL,
      linkPrecedence VARCHAR(10) CHECK (linkPrecedence IN ('primary', 'secondary')) NOT NULL,
      createdAt TIMESTAMP DEFAULT NOW(),
      updatedAt TIMESTAMP DEFAULT NOW(),
      deletedAt TIMESTAMP NULL
    );
  `;

  try {
    await pool.query(createTableQuery);
    console.log("DB schema checked/created");
  } catch (error) {
    console.error("Error creating schema:", error);
  }
};

module.exports = { pool, createDatabaseIfNotExists, createSchemaIfNotExists };

