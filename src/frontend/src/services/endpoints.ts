export const endpoints = {
  auth: {
    login: "/auth/login",
    forgotPassword: "/auth/forgot-password",
    resetPassword: "/auth/reset-password",
    logout: "/auth/logout",
    me: "/auth/me",
  },

  users: {
    base: "/users",
    updateRole: (id: number | string) => `/users/${id}/role`,
  },

  associations: {
    base: "/associations",
    detail: (id: number | string) => `/associations/${id}`,
    store: "/associations",
    update: (id: number | string) => `/associations/${id}`,
    toggleStatus: (id: number | string) => `/associations/${id}/status`,
  },

  players: {
    base: "/players",
    detail: (id: number | string) => `/players/${id}`,
    eligibility: (id: number | string) => `/players/${id}/eligibility`,

    me: "/players/me",
    myQuotas: "/players/me/quotas",
    myTransfers: "/players/me/transfers",
    updateMe: "/players/me",
    submitLetter: "/players/me/letters",

    quotas: (id: number | string) => `/players/${id}/quotas`,
    transfers: (id: number | string) => `/players/${id}/transfers`,
  },

  quotas: {
    base: "/quotas",
    playerQuotas: (playerId: number | string) =>
      `/players/${playerId}/quotas`,
  },

  payments: {
    base: "/payments",
    confirm: (id: number | string) => `/payments/${id}/confirm`,
  },

  transfers: {
    base: "/transfers",
    cancel: (id: number | string) => `/transfers/${id}/cancel`,
    playerTransfers: (playerId: number | string) =>
      `/players/${playerId}/transfers`,
  },

  tournaments: {
    base: "/tournaments",
    eligible: (id: number | string) =>
      `/tournaments/${id}/eligible`,
    register: (id: number | string) =>
      `/tournaments/${id}/register`,
  },

  reports: {
    dashboard: "/reports/dashboard",
    players: "/reports/players",
    quotas: "/reports/quotas",
    transfers: "/reports/transfers",
    export: "/reports/export",
  },

  audit: {
    logs: "/audit/logs",
    detail: (id: number | string) => `/audit/logs/${id}`,
  },

  public: {
    provinces: "/provinces",
  },
};