/* An isolated product preview; room and customer data stay with their existing controllers. */
(function (global) {
  'use strict';

  const mounts = new WeakMap();

  function mount(options) {
    options = options || {};
    const root = options.root || document.getElementById('somass-planner-v2');
    if (!root) return null;
    if (mounts.has(root)) return mounts.get(root);
    const header = root.querySelector('.sp-top');
    const roomPanel = root.querySelector('.sp-main');
    if (!header || !roomPanel) return null;

    const oldLink = root.querySelector('a[href*="watkins-konsol/"]');
    function safePreviewURL(value) {
      if (typeof value !== 'string' || !value.trim()) return null;
      try {
        const url = new URL(value, document.baseURI);
        if (!/^https?:$/.test(url.protocol) || url.origin !== new URL(document.baseURI).origin) return null;
        url.searchParams.set('embed', '1');
        return url.href;
      } catch (_) { return null; }
    }
    const watkinsURL = safePreviewURL(options.previewURL || (oldLink && oldLink.getAttribute('href')) || 'watkins-konsol/');
    if (!watkinsURL) return null;
    const legacy = {id: 'watkins-console160', title: 'Watkins Konsol 160', collection: 'WATKINS KOLEKSİYONU', description: '160 × 45 × 72,2 cm', materialStatus: 'Natürel Meşe / Koyu Meşe', previewURL: watkinsURL};
    const registry = Array.isArray(global.SomassDraftProductsRegistry) && global.SomassDraftProductsRegistry.length ? global.SomassDraftProductsRegistry : [legacy];
    const knownIds = new Set();
    const products = registry.flatMap(entry => {
      if (!entry || !/^[a-z0-9-]{1,80}$/.test(entry.id) || knownIds.has(entry.id)) return [];
      const previewURL = entry.id === legacy.id ? watkinsURL : safePreviewURL(entry.previewURL);
      if (!previewURL) return [];
      knownIds.add(entry.id);
      return [{id: entry.id, title: String(entry.title || 'Taslak ürün'), collection: String(entry.collection || 'TASLAK'), description: String(entry.description || ''), materialStatus: String(entry.materialStatus || ''), previewURL}];
    });
    if (!products.length) return null;
    let selected = products.find(product => product.id === legacy.id) || products[0];

    function node(tag, className, text) {
      const element = document.createElement(tag);
      if (className) element.className = className;
      if (text !== undefined) element.textContent = text;
      return element;
    }
    function savedAttributes(element, names) {
      const values = names.map(name => [name, element.getAttribute(name)]);
      return function restore() {
        values.forEach(([name, value]) => value === null ? element.removeAttribute(name) : element.setAttribute(name, value));
      };
    }

    const restoreRoom = savedAttributes(roomPanel, ['id', 'role', 'aria-labelledby', 'tabindex']);
    const restoreRoot = savedAttributes(root, ['data-sp-workspace-view']);
    const restoreLink = oldLink && savedAttributes(oldLink, ['href', 'target', 'rel', 'aria-controls']);
    const oldLinkText = oldLink && oldLink.textContent;

    const tabs = node('nav', 'sp-workspace-tabs');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Çalışma alanı');
    const roomTab = node('button', 'sp-workspace-tab', 'Oda yerleşimi');
    const draftTab = node('button', 'sp-workspace-tab', 'Taslak ürünler');
    roomTab.id = 'sp-workspace-room-tab';
    draftTab.id = 'sp-workspace-drafts-tab';
    [roomTab, draftTab].forEach(button => { button.type = 'button'; button.setAttribute('role', 'tab'); tabs.appendChild(button); });
    if (!roomPanel.id) roomPanel.id = 'sp-room-workspace-panel';
    roomPanel.setAttribute('role', 'tabpanel');
    roomPanel.setAttribute('aria-labelledby', roomTab.id);
    roomPanel.setAttribute('tabindex', '0');
    roomTab.setAttribute('aria-controls', roomPanel.id);

    const panel = node('section', 'sp-draft-products');
    panel.id = 'sp-draft-products-panel';
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', draftTab.id);
    panel.setAttribute('tabindex', '0');
    panel.hidden = true;
    draftTab.setAttribute('aria-controls', panel.id);
    const introduction = node('div', 'sp-draft-introduction');
    introduction.appendChild(node('h1', '', 'Taslak ürünler'));
    introduction.appendChild(node('p', '', 'Bir ürün seçerek taslağı farklı açılardan inceleyin.'));
    panel.appendChild(introduction);

    const library = node('div', 'sp-draft-library');
    const selector = node('nav', 'sp-draft-selector');
    selector.setAttribute('aria-label', 'Taslak ürün seçimi');
    const productButtons = [];
    products.forEach((entry, index) => {
      const button = node('button', 'sp-draft-choice');
      button.type = 'button';
      button.setAttribute('aria-controls', 'sp-draft-current-product');
      button.appendChild(node('span', 'sp-draft-choice-number', String(index + 1).padStart(2, '0')));
      const text = node('span', 'sp-draft-choice-text');
      text.appendChild(node('strong', '', entry.title));
      text.appendChild(node('span', '', entry.description));
      text.appendChild(node('small', '', entry.materialStatus));
      button.appendChild(text);
      button.addEventListener('click', () => selectProduct(entry.id, false));
      productButtons.push({button: button, id: entry.id});
      selector.appendChild(button);
    });
    library.appendChild(selector);
    const product = node('article', 'sp-draft-product');
    product.id = 'sp-draft-current-product';
    product.setAttribute('aria-labelledby', 'sp-draft-current-title');
    const productHeader = node('header', 'sp-draft-product-heading');
    const productTitle = node('div');
    const collection = node('p', 'sp-draft-collection');
    const title = node('h2');
    title.id = 'sp-draft-current-title';
    productTitle.appendChild(collection);
    productTitle.appendChild(title);
    const materialStatus = node('p', 'sp-draft-material-status');
    productTitle.appendChild(materialStatus);
    productHeader.appendChild(productTitle);
    productHeader.appendChild(node('span', 'sp-draft-badge', 'Taslak'));
    product.appendChild(productHeader);
    const stage = node('div', 'sp-draft-preview');
    const loading = node('p', 'sp-draft-loading', 'Ürün önizlemesi hazırlanıyor…');
    loading.setAttribute('role', 'status');
    loading.hidden = true;
    stage.appendChild(loading);
    product.appendChild(stage);
    library.appendChild(product);
    panel.appendChild(library);

    header.insertBefore(tabs, header.querySelector('.sp-roomtabs'));
    header.insertAdjacentElement('afterend', panel);
    let view = 'room', iframe = null, restore3D = false, destroyed = false;

    function syncProduct() {
      product.setAttribute('data-draft-id', selected.id);
      collection.textContent = selected.collection;
      title.textContent = selected.title;
      materialStatus.textContent = selected.materialStatus;
      materialStatus.hidden = !selected.materialStatus;
      productButtons.forEach(item => {
        const active = item.id === selected.id;
        item.button.setAttribute('aria-pressed', String(active));
        item.button.className = 'sp-draft-choice' + (active ? ' is-active' : '');
      });
    }
    function syncTabs() {
      roomTab.setAttribute('aria-selected', String(view === 'room'));
      draftTab.setAttribute('aria-selected', String(view === 'drafts'));
      roomTab.className = 'sp-workspace-tab' + (view === 'room' ? ' is-active' : '');
      draftTab.className = 'sp-workspace-tab' + (view === 'drafts' ? ' is-active' : '');
      roomTab.tabIndex = view === 'room' ? 0 : -1;
      draftTab.tabIndex = view === 'drafts' ? 0 : -1;
      root.setAttribute('data-sp-workspace-view', view);
      panel.hidden = view !== 'drafts';
    }
    function createPreview() {
      loading.hidden = false;
      stage.setAttribute('aria-busy', 'true');
      iframe = node('iframe', 'sp-draft-preview-frame');
      iframe.title = selected.title + ' · 3B önizleme';
      iframe.src = selected.previewURL;
      iframe.referrerPolicy = 'same-origin';
      const current = iframe;
      iframe.addEventListener('load', function () {
        if (iframe !== current) return;
        loading.hidden = true;
        stage.removeAttribute('aria-busy');
      }, { once: true });
      stage.appendChild(iframe);
    }
    function removePreview() {
      if (iframe) iframe.remove();
      iframe = null;
      loading.hidden = true;
      stage.removeAttribute('aria-busy');
    }
    function activate(next, focus) {
      if (destroyed || !['room', 'drafts'].includes(next)) return;
      if (next !== view) {
        if (next === 'drafts') {
          const room3D = root.querySelector('#sp-view3d');
          const room2D = root.querySelector('#sp-view2d');
          restore3D = !!(room3D && room3D.getAttribute('aria-pressed') === 'true' && room2D && !room2D.disabled);
          if (restore3D) room2D.click();
          view = next;
          syncTabs();
          createPreview();
        } else {
          removePreview();
          view = next;
          syncTabs();
          const room3D = root.querySelector('#sp-view3d');
          if (restore3D && room3D && !room3D.disabled) room3D.click();
          restore3D = false;
        }
      }
      if (focus) (view === 'drafts' ? draftTab : roomTab).focus({ preventScroll: true });
    }
    function clickRoom() { activate('room'); }
    function clickDrafts() { activate('drafts'); }
    function selectProduct(id, focus) {
      if (destroyed) return false;
      const next = products.find(entry => entry.id === id);
      if (!next) return false;
      const changed = next.id !== selected.id;
      selected = next;
      syncProduct();
      if (view !== 'drafts') activate('drafts');
      else if (changed) { removePreview(); createPreview(); }
      if (focus) productButtons.find(item => item.id === selected.id).button.focus({preventScroll: true});
      return true;
    }
    function activateLink(event) {
      event.preventDefault();
      selectProduct(legacy.id, false);
      activate('drafts', true);
    }
    function keyboard(event) {
      if (![roomTab, draftTab].includes(event.target)) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      let next;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') next = event.target === roomTab ? 'drafts' : 'room';
      else if (event.key === 'Home') next = 'room';
      else if (event.key === 'End') next = 'drafts';
      if (next) { event.preventDefault(); activate(next, true); }
    }
    roomTab.addEventListener('click', clickRoom);
    draftTab.addEventListener('click', clickDrafts);
    tabs.addEventListener('keydown', keyboard);
    if (oldLink) {
      oldLink.href = '#' + panel.id;
      oldLink.removeAttribute('target');
      oldLink.removeAttribute('rel');
      oldLink.setAttribute('aria-controls', panel.id);
      oldLink.textContent = 'Watkins Konsol 160';
      oldLink.addEventListener('click', activateLink);
    }
    syncProduct();
    syncTabs();

    const api = {
      activate: next => activate(next, true),
      getActive: () => view,
      select: id => selectProduct(id, true),
      getSelected: () => selected.id,
      destroy: function () {
        if (destroyed) return;
        activate('room');
        destroyed = true;
        removePreview();
        roomTab.removeEventListener('click', clickRoom);
        draftTab.removeEventListener('click', clickDrafts);
        tabs.removeEventListener('keydown', keyboard);
        if (oldLink) { oldLink.removeEventListener('click', activateLink); restoreLink(); oldLink.textContent = oldLinkText; }
        tabs.remove(); panel.remove(); restoreRoom(); restoreRoot(); mounts.delete(root);
      }
    };
    mounts.set(root, api);
    return api;
  }

  global.SomassDraftProducts = { mount: mount };
})(typeof window !== 'undefined' ? window : globalThis);
