// SERVERLESS FUNCTION (api/generate-response.js)

// Netlify Functions' handler takes a 'Request' object and a 'context' object.
export default async function handler(req, context) {
    // 1. Ensure this is a POST request
    if (req.method !== 'POST') {
        // CHANGED: New return format
        return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const tripData = await req.json(); // CHANGED: We get the body by awaiting req.json()
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    // 2. Validate essential data is present
    if (!tripData.destination || !tripData.duration || !tripData.vibe || !GEMINI_API_KEY) {
        // CHANGED: New return format
        return new Response(JSON.stringify({ error: "Missing required trip data or API key." }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const model = 'gemini-pro';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    // 3. Construct the powerful prompt for Gemini (This part is unchanged)
    const prompt = `
        You are an expert travel planner. Your task is to generate a detailed travel itinerary based on user preferences.

        User Preferences:
        - Destination: ${tripData.destination}
        - Trip Duration: ${tripData.duration} days
        - Desired Vibe: ${tripData.vibe}

        Your response MUST be in a valid JSON format. Do not include any introductory text, explanations, or markdown code blocks like \`\`\`json. The JSON object must have the following structure exactly:
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
        Generate one object in the "itinerary" array for each day of the trip (e.g., a 3-day trip should have 3 objects in the array).
    `;

    // 4. Structure the request for the Gemini API (This part is unchanged)
    const requestBody = {
        contents: [{ parts: [{ text: prompt }] }],
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ],
    };

    // 5. Call the API and handle the response
    try {
        const geminiResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        if (!geminiResponse.ok) {
            const errorBody = await geminiResponse.text();
            throw new Error(`API call failed with status: ${geminiResponse.status} and body: ${errorBody}`);
        }

        const result = await geminiResponse.json();

        const rawText = result.candidates[0].content.parts[0].text;
        const tripPlan = JSON.parse(rawText);

        // 7. Send the clean JSON back to the frontend
        // CHANGED: New successful return format
        return new Response(JSON.stringify(tripPlan), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        // CHANGED: New error return format
        return new Response(JSON.stringify({ error: "Failed to generate the trip plan." }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}