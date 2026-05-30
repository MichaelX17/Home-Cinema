module.exports = {
  apps: [
    {
      name: "movies-app",
      script: "pnpm",
      args: "run start",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "movies-upload",
      script: "node",
      args: "upload-server.js",
      cwd: __dirname,
      env: {
        PORT: 4000,
        HOST: "0.0.0.0",
      },
    },
  ],
};
