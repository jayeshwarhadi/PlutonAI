// SERVERLESS FUNCTION (api/generate-response.js)

export default async function handler(req, context) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const artistData = await req.json();
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    // --- NEW VALIDATION ---
    if (!artistData.artistStory || !artistData.artistExperience || !artistData.artistStyle || !GEMINI_API_KEY) {
        return new Response(JSON.stringify({ error: "Missing required artist data or API key." }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const model = 'gemini-1.5-flash-latest';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    // --- NEW PROMPT ---
    const prompt = `
        You are an expert marketing assistant and copywriter for creative artists named PlutonAI. 
        Your task is to generate a social media story, three business taglines, and a captivating advertisement text based on the artist's details.

        Artist's Details:
        - Story and Inspiration: ${artistData.artistStory}
        - Experience Level: ${artistData.artistExperience}
        - Artistic Style: ${artistData.artistStyle}

        Your response MUST be in a valid JSON format. The JSON object must have the following structure exactly:
        {
          "socialMediaStory": "A short, engaging story for Instagram or Facebook, written in the first person. It should be warm and authentic, weaving in the artist's inspiration.",
          "taglines": [
            "A short, memorable tagline that captures the essence of the artist's brand.",
            "A second tagline option, perhaps focusing on the style or craft.",
            "A third, more descriptive tagline."
          ],
          "advertisementText": "A compelling paragraph for a paid ad. It should start with a strong hook, describe the unique value of the art, and end with a clear call to action like 'Discover the collection today.'."
        }
        Do not include any text outside of the JSON object.
    `;

    const requestBody = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            "response_mime_type": "application/json",
        },
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ],
    };

    try {
        const geminiResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        if (!geminiResponse.ok) {
            const errorBody = await geminiResponse.text();
            console.error("Error from Gemini API:", errorBody);
            throw new Error(`API call failed with status: ${geminiResponse.status}`);
        }

        const result = await geminiResponse.json();
        
        if (!result.candidates || result.candidates.length === 0) {
            console.error("Gemini API returned no candidates. Response:", result);
            throw new Error("Gemini API returned no candidates.");
        }

        const rawText = result.candidates[0].content.parts[0].text;
        const marketingContent = JSON.parse(rawText);

        return new Response(JSON.stringify(marketingContent), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("Error in handler:", error);
        return new Response(JSON.stringify({ error: "Failed to generate marketing content." }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}