const { escapeHtml } = window.LunchBoxUtils
const board = document.querySelector('#orderBoard')
const convexClient = window.LUNCHBOX_CONFIG?.convexUrl && window.LunchBoxConvex ? new window.LunchBoxConvex.ConvexClient(window.LUNCHBOX_CONFIG.convexUrl) : null
let unsubscribe

const statusCopy = {
  received: { label: 'Payment confirmed', note: 'Your order is in the kitchen queue.', step: 1 },
  'in-progress': { label: 'Being prepared', note: 'The team is making it now.', step: 2 },
  ready: { label: 'Ready for pickup', note: 'Head to the pickup counter with your order number.', step: 3 }
}

function render(orders) {
  if (!orders.length) { board.innerHTML = '<div class="status-empty"><span>✓</span><h3>The board is clear.</h3><p>New paid orders will appear here automatically.</p><a href="menu.html">Browse the menu</a></div>'; return }
  board.innerHTML = orders.map(order => { const state = statusCopy[order.status] || statusCopy.received; return `
    <article class="status-order-card status-step-${state.step}">
      <div class="status-order-head"><span>${escapeHtml(order.orderNumber)}</span><strong>${escapeHtml(state.label)}</strong></div>
      <div class="status-order-person"><small>Order for</small><h3>${escapeHtml(order.displayName)}</h3><p>${escapeHtml(order.itemSummary)}</p></div>
      <div class="status-order-track"><i></i><i></i><i></i></div><p class="status-order-note">${escapeHtml(state.note)}</p>
    </article>` }).join('')
}

if (convexClient) unsubscribe = convexClient.onUpdate('orders:activeBoard', {}, render, () => { board.innerHTML = '<div class="status-empty"><h3>Updates are reconnecting.</h3><p>Please check again in a moment.</p></div>' })
else board.innerHTML = '<div class="status-empty"><h3>Live updates are unavailable.</h3><p>Please ask a team member about your order.</p></div>'

if (new URLSearchParams(location.search).get('payment') === 'success') {
  const toast = document.querySelector('#statusToast'); toast.textContent = 'Payment submitted. Your order will appear as soon as Square confirms it.'; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 7000)
}

if (new URLSearchParams(location.search).get('payment') === 'complimentary') {
  const toast = document.querySelector('#statusToast'); toast.textContent = 'Your complimentary order was submitted and is now in progress.'; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 7000)
}

window.addEventListener('beforeunload', () => { unsubscribe?.(); convexClient?.close() })
