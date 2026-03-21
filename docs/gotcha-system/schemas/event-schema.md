# Event Schema

## Purpose
Represents the full post-execution record analyzed by the Gotcha Monitor.

## Schema
```json
{
  "id": "string",
  "timestamp": "ISO-8601 string",
  "tool": "string",
  "command": "string",
  "stdout": "string",
  "stderr": "string",
  "exit_code": 0,
  "context": {},
  "phase": "string",
  "environment": "string"
}
```
