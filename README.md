# BetterJira! (beta)

<img width="1294" height="894" alt="image" src="https://github.com/user-attachments/assets/76781ca7-ea70-4170-8109-a0e5b858e077" />

This is a wrapper for Jira that behaves better than JIRA and looks like.. another ... app.. with better designers. 

## Download

Latest release, straight to the installer for your system:

- [macOS (Apple Silicon)](https://github.com/fazulk/better-jira/releases/latest/download/BetterJira-mac-arm64.dmg)
- [Linux (x86_64 AppImage)](https://github.com/fazulk/better-jira/releases/latest/download/BetterJira-linux-x86_64.AppImage)
- [Windows (x64 installer)](https://github.com/fazulk/better-jira/releases/latest/download/BetterJira-win-x64.exe)

All releases: [github.com/fazulk/better-jira/releases](https://github.com/fazulk/better-jira/releases)


## Development

Install Bun (if you don't have it): [bun.sh/docs/installation](https://bun.sh/docs/installation)

```bash
bun install
```

```bash
bun dev
```

### UI conventions

Components and routes use Vue TSX: named `defineComponent` exports with `setup()` returning a render function. Read refs inside the render function, keep props reactive, and use Vue JSX `v-model` for native inputs so composition events retain Vue semantics.

Use module-level StyleX definitions and `stylex.attrs()` for styling. Shared tokens live in `src/styles/tokens.stylex.ts`; components that accept parent overrides expose a typed `xstyle` prop. Presentation helpers return semantic variants rather than CSS classes. Keep plain CSS limited to browser defaults and namespaced Markdown/TipTap content.

For dynamic camel-case properties, use a default condition, such as `gridTemplateColumns: { default: columns }`. This avoids mixed-case generated CSS variables that the current `stylex.attrs()` serializer would rename. `check:styles` rejects unsafe generated variables.

The Nuxt and Vitest configurations share `stylex.config.ts`. The client plugin loads the development CSS/HMR entry. To validate without starting a server or producing a build:

```bash
bun run typecheck
bun run check:styles
bun run test
bun run lint
```

`check:styles` compiles StyleX definitions only; it does not verify production CSS extraction or desktop packaging.

### Build for your OS

Install for your system below. Packaged artifacts are written to `release/` unless noted otherwise.

### macOS

Build an unpacked macOS app directory in `dist/`:

```bash
bun run app:build
```

Build a macOS DMG for your current architecture:

```bash
bun run dist:desktop:dmg
```

For architecture-specific DMG builds:

```bash
bun run dist:desktop:dmg:arm64
bun run dist:desktop:dmg:x64
```

### Linux


```bash
bun run dist:desktop:linux
```

### Windows

Build a Windows desktop artifact:

```powershell
bun run dist:desktop:win
```

For architecture-specific builds:

```powershell
bun run dist:desktop:win:x64
bun run dist:desktop:win:arm64
```
