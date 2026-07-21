module.exports = {
  default: "--require-module ts-node/register --require steps/**/*.ts --format json:reports/json/cucumber_report.json features/**/*.feature"
};
