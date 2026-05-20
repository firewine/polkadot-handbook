# Polkadot XCM Asset Swapper Demo

This demo satisfies the cross-chain asset swapper bounty by adding a complete
frontend demonstration, a sample Solidity contract, an example XCM payload, and
operator documentation under `demos/cross-chain-swapper`.

## What It Demonstrates

- Selecting source and destination parachains: Acala, Moonbeam, Astar, and
  Asset Hub.
- Showing per-chain balances and updating them after simulated XCM execution.
- Building a readable XCM V4-style instruction bundle with `WithdrawAsset`,
  `BuyExecution`, and `DepositReserveAsset`.
- Estimating destination output with simple demo exchange rates and network
  fees.
- Recording a transaction history with simulated transaction hashes.
- Tracking swap intent state in Solidity for an EVM parachain deployment.

## Project Structure

```text
demos/cross-chain-swapper/
  contracts/XcmAssetSwapper.sol
  examples/xcm-message.json
  index.html
  src/app.js
  styles.css
```

## Run Locally

No build step is required.

```bash
cd demos/cross-chain-swapper
python3 -m http.server 4173
```

Open `http://localhost:4173` in a browser.

Opening `index.html` directly also works in modern browsers, but using a small
local server mirrors how the demo would be hosted.

## Usage Guide

1. Pick a source parachain and a destination parachain.
2. Select an asset available on the source parachain.
3. Enter an amount.
4. Review the destination quote and generated XCM preview.
5. Click **Execute XCM transfer**.
6. Confirm that balances and transaction history update.

Use **Reset** to restore the default demo balances.

## Deployment Notes

The frontend is static and can be deployed to GitHub Pages, Cloudflare Pages,
Netlify, Vercel, or any static file host.

For an EVM parachain such as Moonbeam or Astar:

1. Deploy `contracts/XcmAssetSwapper.sol` with Foundry, Hardhat, or Remix.
2. Call `createSwapIntent` when the user submits a transfer.
3. Have the frontend or relayer submit the actual XCM transaction through
   Polkadot-JS API or the parachain's XCM precompile.
4. Call `markSettled` when the destination-chain event confirms delivery.

The contract intentionally tracks swap intents rather than pretending to send
XCM by itself. Production XCM submission depends on the target parachain's
runtime, precompiles, and asset registry.

## Production Integration Path

The static demo can be upgraded into a live implementation by replacing the
simulation layer in `src/app.js` with:

- Polkadot extension account discovery and signing.
- `@polkadot/api` connections to source and destination parachain RPCs.
- Runtime-specific XCM extrinsic construction, for example
  `polkadotXcm.limitedReserveTransferAssets` where supported.
- Asset metadata lookup from each parachain's asset registry.
- Event subscription for inclusion, execution, and failure reporting.

## Verification

```bash
python3 -m http.server 4173
```

Then open the page, execute a transfer, and verify:

- The source balance decreases.
- The destination balance increases.
- The XCM preview reflects the selected route.
- The transaction history records the transfer.

Syntax checks:

```bash
node --check src/app.js
```
