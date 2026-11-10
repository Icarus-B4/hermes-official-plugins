# Proofread Draft for Hermes

Proofread Draft is an independent community plugin providing Grammarly-style proofreading. It is not affiliated with or endorsed by Grammarly, Inc. It adds an icon button to the Hermes Desktop composer for AI proofreading of spelling, grammar, and punctuation. It sends the current draft to the model configured in Hermes and shows a modal preview above the composer. The draft is only changed when you select **Apply**; it is never sent as a chat message by the plugin.

The plugin interface is available in English and German. Proofreading is an explicit, one-shot action; the plugin does not continuously underline or automatically correct text. The draft limit is 6,000 characters.

Live native spellchecking requires a safe, opt-in composer SDK API. The current public SDK does not provide that capability, so this plugin deliberately does not modify the composer's DOM. The upstream proposals are [per-composer spellcheck opt-in](https://github.com/NousResearch/hermes-agent/pull/143057) and [non-prose range support](https://github.com/NousResearch/hermes-agent/issues/143975).

## Install

After a catalog entry is approved, install with `hermes plugins install proofread-draft`. This installs the plugin only; it does not require reinstalling or rebuilding Hermes Desktop. Until then, place this folder at `$HERMES_HOME/plugins/proofread-draft` (the default on Windows is `%LOCALAPPDATA%\\hermes\\plugins\\proofread-draft`) and enable it with `hermes plugins enable proofread-draft`. Restart Hermes Desktop or rescan **Capabilities → Plugins** to load the desktop contribution.

The plugin needs a Hermes version that supports desktop plugins, composer contributions, and plugin LLM access. Its model call uses the registered `proofread_draft` auxiliary task and the active Hermes model unless you configure an override in Hermes.

## Test

1. Restart Hermes Desktop or use **Capabilities → Plugins → Rescan** so it picks up the latest desktop plugin file.
2. Enter a deliberately misspelled sentence such as `Wie zeste ich dsa ampesten?`.
3. Click the Proofread Draft icon. A centered correction dialog should open after the model responds; it uses the browser's top layer so the composer cannot clip it.
4. Choose **Show original** to compare. **Discard** or `Esc` leaves the draft unchanged; **Apply** replaces the draft without sending it. The interface switches to German when the system language is German.

## Privacy

The draft is sent to the model provider configured for the `proofread_draft` auxiliary task when you click **Proofread draft**. Nothing is sent merely by typing. Review the proposed text before applying it.
