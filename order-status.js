const { escapeHtml } = window.LunchBoxUtils
const board = document.querySelector('#orderBoard')
const convexClient = window.LUNCHBOX_CONFIG?.convexUrl && window.LunchBoxConvex ? new window.LunchBoxConvex.ConvexClient(window.LUNCHBOX_CONFIG.convexUrl) : null
let unsubscribe

const boardStatus = document.querySelector('#boardStatus')

function renderGroup(group, orders, emptyMessage) {
  document.querySelector(`#${group}Count`).textContent = orders ? orders.length : '—'
  document.querySelector(`#${group}Orders`).innerHTML = orders?.length
    ? orders.map(order => `<tr><td>${escapeHtml(order.displayName)}</td><td>${escapeHtml(order.orderNumber)}</td></tr>`).join('')
    : `<tr><td class="pickup-empty" colspan="2">${escapeHtml(emptyMessage)}</td></tr>`
}

function render(orders) {
  const preparing = orders.filter(order => order.status === 'received' || order.status === 'in-progress')
  const ready = orders.filter(order => order.status === 'ready')
  renderGroup('preparing', preparing, 'No orders being prepared right now.')
  renderGroup('ready', ready, 'No orders ready for pickup right now.')
  board.setAttribute('aria-busy', 'false')
  boardStatus.classList.add('is-live')
  boardStatus.textContent = `Live pickup updates · ${preparing.length} preparing · ${ready.length} ready for pickup`
}

function renderUnavailable(message) {
  board.setAttribute('aria-busy', 'false')
  boardStatus.classList.remove('is-live')
  boardStatus.textContent = message
  renderGroup('preparing', null, 'Please ask a team member about your order.')
  renderGroup('ready', null, 'Please ask a team member about your order.')
}

if (convexClient) unsubscribe = convexClient.onUpdate('orders:activeBoard', {}, render, () => renderUnavailable('Updates are reconnecting. Please check again in a moment.'))
else renderUnavailable('Live updates are unavailable.')

if (new URLSearchParams(location.search).get('payment') === 'success') {
  const toast = document.querySelector('#statusToast'); toast.textContent = 'Payment submitted. Your order will appear as soon as Square confirms it.'; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 7000)
}

if (new URLSearchParams(location.search).get('payment') === 'complimentary') {
  const toast = document.querySelector('#statusToast'); toast.textContent = 'Your complimentary order was submitted and is now in progress.'; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 7000)
}

window.addEventListener('beforeunload', () => { unsubscribe?.(); convexClient?.close() })
