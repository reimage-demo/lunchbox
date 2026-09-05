(function () {
  const { fallbackMenu, applyBrandImages } = window.LunchBoxData;
  const { escapeHtml, money, resolveAssetUrl } = window.LunchBoxUtils;
  const grid = document.querySelector("#cateringGrid");
  const convexClient =
    window.LUNCHBOX_CONFIG?.convexUrl && window.LunchBoxConvex
      ? new window.LunchBoxConvex.ConvexClient(window.LUNCHBOX_CONFIG.convexUrl)
      : null;
  let unsubscribe;

  function render(items) {
    const cateringItems = items
      .filter((item) => item.isAvailable && item.isBottleService)
      .sort(
        (left, right) =>
          (left.categorySortOrder ?? Number.MAX_SAFE_INTEGER) -
            (right.categorySortOrder ?? Number.MAX_SAFE_INTEGER) ||
          (left.sortOrder || 0) - (right.sortOrder || 0),
      );

    if (!cateringItems.length) {
      grid.innerHTML =
        '<div class="empty-state">Catering options are being updated. Contact Lunch Box for current availability.</div>';
      return;
    }

    grid.innerHTML = cateringItems
      .map((item) => {
        const price = item.sizes?.length > 1 || item.showsStartingPrice
          ? `Starting at ${money(item.price)}`
          : money(item.price);
        const choices = (item.optionGroups || [])
          .map((group) => `<li>${escapeHtml(group.name)}</li>`)
          .join("");
        return `<article class="catering-card${item.imageUrl ? "" : " no-image"}">
          ${item.imageUrl ? `<div class="catering-card-media"><img src="${escapeHtml(resolveAssetUrl(item.imageUrl))}" width="800" height="600" loading="lazy" decoding="async" alt="${escapeHtml(item.name)}"></div>` : ""}
          <div class="catering-card-copy">
            <div><p class="eyebrow dark">Catering</p><span>${price}</span></div>
            <h3>${escapeHtml(item.name)}</h3>
            <p>${escapeHtml(item.description)}</p>
            ${item.sizes?.length ? `<p>${item.sizes.map((size) => `${escapeHtml(size.name)} ${money(size.price)}`).join(" · ")}</p>` : ""}
            ${choices ? `<ul>${choices}</ul>` : ""}
            <a class="text-link" href="contact.html">Ask about this tray</a>
          </div>
        </article>`;
      })
      .join("");
  }

  render(fallbackMenu);
  if (convexClient) {
    unsubscribe = convexClient.onUpdate(
      "menuItems:listAvailable",
      {},
      (items) => render(applyBrandImages(items)),
      (error) => console.warn("Using the local catering preview.", error),
    );
  }

  window.addEventListener("beforeunload", () => {
    unsubscribe?.();
    convexClient?.close();
  });
})();
