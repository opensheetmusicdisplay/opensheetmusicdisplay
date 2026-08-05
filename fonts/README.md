# OSMD default font profile

The self-contained OSMD bundle embeds the following SIL Open Font License faces. The same files are included here so downstream users can inspect or host the exact profile themselves.

| File | Use | SHA-256 |
| --- | --- | --- |
| `Bravura.woff2` | Complete notation font | `5c25278c208ca455dc7c3c0c95d833e134aca6d740a023767af50d0dfa06ef82` |
| `BravuraText-subset.woff2` | Music-text and chord-symbol glyphs | `decc88d7998aab4f0e63d12f31954877b444df6e0f6cfae3ee83d8002be1f280` |
| `Academico-Regular.woff2` | Regular score text | `de7138b2f0252192169329f52130535899e5e7ca54b5f162d1073288cfe91761` |
| `Academico-Italic.woff2` | Italic score text and lyrics | `d42f0c08c489ca020c5a387eb8548bdbf1de4d3738ffef4cdfea596294c8d81b` |
| `Academico-Bold.woff2` | Bold score text | `09811b2099ac96c43231943292d9d459b9b8e7d9b057b45410606554721cd88b` |

The Bravura Text subset contains:

```text
U+0020 U+002D U+003D U+266D-U+266F U+E030-U+E031 U+E040-U+E041
U+E047-U+E048 U+E050 U+E062 U+E1D2-U+E1DA U+E260-U+E262
U+E4A0 U+E4A2 U+E4A4 U+E4E4-U+E4E7 U+E520 U+E522
U+E52B-U+E52D U+E52F U+E870-U+E874 U+E87B-U+E87C
U+ED60-U+ED66 U+1D12A-U+1D12B
```

That range includes every Bravura Text code point referenced by OSMD's current source, plus the established notation-text compatibility set. Bravura itself is deliberately not subsetted: VexFlow may select notation glyphs indirectly through its tables, so retaining the complete face avoids a brittle source-code-only glyph audit.

Licences are supplied as `LICENSE-Bravura.txt`, `LICENSE-BravuraText.txt`, and `LICENSE-Academico.txt`.
