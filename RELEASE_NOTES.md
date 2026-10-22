# EquiCouncil frontend beta — Release notes

## Delivered
- Responsive React + Vite wallet-connected dashboard
- Existing Studio Devnet chain and frozen contract binding
- Session discovery, lookup, participant detail, round/weights/allocation
- Create, join, update preference, lock, evaluate, ratify, reject, revise, finalize write flows
- Explicit transaction-fee review, chain switch, finalized receipt checking, duplicate-submission safety lock
- Five unit tests for validation/state-machine gating, plus automated static JSX syntax check

## Not claimed
- No deployed frontend URL yet
- No Mac/Vite production bundle or live wallet smoke-test verified yet
- No complete three-wallet browser integration certification yet
- No changes to already-certified contract, no contract redeploy, no blockchain write

## Required before publication
1. `npm install && npm run check` on the Mac
2. Verify read of `session:1` and wallet network switching on chain 61997
3. Fund an independent test wallet; complete one write and successful finalization
4. Then deploy the Vite `dist` build to Vercel

## SHA note
The frontend ZIP SHA-256 and file manifest are supplied alongside the download. Preserve the package for reproducibility.
