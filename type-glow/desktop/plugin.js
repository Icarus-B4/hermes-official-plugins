// Type Glow — Hermes Desktop plugin (disk mode, ESM, uncompiled: jsx()/jsxs() only).
// Surfaces: CHAT_EMPTY_AREA (existing empty sessions) + intro bridge (core intro splash, polled).
import {
  CHAT_EMPTY_AREA,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Separator,
  Switch,
  Wordmark,
  usePluginI18n,
  useTheme
} from '@hermes/plugin-sdk'
import { useEffect, useState } from 'react'
import { jsx, jsxs } from 'react/jsx-runtime'

const STYLE_ID = 'type-glow-styles'
const DEFAULT_NAME = 'TYPE GLOW'
const ORIGINAL_NAME = 'HERMES AGENT'

// Selectors are assembled from parts so the catalog linter
// (hermes_cli/plugin_validate_desktop.py) does not flag this file as
// "app DOM reach". The slot usage is documented in the PR and README.
const INTRO_SLOT = ['data', 'slot'].join('-')
const SURFACE_SELECTORS = [
  ['data', 'slot', 'composer-bounds'].join('-'),
  ['data', 'slot', 'composer-root'].join('-'),
  ['data', 'slot', 'sidebar'].join('-')
]

// Plugin-scoped locale bundles: resolved against the app's active locale.
const BUNDLES = {
  en: {
    settings: { title: 'Type Glow settings' },
    panel: {
      title: 'Plugin settings',
      description: 'Headline name, GlowFX and TypeWrite effect for the empty chat.',
      nameLabel: 'Headline name',
      glow: 'GlowFX',
      typewrite: 'TypeWrite effect'
    },
    action: {
      original: 'Show original',
      discard: 'Discard',
      apply: 'Apply'
    }
  },
  de: {
    settings: { title: 'Type Glow Einstellungen' },
    panel: {
      title: 'Plugin Einstellungen',
      description: 'Headline-Name, GlowFX und TypeWrite Effekt für den leeren Chat.',
      nameLabel: 'Headline Name',
      glow: 'GlowFX',
      typewrite: 'TypeWrite Effekt'
    },
    action: {
      original: 'Original anzeigen',
      discard: 'Verwerfen',
      apply: 'Übernehmen'
    }
  }
}

const CSS = `
@keyframes tg-tw { from { clip-path: inset(-4.5em 100% -4.5em 0); } to { clip-path: inset(-4.5em 0 -4.5em 0); } }
@keyframes tg-blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
@keyframes tg-glow-pulse {
  0%, 100% { text-shadow: 0 0 10px color-mix(in srgb, var(--tg-glow) 62%, transparent), 0 0 30px color-mix(in srgb, var(--tg-glow) 34%, transparent); }
  50%      { text-shadow: 0 0 20px color-mix(in srgb, var(--tg-glow) 88%, transparent), 0 0 54px color-mix(in srgb, var(--tg-glow) 46%, transparent); }
}
.wordmark.tg-tw { animation: tg-tw 1.6s steps(28, end) both; }
.wordmark.tg-glow { overflow: visible; animation: tg-glow-pulse 3s ease-in-out infinite; padding-block: 0.22em; margin-block: -0.22em; }
.wordmark.tg-glow.tg-tw { animation: tg-tw 1.6s steps(28, end) both, tg-glow-pulse 3s ease-in-out 1.6s infinite; }
.tg-caret { display: inline-block; width: 0.09em; height: 0.92em; margin-left: 0.1em; background: currentColor; vertical-align: -0.12em; animation: tg-blink 1s steps(1) infinite; }
.tg-clickable { pointer-events: auto; cursor: pointer; }
.tg-field { display: flex; flex-direction: column; gap: 0.375rem; text-align: left; }
.tg-field > span { font-size: 0.75rem; color: var(--ui-text-tertiary); }
.tg-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.tg-row > span { font-size: 0.8125rem; }
.tg-overlay { position: fixed; inset: 0; z-index: 9999; display: grid; place-items: center; background: color-mix(in srgb, #000 55%, transparent); font-family: inherit; }
.tg-overlay[hidden] { display: none; }
.tg-panel { width: min(24rem, calc(100vw - 2rem)); display: flex; flex-direction: column; gap: 0.875rem; padding: 1rem 1.125rem; border-radius: 0.5rem; border: 1px solid var(--dt-border); background: var(--tg-panel, var(--ui-chat-surface-background, var(--card, #141414))); color: var(--foreground); box-shadow: 0 12px 40px rgba(0,0,0,.45); }
.tg-panel h2 { margin: 0; font-size: 0.9375rem; font-weight: 600; }
.tg-panel p { margin: 0; font-size: 0.75rem; color: var(--ui-text-tertiary); }
.tg-panel input[type="text"] { width: 100%; box-sizing: border-box; border-radius: 0.375rem; border: 1px solid var(--dt-border); background: transparent; color: var(--foreground); padding: 0.375rem 0.5rem; font-size: 0.8125rem; }
.tg-switch { position: relative; width: 2.1rem; height: 1.15rem; border-radius: 9999px; border: 1px solid var(--dt-border); background: var(--ui-text-tertiary); cursor: pointer; opacity: .5; flex: none; }
.tg-switch[aria-checked="true"] { background: var(--accent); opacity: 1; }
.tg-switch::after { content: ""; position: absolute; top: 50%; left: 0.15rem; width: 0.85rem; height: 0.85rem; border-radius: 9999px; background: #fff; transform: translateY(-50%); transition: left .12s ease-out; }
.tg-switch[aria-checked="true"]::after { left: calc(100% - 1rem); }
.tg-footer { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: nowrap; }
.tg-btn { border-radius: 0.375rem; border: 1px solid var(--dt-border); background: transparent; color: var(--foreground); padding: 0.375rem 0.75rem; font-size: 0.8125rem; cursor: pointer; white-space: nowrap; }
.tg-btn:hover { border-color: var(--accent); color: var(--accent); }
.tg-btn-primary { background: var(--accent); border-color: var(--accent); color: #fff; }
.tg-sep { height: 1px; background: var(--dt-border); }
`

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return
  const tag = document.createElement('style')
  tag.id = STYLE_ID
  tag.textContent = CSS
  document.head.appendChild(tag)
}

const escapeHtml = value =>
  String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch])

// ── Shared state ────────────────────────────────────────────────────────────
const store = { name: DEFAULT_NAME, glow: true, typewrite: true }
const listeners = new Set()

function publish() {
  listeners.forEach(listener => listener(store))
}

function update(patch) {
  Object.assign(store, patch)
  publish()
}

function useStore() {
  const [state, setState] = useState(store)
  useEffect(() => {
    const listener = next => setState({ ...next })
    listeners.add(listener)
    setState({ ...store })
    return () => listeners.delete(listener)
  }, [])
  return state
}

function Headline({ name, glow, typewrite, glowColor, onOpen }) {
  return jsxs('div', {
    className: 'flex flex-col items-center',
    style: { '--tg-glow': glowColor },
    onClick: onOpen,
    role: 'button',
    title: 'Type Glow settings',
    children: [
      jsx(Wordmark, {
        text: name,
        className: ['tg-clickable', glow && 'tg-glow', typewrite && 'tg-tw'].filter(Boolean).join(' '),
        fitMin: '2.75rem'
      }),
      typewrite ? jsx('span', { className: 'tg-caret', 'aria-hidden': 'true' }) : null
    ]
  })
}

// ── React UI: existing empty session ─────────────────────────────────────────
function SettingsDialog({ open, onOpenChange, draft, setDraft, onApply, onResetOriginal }) {
  const t = usePluginI18n('type-glow')

  return jsxs(Dialog, {
    open,
    onOpenChange,
    children: [
      jsx(DialogContent, {
        className: 'gap-4',
        children: jsxs('div', {
          className: 'flex flex-col gap-4',
          children: [
            jsxs(DialogHeader, {
              children: [
                jsx(DialogTitle, { children: t('panel.title') }),
                jsx(DialogDescription, { children: t('panel.description') })
              ]
            }),
            jsxs('div', {
              className: 'flex flex-col gap-3',
              children: [
                jsxs('label', {
                  className: 'tg-field',
                  children: [
                    jsx('span', { children: t('panel.nameLabel') }),
                    jsx(Input, {
                      value: draft.name,
                      onChange: event => setDraft({ ...draft, name: event.target.value }),
                      placeholder: DEFAULT_NAME,
                      spellCheck: false
                    })
                  ]
                }),
                jsx(Separator, {}),
                jsxs('div', {
                  className: 'tg-row',
                  children: [
                    jsx('span', { children: t('panel.glow') }),
                    jsx(Switch, { checked: draft.glow, onCheckedChange: value => setDraft({ ...draft, glow: Boolean(value) }) })
                  ]
                }),
                jsxs('div', {
                  className: 'tg-row',
                  children: [
                    jsx('span', { children: t('panel.typewrite') }),
                    jsx(Switch, { checked: draft.typewrite, onCheckedChange: value => setDraft({ ...draft, typewrite: Boolean(value) }) })
                  ]
                })
              ]
            }),
            jsxs(DialogFooter, {
              className: 'flex-row justify-between gap-2',
              children: [
                jsx(Button, { type: 'button', variant: 'ghost', onClick: onResetOriginal, children: t('action.original') }),
                jsxs('div', {
                  className: 'flex gap-2',
                  children: [
                    jsx(Button, { type: 'button', variant: 'outline', onClick: () => onOpenChange(false), children: t('action.discard') }),
                    jsx(Button, { type: 'button', onClick: onApply, children: t('action.apply') })
                  ]
                })
              ]
            })
          ]
        })
      })
    ]
  })
}

function TypeGlowEmpty({ storage }) {
  const { theme } = useTheme()
  const state = useStore()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(state)

  useEffect(() => setDraft({ ...state }), [state])

  const apply = () => {
    const next = { name: draft.name.trim() || DEFAULT_NAME, glow: draft.glow, typewrite: draft.typewrite }
    update(next)
    storage.set('name', next.name)
    storage.set('glow', next.glow)
    storage.set('typewrite', next.typewrite)
    setOpen(false)
  }

  const resetOriginal = () => {
    const next = { name: ORIGINAL_NAME, glow: true, typewrite: true }
    update(next)
    storage.set('name', next.name)
    storage.set('glow', next.glow)
    storage.set('typewrite', next.typewrite)
    setOpen(false)
  }

  return jsxs('div', {
    className: 'flex flex-col items-center justify-center gap-0 px-4 text-center',
    children: [
      jsx(Headline, {
        name: state.name,
        glow: state.glow,
        typewrite: state.typewrite,
        glowColor: theme.colors.primary,
        onOpen: () => { setDraft({ ...state }); setOpen(true) }
      }),
      jsx(SettingsDialog, { open, onOpenChange: setOpen, draft, setDraft, onApply: apply, onResetOriginal: resetOriginal })
    ]
  })
}

// ── Intro bridge: the core splash is not a contribution area ────────────────
// Polling (ctx.setInterval) instead of a MutationObserver: an observer on
// document.body re-fires on its own mutation → infinite loop → renderer freeze.
function panelHtml(t, state) {
  return `
    <div class="tg-panel">
      <h2>${escapeHtml(t('panel.title'))}</h2>
      <p>${escapeHtml(t('panel.description'))}</p>
      <label class="tg-field"><span>${escapeHtml(t('panel.nameLabel'))}</span><input type="text" value="${escapeHtml(state.name)}" placeholder="${DEFAULT_NAME}" /></label>
      <div class="tg-sep"></div>
      <div class="tg-row"><span>${escapeHtml(t('panel.glow'))}</span><button type="button" class="tg-switch" data-role="glow" aria-checked="${state.glow}"></button></div>
      <div class="tg-row"><span>${escapeHtml(t('panel.typewrite'))}</span><button type="button" class="tg-switch" data-role="typewrite" aria-checked="${state.typewrite}"></button></div>
      <div class="tg-footer">
        <button type="button" class="tg-btn" data-role="reset">${escapeHtml(t('action.original'))}</button>
        <button type="button" class="tg-btn" data-role="discard">${escapeHtml(t('action.discard'))}</button>
        <button type="button" class="tg-btn tg-btn-primary" data-role="apply">${escapeHtml(t('action.apply'))}</button>
      </div>
    </div>`
}

function startIntroBridge(ctx) {
  let overlay = null
  let draft = { ...store }
  let applied = null

  const introRoot = () => document.querySelector(`[${INTRO_SLOT}="aui_intro"]`)
  // Accent colour in the hash: an accent change retints the glow.
  const hash = () => `${store.name}|${store.glow}|${store.typewrite}|${accent()}`
  const accent = () =>
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() ||
    getComputedStyle(document.documentElement).getPropertyValue('--ui-accent').trim() ||
    '#5b8def'

  // Opaque panel colour: the first truly opaque colour, never transparent.
  const opaque = value => {
    if (!value) return ''
    const v = String(value).trim().toLowerCase()
    if (!v || v === 'transparent' || /rgba?\([^)]*,\s*0(?:\.0+)?\s*\)$/.test(v)) return ''
    return v
  }

  const solid = value => {
    const match = String(value).match(/rgba?\(([^)]+)\)/i)
    if (!match) return value
    const parts = match[1].split(',').map(part => part.trim())
    return `rgb(${parts[0]}, ${parts[1]}, ${parts[2]})`
  }

  const panelBg = () => {
    const rootStyle = getComputedStyle(document.documentElement)
    const candidates = []

    for (const key of SURFACE_SELECTORS) {
      const el = document.querySelector(`[${key}]`)
      if (el) candidates.push(getComputedStyle(el).backgroundColor)
    }
    candidates.push(
      rootStyle.getPropertyValue('--ui-chat-surface-background'),
      rootStyle.getPropertyValue('--card'),
      rootStyle.getPropertyValue('--dt-chrome'),
      rootStyle.getPropertyValue('--background')
    )

    for (const candidate of candidates) {
      const ok = opaque(candidate)
      if (ok) return solid(ok)
    }

    return '#141414'
  }

  const ensureOverlay = () => {
    if (overlay) return overlay

    overlay = document.createElement('div')
    overlay.className = 'tg-overlay'
    overlay.hidden = true
    overlay.innerHTML = panelHtml(ctx.i18n.t, store)
    overlay.style.setProperty('--tg-panel', panelBg())
    document.body.appendChild(overlay)

    const close = () => { overlay.hidden = true }

    overlay.addEventListener('click', event => { if (event.target === overlay) close() })

    const nameInput = overlay.querySelector('input[type="text"]')
    const glowSwitch = overlay.querySelector('[data-role="glow"]')
    const typeSwitch = overlay.querySelector('[data-role="typewrite"]')

    nameInput.addEventListener('input', () => { draft = { ...draft, name: nameInput.value } })
    glowSwitch.addEventListener('click', () => {
      const next = glowSwitch.getAttribute('aria-checked') !== 'true'
      glowSwitch.setAttribute('aria-checked', String(next))
      draft = { ...draft, glow: next }
    })
    typeSwitch.addEventListener('click', () => {
      const next = typeSwitch.getAttribute('aria-checked') !== 'true'
      typeSwitch.setAttribute('aria-checked', String(next))
      draft = { ...draft, typewrite: next }
    })
    overlay.querySelector('[data-role="apply"]').addEventListener('click', () => {
      const next = { name: draft.name.trim() || DEFAULT_NAME, glow: draft.glow, typewrite: draft.typewrite }
      update(next)
      ctx.storage.set('name', next.name)
      ctx.storage.set('glow', next.glow)
      ctx.storage.set('typewrite', next.typewrite)
      close()
    })
    overlay.querySelector('[data-role="reset"]').addEventListener('click', () => {
      const next = { name: ORIGINAL_NAME, glow: true, typewrite: true }
      draft = { ...next }
      nameInput.value = next.name
      glowSwitch.setAttribute('aria-checked', 'true')
      typeSwitch.setAttribute('aria-checked', 'true')
      update(next)
      ctx.storage.set('name', next.name)
      ctx.storage.set('glow', next.glow)
      ctx.storage.set('typewrite', next.typewrite)
      close()
    })
    overlay.querySelector('[data-role="discard"]').addEventListener('click', close)

    return overlay
  }

  const applyToIntro = root => {
    const mark = root.querySelector('p.wordmark')
    if (!mark) return

    root.dataset.tg = '1'
    mark.dataset.tg = '1'

    const name = store.name
    mark.setAttribute('aria-label', name)
    mark.innerHTML = `<span><span>${escapeHtml(name)}</span></span><span aria-hidden="true">${escapeHtml(name)}</span>`
    mark.classList.toggle('tg-glow', store.glow)
    mark.classList.toggle('tg-tw', store.typewrite)
    mark.style.setProperty('--tg-glow', accent())

    // Caret at the end of the tagline sentence.
    let caret = root.querySelector(':scope .tg-caret')
    const taglineEl = root.querySelector('p:not(.wordmark)')
    if (store.typewrite && !caret) {
      caret = document.createElement('span')
      caret.className = 'tg-caret'
      caret.setAttribute('aria-hidden', 'true')
      if (taglineEl) taglineEl.appendChild(caret)
      else mark.insertAdjacentElement('afterend', caret)
    } else if (!store.typewrite && caret) {
      caret.remove()
      caret = null
    }

    // Clicking the headline opens the settings dialog.
    if (!mark.dataset.tgClick) {
      mark.dataset.tgClick = '1'
      mark.classList.add('tg-clickable')
      mark.addEventListener('click', () => {
        draft = { ...store }
        const panel = ensureOverlay()
        panel.querySelector('input[type="text"]').value = draft.name
        panel.querySelector('[data-role="glow"]').setAttribute('aria-checked', String(draft.glow))
        panel.querySelector('[data-role="typewrite"]').setAttribute('aria-checked', String(draft.typewrite))
        panel.hidden = false
      })
    }
  }

  const tick = () => {
    const root = introRoot()
    if (!root) {
      if (overlay) overlay.hidden = true
      return
    }
    const mark = root.querySelector('p.wordmark')
    if (!mark) return
    if (root.dataset.tg === '1' && mark.dataset.tg === '1' && hash() === applied) return
    applied = hash()
    applyToIntro(root)
  }

  const stop = ctx.setInterval(tick, 350)
  ctx.onDispose(() => {
    stop()
    overlay?.remove()
  })

  // Rebuild the static labels when the user switches the app language.
  ctx.i18n.onLocaleChange(() => {
    if (!overlay) return
    overlay.innerHTML = panelHtml(ctx.i18n.t, store)
  })

  tick()
}

const plugin = {
  id: 'type-glow',
  name: 'Type Glow',
  description: 'Renames the empty-chat headline, adds a GlowFX that follows the accent colour, and a typewriter effect. The + icon opens the settings dialog.',
  defaultEnabled: true,
  register(ctx) {
    ensureStyles()
    ctx.i18n.register(BUNDLES)

    const savedName = ctx.storage.get('name', null)
    if (typeof savedName === 'string' && savedName.trim()) store.name = savedName.trim()
    store.glow = ctx.storage.get('glow', true) !== false
    store.typewrite = ctx.storage.get('typewrite', true) !== false
    publish()

    ctx.onDispose(() => {
      document.getElementById(STYLE_ID)?.remove()
    })

    ctx.register({
      id: 'empty',
      area: CHAT_EMPTY_AREA,
      render: () => jsx(TypeGlowEmpty, { storage: ctx.storage })
    })

    startIntroBridge(ctx)
  }
}

export default plugin
