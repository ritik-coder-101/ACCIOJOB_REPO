const express = require('express');
const bcrypt = require('bcryptjs'); // For password hashing
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const User = require('../models/user');
const router = express.Router();

// Helper function to generate a JWT token
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN, // e.g., "1d" for 1 day
    });
};
//signup
router.post(
    '/signup',[
        body('email').isEmail().withMessage('Please Enter a valid Email'),
        body('password').isLength({min : 8}).withMessage('Password must be at least 8 characters long')
    ],
    async (req,res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({errors : errors.array()});
        }

        const {email , password} = req.body;

        try {
            //if email already exists.
            let user= await User.findOne({email});
            if (user) {
                return res.status(400).json({ msg: 'User with this email already exists' });
            }
            //hash the password.
            const Hash=await bcrypt.genSalt(10);
            const passwordHash=await bcrypt.hash(password,Hash);
            
            //new user instance
            user = new User({
                email,
                passwordHash
            });

            //save it to database
            await user.save();

            const token=generateToken(user.id);

            res.status(201).json({
                msg: 'User registered successfully',
                token,
                user: { id: user.id, email: user.email },
            });

        } catch(err) {
            console.error('Signup error:', err.message);
            res.status(500).send('Server error');
        }
    }
);

//login
router.post(
    '/login',[
        body('email').isEmail().withMessage('Please Enter a valid email'),
        body('password').not().isEmpty().withMessage('PassWord is Required'),
    ],

    async (req,res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        try {

            const user = await User.findOne({ email });
            if (!user) {
                return res.status(400).json({ msg: 'Invalid Credentials' });
            }

            const isMatch = await bcrypt.compare(password, user.passwordHash);
            if (!isMatch) {
                return res.status(400).json({ msg: 'Invalid Credentials' });
            }
            //if match generate token.
            const token = generateToken(user.id);

            res.json({
                msg: 'Logged in successfully',
                token,
                user: { id: user.id, email: user.email },
            });

        } catch (error) {
            console.error('Login error:', err.message);
            res.status(500).send('Server error');
        }
    }
);

module.exports=router;