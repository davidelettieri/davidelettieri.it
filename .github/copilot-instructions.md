# GitHub Copilot Instructions

## Package Manager

This project uses **yarn** as the package manager. Always use yarn commands for dependency management:

- Use `yarn install` to install dependencies
- Use `yarn add <package>` to add new dependencies
- Use `yarn remove <package>` to remove dependencies
- Use `yarn start`, `yarn build`, etc. for running scripts

**Do NOT use npm commands** (npm install, npm add, etc.).

## Dependency Management

**Important:** Avoid updating `yarn.lock` unless it is strictly required by the assigned task.

- If the task does not explicitly require adding, removing, or updating dependencies, do not modify `yarn.lock`
- When adding or updating dependencies, ensure the changes are minimal and necessary
- The CI/CD pipeline uses `yarn install --frozen-lockfile` which will fail if yarn.lock is not properly maintained

## Project Information

This is a Docusaurus-based static website. Key commands:

- `yarn start` - Start local development server
- `yarn build` - Build the website for production
- `yarn serve` - Serve the built website locally
