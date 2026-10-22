# EquiCouncil frontend beta — Release notes

## Delivered
- Responsive React + Vite wallet-connected dashboard
- Existing Studio Devnet chain and frozen contract binding
- Session discovery, lookup, participant detail, round/weights/allocation
- Create, join, update preference, lock, evaluate, ratify, reject, revise, finalize write flows
- Explicit transaction-fee review, chain switch, finalized receipt checking, duplicate-submission safety lock
- Five unit tests for validation/state-machine gating, plus automated static JSX syntax check

## Public release — October 22, 2026
- Live app: https://equicouncil.vercel.app
- GitHub: https://github.com/Manablaq/equicouncil-genlayer
- Production Vercel deployment verified READY.
- R91: Vite 6.4.5, five tests passed, build passed, zero npm vulnerabilities.
- Browser dashboard, session reads, and wallet connection user-confirmed.
- The original Intelligent Contract and certified 9/9 lifecycle are unchanged.

## Remaining limitations
- No new transaction through the public frontend has been independently verified; this test was deliberately skipped for submission.
- The complete frontend-driven three-wallet journey has not been certified.
- This is a Studio Devnet beta, not a mainnet or third-party security-audited release.

## SHA note
The frontend ZIP SHA-256 and file manifest are supplied alongside the download. Preserve the package for reproducibility.
