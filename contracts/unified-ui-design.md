---
id: unified-ui-design
title: Unified UI Design Contract
description: Unified architecture for PetBase UI across desktop and mobile. Enforces scroll elimination, gesture support, dual-theme compatibility, and strict adherence to privacy (PII) and security policies.
priority: high
tags:
  - ui
  - ux
  - contract
  - mobile
  - desktop
  - security
createdAt: "2026-03-10T05:35:17.229Z"
contract:
  status: draft
  deliverables:
    - type: file
      path: app/src/pages/<FLOW_NAME>.tsx
      description: Responsive page/flow with desktop and mobile support
    - type: file
      path: app/src/components/<FLOW_NAME>/
      description: Reusable subcomponents used by the flow
  constraints:
    - PII MASKING: RESTRICTED_PII fields must be masked by default (e.g., *****).
    - EYEBALL TOGGLE: Masked PII fields must include a toggle icon to reveal data.
    - AVATAR TOKENIZATION: All profile images must resolve via tokenService.getAvatarUrl.
    - CLIENT-SIDE ENCRYPTION: Sensitive PII must be encrypted using user-derived keys.
    - COMMON COMPONENTS: Reuse shared elements from app/src/components/common/.
    - UNIFIED MODALS: Use a single modal component that adapts to bottom-sheet on mobile.
    - NO INTERNAL SCROLLBARS: Use carousels, pagination, or load-more for overflow.
    - THEME PARITY: Full support for light and dark modes via theme tokens.
    - DESKTOP AND MOBILE PARITY: All flows must be consistent across desktop and mobile.
    - PENCIL MCP: Use Pencil MCP server for UI design/planning and for reading .pen files.
completedAt: "2026-03-10T05:35:26.115Z"
---

## Description
Unified architecture for PetBase UI across desktop and mobile. Enforces scroll elimination, gesture support, dual-theme compatibility, and strict adherence to privacy (PII) and security policies.
