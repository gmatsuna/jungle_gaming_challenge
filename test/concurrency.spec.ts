import { describe, it, expect } from "bun:test";

const API_URL = "http://localhost:3000";

// Token JWT estático válido para os testes locais
const accessToken = "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJZTFFOeTZlSDhMdzlPRU1uSHU3NzNvVDNTc1RocnI4bGQ4bE50MS1ySTNjIn0.eyJleHAiOjE3OTE4MzIzODIsImlhdCI6MTc5MTgyODc4MiwianRpIjoiZDBkZTBjODItNjc5Ni00YTEzLThlYWItNjI4M2Q3NGMyZTUzIiwiaXNzIjoiaHR0cDovL2xvY2FsaG9zdDo4MDgwL3JlYWxtcy9qdW5nbGUtcmVhbG0iLCJhdWQiOiJhY2NvdW50Iiwic3ViIjoiOThlMDBhMTktMTk2ZC00ZTUyLTk5ZTctN2ZkY2RlY2FkZjY2IiwidHlwIjoiQmVhcmVyIiwiYXpwIjoianVuZ2xlLWNsaWVudCIsInNpZCI6IjM0M2JhNWNjLTNkNWUtNDVkYS1iY2MxLTY4YjM5ZTdkNmQ2MSIsImFjciI6IjEiLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsiZGVmYXVsdC1yb2xlcy1qdW5nbGUtcmVhbG0iLCJvZmZsaW5lX2FjY2VzcyIsInVtYV9hdXRob3JpemF0aW9uIl19LCJyZXNvdXJjZV9hY2Nlc3MiOnsiYWNjb3VudCI6eyJyb2xlcyI6WyJtYW5hZ2UtYWNjb3VudCIsIm1hbmFnZS1hY2NvdW50LWxpbmtzIiwidmlldy1wcm9maWxlIl19fSwic2NvcGUiOiJwcm9maWxlIGVtYWlsIiwiZW1haWxfdmVyaWZpZWQiOmZhbHNlLCJuYW1lIjoiR2lsYmVydG8gSGlkZWFraSBNYXRzdW5hZ2EiLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJwcm92aWRlci1hIiwiZ2l2ZW5fbmFtZSI6IkdpbGJlcnRvIiwiZmFtaWx5X25hbWUiOiJIaWRlYWtpIE1hdHN1bmFnYSIsImVtYWlsIjoiZ21hdHN1bmFAZ21haWwuY29tIn0.N-MINOF1FH7OuuPZnNxz8zqSP7Kd9neaS47NDtahudBOdQKoxsf85HddoFga8qAAZD_NooQUWHY7XdPjDEcsERyHdLzOVJMVIw_VHQVi_hrp9yV9MQEPU3BcMWthgcBiEcQd2a6aJz3sgJXnDKR6YKmxj6E-1QbcByrOIxDGff1P3qyt4QDUG86PQlQkHLJLhpN6t5bL7qCmuxlFcYy6Mh1zVSbcL-XQWNZbKdCKnPATuZ2uOv9vyVlxFM0aMPIZkPuTP_C14TyJvqdhdH7y-2uJCym8GlRp7GiT7NpaA8JFYfEZnHe41H8PfsObxdwsX9nfBNmNNQB2vjkdem7wjw";

describe("Wagering Concurrency & Integration E2E Tests", () => {
  let walletId: string;
  const playerId = `player-concurrency-${Date.now()}`;

  it("1. should create a wallet with initial balance", async () => {
    const response = await fetch(`${API_URL}/wallets`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        playerId,
        initialBalance: { amount: "100.00", currency: "BRL" },
      }),
    });

    const data = await response.json();
    expect(response.status).toBe(201);
    expect(data.balance.amount).toBe("100.00");
    walletId = data.id;
  });

  it("2. [Cenário Obrigatório] should process parallel bets and prevent negative balance (race condition)", async () => {
    const sendBet = async (externalTxId: string) => {
      const res = await fetch(`${API_URL}/wagering/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
          "Idempotency-Key": `provider-a:${externalTxId}`,
        },
        body: JSON.stringify({
          providerId: "provider-a",
          externalTransactionId: externalTxId,
          playerId,
          walletId,
          roundId: "round-race-01",
          gameId: "game-slots",
          kind: "BET",
          money: { amount: "80.00", currency: "BRL" },
        }),
      });
      const body = await res.json().catch(() => ({}));
      console.log(`DEBUG BET (${externalTxId}) -> Status: ${res.status}`, body);
      return { status: res.status, body };
    };

    // Dispara duas apostas de 80 BRL em paralelo para uma carteira com 100 BRL
    const [result1, result2] = await Promise.all([
      sendBet("bet-race-01"),
      sendBet("bet-race-02"),
    ]);

    const processedCount = [result1, result2].filter(
      (r) => (r.status === 201 || r.status === 200) || r.body?.status === "PROCESSED"
    ).length;

    // Apenas uma pode passar, garantindo a atomicidade e prevenindo saldo negativo por concorrência
    expect(processedCount).toBe(1);

    // Consulta o saldo final para garantir exatamente 20.00 BRL
    const balanceRes = await fetch(`${API_URL}/wallets/${walletId}`, {
      headers: { "Authorization": `Bearer ${accessToken}` }
    });
    const walletData = await balanceRes.json();

    expect(walletData.balance.amount).toBe("20.00");
  });
});