# Gym Workout

Aplicativo web para organizar e executar treinos de academia, com foco em uso rápido no celular.

Projeto em produção local com interface estilo app, suporte a PWA, persistência no navegador e backup por arquivo JSON.

## Acesso ao projeto

Você pode acessar a aplicação publicada em:

https://lucasfm95.github.io/gym-workout/

## Funcionalidades

- Cadastro de treinos
- Cadastro de exercícios por treino
- Edição e exclusão de treinos
- Edição e exclusão de exercícios
- Marcação de exercícios concluídos
- Barra de progresso por treino
- Reinício do progresso do treino ativo
- Exportação de dados em JSON
- Importação de dados em JSON
- Opção para zerar todos os dados
- Feedback visual com snackbar

## Tecnologias

- HTML5
- CSS3
- JavaScript puro
- LocalStorage para persistência local
- Manifest para experiência PWA

## Estrutura do projeto

- [index.html](index.html): estrutura da interface
- [styles.css](styles.css): estilos visuais
- [app.js](app.js): regras de negócio, renderização e persistência
- [manifest.json](manifest.json): configuração PWA

## Como executar localmente

1. Baixe ou clone este repositório.
2. Abra a pasta no VS Code.
3. Abra o arquivo [index.html](index.html) no navegador.

Observação: para melhor experiência de PWA e testes em mobile, é recomendado servir com um servidor local simples.

## Publicação no GitHub Pages

1. Suba o projeto para um repositório no GitHub.
2. No repositório, abra Settings.
3. Vá em Pages.
4. Em Build and deployment, escolha Deploy from a branch.
5. Selecione a branch principal e a pasta raiz.
6. Salve e aguarde a URL pública ser gerada.

## Persistência de dados

Os dados são salvos localmente no navegador do usuário com LocalStorage.

Isso significa:

- Os dados permanecem no mesmo dispositivo e navegador
- Não há sincronização automática entre dispositivos
- Limpar dados do navegador remove os registros locais

## Backup e restauração

Na tela Gerenciar existem três ações:

- Exportar JSON: gera um arquivo de backup com treinos e progresso
- Importar JSON: restaura dados a partir de arquivo compatível
- Zerar dados: apaga todos os dados locais após confirmação

## Formato do arquivo de exportação

O backup inclui:

- version
- exportedAt
- workouts
- sessions

O import aceita:

- Objeto completo com workouts e sessions
- Array direto de workouts

## Acessibilidade e UX

- Navegação por views Treinar e Gerenciar
- Ações críticas com confirmação
- Estados vazios para orientar primeiro uso
- Responsividade para mobile e desktop

## Limitações atuais

- Dados locais sem conta de usuário
- Sem sincronização em nuvem
- Sem backend dedicado


## Crédito

Criado por Lucas Martins.
