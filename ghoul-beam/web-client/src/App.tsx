import { Bot, ScrollText, Wand2, Wifi, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { mmbClient } from "./lib/mmb-client";

function isHostLocal(host: string) {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.startsWith("::1") ||
    host.startsWith("192.168") ||
    host.startsWith("10.") ||
    host.startsWith("172.")
  );
}

function ConfigureProxiesAndAgentsView() {
  const [loadingConfiguration, setLoadingConfiguration] = useState(false);
  const [configuration, setConfiguration] = useState<string[]>([]);

  async function retrieveConfiguration(): Promise<string[]> {
    const cfg = await mmbClient.getConfiguration();
    return [cfg.proxies, cfg.uas];
  }

  useEffect(() => {
    if (!loadingConfiguration) {
      setLoadingConfiguration(true);
      retrieveConfiguration().then((config) => {
        setLoadingConfiguration(false);
        setConfiguration(config);
      });
    }
  }, []);

  function saveConfiguration() {
    mmbClient.setConfiguration(configuration[0], configuration[1]).then(() => {
      alert("Saved");
      window.location.reload();
    });
  }

  return (
    <div className="fixed grid p-8 mx-auto -translate-x-1/2 -translate-y-1/2 bg-gray-950 border border-red-900 rounded-md shadow-lg shadow-red-900/30 max-w-7xl place-items-center left-1/2 top-1/2">
      {loadingConfiguration ? (
        <div className="flex flex-col items-center justify-center space-y-2 text-red-400">
          <div className="ghoul-eye-sm"></div>
          <p className="text-red-400">Loading proxies.txt and uas.txt...</p>
        </div>
      ) : (
        <div className="w-[56rem] flex flex-col">
          <p className="pl-1 mb-1 italic text-red-400">proxies.txt</p>
          <textarea
            value={configuration[0]}
            className="w-full h-40 p-2 bg-gray-900 text-red-200 border border-red-900/50 rounded-sm resize-none focus:border-red-600 focus:outline-none"
            onChange={(e) =>
              setConfiguration([e.target.value, configuration[1]])
            }
            placeholder="socks5://0.0.0.0&#10;socks4://user:pass@0.0.0.0:12345"
          ></textarea>
          <p className="pl-1 mt-2 mb-1 italic text-red-400">uas.txt</p>
          <textarea
            value={configuration[1]}
            className="w-full h-40 p-2 bg-gray-900 text-red-200 border border-red-900/50 rounded-sm resize-none focus:border-red-600 focus:outline-none"
            onChange={(e) =>
              setConfiguration([configuration[0], e.target.value])
            }
            placeholder="Mozilla/5.0 (Linux; Android 10; K)..."
          ></textarea>
          <button
            onClick={saveConfiguration}
            className="p-4 mt-4 text-white bg-red-900 rounded-md hover:bg-red-800"
          >
            Write Changes
          </button>
        </div>
      )}
    </div>
  );
}

function App() {
  const [isAttacking, setIsAttacking] = useState(false);
  const [actuallyAttacking, setActuallyAttacking] = useState(false);
  const [animState, setAnimState] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [target, setTarget] = useState("");
  const [attackMethod, setAttackMethod] = useState("http_flood");
  const [packetSize, setPacketSize] = useState(64);
  const [duration, setDuration] = useState(60);
  const [packetDelay, setPacketDelay] = useState(100);
  const [stats, setStats] = useState({ pps: 0, bots: 0, totalPackets: 0 });
  const [lastUpdatedPPS, setLastUpdatedPPS] = useState(Date.now());
  const [lastTotalPackets, setLastTotalPackets] = useState(0);
  const [currentTask, setCurrentTask] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [audioVol, setAudioVol] = useState(100);
  const [openedConfig, setOpenedConfig] = useState(false);
  const [socketState, setSocketState] = useState<'disconnected' | 'connecting' | 'connected'>("connecting");
  const [lastSocketError, setLastSocketError] = useState<string>("");

  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;
      const handler = () => {
        if (audio.paused) return;

        if (animState !== 2 && audio.currentTime > 5.24 && audio.currentTime < 9.4) {
          setAnimState(2);
        }
        if (audio.currentTime > 17.53) {
          audio.currentTime = 15.86;
        }
      };

      audio.addEventListener("timeupdate", handler);
      return () => {
        audio.removeEventListener("timeupdate", handler);
      };
    }
  }, [audioRef]);

  useEffect(() => {
    if (!isAttacking) {
      setActuallyAttacking(false);
      setAnimState(0);

      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }

      if (currentTask) {
        clearTimeout(currentTask);
      }
    }
  }, [isAttacking, currentTask]);

  useEffect(() => {
    const now = Date.now();
    if (now - lastUpdatedPPS >= 500) {
      setLastUpdatedPPS(now);
      setStats((old) => ({
        pps: (old.totalPackets - lastTotalPackets) / (now - lastUpdatedPPS),
        bots: old.bots,
        totalPackets: old.totalPackets,
      }));
      setLastTotalPackets(stats.totalPackets);
    }
  }, [lastUpdatedPPS, lastTotalPackets, stats.totalPackets]);

  useEffect(() => {
    setSocketState("connecting");
    mmbClient.onConnect(() => { setSocketState("connected"); setLastSocketError(""); });
    mmbClient.onConnectError((e) => { setSocketState("disconnected"); setLastSocketError(String(e?.message || e)); });
    mmbClient.onDisconnect((r) => { setSocketState("disconnected"); setLastSocketError(String(r || "")); });

    mmbClient.onStats((data) => {
      setStats((old) => ({
        pps: data.pps || old.pps,
        bots: (data as any).bots || (data as any).proxies || old.bots,
        totalPackets: data.totalPackets || old.totalPackets,
      }));
      if (data.log) addLog(data.log);
      setProgress((prev) => (prev + 10) % 100);
    });

    mmbClient.onAttackEnd(() => {
      setIsAttacking(false);
    });

    mmbClient.onAttackAccepted((info) => {
      addLog(`✅ Attack accepted (proxies=${info?.proxies ?? 0})`);
    });
    mmbClient.onAttackError((info) => {
      addLog(`❌ Attack error: ${info?.message || ''}`);
      setIsAttacking(false);
    });

    return () => {
      mmbClient.offAll();
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = audioVol / 100;
    }
  }, [audioVol]);

  const addLog = (message: string) => {
    setLogs((prev) => [message, ...prev].slice(0, 12));
  };

  const startAttack = (isQuick?: boolean) => {
    if (!target.trim()) {
      alert("Please enter a target!");
      return;
    }

    setIsAttacking(true);
    setStats((old) => ({ pps: 0, bots: old.bots, totalPackets: 0 }));
    addLog("🩸 Preparing kagune...");

    if (audioRef.current) {
      audioRef.current.currentTime = isQuick ? 9.5 : 0;
      audioRef.current.volume = audioVol / 100;
      audioRef.current.play();
    }

    if (!isQuick) setAnimState(1);

    const timeout = setTimeout(() => {
      setActuallyAttacking(true);
      setAnimState(3);
      mmbClient.startAttack({ target, packetSize, duration, packetDelay, attackMethod });
    }, isQuick ? 700 : 10250);
    setCurrentTask(timeout);
  };

  const stopAttack = () => {
    mmbClient.stopAttack();
    setIsAttacking(false);
  };

  return (
    <div className={`w-screen h-screen bg-gradient-to-br from-gray-950 to-red-950/30 p-8 overflow-y-auto ${animState === 2 ? "background-pulse" : ""} ${actuallyAttacking ? "shake" : ""}`}>
      <audio ref={audioRef} src="/audio.mp3" />

      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="mb-2 text-4xl font-bold text-red-600 tracking-widest uppercase drop-shadow-[0_0_12px_rgba(220,38,38,0.8)]">
            Ghoul Beam
          </h1>
          <div className="flex items-center justify-center gap-2 text-sm mb-2">
            {socketState === 'connected' && (<span className="px-2 py-0.5 rounded bg-green-800 text-green-300">connected</span>)}
            {socketState === 'connecting' && (<span className="px-2 py-0.5 rounded bg-yellow-900 text-yellow-300">connecting...</span>)}
            {socketState === 'disconnected' && (<span className="px-2 py-0.5 rounded bg-red-900 text-red-300">disconnected {lastSocketError ? `(${lastSocketError})` : ''}</span>)}
          </div>
          <p className="text-red-400/80 text-sm italic">
            In the world of ghouls, even networks fear Kaneki's wrath.
          </p>
        </div>

        {/* Main Card */}
        <div className="relative p-6 overflow-hidden rounded-lg shadow-xl shadow-red-900/30 bg-gray-950 border border-red-900/40">

          {/* Ghoul Eye Animation */}
          <div className="flex justify-center items-center w-full h-48 mb-6">
            <div className={`ghoul-eye-container ${isAttacking ? "ghoul-eye-active" : ""}`}>
              <div className="ghoul-eye-outer">
                <div className="ghoul-eye-inner">
                  <div className="ghoul-eye-iris">
                    <div className="ghoul-eye-pupil"></div>
                  </div>
                </div>
              </div>
              <div className="ghoul-cracks"></div>
            </div>
          </div>

          {/* Attack Configuration */}
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="Enter target URL or IP"
                className="text-red-100 px-4 py-2 bg-gray-900 border border-red-900/60 rounded-lg outline-none focus:border-red-600 focus:ring-2 focus:ring-red-900/50 placeholder-red-900"
                disabled={isAttacking}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => (isAttacking ? stopAttack() : startAttack())}
                  className={`
                  px-8 py-2 rounded-lg font-semibold text-white transition-all w-full
                  ${isAttacking
                      ? "bg-gray-700 hover:bg-gray-600"
                      : "bg-red-700 hover:bg-red-600"
                    }
                  flex items-center justify-center gap-2
                `}
                >
                  <Wand2 className="w-5 h-5" />
                  {isAttacking ? "Stop Beam" : "Start Ghoul Beam"}
                </button>
                <button
                  onClick={() =>
                    isAttacking ? stopAttack() : startAttack(true)
                  }
                  className={`
                  px-2 py-2 rounded-lg font-semibold text-white transition-all
                  ${isAttacking
                      ? "bg-gray-600 hover:bg-gray-500"
                      : "bg-red-900 hover:bg-red-800"
                    }
                  flex items-center justify-center gap-2
                `}
                >
                  <Zap className="w-5 h-5" />
                </button>
                <button
                  className="px-2 py-2 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700"
                  onClick={() => setOpenedConfig(true)}
                >
                  <ScrollText className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-red-400">
                  Attack Method
                </label>
                <select
                  value={attackMethod}
                  onChange={(e) => setAttackMethod(e.target.value)}
                  className="text-red-100 bg-gray-900 w-full px-4 py-2 border border-red-900/60 rounded-lg outline-none focus:border-red-600 focus:ring-2 focus:ring-red-900/50"
                  disabled={isAttacking}
                >
                  <option value="http_flood">HTTP/Flood</option>
                  <option value="http_bypass">HTTP/Bypass</option>
                  <option value="http_slowloris">HTTP/Slowloris</option>
                  <option value="tcp_flood">TCP/Flood</option>
                  <option value="minecraft_ping">Minecraft/Ping</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-red-400">
                  Packet Size (kb)
                </label>
                <input
                  type="number"
                  value={packetSize}
                  onChange={(e) => setPacketSize(Number(e.target.value))}
                  className="text-red-100 bg-gray-900 w-full px-4 py-2 border border-red-900/60 rounded-lg outline-none focus:border-red-600 focus:ring-2 focus:ring-red-900/50"
                  disabled={isAttacking}
                  min="1"
                  max="1500"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-red-400">
                  Duration (seconds)
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="text-red-100 bg-gray-900 w-full px-4 py-2 border border-red-900/60 rounded-lg outline-none focus:border-red-600 focus:ring-2 focus:ring-red-900/50"
                  disabled={isAttacking}
                  min="1"
                  max="300"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-red-400">
                  Packet Delay (ms)
                </label>
                <input
                  type="number"
                  value={packetDelay}
                  onChange={(e) => setPacketDelay(Number(e.target.value))}
                  className="text-red-100 bg-gray-900 w-full px-4 py-2 border border-red-900/60 rounded-lg outline-none focus:border-red-600 focus:ring-2 focus:ring-red-900/50"
                  disabled={isAttacking}
                  min="1"
                  max="1000"
                />
              </div>
            </div>
          </div>

          {/* Stats Widgets */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-gradient-to-br from-red-900/20 to-gray-900/20 border border-red-900/30">
              <div className="flex items-center gap-2 mb-2 text-red-500">
                <Zap className="w-4 h-4" />
                <span className="font-semibold">Packets/sec</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {stats.pps.toLocaleString()}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-red-900/20 to-gray-900/20 border border-red-900/30">
              <div className="flex items-center gap-2 mb-2 text-red-500">
                <Bot className="w-4 h-4" />
                <span className="font-semibold">Active Ghouls</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {stats.bots.toLocaleString()}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-red-900/20 to-gray-900/20 border border-red-900/30">
              <div className="flex items-center gap-2 mb-2 text-red-500">
                <Wifi className="w-4 h-4" />
                <span className="font-semibold">Total Packets</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {stats.totalPackets.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-4 mb-6 overflow-hidden bg-gray-900 rounded-full border border-red-900/30">
            <div
              className="h-full transition-all duration-500 bg-gradient-to-r from-red-900 to-red-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Logs Section */}
          <div className="p-4 font-mono text-sm bg-black rounded-lg border border-red-900/30">
            <div className="text-red-400">
              {logs.map((log, index) => (
                <div key={index} className="py-1">
                  {`> ${log}`}
                </div>
              ))}
              {logs.length === 0 && (
                <div className="italic text-red-900">
                  {">"} Waiting for the Ghoul's awakening...
                </div>
              )}
            </div>
          </div>

          {/* Attack Overlay */}
          {isAttacking && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-r from-red-900/10 to-red-700/10 animate-pulse" />
              <div className="absolute top-0 -translate-x-1/2 left-1/2">
                <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce" />
              </div>
            </div>
          )}
        </div>

        {openedConfig ? <ConfigureProxiesAndAgentsView /> : undefined}

        <div className="flex flex-col items-center">
          <span className="text-sm text-center text-red-900">
            🩸 v1.0 made by{" "}
            <a
              href="https://github.com/sammwyy/mikumikubeam"
              target="_blank"
              rel="noreferrer"
              className="text-red-600 hover:text-red-400"
            >
              @Sammwy
            </a>{" "}
            — Tokyo Ghoul Theme 🩸
          </span>
          <span>
            <input
              className="shadow-sm volume_bar focus:border-red-600"
              type="range"
              min="0"
              max="100"
              step="5"
              draggable="false"
              value={audioVol}
              onChange={(e) => setAudioVol(parseInt(e.target?.value))}
            />
          </span>
        </div>
      </div>
    </div>
  );
}

export default App;
