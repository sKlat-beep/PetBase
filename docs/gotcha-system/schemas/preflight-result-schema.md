# Preflight Result Schema

## Schema
```json
{
  "action": "allow | warn | suggest_fix | suggest_modified_command | block",
  "matched_gotcha_id": "string|null",
  "confidence": 0.0,
  "confidence_band": "low | medium | high",
  "reasoning_summary": "string",
  "recommended_next_step": "string|null",
  "override_allowed": true,
  "suggested_command": "string|null",
  "learning_updated": false
}
```
