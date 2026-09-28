<div align="center">
  <img src="apps/web/public/logo.svg" alt="Orbit logo" width="200">

  <p align="center">
    <img src="https://img.shields.io/badge/Rust-1.97.1-000000?logo=rust&logoColor=white" alt="Rust 1.97.1">
    <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white" alt="TypeScript 6.0">
    <img src="https://img.shields.io/badge/React-19.2-149ECA?logo=react&logoColor=white" alt="React 19.2">
    <img src="https://img.shields.io/badge/Tailwind%20CSS-4.3-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4.3">
    <img src="https://img.shields.io/badge/Vite-8.2-646CFF?logo=vite&logoColor=white" alt="Vite 8.2">
    <img src="https://img.shields.io/badge/Bun-1.3.14-000000?logo=bun&logoColor=white" alt="Bun 1.3.14">
    <img src="https://img.shields.io/badge/Oxlint-1.75-32F3E9" alt="Oxlint 1.75">
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/Axum-0.8-000000" alt="Axum 0.8">
    <img src="https://img.shields.io/badge/SQLx-0.8-000000" alt="SQLx 0.8">
    <img src="https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white" alt="SQLite">
    <img src="https://img.shields.io/badge/TanStack%20Query-5-FF4154?logo=reactquery&logoColor=white" alt="TanStack Query 5">
    <img src="https://img.shields.io/badge/BlockNote-0.55-F2458F" alt="BlockNote 0.55">
    <img src="https://img.shields.io/badge/License-Apache%202.0-D22128" alt="License Apache 2.0">
  </p>

  <p align="center">
    <i>A self-hosted workspace for projects, tasks, documents, mail, and team chat.</i><br>
    Repository <a href="https://github.com/coollabsio/orbit">coollabsio/orbit</a>
  </p>
</div>

---

> PRETTY ALPHA, DO NOT USE IT IN PROD.

Orbit uses a Rust server, a React web client, and SQLite. The production binary
serves both the API and the embedded web application.

## Development

You need Rust 1.97.1, Bun 1.3.14 or later, and [Just](https://just.systems/).

```bash
just setup
just dev
```

Open <http://127.0.0.1:8888>. Run `just test` for the test suites or `just
check` for all project checks.

For deployment and operator instructions, see [docs/operations.md](docs/operations.md).
For GitHub webhook setup and current limits, see [docs/github.md](docs/github.md).
The project is licensed under the [Apache License 2.0](LICENSE).
