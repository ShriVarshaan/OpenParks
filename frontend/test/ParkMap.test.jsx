import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { BrowserRouter } from 'react-router'
import MapRenderer from '../src/pages/ParkMap'
import API from '../src/api/axiosInstance'
import maplibregl from 'maplibre-gl'
import toast from 'react-hot-toast'
import { RecenterControl } from '../src/components/RecenterControl'

vi.mock('../src/api/axiosInstance', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}))
 
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}))
 
vi.mock('maplibre-gl', () => ({
  default: {
    Map: vi.fn().mockImplementation(() => ({
      addControl: vi.fn(),
      on: vi.fn(),
      once: vi.fn(),
      remove: vi.fn(),
      isStyleLoaded: vi.fn().mockReturnValue(true),
      getSource: vi.fn().mockReturnValue(null),
      addSource: vi.fn(),
      addLayer: vi.fn(),
      getLayer: vi.fn().mockReturnValue(null),
      setPaintProperty: vi.fn(),
      getCanvas: vi.fn().mockReturnValue({ style: {} }),
      getZoom: vi.fn().mockReturnValue(15),
      setMaxBounds: vi.fn(),
      cameraForBounds: vi.fn().mockReturnValue({ zoom: 15 }),
      getMinZoom: vi.fn().mockReturnValue(13),
      setMinZoom: vi.fn(),
      getCenter: vi.fn().mockReturnValue({ lng: -1.905, lat: 52.4484 }),
      fitBounds: vi.fn(),
      flyTo: vi.fn(),
      jumpTo: vi.fn(),
    })),
    LngLatBounds: vi.fn().mockImplementation(([[w, s], [e, n]]) => ({
      contains: ({ lng, lat }) => lng >= w && lng <= e && lat >= s && lat <= n,
    })),
    NavigationControl: vi.fn(),
    ScaleControl: vi.fn(),
    Marker: vi.fn().mockImplementation(() => ({
      setLngLat: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn(),
      setPopup: vi.fn().mockReturnThis(),
    })),
    Popup: vi.fn().mockImplementation(() => ({
      setHTML: vi.fn().mockReturnThis(),
      setLngLat: vi.fn().mockReturnThis(),
    })),
  },
}))
 
vi.mock('@turf/boolean-point-in-polygon', () => ({ default: vi.fn() }))
vi.mock('@turf/helpers', () => ({ point: vi.fn() }))
 
const mockNavigate = vi.fn()
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})
 
const mockGeojson = {
  type: 'FeatureCollection',
  features: [],
}
 
describe('MapRenderer (ParkMap)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockNavigate.mockClear()
 
    API.get.mockResolvedValue({ data: mockGeojson })
  })
 
  it('renders the map container', () => {
    render(
      <BrowserRouter>
        <MapRenderer />
      </BrowserRouter>
    )
 
    expect(document.querySelector('.map-container-wrapper')).toBeInTheDocument()
  })
 
  // Parks and trails are FeatureCollections; amenities and reports are arrays.
  const mockApiAfterLoad = (parks) =>
    API.get.mockImplementation((url) =>
      Promise.resolve({ data: url === '/api/parks' ? parks : url === '/api/trails' ? mockGeojson : [] })
    )

  it('lets the map pan to every loaded park, wherever it is', async () => {
    const parks = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[-2.5, 52.0], [-2.4, 52.0], [-2.4, 52.1], [-2.5, 52.0]]] } },
      ],
    }
    mockApiAfterLoad(parks)
    render(
      <BrowserRouter>
        <MapRenderer />
      </BrowserRouter>
    )
    const map = maplibregl.Map.mock.results[0].value
    const onLoad = map.on.mock.calls.find(([event]) => event === 'load')[1]

    onLoad()

    await waitFor(() => expect(map.setMaxBounds).toHaveBeenCalledTimes(1))
    const [[w, s], [e, n]] = map.setMaxBounds.mock.calls[0][0]
    expect([w, s, e, n].map((v) => Number(v.toFixed(6)))).toEqual([-2.51, 51.99, -2.39, 52.11])
  })

  const loadParksOnMap = async (parks, setup = () => {}) => {
    mockApiAfterLoad(parks)
    render(
      <BrowserRouter>
        <MapRenderer />
      </BrowserRouter>
    )
    const map = maplibregl.Map.mock.results[0].value
    setup(map)
    map.on.mock.calls.find(([event]) => event === 'load')[1]()
    await waitFor(() => expect(map.setMaxBounds).toHaveBeenCalled())
    return map
  }
  const parksAround = (west, east, south, north) => ({
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]] } }],
  })

  it('allows zooming out far enough to see every park when they span more than one screen', async () => {
    const map = await loadParksOnMap(parksAround(-2.5, -1.8, 52.0, 52.5), (m) => m.cameraForBounds.mockReturnValue({ zoom: 10.6 }))

    expect(map.setMinZoom).toHaveBeenCalledWith(10)
  })

  it('moves the view to the parks when the start point is outside them', async () => {
    const parks = parksAround(-2.5, -2.4, 52.0, 52.1)
    const map = await loadParksOnMap(parks)

    expect(map.fitBounds).toHaveBeenCalledWith(map.setMaxBounds.mock.calls[0][0], { animate: false })
  })

  it('leaves the view and zoom limits alone when the start point is among the parks', async () => {
    const map = await loadParksOnMap(parksAround(-1.95, -1.87, 52.43, 52.47))

    expect(map.fitBounds).not.toHaveBeenCalled()
    expect(map.setMinZoom).not.toHaveBeenCalled()
  })

  it('keeps the default pan limits when no parks load', async () => {
    mockApiAfterLoad(mockGeojson)
    render(
      <BrowserRouter>
        <MapRenderer />
      </BrowserRouter>
    )
    const map = maplibregl.Map.mock.results[0].value
    map.on.mock.calls.find(([event]) => event === 'load')[1]()

    await waitFor(() => expect(map.addSource).toHaveBeenCalledWith('park-boundary', expect.anything()))
    expect(map.setMaxBounds).not.toHaveBeenCalled()
  })

  describe('centring on the user', () => {
    // jsdom has no geolocation: install a fake whose position callback the test fires.
    let reportPosition
    beforeEach(() => {
      reportPosition = undefined
      Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: {
          watchPosition: vi.fn((onPosition) => {
            reportPosition = (lng, lat) => onPosition({ coords: { longitude: lng, latitude: lat } })
            return 1
          }),
          clearWatch: vi.fn(),
        },
      })
    })
    afterEach(() => {
      delete navigator.geolocation
    })

    const birminghamParks = parksAround(-2.0, -1.75, 52.4, 52.6)

    it('moves straight to the user (no animation) when their location arrives after the parks load', async () => {
      const map = await loadParksOnMap(birminghamParks)

      reportPosition(-1.89, 52.48)

      expect(map.jumpTo).toHaveBeenCalledWith({ center: [-1.89, 52.48], zoom: 15 })
    })

    it('moves to the user once the parks load when their location arrives first', async () => {
      mockApiAfterLoad(birminghamParks)
      render(
        <BrowserRouter>
          <MapRenderer />
        </BrowserRouter>
      )
      const map = maplibregl.Map.mock.results[0].value
      reportPosition(-1.89, 52.48)
      expect(map.jumpTo).not.toHaveBeenCalled()

      map.on.mock.calls.find(([event]) => event === 'load')[1]()

      await waitFor(() => expect(map.jumpTo).toHaveBeenCalledWith({ center: [-1.89, 52.48], zoom: 15 }))
    })

    it('stays on the parks when the user is outside the mapped area', async () => {
      const map = await loadParksOnMap(birminghamParks)

      reportPosition(-0.12, 51.5) // London

      expect(map.jumpTo).not.toHaveBeenCalled()
    })

    it('only recentres on the first location fix, so the user can pan away', async () => {
      const map = await loadParksOnMap(birminghamParks)

      reportPosition(-1.89, 52.48)
      reportPosition(-1.88, 52.47)

      expect(map.jumpTo).toHaveBeenCalledTimes(1)
    })

    it('still centres on the user inside the default area when the parks fail to load', async () => {
      API.get.mockImplementation((url) =>
        url === '/api/parks' ? Promise.reject(new Error('down')) : Promise.resolve({ data: url === '/api/trails' ? mockGeojson : [] })
      )
      vi.spyOn(console, 'error').mockImplementation(() => {})
      render(
        <BrowserRouter>
          <MapRenderer />
        </BrowserRouter>
      )
      const map = maplibregl.Map.mock.results[0].value
      map.on.mock.calls.find(([event]) => event === 'load')[1]()
      reportPosition(-1.9, 52.45)

      await waitFor(() => expect(map.jumpTo).toHaveBeenCalledWith({ center: [-1.9, 52.45], zoom: 15 }))
    })

    // The control is a real MapLibre control; mount its element the way MapLibre would.
    // React's cleanup doesn't know about it, so remove it after each test.
    let mountedControl
    afterEach(() => {
      mountedControl?.onRemove()
      mountedControl = undefined
    })
    const mountRecenterButton = (map) => {
      ;[mountedControl] = map.addControl.mock.calls.find(([c]) => c instanceof RecenterControl)
      document.body.appendChild(mountedControl.onAdd(map))
      return screen.getByRole('button', { name: 'Show my location', hidden: true })
    }

    it('hides the recentre button until the user\'s location is known', async () => {
      const map = await loadParksOnMap(birminghamParks)
      const button = mountRecenterButton(map)
      expect(button).not.toBeVisible()

      reportPosition(-1.89, 52.48)

      expect(button).toBeVisible()
    })

    it('recentres on the user\'s latest location when the button is clicked', async () => {
      const map = await loadParksOnMap(birminghamParks)
      const button = mountRecenterButton(map)
      reportPosition(-1.89, 52.48)
      reportPosition(-1.88, 52.47) // the user walked on
      map.flyTo.mockClear()

      fireEvent.click(button)

      expect(map.flyTo).toHaveBeenCalledWith({ center: [-1.88, 52.47], zoom: 15 })
    })

    it('keeps a closer zoom when recentring', async () => {
      const map = await loadParksOnMap(birminghamParks)
      const button = mountRecenterButton(map)
      reportPosition(-1.89, 52.48)
      map.getZoom.mockReturnValue(17.5)

      fireEvent.click(button)

      expect(map.flyTo).toHaveBeenLastCalledWith({ center: [-1.89, 52.48], zoom: 17.5 })
    })

    it('explains instead of moving when the user is outside the mapped area', async () => {
      const map = await loadParksOnMap(birminghamParks)
      const button = mountRecenterButton(map)
      reportPosition(-0.12, 51.5) // London

      fireEvent.click(button)

      expect(map.flyTo).not.toHaveBeenCalled()
      expect(toast).toHaveBeenCalledWith("You're outside the area OpenParks covers")
    })

    describe('opening where the user was last time', () => {
      const renderMap = () => {
        render(
          <BrowserRouter>
            <MapRenderer />
          </BrowserRouter>
        )
        return maplibregl.Map.mock.calls[0][0]
      }

      it('starts the map at the last known location, zoomed in', () => {
        localStorage.setItem('openparks.lastLocation', JSON.stringify([-1.83, 52.56])) // Sutton Park

        const options = renderMap()

        expect(options.center).toEqual([-1.83, 52.56])
        expect(options.zoom).toBe(15)
      })

      it('starts at the default view without a last known location', () => {
        const options = renderMap()

        expect(options.center).toEqual([-1.905, 52.4484])
      })

      it('ignores a last known location outside the mapped area', () => {
        localStorage.setItem('openparks.lastLocation', JSON.stringify([-0.12, 51.5])) // London

        expect(renderMap().center).toEqual([-1.905, 52.4484])
      })

      it('ignores a corrupt saved location', () => {
        localStorage.setItem('openparks.lastLocation', '{not json')

        expect(renderMap().center).toEqual([-1.905, 52.4484])
      })

      it('remembers each location fix for next time', () => {
        renderMap()

        reportPosition(-1.89, 52.48)
        reportPosition(-1.88, 52.47)

        expect(JSON.parse(localStorage.getItem('openparks.lastLocation'))).toEqual([-1.88, 52.47])
      })
    })
  })

  it('names the whole city in the header, not one park', () => {
    render(
      <BrowserRouter>
        <MapRenderer />
      </BrowserRouter>
    )

    expect(screen.getByText('Birmingham')).toBeInTheDocument()
    expect(screen.queryByText(/Cannon Hill/)).not.toBeInTheDocument()
  })

  it('renders the OpenParks header', () => {
    render(
      <BrowserRouter>
        <MapRenderer />
      </BrowserRouter>
    )
 
    expect(screen.getByText('OpenParks')).toBeInTheDocument()
  })
 
  it('shows Login button when not logged in', () => {
    localStorage.clear()
 
    render(
      <BrowserRouter>
        <MapRenderer />
      </BrowserRouter>
    )
 
    expect(screen.getByText('Login')).toBeInTheDocument()
  })
 
  it('shows Logout button when logged in', () => {
    localStorage.setItem('token', 'test-token')
 
    render(
      <BrowserRouter>
        <MapRenderer />
      </BrowserRouter>
    )
 
    expect(screen.getByText('Logout')).toBeInTheDocument()
  })
 
  it('navigates to login when Login button is clicked', () => {
    localStorage.clear()
 
    render(
      <BrowserRouter>
        <MapRenderer />
      </BrowserRouter>
    )
 
    fireEvent.click(screen.getByText('Login'))
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })
 
  it('navigates to review page when Review button is clicked', () => {
    render(
      <BrowserRouter>
        <MapRenderer />
      </BrowserRouter>
    )
 
    fireEvent.click(screen.getByText('Review'))
    expect(mockNavigate).toHaveBeenCalledWith('/review')
  })
 
  it('navigates to report page when Report button is clicked', () => {
    render(
      <BrowserRouter>
        <MapRenderer />
      </BrowserRouter>
    )
 
    fireEvent.click(screen.getByText('Report'))
    expect(mockNavigate).toHaveBeenCalledWith('/report')
  })
 
  it('clears token and hides Logout button after logout', async () => {
    localStorage.setItem('token', 'test-token')
 
    render(
      <BrowserRouter>
        <MapRenderer />
      </BrowserRouter>
    )
 
    expect(screen.getByText('Logout')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Logout'))
 
    await waitFor(() => {
      expect(localStorage.getItem('token')).toBeNull()
      expect(screen.queryByText('Logout')).not.toBeInTheDocument()
      expect(screen.getByText('Login')).toBeInTheDocument()
    })
  })
 
  it('renders all report category filter buttons', () => {
    render(
      <BrowserRouter>
        <MapRenderer />
      </BrowserRouter>
    )
 
    expect(screen.getByText('Damaged equipment')).toBeInTheDocument()
    expect(screen.getByText('Litter')).toBeInTheDocument()
    expect(screen.getByText('Vandalism')).toBeInTheDocument()
    expect(screen.getByText('Unsafe path')).toBeInTheDocument()
    expect(screen.getByText('Flooding')).toBeInTheDocument()
    expect(screen.getByText('Other')).toBeInTheDocument()
  })
 
  it('toggles active category when filter button is clicked', async () => {
    render(
      <BrowserRouter>
        <MapRenderer />
      </BrowserRouter>
    )
 
    const litterBtn = screen.getByText('Litter')
    fireEvent.click(litterBtn)
 
    await waitFor(() => {
      expect(litterBtn).toHaveStyle({ background: '#2d5a27' })
    })
  })
 
  it('deactivates category when same filter button is clicked twice', async () => {
    render(
      <BrowserRouter>
        <MapRenderer />
      </BrowserRouter>
    )
 
    const litterBtn = screen.getByText('Litter')
    fireEvent.click(litterBtn)
    fireEvent.click(litterBtn)
 
    await waitFor(() => {
      expect(litterBtn).toHaveStyle({ background: 'transparent' })
    })
  })
 
  it('renders the trail types key', () => {
    render(
      <BrowserRouter>
        <MapRenderer />
      </BrowserRouter>
    )
 
    expect(screen.getByText('Trail Types')).toBeInTheDocument()
    expect(screen.getByText('Footpath')).toBeInTheDocument()
    expect(screen.getByText('Cycleway')).toBeInTheDocument()
  })
 
  it('review panel is hidden by default', () => {
    render(
      <BrowserRouter>
        <MapRenderer />
      </BrowserRouter>
    )
 
    const panel = screen.queryByText('Reviews')
    // Panel exists in DOM but is off-screen (translateX 100%)
    expect(panel).toBeInTheDocument()
  })
 
  it('review panel close button is present', () => {
    render(
      <BrowserRouter>
        <MapRenderer />
      </BrowserRouter>
    )
 
    expect(screen.getByText('✕')).toBeInTheDocument()
  })
})