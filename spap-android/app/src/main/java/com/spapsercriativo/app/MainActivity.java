package com.spapsercriativo.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.Dialog;
import android.app.DownloadManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ActivityNotFoundException;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import org.json.JSONArray;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class MainActivity extends Activity {

    private static final int REQ_FICHEIRO = 101;
    private static final int REQ_CAMERA = 102;
    private static final int REQ_NOTIF = 103;
    private static final String CANAL = "alertas_spap";
    private static final String OFFLINE = "file:///android_asset/offline.html";

    private FrameLayout raiz;
    private WebView web;
    private Dialog janelaPopup;
    private WebView webPopup;

    private String[] bases;
    private int baseAtual = 0;
    private final Set<String> hostsProprios = new HashSet<>();
    private String ponteJs = "";

    private ValueCallback<Uri[]> callbackFicheiro;
    private WebChromeClient.FileChooserParams paramsFicheiro;
    private Uri fotoCamera;

    private long ultimoVoltar = 0;
    private boolean emOffline = false;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private ConnectivityManager.NetworkCallback redeCallback;
    private String instalacaoPendente;
    private boolean aBaixarApp = false;
    private boolean avisoAppMostrado = false;

    // ------------------------------------------------------------------ ciclo de vida

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle estado) {
        super.onCreate(estado);

        bases = BuildConfig.BASE_URLS.split("\\|");
        for (String b : bases) hostsProprios.add(Uri.parse(b).getHost());
        SharedPreferences prefs = getSharedPreferences("spap", MODE_PRIVATE);
        baseAtual = Math.max(0, Math.min(prefs.getInt("base", 0), bases.length - 1));
        ponteJs = lerAsset("ponte.js");

        criarCanalNotificacoes();

        raiz = new FrameLayout(this);
        raiz.setBackgroundColor(ContextCompat.getColor(this, R.color.brand));
        web = new WebView(this);
        configurarWebView(web, true);
        raiz.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        aplicarMargensSistema(raiz);
        setContentView(raiz);

        vigiarRede();

        if (estado != null) {
            web.restoreState(estado);
        } else {
            escolherEnderecoECarregar();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        CookieManager.getInstance().flush();
        if (instalacaoPendente != null && podeInstalar()) {
            String u = instalacaoPendente; instalacaoPendente = null;
            instalarApp(u);
        }
        if (!BuildConfig.IS_MONITOR) ui.postDelayed(this::verificarAppLoja, 4000);
    }

    @Override
    protected void onPause() {
        // O Monitor continua a ouvir vendas/alertas em segundo plano (não pausamos os temporizadores).
        CookieManager.getInstance().flush();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        try {
            if (redeCallback != null) {
                ((ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE)).unregisterNetworkCallback(redeCallback);
            }
        } catch (Exception ignored) { }
        if (janelaPopup != null) janelaPopup.dismiss();
        web.destroy();
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if (janelaPopup != null && janelaPopup.isShowing()) { fecharPopup(); return; }
        if (emOffline) { sairComDuploToque(); return; }
        android.webkit.WebBackForwardList lista = web.copyBackForwardList();
        int i = lista.getCurrentIndex();
        if (i > 0) {
            String atual = caminho(lista.getItemAtIndex(i).getUrl());
            String anterior = caminho(lista.getItemAtIndex(i - 1).getUrl());
            boolean mesmoDocumento = atual.equals(anterior);
            if (mesmoDocumento || !ehPaginaRaiz(atual)) { web.goBack(); return; }
        }
        sairComDuploToque();
    }

    private void sairComDuploToque() {
        long agora = System.currentTimeMillis();
        if (agora - ultimoVoltar < 2000) { finish(); return; }
        ultimoVoltar = agora;
        Toast.makeText(this, "Toque outra vez em voltar para sair", Toast.LENGTH_SHORT).show();
    }

    // ------------------------------------------------------------------ WebView

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    private void configurarWebView(WebView w, boolean principal) {
        WebSettings s = w.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setSupportMultipleWindows(principal);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setBuiltInZoomControls(false);
        s.setAllowFileAccess(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setUserAgentString(s.getUserAgentString() + " SPAPApp/" + (BuildConfig.IS_MONITOR ? "monitor" : "loja") + "/" + BuildConfig.VERSION_NAME);

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(w, true);

        w.addJavascriptInterface(new Ponte(w), "SPAPNative");
        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            WebViewCompat.addDocumentStartJavaScript(w, ponteJs, Collections.singleton("*"));
        }

        w.setWebViewClient(new Cliente(principal));
        w.setWebChromeClient(new Chrome(principal));
        w.setDownloadListener((url, ua, disposicao, mime, tamanho) -> descarregarUrl(url, ua, disposicao, mime));
    }

    /** Lê o version.json de todos os endereços e abre o que tem a versão mais recente. */
    private void escolherEnderecoECarregar() {
        new Thread(() -> {
            final String[] versoes = new String[bases.length];
            Thread[] t = new Thread[bases.length];
            for (int i = 0; i < bases.length; i++) {
                final int k = i;
                t[i] = new Thread(() -> versoes[k] = lerVersao(bases[k]));
                t[i].start();
            }
            for (Thread x : t) { try { x.join(6000); } catch (InterruptedException ignored) { } }
            int melhor = -1;
            for (int i = 0; i < bases.length; i++) {
                if (versoes[i] == null) continue;
                if (melhor < 0 || compararVersoes(versoes[i], versoes[melhor]) > 0) melhor = i;
            }
            if (melhor >= 0) baseAtual = melhor;
            final String versaoNova = melhor >= 0 ? versoes[melhor] : null;
            ui.post(() -> {
                // Versão nova do sistema → limpa a cópia antiga guardada para mostrar logo o modelo novo
                SharedPreferences pr = getSharedPreferences("spap", MODE_PRIVATE);
                if (versaoNova != null && !versaoNova.equals(pr.getString("ultima_versao", ""))) {
                    web.clearCache(true);
                    pr.edit().putString("ultima_versao", versaoNova).apply();
                }
                emOffline = false;
                web.loadUrl(urlInicial());
            });
        }).start();
    }

    private static String lerVersao(String base) {
        java.net.HttpURLConnection c = null;
        try {
            c = (java.net.HttpURLConnection) new java.net.URL(base + "/version.json?t=" + System.currentTimeMillis()).openConnection();
            c.setConnectTimeout(5000);
            c.setReadTimeout(5000);
            c.setUseCaches(false);
            c.setRequestProperty("Cache-Control", "no-cache");
            if (c.getResponseCode() != 200) return null;
            StringBuilder sb = new StringBuilder();
            try (BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream(), StandardCharsets.UTF_8))) {
                String l; while ((l = r.readLine()) != null) sb.append(l);
            }
            String v = new org.json.JSONObject(sb.toString()).optString("versao", "");
            return v.isEmpty() ? null : v;
        } catch (Exception e) {
            return null;
        } finally {
            if (c != null) c.disconnect();
        }
    }

    private static int compararVersoes(String a, String b) {
        String[] x = a.replaceAll("[^0-9.]", "").split("\\.");
        String[] y = b.replaceAll("[^0-9.]", "").split("\\.");
        for (int i = 0; i < Math.max(x.length, y.length); i++) {
            int p = i < x.length && !x[i].isEmpty() ? Integer.parseInt(x[i]) : 0;
            int q = i < y.length && !y[i].isEmpty() ? Integer.parseInt(y[i]) : 0;
            if (p != q) return p > q ? 1 : -1;
        }
        return 0;
    }

    private String urlInicial() {
        return bases[baseAtual] + BuildConfig.START_PATH;
    }

    private class Cliente extends WebViewClient {
        private final boolean principal;
        Cliente(boolean principal) { this.principal = principal; }

        @Override
        public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest pedido) {
            if (!pedido.isForMainFrame()) return false;
            return tratarNavegacao(v, pedido.getUrl(), principal);
        }

        @Override
        public void onPageStarted(WebView v, String url, android.graphics.Bitmap icon) {
            if (!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) injetarPonte(v);
            if (principal && url != null && !url.startsWith("file:")) emOffline = false;
        }

        @Override
        public void onPageFinished(WebView v, String url) {
            injetarPonte(v);
            if (principal && url != null && url.startsWith("http")) {
                getSharedPreferences("spap", MODE_PRIVATE).edit().putInt("base", baseAtual).apply();
            }
        }

        @Override
        public void onReceivedError(WebView v, WebResourceRequest pedido, WebResourceError erro) {
            if (!principal || !pedido.isForMainFrame()) return;
            mostrarOffline();
        }

        @Override
        public void onReceivedHttpError(WebView v, WebResourceRequest pedido, WebResourceResponse resposta) {
            if (!principal || !pedido.isForMainFrame()) return;
            int codigo = resposta.getStatusCode();
            // Endereço errado ou projeto removido → tenta o próximo endereço de reserva
            if ((codigo == 404 || codigo == 410) && hostsProprios.contains(pedido.getUrl().getHost())
                    && caminho(pedido.getUrl().toString()).equals(BuildConfig.START_PATH)
                    && baseAtual < bases.length - 1) {
                baseAtual++;
                ui.post(() -> web.loadUrl(urlInicial()));
            }
        }
    }

    private class Chrome extends WebChromeClient {
        private final boolean principal;
        Chrome(boolean principal) { this.principal = principal; }

        @Override
        public boolean onCreateWindow(WebView v, boolean dialogo, boolean gesto, Message msg) {
            if (!principal) return false;
            abrirPopup();
            WebView.WebViewTransport t = (WebView.WebViewTransport) msg.obj;
            t.setWebView(webPopup);
            msg.sendToTarget();
            return true;
        }

        @Override
        public void onCloseWindow(WebView janela) {
            if (janela == webPopup) fecharPopup();
        }

        @Override
        public void onProgressChanged(WebView v, int progresso) {
            if (!principal && progresso >= 100) {
                injetarPonte(v);
                ui.postDelayed(() -> injetarPonte(v), 250);
            }
        }

        @Override
        public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams params) {
            if (callbackFicheiro != null) callbackFicheiro.onReceiveValue(null);
            callbackFicheiro = cb;
            paramsFicheiro = params;
            if (aceitaImagens(params) && Build.VERSION.SDK_INT >= 23
                    && checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{Manifest.permission.CAMERA}, REQ_CAMERA);
            } else {
                abrirEscolhaFicheiro();
            }
            return true;
        }
    }

    private void injetarPonte(WebView v) {
        if (v != null && !ponteJs.isEmpty()) v.evaluateJavascript(ponteJs, null);
    }

    /** Decide onde abre cada link. Devolve true se a app tratou (a WebView não navega). */
    private boolean tratarNavegacao(WebView v, Uri uri, boolean principal) {
        String esquema = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();

        if (esquema.equals("http") || esquema.equals("https")) {
            String host = uri.getHost();
            if (host != null && hostsProprios.contains(host)) {
                if (!principal) { web.loadUrl(uri.toString()); fecharPopup(); return true; }
                // Na app Monitor, a página da loja/banca abre o painel correspondente
                if (BuildConfig.IS_MONITOR) {
                    String p = uri.getPath() == null ? "/" : uri.getPath();
                    String novo = null;
                    if (p.equals("/") || p.equals("/index.html") || p.equals("/index")) novo = "/monitor.html";
                    else if (p.equals("/banca") || p.equals("/mobile.html") || p.equals("/mobile")) novo = "/mobile-monitor.html";
                    if (novo != null) { v.loadUrl(uri.getScheme() + "://" + host + novo); return true; }
                }
                return false;
            }
            abrirFora(uri);
            if (!principal) fecharPopup();
            return true;
        }
        if (esquema.equals("about") || esquema.equals("blob") || esquema.equals("data") || esquema.equals("javascript")) {
            return false;
        }
        if (esquema.equals("file")) return !uri.toString().startsWith("file:///android_asset/");

        // rawbt:, tel:, mailto:, whatsapp:, intent:, market: … → app do telemóvel
        abrirFora(uri);
        if (!principal) fecharPopup();
        return true;
    }

    private void abrirFora(Uri uri) {
        try {
            Intent i;
            if ("intent".equalsIgnoreCase(uri.getScheme())) {
                i = Intent.parseUri(uri.toString(), Intent.URI_INTENT_SCHEME);
                i.addCategory(Intent.CATEGORY_BROWSABLE);
                i.setComponent(null);
                i.setSelector(null);
                try { startActivity(i); return; } catch (ActivityNotFoundException e) {
                    String alternativa = i.getStringExtra("browser_fallback_url");
                    if (alternativa != null) { abrirFora(Uri.parse(alternativa)); return; }
                    throw e;
                }
            }
            i = new Intent(Intent.ACTION_VIEW, uri);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
        } catch (Exception e) {
            String esquema = uri.getScheme() == null ? "" : uri.getScheme();
            if (esquema.equalsIgnoreCase("rawbt")) {
                Toast.makeText(this, "Instale a app RawBT para imprimir recibos.", Toast.LENGTH_LONG).show();
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=ru.a402d.rawbtprinter")));
                } catch (Exception ignored) { }
            } else {
                Toast.makeText(this, "Nenhuma app encontrada para abrir isto.", Toast.LENGTH_SHORT).show();
            }
        }
    }

    // ------------------------------------------------------------------ sem internet

    private void mostrarOffline() {
        if (emOffline) return;
        emOffline = true;
        ui.post(() -> web.loadUrl(OFFLINE));
    }

    private void tentarDeNovo() {
        ui.post(() -> {
            web.clearHistory();
            escolherEnderecoECarregar();
        });
    }

    private void vigiarRede() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
            redeCallback = new ConnectivityManager.NetworkCallback() {
                @Override public void onAvailable(Network n) { if (emOffline) ui.postDelayed(MainActivity.this::tentarDeNovo, 800); }
            };
            cm.registerDefaultNetworkCallback(redeCallback);
        } catch (Exception ignored) { }
    }

    // ------------------------------------------------------------------ janelas (recibos, relatórios)

    @SuppressLint("SetJavaScriptEnabled")
    private void abrirPopup() {
        fecharPopup();
        webPopup = new WebView(this);
        configurarWebView(webPopup, false);

        LinearLayout caixa = new LinearLayout(this);
        caixa.setOrientation(LinearLayout.VERTICAL);
        caixa.setBackgroundColor(ContextCompat.getColor(this, R.color.brand));

        LinearLayout barra = new LinearLayout(this);
        barra.setOrientation(LinearLayout.HORIZONTAL);
        barra.setGravity(Gravity.CENTER_VERTICAL);
        int pad = dp(8);
        barra.setPadding(pad, pad, pad, pad);
        barra.addView(botaoBarra("✕  Fechar", v -> fecharPopup()), new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        barra.addView(botaoBarra("🖨  Imprimir / PDF", v -> imprimir(webPopup)), new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        caixa.addView(barra, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        webPopup.setBackgroundColor(Color.WHITE);
        caixa.addView(webPopup, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));

        janelaPopup = new Dialog(this, android.R.style.Theme_Material_Light_NoActionBar);
        janelaPopup.setContentView(caixa);
        aplicarMargensSistema(caixa);
        janelaPopup.setOnCancelListener(d -> fecharPopup());
        janelaPopup.show();
    }

    private TextView botaoBarra(String texto, View.OnClickListener acao) {
        TextView b = new TextView(this);
        b.setText(texto);
        b.setTextColor(Color.WHITE);
        b.setTextSize(15);
        b.setTypeface(Typeface.DEFAULT_BOLD);
        b.setGravity(Gravity.CENTER);
        b.setPadding(dp(10), dp(10), dp(10), dp(10));
        b.setOnClickListener(acao);
        return b;
    }

    private void fecharPopup() {
        if (janelaPopup != null) {
            try { janelaPopup.dismiss(); } catch (Exception ignored) { }
            janelaPopup = null;
        }
        if (webPopup != null) {
            WebView w = webPopup;
            webPopup = null;
            ui.postDelayed(w::destroy, 300);
        }
    }

    // ------------------------------------------------------------------ imprimir

    private void imprimir(WebView w) {
        if (w == null) return;
        ui.post(() -> {
            try {
                PrintManager pm = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                String nome = getString(R.string.app_name) + " " + System.currentTimeMillis();
                pm.print(nome, w.createPrintDocumentAdapter(nome), new PrintAttributes.Builder().build());
            } catch (Exception e) {
                Toast.makeText(this, "Não foi possível imprimir.", Toast.LENGTH_SHORT).show();
            }
        });
    }

    // ------------------------------------------------------------------ ficheiros (escolher)

    private boolean aceitaImagens(WebChromeClient.FileChooserParams p) {
        if (p == null) return false;
        String[] tipos = p.getAcceptTypes();
        if (tipos == null || tipos.length == 0) return true;
        for (String t : tipos) {
            if (t == null || t.trim().isEmpty() || t.contains("image") || t.contains("*/*")) return true;
        }
        return false;
    }

    private void abrirEscolhaFicheiro() {
        Intent escolher;
        try {
            escolher = paramsFicheiro.createIntent();
        } catch (Exception e) {
            escolher = new Intent(Intent.ACTION_GET_CONTENT).setType("*/*");
        }
        escolher.addCategory(Intent.CATEGORY_OPENABLE);
        if (paramsFicheiro != null && paramsFicheiro.getMode() == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE) {
            escolher.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        }

        List<Intent> extras = new ArrayList<>();
        fotoCamera = null;
        boolean temCamera = Build.VERSION.SDK_INT < 23 || checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
        if (aceitaImagens(paramsFicheiro) && temCamera) {
            try {
                File pasta = new File(getCacheDir(), "fotos");
                pasta.mkdirs();
                File f = new File(pasta, "foto-" + System.currentTimeMillis() + ".jpg");
                fotoCamera = FileProvider.getUriForFile(this, getPackageName() + ".ficheiros", f);
                Intent cam = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                cam.putExtra(MediaStore.EXTRA_OUTPUT, fotoCamera);
                cam.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                extras.add(cam);
            } catch (Exception ignored) { fotoCamera = null; }
        }

        Intent chooser = Intent.createChooser(escolher, "Escolher ficheiro");
        if (!extras.isEmpty()) chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, extras.toArray(new Intent[0]));
        try {
            startActivityForResult(chooser, REQ_FICHEIRO);
        } catch (Exception e) {
            if (callbackFicheiro != null) callbackFicheiro.onReceiveValue(null);
            callbackFicheiro = null;
        }
    }

    @Override
    protected void onActivityResult(int pedido, int resultado, Intent dados) {
        if (pedido != REQ_FICHEIRO) { super.onActivityResult(pedido, resultado, dados); return; }
        if (callbackFicheiro == null) return;
        Uri[] r = null;
        if (resultado == RESULT_OK) {
            if (dados != null && dados.getClipData() != null) {
                int n = dados.getClipData().getItemCount();
                r = new Uri[n];
                for (int i = 0; i < n; i++) r[i] = dados.getClipData().getItemAt(i).getUri();
            } else if (dados != null && dados.getData() != null) {
                r = new Uri[]{dados.getData()};
            } else if (fotoCamera != null) {
                r = new Uri[]{fotoCamera};
            }
        }
        callbackFicheiro.onReceiveValue(r);
        callbackFicheiro = null;
    }

    @Override
    public void onRequestPermissionsResult(int pedido, String[] perms, int[] res) {
        super.onRequestPermissionsResult(pedido, perms, res);
        if (pedido == REQ_CAMERA) {
            abrirEscolhaFicheiro();
        } else if (pedido == REQ_NOTIF) {
            getSharedPreferences("spap", MODE_PRIVATE).edit().putBoolean("notif_pedida", true).apply();
            String estado = estadoNotificacoes();
            web.evaluateJavascript("window.__spapRespostaNotif && window.__spapRespostaNotif('" + estado + "')", null);
        }
    }

    // ------------------------------------------------------------------ ficheiros (guardar / partilhar)

    private void guardarBytes(byte[] dados, String mime, String nome) {
        nome = nome.replaceAll("[\\\\/:*?\"<>|]", "-");
        try {
            Uri abrir;
            if (Build.VERSION.SDK_INT >= 29) {
                ContentValues cv = new ContentValues();
                cv.put(MediaStore.Downloads.DISPLAY_NAME, nome);
                cv.put(MediaStore.Downloads.MIME_TYPE, mime);
                cv.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/SPAP");
                Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                if (uri == null) throw new IllegalStateException("sem uri");
                try (OutputStream os = getContentResolver().openOutputStream(uri)) { os.write(dados); }
                abrir = uri;
                Toast.makeText(this, "Guardado em Transferências/SPAP: " + nome, Toast.LENGTH_LONG).show();
            } else {
                File pasta = new File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "SPAP");
                pasta.mkdirs();
                File f = new File(pasta, nome);
                try (FileOutputStream os = new FileOutputStream(f)) { os.write(dados); }
                abrir = FileProvider.getUriForFile(this, getPackageName() + ".ficheiros", f);
                Toast.makeText(this, "Guardado: " + nome, Toast.LENGTH_LONG).show();
            }
            if (mime != null && (mime.contains("pdf") || mime.startsWith("image/"))) {
                Intent ver = new Intent(Intent.ACTION_VIEW).setDataAndType(abrir, mime)
                        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                try { startActivity(ver); } catch (Exception ignored) { }
            }
        } catch (Exception e) {
            // Sem acesso à pasta: oferece partilhar o ficheiro (Drive, WhatsApp, email…)
            partilharBytes(dados, mime, nome, nome, "");
        }
    }

    private void partilharBytes(byte[] dados, String mime, String nome, String titulo, String texto) {
        try {
            File pasta = new File(getCacheDir(), "partilhas");
            pasta.mkdirs();
            File f = new File(pasta, nome.replaceAll("[\\\\/:*?\"<>|]", "-"));
            try (FileOutputStream os = new FileOutputStream(f)) { os.write(dados); }
            Uri uri = FileProvider.getUriForFile(this, getPackageName() + ".ficheiros", f);
            Intent i = new Intent(Intent.ACTION_SEND).setType(mime == null ? "*/*" : mime);
            i.putExtra(Intent.EXTRA_STREAM, uri);
            if (titulo != null && !titulo.isEmpty()) i.putExtra(Intent.EXTRA_SUBJECT, titulo);
            if (texto != null && !texto.isEmpty()) i.putExtra(Intent.EXTRA_TEXT, texto);
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivity(Intent.createChooser(i, "Partilhar"));
        } catch (Exception e) {
            Toast.makeText(this, "Não foi possível partilhar.", Toast.LENGTH_SHORT).show();
        }
    }

    private void descarregarUrl(String url, String ua, String disposicao, String mime) {
        if (url == null) return;
        if (url.startsWith("blob:") || url.startsWith("data:")) return; // tratado pela ponte JS
        try {
            String nome = URLUtil.guessFileName(url, disposicao, mime);
            DownloadManager.Request r = new DownloadManager.Request(Uri.parse(url));
            r.setMimeType(mime);
            r.addRequestHeader("User-Agent", ua);
            String cookies = CookieManager.getInstance().getCookie(url);
            if (cookies != null) r.addRequestHeader("Cookie", cookies);
            r.setTitle(nome);
            r.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            r.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, nome);
            ((DownloadManager) getSystemService(DOWNLOAD_SERVICE)).enqueue(r);
            Toast.makeText(this, "A descarregar " + nome + "…", Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            abrirFora(Uri.parse(url));
        }
    }

    // ------------------------------------------------------------------ atualizar a app (APK)

    private boolean podeInstalar() {
        return Build.VERSION.SDK_INT < 26 || getPackageManager().canRequestPackageInstalls();
    }

    private void progressoJs(int pct, String estado) {
        ui.post(() -> web.evaluateJavascript("window.__spapAppProgresso && window.__spapAppProgresso(" + pct + ",'" + estado + "')", null));
    }

    /** Baixa o APK e abre o instalador do Android. */
    private void instalarApp(String url) {
        if (aBaixarApp) return;
        if (!podeInstalar()) {
            instalacaoPendente = url;
            progressoJs(0, "permissao");
            Toast.makeText(this, "Ative «Permitir desta fonte» e volte à app.", Toast.LENGTH_LONG).show();
            try {
                startActivity(new Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getPackageName())));
            } catch (Exception e) { instalacaoPendente = null; abrirFora(Uri.parse(url)); }
            return;
        }
        aBaixarApp = true;
        new Thread(() -> {
            java.net.HttpURLConnection c = null;
            try {
                File pasta = new File(getCacheDir(), "apk");
                pasta.mkdirs();
                File f = new File(pasta, "SPAP-atualizacao.apk");
                c = (java.net.HttpURLConnection) new java.net.URL(url + (url.contains("?") ? "&" : "?") + "t=" + System.currentTimeMillis()).openConnection();
                c.setConnectTimeout(15000);
                c.setReadTimeout(30000);
                c.setInstanceFollowRedirects(true);
                if (c.getResponseCode() != 200) throw new IllegalStateException("HTTP " + c.getResponseCode());
                long total = c.getContentLengthLong();
                try (java.io.InputStream in = c.getInputStream(); FileOutputStream out = new FileOutputStream(f)) {
                    byte[] buf = new byte[64 * 1024];
                    long lido = 0; int n, ultimo = -1;
                    while ((n = in.read(buf)) > 0) {
                        out.write(buf, 0, n); lido += n;
                        int pct = total > 0 ? (int) (lido * 100 / total) : 50;
                        if (pct != ultimo) { ultimo = pct; progressoJs(pct, "baixar"); }
                    }
                }
                progressoJs(100, "instalar");
                Uri uri = FileProvider.getUriForFile(this, getPackageName() + ".ficheiros", f);
                Intent i = new Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/vnd.android.package-archive")
                        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                ui.post(() -> {
                    try { startActivity(i); } catch (Exception e) { Toast.makeText(this, "Não foi possível abrir o instalador.", Toast.LENGTH_LONG).show(); }
                });
            } catch (Exception e) {
                progressoJs(0, "erro");
                ui.post(() -> Toast.makeText(this, "Falhou a baixar a atualização. Verifique a internet.", Toast.LENGTH_LONG).show());
            } finally {
                if (c != null) c.disconnect();
                aBaixarApp = false;
            }
        }).start();
    }

    /** App Loja: verifica se há APK novo e mostra o aviso para atualizar. */
    private void verificarAppLoja() {
        if (avisoAppMostrado || isFinishing()) return;
        final String base = bases[baseAtual];
        new Thread(() -> {
            java.net.HttpURLConnection c = null;
            try {
                c = (java.net.HttpURLConnection) new java.net.URL(base + "/apps/app-version.json?t=" + System.currentTimeMillis()).openConnection();
                c.setConnectTimeout(8000); c.setReadTimeout(8000); c.setUseCaches(false);
                if (c.getResponseCode() != 200) return;
                StringBuilder sb = new StringBuilder();
                try (BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream(), StandardCharsets.UTF_8))) {
                    String l; while ((l = r.readLine()) != null) sb.append(l);
                }
                org.json.JSONObject j = new org.json.JSONObject(sb.toString());
                String v = j.optString("versao", "");
                String caminho = j.optString("loja", "apps/SPAP-Loja.apk");
                if (v.isEmpty() || compararVersoes(v, BuildConfig.VERSION_NAME) <= 0) return;
                final String url = caminho.startsWith("http") ? caminho : base + "/" + caminho.replaceFirst("^/", "");
                ui.post(() -> {
                    if (avisoAppMostrado || isFinishing()) return;
                    avisoAppMostrado = true;
                    new android.app.AlertDialog.Builder(this)
                            .setTitle("Nova versão da app")
                            .setMessage("A app SPAP Loja " + v + " já está disponível.\n\nQuer baixar e instalar agora?")
                            .setPositiveButton("Atualizar", (d, w) -> {
                                Toast.makeText(this, "A baixar a atualização…", Toast.LENGTH_SHORT).show();
                                instalarApp(url);
                            })
                            .setNegativeButton("Mais tarde", null)
                            .show();
                });
            } catch (Exception ignored) {
            } finally { if (c != null) c.disconnect(); }
        }).start();
    }

    // ------------------------------------------------------------------ notificações

    private void criarCanalNotificacoes() {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel c = new NotificationChannel(CANAL, "Alertas da loja", NotificationManager.IMPORTANCE_HIGH);
            c.setDescription("Vendas grandes, emergências e avisos do SPAP");
            c.enableVibration(true);
            ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(c);
        }
    }

    private String estadoNotificacoes() {
        boolean ativas = NotificationManagerCompat.from(this).areNotificationsEnabled();
        if (Build.VERSION.SDK_INT >= 33) {
            boolean concedida = checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
            if (concedida && ativas) return "granted";
            boolean pedida = getSharedPreferences("spap", MODE_PRIVATE).getBoolean("notif_pedida", false);
            return pedida ? "denied" : "default";
        }
        return ativas ? "granted" : "denied";
    }

    private void mostrarNotificacao(String titulo, String corpo, String etiqueta, boolean fixa) {
        if (!"granted".equals(estadoNotificacoes())) return;
        Intent abrir = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(this, 0, abrir, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CANAL)
                .setSmallIcon(android.R.drawable.stat_notify_more)
                .setContentTitle(titulo)
                .setContentText(corpo)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(corpo))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(!fixa)
                .setOngoing(false)
                .setContentIntent(pi);
        int id = (etiqueta == null || etiqueta.isEmpty()) ? (int) (System.currentTimeMillis() % 100000) : etiqueta.hashCode();
        try { NotificationManagerCompat.from(this).notify(id, b.build()); } catch (SecurityException ignored) { }
    }

    // ------------------------------------------------------------------ ponte JS ↔ Android

    private class Ponte {
        private final WebView dono;
        Ponte(WebView dono) { this.dono = dono; }

        @JavascriptInterface public void imprimir() { MainActivity.this.imprimir(dono); }

        @JavascriptInterface public void guardarFicheiro(String base64, String mime, String nome) {
            byte[] dados = Base64.decode(base64, Base64.DEFAULT);
            ui.post(() -> guardarBytes(dados, mime, nome));
        }

        @JavascriptInterface public void partilharFicheiro(String base64, String mime, String nome, String titulo, String texto) {
            byte[] dados = Base64.decode(base64, Base64.DEFAULT);
            ui.post(() -> partilharBytes(dados, mime, nome, titulo, texto));
        }

        @JavascriptInterface public void partilharTexto(String titulo, String texto) {
            ui.post(() -> {
                Intent i = new Intent(Intent.ACTION_SEND).setType("text/plain");
                i.putExtra(Intent.EXTRA_SUBJECT, titulo);
                i.putExtra(Intent.EXTRA_TEXT, texto);
                startActivity(Intent.createChooser(i, "Partilhar"));
            });
        }

        @JavascriptInterface public void notificar(String titulo, String corpo, String etiqueta, boolean fixa) {
            ui.post(() -> mostrarNotificacao(titulo, corpo, etiqueta, fixa));
        }

        @JavascriptInterface public String permissaoNotificacoes() { return estadoNotificacoes(); }

        @JavascriptInterface public void pedirNotificacoes() {
            ui.post(() -> {
                if (Build.VERSION.SDK_INT >= 33 && !"granted".equals(estadoNotificacoes())) {
                    requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIF);
                } else {
                    dono.evaluateJavascript("window.__spapRespostaNotif && window.__spapRespostaNotif('" + estadoNotificacoes() + "')", null);
                }
            });
        }

        @JavascriptInterface public void vibrar(String padraoJson) {
            try {
                Vibrator vib = (Vibrator) getSystemService(VIBRATOR_SERVICE);
                if (vib == null) return;
                long[] padrao;
                if (padraoJson.trim().startsWith("[")) {
                    JSONArray a = new JSONArray(padraoJson);
                    padrao = new long[a.length() + 1];
                    padrao[0] = 0;
                    for (int i = 0; i < a.length(); i++) padrao[i + 1] = a.getLong(i);
                } else {
                    padrao = new long[]{0, (long) Double.parseDouble(padraoJson)};
                }
                if (Build.VERSION.SDK_INT >= 26) vib.vibrate(VibrationEffect.createWaveform(padrao, -1));
                else vib.vibrate(padrao, -1);
            } catch (Exception ignored) { }
        }

        @JavascriptInterface public void aviso(String texto) {
            ui.post(() -> Toast.makeText(MainActivity.this, texto, Toast.LENGTH_SHORT).show());
        }

        @JavascriptInterface public void tentarDeNovo() { MainActivity.this.tentarDeNovo(); }

        @JavascriptInterface public String versaoApp() { return BuildConfig.VERSION_NAME; }

        @JavascriptInterface public String tipoApp() { return BuildConfig.IS_MONITOR ? "monitor" : "loja"; }

        @JavascriptInterface public void instalarApp(String url) { ui.post(() -> MainActivity.this.instalarApp(url)); }
    }

    // ------------------------------------------------------------------ utilitários

    private void aplicarMargensSistema(View v) {
        ViewCompat.setOnApplyWindowInsetsListener(v, (vista, insets) -> {
            Insets b = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.ime() | WindowInsetsCompat.Type.displayCutout());
            vista.setPadding(b.left, b.top, b.right, b.bottom);
            return WindowInsetsCompat.CONSUMED;
        });
    }

    private boolean ehPaginaRaiz(String caminho) {
        return caminho.equals("/") || caminho.equals("/monitor.html") || caminho.equals("/index.html")
                || caminho.equals("/login.html") || caminho.equals("/mobile.html") || caminho.equals("/mobile-monitor.html")
                || caminho.equals("/banca") || caminho.equals("/banca/monitor") || caminho.equals("/offline.html");
    }

    private static String caminho(String url) {
        try {
            Uri u = Uri.parse(url);
            String p = u.getPath();
            return p == null || p.isEmpty() ? "/" : p;
        } catch (Exception e) { return "/"; }
    }

    private int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    private String lerAsset(String nome) {
        try (BufferedReader r = new BufferedReader(new InputStreamReader(getAssets().open(nome), StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String l;
            while ((l = r.readLine()) != null) sb.append(l).append('\n');
            return sb.toString();
        } catch (Exception e) { return ""; }
    }
}
