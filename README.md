# Livro-Caixa — IHGCODÓ

App web de tesouraria do Instituto Histórico e Geográfico de Codó: controle de
entradas/saídas de caixa e das mensalidades dos membros (pago / a vencer / atrasado),
com login do admin e botões de cobrança pelo WhatsApp.

## Publicação no GitHub Pages

O deploy é automático: a cada `push` na branch `main`, o workflow em
`.github/workflows/deploy.yml` builda o projeto e publica o resultado no GitHub Pages.

**Passo único e manual (uma vez só, por repositório):** em
`Settings → Pages`, no campo "Build and deployment → Source", selecione
**"GitHub Actions"**. Depois disso, todo `push` publica sozinho.

Se a branch padrão do seu repositório for `master` em vez de `main`, ajuste o
`on.push.branches` em `.github/workflows/deploy.yml`.

## Login

O acesso ao painel é protegido por uma tela de login (e-mail do admin +
senha). **Importante:** como este é um site 100% estático (sem servidor),
isso é uma barreira simples contra visitantes casuais — não é segurança de
nível bancário. Para trocar a senha, gere um novo hash SHA-256 e substitua a
constante `ADMIN_PASSWORD_HASH` em `src/App.jsx`:

```js
// no console do navegador, por exemplo:
crypto.subtle.digest("SHA-256", new TextEncoder().encode("sua-nova-senha"))
  .then(buf => console.log(Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("")));
```

## Armazenamento dos dados

Os dados (membros, mensalidades, lançamentos) ficam salvos no `localStorage`
do navegador — ou seja, **por dispositivo/navegador**, sem sincronização
entre pessoas ou aparelhos diferentes. Se um dia for necessário compartilhar
os dados entre vários dispositivos, será preciso um backend real (ex:
Firebase, Supabase).

## Cobrança pelo WhatsApp

Nas telas de Painel e Mensalidades, membros atrasados ou a vencer têm um
botão verde que abre o WhatsApp Web/App com uma mensagem de cobrança amigável
já escrita, pronta para revisar e enviar. Nada é enviado automaticamente.

## Rodando localmente

```bash
npm install
npm run dev
```

## Estrutura

```
projeto-ihgcodo/
├── .github/workflows/deploy.yml   (publica no GitHub Pages a cada push)
├── README.md
├── package.json
├── index.html
├── vite.config.js
└── src/
    ├── App.jsx      (o app completo)
    └── main.jsx     (ponto de entrada)
```
