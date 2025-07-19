// Database configuration
// TODO: Choose your database (MongoDB, PostgreSQL, MySQL)

// MongoDB example:
// const mongoose = require('mongoose');
// const connectDB = async () => {
//   try {
//     await mongoose.connect(process.env.MONGODB_URI);
//     console.log('✅ MongoDB connected');
//   } catch (error) {
//     console.error('❌ MongoDB connection failed:', error);
//     process.exit(1);
//   }
// };

// PostgreSQL example:
// const { Pool } = require('pg');
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
// });

// MySQL example:
// const mysql = require('mysql2/promise');
// const pool = mysql.createPool({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0
// });

module.exports = {
  // connectDB, // for MongoDB
  // pool,      // for PostgreSQL/MySQL
};