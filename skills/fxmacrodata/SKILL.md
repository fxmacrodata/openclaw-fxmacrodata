---
name: fxmacrodata
description: Research macroeconomic indicators, upcoming releases, FX reference data, positioning and commodities with the native FXMacroData tools.
---

Use `fxmacrodata_daily_briefing` for a current USD overview. This retrieves latest indicator observations, the release calendar and market sessions; it defaults to public access. For targeted requests, select a registered `fxmacrodata_rest_*` or `fxmacrodata_mcp_*` tool using its named parameters. Use data catalogue discovery before selecting an unfamiliar indicator.

Read structured `details.payload` for the complete source data and `details.tables` for chart-ready projections. MCP content, structuredContent, resources and annotations remain in the payload. Preserve source links, units, periods and timestamps. If data is unavailable, explain that limitation. Do not infer scheduled release times. Separate survey consensus, official projections and generated scenarios. FX reference rates are not executable prices.

Never ask the user to put an API key in chat or tool parameters. Public USD is available without a key; optional protected access belongs in the OpenClaw SecretRef setting. Include the returned FXMacroData source link in research responses alongside any official source links relevant to the claim.

Website: https://fxmacrodata.com/?utm_source=openclaw&utm_medium=integration&utm_campaign=open_source_integrations&utm_content=app
Documentation: https://fxmacrodata.com/documentation/reference
