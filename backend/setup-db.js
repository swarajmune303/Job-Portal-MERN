const fs = require('fs');
const path = require('path');
const { Client, Pool } = require('pg');

async function setupDatabase() {
    const credentials = {
        user: 'postgres',
        host: 'localhost',
        password: 'root',
        port: 5432,
    };

    console.log("-----------------------------------------");
    console.log("🚀 JobPortal Database Auto-Setup Utility");
    console.log("-----------------------------------------");

    // Step 1: Connect to default 'postgres' database to check/create OLPReact
    console.log("Connecting to default PostgreSQL system to check database...");
    const systemClient = new Client({
        ...credentials,
        database: 'postgres'
    });

    try {
        await systemClient.connect();
        
        // Check if database OLPReact exists
        const checkDbResult = await systemClient.query(
            "SELECT 1 FROM pg_database WHERE datname = 'OLPReact'"
        );

        if (checkDbResult.rows.length === 0) {
            console.log("Database 'OLPReact' does not exist. Creating it now...");
            // Create database (cannot run inside a transaction pool, must use client query)
            await systemClient.query('CREATE DATABASE "OLPReact"');
            console.log("✅ Database 'OLPReact' created successfully!");
        } else {
            console.log("Database 'OLPReact' already exists.");
        }
    } catch (err) {
        console.error("❌ Error checking/creating database:", err.message);
        console.log("\n💡 Please make sure PostgreSQL is running locally on port 5432, and the password for 'postgres' is set to 'root'.");
        process.exit(1);
    } finally {
        await systemClient.end();
    }

    // Step 2: Connect to OLPReact and execute schema.sql
    console.log("\nConnecting to 'OLPReact' database to run schema.sql...");
    const appPool = new Pool({
        ...credentials,
        database: 'OLPReact'
    });

    try {
        const schemaPath = path.resolve(__dirname, '../schema.sql');
        if (!fs.existsSync(schemaPath)) {
            throw new Error(`schema.sql not found at ${schemaPath}`);
        }

        const sql = fs.readFileSync(schemaPath, 'utf8');
        console.log("Executing SQL schema queries...");
        
        // Execute SQL file content
        await appPool.query(sql);
        
        console.log("-----------------------------------------");
        console.log("✅ SUCCESS: Database tables successfully initialized!");
        console.log("-----------------------------------------");
        console.log("Your tables are ready: users, jobs, applications, assessments, assessment_results.");
    } catch (err) {
        console.error("❌ Error executing schema.sql:", err.message);
    } finally {
        await appPool.end();
    }
}

setupDatabase();
