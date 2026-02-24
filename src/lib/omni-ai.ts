import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

export async function predictStockOut(inventoryData: any[]) {
    const prompt = `Based on the following inventory and sales trend, predict the stock-out dates: ${JSON.stringify(inventoryData)}`;
    const result = await hf.chatCompletion({
        model: "Qwen/Qwen2.5-Coder-32B-Instruct",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
    });
    return result.choices[0].message.content;
}

export async function getPersonalizedUpselling(patientHistory: any, availableTreatments: any[]) {
    const prompt = `Patient Medical History: ${JSON.stringify(patientHistory)}. 
    Available Treatments: ${JSON.stringify(availableTreatments)}. 
    Suggest the most suitable treatment and product for upselling based on their history.`;

    const result = await hf.chatCompletion({
        model: "Qwen/Qwen2.5-Coder-32B-Instruct",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
    });
    return result.choices[0].message.content;
}
export async function getBusinessInsights(transactionSummary: any) {
    const prompt = `Monthly Transaction Summary: ${JSON.stringify(transactionSummary)}. 
    Analyze the data and provide 3 short, actionable business strategy recommendations (e.g., 'Promo package for Service X'). 
    Focus on most popular treatments and top performing staff.`;

    const result = await hf.chatCompletion({
        model: "Qwen/Qwen2.5-Coder-32B-Instruct",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
    });
    return result.choices[0].message.content;
}
