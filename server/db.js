require("dotenv").config()

const { Pool } = require('pg');

const POSTGRES_USER = process.env.POSTGRES_USER
const POSTGRES_HOST = process.env.POSTGRES_HOST
const POSTGRES_DB = process.env.POSTGRES_DB
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD
const POSTGRES_PORT = process.env.POSTGRES_PORT

const pool = new Pool({
    user: POSTGRES_USER,
    host: POSTGRES_HOST,
    database: POSTGRES_DB,
    password: POSTGRES_PASSWORD,
    port: POSTGRES_PORT
});

module.exports = pool;