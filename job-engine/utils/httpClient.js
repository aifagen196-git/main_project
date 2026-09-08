import axios from "axios";

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Connection: "keep-alive",
};

const httpClient = axios.create({
  timeout: 30000,
  headers: DEFAULT_HEADERS,
  maxRedirects: 5,
});

// Request Logger
httpClient.interceptors.request.use((config) => {
  config.metadata = {
    startTime: Date.now(),
  };

  console.log(`🌐 ${config.method.toUpperCase()} ${config.url}`);

  return config;
});

// Response Logger
httpClient.interceptors.response.use(
  (response) => {
    const time = Date.now() - response.config.metadata.startTime;

    console.log(`✅ ${response.status} (${time} ms)`);

    return response;
  },

  (error) => {
    if (error.config?.metadata) {
      const time = Date.now() - error.config.metadata.startTime;

      console.log(`❌ ${error.response?.status || "NETWORK"} (${time} ms)`);
    }

    return Promise.reject(error);
  },
);

export default httpClient;
