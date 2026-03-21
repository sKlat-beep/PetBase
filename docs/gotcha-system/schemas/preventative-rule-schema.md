# Preventative Rule Schema

## Schema
```json
{
  "rule_id": "string",
  "rule_type": "preflight_check | advisory | assisted | blocking",
  "condition": "string",
  "action": "warn | suggest_fix | suggest_modified_command | block",
  "severity": "low | medium | high | critical",
  "applies_to_command_families": [],
  "applies_to_environments": [],
  "suggested_command": "string|null",
  "requires_confirmation": true,
  "override_allowed": true,
  "last_validated_at": "ISO-8601 string"
}
```
