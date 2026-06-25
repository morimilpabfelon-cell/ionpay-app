# ionPAY Agent Training Workspace

This folder defines how the UI/UX Execution Agent and observing agents should learn the ionPAY product system.

It adapts the structure of the external `how-to-train-your-gpt` reference: progressive chapters, component explainers, full-system walkthroughs and glossary discipline.

## Purpose

The goal is not to train a machine learning model.

The goal is to train the operational agent system so every agent understands:

- what ionPAY is;
- what the UI/UX agent owns;
- what design-only means;
- what cannot be implemented without gates;
- how the design system maps to modules and devices;
- how financial states must be represented safely.

## Training structure

1. Overview.
2. Product surface map.
3. Device matrix.
4. Component system.
5. Payment state language.
6. Receipt and proof language.
7. Merchant mode.
8. Error, pending, loading and empty states.
9. Handoff to implementation.
10. Glossary.

## Rule

Agents may read this material.

Only the UI/UX Execution Agent should author design-training content unless the founder or Agent Orchestrator explicitly routes another agent.
