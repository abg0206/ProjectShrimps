const { Pool } = require('pg');
const fs = require('fs');
//rain please look into this ( i dont want to mess anything up)
//confirm SSL config for AWS RDS postgress connection
//currently using rejectUnauthorized: false as temp workaround
//are you using global-bundle.pem ? -- is not yet available locally

//requiring cert bundle?? (per db-tables.js) there's two options:
// 1. provide the global-bundle.pem and place it in Backend/ then update ssl config to:
//    ssl: { rejectUnauthorized: true, ca: fs.readFileSync('./global-bundle.pem') }
// 2. or confirm rejectUnauthorized: false is acceptable for our setup

//!! RDS is on private VPC(172.31.x.x) & unreachab;e from local machine <-- ran into this issue
// backend will end up needing to run on EC2 instance to connect , its still not working for me
const pool = new Pool({
  host:process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false, // this is temporary
  },
});

module.exports = pool;
//set up connection pool to the database using the connection string from the environment variable DATABASE_URL \