# VexFlow 5 patch-disposition ledger

## VexFlow prerequisites

| Change | Review unit | OSMD use |
| --- | --- | --- |
| Positioned articulation origins | [VexFlow #322](https://github.com/vexflow/vexflow/pull/322) | Final, note-specific articulation geometry |
| Formatter layout padding | [VexFlow #324](https://github.com/vexflow/vexflow/pull/324) | Hard notation and lyric clearances |
| Finalized notation geometry | [VexFlow #325](https://github.com/vexflow/vexflow/pull/325) | Exact notehead, stem, beam, and articulation bounds |
| Tuplet rerender stability | [VexFlow #326](https://github.com/vexflow/vexflow/pull/326) | Idempotent second render |
| Grace-note slur geometry | [VexFlow #327](https://github.com/vexflow/vexflow/pull/327) | Beam-aware grace slur routing |
| Immutable draft integration | `e9ae567e1e25d75075d8c4fae4fd8119cd6b0b08` | The combined, clean-install-verified temporary CI dependency; not a substitute for the review units above |

## Original draft branch

The published four-commit draft is archived at `archive/upstream-prep-20260805/feature-port-to-vexflow-5`.

| Original commit | Disposition in the restack |
| --- | --- |
| `03cfd097` Port vendored OSMD to modern VexFlow | Replaced by the restacked migration commits plus the accepted renderer refinements that make the substitution usable. |
| `dba382cd` Load modern VexFlow without bundled fonts | Replaced by the adapter and typed dual-bundle font contract. The default is now self-contained; only the explicitly named core build is fontless. |
| `d64804da` Remove dead notation font overrides | Split so archive removal and inactive font-override removal remain separately reviewable. |
| `66504642` Finalize VexFlow 5 port branch wiring and API seams | Dropped. Its branch-specific build signature is replaced by reproducible build, font, test, and migration documentation. |

## `VexFlowPatch` audit

The old archive, including its generated legacy font table, is not retained as an inactive fallback. Behavior still required by OSMD is represented by modern VexFlow APIs, focused OSMD code, or explicit tests. In particular, the migration covers formatting padding, final notation geometry, note-specific articulations, tuplets, ties, grace notes, and rerender stability. Unused patch-only overrides are removed instead of being silently carried forward.

## Diagnostics

The structured diagnostics and browser comparison workflow are retained because they make renderer changes reviewable; they are not a second production renderer.

After the restack is committed, reproduce the range comparison with:

```bash
git range-diff \
  upstream/develop...archive/upstream-prep-20260805/feature-port-to-vexflow-5 \
  upstream/develop...feature/port-to-vexflow-5-restack
```
