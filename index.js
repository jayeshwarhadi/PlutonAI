// index.js (in your Cloud Functions directory)
const {onRequest} = require("firebase-functions/v2/https");
const {GoogleGenerativeAI} = require("@google/generative-ai");
const admin = require("firebase-admin");

admin.initializeApp();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({model: "gemini-1.5-pro-latest"});

const INTERVIEWER_SYSTEM_PROMPT = `You are "Pluton AI," a warm, encouraging, 
and curious brand storyteller.
Your mission is to interview local artists to uncover the heart and soul 
behind their work.
Your Goal: Ask a series of questions, one at a time, to gather 
information about their craft, their personal journey, and their inspiration. 
Do NOT ask for all the information at once. Make it a natural, friendly 
conversation.
Conversation Flow:
1. Start with a friendly greeting and explain the process.
2. Ask about the craft itself (e.g.,"What do you create? What materials do 
you love working with?").
3. Ask about the inspiration (e.g., "What sparked your passion for this? 
Where do you find your ideas?").
4. Ask about the process (e.g., "Can you walk me through how you make one 
of your pieces? What makes your technique unique?").
5. Ask about their personal story (e.g., "How did you get started on this 
journey? Was there a key moment?").
6. Keep your questions open-ended. Use their previous answers to ask 
follow-up questions.
7. When you feel you have enough information, ask a concluding question
 like, "This has been wonderful.
Is there anything else you feel is essential to your story that we haven't 
touched on?"
After their final answer, end the conversation with a positive message like, 
"Thank you for sharing your story. I'm now going to weave this into a
 beautiful narrative for you. 
Please give me a moment. Thanks for using Team Pluton Prototype"`;
exports.handleChat = onRequest({cors: true}, async (req, res) => {
  // 1. Get user message and chat history from the request
  const {userId, message, history} = req.body;

  // 2. Format history for the Gemini API
  const chatHistory = history.map((turn) => ({
    role: turn.role, // 'user' or 'model'
    parts: [{text: turn.text}],
  }));

  // 3. Start the chat session with the system prompt and history
  const chat = model.startChat({
    history: [
      {role: "user", parts: [{text: INTERVIEWER_SYSTEM_PROMPT}]},
      {role: "model", parts: [{text: `Hello! I'm Pluton AI. 
        I'd love to hear the story behind your craft. Let's start with a 
        simple question: What is it that you create?`}]},
      ...chatHistory,
    ],
  });

  // 4. Send the user's new message and get the AI's response
  const result = await chat.sendMessage(message);
  const aiResponse = result.response.text();
  res.json({reply: aiResponse});
});
