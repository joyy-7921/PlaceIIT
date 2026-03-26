const https = require('https');
const fs = require('fs');

const payload = JSON.parse(fs.readFileSync('pr_payload.json', 'utf8'));
const token = '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';

const data = JSON.stringify(payload);

const options = {
  hostname: 'api.github.com',
  port: 443,
  path: '/repos/harsha-tumati/PlaceIIT-Base-Repo/pulls',
  method: 'GET',
  headers: {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'PlaceIIT-Update-Bot'
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (d) => body += d);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    fs.writeFileSync('pr_response.json', body);
    console.log("Response saved to pr_response.json");
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.write(data);
req.end();
