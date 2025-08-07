// Mock for next-auth/providers/google
const GoogleProvider = jest.fn(() => ({
  id: 'google',
  name: 'Google',
  type: 'oauth',
}));

module.exports = GoogleProvider;
module.exports.default = GoogleProvider;