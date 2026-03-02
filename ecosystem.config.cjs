module.exports = {
  apps: [
    {
      name: "circycle",
      cwd: "/var/www/circycle",
      script: "npm",
      args: "run start -- --port 3000",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};
