// A MapLibre control (it sits with the zoom buttons) that brings the map back to the user,
// like Google Maps' "my location" button. Hidden until the user's location is known.
const CROSSHAIR_ICON = `
<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"
     fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
  <circle cx="12" cy="12" r="7" />
  <circle cx="12" cy="12" r="2.5" fill="currentColor" />
  <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
</svg>`

export class RecenterControl {
  constructor({ onClick }) {
    this._onClick = onClick
    this._available = false
  }

  onAdd() {
    this._container = document.createElement('div')
    this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group'
    this._container.hidden = !this._available

    const button = document.createElement('button')
    button.type = 'button'
    button.title = 'Show my location'
    button.setAttribute('aria-label', 'Show my location')
    button.style.cssText = 'display:flex; align-items:center; justify-content:center; color:#333;'
    button.innerHTML = CROSSHAIR_ICON
    button.addEventListener('click', () => this._onClick())
    this._container.appendChild(button)

    return this._container
  }

  onRemove() {
    this._container?.remove()
    this._container = undefined
  }

  // Show the button once there is a location to go back to.
  setAvailable(available) {
    this._available = available
    if (this._container) this._container.hidden = !available
  }
}
