# EquiCouncil — Consensus-Certified Multi-Agent Negotiation

**Public functional beta:** https://equicouncil.vercel.app  
**Network:** GenLayer Studio Devnet (chain ID 61997)  
**Existing Intelligent Contract:** `0xc948f6411C3D3CF10C8fF9927E0932B2d8d3b438`

EquiCouncil lets three independent wallets negotiate the allocation of a bounded pool of indivisible resources. Participants enter min/max limits and natural-language urgency preferences. GenLayer AI consensus classifies bounded urgency weights; deterministic allocation logic conserves resource units and respects bounds. All three wallets must ratify a proposal before a participant can finalize it.

## Verified evidence

A controlled nine-transaction Devnet lifecycle finished `RATIFIED` with three approvals for `session:1`. The finalizing transaction was `0xcac7d826794b2f1d414d73a80a64f2d8dc32addef8ebf7c02d2d3a62fddff4c7`.

R88 offline audit of saved evidence passed, including 63 checked RPC responses for step 9. Public evidence SHA-256: `b208f136b538719b3ed6c9be49a5a142ccc0c728355aee31d0fb2247ff251f42`. The reviewer's R89 public-only archive is at `evidence/EquiCouncil_Public_Reviewer_Bundle_R89.zip`.

The contract source in `contracts/equicouncil.py` matches frozen R9 SHA-256 `d91aad72a540d5ec2e4c995383585200a1663fec6a355460d2da87f75136e8f3`. The deployed contract was not changed or redeployed for the frontend.

## Run

```sh
npm ci
npm audit
npm run check
npm run dev
```

The frontend uses `genlayer-js@2.0.0-rc.1` and Vite `6.4.5`. Use a wallet configured for Studio Devnet 61997. The wallet must explicitly approve any write, and writes incur GEN fees. Read-only views never substitute for actual signed writes.

## Important scope and limitations

- **Beta on a development preview chain**, not mainnet. Devnet chain data may reset.
- The nine-write finalized **contract** lifecycle is certified, and frontend unit tests, local builds, npm audits and the user's browser wallet / session checks passed. A complete **new frontend-driven three-wallet write lifecycle** has not been independently certified. Do not describe the frontend as fully externally audited.
- The contract records consensus-certified allocation agreements; it **does not transfer or escrow physical resources or tokens**.
- Preserved historical exceptions: A nonce 36 remains unidentified, and A nonce 45 lacks a separate independent finality record. The original step-8 post-state was independently reconciled as PROPOSED with 3 approvals, before step-9 RATIFIED.
- The frontend contains no custody logic or private keys. Do not publish `.env.local`, `.vercel/`, private execution journals, secret keys, or unfiltered RPC dumps.
