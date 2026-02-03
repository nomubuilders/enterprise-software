# AI Assistant User Guide

Learn how to use the AI Workflow Builder effectively.

---

## How It Works

The AI Assistant understands natural language and automatically generates complete workflows with configured nodes.

---

## Creating New Workflows

When you describe a workflow, the AI will **automatically clear the canvas** and create a fresh workflow.

### Examples:

**Prompt:** "Analyze customer feedback from our database"

**What happens:**
1. ✅ Canvas is cleared (if not empty)
2. ✅ New workflow created with 5 nodes
3. ✅ Nodes are pre-configured with sensible defaults
4. ✅ You're ready to add credentials and run

**Prompt:** "Send daily email with new signups"

**What happens:**
1. ✅ Previous workflow removed
2. ✅ Scheduled workflow created
3. ✅ Email node configured
4. ✅ Ready to add SMTP settings

---

## Modifying Existing Workflows

To **add to** or **fix** an existing workflow without clearing the canvas, use these keywords:

### Keywords that preserve existing workflow:
- "**fix**" - Fix an issue
- "**remove**" - Remove a node
- "**change**" - Modify something
- "**update**" - Update configuration
- "**add**" - Add nodes to existing workflow

### Examples:

**Prompt:** "fix the workflow by removing the unneeded nodes"

**What happens:**
1. ✅ Existing nodes stay on canvas
2. ✅ AI analyzes and suggests removal
3. ✅ You decide what to keep

**Prompt:** "add a PII filter before the LLM"

**What happens:**
1. ✅ Existing workflow preserved
2. ✅ New PII filter node added
3. ✅ Connections updated

---

## Manual Canvas Control

### Clear Canvas Button
Located in the AI Assistant panel, use this to manually clear all nodes.

**When to use:**
- Starting completely fresh
- Too many test workflows on canvas
- Want a clean slate

### Clear Chat Button
Clears the conversation history but keeps nodes on canvas.

**When to use:**
- Start new conversation
- Chat history too long
- Want fresh context

---

## Best Practices

### 1. Start Simple
```
✅ Good: "Analyze customer feedback from database"
❌ Too complex: "Build a multi-stage pipeline with 15 nodes..."
```

Start with a basic workflow, then use "add" or "change" to enhance it.

### 2. Be Specific About Data Sources
```
✅ Good: "Query PostgreSQL for user signups"
❌ Vague: "Get some data"
```

Mention the database type (PostgreSQL, MySQL, MongoDB).

### 3. Mention Compliance Needs
```
✅ Good: "Filter PII from user data before AI analysis"
❌ Missing: "Analyze user data with AI"
```

The AI will add PII filters when you mention privacy concerns.

### 4. Specify Output Format
```
✅ Good: "Send results via email daily"
✅ Good: "Export to spreadsheet"
❌ Vague: "Show me the results"
```

Be clear about how you want the output (chat, email, Telegram, spreadsheet).

---

## Sample Prompts

### Customer Analytics
```
Analyze customer feedback from our PostgreSQL database and
filter PII before sending results to Telegram
```

**Generates:**
- Manual Trigger
- PostgreSQL Query Node
- PII Filter (redact mode)
- LLM Analysis
- Telegram Output

---

### Daily Reports
```
Send me an email every day at 9 AM with new user signups
from the users table
```

**Generates:**
- Schedule Trigger (9 AM daily cron)
- PostgreSQL Query Node
- PII Mask (emails anonymized)
- Email Output Node

---

### Webhook Processing
```
Create a webhook that receives order data, detects fraud
with AI, and saves to database
```

**Generates:**
- Webhook Trigger
- PII Filter (credit cards)
- LLM Fraud Detection
- Database Insert

---

### Data Export
```
Query last month's transactions and export to Excel
```

**Generates:**
- Manual Trigger
- PostgreSQL Query (with date filter)
- Spreadsheet Output (Excel format)

---

## Understanding AI Responses

### Success Response
```
✅ I'll create a workflow that queries your customer feedback
database and analyzes it with AI

🗑️ Previous workflow cleared

I've created a workflow with 5 nodes:
1. Manual Trigger (triggerNode)
2. Customer Feedback DB (databaseNode)
3. Remove PII (piiFilterNode)
4. Analyze Sentiment (llmNode)
5. Results (outputNode)

Next steps:
- Click any node to configure settings
- Connect to your database in the DB node
- Click "Run" to execute the workflow
```

**What this means:**
- Old workflow was removed
- New workflow created with 5 nodes
- Each node is pre-configured
- You need to add credentials before running

---

### Modification Response
```
✅ I'll add a PII filter before the LLM

I've added 1 node:
1. PII Filter (piiFilterNode)

The node has been inserted into your workflow.
```

**What this means:**
- Existing workflow preserved
- New node added
- Connections updated automatically

---

## Workflow Improvement Suggestions

Click **"Suggest Improvements"** button to get AI recommendations.

**Example suggestions:**
- "Add PII filtering before LLM for GDPR compliance"
- "Use parallel execution for database and API calls"
- "Add error handling with retry node"
- "Cache database results for better performance"

---

## Common Scenarios

### Scenario 1: Testing Multiple Ideas

**Approach:**
1. Create first workflow: "Analyze user feedback"
2. Test and review
3. Create second workflow: "Send daily reports"
   - Canvas auto-clears, no manual action needed
4. Keep creating workflows - AI handles canvas management

---

### Scenario 2: Iterating on One Workflow

**Approach:**
1. Create base: "Query database and analyze with AI"
2. Enhance: "add a PII filter before the LLM"
3. Refine: "change the output to Telegram instead of chat"
4. Fix: "remove the email output node"

Use keywords like "add", "change", "remove" to preserve existing workflow.

---

### Scenario 3: Starting Fresh

**Approach:**
1. Click "Clear Canvas" button
2. Or just describe a new workflow - AI auto-clears
3. Start building from scratch

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open AI Assistant | Click button (top-right) |
| Send message | Enter |
| Clear canvas | Click "Clear Canvas" button |
| Clear chat | Click "Clear Chat" button |

---

## Troubleshooting

### "Failed to generate workflow"

**Possible causes:**
1. Ollama not running
2. No models available
3. Prompt too complex

**Solution:**
```bash
# Check Ollama is running
ollama list

# Try simpler prompt
"Create a simple workflow with a database query"
```

---

### Nodes appear in wrong position

**Solution:**
- Zoom out (scroll wheel)
- Click "Fit View" (coming soon)
- Manually drag nodes to reposition

---

### AI doesn't understand my request

**Tips:**
- Use simpler language
- Mention specific node types
- Break complex workflows into steps
- Look at sample prompts above

---

## Advanced Tips

### 1. Chain Multiple Requests
```
User: "Create a database analytics workflow"
AI: [Creates workflow]

User: "add email notifications"
AI: [Adds email node, preserves existing]

User: "change from daily to hourly schedule"
AI: [Updates schedule trigger]
```

### 2. Use Natural Compliance Language
```
"Make sure emails are anonymized" → Adds PII masking
"Remove personal information" → Adds PII redaction
"GDPR compliant processing" → Adds PII filter
```

### 3. Specify Data Volumes
```
"Last 100 customer records" → LIMIT 100 in query
"Past 7 days of data" → Date filter in query
"All users created today" → WHERE created_at >= CURRENT_DATE
```

---

## What's Coming

Future enhancements:

- [ ] "Undo" button to restore previous workflow
- [ ] Workflow templates ("Use customer analytics template")
- [ ] Multi-step wizard for complex workflows
- [ ] Visual diff when modifying workflows
- [ ] Workflow version history

---

## Getting Help

If the AI Assistant isn't working as expected:

1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Review [QUICK_START.md](./QUICK_START.md)
3. Try the sample prompts in this guide
4. Simplify your request and try again

---

*The AI Assistant is powered by Ollama running locally on your machine. All processing is 100% local.*
