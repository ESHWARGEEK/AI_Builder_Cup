# Session Context & Resumption Hub

This directory contains the full conversation history, transcripts, and resumption instructions for the Enterprise Knowledge & Task Assistant (EKA) project.

## Files in this Directory

| File | Purpose |
|---|---|
| [`RESUME_PROMPT.md`](./RESUME_PROMPT.md) | Ready-to-use prompt to feed into an AI agent on another computer to immediately resume work |
| [`CHAT_TRANSCRIPT.md`](./CHAT_TRANSCRIPT.md) | Formatted, human/LLM readable transcript of all user prompts, assistant answers, and tool executions |
| [`transcript.jsonl`](./transcript.jsonl) | Raw machine-readable Antigravity IDE JSONL transcript |

## How to Resume on Another Machine

### Option 1: Using the Resume Prompt (Recommended for Any AI)
1. Clone this repository on your new computer:
   ```bash
   git clone https://github.com/ESHWARGEEK/AI_Builder_Cup.git
   cd AI_Builder_Cup
   ```
2. Open your AI coding assistant (Antigravity IDE, Cursor, Claude, ChatGPT, etc.).
3. Copy the prompt from [`RESUME_PROMPT.md`](./RESUME_PROMPT.md) and send it as the first message. The assistant will read `context/CHAT_TRANSCRIPT.md` and immediately understand the architecture and next steps.

### Option 2: Native Antigravity IDE Session Restore
If you are using Antigravity IDE on the other machine:
1. Locate your Antigravity user directory:
   - Linux/macOS: `~/.gemini/antigravity-ide/brain/`
2. Create the conversation folder:
   ```bash
   mkdir -p ~/.gemini/antigravity-ide/brain/142e39c9-4883-4a03-abbd-581908f17441/.system_generated/logs/
   ```
3. Copy `context/transcript.jsonl` into that folder:
   ```bash
   cp context/transcript.jsonl ~/.gemini/antigravity-ide/brain/142e39c9-4883-4a03-abbd-581908f17441/.system_generated/logs/
   ```
4. Antigravity IDE will recognize the conversation history and allow you to continue seamlessly.
