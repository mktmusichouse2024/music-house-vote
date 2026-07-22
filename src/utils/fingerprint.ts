export const getFingerprint = async (): Promise<string> => {
  // 1. Gather device characteristics
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    screen.width + "x" + screen.height,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || "unknown",
    navigator.deviceMemory || "unknown",
    navigator.platform
  ];

  // 2. Add Canvas Fingerprint
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx) {
      canvas.width = 200;
      canvas.height = 50;
      ctx.textBaseline = "top";
      ctx.font = "14px 'Arial'";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#f60";
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = "#069";
      ctx.fillText("Vote System, \ud83d\ude03", 2, 15);
      ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
      ctx.fillText("Vote System, \ud83d\ude03", 4, 17);
      components.push(canvas.toDataURL());
    }
  } catch (e) {
    // Ignore canvas errors
  }

  // 3. Create a hash of the components
  const fingerprintStr = components.join("|||");
  
  // Use Web Crypto API to hash the string
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprintStr);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  
  return hashHex;
};
