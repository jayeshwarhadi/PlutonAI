// SERVERLESS FUNCTION (runs on Vercel/Netlify, not in the browser)

export default async function handler(req, res) {
    // 1. Ensure this is a POST request
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const tripData = req.body;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    // 2. Validate essential data is present
    if (!tripData.destination || !tripData.duration || !tripData.vibe || !GEMINI_API_KEY) {
        return res.status(400).json({ error: "Missing required trip data or API key." });
    }

    const model = 'gemini-pro';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    // 3. Construct the powerful prompt for Gemini
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

    // 4. Structure the request for the Gemini API
    const requestBody = {
        contents: [{ parts: [{ text: prompt }] }],
        safetySettings: [
            {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_NONE",
            },
            {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_NONE",
            },
            {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_NONE",
            },
            {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_NONE",
            },
        ],
    };

    console.log(prompt); // testing
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

        // 6. Extract, clean, and parse the JSON output
        const rawText = result.candidates[0].content.parts[0].text;
        const tripPlan = JSON.parse(rawText);

        // 7. Send the clean JSON back to the frontend
        res.status(200).json(tripPlan);

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        res.status(500).json({ error: "Failed to generate the trip plan." });
    }
}