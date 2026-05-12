export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { context = {} } = req.body;

    const apiKey = req.headers['x-api-key'] || process.env.MISTRAL_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: 'No Mistral API key found. Enter your key in Settings.'
      });
    }

    // Build context-aware prompt for suggestions
    let userPrompt = 'Give me one concise, actionable focus tip for someone with ADHD. Keep it under 100 words. Make it encouraging and practical.';
    
    if (context.timeOfDay) {
      userPrompt += `\n\nCurrent time of day: ${context.timeOfDay}`;
    }
    if (context.energyLevel) {
      userPrompt += `\n\nUser's energy level: ${context.energyLevel}`;
    }
    if (context.task) {
      userPrompt += `\n\nWorking on: ${context.task}`;
    }

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [
          {
            role: 'system',
            content: 'You are an AI Focus Coach specializing in ADHD productivity. Provide brief, actionable, and encouraging tips. Always be positive and practical. Respond in plain prose only — no markdown, no asterisks, no bullet lists, no headings, no emoji.'
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        max_tokens: 150,
        temperature: 0.8
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({ 
        error: 'Failed to get suggestion',
        details: errorData.message || 'Unknown error'
      });
    }

    const data = await response.json();
    const suggestion = data.choices?.[0]?.message?.content || 'Take a deep breath and start with just 5 minutes. You got this!';

    return res.status(200).json({ 
      suggestion: suggestion,
      model: data.model
    });

  } catch (error) {
    console.error('Suggestion Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
