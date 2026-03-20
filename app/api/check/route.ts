import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { item, rule } = await req.json();

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Game "I'm going on a picnic". 
    Secret rule: "${rule}". 
    Player wants to bring: "${item}". 
    Does it fit the rule? Answer ONLY in JSON: {"allowed": true/false, "reason": "short explanation"}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Очищаем текст от возможных markdown-кавычек ИИ
    const cleanJson = text.replace(/```json|```/g, "").trim();
    return NextResponse.json(JSON.parse(cleanJson));
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ allowed: false, reason: "Error checking rule" }, { status: 500 });
  }
}