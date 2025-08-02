# VS Code Setup Guide for Celebrity Booking Platform

## 🚀 **Quick Start in VS Code**

### **1. Install Required Extensions**

When you open this project in VS Code, you'll be prompted to install recommended extensions. Click **"Install All"** or install them manually:

**Essential Extensions:**

- **TypeScript & JavaScript** - Language support
- **ESLint** - Code linting and fixing
- **Prettier** - Code formatting
- **Tailwind CSS IntelliSense** - CSS class autocomplete
- **ES7+ React/Redux Snippets** - React code snippets
- **Jest** - Test runner integration
- **Playwright Test** - E2E test support
- **GitLens** - Enhanced Git features
- **Supabase** - Database integration

### **2. Set Up Environment**

```bash
# Option 1: Use VS Code integrated terminal
Ctrl/Cmd + Shift + P → "Tasks: Run Task" → "Setup Environment"

# Option 2: Manual setup
npm run setup
```

### **3. Install Dependencies**

```bash
# Use VS Code task
Ctrl/Cmd + Shift + P → "Tasks: Run Task" → "Install Dependencies"

# Or manually
npm run fullstack:install
```

## 🔧 **VS Code Features Configured**

### **Debugging**

Press `F5` or use Debug panel:

- **Debug Frontend** - Debug React app on port 8080
- **Debug Backend** - Debug Express server on port 3000
- **Debug Admin Dashboard** - Debug admin app on port 3001
- **Run Tests** - Debug Jest tests
- **Debug E2E Tests** - Debug Playwright tests

### **Tasks (Ctrl/Cmd + Shift + P → "Tasks: Run Task")**

- ✅ **Setup Environment** - Complete environment setup
- ✅ **Validate Environment** - Check all required variables
- ✅ **Start All Services** - Start frontend, backend, and admin
- ✅ **Start Frontend Only** - React app development
- ✅ **Start Backend Only** - API server development
- ✅ **Start Admin Dashboard Only** - Admin panel development
- ✅ **Run Tests** - Execute unit tests
- ✅ **Run E2E Tests** - Execute end-to-end tests
- ✅ **Lint & Fix** - Fix code style issues
- ✅ **Build Production** - Create production build

### **Keyboard Shortcuts**

- `Ctrl/Cmd + Shift + P` - Command palette
- `F5` - Start debugging
- `Ctrl/Cmd + Shift + \`` - New terminal
- `Ctrl/Cmd + B` - Toggle sidebar
- `Ctrl/Cmd + J` - Toggle panel
- `Ctrl/Cmd + Shift + E` - Explorer
- `Ctrl/Cmd + Shift + F` - Search across files
- `Ctrl/Cmd + Shift + G` - Source control

## 🧪 **Testing in VS Code**

### **Unit Tests (Jest)**

- **Run All Tests**: `Ctrl/Cmd + Shift + P` → "Jest: Start All Tests"
- **Run Current File**: Right-click test file → "Jest: Run Related Tests"
- **Debug Test**: Click debug icon next to test or use Debug panel
- **Coverage**: Tests automatically show coverage in gutter

### **E2E Tests (Playwright)**

- **Run E2E Tests**: Use task "Run E2E Tests"
- **Debug E2E**: Use "Debug E2E Tests" configuration
- **Test UI**: `npm run test:e2e:ui` for interactive mode

### **API Testing**

- Use **REST Client** extension to test API endpoints
- Create `.http` files for API requests
- Or use **Thunder Client** extension for Postman-like experience

## 🎯 **Development Workflow**

### **1. Daily Development**

```bash
# Morning routine
1. Pull latest changes: Git panel or Ctrl/Cmd + Shift + G
2. Validate environment: Run "Validate Environment" task
3. Start all services: Run "Start All Services" task (Ctrl/Cmd + Shift + P)
4. Start coding!
```

### **2. Code Quality**

- **Auto-format on save** - Prettier formats code automatically
- **Auto-fix ESLint** - ESLint fixes issues on save
- **Type checking** - TypeScript errors shown in Problems panel
- **Git integration** - GitLens shows blame, history, etc.

### **3. Testing Workflow**

- **Write tests** - Use Jest snippets for quick test creation
- **Run tests continuously** - Jest extension runs tests on file changes
- **Debug failing tests** - Set breakpoints and debug with F5
- **E2E testing** - Use Playwright for full user flow testing

## 🔍 **Debugging Tips**

### **Frontend Debugging**

- Set breakpoints in `.tsx/.ts` files
- Use browser dev tools integration
- Console logs appear in VS Code Debug Console
- React DevTools work normally in browser

### **Backend Debugging**

- Set breakpoints in backend `.js` files
- Debug API endpoints and middleware
- Environment variables loaded automatically
- Database queries visible in debug console

### **Common Issues**

1. **Port conflicts**: Check if ports 3000/3001/8080 are free
2. **Environment variables**: Run "Validate Environment" task
3. **Dependencies**: Run "Install Dependencies" task if packages missing
4. **TypeScript errors**: Check Problems panel (Ctrl/Cmd + Shift + M)

## 📱 **Multi-Device Testing**

### **Local Network Testing**

```bash
# Find your local IP
ipconfig getifaddr en0  # macOS
ip route get 1 | awk '{print $7; exit}'  # Linux

# Access from mobile devices
http://YOUR_LOCAL_IP:8080  # Frontend
http://YOUR_LOCAL_IP:3001  # Admin Dashboard
```

### **Browser Testing**

- **Chrome DevTools** - Built-in React DevTools
- **Firefox** - Good for CSS debugging
- **Safari** - iOS compatibility testing
- **Edge** - Windows compatibility

## 🚀 **Deployment from VS Code**

### **Production Build**

```bash
# Use task or run manually
npm run production:build
```

### **Environment Management**

- Keep `.env.example` files updated
- Use different `.env` files for different environments
- Never commit actual `.env` files (already in .gitignore)

## 🎨 **VS Code Customization**

### **Themes Recommended for This Project**

- **One Dark Pro** - Dark theme with good syntax highlighting
- **Material Theme** - Google Material Design
- **Dracula** - Popular dark theme
- **GitHub Theme** - Light/dark GitHub-style theme

### **Useful Snippets**

The project includes custom snippets for:

- React functional components
- TypeScript interfaces
- API route handlers
- Test cases
- Tailwind CSS classes

## 🆘 **Troubleshooting**

### **Extension Issues**

1. Reload VS Code: `Ctrl/Cmd + Shift + P` → "Developer: Reload Window"
2. Update extensions: Extensions panel → Update all
3. Clear extension cache: Restart VS Code

### **Project Issues**

1. **Intellisense not working**: Restart TypeScript server (`Ctrl/Cmd + Shift + P` → "TypeScript: Restart TS Server")
2. **Git issues**: Check Source Control panel for conflicts
3. **Build failures**: Check Terminal output and Problems panel
4. **Test failures**: Use Debug configurations to step through tests

---

## 🎯 **Ready to Code!**

Your VS Code is now fully configured for the Celebrity Booking Platform. Use the tasks and debugging configurations to streamline your development workflow.

**Next steps:**

1. Run "Setup Environment" task
2. Run "Start All Services" task
3. Open http://localhost:8080 to see the app
4. Start coding! 🚀
