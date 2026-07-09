export default class BuildMenuPanel {
  constructor(host, helpers) {
    this.host = host;
    this.escapeHtml = helpers.escapeHtml;
    this.renderAction = helpers.renderAction;
    this.activeCategory = null;
    this.scrollByCategory = new Map();
    this.categoryScrollLeft = 0;

    this.host.addEventListener('scroll', (event) => {
      if (event.target.matches?.('.gwg-build-grid') && this.activeCategory) {
        this.scrollByCategory.set(this.activeCategory, event.target.scrollTop);
      }
      if (event.target.matches?.('.gwg-build-categories')) {
        this.categoryScrollLeft = event.target.scrollLeft;
      }
    }, true);
  }

  capture() {
    if (!this.activeCategory) return;
    const grid = this.host.querySelector('.gwg-build-grid');
    const categories = this.host.querySelector('.gwg-build-categories');
    if (grid) this.scrollByCategory.set(this.activeCategory, grid.scrollTop);
    if (categories) this.categoryScrollLeft = categories.scrollLeft;
  }

  show(payload) {
    const categoryId = payload.catalog?.categoryId || 'core';
    const sameCategory = this.host.dataset.panelType === 'build-catalog'
      && this.activeCategory === categoryId;
    if (sameCategory) {
      this.patch(payload);
      return;
    }

    this.capture();
    this.activeCategory = categoryId;
    this.host.dataset.panelType = 'build-catalog';
    this.host.innerHTML = this.render(payload);
    const grid = this.host.querySelector('.gwg-build-grid');
    const categories = this.host.querySelector('.gwg-build-categories');
    if (grid) grid.scrollTop = this.scrollByCategory.get(categoryId) || 0;
    if (categories) categories.scrollLeft = this.categoryScrollLeft;
  }

  render(payload) {
    const tabs = (payload.tabs || []).map((tab) => `
      <button
        class="gwg-build-category${tab.active ? ' active' : ''}"
        type="button"
        data-gwg-event="${this.escapeHtml(tab.event)}"
        data-gwg-id="${this.escapeHtml(tab.id)}"
        aria-pressed="${tab.active ? 'true' : 'false'}"
      >
        ${tab.icon ? `<img class="gwg-build-tab-icon" src="${this.escapeHtml(tab.icon)}" alt="" />` : ''}
        <span>${this.escapeHtml(tab.label)}</span>
        <small>${this.escapeHtml(tab.count ?? '')}</small>
      </button>
    `).join('');
    const cards = (payload.rows || []).map((row) => this.renderCard(row)).join('');
    return `
      <div class="gwg-build-shell">
        <nav class="gwg-build-categories" aria-label="Build categories">${tabs}</nav>
        <div class="gwg-build-content">
          <div class="gwg-build-category-copy">
            <div>
              <strong>${this.escapeHtml(payload.catalog?.label || '')}</strong>
              <small>${this.escapeHtml(payload.rows?.length || 0)} plans</small>
            </div>
            <span>${this.escapeHtml(payload.catalog?.description || '')}</span>
          </div>
          <div class="gwg-build-workspace">
            <div class="gwg-build-grid" data-gwg-category="${this.escapeHtml(payload.catalog?.categoryId || '')}">
              ${cards || '<p class="gwg-muted">Nothing in this category has survived procurement.</p>'}
            </div>
            <aside class="gwg-build-detail">
              <details class="gwg-build-detail-fold" open>
                <summary>
                  <span>Selected plan</span>
                  <strong class="gwg-build-detail-summary-title">${this.escapeHtml(payload.detail?.title || 'Choose a plan')}</strong>
                </summary>
                <div class="gwg-build-detail-content">${this.renderDetail(payload.detail)}</div>
              </details>
            </aside>
          </div>
          <div class="gwg-build-footer">
            ${(payload.actions || []).map((action) => this.renderAction(action)).join('')}
          </div>
        </div>
      </div>
    `;
  }

  renderPreview(item, large = false) {
    const cls = large ? 'gwg-catalog-preview large' : 'gwg-catalog-preview';
    if (item?.preview) {
      return `<img class="${cls}" src="${this.escapeHtml(item.preview)}" alt="" />`;
    }
    if (item?.swatch) {
      return `<span class="${cls} gwg-catalog-road" style="--gwg-swatch:${this.escapeHtml(item.swatch)}" aria-hidden="true"></span>`;
    }
    return `<span class="${cls} fallback" aria-hidden="true">+</span>`;
  }

  renderCard(row) {
    const primary = row.actions?.[0];
    return `
      <article
        class="gwg-build-card ${this.escapeHtml(row.kind || '')} ${this.escapeHtml(row.state || '')}${row.selected ? ' selected' : ''}"
        data-gwg-build-card="${this.escapeHtml(row.id)}"
      >
        <button
          class="gwg-build-card-summary"
          type="button"
          data-gwg-event="gwg-preview-build"
          data-gwg-id="${this.escapeHtml(row.id)}"
          aria-label="Show ${this.escapeHtml(row.title)} details"
        >
          ${this.renderPreview(row)}
          <span class="gwg-build-card-heading">
            <strong>${this.escapeHtml(row.title)}</strong>
            <span class="gwg-build-card-meta">
              <span class="gwg-build-card-cost">${this.escapeHtml(row.costLabel)}</span>
              <span class="gwg-state-badge ${this.escapeHtml(row.state || '')}">${this.escapeHtml(row.stateLabel)}</span>
            </span>
          </span>
        </button>
        <dl class="gwg-build-card-facts">
          <div><dt>Footprint</dt><dd>${this.escapeHtml(row.footprintLabel)}</dd></div>
          <div><dt>Road</dt><dd>${this.escapeHtml(row.roadLabel)}</dd></div>
        </dl>
        <p class="gwg-build-card-effect">${this.escapeHtml(row.effect)}</p>
        <p class="gwg-build-card-status ${row.state === 'affordable' ? 'gwg-good' : 'gwg-muted'}">${this.escapeHtml(row.status)}</p>
        ${primary ? `
          <button
            class="gwg-action gwg-build-card-action${primary.className ? ` ${this.escapeHtml(primary.className)}` : ''}"
            type="button"
            data-gwg-primary
            data-gwg-event="${this.escapeHtml(primary.event)}"
            data-gwg-id="${this.escapeHtml(primary.id || '')}"${primary.disabled ? ' disabled' : ''}
          >${this.escapeHtml(primary.label)}</button>
        ` : ''}
      </article>
    `;
  }

  renderDetail(item) {
    if (!item) {
      return `
        <div class="gwg-build-detail-empty">
          <strong>Select a plan</strong>
          <p>Choose an item to inspect its legally actionable dimensions.</p>
        </div>
      `;
    }
    const primary = item.actions?.[0];
    return `
      <div class="gwg-build-detail-head">
        ${this.renderPreview(item, true)}
        <div>
          <span class="gwg-detail-kicker">Selected plan</span>
          <h3>${this.escapeHtml(item.title)}</h3>
          <div class="gwg-build-detail-meta">
            <strong class="gwg-build-detail-cost">${this.escapeHtml(item.costLabel)}</strong>
            <span class="gwg-state-badge ${this.escapeHtml(item.state || '')}">${this.escapeHtml(item.stateLabel)}</span>
          </div>
        </div>
      </div>
      <p>${this.escapeHtml(item.description)}</p>
      <h4>Requirements & effect</h4>
      <dl class="gwg-build-detail-facts">
        <div><dt>Footprint</dt><dd>${this.escapeHtml(item.footprintLabel)}</dd></div>
        <div><dt>Road access</dt><dd>${this.escapeHtml(item.roadLabel)}</dd></div>
        <div><dt>Effect</dt><dd>${this.escapeHtml(item.effect)}</dd></div>
      </dl>
      ${item.flavor ? `<p class="gwg-build-flavor">"${this.escapeHtml(item.flavor)}"</p>` : ''}
      <p class="gwg-build-detail-status ${item.state === 'affordable' ? 'gwg-good' : 'gwg-bad'}">${this.escapeHtml(item.status)}</p>
      ${primary ? `<div class="gwg-actions">${this.renderAction(primary)}</div>` : ''}
    `;
  }

  patch(payload) {
    this.capture();
    const rowsById = new Map((payload.rows || []).map((row) => [String(row.id), row]));
    for (const card of this.host.querySelectorAll('[data-gwg-build-card]')) {
      const row = rowsById.get(card.dataset.gwgBuildCard);
      if (!row) continue;
      card.className = `gwg-build-card ${row.kind || ''} ${row.state || ''}${row.selected ? ' selected' : ''}`;
      const cost = card.querySelector('.gwg-build-card-cost');
      const badge = card.querySelector('.gwg-state-badge');
      const status = card.querySelector('.gwg-build-card-status');
      const action = card.querySelector('[data-gwg-primary]');
      if (cost) cost.textContent = row.costLabel;
      if (badge) {
        badge.textContent = row.stateLabel;
        badge.className = `gwg-state-badge ${row.state || ''}`;
      }
      if (status) {
        status.textContent = row.status;
        status.className = `gwg-build-card-status ${row.state === 'affordable' ? 'gwg-good' : 'gwg-muted'}`;
      }
      if (action && row.actions?.[0]) {
        action.textContent = row.actions[0].label;
        action.disabled = Boolean(row.actions[0].disabled);
      }
    }
    const detail = this.host.querySelector('.gwg-build-detail-content');
    if (detail) detail.innerHTML = this.renderDetail(payload.detail);
    const detailTitle = this.host.querySelector('.gwg-build-detail-summary-title');
    if (detailTitle) detailTitle.textContent = payload.detail?.title || 'Choose a plan';
    const footer = this.host.querySelector('.gwg-build-footer');
    if (footer) {
      footer.innerHTML = (payload.actions || []).map((action) => this.renderAction(action)).join('');
    }
  }

  clear() {
    this.capture();
    delete this.host.dataset.panelType;
  }
}
