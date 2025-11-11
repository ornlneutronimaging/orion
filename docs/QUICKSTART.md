# Orion Studio Quick Start Guide

Welcome to Orion Studio! This guide will help you get started with your custom IDE for neutron imaging.

## Prerequisites

Before installing Orion Studio, ensure you have:

- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 20.04+, Fedora 33+)
- **Memory**: 4GB RAM minimum (8GB recommended)
- **Disk Space**: 500MB for installation, plus space for data and environments
- **Python**: Python 3.8+ (optional, can be managed by pixi)

## Installation

### Windows

1. Download the installer from the releases page
2. Run `OrionStudio-Setup-x.y.z.exe`
3. Follow the installation wizard
4. Launch Orion Studio from the Start Menu

### macOS

1. Download the `.dmg` file from the releases page
2. Open the `.dmg` file
3. Drag Orion Studio to Applications
4. Launch from Applications folder

**Note**: On first launch, you may need to allow the app in System Preferences > Security & Privacy

### Linux

#### Debian/Ubuntu
```bash
# Download the .deb package
wget https://github.com/ornlneutronimaging/orion/releases/download/vX.Y.Z/orion-studio_x.y.z_amd64.deb

# Install
sudo dpkg -i orion-studio_x.y.z_amd64.deb

# Install dependencies if needed
sudo apt-get install -f
```

#### Red Hat/Fedora
```bash
# Download the .rpm package
wget https://github.com/ornlneutronimaging/orion/releases/download/vX.Y.Z/orion-studio-x.y.z.x86_64.rpm

# Install
sudo rpm -i orion-studio-x.y.z.x86_64.rpm
```

## First Launch

### Initial Setup Wizard

On first launch, you'll be greeted with a setup wizard:

1. **Welcome Screen**: Overview of Orion Studio
2. **Theme Selection**: Choose your preferred color theme
3. **Extension Installation**: Recommended extensions for neutron imaging
4. **Pixi Setup**: Configure Python environment management (optional)
5. **Beamline Connection**: Configure MARS/VENUS access (optional)

### Recommended Extensions

The following extensions are recommended for neutron imaging workflows:

- **Neutron Imaging Tools**: Core data analysis utilities
- **Jupyter Notebooks**: Interactive notebook support
- **Python**: Python language support
- **Pixi Environment Manager**: Environment management
- **Data Visualization**: Advanced plotting and imaging

## Basic Usage

### Opening a Project

1. **File > Open Folder**: Select your analysis project directory
2. Or use `Ctrl+K Ctrl+O` (Windows/Linux) or `Cmd+K Cmd+O` (macOS)

### Creating a Jupyter Notebook

1. **File > New File** or `Ctrl+N` / `Cmd+N`
2. Select **Jupyter Notebook** from the file type menu
3. Choose your Python kernel (or create a new pixi environment)
4. Start analyzing!

### Working with Neutron Data

```python
# Example: Loading and visualizing neutron radiography data
import numpy as np
import matplotlib.pyplot as plt
from neutron_imaging import load_fits

# Load data
data = load_fits('path/to/neutron_image.fits')

# Display
plt.imshow(data, cmap='gray')
plt.colorbar()
plt.title('Neutron Radiograph')
plt.show()
```

### Environment Management with Pixi

#### Create a New Environment

1. Open Command Palette: `Ctrl+Shift+P` / `Cmd+Shift+P`
2. Type "Pixi: Create Environment"
3. Enter environment name
4. Select packages to install

#### Switch Environments

1. Click the environment indicator in the status bar
2. Select the desired environment from the list
3. The Jupyter kernel will automatically update

## Connecting to MARS/VENUS Beamlines

### MARS (HFIR) Connection

1. **Settings > Beamlines > MARS**
2. Enter your credentials
3. Configure data path
4. Test connection

### VENUS (SNS) Connection

1. **Settings > Beamlines > VENUS**
2. Enter your credentials
3. Configure data path
4. Test connection

## Common Workflows

### Radiography Analysis

1. Open your data directory
2. Create a new Jupyter notebook
3. Load flat-field and dark-current images
4. Process radiographs
5. Export results

### Tomography Reconstruction

1. Import sinogram data
2. Configure reconstruction parameters
3. Preview reconstruction
4. Run full reconstruction
5. Visualize 3D volume

### Batch Processing

1. Use the File Explorer to select multiple files
2. Right-click and select "Batch Process"
3. Choose processing workflow
4. Monitor progress
5. Review results

## Keyboard Shortcuts

### General
- `Ctrl/Cmd + P`: Quick file open
- `Ctrl/Cmd + Shift + P`: Command palette
- `Ctrl/Cmd + B`: Toggle sidebar
- `Ctrl/Cmd + J`: Toggle terminal

### Notebooks
- `Shift + Enter`: Run cell and select next
- `Ctrl/Cmd + Enter`: Run cell
- `Alt/Option + Enter`: Run cell and insert below
- `A`: Insert cell above
- `B`: Insert cell below
- `DD`: Delete cell

### Editing
- `Ctrl/Cmd + /`: Toggle comment
- `Alt/Option + Up/Down`: Move line up/down
- `Shift + Alt/Option + Up/Down`: Copy line up/down

## Getting Help

### Documentation
- Access built-in docs: `Help > Documentation`
- Online docs: https://ornlneutronimaging.github.io/orion

### Support
- GitHub Issues: https://github.com/ornlneutronimaging/orion/issues
- Community Forum: [Coming Soon]
- Email: orion-support@ornl.gov [Configure as needed]

### Tutorials
- `Help > Tutorials`: Interactive walkthrough
- Example workflows in `examples/` folder
- Video tutorials: [Coming Soon]

## Tips and Tricks

### Performance
- Close unused notebooks to free memory
- Use data streaming for large datasets
- Enable hardware acceleration in settings

### Customization
- Explore themes: `File > Preferences > Color Theme`
- Customize keyboard shortcuts: `File > Preferences > Keyboard Shortcuts`
- Configure settings: `File > Preferences > Settings`

### Collaboration
- Use Git integration for version control
- Share environments with pixi.toml files
- Export notebooks as HTML/PDF for sharing

## Troubleshooting

### Orion Studio won't start
- Check system requirements
- Review error logs in `~/.orion/logs`
- Try running from command line for detailed errors

### Jupyter kernel won't connect
- Verify Python installation
- Check pixi environment activation
- Restart the kernel: `Ctrl+Shift+P` > "Restart Kernel"

### Extensions not loading
- Check extension compatibility
- Update to latest version
- Disable conflicting extensions

### Beamline connection issues
- Verify network connectivity
- Check credentials
- Ensure VPN is connected (if required)

## Next Steps

- Read the [Architecture Guide](ARCHITECTURE.md) to understand system design
- Check the [Roadmap](ROADMAP.md) for upcoming features
- Join the community and contribute!

---

**Need more help?** Check our comprehensive documentation or reach out to the community.

**Ready to contribute?** See `CONTRIBUTING.md` for guidelines (coming soon).
