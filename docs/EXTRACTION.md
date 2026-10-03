# Extraction verification

This repository is an independent extraction of the live Software Project Valuation Calculator's tested Phase 1.1 engine. The production implementation remains in the original application and is not replaced by this package. There is no runtime synchronization, network dependency or automatic update between them.

## Preserved source

The five core modules are byte-for-byte copies. Their SHA-256 hashes at extraction are:

| File | SHA-256 |
| --- | --- |
| `src/calculate.ts` | `09ACA7CDCDD99E734833E939FE37A2047CABE4A58FC19491E09BED51532F1CC1` |
| `src/confidence.ts` | `359EE9F6A0E47F18F9B93D0B1ACCD47A63770D602FBD3B5D2E1A58DEE1FFA066` |
| `src/constants.ts` | `AB91EEF62A4CEF6D8FE09367D5D006D775F9D5B98B29BEAF96A417A20CE74514` |
| `src/explanations.ts` | `CEDD3E800E8933D0704BA55EC82FE23D153B1DCC4DCDA5375FD62D6486A0BB3D` |
| `src/types.ts` | `38B5AF6621C1EAABEEFEE3D1E9C55EAB640D73E84BBB8C29816D06F9F80170D0` |

The original 28 tests are retained: only their three imports change to the standalone `src/` paths. Seven additional tests verify the public API, mixed revenue/history, key-person risk, confidence thresholds, rounding bands and maximum inputs. The entry point adds exports, not valuation logic.

## Comparison and validation

All five production fixtures were run through both the original TypeScript implementation and the standalone compiled JavaScript. Every returned field was deep-equal, including numeric breakdown, normalization notes, strengths, risks, explanations and confidence reasons. CommonJS and ESM consumer imports were checked.

| Fixture | Midpoint | Range | Confidence / score |
| --- | ---: | --- | --- |
| A | 21,500 | 14,000–29,500 | Low / 40 |
| B | 57,500 | 49,000–66,500 | High / 90 |
| C | 306,000 | 260,000–352,000 | High / 90 |
| D | 27,000 | 23,000–31,000 | High / 80 |
| E | 20,500 | 13,500–28,000 | Low / 40 |

Standalone installation, 35 tests, typecheck, build and the runnable example passed. There are zero runtime dependencies. Ordinary IEEE-754 floating-point values are preserved; for example scenario B business value is `49679.99999999999` before display formatting.

The extraction audit inspected source, tests, example, configuration, documentation, license, lockfile and tracked files. No credentials, private infrastructure, customer data, environment files, analytics IDs or app code are included. Lockfile URLs point to the public npm registry. Only public project/website links appear in repository metadata. `node_modules/`, `dist/`, coverage, environment files and IDE metadata are ignored; generated build output is intentional local output only.

## Publication metadata

Intended repository: `esdecode/software-project-valuation-calculator`, public, branch `main`.

- Description: `Deterministic TypeScript engine for estimating the value of SaaS, apps, plugins, and source-code projects.`
- Website: `https://esdecode.com/tools/software-project-valuation-calculator`
- Topics: `software-valuation`, `saas-valuation`, `source-code`, `project-valuation`, `valuation`, `calculator`, `typescript`, `developer-tools`, `open-source`.
- License: MIT, Copyright (c) 2026 ESDecode.

These are intended settings, not claims of completed publication. If publication is unavailable, create an empty public repository under the intended owner (without generated README/license), push the prepared `main` branch without force, and set the description/website/topics. Verify public visibility, default branch, MIT detection, rendered README links and tracked contents afterward. Do not publish this package to npm as part of this extraction.
