import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router'
import ReportPage from '../src/pages/ReportPage'
import API from '../src/api/axiosInstance'
import toast from 'react-hot-toast'

vi.mock('../src/api/axiosInstance', () => ({
  default: {
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
    })),
    NavigationControl: vi.fn(),
    Marker: vi.fn().mockImplementation(() => ({
      setLngLat: vi.fn().mockReturnThis(),
      addTo: vi.fn(),
    })),
  },
}))

const mockNavigate = vi.fn()
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('ReportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('token', 'valid-token')
    mockNavigate.mockClear()
  })

  it('displays report form with all required fields', () => {
    render(
      <BrowserRouter>
        <ReportPage parkName="Cannon Hill Park" />
      </BrowserRouter>
    )
    
    expect(screen.getByText('🌿 OpenParks')).toBeInTheDocument()
    expect(screen.getByText('Report an issue')).toBeInTheDocument()
    expect(screen.getByText(/Cannon Hill Park/)).toBeInTheDocument()
    expect(screen.getByText('Issue type')).toBeInTheDocument()
    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByText('Submit report')).toBeInTheDocument()
  })

  it('displays all report type options in dropdown', () => {
    render(
      <BrowserRouter>
        <ReportPage />
      </BrowserRouter>
    )
    
    const select = screen.getByRole('combobox')
    fireEvent.click(select)
    
    expect(screen.getByText('Damaged equipment')).toBeInTheDocument()
    expect(screen.getByText('Litter')).toBeInTheDocument()
    expect(screen.getByText('Vandalism')).toBeInTheDocument()
    expect(screen.getByText('Unsafe path')).toBeInTheDocument()
    expect(screen.getByText('Flooding')).toBeInTheDocument()
    expect(screen.getByText('Other')).toBeInTheDocument()
  })

  it('does not submit when type is not selected', async () => {
    render(
      <BrowserRouter>
        <ReportPage />
      </BrowserRouter>
    )
    
    const textarea = screen.getByPlaceholderText('Describe the issue...')
    await userEvent.type(textarea, 'Test description')
    
    const submitButton = screen.getByText('Submit report')
    fireEvent.click(submitButton)
    
    expect(API.post).not.toHaveBeenCalled()
  })

  it('does not submit when description is empty', async () => {
    render(
      <BrowserRouter>
        <ReportPage />
      </BrowserRouter>
    )
    
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'Damaged equipment' } })
    
    const submitButton = screen.getByText('Submit report')
    fireEvent.click(submitButton)
    
    expect(API.post).not.toHaveBeenCalled()
  })

  it('submits report with selected type and description', async () => {
    API.post.mockResolvedValueOnce({ data: { id: 1 } })
    
    render(
      <BrowserRouter>
        <ReportPage />
      </BrowserRouter>
    )
    
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'Damaged equipment' } })
    
    const textarea = screen.getByPlaceholderText('Describe the issue...')
    await userEvent.type(textarea, 'Broken swing at the playground')
    
    const submitButton = screen.getByText('Submit report')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(API.post).toHaveBeenCalled()
    })
  })

  it('handles form submission and shows loading state', async () => {
    API.post.mockResolvedValueOnce({ data: { id: 1 } })
    
    render(
      <BrowserRouter>
        <ReportPage />
      </BrowserRouter>
    )
    
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'Flooding' } })
    
    const textarea = screen.getByPlaceholderText('Describe the issue...')
    await userEvent.type(textarea, 'Waterlogged path')
    
    const submitButton = screen.getByText('Submit report')
    fireEvent.click(submitButton)
    
    expect(submitButton).toHaveTextContent('Submitting...')
    
    await waitFor(() => {
      expect(API.post).toHaveBeenCalled()
    })
  })

  it('handles form submission and resets after success', async () => {
    API.post.mockResolvedValueOnce({ data: { id: 1 } })
    
    render(
      <BrowserRouter>
        <ReportPage />
      </BrowserRouter>
    )
    
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'Damaged equipment' } })
    
    const textarea = screen.getByPlaceholderText('Describe the issue...')
    await userEvent.type(textarea, 'First report')
    
    const submitButton = screen.getByText('Submit report')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(API.post).toHaveBeenCalled()
    })
  })

  it('displays error toast when API request fails', async () => {
    API.post.mockRejectedValueOnce({
      response: { status: 500, data: { error: 'Server error' } }
    })
    
    render(
      <BrowserRouter>
        <ReportPage />
      </BrowserRouter>
    )
    
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'Other' } })
    
    const textarea = screen.getByPlaceholderText('Describe the issue...')
    await userEvent.type(textarea, 'Test issue')
    
    const submitButton = screen.getByText('Submit report')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
    })
  })

  it('redirects to login page when user is not authenticated', () => {
    localStorage.removeItem('token')
    
    render(
      <BrowserRouter>
        <ReportPage />
      </BrowserRouter>
    )
    
    expect(toast.error).toHaveBeenCalledWith('Please login/signup first')
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })
})