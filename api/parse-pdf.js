export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Yalnızca POST kabul edilir.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY Vercel üzerinde tanımlanmamış.' });

  try {
    const { pdfText } = req.body;
    if (!pdfText) return res.status(400).json({ error: 'PDF metni bulunamadı.' });

    const prompt = `
Aşağıdaki metindeki çoktan seçmeli soruları analiz et ve SADECE saf bir JSON dizisi döndür:

[
  {
    "question": "Soru metni",
    "options": ["A şıkkı", "B şıkkı", "C şıkkı", "D şıkkı"],
    "correct": "A"
  }
]

Metin:
${pdfText.substring(0, 8000)}
    `;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    
    if (data.error) {
      console.error("Gemini API Hatası:", data.error);
      return res.status(500).json({ error: data.error.message });
    }

    let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

    const questions = JSON.parse(rawText);
    return res.status(200).json({ questions });

  } catch (error) {
    console.error("API İşlem Hatası:", error);
    return res.status(500).json({ error: 'İşlem sırasında sunucu hatası oluştu.' });
  }
}
