// SERVERLESS FUNCTION (api/generate-response.js)

export default async function handler(req, context) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const tripData = await req.json();
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!tripData.destination || !tripData.duration || !tripData.vibe || !GEMINI_API_KEY) {
        return new Response(JSON.stringify({ error: "Missing required trip data or API key." }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const model = 'gemini-1.5-flash-latest';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    const prompt = `
        You are an expert travel planner. Your task is to generate a detailed travel itinerary based on user preferences.

        User Preferences:
        - Destination: ${tripData.destination}
        - Trip Duration: ${tripData.duration} days
        - Desired Vibe: ${tripData.vibe}

        Your response MUST be in a valid JSON format based on this structure:
        {
          "tripName": "A ${tripData.duration}-Day Trip to ${tripData.destination}",
          "itinerary": [
            {
              "day": 1,
              "theme": "A theme for the day (e.g., 'Arrival and Exploration')",
              "activities": [
                { "time": "Morning", "description": "A detailed activity description for the morning." },
                { "time": "Afternoon", "description": "A detailed activity description for the afternoon." },
                { "time": "Evening", "description": "A detailed activity description for the evening." }
              ]
            }
          ]
        }
        Generate one object in the "itinerary" array for each day of the trip (e.g., a 3-day trip should have 3 objects in the array). Do not include any text outside of the JSON object.
    `;

    // ✅ FINAL FIX: Enable JSON Mode for reliable output
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

        // With JSON mode, we can parse the response directly without cleaning
        const result = await geminiResponse.json();
        
        if (!result.candidates || result.candidates.length === 0) {
            console.error("Gemini API returned no candidates. Response:", result);
            throw new Error("Gemini API returned no candidates.");
        }

        const rawText = result.candidates[0].content.parts[0].text;
        const tripPlan = JSON.parse(rawText);

        return new Response(JSON.stringify(tripPlan), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("Error in handler:", error);
        return new Response(JSON.stringify({ error: "Failed to generate the trip plan." }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}