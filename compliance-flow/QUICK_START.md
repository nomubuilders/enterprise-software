# ComplianceFlow Quick Start Guide

Get up and running with ComplianceFlow in 5 minutes!

---

## Prerequisites

- **Node.js** 18+ (for frontend)
- **Python** 3.10+ (for backend)
- **Ollama** (for AI features)
- **PostgreSQL** (optional, for database features)

---

## Installation

### 1. Install Ollama & Pull a Model

```bash
# Install Ollama (https://ollama.ai)
curl -fsSL https://ollama.com/install.sh | sh

# Pull Llama 3.2 model
ollama pull llama3.2
```

### 2. Start Ollama Server

```bash
ollama serve
```

Keep this terminal open.

### 3. Install Frontend Dependencies

```bash
# In project root
npm install
```

### 4. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

---

## Running ComplianceFlow

### Option 1: Quick Start (3 terminals)

**Terminal 1 - Ollama:**
```bash
ollama serve
```

**Terminal 2 - Backend:**
```bash
cd backend
python -m uvicorn app.main:app --reload
```

**Terminal 3 - Frontend:**
```bash
npm run dev
```

### Option 2: Using npm scripts (coming soon)

```bash
npm run dev:all  # Starts all services
```

---

## Access the App

Open your browser to:
- **Frontend:** http://localhost:5173
- **Backend API Docs:** http://localhost:8000/docs
- **Backend Health:** http://localhost:8000/api/v1/health

---

## Try the AI Assistant

1. **Open the AI Assistant**
   - Click the **"AI Assistant"** button (top-right, purple sparkle ✨ icon)

2. **Try a sample prompt:**
   ```
   Analyze customer feedback from our database
   ```

3. **Watch the magic!**
   - The AI will generate a complete workflow
   - Nodes will automatically appear on the canvas
   - Each node is pre-configured with sensible defaults

4. **Configure nodes:**
   - Click on any node to customize settings
   - **PostgreSQL Node:** Add your database credentials
   - **LLM Node:** Model is already selected (llama3.2)
   - **Output Node:** Ready to display results

5. **Run the workflow:**
   - Click the **"Run"** button (top-left, purple)
   - Watch execution in real-time

---

## Sample Workflows

### 1. Customer Feedback Analysis
**Prompt:** "Analyze customer feedback from our database"

**What it creates:**
- Manual Trigger
- PostgreSQL Query (last 7 days of feedback)
- PII Filter (removes emails, phones)
- LLM Analysis (sentiment categorization)
- Chat Output (interactive results)

---

### 2. Daily Email Reports
**Prompt:** "Send me an email every day with new user signups"

**What it creates:**
- Schedule Trigger (9 AM daily)
- PostgreSQL Query (today's signups)
- PII Mask (anonymize emails)
- Email Output (send to admin)

---

### 3. Webhook Order Processing
**Prompt:** "Create a webhook that processes incoming orders"

**What it creates:**
- Webhook Trigger (/webhook/orders)
- PII Filter (redact credit cards)
- LLM Fraud Detection
- Database Insert
- Telegram Notification

---

## Configuration Examples

### PostgreSQL Connection

```json
{
  "host": "localhost",
  "port": 5432,
  "database": "your_database",
  "username": "postgres",
  "password": "your_password"
}
```

### Gmail SMTP

```json
{
  "smtp_host": "smtp.gmail.com",
  "smtp_port": 587,
  "smtp_username": "your-email@gmail.com",
  "smtp_password": "your-app-password",
  "use_tls": true
}
```

**Get App Password:** https://support.google.com/accounts/answer/185833

### Telegram Bot

1. Talk to @BotFather on Telegram
2. Create a new bot: `/newbot`
3. Get your bot token: `123456789:ABCdefGHI...`
4. Add bot to your channel
5. Use `@your_channel` as chat_id

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open AI Assistant | None (click button) |
| Run Workflow | Click "Run" button |
| Save Workflow | Click "Save" button |
| Delete Node | Select + Delete key |

---

## Troubleshooting

### "Ollama not available"
**Solution:** Make sure Ollama is running: `ollama serve`

### "No models found"
**Solution:** Pull a model: `ollama pull llama3.2`

### "Database connection failed"
**Solution:**
- Check PostgreSQL is running: `pg_isready`
- Verify credentials in node config
- Test connection in node panel

### "AI Assistant not responding"
**Solution:**
- Check backend logs for errors
- Verify Ollama is running and has model loaded
- Try a simpler prompt first

---

## Next Steps

1. **Build your first workflow** using the AI Assistant
2. **Configure database connections** to query real data
3. **Set up email/Telegram** for notifications
4. **Explore the docs** for advanced features:
   - [Upgrade Summary](./UPGRADE_SUMMARY.md) - Full feature list
   - [Workflow Execution Guide](./WORKFLOW_EXECUTION_GUIDE.md) - Deep dive
   - [Backend API Docs](http://localhost:8000/docs) - API reference

---

## Support & Feedback

- **Documentation:** Check `UPGRADE_SUMMARY.md` for complete feature list
- **API Reference:** http://localhost:8000/docs (when backend is running)
- **Issues:** Report bugs or request features (coming soon)

---

## What Makes ComplianceFlow Different?

✅ **100% Local** - Zero cloud dependencies, all processing on your machine
✅ **AI-Powered** - Natural language workflow generation
✅ **Compliance-First** - Built-in PII filtering (GDPR Article 17)
✅ **Enterprise Ready** - For regulated industries (healthcare, finance, legal)

---

*Ready to build compliant AI workflows? Let's go!* 🚀
