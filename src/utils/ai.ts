import { createServerFn } from '@tanstack/react-start'
import { Anthropic } from '@anthropic-ai/sdk'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type ScriptrMode = 'ideation' | 'script' | 'chat-adjust'

type ScriptrInput = {
  mode: ScriptrMode
  profile: {
    channelName: string
    niche: string
    audience: string
    tone: string
    frequency: string
    ctaStyle: string
  }
  form: {
    videoTopic: string
    niche: string
    audience: string
    tone: string
    hookStyle: string
    ctaGoal: string
    competitorInspiration: string
    sourceNotes: string
    outputStyle: string
    customInstructions: string
    videoType: string
    videoLength: string
  }
  scriptContext?: {
    title: string
    thumbnailText: string
    hook: string
    body: string
    cta: string
  }
  chatHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  userMessage?: string
}

const DEFAULT_SYSTEM_PROMPT = `You are TanStack Chat, an AI assistant using Markdown for clear and structured responses. Format your responses following these guidelines:

1. Use headers for sections:
   # For main topics
   ## For subtopics
   ### For subsections

2. For lists and steps:
   - Use bullet points for unordered lists
   - Number steps when sequence matters
   
3. For code:
   - Use inline \`code\` for short snippets
   - Use triple backticks with language for blocks:
   \`\`\`python
   def example():
       return "like this"
   \`\`\`

4. For emphasis:
   - Use **bold** for important points
   - Use *italics* for emphasis
   - Use > for important quotes or callouts

5. For structured data:
   | Use | Tables |
   |-----|---------|
   | When | Needed |

6. Break up long responses with:
   - Clear section headers
   - Appropriate spacing between sections
   - Bullet points for better readability
   - Short, focused paragraphs

7. For technical content:
   - Always specify language for code blocks
   - Use inline \`code\` for technical terms
   - Include example usage where helpful

Keep responses concise and well-structured. Use appropriate Markdown formatting to enhance readability and understanding.`

const createAnthropicClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY
  return new Anthropic({
    ...(apiKey ? { apiKey } : {}),
    timeout: 45000,
  })
}

const extractTextFromContent = (content: Anthropic.Message['content']) =>
  content
    .map((item) => {
      if ('text' in item && typeof item.text === 'string') {
        return item.text
      }
      return ''
    })
    .join('\n')

const extractJSON = (raw: string) => {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i)
  const candidate = fenced?.[1]?.trim() || raw.trim()
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in AI response.')
  }
  return JSON.parse(candidate.slice(start, end + 1))
}

const getModePrompt = (mode: ScriptrMode) => {
  if (mode === 'ideation') {
    return `You are Scriptr, a YouTube strategy copilot.
Return strict JSON with this shape:
{
  "overview": {
    "topicIdea": "string",
    "angleIdea": "string",
    "thumbnailText": "string",
    "clickPotential": "string score like 8.7/10"
  },
  "titles": [{ "text": "string", "style": "string" }],
  "hooks": [{ "label": "string", "text": "string" }]
}
Generate 4 titles and 3 hooks. No markdown.`
  }

  if (mode === 'script') {
    return `You are Scriptr, a YouTube scripting copilot.
Return strict JSON with this shape:
{
  "outline": ["string"],
  "fullScript": {
    "title": "string",
    "thumbnailText": "string",
    "hook": "string",
    "body": "string",
    "cta": "string"
  },
  "ctas": ["string"],
  "repurpose": ["string"]
}
Generate 6-8 outline steps, 3 CTAs, and 4 repurpose actions. No markdown.`
  }

  return `You are Scriptr, a collaborative script editor.
Return strict JSON with this shape:
{
  "assistantReply": "string",
  "updatedScript": {
    "title": "string",
    "thumbnailText": "string",
    "hook": "string",
    "body": "string",
    "cta": "string"
  }
}
Apply the user's change requests directly to the script. Keep the assistant reply concise. No markdown.`
}

export const generateScriptrContent = createServerFn({ method: 'POST' })
  .inputValidator((d: ScriptrInput) => d)
  .handler(async ({ data }) => {
    const anthropic = createAnthropicClient()
    const system = getModePrompt(data.mode)

    const messages: Array<{ role: 'user'; content: string }> = [
      {
        role: 'user',
        content: JSON.stringify({
          profile: data.profile,
          form: data.form,
          scriptContext: data.scriptContext,
          chatHistory: data.chatHistory,
          userMessage: data.userMessage,
        }),
      },
    ]

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2400,
      system,
      messages,
    })

    const rawText = extractTextFromContent(response.content)
    return extractJSON(rawText)
  })

// Non-streaming implementation
export const genAIResponse = createServerFn({ method: 'GET', response: 'raw' })
  .inputValidator(
    (d: {
      messages: Array<Message>
      systemPrompt?: { value: string; enabled: boolean }
    }) => d,
  )
  // .middleware([loggingMiddleware])
  .handler(async ({ data }) => {
    const anthropic = createAnthropicClient()

    // Filter out error messages and empty messages
    const formattedMessages = data.messages
      .filter(
        (msg) =>
          msg.content.trim() !== '' &&
          !msg.content.startsWith('Sorry, I encountered an error'),
      )
      .map((msg) => ({
        role: msg.role,
        content: msg.content.trim(),
      }))

    if (formattedMessages.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid messages to send' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const systemPrompt = data.systemPrompt?.enabled
      ? `${DEFAULT_SYSTEM_PROMPT}\n\n${data.systemPrompt.value}`
      : DEFAULT_SYSTEM_PROMPT

    // Debug log to verify prompt layering
    console.log('System Prompt Configuration:', {
      hasCustomPrompt: data.systemPrompt?.enabled,
      customPromptValue: data.systemPrompt?.value,
      finalPrompt: systemPrompt,
    })

    try {
      const stream = await anthropic.messages.stream({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        system: systemPrompt,
        messages: formattedMessages,
      })

      // Transform the Anthropic stream to match the expected client format
      // The client reads chunks and expects each chunk to contain one complete JSON object
      const encoder = new TextEncoder()
      const transformedStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const event of stream) {
              // Only send content_block_delta events with text
              if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                const chunk = {
                  type: 'content_block_delta',
                  delta: {
                    type: 'text_delta',
                    text: event.delta.text,
                  },
                }
                // Encode each JSON object as a separate chunk
                // This ensures the decoder can parse each chunk independently
                controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'))
              }
            }
            controller.close()
          } catch (error) {
            console.error('Stream error:', error)
            controller.error(error)
          }
        },
      })

      return new Response(transformedStream, {
        headers: {
          'Content-Type': 'application/x-ndjson',
        },
      })
    } catch (error) {
      console.error('Error in genAIResponse:', error)
      
      // Error handling with specific messages
      let errorMessage = 'Failed to get AI response'
      let statusCode = 500
      
      if (error instanceof Error) {
        if (error.message.includes('rate limit')) {
          errorMessage = 'Rate limit exceeded. Please try again in a moment.'
        } else if (error.message.includes('Connection error') || error.name === 'APIConnectionError') {
          errorMessage = 'Connection to Anthropic API failed. Please check your internet connection and API key.'
          statusCode = 503 // Service Unavailable
        } else if (error.message.includes('authentication')) {
          errorMessage = 'Authentication failed. Please check your Anthropic API key.'
          statusCode = 401 // Unauthorized
        } else {
          errorMessage = error.message
        }
      }
      
      return new Response(JSON.stringify({ 
        error: errorMessage,
        details: error instanceof Error ? error.name : undefined
      }), {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }) 
