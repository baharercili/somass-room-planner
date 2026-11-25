(async function () {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const params = new URLSearchParams(location.search);
  if (params.get('embed') === '1') document.documentElement.classList.add('sp-embedded');
  const id = params.get('product') || 'fluted-sideboard';
  const allowed = new Set(['fluted-sideboard', 'azora-chair']);
  const viewport = $('#viewport'), canvas = $('canvas'), preview = $('#preview'), message = $('#stage-message');
  const abort = new AbortController();
  const listeners = [];
  const originalMaterials = new Map();
  let renderer, scene, camera, imported, displayRoot, ground, neutral, observer;
  let disposed = false, ready = false, yaw = .58, pitch = .28, radius = 1, fitRadius = 1, zoomFactor = 1, target;
  let postLayoutFrame = null;
  let sourceBounds, drag = null;

  function on(element, type, handler, options) {
    element.addEventListener(type, handler, options);
    listeners.push(() => element.removeEventListener(type, handler, options));
  }
  function say(text) { message.textContent = text; message.hidden = !text; }
  function controls(enabled) {
    document.querySelectorAll('[data-view],#fit,#zoom-in,#zoom-out').forEach(button => { button.disabled = !enabled; });
    $('#appearance').disabled = !enabled;
  }
  function safeAsset(value, extension) {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      const url = new URL(value, document.baseURI);
      if (!/^https?:$/.test(url.protocol) || url.origin !== location.origin || !extension.test(url.pathname)) return null;
      return url.href;
    } catch (_) { return null; }
  }
  function fallback(text) {
    ready = false;
    canvas.hidden = true;
    viewport.setAttribute('aria-busy', 'false');
    document.body.setAttribute('data-model-status', 'fallback');
    controls(false);
    say(text);
    if (renderer) { renderer.dispose(); renderer.forceContextLoss(); renderer = null; }
  }
  function disposeObject(object) {
    if (!object) return;
    const geometries = new Set(), materials = new Set(), textures = new Set();
    object.traverse(child => {
      if (child.geometry) geometries.add(child.geometry);
      const material = originalMaterials.get(child) || child.material;
      (Array.isArray(material) ? material : [material]).filter(Boolean).forEach(item => materials.add(item));
    });
    materials.forEach(material => Object.values(material).forEach(value => { if (value && value.isTexture) textures.add(value); }));
    geometries.forEach(geometry => geometry.dispose());
    textures.forEach(texture => texture.dispose());
    materials.forEach(material => material.dispose());
  }
  function dispose() {
    if (disposed) return;
    disposed = true; ready = false; abort.abort();
    if (observer) observer.disconnect();
    if (postLayoutFrame !== null && window.cancelAnimationFrame) window.cancelAnimationFrame(postLayoutFrame);
    listeners.splice(0).forEach(remove => remove());
    disposeObject(imported); disposeObject(ground);
    originalMaterials.clear();
    if (neutral) neutral.dispose();
    if (renderer) { renderer.dispose(); renderer.forceContextLoss(); renderer = null; }
  }
  on(window, 'pagehide', dispose);

  function render() {
    if (!ready || disposed || !renderer) return;
    camera.position.set(target.x + radius * Math.sin(yaw) * Math.cos(pitch), target.y + radius * Math.sin(pitch), target.z + radius * Math.cos(yaw) * Math.cos(pitch));
    camera.near = Math.max(radius / 1000, .00001);
    camera.far = Math.max(fitRadius * 100, radius * 20);
    camera.lookAt(target); camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
    renderer.render(scene, camera);
  }
  function fittedDistance() {
    const vertical = camera.fov * Math.PI / 360;
    const horizontal = Math.atan(Math.tan(vertical) * camera.aspect);
    return sourceBounds.getBoundingSphere(new THREE.Sphere()).radius / Math.sin(Math.min(vertical, horizontal)) * 1.1;
  }
  function resize() {
    if (!renderer || !camera || disposed) return;
    const width = Math.max(viewport.clientWidth, 1), height = Math.max(viewport.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    if (sourceBounds) {
      fitRadius = fittedDistance(); radius = fitRadius * zoomFactor;
    }
    camera.updateProjectionMatrix(); render();
  }
  function setView(view) {
    if (!ready) return;
    const views = {perspective: [.58, .28], front: [0, 0], side: [Math.PI / 2, 0], top: [0, Math.PI / 2 - .0001]};
    if (!views[view]) return;
    [yaw, pitch] = views[view]; zoomFactor = 1;
    document.querySelectorAll('[data-view]').forEach(button => {
      const active = button.getAttribute('data-view') === view;
      button.className = active ? 'is-active' : '';
      button.setAttribute('aria-pressed', String(active));
    });
    resize();
  }
  function zoom(multiplier) { zoomFactor = Math.max(.5, Math.min(6, zoomFactor * multiplier)); radius = fitRadius * zoomFactor; render(); }
  function appearance(value) {
    if (!ready) return;
    originalMaterials.forEach((material, mesh) => { mesh.material = value === 'source' ? material : neutral; });
    document.querySelectorAll('[data-appearance]').forEach(button => {
      const active = button.getAttribute('data-appearance') === value;
      button.className = active ? 'is-active' : '';
      button.setAttribute('aria-pressed', String(active));
    });
    $('#view-label').textContent = value === 'source' ? 'DWG renkleri · üretim kaplaması değildir' : 'Nötr görünüm';
    render();
  }

  try {
    if (!allowed.has(id)) throw new Error('unknown-product');
    const response = await fetch('models.json', {signal: abort.signal, cache: 'no-cache'});
    if (!response.ok) throw new Error('manifest-unavailable');
    const manifest = await response.json();
    if (manifest.format !== 'somass-draft-dwg-models-v1' || !Array.isArray(manifest.models)) throw new Error('invalid-manifest');
    const product = manifest.models.find(item => item && item.id === id);
    if (!product || !['ready', 'source-ready'].includes(product.status)) throw new Error('unknown-product');
    $('#product-name').textContent = product.name || 'Taslak ürün';
    document.title = 'SO-MASS · ' + (product.name || 'Taslak ürün');
    canvas.setAttribute('aria-label', (product.name || 'Taslak ürün') + ', döndürülebilir 3B model');
    $('#product-source').textContent = product.sourceLabel ? 'Kaynak çizim: ' + product.sourceLabel : '';
    $('#material-status').textContent = product.materialStatus || 'Kaplama henüz seçilmedi';
    $('#product-note').textContent = product.note || 'Kaynak çizimden aktarılan taslak modeldir. Üretim kaplaması henüz seçilmedi.';
    const dimensions = product.dimensionsCm;
    if (dimensions && ['width', 'depth', 'height'].every(key => Number.isFinite(dimensions[key]) && dimensions[key] > 0)) {
      const format = new Intl.NumberFormat('tr-TR', {maximumFractionDigits: 1});
      ['width', 'depth', 'height'].forEach(key => { $('#dimension-' + key).textContent = format.format(dimensions[key]) + ' cm'; });
      $('#dimensions').hidden = false;
    }
    const previewURL = safeAsset(product.previewURL, /\.(png|jpe?g|webp)$/i);
    if (previewURL) {
      preview.alt = (product.name || 'Taslak ürün') + ' kaynak model önizlemesi';
      preview.src = previewURL; preview.hidden = false;
      on(preview, 'error', () => { preview.hidden = true; });
    }
    const modelURL = safeAsset(product.modelURL, /\.glb$/i);
    if (product.status !== 'ready' || !modelURL) {
      $('#appearance').hidden = true;
      $('.hint').hidden = true;
      fallback('Kaynak çizim hazır. Etkileşimli 3B modelin aktarımı henüz tamamlanmadı.');
      return;
    }
    if (!window.THREE || typeof THREE.GLTFLoader !== 'function') throw new Error('renderer-unavailable');
    say('3B model yükleniyor. Bu sırada kaynak modelin önizlemesini inceleyebilirsiniz.');
    const T = THREE;
    renderer = new T.WebGLRenderer({canvas: canvas, antialias: true, alpha: false, powerPreference: 'default'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    scene = new T.Scene(); scene.background = new T.Color('#eeece6');
    camera = new T.PerspectiveCamera(40, 1, .001, 1000);
    scene.add(new T.HemisphereLight('#fffdf5', '#9c9b94', 2));
    const key = new T.DirectionalLight('#fff9ef', 3); key.position.set(4, 7, 5); scene.add(key);
    const fill = new T.DirectionalLight('#eef3f7', 1.2); fill.position.set(-4, 3, -3); scene.add(fill);
    resize();
    const modelResponse = await fetch(modelURL, {signal: abort.signal});
    if (!modelResponse.ok) throw new Error('model-unavailable');
    const bytes = await modelResponse.arrayBuffer();
    const loader = new T.GLTFLoader();
    const gltf = await new Promise((resolve, reject) => loader.parse(bytes, new URL('.', modelURL).href, resolve, reject));
    if (disposed) { disposeObject(gltf.scene); return; }
    imported = gltf.scene;
    const originalBounds = new T.Box3().setFromObject(imported);
    const size = originalBounds.getSize(new T.Vector3());
    if (originalBounds.isEmpty() || ![size.x, size.y, size.z].every(Number.isFinite) || Math.max(size.x, size.y, size.z) <= 0) throw new Error('empty-model');
    const center = originalBounds.getCenter(new T.Vector3());
    displayRoot = new T.Group(); displayRoot.add(imported);
    // This rigid display translation leaves every imported mesh/geometry and its scale untouched.
    displayRoot.position.set(-center.x, -originalBounds.min.y, -center.z);
    scene.add(displayRoot);
    sourceBounds = new T.Box3().setFromObject(displayRoot);
    target = sourceBounds.getCenter(new T.Vector3());
    neutral = new T.MeshStandardMaterial({color: '#bdb8ad', roughness: .76, metalness: 0, side: T.DoubleSide});
    imported.traverse(child => { if (child.isMesh) { originalMaterials.set(child, child.material); child.material = neutral; child.castShadow = true; child.receiveShadow = true; } });
    const floorSize = Math.max(size.x, size.z, size.y) * 8;
    ground = new T.Mesh(new T.PlaneGeometry(floorSize, floorSize), new T.MeshStandardMaterial({color: '#e5e2da', roughness: 1}));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -Math.max(size.y * .0001, .00001); ground.receiveShadow = true; scene.add(ground);
    key.position.set(size.x * 3 + 1, size.y * 5 + 1, size.z * 4 + 1);
    ready = true; controls(true);
    // Measure the settled visible viewport, rather than retaining its pre-load size.
    // Keep the source preview until the first correctly fitted render has succeeded.
    canvas.hidden = false; setView('perspective');
    preview.hidden = true; say('');
    if (window.requestAnimationFrame) postLayoutFrame = window.requestAnimationFrame(() => {
      postLayoutFrame = null;
      if (!disposed && ready) resize();
    });
    viewport.setAttribute('aria-busy', 'false');
    document.body.setAttribute('data-model-status', 'ready');
    $('#model-download').href = modelURL; $('#model-download').hidden = false;
    document.querySelectorAll('[data-view]').forEach(button => on(button, 'click', () => setView(button.getAttribute('data-view'))));
    document.querySelectorAll('[data-appearance]').forEach(button => on(button, 'click', () => appearance(button.getAttribute('data-appearance'))));
    on($('#fit'), 'click', () => setView('perspective'));
    on($('#zoom-in'), 'click', () => zoom(.85)); on($('#zoom-out'), 'click', () => zoom(1 / .85));
    on(canvas, 'pointerdown', event => {
      if (event.button !== 0) return;
      drag = {id: event.pointerId, x: event.clientX, y: event.clientY, yaw: yaw, pitch: pitch};
      canvas.setPointerCapture(event.pointerId);
    });
    on(canvas, 'pointermove', event => {
      if (!drag || drag.id !== event.pointerId) return;
      yaw = drag.yaw - (event.clientX - drag.x) * .008;
      pitch = Math.max(-.12, Math.min(Math.PI / 2 - .001, drag.pitch + (event.clientY - drag.y) * .006));
      render();
    });
    const endDrag = () => { drag = null; };
    on(canvas, 'pointerup', endDrag); on(canvas, 'pointercancel', endDrag); on(canvas, 'lostpointercapture', endDrag);
    on(canvas, 'wheel', event => { event.preventDefault(); zoom(Math.exp(event.deltaY * .001)); }, {passive: false});
    on(canvas, 'keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'Home') return setView('perspective');
      if (event.key === '+' || event.key === '=') return zoom(.85);
      if (event.key === '-') return zoom(1 / .85);
      if (event.key === 'ArrowLeft') yaw -= .12;
      if (event.key === 'ArrowRight') yaw += .12;
      if (event.key === 'ArrowUp') pitch = Math.min(Math.PI / 2 - .001, pitch + .1);
      if (event.key === 'ArrowDown') pitch = Math.max(-.12, pitch - .1);
      render();
    });
    on(canvas, 'webglcontextlost', event => { event.preventDefault(); preview.hidden = !previewURL; fallback('3B görüntüleme kesildi. Kaynak modelin önizlemesi gösteriliyor.'); });
    if (window.ResizeObserver) { observer = new ResizeObserver(resize); observer.observe(viewport); }
    else on(window, 'resize', resize);
  } catch (error) {
    if (disposed || error.name === 'AbortError') return;
    if (error.message === 'unknown-product') {
      $('#product-name').textContent = 'Taslak ürün bulunamadı';
      fallback('Taslak ürünler listesinden bir ürün seçin.');
    } else fallback('Bu tarayıcıda etkileşimli 3B açılamadı. Varsa kaynak modelin önizlemesi gösteriliyor.');
  }
})();
