import net from "node:net";

export const DEV_PORT = 3000;

export function isPortOpen(port = DEV_PORT, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host });
    const finish = (open) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(350);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

export function appOrigin(env = process.env) {
  if (
    env.CODESPACES &&
    env.CODESPACE_NAME &&
    env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
  ) {
    return `https://${env.CODESPACE_NAME}-${DEV_PORT}.${env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`;
  }
  return env.APP_ORIGIN || `http://localhost:${DEV_PORT}`;
}
