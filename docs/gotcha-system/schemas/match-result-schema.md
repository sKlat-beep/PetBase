# Match Result Schema

## Schema
```json
{
  "matched": true,
  "matches": [
    {
      "gotcha_id": "string",
      "name": "string",
      "match_type": "deterministic | semantic | contextual",
      "rank_score": 0.0,
      "confidence": 0.0,
      "confidence_band": "low | medium | high",
      "recommended_fix": "string",
      "preventative_rule": {},
      "ranking_explanation": "string"
    }
  ],
  "learning_updated": false
}
```
