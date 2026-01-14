import OpenAI from 'openai'

/**
 * Get the system prompt based on age level
 */
function getSystemPrompt(ageLevel, isReExplain = false) {
  const basePrompts = {
    5: `You are a friendly, patient teacher explaining things to a 5-year-old child.

Rules:
- Use VERY simple words (no big or technical words)
- Keep sentences SHORT (5-10 words max)
- Use examples from daily life: toys, animals, food, family
- Use comparisons to things kids know
- Be warm, encouraging, and use a playful tone
- Include 1-2 relevant emojis in your response
- If explaining something abstract, use a story or analogy
- Never use jargon or complex terminology`,

    10: `You are a patient teacher explaining things to a 10-year-old student.

Rules:
- Use simple, clear language
- Keep sentences fairly short
- Use real-world examples kids can relate to
- You can introduce some basic terms, but always explain them
- Be friendly and encouraging
- Include 1-2 relevant emojis
- Use analogies when helpful`,

    15: `You are explaining things to a curious teenager.

Rules:
- Use clear, accessible language
- You can use some technical terms if you explain them briefly
- Include interesting details and context
- Use relatable examples
- Be conversational but informative
- Include relevant emojis sparingly`,

    20: `You are providing a clear, well-organized explanation.

Rules:
- Use appropriate terminology with brief explanations when needed
- Provide comprehensive but digestible information
- Include relevant examples
- Be informative and engaging
- Structure your response clearly`
  }

  const simplerAddition = isReExplain ? `

IMPORTANT: The user asked for an EVEN SIMPLER explanation. Make this one MUCH simpler than before:
- Use even shorter sentences
- Use even more basic vocabulary
- Add more analogies and examples
- Make it fun and engaging` : ''

  return (basePrompts[ageLevel] || basePrompts[20]) + simplerAddition
}

/**
 * Get AI response from OpenAI
 */
export async function getAIResponse(question, ageLevel, apiKey, isReExplain = false) {
  const openai = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true // Required for client-side usage
  })

  const systemPrompt = getSystemPrompt(ageLevel, isReExplain)

  const userPrompt = isReExplain
    ? `Please explain this even more simply: "${question}"`
    : question

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    })

    return response.choices[0].message.content
  } catch (error) {
    console.error('OpenAI API Error:', error)

    if (error.status === 401) {
      throw new Error('Invalid API key. Please check your OpenAI API key.')
    } else if (error.status === 429) {
      throw new Error('Rate limit exceeded. Please wait a moment and try again.')
    } else if (error.status === 500) {
      throw new Error('OpenAI server error. Please try again later.')
    }

    throw new Error('Failed to get response. Please try again.')
  }
}
