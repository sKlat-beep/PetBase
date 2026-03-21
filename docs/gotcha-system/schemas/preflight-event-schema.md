# Preflight Event Schema

## Purpose
Represents the request analyzed before a command executes.

## Schema
```json
{
  "id": "string",
  "timestamp": "ISO-8601 string",
  "tool": "string",
  "command": "string",
  "args": [],
  "context": {},
  "phase": "string",
  "environment": "string",
  "command_family": "string",
  "recent_history": []
}
```
