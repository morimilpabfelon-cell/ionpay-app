# 00 — ionPAY UI/UX Agent Training Overview

## What this teaches

This document teaches the agent system how to understand ionPAY UI/UX work.

ionPAY is a payment product. That means UI/UX is not decoration. It is the layer that teaches the user what money exists, what action is happening, what state is pending, and what proof exists after completion.

## Core idea

```text
Design artifact does not equal production implementation.
```

A design can show a payment success state, but production can only show success after backend truth confirms completion.

## Current design authority

The UI/UX Execution Agent owns:

- visual system;
- interaction structure;
- responsive behavior;
- component design;
- module/device matrix;
- prototype design code;
- design handoff.

The UI/UX Execution Agent does not approve:

- backend;
- ledger;
- wallet balances;
- real payment movement;
- authentication;
- production release.

## Learning path

Agents should read in order:

1. Operation center README.
2. Design authority charter.
3. Design system scope.
4. Code-driven design workflow.
5. Implementation bridge.
6. Component specs.
7. Agent training files.

## Required mental model

Every screen must answer:

1. What module is this?
2. What user action is happening?
3. What device is this for?
4. What state is visible?
5. What could be misunderstood financially?
6. What gate is needed before app implementation?

## Output standard

A good UI/UX artifact must be:

- traceable;
- responsive;
- understandable;
- reusable;
- safe against false-success;
- separated from production until gates approve it.
