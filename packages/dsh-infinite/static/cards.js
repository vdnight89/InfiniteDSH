const COVER_ROOT = '/infinite/covers/'
const LAST_COVER_KEY = 'infinite-last-cover'

/** @type {Record<string, string> | null} */
let manifest = null
let lastTopicCover = COVER_ROOT + 'cultivation.jpg'
try {
  lastTopicCover = sessionStorage.getItem(LAST_COVER_KEY) || lastTopicCover
} catch {
  // private mode
}

async function loadManifest() {
  if (manifest) return manifest
  try {
    const res = await fetch('/infinite/manifest.json', { cache: 'force-cache' })
    manifest = await res.json()
  } catch {
    manifest = {}
  }
  return manifest
}

function stripRecommend(label) {
  return label.replace(/\s*(?:\((?:recommended|推荐)\)|（(?:recommended|推荐)）)\s*$/i, '').trim()
}

function coverFor(label) {
  const key = stripRecommend(label)
  const file = manifest?.[key] || manifest?.[label]
  return file ? COVER_ROOT + file : null
}

function rememberCover(src) {
  if (!src) return
  lastTopicCover = src
  try {
    sessionStorage.setItem(LAST_COVER_KEY, src)
  } catch {
    // private mode
  }
}

function optionButtons(group) {
  const radios = [...group.querySelectorAll('[role="radio"], [role="checkbox"]')]
  if (radios.length) return radios
  return [...group.querySelectorAll('button')].filter((button) => !button.closest('[data-infinite-skip]'))
}

function isSoftPicker(buttons) {
  return buttons.some((button) => {
    const label = stripRecommend(button.getAttribute('aria-label') || button.textContent || '')
    return /默认开局|默认开篇|默认之身|默认主角|启程|另择开局|更换天命/.test(label)
  })
}

function enhanceGroup(group) {
  const buttons = optionButtons(group)
  if (buttons.length < 1) return
  const reuseWorldCover = isSoftPicker(buttons)
  const nativeCovers = buttons.some((button) => coverFor(button.getAttribute('aria-label') || button.textContent || ''))
  if (!reuseWorldCover && !nativeCovers) return
  let withCover = 0
  for (const button of buttons) {
    const label = button.getAttribute('aria-label') || button.textContent || ''
    let src = coverFor(label)
    if (src && !reuseWorldCover) rememberCover(src)
    if (!src) src = lastTopicCover
    if (!src) continue
    withCover += 1
    if (!button.querySelector(':scope > .infinite-card-cover')) {
      const img = document.createElement('img')
      img.className = 'infinite-card-cover'
      img.alt = stripRecommend(label)
      img.src = src
      button.insertBefore(img, button.firstChild)
    }
    if (!button.querySelector('.infinite-card-copy')) {
      const copy = document.createElement('div')
      copy.className = 'infinite-card-copy'
      const title = document.createElement('div')
      title.className = 'infinite-card-title'
      title.textContent = stripRecommend(label)
      copy.appendChild(title)
      const desc = button.querySelector('span span span:last-child, [data-description], small, p')
      if (desc && desc.textContent && desc.textContent.trim() !== stripRecommend(label)) {
        const blurb = document.createElement('div')
        blurb.className = 'infinite-card-blurb'
        blurb.textContent = desc.textContent.trim()
        copy.appendChild(blurb)
      }
      button.appendChild(copy)
    }
  }
  if (withCover >= 1) {
    group.classList.add('infinite-card-grid')
    const picked = buttons.some((button) => button.getAttribute('aria-checked') === 'true')
    group.classList.toggle('is-picking', picked)
  }
}

function collectGroups() {
  const groups = new Set()
  for (const node of document.querySelectorAll('[role="radiogroup"]')) groups.add(node)
  for (const radio of document.querySelectorAll('[role="radio"], [role="checkbox"]')) {
    const host = radio.closest('[role="radiogroup"], [role="group"], fieldset')
    if (host) groups.add(host)
  }
  return groups
}

function scan() {
  for (const group of collectGroups()) {
    enhanceGroup(group)
  }
}

async function start() {
  await loadManifest()
  scan()
  const observer = new MutationObserver(() => scan())
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-checked'] })
}

start()
