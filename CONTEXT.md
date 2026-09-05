# Context: Date Night Roulette

A two-person app for choosing which restaurant to go to on Friday date nights.

## Ubiquitous language

This glossary is the naming contract for the code. If a concept here is renamed,
rename it everywhere.

### Restaurant

A place we might go. Created once from a Google Maps link, and effectively
permanent — deletion exists but is rare and deliberate (a place that shut down,
or one we never want to see again).

A Restaurant carries a name, a cuisine, and an optional note. Nothing else.

### The Pool

The set of Restaurants currently eligible to be spun.

The Pool is a *query*, not a stored list: it is every Restaurant that is not
Benched. Every spin draws uniformly from the entire Pool — there is no filtering
and no weighting.

### Benched

Deliberately excluded from the Pool. Reversible, and only ever reversed by hand.

Benching is about **eligibility**, not about history. A Restaurant becomes Benched
when we go there, or when we say "not tonight". It returns to the Pool only when
one of us explicitly restores it.

> **Not a synonym for "archived" or "deleted".** The original brief used
> *archive* for both eligibility and history; that word is deliberately absent
> from this codebase because it hid the distinction below.

### Visit

A record that we actually went to a Restaurant, on a date.

Visits are **orthogonal to the Pool**. A Restaurant may be Benched with zero
Visits (it looked great, we never got there), or sit in the Pool having been
Visited three times (a favourite we restored).

### Spin

One act of spinning, carrying an outcome:

- `went` — we went. Creates a Visit, and Benches the Restaurant.
- `skipped` — we didn't. Creates no Visit.

Spins are kept as events, not discarded after the animation. They are what turns
the app from a list with a shuffle button into a record of our Fridays.

There is no *session* or *date night* entity. An evening is derived by grouping
Spins by date. Where a re-spin needs to avoid repeating what it just showed, that
exclusion lives in client state for the evening and is never persisted.
