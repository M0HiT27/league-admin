import ExcelJS from 'exceljs';
import api from '../axios-instance';
import { API_ENDPOINTS } from '../endpoints';

// ── RESTORED from old service ───────────────────────────────────────────

export interface ClientGame {
  id: number;
  name: string;
  genre: string;
  requiredPlayers: number;
  difficulty: "LIGHT" | "HEAVY" | "MEDIUM" | null;
  maxSlots: number;
  estimatedRuntimeMinutes: number;
  currentBookedSlots: number;
  availableSlots: number;
}

export interface ClientPass {
  id: number;
  name: string;
  description: string;
  requiredSelectionCount: number;
  minimumDifficultGamesToSelect: number;
  pricing: {
    basePrice: number;
    discountedPrice: number;
    hasActiveDiscount: boolean;
    discountPercent: number;
    savings: number;
    discountName: string | null;
    discountEndsAtMs: number | null;
  };
  games: ClientGame[];
  kit?: {
    id: number;
    name: string;
    items: {
      id: number;
      name: string;
    }[];
  }
}

// ── shared response envelope ────────────────────────────────────────────
// NOTE: new service added `message` here as required. Made it optional
// below so getAll/getById (old endpoints, which never returned `message`)
// stay type-safe — worth confirming the actual GET_PASSES response shape.
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface PurchasePassResponse {
  transactionId: number;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

// NOTE: new service added `amount_paid` here (used by purchaseCashPass).
// Made it optional so the old purchaseAPass (razorpay) call sites, which
// never sent this field, keep compiling as-is. Flag if amount_paid should
// actually be required/sent on the razorpay path too.
interface PurchasePassPayload {
  pass_id: number;
  selected_game_ids: number[];
  buyer: {
    name: string;
    email: string;
    mobile: string;
    dial_code: string;
    city: string;
    pincode: string;
    address: string;
  };
  amount_paid?: number;
}

// ── new service types (unchanged) ───────────────────────────────────────

export interface PlayerDTO {
    playerName: string;
    playerNumber: string;
    email: string;
    address: string;
    city: string;
    selectedGames: string[];
    purchaseTime: string;
    amountPaid: number | null;
    modeOfPayment: string | null;
    invoiceUrl: string | null;
}

export interface PassDTO {
    id: number;
    name: string;
    players: PlayerDTO[];
}

export interface PaginationMeta {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

export interface GetPassPurchasesResponse {
    success: boolean;
    data: PassDTO[];
    meta: PaginationMeta | null;
    error?: string;
}

export interface DownloadPurchaseDataOptions {
    type: "passwise" | "gamewise";
}

export interface PurchaseSummaryDTO {
    purchase_id: number;
    person_name: string;
    pass_name: string;
    pass_id: number;
    status: string;
    purchase_time: string;
}

export interface GetPurchasesByEmailResponse {
    email: string;
    count: number;
    purchases: PurchaseSummaryDTO[];
}

export interface SelectedGameDTO {
    id: number;
    name: string;
    genre: string;
    difficulty: 'LIGHT' | 'MEDIUM' | 'HEAVY' | null;
    estimated_runtime_minutes: number | null;
}

export interface GetSelectedGamesResponse {
    purchase_id: number;
    status: string;
    pass: {
        id: number;
        name: string;
        required_selection_count: number;
        minimum_difficult_games_to_select: number;
    };
    selected_games: SelectedGameDTO[];
    selected_count: number;
    heavy_selected_count: number;
}

export interface UpdateSelectedGamesResponse {
    message: string;
    purchase_id: number;
    game_ids: number[];
    added: number[];
    removed: number[];
}

function extractErrorMessage(err: any, fallback: string): string {
    return (
        err?.response?.data?.error ??
        err?.response?.data?.message ??
        err?.message ??
        fallback
    );
}

const COLUMNS_PASSWISE = [
    { header: 'Player Name', key: 'playerName', width: 24 },
    { header: 'Player Number', key: 'playerNumber', width: 18 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Address', key: 'address', width: 30 },
    { header: 'City', key: 'city', width: 16 },
    { header: 'Game', key: 'game', width: 24 },
    { header: 'Purchase Time', key: 'purchaseTime', width: 22 },
    { header: 'Amount Paid', key: 'amountPaid', width: 14 },
    { header: 'Mode of Payment', key: 'modeOfPayment', width: 16 },
    { header: 'Invoice URL', key: 'invoiceUrl', width: 40 },
];

function sanitizeSheetName(name: string, usedNames: Set<string>): string {
    const safe = String(name).replace(/[:\\/?*[\]]/g, '-').trim().slice(0, 31) || 'Sheet';

    let candidate = safe;
    let suffix = 2;
    while (usedNames.has(candidate)) {
        const suffixStr = ` (${suffix})`;
        candidate = safe.slice(0, 31 - suffixStr.length) + suffixStr;
        suffix++;
    }
    usedNames.add(candidate);
    return candidate;
}

function buildPasswiseWorkbook(passes: PassDTO[]): ExcelJS.Workbook {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'passPurchasesService';
    workbook.created = new Date();

    const usedNames = new Set<string>();

    for (const pass of passes) {
        const sheet = workbook.addWorksheet(sanitizeSheetName(pass.name, usedNames));
        sheet.columns = COLUMNS_PASSWISE;
        sheet.getRow(1).font = { bold: true };
        sheet.views = [{ state: 'frozen', ySplit: 1 }];

        for (const player of pass.players || []) {
            const games = player.selectedGames && player.selectedGames.length > 0
                ? player.selectedGames
                : [null];

            games.forEach((game, index) => {
                sheet.addRow({
                    playerName: index === 0 ? player.playerName ?? '' : '',
                    playerNumber: index === 0 ? player.playerNumber ?? '' : '',
                    email: index === 0 ? player.email ?? '' : '',
                    address: index === 0 ? player.address ?? '' : '',
                    city: index === 0 ? player.city ?? '' : '',
                    game: game ?? '',
                    purchaseTime: index === 0 ? player.purchaseTime ?? '' : '',
                    amountPaid: index === 0 ? player.amountPaid ?? '' : '',
                    modeOfPayment: index === 0 ? player.modeOfPayment ?? '' : '',
                    invoiceUrl: index === 0 ? player.invoiceUrl ?? '' : '',
                });
            });
        }

        sheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: 1, column: COLUMNS_PASSWISE.length },
        };
    }

    return workbook;
}

export interface GamePlayerDTO {
    playerName: string;
    playerNumber: string;
    email: string;
    address: string;
    city: string;
    passId: number;
    passName: string;
    purchaseTime: string;
    amountPaid: number | null;
    modeOfPayment: string | null;
    invoiceUrl: string | null;
}

export interface GameDTO {
    id: number;
    name: string;
    players: GamePlayerDTO[];
}

export interface GetGamesWithPlayersResponse {
    success: boolean;
    data: GameDTO[];
    meta: PaginationMeta | null;
    error?: string;
}

const COLUMNS_GAMEWISE = [
    { header: 'Player Name', key: 'playerName', width: 24 },
    { header: 'Player Number', key: 'playerNumber', width: 18 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Address', key: 'address', width: 30 },
    { header: 'City', key: 'city', width: 16 },
    { header: 'Pass', key: 'passName', width: 24 },
    { header: 'Purchase Time', key: 'purchaseTime', width: 22 },
    { header: 'Amount Paid', key: 'amountPaid', width: 14 },
    { header: 'Mode of Payment', key: 'modeOfPayment', width: 16 },
    { header: 'Invoice URL', key: 'invoiceUrl', width: 40 },
];

function buildGamewiseWorkbook(games: GameDTO[]): ExcelJS.Workbook {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'passPurchasesService';
    workbook.created = new Date();

    const usedNames = new Set<string>();

    for (const game of games) {
        const sheet = workbook.addWorksheet(sanitizeSheetName(game.name, usedNames));
        sheet.columns = COLUMNS_GAMEWISE;
        sheet.getRow(1).font = { bold: true };
        sheet.views = [{ state: 'frozen', ySplit: 1 }];

        for (const player of game.players || []) {
            sheet.addRow({
                playerName: player.playerName ?? '',
                playerNumber: player.playerNumber ?? '',
                email: player.email ?? '',
                address: player.address ?? '',
                city: player.city ?? '',
                passName: player.passName ?? '',
                purchaseTime: player.purchaseTime ?? '',
                amountPaid: player.amountPaid ?? '',
                modeOfPayment: player.modeOfPayment ?? '',
                invoiceUrl: player.invoiceUrl ?? '',
            });
        }

        sheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: 1, column: COLUMNS_GAMEWISE.length },
        };
    }

    return workbook;
}

export const passService = {
    // ── RESTORED from old service ───────────────────────────────────────
    getAll: async (): Promise<ClientPass[]> => {
        const response = await api.get<ApiResponse<ClientPass[]>>(API_ENDPOINTS.PASS.GET_PASSES);

        if (!response.data.success || !response.data.data) {
            throw new Error(response.data.error || 'Failed to fetch passes');
        }

        return response.data.data;
    },

    getById: async (id: string): Promise<ClientPass> => {
        const response = await api.get<ApiResponse<ClientPass>>(API_ENDPOINTS.PASS.GET_PASS_BY_ID(id));

        if (!response.data.success || !response.data.data) {
            throw new Error(response.data.error || `Failed to fetch pass with ID: ${id}`);
        }

        return response.data.data;
    },

    purchaseAPass: async (data: PurchasePassPayload): Promise<PurchasePassResponse> => {
        try {
            const response = await api.post<ApiResponse<PurchasePassResponse>>(
                API_ENDPOINTS.PURCHASE.PURCHASE_A_PASS,
                data
            );

            if (!response.data.success || !response.data.data) {
                throw new Error(response.data.error || 'Failed to purchase a pass');
            }

            return response.data.data;
        } catch (err: any) {
            const message =
                err?.response?.data?.error ?? err?.message ?? 'Failed to purchase a pass';
            throw new Error(message);
        }
    },

    // ── new service methods (unchanged) ───────────────────────────────────
    async getAllPassPurchasesWithPlayers(
        page: number = 1,
        pageSize: number = 10
    ): Promise<GetPassPurchasesResponse> {
        const response = await api.get(API_ENDPOINTS.ADMIN.GET_ALL_PASS_PURCHASES_WITH_PLAYERS, {
            params: { page, pageSize },
        });
        return response.data;
    },

    async getAllGamesWithPlayers() {
        const response = await api.get(API_ENDPOINTS.ADMIN.GET_ALL_GAMES_WITH_PLAYERS);
        return response.data;
    },

    async downloadPurchaseDataAsExcel(options: DownloadPurchaseDataOptions): Promise<Blob> {
        if (options.type !== "passwise" && options.type !== "gamewise") {
            throw new Error("Invalid type. Must be 'passwise' or 'gamewise'.");
        }

        if (options.type === "gamewise") {
            const games = await this.getAllGamesWithPlayers();
            const workbook = buildGamewiseWorkbook(games.data || []);

            const buffer = await workbook.xlsx.writeBuffer();
            return new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
        }

        const passes = await this.getAllPassPurchasesWithPlayers();
        const workbook = buildPasswiseWorkbook(passes.data || []);

        const buffer = await workbook.xlsx.writeBuffer();
        return new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
    },

    async purchaseCashPass(data: PurchasePassPayload): Promise<string> {
        try {
            const response = await api.post(
                API_ENDPOINTS.PURCHASE.PURCHASE_CASH_PASS,
                data
            );

            if (!response.data.success) {
                throw new Error(response.data.error || 'Failed to purchase a pass');
            }

            return response.data.message;
        } catch (err: any) {
            const message =
                err?.response?.data?.message ?? err?.response?.data?.error ?? err?.message ?? 'Failed to purchase a pass';
            throw new Error(message);
        }
    },

    async getPurchasesByEmail(email: string): Promise<GetPurchasesByEmailResponse> {
        try {
            const response = await api.get(
                API_ENDPOINTS.PURCHASE.GET_PURCHASE_BY_EMAIL(encodeURIComponent(email))
            );
            return response.data;
        } catch (err: any) {
            throw new Error(extractErrorMessage(err, 'Failed to fetch purchases for this email'));
        }
    },

    async getSelectedGamesInPurchase(purchaseId: number): Promise<GetSelectedGamesResponse> {
        try {
            const response = await api.get(
                API_ENDPOINTS.PURCHASE.GET_SELECTED_GAMES_IN_PURCHASE(purchaseId)
            );
            return response.data;
        } catch (err: any) {
            throw new Error(extractErrorMessage(err, 'Failed to fetch selected games for this purchase'));
        }
    },

    async updateSelectedGamesInPurchase(
        purchaseId: number,
        gameIds: number[]
    ): Promise<UpdateSelectedGamesResponse> {
        try {
            const response = await api.put(
                API_ENDPOINTS.PURCHASE.CHANGE_SELECTED_GAMES_IN_PURCHASE(purchaseId),
                { game_ids: gameIds }
            );
            return response.data;
        } catch (err: any) {
            throw new Error(extractErrorMessage(err, 'Failed to update selected games for this purchase'));
        }
    },
};