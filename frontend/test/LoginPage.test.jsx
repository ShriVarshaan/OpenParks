// 第250-272行，修改验证测试
it('shows validation error when registration fields are invalid', async () => {
  API.post.mockRejectedValueOnce({
    response: { status: 400, data: { error: ['Username must be at least 3 characters'] } }
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
  
  await userEvent.type(nameInput, 'a')
  await userEvent.type(emailInput, 'invalid')
  await userEvent.type(passwordInput, '12')
  
  const submitButton = screen.getByRole('button', { name: 'Create account' })
  fireEvent.click(submitButton)
  
  await waitFor(() => {
    expect(API.post).toHaveBeenCalled()
  })
})