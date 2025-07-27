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
    const { prompt,image } = req.body;
    const userId = req.user;

    if (!prompt && !image) {
        return res.status(400).json({ msg: 'Prompt is required.' });
    }

    console.log(`User ${userId} sending prompt to AI: "${prompt}" ${image ? '(with image)' : ''}`);

    try {

        const systemInstruction = {
            role: 'system',
            parts: [
                { text: `You are an expert React component generator. 
                When the user asks you to "build", "create", "generate", or describes a UI element, 
                you must provide the component's code.
                Always include code in distinct markdown code blocks for JSx , CSS (generate this file seprately) if applicable.
                
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

        const contents=[];

        if (prompt) {
            contents.push({ role: 'user', parts: [{ text: prompt }] });
        }

        if (image) {
            const [mimeTypePart, base64DataPart] = image.split(',');
            const mimeType = mimeTypePart.match(/:(.*?);/)?.[1];

            if (!mimeType || !base64DataPart) {
                return res.status(400).json({ msg: 'Invalid image format. Must be Base64 data URL.' });
            }

            contents.push({
                role: 'user',
                parts: [{
                    inlineData: {
                        mimeType: mimeType,
                        data: base64DataPart
                    }
                }]
            });
        }

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
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
