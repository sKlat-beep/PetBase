# Gotcha System Config

```yaml
prevention_mode: advisory
preflight_enabled: true
post_execution_monitoring_enabled: true
semantic_matching_enabled: true
confidence_learning_enabled: true
ranking_enabled: true
user_confirmation_required_for_store: true
user_confirmation_required_for_modify: true
strict_mode_override_enabled: true
minimum_confidence_to_warn: medium
minimum_confidence_to_block: very_high
suppression_threshold: 0.30
cache_settings:
  enabled: true
  preflight_cache_ttl_seconds: 300
  recent_history_window: 20
performance_limits:
  fast_path_timeout_ms: 75
  selective_path_timeout_ms: 250
pending_expiry_days: 7
```
