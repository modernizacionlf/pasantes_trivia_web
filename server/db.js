require("dotenv").config()

const { Pool } = require('pg');

const DBUSER = process.env.DBUSER
const HOST = process.env.HOST
const DBPASSWORD = process.env.DBPASSWORD
const DBPORT = process.env.DBPORT

const pool = new Pool({
    user: DBUSER,
    host: HOST,
    database: 'postgres',
    password: DBPASSWORD,
    port: DBPORT
});

module.exports = pool;