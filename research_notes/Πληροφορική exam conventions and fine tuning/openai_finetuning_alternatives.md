# OpenAI model customization (fine-tuning) vs alternatives for the AEPP Max ΓΛΩΣΣΑ tutor (state as of 26 Oct 2026)

**Headline finding (read first):** OpenAI is **winding down its self-serve fine-tuning platform**. Since 7 May 2026, organizations that had never run fine-tuning cannot create fine-tuning jobs at all. Since 2 July 2026, organizations with no fine-tuned-model inference in the past 60 days are also blocked. All remaining customers lose job creation on 6 Jan 2027. The only RFT base model (o4-mini) was shut down on 23 Oct 2026. The GPT-4.1 / 4.1-mini SFT bases shut down on 14 Jan 2027, before the 2 June 2027 exam. The OpenAI **Evals platform** also goes read-only on 31 Oct 2026 and shuts down on 30 Nov 2026. So the question "would SFT make solutions better?" is mostly settled by availability. Unless the AEPP Max OpenAI org already ran fine-tuning and still runs fine-tuned inference, it cannot fine-tune on OpenAI at all. Even an eligible org could only fine-tune old GPT-4.1-family models that disappear before the exam.

Note on sources: OpenAI's docs moved from platform.openai.com/docs to developers.openai.com/api/docs (301 redirect). All OpenAI pages below were fetched on 26 Oct 2026. The model names in the current catalog (`gpt-5.6-*`, `gpt-6-*`, `gpt-6.1-*`) were read from the live pricing and deprecation pages. They are newer than my training data, so I checked them twice where possible.

## 1. Which OpenAI fine-tuning methods exist now, which models support them, and what has been deprecated?

### Takeaway
On paper there are four methods (SFT, vision, DPO, RFT), but they cover only legacy models: GPT-4.1 family, GPT-4o and o4-mini. No GPT-5-family or GPT-6-family model can be fine-tuned. The whole platform is closed to new organizations and will close to everyone on 6 Jan 2027. RFT's only base model (o4-mini) shut down on 23 Oct 2026.

### Cited Findings
- Current method/model table on OpenAI's model-optimization guide:
  - SFT: `gpt-4.1-2025-04-14`, `gpt-4.1-mini-2025-04-14`, `gpt-4.1-nano-2025-04-14`.
  - Vision fine-tuning: `gpt-4o-2024-08-06`.
  - DPO: the same three GPT-4.1 models.
  - RFT: `o4-mini-2025-04-16` ("reasoning models only").
  - [OpenAI – Model optimization](https://developers.openai.com/api/docs/guides/model-optimization)
- The same page says: "OpenAI is winding down the fine-tuning platform." "The platform is no longer accessible to new users, but existing users of the fine-tuning platform will be able to create training jobs for the coming months." "All fine-tuned models will remain available for inference until their base models are deprecated." — [OpenAI – Model optimization](https://developers.openai.com/api/docs/guides/model-optimization)
- Deprecations page, section "Update to OpenAI's self-serve fine-tuning" (developers notified 7 May 2026) — [OpenAI – Deprecations](https://developers.openai.com/api/docs/deprecations#update-to-openais-self-serve-fine-tuning):
  - 7 May 2026: "Creating fine-tuning jobs or training is not available to organizations that have not previously run fine-tuning."
  - 2 Jul 2026: job creation ends for orgs that have not run inference on a fine-tuned model in the past 60 days.
  - 6 Jan 2027: "Active existing customers will no longer be able to create new fine-tuning jobs."
  - "Inference on fine-tuned models will continue to be available until the base models are deprecated."
  - No replacement product is listed.
- Legacy snapshots notice (announced 22 Apr 2026, shutdown **23 Oct 2026**): base `o4-mini-2025-04-16` and `gpt-4.1-nano-2025-04-14`, plus their fine-tunes. Replacements: `ft-o4-mini` → `gpt-5.6-terra`; `ft-gpt-4.1-nano` → `gpt-5.6-luna`. — [OpenAI – Deprecations](https://developers.openai.com/api/docs/deprecations)
- "2026-10-14: GPT-4 series model deprecations": `gpt-4o-2024-08-06`, `gpt-4o-2024-11-20`, `gpt-4o-mini-2024-07-18`, `gpt-4.1-2025-04-14` and `gpt-4.1-mini-2025-04-14` are removed on **14 Jan 2027**, with replacement `gpt-6-luna`. "Fine-tuned versions of these models follow the same shutdown schedule as their underlying base models." — [OpenAI – Deprecations](https://developers.openai.com/api/docs/deprecations)
- The SFT guide repeats the dates: gpt-4.1-nano and its fine-tunes shut down 23 Oct 2026; gpt-4.1 and gpt-4.1-mini and their fine-tunes shut down 14 Jan 2027. Eligible existing customers can train until 6 Jan 2027 "unless the base model shuts down earlier." — [OpenAI – Supervised fine-tuning](https://developers.openai.com/api/docs/guides/supervised-fine-tuning)
- The RFT guide: "Reinforcement fine-tuning is supported on o-series reasoning models only, and currently only for o4-mini." "The platform is no longer accessible to new users." o4-mini and its fine-tunes shut down 23 Oct 2026. — [OpenAI – Reinforcement fine-tuning](https://developers.openai.com/api/docs/guides/reinforcement-fine-tuning)
- OpenAI's stated reason, quoted from a developer email reported by Tessl (20 May 2026): "Newer base models like GPT-5.5 are much better at following instructions and formats than prior models." "Prompt-based approaches are now cheaper and faster — as such, we're seeing fewer use cases that require fine-tuning." OpenAI also said it won't add new models or platform features during the wind-down. — [Tessl – OpenAI is shutting down self-serve fine-tuning](https://tessl.io/blog/openai-shutting-fine-tuning-signals-for-enterprise-ai). The email reached Tessl through a Reddit thread, not an OpenAI page, so the quote is secondary.
- An OpenAI developer forum thread (Apr 2026) notes that GPT-5-family models are not listed as fine-tunable, and that gpt-5-nano is named as a migration target, not as a fine-tuning base. — [OpenAI Community – Deprecation of fine tuned models, but still can't access newer ones?](https://community.openai.com/t/deprecation-of-fine-tuned-models-but-still-cant-access-newer-ones/1379550)

### Inferences
- If AEPP Max's OpenAI org never ran a fine-tuning job before 7 May 2026, which is likely for a project at this stage, **no OpenAI fine-tuning method is available to it**. Check the org's history in the dashboard to confirm.
- Even an eligible org could only use SFT or DPO on GPT-4.1 / 4.1-mini. Those are non-reasoning models from April 2025, and both they and any fine-tune built on them stop working on 14 Jan 2027, about five months before the 2 June 2027 Πληροφορική exam. A fine-tune would have to be retired mid-school-year.
- RFT, the method that would make the most use of our deterministic interpreter grader, is gone: its only base model shut down on 23 Oct 2026.
- OpenAI has said it will add no new fine-tunable models, so do not expect GPT-5.x or GPT-6 fine-tuning on OpenAI's self-serve platform.

### Gaps
- I could not tell whether OpenAI offers managed or enterprise fine-tuning (for example through sales) to replace self-serve. The deprecation notice lists no replacement. I found no official page about an enterprise programme.
- No DPO- or vision-specific deprecation beyond the base-model shutdowns above.

## 2. Pricing (training and inference), dataset sizes and JSONL formats, including tool calls

### Takeaway
SFT training costs $25 per 1M training tokens on gpt-4.1, $5 on 4.1-mini and $1.50 on 4.1-nano. Fine-tuned inference costs about 1.5× the base price. RFT on o4-mini cost $100 per training hour. OpenAI recommends starting with about 50 good examples (minimum 10) for SFT and "several dozen to a few hundred" for RFT. Tool calls can appear in SFT training data. Current base models are cheaper per token than the fine-tunable old ones.

### Cited Findings
- Fine-tuning prices, Standard tier, per 1M tokens — [OpenAI – Pricing](https://developers.openai.com/api/docs/pricing):

  | Model | Training | Inference in / out / cached in |
  | --- | --- | --- |
  | `gpt-4.1-2025-04-14` | $25.00 | $3.00 / $12.00 / $0.75 |
  | `gpt-4.1-mini-2025-04-14` | $5.00 | $0.80 / $3.20 / $0.20 |
  | `gpt-4.1-nano-2025-04-14` | $1.50 | $0.20 / $0.80 / $0.05 |
  | `gpt-4o-2024-08-06` | $25.00 | $3.75 / $15.00 / $1.875 |
  | `o4-mini-2025-04-16` (RFT) | **$100 / hour** | $4.00 / $16.00 / $1.00 |

  With data sharing, o4-mini inference is $2 / $8 / $0.50. Model-grader tokens used during RFT are billed at the grader model's normal per-token rate.
- Current base models for comparison, per 1M tokens, short context (≤272K), in / out / cached in — [OpenAI – Pricing](https://developers.openai.com/api/docs/pricing):
  - `gpt-6.1-sol`: $2 / $10 / $0.10
  - `gpt-6.1-terra`: $1 / $5 / $0.05
  - `gpt-6-luna`: $0.10 / $0.50 / $0.01
  - `gpt-6-sol`: $2 / $10 / $0.20
  - `gpt-5.6-sol`: $4 / $20 / $0.40
  - `gpt-5.6-terra`: $2 / $12 / $0.20
  - `gpt-5.6-luna`: $0.20 / $1.20 / $0.02
  - `gpt-5.5`: $5 / $30 / $0.50
  - `gpt-5.4`: $2.50 / $15 / $0.25
  - `gpt-6-astra`: $10 / $50 / $1.00
- RFT billing is "based on the amount of time spent training," covering core training time only (not data validation, queueing or safety checks), plus token usage. — [OpenAI – Reinforcement fine-tuning](https://developers.openai.com/api/docs/guides/reinforcement-fine-tuning)
- SFT dataset sizes: "The minimum number of examples you can provide for fine-tuning is 10." Improvements typically show up at 50–100 examples. "We recommend starting with 50 well-crafted demonstrations and evaluating the results." If 50 examples have no effect, rethink the task or prompt before adding more data. — [OpenAI – Supervised fine-tuning](https://developers.openai.com/api/docs/guides/supervised-fine-tuning)
- SFT format — [OpenAI – Supervised fine-tuning](https://developers.openai.com/api/docs/guides/supervised-fine-tuning):
  - JSONL in the Chat Completions message format, one example per line, at least 10 lines.
  - For tool calls, each line has a `messages` array whose assistant message holds `tool_calls` (`id`, `type`, and `function` with `name` and JSON-string `arguments`), a top-level `tools` array with the function schemas, and `"parallel_tool_calls": false`.
  - A checkpoint is saved per epoch, but only the last three are kept. The example job shows `n_epochs: 10`.
- RFT format: JSONL where "Each line … will contain a `messages` array" plus any extra fields the grader needs (for example reference answers or test cases). Uploaded with purpose `fine-tune`. "Start small—between several dozen and a few hundred examples." Maximum 50,000 training examples and 1,000 test examples. Training files must pass automated safety screening. For tool-calling models, each data point must list the available tools, and the grader scores the tool calls. — [OpenAI – Reinforcement fine-tuning](https://developers.openai.com/api/docs/guides/reinforcement-fine-tuning)

### Inferences
- At these prices a ΓΛΩΣΣΑ SFT run would be cheap. For example, 500 examples × 3k tokens × 3 epochs ≈ 4.5M training tokens, about $112 on gpt-4.1 or about $22 on 4.1-mini (my arithmetic, not an OpenAI figure). Cost is not the blocker; availability and model age are.
- The current small models (`gpt-6-luna`, `gpt-5.6-luna`) cost less per token at inference than a fine-tuned gpt-4.1-mini, so fine-tuning does not save money either.

### Gaps
- The SFT guide I fetched has no multi-turn example and does not mention the per-assistant-message `weight` key or per-example token limits. Older OpenAI docs (from memory, not re-verified today) supported `weight: 0/1` on assistant messages in multi-turn examples.
- I did not find DPO pricing on the page separately from SFT. Older docs priced DPO like SFT per token (from memory, not verified).

## 3. Do fine-tuned models work with the Responses API, tools, reasoning, store=False / encrypted reasoning, and the Agents SDK?

### Takeaway
Yes for the Responses API and function tools: a fine-tuned `ft:` id is used like a base model id. But the SFT/DPO bases (GPT-4.1 family) are non-reasoning models, so our encrypted-reasoning and reasoning-effort settings do not apply. Those models are also far behind today's GPT-5.6 and GPT-6 bases. The Agents SDK takes a model-name string, though its docs do not mention `ft:` ids.

### Cited Findings
- SFT: a finished job returns a `fine_tuned_model` id starting with `ft:`. You use it "in the Responses API or Chat Completions API, just as you would a base model." The guide's Responses API example passes function `tools` with `tool_choice: "auto"`. — [OpenAI – Supervised fine-tuning](https://developers.openai.com/api/docs/guides/supervised-fine-tuning)
- RFT models can be used "in either the Responses or Chat Completions API." — [OpenAI – Reinforcement fine-tuning](https://developers.openai.com/api/docs/guides/reinforcement-fine-tuning)
- Agents SDK — [OpenAI Agents SDK – Models](https://openai.github.io/openai-agents-python/models/):
  - Models are picked by string (`model="gpt-5.6-sol"`), by `RunConfig(model=...)`, by `OPENAI_DEFAULT_MODEL`, or with a `Model` object (`OpenAIResponsesModel` recommended).
  - With no model set, the default is `gpt-5.6-luna` with `reasoning.effort="none"`.
  - With `store=False`, request `reasoning.encrypted_content` and pass those reasoning items back in the next turn.
  - Non-GPT-5 model names fall back to generic `ModelSettings`.
  - The page does not mention `ft:` ids.
- The SFT/DPO bases are the GPT-4.1 family, and RFT was "reasoning models only" (o4-mini). — [OpenAI – Model optimization](https://developers.openai.com/api/docs/guides/model-optimization)

### Inferences
- An SFT'd `ft:gpt-4.1-mini-…` id would probably work as `OPENAI_MODEL` in our `tutor.py`, since the SDK forwards the string to the Responses API. But the current `ModelSettings` (reasoning effort, `include=["reasoning.encrypted_content"]`) would have to be dropped or would be ignored, because GPT-4.1 is not a reasoning model. We would lose reasoning, which helps multi-step code writing.
- The deprecation notice names `gpt-6-luna` as the replacement for GPT-4.1. That is a sign that OpenAI considers even its cheapest current model at least as good as GPT-4.1, so a fine-tuned GPT-4.1 would very likely score lower on our task than the current base models with a good prompt. This is an inference; test it with our own evals if it matters.

### Gaps
- I did not verify on a live call that `openai-agents` 0.24 accepts an `ft:` id. It is very likely, but not documented on the models page.

## 4. RFT specifics: python graders, sandbox limits, cost, eligibility

### Takeaway
RFT's python grader could in principle have run our pure-Python ΓΛΩΣΣΑ interpreter: it runs uploaded code under 256 kB, with no network, 2 minutes, 2 GB RAM and 2 CPU cores. But RFT is now unusable for us: it only ever supported o4-mini, which shut down on 23 Oct 2026, and it is closed to new organizations. The graders feature is also being deprecated along with Evals.

### Cited Findings
- Grader types — [OpenAI – Graders](https://developers.openai.com/api/docs/guides/graders):
  - `string_check`: `eq`, `neq`, `like`, `ilike`; returns 0 or 1.
  - `text_similarity`: `fuzzy_match`, `bleu`, `gleu`, `meteor`, `rouge-*`, and `cosine` (evals only).
  - `score_model`: an LLM returns a numeric score within a range.
  - `python`: a function `grade(sample, item)` that returns a float. An exception or invalid float scores 0.
  - `multi`: combines sub-graders with a `calculate_output` formula, "only used for Reinforcement fine-tuning," and cannot be nested.
- Python grader limits: "Your uploaded code must be less than `256kB`." No network access. "The grading execution itself is limited to 2 minutes." 2 GB memory, 1 GB disk, 2 CPU cores (throttled above that). Packages are pinned to image tag `2025-05-08` (numpy 2.2.4, scipy 1.15.2, pandas 2.2.3, rdkit, and NLTK corpora). — [OpenAI – Graders](https://developers.openai.com/api/docs/guides/graders)
- The Graders page also says graders are being deprecated as part of the evals and fine-tuning workflows. — [OpenAI – Graders](https://developers.openai.com/api/docs/guides/graders)
- Python graders run "in a remote sandbox." Costly grader code slows the job. Metrics include `python_grader_server_error_mean` and `python_grader_runtime_error_mean`. — [OpenAI – Reinforcement fine-tuning](https://developers.openai.com/api/docs/guides/reinforcement-fine-tuning)
- Cost was $100 per training hour on o4-mini, billed by "the amount of time spent training." — [OpenAI – Pricing](https://developers.openai.com/api/docs/pricing); [OpenAI – Reinforcement fine-tuning](https://developers.openai.com/api/docs/guides/reinforcement-fine-tuning)
- Eligibility: "The platform is no longer accessible to new users." "Eligible existing customers can create training jobs until January 6, 2027, unless the base model shuts down earlier." The base model has already shut down (23 Oct 2026). — [OpenAI – Reinforcement fine-tuning](https://developers.openai.com/api/docs/guides/reinforcement-fine-tuning); [OpenAI – Deprecations](https://developers.openai.com/api/docs/deprecations)

### Inferences
- Our interpreter (`backend/app/glossa/`, pure Python, no web or DB imports) would likely fit the 256 kB and no-network limits, if bundled into one file. That makes it a good grader design: run the candidate on test inputs and compare with the expected output, plus a static `check()` pass. Today this design only helps with **our own evals**, or with RL fine-tuning on a non-OpenAI provider or open-weights model (Section 6).

### Gaps
- No public per-hour cost or tooling for any RFT successor at OpenAI; none is announced.

## 5. What OpenAI and practitioners recommend before fine-tuning, and eval tooling with a code-running grader

### Takeaway
OpenAI's own guidance is evals first, then prompt engineering, and fine-tuning only if needed. Its May 2026 wind-down note says that prompt-based approaches on new models now cover most use cases. The hosted Evals platform shuts down on 30 Nov 2026, so AEPP Max should build its own eval harness around the interpreter. Datasets, OpenAI's lighter dashboard tool with Python graders, has no deprecation notice of its own.

### Cited Findings
- OpenAI recommends writing evals first; you "might even consider writing evals _before_ you start writing prompts." "The prompt engineering process may be all you need in order to get great results for your use case." Fine-tuning is presented as an addition to prompting, useful for more examples than fit in context, shorter prompts, or a smaller and cheaper model. — [OpenAI – Model optimization](https://developers.openai.com/api/docs/guides/model-optimization)
- OpenAI's stated rationale for the wind-down: newer base models follow instructions and formats much better, and "Prompt-based approaches are now cheaper and faster." — [Tessl](https://tessl.io/blog/openai-shutting-fine-tuning-signals-for-enterprise-ai) (quoting the OpenAI email; secondary source)
- Practitioner views (Tessl, May 2026): Rinat Abdullin says fine-tuning and vector RAG "do work, but are too expensive, risky and time consuming". Laurie Voss (Arize) calls the move a "strong signal that fine-tuning isn't what the average AI engineer wants to do." — [Tessl](https://tessl.io/blog/openai-shutting-fine-tuning-signals-for-enterprise-ai)
- OpenAI's eval workflow has five steps: define the objective, collect a dataset, define metrics, run and compare, then evaluate continuously. "Evaluate early and often. Write scoped tests at every stage." — [OpenAI – Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
- "OpenAI is deprecating the Evals platform." "Evals will become read-only for existing users on October 31, 2026"; "the platform is scheduled to shut down on November 30, 2026." OpenAI suggests "consider trying Datasets instead." — [OpenAI – Working with evals](https://developers.openai.com/api/docs/guides/evals)
- Datasets is "a quick way to get started with evals and test prompts."
  - You build a dataset (manually or from CSV), run a saved prompt on it, annotate the outputs, and apply graders: string check, text similarity, score model, label model, and "Python code execution."
  - Tools such as web search or MCP can be attached to the prompt.
  - The page has no deprecation notice for Datasets itself.
  - Source: [OpenAI – Getting started with datasets](https://developers.openai.com/api/docs/guides/evaluation-getting-started)
- A third-party guide (qaskills.sh, Jul 2026) says graders are part of the transition and that the migration path is Promptfoo. I could not verify this on an OpenAI page. — [qaskills.sh – OpenAI evals platform shutdown migration 2026](https://qaskills.sh/blog/openai-evals-platform-shutdown-migration-2026)

### Inferences
These are concrete alternatives for AEPP Max, ordered by expected value.
1. **Build a local eval harness now. It is the prerequisite for everything else.**
   - Each case is a task, a set of test inputs (ΔΙΑΒΑΣΕ values) and the expected output.
   - Each case is run through `/agent/chat` (or the Agents SDK directly) in Agent mode. The written program is graded with `glossa.check()` (no syntax or static errors) plus `glossa.run()` on hidden test inputs (output must match).
   - Track pass@1, the number of tool calls and tokens.
   - It can live in `backend/tests/` or a script, so it needs no hosted Evals (which shuts down on 30 Nov 2026). Promptfoo or Langfuse could host it, but a pytest-style script is enough.
2. **Prompt or context engineering:**
   - Put a condensed ΓΛΩΣΣΑ reference (from `docs/glossa.md`) and textbook conventions into the system prompt, along with several curated few-shot solutions in exam style. These solutions target the "more examples than fit in context" gap that fine-tuning would fill.
   - Static parts must come first so prompt caching applies. Cached input on current models costs $0.01–$0.40 per 1M tokens ([Pricing](https://developers.openai.com/api/docs/pricing)), so a large static reference is cheap.
3. **Use the deterministic tools in the loop:**
   - Tell the agent to always `run_program` or `check` before `write_code`, and to fix any errors the interpreter reports. Optionally, the backend could reject a `write_code` whose code fails `glossa.check()` and return the error to the model, a cheap self-repair loop.
   - This uses the same grader at inference time that RFT would have used at training time.
4. **Compare models with the harness:** `gpt-6.1-sol`, `gpt-6.1-terra`, `gpt-6-luna`, `gpt-5.6-*`, at different reasoning efforts, and pick by pass rate per cost.
5. **Retrieval:** a full RAG system is probably unnecessary, since the ΓΛΩΣΣΑ spec is small enough to fit in a cached prompt. A tool that returns curated textbook-style examples by topic would be a light-weight option.

### Gaps
- No official OpenAI successor to hosted Evals beyond "Datasets" was found. It is unclear whether Datasets' Python graders run in the same sandbox, or whether Datasets can grade agent tool calls or multi-turn runs.

## 6. How other providers compare (brief)

### Takeaway
Google Vertex AI still offers managed supervised tuning (and lists RL and preference tuning pages) on current Gemini models, including Gemini 3.5 Flash. Anthropic's only confirmed Claude fine-tuning is Claude 3 Haiku on Amazon Bedrock (GA Nov 2024); I found no confirmation of fine-tuning for current Claude models. Open-weights LoRA/QLoRA is the other route.

### Cited Findings
- Vertex AI supervised fine-tuning lists "Gemini 3.5 Flash-Lite", "Gemini 3.5 Flash", "Gemini 3.1 Flash-Lite", "Gemini 2.5 Pro", "Gemini 2.5 Flash-Lite" and "Gemini 2.5 Flash". Maximum training data is 10M text examples or a 1 GB JSONL file. The docs nav also has pages for reinforcement-learning fine-tuning, preference tuning and "Tune function calling". The page was updated 2026-10-26. — [Google Cloud – Gemini supervised tuning](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini-supervised-tuning)
- Anthropic announced general availability of Claude 3 Haiku fine-tuning in Amazon Bedrock (Nov 2024). — [Claude – Fine-tune Claude 3 Haiku in Amazon Bedrock](https://claude.com/resources/articles/fine-tune-claude-3-haiku)
- Bedrock's document history lists a reinforcement fine-tuning feature (3 Dec 2025) without saying which models it covers. Claude Opus 4.6 and Sonnet 4.6 came to Bedrock in Feb 2026, with no mention of fine-tuning. — [AWS Bedrock doc history](https://docs.aws.amazon.com/bedrock/latest/userguide/doc-history.md); [AWS What's New – Claude Opus 4.6 on Bedrock](https://aws.amazon.com/cn/about-aws/whats-new/2026/2/claude-opus-4.6-available-amazon-bedrock/)
- Tessl notes that managed fine-tuning remains available on Gemini via Vertex AI and on Claude via Bedrock, and that open-source LoRA/QLoRA is unaffected. — [Tessl](https://tessl.io/blog/openai-shutting-fine-tuning-signals-for-enterprise-ai)

### Inferences
- Moving to Gemini tuning (or open weights) just to fine-tune would mean rewriting the agent stack (the OpenAI Agents SDK, the Responses API, encrypted reasoning). That only makes sense if the local eval harness shows that prompting the best current OpenAI model clearly fails on ΓΛΩΣΣΑ fidelity.
- If RL with our interpreter grader is ever wanted, Vertex RL tuning or open-weights RL (for example GRPO-style training on a small open model) are the remaining options.

### Gaps
- The Bedrock supported-models page did not render, so I could not confirm whether any current Claude model, or the Bedrock RFT feature, supports Claude fine-tuning as of Oct 2026.
- I did not verify whether tuned Gemini models keep function calling, beyond the "Tune function calling" page title, or what Vertex tuning costs.
