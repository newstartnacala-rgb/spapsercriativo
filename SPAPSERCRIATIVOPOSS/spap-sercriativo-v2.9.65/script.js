/**
 * SISTEMA PDV AVANÇADO - MOTOR JS
 * Usa o supabaseClient já criado pelo supabase-config.js
 * NÃO criar outro cliente aqui — partilhamos o mesmo
 */

// ESTADO DA APLICAÇÃO
let estado = {
    produtos: [],
    carrinho: [],
    categorias: ['Mais Vendidos','Refrigerantes','Alimentos','Chinelos','Sapatos','Cosméticos','Malas','Roupas de Desporto','Diversos','Sem Categoria'],
    categoriaAtiva: null,
    produtoFocadoIndex: 0,
    sessao: null,
    lojaId: null
};

// INICIALIZAÇÃO — verifica sessão e carrega dados
document.addEventListener("DOMContentLoaded", async () => {
    // Verifica se há sessão Supabase válida
    const { data: sessionData } = await supabaseClient.auth.getSession();
    if (!sessionData.session) {
        window.location.href = 'login.html';
        return;
    }

    // Busca a loja do utilizador
    const { data: membros } = await supabaseClient
        .from('membros_loja')
        .select('loja_id, papel, nome_exibicao, lojas(nome)')
        .eq('user_id', sessionData.session.user.id)
        .limit(1);

    if (!membros || membros.length === 0) {
        await supabaseClient.auth.signOut();
        window.location.href = 'login.html';
        return;
    }

    estado.sessao = sessionData.session;
    estado.lojaId = membros[0].loja_id;
    const nomeLoja = membros[0].lojas ? membros[0].lojas.nome : 'Minha Loja';
    const nomeUtilizador = membros[0].nome_exibicao || sessionData.session.user.email;

    document.querySelector('.topbar-logo').textContent = '🏪 ' + nomeLoja;

    await carregarDadosIniciais();
    configurarEventosGlobais();
    renderizarCategorias();
    // Começa na categoria Mais Vendidos
    estado.categoriaAtiva = 'Mais Vendidos';
    document.getElementById('titulo-categoria-atual').textContent = '🔥 Mais Vendidos';
    renderizarCategorias();
    renderizarMaisVendidos();
    console.log("Sistema PDV inicializado para:", nomeLoja);
});

// CARREGAR PRODUTOS DA LOJA
async function carregarDadosIniciais() {
    try {
        const { data, error } = await supabaseClient
            .from('produtos')
            .select('*')
            .eq('loja_id', estado.lojaId)
            .order('nome');

        if (error) throw error;

        // Se loja vazia, semeia com produtos de exemplo
        if (!data || data.length === 0) {
            await seedProdutosExemplo();
        } else {
            estado.produtos = data.map(p => ({
                id: p.id,
                nome: p.nome,
                codigo: p.codigo || '',
                codbarras: p.codbarras || '',
                categoria: p.categoria || 'Sem Categoria',
                preco: parseFloat(p.preco),
                stock: p.stock || 0,
                imagem_url: p.imagem || ''
            }));
        }
    } catch (err) {
        console.error("Erro ao carregar produtos:", err);
        mostrarNotificacao('Erro ao carregar produtos: ' + err.message, 'erro');
    }
}

// SEED DE PRODUTOS (loja nova e vazia)
async function seedProdutosExemplo() {
    const exemplos = [
        { nome: 'Coca-Cola 500ml', codigo: 'REF001', categoria: 'Refrigerantes', preco: 60, stock: 48, imagem: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&h=300&fit=crop' },
        { nome: 'Fanta Laranja 500ml', codigo: 'REF002', categoria: 'Refrigerantes', preco: 60, stock: 36, imagem: 'https://images.unsplash.com/photo-1624517452488-04869289c4ca?w=300&h=300&fit=crop' },
        { nome: 'Água Mineral 1.5L', codigo: 'REF003', categoria: 'Refrigerantes', preco: 45, stock: 60, imagem: 'https://images.unsplash.com/photo-1564419320461-6870880221ad?w=300&h=300&fit=crop' },
        { nome: 'Arroz 25kg', codigo: 'ALI001', categoria: 'Alimentos', preco: 1200, stock: 15, imagem: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&h=300&fit=crop' },
        { nome: 'Feijão Manteiga 1kg', codigo: 'ALI002', categoria: 'Alimentos', preco: 150, stock: 40, imagem: 'https://images.unsplash.com/photo-1612257999691-30bdcf9ae22e?w=300&h=300&fit=crop' },
        { nome: 'Óleo Vegetal 1L', codigo: 'ALI003', categoria: 'Alimentos', preco: 220, stock: 28, imagem: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300&h=300&fit=crop' },
        { nome: 'Chinelo Havaianas Slim', codigo: 'CHN001', categoria: 'Chinelos', preco: 350, stock: 25, imagem: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=300&h=300&fit=crop' },
        { nome: 'Ténis Desportivo Branco', codigo: 'SAP001', categoria: 'Sapatos', preco: 1850, stock: 14, imagem: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=300&fit=crop' },
        { nome: 'Creme Hidratante Corporal', codigo: 'COS001', categoria: 'Cosméticos', preco: 280, stock: 26, imagem: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&h=300&fit=crop' },
        { nome: 'Mala de Senhora Couro', codigo: 'MAL001', categoria: 'Malas', preco: 1450, stock: 11, imagem: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=300&h=300&fit=crop' },
    ];

    const { data: inseridos } = await supabaseClient
        .from('produtos')
        .insert(exemplos.map(p => ({ ...p, loja_id: estado.lojaId })))
        .select();

    estado.produtos = (inseridos || []).map(p => ({
        id: p.id, nome: p.nome, codigo: p.codigo || '',
        codbarras: p.codbarras || '', categoria: p.categoria,
        preco: parseFloat(p.preco), stock: p.stock, imagem_url: p.imagem || ''
    }));
}

// RENDERIZAR CATEGORIAS
function renderizarCategorias() {
    const area = document.getElementById('area-categorias');
    area.innerHTML = '';
    estado.categorias.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'cat-btn' + (cat === estado.categoriaAtiva ? ' ativo' : '');
        btn.textContent = cat === 'Mais Vendidos' ? '🔥 ' + cat : cat;
        btn.onclick = () => {
            estado.categoriaAtiva = cat;
            document.getElementById('titulo-categoria-atual').textContent = cat;
            renderizarCategorias();
            if (cat === 'Mais Vendidos') {
                renderizarMaisVendidos();
            } else {
                const filtrados = estado.produtos.filter(p => p.categoria === cat);
                renderizarGradeProdutos(filtrados);
            }
        };
        area.appendChild(btn);
    });
}

// Calcula e mostra produtos mais vendidos do dia
async function renderizarMaisVendidos() {
    const grid = document.getElementById('grelha-produtos');
    grid.innerHTML = '<p style="color:#aaa;padding:20px;">A calcular...</p>';

    const hoje = new Date();
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString();

    const { data: vendasHoje } = await supabaseClient
        .from('vendas')
        .select('venda_itens(*)')
        .eq('loja_id', estado.lojaId)
        .gte('criado_em', inicioHoje);

    if (!vendasHoje || vendasHoje.length === 0) {
        grid.innerHTML = '<p style="color:#aaa;padding:20px;">Ainda não há vendas hoje. Os produtos mais vendidos vão aparecer aqui.</p>';
        return;
    }

    // Contar vendas por produto
    const contagem = {};
    vendasHoje.forEach(v => {
        (v.venda_itens || []).forEach(it => {
            if (!contagem[it.produto_nome]) contagem[it.produto_nome] = 0;
            contagem[it.produto_nome] += it.qtd;
        });
    });

    // Ordenar por mais vendido e mapear para produtos
    const ranking = Object.entries(contagem)
        .sort((a, b) => b[1] - a[1])
        .map(([nome, qtd]) => ({ nome, qtd, produto: estado.produtos.find(p => p.nome === nome) }))
        .filter(item => item.produto);

    if (ranking.length === 0) {
        grid.innerHTML = '<p style="color:#aaa;padding:20px;">Nenhum produto vendido hoje ainda.</p>';
        return;
    }

    grid.innerHTML = '';
    ranking.forEach((item, i) => {
        const p = item.produto;
        const stock = parseInt(p.stock) || 0;
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
        const card = document.createElement('div');
        card.className = 'produto-card';
        card.style.position = 'relative';
        card.innerHTML = `
            ${medal ? `<div style="position:absolute;top:6px;right:6px;font-size:18px">${medal}</div>` : ''}
            <img src="${p.imagem_url || ''}" class="produto-img" onerror="this.style.display='none'">
            <div class="produto-nome">${p.nome}</div>
            <div class="produto-preco">MT ${parseFloat(p.preco).toFixed(2)}</div>
            <div class="produto-stock" style="color:#1a56a0;font-weight:bold;">${item.qtd}x vendido hoje</div>
            <div class="produto-stock" style="color:${stock<=0?'#e74c3c':stock<=5?'#e05c00':'#718096'}">Stock: ${stock}</div>
        `;
        card.onclick = () => abrirModalQuantidade(p);
        grid.appendChild(card);
    });
}

// RENDERIZAR GRADE DE PRODUTOS
function renderizarGradeProdutos(lista) {
    const grid = document.getElementById('grelha-produtos');
    grid.innerHTML = '';
    if (!lista || lista.length === 0) {
        grid.innerHTML = '<p style="color:#aaa;padding:20px;">Nenhum produto nesta categoria.</p>';
        return;
    }
    lista.forEach((p) => {
        const stock = parseInt(p.stock) || 0;
        const card = document.createElement('div');
        card.className = 'produto-card';
        card.innerHTML = `
            <img src="${p.imagem_url || ''}" class="produto-img" onerror="this.style.display='none'">
            <div class="produto-nome">${p.nome}</div>
            <div class="produto-preco">MT ${parseFloat(p.preco).toFixed(2)}</div>
            <div class="produto-stock" style="color:${stock<=0?'#e74c3c':stock<=5?'#e05c00':'#718096'}">Stock: ${stock}</div>
        `;
        card.onclick = () => abrirModalQuantidade(p);
        grid.appendChild(card);
    });
}

// MODAL DE QUANTIDADE
function abrirModalQuantidade(produto) {
    const modal = document.getElementById('modal-quantidade');
    document.getElementById('qtd-produto-nome').textContent = produto.nome;
    const img = document.getElementById('qtd-produto-img');
    img.src = produto.imagem_url || '';
    img.style.display = produto.imagem_url ? 'block' : 'none';
    document.getElementById('qtd-produto-input').value = 1;
    modal.style.display = 'flex';

    document.getElementById('btn-confirmar-qtd').onclick = () => {
        const qtd = parseInt(document.getElementById('qtd-produto-input').value) || 1;
        adicionarAoCarrinho(produto, qtd);
        modal.style.display = 'none';
    };
    setTimeout(() => document.getElementById('qtd-produto-input').focus(), 80);
}

// GESTÃO DO CARRINHO
function adicionarAoCarrinho(produto, qtd) {
    const existente = estado.carrinho.find(i => i.id === produto.id);
    if (existente) {
        existente.qtd += qtd;
    } else {
        estado.carrinho.push({ ...produto, qtd });
    }
    atualizarUIcarrinho();
    mostrarNotificacao('🛒 ' + produto.nome + ' adicionado!');
}

function atualizarUIcarrinho() {
    const lista = document.getElementById('lista-carrinho');
    const totalEl = document.getElementById('resumo-total');
    const itensEl = document.getElementById('resumo-itens');
    lista.innerHTML = '';
    let total = 0;
    let totalItens = 0;

    estado.carrinho.forEach((item, i) => {
        total += item.preco * item.qtd;
        totalItens += item.qtd;
        lista.innerHTML += `
            <div class="carrinho-item">
                <div style="flex:1">
                    <div style="font-size:13px;font-weight:bold">${item.nome}</div>
                    <div style="font-size:12px;color:#888">MT ${item.preco.toFixed(2)} × ${item.qtd}</div>
                    <div style="display:flex;gap:6px;margin-top:4px">
                        <button onclick="alterarQtdCarrinho(${i},-1)" style="width:22px;height:22px;border-radius:50%;border:1px solid #ddd;cursor:pointer;background:#fff">−</button>
                        <button onclick="alterarQtdCarrinho(${i},1)" style="width:22px;height:22px;border-radius:50%;border:1px solid #ddd;cursor:pointer;background:#fff">+</button>
                    </div>
                </div>
                <div style="text-align:right">
                    <div style="font-weight:bold;color:#e05c00">MT ${(item.preco*item.qtd).toFixed(2)}</div>
                    <button onclick="removerDoCarrinho(${i})" style="color:#ccc;background:none;border:none;cursor:pointer;font-size:18px">×</button>
                </div>
            </div>`;
    });

    totalEl.textContent = 'MT ' + total.toFixed(2);
    itensEl.textContent = totalItens;
}

function alterarQtdCarrinho(i, delta) {
    estado.carrinho[i].qtd += delta;
    if (estado.carrinho[i].qtd <= 0) estado.carrinho.splice(i, 1);
    atualizarUIcarrinho();
}

function removerDoCarrinho(i) {
    estado.carrinho.splice(i, 1);
    atualizarUIcarrinho();
}

// PAGAMENTO — gerido pelo index.html (modal com troco automático)
// O botão PAGAR chama abrirPagamento() definido no index.html
// que já tem o modal completo com campo de valor recebido e cálculo de troco.

// GESTÃO DE PRODUTOS (MODAL CADASTRO)
async function salvarProduto() {
    const nome = document.getElementById('cad-nome').value.trim();
    const codigo = document.getElementById('cad-codigo').value.trim();
    const barras = document.getElementById('cad-barras').value.trim();
    const preco = parseFloat(document.getElementById('cad-preco').value);
    const stock = parseInt(document.getElementById('cad-stock').value) || 0;
    const categoria = document.getElementById('cad-categoria').value;

    if (!nome || isNaN(preco)) { mostrarNotificacao('Preenche nome e preço!', 'erro'); return; }

    // Imagem: ficheiro ou URL
    let imagem = '';
    const abaAtiva = document.querySelector('.aba-img-btn.ativa');
    if (abaAtiva && abaAtiva.id === 'aba-img-link') {
        imagem = document.getElementById('cad-imagem-url').value.trim();
    } else {
        const ficheiro = document.getElementById('cad-imagem-file').files[0];
        if (ficheiro) {
            imagem = await new Promise(res => {
                const r = new FileReader();
                r.onload = e => res(e.target.result);
                r.readAsDataURL(ficheiro);
            });
        }
    }

    const { data, error } = await supabaseClient
        .from('produtos')
        .insert({ loja_id: estado.lojaId, nome, codigo, codbarras: barras, preco, stock, categoria, imagem })
        .select().single();

    if (error) { mostrarNotificacao('Erro: ' + error.message, 'erro'); return; }

    estado.produtos.push({ id: data.id, nome, codigo, codbarras: barras, preco, stock, categoria, imagem_url: imagem });
    mostrarNotificacao('✅ Produto "' + nome + '" guardado!');
    document.getElementById('modal-cadastro').style.display = 'none';
    renderizarGradeProdutos(estado.categoriaAtiva ? estado.produtos.filter(p => p.categoria === estado.categoriaAtiva) : estado.produtos);
    atualizarSelectsEliminar();
}

async function eliminarProduto() {
    const select = document.getElementById('lista-eliminar-produtos');
    const prodId = select.value;
    const prodNome = select.options[select.selectedIndex]?.text;
    if (!prodId) { mostrarNotificacao('Seleciona um produto para eliminar.', 'erro'); return; }
    if (!confirm('Eliminar "' + prodNome + '" permanentemente?')) return;

    const { error } = await supabaseClient.from('produtos').delete().eq('id', prodId);
    if (error) { mostrarNotificacao('Erro: ' + error.message, 'erro'); return; }

    estado.produtos = estado.produtos.filter(p => p.id !== prodId);
    mostrarNotificacao('🗑 Produto eliminado!');
    document.getElementById('modal-cadastro').style.display = 'none';
    renderizarGradeProdutos(estado.categoriaAtiva ? estado.produtos.filter(p => p.categoria === estado.categoriaAtiva) : estado.produtos);
    atualizarSelectsEliminar();
}

function atualizarSelectsEliminar() {
    const selCat = document.getElementById('eliminar-filtro-categoria');
    const selProd = document.getElementById('lista-eliminar-produtos');
    const cadCat = document.getElementById('cad-categoria');

    // Popula categorias nos selects
    estado.categorias.forEach(cat => {
        if (!selCat.querySelector(`option[value="${cat}"]`)) {
            selCat.innerHTML += `<option value="${cat}">${cat}</option>`;
        }
        if (!cadCat.querySelector(`option[value="${cat}"]`)) {
            cadCat.innerHTML += `<option value="${cat}">${cat}</option>`;
        }
    });

    // Filtra produtos pela categoria selecionada
    const catFiltro = selCat.value;
    const prodsFiltrados = catFiltro ? estado.produtos.filter(p => p.categoria === catFiltro) : estado.produtos;
    selProd.innerHTML = prodsFiltrados.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
}

// DEVOLUÇÃO / TROCA
function calcularTroco() {
    const codAntigo = document.getElementById('dev-codigo-antigo').value.trim();
    const codNovo = document.getElementById('dev-codigo-novo').value.trim();
    const qtdAntiga = parseInt(document.getElementById('dev-qtd-antiga').value) || 1;
    const qtdNova = parseInt(document.getElementById('dev-qtd-nova').value) || 1;

    const pAntigo = estado.produtos.find(p => p.codigo === codAntigo);
    const pNovo = estado.produtos.find(p => p.codigo === codNovo);

    const valAntigo = pAntigo ? pAntigo.preco * qtdAntiga : 0;
    const valNovo = pNovo ? pNovo.preco * qtdNova : 0;
    const troco = valAntigo - valNovo;

    document.getElementById('txt-val-antigo').textContent = 'MT ' + valAntigo.toFixed(2);
    document.getElementById('txt-val-novo').textContent = 'MT ' + valNovo.toFixed(2);
    document.getElementById('txt-resultado-troco').textContent = (troco >= 0 ? 'Troco: MT ' : 'A Pagar: MT ') + Math.abs(troco).toFixed(2);
    document.getElementById('painel-troco').className = 'painel-calculo-troca' + (troco < 0 ? ' deve-pagar' : '');
}

// LOGOUT
async function fazerLogout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'login.html';
}

// NOTIFICAÇÕES
function mostrarNotificacao(msg, tipo = 'sucesso') {
    let notif = document.getElementById('notif-sistema');
    if (!notif) {
        notif = document.createElement('div');
        notif.id = 'notif-sistema';
        notif.style.cssText = 'position:fixed;bottom:20px;right:20px;padding:12px 20px;border-radius:8px;font-size:14px;z-index:9999;color:white;box-shadow:0 4px 12px rgba(0,0,0,0.2);max-width:320px;';
        document.body.appendChild(notif);
    }
    notif.textContent = msg;
    notif.style.background = tipo === 'erro' ? '#e74c3c' : '#27ae60';
    notif.style.display = 'block';
    clearTimeout(notif._timer);
    notif._timer = setTimeout(() => notif.style.display = 'none', 2800);
}

// CONFIGURAR TODOS OS EVENTOS
function configurarEventosGlobais() {
    // Menu — defensivo, pode não existir em todos os HTMLs
    const bMenu = document.getElementById('btn-abrir-menu');
    if (bMenu) bMenu.onclick = () => {
        const tp = document.getElementById('tela-pdv');
        const tm = document.getElementById('tela-menu-principal');
        if (tp) tp.style.display = 'none';
        if (tm) tm.style.display = 'block';
    };
    const bFecharMenu = document.getElementById('btn-fechar-menu');
    if (bFecharMenu) bFecharMenu.onclick = () => {
        const tp = document.getElementById('tela-pdv');
        const tm = document.getElementById('tela-menu-principal');
        if (tm) tm.style.display = 'none';
        if (tp) tp.style.display = 'flex';
    };

    // Sair / Logout — o botão no index.html tem id="btn-sair-sistema" mas pode não existir
    const btnSair = document.getElementById('btn-sair-sistema');
    if (btnSair) btnSair.onclick = () => { if (confirm('Terminar sessão?')) fazerLogout(); };

    // Pagar — o botão já tem onclick="abrirPagamento()" no HTML do index.html

    // Limpar carrinho
    const btnLimpar = document.getElementById('btn-limpar-tudo') || document.querySelector('.btn-limpar');
    if (btnLimpar) btnLimpar.onclick = () => {
        if (confirm('Limpar carrinho?')) { estado.carrinho = []; atualizarUIcarrinho(); }
    };

    // Modal Cadastro
    const btnCadastrar = document.getElementById('btn-menu-cadastrar-prod');
    if (btnCadastrar) btnCadastrar.onclick = () => {
        const telaMenu = document.getElementById('tela-menu-principal');
        const telaPDV = document.getElementById('tela-pdv');
        if (telaMenu) telaMenu.style.display = 'none';
        if (telaPDV) telaPDV.style.display = 'flex';
        atualizarSelectsEliminar();
        const modalCad = document.getElementById('modal-cadastro');
        if (modalCad) modalCad.style.display = 'flex';
    };
    const btnFecharCad = document.getElementById('btn-fechar-cadastro-X');
    if (btnFecharCad) btnFecharCad.onclick = () => { const m = document.getElementById('modal-cadastro'); if(m) m.style.display = 'none'; };
    const btnSalvarProd = document.getElementById('btn-salvar-produto');
    if (btnSalvarProd) btnSalvarProd.onclick = salvarProduto;
    const btnEliminar = document.getElementById('btn-eliminar-produto-banco');
    if (btnEliminar) btnEliminar.onclick = eliminarProduto;

    // Filtro categoria no eliminar
    const filtroEliminar = document.getElementById('eliminar-filtro-categoria');
    if (filtroEliminar) filtroEliminar.onchange = atualizarSelectsEliminar;

    // Abas imagem
    const abaFile = document.getElementById('aba-img-file');
    const abaLink = document.getElementById('aba-img-link');
    if (abaFile) abaFile.onclick = () => {
        abaFile.className = 'aba-img-btn ativa';
        if (abaLink) abaLink.className = 'aba-img-btn';
        const cf = document.getElementById('container-input-file');
        const cl = document.getElementById('container-input-link');
        if (cf) cf.style.display = 'block';
        if (cl) cl.style.display = 'none';
    };
    if (abaLink) abaLink.onclick = () => {
        if (abaFile) abaFile.className = 'aba-img-btn';
        abaLink.className = 'aba-img-btn ativa';
        const cf = document.getElementById('container-input-file');
        const cl = document.getElementById('container-input-link');
        if (cf) cf.style.display = 'none';
        if (cl) cl.style.display = 'block';
    };

    // Modal Quantidade
    const btnFecharQtd = document.getElementById('btn-fechar-qtd-X');
    if (btnFecharQtd) btnFecharQtd.onclick = () => {
        const m = document.getElementById('modal-quantidade');
        if (m) m.style.display = 'none';
    };

    // Modal Devolução
    const btnRetorno = document.getElementById('btn-menu-retorno');
    if (btnRetorno) btnRetorno.onclick = () => {
        const telaMenu = document.getElementById('tela-menu-principal');
        const telaPDV = document.getElementById('tela-pdv');
        if (telaMenu) telaMenu.style.display = 'none';
        if (telaPDV) telaPDV.style.display = 'flex';
        const dl = document.getElementById('lista-codigos-sugestao');
        if (dl) dl.innerHTML = estado.produtos.map(p => `<option value="${p.codigo}">${p.nome}</option>`).join('');
        const modalDev = document.getElementById('modal-devolucao');
        if (modalDev) modalDev.style.display = 'flex';
    };

    const elems = {
        'btn-fechar-devolucao-X': el => el.onclick = () => { const m = document.getElementById('modal-devolucao'); if(m) m.style.display='none'; },
        'dev-codigo-antigo': el => el.oninput = calcularTroco,
        'dev-codigo-novo': el => el.oninput = calcularTroco,
        'dev-qtd-antiga': el => el.oninput = calcularTroco,
        'dev-qtd-nova': el => el.oninput = calcularTroco,
        'btn-confirmar-devolucao': el => el.onclick = () => { mostrarNotificacao('✅ Troca registada!'); const m = document.getElementById('modal-devolucao'); if(m) m.style.display='none'; }
    };
    Object.entries(elems).forEach(([id, fn]) => { const el = document.getElementById(id); if (el) fn(el); });

    // Pesquisa
    const pesquisa = document.getElementById('pesquisa');
    if (pesquisa) pesquisa.oninput = e => {
        const termo = e.target.value.trim().toLowerCase();
        if (!termo) {
            if (estado.categoriaAtiva === 'Mais Vendidos') { renderizarMaisVendidos(); return; }
            renderizarGradeProdutos(estado.categoriaAtiva ? estado.produtos.filter(p => p.categoria === estado.categoriaAtiva) : estado.produtos);
            return;
        }
        const resultados = estado.produtos.filter(p =>
            p.nome.toLowerCase().includes(termo) ||
            (p.codigo || '').toLowerCase().includes(termo) ||
            (p.codbarras || '').toLowerCase().includes(termo)
        );
        renderizarGradeProdutos(resultados);
    };

    // Teclado global
    document.addEventListener('keydown', e => {
        if (e.key === 'F2') { e.preventDefault(); const p = document.getElementById('pesquisa'); if(p) p.focus(); }
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-container').forEach(m => m.style.display = 'none');
        }
        const modalQtd = document.getElementById('modal-quantidade');
        if (e.key === 'Enter' && modalQtd && modalQtd.style.display === 'flex') {
            const btn = document.getElementById('btn-confirmar-qtd');
            if (btn) btn.click();
        }
    });
}
