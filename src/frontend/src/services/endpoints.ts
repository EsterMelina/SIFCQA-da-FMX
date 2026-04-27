// export const endpoints = {
//   auth: {
//     login: "/auth/login",
//     forgotPassword: "/auth/forgot-password",
//     resetPassword: "/auth/reset-password",
//     logout: "/auth/logout",
//     me: "/auth/me",
//   },

//   users: {
//     base: "/users",
//     updateRole: (id: number | string) => `/users/${id}/role`,
//   },

//   associations: {
//     base: "/associations",
//     detail: (id: number | string) => `/associations/${id}`,
//     store: "/associations",
//     update: (id: number | string) => `/associations/${id}`,
//     toggleStatus: (id: number | string) => `/associations/${id}/status`,
//   },

//   players: {
//     base: "/players",
//     detail: (id: number | string) => `/players/${id}`,
//     eligibility: (id: number | string) => `/players/${id}/eligibility`,

//     me: "/players/me",
//     myQuotas: "/players/me/quotas",
//     myTransfers: "/players/me/transfers",
//     updateMe: "/players/me",
//     submitLetter: "/players/me/letters",

//     quotas: (id: number | string) => `/players/${id}/quotas`,
//     transfers: (id: number | string) => `/players/${id}/transfers`,
//   },

//   quotas: {
//     base: "/quotas",
//     playerQuotas: (playerId: number | string) =>
//       `/players/${playerId}/quotas`,
//   },

//   payments: {
//     base: "/payments",
//     confirm: (id: number | string) => `/payments/${id}/confirm`,
//   },

//   transfers: {
//     base: "/transfers",
//     cancel: (id: number | string) => `/transfers/${id}/cancel`,
//     playerTransfers: (playerId: number | string) =>
//       `/players/${playerId}/transfers`,
//   },

//   tournaments: {
//     base: "/tournaments",
//     eligible: (id: number | string) =>
//       `/tournaments/${id}/eligible`,
//     register: (id: number | string) =>
//       `/tournaments/${id}/register`,
//   },

//   reports: {
//     dashboard: "/reports/dashboard",
//     players: "/reports/players",
//     quotas: "/reports/quotas",
//     transfers: "/reports/transfers",
//     export: "/reports/export",
//   },

//   audit: {
//     logs: "/audit/logs",
//     detail: (id: number | string) => `/audit/logs/${id}`,
//   },

//   public: {
//     provinces: "/provinces",
//   },
// };


export const endpoints = {
  auth: {
    login: "/auth/login",
    forgotPassword: "/auth/forgot-password",
    resetPassword: "/auth/reset-password",
    setPassword: "/auth/set-password",      // existe
    logout: "/auth/logout",
    me: "/auth/me",
  },

  users: {
    base: "/admin/users",                   // prefixo admin, ok
    updateRole: (id: number | string) => `/admin/users/${id}/role`,
    invite: "/admin/users/invite",
  },

  associations: {
    base: "/admin/associations",            // admin cria/edita
    list: "/fmx/associations",              // fmx pode listar
    store: "/fmx/associations",             // fmx pode criar
    detail: (id: number | string) => `/admin/associations/${id}`,
    update: (id: number | string) => `/admin/associations/${id}`,
    toggleStatus: (id: number | string) => `/admin/associations/${id}/status`, // ⚠️ endpoint não existe
    // members
    members: (associationId: number | string) => `/associations/${associationId}/members`,
    storeMember: (associationId: number | string) => `/associations/${associationId}/members`,
    // players dentro da associação
    associationPlayers: (associationId: number | string) => `/associations/${associationId}/players`,
  },

  players: {
    base: "/players",
    me: "/players/me",
    // myQuotas: "/players/me/quotas",        ⚠️ não existe
    // myTransfers: "/players/me/transfers",  ⚠️ não existe
    // submitLetter: "/players/me/letters",   ⚠️ não existe
    transferRequest: "/players/transfer-request", // existe
    // quotas: (id: string) => `/players/${id}/quotas`,  ⚠️ não existe
    // transfers: (id: string) => `/players/${id}/transfers`, ⚠️ não existe
  },

  // Comente blocos inteiros que não têm suporte:
  // quotas: { ... },
  // payments: { ... },
  // transfers: { ... },
  // tournaments: { ... },
  // reports: { ... },
  // audit: { ... },

  public: {
    provinces: "/provinces",   // ⚠️ Não vi a rota, mas pode existir
  },
};