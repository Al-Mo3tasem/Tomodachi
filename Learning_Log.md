# Tomodachi — Learning Log

> Decision-and-knowledge artifact for the project lead's skill growth.
>
> | | |
> |---|---|
> | **Purpose** | Capture the technologies, libraries, frameworks, and decisions introduced during the project — explained so the project lead develops real understanding, not just "vibe coding" instincts. |
> | **Scope** | Tech intros, alternatives considered, why-we-picked-this, key concepts, tradeoffs accepted. **Not** function-by-function code reproducibility (that's the Master Plan + code itself). |
> | **Mandatory entries** | Every task that introduces a new library/framework/service or makes a non-obvious decision. See `PROJECT_RULES.md` §21.2 for the bar. |
> | **Optional entries** | Pure code tasks (typo fixes, adding one more seed item) — no entry needed. |
> | **Visibility** | TRACKED in repo. |

---

## Index

*(Entries listed newest first. None yet — this log begins populating when Phase R1 starts.)*

---

## Entry template (copy this when writing a new entry)

```markdown
## [Phase X, Task Y.NN] — Task Name
**Date:** YYYY-MM-DD
**Contributor:** Claude / Codex / Project Lead

### Technology / Library Introduced
- **Name** — One-line summary. What problem it solves. Where it sits in our stack.
- **Version locked at:** (e.g., `i18next@23.11.5`)

### What it actually does (plain language)
2-4 sentences explaining the library/framework/service in plain language, in the context of how *we* use it. Avoid jargon without definition.

### Alternatives considered
- **Option A** — what it does, why we didn't pick it (cost, complexity, missing feature, learning curve, regional support, etc.)
- **Option B** — same
- **Option chosen** — and the deciding factor.

### Concepts to understand
- **Term** — Plain-language definition in our project's context. Repeat for each concept that matters.

### Tradeoffs accepted
What we gave up by this choice, in case we ever need to revisit it. Be honest.

### Useful resources
- Official docs link
- One excellent tutorial or blog if relevant
- Anything the project lead should read to go deeper
```

---

## Entries

*(Entries appear below this line, newest first.)*

---

## Future Considerations & Deferred Improvements

> Ideas, optimizations, and improvements that are intentionally deferred to a later version. Items belong here when:
> - The improvement is real and worth doing eventually, but is out of scope for the current task or phase
> - A constraint (time, resources, available data, missing dependency) prevented the better solution
> - A simpler approach was chosen now with awareness that something more sophisticated may be needed later
>
> When implemented, mark resolved in place (do not delete) and reference the task entry where it was addressed.

### Item template

```markdown
- **Tag:** `[Phase X, Task Y]` or `[General]`
  **Date added:** YYYY-MM-DD
  **Description:** Plain-language description of the improvement.
  **Why deferred:** Time / resources / scope / dependency / other.
  **Impact if done:** What gets better when this is eventually addressed.
  **Status:** OPEN
```

### Open items

*(None yet.)*
