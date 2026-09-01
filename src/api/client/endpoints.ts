export const API_ENDPOINTS = {
  PASS: {
    GET_PASSES: '/api/passes',
    GET_PASS_BY_ID: (id: string) => `/api/passes/${id}`,
  },
  PURCHASE:{
    PURCHASE_A_PASS:"/api/purchases",
    PURCHASE_CASH_PASS :"/api/auth/purchase",
    GET_PURCHASE_BY_EMAIL:(email: string) => `/api/auth/purchase?email=${email}`,
    GET_SELECTED_GAMES_IN_PURCHASE:(purchaseId:number) => `/api/auth/purchase/${purchaseId}/selected-games`,
    CHANGE_SELECTED_GAMES_IN_PURCHASE:(purchaseId:number) => `/api/auth/purchase/${purchaseId}/selected-games`,

  },
  ADMIN:{
    LOGIN:"/api/admin/login",
    LOGOUT:"/api/admin/logout",
    GET_ALL_PASS_PURCHASES_WITH_PLAYERS:"/api/auth/passes/with-players",
    GET_ALL_GAMES_WITH_PLAYERS:"/api/auth/games/with-players",
  }
} as const;