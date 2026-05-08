# Notices and Attributions

AbsoluteHOTAS Configurator is an independent companion app for configuring
AbsoluteHOTAS INI files.

## Third-Party Technology

- Tauri is used for the desktop application shell.
- React is used for the user interface.
- Vite is used for frontend development and bundling.
- The Rust `windows` crate is used for Windows DirectInput and input APIs.
- Microsoft DirectInput and WebView2 are Windows platform technologies used by
  the application at runtime.
- vJoy is the expected virtual joystick device provider. This project does not
  bundle vJoy.

Dependency versions are listed in `package-lock.json` and `src-tauri/Cargo.lock`.

## Trademark Notes

Starfield is a trademark of Bethesda Softworks LLC and/or ZeniMax Media Inc.
This project is not affiliated with, endorsed by, or sponsored by Bethesda,
ZeniMax, Microsoft, Tauri, React, Vite, Microsoft WebView2, or vJoy.

## Artwork

The app icon in `src/assets/absolutehotas-icon.svg` is original project artwork
for this configurator. Generated desktop icon files in `src-tauri/icons` are
derived from that SVG for application packaging.
