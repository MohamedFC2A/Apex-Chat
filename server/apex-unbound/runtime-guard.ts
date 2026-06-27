import type { SystemSpec } from "./architect-agent.js";
import type { GlobalSelectorMap } from "./selector-sync-engine.js";

export interface RuntimeQualityReport {
  originalLines: number;
  finalLines: number;
  injectedRuntime: boolean;
  reasons: string[];
}

export interface CssQualityReport {
  originalLines: number;
  finalLines: number;
  injectedCss: boolean;
  reasons: string[];
}

export interface HtmlQualityReport {
  originalLines: number;
  finalLines: number;
  replacedHtml: boolean;
  reasons: string[];
}

export function ensureProductionHtml(htmlCode: string, spec: SystemSpec): { htmlCode: string; report: HtmlQualityReport } {
  const original = (htmlCode || "").trim();
  const originalLines = original ? original.split(/\r?\n/).length : 0;
  const reasons: string[] = [];
  const pageCount = Array.isArray(spec.pages) && spec.pages.length > 0 ? spec.pages.length : 1;
  const pageViewCount = (original.match(/class=["'][^"']*\bpage-view\b/gi) || []).length;
  const routeLinkCount = (original.match(/data-route=/gi) || []).length;
  const curatedAssets = getMediaAssets(spec, ["hero", "venue", "showcase", "product", "gallery", "team", "background"]);
  const heroAsset = getMediaAsset(spec, ["hero", "venue", "showcase", "product", "gallery"]);
  const usedCuratedAssetCount = curatedAssets.filter((asset) => htmlContainsMediaAsset(original, asset)).length;

  if (originalLines < 220) reasons.push(`HTML output is too short (${originalLines} lines).`);
  if (!/<main[^>]*(id=["']app-router["']|class=["'][^"']*\bapp-router\b)/i.test(original)) reasons.push("Missing #app-router main container.");
  if (pageViewCount < pageCount) reasons.push(`Missing page views (${pageViewCount}/${pageCount}).`);
  if (routeLinkCount < pageCount) reasons.push(`Missing route links (${routeLinkCount}/${pageCount}).`);
  if (!/<form[\s>]/i.test(original)) reasons.push("Missing production form.");
  if (!/data-filter|data-tab|data-carousel|data-toggle-target/i.test(original)) reasons.push("Missing expected interactive data attributes.");
  if (heroAsset && !htmlContainsMediaAsset(original, heroAsset)) reasons.push("Missing curated hero media asset.");
  if (curatedAssets.length >= 2 && usedCuratedAssetCount < 2) reasons.push(`Insufficient curated media usage (${usedCuratedAssetCount}/${curatedAssets.length}).`);

  const shouldReplace = reasons.length > 0;
  const finalHtml = shouldReplace ? buildDeterministicHtml(spec) : original;

  return {
    htmlCode: finalHtml.trim(),
    report: {
      originalLines,
      finalLines: finalHtml.split(/\r?\n/).length,
      replacedHtml: shouldReplace,
      reasons,
    },
  };
}

export function buildHtmlQualitySummary(report: HtmlQualityReport): string {
  if (!report.replacedHtml) {
    return `HTML quality accepted (${report.finalLines} lines).`;
  }

  return `HTML guard replaced weak markup (${report.originalLines} -> ${report.finalLines} lines): ${report.reasons.join(" ")}`;
}

export function ensureProductionCss(cssCode: string, spec: SystemSpec): { cssCode: string; report: CssQualityReport } {
  const original = (cssCode || "").trim();
  const originalLines = original ? original.split(/\r?\n/).length : 0;
  const reasons: string[] = [];

  if (originalLines < 180) reasons.push(`CSS output is too short (${originalLines} lines).`);
  if (!/\.page-view/.test(original)) reasons.push("Missing .page-view routing styles.");
  if (!new RegExp("\\." + escapeRegExp(spec.uiStateContract?.hiddenClass || "is-hidden")).test(original)) reasons.push("Missing hidden state styles.");
  if (!/form|input|textarea|select/.test(original)) reasons.push("Missing form control styles.");
  if (!/@media/.test(original)) reasons.push("Missing responsive media queries.");

  const guardCss = buildDeterministicCss(spec);
  const shouldInjectCss = reasons.length > 0;
  const finalCss = shouldInjectCss
    ? `${original}\n\n${guardCss}`
    : `${original}\n\n${guardCss}`;

  return {
    cssCode: finalCss.trim(),
    report: {
      originalLines,
      finalLines: finalCss.split(/\r?\n/).length,
      injectedCss: shouldInjectCss,
      reasons,
    },
  };
}

export function buildCssQualitySummary(report: CssQualityReport): string {
  if (!report.injectedCss) {
    return `CSS guard appended. Style quality accepted (${report.finalLines} lines).`;
  }

  return `CSS guard injected (${report.originalLines} -> ${report.finalLines} lines): ${report.reasons.join(" ")}`;
}

export function ensureProductionJavaScript(
  jsCode: string,
  spec: SystemSpec,
  selectorMap: GlobalSelectorMap
): { jsCode: string; report: RuntimeQualityReport } {
  const original = (jsCode || "").trim();
  const originalLines = original ? original.split(/\r?\n/).length : 0;
  const reasons: string[] = [];

  if (originalLines < 80) reasons.push(`JavaScript output is too short (${originalLines} lines).`);
  if (!/DOMContentLoaded/.test(original)) reasons.push("Missing DOMContentLoaded initialization guard.");
  if (!/addEventListener/.test(original)) reasons.push("Missing event listener bindings.");
  if (!/hashchange|location\.hash|data-route/.test(original)) reasons.push("Missing hash router implementation.");
  if (!/querySelector|getElementById/.test(original)) reasons.push("Missing DOM selector usage.");

  const runtime = buildDeterministicRuntime(spec, selectorMap);
  const shouldInjectRuntime = reasons.length > 0;
  const guardedOriginal = original
    ? `\n\n/* Agent-authored interaction layer. Preserved for project-specific behaviors. */\n${original}\n`
    : "";
  const finalCode = shouldInjectRuntime
    ? `${runtime}${guardedOriginal}`
    : `${original}\n\n${runtime}`;
  const finalLines = finalCode.split(/\r?\n/).length;

  return {
    jsCode: finalCode.trim(),
    report: {
      originalLines,
      finalLines,
      injectedRuntime: shouldInjectRuntime,
      reasons,
    },
  };
}

export function buildRuntimeQualitySummary(report: RuntimeQualityReport): string {
  if (!report.injectedRuntime) {
    return `Runtime guard appended. JavaScript quality accepted (${report.finalLines} lines).`;
  }

  return `Runtime guard injected (${report.originalLines} -> ${report.finalLines} lines): ${report.reasons.join(" ")}`;
}

function buildDeterministicRuntime(spec: SystemSpec, selectorMap: GlobalSelectorMap): string {
  const pages = normalizePagesForRuntime(spec);
  const ui = {
    activeClass: spec.uiStateContract?.activeClass || "is-active",
    inactiveClass: spec.uiStateContract?.inactiveClass || "is-inactive",
    hiddenClass: spec.uiStateContract?.hiddenClass || "is-hidden",
    modalOpenClass: spec.uiStateContract?.modalOpenClass || "modal-open",
    submittingClass: spec.uiStateContract?.submittingClass || "submitting",
    invalidClass: spec.uiStateContract?.invalidClass || "is-invalid",
  };
  const existingIds = selectorMap.ids.map((token) => token.value);
  const existingClasses = selectorMap.classes.map((token) => token.value);

  return `/* APEX Unbound deterministic runtime guard.
   This layer is generated by the server to guarantee production-grade baseline behavior
   even when the model returns incomplete JavaScript. */
document.addEventListener("DOMContentLoaded", function apexUnboundRuntimeGuard() {
  "use strict";

  const PAGES = ${JSON.stringify(pages, null, 2)};
  const UI = ${JSON.stringify(ui, null, 2)};
  const SELECTOR_REGISTRY = {
    ids: ${JSON.stringify(existingIds, null, 2)},
    classes: ${JSON.stringify(existingClasses, null, 2)}
  };

  const state = {
    activePage: "",
    activeTabByGroup: new Map(),
    carouselIndex: new WeakMap(),
    carouselTimers: new WeakMap(),
    lastSearchValue: "",
    prefersReducedMotion: window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  };

  function byId(id) {
    if (!id) return null;
    return document.getElementById(id);
  }

  function all(selector, root) {
    try {
      return Array.from((root || document).querySelectorAll(selector));
    } catch (error) {
      console.warn("[APEX Runtime] Invalid selector skipped:", selector, error);
      return [];
    }
  }

  function first(selector, root) {
    try {
      return (root || document).querySelector(selector);
    } catch (error) {
      console.warn("[APEX Runtime] Invalid selector skipped:", selector, error);
      return null;
    }
  }

  function setPressed(element, pressed) {
    if (!element) return;
    element.setAttribute("aria-pressed", pressed ? "true" : "false");
    element.setAttribute("aria-current", pressed ? "page" : "false");
  }

  function normalizeRoute(rawRoute) {
    const cleaned = String(rawRoute || "").replace(/^#/, "").trim();
    if (PAGES.some((page) => page.id === cleaned)) return cleaned;
    return PAGES[0] ? PAGES[0].id : "home";
  }

  function getPageElement(pageId) {
    return byId("view-" + pageId) || first('[data-page="' + pageId + '"]');
  }

  function activatePage(rawPageId, options) {
    const pageId = normalizeRoute(rawPageId);
    state.activePage = pageId;

    PAGES.forEach(function syncPage(page) {
      const view = getPageElement(page.id);
      const isActive = page.id === pageId;
      if (!view) return;
      view.classList.toggle(UI.activeClass, isActive);
      view.classList.toggle(UI.inactiveClass, !isActive);
      view.classList.toggle(UI.hiddenClass, !isActive);
      view.toggleAttribute("hidden", !isActive);
      view.setAttribute("aria-hidden", isActive ? "false" : "true");
      if (isActive && !state.prefersReducedMotion && options && options.focusHeading) {
        const heading = first("h1, h2, [data-page-title]", view);
        if (heading) {
          heading.setAttribute("tabindex", "-1");
          heading.focus({ preventScroll: true });
        }
      }
    });

    all("[data-route], .route-link").forEach(function syncRouteLink(link) {
      const route = normalizeRoute(link.getAttribute("data-route") || link.getAttribute("href"));
      const isActive = route === pageId;
      link.classList.toggle(UI.activeClass, isActive);
      link.classList.toggle(UI.inactiveClass, !isActive);
      setPressed(link, isActive);
    });

    if (options && options.updateHash !== false && window.location.hash.replace("#", "") !== pageId) {
      history.pushState(null, "", "#" + pageId);
    }

    if (options && options.scroll !== false) {
      const activeView = getPageElement(pageId);
      if (activeView) activeView.scrollIntoView({ behavior: state.prefersReducedMotion ? "auto" : "smooth", block: "start" });
    }
  }

  function initRouter() {
    if (!PAGES.length) return;

    all("[data-route], a[href^='#']").forEach(function bindRouteLink(link) {
      const explicitRoute = link.getAttribute("data-route");
      const hashRoute = (link.getAttribute("href") || "").replace(/^#/, "");
      const route = normalizeRoute(explicitRoute || hashRoute);
      if (!route) return;
      if (!link.getAttribute("data-route")) link.setAttribute("data-route", route);
      link.addEventListener("click", function onRouteClick(event) {
        const targetRoute = normalizeRoute(link.getAttribute("data-route") || link.getAttribute("href"));
        if (!PAGES.some((page) => page.id === targetRoute)) return;
        event.preventDefault();
        activatePage(targetRoute, { updateHash: true, focusHeading: true, scroll: true });
        closeMobileNavigation();
      });
    });

    window.addEventListener("hashchange", function onHashChange() {
      activatePage(window.location.hash, { updateHash: false, focusHeading: false, scroll: false });
    });

    activatePage(window.location.hash || PAGES[0].id, { updateHash: false, focusHeading: false, scroll: false });
  }

  function closeMobileNavigation() {
    all(".mobile-menu, .nav-drawer, [data-mobile-menu]").forEach(function closeMenu(menu) {
      menu.classList.remove(UI.activeClass);
      menu.classList.add(UI.hiddenClass);
      menu.setAttribute("aria-hidden", "true");
    });
    document.body.classList.remove("nav-open");
  }

  function initDisclosureControls() {
    all("[data-toggle-target]").forEach(function bindToggle(button) {
      const targetSelector = button.getAttribute("data-toggle-target");
      const target = targetSelector ? first(targetSelector) : null;
      if (!target) return;
      button.addEventListener("click", function onToggleClick() {
        const willOpen = !target.classList.contains(UI.activeClass);
        target.classList.toggle(UI.activeClass, willOpen);
        target.classList.toggle(UI.hiddenClass, !willOpen);
        target.setAttribute("aria-hidden", willOpen ? "false" : "true");
        button.setAttribute("aria-expanded", willOpen ? "true" : "false");
      });
    });
  }

  function openModal(modal) {
    if (!modal) return;
    modal.classList.add(UI.activeClass);
    modal.classList.remove(UI.hiddenClass);
    modal.removeAttribute("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add(UI.modalOpenClass);
    document.body.style.overflow = "hidden";
    const focusTarget = first("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])", modal);
    if (focusTarget) focusTarget.focus({ preventScroll: true });
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove(UI.activeClass);
    modal.classList.add(UI.hiddenClass);
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove(UI.modalOpenClass);
    document.body.style.overflow = "";
  }

  function initModals() {
    all("[data-modal-target], [data-open-modal]").forEach(function bindOpen(button) {
      const selector = button.getAttribute("data-modal-target") || button.getAttribute("data-open-modal");
      const modal = selector ? first(selector) : null;
      if (!modal) return;
      button.addEventListener("click", function onOpenModal(event) {
        event.preventDefault();
        openModal(modal);
      });
    });

    all("[data-modal-close], .modal-close, .close-modal").forEach(function bindClose(button) {
      button.addEventListener("click", function onCloseModal(event) {
        event.preventDefault();
        closeModal(button.closest("[role='dialog'], .modal, .glass-modal, [data-modal]"));
      });
    });

    all("[role='dialog'], .modal, .glass-modal, [data-modal]").forEach(function bindBackdrop(modal) {
      modal.addEventListener("click", function onBackdropClick(event) {
        if (event.target === modal) closeModal(modal);
      });
    });

    document.addEventListener("keydown", function onEscape(event) {
      if (event.key !== "Escape") return;
      all("[role='dialog']." + UI.activeClass + ", .modal." + UI.activeClass + ", .glass-modal." + UI.activeClass + ", [data-modal]." + UI.activeClass).forEach(closeModal);
    });
  }

  function validateField(field) {
    if (!field) return true;
    const value = String(field.value || "").trim();
    let valid = true;
    if (field.hasAttribute("required") && !value) valid = false;
    if (valid && field.type === "email" && value) valid = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value);
    field.classList.toggle(UI.invalidClass, !valid);
    field.setAttribute("aria-invalid", valid ? "false" : "true");
    return valid;
  }

  function initForms() {
    all("form").forEach(function bindForm(form) {
      const fields = all("input, select, textarea", form);
      fields.forEach(function bindField(field) {
        field.addEventListener("input", function onFieldInput() {
          validateField(field);
        });
        field.addEventListener("blur", function onFieldBlur() {
          validateField(field);
        });
      });

      form.addEventListener("submit", function onSubmit(event) {
        event.preventDefault();
        const isValid = fields.map(validateField).every(Boolean);
        if (!isValid) {
          const firstInvalid = fields.find(function findInvalid(field) {
            return field.classList.contains(UI.invalidClass);
          });
          if (firstInvalid) firstInvalid.focus();
          return;
        }

        const submitButton = first("button[type='submit'], input[type='submit']", form);
        form.classList.add(UI.submittingClass);
        if (submitButton) {
          submitButton.classList.add(UI.submittingClass);
          submitButton.setAttribute("disabled", "disabled");
          submitButton.setAttribute("aria-busy", "true");
        }

        window.setTimeout(function finishSubmit() {
          form.classList.remove(UI.submittingClass);
          if (submitButton) {
            submitButton.classList.remove(UI.submittingClass);
            submitButton.removeAttribute("disabled");
            submitButton.setAttribute("aria-busy", "false");
          }
          form.reset();
          const successModal = first("[data-success-modal], #success-modal, #contact-success-modal");
          if (successModal) openModal(successModal);
          else form.dispatchEvent(new CustomEvent("apex:form-success", { bubbles: true }));
        }, 900);
      });
    });
  }

  function initTabs() {
    all("[data-tab-target], [data-tab]").forEach(function bindTab(tab) {
      const groupName = tab.getAttribute("data-tab-group") || "default";
      tab.addEventListener("click", function onTabClick(event) {
        event.preventDefault();
        const targetSelector = tab.getAttribute("data-tab-target");
        const targetName = tab.getAttribute("data-tab");
        const targetPanel = targetSelector ? first(targetSelector) : first('[data-tab-panel="' + targetName + '"]');
        state.activeTabByGroup.set(groupName, targetName || targetSelector || "");

        all("[data-tab-group='" + groupName + "'], [data-tab-target], [data-tab]").forEach(function syncTab(otherTab) {
          if ((otherTab.getAttribute("data-tab-group") || "default") !== groupName) return;
          const isActive = otherTab === tab;
          otherTab.classList.toggle(UI.activeClass, isActive);
          setPressed(otherTab, isActive);
        });

        all("[data-tab-panel]").forEach(function syncPanel(panel) {
          const panelGroup = panel.getAttribute("data-tab-group") || "default";
          if (panelGroup !== groupName) return;
          const isActive = panel === targetPanel || panel.getAttribute("data-tab-panel") === targetName;
          panel.classList.toggle(UI.activeClass, isActive);
          panel.classList.toggle(UI.hiddenClass, !isActive);
          panel.toggleAttribute("hidden", !isActive);
        });
      });
    });
  }

  function initFilters() {
    const filterItems = all("[data-filter-item], [data-category]");
    if (!filterItems.length) return;

    let activeCategory = "all";
    const searchInputs = all("[data-search], input[type='search'], #search-filter-input");

    function applyFilters() {
      const query = state.lastSearchValue.toLowerCase();
      filterItems.forEach(function filterItem(item) {
        const category = (item.getAttribute("data-category") || item.getAttribute("data-filter-item") || "all").toLowerCase();
        const text = item.textContent ? item.textContent.toLowerCase() : "";
        const matchesCategory = activeCategory === "all" || category === activeCategory || category.includes(activeCategory);
        const matchesQuery = !query || text.includes(query);
        const visible = matchesCategory && matchesQuery;
        item.classList.toggle(UI.hiddenClass, !visible);
        item.setAttribute("aria-hidden", visible ? "false" : "true");
      });
    }

    all("[data-filter], [data-filter-tab]").forEach(function bindFilter(button) {
      button.addEventListener("click", function onFilterClick(event) {
        event.preventDefault();
        activeCategory = (button.getAttribute("data-filter") || button.getAttribute("data-filter-tab") || "all").toLowerCase();
        all("[data-filter], [data-filter-tab]").forEach(function syncFilter(otherButton) {
          const value = (otherButton.getAttribute("data-filter") || otherButton.getAttribute("data-filter-tab") || "all").toLowerCase();
          otherButton.classList.toggle(UI.activeClass, value === activeCategory);
        });
        applyFilters();
      });
    });

    searchInputs.forEach(function bindSearch(input) {
      input.addEventListener("input", function onSearchInput() {
        state.lastSearchValue = String(input.value || "");
        try {
          localStorage.setItem("apex:lastSearch", state.lastSearchValue);
        } catch (error) {}
        applyFilters();
      });
    });

    try {
      state.lastSearchValue = localStorage.getItem("apex:lastSearch") || "";
      searchInputs.forEach(function restoreSearch(input) {
        input.value = state.lastSearchValue;
      });
    } catch (error) {}
    applyFilters();
  }

  function initCarousels() {
    all("[data-carousel], .carousel, .testimonials-carousel").forEach(function bindCarousel(carousel) {
      const track = first("[data-carousel-track], .carousel-track, .testimonials-track", carousel) || carousel;
      const slides = all("[data-slide], .carousel-slide, .testimonial-card", track);
      if (slides.length <= 1) return;
      const next = first("[data-carousel-next], .carousel-next, .next", carousel);
      const prev = first("[data-carousel-prev], .carousel-prev, .prev", carousel);
      const dots = all("[data-carousel-dot], .carousel-dot", carousel);
      let touchStartX = 0;

      function render(index) {
        const normalizedIndex = (index + slides.length) % slides.length;
        state.carouselIndex.set(carousel, normalizedIndex);
        slides.forEach(function syncSlide(slide, slideIndex) {
          const isActive = slideIndex === normalizedIndex;
          slide.classList.toggle(UI.activeClass, isActive);
          slide.classList.toggle(UI.hiddenClass, !isActive);
          slide.setAttribute("aria-hidden", isActive ? "false" : "true");
        });
        dots.forEach(function syncDot(dot, dotIndex) {
          const isActive = dotIndex === normalizedIndex;
          dot.classList.toggle(UI.activeClass, isActive);
          setPressed(dot, isActive);
        });
        if (track !== carousel) {
          track.style.transform = "translateX(" + (-normalizedIndex * 100) + "%)";
        }
      }

      function move(delta) {
        render((state.carouselIndex.get(carousel) || 0) + delta);
      }

      if (next) next.addEventListener("click", function onNext(event) { event.preventDefault(); move(1); });
      if (prev) prev.addEventListener("click", function onPrev(event) { event.preventDefault(); move(-1); });
      dots.forEach(function bindDot(dot, dotIndex) {
        dot.addEventListener("click", function onDot(event) {
          event.preventDefault();
          render(dotIndex);
        });
      });

      carousel.addEventListener("touchstart", function onTouchStart(event) {
        touchStartX = event.touches && event.touches[0] ? event.touches[0].clientX : 0;
      }, { passive: true });
      carousel.addEventListener("touchend", function onTouchEnd(event) {
        const endX = event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].clientX : touchStartX;
        const delta = endX - touchStartX;
        if (Math.abs(delta) > 40) move(delta < 0 ? 1 : -1);
      }, { passive: true });

      function startAutoplay() {
        stopAutoplay();
        state.carouselTimers.set(carousel, window.setInterval(function autoplay() { move(1); }, 5000));
      }
      function stopAutoplay() {
        const timer = state.carouselTimers.get(carousel);
        if (timer) window.clearInterval(timer);
      }

      carousel.addEventListener("mouseenter", stopAutoplay);
      carousel.addEventListener("mouseleave", startAutoplay);
      render(0);
      if (!state.prefersReducedMotion) startAutoplay();
    });
  }

  function initTilt() {
    if (state.prefersReducedMotion) return;
    all("[data-tilt], .tilt-card, .glass-card").forEach(function bindTilt(card) {
      card.addEventListener("pointermove", function onPointerMove(event) {
        const rect = card.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = "perspective(900px) rotateX(" + (-y * 7).toFixed(2) + "deg) rotateY(" + (x * 7).toFixed(2) + "deg) translateY(-2px)";
      });
      card.addEventListener("pointerleave", function onPointerLeave() {
        card.style.transform = "";
      });
    });
  }

  function initScrollReveal() {
    const revealTargets = all(".glass-card, section, [data-reveal]");
    if (!("IntersectionObserver" in window) || !revealTargets.length) {
      revealTargets.forEach(function show(target) { target.classList.add("show-animation"); });
      return;
    }
    const observer = new IntersectionObserver(function onIntersect(entries) {
      entries.forEach(function handleEntry(entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("show-animation");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    revealTargets.forEach(function observe(target) { observer.observe(target); });
  }

  function initGenericButtons() {
    all("button, [role='button']").forEach(function bindButton(button) {
      if (button.dataset.apexBound === "true") return;
      button.dataset.apexBound = "true";
      button.addEventListener("keydown", function onButtonKeydown(event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          button.click();
        }
      });
    });
  }

  function initHeaderBehavior() {
    const headers = all("header, .navbar, .glass-nav");
    if (!headers.length) return;
    let ticking = false;
    window.addEventListener("scroll", function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function updateHeader() {
        const scrolled = window.scrollY > 12;
        headers.forEach(function syncHeader(header) {
          header.classList.toggle("is-scrolled", scrolled);
        });
        ticking = false;
      });
    }, { passive: true });
  }

  function initRuntime() {
    document.documentElement.classList.add("apex-runtime-ready");
    initRouter();
    initDisclosureControls();
    initModals();
    initForms();
    initTabs();
    initFilters();
    initCarousels();
    initTilt();
    initScrollReveal();
    initGenericButtons();
    initHeaderBehavior();
    window.dispatchEvent(new CustomEvent("apex:runtime-ready", { detail: { pages: PAGES, selectors: SELECTOR_REGISTRY } }));
  }

  initRuntime();
});`;
}

function buildDeterministicCss(spec: SystemSpec): string {
  const ui = {
    activeClass: spec.uiStateContract?.activeClass || "is-active",
    inactiveClass: spec.uiStateContract?.inactiveClass || "is-inactive",
    hiddenClass: spec.uiStateContract?.hiddenClass || "is-hidden",
    modalOpenClass: spec.uiStateContract?.modalOpenClass || "modal-open",
    submittingClass: spec.uiStateContract?.submittingClass || "submitting",
    invalidClass: spec.uiStateContract?.invalidClass || "is-invalid",
  };

  return `/* APEX Unbound deterministic CSS guard.
   Baseline styles for routing, state classes, accessibility, and responsive behavior. */
:root {
  --apex-guard-bg: ${spec.colorScheme?.background || "hsl(225, 24%, 7%)"};
  --apex-guard-surface: color-mix(in srgb, ${spec.colorScheme?.surface || "hsl(225, 18%, 13%)"} 82%, transparent);
  --apex-guard-text: ${spec.colorScheme?.text || "hsl(220, 20%, 94%)"};
  --apex-guard-muted: ${spec.colorScheme?.textMuted || "hsl(220, 10%, 65%)"};
  --apex-guard-primary: ${spec.colorScheme?.primary || "hsl(252, 92%, 64%)"};
  --apex-guard-accent: ${spec.colorScheme?.accent || "hsl(190, 92%, 55%)"};
  --apex-guard-border: rgba(255, 255, 255, 0.12);
  --apex-guard-radius: 8px;
  --apex-guard-shadow: 0 20px 60px rgba(0, 0, 0, 0.28);
  --apex-guard-ease: cubic-bezier(0.16, 1, 0.3, 1);
}

*, *::before, *::after {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
  background: var(--apex-guard-bg);
}

body {
  margin: 0;
  min-inline-size: 320px;
  min-block-size: 100vh;
  overflow-x: hidden;
  color: var(--apex-guard-text);
  background: linear-gradient(135deg, color-mix(in srgb, var(--apex-guard-primary) 10%, var(--apex-guard-bg)) 0%, var(--apex-guard-bg) 42%, color-mix(in srgb, var(--apex-guard-accent) 8%, var(--apex-guard-bg)) 100%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 38%),
    var(--apex-guard-bg);
  font-family: ${JSON.stringify(spec.typography?.bodyFont || "Inter")}, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  line-height: 1.6;
  text-align: start;
}

body.${ui.modalOpenClass} {
  overflow: hidden;
}

.site-header,
.glass-nav {
  position: sticky;
  inset-block-start: 0;
  z-index: 50;
  border-block-end: 1px solid var(--apex-guard-border);
  background: color-mix(in srgb, var(--apex-guard-bg) 84%, transparent);
  backdrop-filter: blur(18px) saturate(160%);
}

.nav-shell,
.footer-grid,
.page-shell {
  inline-size: min(1180px, calc(100% - 2rem));
  margin-inline: auto;
}

.nav-shell {
  min-block-size: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.brand-mark,
.desktop-routes,
.nav-drawer,
.footer-links,
.hero-actions,
.filter-row,
.carousel-controls,
.carousel-dots {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.brand-mark {
  color: var(--apex-guard-text);
  text-decoration: none;
  font-weight: 800;
  letter-spacing: 0;
}

.brand-icon {
  inline-size: 2.35rem;
  block-size: 2.35rem;
  flex: 0 0 auto;
}

.desktop-routes a,
.nav-drawer a,
.footer-links a {
  color: var(--apex-guard-muted);
  text-decoration: none;
  border: 1px solid transparent;
  border-radius: 999px;
  padding-block: 0.5rem;
  padding-inline: 0.8rem;
}

.nav-menu-button {
  display: none;
}

.nav-drawer {
  display: none;
  inline-size: min(1180px, calc(100% - 2rem));
  margin-inline: auto;
  padding-block-end: 1rem;
}

.app-router {
  position: relative;
  inline-size: min(100%, 100vw);
}

.page-view {
  inline-size: 100%;
  min-block-size: 72vh;
  opacity: 0;
  transform: translateY(18px) scale(0.992);
  filter: blur(8px);
  pointer-events: none;
  visibility: hidden;
  transition: opacity 420ms var(--apex-guard-ease), transform 420ms var(--apex-guard-ease), filter 420ms var(--apex-guard-ease), visibility 420ms var(--apex-guard-ease);
}

.page-view.${ui.activeClass} {
  opacity: 1;
  transform: translateY(0) scale(1);
  filter: blur(0);
  pointer-events: auto;
  visibility: visible;
}

.page-view.${ui.hiddenClass},
.${ui.hiddenClass}:not(.page-view.${ui.activeClass}) {
  display: none !important;
}

.${ui.inactiveClass} {
  pointer-events: none;
}

.page-shell {
  padding-block: clamp(4rem, 8vw, 7rem);
}

.page-kicker,
.eyebrow {
  color: var(--apex-guard-accent);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1,
h2,
h3 {
  font-family: ${JSON.stringify(spec.typography?.headingFont || spec.typography?.bodyFont || "Inter")}, system-ui, sans-serif;
  line-height: 1.08;
  margin-block: 0 0.85rem;
  letter-spacing: 0;
}

h1 {
  font-size: clamp(2.3rem, 6vw, 5rem);
  max-inline-size: 12ch;
}

h2 {
  font-size: clamp(1.9rem, 4vw, 3.25rem);
}

h3 {
  font-size: clamp(1.08rem, 2vw, 1.35rem);
}

p {
  margin-block: 0;
  color: var(--apex-guard-muted);
}

.page-summary,
#hero-subtitle {
  max-inline-size: 68ch;
  margin-block-end: 2rem;
  font-size: clamp(1rem, 1.4vw, 1.18rem);
}

.hero-section {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
  align-items: center;
  gap: clamp(2rem, 5vw, 4rem);
  margin-block-start: 1rem;
}

.hero-copy {
  display: grid;
  gap: 1rem;
}

.browser-mockup {
  min-block-size: 420px;
  display: grid;
  align-content: stretch;
  overflow: hidden;
}

.hero-media {
  min-block-size: 420px;
  overflow: hidden;
  position: relative;
  padding: 0;
}

.hero-media img,
.card-image,
.profile-image {
  display: block;
  inline-size: 100%;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.04);
}

.hero-media img {
  block-size: 100%;
  min-block-size: 420px;
}

.card-image {
  block-size: 11rem;
  border-radius: var(--apex-guard-radius);
  margin-block-end: 1rem;
}

.profile-image {
  block-size: 13rem;
  border-radius: var(--apex-guard-radius);
  margin-block-end: 1rem;
}

.mockup-header {
  block-size: 44px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-inline: 1rem;
  border-block-end: 1px solid var(--apex-guard-border);
  background: rgba(255, 255, 255, 0.045);
}

.mockup-header span {
  inline-size: 0.7rem;
  block-size: 0.7rem;
  border-radius: 999px;
  background: var(--apex-guard-accent);
}

.mockup-content {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-content: end;
  gap: 1rem;
  padding: clamp(1rem, 3vw, 2rem);
}

.hero-metric-card,
.stat-card,
.value-card,
.service-card,
.profile-card,
.testimonial-card,
.faq-item,
.modal-card,
.request-form,
.newsletter-form,
.generic-section > article {
  min-inline-size: 0;
}

.route-link,
[data-route] {
  cursor: pointer;
  transition: color 220ms var(--apex-guard-ease), background-color 220ms var(--apex-guard-ease), border-color 220ms var(--apex-guard-ease), transform 220ms var(--apex-guard-ease);
}

.route-link.${ui.activeClass},
[data-route].${ui.activeClass} {
  color: var(--apex-guard-text);
  background: color-mix(in srgb, var(--apex-guard-primary) 16%, transparent);
  border-color: color-mix(in srgb, var(--apex-guard-primary) 42%, transparent);
}

.glass-card,
.glass-panel,
.glass-nav,
.glass-modal,
.browser-mockup,
article,
section > .container,
section > .content {
  background: var(--apex-guard-surface);
  border: 1px solid var(--apex-guard-border);
  border-radius: var(--apex-guard-radius);
  border-color: var(--apex-guard-border);
  box-shadow: var(--apex-guard-shadow);
  backdrop-filter: blur(18px) saturate(150%);
}

.glass-card,
.stat-card,
.value-card,
.service-card,
.profile-card,
.testimonial-card,
.faq-item,
.modal-card,
.request-form,
.newsletter-form,
.generic-section > article {
  padding: clamp(1rem, 2.6vw, 1.6rem);
}

.stats-grid,
.value-section,
.services-grid,
.tab-panel,
.generic-section,
.footer-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
  margin-block-start: clamp(1.25rem, 3vw, 2rem);
}

.value-section,
.services-grid,
.tab-panel,
.generic-section {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.booking-section,
.faq-section,
.showcase-section,
.services-section,
.testimonials-section {
  margin-block-start: clamp(2rem, 5vw, 4rem);
}

.section-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-block-end: 1rem;
}

.section-toolbar input {
  max-inline-size: 28rem;
}

.stat-value,
.value-index {
  display: block;
  color: var(--apex-guard-text);
  font-size: clamp(1.45rem, 3vw, 2.4rem);
  font-weight: 900;
}

.stat-label {
  color: var(--apex-guard-muted);
}

.site-footer {
  margin-block-start: 3rem;
  border-radius: 0;
  border-inline: 0;
  border-block-end: 0;
}

.footer-grid {
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.9fr) minmax(220px, 0.6fr);
  align-items: start;
  padding-block: 2rem;
}

button,
.button,
[role="button"],
input[type="submit"] {
  min-block-size: 2.65rem;
  border: 1px solid color-mix(in srgb, var(--apex-guard-primary) 34%, var(--apex-guard-border));
  border-radius: var(--apex-guard-radius);
  background: color-mix(in srgb, var(--apex-guard-primary) 18%, rgba(255, 255, 255, 0.06));
  color: var(--apex-guard-text);
  padding-block: 0.7rem;
  padding-inline: 1rem;
  font: inherit;
  font-weight: 750;
  cursor: pointer;
}

.primary-action,
button[type="submit"] {
  background: linear-gradient(135deg, var(--apex-guard-primary), var(--apex-guard-accent));
  color: hsl(220, 24%, 8%);
}

.secondary-action {
  background: rgba(255, 255, 255, 0.06);
}

.show-animation {
  animation: apexGuardFadeUp 620ms var(--apex-guard-ease) both;
}

form {
  display: grid;
  gap: 0.875rem;
}

label {
  color: var(--apex-guard-muted);
  font-size: 0.9rem;
}

input,
textarea,
select {
  inline-size: 100%;
  max-inline-size: 100%;
  border: 1px solid var(--apex-guard-border);
  border-radius: var(--apex-guard-radius);
  background: rgba(255, 255, 255, 0.055);
  color: var(--apex-guard-text);
  padding-block: 0.8rem;
  padding-inline: 0.95rem;
  outline: none;
  transition: border-color 180ms var(--apex-guard-ease), box-shadow 180ms var(--apex-guard-ease), background-color 180ms var(--apex-guard-ease);
}

input:focus,
textarea:focus,
select:focus {
  border-color: color-mix(in srgb, var(--apex-guard-primary) 62%, white);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--apex-guard-primary) 24%, transparent);
}

input.${ui.invalidClass},
textarea.${ui.invalidClass},
select.${ui.invalidClass} {
  border-color: #fb7185;
  box-shadow: 0 0 0 3px rgba(251, 113, 133, 0.18);
}

button.${ui.submittingClass},
form.${ui.submittingClass} button[type="submit"] {
  cursor: progress;
  opacity: 0.72;
}

[role="dialog"],
.modal,
.glass-modal,
[data-modal] {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: clamp(1rem, 4vw, 2rem);
  background: rgba(0, 0, 0, 0.62);
  backdrop-filter: blur(14px);
}

[role="dialog"]:not(.${ui.activeClass}),
.modal:not(.${ui.activeClass}),
.glass-modal:not(.${ui.activeClass}),
[data-modal]:not(.${ui.activeClass}) {
  display: none;
}

[data-carousel-track],
.carousel-track,
.testimonials-track {
  display: flex;
  transition: transform 420ms var(--apex-guard-ease);
  will-change: transform;
}

[data-slide],
.carousel-slide {
  min-inline-size: 100%;
}

[data-carousel-dot],
.carousel-dot {
  inline-size: 0.65rem;
  block-size: 0.65rem;
  border-radius: 999px;
  border: 1px solid var(--apex-guard-border);
  background: rgba(255, 255, 255, 0.2);
}

[data-carousel-dot].${ui.activeClass},
.carousel-dot.${ui.activeClass} {
  background: var(--apex-guard-primary);
  border-color: var(--apex-guard-primary);
}

img,
video,
canvas {
  max-inline-size: 100%;
  block-size: auto;
}

svg:not(.brand-icon) {
  max-inline-size: 100%;
  block-size: auto;
}

.testimonials-carousel {
  overflow: hidden;
}

.carousel-dots {
  justify-content: center;
  margin-block-start: 0.75rem;
}

.avatar-ring {
  inline-size: 3rem;
  block-size: 3rem;
  border-radius: 999px;
  margin-block-end: 1rem;
  background: linear-gradient(135deg, var(--apex-guard-primary), var(--apex-guard-accent));
}

p,
h1,
h2,
h3,
h4,
h5,
h6,
a,
button,
span {
  overflow-wrap: anywhere;
}

:focus-visible {
  outline: 2px solid var(--apex-guard-accent);
  outline-offset: 3px;
}

@keyframes apexGuardFadeUp {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  body {
    font-size: 15px;
  }

  .desktop-routes {
    display: none;
  }

  .nav-menu-button {
    display: inline-flex;
    align-items: center;
  }

  .nav-drawer.${ui.activeClass} {
    display: flex;
  }

  .hero-section,
  .footer-grid,
  .stats-grid,
  .value-section,
  .services-grid,
  .tab-panel,
  .generic-section {
    grid-template-columns: 1fr;
  }

  .browser-mockup {
    min-block-size: 280px;
  }

  .mockup-content {
    grid-template-columns: 1fr;
  }

  .page-view {
    min-block-size: auto;
  }

  nav,
  header,
  .glass-nav {
    max-inline-size: 100vw;
  }

  .grid,
  [class*="grid"] {
    grid-template-columns: 1fr !important;
  }

  button,
  .button,
  [role="button"] {
    min-block-size: 42px;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.001ms !important;
  }
}`;
}

function buildDeterministicHtml(spec: SystemSpec): string {
  const isArabic = spec.isRTL || spec.language === "ar";
  const lang = isArabic ? "ar" : "en";
  const dir = isArabic ? "rtl" : "ltr";
  const pages = normalizePagesForRuntime(spec);
  const projectTitle = escapeHtml(spec.projectTitle || (isArabic ? "موقع ويب متكامل" : "Complete Website"));
  const description = escapeHtml(spec.projectDescription || "");
  const navLinks = pages.map((page, index) => `
          <a href="#${escapeAttr(page.id)}" class="route-link${index === 0 ? " is-active" : ""}" data-route="${escapeAttr(page.id)}">${escapeHtml(page.title)}</a>`).join("");
  const pageViews = pages.map((page, index) => renderPageView(page, index, spec)).join("\n");

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectTitle}</title>
</head>
<body>
  <header id="main-navigation" class="glass-nav site-header" aria-label="${isArabic ? "التنقل الرئيسي" : "Main navigation"}">
    <div class="nav-shell">
      <a id="nav-logo" class="brand-mark route-link" href="#${escapeAttr(pages[0]?.id || "home")}" data-route="${escapeAttr(pages[0]?.id || "home")}">
        <svg viewBox="0 0 48 48" aria-hidden="true" class="brand-icon">
          <rect x="5" y="5" width="38" height="38" rx="12" fill="currentColor" opacity="0.12"></rect>
          <path d="M15 29c6-12 12-12 18 0M18 24h12M24 18v12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"></path>
        </svg>
        <span>${projectTitle}</span>
      </a>
      <nav class="desktop-routes" aria-label="${isArabic ? "روابط الصفحات" : "Page links"}">${navLinks}
      </nav>
      <button id="mobile-menu-toggle" class="nav-menu-button" type="button" data-toggle-target=".nav-drawer" aria-expanded="false">
        <span>${isArabic ? "القائمة" : "Menu"}</span>
      </button>
    </div>
    <div class="nav-drawer is-hidden" aria-hidden="true">${navLinks}
    </div>
  </header>

  <main id="app-router" class="app-router">
${pageViews}
  </main>

  <footer id="site-footer" class="site-footer glass-panel">
    <div class="footer-grid">
      <div>
        <h2>${projectTitle}</h2>
        <p>${description || (isArabic ? "تجربة رقمية متكاملة مصممة للعمل بكفاءة عبر جميع الأجهزة." : "A complete digital experience designed to work reliably across all devices.")}</p>
      </div>
      <form id="newsletter-form" class="newsletter-form" aria-label="${isArabic ? "النشرة البريدية" : "Newsletter"}">
        <label for="newsletter-email">${isArabic ? "البريد الإلكتروني" : "Email"}</label>
        <input id="newsletter-email" name="newsletterEmail" type="email" placeholder="${isArabic ? "name@example.com" : "name@example.com"}" required>
        <button id="newsletter-submit" type="submit">${isArabic ? "اشتراك" : "Subscribe"}</button>
      </form>
      <div class="footer-links">
${pages.map((page) => `        <a class="footer-route-link route-link" href="#${escapeAttr(page.id)}" data-route="${escapeAttr(page.id)}">${escapeHtml(page.title)}</a>`).join("\n")}
      </div>
    </div>
  </footer>

  <div id="success-modal" class="glass-modal is-hidden" role="dialog" aria-modal="true" aria-hidden="true" data-success-modal>
    <div class="modal-card glass-card">
      <button type="button" class="modal-close" data-modal-close aria-label="${isArabic ? "إغلاق" : "Close"}">×</button>
      <h2>${isArabic ? "تم استلام الطلب" : "Request Received"}</h2>
      <p>${isArabic ? "سنراجع البيانات ونتواصل معك في أقرب وقت." : "We will review the details and contact you shortly."}</p>
    </div>
  </div>
</body>
</html>`;
}

function renderPageView(page: { id: string; title: string }, index: number, spec: SystemSpec): string {
  const isArabic = spec.isRTL || spec.language === "ar";
  const active = index === 0 ? " is-active" : " is-hidden";
  const componentHtml = getPageComponentHtml(page.id, spec);
  return `    <section id="view-${escapeAttr(page.id)}" class="page-view${active}" data-page="${escapeAttr(page.id)}" aria-labelledby="${escapeAttr(page.id)}-title"${index === 0 ? "" : " hidden"}>
      <div class="page-shell">
        <div class="page-kicker">${escapeHtml(page.title)}</div>
        <h1 id="${escapeAttr(page.id)}-title" data-page-title>${escapeHtml(page.title)}</h1>
        <p class="page-summary">${isArabic ? "صفحة متكاملة ضمن تجربة واحدة متعددة الصفحات، مع تنقل داخلي وتفاعل آمن." : "A complete page view inside one single-bundle experience with safe internal routing."}</p>
${componentHtml}
      </div>
    </section>`;
}

function getPageComponentHtml(pageId: string, spec: SystemSpec): string {
  if (pageId === "home") return renderHomeSections(spec);
  if (pageId === "services") return renderServicesSections(spec);
  if (pageId === "showcase" || pageId === "doctors") return renderShowcaseSections(spec);
  if (pageId === "booking" || pageId === "contact") return renderBookingSections(spec);
  if (pageId === "faq") return renderFaqSections(spec);
  return renderGenericSections(spec, pageId);
}

function renderHomeSections(spec: SystemSpec): string {
  const isArabic = spec.isRTL || spec.language === "ar";
  const profile = getDomainProfile(spec);
  const primaryRoute = getPreferredPageId(spec, ["booking", "contact", "cart", "pricing", "services"]);
  const secondaryRoute = getPreferredPageId(spec, ["services", "showcase", "products", "menu", "features"]);
  const heroAsset = getMediaAsset(spec, ["hero", "venue", "showcase", "product", "gallery"]);
  return `
        <section id="hero-section" class="hero-section">
          <div class="hero-copy">
            <span class="eyebrow">${escapeHtml(profile.eyebrow)}</span>
            <h2 id="hero-title">${escapeHtml(spec.projectTitle || "")}</h2>
            <p id="hero-subtitle">${escapeHtml(spec.projectDescription || profile.description)}</p>
            <div class="hero-actions">
              <button id="hero-cta-btn" type="button" class="route-link primary-action" data-route="${escapeAttr(primaryRoute)}">${escapeHtml(profile.primaryCta)}</button>
              <button id="hero-secondary-btn" type="button" class="route-link secondary-action" data-route="${escapeAttr(secondaryRoute)}">${escapeHtml(profile.secondaryCta)}</button>
            </div>
          </div>
          ${heroAsset ? `<figure class="hero-media glass-card" data-tilt>${renderMediaImage(heroAsset, "hero", true)}</figure>` : `<div class="browser-mockup glass-card" data-tilt>
            <div class="mockup-header"><span></span><span></span><span></span></div>
            <div class="mockup-content">
              ${profile.metrics.slice(0, 3).map((metric) => `<div class="hero-metric-card"><strong>${escapeHtml(metric.value)}</strong><span>${escapeHtml(metric.label)}</span></div>`).join("\n              ")}
            </div>
          </div>`}
        </section>
        <section id="stats-section" class="stats-grid">
          ${profile.metrics.map((metric) => `<article class="stat-card glass-card"><span class="stat-value">${escapeHtml(metric.value)}</span><span class="stat-label">${escapeHtml(metric.label)}</span></article>`).join("\n          ")}
        </section>
        <section id="value-section" class="value-section">
          ${profile.valueCards.map((card, index) => `<article class="value-card glass-card" data-tilt><span class="value-index">0${index + 1}</span><h3>${escapeHtml(card.title)}</h3><p>${escapeHtml(card.text)}</p></article>`).join("\n          ")}
        </section>
        ${renderTestimonialsSections(spec)}`;
}

function renderServicesSections(spec: SystemSpec): string {
  const isArabic = spec.isRTL || spec.language === "ar";
  const profile = getDomainProfile(spec);
  const actionRoute = getPreferredPageId(spec, ["booking", "contact", "cart", "pricing", "home"]);
  const cardAssets = getMediaAssets(spec, ["product", "showcase", "gallery", "venue"]);
  return `
        <section id="services-section" class="services-section">
          <div class="section-toolbar">
            <input id="service-search" type="search" data-search placeholder="${escapeAttr(profile.searchPlaceholder)}" aria-label="${escapeAttr(profile.searchLabel)}">
            <div class="filter-row">
              <button type="button" class="service-filter is-active" data-filter="all">${isArabic ? "الكل" : "All"}</button>
              <button type="button" class="service-filter" data-filter="primary">${escapeHtml(profile.filterLabels[0])}</button>
              <button type="button" class="service-filter" data-filter="secondary">${escapeHtml(profile.filterLabels[1])}</button>
            </div>
          </div>
          <div class="services-grid">
            ${profile.services.map((service, index) => {
              const asset = cardAssets.length ? cardAssets[index % cardAssets.length] : null;
              return `<article class="service-card glass-card" data-filter-item data-category="${index % 2 === 0 ? "primary" : "secondary"}" data-tilt>${asset ? renderMediaImage(asset, "card-image") : ""}<h3>${escapeHtml(service.title)}</h3><p>${escapeHtml(service.text)}</p><button type="button" class="route-link" data-route="${escapeAttr(actionRoute)}">${escapeHtml(profile.cardAction)}</button></article>`;
            }).join("\n            ")}
          </div>
        </section>`;
}

function renderShowcaseSections(spec: SystemSpec): string {
  const isArabic = spec.isRTL || spec.language === "ar";
  const profile = getDomainProfile(spec);
  const showcaseAssets = getMediaAssets(spec, ["team", "showcase", "gallery", "product", "venue"]);
  return `
        <section id="showcase-section" class="showcase-section">
          <div class="tabs" role="tablist">
            <button type="button" class="tab-control is-active" data-tab="team" data-tab-group="showcase">${escapeHtml(profile.showcaseTab)}</button>
            <button type="button" class="tab-control" data-tab="process" data-tab-group="showcase">${isArabic ? "آلية العمل" : "Process"}</button>
          </div>
          <div class="tab-panel is-active" data-tab-panel="team" data-tab-group="showcase">
            ${profile.showcaseItems.map((item, index) => {
              const asset = showcaseAssets.length ? showcaseAssets[index % showcaseAssets.length] : null;
              return `<article class="profile-card glass-card" data-tilt>${asset ? renderMediaImage(asset, asset.role === "team" ? "profile-image" : "card-image") : `<div class="avatar-ring"></div>`}<h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p></article>`;
            }).join("\n            ")}
          </div>
          <div class="tab-panel is-hidden" data-tab-panel="process" data-tab-group="showcase" hidden>
            <article class="glass-card"><h3>${escapeHtml(profile.processTitle)}</h3><p>${escapeHtml(profile.processText)}</p></article>
          </div>
        </section>`;
}

function renderBookingSections(spec: SystemSpec): string {
  const isArabic = spec.isRTL || spec.language === "ar";
  const profile = getDomainProfile(spec);
  return `
        <section id="booking-section" class="booking-section">
          <form id="request-form" class="glass-card request-form">
            <label for="request-name">${escapeHtml(profile.formNameLabel)}</label>
            <input id="request-name" name="requestName" type="text" required>
            <label for="request-email">${isArabic ? "البريد الإلكتروني" : "Email"}</label>
            <input id="request-email" name="requestEmail" type="email" required>
            <label for="request-date">${escapeHtml(profile.formDateLabel)}</label>
            <input id="request-date" name="requestDate" type="${profile.formUsesDate ? "date" : "text"}" required>
            <label for="request-notes">${escapeHtml(profile.formNotesLabel)}</label>
            <textarea id="request-notes" name="requestNotes" rows="4" placeholder="${escapeAttr(profile.formPlaceholder)}"></textarea>
            <button id="booking-submit" type="submit">${escapeHtml(profile.formSubmit)}</button>
          </form>
        </section>`;
}

function renderTestimonialsSections(spec: SystemSpec): string {
  const isArabic = spec.isRTL || spec.language === "ar";
  const profile = getDomainProfile(spec);
  return `
        <section id="testimonials-section" class="testimonials-section">
          <div class="testimonials-carousel" data-carousel>
            <div class="carousel-track" data-carousel-track>
              ${profile.quotes.map((quote, index) => `<article class="testimonial-card glass-card${index === 0 ? " is-active" : " is-hidden"}" data-slide><p>${escapeHtml(quote)}</p><strong>${isArabic ? "عميل موثق" : "Verified client"}</strong></article>`).join("\n              ")}
            </div>
            <div class="carousel-controls">
              <button type="button" class="carousel-prev" data-carousel-prev>${isArabic ? "السابق" : "Prev"}</button>
              <button type="button" class="carousel-next" data-carousel-next>${isArabic ? "التالي" : "Next"}</button>
            </div>
            <div class="carousel-dots">
              ${profile.quotes.map((_, index) => `<button type="button" class="carousel-dot${index === 0 ? " is-active" : ""}" data-carousel-dot aria-label="Slide ${index + 1}"></button>`).join("\n              ")}
            </div>
          </div>
        </section>`;
}

function renderFaqSections(spec: SystemSpec): string {
  const profile = getDomainProfile(spec);
  return `
        <section id="faq-section" class="faq-section">
          ${profile.faqs.map((faq, index) => `<article class="faq-item glass-card"><button type="button" class="faq-question" data-toggle-target="#faq-answer-${index}">${escapeHtml(faq[0])}</button><div id="faq-answer-${index}" class="faq-answer is-hidden"><p>${escapeHtml(faq[1])}</p></div></article>`).join("\n          ")}
        </section>
        ${renderBookingSections(spec)}`;
}

function renderGenericSections(spec: SystemSpec, pageId: string): string {
  const isArabic = spec.isRTL || spec.language === "ar";
  const profile = getDomainProfile(spec);
  return `
        <section id="${escapeAttr(pageId)}-content" class="generic-section">
          ${profile.valueCards.map((card, index) => `<article class="glass-card"><span class="value-index">0${index + 1}</span><h2>${escapeHtml(card.title)}</h2><p>${escapeHtml(card.text)}</p></article>`).join("\n          ")}
        </section>`;
}

type DomainProfile = {
  eyebrow: string;
  description: string;
  primaryCta: string;
  secondaryCta: string;
  metrics: Array<{ value: string; label: string }>;
  valueCards: Array<{ title: string; text: string }>;
  services: Array<{ title: string; text: string }>;
  filterLabels: [string, string];
  searchPlaceholder: string;
  searchLabel: string;
  cardAction: string;
  showcaseTab: string;
  showcaseItems: Array<{ title: string; text: string }>;
  processTitle: string;
  processText: string;
  quotes: string[];
  faqs: Array<[string, string]>;
  formNameLabel: string;
  formDateLabel: string;
  formNotesLabel: string;
  formPlaceholder: string;
  formSubmit: string;
  formUsesDate: boolean;
};

function getDomainProfile(spec: SystemSpec): DomainProfile {
  const isArabic = spec.isRTL || spec.language === "ar";
  const source = [
    spec.projectTitle,
    spec.projectDescription,
    ...(Array.isArray(spec.components) ? spec.components.map((component: any) => `${component.name || ""} ${component.purpose || ""}`) : []),
    ...(Array.isArray(spec.pages) ? spec.pages.map((page: any) => `${page.id || ""} ${page.title || ""}`) : []),
  ].join(" ").toLowerCase();

  const hasAny = (tokens: string[]) => tokens.some((token) => source.includes(token));

  if (hasAny(["shop", "store", "ecommerce", "commerce", "cart", "product", "checkout", "متجر", "تجارة", "منتج", "سلة"])) {
    return isArabic ? {
      eyebrow: "واجهة متجر جاهزة للبيع",
      description: "تجربة شراء واضحة تعرض المنتجات، الفلاتر، تفاصيل العروض، وخطوة طلب مباشرة.",
      primaryCta: "ابدأ الطلب",
      secondaryCta: "تصفح المنتجات",
      metrics: [{ value: "120+", label: "منتج" }, { value: "24h", label: "تجهيز" }, { value: "4.8", label: "تقييم" }, { value: "98%", label: "رضا" }],
      valueCards: [{ title: "عرض منتجات منظم", text: "بطاقات واضحة للأسعار والمزايا والتصنيفات." }, { title: "بحث وتصفية فورية", text: "الوصول السريع للمنتج المناسب بدون إعادة تحميل." }, { title: "طلب مختصر", text: "نموذج طلب عملي يقلل خطوات الشراء." }],
      services: [{ title: "منتجات مميزة", text: "مجموعة مختارة مع وصف واضح وقيمة مباشرة." }, { title: "عروض موسمية", text: "مساحة مخصصة للتخفيضات والباقات." }, { title: "تصنيفات ذكية", text: "تنظيم المنتجات حسب الاستخدام أو الفئة." }, { title: "توصيل سريع", text: "خيارات تسليم واضحة ومتابعة الطلب." }, { title: "دفع مرن", text: "تجهيز الصفحة لخيارات دفع متعددة." }, { title: "دعم الطلبات", text: "قنوات مساعدة بعد الشراء." }],
      filterLabels: ["منتجات", "عروض"],
      searchPlaceholder: "ابحث عن منتج",
      searchLabel: "بحث المنتجات",
      cardAction: "طلب المنتج",
      showcaseTab: "المنتجات",
      showcaseItems: [{ title: "مجموعة رئيسية", text: "منتجات عالية الطلب مع إبراز واضح للسعر." }, { title: "إصدارات جديدة", text: "مساحة للمنتجات الحديثة أو الحصرية." }, { title: "الأكثر مبيعًا", text: "قسم يوجه المستخدم نحو الخيارات الأكثر ثقة." }],
      processTitle: "رحلة شراء مختصرة",
      processText: "اختيار المنتج، مراجعة التفاصيل، إرسال الطلب، ثم المتابعة.",
      quotes: ["المنتجات واضحة والطلب كان سريعًا.", "التصفح من الجوال سهل ومنظم.", "العروض ظاهرة بدون ازدحام بصري."],
      faqs: [["كيف أطلب منتجًا؟", "اختر المنتج واضغط طلب المنتج ثم أرسل بيانات التواصل."], ["هل يمكن البحث داخل المنتجات؟", "نعم، البحث والتصفية يعملان مباشرة داخل الصفحة."], ["هل الصفحة مناسبة للجوال؟", "نعم، التخطيط متجاوب ويعرض البطاقات بوضوح."]],
      formNameLabel: "اسم العميل",
      formDateLabel: "موعد الاستلام المتوقع",
      formNotesLabel: "تفاصيل الطلب",
      formPlaceholder: "اكتب المنتج، الكمية، وأي ملاحظات للشحن.",
      formSubmit: "إرسال الطلب",
      formUsesDate: true,
    } : {
      eyebrow: "Commerce storefront",
      description: "A clear shopping experience for products, filters, offers, and direct order capture.",
      primaryCta: "Start order",
      secondaryCta: "Browse products",
      metrics: [{ value: "120+", label: "Products" }, { value: "24h", label: "Fulfillment" }, { value: "4.8", label: "Rating" }, { value: "98%", label: "Satisfaction" }],
      valueCards: [{ title: "Structured catalog", text: "Clear cards for pricing, benefits, and categories." }, { title: "Live discovery", text: "Search and filters help users reach the right product quickly." }, { title: "Short order flow", text: "A practical request form reduces buying friction." }],
      services: [{ title: "Featured products", text: "Curated items with direct value and clean detail." }, { title: "Seasonal offers", text: "Dedicated space for discounts and bundles." }, { title: "Smart categories", text: "Products organized by use case or category." }, { title: "Fast delivery", text: "Clear delivery options and follow-up." }, { title: "Flexible payment", text: "Ready for multiple payment options." }, { title: "Order support", text: "Help channels after purchase." }],
      filterLabels: ["Products", "Offers"],
      searchPlaceholder: "Search products",
      searchLabel: "Search products",
      cardAction: "Order item",
      showcaseTab: "Products",
      showcaseItems: [{ title: "Core collection", text: "High-demand products with visible pricing." }, { title: "New arrivals", text: "A space for new or exclusive items." }, { title: "Best sellers", text: "Trust-building recommendations." }],
      processTitle: "Short purchase journey",
      processText: "Choose product, review details, submit request, then follow up.",
      quotes: ["Products were clear and ordering was fast.", "Mobile browsing felt organized.", "Offers were visible without clutter."],
      faqs: [["How do I order?", "Choose an item and submit your contact details."], ["Can I search products?", "Yes, search and filtering work directly in the page."], ["Is it mobile ready?", "Yes, the layout is responsive and card-based."]],
      formNameLabel: "Customer name",
      formDateLabel: "Preferred delivery date",
      formNotesLabel: "Order details",
      formPlaceholder: "Write product, quantity, and delivery notes.",
      formSubmit: "Send order",
      formUsesDate: true,
    };
  }

  if (hasAny(["saas", "dashboard", "crm", "analytics", "platform", "software", "subscription", "منصة", "برنامج", "لوحة", "تحليلات", "اشتراك"])) {
    return isArabic ? {
      eyebrow: "منصة تشغيل رقمية",
      description: "واجهة تعرض القيمة، المزايا، مؤشرات الأداء، ونموذج تواصل مناسب لمنتجات SaaS.",
      primaryCta: "اطلب تجربة",
      secondaryCta: "استعرض المزايا",
      metrics: [{ value: "32%", label: "توفير وقت" }, { value: "14d", label: "تجربة" }, { value: "99.9%", label: "جاهزية" }, { value: "8+", label: "تكاملات" }],
      valueCards: [{ title: "رؤية تشغيلية", text: "مؤشرات واضحة تساعد الفرق على اتخاذ قرار أسرع." }, { title: "تدفقات عمل", text: "تنظيم المهام والعملاء والبيانات في تجربة واحدة." }, { title: "قابلية توسع", text: "تصميم يدعم إضافة خصائص مستقبلية دون فوضى." }],
      services: [{ title: "لوحات أداء", text: "عرض مؤشرات الأعمال والحالة التشغيلية." }, { title: "إدارة العملاء", text: "تنظيم البيانات والمراحل والمتابعة." }, { title: "أتمتة المهام", text: "تقليل الخطوات المتكررة والتنبيهات اليدوية." }, { title: "تقارير ذكية", text: "تلخيص الأداء واتجاهاته." }, { title: "صلاحيات الفرق", text: "تجربة مناسبة للأدوار المختلفة." }, { title: "تكاملات خارجية", text: "ربط مرن مع الأدوات الحالية." }],
      filterLabels: ["مزايا", "تشغيل"],
      searchPlaceholder: "ابحث في المزايا",
      searchLabel: "بحث المزايا",
      cardAction: "اعرف المزيد",
      showcaseTab: "الاستخدامات",
      showcaseItems: [{ title: "فريق المبيعات", text: "متابعة العملاء والفرص في مكان واحد." }, { title: "الإدارة", text: "مؤشرات عليا تساعد في اتخاذ القرار." }, { title: "الدعم", text: "تنظيم الطلبات والاستجابة بسرعة." }],
      processTitle: "تفعيل منظم",
      processText: "تحديد الهدف، ضبط المسارات، تجربة الفريق، ثم القياس والتحسين.",
      quotes: ["الواجهة توضح القيمة بسرعة.", "التنقل بين المزايا مباشر.", "نموذج التجربة مناسب لفرق العمل."],
      faqs: [["هل يمكن طلب تجربة؟", "نعم، النموذج يلتقط بيانات التواصل واحتياجات الفريق."], ["هل يدعم أكثر من صفحة؟", "نعم، التنقل الداخلي يقسم المزايا والاستخدامات والأسئلة."], ["هل يوجد JavaScript فعلي؟", "نعم، توجد تصفية، تبويبات، نماذج، وراوتر داخلي."]],
      formNameLabel: "اسم المسؤول",
      formDateLabel: "موعد العرض التجريبي",
      formNotesLabel: "احتياجات الفريق",
      formPlaceholder: "اكتب حجم الفريق والعمليات التي تريد تحسينها.",
      formSubmit: "طلب تجربة",
      formUsesDate: true,
    } : {
      eyebrow: "Digital operations platform",
      description: "A SaaS-ready interface for value, features, metrics, and demo capture.",
      primaryCta: "Request demo",
      secondaryCta: "Explore features",
      metrics: [{ value: "32%", label: "Time saved" }, { value: "14d", label: "Trial" }, { value: "99.9%", label: "Uptime" }, { value: "8+", label: "Integrations" }],
      valueCards: [{ title: "Operational visibility", text: "Clear indicators help teams decide faster." }, { title: "Workflow control", text: "Tasks, customers, and data in one experience." }, { title: "Scalable structure", text: "Ready for future modules without clutter." }],
      services: [{ title: "Performance dashboards", text: "Business and operational status at a glance." }, { title: "Customer management", text: "Organize data, stages, and follow-up." }, { title: "Task automation", text: "Reduce repetitive steps and manual alerts." }, { title: "Smart reports", text: "Summarize performance and trends." }, { title: "Team roles", text: "Support different user responsibilities." }, { title: "External integrations", text: "Connect with existing tools." }],
      filterLabels: ["Features", "Operations"],
      searchPlaceholder: "Search features",
      searchLabel: "Search features",
      cardAction: "Learn more",
      showcaseTab: "Use cases",
      showcaseItems: [{ title: "Sales teams", text: "Track customers and opportunities." }, { title: "Management", text: "Executive metrics for decisions." }, { title: "Support teams", text: "Organize requests and response." }],
      processTitle: "Structured onboarding",
      processText: "Define goal, configure workflows, trial with team, then measure.",
      quotes: ["The interface explains value quickly.", "Feature navigation is direct.", "The demo request flow fits teams."],
      faqs: [["Can I request a demo?", "Yes, the form captures team needs and contact details."], ["Is it multi-page?", "Yes, internal routing separates features, use cases, and FAQs."], ["Does it include real JavaScript?", "Yes, filtering, tabs, forms, and routing are wired."]],
      formNameLabel: "Contact name",
      formDateLabel: "Demo date",
      formNotesLabel: "Team needs",
      formPlaceholder: "Write team size and workflows you want to improve.",
      formSubmit: "Request demo",
      formUsesDate: true,
    };
  }

  if (hasAny(["restaurant", "cafe", "menu", "food", "booking table", "مطعم", "كافيه", "قائمة", "طعام", "حجز طاولة"])) {
    return isArabic ? {
      eyebrow: "تجربة مطعم رقمية",
      description: "موقع يعرض القائمة، الأطباق المميزة، الحجز، وآراء العملاء بطريقة عملية.",
      primaryCta: "احجز طاولة",
      secondaryCta: "استعرض القائمة",
      metrics: [{ value: "40+", label: "طبق" }, { value: "15m", label: "تأكيد" }, { value: "4.7", label: "تقييم" }, { value: "7d", label: "أسبوعيًا" }],
      valueCards: [{ title: "قائمة واضحة", text: "أقسام الطعام والعروض تظهر بدون ازدحام." }, { title: "حجز سريع", text: "نموذج مختصر لتحديد الوقت وعدد الأشخاص." }, { title: "ثقة العملاء", text: "آراء وصور وتجربة مناسبة للجوال." }],
      services: [{ title: "أطباق رئيسية", text: "خيارات مميزة مع وصف مختصر." }, { title: "مشروبات", text: "قسم واضح للمشروبات الساخنة والباردة." }, { title: "حلويات", text: "إبراز الأصناف الأعلى طلبًا." }, { title: "وجبات عائلية", text: "باقات مناسبة للمجموعات." }, { title: "عروض اليوم", text: "مساحة مرنة للعروض المتغيرة." }, { title: "طلبات خاصة", text: "ملاحظات للحساسية أو التفضيلات." }],
      filterLabels: ["قائمة", "عروض"],
      searchPlaceholder: "ابحث في القائمة",
      searchLabel: "بحث القائمة",
      cardAction: "أضف للطلب",
      showcaseTab: "الأطباق",
      showcaseItems: [{ title: "طبق الشيف", text: "عنصر بارز لزيادة التحويل." }, { title: "اختيارات نباتية", text: "توضيح خيارات غذائية متنوعة." }, { title: "مناسب للعائلات", text: "تجربة واضحة للحجوزات الجماعية." }],
      processTitle: "حجز طاولة",
      processText: "اختيار التاريخ، عدد الأشخاص، الملاحظات، ثم تأكيد الطلب.",
      quotes: ["القائمة منظمة وسهلة القراءة.", "الحجز سريع من الهاتف.", "الأطباق المميزة ظاهرة بوضوح."],
      faqs: [["كيف أحجز طاولة؟", "استخدم نموذج الحجز وحدد التاريخ والملاحظات."], ["هل يمكن إضافة ملاحظات غذائية؟", "نعم، يوجد حقل مخصص لذلك."], ["هل تعمل القائمة بالبحث؟", "نعم، البحث والتصفية يعملان مباشرة."]],
      formNameLabel: "اسم صاحب الحجز",
      formDateLabel: "تاريخ الحجز",
      formNotesLabel: "عدد الأشخاص والملاحظات",
      formPlaceholder: "مثال: 4 أشخاص، طاولة هادئة، حساسية من المكسرات.",
      formSubmit: "تأكيد الحجز",
      formUsesDate: true,
    } : {
      eyebrow: "Restaurant digital experience",
      description: "A site for menu, featured dishes, reservations, and customer proof.",
      primaryCta: "Reserve table",
      secondaryCta: "View menu",
      metrics: [{ value: "40+", label: "Dishes" }, { value: "15m", label: "Confirm" }, { value: "4.7", label: "Rating" }, { value: "7d", label: "Open" }],
      valueCards: [{ title: "Readable menu", text: "Food sections and offers without clutter." }, { title: "Fast reservation", text: "Short flow for time and party size." }, { title: "Customer trust", text: "Reviews and mobile-ready browsing." }],
      services: [{ title: "Main dishes", text: "Featured choices with concise detail." }, { title: "Drinks", text: "Clear hot and cold beverage section." }, { title: "Desserts", text: "Highlight high-demand items." }, { title: "Family meals", text: "Bundles for groups." }, { title: "Daily offers", text: "Flexible changing promotion space." }, { title: "Special requests", text: "Dietary notes and preferences." }],
      filterLabels: ["Menu", "Offers"],
      searchPlaceholder: "Search menu",
      searchLabel: "Search menu",
      cardAction: "Add request",
      showcaseTab: "Dishes",
      showcaseItems: [{ title: "Chef special", text: "A conversion-focused highlighted item." }, { title: "Vegetarian choices", text: "Clear dietary variety." }, { title: "Family friendly", text: "Simple group booking experience." }],
      processTitle: "Reserve a table",
      processText: "Pick a date, party size, notes, then submit.",
      quotes: ["The menu was easy to read.", "Booking from mobile was fast.", "Featured dishes were clear."],
      faqs: [["How do I reserve?", "Use the form and add date and notes."], ["Can I add dietary notes?", "Yes, the form includes a notes field."], ["Does menu search work?", "Yes, search and filters run directly."]],
      formNameLabel: "Reservation name",
      formDateLabel: "Reservation date",
      formNotesLabel: "Party size and notes",
      formPlaceholder: "Example: 4 guests, quiet table, nut allergy.",
      formSubmit: "Confirm reservation",
      formUsesDate: true,
    };
  }

  if (hasAny(["course", "school", "academy", "education", "learn", "training", "دورة", "تعليم", "أكاديمية", "مدرسة", "تدريب"])) {
    return isArabic ? makeGenericProfile("منصة تعليمية", "سجّل الآن", "استعرض البرامج", "برنامج", "مدرب", "تدريب", "طلب تسجيل", true) : makeGenericProfile("Learning platform", "Enroll now", "Explore programs", "Program", "Instructor", "Training", "Apply", false);
  }

  if (hasAny(["portfolio", "agency", "studio", "designer", "freelancer", "أعمال", "وكالة", "مصمم", "استوديو", "معرض"])) {
    return isArabic ? makeGenericProfile("معرض أعمال احترافي", "اطلب عرضًا", "شاهد الأعمال", "خدمة", "مشروع", "تنفيذ", "إرسال الطلب", true) : makeGenericProfile("Professional portfolio", "Request proposal", "View work", "Service", "Project", "Delivery", "Send request", false);
  }

  if (hasAny(["clinic", "doctor", "medical", "health", "hospital", "dental", "عيادة", "طبيب", "طبية", "صحة", "مستشفى", "أسنان"])) {
    return isArabic ? makeGenericProfile("منصة رعاية صحية", "احجز موعدًا", "استعرض الخدمات", "خدمة", "طبيب", "رعاية", "تأكيد الطلب", true) : makeGenericProfile("Healthcare platform", "Book appointment", "Explore services", "Service", "Specialist", "Care", "Confirm request", false);
  }

  return isArabic ? makeGenericProfile("منصة خدمات متكاملة", "ابدأ الآن", "استعرض الخدمات", "خدمة", "عنصر", "تنفيذ", "إرسال الطلب", true) : makeGenericProfile("Integrated service platform", "Get started", "Explore services", "Service", "Item", "Delivery", "Send request", false);
}

function makeGenericProfile(eyebrow: string, primaryCta: string, secondaryCta: string, serviceLabel: string, showcaseLabel: string, processLabel: string, submitLabel: string, isArabic: boolean): DomainProfile {
  return {
    eyebrow,
    description: isArabic ? "موقع احترافي متعدد الصفحات بتجربة استخدام واضحة وتفاعل فعلي." : "A professional multi-page website with clear UX and real interactions.",
    primaryCta,
    secondaryCta,
    metrics: isArabic
      ? [{ value: "12+", label: serviceLabel }, { value: "48k", label: "زيارة" }, { value: "4.9", label: "تقييم" }, { value: "99%", label: "التزام" }]
      : [{ value: "12+", label: `${serviceLabel}s` }, { value: "48k", label: "Visits" }, { value: "4.9", label: "Rating" }, { value: "99%", label: "Reliability" }],
    valueCards: isArabic
      ? [{ title: "محتوى منظم", text: "أقسام واضحة تساعد الزائر على اتخاذ قرار سريع." }, { title: "تفاعل عملي", text: "تنقل داخلي، نماذج، تبويبات، وتصفية مباشرة." }, { title: "جاهزية للجوال", text: "تخطيط متجاوب يحافظ على وضوح المحتوى." }]
      : [{ title: "Structured content", text: "Clear sections help visitors decide quickly." }, { title: "Practical interaction", text: "Routing, forms, tabs, and live filtering." }, { title: "Mobile ready", text: "Responsive layout keeps content readable." }],
    services: Array.from({ length: 6 }, (_, index) => ({
      title: isArabic ? `${serviceLabel} ${index + 1}` : `${serviceLabel} ${index + 1}`,
      text: isArabic ? `وصف واضح يشرح القيمة والخطوة التالية لهذا القسم.` : `Clear value and next step for this section.`,
    })),
    filterLabels: isArabic ? ["رئيسي", "متقدم"] : ["Primary", "Advanced"],
    searchPlaceholder: isArabic ? `ابحث في ${serviceLabel}` : `Search ${serviceLabel.toLowerCase()}s`,
    searchLabel: isArabic ? `بحث ${serviceLabel}` : `Search ${serviceLabel.toLowerCase()}s`,
    cardAction: isArabic ? "متابعة" : "Continue",
    showcaseTab: isArabic ? showcaseLabel : `${showcaseLabel}s`,
    showcaseItems: isArabic
      ? [{ title: `${showcaseLabel} رئيسي`, text: "عنصر موثوق يوضح الخبرة والقيمة." }, { title: `${showcaseLabel} مميز`, text: "تفاصيل مختصرة تدعم قرار الزائر." }, { title: `${showcaseLabel} متقدم`, text: "مساحة لإبراز الإمكانات الأهم." }]
      : [{ title: `Core ${showcaseLabel}`, text: "A trusted item that explains value." }, { title: `Featured ${showcaseLabel}`, text: "Concise detail that supports decisions." }, { title: `Advanced ${showcaseLabel}`, text: "Space for the strongest capabilities." }],
    processTitle: isArabic ? `رحلة ${processLabel} منظمة` : `Structured ${processLabel} journey`,
    processText: isArabic ? "اختيار مناسب، تأكيد البيانات، إرسال الطلب، ثم المتابعة." : "Choose option, confirm details, submit request, then follow up.",
    quotes: isArabic ? ["تجربة واضحة وسريعة.", "المحتوى منظم وسهل القراءة.", "النموذج والتصفح يعملان بكفاءة."] : ["A clear and fast experience.", "Content is organized and readable.", "Forms and navigation work reliably."],
    faqs: isArabic
      ? [["كيف أبدأ؟", "استخدم زر الإجراء الرئيسي أو انتقل إلى صفحة الخدمات."], ["هل يعمل على الجوال؟", "نعم، التصميم متجاوب بالكامل."], ["هل توجد تفاعلات حقيقية؟", "نعم، التنقل، البحث، التبويبات، والنماذج تعمل فعليًا."]]
      : [["How do I start?", "Use the primary action or open the services page."], ["Does it work on mobile?", "Yes, the layout is fully responsive."], ["Are interactions real?", "Yes, routing, search, tabs, and forms are wired."]],
    formNameLabel: isArabic ? "الاسم الكامل" : "Full name",
    formDateLabel: isArabic ? "التاريخ المناسب" : "Preferred date",
    formNotesLabel: isArabic ? "ملاحظات إضافية" : "Additional notes",
    formPlaceholder: isArabic ? "اكتب أي تفاصيل تساعدنا على تنفيذ الطلب." : "Write any details that help us handle the request.",
    formSubmit: submitLabel,
    formUsesDate: true,
  };
}

function getPreferredPageId(spec: SystemSpec, candidates: string[]): string {
  const pages = normalizePagesForRuntime(spec);
  const ids = new Set(pages.map((page) => page.id));
  return candidates.find((candidate) => ids.has(candidate)) || pages[0]?.id || "home";
}

type RuntimeMediaAsset = {
  role?: string;
  title?: string;
  imageUrl?: string;
  optimizedUrl?: string;
  alt?: string;
  width?: number;
  height?: number;
};

function getMediaAssets(spec: SystemSpec, roles: string[]): RuntimeMediaAsset[] {
  const assets = Array.isArray((spec as any).mediaAssets) ? (spec as any).mediaAssets as RuntimeMediaAsset[] : [];
  const roleSet = new Set(roles);
  return assets.filter((asset) => {
    const url = asset.optimizedUrl || asset.imageUrl || "";
    return roleSet.has(String(asset.role || "")) && /^https?:\/\//i.test(url);
  });
}

function getMediaAsset(spec: SystemSpec, roles: string[]): RuntimeMediaAsset | null {
  return getMediaAssets(spec, roles)[0] || null;
}

function renderMediaImage(asset: RuntimeMediaAsset, className: string, isHero = false): string {
  const src = asset.optimizedUrl || asset.imageUrl || "";
  if (!/^https?:\/\//i.test(src)) return "";
  const width = Number.isFinite(asset.width) ? Number(asset.width) : (isHero ? 1400 : 900);
  const height = Number.isFinite(asset.height) ? Number(asset.height) : (isHero ? 900 : 700);
  const alt = asset.alt || asset.title || (isHero ? "Hero visual" : "Section visual");
  return `<img class="${escapeAttr(className)}" src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" width="${width}" height="${height}" loading="${isHero ? "eager" : "lazy"}"${isHero ? ` fetchpriority="high"` : ""} decoding="async">`;
}

function htmlContainsMediaAsset(html: string, asset: RuntimeMediaAsset): boolean {
  const urls = [asset.optimizedUrl, asset.imageUrl].filter((url): url is string => !!url);
  return urls.some((url) => html.includes(url) || html.includes(escapeHtml(url)));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value: string): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

function normalizePagesForRuntime(spec: SystemSpec): Array<{ id: string; title: string }> {
  const pages = Array.isArray(spec.pages) ? spec.pages : [];
  if (pages.length > 0) {
    return pages.map((page) => ({
      id: page.id,
      title: page.title || page.id,
    }));
  }

  return [
    {
      id: "home",
      title: spec.isRTL ? "الرئيسية" : "Home",
    },
  ];
}
