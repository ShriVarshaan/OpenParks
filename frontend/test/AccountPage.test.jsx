import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router'
import AccountPage from '../src/pages/AccountPage'
import API from '../src/api/axiosInstance'
import toast from 'react-hot-toast'
 
vi.mock('../src/api/axiosInstance', () => ({
  default: {
    get: vi.fn(),
    delete: vi.fn(),
  },
}))
 
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
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
 
const mockUser = { username: 'Bibi', email: 'bibi@test.com' }
const mockReviews = [
  { id: 1, rating: 4, content: 'Great park!', created_at: '2025-01-01', park: { name: 'Cannon Hill Park' } },
  { id: 2, rating: 5, content: 'Loved it!', created_at: '2025-02-01', park: { name: 'Highbury Park' } },
]
const mockReports = [
  { id: 1, description: 'Broken bench', created_at: '2025-01-15', heading: 'open', Park: { name: 'Cannon Hill Park' } },
]
 
describe('AccountPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockNavigate.mockClear()
    localStorage.setItem('token', 'test-token')
 
    API.get.mockImplementation((url) => {
      if (url === '/api/user') return Promise.resolve({ data: mockUser })
      if (url === '/api/reviews/userreviews') return Promise.resolve({ data: mockReviews })
      if (url === '/api/safetyreport/userreports') return Promise.resolve({ data: mockReports })
      return Promise.resolve({ data: [] })
    })
  })
 
  it('redirects to login if not logged in', () => {
    localStorage.clear()
 
    render(
      <BrowserRouter>
        <AccountPage />
      </BrowserRouter>
    )
 
    expect(toast.error).toHaveBeenCalledWith('You must be logged in')
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })
 
  it('renders the account page when logged in', async () => {
    render(
      <BrowserRouter>
        <AccountPage />
      </BrowserRouter>
    )
 
    await waitFor(() => {
      expect(screen.getByText('Bibi')).toBeInTheDocument()
      expect(screen.getByText('bibi@test.com')).toBeInTheDocument()
    })
  })
 
  it('shows reviews tab by default', async () => {
    render(
      <BrowserRouter>
        <AccountPage />
      </BrowserRouter>
    )
 
    await waitFor(() => {
      expect(screen.getByText('My Reviews')).toBeInTheDocument()
      expect(screen.getByText('Great park!')).toBeInTheDocument()
    })
  })
 
  it('shows reviews with park names and ratings', async () => {
    render(
      <BrowserRouter>
        <AccountPage />
      </BrowserRouter>
    )
 
    await waitFor(() => {
      expect(screen.getByText('Cannon Hill Park')).toBeInTheDocument()
      expect(screen.getByText('Great park!')).toBeInTheDocument()
    })
  })
 
  it('switches to reports tab when clicked', async () => {
    render(
      <BrowserRouter>
        <AccountPage />
      </BrowserRouter>
    )
 
    await waitFor(() => {
      expect(screen.getByText('My Reports')).toBeInTheDocument()
    })
 
    fireEvent.click(screen.getByText('My Reports'))
 
    await waitFor(() => {
      expect(screen.getByText('Broken bench')).toBeInTheDocument()
    })
  })
 
  it('shows empty message when no reviews', async () => {
    API.get.mockImplementation((url) => {
      if (url === '/api/user') return Promise.resolve({ data: mockUser })
      if (url === '/api/reviews/userreviews') return Promise.resolve({ data: [] })
      if (url === '/api/safetyreport/userreports') return Promise.resolve({ data: [] })
      return Promise.resolve({ data: [] })
    })
 
    render(
      <BrowserRouter>
        <AccountPage />
      </BrowserRouter>
    )
 
    await waitFor(() => {
      expect(screen.getByText("You haven't left any reviews yet.")).toBeInTheDocument()
    })
  })
 
  it('shows empty message when no reports', async () => {
    API.get.mockImplementation((url) => {
      if (url === '/api/user') return Promise.resolve({ data: mockUser })
      if (url === '/api/reviews/userreviews') return Promise.resolve({ data: [] })
      if (url === '/api/safetyreport/userreports') return Promise.resolve({ data: [] })
      return Promise.resolve({ data: [] })
    })
 
    render(
      <BrowserRouter>
        <AccountPage />
      </BrowserRouter>
    )
 
    fireEvent.click(screen.getByText('My Reports'))
 
    await waitFor(() => {
      expect(screen.getByText("You haven't filed any reports yet.")).toBeInTheDocument()
    })
  })
 
  it('shows delete account button', async () => {
    render(
      <BrowserRouter>
        <AccountPage />
      </BrowserRouter>
    )
 
    await waitFor(() => {
      expect(screen.getByText('Delete my account')).toBeInTheDocument()
    })
  })
 
  it('shows confirmation modal when delete button is clicked', async () => {
    render(
      <BrowserRouter>
        <AccountPage />
      </BrowserRouter>
    )
 
    await waitFor(() => {
      expect(screen.getByText('Delete my account')).toBeInTheDocument()
    })
 
    fireEvent.click(screen.getByText('Delete my account'))
 
    expect(screen.getByText('Delete your account?')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByText('Yes, delete account')).toBeInTheDocument()
  })
 
  it('closes modal when cancel is clicked', async () => {
    render(
      <BrowserRouter>
        <AccountPage />
      </BrowserRouter>
    )
 
    await waitFor(() => {
      fireEvent.click(screen.getByText('Delete my account'))
    })
 
    fireEvent.click(screen.getByText('Cancel'))
 
    await waitFor(() => {
      expect(screen.queryByText('Delete your account?')).not.toBeInTheDocument()
    })
  })
 
  it('deletes account and navigates home on confirmation', async () => {
    API.delete.mockResolvedValueOnce({})
 
    render(
      <BrowserRouter>
        <AccountPage />
      </BrowserRouter>
    )
 
    await waitFor(() => {
      fireEvent.click(screen.getByText('Delete my account'))
    })
 
    fireEvent.click(screen.getByText('Yes, delete account'))
 
    await waitFor(() => {
      expect(API.delete).toHaveBeenCalledWith('/api/user/delete')
      expect(localStorage.getItem('token')).toBeNull()
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })
})