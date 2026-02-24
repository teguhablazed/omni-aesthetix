import { HfInference } from "@huggingface/inference";

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

/**
 * analyzeClinicalProgress
 * Compares two images (Before & After) and generates a clinical report in Indonesian.
 * @param beforeImage - Base64 or URL of the 'Before' image
 * @param afterImage - Base64 or URL of the 'After' image
 */
export async function analyzeClinicalProgress(beforeImage: string, afterImage: string) {
    try {
        const prompt = `Bandingkan kedua foto klinis ini secara detail. Berikan poin-poin kemajuan pada tekstur, pigmentasi, dan kecerahan. Gunakan bahasa Indonesia yang sangat profesional dan elegan.`;

        // Ensure images are formatted correctly for HF (Base64 if not URL)
        const formatImg = (img: string) => img.startsWith('http') ? img : `data:image/jpeg;base64,${img}`;

        const response = await hf.chatCompletion({
            model: "Qwen/Qwen2-VL-7B-Instruct",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { url: formatImg(beforeImage) } },
                        { type: "image_url", image_url: { url: formatImg(afterImage) } }
                    ]
                }
            ],
            max_tokens: 800,
        });

        return response.choices[0].message.content;
    } catch (error: any) {
        console.error("AI Vision Error:", error);
        throw new Error("Gagal menganalisis gambar: " + error.message);
    }
}
