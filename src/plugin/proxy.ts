import { ProxyAgent, setGlobalDispatcher } from "undici";
import { createLogger } from "./logger";

const log = createLogger("proxy");

export function configureProxy(): void {
  const proxyUrl =
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    process.env.https_proxy ||
    process.env.http_proxy;

  if (proxyUrl) {
    try {
      const dispatcher = new ProxyAgent(proxyUrl);
      setGlobalDispatcher(dispatcher);
      log.info(`Proxy configured using ${proxyUrl}`);
    } catch (error) {
      log.warn(`Failed to configure proxy: ${error}`);
    }
  }
}
