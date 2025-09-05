import { openai } from '@ai-sdk/openai';
import { convertToModelMessages, generateText, UIMessage } from 'ai';
import { createClient } from "@supabase/supabase-js"

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Define interface for earnings table
interface EarningsRecord {
  id?: number;
  created_at?: string;
  user_prompt: string;
  pdf_file?: string | null;
  response_text: string;
  tokens: any;
  tool_calls: any;
}

export const maxDuration = 30;

export async function POST(req: Request) {
  const contentType = req.headers.get('content-type') || '';
  
  let messages;
  let userPrompt = '';
  let pdfFileName: string | null = null;
  
  if (contentType.includes('multipart/form-data')) {
    // Handle PDF upload
    const formData = await req.formData();
    const text = formData.get('text') as string || 'Analyze this earnings report PDF';
    const pdfFile = formData.get('pdf') as File;
    
    userPrompt = text;
    pdfFileName = pdfFile ? pdfFile.name : null;
    
    
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
    
    userPrompt = messages[0]?.content || '';
    
    console.log('=== EARNINGS REQUEST (TEXT) ===');
    console.log('messages:', JSON.stringify(messages, null, 2));
    console.log('==============================');
  }
    try {
        const result = await generateText({
        model: openai.responses('o3'),
        system: `
            Developer: # Role and Objective
            - Act as a professional financial analyst specializing in interpreting earnings reports and delivering actionable investment recommendations.

            # Instructions
            - Analyze user-provided earnings reports to evaluate company performance, covering revenue, profitability, market implications, and key financial metrics.
            - Begin with a concise checklist (3-7 bullets) outlining the sub-tasks you will perform before starting your analysis.
            - Prioritize actionable insights: clearly state whether the stock should be considered a buy, hold, or sell.
            - Include relevant options trading strategies based on your analysis.
            - If a file is provided by the user, prioritize its contents for your analysis; supplement with web search as needed for additional data or context.
            - If no file is provided, conduct a web search to gather and analyze the latest available earnings information.
            - After gathering and analyzing information, validate your findings in 1-2 sentences before delivering your final recommendation; self-correct if inconsistencies or gaps are found.
            - Ensure your recommendations are clear and directly tied to financial analysis; avoid speculation unsupported by data.

            # Context
            - Input can be an uploaded earnings report file or a text prompt referencing a specific company's earnings results.
            - Results should focus only on the company/report in question.

            # Reasoning Steps
            - Internally, review all available data step by step to derive each metric and qualitative insight before generating the final recommendation.

            # Output Format
            - Deliver a concise summary with bullet points for each core topic: company performance, revenue, profitability, market outlook, and key metrics.
            - Provide a clear Buy/Hold/Sell recommendation, followed by at least one appropriate options strategy.

            # Verbosity
            - Use clear, concise language for summaries.
            - Present detailed quantitative analysis and findings where appropriate to support recommendations.

            # Stop Conditions
            - The task is complete once actionable investment guidance and options trading strategies are delivered alongside supporting evidence and reasoning.`,
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


        // Save to Supabase following TypeScript best practices
        try {
            const earningsRecord: EarningsRecord = {
                user_prompt: userPrompt,
                pdf_file: pdfFileName,
                response_text: result.text,
                tokens: result.usage,
                tool_calls: result.toolCalls || []
            };

            const { data, error } = await supabase
                .from('chat_completions')
                .insert<EarningsRecord>(earningsRecord)
                .select();

            if (error) {
                console.error('Supabase insertion error:', error);
            } else {
                console.log('Successfully saved to database:', data);
            }
        } catch (dbError) {
            console.error('Database operation failed:', dbError);
            // Don't fail the API response if database save fails
        }

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