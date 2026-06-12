//using clerk user into database
//import database helper functions for this controller
const { findByClerkId, createUser } = require('../models/User');

//handles registering/syncing of clerk-auth user into the database vv
async function register(req, res){
    const { clerkId, email, phone, firstName, lastName } = req.body; //fields
    if (!clerkId || !email){
        return res.status(400).json({ error: 'clerkId and email are required' });
       
    }
    if (!phone || !firstName || !lastName){ 
        return res.status(400).json({ error: 'phone, firstName, and lastName are required' }); //profile fields required
    }
    try {
        const returningUser = await findByClerkId(clerkId); //check if user already exists in the database with the given clerkId
        //if user found, dont create a duplicate ** -- user is already registered
        if (returningUser){
            return res.status(409).json({ error: 'User already exists'});
        }
        const newUser = await createUser(email, clerkId, phone, firstName, lastName); // create new rows in user_profile and user_account for this user
        res.status(201).json({
            message: 'User registered successfully', user: newUser }); // new user created success msg
    } catch (err) {
        console.error('Error registering user:', err); // log the error server-side for debugging
        res.status(500).json({ error: 'Internal server error' }); // return error msg to client (no leaking internal error details)
    }
}
module.exports = { register };