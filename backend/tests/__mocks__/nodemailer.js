module.exports = {
  default: {
    createTransport: () => ({ sendMail: () => Promise.resolve() }),
  },
  createTransport: () => ({ sendMail: () => Promise.resolve() }),
};
