// Thin wrapper around the Gemini REST API.
//
// Uses the built-in global `fetch` (Node 18+, which Express 5 already
// requires) instead of an SDK, so there's nothing extra to install.

const MODEL_NAME = 'gemini-2.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`;

async function generateContent(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return {
      success: false,
      content: null,
      error:
        'GEMINI_API_KEY is not set. Add a real key to Backend/.env to enable AI features.',
    };
  }

  try {
    const response = await fetch(`${ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        content: null,
        error: data?.error?.message ?? 'Gemini request failed.',
      };
    }

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? '')
        .join('') ?? '';

    if (!text) {
      return {
        success: false,
        content: null,
        error: 'Gemini returned an empty response.',
      };
    }

    return { success: true, content: text, error: null };
  } catch (err) {
    return { success: false, content: null, error: err.message };
  }
}

module.exports = { generateContent, MODEL_NAME };
