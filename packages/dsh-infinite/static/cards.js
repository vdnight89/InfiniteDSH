const COVER_ROOT = '/infinite/covers/'

/** @type {Record<string, string> | null} */
let manifest = null
let lastTopicCover = COVER_ROOT + 'cultivation.jpg'

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

function enhanceGroup(group) {
  const buttons = [...group.querySelectorAll('button[role="radio"], button[role="checkbox"]')]
  if (buttons.length < 2) return
  const isOpening = buttons.some((button) => (button.getAttribute('aria-label') || '').includes('默认开篇'))
  let withCover = 0
  for (const button of buttons) {
    const label = button.getAttribute('aria-label') || button.textContent || ''
    let src = coverFor(label)
    if (src && !isOpening) lastTopicCover = src
    if (!src && isOpening) src = lastTopicCover
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
      const desc = button.querySelector('span span span:last-child')
      if (desc && desc.textContent && desc.textContent.trim() !== stripRecommend(label)) {
        const blurb = document.createElement('div')
        blurb.className = 'infinite-card-blurb'
        blurb.textContent = desc.textContent.trim()
        copy.appendChild(blurb)
      }
      button.appendChild(copy)
    }
  }
  if (withCover >= 2) {
    group.classList.add('infinite-card-grid')
    const picked = buttons.some((button) => button.getAttribute('aria-checked') === 'true')
    group.classList.toggle('is-picking', picked)
  }
}

function scan() {
  for (const group of document.querySelectorAll('[role="radiogroup"]')) {
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
