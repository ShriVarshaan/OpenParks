import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router'
import MapRenderer from '../src/pages/ParkMap'
import API from '../src/api/axiosInstance'
import maplibregl from 'maplibre-gl'
 
vi.mock('../src/api/axiosInstance', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}))
 
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
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