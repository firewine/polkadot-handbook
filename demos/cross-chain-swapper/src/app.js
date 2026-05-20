const chains = {
  acala: { name: "Acala", asset: "aUSD", paraId: 2000, fee: 0.004 },
  moonbeam: { name: "Moonbeam", asset: "GLMR", paraId: 2004, fee: 0.006 },
  astar: { name: "Astar", asset: "ASTR", paraId: 2006, fee: 0.005 },
  assethub: { name: "Asset Hub", asset: "DOT", paraId: 1000, fee: 0.003 },
};

const initialBalances = {
  acala: { aUSD: 1250, DOT: 42.4 },
  moonbeam: { GLMR: 890, DOT: 18.2 },
  astar: { ASTR: 4200, DOT: 9.8 },
  assethub: { DOT: 230, aUSD: 300 },
};

const assetRates = {
  DOT: 1,
  aUSD: 6.25,
  GLMR: 0.14,
  ASTR: 0.09,
};

const state = {
  balances: structuredClone(initialBalances),
  history: [],
};

const form = document.querySelector("#swap-form");
const fromChain = document.querySelector("#from-chain");
const toChain = document.querySelector("#to-chain");
const asset = document.querySelector("#asset");
const amount = document.querySelector("#amount");
const balances = document.querySelector("#balances");
const history = document.querySelector("#history");
const quote = document.querySelector("#quote");
const feeNote = document.querySelector("#fee-note");
const preview = document.querySelector("#xcm-preview");
const routeStatus = document.querySelector("#route-status");
const reset = document.querySelector("#reset-demo");

function chainOptions() {
  return Object.entries(chains)
    .map(([id, chain]) => `<option value="${id}">${chain.name}</option>`)
    .join("");
}

function assetsForChain(chainId) {
  return Object.keys(state.balances[chainId] ?? {});
}

function fillOptions() {
  fromChain.innerHTML = chainOptions();
  toChain.innerHTML = chainOptions();
  fromChain.value = "assethub";
  toChain.value = "acala";
  syncAssetOptions();
}

function syncAssetOptions() {
  asset.innerHTML = assetsForChain(fromChain.value)
    .map((symbol) => `<option value="${symbol}">${symbol}</option>`)
    .join("");
}

function rateQuote(inputAmount, symbol, destinationChain) {
  const destinationAsset = chains[destinationChain].asset;
  const valueInDot = inputAmount / assetRates[symbol];
  return valueInDot * assetRates[destinationAsset];
}

function networkFee(symbol, sourceChain, destinationChain) {
  const baseFee = chains[sourceChain].fee + chains[destinationChain].fee;
  return Math.max(baseFee * assetRates[symbol], 0.01);
}

function currentTransfer() {
  const inputAmount = Number(amount.value || 0);
  const source = fromChain.value;
  const destination = toChain.value;
  const symbol = asset.value;
  const fee = networkFee(symbol, source, destination);
  const netSourceAmount = Math.max(inputAmount - fee, 0);
  const destinationAmount = rateQuote(netSourceAmount, symbol, destination);

  return {
    source,
    destination,
    symbol,
    inputAmount,
    netSourceAmount,
    destinationAsset: chains[destination].asset,
    destinationAmount,
    fee,
  };
}

function buildXcmPreview(transfer = currentTransfer()) {
  const source = chains[transfer.source];
  const destination = chains[transfer.destination];
  const message = {
    version: "V4",
    origin: {
      parachain: source.name,
      paraId: source.paraId,
    },
    destination: {
      parachain: destination.name,
      paraId: destination.paraId,
    },
    instructions: [
      {
        WithdrawAsset: {
          symbol: transfer.symbol,
          amount: transfer.inputAmount.toFixed(4),
        },
      },
      {
        BuyExecution: {
          fees: `${transfer.fee.toFixed(4)} ${transfer.symbol}`,
          weightLimit: "Unlimited",
        },
      },
      {
        DepositReserveAsset: {
          assets: "All",
          dest: `Parachain(${destination.paraId})`,
          xcm: [
            {
              DepositAsset: {
                symbol: transfer.destinationAsset,
                beneficiary: "demo-wallet",
              },
            },
          ],
        },
      },
    ],
  };

  return JSON.stringify(message, null, 2);
}

function updateQuote() {
  const transfer = currentTransfer();
  quote.textContent = `${transfer.destinationAmount.toFixed(4)} ${transfer.destinationAsset}`;
  feeNote.textContent = `Network fee: ${transfer.fee.toFixed(4)} ${transfer.symbol}`;
  preview.textContent = buildXcmPreview(transfer);
}

function renderBalances() {
  balances.innerHTML = Object.entries(state.balances)
    .map(([chainId, chainBalances]) => {
      const rows = Object.entries(chainBalances)
        .map(([symbol, value]) => `<strong>${value.toFixed(4)} ${symbol}</strong>`)
        .join("");
      return `
        <article class="balance-card">
          <span>${chains[chainId].name}</span>
          ${rows}
        </article>
      `;
    })
    .join("");
}

function renderHistory() {
  if (!state.history.length) {
    history.innerHTML = "<p>No simulated transfers yet.</p>";
    return;
  }

  history.innerHTML = state.history
    .map((item) => `
      <article class="history-item">
        <div>
          <strong>${item.amount} ${item.symbol} from ${item.source} to ${item.destination}</strong>
          <small>${item.received} ${item.destinationAsset} received after XCM fee at ${item.time}</small>
        </div>
        <span class="hash">${item.hash}</span>
      </article>
    `)
    .join("");
}

function setStatus(text, type = "ready") {
  routeStatus.textContent = text;
  routeStatus.className = `status-pill ${type === "ready" ? "" : type}`;
}

function executeTransfer(event) {
  event.preventDefault();
  const transfer = currentTransfer();

  if (transfer.source === transfer.destination) {
    setStatus("Pick two chains", "error");
    return;
  }

  if (!transfer.inputAmount || transfer.inputAmount <= 0) {
    setStatus("Enter amount", "error");
    return;
  }

  const sourceBalance = state.balances[transfer.source][transfer.symbol] ?? 0;
  if (sourceBalance < transfer.inputAmount) {
    setStatus("Low balance", "error");
    return;
  }

  if (transfer.netSourceAmount <= 0) {
    setStatus("Amount below fee", "error");
    return;
  }

  setStatus("Sending", "pending");
  form.querySelector("button[type='submit']").disabled = true;

  window.setTimeout(() => {
    state.balances[transfer.source][transfer.symbol] -= transfer.inputAmount;
    state.balances[transfer.destination][transfer.destinationAsset] =
      (state.balances[transfer.destination][transfer.destinationAsset] ?? 0) +
      transfer.destinationAmount;

    state.history.unshift({
      amount: transfer.inputAmount.toFixed(4),
      symbol: transfer.symbol,
      received: transfer.destinationAmount.toFixed(4),
      destinationAsset: transfer.destinationAsset,
      source: chains[transfer.source].name,
      destination: chains[transfer.destination].name,
      time: new Date().toLocaleTimeString(),
      hash: `0x${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`,
    });
    state.history = state.history.slice(0, 6);

    setStatus("Complete");
    amount.value = "";
    renderBalances();
    renderHistory();
    updateQuote();
    form.querySelector("button[type='submit']").disabled = false;
  }, 800);
}

function resetDemo() {
  state.balances = structuredClone(initialBalances);
  state.history = [];
  amount.value = "";
  setStatus("Ready");
  renderBalances();
  renderHistory();
  updateQuote();
}

fromChain.addEventListener("change", () => {
  syncAssetOptions();
  updateQuote();
});
toChain.addEventListener("change", updateQuote);
asset.addEventListener("change", updateQuote);
amount.addEventListener("input", updateQuote);
form.addEventListener("submit", executeTransfer);
reset.addEventListener("click", resetDemo);

fillOptions();
renderBalances();
renderHistory();
updateQuote();

if (new URLSearchParams(window.location.search).get("autoplay") === "1") {
  window.setTimeout(() => {
    amount.value = "10";
    amount.dispatchEvent(new Event("input", { bubbles: true }));
    form.requestSubmit();
  }, 700);
}
