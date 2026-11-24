import importlib.util
import sys
import unittest
from pathlib import Path
from unittest.mock import Mock


PLUGIN_FILE = Path(__file__).resolve().parents[1] / "__init__.py"
SPEC = importlib.util.spec_from_file_location("proofread_draft_plugin_under_test", PLUGIN_FILE)
PLUGIN = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PLUGIN)


class PluginTests(unittest.TestCase):
    def setUp(self):
        PLUGIN._get_llm = None

    def test_registers_llm_task(self):
        ctx = Mock()
        ctx.llm = Mock()

        PLUGIN.register(ctx)

        ctx.register_auxiliary_task.assert_called_once_with(
            "proofread_draft",
            display_name="Proofread Draft",
            description="Proofread spelling, grammar, and punctuation in a draft.",
        )
        self.assertTrue(callable(PLUGIN._get_llm))

    def test_proofread_uses_registered_task_and_returns_text(self):
        ctx = Mock()
        ctx.llm.complete_structured.return_value.parsed = {"corrected_text": "Korrigierter Text."}
        PLUGIN.register(ctx)

        result = PLUGIN.proofread_text("Korigierter Text.")

        self.assertEqual(result, "Korrigierter Text.")
        kwargs = ctx.llm.complete_structured.call_args.kwargs
        self.assertEqual(kwargs["task"], "proofread_draft")
        self.assertEqual(kwargs["input"], [{"type": "text", "text": "Korigierter Text."}])
        self.assertEqual(kwargs["temperature"], 0.0)
        self.assertEqual(kwargs["purpose"], "proofread_draft")

    def test_proofread_renders_selected_language(self):
        ctx = Mock()
        ctx.llm.complete_structured.return_value.parsed = {"corrected_text": "Guten Tag."}
        PLUGIN.register(ctx)

        result = PLUGIN.proofread_text("Guden Tag.", "de")

        self.assertEqual(result, "Guten Tag.")
        kwargs = ctx.llm.complete_structured.call_args.kwargs
        self.assertIn("German", kwargs["instructions"])
        self.assertEqual(kwargs["purpose"], "proofread_draft.translate")

    def test_rejects_empty_and_oversized_drafts(self):
        with self.assertRaisesRegex(ValueError, "Enter text"):
            PLUGIN.proofread_text(" \n ")
        with self.assertRaisesRegex(ValueError, "6000-character"):
            PLUGIN.proofread_text("a" * 6001)

    def test_rejects_unsupported_language(self):
        ctx = Mock()
        PLUGIN.register(ctx)

        with self.assertRaisesRegex(ValueError, "Unsupported language"):
            PLUGIN.proofread_text("Hallo.", "fr")

    def test_dashboard_endpoint_returns_proofread_text(self):
        ctx = Mock()
        ctx.llm.complete_structured.return_value.parsed = {"corrected_text": "Korrigierter Text."}
        PLUGIN.register(ctx)

        api_file = PLUGIN_FILE.parent / "dashboard" / "plugin_api.py"
        api_spec = importlib.util.spec_from_file_location("proofread_draft_api_under_test", api_file)
        api = importlib.util.module_from_spec(api_spec)
        api_spec.loader.exec_module(api)
        sys.modules["hermes_plugins.proofread_draft"] = PLUGIN
        try:
            response = api.proofread(api.ProofreadRequest(text="Draft"))
        finally:
            sys.modules.pop("hermes_plugins.proofread_draft", None)

        self.assertEqual(response, {"text": "Korrigierter Text."})

    def test_dashboard_endpoint_passes_language_to_backend(self):
        ctx = Mock()
        ctx.llm.complete_structured.return_value.parsed = {"corrected_text": "Hello."}
        PLUGIN.register(ctx)

        api_file = PLUGIN_FILE.parent / "dashboard" / "plugin_api.py"
        api_spec = importlib.util.spec_from_file_location("proofread_draft_api_lang_test", api_file)
        api = importlib.util.module_from_spec(api_spec)
        api_spec.loader.exec_module(api)
        sys.modules["hermes_plugins.proofread_draft"] = PLUGIN
        try:
            response = api.proofread(api.ProofreadRequest(text="Hallo.", language="en"))
        finally:
            sys.modules.pop("hermes_plugins.proofread_draft", None)

        self.assertEqual(response, {"text": "Hello."})
        self.assertIn("English", ctx.llm.complete_structured.call_args.kwargs["instructions"])

    def test_dashboard_endpoint_rejects_unknown_language(self):
        ctx = Mock()
        PLUGIN.register(ctx)

        api_file = PLUGIN_FILE.parent / "dashboard" / "plugin_api.py"
        api_spec = importlib.util.spec_from_file_location("proofread_draft_api_bad_lang_test", api_file)
        api = importlib.util.module_from_spec(api_spec)
        api_spec.loader.exec_module(api)
        sys.modules["hermes_plugins.proofread_draft"] = PLUGIN
        try:
            with self.assertRaises(Exception) as caught:
                api.proofread(api.ProofreadRequest(text="Hallo.", language="it"))
        finally:
            sys.modules.pop("hermes_plugins.proofread_draft", None)
        self.assertIn("Unsupported language", str(caught.exception))


if __name__ == "__main__":
    unittest.main()
