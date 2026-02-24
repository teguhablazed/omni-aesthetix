import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

/**
 * Generates a personalized engagement draft for WhatsApp/Email.
 * Follows a luxury "Rose Gold" style.
 */
export async function generateEngagementDraft(
    patientName: string,
    treatmentName: string,
    lastVisitDate: string,
    crossSellProduct?: string
) {
    const prompt = `
    Patient Name: ${patientName}
    Last Treatment: ${treatmentName}
    Treatment Date: ${lastVisitDate}
    Suggested Upsell: ${crossSellProduct || "Premium Post-treatment Serum"}

    Task: Write a highly personal, luxurious (Deep Navy & Rose Gold theme style) WhatsApp message.
    - Start with a warm greeting.
    - Provide specific after-care tips for ${treatmentName}.
    - Mention the ${crossSellProduct || "Premium Post-treatment Serum"} to improve results.
    - Invite them for a follow-up or next treatment appointment.
    - End with a professional, elegant closing.
    - Use emojis sparingly but elegantly (e.g., ✨, 🌹).
    - Limit to 3-4 short paragraphs.
    `;

    try {
        const result = await hf.chatCompletion({
            model: "Qwen/Qwen2.5-Coder-32B-Instruct",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 500,
        });
        return result.choices[0].message.content;
    } catch (error) {
        console.error("AI Engagement Error:", error);
        return `Hello ${patientName}, we hope you are enjoying the results of your ${treatmentName}. Don't forget your after-care routine. ✨`;
    }
}

/**
 * Analyzes clinician's session notes to predict a satisfaction score (1-10).
 */
export async function analyzePatientSentiment(sessionNotes: string) {
    const prompt = `
    Clinician's Session Notes: "${sessionNotes}"

    Task: Based on the tone and clinical details in these notes, predict the patient's satisfaction score on a scale of 1 to 10.
    - 1 is extremely dissatisfied/painful/poor result.
    - 10 is extremely happy/comfortable/excellent result.
    - Respond with ONLY the numerical digit.
    `;

    try {
        const result = await hf.chatCompletion({
            model: "Qwen/Qwen2.5-Coder-32B-Instruct",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 10,
        });
        const score = parseInt(result.choices[0].message.content?.trim() || "7");
        return isNaN(score) ? 7 : Math.min(10, Math.max(1, score));
    } catch (error) {
        console.error("Sentiment Analysis Error:", error);
        return 7;
    }
}

/**
 * Recommends the next visit date based on treatment type.
 */
export function calculateNextVisit(treatmentName: string, lastVisit: Date = new Date()) {
    const treatment = treatmentName.toLowerCase();
    let daysToAdd = 30; // Default: 30 days (Facial/General)

    if (treatment.includes('botox')) {
        daysToAdd = 90; // 3 months
    } else if (treatment.includes('filler')) {
        daysToAdd = 180; // 6 months
    } else if (treatment.includes('laser')) {
        daysToAdd = 21; // 3 weeks post-care check
    } else if (treatment.includes('skin booster')) {
        daysToAdd = 28; // 4 weeks
    }

    const nextDate = new Date(lastVisit);
    nextDate.setDate(nextDate.getDate() + daysToAdd);
    return nextDate.toISOString().split('T')[0];
}
