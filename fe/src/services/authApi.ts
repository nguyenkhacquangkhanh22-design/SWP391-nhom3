import type { ApiErrorResponse, AuthResponse, User } from "../types/auth";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api/auth").replace(
  /\/$/,
  "",
);

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(
      "Không thể kết nối máy chủ. Hãy kiểm tra backend và thử lại.",
      0,
    );
  }

  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorData = data as ApiErrorResponse;
    const message =
      typeof errorData.message === "string"
        ? errorData.message
        : "Đã xảy ra lỗi. Vui lòng thử lại.";
    throw new ApiError(message, response.status);
  }
  return data as T;
}

function post<T>(path: string, body: unknown, token?: string) {
  return request<T>(
    path,
    { method: "POST", body: JSON.stringify(body) },
    token,
  );
}

export const authApi = {
  sendRegistrationOtp: (email: string) =>
    post<{ message: string }>("/register/send-otp", { email }),
  verifyRegistrationOtp: (email: string, otp: string) =>
    post<{
      message: string;
      email: string;
      verificationToken: string;
      expiresInSeconds: number;
    }>("/register/verify-otp", { email, otp }),
  register: (input: {
    name: string;
    email: string;
    password: string;
    verificationToken: string;
  }) =>
    post<AuthResponse>("/register", input),
  login: (input: { email: string; password: string }) =>
    post<AuthResponse>("/login", input),
  googleLogin: (idToken: string) =>
    post<AuthResponse>("/google", { idToken }),
  logout: (token: string) => post<{ message: string }>("/logout", {}, token),
  changePassword: (
    token: string,
    input: { currentPassword: string; newPassword: string },
  ) => post<AuthResponse>("/change-password", input, token),
  forgotPassword: (email: string) =>
    post<{ message: string }>("/forgot-password", { email }),
  resetPassword: (input: {
    email: string;
    token: string;
    newPassword: string;
  }) => post<{ message: string }>("/reset-password", input),
  profile: (token: string) =>
    request<{ user: User }>("/profile", {}, token),
  updateProfile: (token: string, name: string) =>
    request<{ user: User }>(
      "/profile",
      { method: "PATCH", body: JSON.stringify({ name }) },
      token,
    ),
};
