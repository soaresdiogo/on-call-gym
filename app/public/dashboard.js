const REFRESH_MS = 1000;
const ROWS = 20;

function setText(id, value) {
  document.querySelector(`#${id}`).textContent = value;
}

function row(bucket) {
  const tr = document.createElement('tr');
  const time = new Date(bucket.second * 1000).toLocaleTimeString();
  for (const value of [time, bucket.checkouts, bucket.succeeded, bucket.failed, bucket.paymentAttempts, bucket.p95LatencyMs]) {
    const cell = document.createElement('td');
    cell.textContent = String(value);
    tr.append(cell);
  }
  return tr;
}

async function refresh() {
  const metrics = await (await fetch('/metrics')).json();
  const { checkouts, succeeded, paymentAttempts } = metrics.totals;
  setText('checkouts', checkouts);
  setText('success', checkouts ? `${Math.round((succeeded / checkouts) * 100)}%` : '-');
  setText('attempts', paymentAttempts);
  setText('ratio', checkouts ? (paymentAttempts / checkouts).toFixed(2) : '-');
  setText('p95', `${metrics.latencyMs.p95} ms`);
  document.querySelector('#series').replaceChildren(...metrics.series.slice(-ROWS).reverse().map(row));
}

await refresh();
setInterval(refresh, REFRESH_MS);
