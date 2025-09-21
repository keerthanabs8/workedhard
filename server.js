// server.js
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON requests and enable CORS
app.use(express.json());
app.use(cors());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Set up the Gemini API key from Render's environment variable
const geminiAPIKey = process.env.GEMINI_API_KEY;

if (!geminiAPIKey) {
  console.error("Gemini API key is not set! Check your Render environment variables.");
  // You might want to exit the application or disable the AI feature
}

const genAI = new GoogleGenerativeAI(geminiAPIKey);

// Create a new endpoint for your front-end to call
app.post('/api/ask-ai', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    // Ensure a prompt was sent
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Send the AI's response back to the front-end
    res.json({ text: text });

  } catch (error) {
    console.error('Error with Gemini API call:', error);
    res.status(500).json({ error: 'Failed to get a response from the AI.' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
