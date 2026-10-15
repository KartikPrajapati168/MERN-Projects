// backend/utils/gemini.js
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-3.8-flash'; // fast + free
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Send a chat prompt to Gemini with system context.
 * @param {string} userQuestion - Admin's question
 * @param {string} dataContext - Live data from MongoDB (users, deals, etc.)
 * @returns {Promise<string>} Gemini's response text
 */
const askGemini = async (userQuestion, dataContext = '') => {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not set in environment variables');
  }

  const systemPrompt = `You are the admin assistant for "WasteExchange AI", a B2B marketplace connecting waste generators with buyers for recycling.

You have access to LIVE data from the admin dashboard. Use it to answer the admin's questions accurately and briefly.

LIVE DATA SNAPSHOT (as of now):
${dataContext}

RULES:
1. Answer ONLY using the provided data + general knowledge of how a waste marketplace works.
2. Be concise — 1-3 sentences unless asked for a report.
3. If the admin asks for "how many X", give the exact number from the data.
4. If data doesn't contain the answer, say "I don't have that information in my current data."
5. Never invent numbers — always use the data above.
6. Format numbers in Indian style (e.g., ₹1,23,456).
7. Use friendly, professional tone.`;

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: `${systemPrompt}\n\n---\n\nADMIN'S QUESTION: ${userQuestion}` }],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 500,
      topP: 0.9,
    },
  };

  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('❌ Gemini API error:', res.status, errText);
    throw new Error(`Gemini API failed (${res.status}). Please try again.`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    console.error('❌ Gemini response empty:', JSON.stringify(data));
    throw new Error('Gemini returned an empty response.');
  }

  return text.trim();
};

module.exports = { askGemini };