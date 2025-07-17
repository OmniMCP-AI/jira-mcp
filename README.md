# Jira MCP Server

A Model Context Protocol (MCP) server for Jira integration, enabling AI assistants to interact with Jira instances through simple, direct configuration.

## Quick Start (No Installation Required)

You do **not** need to install this package manually. Simply configure your MCP-compatible assistant (such as Claude Desktop or Cursor IDE) to use Jira MCP as a server. The assistant will automatically invoke Jira MCP via `npx` when needed.

### Simple MCP Configuration (Recommended)

Add the following to your MCP configuration file (e.g., for Cursor or Claude Desktop):

```json
{
  "mcpServers": {
    "jira": {
      "command": "npx",
      "args": ["-y", "@deoo/jira-mcp"],
      "env": {
        "JIRA_HOST": "your-domain.atlassian.net",
        "JIRA_PROTOCOL": "https",
        "JIRA_USERNAME": "your_username",
        "JIRA_PASSWORD": "your_password",
        "JIRA_API_VERSION": "2"
      }
    }
  }
}
```

- **No installation required**: The above works out-of-the-box with `npx`.
- **No global or local npm install needed**.
- **Just configure and use!**

#### Environment Variables Reference

| Variable           | Required         | Description                                 | Example                    |
|--------------------|-----------------|---------------------------------------------|----------------------------|
| `JIRA_HOST`        | Yes             | Jira instance hostname (no protocol)        | `your-domain.atlassian.net`|
| `JIRA_PROTOCOL`    | No (default: https) | Protocol to use                        | `https`                    |
| `JIRA_USERNAME`    | For Basic Auth  | Your Jira username                          | `your_username`                   |
| `JIRA_PASSWORD`    | For Basic Auth  | Your Jira password                          | `your_password`            |
| `JIRA_API_VERSION` | No (default: 2) | Jira API version                            | `2`                        |


#### Available Tools

- `list-issues`: List issues from Jira
- `create-issue`: Create a new issue in Jira
- `add-comment`: Add a comment to an issue

---