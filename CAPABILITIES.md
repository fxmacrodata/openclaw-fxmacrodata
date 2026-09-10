# Capability matrix

All 23 REST and 49 MCP operations are registered. USD is the default for the briefing. Access and data availability remain operation-specific.

| Operation | Transport | Native registration | Parameters |
| --- | --- | --- | --- |
| `rest_health` | REST | `fxmacrodata_rest_health` | None |
| `rest_ping` | REST | `fxmacrodata_rest_ping` | None |
| `rest_forex` | REST | `fxmacrodata_rest_forex` | `base` (required), `quote` (required), `start_date`, `end_date`, `limit`, `offset`, `page`, `indicators` |
| `rest_intraday_reference_rates` | REST | `fxmacrodata_rest_intraday_reference_rates` | `base` (required), `quote` (required), `start_time`, `end_time` |
| `rest_fx_sources` | REST | `fxmacrodata_rest_fx_sources` | None |
| `rest_fx_source_universe` | REST | `fxmacrodata_rest_fx_source_universe` | `currency`, `source` |
| `rest_data_catalogue` | REST | `fxmacrodata_rest_data_catalogue` | `currency` (required), `include_capabilities`, `include_coverage`, `indicator` |
| `rest_release_calendar` | REST | `fxmacrodata_rest_release_calendar` | `currency` (required), `indicator`, `start_date`, `end_date`, `timezone` |
| `rest_market_sessions` | REST | `fxmacrodata_rest_market_sessions` | `at` |
| `rest_rate_differentials` | REST | `fxmacrodata_rest_rate_differentials` | `base` (required), `quote` (required), `measure`, `rate_type`, `curve_family`, `start_tenor_years`, `end_tenor_years`, `start_date`, `end_date`, `limit`, `offset` |
| `rest_curves` | REST | `fxmacrodata_rest_curves` | `currency` (required), `curve_family`, `metric`, `view`, `method`, `date` |
| `rest_financial_prices` | REST | `fxmacrodata_rest_financial_prices` | `currency` (required), `source`, `start_date`, `end_date`, `measure`, `instrument_id`, `issuer`, `limit`, `offset` |
| `rest_press_releases` | REST | `fxmacrodata_rest_press_releases` | `currency` (required), `limit`, `offset` |
| `rest_risk_sentiment` | REST | `fxmacrodata_rest_risk_sentiment` | `start_date`, `end_date`, `limit`, `offset` |
| `rest_factors` | REST | `fxmacrodata_rest_factors` | `currency` (required), `factor` (required), `start_date`, `end_date`, `include_components`, `include_sources`, `limit`, `offset` |
| `rest_event_predictions` | REST | `fxmacrodata_rest_event_predictions` | `currency` (required), `indicator` (required), `prediction_class`, `prediction_type`, `prediction_source`, `official_limit`, `pre_release_only`, `seasonality`, `frequency`, `annualization`, `period_aggregation`, `basis`, `start_date`, `end_date`, `limit`, `offset`, `page`, `before_date` |
| `rest_latest_announcements` | REST | `fxmacrodata_rest_latest_announcements` | `currency` (required) |
| `rest_indicator_history` | REST | `fxmacrodata_rest_indicator_history` | `currency` (required), `indicator` (required), `start_date`, `end_date`, `series_mode`, `limit`, `offset`, `page`, `seasonality`, `frequency`, `annualization`, `period_aggregation`, `revisions`, `basis`, `official_only` |
| `rest_cot` | REST | `fxmacrodata_rest_cot` | `currency` (required), `start_date`, `end_date`, `limit`, `offset`, `page` |
| `rest_latest_commodities` | REST | `fxmacrodata_rest_latest_commodities` | None |
| `rest_commodities` | REST | `fxmacrodata_rest_commodities` | `indicator` (required), `start_date`, `end_date`, `limit`, `offset`, `page` |
| `rest_announcement_changes` | REST | `fxmacrodata_rest_announcement_changes` | `currencies`, `indicators`, `since`, `limit`, `payload` |
| `rest_stream_events` | REST | `fxmacrodata_rest_stream_events` | `currencies`, `indicators`, `payload`, `live_only`, `max_age_ms`, `Last-Event-ID`, `max_events`, `max_seconds` |
| `mcp_ping` | MCP | `fxmacrodata_mcp_ping` | None |
| `mcp_mcp_capabilities` | MCP | `fxmacrodata_mcp_mcp_capabilities` | None |
| `mcp_mcp_auth_guide` | MCP | `fxmacrodata_mcp_mcp_auth_guide` | None |
| `mcp_subscribe_for_mcp_access` | MCP | `fxmacrodata_mcp_subscribe_for_mcp_access` | None |
| `mcp_data_catalogue` | MCP | `fxmacrodata_mcp_data_catalogue` | `currency` (required), `include_coverage`, `include_capabilities`, `indicator` |
| `mcp_risk_sentiment` | MCP | `fxmacrodata_mcp_risk_sentiment` | `start_date`, `end_date` |
| `mcp_macro_news` | MCP | `fxmacrodata_mcp_macro_news` | `currency` (required), `lookback_days`, `limit`, `offset` |
| `mcp_release_calendar` | MCP | `fxmacrodata_mcp_release_calendar` | `currency` (required), `indicator`, `start_date`, `end_date`, `timezone` |
| `mcp_release_calendar_visual_artifact` | MCP | `fxmacrodata_mcp_release_calendar_visual_artifact` | `currency` (required), `indicator`, `start_date`, `end_date`, `timezone` |
| `mcp_event_predictions` | MCP | `fxmacrodata_mcp_event_predictions` | `currency` (required), `indicator` (required), `prediction_type`, `prediction_source`, `start_date`, `end_date`, `limit`, `offset`, `page` |
| `mcp_latest_announcements` | MCP | `fxmacrodata_mcp_latest_announcements` | `currency` (required) |
| `mcp_announcement_changes` | MCP | `fxmacrodata_mcp_announcement_changes` | `currencies`, `indicators`, `since`, `limit`, `payload` |
| `mcp_press_releases` | MCP | `fxmacrodata_mcp_press_releases` | `currency` (required), `limit`, `offset` |
| `mcp_macro_factor` | MCP | `fxmacrodata_mcp_macro_factor` | `currency` (required), `factor` (required), `start_date`, `end_date`, `include_components`, `include_sources`, `limit`, `offset` |
| `mcp_fx_reference_sources` | MCP | `fxmacrodata_mcp_fx_reference_sources` | None |
| `mcp_fx_reference_universe` | MCP | `fxmacrodata_mcp_fx_reference_universe` | `currency`, `source` |
| `mcp_fx_intraday_reference_rates` | MCP | `fxmacrodata_mcp_fx_intraday_reference_rates` | `base` (required), `quote` (required), `start_time`, `end_time` |
| `mcp_rate_curve` | MCP | `fxmacrodata_mcp_rate_curve` | `currency` (required), `curve_family`, `metric`, `view`, `method`, `date` |
| `mcp_rate_differentials` | MCP | `fxmacrodata_mcp_rate_differentials` | `base` (required), `quote` (required), `measure`, `rate_type`, `curve_family`, `start_tenor_years`, `end_tenor_years`, `start_date`, `end_date`, `limit`, `offset` |
| `mcp_latest_commodities` | MCP | `fxmacrodata_mcp_latest_commodities` | None |
| `mcp_forex` | MCP | `fxmacrodata_mcp_forex` | `base` (required), `quote` (required), `start_date`, `end_date`, `indicators` |
| `mcp_seasonality` | MCP | `fxmacrodata_mcp_seasonality` | `instrument` (required), `lookback_years`, `month`, `end_date` |
| `mcp_indicator_query` | MCP | `fxmacrodata_mcp_indicator_query` | `currency`, `indicator`, `start_date`, `end_date`, `limit`, `offset`, `page`, `slug`, `official_only` |
| `mcp_plot_visual_artifact` | MCP | `fxmacrodata_mcp_plot_visual_artifact` | `query`, `series`, `source`, `currency`, `indicator`, `base`, `quote`, `prediction_type`, `prediction_source`, `x_axis`, `y_key`, `y_label`, `title`, `chart_kind`, `start_date`, `end_date`, `limit`, `offset`, `page` |
| `mcp_indicator_visual_artifact` | MCP | `fxmacrodata_mcp_indicator_visual_artifact` | `currency` (required), `indicator` (required), `start_date`, `end_date`, `limit`, `offset`, `page` |
| `mcp_forex_visual_artifact` | MCP | `fxmacrodata_mcp_forex_visual_artifact` | `base` (required), `quote` (required), `start_date`, `end_date`, `indicators` |
| `mcp_commodities_visual_artifact` | MCP | `fxmacrodata_mcp_commodities_visual_artifact` | `indicator` (required), `start_date`, `end_date` |
| `mcp_cot_visual_artifact` | MCP | `fxmacrodata_mcp_cot_visual_artifact` | `currency` (required), `start_date`, `end_date`, `metric` |
| `mcp_policy_rate_differential_visual_artifact` | MCP | `fxmacrodata_mcp_policy_rate_differential_visual_artifact` | `base` (required), `quote` (required), `start_date`, `end_date` |
| `mcp_macro_briefing_task` | MCP | `fxmacrodata_mcp_macro_briefing_task` | `currency` (required) |
| `mcp_indicator_intel_task` | MCP | `fxmacrodata_mcp_indicator_intel_task` | `currency` (required), `indicator` (required), `start_date`, `end_date` |
| `mcp_pair_intel_task` | MCP | `fxmacrodata_mcp_pair_intel_task` | `base` (required), `quote` (required), `start_date`, `end_date` |
| `mcp_macro_heatmap_task` | MCP | `fxmacrodata_mcp_macro_heatmap_task` | `currencies`, `indicators`, `start_date`, `end_date` |
| `mcp_policy_scenario_modeler_task` | MCP | `fxmacrodata_mcp_policy_scenario_modeler_task` | `base` (required), `quote` (required), `shock_leg`, `shock_bps`, `policy_shock_bps`, `elasticity_per_100bps`, `start_date`, `end_date` |
| `mcp_macro_war_room_task` | MCP | `fxmacrodata_mcp_macro_war_room_task` | `base`, `quote`, `currency`, `indicator`, `start_date`, `end_date` |
| `mcp_event_impact_replay_task` | MCP | `fxmacrodata_mcp_event_impact_replay_task` | `currency` (required), `indicator` (required), `base`, `quote`, `lookback_events`, `start_date`, `end_date` |
| `mcp_quant_scenario_lab_task` | MCP | `fxmacrodata_mcp_quant_scenario_lab_task` | `base` (required), `quote` (required), `shock_leg`, `shock_bps`, `elasticity_per_100bps`, `annualized_volatility_pct`, `horizon_days`, `start_date`, `end_date` |
| `mcp_known_at_time_task` | MCP | `fxmacrodata_mcp_known_at_time_task` | `currency` (required), `indicator` (required), `as_of` (required), `start_date`, `end_date` |
| `mcp_macro_regime_classifier_task` | MCP | `fxmacrodata_mcp_macro_regime_classifier_task` | `currency` (required), `start_date`, `end_date` |
| `mcp_release_risk_score_task` | MCP | `fxmacrodata_mcp_release_risk_score_task` | `base` (required), `quote` (required), `horizon_events` |
| `mcp_portfolio_risk_engine_task` | MCP | `fxmacrodata_mcp_portfolio_risk_engine_task` | `positions_json` (required), `stress_shock_pct`, `horizon_events` |
| `mcp_fx_trade_setup_task` | MCP | `fxmacrodata_mcp_fx_trade_setup_task` | `base` (required), `quote` (required), `horizon_events`, `include_cot` |
| `mcp_fx_backtest_task` | MCP | `fxmacrodata_mcp_fx_backtest_task` | `base` (required), `quote` (required), `start_date`, `end_date`, `strategy`, `momentum_lookback`, `transaction_cost_bps`, `initial_capital`, `event_gated`, `event_window_days` |
| `mcp_macro_research_pack_task` | MCP | `fxmacrodata_mcp_macro_research_pack_task` | `currency` (required), `indicator` (required), `base`, `quote`, `start_date`, `end_date` |
| `mcp_market_sessions` | MCP | `fxmacrodata_mcp_market_sessions` | `at` |
| `mcp_cot_data` | MCP | `fxmacrodata_mcp_cot_data` | `currency` (required), `start_date`, `end_date` |
| `mcp_commodities` | MCP | `fxmacrodata_mcp_commodities` | `indicator`, `symbol`, `start_date`, `end_date` |
| `mcp_financial_prices` | MCP | `fxmacrodata_mcp_financial_prices` | `currency` (required), `source`, `start_date`, `end_date`, `measure`, `instrument_id`, `issuer`, `limit`, `offset` |
| `mcp_official_dataset_family` | MCP | `fxmacrodata_mcp_official_dataset_family` | `endpoint_type` (required), `dataset` (required), `currency` (required), `component` |

The named JSON schemas are bundled with the client, checked before requests, and exposed by the host tool registration. REST event streaming is a bounded snapshot. MCP asynchronous research/task and visual-artifact operations retain their public content, resources, annotations and structured payloads.

Website: https://fxmacrodata.com/documentation/reference
