import sodium from "libsodium-wrappers";

const TOKEN = process.env.GH_TOKEN;
const OWNER = "jaewonhyeon9-ctrl";
const REPO = "aftermind-checkmate";
const NAME = process.env.SECRET_NAME;
const VALUE = process.env.SECRET_VALUE;

if (!TOKEN || !NAME || !VALUE) {
  console.error("Need GH_TOKEN, SECRET_NAME, SECRET_VALUE env vars");
  process.exit(1);
}

const headers = {
  Authorization: `token ${TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "set-gh-secret",
};

await sodium.ready;

// 1. Public key 받기
const keyRes = await fetch(
  `https://api.github.com/repos/${OWNER}/${REPO}/actions/secrets/public-key`,
  { headers }
);
if (!keyRes.ok) {
  console.error("public-key failed:", keyRes.status, await keyRes.text());
  process.exit(1);
}
const { key, key_id } = await keyRes.json();

// 2. 암호화 (sealed box)
const messageBytes = sodium.from_string(VALUE);
const keyBytes = sodium.from_base64(key, sodium.base64_variants.ORIGINAL);
const encryptedBytes = sodium.crypto_box_seal(messageBytes, keyBytes);
const encrypted_value = sodium.to_base64(encryptedBytes, sodium.base64_variants.ORIGINAL);

// 3. PUT secret
const putRes = await fetch(
  `https://api.github.com/repos/${OWNER}/${REPO}/actions/secrets/${NAME}`,
  {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ encrypted_value, key_id }),
  }
);

if (putRes.ok || putRes.status === 201 || putRes.status === 204) {
  console.log(`OK: secret ${NAME} set on ${OWNER}/${REPO}`);
} else {
  console.error("PUT failed:", putRes.status, await putRes.text());
  process.exit(1);
}
