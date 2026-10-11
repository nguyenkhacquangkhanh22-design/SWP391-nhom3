export interface User {
  User_Id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  trust_score: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiErrorResponse {
  message?: string;
}

export interface GoogleCredentialResponse {
  credential: string;
}

export interface GoogleAccountsId {
  initialize(options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }): void;
  renderButton(
    parent: HTMLElement,
    options: {
      theme: "filled_black";
      size: "large";
      shape: "rectangular";
      text: "continue_with";
      width: number;
    },
  ): void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsId;
      };
    };
  }
}
