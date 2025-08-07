// Mock for next-auth
const NextAuth = jest.fn(() => ({
  handlers: {
    GET: jest.fn(),
    POST: jest.fn(),
  },
  signIn: jest.fn(),
  signOut: jest.fn(),
  auth: jest.fn(),
}));

const getServerSession = jest.fn();

module.exports = NextAuth;
module.exports.getServerSession = getServerSession;
module.exports.default = NextAuth;