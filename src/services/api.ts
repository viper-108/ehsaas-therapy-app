const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5001/api');

class ApiService {
  private getHeaders(includeAuth = true): HeadersInit {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (includeAuth) {
      const token = localStorage.getItem('ehsaas_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  private async handleResponse(response: Response) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong');
    }
    return data;
  }

  // Auth
  async therapistRegister(body: any) {
    const res = await fetch(`${API_BASE}/auth/therapist/register`, {
      method: 'POST', headers: this.getHeaders(false), body: JSON.stringify(body)
    });
    return this.handleResponse(res);
  }

  async therapistLogin(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/therapist/login`, {
      method: 'POST', headers: this.getHeaders(false), body: JSON.stringify({ email, password })
    });
    return this.handleResponse(res);
  }

  async clientRegister(body: any) {
    const res = await fetch(`${API_BASE}/auth/client/register`, {
      method: 'POST', headers: this.getHeaders(false), body: JSON.stringify(body)
    });
    return this.handleResponse(res);
  }

  async clientLogin(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/client/login`, {
      method: 'POST', headers: this.getHeaders(false), body: JSON.stringify({ email, password })
    });
    return this.handleResponse(res);
  }

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  async updateClientProfile(body: any) {
    const res = await fetch(`${API_BASE}/auth/client/profile`, {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify(body)
    });
    return this.handleResponse(res);
  }

  // Therapists (public)
  async getTherapists(params?: { specialization?: string; language?: string; search?: string }) {
    const query = new URLSearchParams(params as any).toString();
    const res = await fetch(`${API_BASE}/therapists?${query}`, { headers: this.getHeaders(false) });
    return this.handleResponse(res);
  }

  async getTherapist(id: string) {
    const res = await fetch(`${API_BASE}/therapists/${id}`, { headers: this.getHeaders(false) });
    return this.handleResponse(res);
  }

  async getAvailableSlots(therapistId: string, date: string) {
    const res = await fetch(`${API_BASE}/therapists/${therapistId}/available-slots?date=${date}`, {
      headers: this.getHeaders(false)
    });
    return this.handleResponse(res);
  }

  // Therapist Dashboard
  async getTherapistDashboardProfile() {
    const res = await fetch(`${API_BASE}/therapists/dashboard/profile`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  async updateTherapistProfile(body: any) {
    const res = await fetch(`${API_BASE}/therapists/dashboard/profile`, {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify(body)
    });
    return this.handleResponse(res);
  }

  async updateTherapistAvailability(availability: any[]) {
    const res = await fetch(`${API_BASE}/therapists/dashboard/availability`, {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify({ availability })
    });
    return this.handleResponse(res);
  }

  async getTherapistSessions(timeframe?: string) {
    const query = timeframe ? `?timeframe=${timeframe}` : '';
    const res = await fetch(`${API_BASE}/therapists/dashboard/sessions${query}`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  async getTherapistStats() {
    const res = await fetch(`${API_BASE}/therapists/dashboard/stats`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  async updateSessionStatus(sessionId: string, status: string) {
    const res = await fetch(`${API_BASE}/therapists/dashboard/sessions/${sessionId}/status`, {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify({ status })
    });
    return this.handleResponse(res);
  }

  // Client Sessions
  async bookSession(body: any) {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify(body)
    });
    return this.handleResponse(res);
  }

  async getClientSessions(timeframe?: string) {
    const query = timeframe ? `?timeframe=${timeframe}` : '';
    const res = await fetch(`${API_BASE}/sessions/my${query}`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  async requestSessionRefund(sessionId: string) {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/refund-request`, {
      method: 'POST', headers: this.getHeaders()
    });
    return this.handleResponse(res);
  }

  async cancelSession(sessionId: string, reason?: string) {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/cancel`, {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify({ reason: reason || '' })
    });
    return this.handleResponse(res);
  }

  // Payments
  async createCheckout(body: any) {
    const res = await fetch(`${API_BASE}/payments/create-checkout`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify(body)
    });
    return this.handleResponse(res);
  }

  async confirmPayment(paymentId: string, transactionId?: string) {
    const res = await fetch(`${API_BASE}/payments/confirm`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify({ paymentId, transactionId })
    });
    return this.handleResponse(res);
  }

  async getPaymentHistory() {
    const res = await fetch(`${API_BASE}/payments/my`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  // Admin auth
  async adminLogin(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/admin/login`, {
      method: 'POST', headers: this.getHeaders(false), body: JSON.stringify({ email, password })
    });
    return this.handleResponse(res);
  }

  // Forgot/Reset password
  async forgotPassword(email: string, role?: string) {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST', headers: this.getHeaders(false), body: JSON.stringify({ email, role })
    });
    return this.handleResponse(res);
  }

  async resetPassword(token: string, role: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST', headers: this.getHeaders(false), body: JSON.stringify({ token, role, password })
    });
    return this.handleResponse(res);
  }

  // OTP login (clients)
  async requestOtp(email: string) {
    const res = await fetch(`${API_BASE}/auth/client/request-otp`, {
      method: 'POST', headers: this.getHeaders(false), body: JSON.stringify({ email })
    });
    return this.handleResponse(res);
  }

  async verifyOtp(email: string, otp: string) {
    const res = await fetch(`${API_BASE}/auth/client/verify-otp`, {
      method: 'POST', headers: this.getHeaders(false), body: JSON.stringify({ email, otp })
    });
    return this.handleResponse(res);
  }

  // OTP login (therapists)
  async requestTherapistOtp(email: string) {
    const res = await fetch(`${API_BASE}/auth/therapist/request-otp`, {
      method: 'POST', headers: this.getHeaders(false), body: JSON.stringify({ email })
    });
    return this.handleResponse(res);
  }

  async verifyTherapistOtp(email: string, otp: string) {
    const res = await fetch(`${API_BASE}/auth/therapist/verify-otp`, {
      method: 'POST', headers: this.getHeaders(false), body: JSON.stringify({ email, otp })
    });
    return this.handleResponse(res);
  }

  // Admin therapist management
  async deleteTherapist(id: string) {
    const res = await fetch(`${API_BASE}/admin/therapists/${id}`, {
      method: 'DELETE', headers: this.getHeaders()
    });
    return this.handleResponse(res);
  }

  async setTherapistCommission(id: string, commissionPercent: number) {
    const res = await fetch(`${API_BASE}/admin/therapists/${id}/commission`, {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify({ commissionPercent })
    });
    return this.handleResponse(res);
  }

  async setTherapistType(id: string, therapistType: string) {
    const res = await fetch(`${API_BASE}/admin/therapists/${id}/type`, {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify({ therapistType })
    });
    return this.handleResponse(res);
  }

  async getMonthlyAnalytics(year?: number, month?: number) {
    const params = new URLSearchParams();
    if (year) params.set('year', String(year));
    if (month !== undefined) params.set('month', String(month));
    const res = await fetch(`${API_BASE}/admin/monthly-analytics?${params}`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  // Session status (therapist marks completed/no-show)
  async setSessionStatus(sessionId: string, status: 'completed' | 'no-show' | 'cancelled') {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/status`, {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify({ status })
    });
    return this.handleResponse(res);
  }

  // Prescriptions
  async createPrescription(data: any) {
    const res = await fetch(`${API_BASE}/prescriptions`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify(data)
    });
    return this.handleResponse(res);
  }

  async getMyPrescriptions() {
    const res = await fetch(`${API_BASE}/prescriptions/my`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  async getClientPrescriptions() {
    const res = await fetch(`${API_BASE}/prescriptions/client`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  async updatePrescription(id: string, data: any) {
    const res = await fetch(`${API_BASE}/prescriptions/${id}`, {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify(data)
    });
    return this.handleResponse(res);
  }

  async deletePrescription(id: string) {
    const res = await fetch(`${API_BASE}/prescriptions/${id}`, {
      method: 'DELETE', headers: this.getHeaders()
    });
    return this.handleResponse(res);
  }

  // Therapist onboarding
  async completeOnboarding() {
    const res = await fetch(`${API_BASE}/therapists/onboard`, {
      method: 'POST', headers: this.getHeaders()
    });
    return this.handleResponse(res);
  }

  // Admin endpoints
  async getPendingTherapists() {
    const res = await fetch(`${API_BASE}/admin/pending-therapists`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  async getAllTherapistsAdmin() {
    const res = await fetch(`${API_BASE}/admin/all-therapists`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  async approveTherapist(id: string) {
    const res = await fetch(`${API_BASE}/admin/therapists/${id}/approve`, {
      method: 'PUT', headers: this.getHeaders()
    });
    return this.handleResponse(res);
  }

  async rejectTherapist(id: string, reason?: string) {
    const res = await fetch(`${API_BASE}/admin/therapists/${id}/reject`, {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify({ reason })
    });
    return this.handleResponse(res);
  }

  async setTherapistInterview(id: string, body: { status: 'interview_scheduled' | 'in_process'; interviewLink?: string; interviewScheduledAt?: string; interviewNotes?: string }) {
    const res = await fetch(`${API_BASE}/admin/therapists/${id}/interview`, {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify(body)
    });
    return this.handleResponse(res);
  }

  async revokeTherapistApproval(id: string, reason?: string) {
    const res = await fetch(`${API_BASE}/admin/therapists/${id}/revoke-approval`, {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify({ reason: reason || '' })
    });
    return this.handleResponse(res);
  }

  async revokeReview(id: string) {
    const res = await fetch(`${API_BASE}/admin/reviews/${id}/revoke`, {
      method: 'PUT', headers: this.getHeaders()
    });
    return this.handleResponse(res);
  }

  async revokePriceNegotiation(id: string) {
    const res = await fetch(`${API_BASE}/admin/price-negotiations/${id}/revoke`, {
      method: 'PUT', headers: this.getHeaders()
    });
    return this.handleResponse(res);
  }

  async setTherapistPricing(id: string, body: { pricing?: any; pricingMin?: any }) {
    const res = await fetch(`${API_BASE}/admin/therapists/${id}/pricing`, {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify(body)
    });
    return this.handleResponse(res);
  }

  async transferClient(body: { clientId: string; fromTherapistId: string; toTherapistId: string; reason?: string }) {
    const res = await fetch(`${API_BASE}/admin/transfer-client`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify(body)
    });
    return this.handleResponse(res);
  }

  // === Price Negotiations ===
  async enablePriceNegotiation(body: { clientId: string; therapistId?: string; duration: string }) {
    const res = await fetch(`${API_BASE}/price-negotiations/enable`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify(body)
    });
    return this.handleResponse(res);
  }
  async proposePrice(id: string, proposedPrice: number) {
    const res = await fetch(`${API_BASE}/price-negotiations/${id}/propose`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify({ proposedPrice })
    });
    return this.handleResponse(res);
  }
  async approvePriceNegotiation(id: string) {
    const res = await fetch(`${API_BASE}/price-negotiations/${id}/approve`, {
      method: 'POST', headers: this.getHeaders()
    });
    return this.handleResponse(res);
  }
  async rejectPriceNegotiation(id: string, reason?: string) {
    const res = await fetch(`${API_BASE}/price-negotiations/${id}/reject`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify({ reason: reason || '' })
    });
    return this.handleResponse(res);
  }
  async getMyPriceNegotiations() {
    const res = await fetch(`${API_BASE}/price-negotiations/my`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  async getAllClients() {
    const res = await fetch(`${API_BASE}/admin/all-clients`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  async getAllSessions() {
    const res = await fetch(`${API_BASE}/admin/all-sessions`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  async getTherapistDetails(id: string) {
    const res = await fetch(`${API_BASE}/admin/therapists/${id}/details`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  async getClientDetails(id: string) {
    const res = await fetch(`${API_BASE}/admin/clients/${id}/details`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  async getAdminStats() {
    const res = await fetch(`${API_BASE}/admin/stats`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  // Reviews
  async createReview(sessionId: string, rating: number, comment: string) {
    const res = await fetch(`${API_BASE}/reviews`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify({ sessionId, rating, comment })
    });
    return this.handleResponse(res);
  }

  async getTherapistReviews(therapistId: string) {
    const res = await fetch(`${API_BASE}/reviews/therapist/${therapistId}`, { headers: this.getHeaders(false) });
    return this.handleResponse(res);
  }

  async getMyReviews() {
    const res = await fetch(`${API_BASE}/reviews/my`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  async getAllReviews() {
    const res = await fetch(`${API_BASE}/admin/all-reviews`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  async createEhsaasReview(rating: number, comment: string) {
    const res = await fetch(`${API_BASE}/reviews/ehsaas`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify({ rating, comment })
    });
    return this.handleResponse(res);
  }

  async getEhsaasReviews() {
    const res = await fetch(`${API_BASE}/reviews/ehsaas`, { headers: this.getHeaders(false) });
    return this.handleResponse(res);
  }

  async getPendingReviews() {
    const res = await fetch(`${API_BASE}/reviews/admin/pending`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  async approveReview(id: string) {
    const res = await fetch(`${API_BASE}/reviews/admin/${id}/approve`, {
      method: 'PUT', headers: this.getHeaders()
    });
    return this.handleResponse(res);
  }

  async rejectReview(id: string, reason?: string) {
    const res = await fetch(`${API_BASE}/reviews/admin/${id}/reject`, {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify({ reason: reason || '' })
    });
    return this.handleResponse(res);
  }

  // Waitlist
  async joinWaitlist(therapistId: string, date: string) {
    const res = await fetch(`${API_BASE}/waitlist`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify({ therapistId, date })
    });
    return this.handleResponse(res);
  }

  async getMyWaitlist() {
    const res = await fetch(`${API_BASE}/waitlist/my`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  async getTherapistWaitlist() {
    const res = await fetch(`${API_BASE}/waitlist/therapist`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  async leaveWaitlist(id: string) {
    const res = await fetch(`${API_BASE}/waitlist/${id}`, { method: 'DELETE', headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  // Session Notes
  async getSessionNotes(sessionId: string) {
    const res = await fetch(`${API_BASE}/therapists/dashboard/sessions/${sessionId}/notes`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  async updateSessionNotes(sessionId: string, notes: string) {
    const res = await fetch(`${API_BASE}/therapists/dashboard/sessions/${sessionId}/notes`, {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify({ notes })
    });
    return this.handleResponse(res);
  }

  // Recurring Bookings
  async bookRecurring(body: any) {
    const res = await fetch(`${API_BASE}/sessions/recurring`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify(body)
    });
    return this.handleResponse(res);
  }

  async cancelRecurringSeries(groupId: string) {
    const res = await fetch(`${API_BASE}/sessions/recurring/${groupId}`, {
      method: 'DELETE', headers: this.getHeaders()
    });
    return this.handleResponse(res);
  }

  // Messages
  async getConversations() {
    const res = await fetch(`${API_BASE}/messages/conversations`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  async getMessages(conversationKey: string, limit?: number) {
    const q = limit ? `?limit=${limit}` : '';
    const res = await fetch(`${API_BASE}/messages/${conversationKey}${q}`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  async sendMessage(receiverId: string, content: string) {
    const res = await fetch(`${API_BASE}/messages`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify({ receiverId, content })
    });
    return this.handleResponse(res);
  }

  async markMessagesRead(conversationKey: string) {
    const res = await fetch(`${API_BASE}/messages/${conversationKey}/read`, {
      method: 'PUT', headers: this.getHeaders()
    });
    return this.handleResponse(res);
  }

  async getUnreadCount() {
    const res = await fetch(`${API_BASE}/messages/unread/count`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  // Contacts. scope='sessions' = my session contacts; scope='all' = full directory for "Start chat".
  async getContacts(scope: 'sessions' | 'all' = 'sessions') {
    const res = await fetch(`${API_BASE}/messages/contacts?scope=${scope}`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  // === Group chat ===
  async createChatGroup(body: { name: string; description?: string; clientIds: string[] }) {
    const res = await fetch(`${API_BASE}/messages/groups`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify(body)
    });
    return this.handleResponse(res);
  }
  async getMyChatGroups() {
    const res = await fetch(`${API_BASE}/messages/groups/my`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }
  async getGroupMessages(groupId: string) {
    const res = await fetch(`${API_BASE}/messages/groups/${groupId}/messages`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }
  async sendGroupMessage(groupId: string, content: string) {
    const res = await fetch(`${API_BASE}/messages/groups/${groupId}/messages`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify({ content })
    });
    return this.handleResponse(res);
  }

  // Blocks
  async blockUser(blockedId: string, reason?: string) {
    const res = await fetch(`${API_BASE}/blocks`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify({ blockedId, reason })
    });
    return this.handleResponse(res);
  }

  async unblockUser(blockedId: string) {
    const res = await fetch(`${API_BASE}/blocks/${blockedId}`, { method: 'DELETE', headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  async getBlockedUsers() {
    const res = await fetch(`${API_BASE}/blocks`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  async checkBlockStatus(userId: string) {
    const res = await fetch(`${API_BASE}/blocks/check/${userId}`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  // Analytics
  async getAnalytics() {
    const res = await fetch(`${API_BASE}/admin/analytics`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  // Settings
  async getSettings() {
    const res = await fetch(`${API_BASE}/settings`, { headers: this.getHeaders(false) });
    return this.handleResponse(res);
  }

  async getSettingsFull() {
    const res = await fetch(`${API_BASE}/settings/full`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  async updateSetting(key: string, value: any) {
    const res = await fetch(`${API_BASE}/settings/${key}`, {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify({ value })
    });
    return this.handleResponse(res);
  }

  // Intro Calls
  async requestIntroCall(data: any) {
    const res = await fetch(`${API_BASE}/intro-calls`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify(data)
    });
    return this.handleResponse(res);
  }

  async getMyIntroCalls() {
    const res = await fetch(`${API_BASE}/intro-calls/my`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  async getTherapistIntroCalls() {
    const res = await fetch(`${API_BASE}/intro-calls/therapist`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  async updateIntroCallStatus(id: string, status: string) {
    const res = await fetch(`${API_BASE}/intro-calls/${id}/status`, {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify({ status })
    });
    return this.handleResponse(res);
  }

  async getAllIntroCalls() {
    const res = await fetch(`${API_BASE}/intro-calls/all`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  // Client History
  async getClientHistory(clientId: string) {
    const res = await fetch(`${API_BASE}/therapists/dashboard/client-history/${clientId}`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  async saveClientHistory(data: any) {
    const res = await fetch(`${API_BASE}/therapists/dashboard/client-history`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify(data)
    });
    return this.handleResponse(res);
  }

  async updateClientHistory(clientId: string, data: any) {
    const res = await fetch(`${API_BASE}/therapists/dashboard/client-history/${clientId}`, {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify(data)
    });
    return this.handleResponse(res);
  }

  async getClientsNeedingHistory() {
    const res = await fetch(`${API_BASE}/therapists/dashboard/clients-needing-history`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  async getTherapistClients() {
    const res = await fetch(`${API_BASE}/therapists/dashboard/my-clients`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  // Resume Upload
  async uploadResume(file: File) {
    const formData = new FormData();
    formData.append('resume', file);
    const token = localStorage.getItem('ehsaas_token');
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/therapists/dashboard/resume`, {
      method: 'POST', headers, body: formData
    });
    return this.handleResponse(res);
  }

  // Interviews
  async scheduleInterview(data: any) {
    const res = await fetch(`${API_BASE}/admin/interviews`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify(data)
    });
    return this.handleResponse(res);
  }

  async getInterviews() {
    const res = await fetch(`${API_BASE}/admin/interviews`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  async getMyInterviews() {
    const res = await fetch(`${API_BASE}/therapists/dashboard/interviews`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  // Group Sessions
  async getGroupSessions() {
    const res = await fetch(`${API_BASE}/group-sessions`, { headers: this.getHeaders(false) });
    return this.handleResponse(res);
  }

  async getGroupSession(id: string) {
    const res = await fetch(`${API_BASE}/group-sessions/${id}`, { headers: this.getHeaders(false) });
    return this.handleResponse(res);
  }

  async createGroupSession(data: any) {
    const res = await fetch(`${API_BASE}/group-sessions`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify(data)
    });
    return this.handleResponse(res);
  }

  async registerGroupSession(id: string) {
    const res = await fetch(`${API_BASE}/group-sessions/${id}/register`, {
      method: 'POST', headers: this.getHeaders()
    });
    return this.handleResponse(res);
  }

  async getAllGroupSessions() {
    const res = await fetch(`${API_BASE}/group-sessions/all`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  async updateGroupSession(id: string, data: any) {
    const res = await fetch(`${API_BASE}/group-sessions/${id}`, {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify(data)
    });
    return this.handleResponse(res);
  }

  async cancelGroupSession(id: string) {
    const res = await fetch(`${API_BASE}/group-sessions/${id}`, {
      method: 'DELETE', headers: this.getHeaders()
    });
    return this.handleResponse(res);
  }

  async getMyGroupSessions() {
    const res = await fetch(`${API_BASE}/group-sessions/my`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  // Supervision
  async createSupervision(data: any) {
    const res = await fetch(`${API_BASE}/supervision`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify(data)
    });
    return this.handleResponse(res);
  }

  async getMySupervision() {
    const res = await fetch(`${API_BASE}/supervision/my`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  async getAllSupervision() {
    const res = await fetch(`${API_BASE}/supervision/all`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  async approveSupervision(id: string) {
    const res = await fetch(`${API_BASE}/supervision/${id}/approve`, {
      method: 'PUT', headers: this.getHeaders()
    });
    return this.handleResponse(res);
  }

  async rejectSupervision(id: string, notes?: string) {
    const res = await fetch(`${API_BASE}/supervision/${id}/reject`, {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify({ notes })
    });
    return this.handleResponse(res);
  }

  async scheduleSupervision(id: string, data: any) {
    const res = await fetch(`${API_BASE}/supervision/${id}/schedule`, {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify(data)
    });
    return this.handleResponse(res);
  }

  async joinSupervision(id: string, accept: boolean) {
    const res = await fetch(`${API_BASE}/supervision/${id}/join`, {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify({ accept })
    });
    return this.handleResponse(res);
  }

  // Admin Chat Visibility
  async getAdminConversations() {
    const res = await fetch(`${API_BASE}/admin/messages/conversations`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  async getAdminMessages(conversationKey: string) {
    const res = await fetch(`${API_BASE}/admin/messages/${conversationKey}`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  // Payouts
  async getMyPayouts() {
    const res = await fetch(`${API_BASE}/payouts/my`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }
  async saveBankDetails(data: any) {
    const res = await fetch(`${API_BASE}/payouts/bank-details`, {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify(data)
    });
    return this.handleResponse(res);
  }
  async getAdminPayouts() {
    const res = await fetch(`${API_BASE}/payouts/admin`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }
  async processPayout(id: string, data: any) {
    const res = await fetch(`${API_BASE}/payouts/admin/process/${id}`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify(data)
    });
    return this.handleResponse(res);
  }

  // Invoice
  async getInvoice(paymentId: string) {
    const token = localStorage.getItem('ehsaas_token');
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/admin/payments/${paymentId}/invoice`, { headers });
    if (!res.ok) throw new Error('Invoice not found');
    return res.text();
  }

  // Referrals
  async getMyReferrals() {
    const res = await fetch(`${API_BASE}/auth/referrals/my`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  // Progress
  async saveProgress(data: any) {
    const res = await fetch(`${API_BASE}/therapists/dashboard/progress`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify(data)
    });
    return this.handleResponse(res);
  }
  async getClientProgress(clientId: string) {
    const res = await fetch(`${API_BASE}/therapists/dashboard/progress/${clientId}`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }
  async getMyProgress() {
    const res = await fetch(`${API_BASE}/sessions/my/progress`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  // Resources
  async createResource(data: any) {
    const res = await fetch(`${API_BASE}/resources`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify(data)
    });
    return this.handleResponse(res);
  }
  async getMyResources(tab?: 'own' | 'therapist_central' | 'client_central') {
    const q = tab ? `?tab=${tab}` : '';
    const res = await fetch(`${API_BASE}/resources/my${q}`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }
  async getSharedResources(tab?: 'all' | 'assigned' | 'public') {
    const q = tab ? `?tab=${tab}` : '';
    const res = await fetch(`${API_BASE}/resources/shared${q}`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }
  async setResourceVisibility(id: string, visibility: 'private' | 'all_therapists' | 'all_clients' | 'specific_clients') {
    const res = await fetch(`${API_BASE}/resources/${id}/visibility`, {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify({ visibility })
    });
    return this.handleResponse(res);
  }
  async getPublicResources() {
    const res = await fetch(`${API_BASE}/resources/public`, { headers: this.getHeaders(false) });
    return this.handleResponse(res);
  }
  async updateResource(id: string, data: any) {
    const res = await fetch(`${API_BASE}/resources/${id}`, {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify(data)
    });
    return this.handleResponse(res);
  }
  async shareResource(id: string, clientIds: string[]) {
    const res = await fetch(`${API_BASE}/resources/${id}/share`, {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify({ clientIds })
    });
    return this.handleResponse(res);
  }
  async deleteResource(id: string) {
    const res = await fetch(`${API_BASE}/resources/${id}`, { method: 'DELETE', headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  // Blog Posts
  async getBlogPosts() {
    const res = await fetch(`${API_BASE}/blog-posts`, { headers: this.getHeaders(false) });
    return this.handleResponse(res);
  }
  async getBlogPost(id: string) {
    const res = await fetch(`${API_BASE}/blog-posts/${id}`, { headers: this.getHeaders(false) });
    return this.handleResponse(res);
  }
  async getMyBlogPosts() {
    const res = await fetch(`${API_BASE}/blog-posts/my`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }
  async createBlogPost(data: any) {
    const res = await fetch(`${API_BASE}/blog-posts`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify(data)
    });
    return this.handleResponse(res);
  }
  async updateBlogPost(id: string, data: any) {
    const res = await fetch(`${API_BASE}/blog-posts/${id}`, {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify(data)
    });
    return this.handleResponse(res);
  }
  async publishBlogPost(id: string) {
    const res = await fetch(`${API_BASE}/blog-posts/${id}/publish`, {
      method: 'PUT', headers: this.getHeaders()
    });
    return this.handleResponse(res);
  }
  async deleteBlogPost(id: string) {
    const res = await fetch(`${API_BASE}/blog-posts/${id}`, { method: 'DELETE', headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  // Notifications
  async getNotifications(page?: number) {
    const q = page ? `?page=${page}` : '';
    const res = await fetch(`${API_BASE}/notifications${q}`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }
  async getNotificationCount() {
    const res = await fetch(`${API_BASE}/notifications/unread-count`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }
  async markNotificationRead(id: string) {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PUT', headers: this.getHeaders()
    });
    return this.handleResponse(res);
  }
  async markAllNotificationsRead() {
    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'PUT', headers: this.getHeaders()
    });
    return this.handleResponse(res);
  }

  // Feedback Surveys
  async submitFeedback(sessionId: string, data: any) {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/feedback`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify(data)
    });
    return this.handleResponse(res);
  }
  async getAdminFeedback() {
    const res = await fetch(`${API_BASE}/admin/feedback`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  // Discount Codes
  async createDiscountCode(data: any) {
    const res = await fetch(`${API_BASE}/discounts/codes`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify(data)
    });
    return this.handleResponse(res);
  }
  async getDiscountCodes() {
    const res = await fetch(`${API_BASE}/discounts/codes`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }
  async validateDiscountCode(code: string, amount: number) {
    const res = await fetch(`${API_BASE}/discounts/validate`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify({ code, amount })
    });
    return this.handleResponse(res);
  }

  // Session Packages
  async getPackages() {
    const res = await fetch(`${API_BASE}/discounts/packages`, { headers: this.getHeaders(false) });
    return this.handleResponse(res);
  }
  async purchasePackage(id: string) {
    const res = await fetch(`${API_BASE}/discounts/packages/${id}/purchase`, {
      method: 'POST', headers: this.getHeaders()
    });
    return this.handleResponse(res);
  }
  async getMyPackages() {
    const res = await fetch(`${API_BASE}/discounts/my-packages`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  // Audit Logs
  async getAuditLogs(params?: any) {
    const q = new URLSearchParams(params || {}).toString();
    const res = await fetch(`${API_BASE}/admin/audit-logs?${q}`, { headers: this.getHeaders() });
    return this.handleResponse(res);
  }

  // CSV Exports
  async exportCSV(type: string) {
    const token = localStorage.getItem('ehsaas_token');
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/admin/export/${type}`, { headers });
    if (!res.ok) throw new Error('Export failed');
    return res.text();
  }

  // Verify Therapist
  async verifyTherapist(id: string) {
    const res = await fetch(`${API_BASE}/admin/therapists/${id}/verify`, {
      method: 'PUT', headers: this.getHeaders()
    });
    return this.handleResponse(res);
  }
}

export const api = new ApiService();
