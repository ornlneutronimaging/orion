# Orion Studio Architecture

## Overview

Orion Studio is built on the Visual Studio Code (VSCode) foundation, extending it with neutron imaging-specific capabilities. This document outlines the system architecture, key components, and design decisions.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Orion Studio                            │
├─────────────────────────────────────────────────────────────┤
│  Custom Extensions & Tools                                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │  Neutron     │ │  Jupyter     │ │  Beamline    │        │
│  │  Imaging     │ │  Integration │ │  Connector   │        │
│  │  Tools       │ │              │ │              │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
├─────────────────────────────────────────────────────────────┤
│  VSCode Core Platform                                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │  Editor      │ │  Extension   │ │  Terminal    │        │
│  │  Engine      │ │  Host        │ │              │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
├─────────────────────────────────────────────────────────────┤
│  Electron Framework                                          │
│  ┌──────────────┐ ┌──────────────┐                         │
│  │  Chromium    │ │  Node.js     │                         │
│  └──────────────┘ └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. VSCode Foundation
- **Base**: Microsoft Visual Studio Code open-source core
- **Language**: TypeScript/JavaScript
- **Framework**: Electron (Chromium + Node.js)
- **Extension API**: VSCode Extension API

### 2. Neutron Imaging Extensions
Extensions specific to neutron imaging workflows:
- Data visualization tools
- Image processing utilities
- Tomography reconstruction interfaces
- Radiography analysis tools

### 3. Jupyter Integration
- Native Jupyter notebook support
- Interactive Python kernel management
- Cell execution and visualization
- Integration with pixi environments

### 4. AI Assistants
- Code completion and suggestions
- Data analysis recommendations
- Workflow automation
- Context-aware help system

### 5. Beamline Integration
- MARS (HFIR) connectivity
- VENUS (SNS) connectivity
- Data acquisition interfaces
- Instrument control APIs

### 6. Environment Management
- Pixi integration for reproducible environments
- Python package management
- Dependency resolution
- Environment switching

## Technology Stack

### Frontend
- **UI Framework**: VSCode Monaco Editor
- **Rendering**: Electron/Chromium
- **Language**: TypeScript
- **Styling**: CSS/LESS

### Backend
- **Runtime**: Node.js
- **Language Services**: Language Server Protocol (LSP)
- **Extension Host**: Separate Node.js process
- **IPC**: JSON-RPC

### Build System
- **Package Manager**: npm/yarn
- **Bundler**: webpack/esbuild
- **Compiler**: TypeScript compiler (tsc)
- **Minification**: terser

### Testing
- **Unit Tests**: Mocha/Jest
- **Integration Tests**: VSCode Extension Test Runner
- **E2E Tests**: Playwright/Puppeteer

## Extension Architecture

### Extension Types
1. **Core Extensions**: Bundled with Orion Studio
2. **Neutron Imaging Extensions**: Domain-specific tools
3. **Community Extensions**: Compatible VSCode extensions

### Extension Structure
```
extension/
├── package.json          # Extension manifest
├── src/
│   ├── extension.ts      # Activation entry point
│   ├── commands/         # Command implementations
│   ├── providers/        # Language/content providers
│   └── utils/            # Utility functions
├── resources/            # Icons, images, etc.
└── tests/               # Extension tests
```

## Data Flow

### 1. User Interaction
```
User Input → VSCode UI → Extension API → Extension Logic → Result Display
```

### 2. Jupyter Notebook Execution
```
Notebook Cell → Jupyter Extension → Python Kernel → Result → Renderer → Display
```

### 3. Beamline Data Acquisition
```
Beamline → API Client → Data Parser → Workspace → Visualization
```

## Security Considerations

- Sandboxed extension execution
- Secure communication with beamline systems
- Credential management for remote connections
- Code signing for distributed builds

## Performance Optimization

- Lazy loading of extensions
- Web worker utilization
- Efficient data streaming for large datasets
- Memory management for image processing

## Deployment Model

### Desktop Application
- Native installers for Windows, macOS, Linux
- Auto-update mechanism
- Local extension marketplace

### Remote/Web Option (Future)
- Browser-based access
- Remote development capabilities
- Cloud-hosted instances

## Future Considerations

- WebAssembly for performance-critical operations
- Remote compute integration
- Enhanced collaboration features
- Machine learning model integration

## References

- [VSCode Architecture](https://github.com/microsoft/vscode/wiki/Source-Code-Organization)
- [Extension API Documentation](https://code.visualstudio.com/api)
- [Electron Documentation](https://www.electronjs.org/docs)

---

*This document will be updated as the architecture evolves.*
