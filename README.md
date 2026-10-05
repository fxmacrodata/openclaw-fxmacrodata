# FXMacroData for OpenClaw

Connect your FXMacroData subscription to OpenClaw agents for cross-currency macro research, full available indicator histories and release-calendar analysis. Native tools return source-linked data that your agents can use in deeper research.

**[Subscribe to FXMacroData](https://fxmacrodata.com/subscribe?utm_source=github&utm_medium=referral&utm_campaign=open_source_integrations&utm_content=openclaw_subscribe)** for access to covered non-USD datasets and full available history.

Evaluate the plugin before subscribing with public USD data and the default USD daily briefing; these requests require no FXMacroData key or account.

The native plugin has 72 separately registered REST/MCP tools and a reusable macroeconomic briefing Skill. Tested with OpenClaw 2026.9.3 and Node 24.16.0.

## Install

Build with `npm install` and `npm pack`, then install the resulting archive:

```sh
openclaw plugins install npm-pack:./fxmacrodata-openclaw-0.1.0.tgz --force --accept-capabilities
openclaw plugins inspect fxmacrodata --runtime --json
```

The archive installs the built JavaScript plugin, native manifest and Skill. Enable FXMacroData in your OpenClaw tool policy as needed. Ask: “Use FXMacroData to prepare the latest USD macroeconomic briefing and upcoming releases.” The daily briefing calls three live provider operations; individual tools remain available for deeper analysis.

## Connect your subscription

To connect your subscription, configure an OpenClaw SecretRef in `plugins.entries.fxmacrodata.config.apiKey`. Supply the value through OpenClaw's secret provider, for example a deployment environment variable named `FXMD_API_KEY`:

```json
{ "source": "env", "provider": "default", "id": "FXMD_API_KEY" }
```

Set the matching environment secret outside the plugin and restart/reload through your normal OpenClaw procedure. The plugin schema accepts a secret reference, not a plaintext key. OpenClaw resolves it for runtime use. Do not place a key in a chat, tool argument or shared config.

The [capability matrix](CAPABILITIES.md) lists the 23 REST operations and 49 MCP tools, including each operation's parameters.

The daily briefing defaults to USD. Availability and access requirements vary by operation; protected data requires your own FXMacroData access. Missing observations and release times remain unavailable. FX quotes are reference data, not execution prices.

Results retain the complete redacted public payload, source dates and metadata. Readable tables show at most 50 rows and 16 columns each; their structured result preserves all rows for further analysis.

[FXMacroData](https://fxmacrodata.com/?utm_source=github&utm_medium=referral&utm_campaign=open_source_integrations&utm_content=openclaw_readme) | [API documentation](https://fxmacrodata.com/documentation/reference?utm_source=github&utm_medium=referral&utm_campaign=open_source_integrations&utm_content=openclaw_docs)

## Data and credentials

Requests go only to the canonical FXMacroData API and MCP service. Tool parameters accept only the named operation's public schema; credentials cannot be supplied as model arguments. Credentials remain private to each client and are redacted from returned content, tables and errors. Nothing is sent at import time. Public mode never automatically reads a machine credential.

Website links carry static campaign tags to attribute visits. Data requests and upstream source links are untagged. There are no analytics calls or user identifiers.

Use returned official source links and timestamps when citing data. Distinguish survey consensus, central-bank projections and FXMacroData-generated scenarios. Never infer a future release time from historical cadence.

## Build and test

From this package directory, run `npm install`, `npm test`, `npm run typecheck`, and `npm run build`. `npm pack` builds the native distributable. Apache-2.0 licensing covers this integration; API access and data reuse remain subject to [FXMacroData terms](https://fxmacrodata.com/terms?utm_source=github&utm_medium=referral&utm_campaign=openclaw-fxmacrodata&utm_content=readme).
