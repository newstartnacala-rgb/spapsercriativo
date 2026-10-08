// =====================================================================
// T-Connect — Supabase Edge Function: pagamentos (M-Pesa / e-Mola)
// As CHAVES ficam só aqui no servidor (Secrets), nunca na app.
//
// Dois endpoints (via body.action):
//   "charge" -> inicia o pagamento (STK Push). Devolve {ok, reference, status}.
//   "status" -> consulta o estado de uma referência.
//
// Suporta duas rotas, escolhidas por variável de ambiente PAY_PROVIDER:
//   PAY_PROVIDER=mpesa     -> API oficial Vodacom M-Pesa (C2B), só M-Pesa.
//   PAY_PROVIDER=gateway   -> Gateway agregador (M-Pesa + e-Mola). Ex.: ZumboPay.
//
// Em ambos, no fim, grava o resultado na tabela `subscriptions` via service role.
// =====================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAY_PROVIDER = (Deno.env.get("PAY_PROVIDER") || "gateway").toLowerCase();

// --- M-Pesa (Vodacom) oficial ---
const MPESA_API_KEY = Deno.env.get("MPESA_API_KEY") || "";
const MPESA_PUBLIC_KEY = Deno.env.get("MPESA_PUBLIC_KEY") || "";
const MPESA_SERVICE_PROVIDER_CODE = Deno.env.get("MPESA_SERVICE_PROVIDER_CODE") || ""; // "shortcode"
const MPESA_HOST = Deno.env.get("MPESA_HOST") || "api.sandbox.vm.co.mz"; // produção: api.vm.co.mz

// --- Gateway agregador (M-Pesa + e-Mola) ---
const GATEWAY_BASE_URL = Deno.env.get("GATEWAY_BASE_URL") || "";
const GATEWAY_API_KEY = Deno.env.get("GATEWAY_API_KEY") || "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// Normaliza número Moçambique para 258XXXXXXXXX
function normMsisdn(n: string): string {
  const d = String(n || "").replace(/\D/g, "");
  if (d.startsWith("258")) return d;
  if (d.length === 9) return "258" + d;
  return d;
}

// Grava a subscrição paga (service role ignora RLS).
async function activateSubscription(email: string, plan: string, days: number) {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  await admin.from("subscriptions").upsert(
    {
      email: email.toLowerCase(),
      plan,
      days,
      paid_at: new Date().toISOString(),
      status: "active",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "email" },
  );
}

// ---------------- Rota: Gateway iMali Way (M-Pesa + e-Mola + cartões) ----------------
// Doc: https://docs.imaliway.co.mz  — base: https://api.imaliway.co.mz/v1
// GATEWAY_BASE_URL deve ser "https://api.imaliway.co.mz/v1"
// GATEWAY_API_KEY é a tua chave (sk_live_... em produção, sk_test_... em sandbox).
// Mapeia o estado do iMali Way para o nosso: paid | pending | failed.
function mapImaliStatus(s: string): "paid" | "pending" | "failed" {
  const v = (s || "").toLowerCase();
  if (["success", "successful", "completed", "paid"].includes(v)) return "paid";
  if (["pending", "pending_customer_action", "pending_customer", "processing"].includes(v)) return "pending";
  return "failed";
}

async function gatewayCharge(opts: { msisdn: string; amount: number; reference: string; method: string; name: string }) {
  const res = await fetch(`${GATEWAY_BASE_URL}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${GATEWAY_API_KEY}` },
    body: JSON.stringify({
      amount: opts.amount,
      currency: "MZN",
      method: opts.method,            // "mpesa" | "emola"
      customer: { msisdn: opts.msisdn, name: opts.name || "Cliente T-Connect" },
      reference: opts.reference,
    }),
  });
  const data = await res.json().catch(() => ({}));
  const status = mapImaliStatus(data.status);
  // O iMali Way devolve payment_id; guardamo-lo como referência de consulta.
  const paymentId = data.payment_id || data.id || opts.reference;
  return { ok: res.ok && status !== "failed", status, paymentId, raw: data };
}

async function gatewayStatus(paymentId: string) {
  const res = await fetch(`${GATEWAY_BASE_URL}/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${GATEWAY_API_KEY}` },
  });
  const data = await res.json().catch(() => ({}));
  return { status: mapImaliStatus(data.status), raw: data };
}

// ---------------- Rota: M-Pesa Vodacom oficial (C2B) ----------------
// Gera o Bearer token (RSA) exigido pela API da Vodacom: base64( RSA_encrypt(api_key, public_key) ).
async function mpesaBearer(): Promise<string> {
  // Importa a chave pública (base64 DER, SPKI) e cifra a API key com RSA-OAEP? -> a Vodacom usa PKCS1v1.5.
  // Deno/WebCrypto não suporta PKCS1v1.5 para encrypt; por isso usamos a lib 'node-forge' via esm.sh.
  const forge = await import("https://esm.sh/node-forge@1.3.1");
  const pubDer = forge.util.decode64(MPESA_PUBLIC_KEY);
  const asn1 = forge.asn1.fromDer(pubDer);
  const pubKey = forge.pki.publicKeyFromAsn1(asn1);
  const encrypted = pubKey.encrypt(MPESA_API_KEY, "RSAES-PKCS1-V1_5");
  return forge.util.encode64(encrypted);
}

async function mpesaCharge(opts: { msisdn: string; amount: number; reference: string }) {
  const bearer = await mpesaBearer();
  const res = await fetch(`https://${MPESA_HOST}:18352/ipg/v1x/c2bPayment/singleStage/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "developer.mpesa.vm.co.mz",
      Authorization: `Bearer ${bearer}`,
    },
    body: JSON.stringify({
      input_TransactionReference: opts.reference,
      input_CustomerMSISDN: opts.msisdn,
      input_Amount: String(opts.amount),
      input_ThirdPartyReference: opts.reference,
      input_ServiceProviderCode: MPESA_SERVICE_PROVIDER_CODE,
    }),
  });
  const data = await res.json().catch(() => ({}));
  // INS-0 = sucesso
  const code = data.output_ResponseCode || data.output_error || "";
  return { ok: code === "INS-0", status: code === "INS-0" ? "paid" : "failed", raw: data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = new URL(req.url);
  // -------------------------------------------------------------------
  // WEBHOOK: o gateway chama .../pay?webhook=1 quando o pagamento conclui.
  // Configure este URL no painel do iMali Way (Webhook URL).
  // Protege-se com um segredo partilhado (WEBHOOK_SECRET) no query ou header.
  // -------------------------------------------------------------------
  if (url.searchParams.get("webhook") === "1") {
    const secret = Deno.env.get("WEBHOOK_SECRET") || "";
    const given = url.searchParams.get("secret") || req.headers.get("x-webhook-secret") || "";
    if (secret && given !== secret) return json({ ok: false, error: "assinatura inválida" }, 401);
    let evt: any = {};
    try { evt = await req.json(); } catch { /* vazio */ }
    const status = mapImaliStatus(evt.status || evt.data?.status || "");
    // A nossa referência leva o email: "TC|<email>|<rand>"
    const ref = String(evt.reference || evt.data?.reference || "");
    const parts = ref.split("|");
    const em = (parts[1] || "").toLowerCase();
    const plan = evt.plan || evt.metadata?.plan || "";
    const days = Number(evt.days || evt.metadata?.days || 30);
    if (status === "paid" && em && plan) {
      await activateSubscription(em, plan, days);
    }
    return json({ ok: true, received: true });
  }

  if (req.method !== "POST") return json({ ok: false, error: "Método não permitido" }, 405);

  // Autentica o utilizador pelo token enviado pela app (para saber o email).
  const authHeader = req.headers.get("Authorization") || "";
  const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await userClient.auth.getUser();
  const email = userData?.user?.email?.toLowerCase() || "";
  if (!email) return json({ ok: false, error: "Sessão inválida" }, 401);

  let body: any = {};
  try { body = await req.json(); } catch { /* vazio */ }

  const action = body.action || "charge";
  const method = (body.method || "mpesa").toLowerCase(); // "mpesa" | "emola"
  const plan = body.plan || "";
  const amount = Number(body.amount || 0);
  const days = Number(body.days || 30);
  const msisdn = normMsisdn(body.phone || "");
  // A referência leva o email para o webhook poder ativar a conta certa: TC|email|rand
  const reference = body.reference || `TC|${email}|${Date.now().toString(36)}${Math.random().toString(16).slice(2, 6)}`;

  try {
    if (action === "status") {
      if (PAY_PROVIDER === "gateway") {
        const r = await gatewayStatus(body.reference);
        if (r.status === "paid" && plan) await activateSubscription(email, plan, days);
        return json({ ok: true, status: r.status });
      }
      // M-Pesa síncrono: o estado vem no charge; status fica pendente por omissão.
      return json({ ok: true, status: "pending" });
    }

    // action === "charge"
    if (!amount || !plan || !msisdn) return json({ ok: false, error: "Dados incompletos (telefone, plano, valor)" }, 400);

    let result: any;
    if (PAY_PROVIDER === "mpesa") {
      result = await mpesaCharge({ msisdn, amount, reference });
    } else {
      result = await gatewayCharge({ msisdn, amount, reference, method, name: userData?.user?.user_metadata?.name || email });
    }

    if (result.status === "paid") {
      await activateSubscription(email, plan, days);
    } else if (result.status === "pending" && result.paymentId) {
      // Guarda a referência pendente para a consulta/webhook poder ativar depois.
      const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
      await admin.from("subscriptions").upsert(
        { email: email.toLowerCase(), plan, days, status: "pending", updated_at: new Date().toISOString() },
        { onConflict: "email" },
      );
    }
    // A referência devolvida à app é a do gateway (payment_id), para a consulta de estado.
    return json({ ok: result.ok, status: result.status, reference: result.paymentId || reference, provider: PAY_PROVIDER });
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message || e) }, 500);
  }
});
