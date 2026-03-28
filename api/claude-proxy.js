export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt ausente" });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Chave da API não configurada no servidor" });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 24000);

    let response;
    try {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 8000,
          system: "Você é um extrator de dados JSON. Retorne APENAS o objeto JSON solicitado, sem texto antes, sem texto depois, sem markdown, sem explicações. Só o JSON puro.",
          messages: [{ role: "user", content: prompt }]
        })
      });
    } finally {
      clearTimeout(timer);
    }

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data.error?.message || data.error?.type || JSON.stringify(data.error) || "Erro na API do Claude";
      console.error("Erro da API Anthropic:", response.status, errMsg);
      return res.status(response.status).json({ error: "API Anthropic (" + response.status + "): " + errMsg });
    }

    const text = data.content?.[0]?.text || "";
    return res.status(200).json({ text });

  } catch (err) {
    console.error("Erro no proxy:", err);
    const msg = err.name === "AbortError"
      ? "Tempo limite excedido (PDF muito grande ou API lenta). Tente novamente."
      : (err.message || "Erro interno no servidor");
    return res.status(504).json({ error: msg });
  }
}

