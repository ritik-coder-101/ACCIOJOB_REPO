// routes/aiRoutes.js
require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const auth = require('../middleware/authMiddleware');

const router = express.Router();
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.error("CRITICAL ERROR: GEMINI_API_KEY is not set in .env file!");
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });


router.post('/generate', auth, async (req, res) => {
    const { prompt,image ,chatHistory, currentGeneratedCode } = req.body;
    const userId = req.user;

    if (!prompt && !image) {
         return res.status(400).json({ msg: 'Prompt or image is required.' });
    }

    console.log(`User ${userId} sending prompt to AI: "${prompt}" ${image ? '(with image)' : ''}`);
    console.log(`AI context: ${chatHistory ? chatHistory.length : 0} previous messages.`);
    if (currentGeneratedCode && (currentGeneratedCode.jsx || currentGeneratedCode.css || currentGeneratedCode.html)) {
        console.log(`AI context: Previous generated code present.`);
    }

    try {

        const systemInstruction = {
            role: 'system',
            parts: [
            { text: `You are an expert React component generator. 
            When the user asks you to "build", "create", "generate", or describes a UI element, 
            you must provide the component's code.
            Always include code in distinct markdown code blocks for JSX, CSS, and HTML if applicable.
            
            Format your code clearly:
            - JSX/JavaScript: Use \`\`\`jsx ... \`\`\` or \`\`\`javascript ... \`\`\`
            - CSS: Use \`\`\`css ... \`\`\`
            - HTML: Use \`\`\`html ... \`\`\`
            
            Provide a brief explanation first, then the code blocks.
            Do not include 'import React from "react";' in your JSX output, assume React is globally available.
            Do not include 'import './App.css';' or similar CSS imports.
            Do not use 'useNavigate' or other routing-specific hooks in your component code.
            Generate self-contained components suitable for direct rendering.` }
            ],
        };

        const contents = []; // This array will hold the full conversational and multimodal context

        // 1. Add previous chat history (user/model turns)
        if (chatHistory && chatHistory.length > 0) {
            chatHistory.forEach((msg) => { // Cast to any for flexibility with incoming types
                const parts = [{ text: msg.content }];
                if (msg.imageUrl) {
                    const [mimeTypePart, base64DataPart] = msg.imageUrl.split(',');
                    const mimeType = mimeTypePart.match(/:(.*?);/)?.[1];
                    if (mimeType && base64DataPart) {
                        parts.push({ inlineData: { mimeType, data: base64DataPart } });
                    }
                }
                // Add code snippet to AI's previous turn if it exists
                if (msg.role === 'ai' && msg.code_snippet && (msg.code_snippet.jsx || msg.code_snippet.css || msg.code_snippet.html)) {
                    let codeText = '';
                    if (msg.code_snippet.jsx) codeText += `\n\`\`\`jsx\n${msg.code_snippet.jsx}\n\`\`\``;
                    if (msg.code_snippet.css) codeText += `\n\`\`\`css\n${msg.code_snippet.css}\n\`\`\``;
                    if (msg.code_snippet.html) codeText += `\n\`\`\`html\n${msg.code_snippet.html}\n\`\`\``;
                    if (codeText) parts.push({ text: `\n\nPrevious Code Generated:${codeText}` }); // Append code to AI's message
                }
                contents.push({ role: msg.role === 'user' ? 'user' : 'model', parts: parts });
            });
        }

        // 2. Add current generated code as context for the AI (e.g., as a 'model' turn right before the new user prompt)
        if (currentGeneratedCode && (currentGeneratedCode.jsx || currentGeneratedCode.css || currentGeneratedCode.html)) {
            let codeText = '';
            if (currentGeneratedCode.jsx) codeText += `\n\`\`\`jsx\n${currentGeneratedCode.jsx}\n\`\`\``;
            if (currentGeneratedCode.css) codeText += `\n\`\`\`css\n${currentGeneratedCode.css}\n\`\`\``;
            if (currentGeneratedCode.html) codeText += `\n\`\`\`html\n${currentGeneratedCode.html}\n\`\`\``;
            
            if (codeText) {
                contents.push({
                    role: 'model',
                    parts: [{ text: `Current component code to refine:${codeText}` }]
                });
            }
        }
        
        // 3. Add the current user prompt (and image)
        const userPromptParts = [{ text: prompt }]; // <-- userPromptParts defined here
        if (image) {
            const [mimeTypePart, base64DataPart] = image.split(',');
            const mimeType = mimeTypePart.match(/:(.*?);/)?.[1];
            if (mimeType && base64DataPart) {
                userPromptParts.push({ inlineData: { mimeType, data: base64DataPart } });
            }
        }
        contents.push({ role: 'user', parts: userPromptParts }); // <-- userPromptParts used here

        const result = await model.generateContent({
            contents: contents,
            systemInstruction: systemInstruction,
        });
        const response = await result.response;
        const text = response.text();

        let generatedJsx = '';
        let generatedCss = '';
        let generatedHtml = ''; 
        let aiTextResponse = text;

        const codeBlockRegex = /```(jsx|tsx|javascript|js|css|html)\n([\s\S]*?)```/g;
        let match;
        let codeSnippetsFound = [];

        while ((match = codeBlockRegex.exec(text)) !== null) {
            const lang = match[1];
            const code = match[2].trim();
            codeSnippetsFound.push({ lang, code });
        }

        if (codeSnippetsFound.length > 0) {
            const jsxSnippet = codeSnippetsFound.find(s => s.lang.includes('js'));
            const cssSnippet = codeSnippetsFound.find(s => s.lang === 'css');
            const htmlSnippet = codeSnippetsFound.find(s => s.lang === 'html');

            if (jsxSnippet) generatedJsx = jsxSnippet.code;
            if (cssSnippet) generatedCss = cssSnippet.code;
            if (htmlSnippet) generatedHtml = htmlSnippet.code;

            aiTextResponse = text.replace(codeBlockRegex, '').trim();
            if (aiTextResponse.length === 0 && (generatedJsx || generatedCss || generatedHtml)) {
                aiTextResponse = "Here's the component code you requested:";
            } else if (aiTextResponse.length === 0) {
                aiTextResponse = "I processed your request, but found no code or specific text to return.";
            }
        } else {
            generatedJsx = `// No JSX generated for this prompt.`;
            generatedCss = `/* No CSS generated for this prompt. */`;
            generatedHtml = ``; 
        }

        res.json({
            aiText: aiTextResponse,
            generatedCode: {
                jsx: generatedJsx,
                css: generatedCss,
                html: generatedHtml,
                 },
        });

    } catch (err) {
        console.error('Error calling Gemini API:', err.message);
        if (err.response && err.response.data && err.response.data.error) {
            return res.status(500).json({ msg: `AI API Error: ${err.response.data.error.message}` });
        }
        res.status(500).json({ msg: 'Failed to generate content from AI. Please try again.' });
    }
});

module.exports = router;