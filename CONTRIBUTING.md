# Contributing to Basecamp MCP Server

Thank you for your interest in contributing to the Basecamp MCP Server! This document provides guidelines for contributing to the project.

## 🤝 How to Contribute

### Reporting Bugs

If you find a bug, please [open an issue](https://github.com/vapvarun/basecamp-mcp-server/issues) with:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected vs actual behavior
- Your environment (Node.js version, OS, etc.)
- Relevant logs or error messages

### Suggesting Enhancements

Enhancement suggestions are welcome! Please [open an issue](https://github.com/vapvarun/basecamp-mcp-server/issues) with:

- A clear description of the enhancement
- Use cases and benefits
- Any implementation ideas you have

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** following the code style guidelines
3. **Test your changes** thoroughly
4. **Update documentation** if needed
5. **Commit your changes** with clear commit messages
6. **Submit a pull request** with a clear description

## 🛠 Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/basecamp-mcp-server.git
cd basecamp-mcp-server

# Install dependencies
npm install

# Copy config example
cp config.example.json config.json
# Edit config.json with your Basecamp credentials

# Build the project
npm run build

# Run in development mode
npm run dev
```

## 📋 Code Style Guidelines

### TypeScript

- Use TypeScript strict mode
- Follow existing code patterns
- Add type annotations where helpful
- Avoid `any` types when possible

### Code Structure

- Keep functions small and focused
- Add comments for complex logic
- Use descriptive variable names
- Follow the existing file structure

### Commit Messages

Follow conventional commits format:

```
type(scope): subject

body (optional)
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(api): add support for Basecamp webhooks
fix(server): handle expired token refresh properly
docs(readme): update installation instructions
```

## 🧪 Testing

Before submitting a PR:

1. **Build the project** without errors
   ```bash
   npm run build
   ```

2. **Test with MCP Inspector**
   ```bash
   npx @modelcontextprotocol/inspector node build/index.js
   ```

3. **Test in Claude Desktop**
   - Update your Claude config
   - Restart Claude Desktop
   - Test the affected tools

## 📝 Documentation

When adding new features:

- Update `README.md` with usage examples
- Add tool descriptions to `src/tools.ts`
- Document any new configuration options
- Update `CONVERSION_GUIDE.md` if needed

## 🔒 Security

- **Never commit credentials** (config.json is gitignored)
- Report security issues privately to varun@wbcomdesigns.com
- Don't open public issues for security vulnerabilities

## 📜 Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone.

### Our Standards

**Positive behaviors:**
- Being respectful and inclusive
- Accepting constructive criticism
- Focusing on what's best for the community
- Showing empathy towards others

**Unacceptable behaviors:**
- Harassment or discriminatory language
- Trolling or insulting comments
- Publishing others' private information
- Other unprofessional conduct

### Enforcement

Violations may be reported to varun@wbcomdesigns.com. All complaints will be reviewed and investigated.

## 🏆 Recognition

Contributors will be recognized in:
- The project README
- Release notes
- Our website at [wbcomdesigns.com](https://wbcomdesigns.com)

## 📞 Questions?

- **GitHub Issues:** [Project Issues](https://github.com/vapvarun/basecamp-mcp-server/issues)
- **Email:** varun@wbcomdesigns.com
- **Website:** [wbcomdesigns.com](https://wbcomdesigns.com)

## 📄 License

By contributing, you agree that your contributions will be licensed under the GPL-2.0-or-later license.

---

**Thank you for contributing to Basecamp MCP Server!** 🎉

*Created and maintained by [Varun Dubey (vapvarun)](https://github.com/vapvarun) at [Wbcom Designs](https://wbcomdesigns.com)*
