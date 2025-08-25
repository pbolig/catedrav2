// services/ai-services.js

const { OpenAI } = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIServices {
    
    interpretarErrorDeAPI(error) {
        const errorData = error.response?.data;
        const errorStatus = error.response?.status;
        let errorMessage = (errorData?.error?.message || error.message || '').toLowerCase();

        if (errorStatus === 429 || errorMessage.includes('quota')) {
            return "Límite de cuota excedido. Revisa tu plan y facturación.";
        }
        if (errorMessage.includes('credit balance is too low')) {
            return "Tu balance de créditos en Anthropic es muy bajo.";
        }
        if (errorStatus === 402) {
            return "Error de pago requerido. Revisa tu método de pago.";
        }
        if (errorStatus === 401 || errorMessage.includes('invalid api key')) {
            return "La API Key es inválida o ha sido revocada.";
        }
        if (errorStatus === 404 || errorMessage.includes('model is not found')) {
            return "El modelo de IA no fue encontrado. Puede estar desactualizado.";
        }

        return `Error inesperado: ${error.message}`;
    }

    async callAI(modelo, apiKey, prompt) {
        try {
            switch (modelo) {
                case 'Gemini': {
                    const genAI = new GoogleGenerativeAI(apiKey);
                    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
                    const result = await model.generateContent(prompt);
                    return result.response.text();
                }
                case 'Claude': {
                    const anthropic = new Anthropic({ apiKey });
                    const msg = await anthropic.messages.create({
                        model: "claude-3-haiku-20240307",
                        max_tokens: 2048,
                        messages: [{ role: "user", content: prompt }],
                    });
                    return msg.content[0].text;
                }
                case 'OpenAI': {
                    const openai = new OpenAI({ apiKey });
                    const completion = await openai.chat.completions.create({
                        messages: [{ role: "user", content: prompt }],
                        model: "gpt-3.5-turbo",
                    });
                    return completion.choices[0].message.content;
                }
                case 'DeepSeek': {
                    const deepseek = new OpenAI({
                        apiKey: apiKey,
                        baseURL: 'https://api.deepseek.com/v1',
                    });
                    const completion = await deepseek.chat.completions.create({
                        messages: [{ role: "user", content: prompt }],
                        model: "deepseek-chat",
                    });
                    return completion.choices[0].message.content;
                }
                default:
                    return `Error: El modelo '${modelo}' no es soportado.`;
            }
        } catch (error) {
            const mensajeClaro = this.interpretarErrorDeAPI(error);
            console.error(`Error en ${modelo}:`, error.response?.data || error.message);
            return `Error en ${modelo}: ${mensajeClaro}`;
        }
    }

    async verifyApiKey(servicio, apiKey) {
        try {
            switch (servicio) {
                case 'Gemini': {
                    const genAI = new GoogleGenerativeAI(apiKey);                    
                    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
                    await model.countTokens("test");
                    return true;
                }
                case 'Claude': {
                    const anthropic = new Anthropic({ apiKey });
                    await anthropic.messages.create({
                        model: "claude-3-haiku-20240307",
                        max_tokens: 10,
                        messages: [{ role: 'user', content: 'hello' }],
                    });
                    return true;
                }
                case 'OpenAI': {
                    const openai = new OpenAI({ apiKey });
                    await openai.models.list();
                    return true;
                }
                case 'DeepSeek': {
                    const deepseek = new OpenAI({ apiKey, baseURL: 'https://api.deepseek.com/v1' });
                    await deepseek.models.list();
                    return true;
                }
                default:
                    return false;
            }
        } catch (error) {
            console.error(`Fallo al verificar API key para ${servicio}:`, error.message);
            return false;
        }
    }
}

module.exports = new AIServices();