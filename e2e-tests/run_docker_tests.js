const { spawnSync } = require("child_process");

console.log("Starting KeyVault E2E Docker Compose environment...");

// Run the docker-compose stack.
// --abort-on-container-exit: Exits as soon as any container terminates (which will be e2e-runner once tests finish)
// --exit-code-from e2e-runner: Returns the exit status of the runner to the caller
const composeUp = spawnSync(
  "docker-compose",
  [
    "-f",
    "docker-compose.yml",
    "up",
    "--build",
    "--abort-on-container-exit",
    "--exit-code-from",
    "e2e-runner"
  ],
  { stdio: "inherit", shell: true }
);

const exitCode = composeUp.status === null ? 1 : composeUp.status;

console.log("\nTests complete. Tearing down Docker Compose containers and clearing volumes...");

// Tear down the docker-compose services and purge their ephemeral and anonymous database volumes (-v)
spawnSync(
  "docker-compose",
  [
    "-f",
    "docker-compose.yml",
    "down",
    "-v"
  ],
  { stdio: "inherit", shell: true }
);

console.log(`E2E test run finished. Exit code: ${exitCode}`);
process.exit(exitCode);
