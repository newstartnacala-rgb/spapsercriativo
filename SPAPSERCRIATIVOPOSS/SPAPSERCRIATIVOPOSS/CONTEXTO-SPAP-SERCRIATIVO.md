# 📋 CONTEXTO DO PROJETO — Spap-Sercriativo (PDV/POS)
> Documento para continuar o trabalho numa NOVA conversa sem perder nada.
> **Cola este ficheiro (ou envia-o) no início da nova conversa.**
> Versão atual do sistema: **v2.9.53** · Data deste resumo: 2026-09-06

---

## 1. O QUE É O PROJETO
"Spap-Sercriativo" é um **sistema de ponto de venda (PDV/POS) multi-loja** para o comércio em **Moçambique** (Nampula). SaaS: um dono paga um plano e recebe uma loja no sistema.

**Fala sempre em Português de Moçambique, de forma calorosa e SIMPLES.**
**IMPORTANTE: sê CONCISO.** O utilizador atinge limites de conversa depressa e frustra-se com textos longos. Resume o que fizeste + dá o link do ZIP + passos curtos de teste. Nada de textões.

---

## 2. ARQUITETURA
- **Frontend estático** (HTML + JS puro, sem framework): páginas principais:
  - `index.html` = a **Loja/PDV** (onde o balconista vende)
  - `monitor.html` = o **Monitor** (painel do dono: produtos, relatórios, inventário, etc.)
  - `admin.html` = super-admin
  - `login.html`, `registo.html`, `planos.html`, `reset-senha.html`
  - `sw.js` = service worker (cache/PWA/auto-update)
  - `version.json` = versão atual (usada para detetar atualizações)
  - `supabase-config.js` = liga ao Supabase (`SUPABASE_URL`, `SUPABASE_ANON_KEY`)
- **Backend = Supabase** (Postgres + Auth + RLS). Tabelas principais: `lojas`, `membros_loja`, `produtos`, `vendas`, `venda_itens`, `despachos`, `entregas`, `perdas`, `caixa_sobras`, `gerente_convites`.
- **Deploy = Vercel** (site estático).

---

## 3. MÉTODO DE TRABALHO (como o assistente edita — MUITO IMPORTANTE)
A pasta de trabalho `/home/claude/poss/app` **APAGA-SE entre turnos**. No início de CADA turno, restaurar do último ZIP:
```
mkdir -p /home/claude/poss/app && cd /home/claude/poss/app && unzip -o /mnt/user-data/outputs/spap-sercriativo-vX.Y.Z.zip
```
Por cada alteração:
1. Editar os ficheiros.
2. **Bump da versão em 3 sítios** (têm de bater certo, senão a deteção de update falha):
   - `version.json` → campo `versao`
   - `index.html` → `const VERSAO_ATUAL = 'X.Y.Z'`
   - `monitor.html` → `const MONITOR_VERSAO = 'X.Y.Z'`
3. Incrementar `const CACHE_NAME = 'spap-pdv-vNN'` no `sw.js`.
4. **Validar o JS** de cada HTML (extrair blocos `<script>` sem src e correr `node --check`). NUNCA entregar com erro.
5. Zipar para `/mnt/user-data/outputs/spap-sercriativo-vX.Y.Z.zip` e apresentar com `present_files`.

**Cuidados aprendidos:**
- Escritas arriscadas em ficheiros: usar ficheiro temporário + validar + mover (uma vez o `index.html` ficou a 0 bytes).
- Às vezes a cópia de trabalho já tem edições — tratar a cópia como fonte de verdade; re-ver antes de editar.
- Códigos ESC/POS no recibo estão como texto `\x1B` (JS escapes) — cuidado ao editar.

---

## 4. FUNCIONALIDADES JÁ CONSTRUÍDAS (resumo do que existe)
- **PDV completo**: pesquisa, carrinho, pagamento (numerário/cartão/transferência), troco, teclado numérico com botão **"C — Limpar tudo"**, tecla **Enter** (pesquisa→carrinho; fora→Pagar; pagamento→confirmar).
- **Recibo térmico via RawBT** (impressora 58mm e 80mm Xprinter): imprime **direto** por `rawbt:base64,` (ESC/POS), sem janela; nome da loja e TOTAL em fonte grande; corte automático de papel; mostra **contacto (telefone) e endereço** da empresa (definidos em Meu Perfil). Recibo do ecrã/PDF (fallback no computador) também mostra contacto.
- **Tipos de loja** (registo): Comercial, Farmácia, Boutique, Mercearia, Restaurante/Bar, Bottle Store — cada loja mostra **só as categorias do seu tipo** (loja + monitor). Coluna `lojas.tipo_loja`.
- **Visão Geral do Negócio** (monitor): receita, lucro bruto, **perdas**, **lucro líquido**, nº vendas, ticket médio, itens vendidos, taxa de vinculação, por método de pagamento; filtros de data (hoje/semana/mês/intervalo). Super-admin soma todas as lojas.
- **Inventário + PDF**: contagem física, corrige quantidades ("Contei" + Guardar), mostra **sobra de caixa** (depois de "Verificar diferenças"); PDF mostra investido/valor de venda/lucro potencial + **lucro REAL das vendas** (Hoje/Semana/Mês/Total).
- **Despacho com confirmação**: o dono envia (estado 'enviado', **stock NÃO soma ainda**); o balconista, em "Aviso de despacho", vê "Por confirmar" e **confirma** — só aí o stock soma. Protege contra somar 2x. Monitor mostra "Aguarda confirmação"/"Confirmado".
- **Fecho do dia ("Entregar o dia")**: dinheiro na mão + gastos do dia (inclui descontos) + nota. Deteta valores escritos na nota e pergunta se quer usar a soma. (Campo separado de "Descontos" foi removido.)
- **Auditoria de caixa**: dif = (entregue + descontos + gastos) − esperado.
- **Imagens de produto** (só plano Avançado): câmera/ficheiro; comprimidas (JPEG ~0.72, redimensionadas), guardadas em base64 na coluna `produtos.imagem`; aparecem na lista do monitor e na loja, com **clique para ampliar** (lightbox).
- **Planos**: Básico 1.000 / Médio 1.500 / Avançado 2.000 MT/mês (anual −5%). Câmera+ficheiro (imagem) só no Avançado. Menu da loja tem "⬆️ Ver planos / Upgrade".
- **PIN do Monitor** (`lojas.pin_monitor`), **código do balconista** (`lojas.codigo_agente`, mudável em Meu Perfil), **código do admin** (`codigo_admin`).
- **Super-admin**: por defeito só vê a **Loja João** (demo); ver outras lojas / "Todas as Lojas" pede o código **0210**.
- **Monitor extra (GERENTE)** por **link, sem conta**: em Funcionários, "➕ Adicionar gerente (gerar link)". O gerente abre o link → login **anónimo** + resgata convite (`gerente_convites` + RPC `resgatar_convite_gerente`) → entra em **modo restrito**: só Produtos, Cadastrar, Inventário, Despacho e Visão Geral **sem dinheiro**; **não muda quantidades**. Ao abrir pede o **código do monitor extra** (`lojas.pin_gerente`, por defeito **0000**, mudável só pelo dono em Meu Perfil). O **mesmo link serve vários trabalhadores** (útil para inventário em grupo).
- **Menu da loja**: ícones numa só grelha (sem secções), esticados para encher a largura.
- **Sinalizador de internet**: fica **verde só com internet REAL** (testa o servidor e verifica que a resposta é JSON; portal da operadora sem megabytes = vermelho).
- **Auto-atualização TOTALMENTE automática (v2.9.53)**: quando há versão nova e a app está livre (sem venda no carrinho, sem janela aberta), **atualiza-se sozinha**; se a meio de venda, espera. "Atualizar agora" faz **nuclear**: desregista o service worker + limpa caches + recarrega. Vale para loja e monitor. Verifica também ao voltar ao ecrã.

---

## 5. SQL (Supabase) — ficheiros que às vezes é preciso correr
Já entregues (correr no SQL Editor do Supabase quando indicado):
- `atualizacao-v2.9.26.sql` — coluna `tipo_loja` (tipos de loja)
- `atualizacao-v2.9.21.sql` — `pin_monitor`
- `atualizacao-despachos-v1.9.0.sql` (= v1.9.0) — tabela `despachos`
- `atualizacao-caixa_sobras-v2.6.4.sql` — tabela `caixa_sobras`
- `atualizacao-gerente-link.sql` — tabela `gerente_convites` + RPC `resgatar_convite_gerente` (monitor extra por link)
- `atualizacao-pin-gerente.sql` — coluna `pin_gerente` (código do monitor extra, default 0000)

**Config no Supabase (uma vez):**
- **Authentication → Providers → "Anonymous sign-ins" = ON** (necessário para o link do gerente).
- **Authentication → URL Configuration → Site URL + Redirect URLs** com o endereço fixo da app (ver secção 6). Sem isto, a **troca de e-mail** não completa.

---

## 6. ESTADO ATUAL / EM CURSO — DEPLOY FIXO (GitHub + Vercel)
**Problema que estamos a resolver:** o utilizador usava o **"Vercel Drop"**, que cria um **projeto novo (link novo) a cada envio** (spapsercriativo2941, 2942, 2948...). Por isso os aparelhos nunca se atualizavam sozinhos (estavam noutro endereço) e havia de repartilhar links.

**Solução em curso (quase feita):**
- Repo GitHub criado: `newstartnacala-rgb/spapsercriativo` (público). ✅ Conectado ao Vercel. ✅
- **PROBLEMA ATUAL:** os ficheiros da app estão dentro da subpasta **`SPAPSERCRIATIVOPOSS`** no repo, mas o Vercel servia a raiz (só tinha o README).
- **PASSO EM QUE ESTÁVAMOS:** no Vercel → Project Settings → **Build and Deployment → Diretório raiz** → mudar de `./` para **`SPAPSERCRIATIVOPOSS`** → **Salvar** → depois **Deployments → ⋯ → Redeploy**.
- **A CONFIRMAR:** que dentro de `SPAPSERCRIATIVOPOSS` estão mesmo `index.html`, `monitor.html`, `sw.js`, `version.json`, etc.

**Objetivo final:** um **link fixo** (ex.: `spapsercriativo.vercel.app`). A partir daí, atualizar = carregar ficheiros novos no MESMO repo GitHub → Vercel republica sozinho no mesmo link → app atualiza-se automaticamente (v2.9.53). Depois, configurar o Site URL + Redirect URLs no Supabase (usar coringa `https://*.vercel.app/**` ou o link fixo).

Tudo isto é **grátis** (GitHub grátis, Vercel Hobby grátis, `.vercel.app` grátis). Custos só depois: domínio próprio (~10–15 USD/ano, opcional) e Supabase pago (quando muitas lojas com imagens; free = 1 GB).

---

## 7. PENDENTES / IDEIAS FUTURAS
- **Terminar o deploy fixo** (Root Directory + Redeploy) — prioridade imediata.
- **M-Pesa automático** (pagar plano com confirmação automática): possível via API M-Pesa Moçambique (Vodacom, C2B). Precisa: conta M-Pesa de negócio + credenciais (sandbox→produção) do portal de programadores + uma **função de servidor** (Edge Function/serverless) porque as credenciais não podem estar no browser. À espera de o utilizador obter as credenciais de sandbox.
- **Imagens em escala**: hoje em base64 no Postgres; ao crescer (muitas lojas × milhares de produtos), migrar para **Supabase Storage** (guardar URL) — mais barato/escalável.
- **Revogar/listar gerentes** do monitor extra (agora o link cria acessos anónimos; falta UI para gerir/revogar).
- **Botão "Adicionar gerente" já existe**, mas designar por email direto precisaria de função de servidor (por isso foi por link/convite).
- Um cliente novo (Farmácia "Mateus – Loja-02") e outros já estão a usar.

---

## 8. COMO CONTINUAR (para o assistente da nova conversa)
1. O último código está em **`spap-sercriativo-v2.9.53.zip`** (pede ao utilizador para reenviar se não estiver acessível, ou restaura desse ZIP).
2. Segue o **método de trabalho** da secção 3 (restaurar do ZIP, editar, bump 3 versões + cache, validar JS, zipar, present_files).
3. **Sê conciso.** Resposta curta: o que fizeste + ZIP + teste rápido. Sem textões.
4. Se pedirem SQL, entrega o ficheiro `.sql` e diz onde correr.
5. Provável próximo assunto: **terminar o GitHub/Vercel** (Diretório raiz = `SPAPSERCRIATIVOPOSS` + Redeploy) e depois configurar o Supabase (Redirect URLs + login anónimo).
