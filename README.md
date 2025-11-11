# Orion Studio

**A Custom VSCode IDE for Neutron Imaging at ORNL**

Orion Studio is a specialized fork of VSCode/VSCodium, purpose-built for neutron imaging workflows at Oak Ridge National Laboratory's MARS (HFIR) and VENUS (SNS) beamlines. Similar to how Cursor customized VSCode for AI development, Orion Studio provides an integrated development environment tailored for neutron data analysis.

## Why Orion Studio?

Traditional notebook environments (JupyterLab in browsers) present challenges:
- Browser-based interfaces lack native IDE features
- Manual Python environment management
- No integrated git version control for notebooks
- Separate authentication systems

**Orion Studio solves these problems by providing:**
- Native desktop application with full IDE capabilities
- Git-based notebook version selector (toolbar button)
- Automated Python environment management (pixi integration)
- ORNL LDAP/SSH authentication
- Access to 40,000+ VSCode extensions
- Custom neutron imaging analysis tools

## Key Features

### 🎯 Core Capabilities
- **Native Jupyter Notebooks**: Full-featured notebook interface built on VSCode's excellent Jupyter extension
- **Git Version Control**: Switch between notebook versions via toolbar dropdown (branches/tags)
- **Pixi Environment Manager**: Auto-detect and manage Python environments from `pixi.toml`
- **ORNL Authentication**: Integrated LDAP/SSH authentication on startup
- **Extension Ecosystem**: Access to entire VSCode marketplace

### 🔬 Neutron Imaging Tools
- Pre-configured for neutron radiography and tomography workflows
- Custom visualization tools for neutron data
- Analysis templates and snippets
- Integration with ORNL beamline systems (MARS/VENUS)

### 🤖 AI-Powered Development
- Continue.dev integration with OpenRouter
- Context-aware code completion
- Analysis workflow suggestions

## Project Status

**Current Phase:** Initial repository setup (Phase 0)

See [ROADMAP.md](docs/ROADMAP.md) for the complete 8-week development plan.

## Documentation

- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Complete system architecture, technical stack, and implementation details
- **[ROADMAP.md](docs/ROADMAP.md)** - 8-week phased development plan with daily tasks
- **[QUICKSTART.md](docs/QUICKSTART.md)** - Developer setup guide for building VSCode forks

## Quick Start (for Developers)

```bash
# Prerequisites: Node.js 18+, Python 3.8+, build tools

# Clone VSCodium
git clone https://github.com/VSCodium/vscodium.git
cd vscodium

# Download VSCode source
./get_repo.sh

# Build
cd vscode
yarn install
yarn gulp vscode-linux-x64-min

# Run
./scripts/code.sh
```

For detailed instructions, see [QUICKSTART.md](docs/QUICKSTART.md).

## Architecture Overview

```
orion-studio/
├── vscode/                    # VSCodium fork
│   └── src/vs/orion/         # Custom code namespace
│       ├── browser/          # UI components
│       │   ├── notebookVersionSelector/
│       │   ├── pixiEnvironmentManager/
│       │   └── authenticationProvider/
│       └── node/             # Backend services
│           ├── gitService.ts
│           ├── pixiService.ts
│           └── ldapService.ts
├── extensions/               # Pre-bundled extensions
│   ├── ms-toolsai.jupyter/
│   ├── continue.continue/
│   └── neutron-imaging/
├── resources/                # Branding assets
└── scripts/                  # Build and deployment
```

## Technology Stack

- **Base:** VSCode/VSCodium (TypeScript/JavaScript)
- **Framework:** Electron (desktop application)
- **Build Tools:** Node.js, Yarn, Gulp
- **Languages:** TypeScript (core), JavaScript (extensions), Python (analysis)
- **Editor:** Monaco Editor (built into VSCode)

## Target Users

- Neutron imaging scientists at ORNL's MARS (HFIR) and VENUS (SNS) beamlines
- Researchers working with radiography and tomography data
- Data analysts processing neutron imaging experiments
- Students and educators in neutron science

## Development Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 0 | Week 1 | VSCodium fork with Orion branding |
| Phase 1 | Week 2-3 | Core services (Git, Pixi) |
| Phase 2 | Week 4 | Notebook version selector |
| Phase 3 | Week 5 | Pixi environment manager |
| Phase 4 | Week 6 | LDAP authentication |
| Phase 5 | Week 7 | Extension bundling |
| Phase 6 | Week 7-8 | Packaging & distribution |
| Phase 7 | Week 9+ | Launch & maintenance |

**Estimated Cost:** $28,000 initial development + $18,000/year maintenance

## Success Metrics

- **Adoption:** 50%+ of neutron imaging users within 3 months
- **Support:** <2 tickets per week
- **Stability:** Zero data loss incidents
- **Satisfaction:** >4/5 user rating

## Installation (Coming Soon)

Once released, installation will be straightforward:

```bash
# Linux AppImage
wget https://github.com/ornlneutronimaging/orion/releases/latest/orion-studio.AppImage
chmod +x orion-studio.AppImage
./orion-studio.AppImage

# Or use package managers
# DEB: sudo dpkg -i orion-studio_*.deb
# RPM: sudo rpm -i orion-studio-*.rpm
```

## Contributing

This project is currently in initial development. Contribution guidelines will be added as the project matures.

For now, developers interested in contributing should:
1. Review the [ARCHITECTURE.md](docs/ARCHITECTURE.md) document
2. Check the [ROADMAP.md](docs/ROADMAP.md) for current phase
3. Join the development discussion (channels TBD)

## License

MIT License - See [LICENSE](LICENSE) for details

Orion Studio is built on the foundation of:
- Visual Studio Code (Microsoft Corporation) - MIT License
- VSCodium (VSCodium maintainers) - MIT License

## Acknowledgments

- **Microsoft** - for creating and open-sourcing Visual Studio Code
- **VSCodium Team** - for maintaining a telemetry-free VSCode build
- **ORNL Neutron Sciences Directorate** - for supporting this development
- **MARS (HFIR) and VENUS (SNS) beamline teams** - for requirements and testing

## Contact & Support

- **Issues:** [GitHub Issues](https://github.com/ornlneutronimaging/orion/issues)
- **Discussions:** (Coming soon)
- **Documentation:** [docs/](docs/)

---

**Project Status:** 🚧 Under active development

See [ROADMAP.md](docs/ROADMAP.md) for current progress and upcoming milestones.
