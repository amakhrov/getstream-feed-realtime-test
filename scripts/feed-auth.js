const config = require("../getstream-config.json");
const { connect } = require("getstream");
const apiSecret = process.env.STREAM_API_SECRET;

if (!apiSecret) {
  console.log("Error; STREAM_API_SECRET env variable must be defined");
  console.log("Example usage: STREAM_API_SECRET=foobar yarn start");
  process.exit(1);
}

const client = connect(config.apiKey, apiSecret, config.appId, {
  expireTokens: true,
});
const accessToken = client.getReadWriteToken(config.feedGroup, config.feedId);
config.accessToken = accessToken;

require("fs").writeFileSync(
  require("path").resolve(__dirname, "../getstream-config.json"),
  JSON.stringify(config, undefined, 2)
);
