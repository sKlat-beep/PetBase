# Workflow Interceptor

## Purpose
Provide the command lifecycle hook that connects your planning layer to preflight prevention and post-execution gotcha monitoring.

## Flow
1. Receive requested command.
2. Build preflight event.
3. If preflight is enabled, call preflight interceptor.
4. Respect returned action:
   - allow
   - warn
   - suggest_fix
   - suggest_modified_command
   - block
5. Execute command if allowed.
6. Capture stdout, stderr, exit code, tool, phase, and environment.
7. Build event.
8. Send event to Gotcha Monitor.
9. Forward learning outcomes to registry.

## Performance Rule
The preflight path must be low latency and deterministic-first.
