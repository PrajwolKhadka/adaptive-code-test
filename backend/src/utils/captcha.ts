// interface CaptchaVerifyResponse {
//   success: boolean;
//   [key: string]: unknown;
// }

// export async function verifyCaptcha(token: string | undefined, remoteIp: string): Promise<boolean> {
//   const secret = process.env.HCAPTCHA_SECRET;
//   if (!secret) {
//     return process.env.NODE_ENV !== "production";
//   }
//   if (!token) return false;

//   const params = new URLSearchParams({ secret, response: token, remoteip: remoteIp });

//   const res = await fetch("https://hcaptcha.com/siteverify", {
//     method: "POST",
//     headers: { "Content-Type": "application/x-www-form-urlencoded" },
//     body: params.toString(),
//   });

//   const data = (await res.json()) as CaptchaVerifyResponse;
//   return data.success === true;
// }
interface CaptchaVerifyResponse {
  success: boolean;
  [key: string]: unknown;
}

export async function verifyCaptcha(token: string | undefined, remoteIp: string): Promise<boolean> {
  const secret = process.env.HCAPTCHA_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") return false;
    console.warn(
      "[captcha] HCAPTCHA_SECRET is not set — failing OPEN (dev only). " +
        "CAPTCHA is NOT being enforced. Set HCAPTCHA_SECRET in .env to test the real flow.",
    );
    return true;
  }
  if (!token) return false;

  const params = new URLSearchParams({ secret, response: token, remoteip: remoteIp });

  const res = await fetch("https://hcaptcha.com/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = (await res.json()) as CaptchaVerifyResponse;
  return data.success === true;
}