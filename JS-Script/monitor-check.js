const si = require("systeminformation");
const { exec } = require("child_process");

const suspicious = [
  // Microsoft
  "Defender",
  "Microsoft Defender",
  "Sense",
  "MDE",

  // CrowdStrike
  "CrowdStrike",
  "Falcon",

  // SentinelOne
  "SentinelOne",

  // Carbon Black
  "Carbon Black",
  "Cb",

  // Sophos
  "Sophos",

  // Cortex
  "Cortex",

  // Trellix / McAfee
  "McAfee",
  "Trellix",

  // Symantec
  "Symantec",

  // Trend Micro
  "Trend",

  // Tanium
  "Tanium",

  // Cylance
  "Cylance",

  // Cisco
  "Cisco Secure",

  // Remote Monitoring
  "AnyDesk",
  "TeamViewer",
  "ScreenConnect",
  "ConnectWise",
  "Bomgar",
  "BeyondTrust",
  "VNC",
  "UltraViewer",
  "DameWare",

  // Monitoring
  "ActivTrak",
  "Teramind",
  "Hubstaff",
  "Time Doctor",
  "Veriato",
  "Workpuls",
  "DeskTime",

  // VPN
  "GlobalProtect",
  "FortiClient",
  "Zscaler",
  "Netskope",

  // Others
  "Splashtop",
  "LogMeIn",
  "GoTo",
  "Pulse Secure"
];

function containsSuspicious(name) {
  return suspicious.some(s =>
    name.toLowerCase().includes(s.toLowerCase())
  );
}

async function checkProcesses() {
  const procs = await si.processes();

  console.log("\n========== Running Processes ==========\n");

  const matches = procs.list.filter(p =>
    containsSuspicious(p.name) ||
    containsSuspicious(p.command)
  );

  if (!matches.length) {
    console.log("No known monitoring processes found.\n");
  } else {
    matches.forEach(p => {
      console.log(`${p.name}`);
      console.log(`PID : ${p.pid}`);
      console.log(`CPU : ${p.pcpu}%`);
      console.log(`MEM : ${p.pmem}%`);
      console.log(`CMD : ${p.command}`);
      console.log("----------------------------------------");
    });
  }
}

function checkServices() {
  return new Promise(resolve => {
    exec(
      'powershell "Get-Service | Select Name,DisplayName,Status | ConvertTo-Json"',
      (err, stdout) => {
        if (err) {
          console.log("Unable to read Windows services.");
          return resolve();
        }

        try {
          const services = JSON.parse(stdout);

          console.log("\n========== Windows Services ==========\n");

          const matches = services.filter(
            s =>
              containsSuspicious(s.Name) ||
              containsSuspicious(s.DisplayName)
          );

          if (!matches.length) {
            console.log("No known monitoring services found.\n");
          } else {
            matches.forEach(s => {
              console.log(
                `${s.DisplayName} (${s.Name}) - ${s.Status}`
              );
            });
          }
        } catch {}
        resolve();
      }
    );
  });
}

function checkStartup() {
  return new Promise(resolve => {
    exec(
      'powershell "Get-CimInstance Win32_StartupCommand | Select Name,Command | ConvertTo-Json"',
      (err, stdout) => {
        if (err) return resolve();

        try {
          const items = JSON.parse(stdout);

          console.log("\n========== Startup Programs ==========\n");

          const matches = items.filter(
            i =>
              containsSuspicious(i.Name || "") ||
              containsSuspicious(i.Command || "")
          );

          if (!matches.length) {
            console.log("No suspicious startup programs found.\n");
          } else {
            matches.forEach(i => {
              console.log(i.Name);
              console.log(i.Command);
              console.log("--------------------------------");
            });
          }
        } catch {}

        resolve();
      }
    );
  });
}

function checkConnections() {
  return new Promise(resolve => {
    exec("netstat -ano", (err, stdout) => {
      if (err) return resolve();

      console.log("\n========== Remote Desktop Ports ==========\n");

      const ports = [
        "3389",
        "5938",
        "7070",
        "7071",
        "5939"
      ];

      stdout
        .split("\n")
        .filter(line => ports.some(p => line.includes(":" + p)))
        .forEach(line => console.log(line));

      resolve();
    });
  });
}

(async () => {
  console.log("\n========================================");
  console.log(" Corporate Monitoring Detection Report");
  console.log("========================================");

  await checkProcesses();
  await checkServices();
  await checkStartup();
  await checkConnections();

  console.log("\nFinished.");
})();