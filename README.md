# ACK Directory

Site estático que exibe o diretório visual de **skills** e **rules** do [Agent Context Kit](https://github.com/sandredossantos/ack-directory).

Hospedado no GitHub Pages, consome conteúdo de um repositório separado (`ack-content`) em tempo de build.

## Como funciona

```
ack-content (privado)          ack-directory (este repo)
  content/                       scripts/build-json.mjs
    skills/*.md       ──────►      Parseia frontmatter YAML
    rules/*.md                     Gera directory.json
                                        │
                                        ▼
                                 site/
                                   index.html ◄── SPA shell
                                   app.js     ◄── Rendering client-side
                                   styles.css ◄── Tema dark
                                        │
                                        ▼
                                 GitHub Pages
                                   fetch('directory.json')
                                   Hash routing (#/skills, #/rules)
```

1. **Build time** — Um GitHub Action faz checkout do `ack-content`, executa `build-json.mjs` que lê os `.md` com `gray-matter` e gera um `directory.json`.
2. **Deploy** — Os arquivos estáticos (`index.html`, `app.js`, `styles.css`) + o `directory.json` gerado são publicados no GitHub Pages.
3. **Runtime** — O browser carrega `directory.json` com um único `fetch` e renderiza tudo client-side com JavaScript puro (sem framework).
4. **Atualização automática** — Um push no `ack-content` dispara `repository_dispatch` que rebuilda o site.

## Estrutura

```
.github/workflows/
  build.yml              # CI: checkout content → gera JSON → deploy Pages
scripts/
  build-json.mjs         # Parseia .md com gray-matter → directory.json
  package.json           # Dependência: gray-matter
site/
  index.html             # Shell SPA
  app.js                 # Router hash-based + rendering
  styles.css             # CSS completo (tema dark)
```

## Rodar localmente

### Pre-requisitos

- Node.js >= 18
- O conteúdo fonte (os `.md` de skills e rules) em algum diretório local

### Passos

```bash
# 1. Clone o repo
git clone https://github.com/sandredossantos/ack-directory.git
cd ack-directory

# 2. Instale as dependências do build
cd scripts && npm install && cd ..

# 3. Gere o directory.json apontando para o diretório de conteúdo
#    Substitua o caminho pelo local do seu ack-content/content
node scripts/build-json.mjs ../ack-content/content site/directory.json

# 4. Sirva os arquivos estáticos
npx serve site -l 3333

# 5. Abra no browser
#    http://localhost:3333
```

Para regenerar após editar algum `.md`, basta rodar o passo 3 novamente.

## Navegação

| Rota | Página |
|------|--------|
| `#/` | Home — stats e skills recentes |
| `#/skills` | Lista de skills com pesquisa e paginação |
| `#/skills/:slug` | Detalhe de uma skill com conteúdo markdown |
| `#/rules` | Lista de rules com pesquisa e paginação |
| `#/rules/:slug` | Detalhe de uma rule com conteúdo markdown |

## Tecnologias

- **Zero frameworks** — HTML, CSS e JavaScript puro
- **gray-matter** — Parsing de frontmatter YAML (apenas no build)
- **GitHub Actions** — CI/CD para gerar o JSON e deploy no Pages
- **GitHub Pages** — Hosting estático gratuito
