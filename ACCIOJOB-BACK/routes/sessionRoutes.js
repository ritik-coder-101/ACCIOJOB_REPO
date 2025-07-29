// routes/sessionRoutes.js
const express = require('express');
const auth = require('../middleware/authMiddleware');
const Session = require('../models/session');  
const mongoose=require('mongoose');

const router = express.Router();
router.post('/new',auth,async(req,res) => {
    const userId=req.user;

    try { 

        const newSession =new Session({
            userId:userId,
            chatHistory:[],
            generatedCode:{},
            uiEditorState:{}
        });

        await newSession.save();

        res.status(201).json({
            msg: 'New session created successfully',
            sessionId: newSession._id, 
            createdAt: newSession.createdAt,
            updatedAt: newSession.updatedAt
        });

    } catch (err) {
        console.error('Error creating new session:', err.message);
        res.status(500).send('Server error');
    }
});
router.get('/',auth, async (req,res) => {
    const userId=req.user;

    try { 
        const sessions= await Session.find({userId}).select('createdAt updatedAt').sort({updatedAt : -1});

        res.json(sessions.map(session => ({
            id: session._id,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt
        })));

    } catch (err) {
        console.error('Error fetching sessions:', err.message);
        res.status(500).send('Server error');
    }
});

router.get('/:id',auth, async(req,res) => {
    const userId =req.user;
    const sessionId=req.params.id;
    try{

        if (!mongoose.Types.ObjectId.isValid(sessionId)) {
            return res.status(400).json({ msg: 'Invalid session ID format' });
        }

        const session = await Session.findOne({ _id: sessionId, userId });
        if (!session) {
            return res.status(404).json({ msg: 'Session not found or not authorized' });
        }

        res.json({
            id: session._id,
            chat_history: session.chatHistory,   
            generated_code: session.generatedCode,
            ui_editor_state: session.uiEditorState,
            created_at: session.createdAt,
            updated_at: session.updatedAt
        });

    } catch (err) {
        console.error('Error loading specific sessions:', err.message);
        if (err.name === 'CastError' && err.path === '_id') {
            return res.status(400).json({ msg: 'Invalid session ID format' });
        }
        res.status(500).send('Server error');
    }
});

router.put('/:id/save',auth, async(req,res) => {
    const userId=req.user;
    const sessionId=req.params.id;

    const {chat_history , generated_code , ui_editor_state } = req.body;
    try {

        if (!mongoose.Types.ObjectId.isValid(sessionId)) {
            return res.status(400).json({ msg: 'Invalid session ID format' });
        }

        const updatedSession = await Session.findOneAndUpdate(
            { _id: sessionId, userId },
            {
                chatHistory: chat_history,
                generatedCode: generated_code, 
                uiEditorState: ui_editor_state 
            },
            { new: true }
        );

        if (!updatedSession) {
            return res.status(404).json({ msg: 'Session not found or not authorized to update' });
        }

        res.json({
            msg: 'Session saved successfully',
            sessionId: updatedSession._id,
            updatedAt: updatedSession.updatedAt
        });

    } catch(err) {
        console.error('Error saving session:', err.message);
        if (err.name === 'CastError' && err.path === '_id') {
            return res.status(400).json({ msg: 'Invalid session ID format' });
        }
        res.status(500).send('Server error');
    }
});

module.exports = router;