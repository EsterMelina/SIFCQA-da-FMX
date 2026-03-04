# Funcionalidades necessárias

## 1. Gestão de Membros

- Registo de novos membros (jogador, árbitro, treinador)
- Edição de dados pessoais
- Upload de documentos (BI, foto, comprovativo)
- Alteração de clube
- Histórico de membro

## 2. Gestão de Clubes

- Registo de clubes
- Associação de membros a clubes
- Listagem de membros por clube
- Estado do clube (activo/inactivo)

## 3. Gestão de Licenças

- Emissão de licença anual
- Definição de validade
- Renovação automática após pagamento
- Verificação de estado (activa, expirada, suspensa)

## 4. Gestão de Quotas e Pagamentos

- Registo de pagamento manual ou online
- Integração com método de pagamento
- Geração automática de recibo
- Histórico de pagamentos
- Relatório de receitas por período

## 5. Controlo de Acesso

- Perfis de utilizador (Admin FMX, Associação, Clube, Membro)
- Permissões por perfil
- Login e autenticação segura

## 6. Relatórios

- Lista de membros activos
- Lista de membros por província
- Relatório financeiro
- Exportação em PDF/Excel

## 7. Notificações

- Aviso de expiração de licença
- Confirmação de pagamento
- Aviso de suspensão

---

# Tarefas e fluxos principais

## 1. Administrador FMX

- Aprova novos membros
- Regista clubes
- Suspende ou activa membros
- Gera relatórios institucionais
- Consulta receitas

## 2. Associação Provincial

- Regista membros
- Atualiza dados dos membros
- Consulta membros provinciais
- Gera relatórios locais
- Exporta lista de jogadores aptos

## 3. Membro

- Actualiza perfil
- Efectua pagamento de quotas
- Verifica histórico de pagamento de quotas
- Baixa recibo

---

# Regras de negócio

- Membro só é **“Activo”** se quota estiver paga.
- Associações só podem gerir seus próprios membros.
- Apenas Admin pode suspender membros.
- Membro suspenso **não pode competir**.

---

# Casos Especiais

### Mudança de Clube

- Histórico deve ser mantido.
- Associação anterior perde permissão de gestão.

### Membro com sanção disciplinar

- Estado muda para **“Suspenso”**.
- Bloqueio automático de renovação.
- **Não permitir duplicação de membro**.
