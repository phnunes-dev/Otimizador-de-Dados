# 🚀 Otimizador de Dados | Agentic Data Steward

Solução inteligente para tratamento e estruturação de dados não estruturados.

Este projeto foi desenvolvido para resolver um dos maiores gargalos operacionais em empresas: o tratamento de dados "sujos". A aplicação utiliza Inteligência Artificial para interpretar, limpar e categorizar informações vindas de planilhas e PDFs, automatizando a inserção em bancos de dados estruturados.

🛠️ Tecnologias e Arquitetura
Frontend: React.js com TypeScript (Interface performática e tipagem estrita).

Backend & DB: Supabase (PostgreSQL) para persistência e autenticação.

Inteligência Artificial: Integração com APIs da OpenAI/Gemini para processamento de linguagem natural e tomada de decisão agentic.

Estilização: Tailwind CSS para um design limpo e responsivo.

💡 Diferenciais Técnicos
Processamento Multimodal: Capaz de extrair valor tanto de tabelas quanto de documentos em PDF.

Redução de Custos: Automatiza tarefas que antes exigiriam horas de trabalho manual, minimizando erros humanos.

Segurança: Implementação de boas práticas de gestão de segredos e variáveis de ambiente via .gitignore.

🚀 Como executar o projeto localmente
Clone o repositório:
git clone https://github.com/PedroNunesBM/Otimizador-de-Dados.git

Instale as dependências:
npm install

Configure seu arquivo .env baseando-se no .env.example.

Inicie o servidor de desenvolvimento:
npm run dev

Desenvolvido por Pedro Nunes
Cadete e Aspirante a Engenheiro de Automação

Por que essa versão é melhor?
Termos Técnicos: Usar "dados não estruturados", "persistência", "tipagem estrita" e "multimodal" mostra que você entende a teoria por trás da ferramenta.

Link de Perfil: Pedro Nunes https://www.linkedin.com/in/pedro-nunes-2b0b77349/

Instruções de Execução:

```markdown
## 🛠️ Instruções de Execução (Local Setup)

Para rodar este projeto localmente, siga os passos abaixo:

### 1. Pré-requisitos
Certifique-se de ter o [Node.js](https://nodejs.org/) instalado (versão 18 ou superior).

### 2. Clonar o Repositório
```bash
git clone [https://github.com/PedroNunesBM/Otimizador-de-Dados.git](https://github.com/PedroNunesBM/Otimizador-de-Dados.git)
cd Otimizador-de-Dados
```

### 3. Instalar Dependências
```bash
npm install
```

### 4. Configurar Variáveis de Ambiente
Crie um arquivo na raiz do projeto chamado `.env` e adicione as suas chaves (utilize o `.env.example` como referência):
```env
VITE_SUPABASE_URL=sua_url_aqui
VITE_SUPABASE_ANON_KEY=sua_chave_aqui
VITE_OPENAI_API_KEY=sua_chave_aqui
```

### 5. Iniciar o Servidor de Desenvolvimento
```bash
npm run dev
```
O projeto estará disponível em `http://localhost:5173`.
```
