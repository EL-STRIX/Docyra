const env = require('./src/config/env');

const config = {
  mongodb: {
    url: env.MONGODB_URI,
    databaseName: env.MONGODB_URI.split('/').pop().split('?')[0] || 'docyra',
    options: {}
  },
  migrationsDir: "migrations",
  changelogCollectionName: "changelog",
  migrationFileExtension: ".js",
  useFileHash: false,
  moduleSystem: 'commonjs',
};

module.exports = config;
