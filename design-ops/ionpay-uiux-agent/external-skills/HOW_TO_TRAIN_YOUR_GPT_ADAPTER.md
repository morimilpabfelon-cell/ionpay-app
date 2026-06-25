# External Reference Adapter — How to Train Your GPT

## Source

Repository:

```text
https://github.com/raiyanyahya/how-to-train-your-gpt
```

Source project: How to Train Your GPT by Raiyan Yahya.

License: MIT.

## Why this is used

This repository teaches how a GPT-style language model is built from scratch. For ionPAY, the value is not to train a production LLM now.

The useful value is its educational and structural approach:

- sequential chapters;
- clear mental models;
- component-by-component explanations;
- runnable examples;
- topic explainers;
- full-system walkthroughs;
- glossary and architecture notes;
- every line explained with what and why.

## ionPAY adaptation

ionPAY uses this as a reference for training operational agents and building project memory, not as a model-training dependency.

Adapted principles:

1. Teach agents step by step.
2. Split complex systems into chapters/modules.
3. Explain what each part does and why it exists.
4. Maintain runnable or inspectable examples where useful.
5. Keep glossaries and handoffs close to the work.
6. Use progressive learning: overview -> components -> full flow -> validation.
7. Track what is design-only, implementation-ready, blocked or safety-gated.

## Not adopted

This PR does not adopt:

- GPT model training code;
- PyTorch runtime;
- datasets;
- tokenizer code;
- model weights;
- ML infrastructure;
- production AI features.

## ionPAY usage boundary

This reference is used only to improve:

- agent training documentation;
- design system learning structure;
- handoff clarity;
- module-by-module product reasoning;
- future onboarding of agents or contributors.

It does not touch app runtime, backend, ledger, wallet, Android or payment execution.

## Status

Adopted as external learning/reference layer for agent-memory structure.

Not installed as dependency.

Not used as production AI model code.
