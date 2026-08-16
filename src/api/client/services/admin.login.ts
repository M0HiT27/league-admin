import api from '../axios-instance';
import { API_ENDPOINTS } from '../endpoints';

export const adminLoginService = {
    async loginAdmin(username: string, password: string): Promise<{ token: string }> {
        const response = await api.post(API_ENDPOINTS.ADMIN.LOGIN, { username, password });
        return response.data;
    },
    async logoutAdmin(): Promise<void> {
        await api.post(API_ENDPOINTS.ADMIN.LOGOUT);
    }
}