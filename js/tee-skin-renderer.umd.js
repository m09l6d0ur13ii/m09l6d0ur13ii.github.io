(function(global, factory) {
  typeof exports === "object" && typeof module !== "undefined"
    ? factory(exports)
    : typeof define === "function" && define.amd
      ? define(["exports"], factory)
      : (global = typeof globalThis !== "undefined" ? globalThis : global || self, factory(global.TeeSkinRenderer = {}));
})(this, function(exports) {
  "use strict";

  var defineProperty = Object.defineProperty;
  var setProperty = (obj, key, value) =>
    key in obj
      ? defineProperty(obj, key, { enumerable: true, configurable: true, writable: true, value: value })
      : (obj[key] = value);

  var setAndReturn = (obj, key, value) => (setProperty(obj, typeof key !== "symbol" ? key + "" : key, value), value);

  function teeColorToHsl(color) {
    return [
      ((color >> 16) & 255) * 360 / 255,
      ((color >> 8) & 255) * 100 / 255,
      ((color & 255) / 2 + 128) * 100 / 255
    ];
  }

  function teeColorToRgba(color) {
    return hslToRgba(teeColorToHsl(color));
  }

  function hslToRgba(hsl, alpha = 255) {
    const h = hsl[0] / 360, s = hsl[1] / 100, l = hsl[2] / 100;
    let c, x, m, r, g, b;
    if (s === 0) return [l * 255, l * 255, l * 255, alpha];
    let n = l < 0.5 ? l * (1 + s) : l + s - l * s;
    let p = 2 * l - n;
    let rgb = [];
    for (let i = 0; i < 3; i++) {
      let t = h + (1 / 3) * -(i - 1);
      if (t < 0) t++;
      if (t > 1) t--;
      if (6 * t < 1) r = p + (n - p) * 6 * t;
      else if (2 * t < 1) r = n;
      else if (3 * t < 2) r = p + (n - p) * (2 / 3 - t) * 6;
      else r = p;
      rgb[i] = r * 255;
    }
    rgb[3] = alpha;
    return rgb;
  }

  const colorUtils = Object.freeze(
    Object.defineProperty(
      { __proto__: null, convertHslToRgba: hslToRgba, convertTeeColorToHsl: teeColorToHsl, convertTeeColorToRgba: teeColorToRgba },
      Symbol.toStringTag,
      { value: "Module" }
    )
  );

  function debounce(fn, delay, immediate = false) {
    let timer;
    return function() {
      const context = this, args = arguments;
      clearTimeout(timer);
      if (immediate && !timer) fn.apply(context, args);
      timer = setTimeout(() => { if (!immediate) fn.apply(context, args); timer = undefined; }, delay);
    };
  }

  function throttle(fn, limit = 300) {
    let lastCall = 0, timer;
    return function() {
      const context = this, args = arguments;
      if (lastCall) {
        clearTimeout(timer);
        timer = setTimeout(() => {
          if (Date.now() - lastCall >= limit) { fn.apply(context, args); lastCall = Date.now(); }
        }, Math.max(limit - (Date.now() - lastCall), 0));
      } else { fn.apply(context, args); lastCall = Date.now(); }
    };
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.addEventListener("error", reject);
      img.addEventListener("load", e => {
        Promise.resolve(resolve(e.target)).then(() => img.remove());
      });
      img.src = url;
    });
  }

  function domReady(fn, args = []) {
    document.readyState !== "loading" ? fn(...args) : document.addEventListener("DOMContentLoaded", () => { fn(...args); });
  }

  const domUtils = Object.freeze(
    Object.defineProperty({ __proto__: null, debounce, domReady, loadImage, throttle }, Symbol.toStringTag, { value: "Module" })
  );

  class TeeRenderer {
    constructor(container, options) {
      setAndReturn(this, "_container");
      setAndReturn(this, "_eyes");
      setAndReturn(this, "_colorBody");
      setAndReturn(this, "_colorFeet");
      setAndReturn(this, "_useCustomColor");
      setAndReturn(this, "_followMouseFn", null);
      setAndReturn(this, "_skinUrl");
      setAndReturn(this, "_skinBitmap", null);
      setAndReturn(this, "_skinLoading", false);
      setAndReturn(this, "_skinLoadingPromise", null);
      setAndReturn(this, "_skinLoadedCallback", null);
      setAndReturn(this, "_offscreen", null);
      setAndReturn(this, "_offscreenContext", null);
      setAndReturn(this, "_image", null);
      setAndReturn(this, "_debounceUpdateTeeImage");

      if (container.tee !== undefined) throw new Error("TeeRenderer already initialized on this container");
      Object.defineProperty(container, "tee", { value: this, writable: false });
      this._container = container;
      this._colorBody = options.colorBody;
      this._colorFeet = options.colorFeet;
      this._useCustomColor = options.useCustomColor !== undefined ? options.useCustomColor : options.colorBody !== undefined || options.colorFeet !== undefined;
      this._eyes = options.eyes ?? "normal";
      this._skinUrl = options.skinUrl;
      this._container.classList.add("tee_initialized");
      this._container.classList.remove("tee_initializing");
      this._debounceUpdateTeeImage = debounce(this.updateTeeImage, 10);
      this.addEventListener("tee:rendered", () => { this._container.classList.add("tee_rendered"); }, { once: true });
      this.followMouse = options.followMouse === true;
      this.loadSkin(this._skinUrl, false);
    }

    get container() { return this._container; }
    get colorBody() { return this._colorBody; }
    set colorBody(val) { val === undefined && delete this._container.dataset.colorBody; this._colorBody = Number(val); this.update(); }
    get colorBodyHsl() { return this._colorBody === undefined ? undefined : teeColorToHsl(this._colorBody); }
    get colorBodyRgba() { return this._colorBody === undefined ? undefined : teeColorToRgba(this._colorBody); }
    get colorFeet() { return this._colorFeet; }
    set colorFeet(val) { val === undefined && delete this._container.dataset.colorFeet; this._colorFeet = Number(val); this.update(); }
    get colorFeetHsl() { return this._colorFeet === undefined ? undefined : teeColorToHsl(this._colorFeet); }
    get colorFeetRgba() { return this._colorFeet === undefined ? undefined : teeColorToRgba(this._colorFeet); }
    get useCustomColor() { return this._useCustomColor; }
    set useCustomColor(val) { this._container.dataset.useCustomColor = val ? "true" : "false"; this._useCustomColor = val; this.update(); }
    get eyes() { return this._eyes; }
    set eyes(val) { if (this._eyes !== val) { this._eyes = val; this._container.dataset.eyes = val; } }
    get followMouse() { return this._followMouseFn !== null; }
    set followMouse(val) {
      if (this.followMouse !== val) {
        if (val) {
          this._followMouseFn = this.mouseFollowThrottleCallbackFactory();
          document.addEventListener("mousemove", this._followMouseFn);
          this._container.dataset.followMouse = "true";
        } else {
          document.removeEventListener("mousemove", this._followMouseFn);
          this._followMouseFn = null;
          this._container.dataset.followMouse = "false";
        }
      }
    }

    mouseFollowThrottleCallbackFactory() {
      return throttle(e => {
        const rect = this._container.getBoundingClientRect();
        const dx = e.clientX - (rect.x + rect.width / 2);
        const dy = e.clientY - (rect.y + rect.height / 2 - rect.height * 0.125);
        const angle = Math.atan2(dy, dx);
        const offsetX = Math.cos(angle) * 0.125 * rect.width;
        const offsetY = Math.sin(angle) * 0.1 * rect.height;
        this._container.eyes.style.transform = `translate(${offsetX.toFixed(4)}px, ${offsetY.toFixed(4)}px)`;
      }, 20);
    }

    get skinUrl() { return this._skinUrl; }
    set skinUrl(val) { this.loadSkin(val, true); }
    get skinBitmap() { return this._skinBitmap; }

    setSkinVariableValue(val) { this._container.style.setProperty("--skin", val); }

    updateTeeImage() {
      if (!this._skinBitmap) return;
      if (!this._offscreen) {
        this._offscreen = new OffscreenCanvas(this._skinBitmap.width, this._skinBitmap.height);
        this._offscreenContext = this._offscreen.getContext("2d", { willReadFrequently: true });
      } else if (this._offscreen.width !== this._skinBitmap.width || this._offscreen.height !== this._skinBitmap.height) {
        this._offscreen.width = this._skinBitmap.width;
        this._offscreen.height = this._skinBitmap.height;
      }

      this._offscreenContext.clearRect(0, 0, this._offscreen.width, this._offscreen.height);
      this._offscreenContext.drawImage(this._skinBitmap, 0, 0);

      if (this.useCustomColor) {
        const body = this.colorBodyRgba || teeColorToRgba(0);
        const feet = this.colorFeetRgba || teeColorToRgba(0);
        const imgData = this._offscreenContext.getImageData(0, 0, this._offscreen.width, this._offscreen.height);
        const data = imgData.data;
        const nStartX = this._offscreen.width * 6 / 8;
        const nEndX = this._offscreen.width * 8 / 8;
        const nStartY = this._offscreen.height / 4;
        const nEndY = this._offscreen.height * 3 / 4;

        for (let c = 0; c < data.length; c += 4) {
          const x = c / 4 % this._offscreen.width;
          const y = Math.floor(c / 4 / this._offscreen.width);
          const gray = (data[c] + data[c + 1] + data[c + 2]) / 3;
          const color = x >= nStartX && x <= nEndX && y >= nStartY && y <= nEndY ? feet : body;
          data[c] = gray * color[0] / 255;
          data[c + 1] = gray * color[1] / 255;
          data[c + 2] = gray * color[2] / 255;
          data[c + 3] = data[c + 3] * color[3] / 255;
        }

        this._offscreenContext.putImageData(imgData, 0, 0);
      }

      this._offscreen.convertToBlob().then(blob => {
        const url = URL.createObjectURL(blob);
        const img = this._image || (this._image = new Image());
        img.onload = () => { this.setSkinVariableValue(`url('${url}')`); this.dispatchEvent("tee:rendered"); };
        img.src = url;
      });
    }

    dispatchEvent(...args) { this._container.dispatchEvent(new CustomEvent(args[0], { detail: { tee: this, payload: args[1] || undefined } })); }
    addEventListener(...args) { this._container.addEventListener(...args); }
    removeEventListener(...args) { this._container.removeEventListener(...args); }
    update() { this._debounceUpdateTeeImage(); }

    loadSkin(url, updateAfterLoad) {
      if (this._skinLoading) {
        this._skinLoadedCallback = () => this.loadSkin(url, updateAfterLoad);
        return;
      }

      const done = success => {
        this._skinLoadingPromise = null;
        this._skinLoading = false;
        this.dispatchEvent("tee:skin-loaded", { skin: url, success });
        if (updateAfterLoad) this.update();
        if (this._skinLoadedCallback) { this._skinLoadedCallback(); this._skinLoadedCallback = null; }
      };

      this._skinLoading = true;
      this._skinLoadedCallback = null;
      this._skinLoadingPromise = loadImage(url)
        .then(async img => { this._skinBitmap = await createImageBitmap(img); this._skinUrl = img.src; this._container.dataset.skin = this._skinUrl; done(true); })
        .catch(() => { console.warn(`TeeRenderer: cannot load skin '${url}'`); done(false); });

      return this._skinLoadingPromise;
    }
  }

  function createContainerElements(container) {
    const eyes = document.createElement("div");
    const footLeftOutline = document.createElement("div");
    const footLeft = document.createElement("div");
    const footRightOutline = document.createElement("div");
    const footRight = document.createElement("div");

    eyes.classList.add("tee__eyes");
    footLeftOutline.classList.add("tee__foot", "tee__foot_left", "tee__foot_outline");
    footLeft.classList.add("tee__foot", "tee__foot_left");
    footRightOutline.classList.add("tee__foot", "tee__foot_right", "tee__foot_outline");
    footRight.classList.add("tee__foot", "tee__foot_right");

    container.replaceChildren();
    container.appendChild(eyes);
    container.appendChild(footLeftOutline);
    container.appendChild(footLeft);
    container.appendChild(footRightOutline);
    container.appendChild(footRight);

    container.eyes = eyes;
  }

  async function createRendererAsync(container, options) {
    return new Promise((resolve, reject) => {
      setTimeout(() => reject(), 20000);
      try {
        container.classList.add("tee_initializing");
        createContainerElements(container);
        new TeeRenderer(container, options).addEventListener("tee:skin-loaded", e => resolve(e.detail.tee), { once: true });
      } catch {
        container.classList.remove("tee_initializing");
        reject();
      }
    });
  }

  async function initializeAsync(autoUpdate = true) {
    const containers = [...document.querySelectorAll(".tee:not(.tee_initialized):not(.tee_initializing)")].map(el =>
      createRendererAsync(el, {
        colorBody: parseInt(el.dataset.colorBody) || undefined,
        colorFeet: parseInt(el.dataset.colorFeet) || undefined,
        useCustomColor: el.dataset.useCustomColor !== undefined ? el.dataset.useCustomColor === "true" : undefined,
        eyes: el.dataset.eyes,
        followMouse: el.dataset.followMouse !== undefined ? el.dataset.followMouse === "true" : undefined,
        skinUrl: el.dataset.skin
      })
    );

    if (autoUpdate) {
      await Promise.allSettled(containers).then(results => {
        results.forEach(r => { if (r.status === "fulfilled") try { r.value.update(); } catch {} });
      });
    } else {
      containers.forEach(p => p.then(r => r.update()));
    }
  }

  async function createAsync(options) {
    const container = document.createElement("div");
    if (options.colorBody !== undefined) container.dataset.colorBody = options.colorBody + "";
    if (options.colorFeet !== undefined) container.dataset.colorFeet = options.colorFeet + "";
    if (options.useCustomColor !== undefined) container.dataset.useCustomColor = options.useCustomColor ? "true" : "false";
    if (options.eyes !== undefined) container.dataset.eyes = options.eyes;
    if (options.followMouse !== undefined) container.dataset.followMouse = options.followMouse ? "true" : "false";
    container.dataset.skin = options.skinUrl;
    container.classList.add("tee");

    const tee = await createRendererAsync(container, options);
    tee.update();
    return tee.container;
  }

  const rendererModule = Object.freeze(
    Object.defineProperty({ __proto__: null, TeeRenderer, createAsync, createContainerElements, createRendererAsync, initializeAsync }, Symbol.toStringTag, { value: "Module" })
  );

  domReady(() => { initializeAsync(); });
  exports.color = colorUtils;
  exports.createAsync = createAsync;
  exports.helpers = domUtils;
  exports.init = initializeAsync;
  exports.renderer = rendererModule;
  Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
});