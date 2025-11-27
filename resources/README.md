# Resources

This directory contains branding assets and resources for Orion Studio.

## Structure

```
resources/
├── icons/          # Application icons for different platforms
├── logos/          # Logo files in various formats
├── themes/         # Custom color themes
├── images/         # Marketing and documentation images
└── branding/       # Brand guidelines and assets
```

## Icon Requirements

### Application Icons

- **Windows**: `.ico` format (256x256, 128x128, 64x64, 48x48, 32x32, 16x16)
- **macOS**: `.icns` format (1024x1024 down to 16x16)
- **Linux**: `.png` format (512x512, 256x256, 128x128, 64x64, 32x32, 16x16)

### Extension Icons

- Format: `.png` with transparency
- Sizes: 128x128 (main), 64x64, 32x32
- Style: Consistent with Orion Studio brand

## Branding Guidelines

### Colors

Primary color palette (to be defined):

- Primary: TBD
- Secondary: TBD
- Accent: TBD
- Background: TBD
- Text: TBD

### Logo Usage

The Orion Studio logo represents ORNL neutron imaging capabilities:

- Use provided logo files without modification
- Maintain clear space around the logo
- Don't distort or recolor the logo
- Follow ORNL branding guidelines

### Typography

- UI Font: Segoe UI (Windows), San Francisco (macOS), Ubuntu (Linux)
- Code Font: Cascadia Code, Fira Code, or JetBrains Mono
- Documentation: System default or similar

## File Formats

- **Vector Graphics**: `.svg` (preferred for logos)
- **Raster Graphics**: `.png` with transparency
- **Icons**: Platform-specific formats (`.ico`, `.icns`, `.png`)
- **Themes**: `.json` following VSCode theme schema

## Creating Custom Themes

Orion Studio supports VSCode-compatible color themes:

```json
{
  "name": "Orion Dark",
  "type": "dark",
  "colors": {
    "editor.background": "#1e1e1e",
    "editor.foreground": "#d4d4d4",
    // ... more colors
  },
  "tokenColors": [
    // ... token color definitions
  ]
}
```

Place custom themes in `resources/themes/` directory.

## Marketing Assets

Documentation and marketing images should:

- Be high quality (300 DPI for print)
- Use consistent styling
- Follow brand guidelines
- Be optimized for web when needed

## Contributing Assets

When contributing new resources:

1. Follow the directory structure
2. Use descriptive file names
3. Include source files when possible (e.g., `.sketch`, `.figma`)
4. Document any special requirements
5. Ensure proper licensing

## License

All branding assets are:

- © Oak Ridge National Laboratory (ORNL)
- © Microsoft Corporation (for VSCode-derived assets)
- Subject to trademark restrictions

Third-party assets must include appropriate attribution and licensing information.

## Contact

For branding questions or custom asset requests:

- Design team: [TBD]
- Marketing: [TBD]

---

*This directory will be populated as branding assets are developed.*
