
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const apiKey = process.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
    console.log("API Key missing!");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function main() {
    try {
        console.log("Listing models...");
        const response = await ai.models.list();

        // Log the type/keys of response to understand structure
        console.log("Response Type:", typeof response);
        if (response) console.log("Response Keys:", Object.keys(response));

        if (response && Array.isArray(response.models)) {
            console.log("\n--- Available Models ---");
            response.models.map((m: any) => {
                console.log(`ID: ${m.name}`);
                console.log(`Display: ${m.displayName}`);
                console.log(`Methods: ${m.supportedGenerationMethods}`);
                console.log("---");
            });
        } else {
            console.log("Raw Response:", JSON.stringify(response, null, 2));
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

main();
