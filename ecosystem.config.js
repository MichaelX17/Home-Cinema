module.exports = {
  apps: [
    {
      name: "movies-app",
      script: "/home/miguel/Desktop/Local-Apps/Home-Cinema/start-app.sh",
      interpreter: "/bin/bash",
      cwd: "/home/miguel/Desktop/Local-Apps/Home-Cinema",
      env: {
        PORT: 3000,
        SKIP_UPLOAD_SERVER: "true",
      },
    },
    {
      name: "movies-upload",
      script: "upload-server.js",
      interpreter: "node",
      cwd: "/home/miguel/Desktop/Local-Apps/Home-Cinema",
      env: {
        PORT: 4000,
        HOST: "0.0.0.0",
      },
    },
    {
      name: "files-app",
      script: "/home/miguel/Desktop/Local-Apps/LANshare/start-app.sh",
      interpreter: "/bin/bash",
      cwd: "/home/miguel/Desktop/Local-Apps/LANshare",
      env: {
        PORT: 3001,
      },
    },
  ],
};
