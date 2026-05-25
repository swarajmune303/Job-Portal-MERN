const { Pool } = require('pg');

// Create a connection pool to the PostgreSQL database
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'OLPReact',
    password: 'root',
    port: 5432,
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};
