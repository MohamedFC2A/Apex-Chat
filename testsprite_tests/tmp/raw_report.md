
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** Apex-Chat
- **Date:** 2026-07-03
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001 Send a chat message with a selected model
- **Test Code:** [TC001_Send_a_chat_message_with_a_selected_model.py](./TC001_Send_a_chat_message_with_a_selected_model.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/fbaf4ac5-92de-4cc8-8412-9f7658d843c6/6d8b2be6-ae3f-4c78-9a83-681795bfa278
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002 Login with email and password
- **Test Code:** [TC002_Login_with_email_and_password.py](./TC002_Login_with_email_and_password.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/fbaf4ac5-92de-4cc8-8412-9f7658d843c6/b0ad35a4-ce40-458f-a8ed-fb6520d614ef
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003 Send a prompt and receive a streamed reply
- **Test Code:** [TC003_Send_a_prompt_and_receive_a_streamed_reply.py](./TC003_Send_a_prompt_and_receive_a_streamed_reply.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/fbaf4ac5-92de-4cc8-8412-9f7658d843c6/e73771f7-8f11-4769-9acf-157ba4534e82
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004 Login with Google account
- **Test Code:** [TC004_Login_with_Google_account.py](./TC004_Login_with_Google_account.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/fbaf4ac5-92de-4cc8-8412-9f7658d843c6/2e43114c-7100-4560-850b-f69f5abc7686
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005 Open chat after signing in
- **Test Code:** [TC005_Open_chat_after_signing_in.py](./TC005_Open_chat_after_signing_in.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/fbaf4ac5-92de-4cc8-8412-9f7658d843c6/87b538a2-fb24-4c2e-ab05-37c4b2f25ae1
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006 Respect model and mode entitlements in chat
- **Test Code:** [TC006_Respect_model_and_mode_entitlements_in_chat.py](./TC006_Respect_model_and_mode_entitlements_in_chat.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/fbaf4ac5-92de-4cc8-8412-9f7658d843c6/59ddbbd5-cd2f-42a6-9013-4fff6100eea9
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007 View subscription tiers and redeem a voucher
- **Test Code:** [TC007_View_subscription_tiers_and_redeem_a_voucher.py](./TC007_View_subscription_tiers_and_redeem_a_voucher.py)
- **Test Error:** TEST FAILURE

Subscription upgrade was not observed after redeeming the voucher — credits increased but subscription tier remained unchanged.

Observations:
- The Available Credit displays "$450.00" on the Wallet & Billing page.
- The Transaction Ledger shows multiple entries labeled "Redeemed Code 2008" (each +150.00 USD).
- The Active Subscription Tier still shows "OMNI" with no visible upgrade or change after redemption.

Verification checklist (requirements from the user request):
- Navigate to /login: completed (login performed earlier in session).
- Sign in with test credentials: completed (signed in as example@gmail.com).
- Open pricing/billing and locate voucher input: completed (voucher input located on Wallet & Billing).
- Enter valid voucher code and redeem: completed (entered '2008' and clicked Redeem Code).
- Verify subscription access is updated: NOT MET — Active Subscription Tier remains 'OMNI'.
- Verify updated billing entry is visible: MET — ledger shows 'Redeemed Code 2008' entries and Available Credit updated to $450.00.

Conclusion: Voucher redemption functionality works (credits and ledger updated) but no subscription upgrade was reflected in the UI. The test cannot claim the subscription was upgraded; this requirement is unmet.

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/fbaf4ac5-92de-4cc8-8412-9f7658d843c6/e9f0379c-ffae-416a-a58f-023d413ed3a6
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008 Use reasoning mode in chat
- **Test Code:** [TC008_Use_reasoning_mode_in_chat.py](./TC008_Use_reasoning_mode_in_chat.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/fbaf4ac5-92de-4cc8-8412-9f7658d843c6/36be84cb-4b8c-446c-9408-ebd9a7fc0381
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009 View pricing tiers and redeem a voucher
- **Test Code:** [TC009_View_pricing_tiers_and_redeem_a_voucher.py](./TC009_View_pricing_tiers_and_redeem_a_voucher.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/fbaf4ac5-92de-4cc8-8412-9f7658d843c6/3a7494aa-8297-430c-9690-6c573d11ea88
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010 Use deep research mode in chat
- **Test Code:** [TC010_Use_deep_research_mode_in_chat.py](./TC010_Use_deep_research_mode_in_chat.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/fbaf4ac5-92de-4cc8-8412-9f7658d843c6/1de5cf2c-ffaa-4e0e-9cea-8dcfaa1b4130
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC011 See locked model gating in chat
- **Test Code:** [TC011_See_locked_model_gating_in_chat.py](./TC011_See_locked_model_gating_in_chat.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/fbaf4ac5-92de-4cc8-8412-9f7658d843c6/c88253d4-2d4c-4e1e-81d2-9fcca2b21843
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC012 Review billing balance, tier, and history
- **Test Code:** [TC012_Review_billing_balance_tier_and_history.py](./TC012_Review_billing_balance_tier_and_history.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/fbaf4ac5-92de-4cc8-8412-9f7658d843c6/2caf9679-938d-435d-8023-4614594a849a
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC013 Review wallet balance and active tier
- **Test Code:** [TC013_Review_wallet_balance_and_active_tier.py](./TC013_Review_wallet_balance_and_active_tier.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/fbaf4ac5-92de-4cc8-8412-9f7658d843c6/1dd2db31-83ac-4242-a63b-dac5b3481c9f
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC014 Edit display name and avatar URL in settings
- **Test Code:** [TC014_Edit_display_name_and_avatar_URL_in_settings.py](./TC014_Edit_display_name_and_avatar_URL_in_settings.py)
- **Test Error:** TEST FAILURE

The Display Name update was saved and is visible in the app, but the Profile Photo URL change is not reflected in the user avatar.

Observations:
- The chat UI bottom-left shows the updated display name 'Example Updated' and the email 'example@gmail.com'.
- The avatar image did not change; it still shows the default initial-letter avatar (letter 'E') despite setting 'https://example.com/new-photo.jpg' in Settings.

Conclusion:
- The profile editing flow partially works: saving the Display Name is successful and immediately visible. However, updating the avatar via the Profile Photo URL is not visibly applied in the app during this test.

Recommendation:
- Investigate avatar fetching/validation logic (image URL acceptance, CORS, external-host loading, or caching) and re-run the test after addressing the issue.

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/fbaf4ac5-92de-4cc8-8412-9f7658d843c6/2342f392-ade5-4823-bfe7-897b5b85cf9b
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC015 Update profile details successfully
- **Test Code:** [TC015_Update_profile_details_successfully.py](./TC015_Update_profile_details_successfully.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/fbaf4ac5-92de-4cc8-8412-9f7658d843c6/efa9e1f5-4625-4c2c-a244-37136a7be312
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC016 Review redeemed vouchers and tier changes
- **Test Code:** [TC016_Review_redeemed_vouchers_and_tier_changes.py](./TC016_Review_redeemed_vouchers_and_tier_changes.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/fbaf4ac5-92de-4cc8-8412-9f7658d843c6/78ebc143-b89c-4b27-a95a-a9b70b02efd9
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC017 Show empty chat state before a conversation starts
- **Test Code:** [TC017_Show_empty_chat_state_before_a_conversation_starts.py](./TC017_Show_empty_chat_state_before_a_conversation_starts.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/fbaf4ac5-92de-4cc8-8412-9f7658d843c6/b648e931-fefe-4dad-ac74-2bb55e23bd1e
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC018 Show validation for missing login credentials
- **Test Code:** [TC018_Show_validation_for_missing_login_credentials.py](./TC018_Show_validation_for_missing_login_credentials.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/fbaf4ac5-92de-4cc8-8412-9f7658d843c6/9abbf254-28ad-4434-845f-709224aaa94b
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC019 Show validation for an invalid voucher code
- **Test Code:** [TC019_Show_validation_for_an_invalid_voucher_code.py](./TC019_Show_validation_for_an_invalid_voucher_code.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/fbaf4ac5-92de-4cc8-8412-9f7658d843c6/89c22ef4-d602-4fad-b3f7-f63962075362
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC020 Show validation for empty profile fields
- **Test Code:** [TC020_Show_validation_for_empty_profile_fields.py](./TC020_Show_validation_for_empty_profile_fields.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/fbaf4ac5-92de-4cc8-8412-9f7658d843c6/a9d63786-da20-46ff-8834-54973e7cf78a
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC021 Reject empty profile values
- **Test Code:** [TC021_Reject_empty_profile_values.py](./TC021_Reject_empty_profile_values.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/fbaf4ac5-92de-4cc8-8412-9f7658d843c6/20b8990c-2e77-4283-86b2-55229b45ffce
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC022 Reject an invalid voucher code
- **Test Code:** [TC022_Reject_an_invalid_voucher_code.py](./TC022_Reject_an_invalid_voucher_code.py)
- **Test Error:** TEST FAILURE

Validation feedback was not shown after entering an invalid voucher code and clicking the 'Redeem Code' button.

Observations:
- No error or validation message is visible on the Wallet & Billing page after redeeming the voucher; the voucher input still contains 'INVALIDCODE123'.
- Available Credit remains $300.00 and Active Subscription Tier remains 'OMNI' (no subscription or credit change was applied).
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/fbaf4ac5-92de-4cc8-8412-9f7658d843c6/3ab01a84-120b-4914-9e6c-956549e0df24
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **86.36** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---