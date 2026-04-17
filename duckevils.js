// aslan yakısmaz kafeste 
const http2 = require("http2");
const tls = require("tls");
const WebSocket = require("ultimate-ws");
const https = require("https");
const os = require("os");
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
os.setPriority(process.pid, -20);
let mfaToken = null;
const token = 'yemınederımsenlegercekben';
const listenerToken = 'saraylarsızınolsun';
const password = '';
const serverID = '';
const ips = ["162.159.128.233", "canary.discord.com", "canary.discord.com"];
const webhookHeaders = {
  ":method": "POST",
  ":path": "/api/webhooks/",
  "Content-Type": "application/json"
};
const guilds = new Map();
const cache = new Map();
const sessionCache = new Map();
const tlsSockets = [];

const sessionSettings = [
  { initialWindowSize: 2147483647, maxConcurrentStreams: 65535, maxHeaderListSize: 65536, maxFrameSize: 16777215, headerTableSize: 65536 },
  { initialWindowSize: 1073741824, maxConcurrentStreams: 20000, maxHeaderListSize: 4096, maxFrameSize: 32768, headerTableSize: 65536 },
  { initialWindowSize: 1073741824, maxConcurrentStreams: 15000, maxHeaderListSize: 3500, maxFrameSize: 32768, headerTableSize: 65536 },
  { initialWindowSize: 524288, maxConcurrentStreams: 25000, maxHeaderListSize: 3500, maxFrameSize: 32768, headerTableSize: 32768 },
];

function cacheRequest(code) {
  const payload = `{"code":"${code}"}`;

  const tlsBuffer = Buffer.from(
    `PATCH /api/v9/guilds/${serverID}/vanity-url HTTP/1.1\r\n` +
    `Host: canary.discord.com\r\n` +
    `Authorization: ${token}\r\n` +
    `Content-Type: application/json\r\n` +
    `User-Agent: 0\r\n` +
    `X-Super-Properties: eyJvcyI6IiIsImJyb3dzZXIiOiIiLCJicm93c2VyX3VzZXJfYWdlbnQiOiIifQ==\r\n` +
    `X-Discord-Mfa-Authorization: ${mfaToken}\r\n` +
    `Content-Length: ${Buffer.byteLength(payload)}\r\n\r\n` +
    payload
  );

  cache.set(code, {
    tlsBuffer,
    http2Headers: {
      ":method": "PATCH",
      ":path": `/api/v9/guilds/${serverID}/vanity-url`,
      Authorization: token,
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36", // duckevils 
      "X-Super-Properties": "eyJvcyI6IldpbmRvd3MiLCJicm93c2VyIjoiQ2hyb21lIiwiZGV2aWNlIjoiIiwic3lzdGVtX2xvY2FsZSI6ImVuLVVTIiwiYnJvd3Nlcl91c2VyX2FnZW50IjoiTW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzEzMS4wLjAuMCBTYWZhcmkvNTM3LjM2IiwiYnJvd3Nlcl92ZXJzaW9uIjoiMTMxLjAuMC4wIiwib3NfdmVyc2lvbiI6IjEwIiwicmVmZXJyZXIiOiIiLCJyZWZlcnJpbmdfZG9tYWluIjoiIiwicmVmZXJyZXJfY3VycmVudCI6IiIsInJlZmVycmluZ19kb21haW5fY3VycmVudCI6IiIsInJlbGVhc2VfY2hhbm5lbCI6InN0YWJsZSIsImNsaWVudF9idWlsZF9udW1iZXIiOjM3MzI4MSwiY2xpZW50X2V2ZW50X3NvdXJjZSI6bnVsbH0=",
      "X-Discord-Mfa-Authorization": mfaToken
    },
    payload
  });
}

function createTlsSocket(ip) {
  const socket = tls.connect({
    host: ip,
    port: 443,
    servername: 'canary.discord.com',
    minVersion: 'TLSv1.2',
    maxVersion: 'TLSv1.3',
    rejectUnauthorized: false,
    checkServerIdentity: () => undefined,
    session: sessionCache.get(ip),
    noDelay: true,
    
  });
  socket.writableHighWaterMark = 1024 * 1024;
  socket.setNoDelay(true);
  socket.setKeepAlive(true, 10000);
  socket.setMaxListeners(0);
  
  const reconnect = () => setTimeout(() => createTlsSocket(ip), 1500);
  socket.on('error', reconnect);
  socket.on('close', reconnect);
  socket.on('session', s => sessionCache.set(ip, s));
  
  tlsSockets.push(socket);
  return socket;
}

const sessionPool = sessionSettings.map(settings => 
  http2.connect("https://canary.discord.com", {
    settings: { enablePush: false, ...settings },
    createConnection: () => {
      const sock = tls.connect({
        host: "canary.discord.com",
        port: 443,
        servername: "canary.discord.com",
        minVersion: 'TLSv1.2',
        maxVersion: 'TLSv1.3',
        ALPNProtocols: ['h2'],
        rejectUnauthorized: false,
        noDelay: true
      });
      sock.setNoDelay(true);
      sock.setKeepAlive(true, 0);
      return sock;
    },
    ALPNProtocols: ["h2"],
  })
);

sessionPool.forEach((session, idx) => {
  session.on("error", () => process.exit());
  session.on("close", () => process.exit());
  session.once("connect", () => console.log(`[HTTP2] ${idx}`));
});

sessionPool[0].once("connect", () => {
  ips.forEach(ip => createTlsSocket(ip));
  handleMFA();
  setInterval(handleMFA, 5 * 60 * 1000); 
setInterval(() => {
  for (const s of sessionPool) {
    if (!s.destroyed) {
      s.request({ 
        ":method": "OPTIONS", 
        ":path": "*" 
      }, { endStream: true }).end();
    }
  }
}, 25000); 
  setInterval(() => {
    for (const s of sessionPool) {
      if (!s.destroyed) s.ping(() => {});
    }
  }, 600000);
setInterval(() => {
      const req = sessionPool[0].request({
        ":method": "PATCH",
        ":path": `/api/v9/guilds/${serverID}/vanity-url`,
        "authorization": token,
        "content-type": "application/json",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "x-super-properties": "eyJvcyI6IldpbmRvd3MiLCJicm93c2VyIjoiQ2hyb21lIiwiZGV2aWNlIjoiIiwic3lzdGVtX2xvY2FsZSI6ImVuLVVTIiwiYnJvd3Nlcl91c2VyX2FnZW50IjoiTW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzEzMS4wLjAuMCBTYWZhcmkvNTM3LjM2IiwiYnJvd3Nlcl92ZXJzaW9uIjoiMTMxLjAuMC4wIiwib3NfdmVyc2lvbiI6IjEwIiwicmVmZXJyZXIiOiIiLCJyZWZlcnJpbmdfZG9tYWluIjoiIiwicmVmZXJyZXJfY3VycmVudCI6IiIsInJlZmVycmluZ19kb21haW5fY3VycmVudCI6IiIsInJlbGVhc2VfY2hhbm5lbCI6InN0YWJsZSIsImNsaWVudF9idWlsZF9udW1iZXIiOjM3MzI4MSwiY2xpZW50X2V2ZW50X3NvdXJjZSI6bnVsbH0=",
        "x-discord-mfa-authorization": mfaToken,
      });

      let data = '';
      req.on('response', (headers) => {
        req.on('data', chunk => data += chunk);
        req.on('end', () => {
          console.log(`[${headers[':status']}] ${data}`);
          try {
            const res = JSON.parse(data);
            console.log(res.code || res.message || res);
          } catch (e) {}
        });
      });
      req.on('error', (err) => console.error(err.message));
      req.end('{"code":"atatv44"}');
    }
  );
  }, 15 * 60 * 1000);

const heartbeat = JSON.stringify({ op: 1, d: null });

for (let i = 1; i <= 2; i++) {
  sessionPool[i].once("connect", () => {
    const ws = new WebSocket(`wss://gateway-us-east1-b.discord.gg/?v=${i === 1 ? 9 : 10}&encoding=json`, {
      perMessageDeflate: false,
      skipUTF8Validation: true,
      handshakeTimeout: 150,
      family: 4,
      rejectUnauthorized: false
    });
    
    let interval;
    
    ws.onopen = () => {
      ws._socket.setNoDelay(true);
      ws._socket.setKeepAlive(true, 10000);
      ws.send(JSON.stringify({
        op: 2,
        d: {
          token: listenerToken,
          intents: 1,
          properties: { os: "linux", browser: "Discord Client", device: "Desktop" },
          compress: false,
          large_threshold: 0
        }
      }));
      interval = setInterval(() => {
        if (ws.readyState === 1) ws.send(heartbeat);
      }, 41250);
    };
    
    ws.onclose = () => {
      clearInterval(interval);
      process.exit();
    };
    
    ws.onerror = () => ws.close();

    ws.onmessage = ({ data }) => {
    const msg = JSON.parse(data);

      if (msg.t === "GUILD_UPDATE") {
        const vanity = guilds.get(msg.d.id);
        if (vanity && vanity !== msg.d.vanity_url_code) {
        const zaferallahinyanindaolanindir = cache.get(vanity);
            for (let i = 0; i < tlsSockets.length; i++) {tlsSockets[i].write(zaferallahinyanindaolanindir.tlsBuffer);}
            for (let i = 0; i < sessionPool.length; i++) {sessionPool[i].request(zaferallahinyanindaolanindir.http2Headers).end(zaferallahinyanindaolanindir.payload);}
          setImmediate(() => sessionPool[0].request(webhookHeaders).end(`{"content":"@everyone allah peygamber kitap ${vanity}"}`));
        }
      } else if (msg.t === "READY") {
        guilds.clear();
        cache.clear();
        for (const { id, vanity_url_code } of msg.d.guilds) {
          if (vanity_url_code) {
            guilds.set(id, vanity_url_code);
            cacheRequest(vanity_url_code);
          }
        }
        console.log(`(${guilds.size}): ${[...guilds.values()].join(", ")}`);
      }
    };
  });
}
async function handleMFA() {
  try {
    const ticket = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: "canary.discord.com",
        port: 443,
        path: "/api/v10/guilds/0/vanity-url",
        method: "PATCH",
        headers: {
          Authorization: token,
          "Content-Type": "application/json"
        },
        timeout: 1000,
        agent: new https.Agent({
          ciphers: ["TLS_AES_256_GCM_SHA384", "TLS_CHACHA20_POLY1305_SHA256", "TLS_AES_128_GCM_SHA256"].join(":"),
          honorCipherOrder: true,
          rejectUnauthorized: true
        })
      }, res => {
        let data = '';
        res.on("data", chunk => data += chunk);
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data || "{}");
            resolve(parsed?.mfa?.ticket);
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on("error", reject);
      req.end('{"code":""}');
    });
    if (!ticket) {
      setTimeout(handleMFA, 60000);
      return;
    }
    const mfaTokenResult = await new Promise((resolve, reject) => {
      const mfaReq = https.request({
        hostname: "canary.discord.com",
        port: 443,
        path: "/api/v10/mfa/finish",
        method: "POST",
        headers: {
          Authorization: token,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord-canary/1.0.697 Chrome/134.0.6998.205 Electron/35.3.0 Safari/537.36",
          "Content-Type": "application/json",
          "X-Super-Properties": "eyJvcyI6IldpbmRvd3MiLCJicm93c2VyIjoiRGlzY29yZCBDbGllbnQiLCJyZWxlYXNlX2NoYW5uZWwiOiJjYW5hcnkiLCJjbGllbnRfdmVyc2lvbiI6IjEuMC42OTciLCJvc192ZXJzaW9uIjoiMTAuMC4xOTA0NSIsIm9zX2FyY2giOiJ4NjQiLCJhcHBfYXJjaCI6Ing2NCIsInN5c3RlbV9sb2NhbGUiOiJ0ciIsImhhc19jbGllbnRfbW9kcyI6ZmFsc2UsImNsaWVudF9sYXVuY2hfaWQiOiJjZjE1NzZhNC01NDEyLTRkOWQtYjY5Ny00OGJkZWY5MjE4NDQiLCJicm93c2VyX3VzZXJfYWdlbnQiOiJNb3ppbGxhLzUuMCAoV2luZG93cyBOVCAxMC4wOyBXaW42NDsgeDY0KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBkaXNjb3JkLWNhbmFyeS8xLjAuNjk3IENocm9tZS8xMzQuMC42OTk4LjIwNSBFbGVjdHJvbi8zNS4zLjAgU2FmYXJpLzUzNy4zNiIsImJyb3dzZXJfdmVyc2lvbiI6IjM1LjMuMCIsIm9zX3Nka192ZXJzaW9uIjoiMTkwNDUiLCJjbGllbnRfYnVpbGRfbnVtYmVyIjo0MzI3MTMsIm5hdGl2ZV9idWlsZF9udW1iZXIiOjY3Njg1LCJjbGllbnRfZXZlbnRfc291cmNlIjpudWxsLCJsYXVuY2hfc2lnbmF0dXJlIjoiNGIyODRiMDMtODc3ZC00NzEyLThkNmEtYWUyY2ZlNTEwMzk1IiwiY2xpZW50X2hlYXJ0YmVhdF9zZXNzaW9uX2lkIjoiM2E1YThkZGMtYWFkMy00NjlhLTliYWYtYjZlNzc5N2UxOGEwIiwiY2xpZW50X2FwcF9zdGF0ZSI6ImZvY3VzZWQifQ=="
        },
        timeout: 1000,
        agent: new https.Agent({
          ciphers: ["TLS_AES_256_GCM_SHA384", "TLS_CHACHA20_POLY1305_SHA256", "TLS_AES_128_GCM_SHA256"].join(":"),
          honorCipherOrder: true,
          rejectUnauthorized: true
        })
      }, mfaRes => {
        let data = '';
        mfaRes.on("data", chunk => data += chunk);
        mfaRes.on("end", () => {
          try {
            resolve(JSON.parse(data || "{}"));
          } catch (e) {
            reject(e);
          }
        });
      });
      mfaReq.on("error", reject);
      mfaReq.end(`{"ticket":"${ticket}","mfa_type":"password","data":"${password}"}`);
    });
    if (mfaTokenResult?.token) {
  mfaToken = mfaTokenResult.token;
  console.log("[MFA] OK");
  
  for (const vanity of guilds.values()) {
    cacheRequest(vanity);
  }
}else if (mfaTokenResult?.code === 60008) {
  console.log("[MFA] Rate limited");
      setTimeout(handleMFA, 60000);
    } else {
      console.log("[MFA] Failed to obtain MFA token response:", mfaTokenResult);
      setTimeout(handleMFA, 60000);
    }
  } catch (e) {
    setTimeout(handleMFA, 60000);
  }
}

const keepAliveBuffer = Buffer.from("GET / HTTP/1.1\r\nHost: canary.discord.com\r\n\r\n");
setInterval(() => {
  tlsSockets.forEach(sock => {
    if (!sock.destroyed) sock.write(keepAliveBuffer);
  });
}, 10000);
setTimeout(() => process.exit(0), 30 * 60 * 1000); 


// bır gun herseyden ve herkesten 
// @duck.mjs
