import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { item, rule } = await req.json();
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      Context: "I'm going on a picnic" game.
      Secret Rule: "${rule}"
      Player's Word: "${item}"

      Instructions:
      1. Analyze the word "${item}" letter by letter (spelling).
      2. Analyze the properties (color, category, material).
      3. Strict Rule Check: Does it match the rule?
      4. If the rule is about double letters, check if any letter appears twice in a row (e.g., 'ee' in 'peer').
      
      Respond only in JSON: {"allowed": true, "reason": "why"}
    `;

    const result = await model.generateContent(prompt);
    return NextResponse.json(JSON.parse(result.response.text()));
  } catch (error) {
    return NextResponse.json({ allowed: false, error: true });
  }
}