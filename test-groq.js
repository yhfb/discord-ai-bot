require('dotenv').config();
const Groq = require('groq-sdk');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

async function test() {
    try {
        console.log("Testing Groq API with key:", process.env.GROQ_API_KEY.substring(0, 10) + "...");
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "user", content: "Hello, say hi in Arabic." }
            ],
            model: "llama-3.3-70b-versatile",
        });
        console.log("Response:", chatCompletion.choices[0].message.content);
        console.log("✅ API is working perfectly!");
    } catch (error) {
        console.error("❌ API Error Details:");
        console.error("Status:", error.status);
        console.error("Message:", error.message);
        if (error.response) {
            console.error("Data:", error.response.data);
        }
    }
}

test();
