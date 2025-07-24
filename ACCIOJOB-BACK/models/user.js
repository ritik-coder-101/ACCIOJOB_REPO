const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true, // Ensures no two users can have the same email
        match: [/.+@.+\..+/, 'Please enter a valid email address'] // Basic email format validation
    },
    passwordHash: { // Stores the securely hashed password
        type: String,
        required: true
    },
    createdAt: { // Automatically records when the user was created
        type: Date,
        default: Date.now
    }
});

module.exports=mongoose.model('User',UserSchema);