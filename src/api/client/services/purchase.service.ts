import ExcelJS from 'exceljs';
import api from '../axios-instance';
import { API_ENDPOINTS } from '../endpoints';
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message : string
}
interface PurchasePassResponse {
  transactionId: number;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
}
interface PurchasePassPayload {
  pass_id: number;
  selected_game_ids: number[];
  buyer: {
    name: string;
    email: string;
    mobile: string;
    dial_code:string;
    city: string;
    pincode: string;
    address: string;
  };
  amount_paid : number
}
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

/** Excel sheet names: max 31 chars, and can't contain : \ / ? * [ ] */
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

/** One sheet per pass; one row per player-game (mirrors export-passes.js). */
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

/** One sheet per game; one row per player. No selectedGames column — redundant once scoped per-game. */
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

export const passPurchasesService = {
    async getAllPassPurchasesWithPlayers(
        page: number = 1,
        pageSize: number = 10
    ): Promise<GetPassPurchasesResponse> {
        const response = await api.get(API_ENDPOINTS.ADMIN.GET_ALL_PASS_PURCHASES_WITH_PLAYERS, {
            params: { page, pageSize },
        });
        return response.data;
    },
    async getAllGamesWithPlayers(){
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

    async purchaseCashPass (data: PurchasePassPayload): Promise<string> {
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
    }}
};