import { GoogleGenAI } from "@google/genai";

export async function getProfileAdvice(profile: any) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    const model = "gemini-3-flash-preview";
    const prompt = `
      Analyze the following user profile and provide 3-5 actionable tips to make it more professional and stand out to recruiters.
      Focus specifically on areas like the headline, bio, and skills.
      
      Profile Data:
      Name: ${profile.displayName}
      Headline: ${profile.headline}
      Bio: ${profile.bio}
      Skills: ${profile.skills?.join(', ')}
      Experience: ${JSON.stringify(profile.experience)}
      Education: ${JSON.stringify(profile.education)}
      
      Format the response as a bulleted list in Markdown.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I couldn't analyze your profile at this time. Please try again later.";
  }
}

export async function getSmartNetworkingAdvice(userProfile: any, targetProfile: any) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    const model = "gemini-3-flash-preview";
    const prompt = `
      Analyze these two profiles and explain in 2-3 sentences why they should connect. 
      Look for shared interests, similar career paths, or complementary skills.
      
      User Profile:
      Name: ${userProfile.displayName}
      Headline: ${userProfile.headline}
      Skills: ${userProfile.skills?.join(', ')}
      
      Target Profile:
      Name: ${targetProfile.displayName}
      Headline: ${targetProfile.headline}
      Skills: ${targetProfile.skills?.join(', ')}
      
      Keep it professional and encouraging.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "You both have great profiles! Connecting could lead to interesting discussions.";
  }
}
