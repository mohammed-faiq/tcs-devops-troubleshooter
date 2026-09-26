import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '10mb' }));

// 1. Initialize LangChain LLM with the active 3.x model architecture
const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-3.5-flash',
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0.1,
});

const SYSTEM_INSTRUCTION = `You are an elite IT Deployment Troubleshooting Assistant, operating as a single-agent system designed to reduce system downtime for DevOps teams.

Your objective is to instantly analyze messy deployment logs, error messages, and system states to identify the root cause of deployment failures. 

STRICT RULES OF ENGAGEMENT:
1. Analyze: Parse the provided logs carefully. Ignore standard, successful execution lines and isolate the exact error, stack trace, or failure point.
2. Summarize: Translate complex, cryptic error codes into a clear, human-readable summary of what went wrong.
3. Recommend: Generate highly actionable, step-by-step troubleshooting recommendations to fix the specific issue. Include CLI commands, configuration changes, or code fixes where applicable.
4. Data Privacy: Assume all data is synthetic. Do not output or repeat any sensitive IP addresses, passwords, or personal data if found in the log.
5. Tone: Be professional, direct, and technical. Do not use filler words.

REQUIRED OUTPUT FORMAT:
You must always format your response exactly like this:

## 🚨 Root Cause Summary
[Provide a concise, 2-3 sentence human-readable explanation of why the deployment failed.]

## 🔍 Log Analysis
* **Primary Error Detected:** [Extract the specific error string/code]
* **Failing Component:** [e.g., Database, Nginx, Python Backend]

## 🛠️ Actionable Troubleshooting Steps
1. [Step 1: Immediate action/check]
2. [Step 2: Remediation command or code change]
3. [Step 3: Verification step to ensure it is fixed]`;

// API endpoint for log analysis
app.post('/api/troubleshoot', async (req, res) => {
  try {
    const { logText, environment = 'Production', serviceType = 'Auto-detect' } = req.body;

    if (!logText || typeof logText !== 'string' || !logText.trim()) {
      return res.status(400).json({ error: 'Deployment logs are required.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured in the environment.',
      });
    }

    const prompt = `System Environment: ${environment}
Service Stack: ${serviceType}

Deployment Logs / System State to Troubleshoot:
\`\`\`
${logText.slice(0, 60000)}
\`\`\`

Analyze the logs above now and provide the solution strictly using the required format.`;

    // 2. Format the request using LangChain Message objects
    const messages = [
      new SystemMessage(SYSTEM_INSTRUCTION),
      new HumanMessage(prompt)
    ];

    // 3. Invoke the LangChain model
    const response = await llm.invoke(messages);
    
    // 4. Extract content from the LangChain response object
    const outputText = response.content;

    if (!outputText) {
      return res.status(502).json({ error: 'Empty response returned from model.' });
    }

    return res.json({
      report: outputText,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Troubleshoot error:', error);
    return res.status(500).json({
      error: error?.message || 'An error occurred while analyzing the deployment logs.',
    });
  }
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`IT Deployment Troubleshooting Assistant running on http://0.0.0.0:${port}`);
  });
}

startServer();