const URL_BASE = 'https://elodia-nonhereditable-kittie.ngrok-free.dev';
const HEADERS = { 'ngrok-skip-browser-warning': 'true' };

export const api = {
  get: async (url: string) => {
    const res = await fetch(`${URL_BASE}${url}`, { headers: HEADERS });
    return res.json();
  },

  post: async (url: string, data: any) => {
    const res = await fetch(`${URL_BASE}${url}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...HEADERS
      },
      body: JSON.stringify(data)
    });
    return res.json();
  }
};
