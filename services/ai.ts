
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const getApiKey = () => {
    // Priority 1: Vite Standard (import.meta.env) - Best for Vercel/Production
    // @ts-ignore
    if (import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) {
        return import.meta.env.VITE_GEMINI_API_KEY;
    }

    // Priority 2: Fallbacks (Local/Legacy)
    // @ts-ignore
    if (import.meta.env && import.meta.env.GEMINI_API_KEY) return import.meta.env.GEMINI_API_KEY;

    try {
        // @ts-ignore
        if (process.env.VITE_GEMINI_API_KEY) return process.env.VITE_GEMINI_API_KEY;
        // @ts-ignore
        if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
        // @ts-ignore
        if (process.env.API_KEY) return process.env.API_KEY;
    } catch (e) { }

    return undefined;
};

const API_KEY = getApiKey();

// DIAGNOSTIC LOG
console.log("[AI SERVICE] Environment Check:");
// @ts-ignore
console.log("- import.meta.env.VITE_GEMINI_API_KEY:", import.meta.env?.VITE_GEMINI_API_KEY ? "FOUND (Encoded)" : "MISSING");
// @ts-ignore
console.log("- process.env.VITE_GEMINI_API_KEY:", process.env?.VITE_GEMINI_API_KEY ? "FOUND (Encoded)" : "MISSING");

if (API_KEY) {
    console.log(`[AI SERVICE] Final API Key loaded. Starts with: ${API_KEY.substring(0, 5)}...`);
} else {
    console.error("[AI SERVICE] CRITICAL: No API Key found. PDF extraction will fail.");
}

const genAI = new GoogleGenerativeAI(API_KEY || "");

export interface ExtractedJobDetails {
    title: string;
    department: string;
    location: string;
    type: string;
    skills: string[];
}

export interface ExtractedResumeDetails {
    candidateName: string;
    currentRole: string;
    matchScore: number;
    analysis: string;
    skillsFound: string[];
    experienceYears: number;
    jdMatchScore: number;
    qualificationMatchScore: number;
    resumeMatchScore: number;

    jdMatchReason: string;
    qualificationMatchReason: string;
    resumeMatchReason: string;
    deepAnalysis: {
        executiveSummary: string;
        strengths: string[];
        weaknesses: string[];
        missingSkills: string[];
        skillsMatched: string[];
        experienceRelevance: string;
        experienceMatchLevel: "Low" | "Medium" | "High";
        roleSimilarity: "Low" | "Medium" | "High";
        interviewQuestions: string[];
        culturalFit: string;
    };
}

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve(base64String);
        };
        reader.onerror = (error) => reject(error);
    });
};

export const extractJobDetailsFromPDF = async (file: File): Promise<ExtractedJobDetails> => {
    if (!API_KEY) {
        const debugInfo = [
            `import.meta.env.VITE_GEMINI_API_KEY: ${import.meta.env?.VITE_GEMINI_API_KEY ? "Defined" : "Missing"}`,
            `process.env.VITE_GEMINI_API_KEY: ${process.env?.VITE_GEMINI_API_KEY ? "Defined" : "Missing"}`
        ].join(', ');
        throw new Error(`Gemini API Key Missing. Debug: ${debugInfo}. Please set VITE_GEMINI_API_KEY in Vercel.`);
    }

    const model = genAI.getGenerativeModel({
        //model: "gemini-1.5-flash-001",
        model: "gemini-flash-latest",
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: SchemaType.OBJECT,
                properties: {
                    title: { type: SchemaType.STRING },
                    department: { type: SchemaType.STRING },
                    location: { type: SchemaType.STRING },
                    type: { type: SchemaType.STRING },
                    skills: {
                        type: SchemaType.ARRAY,
                        items: { type: SchemaType.STRING }
                    }
                },
                required: ["title", "department", "location", "type", "skills"]
            }
        }
    });

    const base64Data = await fileToBase64(file);

    try {
        const result = await model.generateContent([
            {
                text: "Analyze this Job Description PDF and extract details in JSON format. Infer if not clear."
            },
            {
                inlineData: {
                    data: base64Data,
                    mimeType: "application/pdf"
                }
            }
        ]);

        const response = await result.response;
        return JSON.parse(response.text()) as ExtractedJobDetails;
    } catch (error: any) {
        console.error("Gemini API Error Detail:", error);
        throw error;
    }
};

export const analyzeResume = async (
    file: File,
    jobContext: { title: string, skills: string[], description?: string }
): Promise<ExtractedResumeDetails> => {
    if (!API_KEY) {
        throw new Error("Gemini API Key is missing.");
    }

    const model = genAI.getGenerativeModel({
        model: "gemini-flash-latest",
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: SchemaType.OBJECT,
                properties: {
                    candidateName: { type: SchemaType.STRING },
                    currentRole: { type: SchemaType.STRING },
                    matchScore: { type: SchemaType.NUMBER },
                    analysis: { type: SchemaType.STRING },
                    skillsFound: {
                        type: SchemaType.ARRAY,
                        items: { type: SchemaType.STRING }
                    },
                    experienceYears: { type: SchemaType.NUMBER },
                    jdMatchScore: { type: SchemaType.NUMBER },
                    qualificationMatchScore: { type: SchemaType.NUMBER },
                    resumeMatchScore: { type: SchemaType.NUMBER },

                    jdMatchReason: { type: SchemaType.STRING },
                    qualificationMatchReason: { type: SchemaType.STRING },
                    resumeMatchReason: { type: SchemaType.STRING },
                    deepAnalysis: {
                        type: SchemaType.OBJECT,
                        properties: {
                            executiveSummary: { type: SchemaType.STRING },
                            strengths: {
                                type: SchemaType.ARRAY,
                                items: { type: SchemaType.STRING }
                            },
                            weaknesses: {
                                type: SchemaType.ARRAY,
                                items: { type: SchemaType.STRING }
                            },
                            missingSkills: {
                                type: SchemaType.ARRAY,
                                items: { type: SchemaType.STRING }
                            },
                            skillsMatched: {
                                type: SchemaType.ARRAY,
                                items: { type: SchemaType.STRING }
                            },
                            experienceRelevance: { type: SchemaType.STRING },
                            experienceMatchLevel: { type: SchemaType.STRING, enum: ["Low", "Medium", "High"] },
                            roleSimilarity: { type: SchemaType.STRING, enum: ["Low", "Medium", "High"] },
                            interviewQuestions: {
                                type: SchemaType.ARRAY,
                                items: { type: SchemaType.STRING }
                            },
                            culturalFit: { type: SchemaType.STRING }
                        },
                        required: ["executiveSummary", "strengths", "weaknesses", "missingSkills", "skillsMatched", "experienceRelevance", "experienceMatchLevel", "roleSimilarity", "interviewQuestions", "culturalFit"]
                    }
                },
                required: [
                    "candidateName",
                    "currentRole",
                    "matchScore",
                    "analysis",
                    "skillsFound",
                    "experienceYears",
                    "jdMatchScore",
                    "qualificationMatchScore",
                    "resumeMatchScore",

                    "jdMatchReason",
                    "qualificationMatchReason",
                    "resumeMatchReason",
                    "deepAnalysis"
                ]
            }
        }
    });

    const base64Data = await fileToBase64(file);

    try {
        console.log(`[AI SERVICE] Sending ${file.name} to Gemini for Resume Analysis...`);
        const result = await model.generateContent([
            {
                text: `Perform a Deep-Match Analysis of this resume against the following role:
                - Title: ${jobContext.title}
                - Key Skills: ${jobContext.skills.join(', ')}
                ${jobContext.description ? `- Job Description: ${jobContext.description.substring(0, 1000)}...` : ''}
                
                You must extract the following strictly:
                1. candidateName: Look for the most prominent name at the top. If not found, use a short, professional placeholder.
                2. matchScore: A number from 0-100 indicating how well they fit the Key Skills and Title (Overall Score).
                3. currentRole: Their latest job title.
                4. experienceYears: Number of years of experience.
                5. jdMatchScore: 0-100 score based purely on the text overlap and semantic match with the Job Description.
                6. qualificationMatchScore: 0-100 score based on their education and certifications relevance.
                7. resumeMatchScore: 0-100 score based on the quality, structure, and clarity of the resume content itself.
                8. jdMatchReason: A concise, one-sentence explanation of why the JD Match score was given (e.g. "Missing critical Python experience but has strong SQL").
                9. qualificationMatchReason: A concise one-sentence reason for the qualification score (e.g. "Matches Master's requirement but unrelated field").
                10. resumeMatchReason: A concise one-sentence reason for the resume quality score (e.g. "Clear formatting but lacks quantifiable metrics").
                11. deepAnalysis: An object containing:
                    - executiveSummary: A 2-3 sentence overview of the candidate's fit.
                    - strengths: Array of 3 key strengths.
                    - weaknesses: Array of 3 potential weaknesses.
                    - skillsMatched: Array of hard skills found in both JD and Resume.
                    - missingSkills: Array of skills from the JD that are missing.
                    - experienceRelevance: A paragraph analyzing how their past roles match the detailed job requirements.
                    - experienceMatchLevel: "Low", "Medium", or "High" based on years and relevance.
                    - roleSimilarity: "Low", "Medium", or "High" based on previous job titles and responsibilities vs target role.
                    - interviewQuestions: Array of 5 technical and behavioral interview questions tailored to their gaps.
                    - culturalFit: A brief assessment of likely cultural fit based on resume tone and activities.
                
                IMPORTANT: Return ONLY valid JSON. No markdown code blocks.`
            },
            {
                inlineData: {
                    data: base64Data,
                    mimeType: file.type || "application/pdf"
                }
            }
        ]);

        const response = await result.response;
        const text = response.text();
        console.log(`[AI SERVICE] Raw response from Gemini for ${file.name}:`, text.substring(0, 100) + "...");

        // Clean markdown if Gemini ignored the instruction
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);

        console.log(`[AI SERVICE] Successfully parsed analysis for ${file.name}. Score: ${parsed.matchScore}`);
        return parsed as ExtractedResumeDetails;
    } catch (error: any) {
        console.error("Gemini Resume Analysis Error:", error);
        throw error;
    }
};
