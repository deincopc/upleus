import * as net from "net";

export interface TcpCheckResult {
  isUp: boolean;
  responseTime: number | null;
  error: string | null;
}

export async function checkTcp(host: string, port: number): Promise<TcpCheckResult> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();

    socket.setTimeout(10000);

    socket.connect(port, host, () => {
      const responseTime = Date.now() - start;
      socket.destroy();
      resolve({ isUp: true, responseTime, error: null });
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve({ isUp: false, responseTime: null, error: "Connection timed out" });
    });

    socket.on("error", (err) => {
      resolve({ isUp: false, responseTime: null, error: err.message });
    });
  });
}
