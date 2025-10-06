# 🤖 Basecamp Assigned Tasks Summary to Slack

Send automated summaries of YOUR assigned Basecamp tasks to Slack.

## 📋 What It Does

- Shows only tasks **assigned to YOU** (not all project tasks)
- Total assigned tasks count
- Pending vs completed breakdown
- Breakdown by project
- Recent pending tasks with due dates

## 🚀 Setup

### Step 1: Get Slack Webhook URL

1. Go to https://api.slack.com/apps
2. Create a new app or select existing
3. Go to "Incoming Webhooks"
4. Activate Incoming Webhooks
5. Click "Add New Webhook to Workspace"
6. Select the channel (e.g., #basecamp-summary)
7. Copy the Webhook URL

**Example webhook URL:**
```
https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
```

### Step 2: Configure Webhook

**Option 1: Environment Variable (Recommended)**
```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

**Option 2: Add to config.json**
```json
{
  "accountId": "...",
  "accessToken": "...",
  "slackWebhookUrl": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
}
```

### Step 3: Make Script Executable

```bash
cd "/Users/varundubey/Local Sites/reign-learndash/app/public/basecamp-mcp-server/automation"
chmod +x assigned-todos-slack.js
```

## 🧪 Testing

```bash
cd "/Users/varundubey/Local Sites/reign-learndash/app/public/basecamp-mcp-server/automation"

# Set webhook URL
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# Run script
node assigned-todos-slack.js
```

**Expected Output:**
```
🔄 Fetching your assigned Basecamp tasks...

✅ User: Varun Dubey
✅ Assigned tasks: 15

📊 Summary:
   Pending: 8
   Completed: 7

📤 Sending summary to Slack...
✅ Summary sent successfully!
```

## ⏰ Scheduling with Cron

### Daily Summary at 9 AM

Edit crontab:
```bash
crontab -e
```

Add this line:
```cron
0 9 * * * export SLACK_WEBHOOK_URL="YOUR_WEBHOOK_URL" && cd "/Users/varundubey/Local Sites/reign-learndash/app/public/basecamp-mcp-server/automation" && /usr/local/bin/node assigned-todos-slack.js >> /tmp/basecamp-summary.log 2>&1
```

### Weekly Summary (Monday at 9 AM)

```cron
0 9 * * 1 export SLACK_WEBHOOK_URL="YOUR_WEBHOOK_URL" && cd "/Users/varundubey/Local Sites/reign-learndash/app/public/basecamp-mcp-server/automation" && /usr/local/bin/node assigned-todos-slack.js >> /tmp/basecamp-summary.log 2>&1
```

### Cron Schedule Examples

| Schedule | Cron | Description |
|----------|------|-------------|
| Every day 9 AM | `0 9 * * *` | Daily summary |
| Every Monday 9 AM | `0 9 * * 1` | Weekly summary |
| Mon-Fri 9 AM | `0 9 * * 1-5` | Weekdays only |

## 📊 Sample Slack Message

```
📋 Varun Dubey's Basecamp Tasks
━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Assigned: 15
Pending: 8
Completed: 7

By Project:
• Website Redesign: 3
• API Integration: 2
• Mobile App v2.0: 3

Your Pending Tasks:
• Implement user authentication (Website Redesign) - Due: 10/15/2025
• Review API documentation (API Integration)
• Fix responsive layout bug (Mobile App v2.0)

━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generated: 2025-10-06 09:00 AM | Basecamp MCP Server
```

## 🐛 Troubleshooting

### "Slack webhook URL not configured"
- Make sure `SLACK_WEBHOOK_URL` environment variable is set
- Or add `slackWebhookUrl` to config.json

### "Basecamp API error: 401"
- Access token expired
- Refresh your Basecamp token

### Cron job not running
- Check cron logs: `grep CRON /var/log/syslog`
- Check script logs: `cat /tmp/basecamp-summary.log`
- Verify node path: `which node`
- Use full paths in cron

### Message not appearing in Slack
- Verify webhook URL is correct
- Check channel permissions
- Test webhook with curl:
```bash
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test message"}' \
  YOUR_WEBHOOK_URL
```

## 🔐 Security Notes

1. **Never commit webhook URLs to git**
2. **Use environment variables for sensitive data**
3. **Restrict webhook to specific channels**
4. **Monitor webhook usage in Slack admin**

## 📞 Support

**Questions?**
- Email: varun@wbcomdesigns.com
- GitHub: https://github.com/vapvarun/basecamp-mcp-server

---

**Author:** Varun Dubey (vapvarun)
**Company:** Wbcom Designs
**License:** GPL-2.0-or-later
