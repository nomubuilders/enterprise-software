---
name: poa-builder
description: Transforms an approved implementation plan into a detailed, executable Plan of Action (POA). Use after an implementation_plan.md has been approved by the user, BEFORE starting any code execution. Triggers when transitioning from PLANNING to EXECUTION mode on any multi-file implementation task. Produces a structured POA with checkpoints, function signatures, test cases, success criteria, and dependency chains that the checkpoint-build skill consumes.
---

# POA Builder

Transform an approved implementation plan into an executable Plan of Action.

## When to Use

After the user approves an `implementation_plan.md`, and before writing any code. This is the mandatory bridge between design and execution.

## Input

Read the approved `implementation_plan.md` from the artifact directory.

## Output

Write the POA to `.claude/skills/checkpoint-build/references/poa.md`. This is where the `checkpoint-build` skill reads it from.

Also initialize the build log at `.claude/skills/checkpoint-build/references/build_log.md`.

## POA Generation Process

### Step 1: Extract Components from Implementation Plan

Parse the implementation plan for:
- All files to create/modify/delete
- Dependencies between components
- The verification plan

### Step 2: Define Success Criteria

Create a numbered table of measurable success criteria. Each criterion must be:
- **Observable** — can be verified by running a command or opening a file
- **Binary** — either passes or fails, no ambiguity
- **Independent** — verifiable without other criteria passing first

### Step 3: Order into Checkpoints

Group related files into checkpoints. Ordering rules:
1. Pure functions and utilities first (no dependencies)
2. Services that depend on utilities second
3. API endpoints that depend on services third
4. Integration points (executor, store) fourth
5. UI changes fifth
6. End-to-end verification last

Each checkpoint must be **independently testable** — running tests after each checkpoint should pass.

### Step 4: Define Function Signatures

For each checkpoint, write the exact function signatures to implement:

```
def function_name(param: Type, ...) -> ReturnType
    """Docstring describing purpose. Pure function / has side effects."""
```

### Step 5: Write Test Cases

For each function, create a test table:

| Test name | Input | Expected output |
|-----------|-------|-----------------|
| `test_function_happy_path` | valid input | expected result |
| `test_function_edge_case` | edge input | handled gracefully |
| `test_function_error` | bad input | structured error, no crash |

Minimum test cases per function:
- 1 happy path
- 1 edge case (empty input, null, boundary)
- 1 error case (dependency down, invalid data)

### Step 6: Map Dependencies

For each checkpoint, list:
- **Requires**: which checkpoints must complete first
- **Enables**: which checkpoints this unblocks
- **Can parallel**: whether this checkpoint can run alongside another

### Step 7: Write Verification Plan

Define end-to-end verification steps matching the project's execution environment (Docker, local, CI). Include exact commands.

## POA Template

Use this structure:

```markdown
# Plan of Action: [Feature Name]

## Goal Statement
[Single sentence: what the end state looks like]

## Success Criteria
| # | Criterion | How to verify |
|---|-----------|---------------|
| 1 | ... | ... |

## Checkpoints

### Checkpoint 1: [Name]
**Component**: [layer/area]
**Files**: [NEW/MODIFY] path/to/file
**Functions**:
(function signatures with docstrings)
**Test cases**:
| Test | Input | Expected |
**Dependencies**: None | Checkpoint N

---
(repeat for each checkpoint)

## Verification Plan
1. [exact commands and expected outputs]
```

## After POA is Written

Initialize the build log:

```markdown
# Build Log — [Feature Name]
> This log is updated at every checkpoint. Read before continuing.
---
(No checkpoints completed yet)
```

Then notify the user that the POA is ready and hand off to the `checkpoint-build` skill for execution.
