# 🚀 Project Launcher

A web-based launcher for managing your local AI development stack. Control Pithagoras, Understory, AgentBox, and llama.cpp from one dashboard with custom model selection and flag configuration.

## Features

- 🎛️ **Start/Stop Projects** - Manage all 4 projects from one UI
- 📦 **Model Selection** - Choose from models in your configured models folder
- ⚙️ **Custom Flags** - Add llama.cpp flags like `-ngl 99 -c 65536`
- 🔗 **Quick Links** - Access running services directly
- ⚡ **Real-time Status** - See which projects are running

## Setup

### Windows 11

**Prerequisites:**
1. [Node.js LTS](https://nodejs.org/) - Download and install

**Steps:**
```bash
# Navigate to launcher directory
cd path\to\launcher

# Install dependencies
npm install

# Start launcher
npm start
```

Open browser to: **http://localhost:5000**

### Linux (Ubuntu/Debian)

**Prerequisites:**
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Or use nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 22
```

**Steps:**
```bash
# Navigate to launcher directory
cd path/to/launcher

# Install dependencies
npm install

# Start launcher
npm start
```

Open browser to: **http://localhost:5000**

## Dependencies

### Required
- **Node.js 18+** - https://nodejs.org/
- **npm** - Comes with Node.js

### Node Packages (auto-installed)
- **Express.js** - Web framework
  - https://www.npmjs.com/package/express
- **Child Process** - For spawning projects
  - Built into Node.js

### Projects (must be installed separately)

1. **Pithagoras** - https://github.com/thecodacus/pithagoras
   - Requires: npm, Node.js 18+

2. **Understory** - https://github.com/thecodacus/understory
   - Requires: pnpm (`npm install -g pnpm`), Node.js 20+

3. **AgentBox** - https://github.com/thecodacus/agentbox
   - Requires: Docker, Node.js 20+
   - Build sandbox images before starting

4. **Llama.cpp** - https://github.com/thecodacus/llama.cpp
   - Built C++ binary (no setup needed if compiled)

## Configuration

### Models Folder

1. Open the launcher at **http://localhost:5000**
2. In the "Models Folder" section, enter your models directory path:
   - Windows example: `C:\Users\YourName\models`
   - Linux example: `/home/user/models`
3. The launcher will automatically scan for GGUF files

### Project Paths

Edit `server.js` lines 71-105 to set your project directories if needed:

```javascript
const projects = {
  llamacpp: {
    dir: '/your/path/to/llama.cpp-fable5', // Update this
    // ...
  },
  pithagoras: {
    dir: '/your/path/to/pithagoras', // Update this
    // ...
  }
  // etc.
};
```

## Usage

1. **Set Models Folder**
   - Enter your models directory path in the "Models Folder" section
   - The dropdown will auto-populate with available GGUF models
   - Supports multi-part GGUF files (shows first part)

2. **Select Model**
   - Choose from the "Available Models" dropdown
   - Model path is automatically saved

3. **Add Flags** (optional)
   - Example: `-ngl 99 --n-cpu-moe 40 -c 65536 -ctk q8_0 -ctv q8_0`
   - Flags auto-pass to llama-server on start

4. **Start Projects**
   - Click "Start" button on any project
   - Status updates in real-time

5. **Access Running Projects**
   - Click "Open" button to access in browser
   - Projects run on default ports (see UI)

## Ports

- **Launcher**: http://localhost:5000
- **Pithagoras**: http://localhost:4100
- **Understory**: http://localhost:3800
- **AgentBox**: http://localhost:3000
- **Llama.cpp Server**: http://localhost:8000

## Troubleshooting

**"Port already in use"**
- Another project is running on that port
- Kill the process: `lsof -ti:8000 | xargs kill -9` (Linux/Mac)
- Or: `netstat -ano | findstr :8000` (Windows, then Task Manager to kill)

**Models not showing**
- Enter the correct models folder path in the UI
- Make sure the folder exists and is readable
- Models must be in GGUF format (.gguf files)
- Multi-part models (00001-of-00003) show as single entry
- Models list updates automatically after setting the folder path

**Launcher won't start**
- Make sure Node.js is installed: `node --version`
- Delete `node_modules` and run `npm install` again

## License

MIT

## Author

Built with Express.js for local AI development stack management.
