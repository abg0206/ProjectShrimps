//sanitizing user input for registration
function validRegister(req, res, next) {
    const { clerkId,email, phone, firstName, lastName } = req.body;
    // Basic validation
    if (!clerkId || !email) {
        return res.status(400).json({ error: 'clerkId and email are required' });
    }
    if (!phone || !firstName || !lastName) {
        return res.status(400).json({ error: 'Phone, first name, and last name are required' });
    }
    
    
    //strip potential chars that could be used for injection attacks from name fields
    req.body.firstName = firstName.trim();
    req.body.lastName = lastName.trim();

    const nameRegex = /^[a-zA-Z\s'-]+$/; // allows letters, spaces, apostrophes, and hyphens
    if (!nameRegex.test(firstName) || !nameRegex.test(lastName)) {
        return res.status(400).json({ error: 'Name fields must contain only letters, spaces, apostrophes, and hyphens' });
    }
    
    //make sures string inputs aren't too long to prevent potential buffer overflow attacks
    if (typeof clerkId !== 'string' || clerkId.length > 255){
        return res.status(400).json({ error: 'Invalid clerkId'});
    }
    
    //check length of name fields
    if (firstName.length > 100 || lastName.length > 100) {
        return res.status(400).json({ error: 'Name fields must be under 100 characters' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }
    //checks phone number format is valid
    if (!/^\d{10}$/.test(String(phone))) {
        return res.status(400).json({ error: 'Phone number must be a 10-digit number'});
    }
    req.body.email = email.trim().toLowerCase();
    next();
}
module.exports = validRegister;