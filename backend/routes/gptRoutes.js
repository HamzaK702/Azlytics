// routes/gptRoutes.js
import express from 'express';
import { generateCompletion, streamingChat } from '../services/gptService.js';

const router = express.Router();

router.post('/generate', async (req, res) => {
    const { prompt } = req.body;
   
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    try {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        const stream = await streamingChat(prompt);

        // Pipe the stream directly to the response
        stream.pipe(res);

        // Close the response once streaming is complete
        stream.on('end', () => {
            res.end();
        });


    } catch (error) {
        console.error('Error in GPT route:', error.message);
        res.status(500).json({ error: 'Failed to generate completion' });
    }
});

export default router;
