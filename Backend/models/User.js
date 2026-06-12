const pool = require('../config/db');


async function findByClerkId(clerkId){
    const result = await pool.query('SELECT * FROM user_account WHERE clerk_id = $1', [clerkId]);
    return result.rows[0];
}
async function createUser(email, clerkId, phone, firstName, lastName){
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('INSERT INTO user_profile (email, phone, first_name, last_name) VALUES ($1, $2, $3, $4)',
             [email, phone, firstName, lastName]);
        const result = await client.query('INSERT INTO user_account (email, clerk_id) VALUES ($1, $2) RETURNING email, clerk_id', [email, clerkId]);

        await client.query('COMMIT');
        return result.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}
module.exports = { findByClerkId, createdUser };