import { openai } from '@ai-sdk/openai';
import { convertToModelMessages, generateText, UIMessage } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  const contentType = req.headers.get('content-type') || '';
  
  let messages;
  
  if (contentType.includes('multipart/form-data')) {
    // Handle PDF upload
    const formData = await req.formData();
    const text = formData.get('text') as string || 'Analyze this earnings report PDF';
    const pdfFile = formData.get('pdf') as File;
    
    if (pdfFile) {
      const pdfBuffer = await pdfFile.arrayBuffer();
      messages = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: text,
            },
            {
              type: 'file',
              data: new Uint8Array(pdfBuffer),
              mediaType: 'application/pdf',
              filename: pdfFile.name,
            },
          ],
        },
      ];
    } else {
      messages = [{ role: 'user', content: text }];
    }
  } else {
    // Handle regular JSON request
    const body = await req.json();
    messages = body.messages;
  }
    try {
        console.log('Received messages:', messages);
        console.log('OpenAI API Key exists:', !!process.env.OPENAI_API_KEY);
        
        const result = await generateText({
        model: openai.responses('o3'),
        system: "You are an expert financial analyst. Analyze earnings reports and provide detailed insights on company performance, revenue, profitability, market implications, and key financial metrics. Focus on actionable investment insights. You MUST use web search",
        // messages: convertToModelMessages(messages),
        messages: messages,
        providerOptions: {
            openai: { reasoningEffort: 'low' },
        },
        tools: {
            web_search_preview: openai.tools.webSearchPreview({
            searchContextSize: 'high',
            }),
        },
        });

        return Response.json({ 
            text: result.text,
            reasoning: result.reasoning || null,
            usage: result.usage,
            tool: result.toolCalls
        });
    } catch (error) {
        console.error('Earnings agent error:', error);
        return new Response(JSON.stringify({ 
            error: 'Error processing request', 
            details: error instanceof Error ? error.message : 'Unknown error' 
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

}