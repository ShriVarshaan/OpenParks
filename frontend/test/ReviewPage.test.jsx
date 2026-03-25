import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router'
import ReviewPage from '../src/pages/ReviewPage'
import API from '../src/api/axiosInstance'
import toast from 'react-hot-toast'
 
vi.mock('../src/api/axiosInstance', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
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
      remove: vi.fn(),
      isStyleLoaded: vi.fn().mockReturnValue(true),
    })),
    NavigationControl: vi.fn(),
    Marker: vi.fn().mockImplementation(() => ({
      setLngLat: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
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
 
describe('ReviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockNavigate.mockClear()
    localStorage.setItem('token', 'test-token')
  })
 
  it('redirects to login if not logged in', () => {
    localStorage.clear()
 
    render(
      <BrowserRouter>
        <ReviewPage />
      </BrowserRouter>
    )
 
    expect(toast.error).toHaveBeenCalledWith('Please login/signup first')
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })
 
  it('renders the review form when logged in', () => {
    render(
      <BrowserRouter>
        <ReviewPage />
      </BrowserRouter>
    )
 
    expect(screen.getByText('Leave a review')).toBeInTheDocument()
    expect(screen.getByText('Rating')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('e.g. Great place for a walk')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Share your experience of this park...')).toBeInTheDocument()
  })
 
  it('renders 5 star buttons', () => {
    render(
      <BrowserRouter>
        <ReviewPage />
      </BrowserRouter>
    )
 
    const stars = screen.getAllByText('★')
    expect(stars).toHaveLength(5)
  })
 
  it('selects a star rating when clicked', async () => {
    render(
      <BrowserRouter>
        <ReviewPage />
      </BrowserRouter>
    )
 
    const stars = screen.getAllByText('★')
    fireEvent.click(stars[2]) // click 3rd star
 
    await waitFor(() => {
      expect(stars[2]).toHaveStyle({ color: '#f5a623' })
    })
  })
 
  it('does not submit if rating is missing', async () => {
    render(
      <BrowserRouter>
        <ReviewPage />
      </BrowserRouter>
    )
 
    const textarea = screen.getByPlaceholderText('Share your experience of this park...')
    await userEvent.type(textarea, 'Great park!')
 
    const submitButton = screen.getByRole('button', { name: 'Submit review' })
    fireEvent.click(submitButton)
 
    await waitFor(() => {
      expect(API.post).not.toHaveBeenCalled()
    })
  })
 
  it('does not submit if review body is missing', async () => {
    render(
      <BrowserRouter>
        <ReviewPage />
      </BrowserRouter>
    )
 
    const stars = screen.getAllByText('★')
    fireEvent.click(stars[3])
 
    const submitButton = screen.getByRole('button', { name: 'Submit review' })
    fireEvent.click(submitButton)
 
    await waitFor(() => {
      expect(API.post).not.toHaveBeenCalled()
    })
  })
 
  it('shows loading state while submitting', async () => {
    API.post.mockImplementation(() => new Promise(() => {}))
 
    render(
      <BrowserRouter>
        <ReviewPage />
      </BrowserRouter>
    )
 
    const stars = screen.getAllByText('★')
    fireEvent.click(stars[4])
 
    const textarea = screen.getByPlaceholderText('Share your experience of this park...')
    await userEvent.type(textarea, 'Lovely park!')
 
    const submitButton = screen.getByRole('button', { name: 'Submit review' })
    fireEvent.click(submitButton)
 
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Submitting...' })).toBeInTheDocument()
    })
  })
 
  it('shows error toast when submission fails', async () => {
    API.post.mockRejectedValueOnce({
      response: { data: { message: 'Failed to submit review. Please try again.' } }
    })
 
    render(
      <BrowserRouter>
        <ReviewPage />
      </BrowserRouter>
    )
 
    const stars = screen.getAllByText('★')
    fireEvent.click(stars[4])
 
    const textarea = screen.getByPlaceholderText('Share your experience of this park...')
    await userEvent.type(textarea, 'Great park!')
 
    const submitButton = screen.getByRole('button', { name: 'Submit review' })
    fireEvent.click(submitButton)
 
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to submit review. Please try again.')
    })
  })
 
  it('renders the map container', () => {
    render(
      <BrowserRouter>
        <ReviewPage />
      </BrowserRouter>
    )
 
    expect(screen.getByText('Pin location on map')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Click the map to select a park...')).toBeInTheDocument()
  })
})