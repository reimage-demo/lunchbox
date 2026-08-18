(function () {
  const mount = document.querySelector("#fulfillmentMount");
  if (!mount) return;

  const config = window.LUNCHBOX_CONFIG || {};
  const defaultLocation = {
    locationName: config.defaultLocation?.locationName || "Lunch Box",
    address:
      config.defaultLocation?.address ||
      "104 Baltimore St, Hartford, CT 06112",
    startTime: config.defaultLocation?.startTime || "13:00",
    endTime: config.defaultLocation?.endTime || "23:00",
    hoursLabel:
      config.defaultLocation?.hoursLabel || "Every day · 1 PM–11 PM",
  };
  let currentLocation = null;
  let pickupTiming = "asap";
  let scheduledFor = "";
  let unsubscribe = null;

  mount.innerHTML = `
    <section class="fulfillment-shell" aria-label="Order fulfillment">
      <div class="fulfillment-inner">
        <div class="fulfillment-control">
          <div class="fulfillment-toggle" role="group" aria-label="Pickup or delivery">
            <button type="button" class="active" data-fulfillment="pickup" aria-pressed="true">Pickup</button>
            <button type="button" data-fulfillment="delivery" aria-pressed="false">Delivery</button>
          </div>
        </div>
      </div>
    </section>`;

  document.body.insertAdjacentHTML(
    "beforeend",
    `<dialog class="delivery-dialog" id="deliveryDialog" aria-labelledby="deliveryTitle">
      <button class="delivery-close" type="button" aria-label="Close delivery options">×</button>
      <p class="eyebrow dark">Delivery</p>
      <h2 id="deliveryTitle">Choose a delivery partner</h2>
      <p>Delivery orders, payment, and driver tracking are handled by the partner you choose.</p>
      <div class="delivery-partners">
        <a class="delivery-partner doordash" id="doorDashButton" target="_blank" rel="noopener"><span><strong>DoorDash</strong><small>Order delivery</small></span><b>Continue ↗</b></a>
        <a class="delivery-partner ubereats" id="uberEatsButton" target="_blank" rel="noopener"><span><strong>Uber Eats</strong><small>Order delivery</small></span><b>Continue ↗</b></a>
      </div>
      <p class="delivery-note">Your Lunch Box pickup cart does not transfer to a delivery partner.</p>
      <button class="button button-primary full delivery-pickup" type="button">Continue with pickup</button>
    </dialog>`,
  );

  const dialog = document.querySelector("#deliveryDialog");
  const timingSummary = document.querySelector("#pickupTimingSummary");
  const scheduleSelect = document.querySelector("#scheduledPickupTime");
  function localDate() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const get = (type) => parts.find((part) => part.type === type)?.value;
    return `${get("year")}-${get("month")}-${get("day")}`;
  }

  function dateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function defaultOrderLocation() {
    return {
      ...defaultLocation,
      serviceDate: localDate(),
      status: "open",
      orderingOpen: true,
      schedulingEnabled: true,
      prepTimeMinutes: 25,
      isDefaultSchedule: true,
    };
  }

  function formatTime(value) {
    if (!/^\d{2}:\d{2}$/.test(value || "")) return value || "";
    const [hour, minute] = value.split(":").map(Number);
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: minute ? "2-digit" : undefined,
    }).format(new Date(2020, 0, 1, hour, minute));
  }

  function formatDate(value) {
    if (!value) return "";
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${value}T12:00:00Z`));
  }

  function mapsUrl(location) {
    const query =
      Number.isFinite(location?.latitude) && Number.isFinite(location?.longitude)
        ? `${location.latitude},${location.longitude}`
        : location?.address;
    return query
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
      : "";
  }

  function buildScheduleOptions() {
    if (!scheduleSelect) return;
    scheduleSelect.innerHTML = '<option value="">Choose a time</option>';
    if (!currentLocation?.schedulingEnabled) return;
    const [startHour, startMinute] = currentLocation.startTime.split(":").map(Number);
    const [endHour, endMinute] = currentLocation.endTime.split(":").map(Number);
    let serviceDate = currentLocation.serviceDate || localDate();
    let start = new Date(`${serviceDate}T00:00:00`);
    start.setHours(startHour, startMinute, 0, 0);
    let end = new Date(`${serviceDate}T00:00:00`);
    end.setHours(endHour, endMinute, 0, 0);
    if (serviceDate === localDate()) {
      const earliest = new Date(Date.now() + currentLocation.prepTimeMinutes * 60000);
      earliest.setMinutes(Math.ceil(earliest.getMinutes() / 30) * 30, 0, 0);
      if (earliest > start) start = earliest;
    }
    if (start > end && currentLocation.isDefaultSchedule) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      serviceDate = dateKey(tomorrow);
      start = new Date(`${serviceDate}T00:00:00`);
      start.setHours(startHour, startMinute, 0, 0);
      end = new Date(`${serviceDate}T00:00:00`);
      end.setHours(endHour, endMinute, 0, 0);
    }
    while (start <= end) {
      const option = document.createElement("option");
      option.value = start.toISOString();
      option.textContent = `${formatDate(serviceDate)} at ${new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(start)}`;
      scheduleSelect.append(option);
      start = new Date(start.getTime() + 30 * 60000);
    }
    if (scheduleSelect.options.length > 1) {
      const stillAvailable = [...scheduleSelect.options].some(
        (option) => option.value === scheduledFor,
      );
      if (!stillAvailable) scheduledFor = scheduleSelect.options[1].value;
      scheduleSelect.value = scheduledFor;
    } else {
      scheduledFor = "";
    }
  }

  function setPartner(button, url, label) {
    if (url) {
      button.href = url;
      button.onclick = null;
      button.removeAttribute("aria-disabled");
      button.classList.remove("unavailable");
      button.querySelector("small").textContent = "Order delivery";
      button.querySelector("b").textContent = "Continue ↗";
    } else {
      button.removeAttribute("href");
      button.setAttribute("aria-disabled", "true");
      button.classList.add("unavailable");
      button.querySelector("small").textContent = "Storefront coming soon";
      button.querySelector("b").textContent = "Coming soon";
      button.onclick = (event) => event.preventDefault();
    }
    button.setAttribute("aria-label", `${label}${url ? ", opens partner storefront" : ", coming soon"}`);
  }

  function renderLocation(location) {
    const stale = Boolean(location?.serviceDate && location.serviceDate < localDate());
    currentLocation = !location || stale ? defaultOrderLocation() : location;
    const fallbackPartners = config.deliveryPartners || {};
    setPartner(document.querySelector("#doorDashButton"), location?.doorDashUrl || fallbackPartners.doorDashUrl, "DoorDash");
    setPartner(document.querySelector("#uberEatsButton"), location?.uberEatsUrl || fallbackPartners.uberEatsUrl, "Uber Eats");

    mount.classList.toggle("location-open", currentLocation.status === "open" && currentLocation.orderingOpen);
    mount.classList.toggle("location-unavailable", currentLocation.status === "closed" || currentLocation.status === "moving");
    if (!location || stale) {
      const fallback = location || defaultLocation;
      const url = mapsUrl(fallback);
      document.querySelectorAll("[data-truck-directions]").forEach((element) => {
        element.hidden = !url;
        if (url) element.href = url;
      });
      document.querySelectorAll("[data-truck-location]").forEach((element) => {
        element.textContent = fallback.locationName || defaultLocation.locationName;
      });
      document.querySelectorAll("[data-truck-address]").forEach((element) => {
        element.textContent = fallback.address || defaultLocation.address;
      });
      document.querySelectorAll("[data-truck-hours]").forEach((element) => {
        element.textContent = defaultLocation.hoursLabel;
      });
      buildScheduleOptions();
      updateTiming();
      return;
    }
    const url = mapsUrl(location);
    document.querySelectorAll("[data-truck-directions]").forEach((element) => {
      element.hidden = !url;
      if (url) element.href = url;
    });
    document.querySelectorAll("[data-truck-location]").forEach((element) => {
      element.textContent = location.locationName;
    });
    document.querySelectorAll("[data-truck-address]").forEach((element) => {
      element.textContent = location.address;
    });
    document.querySelectorAll("[data-truck-hours]").forEach((element) => {
      element.textContent = `Every day · ${formatTime(location.startTime)}–${formatTime(location.endTime)}`;
    });
    buildScheduleOptions();
    updateTiming();
  }

  function orderSummary() {
    const when =
      pickupTiming === "scheduled" && scheduledFor
        ? new Intl.DateTimeFormat("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date(scheduledFor))
        : `Order now · about ${currentLocation?.prepTimeMinutes || 25} min`;
    return `${currentLocation?.locationName || defaultLocation.locationName} · ${when}`;
  }

  function updateTiming() {
    const asapInput = document.querySelector('input[name="pickupTiming"][value="asap"]');
    const scheduleInput = document.querySelector('input[name="pickupTiming"][value="scheduled"]');
    const now = new Date();
    const opens = currentLocation
      ? new Date(`${currentLocation.serviceDate}T${currentLocation.startTime}:00`)
      : null;
    const closes = currentLocation
      ? new Date(`${currentLocation.serviceDate}T${currentLocation.endTime}:00`)
      : null;
    const canAsap = Boolean(
      currentLocation?.orderingOpen &&
      currentLocation?.status === "open" &&
      currentLocation?.serviceDate === localDate() &&
      opens &&
      closes &&
      now >= opens &&
      now <= closes,
    );
    const canSchedule = Boolean(currentLocation?.schedulingEnabled && scheduleSelect?.options.length > 1);
    if (asapInput && scheduleInput && scheduleSelect) {
      asapInput.disabled = !canAsap;
      scheduleInput.disabled = !canSchedule;
      if (!canAsap && canSchedule && pickupTiming === "asap") {
        pickupTiming = "scheduled";
        scheduleInput.checked = true;
        asapInput.checked = false;
      }
      if (!canSchedule && pickupTiming === "scheduled") {
        pickupTiming = "asap";
        asapInput.checked = true;
        scheduleInput.checked = false;
      }
      scheduleSelect.disabled = pickupTiming !== "scheduled" || !canSchedule;
      document.querySelector("#checkoutTimeSelect")?.classList.toggle(
        "active",
        pickupTiming === "scheduled" && canSchedule,
      );
    }
    if (timingSummary) timingSummary.textContent = orderSummary();
    document.querySelectorAll("[data-order-summary]").forEach((element) => {
      element.textContent = orderSummary();
    });
    window.LunchBoxOrderContext = {
      fulfillmentType: "pickup",
      pickupTiming,
      scheduledFor: pickupTiming === "scheduled" ? scheduledFor : "",
      location: currentLocation,
    };
  }

  function showFulfillment(mode) {
    document.querySelectorAll("[data-fulfillment]").forEach((choice) => {
      const active = choice.dataset.fulfillment === mode;
      choice.classList.toggle("active", active);
      choice.setAttribute("aria-pressed", String(active));
    });
  }

  document.querySelectorAll("[data-fulfillment]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.fulfillment === "delivery") {
        showFulfillment("delivery");
        dialog.showModal();
        return;
      }
      showFulfillment("pickup");
    });
  });
  dialog.querySelector(".delivery-close").onclick = () => dialog.close();
  dialog.querySelector(".delivery-pickup").onclick = () => dialog.close();
  dialog.addEventListener("close", () => showFulfillment("pickup"));
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  if (scheduleSelect) {
    document.querySelectorAll('input[name="pickupTiming"]').forEach((input) => {
      input.addEventListener("change", () => {
        pickupTiming = input.value;
        if (pickupTiming === "scheduled" && !scheduledFor) {
          scheduledFor = scheduleSelect.options[1]?.value || "";
          scheduleSelect.value = scheduledFor;
        }
        updateTiming();
      });
    });
    scheduleSelect.addEventListener("change", () => {
      scheduledFor = scheduleSelect.value;
      updateTiming();
    });
  }

  renderLocation(null);
  const client =
    config.convexUrl && window.LunchBoxConvex
      ? new window.LunchBoxConvex.ConvexClient(config.convexUrl)
      : null;
  if (client) {
    unsubscribe = client.onUpdate(
      "truckLocations:getPublic",
      {},
      renderLocation,
      () => renderLocation(null),
    );
    window.addEventListener("beforeunload", () => {
      unsubscribe?.();
      client.close();
    });
  }
})();
