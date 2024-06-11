// node --version # Should be >= 18
// npm install @google/generative-ai express pdf-parse

const express = require('express');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const dotenv = require('dotenv').config();
const fs = require('fs');
const pdfParse = require('pdf-parse');

const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());
const MODEL_NAME = "gemini-pro";
const API_KEY = process.env.API_KEY;

let chatHistory = [];

async function readPdf(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

async function runChat(userInput) {
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const generationConfig = {
    temperature: 0.9,
    topK: 1,
    topP: 1,
    maxOutputTokens: 1000,
  };

  const safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    // ... other safety settings
  ];

  if (chatHistory.length === 0) {
    console.log(`Antes de pdf`);
    const pdfText = await readPdf(__dirname + '/Information.pdf');
    console.log(`Despues de pdf`);
    chatHistory.push({
      role: "user",
      parts: [{ text: `You are Chatsit, a bot to help students of Shibaura Institute of Technology, also called SIT. Please answer every question as clear as possible. Here is some information from a PDF: ${pdfText}` }],
    });
    chatHistory.push({
      role: "model",
      parts: [{ text: "Hello! My name is Chatsit. How can I help you?" }],
    });
  }
  console.log(`startChat: ${JSON.stringify(chatHistory)}`);
  const chat = model.startChat({
    generationConfig,
    safetySettings,
    history: chatHistory,
  });

  chatHistory.push({
    role: "user",
    parts: [{ text: userInput }],
  });

  const result = await chat.sendMessage(userInput);
  const response = result.response;

  chatHistory.push({
    role: "model",
    parts: [{ text: response.text() }],
  });

  return response.text();
}

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});
app.get('/loader.gif', (req, res) => {
  res.sendFile(__dirname + '/loader.gif');
});
app.post('/chat', async (req, res) => {
  try {
    const userInput = req.body?.userInput;
    console.log('incoming /chat req', userInput);
    if (!userInput) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const response = await runChat(userInput);
    res.json({ response });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
