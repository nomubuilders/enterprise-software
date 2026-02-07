# ComplianceFlow Troubleshooting Guide

Common issues and their solutions.

---

## Backend Issues

### ❌ ImportError: email-validator is not installed

**Error:**
```
ImportError: email-validator is not installed, run `pip install pydantic[email]`
```

**Solution:**
```bash
cd backend
pip3 install email-validator aiohttp openpyxl
```

Or install all missing dependencies:
```bash
cd backend
pip3 install -r requirements.txt
```

---

### ❌ ModuleNotFoundError: No module named 'aiohttp'

**Solution:**
```bash
pip3 install aiohttp
```

---

### ❌ Ollama not available

**Error in logs:**
```
⚠️ Ollama not available - LLM features disabled
```

**Solution:**
```bash
# Terminal 1 - Start Ollama
ollama serve

# Terminal 2 - Pull a model
ollama pull llama3.2
```

**Verify Ollama is running:**
```bash
curl http://localhost:11434/api/tags
```

---

### ❌ Port 8000 already in use

**Error:**
```
ERROR: [Errno 48] Address already in use
```

**Solution:**
```bash
# Find process using port 8000
lsof -ti:8000

# Kill the process
kill -9 $(lsof -ti:8000)

# Or use a different port
uvicorn app.main:app --reload --port 8001
```

---

## Frontend Issues

### ❌ AI Assistant not responding

**Symptoms:**
- Click "AI Assistant" button but nothing happens
- Chat interface doesn't appear

**Solution:**
1. Check browser console for errors (F12 → Console)
2. Verify backend is running: http://localhost:8000/api/v1/health
3. Check if Ollama is running: `ollama list`
4. Try refreshing the page (Cmd/Ctrl + R)

---

### ❌ "Failed to generate workflow"

**Error in chat:**
```
❌ Sorry, I couldn't build that workflow. Please try rephrasing your request.
```

**Solutions:**

1. **Check backend logs** for detailed error
2. **Verify Ollama has models:**
   ```bash
   ollama list
   ```
3. **Try a simpler prompt first:**
   ```
   Create a simple workflow with a trigger
   ```
4. **Check backend connectivity:**
   ```bash
   curl http://localhost:8000/api/v1/llm/models
   ```

---

### ❌ Nodes not appearing on canvas

**Symptoms:**
- AI Assistant says "workflow created" but no nodes appear
- Edges (connections) missing

**Solution:**
1. Check browser console for errors
2. Zoom out on canvas (scroll wheel or Cmd/Ctrl + -)
3. Click "Fit View" if available
4. Refresh page and try again

---

### ❌ Cannot configure nodes

**Symptoms:**
- Click on node but config panel doesn't open
- Config panel is blank

**Solution:**
1. Refresh the page
2. Check browser console for errors
3. Verify node type is supported (38 types including triggerNode, databaseNode, llmNode, piiFilterNode, outputNode, slackComplianceNode, jiraComplianceNode, sapERPNode, and more)

---

## Database Issues

### ❌ PostgreSQL connection failed

**Error:**
```
Connection failed: could not connect to server
```

**Solutions:**

1. **Check PostgreSQL is running:**
   ```bash
   # macOS
   brew services list | grep postgresql

   # Linux
   systemctl status postgresql
   ```

2. **Start PostgreSQL:**
   ```bash
   # macOS
   brew services start postgresql@15

   # Linux
   sudo systemctl start postgresql
   ```

3. **Verify connection manually:**
   ```bash
   psql -h localhost -U postgres -d your_database
   ```

4. **Check credentials:**
   - Host: `localhost`
   - Port: `5432` (default)
   - Username: Usually `postgres`
   - Password: Set during PostgreSQL installation

---

### ❌ "No tables found"

**After successful connection but table list is empty**

**Solution:**
1. Verify database has tables:
   ```sql
   \dt  -- in psql
   ```
2. Check schema permissions
3. Try a different database that has data

---

## Email Issues

### ❌ Gmail SMTP authentication failed

**Error:**
```
SMTP error: (535, b'5.7.8 Username and Password not accepted')
```

**Solution:**
Use **App Password** instead of your regular Gmail password:

1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Go to App Passwords: https://myaccount.google.com/apppasswords
4. Generate a new app password for "Mail"
5. Use this 16-character password in ComplianceFlow

**Config:**
```json
{
  "smtp_host": "smtp.gmail.com",
  "smtp_port": 587,
  "smtp_username": "your-email@gmail.com",
  "smtp_password": "xxxx xxxx xxxx xxxx",  // App password
  "use_tls": true
}
```

---

### ❌ Email sending times out

**Error:**
```
Connection timeout
```

**Solutions:**
1. Check firewall settings (port 587 or 465)
2. Try port 465 instead of 587
3. Disable VPN if active
4. Check if ISP blocks SMTP

---

## Telegram Issues

### ❌ Invalid bot token

**Error:**
```
Bot token invalid: Unauthorized
```

**Solution:**
1. Go to @BotFather on Telegram
2. Create new bot: `/newbot`
3. Copy the token: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
4. Use exact token (don't add spaces or quotes)

---

### ❌ Cannot send to channel

**Error:**
```
Chat not found
```

**Solution:**
1. Add your bot to the channel as admin
2. Use channel username: `@your_channel`
3. Or get numeric chat ID:
   ```bash
   # Send a message to the channel first, then:
   curl https://api.telegram.org/bot<TOKEN>/getUpdates
   ```

---

## Installation Issues

### ❌ npm install fails

**Error:**
```
npm ERR! code ERESOLVE
```

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Install again
npm install
```

---

### ❌ Python dependencies conflict

**Error:**
```
ERROR: pip's dependency resolver does not currently take into account...
```

**Solution:**
```bash
# Use virtual environment
python3 -m venv venv
source venv/bin/activate  # On macOS/Linux
# venv\Scripts\activate   # On Windows

# Install dependencies
pip install -r requirements.txt
```

---

## Performance Issues

### ❌ AI responses are very slow

**Symptoms:**
- Workflow generation takes 30+ seconds
- Chat responses delayed

**Solutions:**
1. **Check Ollama model:**
   ```bash
   ollama list
   ```
   Smaller models are faster (llama3.2 < mistral < llama3.1)

2. **Reduce max_tokens** in LLM node config (e.g., 1024 instead of 4096)

3. **Lower temperature** for faster, more deterministic responses

4. **Check system resources:**
   ```bash
   # macOS
   top -o cpu

   # Look for high CPU usage by Ollama
   ```

---

### ❌ Frontend is slow/laggy

**Solutions:**
1. **Reduce workflow complexity** (fewer nodes)
2. **Clear browser cache** (Cmd/Ctrl + Shift + R)
3. **Close other browser tabs**
4. **Check React DevTools** for render issues

---

## Development Issues

### ❌ Hot reload not working

**Symptoms:**
- Changes to code don't appear
- Need to manually restart

**Solution for Backend:**
```bash
# Make sure using --reload flag
uvicorn app.main:app --reload
```

**Solution for Frontend:**
```bash
# Restart dev server
npm run dev
```

---

### ❌ CORS errors in browser console

**Error:**
```
Access to fetch at 'http://localhost:8000' from origin 'http://localhost:5173'
has been blocked by CORS policy
```

**Solution:**
Check `backend/app/core/config.py`:
```python
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
```

---

## Getting Help

If you're still stuck:

1. **Check logs:**
   - Backend: Terminal running uvicorn
   - Frontend: Browser console (F12)
   - Ollama: `ollama logs` or terminal output

2. **Verify all services running:**
   ```bash
   # Ollama
   curl http://localhost:11434/api/tags

   # Backend
   curl http://localhost:8000/api/v1/health

   # Frontend
   # Open http://localhost:5173 in browser
   ```

3. **Try the Quick Start guide:**
   See [QUICK_START.md](./QUICK_START.md)

4. **Review upgrade documentation:**
   See [UPGRADE_SUMMARY.md](./UPGRADE_SUMMARY.md)

---

## Common Workflow Issues

### ❌ Workflow execution fails

**Check:**
1. All nodes are properly connected (edges visible)
2. Required node configs are filled (database credentials, etc.)
3. Backend logs for detailed error
4. Start with simpler workflow first

---

### ❌ Data not flowing between nodes

**Check:**
1. Edges are connected (animated lines)
2. Upstream nodes executed successfully
3. Output format matches downstream node expectations

---

*Last updated: February 7, 2026*
