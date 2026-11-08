import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router'
import LoginPage from '../src/pages/LoginPage'
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

const mockNavigate = vi.fn()
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockNavigate.mockClear()
  })

  it('shows login form with email and password fields by default', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )
    
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Full name')).not.toBeInTheDocument()
  })

  it('switches to registration form when register link is clicked', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )
    
    const registerLink = screen.getByText('Register')
    fireEvent.click(registerLink)
    
    expect(screen.getByRole('heading', { name: 'Create account' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Full name')).toBeInTheDocument()
    expect(screen.getByText('Already have an account?')).toBeInTheDocument()
  })

  it('switches back to login form from registration form', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )
    
    fireEvent.click(screen.getByText('Register'))
    fireEvent.click(screen.getByText('Sign in'))
    
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Full name')).not.toBeInTheDocument()
  })

  it('submits login request with email and password', async () => {
    API.post.mockResolvedValueOnce({
      data: { token: 'login-token-123', user: { id: 1, email: 'test@test.com' } }
    })
    
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )
    
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    
    await userEvent.type(emailInput, 'test@test.com')
    await userEvent.type(passwordInput, 'mypassword123')
    
    const submitButton = screen.getByRole('button', { name: 'Sign in' })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(API.post).toHaveBeenCalledWith('/api/auth/login', {
        email: 'test@test.com',
        password: 'mypassword123',
      })
    })
  })

  it('stores token in localStorage after successful login', async () => {
    API.post.mockResolvedValueOnce({
      data: { token: 'login-token-123', user: { id: 1, email: 'test@test.com' } }
    })
    
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )
    
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    
    await userEvent.type(emailInput, 'test@test.com')
    await userEvent.type(passwordInput, 'password123')
    
    const submitButton = screen.getByRole('button', { name: 'Sign in' })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('login-token-123')
      expect(toast.success).toHaveBeenCalledWith('Logged in successfully')
    })
  })

  it('navigates to home page after successful login', async () => {
    API.post.mockResolvedValueOnce({
      data: { token: 'login-token-123', user: { id: 1, email: 'test@test.com' } }
    })
    
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )
    
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    
    await userEvent.type(emailInput, 'test@test.com')
    await userEvent.type(passwordInput, 'password123')
    
    const submitButton = screen.getByRole('button', { name: 'Sign in' })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  it('shows error message when login fails with invalid credentials', async () => {
    API.post.mockRejectedValueOnce({
      response: { status: 401, data: { message: 'Invalid credentials' } }
    })
    
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )
    
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    
    await userEvent.type(emailInput, 'wrong@test.com')
    await userEvent.type(passwordInput, 'wrongpass')
    
    const submitButton = screen.getByRole('button', { name: 'Sign in' })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Invalid credentials')
    })
  })

  const submitLogin = async () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )
    await userEvent.type(screen.getByPlaceholderText('Email'), 'someone@test.com')
    await userEvent.type(screen.getByPlaceholderText('Password'), 'somepass')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
  }

  it('says the server cannot be reached when login gets no response', async () => {
    API.post.mockRejectedValueOnce({ message: 'Network Error' })

    await submitLogin()

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Cannot reach the server. Is the backend running?')
    })
    expect(toast.error).not.toHaveBeenCalledWith('Invalid credentials')
  })

  it('shows a generic error, not invalid credentials, when login fails on the server', async () => {
    API.post.mockRejectedValueOnce({ response: { status: 500, data: { message: 'Login failed' } } })

    await submitLogin()

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Something went wrong, please try again')
    })
    expect(toast.error).not.toHaveBeenCalledWith('Invalid credentials')
  })

  it('says the server cannot be reached when sign-up gets no response', async () => {
    API.post.mockRejectedValueOnce({ message: 'Network Error' })
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )
    fireEvent.click(screen.getByText('Register'))
    await userEvent.type(screen.getByPlaceholderText('Full name'), 'New User')
    await userEvent.type(screen.getByPlaceholderText('Email'), 'new@test.com')
    await userEvent.type(screen.getByPlaceholderText('Password'), 'password123')
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Cannot reach the server. Is the backend running?')
    })
  })

  const submitSignup = async () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )
    fireEvent.click(screen.getByText('Register'))
    await userEvent.type(screen.getByPlaceholderText('Full name'), 'New User')
    await userEvent.type(screen.getByPlaceholderText('Email'), 'new@test.com')
    await userEvent.type(screen.getByPlaceholderText('Password'), 'password123')
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
  }

  it('does not log the user in on sign-up — only after the email code is verified', async () => {
    API.post.mockResolvedValueOnce({ data: { token: 'unverified-token', user: { id: 2 } } })

    await submitSignup()

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Check your email for verification code')
    })
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('shows a generic error, not invalid fields, when sign-up fails on the server', async () => {
    API.post.mockRejectedValueOnce({ response: { status: 500, data: { message: 'Sign up unsuccessful' } } })

    await submitSignup()

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Something went wrong, please try again')
    })
    expect(toast.error).not.toHaveBeenCalledWith('Invalid user/email/password fields')
  })

  it('submits registration request with username email and password', async () => {
    API.post.mockResolvedValueOnce({
      data: { token: 'reg-token-123', user: { id: 2, email: 'new@test.com' } }
    })
    
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )
    
    fireEvent.click(screen.getByText('Register'))
    
    const nameInput = screen.getByPlaceholderText('Full name')
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    
    await userEvent.type(nameInput, 'New User')
    await userEvent.type(emailInput, 'new@test.com')
    await userEvent.type(passwordInput, 'newpass123')
    
    const submitButton = screen.getByRole('button', { name: 'Create account' })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(API.post).toHaveBeenCalledWith('/api/auth/signup', {
        username: 'New User',
        email: 'new@test.com',
        password: 'newpass123',
      })
    })
  })

  it('shows user exists error when registering with existing email', async () => {
    API.post.mockRejectedValueOnce({
      response: { status: 409, data: { message: 'User exists already' } }
    })
    
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )
    
    fireEvent.click(screen.getByText('Register'))
    
    const nameInput = screen.getByPlaceholderText('Full name')
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    
    await userEvent.type(nameInput, 'Test User')
    await userEvent.type(emailInput, 'existing@test.com')
    await userEvent.type(passwordInput, 'password123')
    
    const submitButton = screen.getByRole('button', { name: 'Create account' })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('User exists already, login')
    })
  })

  it('does not submit registration with invalid fields', async () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )
    
    fireEvent.click(screen.getByText('Register'))
    
    const nameInput = screen.getByPlaceholderText('Full name')
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    
    await userEvent.type(nameInput, 'a')
    await userEvent.type(emailInput, 'invalid')
    await userEvent.type(passwordInput, '12')
    
    const submitButton = screen.getByRole('button', { name: 'Create account' })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(API.post).not.toHaveBeenCalled()
    })
  })

  it('prevents already logged in users from accessing login page', () => {
    localStorage.setItem('token', 'existing-token')
    
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )
    
    expect(toast.error).toHaveBeenCalledWith('You are already logged in')
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })
})