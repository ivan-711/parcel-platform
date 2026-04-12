# API Route Inventory

## Summary
- Total endpoints: **141**
- Authenticated: **119**
- Unauthenticated: **22** (health checks, webhooks, public share endpoints, service status)
- Dead (backend only, no frontend caller): **12**
- Broken (frontend calls to non-existent backend): **0**

---

## Endpoint Map

### Health & Root (/)

| Method | Path | Function | Auth | Tier | Rate Limited | Frontend Caller | Status |
|--------|------|----------|------|------|-------------|-----------------|--------|
| GET | `/` | `root` | No | - | No | - | Active |
| GET | `/health` | `health` | No | - | No | `api.health.check` | Active |
| GET | `/health/worker` | `worker_health` | No | - | No | - | Dead |

### Authentication (/api/v1/auth)

| Method | Path | Function | Auth | Tier | Rate Limited | Frontend Caller | Status |
|--------|------|----------|------|------|-------------|-----------------|--------|
| GET | `/api/v1/auth/me` | `me` | Yes | - | No | `api.auth.me` | Active |
| GET | `/api/v1/auth/me/` | `get_profile` | Yes | - | No | (via `api.auth.me` variant) | Active |
| PUT | `/api/v1/auth/me/` | `update_profile` | Yes | - | No | `api.auth.updateMe` | Active |
| POST | `/api/v1/auth/delete-account` | `delete_account` | Yes | - | No | `api.auth.deleteAccount` | Active |

### Dashboard (/api/v1/dashboard)

| Method | Path | Function | Auth | Tier | Rate Limited | Frontend Caller | Status |
|--------|------|----------|------|------|-------------|-----------------|--------|
| GET | `/api/v1/dashboard/stats/` | `get_dashboard_stats` | Yes | - | 60/min | `api.dashboard.stats` | Active |
| GET | `/api/v1/dashboard/activity/` | `get_activity_feed` | Yes | - | 60/min | `api.activity.list` | Active |

### Deals (/api/v1/deals)

| Method | Path | Function | Auth | Tier | Rate Limited | Frontend Caller | Status |
|--------|------|----------|------|------|-------------|-----------------|--------|
| POST | `/api/v1/deals/` | `create_deal` | Yes | Quota: saved_deals, analyses_per_month | 30/min | `api.deals.create` | Active |
| GET | `/api/v1/deals/` | `list_deals` | Yes | - | 60/min | `api.deals.list` | Active |
| GET | `/api/v1/deals/{deal_id}` | `get_deal` | Yes | - | 60/min | `api.deals.get` | Active |
| PUT | `/api/v1/deals/{deal_id}` | `update_deal` | Yes | - | No | `api.deals.update` | Active |
| DELETE | `/api/v1/deals/{deal_id}` | `delete_deal` | Yes | - | No | `api.deals.delete` | Active |
| PUT | `/api/v1/deals/{deal_id}/share/` | `share_deal` | Yes | - | No | `api.deals.share` | Active |
| GET | `/api/v1/deals/{deal_id}/share/` | `get_shared_deal` | **No** | - | 60/min | `api.deals.getShared` | Active |
| POST | `/api/v1/deals/{deal_id}/offer-letter/` | `generate_deal_offer_letter` | Yes | Feature: offer_letter | 5/min | `api.offerLetter.generate` | Active |

### Pipeline (/api/v1/pipeline)

| Method | Path | Function | Auth | Tier | Rate Limited | Frontend Caller | Status |
|--------|------|----------|------|------|-------------|-----------------|--------|
| GET | `/api/v1/pipeline/` | `get_pipeline_board` | Yes | Feature: pipeline_enabled | 60/min | `api.pipeline.list` | Active |
| POST | `/api/v1/pipeline/` | `add_to_pipeline` | Yes | Feature: pipeline_enabled | No | `api.pipeline.add` | Active |
| PUT | `/api/v1/pipeline/{entry_id}/stage/` | `move_stage` | Yes | Feature: pipeline_enabled | No | `api.pipeline.updateStage` | Active |
| DELETE | `/api/v1/pipeline/{entry_id}/` | `remove_from_pipeline` | Yes | Feature: pipeline_enabled | No | `api.pipeline.remove` | Active |
| GET | `/api/v1/pipeline/stats` | `get_pipeline_stats` | Yes | - | No | `api.pipeline.stats` | Active |

### Portfolio (/api/v1/portfolio)

| Method | Path | Function | Auth | Tier | Rate Limited | Frontend Caller | Status |
|--------|------|----------|------|------|-------------|-----------------|--------|
| GET | `/api/v1/portfolio/` | `get_portfolio` | Yes | Tier: PRO | 60/min | `api.portfolio.summary` | Active |
| POST | `/api/v1/portfolio/` | `add_portfolio_entry` | Yes | Tier: PRO | No | `api.portfolio.addEntry` | Active |
| PUT | `/api/v1/portfolio/{entry_id}/` | `update_portfolio_entry` | Yes | Tier: PRO | No | `api.portfolio.update` | Active |

### Chat (/api/v1/chat)

| Method | Path | Function | Auth | Tier | Rate Limited | Frontend Caller | Status |
|--------|------|----------|------|------|-------------|-----------------|--------|
| POST | `/api/v1/chat/` | `chat` | Yes | Feature: ai_chat_enabled; Quota: ai_messages_per_month | 10/min | `chat-stream.ts` (SSE) | Active |
| GET | `/api/v1/chat/history/` | `get_chat_history` | Yes | - | 30/min | `api.chat.history` | Active |
| GET | `/api/v1/chat/sessions/` | `get_chat_sessions` | Yes | - | 30/min | `api.chat.sessions` | Active |

### Documents (/api/v1/documents)

| Method | Path | Function | Auth | Tier | Rate Limited | Frontend Caller | Status |
|--------|------|----------|------|------|-------------|-----------------|--------|
| POST | `/api/v1/documents/` | `upload_document` | Yes | Quota: document_uploads_per_month | No | `api.documents.upload` | Active |
| GET | `/api/v1/documents/` | `list_documents` | Yes | - | No | `api.documents.list` | Active |
| GET | `/api/v1/documents/{document_id}` | `get_document` | Yes | - | No | `api.documents.get` | Active |
| GET | `/api/v1/documents/{document_id}/status` | `get_document_status` | Yes | - | No | `api.documents.status` | Active |
| DELETE | `/api/v1/documents/{document_id}` | `delete_document` | Yes | - | No | `api.documents.delete` | Active |

### Settings (/api/v1/settings)

| Method | Path | Function | Auth | Tier | Rate Limited | Frontend Caller | Status |
|--------|------|----------|------|------|-------------|-----------------|--------|
| GET | `/api/v1/settings/notifications/` | `get_notification_preferences` | Yes | - | No | `api.notifications.get` | Active |
| PATCH | `/api/v1/settings/notifications/` | `update_notification_preferences` | Yes | - | No | `api.notifications.update` | Active |
| GET | `/api/v1/settings/brand-kit/` | `get_brand_kit` | Yes | - | No | - | Dead |
| PATCH | `/api/v1/settings/brand-kit/` | `update_brand_kit` | Yes | - | No | - | Dead |

### Billing (/api/v1/billing)

| Method | Path | Function | Auth | Tier | Rate Limited | Frontend Caller | Status |
|--------|------|----------|------|------|-------------|-----------------|--------|
| POST | `/api/v1/billing/checkout` | `checkout` | Yes | - | 5/min | `api.billing.checkout` | Active |
| POST | `/api/v1/billing/portal` | `portal` | Yes | - | 5/min | `api.billing.portal` | Active |
| POST | `/api/v1/billing/cancel` | `cancel` | Yes | - | 3/min | `api.billing.cancel` | Active |
| GET | `/api/v1/billing/status` | `billing_status` | Yes | - | 30/min | `api.billing.status` | Active |

### Analysis (/api/analysis)

| Method | Path | Function | Auth | Tier | Rate Limited | Frontend Caller | Status |
|--------|------|----------|------|------|-------------|-----------------|--------|
| POST | `/api/analysis/quick` | `quick_analysis` | Yes | Quota: analyses_per_month | 10/min | `api.analysis.quick` / `api.analysis.saveAsProperty` | Active |
| GET | `/api/analysis/quick/stream` | `quick_analysis_stream` | Yes | Quota: analyses_per_month | 10/min | `AnalyzePage.tsx` (SSE) | Active |
| POST | `/api/analysis/scenarios/{scenario_id}/regenerate-narrative` | `regenerate_narrative` | Yes | - | 5/min | `api.analysis.regenerateNarrative` | Active |
| GET | `/api/analysis/scenarios/{scenario_id}/comps` | `get_scenario_comps` | Yes | - | No | `api.analysis.getComps` | Active |
| POST | `/api/analysis/calculate` | `calculate` | Yes | - | 60/min | `api.analysis.calculate` | Active |
| POST | `/api/analysis/reverse-calculate` | `reverse_calculate` | Yes | - | 30/min | `api.analysis.reverseCalculate` | Active |
| POST | `/api/analysis/compare` | `compare_strategies` | Yes | - | No | `api.analysis.compare` | Active |

### Onboarding (/api/onboarding)

| Method | Path | Function | Auth | Tier | Rate Limited | Frontend Caller | Status |
|--------|------|----------|------|------|-------------|-----------------|--------|
| POST | `/api/onboarding/persona` | `set_persona` | Yes | - | 5/min | `api.onboarding.setPersona` | Active |
| GET | `/api/onboarding/status` | `onboarding_status` | Yes | - | No | `api.onboarding.status` | Active |
| DELETE | `/api/onboarding/sample-data` | `clear_sample_data` | Yes | - | No | `api.onboarding.clearSampleData` | Active |

### Properties (/api/properties)

| Method | Path | Function | Auth | Tier | Rate Limited | Frontend Caller | Status |
|--------|------|----------|------|------|-------------|-----------------|--------|
| GET | `/api/properties/` | `list_properties` | Yes | - | No | `api.properties.list` | Active |
| GET | `/api/properties/{property_id}` | `get_property` | Yes | - | No | `api.properties.get` | Active |
| PATCH | `/api/properties/{property_id}` | `update_property` | Yes | - | No | `api.properties.update` | Active |
| DELETE | `/api/properties/{property_id}` | `delete_property` | Yes | - | No | `api.properties.delete` | Active |
| GET | `/api/properties/{property_id}/activity` | `get_property_activity` | Yes | - | No | `api.properties.activity` | Active |
| GET | `/api/properties/{property_id}/scenarios` | `list_scenarios` | Yes | - | No | `api.properties.scenarios` | Active |
| POST | `/api/properties/{property_id}/scenarios` | `create_scenario` | Yes | - | 10/min | `api.properties.createScenario` | Active |

### Activity (/api/activity)

| Method | Path | Function | Auth | Tier | Rate Limited | Frontend Caller | Status |
|--------|------|----------|------|------|-------------|-----------------|--------|
| GET | `/api/activity/recent` | `recent_activity` | Yes | - | No | `api.recentActivity.list` | Active |

### Contacts (/api/contacts)

| Method | Path | Function | Auth | Tier | Rate Limited | Frontend Caller | Status |
|--------|------|----------|------|------|-------------|-----------------|--------|
| GET | `/api/contacts` | `list_contacts` | Yes | - | No | `api.contacts.list` | Active |
| GET | `/api/contacts/{contact_id}` | `get_contact` | Yes | - | No | `api.contacts.get` | Active |
| POST | `/api/contacts` | `create_contact` | Yes | - | No | `api.contacts.create` | Active |
| PATCH | `/api/contacts/{contact_id}` | `update_contact` | Yes | - | No | `api.contacts.update` | Active |
| DELETE | `/api/contacts/{contact_id}` | `delete_contact` | Yes | - | No | `api.contacts.delete` | Active |
| GET | `/api/contacts/{contact_id}/communications` | `list_communications` | Yes | - | No | `api.contacts.communications` | Active |
| POST | `/api/contacts/{contact_id}/communications` | `create_communication` | Yes | - | No | `api.contacts.logCommunication` | Active |
| GET | `/api/contacts/{contact_id}/deals` | `list_linked_deals` | Yes | - | No | `api.contacts.deals` | Active |
| POST | `/api/contacts/{contact_id}/deals/{deal_id}` | `link_deal` | Yes | - | No | `api.contacts.linkDeal` | Active |
| DELETE | `/api/contacts/{contact_id}/deals/{deal_id}` | `unlink_deal` | Yes | - | No | `api.contacts.unlinkDeal` | Active |

### Today (/api/today)

| Method | Path | Function | Auth | Tier | Rate Limited | Frontend Caller | Status |
|--------|------|----------|------|------|-------------|-----------------|--------|
| GET | `/api/today/` | `get_today` | Yes | - | No | `api.today.get` | Active |

### Tasks (/api/tasks)

| Method | Path | Function | Auth | Tier | Rate Limited | Frontend Caller | Status |
|--------|------|----------|------|------|-------------|-----------------|--------|
| GET | `/api/tasks` | `list_tasks` | Yes | - | No | `api.tasks.list` | Active |
| GET | `/api/tasks/today` | `tasks_today` | Yes | - | No | `api.tasks.today` | Active |
| GET | `/api/tasks/{task_id}` | `get_task` | Yes | - | No | `api.tasks.get` | Active |
| POST | `/api/tasks` | `create_task` | Yes | - | No | `api.tasks.create` | Active |
| PATCH | `/api/tasks/{task_id}` | `update_task` | Yes | - | No | `api.tasks.update` | Active |
| DELETE | `/api/tasks/{task_id}` | `delete_task` | Yes | - | No | `api.tasks.delete` | Active |
| POST | `/api/tasks/{task_id}/complete` | `complete_task` | Yes | - | No | `api.tasks.complete` | Active |
| POST | `/api/tasks/{task_id}/snooze` | `snooze_task` | Yes | - | No | `api.tasks.snooze` | Active |

### Reports (/api/reports)

| Method | Path | Function | Auth | Tier | Rate Limited | Frontend Caller | Status |
|--------|------|----------|------|------|-------------|-----------------|--------|
| POST | `/api/reports/` | `create_report` | Yes | - | No | `api.reports.create` | Active |
| GET | `/api/reports` | `list_reports` | Yes | - | No | `api.reports.list` | Active |
| GET | `/api/reports/{report_id}` | `get_report` | Yes | - | No | `api.reports.get` | Active |
| PATCH | `/api/reports/{report_id}` | `update_report` | Yes | - | No | `api.reports.update` | Active |
| DELETE | `/api/reports/{report_id}` | `delete_report` | Yes | - | No | `api.reports.delete` | Active |
| POST | `/api/reports/{report_id}/pdf` | `trigger_pdf_generation` | Yes | Feature: pdf_export | No | `api.reports.triggerPdf` | Active |
| GET | `/api/reports/{report_id}/pdf/status` | `pdf_status` | Yes | - | No | `api.reports.pdfStatus` | Active |
| GET | `/api/reports/share/{share_token}` | `get_shared_report` | **No** | - | 60/min | `api.reports.getShared` | Active |
| POST | `/api/reports/share/{share_token}/view` | `log_view_engagement` | **No** | - | 10/min | `api.reports.logView` | Active |

### Financing (/api/financing)

| Method | Path | Function | Auth | Tier | Rate Limited | Frontend Caller | Status |
|--------|------|----------|------|------|-------------|-----------------|--------|
| GET | `/api/financing/instruments` | `list_instruments` | Yes | - | No | `api.financing.instruments.list` | Active |
| GET | `/api/financing/instruments/{instrument_id}` | `get_instrument` | Yes | - | No | `api.financing.instruments.get` | Active |
| POST | `/api/financing/instruments` | `create_instrument` | Yes | - | No | `api.financing.instruments.create` | Active |
| PATCH | `/api/financing/instruments/{instrument_id}` | `update_instrument` | Yes | - | No | `api.financing.instruments.update` | Active |
| DELETE | `/api/financing/instruments/{instrument_id}` | `delete_instrument` | Yes | - | No | `api.financing.instruments.delete` | Active |
| GET | `/api/financing/obligations` | `list_obligations` | Yes | - | No | `api.financing.obligations.list` | Active |
| GET | `/api/financing/obligations/upcoming` | `upcoming_obligations` | Yes | - | No | `api.financing.obligations.upcoming` | Active |
| PATCH | `/api/financing/obligations/{obligation_id}` | `update_obligation` | Yes | - | No | `api.financing.obligations.update` | Active |
| POST | `/api/financing/obligations/{obligation_id}/complete` | `complete_obligation` | Yes | - | No | `api.financing.obligations.complete` | Active |
| GET | `/api/financing/payments` | `list_payments` | Yes | - | No | `api.financing.payments.list` | Active |
| POST | `/api/financing/payments` | `create_payment` | Yes | - | No | `api.financing.payments.create` | Active |
| GET | `/api/financing/payments/summary` | `payment_summary` | Yes | - | No | `api.financing.payments.summary` | Active |
| GET | `/api/financing/dashboard` | `financing_dashboard` | Yes | - | No | `api.financing.dashboard` | Active |

### Transactions (/api/transactions)

| Method | Path | Function | Auth | Tier | Rate Limited | Frontend Caller | Status |
|--------|------|----------|------|------|-------------|-----------------|--------|
| GET | `/api/transactions` | `list_transactions` | Yes | - | No | `api.transactions.list` | Active |
| POST | `/api/transactions` | `create_transaction` | Yes | - | No | `api.transactions.create` | Active |
| PATCH | `/api/transactions/{transaction_id}` | `update_transaction` | Yes | - | No | `api.transactions.update` | Active |
| DELETE | `/api/transactions/{transaction_id}` | `delete_transaction` | Yes | - | No | `api.transactions.delete` | Active |
| GET | `/api/transactions/summary` | `transaction_summary` | Yes | - | No | `api.transactions.summary` | Active |
| POST | `/api/transactions/bulk` | `bulk_create_transactions` | Yes | - | No | `api.transactions.bulkCreate` | Active |

### Rehab (/api/rehab)

| Method | Path | Function | Auth | Tier | Rate Limited | Frontend Caller | Status |
|--------|------|----------|------|------|-------------|-----------------|--------|
| GET | `/api/rehab/projects` | `list_projects` | Yes | - | No | `api.rehab.projects.list` | Active |
| GET | `/api/rehab/projects/{project_id}` | `get_project` | Yes | - | No | `api.rehab.projects.get` | Active |
| POST | `/api/rehab/projects` | `create_project` | Yes | - | No | `api.rehab.projects.create` | Active |
| PATCH | `/api/rehab/projects/{project_id}` | `update_project` | Yes | - | No | `api.rehab.projects.update` | Active |
| DELETE | `/api/rehab/projects/{project_id}` | `delete_project` | Yes | - | No | `api.rehab.projects.delete` | Active |
| GET | `/api/rehab/projects/{project_id}/summary` | `project_summary` | Yes | - | No | `api.rehab.projects.summary` | Active |
| POST | `/api/rehab/projects/{project_id}/items` | `create_item` | Yes | - | No | `api.rehab.items.create` | Active |
| PATCH | `/api/rehab/projects/{project_id}/items/{item_id}` | `update_item` | Yes | - | No | `api.rehab.items.update` | Active |
| DELETE | `/api/rehab/projects/{project_id}/items/{item_id}` | `delete_item` | Yes | - | No | `api.rehab.items.delete` | Active |
| POST | `/api/rehab/projects/{project_id}/items/bulk` | `bulk_create_items` | Yes | - | No | `api.rehab.items.bulkCreate` | Active |

### Portfolio V2 (/api/portfolio)

| Method | Path | Function | Auth | Tier | Rate Limited | Frontend Caller | Status |
|--------|------|----------|------|------|-------------|-----------------|--------|
| GET | `/api/portfolio/overview` | `portfolio_overview` | Yes | - | No | `api.portfolioV2.overview` | Active |

### Buyers (/api/buyers)

| Method | Path | Function | Auth | Tier | Rate Limited | Frontend Caller | Status |
|--------|------|----------|------|------|-------------|-----------------|--------|
| GET | `/api/buyers` | `list_buyers` | Yes | - | No | `api.buyers.list` | Active |
| GET | `/api/buyers/{contact_id}` | `get_buyer` | Yes | - | No | `api.buyers.get` | Active |
| POST | `/api/buyers/quick-add` | `quick_add_buyer` | Yes | - | No | `api.buyers.quickAdd` | Active |
| GET | `/api/buyers/{contact_id}/matches` | `buyer_matches` | Yes | - | No | `api.buyers.matches` | Active |
| POST | `/api/buyers/{contact_id}/buy-boxes` | `create_buy_box` | Yes | - | No | `api.buyers.buyBoxes.create` | Active |
| PATCH | `/api/buyers/{contact_id}/buy-boxes/{box_id}` | `update_buy_box` | Yes | - | No | `api.buyers.buyBoxes.update` | Active |
| DELETE | `/api/buyers/{contact_id}/buy-boxes/{box_id}` | `delete_buy_box` | Yes | - | No | `api.buyers.buyBoxes.delete` | Active |

### Dispositions (/api/dispositions)

| Method | Path | Function | Auth | Tier | Rate Limited | Frontend Caller | Status |
|--------|------|----------|------|------|-------------|-----------------|--------|
| GET | `/api/dispositions/matches/property/{property_id}` | `matches_for_property` | Yes | - | No | `api.dispositions.matchProperty` | Active |
| GET | `/api/dispositions/matches/buyer/{contact_id}` | `matches_for_buyer` | Yes | - | No | `api.dispositions.matchBuyer` | Active |
| POST | `/api/dispositions/match-preview` | `match_preview` | Yes | - | No | `api.dispositions.matchPreview` | Active |
| POST | `/api/dispositions/packets` | `create_packet` | Yes | - | No | `api.dispositions.packets.create` | Active |
| GET | `/api/dispositions/packets` | `list_packets` | Yes | - | No | `api.dispositions.packets.list` | Active |
| GET | `/api/dispositions/packets/share/{share_token}` | `view_shared_packet` | **No** | - | No | `api.dispositions.sharedPacket` | Active |
| POST | `/api/dispositions/packets/{packet_id}/send` | `send_packet` | Yes | - | No | `api.dispositions.packets.send` | Active |

### Communications (/api/communications)

| Method | Path | Function | Auth | Tier | Rate Limited | Frontend Caller | Status |
|--------|------|----------|------|------|-------------|-----------------|--------|
| POST | `/api/communications/send-sms` | `send_sms` | Yes | - | 60/hour | `api.communications.sendSMS` | Active |
| POST | `/api/communications/send-email` | `send_email` | Yes | - | 200/hour | `api.communications.sendEmail` | Active |
| GET | `/api/communications/thread/{contact_id}` | `get_thread` | Yes | - | No | `api.communications.thread` | Active |

### Sequences (/api/sequences)

| Method | Path | Function | Auth | Tier | Rate Limited | Frontend Caller | Status |
|--------|------|----------|------|------|-------------|-----------------|--------|
| GET | `/api/sequences/` | `list_sequences` | Yes | - | No | `api.sequences.list` | Active |
| GET | `/api/sequences/{seq_id}` | `get_sequence` | Yes | - | No | `api.sequences.get` | Active |
| POST | `/api/sequences/` | `create_sequence` | Yes | - | No | `api.sequences.create` | Active |
| PATCH | `/api/sequences/{seq_id}` | `update_sequence` | Yes | - | No | `api.sequences.update` | Active |
| DELETE | `/api/sequences/{seq_id}` | `delete_sequence` | Yes | - | No | `api.sequences.delete` | Active |
| POST | `/api/sequences/{seq_id}/steps` | `add_step` | Yes | - | No | `api.sequences.steps.add` | Active |
| PATCH | `/api/sequences/{seq_id}/steps/{step_id}` | `update_step` | Yes | - | No | `api.sequences.steps.update` | Active |
| DELETE | `/api/sequences/{seq_id}/steps/{step_id}` | `delete_step` | Yes | - | No | `api.sequences.steps.delete` | Active |
| POST | `/api/sequences/{seq_id}/enroll` | `enroll_contact` | Yes | - | No | `api.sequences.enroll` | Active |
| POST | `/api/sequences/{seq_id}/enroll-bulk` | `bulk_enroll` | Yes | - | No | `api.sequences.enrollBulk` | Active |
| DELETE | `/api/sequences/{seq_id}/enrollments/{enrollment_id}` | `stop_enrollment` | Yes | - | No | `api.sequences.stopEnrollment` | Active |
| GET | `/api/sequences/{seq_id}/enrollments` | `list_enrollments` | Yes | - | No | `api.sequences.enrollments` | Active |
| GET | `/api/sequences/{seq_id}/analytics` | `get_analytics` | Yes | - | No | `api.sequences.analytics` | Active |

### Internal Sequences (/api/internal)

| Method | Path | Function | Auth | Tier | Rate Limited | Frontend Caller | Status |
|--------|------|----------|------|------|-------------|-----------------|--------|
| POST | `/api/internal/process-sequences` | `process_sequences` | X-Internal-Key header | - | No | - | Dead (cron only) |

### Skip Tracing (/api/skip-tracing)

| Method | Path | Function | Auth | Tier | Rate Limited | Frontend Caller | Status |
|--------|------|----------|------|------|-------------|-----------------|--------|
| POST | `/api/skip-tracing/trace` | `trace_single` | Yes | Quota: skip_traces_per_month | 30/hour | `api.skipTracing.trace` | Active |
| POST | `/api/skip-tracing/trace-batch` | `trace_batch` | Yes | Quota: skip_traces_per_month | 5/hour | `api.skipTracing.traceBatch` | Active |
| GET | `/api/skip-tracing/batch/{batch_id}/status` | `batch_status` | Yes | - | No | `api.skipTracing.batchStatus` | Active |
| GET | `/api/skip-tracing/history` | `list_traces` | Yes | - | No | `api.skipTracing.history` | Active |
| GET | `/api/skip-tracing/usage` | `get_usage` | Yes | - | No | `api.skipTracing.usage` | Active |
| GET | `/api/skip-tracing/{trace_id}` | `get_trace` | Yes | - | No | `api.skipTracing.get` | Active |
| POST | `/api/skip-tracing/{trace_id}/create-contact` | `create_contact_from_trace` | Yes | - | No | `api.skipTracing.createContact` | Active |

### Mail Campaigns (/api/mail-campaigns)

| Method | Path | Function | Auth | Tier | Rate Limited | Frontend Caller | Status |
|--------|------|----------|------|------|-------------|-----------------|--------|
| POST | `/api/mail-campaigns/` | `create_campaign` | Yes | Tier gate (Business) | No | `api.mailCampaigns.create` | Active |
| GET | `/api/mail-campaigns/` | `list_campaigns` | Yes | - | No | `api.mailCampaigns.list` | Active |
| GET | `/api/mail-campaigns/{campaign_id}` | `get_campaign` | Yes | - | No | `api.mailCampaigns.get` | Active |
| PATCH | `/api/mail-campaigns/{campaign_id}` | `update_campaign` | Yes | - | No | `api.mailCampaigns.update` | Active |
| DELETE | `/api/mail-campaigns/{campaign_id}` | `delete_campaign` | Yes | - | No | `api.mailCampaigns.delete` | Active |
| POST | `/api/mail-campaigns/{campaign_id}/recipients` | `add_recipients` | Yes | - | No | `api.mailCampaigns.addRecipients` | Active |
| DELETE | `/api/mail-campaigns/{campaign_id}/recipients/{recipient_id}` | `remove_recipient` | Yes | - | No | `api.mailCampaigns.removeRecipient` | Active |
| POST | `/api/mail-campaigns/{campaign_id}/verify` | `verify_addresses` | Yes | Tier gate (Business) | 10/hour | `api.mailCampaigns.verify` | Active |
| POST | `/api/mail-campaigns/{campaign_id}/send` | `send_campaign` | Yes | Quota: mail_pieces_per_month | 10/hour | `api.mailCampaigns.send` | Active |
| POST | `/api/mail-campaigns/{campaign_id}/cancel` | `cancel_campaign` | Yes | - | No | `api.mailCampaigns.cancel` | Active |
| GET | `/api/mail-campaigns/{campaign_id}/preview` | `preview_campaign` | Yes | - | No | `api.mailCampaigns.preview` | Active |
| GET | `/api/mail-campaigns/{campaign_id}/analytics` | `get_analytics` | Yes | - | No | `api.mailCampaigns.analytics` | Active |
| POST | `/api/mail-campaigns/quick-send` | `quick_send` | Yes | Quota: mail_pieces_per_month | 20/hour | `api.mailCampaigns.quickSend` | Active |

### Service Status (/api)

| Method | Path | Function | Auth | Tier | Rate Limited | Frontend Caller | Status |
|--------|------|----------|------|------|-------------|-----------------|--------|
| GET | `/api/service-status` | `service_status` | **No** | - | No | `api.serviceStatus` | Active |

### Webhooks — Stripe (/webhooks)

| Method | Path | Function | Auth | Tier | Rate Limited | Frontend Caller | Status |
|--------|------|----------|------|------|-------------|-----------------|--------|
| POST | `/webhooks/stripe` | `stripe_webhook` | Stripe signature | - | 120/min | - (external) | Active |

### Webhooks — Clerk (/webhooks)

| Method | Path | Function | Auth | Tier | Rate Limited | Frontend Caller | Status |
|--------|------|----------|------|------|-------------|-----------------|--------|
| POST | `/webhooks/clerk` | `clerk_webhook` | Svix signature | - | No | - (external) | Active |

### Webhooks — Communications (/api/webhooks/communications)

| Method | Path | Function | Auth | Tier | Rate Limited | Frontend Caller | Status |
|--------|------|----------|------|------|-------------|-----------------|--------|
| POST | `/api/webhooks/communications/twilio/incoming` | `twilio_incoming` | Twilio signature | - | No | - (external) | Active |
| POST | `/api/webhooks/communications/twilio/status` | `twilio_status` | Twilio signature | - | No | - (external) | Active |
| POST | `/api/webhooks/communications/sendgrid/incoming/{webhook_token}` | `sendgrid_incoming` | Token in URL | - | No | - (external) | Active |
| POST | `/api/webhooks/communications/sendgrid/events/{webhook_token}` | `sendgrid_events` | Token + Signature | - | No | - (external) | Active |

---

## Dead Endpoints

Backend routes with no detected frontend caller:

| # | Method | Path | Function | Notes |
|---|--------|------|----------|-------|
| 1 | GET | `/health/worker` | `worker_health` | Infrastructure endpoint, not called by frontend. Used for ops monitoring. |
| 2 | GET | `/` | `root` | Root status endpoint. Not called by frontend. |
| 3 | GET | `/api/v1/settings/brand-kit/` | `get_brand_kit` | Backend exists, no frontend API client method. Reports use `brand_kit` from user data but never call this endpoint directly. |
| 4 | PATCH | `/api/v1/settings/brand-kit/` | `update_brand_kit` | Same as above. No frontend caller or UI to edit brand kit. |
| 5 | GET | `/api/v1/auth/me/` | `get_profile` | Duplicate of `/api/v1/auth/me` with trailing slash. Frontend uses the non-slash version. Both resolve to user data. |
| 6 | POST | `/api/internal/process-sequences` | `process_sequences` | Internal cron endpoint. Called by Railway scheduled jobs, never by frontend. Expected to be dead from FE perspective. |
| 7 | POST | `/webhooks/stripe` | `stripe_webhook` | External webhook. Not called by frontend (called by Stripe). |
| 8 | POST | `/webhooks/clerk` | `clerk_webhook` | External webhook. Not called by frontend (called by Clerk). |
| 9 | POST | `/api/webhooks/communications/twilio/incoming` | `twilio_incoming` | External webhook. |
| 10 | POST | `/api/webhooks/communications/twilio/status` | `twilio_status` | External webhook. |
| 11 | POST | `/api/webhooks/communications/sendgrid/incoming/{token}` | `sendgrid_incoming` | External webhook. |
| 12 | POST | `/api/webhooks/communications/sendgrid/events/{token}` | `sendgrid_events` | External webhook. |

**Truly unused from a product perspective:** Only #3 and #4 (brand-kit endpoints) represent dead feature code. The rest are infrastructure, cron, or external webhook endpoints that are expected to have no frontend caller.

## Broken Frontend Calls

**None found.** Every `api.*` method in `frontend/src/lib/api.ts` maps to a defined backend endpoint. The two additional SSE streaming calls (chat via `chat-stream.ts` and analysis via `AnalyzePage.tsx`) also map to valid backend routes.

## Observations

### Prefix Inconsistency
The API has two prefix patterns:
- **`/api/v1/`** — Used by the original "core" routers: auth, dashboard, deals, pipeline, portfolio, chat, documents, settings, billing.
- **`/api/`** — Used by all newer routers: analysis, onboarding, properties, activity, contacts, today, tasks, reports, financing, transactions, rehab, portfolio_v2, buyers, dispositions, communications, sequences, skip_tracing, mail_campaigns, service_status.

This means the platform has 9 routers under `/api/v1/` and 23 routers under `/api/`. The frontend handles this correctly (all paths are hardcoded in `api.ts`) but it creates a non-uniform API surface.

### Duplicate Portfolio Endpoints
There are two portfolio systems:
- **Portfolio V1** (`/api/v1/portfolio/`) — Deal-based, requires PRO tier. Returns entries from `portfolio_entries` table.
- **Portfolio V2** (`/api/portfolio/overview`) — Property-centric, auto-computed from owned properties. No tier gate.

Both are called from the frontend. V1 is used by the legacy deals-based portfolio page; V2 powers the newer dashboard portfolio overview.

### Trailing Slash Inconsistency
Some endpoints use trailing slashes (e.g., `/api/v1/deals/`, `/api/v1/pipeline/`), others do not (e.g., `/api/tasks`, `/api/contacts`). FastAPI handles both, but the frontend sometimes includes trailing slashes and sometimes doesn't. This works but is inconsistent.

### Auth Endpoint Duplication
`/api/v1/auth/me` (no trailing slash) and `/api/v1/auth/me/` (trailing slash) are separate endpoint registrations that return slightly different response schemas (`UserResponse` vs `UserProfileResponse`). The frontend calls the trailing-slash version for profile updates but the non-slash version for initial auth.

### Rate Limiting Coverage
- 33 endpoints have explicit rate limits via `@limiter.limit()`.
- 108 endpoints have no rate limiting beyond the global middleware.
- Most write endpoints (PATCH, POST, DELETE) for CRUD operations lack rate limits. This is acceptable for authenticated endpoints but worth noting for abuse prevention.

### Tier/Billing Gating
- **Feature gates** (`require_feature`): pipeline_enabled, ai_chat_enabled, offer_letter, pdf_export
- **Quota gates** (`require_quota`): analyses_per_month, saved_deals, ai_messages_per_month, document_uploads_per_month, skip_traces_per_month, mail_pieces_per_month
- **Tier gates** (`require_tier`): Portfolio V1 requires PRO
- **Tier checks** (manual): Mail campaigns check for Business plan mail_pieces_per_month > 0, Bricked lookups gated by bricked_lookups_per_month

### SSE Streaming Endpoints
Two endpoints use Server-Sent Events:
1. `POST /api/v1/chat/` — AI chat streaming
2. `GET /api/analysis/quick/stream` — Progressive analysis streaming (enrichment, scenario, narrative in stages)

### Brand Kit — Dead Feature
The brand-kit endpoints (`GET/PATCH /api/v1/settings/brand-kit/`) are fully implemented in the backend and the `brand_kit` JSON column exists on the User model, but there is no frontend UI to view or edit it. The brand kit data is consumed only when generating reports (injected into `report_data`), but there is no settings page for managing it.
