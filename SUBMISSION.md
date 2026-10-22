# EquiCouncil — Submission Summary

**Application:** https://equicouncil.vercel.app  
**Source:** https://github.com/Manablaq/equicouncil-genlayer
**Network:** GenLayer Studio Devnet, chain 61997  
**Contract:** `0xc948f6411C3D3CF10C8fF9927E0932B2d8d3b438`

EquiCouncil is a functional beta dApp for three-party resource negotiation using GenLayer Intelligent Contracts. Each participant sets bounded resource needs and describes their urgency. Validator-checked nondeterministic AI assigns bounded urgency weights, while on-chain deterministic rules compute a fair feasible allocation and enforce unanimous ratification before finalization.

The deployed contract completed a nine-step live lifecycle culminating in `RATIFIED` with 3/3 approvals. The finalization transaction is `0xcac7d826794b2f1d414d73a80a64f2d8dc32addef8ebf7c02d2d3a62fddff4c7`. The R88/R89 reviewer evidence archive documents finality, reproducible hashes, and historical exceptions.

The frontend is wallet-connected and implements real reads, fee review, transaction signing requests, and finality tracking on Studio Devnet. Five frontend unit tests, production build, full npm audit, and the user's browser checks passed. The complete frontend-driven write journey across three fresh wallets has not been independently tested; this is a Studio Devnet beta and not a third-party security-audited mainnet product.

**Reviewer evidence:** `evidence/EquiCouncil_Public_Reviewer_Bundle_R89.zip` (SHA-256 `ea0eb823b9987654f30c9b73b3063af292b8ded57c13b22cb0fef17a77298cf7`).
