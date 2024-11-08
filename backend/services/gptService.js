// services/gptService.js
import OpenAI from 'openai';
import { Readable } from 'stream';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const generateCompletion = async (prompt, onData) => {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
        });
         
        // Extract the full content directly
        const content = response.choices[0].message.content;
        onData(content);

        return content;
    } catch (error) {
        console.error('Error in GPT service:', error.response?.data || error.message);
        throw new Error('Error generating completion');
    }
};

export async function streamingChat(prompt){
    const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        stream: true,
    });

    const outputStream = new Readable({
        read() {}
    });

    (async () => {
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            outputStream.push(content);
        }
        outputStream.push(null); // Signal the end of the stream
    })();

    return outputStream;
}
