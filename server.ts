import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Gemini extraction endpoint for domain-related emails or pasted text
  app.post('/api/gemini/extract-domains', async (req, res) => {
    try {
      const { rawText, emails } = req.body;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(200).json({
          success: false,
          fallbackNeeded: true,
          message: 'GEMINI_API_KEY is not configured on the server. Falling back to local pattern detection.',
          candidates: []
        });
      }

      let contentToAnalyze = '';
      if (rawText && typeof rawText === 'string') {
        contentToAnalyze = rawText;
      } else if (Array.isArray(emails) && emails.length > 0) {
        contentToAnalyze = emails
          .map((e, i) => `Email #${i + 1}:\nSubject: ${e.subject || ''}\nDate: ${e.date || ''}\nSnippet: ${e.snippet || ''}\nBody: ${e.body || ''}`)
          .join('\n---\n');
      } else {
        return res.status(400).json({ error: 'No text or emails provided for extraction.' });
      }

      const prompt = `You are a domain name registration receipt and invoice parser.
Analyze the following email or receipt texts and extract potential domain candidate records.
Only extract actual internet domain names (e.g., example.com, mysite.org, project.io, etc.).
Do not include email addresses (like user@example.com) as domain names unless the domain itself was registered/renewed.

For each domain found, extract:
- "name": string, lowercased, valid domain name without protocol (e.g. "example.com")
- "registrar": string or null (e.g. "Cloudflare", "Namecheap", "Porkbun", "Name.com", "GoDaddy", "Squarespace", "Google Domains", etc.)
- "registrationDate": "YYYY-MM-DD" or null
- "renewalDate": "YYYY-MM-DD" or null (if an expiration date or renewal date is mentioned)
- "cost": number or null (numeric amount only, no currency symbols)
- "currency": "USD" | "GBP" | "EUR" | "INR" | "CNY" | "JPY" | "CAD" (default "USD" if unclear)
- "transactionType": "Registration" | "Renewal" | "Transfer" | "Invoice" | "Expiration Notice" | "Unknown"
- "confidence": "high" | "medium" | "low"
- "sourceSnippet": brief excerpt (max 120 chars) showing where this domain and cost/date was mentioned

Return a JSON array of objects with the structure:
[
  {
    "name": "example.com",
    "registrar": "Namecheap",
    "registrationDate": "2024-05-12",
    "renewalDate": "2025-05-12",
    "cost": 14.98,
    "currency": "USD",
    "transactionType": "Renewal",
    "confidence": "high",
    "sourceSnippet": "Your domain example.com renewed for $14.98 on May 12, 2025"
  }
]

Input text to analyze:
${contentToAnalyze.slice(0, 50000)}
`;

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      });

      const responseText = response.text || '[]';
      let candidates = [];
      try {
        candidates = JSON.parse(responseText);
        if (!Array.isArray(candidates)) {
          if (typeof candidates === 'object' && candidates !== null) {
            candidates = (candidates as any).candidates || (candidates as any).domains || [];
          } else {
            candidates = [];
          }
        }
      } catch (parseErr) {
        console.warn('Failed to parse Gemini response as JSON:', parseErr);
        candidates = [];
      }

      return res.json({
        success: true,
        candidates
      });
    } catch (err: any) {
      console.error('Gemini extraction error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Gemini extraction failed'
      });
    }
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Domain Expansion server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
