---
name: OpenAI account limits
description: Which OpenAI models the user's key can use
---
The user's OpenAI organization is **not verified**, so gpt-5-family models return `model_not_found` ("organization must be verified"). gpt-4.1 family works fine.

**Why:** Attempted upgrade of task extraction to gpt-5-mini failed with the verification error (Aug 2026); settled on gpt-4.1-mini.

**How to apply:** Before switching the extraction model to a gpt-5 model, test a direct API call first, or ask the user to verify their org at platform.openai.com. Note: gpt-5 models also reject `temperature` ≠ 1 and require `max_completion_tokens` instead of `max_tokens`.
