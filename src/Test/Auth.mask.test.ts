import assert from "node:assert/strict";
import AuthUtility, { AuthType } from "../Auth";

describe("Auth token masking for ID", () => {
  const authUtility = new AuthUtility({
    cdnKeys: JSON.stringify(["cdn_key_1234567890_secret_hash_abcdef"]),
    externalKeys: JSON.stringify(["ext_key_9876543210_secret_hash_zyxwvu"]),
  });

  it("masks token when length > 12 characters", () => {
    const token = "12345678901234567890"; // 20 chars
    const masked = authUtility.maskTokenId(token);
    assert.equal(masked, "123456789012********");
    assert.equal(masked.substring(0, 12), "123456789012");
  });

  it("masks token showing starting 7 characters when 7 < length <= 12", () => {
    const token = "123456789012"; // 12 chars
    assert.equal(authUtility.maskTokenId(token), "1234567*****");

    const mediumToken = "short_token"; // 11 chars
    assert.equal(authUtility.maskTokenId(mediumToken), "short_t****");
  });

  it("does not mask token when length <= 7 characters", () => {
    const shortToken = "short"; // 5 chars
    assert.equal(authUtility.maskTokenId(shortToken), "short");
  });

  it("masks CDN token ID in verifyCDNToken", async () => {
    const token = "cdn_key_1234567890_secret_hash_abcdef";
    const payload = await authUtility.verifyCDNToken(token);
    assert.equal(payload.type, AuthType.CDN);
    assert.equal(payload.id, "cdn_key_1234*************************");
  });

  it("masks External token ID in verifyExternalToken", async () => {
    const token = "ext_key_9876543210_secret_hash_zyxwvu";
    const payload = await authUtility.verifyExternalToken(token);
    assert.equal(payload.type, AuthType.EXTERNAL);
    assert.equal(payload.id, "ext_key_9876*************************");
  });
});
