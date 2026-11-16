const list = document.querySelector('#products');
const result = document.querySelector('#result');

function formatPrice(cents) {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

function renderProduct(product) {
  const item = document.createElement('li');
  const name = document.createElement('span');
  name.textContent = `${product.name} - ${formatPrice(product.priceCents)}`;
  const button = document.createElement('button');
  button.textContent = product.available ? 'Buy' : 'Sold out';
  button.disabled = !product.available;
  button.addEventListener('click', () => buy(product.id));
  item.append(name, button);
  return item;
}

async function buy(productId) {
  // One key per click: retries of the same click are the same purchase.
  const response = await fetch('/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
    body: JSON.stringify({ items: [{ productId, quantity: 1 }] }),
  });
  result.textContent = `${response.status} ${JSON.stringify(await response.json(), null, 2)}`;
}

const response = await fetch('/products');
const { products } = await response.json();
list.replaceChildren(...products.map(renderProduct));
