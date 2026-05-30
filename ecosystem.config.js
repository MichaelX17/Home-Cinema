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
