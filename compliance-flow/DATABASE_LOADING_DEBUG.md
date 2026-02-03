# Database Loading Debug Guide for Pookie 💖

## The Problem
Chat interface shows "1 tables, 0 rows loaded" - database is detected but data isn't loading.

## Quick Fixes Applied

### 1. Enhanced Error Logging ✅
Added comprehensive console logging with emojis to make debugging easier:
- ✅ Success (data loaded)
- ⚠️ Warning (query returned 0 rows)
- ❌ Error (query failed)

### 2. Save dbType in Config ✅
The database type wasn't being saved, which could cause issues. Now it saves `dbType: 'postgresql'`.

### 3. Better Query Error Handling ✅
Wrapped query execution in try/catch to log any exceptions.

## How to Debug (Step by Step)

### Step 1: Open Browser Console
1. Press `F12` in your browser
2. Go to "Console" tab
3. Clear the console (trash icon)

### Step 2: Click Chat Output Node
This will trigger the database loading. Watch for these logs:

```javascript
[ChatInterface] Finding connections for node: output-1
[ChatInterface] All upstream nodes: [...]
[ChatInterface] Found Database node: db-1
[ChatInterface] loadDatabaseContext called with config: {...}
```

### Step 3: Check Database Config
Look for this log to see what config is being used:
```javascript
[ChatInterface] loadDatabaseContext called with config: {
  dbType: 'postgresql',
  host: 'localhost',
  port: 5432,
  database: 'weather_project',
  username: 'postgres',
  password: '••••',
  ssl: false,
  query: 'SELECT * FROM users LIMIT 10'  // ← Check this!
}
```

### Step 4: Check Table Discovery
```javascript
[ChatInterface] Fetching tables with config: {...}
[ChatInterface] Tables result: {
  success: true,
  tables: [{name: 'weather_observations', columns: [...]}]
}
[ChatInterface] Set schema: [...]
[ChatInterface] First table name: weather_observations
```

### Step 5: Check Query Execution
```javascript
[ChatInterface] Executing query: SELECT * FROM weather_observations LIMIT 50
[ChatInterface] With config: {...}
[ChatInterface] Query result: {
  success: true/false,
  rows: [...],
  error: '...'  // ← If this exists, there's your problem!
}
```

### Step 6: Check Final Result
You should see ONE of these:
- ✅ `[ChatInterface] ✅ Setting sample data, row count: 50`
- ⚠️ `[ChatInterface] ⚠️ Query succeeded but returned 0 rows`
- ❌ `[ChatInterface] ❌ Query failed: [error message]`
- ❌ `[ChatInterface] ❌ Exception executing query: [error]`

## Common Issues & Solutions

### Issue 1: Query Field is Wrong
**Problem:** The saved query is `SELECT * FROM users LIMIT 10` but your table is `weather_observations`

**Solution:**
1. Click on the PostgreSQL database node
2. Update the Query field to match your actual table:
   ```sql
   SELECT * FROM weather_observations
   ```
3. Click "Save Configuration"
4. Click Chat Output node again

### Issue 2: Query Syntax Error
**Problem:** Query has syntax errors or uses features not supported by PostgreSQL

**Solution:**
1. Test the query directly in PostgreSQL first
2. Make sure it's valid SQL
3. Update in the database node config
4. Save and retry

### Issue 3: Table is Empty
**Problem:** The table exists but has no data

**Solution:**
1. Check if your table actually has rows:
   ```sql
   SELECT COUNT(*) FROM weather_observations;
   ```
2. If it's empty, insert some test data
3. Retry the chat interface

### Issue 4: Permission Issues
**Problem:** User doesn't have SELECT permission on the table

**Solution:**
1. Check PostgreSQL permissions
2. Make sure the user can SELECT from the table
3. Test with a PostgreSQL client first

### Issue 5: Wrong Table Name
**Problem:** The default query uses a table that doesn't exist

**Solution:**
1. Look at the console log for `[ChatInterface] First table name:`
2. Update your query to use that table name
3. Or specify your own query in the database node config

## Test Checklist

- [ ] Database node shows "Connected" status (green dot)
- [ ] PostgreSQL credentials are correct
- [ ] Table exists in the database
- [ ] Table has data in it
- [ ] Query syntax is valid
- [ ] User has SELECT permission
- [ ] dbType is saved as 'postgresql'
- [ ] Console shows ✅ for data loading

## If All Else Fails

Share these console logs with me:
1. The full `loadDatabaseContext called with config:` log
2. The `Query result:` log
3. Any ❌ error messages

Then I'll know exactly what's wrong! 💖

## Love You Pookie!
Remember: The logs are your friends! They'll tell us exactly what's happening. Check that console! 🔍
