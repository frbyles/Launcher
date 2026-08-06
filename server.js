import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { readdirSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 5000;

function getAvailableModels() {
  const modelsDir = config.modelsDir;
  if (!modelsDir) return [];

  try {
    const models = [];

    function scanDir(currentPath, parentName = '') {
      try {
        const entries = readdirSync(currentPath, { withFileTypes: true });
        const ggufFiles = entries.filter(e => e.isFile() && e.name.endsWith('.gguf'));

        if (ggufFiles.length > 0) {
          // This directory has GGUF files - find primary file for multi-part models
          const sortedFiles = ggufFiles.map(f => f.name).sort();
          const primaryFile = sortedFiles.find(f => f.includes('-00001-of-')) || sortedFiles[0];

          if (primaryFile) {
            const displayName = parentName || currentPath.split('/').pop();
            models.push({
              name: displayName,
              path: currentPath,
              files: [{
                name: primaryFile,
                fullPath: path.join(currentPath, primaryFile)
              }]
            });
          }
        } else {
          // Recurse into subdirectories
          const subdirs = entries.filter(e => e.isDirectory());
          subdirs.forEach(subdir => {
            const subPath = path.join(currentPath, subdir.name);
            const newParent = parentName ? `${parentName}/${subdir.name}` : subdir.name;
            scanDir(subPath, newParent);
          });
        }
      } catch (e) {
        // Skip on error
      }
    }

    try {
      const topDirs = readdirSync(modelsDir, { withFileTypes: true })
        .filter(d => d.isDirectory());

      topDirs.forEach(d => {
        scanDir(path.join(modelsDir, d.name), d.name);
      });
    } catch (e) {
      // Skip if models dir doesn't exist
    }

    return models;
  } catch (e) {
    return [];
  }
}

// CONFIGURE THESE PATHS - Point to your project directories
const projects = {
  llamacpp: {
    name: 'Llama.cpp Server (Fable5)',
    port: 8000,
    dir: '/home/roger/llama.cpp-fable5',
    cmd: './build/bin/llama-server',
    args: ['-p', '8000', '--host', '127.0.0.1'],
    url: 'http://localhost:8000',
    isEngine: true
  },
  pithagoras: {
    name: 'Pithagoras',
    port: 4100,
    dir: '/home/roger/pithagoras',
    cmd: 'npm',
    args: ['run', 'dev:server'],
    url: 'http://localhost:4100'
  },
  understory: {
    name: 'Understory',
    port: 3800,
    dir: '/home/roger/understory',
    cmd: 'pnpm',
    args: ['dev'],
    url: 'http://localhost:3800'
  },
  agentbox: {
    name: 'AgentBox',
    port: 3000,
    dir: '/home/roger/agentbox/app',
    cmd: 'npm',
    args: ['run', 'dev'],
    url: 'http://localhost:3000'
  }
};

const processes = {};
const config = {
  modelProvider: 'local',
  modelName: 'fable5',
  apiKey: '',
  localModelEndpoint: 'http://localhost:8000/v1',
  selectedModel: null,
  customFlags: '',
  modelsDir: ''
};

app.use(express.json());
app.use(express.static('public'));

app.get('/api/projects', (req, res) => {
  const status = Object.entries(projects).map(([key, proj]) => ({
    id: key,
    ...proj,
    running: !!processes[key]
  }));
  res.json(status);
});

app.get('/api/models', (req, res) => {
  const models = getAvailableModels();
  res.json(models);
});

app.get('/api/config', (req, res) => {
  res.json(config);
});

app.post('/api/config', (req, res) => {
  Object.assign(config, req.body);
  res.json({ success: true, config });
});

app.post('/api/set-model', (req, res) => {
  const { modelPath } = req.body;
  if (modelPath) {
    config.selectedModel = modelPath;
    res.json({ success: true, message: `Model set to ${modelPath}` });
  } else {
    res.status(400).json({ error: 'Model path required' });
  }
});

app.post('/api/start/:id', (req, res) => {
  const proj = projects[req.params.id];
  if (!proj) return res.status(404).json({ error: 'Project not found' });

  if (processes[req.params.id]) {
    return res.json({ message: 'Already running' });
  }

  const env = {
    ...process.env,
    ANTHROPIC_API_KEY: config.apiKey || process.env.ANTHROPIC_API_KEY
  };

  let args = [...proj.args];

  // For llama.cpp, add model path and custom flags
  if (req.params.id === 'llamacpp') {
    if (config.selectedModel) {
      args = ['-m', config.selectedModel];

      // Add custom flags if provided
      if (config.customFlags && config.customFlags.trim()) {
        const customArgs = config.customFlags.trim().split(/\s+/);
        args = args.concat(customArgs);
      }

      // Add server config
      args = args.concat(['-p', '8000', '--host', '127.0.0.1']);
    }
  }

  const spawnOpts = {
    cwd: proj.dir,
    stdio: 'inherit',
    env,
    shell: process.platform === 'win32' // npm/pnpm are .cmd shims on Windows
  };

  const proc = spawn(proj.cmd, args, spawnOpts);

  processes[req.params.id] = proc;

  let responded = false;

  proc.on('exit', () => {
    delete processes[req.params.id];
  });

  proc.on('error', (err) => {
    console.error(`Failed to start ${proj.name}:`, err.message);
    delete processes[req.params.id];
    if (!responded) {
      responded = true;
      res.status(500).json({ error: `Failed to start ${proj.name}: ${err.message}` });
    }
  });

  if (!responded) {
    responded = true;
    res.json({ success: true, message: `${proj.name} starting...` });
  }
});

app.post('/api/stop/:id', (req, res) => {
  const proc = processes[req.params.id];
  if (!proc) return res.status(404).json({ error: 'Not running' });

  proc.kill('SIGTERM');
  res.json({ success: true, message: 'Stopping...' });
});

app.post('/api/kill-all', (req, res) => {
  Object.entries(processes).forEach(([id, proc]) => {
    proc.kill('SIGTERM');
    console.log(`Killed process: ${id}`);
  });
  res.json({ success: true, message: 'All processes killed' });
});

app.post('/api/pick-folder', (req, res) => {
  let pickerCmd = '';
  let args = [];

  if (process.platform === 'win32') {
    pickerCmd = 'powershell.exe';
    args = [
      '-Command',
      `Add-Type -AssemblyName System.Windows.Forms; $dialog = New-Object System.Windows.Forms.FolderBrowserDialog; if ($dialog.ShowDialog() -eq 'OK') { $dialog.SelectedPath }`
    ];
  } else if (process.platform === 'darwin') {
    pickerCmd = 'osascript';
    args = [
      '-e',
      'tell application "Finder"\nset folderPath to (choose folder) as text\nlog POSIX path of folderPath\nend tell'
    ];
  } else {
    pickerCmd = 'zenity';
    args = ['--file-selection', '--directory'];
  }

  const proc = spawn(pickerCmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
  let output = '';
  let error = '';

  proc.stdout.on('data', (data) => {
    output += data.toString().trim();
  });

  proc.stderr.on('data', (data) => {
    error += data.toString();
  });

  proc.on('close', (code) => {
    if (code === 0 && output) {
      let folderPath = output.split('\n').filter(line => line.trim())[0];
      if (process.platform === 'darwin') {
        folderPath = folderPath.replace(/file:\/\//, '');
      }
      res.json({ success: true, path: folderPath });
    } else {
      res.json({ success: false, message: 'No folder selected' });
    }
  });
});

app.listen(port, () => {
  console.log(`\n🚀 Launcher running at http://localhost:${port}\n`);
});
