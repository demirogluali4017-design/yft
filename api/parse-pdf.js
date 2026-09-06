import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Yalnızca POST istekleri kabul edilir.' });

  try {
    const { textChunk, imageBase64, action, questionData } = req.body;

    // 1. Durum: Analiz Ekranında İsteğe Bağlı Tekil Çözüm Açıklaması Üretme
    if (action === 'explain') {
      const explainPrompt = `Aşağıdaki soru için Türkçe kısa, net ve anlaşılır bir çözüm açıklaması yaz:\n\nSoru: ${questionData.question}\nŞıklar: ${questionData.options.join(', ')}\nDoğru Cevap: ${questionData.correctAnswer}`;
      
      const expResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: explainPrompt
      });

      return res.status(200).json({ explanation: expResponse.text });
    }

    // 2. Durum: Soru Ve Şıkları Ayrıştırma (Metin veya Görsel)
    let contents = [];
    
    if (imageBase64) {
      contents = [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageBase64.split(',')[1] || imageBase64
          }
        },
        'Bu görseldeki sınav sorularını, şıklarını ve doğru cevap anahtarını tespit et.'
      ];
    } else if (textChunk) {
      contents = [`Aşağıdaki metindeki soruları, A-E şıklarını ve doğru cevap anahtarını tespit et:\n${textChunk}`];
    } else {
      return res.status(400).json({ error: 'İşlenecek veri bulunamadı.' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.STRING }
            },
            required: ['id', 'question', 'options', 'correctAnswer']
          }
        }
      }
    });

    const parsedQuestions = JSON.parse(response.text);
    return res.status(200).json(parsedQuestions);

  } catch (error) {
    console.error("Gemini API İşlem Hatası:", error);
    return res.status(500).json({ error: 'İşlem sırasında bir sunucu hatası oluştu.' });
  }
}
