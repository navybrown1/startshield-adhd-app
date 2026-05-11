export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, context = {} } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const apiKey = process.env.MISTRAL_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'Mistral API key not configured. Please add it in Vercel environment variables.' 
      });
    }

    // Build system prompt based on context
    let systemPrompt = 'You are an AI Focus Coach for StartShield, an ADHD productivity app. Your role is to help users stay focused, motivated, and productive. Be encouraging, concise, and practical. Provide actionable tips for managing ADHD-related focus challenges.';
    
    if (context.task) {
      systemPrompt += `\n\nUser's current task: ${context.task}`;
    }
    if (context.sessionCount) {
      systemPrompt += `\n\nUser has completed ${context.sessionCount} focus sessions today.`;
    }
    if (context.streak) {
      systemPrompt += `\n\nUser has a ${context.streak}-day streak.`;
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
            content: systemPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Mistral API error:', errorData);
      return res.status(response.status).json({ 
        error: 'Failed to get AI response',
        details: errorData.message || 'Unknown error'
      });
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';

    return res.status(200).json({ 
      response: aiResponse,
      model: data.model
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
