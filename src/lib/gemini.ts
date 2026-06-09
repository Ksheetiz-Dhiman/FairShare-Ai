// AI Provider: Groq (free, 14,400 req/day) for text tasks
// Receipt vision: Gemini Flash (free tier) as fallback only for image scanning
// All function signatures unchanged — server.ts needs no changes.

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GEMINI_VISION_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

function getGroqKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY environment variable is required. Get a free key at console.groq.com");
  return key;
}

function getGeminiKey(): string | null {
  return process.env.GEMINI_API_KEY || null;
}

// Strips markdown code fences and parses JSON safely
function parseJSON(raw: string): any {
  const clean = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  // Find the first { or [ and parse from there
  const start = clean.search(/[{[]/);
  if (start === -1) throw new Error("No JSON object found in response");
  return JSON.parse(clean.slice(start));
}

async function callGroq(
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
): Promise<string> {
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${getGroqKey()}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: 1024,
      temperature: 0.1,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

interface MemberContext {
  id: string;
  name: string;
  email: string;
}

// ─── 1. Parse Expense ────────────────────────────────────────────────────────

export async function parseExpenseWithAI(
  text: string,
  members: MemberContext[],
  groupCurrency: string
): Promise<any> {
  const membersListStr = members.map(m => `{ "id": "${m.id}", "name": "${m.name}" }`).join(', ');

  const systemPrompt = `You are an expense parser. Output ONLY a raw JSON object — no markdown, no backticks, no explanation.`;

  const userMessage = `Parse this expense description and extract structured data.

Input: "${text}"

Available members: [${membersListStr}]
Default currency: "${groupCurrency}"
First member ID (default payer if unclear): "${members[0]?.id || ''}"
All member IDs (default participants if not specified): [${members.map(m => `"${m.id}"`).join(', ')}]

Return ONLY this JSON (no markdown, no extra text):
{
  "title": "short expense title",
  "amount": 0.00,
  "currency": "3-letter code",
  "paid_by_id": "member id string",
  "split_type": "equal",
  "participants": ["array", "of", "member", "ids"]
}`;

  try {
    const raw = await callGroq(systemPrompt, [{ role: 'user', content: userMessage }]);
    return parseJSON(raw);
  } catch (error) {
    console.error("Error in parseExpenseWithAI:", error);
    return {
      title: text.substring(0, 50),
      amount: 0,
      currency: groupCurrency,
      paid_by_id: members[0]?.id || "",
      split_type: "equal",
      participants: members.map(m => m.id)
    };
  }
}

// ─── 2. Scan Receipt ─────────────────────────────────────────────────────────

export async function scanReceiptWithAI(
  base64Image: string,
  mimeType: string,
  groupCurrency: string
): Promise<any> {
  const geminiKey = getGeminiKey();

  // If Gemini key available, use it for vision (receipt scanning needs image support)
  if (geminiKey) {
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const prompt = `You are a receipt scanner. Extract data from this receipt image and return ONLY raw JSON, no markdown, no backticks.
Return this exact structure:
{
  "merchant": "store name",
  "date": "YYYY-MM-DD",
  "total": 0.00,
  "currency": "${groupCurrency}",
  "line_items": [{ "name": "item", "amount": 0.00 }]
}`;

    try {
      const response = await fetch(`${GEMINI_VISION_URL}?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              { inline_data: { mime_type: mimeType || "image/jpeg", data: base64Data } },
              { text: prompt }
            ]
          }]
        })
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Gemini vision error: ${err}`);
      }

      const data = await response.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
      return parseJSON(raw);
    } catch (error) {
      console.error("Receipt scan error:", error);
      throw error;
    }
  }

  // No vision API available — return empty so user can fill manually
  console.warn("No GEMINI_API_KEY for vision. Receipt scan unavailable.");
  return {
    merchant: "",
    date: new Date().toISOString().split('T')[0],
    total: 0,
    currency: groupCurrency,
    line_items: []
  };
}

// ─── 3. Group Insights Chat ──────────────────────────────────────────────────

export async function generateGroupInsights(
  conversationMessages: Array<{ role: 'user' | 'assistant'; content: string }>,
  groupDetails: any,
  expenses: any[],
  members: any[],
  settlements: any[]
): Promise<string> {
  const membersSummary = members.map(m => m.name).join(', ');

  const expensesSummary = expenses.slice(-12).map(e =>
    `• ${e.title} — ${e.amount}${e.currency} paid by ${e.paid_by_name} (${e.category})`
  ).join('\n') || 'No expenses yet.';

  const settlementsSummary = settlements.slice(-5).map(s =>
    `• ${s.from_name} → ${s.to_name}: ${s.amount}${s.currency}`
  ).join('\n') || 'No settlements yet.';

  const systemPrompt = `You are FairShare AI — a smart financial co-pilot built into a group expense tracker app.
Answer questions about the group's spending in a helpful, friendly tone using Markdown formatting.

GROUP CONTEXT:
Name: ${groupDetails.name}
Currency: ${groupDetails.currency}
Members: ${membersSummary}

RECENT EXPENSES:
${expensesSummary}

SETTLEMENTS:
${settlementsSummary}

Rules:
- Always use member names, never IDs
- Keep responses concise with bullet points
- Format currency amounts with the group currency symbol
- If asked who paid most, calculate from expenses above
- Be direct and actionable`;

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> =
    conversationMessages.length > 0
      ? conversationMessages
      : [{ role: 'user', content: 'Give me a quick summary of this group.' }];

  try {
    return await callGroq(systemPrompt, messages);
  } catch (error: any) {
    console.error("Error generating insights:", error);
    const msg = error.message || '';
    if (msg.includes('429') || msg.includes('rate_limit')) {
      return '⚠️ **Rate limit reached.** Please wait a moment and try again.';
    }
    return `❌ Error: ${msg || 'Check your GROQ_API_KEY in .env'}`;
  }
}